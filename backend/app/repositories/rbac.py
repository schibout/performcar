import uuid
from collections.abc import Iterable, Mapping
from datetime import datetime

from sqlalchemy import (
    ColumnElement,
    Select,
    delete,
    exists,
    func,
    or_,
    select,
    union,
)
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.rbac_catalog import (
    DEFAULT_USER_ROLE_ID,
    DEFAULT_USER_ROLE_KEY,
    SYSTEM_PERMISSION_SETS,
    SYSTEM_ROLES,
)
from app.models.admin_permission import AdminPermission
from app.models.rbac import (
    RbacPermissionSet,
    RbacPermissionSetItem,
    RbacRole,
    RbacRolePermissionSet,
    RbacUserPermissionSet,
    RbacUserRole,
)
from app.models.user import User
from app.schemas.admin_permission import Permission
from app.schemas.rbac import RbacAudience
from app.schemas.user import SystemRole
from app.utils import ensure_utc

# A losing process only conflicts once per concurrent winner, and the winner's
# committed rows are visible to the retry, so a few attempts are enough.
_CATALOG_SYNC_ATTEMPTS = 3

# Valid keys snapshot so an item left over from a removed enum member is skipped
# rather than raising when materialised back into ``Permission``.
_VALID_PERMISSIONS = {perm.value for perm in Permission}


async def _sync_permission_sets(session: AsyncSession) -> dict[str, uuid.UUID]:
    """Upsert the system sets and their items; return their ``key -> id`` map."""
    keys = [definition.key for definition in SYSTEM_PERMISSION_SETS]
    existing = await session.execute(
        select(RbacPermissionSet).where(RbacPermissionSet.key.in_(keys))
    )
    rows = {row.key: row for row in existing.scalars().all()}

    for definition in SYSTEM_PERMISSION_SETS:
        row = rows.get(definition.key)
        if row is None:
            row = RbacPermissionSet(id=uuid.uuid4(), key=definition.key)
            session.add(row)
            rows[definition.key] = row
        row.name = definition.name
        row.description = definition.description
        row.audience = definition.audience.value
        row.is_system = True
    await session.flush()

    ids = {key: row.id for key, row in rows.items()}
    stored = await session.execute(
        select(RbacPermissionSetItem.set_id, RbacPermissionSetItem.permission).where(
            RbacPermissionSetItem.set_id.in_(list(ids.values()))
        )
    )
    current = {(set_id, permission) for set_id, permission in stored.all()}
    wanted = {
        (ids[definition.key], permission.value)
        for definition in SYSTEM_PERMISSION_SETS
        for permission in definition.permissions
    }
    for set_id, permission in sorted(current - wanted):
        await session.execute(
            delete(RbacPermissionSetItem).where(
                RbacPermissionSetItem.set_id == set_id,
                RbacPermissionSetItem.permission == permission,
            )
        )
    session.add_all(
        RbacPermissionSetItem(set_id=set_id, permission=permission)
        for set_id, permission in sorted(wanted - current)
    )
    await session.flush()
    return ids


async def _sync_roles(session: AsyncSession, set_ids: dict[str, uuid.UUID]) -> None:
    """Upsert the system roles and restore their set memberships."""
    keys = [definition.key for definition in SYSTEM_ROLES]
    existing = await session.execute(select(RbacRole).where(RbacRole.key.in_(keys)))
    rows = {row.key: row for row in existing.scalars().all()}

    for definition in SYSTEM_ROLES:
        row = rows.get(definition.key)
        if row is None:
            role_id = (
                DEFAULT_USER_ROLE_ID
                if definition.key == DEFAULT_USER_ROLE_KEY
                else uuid.uuid4()
            )
            row = RbacRole(id=role_id, key=definition.key)
            session.add(row)
            rows[definition.key] = row
        row.name = definition.name
        row.description = definition.description
        row.audience = definition.audience.value
        row.is_system = True
    await session.flush()

    role_ids = {key: row.id for key, row in rows.items()}
    stored = await session.execute(
        select(RbacRolePermissionSet.role_id, RbacRolePermissionSet.set_id).where(
            RbacRolePermissionSet.role_id.in_(list(role_ids.values()))
        )
    )
    current = {(role_id, set_id) for role_id, set_id in stored.all()}
    wanted = {
        (role_ids[definition.key], set_ids[set_key])
        for definition in SYSTEM_ROLES
        for set_key in definition.set_keys
    }
    for role_id, set_id in sorted(current - wanted):
        await session.execute(
            delete(RbacRolePermissionSet).where(
                RbacRolePermissionSet.role_id == role_id,
                RbacRolePermissionSet.set_id == set_id,
            )
        )
    session.add_all(
        RbacRolePermissionSet(role_id=role_id, set_id=set_id)
        for role_id, set_id in sorted(wanted - current)
    )
    await session.flush()


