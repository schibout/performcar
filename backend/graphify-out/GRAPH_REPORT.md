# Graph Report - backend  (2026-11-08)

## Corpus Check
- 267 files · ~133,089 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 11 file(s) not represented in the graph (top: (none) 6, .ini 2, .example 1)

## Summary
- 4818 nodes · 14832 edges · 202 communities (108 shown, 94 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 866 edges (avg confidence: 0.93)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7e3d0174`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- test_filename.py
- test_system_settings.py
- admin/users.py
- User
- update_role_service
- _store_set_assignment
- AdminPermission
- schemas/quote.py
- tests/test_users.py
- test_mfa_flow.py
- test_tickets.py
- admin_list_quotes
- dealership_service.py
- test_rbac.py
- asyncio
- upload_file_service
- test_broadcasts.py
- test_rbac_bootstrap.py
- UUID
- audit_unexpected_failure
- sqlalchemy_ext_asyncio
- send_email
- test_sessions.py
- repositories/quote.py
- quote_service.py
- routes/support.py
- admin/support_service.py
- make_user_client
- admin/quotes.py
- test_mfa_core.py
- User
- config.py
- list_my_quotes
- Language
- lifespan.py
- config.py
- tests/test_files.py
- assistant_service.py
- notifications.py
- test_rbac_api.py
- invalidate_user_permissions
- admin/session_service.py
- env.py
- test_user_create.py
- routes/admin/support.py
- admin/test_files.py
- sqlalchemy
- send_broadcast_emails.py
- test_scrub_audit_migration.py
- revoke_user_sessions.py
- announcements.py
- env
- admin/user_service.py
- utc_now
- routes/health.py
- list_broadcasts
- list_admins_endpoint
- StubSocket
- Settings
- publish_safe
- log_activity
- test_realtime.py
- BaseModel
- test_origin_restriction.py
- locustfile.py
- system_settings_service.py
- admin/rbac.py
- watch_socket
- test_user_activity.py
- test_redis_failure_falls_back_to_database_and_never_grants
- Permission
- test_rbac_route_coverage.py
- _role_payload
- schemas/user.py
- reset_mfa.py
- token.py
- repositories/assistant.py
- list_tickets_admin
- StubWebSocket
- mfa_service.py
- security.py
- repositories/rbac.py
- list_files
- register_and_verify
- hooks
- exception_handlers.py
- _strip_pii
- ResourceType
- _SafeDict
- a48b0bc6e988_add_ondelete_cascade_on_user_activity_fk.py
- api/middleware.py
- initiate_root_transfer_service
- test_rbac_user_routes.py
- _find_kwarg
- AsyncClient
- test_realtime_permissions.py
- backend
- b7c8d9e0f1a2_switch_default_locale_tr_to_fr.py
- settings_registry.py
- test_assistant.py
- _fail
- socket_permissions.py
- admin_service.py
- test_rbac_effective.py
- test_email_enqueue_failure_does_not_fail_request
- send_broadcast_emails.py
- list_admins_endpoint
- test_element_lock_reads_fresh_rows_for_update
- _replace_assignments
- test_auth.py
- routes/assistant.py
- services/session_service.py
- app/main.py
- hermes
- get_stats
- test_metrics.py
- telemetry.py
- permissions.py
- test_role_creation_reports_a_set_deleted_meanwhile
- get_current_user
- f1a2b3c4d5e6_add_quote_generator.py
- storage.py
- _resolved_items
- deps.py
- update_system_setting
- RbacSourceKind
- test_path_components_are_stripped
- test_frame_racing_the_close_ends_the_socket_quietly
- _normalize_phone

## God Nodes (most connected - your core abstractions)
1. `User` - 261 edges
2. `ErrorMessages` - 219 edges
3. `register_and_verify()` - 134 edges
4. `Permission` - 126 edges
5. `utc_now()` - 119 edges
6. `get_user_id()` - 114 edges
7. `SystemRole` - 105 edges
8. `log_activity()` - 103 edges
9. `audit_unexpected_failure()` - 87 edges
10. `Message` - 78 edges

## Surprising Connections (you probably didn't know these)
- `seed()` --calls--> `get_user_by_email()`  [EXTRACTED]
  loadtest/seed_users.py → app/repositories/user.py
- `seed()` --calls--> `get_password_hash()`  [EXTRACTED]
  loadtest/seed_users.py → app/core/security.py
- `list_colors()` --uses--> `CarColor`  [INFERRED]
  app/repositories/quote.py → app/models/vehicle_catalog.py
- `get_category()` --uses--> `ServiceCategory`  [INFERRED]
  app/repositories/quote.py → app/models/vehicle_catalog.py
- `list_categories()` --uses--> `ServiceCategory`  [INFERRED]
  app/repositories/quote.py → app/models/vehicle_catalog.py

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **FastAPI Template Tech Stack** — uv_package_manager, app_core, app_models, app_worker [EXTRACTED 1.00]
- **Architecture Dependency Flow** — app_api_routes, app_services, app_repositories, app_models [EXTRACTED 1.00]

## Communities (202 total, 94 thin omitted)

### Community 0 - "test_filename.py"
Cohesion: 0.09
Nodes (16): test_control_characters_and_null_bytes_removed(), test_custom_max_length_is_respected(), test_empty_after_sanitizing_falls_back(), test_injection_characters_are_replaced(), test_leading_dots_are_trimmed(), test_long_name_truncated_within_limit_keeping_extension(), test_none_passes_through(), test_plain_name_is_preserved() (+8 more)

### Community 1 - "test_system_settings.py"
Cohesion: 0.12
Nodes (14): _enable_maintenance(), test_list_settings_returns_registry(), test_maintenance_allows_admin(), test_maintenance_blocks_anonymous(), test_maintenance_blocks_regular_user(), test_maintenance_exempts_login(), test_maintenance_exempts_public_settings(), test_patch_invalid_value_returns_422() (+6 more)

### Community 2 - "admin/users.py"
Cohesion: 0.07
Nodes (19): change_user_password(), create_user_endpoint(), delete_user(), get_user(), list_user_sessions(), list_users(), reset_user_mfa(), revoke_user_sessions() (+11 more)

### Community 3 - "User"
Cohesion: 0.09
Nodes (18): User, assign_default_role(), anonymize_user_activities(), _apply_audience(), bulk_hard_delete_users(), create_user(), deactivate_user(), delete_user() (+10 more)

### Community 4 - "update_role_service"
Cohesion: 0.08
Nodes (27): get_permissions_by_set(), RbacAudience, create_permission_set_service(), create_role_service(), delete_permission_set_service(), delete_role_service(), _ensure_editable(), _ensure_keys_fit_audience() (+19 more)

### Community 5 - "_store_set_assignment"
Cohesion: 0.07
Nodes (25): _account(), _assert_refused(), _entry(), _role_row(), _set_id(), test_access_of_a_user_hides_keys_outside_its_tier(), test_admin_assignment_needs_admins_write(), test_assigned_role_cannot_be_deleted() (+17 more)

### Community 6 - "AdminPermission"
Cohesion: 0.29
Nodes (5): AdminPermission, get_permissions_for_users(), get_user_permissions(), set_user_permissions(), stage_user_permissions()

### Community 7 - "schemas/quote.py"
Cohesion: 0.06
Nodes (29): admin_create_service(), admin_delete_service(), admin_import_vehicle_catalog(), admin_list_services(), admin_update_service(), admin_vehicle_catalog(), read_active_services(), read_vehicle_catalog() (+21 more)

### Community 8 - "tests/test_users.py"
Cohesion: 0.13
Nodes (12): SuccessMessages, auth_client(), test_deactivated_user_blocked_from_update(), test_delete_user_me_schedules_deletion(), test_delete_user_me_twice_returns_400(), test_delete_user_me_wrong_password_rejected(), test_me_exposes_deletion_schedule(), test_reactivate_cancels_deletion() (+4 more)

### Community 9 - "test_mfa_flow.py"
Cohesion: 0.04
Nodes (59): _enable_sqlite_foreign_keys(), override_get_db(), access_claims(), assert_lists_admin_keys(), audit_rows(), create_admin(), enable_maintenance(), enroll() (+51 more)

### Community 10 - "test_tickets.py"
Cohesion: 0.12
Nodes (13): upload_png(), test_attachment_ownership_rejected(), test_attachment_wrong_category_rejected(), test_close_ticket(), test_create_ticket(), test_create_with_attachment(), test_get_nonexistent_ticket_404(), test_get_other_users_ticket_forbidden() (+5 more)

### Community 11 - "admin_list_quotes"
Cohesion: 0.12
Nodes (8): admin_delete_customer(), admin_delete_quote(), admin_get_customer(), admin_get_quote(), admin_list_customers(), admin_list_quotes(), admin_quote_stats(), admin_update_quote()

### Community 12 - "dealership_service.py"
Cohesion: 0.08
Nodes (21): admin_create_dealership(), admin_delete_dealership(), admin_get_dealership(), admin_list_dealerships(), admin_update_dealership(), read_my_dealership(), update_my_dealership(), DealershipCreate (+13 more)

### Community 13 - "test_rbac.py"
Cohesion: 0.04
Nodes (74): _account_exists(), _assign_role(), _assign_set(), _assigned_role_keys(), _assigned_set_keys(), _call_user_route(), _direct_grants(), _expect_policy_close() (+66 more)

### Community 14 - "asyncio"
Cohesion: 0.08
Nodes (26): SystemRole, make_client(), root(), test_access_of_a_superadmin_shows_every_key(), test_access_of_an_admin_needs_admins_read(), test_actor_cannot_change_its_own_access(), test_admin_target_needs_admins_write(), test_assignment_opens_then_withdrawal_closes_the_panel() (+18 more)

### Community 16 - "test_broadcasts.py"
Cohesion: 0.10
Nodes (17): _announcement_notifications(), test_active_banner_absent_returns_null(), test_create_active_audience_targets_active_users(), test_create_custom_broadcast(), test_create_custom_with_template_key_is_rejected(), test_create_custom_without_translations_is_rejected(), test_create_forbidden_for_regular_user(), test_create_requires_authentication() (+9 more)

### Community 17 - "test_rbac_bootstrap.py"
Cohesion: 0.06
Nodes (23): ensure_first_superadmin(), ensure_system_rbac_catalog(), RbacPermissionSetItem, RbacRolePermissionSet, RbacUserRole, superadmin_exists(), ensure_rbac_catalog(), _count() (+15 more)

### Community 18 - "UUID"
Cohesion: 0.16
Nodes (7): count_dealership_quotes(), get_services_by_ids(), list_quotes(), _quote_filters(), quote_status_totals(), quotes_created_since(), _scoped()

### Community 19 - "audit_unexpected_failure"
Cohesion: 0.08
Nodes (28): audit_unexpected_failure(), decorator(), wrapper(), change_password(), _clear_auth_cookies(), forgot_password(), login_access_token(), logout() (+20 more)

### Community 20 - "sqlalchemy_ext_asyncio"
Cohesion: 0.08
Nodes (13): File, get_file_admin(), list_files_admin(), create_file(), delete_file(), get_file(), AdminFileListItem, AdminFileListResponse (+5 more)

### Community 21 - "send_email"
Cohesion: 0.14
Nodes (13): check_mx_record(), _get_domain(), is_disposable_email(), reset_disposable_cache(), test_check_mx_record_invalid(), test_check_mx_record_valid(), test_is_disposable_email_false(), test_is_disposable_email_fetch_error() (+5 more)

### Community 22 - "test_sessions.py"
Cohesion: 0.21
Nodes (17): _fresh_client(), _insert_session(), _login(), test_admin_lists_and_revokes_user_sessions(), test_admin_sessions_require_permission(), test_change_password_revokes_every_session(), test_list_sessions_pagination(), test_login_creates_session_with_device_metadata() (+9 more)

### Community 23 - "repositories/quote.py"
Cohesion: 0.05
Nodes (42): Base, Dealership, _in(), QuoteService, CarBrand, CarColor, CarModel, CarVersion (+34 more)

### Community 24 - "quote_service.py"
Cohesion: 0.04
Nodes (50): Quote, count_references_with_prefix(), get_dealership(), get_quote(), recent_quotes(), replace_quote_services(), CarModelResponse, CarVersionResponse (+42 more)

### Community 26 - "routes/support.py"
Cohesion: 0.08
Nodes (12): close_ticket(), create_ticket(), get_my_ticket(), list_my_tickets(), reply_ticket(), support_feed_ws(), authorize(), rate_limit_authenticated() (+4 more)

### Community 27 - "admin/support_service.py"
Cohesion: 0.08
Nodes (29): SupportMessage, SupportMessageAttachment, SupportTicket, add_message(), attach_files(), count_unread(), count_unread_by_tickets(), create_ticket() (+21 more)

### Community 28 - "make_user_client"
Cohesion: 0.05
Nodes (35): NotificationType, get_user_id(), seed_notification(), test_list_empty(), test_list_newest_first_and_unread_count(), test_list_only_my_notifications(), test_list_pagination_and_unread_only(), test_list_requires_auth() (+27 more)

### Community 29 - "admin/quotes.py"
Cohesion: 0.06
Nodes (23): admin_update_customer(), create_my_customer(), delete_my_customer(), get_my_customer(), list_my_customers(), update_my_customer(), Customer, count_customer_quotes() (+15 more)

### Community 30 - "test_mfa_core.py"
Cohesion: 0.07
Nodes (18): generate_totp_secret(), verify_totp(), _explicit_secret_key(), _settings(), test_hash_recovery_code_is_deterministic_hmac(), test_invalid_key_is_refused(), test_invalid_key_is_refused_with_mfa_off(), test_local_allows_mfa_enabled_without_key() (+10 more)

### Community 31 - "User"
Cohesion: 0.12
Nodes (10): _ensure_root_designated(), _filtered_users_stmt(), get_earliest_superadmin(), is_last_active_admin(), is_last_active_superadmin(), list_admins(), list_users_admin(), root_superadmin_exists() (+2 more)

### Community 32 - "config.py"
Cohesion: 0.11
Nodes (5): get_user_id(), rate_limit_public(), _storage_uri(), dummy_rate_limit_endpoint(), test_non_local_storage_builds_a_sync_limiter()

### Community 33 - "list_my_quotes"
Cohesion: 0.09
Nodes (6): create_my_quote(), delete_my_quote(), get_my_quote(), list_my_quotes(), my_quote_stats(), update_my_quote()

### Community 34 - "Language"
Cohesion: 0.05
Nodes (32): get_arq_pool(), _format_datetime(), get_template(), list_templates(), render_template(), RenderedContent, template_exists(), AnnouncementContent (+24 more)

### Community 35 - "lifespan.py"
Cohesion: 0.13
Nodes (6): close_arq_pool(), init_arq_pool(), lifespan(), _build_pool(), close_redis(), init_redis()

### Community 37 - "config.py"
Cohesion: 0.25
Nodes (5): delete_root_transfer_otp(), _hash_code(), _key(), store_root_transfer_otp(), verify_root_transfer_otp()

### Community 38 - "tests/test_files.py"
Cohesion: 0.14
Nodes (16): _promote_to_admin(), _register_verify_login(), test_attach_others_file_forbidden(), test_replace_avatar_deletes_old(), test_set_avatar_via_patch_me(), test_upload_branding_logo_allowed_for_admin(), test_upload_branding_logo_forbidden_for_regular_user(), test_upload_category_buckets_into_folder() (+8 more)

### Community 39 - "assistant_service.py"
Cohesion: 0.13
Nodes (11): revoke_ticket(), build_system_prompt(), delete_conversation_service(), _finish_turn(), get_conversation_service(), _locale_of(), _owned_conversation(), _relay() (+3 more)

### Community 40 - "notifications.py"
Cohesion: 0.06
Nodes (28): get_unread_count(), list_my_notifications(), mark_all_notifications_read(), mark_notification_read(), notifications_ws(), notifications_topic(), Notification, count_unread() (+20 more)

### Community 41 - "test_rbac_api.py"
Cohesion: 0.09
Nodes (20): _assignments(), _role_id(), _role_keys(), _set_keys(), _store_role_assignment(), _store_set_assignment(), test_access_names_the_source_of_each_key(), test_account_keeps_a_user_role() (+12 more)

### Community 42 - "invalidate_user_permissions"
Cohesion: 0.10
Nodes (11): get_assigned_permissions(), get_permanent_assigned_permissions(), _keys_through_roles(), _keys_through_sets(), _read_keys(), test_database_failure_is_not_swallowed(), test_require_any_permission_exposes_the_tuple_and_needs_one_key(), test_revocation_during_a_cache_fill_is_not_overwritten() (+3 more)

### Community 43 - "admin/session_service.py"
Cohesion: 0.12
Nodes (8): SessionListResponse, SessionRead, SessionsRevokedResponse, list_user_sessions_admin_service(), _load_target(), revoke_user_sessions_admin_service(), parse_user_agent(), ParsedUserAgent

### Community 44 - "env.py"
Cohesion: 0.11
Nodes (8): do_run_migrations(), run_async_migrations(), run_migrations_offline(), run_migrations_online(), downgrade(), scrub_details(), _scrubbed(), upgrade()

### Community 45 - "test_user_create.py"
Cohesion: 0.19
Nodes (7): _payload(), _role_id(), test_admin_creates_verified_user_who_can_log_in(), test_create_user_forbidden_for_regular_user(), test_create_user_rejects_duplicate_email(), test_create_user_rejects_unknown_dealership(), test_created_user_role_switches_account_tier()

### Community 46 - "routes/admin/support.py"
Cohesion: 0.06
Nodes (29): admin_feed_ws(), authorize(), get_ticket(), list_tickets(), reply_ticket(), update_ticket(), publish_feeds(), AdminTicketDetail (+21 more)

### Community 47 - "admin/test_files.py"
Cohesion: 0.17
Nodes (9): test_admin_delete_file(), test_admin_delete_file_clears_avatar(), test_admin_files_requires_superuser(), test_admin_get_file_detail(), test_admin_get_missing_file_404(), test_admin_list_files(), test_admin_list_files_filter_content_type(), test_admin_list_files_filter_uploader() (+1 more)

### Community 48 - "sqlalchemy"
Cohesion: 0.04
Nodes (31): upgrade(), upgrade(), downgrade(), upgrade(), upgrade(), downgrade(), upgrade(), upgrade() (+23 more)

### Community 49 - "send_broadcast_emails.py"
Cohesion: 0.09
Nodes (14): Announcement, create_announcement(), deactivate_other_banners(), get_announcement(), list_announcements(), BroadcastEmail, build_broadcast_email(), _custom() (+6 more)

### Community 50 - "test_scrub_audit_migration.py"
Cohesion: 0.19
Nodes (3): _load_migration(), _seed(), test_scrub_rewrites_only_the_targeted_rows()

### Community 52 - "announcements.py"
Cohesion: 0.21
Nodes (4): get_active_announcement(), get_active_banner(), ActiveBannerResponse, get_active_banner_service()

### Community 53 - "env"
Cohesion: 0.07
Nodes (26): concurrency, cancel-in-progress, group, FIRST_SUPERUSER, FIRST_SUPERUSER_PASSWORD, POSTGRES_PASSWORD, POSTGRES_SERVER, POSTGRES_USER (+18 more)

### Community 54 - "admin/user_service.py"
Cohesion: 0.14
Nodes (16): generate_secure_random_password(), change_password_admin_service(), _cleanup_old_avatar(), delete_user_admin_service(), get_user_admin_service(), _guard_not_self(), _load_target(), reset_user_mfa_admin_service() (+8 more)

### Community 55 - "utc_now"
Cohesion: 0.11
Nodes (14): get_password_hash(), get_users_due_for_deletion(), hard_delete_user(), DeletionJobResult, _make_user(), test_active_user_is_not_deleted(), test_bulk_delete_keeps_anonymized_activity(), test_concurrent_runs_do_not_double_delete() (+6 more)

### Community 56 - "routes/health.py"
Cohesion: 0.15
Nodes (12): _check_database(), _check_redis(), _elapsed_ms(), liveness(), readiness(), CheckResult, LivenessResponse, ReadinessResponse (+4 more)

### Community 57 - "list_broadcasts"
Cohesion: 0.15
Nodes (3): create_broadcast(), get_broadcast_templates(), list_broadcasts()

### Community 58 - "list_admins_endpoint"
Cohesion: 0.14
Nodes (6): list_admins_endpoint(), list_permission_catalog(), AdminListResponse, PermissionCatalogResponse, get_permission_catalog_service(), list_admins_service()

### Community 62 - "log_activity"
Cohesion: 0.04
Nodes (43): run(), send_email(), admin_mfa_required(), get_redis(), actor_reference(), averify_password(), decode_token_payload(), clear_login_attempts() (+35 more)

### Community 63 - "test_realtime.py"
Cohesion: 0.04
Nodes (33): get_ws_user(), account_events_ws(), ConnectionManager, _handle_command(), _listen(), _parse_ticket_topic(), serve_account_socket(), serve_multiplex() (+25 more)

### Community 64 - "BaseModel"
Cohesion: 0.15
Nodes (6): AdminActorRef, AdminCreate, AdminFileUploader, AdminListItem, AdminPermissionsUpdate, RootTransferConfirm

### Community 65 - "test_origin_restriction.py"
Cohesion: 0.32
Nodes (6): test_allowed_origin(), test_cross_origin_post_blocked(), test_no_origin(), test_same_origin_post(), test_same_origin_put(), test_unauthorized_origin()

### Community 66 - "locustfile.py"
Cohesion: 0.10
Nodes (5): ActiveUser, _credentials(), HealthCeilingUser, _login(), LoginStormUser

### Community 68 - "system_settings_service.py"
Cohesion: 0.15
Nodes (9): SystemSetting, get_all_system_settings(), get_system_setting_by_key(), upsert_system_setting(), list_all_settings_service(), _resolved_items(), _to_read(), _type_matches() (+1 more)

### Community 70 - "admin/rbac.py"
Cohesion: 0.06
Nodes (29): create_permission_set_endpoint(), create_role_endpoint(), delete_permission_set_endpoint(), delete_role_endpoint(), get_permission_set_endpoint(), get_role_endpoint(), get_user_access_endpoint(), list_permission_sets_endpoint() (+21 more)

### Community 71 - "watch_socket"
Cohesion: 0.12
Nodes (6): _wait_for_refusal(), _WakeOnFrame, watch_socket(), test_watch_socket_rechecks_on_its_own_until_refused(), check(), test_watch_socket_separates_not_knowing_from_a_refusal()

### Community 72 - "test_user_activity.py"
Cohesion: 0.06
Nodes (24): UserActivity, create_user_activity(), _rewrite_in_batches(), UserActivityCreate, test_activity_rows_embed_the_actor(), test_admin_activity_list_exposes_user_deleted_at(), test_admin_activity_list_returns_deleted_actor(), test_list_activities_global_filters() (+16 more)

### Community 73 - "test_redis_failure_falls_back_to_database_and_never_grants"
Cohesion: 0.07
Nodes (7): set_redis_for_testing(), _BrokenPipeline, _BrokenRedis, restore_redis(), test_invalidation_tolerates_redis_failure(), test_redis_failure_falls_back_to_database_and_never_grants(), test_uninitialized_redis_falls_back_to_database()

### Community 74 - "Permission"
Cohesion: 0.05
Nodes (30): ensure_permission(), require_any_permission(), _require(), _require(), require_permissions(), _require(), require_user_permission(), _require() (+22 more)

### Community 75 - "test_rbac_route_coverage.py"
Cohesion: 0.09
Nodes (10): custom_generate_unique_id(), _app_routes(), _classification_problems(), _dependants(), _http_endpoints(), _is_superadmin_only(), _permissions(), test_admin_route_labelled_only_with_a_self_key_is_refused() (+2 more)

### Community 76 - "_role_payload"
Cohesion: 0.07
Nodes (14): _last_audit(), _role_payload(), _set_payload(), test_audience_and_key_cannot_be_edited(), test_connected_account_sees_a_set_edit_at_once(), test_duplicate_key_is_a_conflict(), test_element_edits_and_deletes_take_the_lock(), test_role_edit_reaches_an_account_with_a_cached_entry() (+6 more)

### Community 77 - "schemas/user.py"
Cohesion: 0.05
Nodes (33): delete_user_me(), list_my_sessions(), reactivate_user_me(), read_user_me(), revoke_my_other_sessions(), revoke_my_session(), update_user_me(), aget_password_hash() (+25 more)

### Community 79 - "token.py"
Cohesion: 0.36
Nodes (4): CookieRefreshResponse, RefreshedTokens, Token, TokenPayload

### Community 80 - "repositories/assistant.py"
Cohesion: 0.20
Nodes (8): AssistantConversation, AssistantMessage, add_message(), create_conversation(), delete_conversation(), get_user_conversation(), list_messages(), list_user_conversations()

### Community 83 - "mfa_service.py"
Cohesion: 0.06
Nodes (30): decrypt_secret(), encrypt_secret(), _fernet(), generate_recovery_codes(), hash_recovery_code(), provisioning_uri(), consume_recovery_code(), count_unused_recovery_codes() (+22 more)

### Community 84 - "security.py"
Cohesion: 0.10
Nodes (12): _base_payload(), create_access_token(), create_mfa_token(), create_refresh_token(), _verify_email_token(), verify_new_account_token(), verify_password(), verify_password_reset_token() (+4 more)

### Community 85 - "repositories/rbac.py"
Cohesion: 0.06
Nodes (38): RbacPermissionSet, RbacRole, _apply_assignments(), create_permission_set(), create_role(), delete_permission_set(), delete_role(), get_account_ids_holding_role() (+30 more)

### Community 86 - "list_files"
Cohesion: 0.15
Nodes (3): delete_file(), get_file(), list_files()

### Community 88 - "register_and_verify"
Cohesion: 0.02
Nodes (98): admin_client(), get_user_id(), grant_all_permissions(), grant_permissions(), login(), nonroot_superadmin_client(), promote_to_admin(), promote_to_superadmin() (+90 more)

### Community 89 - "hooks"
Cohesion: 0.10
Nodes (12): always_run, args, entry, id, language, name, pass_filenames, stages (+4 more)

### Community 90 - "exception_handlers.py"
Cohesion: 0.16
Nodes (5): general_exception_handler(), http_exception_handler(), rate_limit_exception_handler(), register_exception_handlers(), validation_exception_handler()

### Community 94 - "_strip_pii"
Cohesion: 0.40
Nodes (3): anonymize_own_row(), strip_about_row(), _strip_pii()

### Community 98 - "api/middleware.py"
Cohesion: 0.15
Nodes (8): get_db(), get_ws_admin_user(), _has_required_mfa(), resolve_optional_user(), _resolve_ws_identity(), register_maintenance_middleware(), maintenance_mode_middleware(), get_bool()

### Community 100 - "initiate_root_transfer_service"
Cohesion: 0.33
Nodes (3): generate_otp_code(), RootTransferRequest, initiate_root_transfer_service()

### Community 101 - "test_rbac_user_routes.py"
Cohesion: 0.04
Nodes (45): _admin_with_support_read(), AsgiSocket, _assign_only_role(), _hold_only(), other(), _publish_permissions_updated(), _seed_account(), _settle() (+37 more)

### Community 104 - "AsyncClient"
Cohesion: 0.32
Nodes (3): test_activities_today_excludes_older_rows(), test_stats_requires_admin(), test_stats_without_auth_returns_401()

### Community 105 - "test_realtime_permissions.py"
Cohesion: 0.12
Nodes (10): account_topic(), flag_sessions_revoked(), AccountEvent, AccountEventType, list_my_sessions_service(), revoke_my_other_sessions_service(), revoke_my_session_service(), test_account_event_serializes_to_type() (+2 more)

### Community 106 - "backend"
Cohesion: 0.05
Nodes (45): build, depends_on, env_file, environment, healthcheck, ports, restart, volumes (+37 more)

### Community 113 - "settings_registry.py"
Cohesion: 0.12
Nodes (11): coerce(), get_definition(), SettingDefinition, SettingValueType, to_str(), _validate_locale(), _validate_non_empty(), _validate_upload_size() (+3 more)

### Community 114 - "test_assistant.py"
Cohesion: 0.10
Nodes (12): issue_ticket(), _key(), resolve_ticket(), parse_hermes_event(), _events(), test_chat_requires_configuration(), test_chat_streams_and_stores_history(), test_conversations_are_private() (+4 more)

### Community 122 - "_fail"
Cohesion: 0.11
Nodes (8): _audited(), _fail(), _rows(), test_audit_failure_does_not_replace_the_original_exception(), test_http_exception_passes_through_without_audit(), test_known_caller_is_audited_and_pending_work_is_discarded(), test_rollback_failure_does_not_replace_the_original_exception(), test_unknown_caller_is_audited_with_null_user_and_exception_type()

### Community 123 - "socket_permissions.py"
Cohesion: 0.21
Nodes (3): close_on_permission_loss(), _recheck_delay(), _recheck_in()

### Community 126 - "admin_service.py"
Cohesion: 0.15
Nodes (14): delete_admin_audience_assignments(), get_user_by_id(), AdminMutationResponse, confirm_root_transfer_service(), create_admin_service(), delete_admin_service(), demote_superadmin_service(), _effective_permissions() (+6 more)

### Community 128 - "test_rbac_effective.py"
Cohesion: 0.06
Nodes (41): RbacUserPermissionSet, _assign_role(), _assign_set(), _cache_key(), _effective(), _grant(), _has(), _make_user() (+33 more)

### Community 141 - "send_broadcast_emails.py"
Cohesion: 0.09
Nodes (9): purge_anonymized_activities(), AuditPurgeJobResult, BroadcastEmailJobResult, SessionPurgeJobResult, JobContext, purge_anonymized_activities(), JobContext, purge_stale_sessions() (+1 more)

### Community 143 - "list_admins_endpoint"
Cohesion: 0.17
Nodes (7): confirm_transfer_root(), create_admin(), delete_admin(), demote_superadmin(), promote_admin(), set_admin_permissions(), transfer_root()

### Community 146 - "_replace_assignments"
Cohesion: 0.07
Nodes (17): set_user_permission_sets_endpoint(), AssignmentResponse, AssignmentsUpdate, EffectivePermission, PermissionSource, UserAccessResponse, _assignment_snapshot(), _AssignmentKind (+9 more)

### Community 150 - "test_auth.py"
Cohesion: 0.13
Nodes (20): ErrorMessages, _create_email_token(), create_password_reset_token(), generate_new_account_token(), _check_year(), _not_in_past(), test_change_password(), test_forgot_and_reset_password_flow() (+12 more)

### Community 151 - "routes/assistant.py"
Cohesion: 0.12
Nodes (10): chat(), delete_conversation(), get_conversation(), list_conversations(), AssistantChatRequest, AssistantConversationDetail, AssistantConversationList, AssistantConversationSummary (+2 more)

### Community 155 - "services/session_service.py"
Cohesion: 0.16
Nodes (10): UserSession, create_session(), get_session_by_id(), is_session_revoked(), list_active_sessions(), purge_stale_sessions(), revoke_all_sessions(), revoke_session() (+2 more)

### Community 159 - "app/main.py"
Cohesion: 0.10
Nodes (3): init_metrics(), register_middleware(), init_sentry()

### Community 160 - "hermes"
Cohesion: 0.50
Nodes (3): hermes(), fake_client(), handler()

### Community 162 - "get_stats"
Cohesion: 0.16
Nodes (4): get_stats(), get_admin_stats(), AdminStats, get_admin_stats_service()

### Community 163 - "test_metrics.py"
Cohesion: 0.19
Nodes (5): root_client(), test_metrics_200_with_correct_token(), test_metrics_404_with_wrong_token(), test_metrics_404_without_token_in_production(), test_metrics_open_in_local()

### Community 169 - "permissions.py"
Cohesion: 0.13
Nodes (11): _cache_key(), _cache_ttl(), _decode_cached(), _generation_key(), get_effective_permissions_db(), _read_cache(), _read_permissions(), seconds_until() (+3 more)

### Community 172 - "test_role_creation_reports_a_set_deleted_meanwhile"
Cohesion: 0.33
Nodes (3): test_role_creation_reports_a_set_deleted_meanwhile(), test_role_edit_reports_a_set_deleted_meanwhile(), _vanished_set()

### Community 174 - "get_current_user"
Cohesion: 0.15
Nodes (8): _ensure_admin_mfa(), get_current_active_user(), get_current_admin_user(), get_current_session_id(), get_current_superadmin(), get_current_user(), _request_body_fields(), _resolve_assistant_user()

### Community 175 - "f1a2b3c4d5e6_add_quote_generator.py"
Cohesion: 0.18
Nodes (5): _create_tables(), downgrade(), _seed_catalog(), _timestamps(), upgrade()

### Community 176 - "storage.py"
Cohesion: 0.07
Nodes (13): _configure(), delete_file(), is_configured(), upload_file(), UploadResult, client(), create_test_database(), disable_admin_mfa() (+5 more)

### Community 177 - "_resolved_items"
Cohesion: 0.12
Nodes (8): read_public_settings(), SettingCategory, PublicSettingsResponse, SettingRead, SettingsListResponse, SettingUpdate, SettingUpdateResponse, get_public_settings_service()

### Community 178 - "deps.py"
Cohesion: 0.10
Nodes (12): require_permission(), _filtered_activities_stmt(), list_activities_admin(), AdminActivityFilter, AdminActivityItem, AdminActivityListResponse, FilePublic, ActivityStatus (+4 more)

## Knowledge Gaps
- **94 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `User` connect `User` to `test_rbac_effective.py`, `admin/users.py`, `update_role_service`, `schemas/quote.py`, `tests/test_users.py`, `test_mfa_flow.py`, `dealership_service.py`, `test_rbac.py`, `list_admins_endpoint`, `test_rbac_bootstrap.py`, `_replace_assignments`, `sqlalchemy_ext_asyncio`, `test_auth.py`, `routes/assistant.py`, `quote_service.py`, `models/user.py`, `routes/support.py`, `repositories/quote.py`, `admin/support_service.py`, `admin/quotes.py`, `test_sessions.py`, `User`, `Language`, `tests/test_files.py`, `assistant_service.py`, `notifications.py`, `test_rbac_api.py`, `invalidate_user_permissions`, `admin/session_service.py`, `permissions.py`, `get_current_user`, `routes/admin/support.py`, `sqlalchemy`, `deps.py`, `test_scrub_audit_migration.py`, `admin/user_service.py`, `utc_now`, `log_activity`, `test_realtime.py`, `system_settings_service.py`, `admin/rbac.py`, `test_user_activity.py`, `Permission`, `schemas/user.py`, `mfa_service.py`, `repositories/rbac.py`, `register_and_verify`, `api/middleware.py`, `initiate_root_transfer_service`, `test_rbac_user_routes.py`, `test_realtime_permissions.py`, `socket_permissions.py`, `admin_service.py`?**
  _High betweenness centrality (0.139) - this node is a cross-community bridge._
- **Are the 14 inferred relationships involving `User` (e.g. with `create_customer_service()` and `delete_customer_service()`) actually correct?**
  _`User` has 14 INFERRED edges - model-reasoned connections that need verification._
- **Should `test_filename.py` be split into smaller, more focused modules?**
  _Cohesion score 0.08888888888888889 - nodes in this community are weakly interconnected._
- **Why does `ErrorMessages` connect `test_auth.py` to `test_system_settings.py`, `_store_set_assignment`, `schemas/quote.py`, `tests/test_users.py`, `test_mfa_flow.py`, `test_tickets.py`, `dealership_service.py`, `test_rbac.py`, `asyncio`, `test_broadcasts.py`, `_replace_assignments`, `audit_unexpected_failure`, `sqlalchemy_ext_asyncio`, `test_sessions.py`, `repositories/quote.py`, `quote_service.py`, `admin/support_service.py`, `make_user_client`, `admin/quotes.py`, `app/main.py`, `Language`, `assistant_service.py`, `notifications.py`, `test_rbac_api.py`, `permissions.py`, `admin/session_service.py`, `test_role_creation_reports_a_set_deleted_meanwhile`, `test_user_create.py`, `get_current_user`, `routes/admin/support.py`, `deps.py`, `admin/user_service.py`, `log_activity`, `system_settings_service.py`, `admin/rbac.py`, `Permission`, `_role_payload`, `schemas/user.py`, `reset_mfa.py`, `mfa_service.py`, `repositories/rbac.py`, `register_and_verify`, `exception_handlers.py`, `api/middleware.py`, `initiate_root_transfer_service`, `test_rbac_user_routes.py`, `test_realtime_permissions.py`, `admin_service.py`?**
  _High betweenness centrality (0.085) - this node is a cross-community bridge._
- **Are the 165 inferred relationships involving `ErrorMessages` (e.g. with `_ensure_admin_mfa()` and `ensure_permission()`) actually correct?**
  _`ErrorMessages` has 165 INFERRED edges - model-reasoned connections that need verification._
- **Should `test_system_settings.py` be split into smaller, more focused modules?**
  _Cohesion score 0.12096774193548387 - nodes in this community are weakly interconnected._
- **Why does `Permission` connect `Permission` to `test_rbac_effective.py`, `test_system_settings.py`, `admin/users.py`, `update_role_service`, `AdminPermission`, `schemas/quote.py`, `test_mfa_flow.py`, `dealership_service.py`, `test_rbac.py`, `list_admins_endpoint`, `test_rbac_bootstrap.py`, `test_sessions.py`, `routes/assistant.py`, `quote_service.py`, `routes/support.py`, `admin/quotes.py`, `Language`, `notifications.py`, `test_rbac_api.py`, `invalidate_user_permissions`, `admin/session_service.py`, `permissions.py`, `routes/admin/support.py`, `deps.py`, `admin/user_service.py`, `admin/rbac.py`, `test_rbac_route_coverage.py`, `schemas/user.py`, `repositories/rbac.py`, `register_and_verify`, `test_rbac_user_routes.py`, `test_realtime_permissions.py`, `socket_permissions.py`, `admin_service.py`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._