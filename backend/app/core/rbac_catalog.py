"""System RBAC catalog: the permission sets and roles defined by the code.

This is the source of truth ``ensure_rbac_catalog`` restores on every startup.
Superadmins are deliberately absent: that tier stays defined by ``user.role``.
"""

import uuid
from dataclasses import dataclass

from app.schemas.admin_permission import Permission
from app.schemas.rbac import RbacAudience

DEFAULT_USER_ROLE_KEY = "user"
# Frozen: the migration seeds this row with the same literal and backfills every
# existing account onto it, so it must never change.
DEFAULT_USER_ROLE_ID = uuid.UUID("7c1f4e2a-9b3d-4a56-8e01-3d5f6a7b8c90")


@dataclass(frozen=True)
class SystemPermissionSetDefinition:
    """Code-defined content of a system permission set."""

    key: str
    name: str
    description: str
    audience: RbacAudience
    permissions: tuple[Permission, ...]


@dataclass(frozen=True)
class SystemRoleDefinition:
    """Code-defined content of a system role."""

    key: str
    name: str
    description: str
    audience: RbacAudience
    set_keys: tuple[str, ...]


_RBAC_READ_PERMISSIONS = (
    Permission.ROLES_READ,
    Permission.PERMISSION_SETS_READ,
    Permission.ADMINS_READ,
)

SYSTEM_PERMISSION_SETS: tuple[SystemPermissionSetDefinition, ...] = (
    SystemPermissionSetDefinition(
        key="self.basic",
        name="Basic self-service",
        description=(
            "Edit one's profile, upload files, read notifications and use the "
            "AI assistant."
        ),
        audience=RbacAudience.USER,
        permissions=(
            Permission.SELF_PROFILE_UPDATE,
            Permission.SELF_FILES_UPLOAD,
            Permission.SELF_NOTIFICATIONS_READ,
            Permission.SELF_ASSISTANT_USE,
        ),
    ),
    SystemPermissionSetDefinition(
        key="self.support",
        name="Support self-service",
        description="Read, create, reply to and close one's support tickets.",
        audience=RbacAudience.USER,
        permissions=(
            Permission.SELF_SUPPORT_READ,
            Permission.SELF_SUPPORT_CREATE,
            Permission.SELF_SUPPORT_REPLY,
            Permission.SELF_SUPPORT_CLOSE,
        ),
    ),
    SystemPermissionSetDefinition(
        key="self.readonly",
        name="Read-only self-service",
        description="Read notifications and one's support tickets.",
        audience=RbacAudience.USER,
        permissions=(
            Permission.SELF_NOTIFICATIONS_READ,
            Permission.SELF_SUPPORT_READ,
        ),
    ),
    SystemPermissionSetDefinition(
        key="dealer.sales",
        name="Dealer sales",
        description=(
            "Create and manage the quotes and customers of one's own dealership, "
            "read the vehicle and service catalog and the dealership details."
        ),
        audience=RbacAudience.USER,
        permissions=(
            Permission.SELF_QUOTES_READ,
            Permission.SELF_QUOTES_CREATE,
            Permission.SELF_QUOTES_WRITE,
            Permission.SELF_QUOTES_DELETE,
            Permission.SELF_CUSTOMERS_READ,
            Permission.SELF_CUSTOMERS_CREATE,
            Permission.SELF_CUSTOMERS_WRITE,
            Permission.SELF_CUSTOMERS_DELETE,
            Permission.SELF_CATALOG_READ,
            Permission.SELF_DEALERSHIP_READ,
            Permission.SELF_DEALERSHIP_WRITE,
        ),
    ),
    SystemPermissionSetDefinition(
        key="quotes.manage",
        name="Manage quotes",
        description="View, edit and delete the quotes and customers of every dealership.",
        audience=RbacAudience.ADMIN,
        permissions=(
            Permission.QUOTES_READ,
            Permission.QUOTES_WRITE,
            Permission.QUOTES_DELETE,
            Permission.CUSTOMERS_READ,
            Permission.CUSTOMERS_WRITE,
            Permission.CUSTOMERS_DELETE,
        ),
    ),
    SystemPermissionSetDefinition(
        key="catalog.manage",
        name="Manage catalog",
        description="View and edit the services offered in quotes.",
        audience=RbacAudience.ADMIN,
        permissions=(Permission.CATALOG_READ, Permission.CATALOG_WRITE),
    ),
    SystemPermissionSetDefinition(
        key="dealerships.manage",
        name="Manage dealerships",
        description="View, create, edit and delete dealerships.",
        audience=RbacAudience.ADMIN,
        permissions=(
            Permission.DEALERSHIPS_READ,
            Permission.DEALERSHIPS_WRITE,
            Permission.DEALERSHIPS_DELETE,
        ),
    ),
    SystemPermissionSetDefinition(
        key="users.read",
        name="View users",
        description="View user accounts.",
        audience=RbacAudience.ADMIN,
        permissions=(Permission.USERS_READ,),
    ),
    SystemPermissionSetDefinition(
        key="users.manage",
        name="Manage users",
        description="View and edit users, reset passwords and unlock accounts.",
        audience=RbacAudience.ADMIN,
        permissions=(
            Permission.USERS_READ,
            Permission.USERS_WRITE,
            Permission.USERS_PASSWORD_RESET,
            Permission.USERS_UNLOCK,
        ),
    ),
    SystemPermissionSetDefinition(
        key="users.suspend",
        name="Suspend users",
        description="Suspend and reinstate user accounts.",
        audience=RbacAudience.ADMIN,
        permissions=(Permission.USERS_SUSPEND,),
    ),
    SystemPermissionSetDefinition(
        key="users.delete",
        name="Delete users",
        description="Permanently delete user accounts.",
        audience=RbacAudience.ADMIN,
        permissions=(Permission.USERS_DELETE,),
    ),
    SystemPermissionSetDefinition(
        key="users.sessions",
        name="Manage user sessions",
        description="View and revoke user sessions.",
        audience=RbacAudience.ADMIN,
        permissions=(Permission.USERS_SESSIONS,),
    ),
    SystemPermissionSetDefinition(
        key="users.security",
        name="User security",
        description="Reset the multi-factor authentication of users.",
        audience=RbacAudience.ADMIN,
        permissions=(Permission.USERS_MFA_RESET,),
    ),
    SystemPermissionSetDefinition(
        key="support.agent",
        name="Support agent",
        description="Read and answer support tickets.",
        audience=RbacAudience.ADMIN,
        permissions=(Permission.SUPPORT_READ, Permission.SUPPORT_WRITE),
    ),
    SystemPermissionSetDefinition(
        key="support.manager",
        name="Support manager",
        description="Read, answer and update support tickets.",
        audience=RbacAudience.ADMIN,
        permissions=(
            Permission.SUPPORT_READ,
            Permission.SUPPORT_WRITE,
            Permission.SUPPORT_UPDATE,
        ),
    ),
    SystemPermissionSetDefinition(
        key="files.manage",
        name="Manage files",
        description="View and delete uploaded files.",
        audience=RbacAudience.ADMIN,
        permissions=(Permission.FILES_READ, Permission.FILES_DELETE),
    ),
    SystemPermissionSetDefinition(
        key="broadcast.manage",
        name="Manage broadcasts",
        description="View and send broadcasts.",
        audience=RbacAudience.ADMIN,
        permissions=(Permission.BROADCAST_READ, Permission.BROADCAST_WRITE),
    ),
    SystemPermissionSetDefinition(
        key="audit.read",
        name="Audit",
        description="View the activity log and statistics.",
        audience=RbacAudience.ADMIN,
        permissions=(Permission.ACTIVITIES_READ, Permission.STATS_READ),
    ),
    SystemPermissionSetDefinition(
        key="system.config",
        name="System configuration",
        description="View and change system settings.",
        audience=RbacAudience.ADMIN,
        permissions=(
            Permission.SYSTEM_SETTINGS_READ,
            Permission.SYSTEM_SETTINGS_WRITE,
        ),
    ),
    SystemPermissionSetDefinition(
        key="rbac.read",
        name="View access control",
        description="View roles, permission sets and administrators.",
        audience=RbacAudience.ADMIN,
        permissions=_RBAC_READ_PERMISSIONS,
    ),
    SystemPermissionSetDefinition(
        key="rbac.manage",
        name="Manage access control",
        description="Manage roles, permission sets and administrators.",
        audience=RbacAudience.ADMIN,
        permissions=(
            Permission.ROLES_WRITE,
            Permission.PERMISSION_SETS_WRITE,
            Permission.ADMINS_WRITE,
            Permission.ADMINS_DELETE,
            *_RBAC_READ_PERMISSIONS,
        ),
    ),
)

