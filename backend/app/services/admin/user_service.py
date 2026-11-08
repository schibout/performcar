import logging
import uuid

from fastapi import HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import storage
from app.core.config import settings
from app.core.email import send_email
from app.core.messages.error_message import ErrorMessages
from app.core.messages.success_message import SuccessMessages
from app.core.security import aget_password_hash, generate_secure_random_password
from app.models.user import User
from app.repositories.admin.user import (
    is_last_active_admin,
    is_last_active_superadmin,
    list_users_admin,
)
from app.repositories.file import delete_file as delete_file_record
from app.repositories.file import get_file
from app.repositories.login_attempts import clear_login_attempts
from app.repositories.quote import get_dealership
from app.repositories.user import (
    create_user,
    delete_user,
    get_user_by_email,
    get_user_by_id,
    suspend_user,
    unsuspend_user,
    update_user,
)
from app.schemas.admin import (
    AdminUserCreate,
    AdminUserListItem,
    AdminUserListResponse,
    AdminUserUpdate,
)
from app.schemas.admin_permission import Permission
from app.schemas.msg import Message
from app.schemas.user import Language, SystemRole
from app.schemas.user_activity import ActivityType, ResourceType
from app.use_cases.log_activity import log_activity
from app.use_cases.mfa_reset import reset_user_mfa
from app.use_cases.permissions import (
    ensure_can_act_on_admin,
    guard_superadmin_target,
    signal_permissions_changed,
)
from app.utils.email_templates import generate_password_reset_notification_email

logger = logging.getLogger(__name__)


async def list_users_admin_service(
    session: AsyncSession,
    *,
    skip: int,
    limit: int,
    search: str | None,
    role: SystemRole | None,
    is_active: bool | None,
    is_verified: bool | None,
) -> AdminUserListResponse:
    """Return the filtered, paginated admin user list."""
    users, total = await list_users_admin(
        session,
        skip=skip,
        limit=limit,
        search=search,
        role=role,
        is_active=is_active,
        is_verified=is_verified,
    )
    return AdminUserListResponse(
        data=[AdminUserListItem.model_validate(u) for u in users],
        total=total,
        skip=skip,
        limit=limit,
    )


async def get_user_admin_service(
    session: AsyncSession, user_id: uuid.UUID
) -> AdminUserListItem:
    """Return a single user's full admin view or raise 404."""
    user = await get_user_by_id(session, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorMessages.USER_NOT_FOUND,
        )
    return AdminUserListItem.model_validate(user)


async def _load_target(session: AsyncSession, user_id: uuid.UUID) -> User:
    """Fetch a target user for admin mutation or raise 404."""
    target = await get_user_by_id(session, user_id)
    if not target:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorMessages.USER_NOT_FOUND,
        )
    return target


def _guard_not_self(admin_id: uuid.UUID, target_id: uuid.UUID, message: str) -> None:
    """Raise 400 when an admin targets their own account for a protected action."""
    if admin_id == target_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message,
        )


async def _validate_avatar_file_exists(
    session: AsyncSession, file_id: uuid.UUID
) -> None:
    """Ensure the avatar target exists. Admins may assign any file (they upload
    it on the user's behalf), so no uploader-ownership check is enforced."""
    if await get_file(session, file_id) is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorMessages.FILE_NOT_FOUND,
        )


async def _cleanup_old_avatar(session: AsyncSession, file_id: uuid.UUID) -> None:
    """Delete a replaced/removed avatar's Cloudinary asset and DB row (best-effort).

    Cleanup runs after the user update has already committed, so any failure
    here must be swallowed: a raised error would return 500 on an otherwise
    successful update and orphan the old asset on retry.
    """
    old_file = await get_file(session, file_id)
    if old_file is None:
        return
    await storage.delete_file(old_file.public_id)
    try:
        await delete_file_record(session, old_file)
    except Exception:
        await session.rollback()
        logger.exception("Failed to delete replaced avatar file record %s", file_id)


