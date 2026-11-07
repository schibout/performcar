# Graph Report - backend  (2026-11-07)

## Corpus Check
- 255 files · ~128,173 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 10 file(s) not represented in the graph (top: (none) 5, .ini 2, .example 1)

## Summary
- 4566 nodes · 14345 edges · 216 communities (120 shown, 96 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 1030 edges (avg confidence: 0.93)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- test_filename.py
- AsyncClient
- User
- list_users
- rbac_service.py
- utc_now
- Permission
- schemas/quote.py
- Email Tokens and Success Messages
- test_mfa_flow.py
- test_rbac_effective.py
- dealership_service.py
- AsyncClient
- make_client
- upload_file
- Broadcast Notification Tests
- test_scrub_audit_migration.py
- repositories/quote.py
- auth.py
- list_files
- Configuration and Email Services
- test_sessions.py
- test_quotes.py
- quote_service.py
- repositories/user.py
- list_my_tickets
- admin/support_service.py
- notify.py
- customers.py
- config.py
- routes/quotes.py
- get_redis
- admin/quotes.py
- Language
- lifespan.py
- serve_account_socket
- is_login_locked
- tests/test_files.py
- broadcast_service.py
- notifications.py
- asyncio
- test_rbac_api.py
- _assign_set
- env.py
- models/user.py
- list_tickets
- get_stats
- sqlalchemy
- repositories/user_session.py
- tests/conftest.py
- send_broadcast_emails.py
- announcements.py
- AssignmentItem
- get_current_user
- AsgiSocket
- routes/health.py
- storage.py
- test_redis_failure_falls_back_to_database_and_never_grants
- API Exception Handlers
- Settings
- realtime.py
- test_realtime.py
- Admin File Tests
- SystemRole
- ActiveUser
- ErrorMessages
- use_cases/settings.py
- test_metrics.py
- make_user_client
- _grant
- UserActivity
- _BrokenPipeline
- system_settings_service.py
- test_rbac_route_coverage.py
- Origin Restriction Tests
- delete_user_me
- make_user_client
- rate_limit.py
- user_agent.py
- _find_kwarg
- mfa_service.py
- security.py
- repositories/rbac.py
- test_rbac.py
- get_user_id
- collections_abc
- _seed_target
- list_user_activities
- _SafeDict
- VariableType
- ResourceType
- test_rbac_user_routes.py
- services/session_service.py
- test_promotion_does_not_revive_a_lingering_grant
- test_admin_socket_serves_a_session_with_mfa_claim
- admin/system_settings.py
- admin_service.py
- _make_user
- admins.py
- ensure_utc
- register_and_verify
- test_auth.py
- list_my_notifications
- quotes/conftest.py
- worker/settings.py
- admin_delete_service
- _open_admin_socket
- test_user_key_alone_does_not_reach_a_plain_admin
- telemetry.py
- list_admins_endpoint
- BaseModel
- f1a2b3c4d5e6_add_quote_generator.py
- AsyncClient
- routes/system_settings.py
- log_activity
- RbacAudience
- delete_service_service
- _set_id
- _assert_refused
- _load_account
- api/middleware.py
- start_realtime
- user_has_permission
- app/main.py
- admin/file.py
- email_templates.py
- permission.py
- initiate_root_transfer_service
- token.py
- QuoteSort
- test_path_components_are_stripped
- client_factory
- test_known_caller_is_audited_and_pending_work_is_discarded
- _not_in_past
- dummy_rate_limit_endpoint
- test_rate_limiter_exceed
- JobContext
- _normalize_phone

## God Nodes (most connected - your core abstractions)
1. `User` - 270 edges
2. `ErrorMessages` - 202 edges
3. `Permission` - 139 edges
4. `SystemRole` - 136 edges
5. `register_and_verify()` - 134 edges
6. `get_user_id()` - 114 edges
7. `utc_now()` - 110 edges
8. `log_activity()` - 101 edges
9. `audit_unexpected_failure()` - 86 edges
10. `ResourceType` - 85 edges

## Surprising Connections (you probably didn't know these)
- `seed()` --calls--> `get_user_by_email()`  [EXTRACTED]
  loadtest/seed_users.py → app/repositories/user.py
- `get_password_hash()` --calls--> `seed()`  [EXTRACTED]
  app/core/security.py → loadtest/seed_users.py
- `_require_customer()` --uses--> `Customer`  [INFERRED]
  app/services/customer_service.py → app/models/quote.py
- `_apply_financing()` --uses--> `Quote`  [INFERRED]
  app/services/quote_service.py → app/models/quote.py
- `_apply_vehicle()` --uses--> `Quote`  [INFERRED]
  app/services/quote_service.py → app/models/quote.py

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **FastAPI Template Tech Stack** — uv_package_manager, app_core, app_models, app_worker [EXTRACTED 1.00]
- **Architecture Dependency Flow** — app_api_routes, app_services, app_repositories, app_models [EXTRACTED 1.00]

## Communities (216 total, 96 thin omitted)

### Community 0 - "test_filename.py"
Cohesion: 0.09
Nodes (16): test_control_characters_and_null_bytes_removed(), test_custom_max_length_is_respected(), test_empty_after_sanitizing_falls_back(), test_injection_characters_are_replaced(), test_leading_dots_are_trimmed(), test_long_name_truncated_within_limit_keeping_extension(), test_none_passes_through(), test_plain_name_is_preserved() (+8 more)

### Community 1 - "AsyncClient"
Cohesion: 0.10
Nodes (14): _enable_maintenance(), test_list_settings_returns_registry(), test_maintenance_allows_admin(), test_maintenance_blocks_anonymous(), test_maintenance_blocks_regular_user(), test_maintenance_exempts_login(), test_maintenance_exempts_public_settings(), test_patch_invalid_value_returns_422() (+6 more)

### Community 2 - "User"
Cohesion: 0.05
Nodes (38): ensure_first_superadmin(), _ensure_root_designated(), generate_secure_random_password(), User, _filtered_users_stmt(), get_earliest_superadmin(), is_last_active_admin(), is_last_active_superadmin() (+30 more)

### Community 3 - "list_users"
Cohesion: 0.09
Nodes (11): change_user_password(), delete_user(), get_user(), list_user_sessions(), list_users(), reset_user_mfa(), revoke_user_sessions(), suspend_user() (+3 more)

### Community 4 - "rbac_service.py"
Cohesion: 0.04
Nodes (65): create_permission_set_endpoint(), create_role_endpoint(), delete_permission_set_endpoint(), delete_role_endpoint(), get_permission_set_endpoint(), get_role_endpoint(), get_user_access_endpoint(), list_permission_sets_endpoint() (+57 more)

### Community 5 - "utc_now"
Cohesion: 0.10
Nodes (15): _entry(), _role_keys(), _set_keys(), _store_role_assignment(), _store_set_assignment(), test_access_names_the_source_of_each_key(), test_account_keeps_a_user_role(), test_demotion_keeps_user_audience_assignments() (+7 more)

### Community 6 - "Permission"
Cohesion: 0.05
Nodes (33): require_any_permission(), _require(), SystemPermissionSetDefinition, SystemRoleDefinition, get_user_permissions(), get_assigned_permissions(), get_permanent_assigned_permissions(), _keys_through_roles() (+25 more)

### Community 7 - "schemas/quote.py"
Cohesion: 0.06
Nodes (27): read_active_services(), read_vehicle_catalog(), CarBrandResponse, CarColorResponse, CarModelResponse, CarVersionResponse, _check_person_name(), _check_year() (+19 more)

### Community 8 - "Email Tokens and Success Messages"
Cohesion: 0.12
Nodes (11): auth_client(), test_deactivated_user_blocked_from_update(), test_delete_user_me_schedules_deletion(), test_delete_user_me_twice_returns_400(), test_delete_user_me_wrong_password_rejected(), test_me_exposes_deletion_schedule(), test_reactivate_cancels_deletion(), test_reactivate_on_active_account_returns_400() (+3 more)

### Community 9 - "test_mfa_flow.py"
Cohesion: 0.05
Nodes (53): access_claims(), assert_lists_admin_keys(), audit_rows(), create_admin(), enable_maintenance(), enroll(), mfa_row(), open_admin_session() (+45 more)

### Community 11 - "test_rbac_effective.py"
Cohesion: 0.11
Nodes (11): require_user_permission(), AdminPermission, _role_id(), _set_id(), test_deleting_the_assigning_admin_clears_assigned_by(), test_factories_expose_their_permission(), test_require_user_permission_accepts_regular_user_holding_the_key(), test_require_user_permission_refuses_without_the_key() (+3 more)

### Community 12 - "dealership_service.py"
Cohesion: 0.08
Nodes (21): admin_create_dealership(), admin_delete_dealership(), admin_get_dealership(), admin_list_dealerships(), admin_update_dealership(), read_my_dealership(), update_my_dealership(), DealershipCreate (+13 more)

### Community 13 - "AsyncClient"
Cohesion: 0.07
Nodes (25): _make_admin(), _seed_superadmin(), test_admin_without_admins_read_cannot_list(), test_admin_without_grant_is_forbidden(), test_admins_delete_does_not_imply_write(), test_admins_write_does_not_imply_delete(), test_delegated_admin_cannot_change_its_own_grants(), test_delegated_admin_cannot_create_with_a_key_it_lacks() (+17 more)

### Community 14 - "make_client"
Cohesion: 0.09
Nodes (21): _assignments(), make_client(), root(), test_admin_assignment_needs_admins_write(), test_admin_target_needs_admins_write(), test_assignment_opens_then_withdrawal_closes_the_panel(), test_connected_account_sees_a_role_assignment_at_once(), test_delegate_with_admins_write_promotes() (+13 more)

### Community 16 - "Broadcast Notification Tests"
Cohesion: 0.07
Nodes (19): _announcement_notifications(), _notification_count(), test_active_banner_absent_returns_null(), test_create_active_audience_targets_active_users(), test_create_custom_broadcast(), test_create_custom_with_template_key_is_rejected(), test_create_custom_without_translations_is_rejected(), test_create_forbidden_for_regular_user() (+11 more)

### Community 17 - "test_scrub_audit_migration.py"
Cohesion: 0.13
Nodes (5): _load_rbac_migration(), test_migration_uses_the_catalog_default_role_id(), _load_migration(), _seed(), test_scrub_rewrites_only_the_targeted_rows()

### Community 18 - "repositories/quote.py"
Cohesion: 0.07
Nodes (26): Customer, Quote, QuoteService, count_customer_quotes(), count_dealership_quotes(), count_references_with_prefix(), get_category(), get_customer() (+18 more)

### Community 19 - "auth.py"
Cohesion: 0.07
Nodes (31): audit_unexpected_failure(), change_password(), _clear_auth_cookies(), forgot_password(), login_access_token(), logout(), mfa_enroll_confirm(), mfa_enroll_start() (+23 more)

### Community 20 - "list_files"
Cohesion: 0.15
Nodes (3): delete_file(), get_file(), list_files()

### Community 21 - "Configuration and Email Services"
Cohesion: 0.13
Nodes (14): check_mx_record(), _get_domain(), is_disposable_email(), send_email(), reset_disposable_cache(), test_check_mx_record_invalid(), test_check_mx_record_valid(), test_is_disposable_email_false() (+6 more)

### Community 22 - "test_sessions.py"
Cohesion: 0.19
Nodes (17): _fresh_client(), _insert_session(), _login(), test_admin_lists_and_revokes_user_sessions(), test_admin_sessions_require_permission(), test_change_password_revokes_every_session(), test_list_sessions_pagination(), test_login_creates_session_with_device_metadata() (+9 more)

### Community 23 - "test_quotes.py"
Cohesion: 0.08
Nodes (26): assign_role(), attach_dealership(), Catalog, make_dealer(), make_dealership(), make_network_admin(), quote_payload(), _create() (+18 more)

### Community 24 - "quote_service.py"
Cohesion: 0.09
Nodes (20): FinancingType, QuoteCustomerData, QuoteStatus, _apply_financing(), _apply_vehicle(), _bad_request(), create_quote_service(), _current_financing() (+12 more)

### Community 25 - "repositories/user.py"
Cohesion: 0.08
Nodes (19): get_password_hash(), bulk_hard_delete_users(), deactivate_user(), get_user_by_id(), get_users_due_for_deletion(), hard_delete_user(), reactivate_user(), unsuspend_user() (+11 more)

### Community 26 - "list_my_tickets"
Cohesion: 0.10
Nodes (7): close_ticket(), create_ticket(), get_my_ticket(), list_my_tickets(), reply_ticket(), support_feed_ws(), authorize()

### Community 27 - "admin/support_service.py"
Cohesion: 0.03
Nodes (71): publish_feeds(), SupportMessage, SupportMessageAttachment, SupportTicket, _filtered_tickets_stmt(), list_tickets_admin(), add_message(), attach_files() (+63 more)

### Community 28 - "notify.py"
Cohesion: 0.14
Nodes (7): notifications_topic(), NotificationEventType, NotificationRealtimeEvent, NotificationType, test_notifications_topic_format(), notify(), notify_many()

### Community 29 - "customers.py"
Cohesion: 0.08
Nodes (13): create_my_customer(), delete_my_customer(), get_my_customer(), list_my_customers(), update_my_customer(), CustomerListItem, CustomerListResponse, CustomerResponse (+5 more)

### Community 30 - "config.py"
Cohesion: 0.05
Nodes (25): decrypt_secret(), encrypt_secret(), _fernet(), generate_recovery_codes(), generate_totp_secret(), hash_recovery_code(), provisioning_uri(), verify_totp() (+17 more)

### Community 31 - "routes/quotes.py"
Cohesion: 0.09
Nodes (11): create_my_quote(), delete_my_quote(), get_my_quote(), list_my_quotes(), my_quote_stats(), update_my_quote(), QuoteCreate, QuoteListResponse (+3 more)

### Community 32 - "get_redis"
Cohesion: 0.25
Nodes (5): delete_root_transfer_otp(), _hash_code(), _key(), store_root_transfer_otp(), verify_root_transfer_otp()

### Community 33 - "admin/quotes.py"
Cohesion: 0.11
Nodes (10): admin_delete_customer(), admin_delete_quote(), admin_get_customer(), admin_get_quote(), admin_list_customers(), admin_list_quotes(), admin_quote_stats(), admin_update_customer() (+2 more)

### Community 34 - "Language"
Cohesion: 0.07
Nodes (23): _format_datetime(), get_template(), render_template(), RenderedContent, template_exists(), Language, BroadcastEmail, build_broadcast_email() (+15 more)

### Community 35 - "lifespan.py"
Cohesion: 0.12
Nodes (8): close_arq_pool(), get_arq_pool(), init_arq_pool(), lifespan(), _build_pool(), close_redis(), init_redis(), set_redis_for_testing()

### Community 36 - "serve_account_socket"
Cohesion: 0.12
Nodes (6): _handle_command(), serve_account_socket(), serve_multiplex(), _serving(), test_frame_racing_the_close_ends_the_socket_quietly(), test_runtime_error_on_an_open_socket_still_surfaces()

### Community 37 - "is_login_locked"
Cohesion: 0.09
Nodes (15): get_redis(), clear_login_attempts(), _fail_key(), _hash(), is_login_locked(), _lock_key(), register_failed_login(), add_token_to_blacklist() (+7 more)

### Community 38 - "tests/test_files.py"
Cohesion: 0.14
Nodes (16): _promote_to_admin(), _register_verify_login(), test_attach_others_file_forbidden(), test_replace_avatar_deletes_old(), test_set_avatar_via_patch_me(), test_upload_branding_logo_allowed_for_admin(), test_upload_branding_logo_forbidden_for_regular_user(), test_upload_category_buckets_into_folder() (+8 more)

### Community 39 - "broadcast_service.py"
Cohesion: 0.08
Nodes (16): create_broadcast(), get_broadcast_templates(), list_broadcasts(), list_templates(), get_target_user_ids(), AnnouncementContent, AnnouncementCreator, AnnouncementKind (+8 more)

### Community 40 - "notifications.py"
Cohesion: 0.11
Nodes (17): Notification, count_unread(), create_notification(), get_notification(), list_notifications(), mark_all_read(), mark_read(), NotificationListResponse (+9 more)

### Community 41 - "asyncio"
Cohesion: 0.11
Nodes (15): _account(), test_access_of_a_superadmin_shows_every_key(), test_access_of_a_user_hides_keys_outside_its_tier(), test_assigned_role_cannot_be_deleted(), test_assignment_invalidates_and_publishes(), test_assignment_needs_the_keys(), test_assignment_reports_a_role_deleted_meanwhile(), test_assignment_reports_a_set_deleted_meanwhile() (+7 more)

### Community 42 - "test_rbac_api.py"
Cohesion: 0.07
Nodes (17): _role_payload(), _role_row(), _set_payload(), test_audience_and_key_cannot_be_edited(), test_connected_account_sees_a_set_edit_at_once(), test_crud_routes_refuse_without_their_permission(), test_duplicate_key_is_a_conflict(), test_element_edits_and_deletes_take_the_lock() (+9 more)

### Community 43 - "_assign_set"
Cohesion: 0.18
Nodes (7): _assign_role(), _assign_set(), test_effective_is_union_of_roles_sets_and_direct_grants(), test_expired_assignment_stops_counting_without_invalidation(), test_future_expiry_and_no_expiry_both_count(), test_next_assignment_expiry_ignores_lapsed_and_unlimited_rows(), test_other_accounts_sources_do_not_leak()

### Community 44 - "env.py"
Cohesion: 0.11
Nodes (8): do_run_migrations(), run_async_migrations(), run_migrations_offline(), run_migrations_online(), downgrade(), scrub_details(), _scrubbed(), upgrade()

### Community 45 - "models/user.py"
Cohesion: 0.27
Nodes (4): Base, Dealership, _in(), test_account_topic_format()

### Community 46 - "list_tickets"
Cohesion: 0.12
Nodes (5): get_ticket(), list_tickets(), reply_ticket(), update_ticket(), rate_limit_authenticated()

### Community 47 - "get_stats"
Cohesion: 0.18
Nodes (4): get_stats(), get_admin_stats(), AdminStats, get_admin_stats_service()

### Community 48 - "sqlalchemy"
Cohesion: 0.04
Nodes (26): upgrade(), upgrade(), downgrade(), upgrade(), upgrade(), downgrade(), upgrade(), upgrade() (+18 more)

### Community 49 - "repositories/user_session.py"
Cohesion: 0.17
Nodes (9): UserSession, create_session(), get_session_by_id(), is_session_revoked(), list_active_sessions(), purge_stale_sessions(), revoke_session(), _revoked_key() (+1 more)

### Community 50 - "tests/conftest.py"
Cohesion: 0.06
Nodes (17): client(), create_test_database(), disable_admin_mfa(), _enable_sqlite_foreign_keys(), fake_redis(), mock_cloudinary(), _fake_upload(), mock_email_send() (+9 more)

### Community 51 - "send_broadcast_emails.py"
Cohesion: 0.07
Nodes (17): Announcement, create_announcement(), deactivate_other_banners(), get_announcement(), list_announcements(), _apply_audience(), get_target_user_emails(), AnnouncementAudience (+9 more)

### Community 52 - "announcements.py"
Cohesion: 0.18
Nodes (5): get_active_announcement(), get_active_banner(), ActiveBannerResponse, AnnouncementRead, get_active_banner_service()

### Community 54 - "get_current_user"
Cohesion: 0.09
Nodes (17): _ensure_admin_mfa(), ensure_permission(), get_current_active_user(), get_current_admin_user(), get_current_session_id(), get_current_superadmin(), get_current_user(), get_ws_admin_user() (+9 more)

### Community 55 - "AsgiSocket"
Cohesion: 0.12
Nodes (9): test_admin_socket_handshake_requires_support_read(), AsgiSocket, test_account_events_socket_stays_in_the_socle(), test_expired_support_read_closes_a_live_route_socket(), test_failed_check_lets_the_handshake_decide_again(), test_socket_accepted_with_the_key_and_receives_its_feed(), test_socket_closed_when_the_key_vanished_during_the_handshake(), test_support_socket_cannot_follow_another_users_ticket() (+1 more)

### Community 56 - "routes/health.py"
Cohesion: 0.15
Nodes (12): _check_database(), _check_redis(), _elapsed_ms(), liveness(), readiness(), CheckResult, LivenessResponse, ReadinessResponse (+4 more)

### Community 57 - "storage.py"
Cohesion: 0.17
Nodes (5): _configure(), delete_file(), is_configured(), upload_file(), UploadResult

### Community 58 - "test_redis_failure_falls_back_to_database_and_never_grants"
Cohesion: 0.15
Nodes (4): _BrokenRedis, test_invalidation_tolerates_redis_failure(), test_redis_failure_falls_back_to_database_and_never_grants(), test_uninitialized_redis_falls_back_to_database()

### Community 59 - "API Exception Handlers"
Cohesion: 0.16
Nodes (5): general_exception_handler(), http_exception_handler(), rate_limit_exception_handler(), register_exception_handlers(), validation_exception_handler()

### Community 61 - "realtime.py"
Cohesion: 0.09
Nodes (8): _parse_ticket_topic(), publish(), user_topic(), _wait_for_refusal(), _WakeOnFrame, watch_socket(), test_parse_ticket_topic(), test_user_topic_format()

### Community 63 - "test_realtime.py"
Cohesion: 0.08
Nodes (18): ConnectionManager, _allow(), _deny(), _seed_user(), StubWebSocket, test_can_user_access_ticket_gate(), test_disconnect_all_clears_every_topic(), test_get_ws_user_with_blacklisted_token_returns_none() (+10 more)

### Community 64 - "Admin File Tests"
Cohesion: 0.20
Nodes (9): test_admin_delete_file(), test_admin_delete_file_clears_avatar(), test_admin_files_requires_superuser(), test_admin_get_file_detail(), test_admin_get_missing_file_404(), test_admin_list_files(), test_admin_list_files_filter_content_type(), test_admin_list_files_filter_uploader() (+1 more)

### Community 65 - "SystemRole"
Cohesion: 0.10
Nodes (17): SystemRole, _has(), _make_user(), test_account_without_any_source_has_nothing(), test_admin_permission_ignored_for_user_tier(), test_admin_tier_needs_the_key_in_its_effective_set(), test_database_failure_is_not_swallowed(), test_ensure_permission_raises_403_when_refused() (+9 more)

### Community 66 - "ActiveUser"
Cohesion: 0.10
Nodes (5): ActiveUser, _credentials(), HealthCeilingUser, _login(), LoginStormUser

### Community 67 - "ErrorMessages"
Cohesion: 0.06
Nodes (32): ErrorMessages, SuccessMessages, _reject_self_permissions(), _validate_password_strength(), test_admin_with_every_permission_reads_the_admin_list(), test_create_admin_account_with_permissions(), test_create_admin_duplicate_email_conflicts(), test_create_admin_refuses_self_keys_with_a_message_key() (+24 more)

### Community 68 - "use_cases/settings.py"
Cohesion: 0.11
Nodes (11): coerce(), get_definition(), SettingCategory, SettingDefinition, SettingValueType, _validate_locale(), _validate_non_empty(), _validate_upload_size() (+3 more)

### Community 69 - "test_metrics.py"
Cohesion: 0.19
Nodes (5): root_client(), test_metrics_200_with_correct_token(), test_metrics_404_with_wrong_token(), test_metrics_404_without_token_in_production(), test_metrics_open_in_local()

### Community 70 - "make_user_client"
Cohesion: 0.13
Nodes (11): get_user_id(), seed_notification(), test_list_empty(), test_list_newest_first_and_unread_count(), test_list_only_my_notifications(), test_list_pagination_and_unread_only(), test_list_requires_auth(), test_mark_all_read() (+3 more)

### Community 71 - "_grant"
Cohesion: 0.25
Nodes (4): _grant(), test_expired_role_keeps_the_same_permission_from_another_source(), test_require_any_permission_exposes_the_tuple_and_needs_one_key(), test_users_me_lists_only_usable_keys_for_regular_user()

### Community 72 - "UserActivity"
Cohesion: 0.06
Nodes (26): actor_reference(), UserActivity, anonymize_user_activities(), anonymize_own_row(), strip_about_row(), create_user_activity(), purge_anonymized_activities(), _rewrite_in_batches() (+18 more)

### Community 74 - "system_settings_service.py"
Cohesion: 0.17
Nodes (8): to_str(), SystemSetting, get_all_system_settings(), get_system_setting_by_key(), upsert_system_setting(), _to_read(), _type_matches(), update_setting_service()

### Community 75 - "test_rbac_route_coverage.py"
Cohesion: 0.09
Nodes (10): custom_generate_unique_id(), _app_routes(), _classification_problems(), _dependants(), _http_endpoints(), _is_superadmin_only(), _permissions(), test_admin_route_labelled_only_with_a_self_key_is_refused() (+2 more)

### Community 76 - "Origin Restriction Tests"
Cohesion: 0.32
Nodes (6): test_allowed_origin(), test_cross_origin_post_blocked(), test_no_origin(), test_same_origin_post(), test_same_origin_put(), test_unauthorized_origin()

### Community 77 - "delete_user_me"
Cohesion: 0.09
Nodes (8): account_events_ws(), delete_user_me(), list_my_sessions(), reactivate_user_me(), read_user_me(), revoke_my_other_sessions(), revoke_my_session(), update_user_me()

### Community 79 - "make_user_client"
Cohesion: 0.08
Nodes (22): StubWebSocket, test_admin_reply_notifies_owner(), test_admin_self_reply_stays_silent(), test_notify_persists_and_publishes(), test_permissions_update_notifies_admin(), test_priority_only_change_stays_silent(), test_status_change_notifies_owner(), make_admin_client() (+14 more)

### Community 82 - "_find_kwarg"
Cohesion: 0.40
Nodes (3): decorator(), wrapper(), _find_kwarg()

### Community 83 - "mfa_service.py"
Cohesion: 0.09
Nodes (23): consume_recovery_code(), count_unused_recovery_codes(), delete_mfa(), enable_mfa(), get_mfa(), replace_recovery_codes(), update_last_used_step(), upsert_pending_mfa() (+15 more)

### Community 84 - "security.py"
Cohesion: 0.07
Nodes (17): _base_payload(), create_access_token(), _create_email_token(), create_mfa_token(), create_refresh_token(), decode_token_payload(), _verify_email_token(), verify_new_account_token() (+9 more)

### Community 85 - "repositories/rbac.py"
Cohesion: 0.05
Nodes (42): RbacPermissionSet, RbacRole, RbacRolePermissionSet, RbacUserPermissionSet, RbacUserRole, _apply_assignments(), assign_default_role(), create_permission_set() (+34 more)

### Community 86 - "test_rbac.py"
Cohesion: 0.12
Nodes (13): _assign_role(), _assign_set(), _assigned_role_keys(), _assigned_set_keys(), _in_an_hour(), _load_effective_from_cache(), _new_admin_body(), test_demotion_invalidates_a_cached_admin_key() (+5 more)

### Community 88 - "get_user_id"
Cohesion: 0.05
Nodes (30): get_user_id(), StubWebSocket, test_permission_change_publishes_realtime_event(), test_activities_today_excludes_older_rows(), test_stats_requires_admin(), test_stats_without_auth_returns_401(), test_admin_cannot_change_user_email(), test_admin_cannot_deactivate_self() (+22 more)

### Community 90 - "collections_abc"
Cohesion: 0.18
Nodes (4): downgrade(), upgrade(), downgrade(), upgrade()

### Community 94 - "_seed_target"
Cohesion: 0.10
Nodes (13): _account_exists(), _direct_grants(), _seed_target(), test_admins_read_lists_without_being_able_to_modify(), test_delegated_admin_cannot_delete_itself(), test_delegated_admin_cannot_grant_a_key_it_lacks(), test_delegated_admin_cannot_revoke_a_key_it_lacks(), test_delegated_admin_deletes_a_plain_admin() (+5 more)

### Community 100 - "ResourceType"
Cohesion: 0.05
Nodes (26): require_permission(), main(), _run_and_dispose(), _filtered_activities_stmt(), list_activities_admin(), AdminActivityFilter, AdminActivityItem, AdminActivityListResponse (+18 more)

### Community 101 - "test_rbac_user_routes.py"
Cohesion: 0.02
Nodes (69): ensure_system_rbac_catalog(), account_topic(), RbacPermissionSetItem, ensure_rbac_catalog(), _count(), _default_role_holders(), _role_contents(), _set_contents() (+61 more)

### Community 102 - "services/session_service.py"
Cohesion: 0.07
Nodes (17): publish_safe(), flag_sessions_revoked(), revoke_all_sessions(), AccountEvent, AccountEventType, SessionListResponse, SessionRead, SessionsRevokedResponse (+9 more)

### Community 113 - "test_promotion_does_not_revive_a_lingering_grant"
Cohesion: 0.15
Nodes (7): _last_audit(), test_direct_grant_editor_demotes_on_the_last_grant(), test_promotion_does_not_revive_a_lingering_grant(), test_role_mutations_are_audited(), test_set_edit_invalidates_after_commit(), _read_state(), test_set_mutations_are_audited()

### Community 123 - "test_admin_socket_serves_a_session_with_mfa_claim"
Cohesion: 0.22
Nodes (4): admin_feed_ws(), authorize(), _stub_socket(), test_admin_socket_serves_a_session_with_mfa_claim()

### Community 124 - "admin/system_settings.py"
Cohesion: 0.13
Nodes (7): list_system_settings(), update_system_setting(), SettingRead, SettingsListResponse, SettingUpdate, SettingUpdateResponse, list_all_settings_service()

### Community 126 - "admin_service.py"
Cohesion: 0.18
Nodes (11): AdminMutationResponse, confirm_root_transfer_service(), create_admin_service(), demote_superadmin_service(), _effective_permissions(), _guard_not_self(), list_admins_service(), _notify_permissions_changed() (+3 more)

### Community 128 - "_make_user"
Cohesion: 0.13
Nodes (12): _cache_key(), _effective(), restore_redis(), test_already_expired_assignment_does_not_cap_the_ttl(), test_assignment_expiring_within_a_second_is_not_cached(), test_cache_ttl_is_capped_at_the_next_expiry(), test_cache_uses_the_configured_ttl_without_a_nearer_expiry(), test_corrupted_cache_entry_is_replaced_from_the_database() (+4 more)

### Community 143 - "admins.py"
Cohesion: 0.18
Nodes (7): confirm_transfer_root(), create_admin(), delete_admin(), demote_superadmin(), promote_admin(), set_admin_permissions(), transfer_root()

### Community 146 - "ensure_utc"
Cohesion: 0.20
Nodes (5): _assignment_snapshot(), _changed_elements(), _is_expired(), _to_assignments(), ensure_utc()

### Community 149 - "register_and_verify"
Cohesion: 0.06
Nodes (32): admin_client(), grant_all_permissions(), grant_permissions(), login(), nonroot_superadmin_client(), promote_to_admin(), promote_to_superadmin(), register_and_verify() (+24 more)

### Community 150 - "test_auth.py"
Cohesion: 0.20
Nodes (14): create_password_reset_token(), generate_new_account_token(), test_change_password(), test_forgot_and_reset_password_flow(), test_login(), test_logout_revokes_refresh_token_directly(), test_refresh_for_deleted_user_returns_403_and_audits_pseudonym(), test_refresh_token_and_logout() (+6 more)

### Community 152 - "list_my_notifications"
Cohesion: 0.14
Nodes (5): get_unread_count(), list_my_notifications(), mark_all_notifications_read(), mark_notification_read(), notifications_ws()

### Community 154 - "quotes/conftest.py"
Cohesion: 0.24
Nodes (8): CarBrand, CarColor, CarModel, CarVersion, Service, ServiceCategory, _Timestamps, catalog()

### Community 155 - "worker/settings.py"
Cohesion: 0.13
Nodes (5): SessionPurgeJobResult, JobContext, purge_stale_sessions(), _redis_settings(), WorkerSettings

### Community 156 - "admin_delete_service"
Cohesion: 0.17
Nodes (5): admin_create_service(), admin_delete_service(), admin_list_services(), admin_update_service(), admin_vehicle_catalog()

### Community 157 - "_open_admin_socket"
Cohesion: 0.18
Nodes (8): _expect_policy_close(), _open_admin_socket(), test_admin_socket_closes_when_cut_off_through_the_users_surface(), test_admin_socket_closes_when_demoted_despite_an_admin_role(), test_admin_socket_closes_when_superadmin_is_demoted(), test_admin_socket_closes_when_support_read_is_revoked(), test_admin_socket_closes_when_the_account_is_deleted(), test_admin_socket_survives_a_change_keeping_support_read()

### Community 158 - "test_user_key_alone_does_not_reach_a_plain_admin"
Cohesion: 0.16
Nodes (7): _call_user_route(), _prepare_target(), test_delegated_admin_cannot_unsuspend_a_superadmin(), test_tier_routes_stay_refused_to_a_fully_delegated_admin(), test_user_key_alone_does_not_reach_a_plain_admin(), test_user_key_alone_still_reaches_a_regular_account(), test_user_key_with_the_admin_key_reaches_a_plain_admin()

### Community 160 - "list_admins_endpoint"
Cohesion: 0.15
Nodes (5): list_admins_endpoint(), list_permission_catalog(), directly_grantable_permissions(), PermissionCatalogResponse, get_permission_catalog_service()

### Community 161 - "BaseModel"
Cohesion: 0.13
Nodes (7): AdminActorRef, AdminCreate, AdminFileUploader, AdminListItem, AdminListResponse, AdminPermissionsUpdate, RootTransferConfirm

### Community 163 - "f1a2b3c4d5e6_add_quote_generator.py"
Cohesion: 0.18
Nodes (5): _create_tables(), downgrade(), _seed_catalog(), _timestamps(), upgrade()

### Community 164 - "AsyncClient"
Cohesion: 0.20
Nodes (6): test_activity_rows_embed_the_actor(), test_admin_activity_list_exposes_user_deleted_at(), test_admin_activity_list_returns_deleted_actor(), test_list_activities_global_filters(), test_list_activities_status_code_filter(), test_search_activities_by_actor_name_or_email()

### Community 165 - "routes/system_settings.py"
Cohesion: 0.21
Nodes (4): read_public_settings(), PublicSettingsResponse, get_public_settings_service(), _resolved_items()

### Community 166 - "log_activity"
Cohesion: 0.06
Nodes (40): run(), aget_password_hash(), averify_password(), File, create_file(), delete_file(), get_file(), get_user_by_email() (+32 more)

### Community 169 - "RbacAudience"
Cohesion: 0.19
Nodes (7): permissions_allowed_for(), RbacAudience, RbacSourceKind, _ensure_keys_fit_audience(), test_admin_audience_admits_any_permission(), test_user_audience_only_admits_self_permissions(), test_catalog_only_uses_valid_permissions_per_audience()

### Community 170 - "delete_service_service"
Cohesion: 0.27
Nodes (5): create_service_service(), delete_service_service(), _require_category(), _require_service(), update_service_service()

### Community 171 - "_set_id"
Cohesion: 0.15
Nodes (6): _set_id(), test_promotion_checks_the_keys_of_a_resent_admin_row(), test_role_content_needs_the_keys(), test_role_crud(), test_role_edit_reaches_an_account_with_a_cached_entry(), test_role_only_holds_sets_of_its_audience()

### Community 172 - "_assert_refused"
Cohesion: 0.12
Nodes (8): _assert_refused(), _role_id(), test_access_of_an_admin_needs_admins_read(), test_actor_cannot_change_its_own_access(), test_assignment_payload_is_checked(), test_set_content_needs_the_keys(), test_set_withdrawal_needs_the_key(), test_system_elements_cannot_change()

### Community 173 - "_load_account"
Cohesion: 0.17
Nodes (6): _load_account(), test_admin_key_on_user_routes_is_read_past_the_cache(), test_ensure_can_grant_accepts_nothing_to_grant(), test_ensure_can_grant_ignores_a_stale_cache(), test_ensure_can_grant_ignores_grants_outside_the_tier(), test_permission_change_reaches_the_target_at_once()

### Community 174 - "api/middleware.py"
Cohesion: 0.27
Nodes (5): get_db(), resolve_optional_user(), register_maintenance_middleware(), maintenance_mode_middleware(), get_bool()

### Community 175 - "start_realtime"
Cohesion: 0.20
Nodes (5): _listen(), start_realtime(), stop_realtime(), admin_socket_bus(), live_bus()

### Community 176 - "user_has_permission"
Cohesion: 0.17
Nodes (7): _root_client(), test_demotion_drops_a_cached_entry(), test_direct_grant_change_applies_immediately(), test_promotion_drops_the_cached_grants(), test_users_me_lists_nothing_for_account_without_role(), test_users_me_lists_self_permissions_for_regular_user(), test_users_me_still_omits_the_list_for_superadmin()

### Community 177 - "app/main.py"
Cohesion: 0.10
Nodes (3): init_metrics(), register_middleware(), init_sentry()

### Community 178 - "admin/file.py"
Cohesion: 0.24
Nodes (3): _filtered_files_stmt(), get_file_admin(), list_files_admin()

### Community 179 - "email_templates.py"
Cohesion: 0.18
Nodes (5): generate_account_deactivation_email(), generate_account_locked_email(), generate_email_verification_email(), generate_password_reset_email(), generate_password_reset_notification_email()

### Community 191 - "permission.py"
Cohesion: 0.39
Nodes (3): get_permissions_for_users(), set_user_permissions(), stage_user_permissions()

### Community 192 - "initiate_root_transfer_service"
Cohesion: 0.25
Nodes (4): generate_otp_code(), RootTransferRequest, initiate_root_transfer_service(), generate_root_transfer_otp_email()

### Community 193 - "token.py"
Cohesion: 0.36
Nodes (4): CookieRefreshResponse, RefreshedTokens, Token, TokenPayload

### Community 196 - "QuoteSort"
Cohesion: 0.33
Nodes (3): QuoteSort, SortOrder, VehicleCondition

## Knowledge Gaps
- **96 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `User` connect `User` to `_make_user`, `rbac_service.py`, `Permission`, `schemas/quote.py`, `test_mfa_flow.py`, `test_rbac_effective.py`, `dealership_service.py`, `AsyncClient`, `admins.py`, `test_scrub_audit_migration.py`, `repositories/quote.py`, `register_and_verify`, `test_sessions.py`, `test_quotes.py`, `quote_service.py`, `repositories/user.py`, `quotes/conftest.py`, `admin/support_service.py`, `test_auth.py`, `customers.py`, `routes/quotes.py`, `admin/quotes.py`, `log_activity`, `broadcast_service.py`, `notifications.py`, `tests/test_files.py`, `delete_service_service`, `test_rbac_api.py`, `_assign_set`, `models/user.py`, `api/middleware.py`, `_load_account`, `admin/file.py`, `tests/conftest.py`, `get_current_user`, `test_realtime.py`, `initiate_root_transfer_service`, `SystemRole`, `ErrorMessages`, `_grant`, `UserActivity`, `system_settings_service.py`, `mfa_service.py`, `security.py`, `repositories/rbac.py`, `test_rbac.py`, `get_user_id`, `ResourceType`, `test_rbac_user_routes.py`, `services/session_service.py`, `admin/system_settings.py`, `admin_service.py`?**
  _High betweenness centrality (0.158) - this node is a cross-community bridge._
- **Are the 72 inferred relationships involving `User` (e.g. with `_filtered_activities_stmt()` and `_filtered_files_stmt()`) actually correct?**
  _`User` has 72 INFERRED edges - model-reasoned connections that need verification._
- **Should `test_filename.py` be split into smaller, more focused modules?**
  _Cohesion score 0.08888888888888889 - nodes in this community are weakly interconnected._
- **Why does `ErrorMessages` connect `ErrorMessages` to `User`, `rbac_service.py`, `utc_now`, `Permission`, `schemas/quote.py`, `test_mfa_flow.py`, `dealership_service.py`, `make_client`, `Broadcast Notification Tests`, `auth.py`, `register_and_verify`, `test_sessions.py`, `test_quotes.py`, `quote_service.py`, `test_auth.py`, `admin/support_service.py`, `notify.py`, `customers.py`, `routes/quotes.py`, `log_activity`, `broadcast_service.py`, `notifications.py`, `asyncio`, `delete_service_service`, `test_rbac_api.py`, `_assert_refused`, `_set_id`, `api/middleware.py`, `app/main.py`, `get_current_user`, `API Exception Handlers`, `make_user_client`, `UserActivity`, `system_settings_service.py`, `make_user_client`, `mfa_service.py`, `security.py`, `test_rbac.py`, `ResourceType`, `test_rbac_user_routes.py`, `services/session_service.py`, `admin_service.py`?**
  _High betweenness centrality (0.078) - this node is a cross-community bridge._
- **Are the 150 inferred relationships involving `ErrorMessages` (e.g. with `register_maintenance_middleware()` and `refresh_token()`) actually correct?**
  _`ErrorMessages` has 150 INFERRED edges - model-reasoned connections that need verification._
- **Should `AsyncClient` be split into smaller, more focused modules?**
  _Cohesion score 0.10344827586206896 - nodes in this community are weakly interconnected._
- **Why does `Permission` connect `Permission` to `_make_user`, `User`, `rbac_service.py`, `schemas/quote.py`, `test_mfa_flow.py`, `test_rbac_effective.py`, `dealership_service.py`, `AsyncClient`, `admins.py`, `register_and_verify`, `test_sessions.py`, `admin/support_service.py`, `customers.py`, `test_user_key_alone_does_not_reach_a_plain_admin`, `routes/quotes.py`, `list_admins_endpoint`, `admin/quotes.py`, `BaseModel`, `log_activity`, `broadcast_service.py`, `notifications.py`, `RbacAudience`, `test_rbac_api.py`, `get_current_user`, `permission.py`, `SystemRole`, `ErrorMessages`, `_grant`, `test_rbac_route_coverage.py`, `repositories/rbac.py`, `test_rbac.py`, `get_user_id`, `_seed_target`, `ResourceType`, `test_rbac_user_routes.py`, `services/session_service.py`, `admin/system_settings.py`, `admin_service.py`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._