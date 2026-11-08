class ErrorMessages:
    # System Errors
    VALIDATION_ERROR = "VALIDATION_ERROR"
    INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR"
    RESOURCE_NOT_FOUND = "RESOURCE_NOT_FOUND"
    INVALID_TOKEN = "INVALID_TOKEN"
    INSUFFICIENT_PERMISSIONS = "INSUFFICIENT_PERMISSIONS"
    RESOURCE_CONFLICT = "RESOURCE_CONFLICT"
    RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED"

    # User Specific
    INVALID_ROLE = "error.user.role_invalid"
    USER_NOT_FOUND = "error.user.not_found"
    EMAIL_ALREADY_EXISTS = "error.user.email_exists"
    INVALID_CREDENTIALS = "error.user.invalid_credentials"
    INVALID_PASSWORD = "error.user.invalid_password"
    WEAK_PASSWORD = "error.user.password_weak"
    USER_INACTIVE = "error.user.user_inactive"
    EMAIL_NOT_VERIFIED = "error.user.email_not_verified"
    INVALID_VERIFICATION_TOKEN = "error.user.invalid_verification_token"
    REFRESH_TOKEN_MISSING = "error.auth.refresh_token_missing"
    INVALID_CURRENT_PASSWORD = "error.auth.invalid_current_password"
    INVALID_EMAIL_DOMAIN = "error.user.invalid_email_domain"
    DISPOSABLE_EMAIL_NOT_ALLOWED = "error.user.disposable_email_not_allowed"

    # Account deactivation / grace-period deletion
    ACCOUNT_ALREADY_DEACTIVATED = "error.account.already_deactivated"
    ACCOUNT_NOT_DEACTIVATED = "error.account.not_deactivated"
    ACCOUNT_DELETION_EXPIRED = "error.account.deletion_expired"

    # Account suspension (admin-initiated, permanent)
    ACCOUNT_SUSPENDED = "error.account.suspended"
    ACCOUNT_ALREADY_SUSPENDED = "error.account.already_suspended"
    ACCOUNT_NOT_SUSPENDED = "error.account.not_suspended"

    # Account lockout (automatic, temporary — too many failed logins)
    ACCOUNT_LOCKED = "error.account.locked"

    # Admin MFA
    MFA_REQUIRED = "error.auth.mfa_required"
    MFA_INVALID_CODE = "error.auth.mfa_invalid_code"
    MFA_CHALLENGE_INVALID = "error.auth.mfa_challenge_invalid"
    MFA_ALREADY_ENABLED = "error.auth.mfa_already_enabled"
    MFA_RESET_ROOT_ONLY = "error.auth.mfa_reset_root_only"

    # Admin
    ADMIN_CANNOT_MODIFY_SELF = "error.admin.cannot_modify_self"
    ADMIN_CANNOT_DELETE_SELF = "error.admin.cannot_delete_self"
    ADMIN_CANNOT_DEMOTE_LAST_ADMIN = "error.admin.cannot_demote_last_admin"
    ADMIN_CANNOT_DELETE_LAST_ADMIN = "error.admin.cannot_delete_last_admin"

    # RBAC / superadmin
    ADMIN_CANNOT_MODIFY_SUPERADMIN = "error.admin.cannot_modify_superadmin"
    ADMIN_CANNOT_DELETE_LAST_SUPERADMIN = "error.admin.cannot_delete_last_superadmin"
    ONLY_SUPERADMIN_ALLOWED = "error.admin.only_superadmin"
    ONLY_ROOT_SUPERADMIN = "error.admin.only_root_superadmin"
    NOT_AN_ADMIN = "error.admin.not_an_admin"
    NOT_A_SUPERADMIN = "error.admin.not_a_superadmin"
    CANNOT_TRANSFER_TO_SELF = "error.admin.cannot_transfer_to_self"
    # Role-change immutability rules
    SUPERADMIN_ROLE_IMMUTABLE = "error.admin.superadmin_role_immutable"
    RBAC_PRIVILEGE_ESCALATION = "error.rbac.privilege_escalation"
    RBAC_ROLE_NOT_FOUND = "error.rbac.role_not_found"
    RBAC_PERMISSION_SET_NOT_FOUND = "error.rbac.permission_set_not_found"
    RBAC_KEY_ALREADY_EXISTS = "error.rbac.key_already_exists"
    RBAC_SYSTEM_ELEMENT = "error.rbac.system_element"
    RBAC_ROLE_IN_USE = "error.rbac.role_in_use"
    RBAC_PERMISSION_SET_IN_USE = "error.rbac.permission_set_in_use"
    RBAC_PERMISSION_AUDIENCE_MISMATCH = "error.rbac.permission_audience_mismatch"
    RBAC_SET_AUDIENCE_MISMATCH = "error.rbac.set_audience_mismatch"
    RBAC_USER_ROLE_REQUIRED = "error.rbac.user_role_required"
    RBAC_SUPERADMIN_TARGET = "error.rbac.superadmin_target"
    RBAC_ADMIN_ASSIGNMENT_FORBIDDEN = "error.rbac.admin_assignment_forbidden"
    RBAC_DUPLICATE_ASSIGNMENT = "error.rbac.duplicate_assignment"
    RBAC_EXPIRY_IN_PAST = "error.rbac.expiry_in_past"
    RBAC_SELF_PERMISSION_ROLES_ONLY = "error.rbac.self_permission_roles_only"

    # File / upload
    FILE_NOT_FOUND = "error.file.not_found"
    FILE_TOO_LARGE = "error.file.too_large"
    FILE_EMPTY = "error.file.empty"
    INVALID_FILE_TYPE = "error.file.invalid_type"
    FILE_FORBIDDEN = "error.file.forbidden"
    FILE_UPLOAD_FAILED = "error.file.upload_failed"

    # Notifications
    NOTIFICATION_NOT_FOUND = "error.notification.not_found"
    NOTIFICATION_ACCESS_DENIED = "error.notification.access_denied"

    # Sessions
    SESSION_NOT_FOUND = "error.session.not_found"

    # Support / tickets
    TICKET_NOT_FOUND = "error.support.ticket_not_found"
    TICKET_ACCESS_DENIED = "error.support.ticket_access_denied"
    TICKET_ALREADY_CLOSED = "error.support.ticket_already_closed"
    ATTACHMENT_NOT_FOUND = "error.support.attachment_not_found"
    ATTACHMENT_NOT_OWNED = "error.support.attachment_not_owned"
    ATTACHMENT_WRONG_CATEGORY = "error.support.attachment_wrong_category"
    INVALID_ASSIGNED_ADMIN = "error.support.invalid_assigned_admin"

    # Announcements / broadcast
    ANNOUNCEMENT_NOT_FOUND = "error.announcement.not_found"
    ANNOUNCEMENT_TEMPLATE_NOT_FOUND = "error.announcement.template_not_found"
    ANNOUNCEMENT_INVALID_CONTENT = "error.announcement.invalid_content"
    ANNOUNCEMENT_INVALID_AUDIENCE = "error.announcement.invalid_audience"

    # System settings
    SETTING_NOT_FOUND = "error.settings.not_found"
    SETTING_INVALID_VALUE = "error.settings.invalid_value"

    # System / availability
    MAINTENANCE_MODE = "error.system.maintenance"
    REGISTRATION_DISABLED = "error.auth.registration_disabled"
    SUPPORT_DISABLED = "error.support.disabled"

    # Quote generator (dealerships, catalog, customers, quotes)
    NO_DEALERSHIP = "error.quote.no_dealership"
    DEALERSHIP_NOT_FOUND = "error.dealership.not_found"
    DEALERSHIP_IN_USE = "error.dealership.in_use"
    SERVICE_NOT_FOUND = "error.catalog.service_not_found"
    SERVICE_IN_USE = "error.catalog.service_in_use"
    SERVICE_CATEGORY_NOT_FOUND = "error.catalog.category_not_found"
    SERVICE_UNAVAILABLE = "error.catalog.service_unavailable"
    CUSTOMER_NOT_FOUND = "error.customer.not_found"
    CUSTOMER_HAS_QUOTES = "error.customer.has_quotes"
    QUOTE_NOT_FOUND = "error.quote.not_found"
    QUOTE_DOWN_PAYMENT_TOO_HIGH = "error.quote.down_payment_too_high"
    QUOTE_FINANCING_INCOMPLETE = "error.quote.financing_incomplete"
    QUOTE_REFERENCE_CONFLICT = "error.quote.reference_conflict"
    ASSISTANT_CONVERSATION_NOT_FOUND = "error.assistant.conversation_not_found"
    ASSISTANT_NOT_CONFIGURED = "error.assistant.not_configured"
    ASSISTANT_UNAVAILABLE = "error.assistant.unavailable"
