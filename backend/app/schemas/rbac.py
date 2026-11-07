import uuid
from collections.abc import Iterable
from datetime import datetime
from enum import StrEnum
from typing import Annotated

from pydantic import (
    AwareDatetime,
    BaseModel,
    ConfigDict,
    Field,
    StringConstraints,
    field_validator,
)

from app.core.messages.error_message import ErrorMessages
from app.schemas.admin_permission import Permission, is_self_permission
from app.schemas.user import SystemRole


class RbacAudience(StrEnum):
    """Population a role or permission set is meant for."""

    USER = "user"
    ADMIN = "admin"


def permissions_allowed_for(
    audience: RbacAudience, permissions: Iterable[Permission]
) -> bool:
    """Return whether every permission is admissible for the audience.

    The ``user`` audience only admits self-service (``self.*``) keys; the
    ``admin`` audience admits any permission.
    """
    if audience is RbacAudience.USER:
        return all(is_self_permission(perm) for perm in permissions)
    return True


class RbacSourceKind(StrEnum):
    """Where an account's effective permission comes from."""

    ROLE = "role"
    PERMISSION_SET = "permission_set"
    DIRECT = "direct"
    SUPERADMIN = "superadmin"


# Element contents and assignments are small by nature; the cap only bounds the
# work one request can ask for.
_MAX_ITEMS = 200

_ElementKey = Annotated[
    str,
    StringConstraints(max_length=64, pattern=r"^[a-z][a-z0-9_]*(\.[a-z0-9_]+)*$"),
]
_ElementName = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)
]
_ElementDescription = Annotated[str, StringConstraints(max_length=255)]


class RbacPermissionInfo(BaseModel):
    """One permission key of the catalog."""

    key: Permission
    resource: str
    action: str
    audience: RbacAudience


class RbacPermissionCatalog(BaseModel):
    """Every permission key that exists."""

    data: list[RbacPermissionInfo]


class PermissionSetCreate(BaseModel):
    """Create a custom permission set."""

    model_config = ConfigDict(extra="forbid")

    key: _ElementKey
    name: _ElementName
    description: _ElementDescription | None = None
    audience: RbacAudience
    permissions: list[Permission] = Field(default_factory=list, max_length=_MAX_ITEMS)


class PermissionSetUpdate(BaseModel):
    """Edit a custom permission set; key and audience are fixed at creation.

    The defaults stand for "unchanged": the service reads this with
    ``exclude_unset``, so they are never stored, while an explicit null for a
    required field is refused.
    """

    model_config = ConfigDict(extra="forbid")

    name: _ElementName = "unset"
    description: _ElementDescription | None = None
    permissions: list[Permission] = Field(default_factory=list, max_length=_MAX_ITEMS)


class PermissionSetResponse(BaseModel):
    """A permission set and its keys."""

    id: uuid.UUID
    key: str
    name: str
    description: str | None
    audience: RbacAudience
    is_system: bool
    permissions: list[Permission]
    created_at: datetime
    updated_at: datetime


class PermissionSetListResponse(BaseModel):
    """Every permission set."""

    data: list[PermissionSetResponse]


class RoleCreate(BaseModel):
    """Create a custom role."""

    model_config = ConfigDict(extra="forbid")

    key: _ElementKey
    name: _ElementName
    description: _ElementDescription | None = None
    audience: RbacAudience
    permission_set_ids: list[uuid.UUID] = Field(
        default_factory=list, max_length=_MAX_ITEMS
    )


class RoleUpdate(BaseModel):
    """Edit a custom role; key and audience are fixed at creation.

    The defaults stand for "unchanged", as in ``PermissionSetUpdate``.
    """

    model_config = ConfigDict(extra="forbid")

    name: _ElementName = "unset"
    description: _ElementDescription | None = None
    permission_set_ids: list[uuid.UUID] = Field(
        default_factory=list, max_length=_MAX_ITEMS
    )


class RolePermissionSet(BaseModel):
    """A permission set as seen from a role that includes it."""

    id: uuid.UUID
    key: str
    name: str


class RoleResponse(BaseModel):
    """A role and the permission sets it includes."""

    id: uuid.UUID
    key: str
    name: str
    description: str | None
    audience: RbacAudience
    is_system: bool
    permission_sets: list[RolePermissionSet]
    created_at: datetime
    updated_at: datetime


class RoleListResponse(BaseModel):
    """Every role."""

    data: list[RoleResponse]


class AssignmentItem(BaseModel):
    """One role or set to assign, until ``expires_at`` when one is given."""

    model_config = ConfigDict(extra="forbid")

    id: uuid.UUID
    expires_at: AwareDatetime | None = None


class AssignmentsUpdate(BaseModel):
    """The complete list of an account's roles, or of its sets."""

    model_config = ConfigDict(extra="forbid")

    assignments: list[AssignmentItem] = Field(max_length=_MAX_ITEMS)

    @field_validator("assignments")
    @classmethod
    def _reject_duplicates(cls, items: list[AssignmentItem]) -> list[AssignmentItem]:
        """Refuse the same element twice: its end date would be ambiguous."""
        if len({item.id for item in items}) != len(items):
            raise ValueError(ErrorMessages.RBAC_DUPLICATE_ASSIGNMENT)
        return items


class AssignmentResponse(BaseModel):
    """A role or set held by an account; an expired one no longer gives any key."""

    id: uuid.UUID
    key: str
    name: str
    audience: RbacAudience
    expires_at: datetime | None
    expired: bool


class PermissionSource(BaseModel):
    """One origin of an effective permission."""

    kind: RbacSourceKind
    key: str


class EffectivePermission(BaseModel):
    """A permission the account can use, and everything that gives it."""

    permission: Permission
    sources: list[PermissionSource]


class UserAccessResponse(BaseModel):
    """What an account holds and why. Direct grants are edited in ``/admin/admins``."""

    account_role: SystemRole
    roles: list[AssignmentResponse]
    permission_sets: list[AssignmentResponse]
    direct_permissions: list[Permission]
    effective: list[EffectivePermission]