async def update_user_admin_service(
    request: Request,
    session: AsyncSession,
    current_user: User,
    user_id: uuid.UUID,
    payload: AdminUserUpdate,
) -> AdminUserListItem:
    """Apply an admin-authored update to a user, honouring last-admin guards."""
    target = await _load_target(session, user_id)
    guard_superadmin_target(current_user, target)
    await ensure_can_act_on_admin(
        session, current_user, target, Permission.ADMINS_WRITE
    )

    update_data = payload.model_dump(exclude_unset=True)

    # Role is intentionally not editable here: user→admin and admin→user follow
    # role, set and grant changes (``rbac_service``, ``admin_service``); the
    # superadmin tier is managed only on the admins surface (root-only
    # promote/demote). ``AdminUserUpdate`` carries no role field, so nothing to
    # handle.

    if "is_active" in update_data and update_data["is_active"] != target.is_active:
        _guard_not_self(
            current_user.id, target.id, ErrorMessages.ADMIN_CANNOT_MODIFY_SELF
        )
        deactivating_admin = (
            target.role == SystemRole.ADMIN.value and update_data["is_active"] is False
        )
        if deactivating_admin and await is_last_active_admin(session, target.id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=ErrorMessages.ADMIN_CANNOT_DEMOTE_LAST_ADMIN,
            )

    # Avatar: validate a new file exists, then remember the previous one so it
    # can be purged (Cloudinary + DB) once the new reference is committed —
    # covers both replacing and clearing the avatar.
    avatar_change = "avatar_file_id" in update_data
    deactivating = update_data.get("is_active") is False and target.is_active
    old_avatar_file_id = target.avatar_file_id
    new_avatar_file_id = update_data.get("avatar_file_id")
    if avatar_change and new_avatar_file_id is not None:
        await _validate_avatar_file_exists(session, new_avatar_file_id)

    new_dealership_id = update_data.get("dealership_id")
    if (
        new_dealership_id is not None
        and await get_dealership(session, new_dealership_id) is None
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorMessages.DEALERSHIP_NOT_FOUND,
        )

    updated = await update_user(session, target, update_data)
    if deactivating:
        await signal_permissions_changed(updated.id)

    if (
        avatar_change
        and old_avatar_file_id
        and old_avatar_file_id != new_avatar_file_id
    ):
        await _cleanup_old_avatar(session, old_avatar_file_id)

    # Reload the avatar relationship so the response serializes the new state.
    await session.refresh(updated, attribute_names=["avatar_file"])

    await log_activity(
        session=session,
        user_id=current_user.id,
        activity_type=ActivityType.UPDATE,
        resource_type=ResourceType.USER,
        resource_id=updated.id,
        details={"updated_fields": list(update_data.keys()), "by_admin": True},
        request=request,
    )

    return AdminUserListItem.model_validate(updated)


async def suspend_user_admin_service(
    request: Request,
    session: AsyncSession,
    current_user: User,
    user_id: uuid.UUID,
) -> Message:
    """Permanently suspend a user.

    The suspended account cannot log in and cannot self-reactivate. It is never
    auto-deleted — only an admin may lift the suspension via unsuspend.
    """
    target = await _load_target(session, user_id)
    _guard_not_self(current_user.id, target.id, ErrorMessages.ADMIN_CANNOT_MODIFY_SELF)
    guard_superadmin_target(current_user, target)
    await ensure_can_act_on_admin(
        session, current_user, target, Permission.ADMINS_WRITE
    )

    if target.role == SystemRole.SUPERADMIN.value and await is_last_active_superadmin(
        session, target.id
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ErrorMessages.ADMIN_CANNOT_DELETE_LAST_SUPERADMIN,
        )

    if target.role == SystemRole.ADMIN.value and await is_last_active_admin(
        session, target.id
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ErrorMessages.ADMIN_CANNOT_DEMOTE_LAST_ADMIN,
        )

    if target.suspended_at is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ErrorMessages.ACCOUNT_ALREADY_SUSPENDED,
        )

    await suspend_user(session, target)
    await signal_permissions_changed(target.id)

    await log_activity(
        session=session,
        user_id=current_user.id,
        activity_type=ActivityType.UPDATE,
        resource_type=ResourceType.USER,
        resource_id=target.id,
        details={"action": "admin_suspended_user"},
        request=request,
    )

    return Message(success=True, message=SuccessMessages.ADMIN_USER_SUSPENDED)


async def unsuspend_user_admin_service(
    request: Request,
    session: AsyncSession,
    current_user: User,
    user_id: uuid.UUID,
) -> Message:
    """Lift an existing admin suspension and re-enable the account."""
    target = await _load_target(session, user_id)
    guard_superadmin_target(current_user, target)
    await ensure_can_act_on_admin(
        session, current_user, target, Permission.ADMINS_WRITE
    )

    if target.suspended_at is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ErrorMessages.ACCOUNT_NOT_SUSPENDED,
        )

    await unsuspend_user(session, target)

    await log_activity(
        session=session,
        user_id=current_user.id,
        activity_type=ActivityType.UPDATE,
        resource_type=ResourceType.USER,
        resource_id=target.id,
        details={"action": "admin_unsuspended_user"},
        request=request,
    )

    return Message(success=True, message=SuccessMessages.ADMIN_USER_UNSUSPENDED)


async def unlock_user_admin_service(
    request: Request,
    session: AsyncSession,
    current_user: User,
    user_id: uuid.UUID,
) -> Message:
    """Clear the failed-login counter and lock of a user's account.

    The audit row identifies the target by ``resource_id`` only, never by email.
    """
    target = await _load_target(session, user_id)
    guard_superadmin_target(current_user, target)
    await ensure_can_act_on_admin(
        session, current_user, target, Permission.ADMINS_WRITE
    )

    await clear_login_attempts(target.email)

    await log_activity(
        session=session,
        user_id=current_user.id,
        activity_type=ActivityType.UPDATE,
        resource_type=ResourceType.USER,
        resource_id=target.id,
        details={"action": "unlock_user"},
        request=request,
    )

    return Message(success=True, message=SuccessMessages.ADMIN_USER_UNLOCKED)


