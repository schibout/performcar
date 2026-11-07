"""Manage roles and permission sets, and assign them to accounts.

Each mutation stages its rows, then commits them with its audit row, so neither
exists without the other. Caches are dropped and sockets woken only after that
commit, so a reader cannot refill a cache from the old state.
"""

import asyncio
import uuid
from collections.abc import Awaitable, Callable, Iterable, Mapping, Sequence
from dataclasses import dataclass
from datetime import datetime
from itertools import batched
from typing import NoReturn

from fastapi import HTTPException, Request, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.messages.error_message import ErrorMessages
from app.core.messages.success_message import SuccessMessages
from app.models.rbac import RbacPermissionSet, RbacRole
from app.models.user import User
from app.repositories.admin.permission import (
    get_user_permissions,
    stage_user_permissions,
)
from app.repositories.rbac import (
    create_permission_set,
    create_role,
    delete_admin_audience_assignments,
    delete_permission_set,
    delete_role,
    get_account_ids_holding_role,
    get_account_ids_holding_set,
    get_permission_set,
    get_permission_sets_by_ids,
    get_permissions_by_role,
    get_permissions_by_set,
    get_role,
    get_role_assignments,
    get_roles_by_ids,
    get_set_assignments,
    get_sets_by_role,
    is_permission_set_in_use,
    is_role_in_use,
    list_permission_sets,
    list_roles,
    lock_account,
    lock_permission_set,
    lock_role,
    replace_permission_set_items,
    replace_role_assignments,
    replace_role_sets,
    replace_set_assignments,
    set_account_tier,
    update_element_fields,
)
from app.repositories.user import get_user_by_id
from app.schemas.admin_permission import Permission, is_self_permission
from app.schemas.common import JsonValue
from app.schemas.msg import Message
from app.schemas.rbac import (
    AssignmentResponse,
    AssignmentsUpdate,
    EffectivePermission,
    PermissionSetCreate,
    PermissionSetListResponse,
    PermissionSetResponse,
    PermissionSetUpdate,
    PermissionSource,
    RbacAudience,
    RbacPermissionCatalog,
    RbacPermissionInfo,
    RbacSourceKind,
    RoleCreate,
    RoleListResponse,
    RolePermissionSet,
    RoleResponse,
    RoleUpdate,
    UserAccessResponse,
    permissions_allowed_for,
)
from app.schemas.user import SystemRole
from app.schemas.user_activity import ActivityType, ResourceType
from app.use_cases.log_activity import log_activity
from app.use_cases.permissions import (
    demote_if_no_admin_access,
    ensure_can_act_on_admin,
    ensure_can_grant,
    guard_superadmin_target,
    invalidate_all_permissions,
    invalidate_user_permissions,
    signal_permissions_changed,
    tier_allows,
    user_has_permission_uncached,
)
from app.utils import ensure_utc, utc_now

# Sockets woken per round trip after a role or set edit.
_SIGNAL_BATCH_SIZE = 100

_Assigned = RbacRole | RbacPermissionSet


def _raise(status_code: int, message: str) -> NoReturn:
    """Raise an HTTP error carrying a central message."""
    raise HTTPException(status_code=status_code, detail=message)


async def _signal_accounts(user_ids: Iterable[uuid.UUID]) -> None:
    """Wake the accounts' sockets, a bounded number at a time."""
    for chunk in batched(list(user_ids), _SIGNAL_BATCH_SIZE):
        await asyncio.gather(*(signal_permissions_changed(item) for item in chunk))


def _ensure_editable(row: _Assigned) -> None:
    """Refuse to change an element the code defines."""
    if row.is_system:
        _raise(status.HTTP_403_FORBIDDEN, ErrorMessages.RBAC_SYSTEM_ELEMENT)


# --- Permission catalog ------------------------------------------------------


def _audience_of(permission: Permission) -> RbacAudience:
    """Return the audience a key belongs to."""
    if is_self_permission(permission):
        return RbacAudience.USER
    return RbacAudience.ADMIN


def get_rbac_permission_catalog_service() -> RbacPermissionCatalog:
    """Return every permission key with its resource, action and audience."""
    entries = []
    for permission in Permission:
        resource, action = permission.value.split(":", 1)
        entries.append(
            RbacPermissionInfo(
                key=permission,
                resource=resource,
                action=action,
                audience=_audience_of(permission),
            )
        )
    return RbacPermissionCatalog(data=entries)


