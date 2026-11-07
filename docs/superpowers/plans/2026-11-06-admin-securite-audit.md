# Administration : corrections, audit et sécurité — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Mise à jour du 2026-11-06 :** la MFA est reportée à la demande de l'utilisateur. Le backend des tâches 5 et 6 reste en place, inactif derrière `ADMIN_MFA_REQUIRED=False`. Les tâches 7 et 8 sont reportées avec elle : elles ne sont pas à exécuter.

**Goal:** Fiabiliser les statistiques et le journal d'audit, puis protéger les comptes admin par une MFA obligatoire, une reconfirmation des actions sensibles et un déverrouillage de compte.

**Architecture:** L'audit survit à la suppression d'un compte par `ON DELETE SET NULL` et anonymisation dans la même transaction. La MFA intervient après le mot de passe : aucun cookie de session n'est posé avant le second facteur, et le jeton d'accès porte une preuve `mfa` contrôlée par les dépendances admin.

**Tech Stack:** FastAPI, SQLAlchemy async, Alembic, Redis, arq, pyotp, cryptography ; Next.js 16, React Query, Zustand, i18next (`en`, `tr`), Vitest, Playwright.

**Spec:** les décisions ci-dessous, prises le 2026-11-06, tiennent lieu de spécification.

## Décisions

- L'audit d'un compte supprimé est conservé 12 mois, identité anonymisée.
- La MFA (TOTP et codes de secours) est obligatoire pour tous les comptes `admin` et `superadmin`.
- La connexion « en tant que » un utilisateur est hors périmètre.
- Le compteur d'admins du tableau de bord inclut les superadmins.

## Global Constraints

- Dépôts Git distincts : `backend/` et `frontend/`. Créer `feat/admin-security-audit` dans chacun avant la première modification. Ne pas committer les fichiers déjà modifiés hors plan (`.gitignore`, `graphify-out/`).
- Backend : couches `api → services → repositories → models`, fonctions pures, aucun service n'appelle un autre service (`use_cases/` sinon), `Depends()` uniquement dans les routes.
- Messages uniquement dans `app/core/messages/error_message.py` et `success_message.py`. Docstring en anglais sur chaque fonction.
- Dépendances avec `uv add` et `pnpm add`, en committant `uv.lock` et `pnpm-lock.yaml`.
- Tout changement de modèle a sa migration Alembic réversible. Révision de départ : `a2290a6fbc7f`.
- Les tests backend tournent sur SQLite : pas de SQL propre à PostgreSQL dans les repositories (`details` est un `JSON`, pas un `JSONB`).
- Frontend : exports nommés, appels via `src/lib/api/`, chaque texte en `en` et en `tr`.
- Après chaque tâche : `graphify update .` dans l'application modifiée.

## Review Focus

- Une connexion admin par la page de connexion **utilisateur** : le défi MFA doit aussi s'y afficher (test tâche 7).
- Un utilisateur promu admin alors qu'il a une session ouverte sans preuve MFA : routes admin refusées, routes utilisateur intactes (test tâche 6).
- Un code TOTP rejoué dans sa fenêtre de validité : refusé (test tâche 5).
- La rotation du jeton de rafraîchissement : la preuve MFA doit être conservée, sinon les admins sont éjectés à chaque renouvellement (test tâche 6).
- Une rafale de connexions sur des emails inconnus : chaque ligne journalisée reste sans email en clair et sera purgée (test tâche 3).

---

### Task 1: Statistiques exactes du tableau de bord

**Files:**
- Modify: `backend/app/repositories/admin/stats.py:9-29`
- Modify: `backend/app/schemas/admin.py` (`AdminStats`)
- Modify: `frontend/src/lib/types/admin.ts`, `frontend/src/app/[locale]/admin/(protected)/dashboard/DashboardContent.tsx:83-84`
- Test: `backend/app/tests/admin/test_stats.py`

**Interfaces:**
- Produces: `AdminStats.activities_today: int` (jour UTC en cours) ; `users_admins` compte `admin` et `superadmin`.

- [ ] **Step 1: Écrire les tests en échec**

```python
async def test_activities_today_excludes_older_rows(admin_client): ...
    # une activité datée d'hier et une d'aujourd'hui
    assert stats["activities_today"] == today_count
    assert stats["activities_total"] == today_count + 1

async def test_users_admins_counts_superadmins(superadmin_client): ...
    assert stats["users_admins"] == admins + superadmins
```