async def reset_user_mfa_admin_service(
    request: Request,
    session: AsyncSession,
    current_user: User,
    user_id: uuid.UUID,
) -> Message:
    """Remove a user's MFA enrollment and revoke all their sessions.

    The target enrolls again at their next login. The audit row identifies them
    by ``resource_id`` only, never by email.
    """
    target = await _load_target(session, user_id)
    guard_superadmin_target(current_user, target)
    await ensure_can_act_on_admin(
        session, current_user, target, Permission.ADMINS_WRITE
    )

    revoked = await reset_user_mfa(session, target.id)

    await log_activity(
        session=session,
        user_id=current_user.id,
        activity_type=ActivityType.UPDATE,
        resource_type=ResourceType.USER,
        resource_id=target.id,
        details={"action": "admin_reset_user_mfa", "revoked_sessions": revoked},
        request=request,
    )

    return Message(success=True, message=SuccessMessages.ADMIN_USER_MFA_RESET)


async def delete_user_admin_service(
    request: Request,
    session: AsyncSession,
    current_user: User,
    user_id: uuid.UUID,
) -> Message:
    """Hard-delete a user. Protects the admin's own account and the last admin."""
    target = await _load_target(session, user_id)
    _guard_not_self(current_user.id, target.id, ErrorMessages.ADMIN_CANNOT_DELETE_SELF)
    guard_superadmin_target(current_user, target)
    await ensure_can_act_on_admin(
        session, current_user, target, Permission.ADMINS_DELETE
    )

    if target.role == SystemRole.SUPERADMIN.value and await is_last_active_superadmin(
        session, target.id
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ErrorMessages.ADMIN_CANNOT_DELETE_LAST_SUPERADMIN,
        )

    if target.role == SystemRole.ADMIN.value and await is_last_active_admin(
        session, target.id
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ErrorMessages.ADMIN_CANNOT_DELETE_LAST_ADMIN,
        )

    target_id = target.id

    await delete_user(session, target)
    await signal_permissions_changed(target_id)

    await log_activity(
        session=session,
        user_id=current_user.id,
        activity_type=ActivityType.DELETE,
        resource_type=ResourceType.USER,
        resource_id=target_id,
        details={"action": "admin_deleted_user"},
        request=request,
    )

    return Message(success=True, message=SuccessMessages.ADMIN_USER_DELETED)


async def change_password_admin_service(
    request: Request,
    session: AsyncSession,
    current_user: User,
    user_id: uuid.UUID,
    lang: Language = Language.EN,
) -> Message:
    """Force-rotate the target user's password to an unknown random value.

    The new password is never returned to the caller and never displayed; the
    target user must regain access via the standard 'Forgot Password' flow on
    the login page. A neutral notification email is sent so the recovery path
    stays auditable and tied to a user-initiated reset request.
    """
    target = await _load_target(session, user_id)
    guard_superadmin_target(current_user, target)
    await ensure_can_act_on_admin(
        session, current_user, target, Permission.ADMINS_WRITE
    )

    new_password = generate_secure_random_password()
    hashed_password = await aget_password_hash(new_password)
    await update_user(session, target, {"hashed_password": hashed_password})

    email_data = generate_password_reset_notification_email(
        project_name=settings.PROJECT_NAME,
        lang=lang,
    )
    await send_email(
        to=target.email,
        subject=email_data["subject"],
        body=email_data["html"],
        plain_text=email_data["plain_text"],
        user_id=str(target.id),
        is_html=True,
    )

    await log_activity(
        session=session,
        user_id=current_user.id,
        activity_type=ActivityType.UPDATE,
        resource_type=ResourceType.AUTH,
        resource_id=target.id,
        details={"action": "admin_reset_user_password"},
        request=request,
    )

    return Message(success=True, message=SuccessMessages.ADMIN_PASSWORD_CHANGED)


async def create_user_admin_service(
    request: Request,
    session: AsyncSession,
    current_user: User,
    payload: AdminUserCreate,
) -> AdminUserListItem:
    """Create an active, already verified ``user`` account with the default role.

    The admin hands the initial password over, so no verification email is sent.
    """
    if await get_user_by_email(session, payload.email) is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=ErrorMessages.EMAIL_ALREADY_EXISTS,
        )
    if (
        payload.dealership_id is not None
        and await get_dealership(session, payload.dealership_id) is None
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorMessages.DEALERSHIP_NOT_FOUND,
        )

    user = await create_user(
        session,
        User(
            **payload.model_dump(exclude={"password"}),
            hashed_password=await aget_password_hash(payload.password),
            role=SystemRole.USER.value,
            is_active=True,
            is_verified=True,
        ),
    )
    await log_activity(
        session=session,
        user_id=current_user.id,
        activity_type=ActivityType.CREATE,
        resource_type=ResourceType.USER,
        resource_id=user.id,
        details={"action": "created_user", "email": user.email},
        request=request,
    )
    return AdminUserListItem.model_validate(user)
