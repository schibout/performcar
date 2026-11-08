class SuccessMessages:
    # User Specific
    USER_CREATED = "success.user.created"
    USER_UPDATED = "success.user.updated"
    EMAIL_VERIFIED = "success.user.email_verified"
    VERIFICATION_EMAIL_SENT = "success.user.verification_email_sent"

    # Auth Specific
    LOGIN_SUCCESS = "success.auth.login"
    MFA_CHALLENGE_REQUIRED = "success.auth.mfa_challenge_required"
    MFA_ENROLLED = "success.auth.mfa_enrolled"
    PASSWORD_RESET_SENT = "success.auth.password_reset_sent"
    PASSWORD_RESET_SUCCESS = "success.auth.password_reset_success"
    PASSWORD_CHANGE_SUCCESS = "success.auth.password_change_success"
    LOGOUT_SUCCESS = "success.auth.logout_success"
    REGISTER_SUCCESS = "success.auth.register_success"

    # Account deactivation / grace-period deletion
    ACCOUNT_DEACTIVATED = "success.account.deactivated"
    ACCOUNT_REACTIVATED = "success.account.reactivated"

    # Sessions
    SESSION_REVOKED = "success.session.revoked"
    OTHER_SESSIONS_REVOKED = "success.session.others_revoked"
    ADMIN_SESSIONS_REVOKED = "success.session.admin_revoked"

    # Admin
    ADMIN_USER_UPDATED = "success.admin.user_updated"
    ADMIN_USER_SUSPENDED = "success.admin.user_suspended"
    ADMIN_USER_UNSUSPENDED = "success.admin.user_unsuspended"
    ADMIN_USER_UNLOCKED = "success.admin.user_unlocked"
    ADMIN_USER_MFA_RESET = "success.admin.user_mfa_reset"
    ADMIN_USER_DELETED = "success.admin.user_deleted"
    ADMIN_PASSWORD_CHANGED = "success.admin.password_changed"

    # RBAC / admin management
    ADMIN_CREATED = "success.admin.created"
    ADMIN_ACCOUNT_DELETED = "success.admin.account_deleted"
    SUPERADMIN_PROMOTED = "success.admin.superadmin_promoted"
    SUPERADMIN_DEMOTED = "success.admin.superadmin_demoted"
    ADMIN_PERMISSIONS_UPDATED = "success.admin.permissions_updated"
    ROOT_TRANSFER_INITIATED = "success.admin.root_transfer_initiated"
    ROOT_TRANSFERRED = "success.admin.root_transferred"
    RBAC_ROLE_DELETED = "success.rbac.role_deleted"
    RBAC_PERMISSION_SET_DELETED = "success.rbac.permission_set_deleted"
    ASSISTANT_CONVERSATION_DELETED = "success.assistant.conversation_deleted"

    # File / upload
    FILE_UPLOADED = "success.file.uploaded"
    ADMIN_FILE_DELETED = "success.admin.file_deleted"

    # Notifications
    NOTIFICATION_READ = "success.notification.read"
    NOTIFICATIONS_ALL_READ = "success.notification.all_read"

    # Support / tickets
    TICKET_CREATED = "success.support.ticket_created"
    TICKET_CLOSED = "success.support.ticket_closed"
    TICKET_MESSAGE_SENT = "success.support.message_sent"
    ADMIN_TICKET_UPDATED = "success.support.admin_ticket_updated"
    ADMIN_TICKET_REPLIED = "success.support.admin_ticket_replied"

    # Announcements / broadcast
    BROADCAST_SENT = "success.announcement.sent"

    # System settings
    SETTINGS_UPDATED = "success.settings.updated"

    # Quote generator
    DEALERSHIP_DELETED = "success.dealership.deleted"
    SERVICE_DELETED = "success.catalog.service_deleted"
    CUSTOMER_DELETED = "success.customer.deleted"
    QUOTE_DELETED = "success.quote.deleted"