async def _sync_catalog(session: AsyncSession) -> None:
    """Bring the stored system sets and roles in line with the code."""
    set_ids = await _sync_permission_sets(session)
    await _sync_roles(session, set_ids)


async def ensure_rbac_catalog(session: AsyncSession) -> None:
    """Create the system sets and roles and restore their content from the code.

    Idempotent and safe when several processes boot together: a uniqueness
    conflict means another process inserted the same row first, so the work is
    rolled back and redone against what that process committed.
    """
    for attempt in range(1, _CATALOG_SYNC_ATTEMPTS + 1):
        try:
            await _sync_catalog(session)
            await session.commit()
            return
        except IntegrityError:
            await session.rollback()
            if attempt == _CATALOG_SYNC_ATTEMPTS:
                raise


async def assign_default_role(session: AsyncSession, user_id: uuid.UUID) -> None:
    """Give an account the default role, in the caller's open transaction.

    Flushes without committing so the caller can persist the account and its
    role atomically. Does nothing if the account already holds the role.
    """
    stmt = select(RbacUserRole.id).where(
        RbacUserRole.user_id == user_id,
        RbacUserRole.role_id == DEFAULT_USER_ROLE_ID,
    )
    if (await session.execute(stmt)).first() is not None:
        return
    session.add(RbacUserRole(user_id=user_id, role_id=DEFAULT_USER_ROLE_ID))
    await session.flush()


def _keys_through_roles(
    user_id: uuid.UUID, assignment_filter: ColumnElement[bool]
) -> Select:
    """Select the keys of an account's role assignments passing the filter."""
    return (
        select(RbacPermissionSetItem.permission)
        .join(
            RbacRolePermissionSet,
            RbacRolePermissionSet.set_id == RbacPermissionSetItem.set_id,
        )
        .join(RbacUserRole, RbacUserRole.role_id == RbacRolePermissionSet.role_id)
        .where(RbacUserRole.user_id == user_id, assignment_filter)
    )


def _keys_through_sets(
    user_id: uuid.UUID, assignment_filter: ColumnElement[bool]
) -> Select:
    """Select the keys of an account's direct set assignments passing the filter."""
    return (
        select(RbacPermissionSetItem.permission)
        .join(
            RbacUserPermissionSet,
            RbacUserPermissionSet.set_id == RbacPermissionSetItem.set_id,
        )
        .where(RbacUserPermissionSet.user_id == user_id, assignment_filter)
    )


async def _read_keys(
    session: AsyncSession, through_roles: Select, through_sets: Select
) -> set[Permission]:
    """Return the known keys selected by both assignment queries."""
    rows = await session.execute(union(through_roles, through_sets))
    return {Permission(key) for key in rows.scalars() if key in _VALID_PERMISSIONS}


async def get_assigned_permissions(
    session: AsyncSession, user_id: uuid.UUID, now: datetime
) -> set[Permission]:
    """Return the keys an account holds through roles and sets valid at ``now``."""
    return await _read_keys(
        session,
        _keys_through_roles(
            user_id,
            or_(RbacUserRole.expires_at.is_(None), RbacUserRole.expires_at > now),
        ),
        _keys_through_sets(
            user_id,
            or_(
                RbacUserPermissionSet.expires_at.is_(None),
                RbacUserPermissionSet.expires_at > now,
            ),
        ),
    )


