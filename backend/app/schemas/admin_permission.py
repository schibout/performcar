from enum import StrEnum


class Permission(StrEnum):
    """RBAC permission keys an admin can be granted (resource:action).

    Superadmins implicitly hold every permission and bypass these checks; only
    plain ``admin`` accounts are gated by the grants stored in
    ``admin_permission``. Adding a key here is the single source of truth shared
    by the dependency guards, the ``/users/me`` payload, and the admin
    management endpoints.
    """

    USERS_READ = "users:read"
    USERS_WRITE = "users:write"
    USERS_DELETE = "users:delete"
    USERS_SUSPEND = "users:suspend"
    USERS_PASSWORD_RESET = "users:password_reset"
    USERS_SESSIONS = "users:sessions"
    USERS_UNLOCK = "users:unlock"
    USERS_MFA_RESET = "users:mfa_reset"
    FILES_READ = "files:read"
    FILES_DELETE = "files:delete"
    SUPPORT_READ = "support:read"
    SUPPORT_WRITE = "support:write"
    SUPPORT_UPDATE = "support:update"
    ACTIVITIES_READ = "activities:read"
    STATS_READ = "stats:read"
    BROADCAST_READ = "broadcast:read"
    BROADCAST_WRITE = "broadcast:write"
    SYSTEM_SETTINGS_READ = "system_settings:read"
    SYSTEM_SETTINGS_WRITE = "system_settings:write"
    ROLES_READ = "roles:read"
    ROLES_WRITE = "roles:write"
    PERMISSION_SETS_READ = "permission_sets:read"
    PERMISSION_SETS_WRITE = "permission_sets:write"
    ADMINS_READ = "admins:read"
    ADMINS_WRITE = "admins:write"
    ADMINS_DELETE = "admins:delete"
    # Dealer network (quote generator): every dealership's data.
    QUOTES_READ = "quotes:read"
    QUOTES_WRITE = "quotes:write"
    QUOTES_DELETE = "quotes:delete"
    CUSTOMERS_READ = "customers:read"
    CUSTOMERS_WRITE = "customers:write"
    CUSTOMERS_DELETE = "customers:delete"
    CATALOG_READ = "catalog:read"
    CATALOG_WRITE = "catalog:write"
    DEALERSHIPS_READ = "dealerships:read"
    DEALERSHIPS_WRITE = "dealerships:write"
    DEALERSHIPS_DELETE = "dealerships:delete"
    # Self-service keys (``self.<resource>:<action>``): usable by any account,
    # granted only through roles, never through the direct admin grant grid.
    SELF_PROFILE_UPDATE = "self.profile:update"
    SELF_FILES_UPLOAD = "self.files:upload"
    SELF_NOTIFICATIONS_READ = "self.notifications:read"
    SELF_SUPPORT_READ = "self.support:read"
    SELF_SUPPORT_CREATE = "self.support:create"
    SELF_SUPPORT_REPLY = "self.support:reply"
    SELF_SUPPORT_CLOSE = "self.support:close"
    # Dealer self-service: the data of the account's own dealership only.
    SELF_QUOTES_READ = "self.quotes:read"
    SELF_QUOTES_CREATE = "self.quotes:create"
    SELF_QUOTES_WRITE = "self.quotes:write"
    SELF_QUOTES_DELETE = "self.quotes:delete"
    SELF_CUSTOMERS_READ = "self.customers:read"
    SELF_CUSTOMERS_CREATE = "self.customers:create"
    SELF_CUSTOMERS_WRITE = "self.customers:write"
    SELF_CUSTOMERS_DELETE = "self.customers:delete"
    SELF_CATALOG_READ = "self.catalog:read"
    SELF_DEALERSHIP_READ = "self.dealership:read"
    SELF_DEALERSHIP_WRITE = "self.dealership:write"
    SELF_ASSISTANT_USE = "self.assistant:use"


SELF_PREFIX = "self."


def is_self_permission(permission: Permission) -> bool:
    """Return whether the permission is a self-service (``self.*``) key."""
    return permission.value.startswith(SELF_PREFIX)


def directly_grantable_permissions() -> list[Permission]:
    """Return the permissions assignable through the direct admin grant grid."""
    return [perm for perm in Permission if not is_self_permission(perm)]