SYSTEM_ROLES: tuple[SystemRoleDefinition, ...] = (
    SystemRoleDefinition(
        key=DEFAULT_USER_ROLE_KEY,
        name="User",
        description="Default self-service access of every account.",
        audience=RbacAudience.USER,
        set_keys=("self.basic", "self.support"),
    ),
    SystemRoleDefinition(
        key="user_restricted",
        name="Restricted user",
        description="Read-only self-service access.",
        audience=RbacAudience.USER,
        set_keys=("self.readonly",),
    ),
    SystemRoleDefinition(
        key="dealer",
        name="Dealer",
        description="Quotes and customers of the account's own dealership.",
        audience=RbacAudience.USER,
        set_keys=("dealer.sales",),
    ),
    SystemRoleDefinition(
        key="dealer_network_admin",
        name="Dealer network administrator",
        description=(
            "Every dealership's quotes and customers, the service catalog, "
            "dealerships and their users."
        ),
        audience=RbacAudience.ADMIN,
        set_keys=(
            "quotes.manage",
            "catalog.manage",
            "dealerships.manage",
            "users.manage",
            "users.sessions",
            "audit.read",
        ),
    ),
    SystemRoleDefinition(
        key="administrator",
        name="Administrator",
        description="Runs users, files, broadcasts, audit and support.",
        audience=RbacAudience.ADMIN,
        set_keys=(
            "users.manage",
            "users.suspend",
            "users.delete",
            "users.sessions",
            "files.manage",
            "broadcast.manage",
            "audit.read",
            "support.manager",
        ),
    ),
    SystemRoleDefinition(
        key="support_agent",
        name="Support agent",
        description="Answers support tickets.",
        audience=RbacAudience.ADMIN,
        set_keys=("users.read", "support.agent"),
    ),
    SystemRoleDefinition(
        key="support_manager",
        name="Support manager",
        description="Supervises support tickets and user sessions.",
        audience=RbacAudience.ADMIN,
        set_keys=("users.read", "users.sessions", "support.manager"),
    ),
    SystemRoleDefinition(
        key="moderator",
        name="Moderator",
        description="Suspends users and removes files.",
        audience=RbacAudience.ADMIN,
        set_keys=("users.read", "users.suspend", "files.manage"),
    ),
    SystemRoleDefinition(
        key="auditor",
        name="Auditor",
        description="Read-only view of users, activity and access control.",
        audience=RbacAudience.ADMIN,
        set_keys=("users.read", "audit.read", "rbac.read"),
    ),
    SystemRoleDefinition(
        key="operator",
        name="Operator",
        description="Runs the system configuration.",
        audience=RbacAudience.ADMIN,
        set_keys=("system.config", "audit.read"),
    ),
)