async def get_permanent_assigned_permissions(
    session: AsyncSession, user_id: uuid.UUID
) -> set[Permission]:
    """Return the keys an account holds through assignments without an end date."""
    return await _read_keys(
        session,
        _keys_through_roles(user_id, RbacUserRole.expires_at.is_(None)),
        _keys_through_sets(user_id, RbacUserPermissionSet.expires_at.is_(None)),
    )


async def delete_admin_audience_assignments(
    session: AsyncSession, user_id: uuid.UUID
) -> None:
    """Remove an account's non-``user`` roles and sets, in the caller's transaction.

    Flushes without committing: the removal lands with the caller's next commit.
    A tier change lands with it only if the caller stages it before that commit,
    which callers committing grants first through ``set_user_permissions`` do not
    do. The ``user``-audience assignments stay: an account keeps its self-service keys
    whatever its tier.
    """
    admin_roles = select(RbacRole.id).where(
        RbacRole.audience != RbacAudience.USER.value
    )
    admin_sets = select(RbacPermissionSet.id).where(
        RbacPermissionSet.audience != RbacAudience.USER.value
    )
    await session.execute(
        delete(RbacUserRole).where(
            RbacUserRole.user_id == user_id, RbacUserRole.role_id.in_(admin_roles)
        )
    )
    await session.execute(
        delete(RbacUserPermissionSet).where(
            RbacUserPermissionSet.user_id == user_id,
            RbacUserPermissionSet.set_id.in_(admin_sets),
        )
    )
    await session.flush()


async def get_next_assignment_expiry(
    session: AsyncSession, user_id: uuid.UUID, now: datetime
) -> datetime | None:
    """Return when the account's next role or set assignment expires, if any."""
    role_expiry = select(func.min(RbacUserRole.expires_at)).where(
        RbacUserRole.user_id == user_id, RbacUserRole.expires_at > now
    )
    set_expiry = select(func.min(RbacUserPermissionSet.expires_at)).where(
        RbacUserPermissionSet.user_id == user_id,
        RbacUserPermissionSet.expires_at > now,
    )
    expiries = [
        (await session.execute(role_expiry)).scalar_one_or_none(),
        (await session.execute(set_expiry)).scalar_one_or_none(),
    ]
    return min((expiry for expiry in expiries if expiry is not None), default=None)


# The writers below flush without committing: the audit row's commit carries the
# change, so neither can exist without the other.


async def list_permission_sets(session: AsyncSession) -> list[RbacPermissionSet]:
    """Return every permission set, ordered by key."""
    stmt = select(RbacPermissionSet).order_by(RbacPermissionSet.key)
    return list((await session.execute(stmt)).scalars())


async def list_roles(session: AsyncSession) -> list[RbacRole]:
    """Return every role, ordered by key."""
    stmt = select(RbacRole).order_by(RbacRole.key)
    return list((await session.execute(stmt)).scalars())


async def get_permission_set(
    session: AsyncSession, set_id: uuid.UUID
) -> RbacPermissionSet | None:
    """Return a permission set by id."""
    return await session.get(RbacPermissionSet, set_id)


async def get_role(session: AsyncSession, role_id: uuid.UUID) -> RbacRole | None:
    """Return a role by id."""
    return await session.get(RbacRole, role_id)


def lock_permission_set_statement(set_id: uuid.UUID) -> Select:
    """Select a permission set for update, past what the session already loaded."""
    return (
        select(RbacPermissionSet)
        .where(RbacPermissionSet.id == set_id)
        .with_for_update()
        .execution_options(populate_existing=True)
    )


def lock_role_statement(role_id: uuid.UUID) -> Select:
    """Select a role for update, past what the session already loaded."""
    return (
        select(RbacRole)
        .where(RbacRole.id == role_id)
        .with_for_update()
        .execution_options(populate_existing=True)
    )


async def lock_permission_set(
    session: AsyncSession, set_id: uuid.UUID
) -> RbacPermissionSet | None:
    """Return a permission set locked for this transaction, freshly read.

    Concurrent edits of one set queue here, so each replaces what the previous one
    committed and its audit row records the true ``before``.
    """
    stmt = lock_permission_set_statement(set_id)
    return (await session.execute(stmt)).scalars().first()


