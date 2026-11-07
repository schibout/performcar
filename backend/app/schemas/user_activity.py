import uuid
from enum import StrEnum

from pydantic import BaseModel, Field

from app.schemas.common import ActivityDetails


class ActivityType(StrEnum):
    """Types of activities that can be logged."""

    CREATE = "create"
    READ = "read"
    UPDATE = "update"
    DELETE = "delete"
    EXECUTE = "execute"
    LOGIN = "login"
    LOGOUT = "logout"
    EXPORT = "export"
    INVITE = "invite"


class ResourceType(StrEnum):
    """Types of resources that activities can be performed on."""

    USER = "user"
    AUTH = "auth"
    FILE = "file"
    ACTIVITY = "activity"
    SUPPORT_TICKET = "support_ticket"
    ANNOUNCEMENT = "announcement"
    SYSTEM_SETTINGS = "system_settings"
    ROLE = "role"
    PERMISSION_SET = "permission_set"
    DEALERSHIP = "dealership"
    SERVICE = "service"
    CUSTOMER = "customer"
    QUOTE = "quote"


class ActivityStatus(StrEnum):
    """Status of the activity."""

    SUCCESS = "success"
    FAILURE = "failure"


class UserActivityCreate(BaseModel):
    """Schema for creating a user activity log."""

    user_id: uuid.UUID | None = None
    actor_ref: str | None = None
    activity_type: ActivityType
    resource_type: ResourceType
    resource_id: uuid.UUID | None = None
    details: ActivityDetails = Field(default_factory=dict)
    status: ActivityStatus = ActivityStatus.SUCCESS
    status_code: int | None = None
    ip_address: str | None = None
    user_agent: str | None = None