- [ ] **Step 2: Lancer** `uv run pytest app/tests/admin/test_stats.py -v` — attendu : FAIL.
- [ ] **Step 3: Implémenter** dans `get_admin_stats` : borne `utc_now().replace(hour=0, minute=0, second=0, microsecond=0)`, `User.role.in_([ADMIN, SUPERADMIN])`, en gardant `activities_total`.
- [ ] **Step 4: Relancer** — attendu : PASS.
- [ ] **Step 5: Afficher** `stats?.activities_today` sur la carte `activitiesToday` et ajouter le champ au type.
- [ ] **Step 6: Vérifier** `pnpm exec tsc --noEmit` — attendu : aucune erreur.
- [ ] **Step 7: Committer** dans les deux dépôts : `fix: report today's activities and include superadmins in admin count`.

### Task 2: Ancienne et nouvelle valeur dans l'audit des paramètres

**Files:**
- Modify: `backend/app/services/system_settings_service.py:113-123`
- Test: `backend/app/tests/admin/test_system_settings.py`

**Interfaces:**
- Produces: l'activité porte `details = {"key": str, "before": SettingValue, "after": SettingValue}`.

- [ ] **Step 1: Écrire le test en échec** `test_update_setting_audits_before_and_after` : deux mises à jour de `site_name` ; la seconde porte `before` égal à la première valeur et `after` à la seconde ; un paramètre jamais modifié a pour `before` sa valeur par défaut.
- [ ] **Step 2: Lancer** `uv run pytest app/tests/admin/test_system_settings.py -v` — attendu : FAIL.
- [ ] **Step 3: Implémenter** : lire l'ancienne valeur avec `get_system_setting_by_key` avant `upsert_system_setting`, sinon `definition.default`.
- [ ] **Step 4: Relancer** — attendu : PASS.
- [ ] **Step 5: Committer** : `feat: record before and after values in settings audit`.

### Task 3: Audit conservé et anonymisé, connexions inconnues, rétention

**Files:**
- Modify: `backend/app/models/user_activity.py`, `backend/app/models/user.py:94-99`, `backend/app/schemas/user_activity.py:42-53`, `backend/app/schemas/admin.py:123-139`
- Modify: `backend/app/use_cases/log_activity.py:22-64`, `backend/app/repositories/user.py:157-170`, `backend/app/services/auth_service.py:178-190`, `backend/app/core/security.py`, `backend/app/core/config.py`, `backend/.env.example`, `backend/app/worker/settings.py`
- Create: `backend/app/worker/jobs/purge_anonymized_activities.py`, migration Alembic
- Modify: `frontend/src/lib/types/admin.ts`, `frontend/src/app/[locale]/admin/(protected)/activities/ActivitiesContent.tsx`, `frontend/src/i18n/locales/{en,tr}/admin.json`
- Test: `backend/app/tests/test_user_activity.py`, `backend/app/tests/test_deletion_worker.py`, `backend/app/tests/test_account_lockout.py`

**Interfaces:**
- Produces:
  - `actor_reference(value: str) -> str` dans `core/security.py` : HMAC-SHA256 hexadécimal de `value.strip().lower()` avec `SECRET_KEY`.
  - Colonnes `UserActivity.user_id` nullable (FK `SET NULL`), `actor_ref: str | None` (64, indexée), `user_deleted_at: datetime | None` (indexée).
  - `log_activity(..., user_id: uuid.UUID | None, ..., actor_ref: str | None = None)`.
  - `anonymize_user_activities(session, user_ids: Sequence[uuid.UUID], deleted_at: datetime) -> None` et `purge_anonymized_activities(session, cutoff: datetime, batch_size: int) -> int` dans `repositories/user_activity.py`.
  - Config : `ANONYMIZED_AUDIT_RETENTION_DAYS=365`, `AUDIT_PURGE_CRON_HOUR=5`, `AUDIT_PURGE_CRON_MINUTE=0`.

- [ ] **Step 1: Écrire les tests en échec**

```python
async def test_hard_delete_keeps_anonymized_activity(): ...
    assert row.user_id is None and row.user_deleted_at is not None
    assert row.actor_ref == actor_reference(str(user_id))
    assert row.ip_address is None and row.user_agent is None
    assert "email" not in row.details

async def test_bulk_delete_keeps_anonymized_activity(): ...  # même contrôle via le worker

async def test_activity_about_deleted_user_loses_pii(): ...
    # ligne d'un admin avec resource_type=USER et resource_id=le compte supprimé
    assert row.user_id == admin_id and "email" not in row.details

async def test_purge_keeps_rows_until_retention_elapses(): ...
    # 364 jours conservée, 366 jours purgée, ligne d'un compte actif jamais purgée

async def test_failed_login_unknown_email_is_audited_without_plain_email(): ...
    assert row.user_id is None and row.actor_ref == actor_reference("nobody@example.com")
    assert "nobody@example.com" not in json.dumps(row.details)
    assert row.status_code == 401

async def test_admin_activity_list_returns_deleted_actor(admin_client): ...
    assert item["user"] is None and item["actor_ref"]
```

