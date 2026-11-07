from app.models.admin_permission import AdminPermission
from app.models.announcement import Announcement
from app.models.dealership import Dealership
from app.models.file import File
from app.models.notification import Notification
from app.models.quote import Customer, Quote, QuoteService
from app.models.rbac import (
    RbacPermissionSet,
    RbacPermissionSetItem,
    RbacRole,
    RbacRolePermissionSet,
    RbacUserPermissionSet,
    RbacUserRole,
)
from app.models.support import (
    SupportMessage,
    SupportMessageAttachment,
    SupportTicket,
)
from app.models.system_setting import SystemSetting
from app.models.user import User
from app.models.user_activity import UserActivity
from app.models.user_mfa import UserMfa, UserMfaRecoveryCode
from app.models.user_session import UserSession
from app.models.vehicle_catalog import (
    CarBrand,
    CarColor,
    CarModel,
    CarVersion,
    Service,
    ServiceCategory,
)

__all__ = [
    "AdminPermission",
    "Announcement",
    "CarBrand",
    "CarColor",
    "CarModel",
    "CarVersion",
    "Customer",
    "Dealership",
    "File",
    "Notification",
    "Quote",
    "QuoteService",
    "Service",
    "ServiceCategory",
    "RbacPermissionSet",
    "RbacPermissionSetItem",
    "RbacRole",
    "RbacRolePermissionSet",
    "RbacUserPermissionSet",
    "RbacUserRole",
    "SupportMessage",
    "SupportMessageAttachment",
    "SupportTicket",
    "SystemSetting",
    "User",
    "UserActivity",
    "UserMfa",
    "UserMfaRecoveryCode",
    "UserSession",
]