async def lock_role(session: AsyncSession, role_id: uuid.UUID) -> RbacRole | None:
    """Return a role locked for this transaction, freshly read, as for a set."""
    stmt = lock_role_statement(role_id)
    return (await session.execute(stmt)).scalars().first()


async def get_permission_sets_by_ids(
    session: AsyncSession, set_ids: Iterable[uuid.UUID]
) -> list[RbacPermissionSet]:
    """Return the permission sets among the given ids."""
    stmt = select(RbacPermissionSet).where(RbacPermissionSet.id.in_(list(set_ids)))
    return list((await session.execute(stmt)).scalars())


async def get_roles_by_ids(
    session: AsyncSession, role_ids: Iterable[uuid.UUID]
) -> list[RbacRole]:
    """Return the roles among the given ids."""
    stmt = select(RbacRole).where(RbacRole.id.in_(list(role_ids)))
    return list((await session.execute(stmt)).scalars())


async def get_permissions_by_set(
    session: AsyncSession, set_ids: Iterable[uuid.UUID]
) -> dict[uuid.UUID, set[Permission]]:
    """Return a ``set id -> known keys`` map, with an entry for every given id."""
    ids = list(set_ids)
    result: dict[uuid.UUID, set[Permission]] = {set_id: set() for set_id in ids}
    stmt = select(RbacPermissionSetItem.set_id, RbacPermissionSetItem.permission).where(
        RbacPermissionSetItem.set_id.in_(ids)
    )
    for set_id, permission in (await session.execute(stmt)).all():
        if permission in _VALID_PERMISSIONS:
            result[set_id].add(Permission(permission))
    return result


async def get_permissions_by_role(
    session: AsyncSession, role_ids: Iterable[uuid.UUID]
) -> dict[uuid.UUID, set[Permission]]:
    """Return a ``role id -> known keys`` map, with an entry for every given id."""
    ids = list(role_ids)
    result: dict[uuid.UUID, set[Permission]] = {role_id: set() for role_id in ids}
    stmt = (
        select(RbacRolePermissionSet.role_id, RbacPermissionSetItem.permission)
        .join(
            RbacPermissionSetItem,
            RbacPermissionSetItem.set_id == RbacRolePermissionSet.set_id,
        )
        .where(RbacRolePermissionSet.role_id.in_(ids))
    )
    for role_id, permission in (await session.execute(stmt)).all():
        if permission in _VALID_PERMISSIONS:
            result[role_id].add(Permission(permission))
    return result


async def get_sets_by_role(
    session: AsyncSession, role_ids: Iterable[uuid.UUID]
) -> dict[uuid.UUID, list[RbacPermissionSet]]:
    """Return a ``role id -> sets ordered by key`` map, for every given id."""
    ids = list(role_ids)
    result: dict[uuid.UUID, list[RbacPermissionSet]] = {role_id: [] for role_id in ids}
    stmt = (
        select(RbacRolePermissionSet.role_id, RbacPermissionSet)
        .join(RbacPermissionSet, RbacPermissionSet.id == RbacRolePermissionSet.set_id)
        .where(RbacRolePermissionSet.role_id.in_(ids))
        .order_by(RbacPermissionSet.key)
    )
    for role_id, permission_set in (await session.execute(stmt)).all():
        result[role_id].append(permission_set)
    return result


async def create_permission_set(
    session: AsyncSession, row: RbacPermissionSet, permissions: Iterable[Permission]
) -> None:
    """Insert a permission set and its keys."""
    session.add(row)
    await session.flush()
    await replace_permission_set_items(session, row.id, permissions)


async def replace_permission_set_items(
    session: AsyncSession, set_id: uuid.UUID, permissions: Iterable[Permission]
) -> None:
    """Replace the keys of a permission set."""
    await session.execute(
        delete(RbacPermissionSetItem).where(RbacPermissionSetItem.set_id == set_id)
    )
    session.add_all(
        RbacPermissionSetItem(set_id=set_id, permission=value)
        for value in sorted({permission.value for permission in permissions})
    )
    await session.flush()