- [ ] **Step 2: Lancer** ces tests — attendu : FAIL.
- [ ] **Step 3: Modifier les modèles et les schémas.** `UserActivityCreate.user_id` et `AdminActivityItem.user_id` deviennent `uuid.UUID | None`, et les deux schémas gagnent `actor_ref`. `User.activities` devient `relationship(back_populates="user", passive_deletes=True)`, sans `delete-orphan`. Générer la migration : FK `SET NULL`, colonnes, index. Le `downgrade` supprime les lignes à `user_id` nul avant de restaurer `NOT NULL` et `CASCADE`.
- [ ] **Step 4: Implémenter l'anonymisation.** Clés retirées : `ACTIVITY_PII_KEYS = {"email", "first_name", "last_name", "new_email", "ip_address"}`. Pour les lignes du compte : `actor_ref`, `user_deleted_at`, `ip_address=None`, `user_agent=None`, `details` nettoyé. Pour les lignes d'autres acteurs où `resource_type=USER` et `resource_id` figure dans les comptes : `details` nettoyé seulement. Le nettoyage se fait en Python par lots. Appeler la fonction dans `hard_delete_user` et `bulk_hard_delete_users`, dans la même transaction que la suppression.
- [ ] **Step 5: Journaliser les emails inconnus** dans `authenticate` : si `not user and request`, `log_activity(user_id=None, actor_ref=actor_reference(email), status=FAILURE, status_code=401, details={"reason": "unknown_email"})`.
- [ ] **Step 6: Ajouter la purge.** Règle : `user_id IS NULL AND COALESCE(user_deleted_at, created_at) < cutoff`, par lots, avec un cron arq déclaré dans `WorkerSettings` comme les autres.
- [ ] **Step 7: Relancer** `uv run pytest` — attendu : PASS.
- [ ] **Step 8: Adapter le frontend** : `user_id` et `user` nullables, `actor_ref` ajouté ; ligne sans `user` affichée avec `activities.deletedAccount` (« Deleted account » / « Silinmiş hesap ») et les 8 premiers caractères de `actor_ref`. Test Vitest du rendu.
- [ ] **Step 9: Vérifier** `pnpm exec vitest run` — attendu : PASS.
- [ ] **Step 10: Committer** dans les deux dépôts : `feat: retain anonymized audit trail after account deletion`.

### Task 4: Déverrouillage d'un compte par un admin

**Files:**
- Modify: `backend/app/schemas/admin_permission.py`, `backend/app/api/routes/admin/users.py`, `backend/app/services/admin/user_service.py`, messages
- Modify: `frontend/src/lib/types/permissions.ts`, `frontend/src/hooks/use-permissions.ts`, `frontend/src/hooks/api/use-admin.ts`, `frontend/src/components/admin/users/UsersTable.tsx`, `frontend/src/app/[locale]/admin/(protected)/users/[id]/UserDetailContent.tsx`, locales
- Test: `backend/app/tests/admin/test_users.py`

**Interfaces:**
- Produces: `Permission.USERS_UNLOCK = "users:unlock"` ; `POST /admin/users/{user_id}/unlock → Message`, limité à `10/minute` ; hook `useCanUnlockUsers()`.

- [ ] **Step 1: Écrire les tests en échec** : compte verrouillé par `register_failed_login` puis connexion possible après l'appel ; 403 sans la permission ; 404 sur un compte inconnu ; activité `{"action": "unlock_user"}` créée ; `_guard_superadmin_target` appliqué.
- [ ] **Step 2: Lancer** `uv run pytest app/tests/admin/test_users.py -k unlock -v` — attendu : FAIL.
- [ ] **Step 3: Implémenter** `unlock_user_admin_service(request, session, current_user, user_id) -> Message`, qui appelle `clear_login_attempts(target.email)`.
- [ ] **Step 4: Relancer** — attendu : PASS.
- [ ] **Step 5: Ajouter l'action** au menu de ligne et à la fiche utilisateur, avec traductions.
- [ ] **Step 6: Committer** dans les deux dépôts : `feat: let admins unlock locked accounts`.