# --- Permission sets ---------------------------------------------------------


def _to_set_response(
    row: RbacPermissionSet, permissions: Iterable[Permission]
) -> PermissionSetResponse:
    """Map a stored set and its keys to the API shape."""
    return PermissionSetResponse(
        id=row.id,
        key=row.key,
        name=row.name,
        description=row.description,
        audience=RbacAudience(row.audience),
        is_system=row.is_system,
        permissions=sorted(permissions),
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def _set_snapshot(key: str, permissions: Iterable[Permission]) -> JsonValue:
    """Describe a set's content for the audit trail."""
    return {
        "key": key,
        "permissions": sorted(permission.value for permission in permissions),
    }


async def _load_set(session: AsyncSession, set_id: uuid.UUID) -> RbacPermissionSet:
    """Return a permission set or raise 404."""
    row = await get_permission_set(session, set_id)
    if row is None:
        _raise(status.HTTP_404_NOT_FOUND, ErrorMessages.RBAC_PERMISSION_SET_NOT_FOUND)
    return row


async def _lock_set(session: AsyncSession, set_id: uuid.UUID) -> RbacPermissionSet:
    """Return a permission set locked for this transaction or raise 404."""
    row = await lock_permission_set(session, set_id)
    if row is None:
        _raise(status.HTTP_404_NOT_FOUND, ErrorMessages.RBAC_PERMISSION_SET_NOT_FOUND)
    return row


def _ensure_keys_fit_audience(
    audience: RbacAudience, permissions: Iterable[Permission]
) -> None:
    """Refuse keys the set's audience does not admit."""
    if not permissions_allowed_for(audience, permissions):
        _raise(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            ErrorMessages.RBAC_PERMISSION_AUDIENCE_MISMATCH,
        )


async def list_permission_sets_service(
    session: AsyncSession,
) -> PermissionSetListResponse:
    """Return every permission set with its keys."""
    rows = await list_permission_sets(session)
    permissions = await get_permissions_by_set(session, [row.id for row in rows])
    return PermissionSetListResponse(
        data=[_to_set_response(row, permissions[row.id]) for row in rows]
    )


async def get_permission_set_service(
    session: AsyncSession, set_id: uuid.UUID
) -> PermissionSetResponse:
    """Return one permission set with its keys."""
    row = await _load_set(session, set_id)
    permissions = await get_permissions_by_set(session, [row.id])
    return _to_set_response(row, permissions[row.id])


async def create_permission_set_service(
    request: Request,
    session: AsyncSession,
    current_user: User,
    payload: PermissionSetCreate,
) -> PermissionSetResponse:
    """Create a custom set from keys the actor may hand out."""
    permissions = set(payload.permissions)
    _ensure_keys_fit_audience(payload.audience, permissions)
    await ensure_can_grant(session, current_user, permissions)

    row = RbacPermissionSet(
        id=uuid.uuid4(),
        key=payload.key,
        name=payload.name,
        description=payload.description,
        audience=payload.audience.value,
        is_system=False,
    )
    try:
        await create_permission_set(session, row, permissions)
    except IntegrityError:
        await session.rollback()
        _raise(status.HTTP_409_CONFLICT, ErrorMessages.RBAC_KEY_ALREADY_EXISTS)

    await log_activity(
        session=session,
        user_id=current_user.id,
        activity_type=ActivityType.CREATE,
        resource_type=ResourceType.PERMISSION_SET,
        resource_id=row.id,
        details={
            "action": "created_permission_set",
            "before": None,
            "after": _set_snapshot(row.key, permissions),
        },
        request=request,
    )
    await invalidate_all_permissions()
    return _to_set_response(row, permissions)


async def update_permission_set_service(
    request: Request,
    session: AsyncSession,
    current_user: User,
    set_id: uuid.UUID,
    payload: PermissionSetUpdate,
) -> PermissionSetResponse:
    """Edit a custom set; any key gained or lost must be one the actor can grant."""
    row = await _lock_set(session, set_id)
    _ensure_editable(row)

    fields = payload.model_dump(exclude_unset=True, exclude={"permissions"})
    before = (await get_permissions_by_set(session, [row.id]))[row.id]
    after = before
    if "permissions" in payload.model_fields_set:
        after = set(payload.permissions)
        _ensure_keys_fit_audience(RbacAudience(row.audience), after)
        await ensure_can_grant(session, current_user, before ^ after)
        await replace_permission_set_items(session, row.id, after)
    await update_element_fields(session, row, fields, utc_now())

    await log_activity(
        session=session,
        user_id=current_user.id,
        activity_type=ActivityType.UPDATE,
        resource_type=ResourceType.PERMISSION_SET,
        resource_id=row.id,
        details={
            "action": "updated_permission_set",
            "updated_fields": sorted(payload.model_fields_set),
            "before": _set_snapshot(row.key, before),
            "after": _set_snapshot(row.key, after),
        },
        request=request,
    )
    await invalidate_all_permissions()
    await _signal_accounts(await get_account_ids_holding_set(session, row.id))
    return _to_set_response(row, after)


async def delete_permission_set_service(
    request: Request,
    session: AsyncSession,
    current_user: User,
    set_id: uuid.UUID,
) -> Message:
    """Delete a custom set nothing uses any more."""
    row = await _lock_set(session, set_id)
    _ensure_editable(row)
    if await is_permission_set_in_use(session, row.id):
        _raise(status.HTTP_409_CONFLICT, ErrorMessages.RBAC_PERMISSION_SET_IN_USE)

    permissions = (await get_permissions_by_set(session, [row.id]))[row.id]
    key = row.key
    try:
        await delete_permission_set(session, row.id)
    except IntegrityError:
        await session.rollback()
        _raise(status.HTTP_409_CONFLICT, ErrorMessages.RBAC_PERMISSION_SET_IN_USE)

    await log_activity(
        session=session,
        user_id=current_user.id,
        activity_type=ActivityType.DELETE,
        resource_type=ResourceType.PERMISSION_SET,
        resource_id=set_id,
        details={
            "action": "deleted_permission_set",
            "before": _set_snapshot(key, permissions),
            "after": None,
        },
        request=request,
    )
    await invalidate_all_permissions()
    return Message(success=True, message=SuccessMessages.RBAC_PERMISSION_SET_DELETED)


# --- Roles -------------------------------------------------------------------


def _to_role_response(row: RbacRole, sets: Iterable[RbacPermissionSet]) -> RoleResponse:
    """Map a stored role and its sets to the API shape."""
    return RoleResponse(
        id=row.id,
        key=row.key,
        name=row.name,
        description=row.description,
        audience=RbacAudience(row.audience),
        is_system=row.is_system,
        permission_sets=[
            RolePermissionSet(id=item.id, key=item.key, name=item.name)
            for item in sorted(sets, key=lambda item: item.key)
        ],
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def _role_snapshot(key: str, sets: Iterable[RbacPermissionSet]) -> JsonValue:
    """Describe a role's content for the audit trail."""
    return {"key": key, "permission_sets": sorted(item.key for item in sets)}


async def _load_role(session: AsyncSession, role_id: uuid.UUID) -> RbacRole:
    """Return a role or raise 404."""
    row = await get_role(session, role_id)
    if row is None:
        _raise(status.HTTP_404_NOT_FOUND, ErrorMessages.RBAC_ROLE_NOT_FOUND)
    return row


async def _lock_role(session: AsyncSession, role_id: uuid.UUID) -> RbacRole:
    """Return a role locked for this transaction or raise 404."""
    row = await lock_role(session, role_id)
    if row is None:
        _raise(status.HTTP_404_NOT_FOUND, ErrorMessages.RBAC_ROLE_NOT_FOUND)
    return row


async def _load_role_sets(
    session: AsyncSession, audience: RbacAudience, set_ids: Iterable[uuid.UUID]
) -> list[RbacPermissionSet]:
    """Return the sets a role would include, all of them known and of its audience.

    The audience check is what lets the promote and demote strip keep a ``user``
    role: such a role can never carry an admin key.
    """
    ids = set(set_ids)
    sets = await get_permission_sets_by_ids(session, ids)
    if len(sets) != len(ids):
        _raise(status.HTTP_404_NOT_FOUND, ErrorMessages.RBAC_PERMISSION_SET_NOT_FOUND)
    if any(item.audience != audience.value for item in sets):
        _raise(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            ErrorMessages.RBAC_SET_AUDIENCE_MISMATCH,
        )
    return sets


async def _keys_of_sets(
    session: AsyncSession, sets: Iterable[RbacPermissionSet]
) -> set[Permission]:
    """Return the union of the keys of some sets."""
    by_set = await get_permissions_by_set(session, [item.id for item in sets])
    return set().union(*by_set.values())


async def list_roles_service(session: AsyncSession) -> RoleListResponse:
    """Return every role with its sets."""
    rows = await list_roles(session)
    sets = await get_sets_by_role(session, [row.id for row in rows])
    return RoleListResponse(data=[_to_role_response(row, sets[row.id]) for row in rows])


async def get_role_service(session: AsyncSession, role_id: uuid.UUID) -> RoleResponse:
    """Return one role with its sets."""
    row = await _load_role(session, role_id)
    sets = await get_sets_by_role(session, [row.id])
    return _to_role_response(row, sets[row.id])


async def create_role_service(
    request: Request,
    session: AsyncSession,
    current_user: User,
    payload: RoleCreate,
) -> RoleResponse:
    """Create a custom role from sets whose keys the actor may hand out."""
    sets = await _load_role_sets(session, payload.audience, payload.permission_set_ids)
    await ensure_can_grant(session, current_user, await _keys_of_sets(session, sets))

    row = RbacRole(
        id=uuid.uuid4(),
        key=payload.key,
        name=payload.name,
        description=payload.description,
        audience=payload.audience.value,
        is_system=False,
    )
    set_ids = [item.id for item in sets]
    try:
        await create_role(session, row, set_ids)
    except IntegrityError:
        await session.rollback()
        # Either the key is taken or a set was deleted since it was checked.
        if len(await get_permission_sets_by_ids(session, set_ids)) != len(set_ids):
            _raise(
                status.HTTP_404_NOT_FOUND, ErrorMessages.RBAC_PERMISSION_SET_NOT_FOUND
            )
        _raise(status.HTTP_409_CONFLICT, ErrorMessages.RBAC_KEY_ALREADY_EXISTS)

    await log_activity(
        session=session,
        user_id=current_user.id,
        activity_type=ActivityType.CREATE,
        resource_type=ResourceType.ROLE,
        resource_id=row.id,
        details={
            "action": "created_role",
            "before": None,
            "after": _role_snapshot(row.key, sets),
        },
        request=request,
    )
    await invalidate_all_permissions()
    return _to_role_response(row, sets)


async def update_role_service(
    request: Request,
    session: AsyncSession,
    current_user: User,
    role_id: uuid.UUID,
    payload: RoleUpdate,
) -> RoleResponse:
    """Edit a custom role; any key gained or lost must be one the actor can grant."""
    row = await _lock_role(session, role_id)
    _ensure_editable(row)

    fields = payload.model_dump(exclude_unset=True, exclude={"permission_set_ids"})
    before = (await get_sets_by_role(session, [row.id]))[row.id]
    after = before
    if "permission_set_ids" in payload.model_fields_set:
        after = await _load_role_sets(
            session, RbacAudience(row.audience), payload.permission_set_ids
        )
        changed = await _keys_of_sets(session, before) ^ await _keys_of_sets(
            session, after
        )
        await ensure_can_grant(session, current_user, changed)
        try:
            await replace_role_sets(session, row.id, [item.id for item in after])
        except IntegrityError:
            # A set was deleted since it was checked.
            await session.rollback()
            _raise(
                status.HTTP_404_NOT_FOUND, ErrorMessages.RBAC_PERMISSION_SET_NOT_FOUND
            )
    await update_element_fields(session, row, fields, utc_now())

    await log_activity(
        session=session,
        user_id=current_user.id,
        activity_type=ActivityType.UPDATE,
        resource_type=ResourceType.ROLE,
        resource_id=row.id,
        details={
            "action": "updated_role",
            "updated_fields": sorted(payload.model_fields_set),
            "before": _role_snapshot(row.key, before),
            "after": _role_snapshot(row.key, after),
        },
        request=request,
    )
    await invalidate_all_permissions()
    await _signal_accounts(await get_account_ids_holding_role(session, row.id))
    return _to_role_response(row, after)


async def delete_role_service(
    request: Request,
    session: AsyncSession,
    current_user: User,
    role_id: uuid.UUID,
) -> Message:
    """Delete a custom role no account holds any more."""
    row = await _lock_role(session, role_id)
    _ensure_editable(row)
    if await is_role_in_use(session, row.id):
        _raise(status.HTTP_409_CONFLICT, ErrorMessages.RBAC_ROLE_IN_USE)

    sets = (await get_sets_by_role(session, [row.id]))[row.id]
    snapshot = _role_snapshot(row.key, sets)
    try:
        await delete_role(session, row.id)
    except IntegrityError:
        await session.rollback()
        _raise(status.HTTP_409_CONFLICT, ErrorMessages.RBAC_ROLE_IN_USE)

    await log_activity(
        session=session,
        user_id=current_user.id,
        activity_type=ActivityType.DELETE,
        resource_type=ResourceType.ROLE,
        resource_id=role_id,
        details={"action": "deleted_role", "before": snapshot, "after": None},
        request=request,
    )
    await invalidate_all_permissions()
    return Message(success=True, message=SuccessMessages.RBAC_ROLE_DELETED)


# --- Access of an account ----------------------------------------------------


def _is_expired(expires_at: datetime | None, now: datetime) -> bool:
    """Return whether an end date has passed."""
    return expires_at is not None and ensure_utc(expires_at) <= now


def _to_assignments(
    rows: Iterable[tuple[_Assigned, datetime | None]], now: datetime
) -> list[AssignmentResponse]:
    """Map stored assignments to the API shape."""
    return [
        AssignmentResponse(
            id=row.id,
            key=row.key,
            name=row.name,
            audience=RbacAudience(row.audience),
            expires_at=expires_at,
            expired=_is_expired(expires_at, now),
        )
        for row, expires_at in rows
    ]


async def _build_access(session: AsyncSession, target: User) -> UserAccessResponse:
    """Assemble what an account holds and the origin of each usable key."""
    now = utc_now()
    roles = await get_role_assignments(session, target.id)
    sets = await get_set_assignments(session, target.id)
    direct = await get_user_permissions(session, target.id)

    live_roles = [row for row, end in roles if not _is_expired(end, now)]
    live_sets = [row for row, end in sets if not _is_expired(end, now)]
    keys_by_role = await get_permissions_by_role(session, [r.id for r in live_roles])
    keys_by_set = await get_permissions_by_set(session, [s.id for s in live_sets])

    sources: dict[Permission, list[PermissionSource]] = {}

    def _add(keys: Iterable[Permission], kind: RbacSourceKind, key: str) -> None:
        """Record one origin for each of the keys."""
        for permission in keys:
            sources.setdefault(permission, []).append(
                PermissionSource(kind=kind, key=key)
            )

    for role in live_roles:
        _add(keys_by_role[role.id], RbacSourceKind.ROLE, role.key)
    for permission_set in live_sets:
        _add(
            keys_by_set[permission_set.id],
            RbacSourceKind.PERMISSION_SET,
            permission_set.key,
        )
    for permission in direct:
        _add([permission], RbacSourceKind.DIRECT, permission.value)
    if target.role == SystemRole.SUPERADMIN.value:
        _add(Permission, RbacSourceKind.SUPERADMIN, SystemRole.SUPERADMIN.value)

    effective = [
        EffectivePermission(
            permission=permission,
            sources=sorted(found, key=lambda source: (source.kind, source.key)),
        )
        for permission, found in sorted(sources.items())
        if tier_allows(target, permission)
    ]
    return UserAccessResponse(
        account_role=SystemRole(target.role),
        roles=_to_assignments(roles, now),
        permission_sets=_to_assignments(sets, now),
        direct_permissions=sorted(direct),
        effective=effective,
    )


async def get_user_access_service(
    session: AsyncSession, current_user: User, user_id: uuid.UUID
) -> UserAccessResponse:
    """Return an account's assignments, direct grants and effective keys.

    ``users:read`` opens plain users only: what an admin-tier account holds stays
    behind ``admins:read``, including for the account's own page.
    """
    target = await get_user_by_id(session, user_id)
    if target is None:
        _raise(status.HTTP_404_NOT_FOUND, ErrorMessages.USER_NOT_FOUND)
    if target.role != SystemRole.USER.value and not await user_has_permission_uncached(
        session, current_user, Permission.ADMINS_READ
    ):
        _raise(status.HTTP_403_FORBIDDEN, ErrorMessages.INSUFFICIENT_PERMISSIONS)
    return await _build_access(session, target)


# --- Assignments -------------------------------------------------------------


@dataclass(frozen=True)
class _AssignmentKind:
    """What differs between assigning roles and assigning sets."""

    action: str
    not_found: str
    keeps_a_user_role: bool
    load: Callable[[AsyncSession, Iterable[uuid.UUID]], Awaitable[Sequence[_Assigned]]]
    read: Callable[
        [AsyncSession, uuid.UUID],
        Awaitable[Sequence[tuple[_Assigned, datetime | None]]],
    ]
    keys: Callable[
        [AsyncSession, Iterable[uuid.UUID]],
        Awaitable[Mapping[uuid.UUID, set[Permission]]],
    ]
    replace: Callable[
        [AsyncSession, uuid.UUID, Mapping[uuid.UUID, datetime | None], uuid.UUID],
        Awaitable[None],
    ]


_ROLES = _AssignmentKind(
    action="set_user_roles",
    not_found=ErrorMessages.RBAC_ROLE_NOT_FOUND,
    keeps_a_user_role=True,
    load=get_roles_by_ids,
    read=get_role_assignments,
    keys=get_permissions_by_role,
    replace=replace_role_assignments,
)
_SETS = _AssignmentKind(
    action="set_user_permission_sets",
    not_found=ErrorMessages.RBAC_PERMISSION_SET_NOT_FOUND,
    keeps_a_user_role=False,
    load=get_permission_sets_by_ids,
    read=get_set_assignments,
    keys=get_permissions_by_set,
    replace=replace_set_assignments,
)


def _changed_elements(
    current: Mapping[uuid.UUID, datetime | None],
    wanted: Mapping[uuid.UUID, datetime | None],
    now: datetime,
) -> set[uuid.UUID]:
    """Return the elements whose access changes: added, re-dated or still live and gone."""
    changed = {
        item_id
        for item_id, end in wanted.items()
        if item_id not in current or current[item_id] != end
    }
    changed |= {
        item_id
        for item_id, end in current.items()
        if item_id not in wanted and not _is_expired(end, now)
    }
    return changed


def _assignment_snapshot(
    tier: str, rows: Iterable[tuple[_Assigned, datetime | None]]
) -> JsonValue:
    """Describe an account's tier and assignments for the audit trail, by key."""
    return {
        "account_role": tier,
        "assignments": [
            {
                "key": row.key,
                "expires_at": ensure_utc(end).isoformat() if end else None,
            }
            for row, end in rows
        ],
    }


async def _strip_for_promotion(session: AsyncSession, user_id: uuid.UUID) -> JsonValue:
    """Remove what a plain user may still have stored and return it, by key.

    The tier gate is all that keeps such rows inactive, so a promotion would wake
    them without anyone having granted them. Runs in the caller's transaction.
    """
    direct = await get_user_permissions(session, user_id)
    roles = await get_role_assignments(session, user_id)
    sets = await get_set_assignments(session, user_id)
    await stage_user_permissions(session, user_id, [], user_id)
    await delete_admin_audience_assignments(session, user_id)
    return {
        "direct_permissions": sorted(permission.value for permission in direct),
        "roles": [
            row.key for row, _ in roles if row.audience != RbacAudience.USER.value
        ],
        "permission_sets": [
            row.key for row, _ in sets if row.audience != RbacAudience.USER.value
        ],
    }


async def _load_target(session: AsyncSession, actor: User, user_id: uuid.UUID) -> User:
    """Return the locked account whose access an actor may change, or refuse."""
    target = await lock_account(session, user_id)
    if target is None:
        _raise(status.HTTP_404_NOT_FOUND, ErrorMessages.USER_NOT_FOUND)
    guard_superadmin_target(actor, target)
    # A superadmin holds every key through its tier: an assignment means nothing.
    if target.role == SystemRole.SUPERADMIN.value:
        _raise(status.HTTP_403_FORBIDDEN, ErrorMessages.RBAC_SUPERADMIN_TARGET)
    if target.id == actor.id:
        _raise(status.HTTP_400_BAD_REQUEST, ErrorMessages.ADMIN_CANNOT_MODIFY_SELF)
    await ensure_can_act_on_admin(session, actor, target, Permission.ADMINS_WRITE)
    return target


async def _replace_assignments(
    request: Request,
    session: AsyncSession,
    actor: User,
    user_id: uuid.UUID,
    payload: AssignmentsUpdate,
    kind: _AssignmentKind,
) -> UserAccessResponse:
    """Replace an account's roles or sets and move its tier when this calls for it."""
    target = await _load_target(session, actor, user_id)
    now = utc_now()
    wanted = {
        item.id: ensure_utc(item.expires_at) if item.expires_at else None
        for item in payload.assignments
    }
    elements = await kind.load(session, wanted)
    if len(elements) != len(wanted):
        _raise(status.HTTP_404_NOT_FOUND, kind.not_found)

    before = await kind.read(session, target.id)
    current = {row.id: end and ensure_utc(end) for row, end in before}
    # An end date already past may only be one the row already has: the full
    # replacement resends what ``access`` showed, and it gives nothing.
    if any(
        _is_expired(end, now) and (item_id not in current or current[item_id] != end)
        for item_id, end in wanted.items()
    ):
        _raise(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            ErrorMessages.RBAC_EXPIRY_IN_PAST,
        )

    # A term must not leave the account without a role once it ends.
    if kind.keeps_a_user_role and not any(
        element.audience == RbacAudience.USER.value and wanted[element.id] is None
        for element in elements
    ):
        _raise(status.HTTP_400_BAD_REQUEST, ErrorMessages.RBAC_USER_ROLE_REQUIRED)

    promotes = target.role == SystemRole.USER.value and any(
        element.audience != RbacAudience.USER.value
        and not _is_expired(wanted[element.id], now)
        for element in elements
    )
    if promotes and not await user_has_permission_uncached(
        session, actor, Permission.ADMINS_WRITE
    ):
        _raise(status.HTTP_403_FORBIDDEN, ErrorMessages.RBAC_ADMIN_ASSIGNMENT_FORBIDDEN)

    # An admin row stored on a plain user gives nothing yet: the promotion is what
    # would grant it, so resending it counts as new and dropping it withdraws nothing.
    held = {
        row.id: current[row.id]
        for row, _ in before
        if not promotes or row.audience == RbacAudience.USER.value
    }
    changed = _changed_elements(held, wanted, now)
    keys_by_element = await kind.keys(session, changed)
    await ensure_can_grant(session, actor, set().union(*keys_by_element.values()))

    tier_before = target.role
    stripped = await _strip_for_promotion(session, target.id) if promotes else None
    try:
        await kind.replace(session, target.id, wanted, actor.id)
    except IntegrityError:
        # An element was deleted since it was checked.
        await session.rollback()
        _raise(status.HTTP_404_NOT_FOUND, kind.not_found)

    if promotes:
        await set_account_tier(session, target, SystemRole.ADMIN)
    else:
        await demote_if_no_admin_access(session, target, now)

    after = await kind.read(session, target.id)
    await log_activity(
        session=session,
        user_id=actor.id,
        activity_type=ActivityType.UPDATE,
        resource_type=ResourceType.USER,
        resource_id=target.id,
        details={
            "action": kind.action,
            "before": _assignment_snapshot(tier_before, before),
            "after": _assignment_snapshot(target.role, after),
            **({"stripped_on_promotion": stripped} if promotes else {}),
        },
        request=request,
    )
    await invalidate_user_permissions(target.id)
    await signal_permissions_changed(target.id)
    return await _build_access(session, target)


async def set_user_roles_service(
    request: Request,
    session: AsyncSession,
    current_user: User,
    user_id: uuid.UUID,
    payload: AssignmentsUpdate,
) -> UserAccessResponse:
    """Replace an account's roles."""
    return await _replace_assignments(
        request, session, current_user, user_id, payload, _ROLES
    )


async def set_user_permission_sets_service(
    request: Request,
    session: AsyncSession,
    current_user: User,
    user_id: uuid.UUID,
    payload: AssignmentsUpdate,
) -> UserAccessResponse:
    """Replace the sets assigned directly to an account."""
    return await _replace_assignments(
        request, session, current_user, user_id, payload, _SETS
    )