async def create_role(
    session: AsyncSession, row: RbacRole, set_ids: Iterable[uuid.UUID]
) -> None:
    """Insert a role and its set memberships."""
    session.add(row)
    await session.flush()
    await replace_role_sets(session, row.id, set_ids)


async def replace_role_sets(
    session: AsyncSession, role_id: uuid.UUID, set_ids: Iterable[uuid.UUID]
) -> None:
    """Replace the sets a role includes."""
    await session.execute(
        delete(RbacRolePermissionSet).where(RbacRolePermissionSet.role_id == role_id)
    )
    session.add_all(
        RbacRolePermissionSet(role_id=role_id, set_id=set_id)
        for set_id in sorted(set(set_ids))
    )
    await session.flush()


async def update_element_fields(
    session: AsyncSession,
    row: RbacPermissionSet | RbacRole,
    fields: dict[str, str | None],
    now: datetime,
) -> None:
    """Apply descriptive fields and date the edit, which may only touch content."""
    for name, value in fields.items():
        setattr(row, name, value)
    row.updated_at = now
    await session.flush()


async def is_permission_set_in_use(session: AsyncSession, set_id: uuid.UUID) -> bool:
    """Return whether a role includes the set or an account holds it, even expired."""
    stmt = select(
        or_(
            exists().where(RbacRolePermissionSet.set_id == set_id),
            exists().where(RbacUserPermissionSet.set_id == set_id),
        )
    )
    return bool((await session.execute(stmt)).scalar())


async def is_role_in_use(session: AsyncSession, role_id: uuid.UUID) -> bool:
    """Return whether an account holds the role, even expired."""
    stmt = select(exists().where(RbacUserRole.role_id == role_id))
    return bool((await session.execute(stmt)).scalar())


async def delete_permission_set(session: AsyncSession, set_id: uuid.UUID) -> None:
    """Delete a permission set; its keys cascade, a remaining use raises."""
    await session.execute(
        delete(RbacPermissionSet).where(RbacPermissionSet.id == set_id)
    )
    await session.flush()


async def delete_role(session: AsyncSession, role_id: uuid.UUID) -> None:
    """Delete a role; its memberships cascade, a remaining assignment raises."""
    await session.execute(delete(RbacRole).where(RbacRole.id == role_id))
    await session.flush()


async def get_account_ids_holding_role(
    session: AsyncSession, role_id: uuid.UUID
) -> list[uuid.UUID]:
    """Return the accounts holding a role."""
    stmt = select(RbacUserRole.user_id).where(RbacUserRole.role_id == role_id)
    return list((await session.execute(stmt)).scalars())


async def get_account_ids_holding_set(
    session: AsyncSession, set_id: uuid.UUID
) -> list[uuid.UUID]:
    """Return the accounts holding a set, directly or through a role, once each."""
    directly = select(RbacUserPermissionSet.user_id).where(
        RbacUserPermissionSet.set_id == set_id
    )
    through_roles = (
        select(RbacUserRole.user_id)
        .join(
            RbacRolePermissionSet,
            RbacRolePermissionSet.role_id == RbacUserRole.role_id,
        )
        .where(RbacRolePermissionSet.set_id == set_id)
    )
    rows = await session.execute(union(directly, through_roles))
    return list(rows.scalars())


async def lock_account(session: AsyncSession, user_id: uuid.UUID) -> User | None:
    """Return an account locked for this transaction, freshly read.

    Concurrent changes to one account's access queue here, so each sees what the
    previous one committed. SQLite ignores the clause.
    """
    stmt = (
        select(User)
        .where(User.id == user_id)
        .with_for_update()
        .execution_options(populate_existing=True)
    )
    return (await session.execute(stmt)).scalars().first()


async def set_account_tier(session: AsyncSession, user: User, tier: SystemRole) -> None:
    """Change an account's tier, in the caller's transaction."""
    user.role = tier.value
    await session.flush()


async def get_role_assignments(
    session: AsyncSession, user_id: uuid.UUID
) -> list[tuple[RbacRole, datetime | None]]:
    """Return an account's roles with their end dates, ordered by key."""
    stmt = (
        select(RbacRole, RbacUserRole.expires_at)
        .join(RbacUserRole, RbacUserRole.role_id == RbacRole.id)
        .where(RbacUserRole.user_id == user_id)
        .order_by(RbacRole.key)
    )
    return [(role, expires_at) for role, expires_at in await session.execute(stmt)]