### Task 5: Socle MFA côté backend

**Files:**
- Create: `backend/app/core/mfa.py`, `backend/app/models/user_mfa.py`, `backend/app/repositories/user_mfa.py`, migration Alembic
- Modify: `backend/app/core/config.py`, `backend/.env.example`, `backend/app/models/__init__.py`, `backend/app/tests/conftest.py`
- Test: `backend/app/tests/test_mfa_core.py`

**Interfaces:**
- Produces, dans `core/mfa.py` :
  - `generate_totp_secret() -> str` ; `encrypt_secret(secret: str) -> str` ; `decrypt_secret(token: str) -> str` (Fernet avec `MFA_ENCRYPTION_KEY`).
  - `provisioning_uri(secret: str, email: str, issuer: str) -> str`. Le service passe le paramètre `site_name` comme `issuer`.
  - `verify_totp(secret: str, code: str, last_used_step: int | None) -> int | None` : renvoie le pas validé, ou `None` si le code est faux ou rejoué. `valid_window=1`.
  - `generate_recovery_codes() -> list[str]` : 10 codes `XXXXX-XXXXX` issus de `secrets`. `hash_recovery_code(code: str) -> str` : HMAC-SHA256 avec `SECRET_KEY`.
- Modèles : `UserMfa(user_id PK FK CASCADE, secret_encrypted, enabled_at nullable, last_used_step nullable, created_at)` et `UserMfaRecoveryCode(id, user_id FK CASCADE indexé, code_hash, used_at nullable)`.
- Config : `ADMIN_MFA_REQUIRED: bool = True`, `MFA_ENCRYPTION_KEY: str | None = None`, `MFA_CHALLENGE_MINUTES: int = 5`, `STEP_UP_TTL_SECONDS: int = 300`. Validateur : la clé est obligatoire si `ADMIN_MFA_REQUIRED` ; `ADMIN_MFA_REQUIRED=False` est refusé en `production`.
- Tests : fixture autouse dans `tests/conftest.py` qui met `ADMIN_MFA_REQUIRED=False`. Les tests MFA l'activent explicitement, ce qui préserve les suites admin existantes.

- [ ] **Step 1: Ajouter les dépendances** : `uv add pyotp cryptography`.
- [ ] **Step 2: Écrire les tests en échec** : code valide accepté ; faux code refusé ; **même code rejoué refusé** avec le `last_used_step` retourné ; chiffrement aller-retour ; 10 codes uniques ; validateur refusant `ADMIN_MFA_REQUIRED=False` en production.
- [ ] **Step 3: Lancer** `uv run pytest app/tests/test_mfa_core.py -v` — attendu : FAIL.
- [ ] **Step 4: Implémenter** le module, les modèles, le repository et la migration.
- [ ] **Step 5: Relancer** puis `uv run pytest` — attendu : PASS.
- [ ] **Step 6: Committer** : `feat: add TOTP and recovery code primitives`.

### Task 6: Parcours de connexion MFA côté backend

**Files:**
- Create: `backend/app/services/mfa_service.py`, `backend/app/schemas/mfa.py`, `backend/app/cli/__init__.py`, `backend/app/cli/reset_mfa.py`
- Modify: `backend/app/core/security.py:47-95`, `backend/app/services/auth_service.py:291-323` et `refresh_token_service`, `backend/app/api/routes/auth.py`, `backend/app/api/deps.py:34-130` et `get_ws_user`, `backend/app/api/routes/admin/support.py` (socket), `backend/app/api/routes/admin/users.py`, `backend/app/schemas/admin_permission.py`, messages
- Test: `backend/app/tests/test_mfa_flow.py`

