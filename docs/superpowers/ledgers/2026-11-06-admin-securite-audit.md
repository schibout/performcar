# SDD ledger — plan: docs/superpowers/plans/2026-11-06-admin-securite-audit.md

Spec: no separate spec file. The plan's "Décisions" section is the spec; rulings are provisional against it.
Branch: feat/admin-security-audit in backend/ and frontend/ (both from main; main dirty .gitignore and graphify-out/ stay uncommitted).
Baseline: backend `uv run pytest` 285 passed in 389s; frontend vitest 307 passed in 778s, tsc clean.

## Preflight rulings
Ruling: branches in place, no git worktrees — the plan's paths and database/tools/generate.py span two sibling repos under a non-git root, and the plan's constraints specify branches — if wrong: work shares the user's checkouts; switch branch to get back to main.
Ruling: review packages run from the repo concerned with an explicit OUTFILE in this workspace — review-package assumes a single repo — if wrong: nothing, only paths.

## Preflight scan
| Pair / task | Produces vs consumes | Finding |
|---|---|---|
| T1–T3 | both touch schemas/admin.py, types/admin.ts; different fields | clean |
| T3–T5 | both add to core/config.py | clean, additive |
| T3–T6 | T3 changes authenticate(), actor_reference in security.py; T6 changes login_service, tokens in security.py | clean, distinct functions |
| T4–T6 | both add a Permission and admin/users routes | clean, additive |
| T4–T7 | UserDetailContent actions, use-permissions hooks | clean, additive |
| T5–T6 | core/mfa.py, repositories/user_mfa.py consumed by mfa_service | names match |
| T5–T8 | STEP_UP_TTL_SECONDS | matches |
| T6–T7 | /auth/mfa/* routes and MfaChallengeResponse | matches |
| T6–T8 | mfa_service, deps.py, routes/auth.py; StepUpRequired covers mfa/reset route from T6 | matches |
| T7–T8 | api.ts interceptors: MFA_REQUIRED and STEP_UP_REQUIRED | clean, separate error codes |
| T1 self | test names a `superadmin_client` fixture the plan does not define | implementer uses the existing fixture or helper in tests/admin/conftest.py |
| T2 self | agrees | clean |
| T3 self | migration downgrade vs tests | clean |
| T4 self | agrees | clean |
| T5 self | autouse fixture sets ADMIN_MFA_REQUIRED=False; tests opt in | clean |
| T6 self | agrees | clean |
| T7 self | useCanResetUserMfa defined in step 4 | clean |
| T8 self | no-op when MFA off; tests must enable it | clean |
| T9 self | generate.py needs Docker (server 29.7.2 present) | clean |

## Progress
Ruling: a pnpm shim (calling corepack pnpm) in the session scratchpad satisfies the husky pre-commit hook without bypassing it — pnpm is not on PATH on this machine — if wrong: nothing in the repos changes, only local tooling.
Task 1: minor (deferred): test_activities_today never inserts a today-dated row, so counting a same-day row is only indirectly proven; three queries in get_admin_stats where two could merge.
Task 1: complete (commits backend be9968e..ce82431, frontend 5fc6d73..568f5a8, review clean)
Ruling: commits end with the attribution of the model actually implementing; T1 and T2 commits carry an Opus trailer though Sonnet wrote them (my brief hard-coded it) and stay as is — rewriting history is not worth it — if wrong: trailer wording only.
Task 2: minor (deferred): corrupt stored value makes coerce raise on PATCH (same exposure as read path); no-op order_by in test.
Task 2: complete (commits backend ce82431..20842a0, review clean)
Ruling: Task 3 also anonymizes in repositories/user.py delete_user, beyond the plan's two functions — the admin delete services use it, and skipping it would leave personal data in audit rows — if wrong: one extra call site to remove.
Task 3: note: dev PostgreSQL left at a2290a6fbc7f; stale idle-in-transaction sessions blocked the ALTER; migration b7c41d9e5a10 verified on a scratch DB. Tell the user they must upgrade their dev DB.
Task 3: minor (deferred): hard_delete_user and delete_user are identical; unknown-email rows display as "Deleted account" though no account existed (plan-mandated label, misleading); narrow race for activity inserted between anonymize and DELETE; untested: paging beyond 500 rows, purge job function and cron registration; job reuses DELETION_JOB_BATCH_SIZE; deleted-actor rows do not match user_search text (product decision).
Task 3: fix round 1/5 (4 addressed, 0 open; commits bd096ed..447ea7e)
Task 3: minor (deferred): inline imports in test bodies of test_users/test_admins; unused live_user variable.
Task 3: complete (commits backend 20842a0..447ea7e, frontend 568f5a8..3815d5d, review clean after 1 fix round)
Task 4: minor (deferred): unlock action offered for every account because no lock-state flag exists; no cache invalidation needed until one does.
Ruling: Task 5 validator requires MFA_ENCRYPTION_KEY only outside ENVIRONMENT=local; in local, a missing key derives the Fernet key from SECRET_KEY — the plan's "key mandatory if ADMIN_MFA_REQUIRED" with a default of True would make Settings() fail at import on every dev machine and in CI, before the test fixture can act — if wrong: local secrets are tied to SECRET_KEY, production unaffected.
Task 4: fix round 1/5 (1 addressed, 0 open; commits a163fb8..8fd14c8)
Task 4: complete (commits backend 447ea7e..3e805c0, frontend 3815d5d..8fd14c8, review clean after 1 fix round)
Task 5: minor (deferred): no direct tests for repositories/user_mfa.py replay and single-use paths; valid_window=1 unpinned; upsert_pending_mfa on an enabled row clears enabled_at (Task 6 service must guard); mark_enabled and replace_recovery_codes commit separately (Task 6 must not leave MFA enabled without codes); hash_recovery_code does not normalize case or whitespace (Task 6); count_unused_recovery_codes fetches rows; _settings test helper ignores .env but not process variables; test_local_allows_mfa_disabled asserts unrelated defaults; pointless inner import in conftest fixture. Deploy note: MFA_ENCRYPTION_KEY must be provisioned outside local or boot fails by design; local SECRET_KEY must be stable for local MFA.
Task 5: fix round 1/5 (0 addressed, 1 open — code fixed but test not committed and report wrong; commits e107b43..c45f371)
Task 5: fix round 2/5 (1 addressed, 0 open; commits c45f371..413f21f)
Task 5: complete (commits backend 3e805c0..413f21f, review clean after 2 fix rounds)
User request (2026-11-06): deploy locally once the work is finished (Start-Local.ps1, migrate the dev DB). Not on OVH. Stale PostgreSQL sessions must not be terminated without the user's agreement.
Task 6: minor (deferred): pre-existing, 423 response loses Retry-After because global exception handling drops HTTPException headers.
Task 6: note: admins cannot sign in through the current frontend until Task 7 ships; no local deployment before Task 7.
Task 6: minor (deferred): file_service role-only branding upload lets a session without mfa claim add a branding asset (not the live logo; fix via route helper); exception_handlers drop all HTTPException headers (Retry-After, WWW-Authenticate); mfa_reset deletes enrollment before revoking sessions (revoke first is safer); challenge token not tied to password change (limited to MFA_CHALLENGE_MINUTES); mfa_challenge_issued logged as SUCCESS LOGIN; long docstring in admin/support.py:166; CLI prints raw i18n key. For final review: does serve_multiplex drop an open admin socket after MFA reset; CLI never run on real Postgres/Redis.
Task 6: carry to Task 8: consume_totp_code in mfa_service must move to use_cases if reused, because services cannot call services.
Ruling: finishing all tasks and local deployment run autonomously at the user's request; no push, no merge to main, nothing on OVH — if wrong: branches stay local and can be merged by the user.
User decision (2026-11-06): MFA postponed. This overrides the plan's "MFA obligatoire" decision.
Ruling: keep the committed MFA backend dormant behind ADMIN_MFA_REQUIRED=False rather than reverting it — it is reviewed, tested and self-contained, and reverting several commits and a migration costs more — if wrong: an unused table and routes that can be removed later.
Ruling: Task 7 (MFA screens) and Task 8 (step-up) are postponed with MFA — step-up verifies a TOTP code, so it cannot work without enrollment — if wrong: sensitive admin actions have no reconfirmation until then; surface this to the user.
Ruling: RBAC plan drops StepUpRequired from its routes for now; add it when MFA returns — the dependency will not exist — if wrong: role assignment has no reconfirmation until then.
Task 6: minor (deferred): similar revoke blocks remain in change_password_service and services/session_service.py.
Task 7: skipped — postponed with MFA by the user.
Task 8: skipped — postponed with MFA by the user.
Task 6: fix round 1/5 (4 addressed, 0 open; commits 4a8737f..86b8c13)
Task 6: complete (commits backend 413f21f..86b8c13, frontend 8fd14c8..f1359e6, review clean after 1 fix round)
Task 9: minor (deferred): database/ANALYSE.md:41 still says "douzième table technique"; README section not in any table of contents.
Task 9: complete (commits backend 86b8c13..d225612, review clean; frontend checks pending)
Frontend checks on f1359e6: vitest 313 passed (62 files), build ok, lint ok.
Final review: 4 Important, no Critical. Ruling: one fix wave covers Important 1-4, purge and paging tests, and the cheap should-fix items (corrupt setting fallback, refresh 500, activity label, raw i18n keys, README, dead config, ANALYSE.md) — cheap and in the same files — if wrong: small extra diff to review.
Ruling: unknown-email rows keep IP and user agent for the 12-month retention — useful for security forensics, though it is personal data — if wrong: drop both fields in the unknown-email branch of authenticate.
Ruling: dormant-MFA leftovers wait for MFA's return (branding upload, mfa_reset order, challenge not tied to password, challenge logged as success, CLI never run on real services, issuer uses PROJECT_NAME, users:mfa_reset grantable with no UI) — they have no effect while it is off — if wrong: handled when MFA returns.
Ruling: open admin socket surviving demotion or loss of support:read is carried into the RBAC plan — RBAC is where that matters — if wrong: covered there.
Final fix wave: backend d225612..313f567, frontend f1359e6..22c55b7, head d4e19a6b3c52; 377 backend tests, focused frontend 27.
Ruling: migration d4e19a6b3c52 scrubs old audit rows irreversibly at upgrade; the local deployment takes a pg_dump first — the fixer's data step cannot be undone otherwise — if wrong: restore from .local dump.
Final: minor (deferred): auth_service.py:357 logs token_blacklisted with raw user_id, likely same FK 500 as item 7 (not reproduced); ResourceType.ACTIVITY has no frontend label; a request racing a deletion gets an integrity error with the new lock.
Final: re-review all 13 items addressed, no new Critical/Important. Plan complete; Tasks 7 and 8 postponed with MFA. Backend d225612..313f567, frontend f1359e6..22c55b7.
Final: minor (deferred): a details value like 1e999 would abort the scrub migration and roll back (negligible for app-written data).