async def get_set_assignments(
    session: AsyncSession, user_id: uuid.UUID
) -> list[tuple[RbacPermissionSet, datetime | None]]:
    """Return an account's direct sets with their end dates, ordered by key."""
    stmt = (
        select(RbacPermissionSet, RbacUserPermissionSet.expires_at)
        .join(
            RbacUserPermissionSet,
            RbacUserPermissionSet.set_id == RbacPermissionSet.id,
        )
        .where(RbacUserPermissionSet.user_id == user_id)
        .order_by(RbacPermissionSet.key)
    )
    return [(item, expires_at) for item, expires_at in await session.execute(stmt)]


async def _apply_assignments(
    session: AsyncSession,
    rows: Mapping[uuid.UUID, RbacUserRole | RbacUserPermissionSet],
    wanted: Mapping[uuid.UUID, datetime | None],
    assigned_by: uuid.UUID,
) -> None:
    """Stage the removal of unwanted rows and the new end date of changed ones."""
    for item_id, row in rows.items():
        if item_id not in wanted:
            await session.delete(row)
            continue
        current = row.expires_at and ensure_utc(row.expires_at)
        if current != wanted[item_id]:
            row.expires_at = wanted[item_id]
            row.assigned_by = assigned_by


async def replace_role_assignments(
    session: AsyncSession,
    user_id: uuid.UUID,
    wanted: Mapping[uuid.UUID, datetime | None],
    assigned_by: uuid.UUID,
) -> None:
    """Make an account's roles match ``wanted``; an unchanged row keeps its author."""
    stmt = select(RbacUserRole).where(RbacUserRole.user_id == user_id)
    rows = {row.role_id: row for row in (await session.execute(stmt)).scalars()}
    await _apply_assignments(session, rows, wanted, assigned_by)
    session.add_all(
        RbacUserRole(
            user_id=user_id,
            role_id=role_id,
            assigned_by=assigned_by,
            expires_at=wanted[role_id],
        )
        for role_id in sorted(wanted.keys() - rows.keys())
    )
    await session.flush()


async def replace_set_assignments(
    session: AsyncSession,
    user_id: uuid.UUID,
    wanted: Mapping[uuid.UUID, datetime | None],
    assigned_by: uuid.UUID,
) -> None:
    """Make an account's direct sets match ``wanted``; an unchanged row keeps its author."""
    stmt = select(RbacUserPermissionSet).where(RbacUserPermissionSet.user_id == user_id)
    rows = {row.set_id: row for row in (await session.execute(stmt)).scalars()}
    await _apply_assignments(session, rows, wanted, assigned_by)
    session.add_all(
        RbacUserPermissionSet(
            user_id=user_id,
            set_id=set_id,
            assigned_by=assigned_by,
            expires_at=wanted[set_id],
        )
        for set_id in sorted(wanted.keys() - rows.keys())
    )
    await session.flush()


async def has_admin_access(
    session: AsyncSession, user_id: uuid.UUID, now: datetime
) -> bool:
    """Return whether an account holds an admin role, set or direct grant at ``now``."""
    admin_role = exists().where(
        RbacUserRole.user_id == user_id,
        RbacUserRole.role_id == RbacRole.id,
        RbacRole.audience != RbacAudience.USER.value,
        or_(RbacUserRole.expires_at.is_(None), RbacUserRole.expires_at > now),
    )
    admin_set = exists().where(
        RbacUserPermissionSet.user_id == user_id,
        RbacUserPermissionSet.set_id == RbacPermissionSet.id,
        RbacPermissionSet.audience != RbacAudience.USER.value,
        or_(
            RbacUserPermissionSet.expires_at.is_(None),
            RbacUserPermissionSet.expires_at > now,
        ),
    )
    direct_grant = exists().where(AdminPermission.user_id == user_id)
    stmt = select(or_(admin_role, admin_set, direct_grant))
    return bool((await session.execute(stmt)).scalar())