**Interfaces:**
- Produces :
  - `create_access_token(..., mfa: bool = False)`, `create_refresh_token(..., mfa: bool = False)`, `create_mfa_token(user_id) -> str` (type `mfa`, `jti`, durée `MFA_CHALLENGE_MINUTES`).
  - `@dataclass MfaChallenge(mfa_token: str, enrollment_required: bool)` ; `login_service(...) -> AuthTokens | MfaChallenge`.
  - `POST /auth/login` renvoie `CookieLoginResponse | MfaChallengeResponse{mfa_required: true, enrollment_required: bool, message}`. En cas de défi, seul le cookie HttpOnly `mfa_token` est posé (`samesite=strict`, `path={API_V1_STR}/auth/mfa`).
  - `POST /auth/mfa/verify {code}`, `POST /auth/mfa/recovery {code}`, `POST /auth/mfa/enroll/start → {secret, otpauth_uri}`, `POST /auth/mfa/enroll/confirm {code} → {user, recovery_codes, message}`. Toutes en `rate_limit_strict("5/minute")`, avec authentification par cookie `mfa_token`.
  - `ErrorMessages.MFA_REQUIRED`, `MFA_INVALID_CODE`, `MFA_CHALLENGE_INVALID`.
  - `get_current_user` place les claims dans `request.state.token_claims`. `get_current_admin_user` et `get_current_superadmin` lèvent 403 `MFA_REQUIRED` si `ADMIN_MFA_REQUIRED` et si le claim `mfa` manque.
  - `Permission.USERS_MFA_RESET = "users:mfa_reset"` ; `POST /admin/users/{user_id}/mfa/reset → Message`.
  - `python -m app.cli.reset_mfa <email>` : dernier recours pour le superadmin racine, activité journalisée.

- [ ] **Step 1: Écrire les tests en échec** (avec `ADMIN_MFA_REQUIRED=True`)

```python
async def test_regular_user_login_is_unchanged(): ...
    assert "access_token" in client.cookies

async def test_admin_password_alone_sets_no_session_cookie(): ...
    assert body["mfa_required"] is True
    assert "access_token" not in client.cookies

async def test_unenrolled_admin_must_enroll_and_gets_recovery_codes(): ...
    assert len(body["recovery_codes"]) == 10 and "access_token" in client.cookies

async def test_verify_opens_session_and_admin_route_is_reachable(): ...
async def test_wrong_codes_lock_the_account(): ...      # 423 au seuil
async def test_recovery_code_works_once(): ...          # second usage : 401
async def test_mfa_token_is_single_use(): ...
async def test_refresh_preserves_mfa_claim(): ...
async def test_promoted_user_without_mfa_claim_gets_403_on_admin_routes_only(): ...
async def test_admin_socket_closes_without_mfa_claim(): ...
async def test_maintenance_gate_blocks_admin_without_mfa_claim(): ...
async def test_mfa_token_is_rejected_as_access_token(): ...
async def test_mfa_reset_requires_permission_and_revokes_sessions(): ...
```

- [ ] **Step 2: Lancer** `uv run pytest app/tests/test_mfa_flow.py -v` — attendu : FAIL.
- [ ] **Step 3: Implémenter les jetons et le service.** Le refresh recopie `claims.get("mfa", False)`. Le `jti` du jeton MFA consommé est mis en liste noire par le même mécanisme que la rotation. Chaque code faux appelle `register_failed_login(email)`. Toute réussite ou tout échec MFA est journalisé avec `ActivityType.LOGIN`.
- [ ] **Step 4: Implémenter les contrôles** dans les dépendances, le handshake du socket admin et `resolve_optional_user`.
- [ ] **Step 5: Implémenter** le reset (révocation des sessions via le service existant, `_guard_superadmin_target`) et la commande CLI.
- [ ] **Step 6: Relancer** puis `uv run pytest` — attendu : PASS.
- [ ] **Step 7: Committer** : `feat: enforce MFA on admin login`.

### Task 7: Parcours MFA côté frontend

**Files:**
- Create: `frontend/src/components/auth/MfaChallengeForm.tsx`, `frontend/src/components/auth/MfaEnrollment.tsx`, `frontend/src/hooks/api/use-mfa.ts`
- Modify: `frontend/src/hooks/api/use-auth.ts:42-59`, les services et types d'authentification de `src/lib/api/`, `frontend/src/app/[locale]/admin/login/AdminLoginContent.tsx`, `frontend/src/app/[locale]/(auth)/login/LoginContent.tsx`, `frontend/src/lib/api/api.ts`, `UserDetailContent.tsx`, `frontend/src/i18n/locales/{en,tr}/`
- Test: `frontend/src/components/auth/__tests__/MfaChallengeForm.test.tsx`, `frontend/tests-e2e/admin/mfa.spec.ts`

**Interfaces:**
- Consumes : routes `/auth/mfa/*` de la tâche 6.
- Produces : type `LoginResult = LoginSuccess | MfaChallengeResult`. `useLoginMutation` expose `mfaChallenge: { enrollmentRequired: boolean } | null`, sans appeler `login(data.user)` tant qu'un défi est en cours.

- [ ] **Step 1: Ajouter** `pnpm add react-qr-code`.
- [ ] **Step 2: Écrire les tests en échec** : réponse `mfa_required` affichant le formulaire sans redirection ni appel à `login` ; code faux affichant l'erreur ; recours par code de secours ; enrôlement exigeant de confirmer la conservation des codes avant de continuer ; **même parcours depuis `LoginContent`**.
- [ ] **Step 3: Lancer** `pnpm exec vitest run src/components/auth` et `pnpm test:e2e tests-e2e/admin/mfa.spec.ts` — attendu : FAIL.
- [ ] **Step 4: Implémenter.** Les deux pages partagent les composants. Dans `api.ts`, un 403 `MFA_REQUIRED` redirige vers `ROUTES.adminLogin`. Ajouter sur la fiche utilisateur l'action de réinitialisation, avec `useCanResetUserMfa()`.
- [ ] **Step 5: Relancer** — attendu : PASS.
- [ ] **Step 6: Committer** : `feat: add admin MFA challenge and enrollment screens`.

### Task 8: Reconfirmation des actions sensibles

**Files:**
- Create: `backend/app/repositories/step_up.py`, `frontend/src/providers/StepUpProvider.tsx`
- Modify: `backend/app/api/deps.py`, `backend/app/api/routes/auth.py`, `backend/app/api/routes/admin/users.py`, `backend/app/api/routes/admin/admins.py`, `backend/app/services/mfa_service.py`, messages
- Modify: `frontend/src/lib/api/api.ts`, `frontend/src/providers/ClientSideProviders.tsx`, locales
- Test: `backend/app/tests/test_step_up.py`, `frontend/src/providers/__tests__/StepUpProvider.test.tsx`

**Interfaces:**
- Produces :
  - `POST /auth/step-up {code} → Message`, en `rate_limit_strict("5/minute")`, qui enregistre `stepup:{sid}` dans Redis pour `STEP_UP_TTL_SECONDS`.
  - `StepUpRequired`, dépendance annotée, qui lève 403 `ErrorMessages.STEP_UP_REQUIRED` si la clé est absente. Sans effet si `ADMIN_MFA_REQUIRED=False`.
- Routes protégées : `DELETE /admin/users/{id}`, `POST /admin/users/{id}/change-password`, `POST /admin/users/{id}/mfa/reset`, `POST /admin/admins`, `PATCH /admin/admins/{id}/permissions`, `POST /admin/admins/{id}/promote`, `POST /admin/admins/{id}/demote`, `DELETE /admin/admins/{id}`.

- [ ] **Step 1: Écrire les tests en échec** : chaque route protégée, paramétrée, renvoie 403 sans reconfirmation ; passe après ; la reconfirmation d'une session ne vaut pas pour une autre ; expiration respectée ; code faux compté comme échec. Côté frontend : un 403 `STEP_UP_REQUIRED` ouvre la fenêtre, puis la requête d'origine repart une seule fois ; une annulation rejette la requête.
- [ ] **Step 2: Lancer** `uv run pytest app/tests/test_step_up.py -v` et `pnpm exec vitest run src/providers` — attendu : FAIL.
- [ ] **Step 3: Implémenter** le backend, puis l'intercepteur et le fournisseur.
- [ ] **Step 4: Relancer** — attendu : PASS.
- [ ] **Step 5: Committer** dans les deux dépôts : `feat: require step-up confirmation for sensitive admin actions`.

### Task 9: Scripts SQL et documentation

**Files:**
- Modify: `database/01_schema.sql`, `database/02_alembic_version.sql`, `database/verify.sql`, `database/ANALYSE.md`, `backend/README.md`

- [ ] **Step 1: Régénérer** à la racine : `uv run --with alembic --with sqlalchemy database/tools/generate.py` — attendu : vérification réussie.
- [ ] **Step 2: Adapter** dans `verify.sql` la révision attendue et le contrôle de suppression (`user_activity` passe de `CASCADE` à `SET NULL`).
- [ ] **Step 3: Documenter** les tables, la rétention, `MFA_ENCRYPTION_KEY` et la commande `reset_mfa`.
- [ ] **Step 4: Vérifier le tout** : `uv run ruff check . && uv run ruff format --check . && uv run pytest` puis `pnpm lint && pnpm exec vitest run && pnpm build` — attendu : aucun échec.
- [ ] **Step 5: Committer** les changements du backend : `docs: document audit retention and MFA operations`. Le dossier `database/` est hors Git : signaler les fichiers modifiés.
