-- Verification non destructive : les donnees de test sont toujours annulees.
BEGIN;
DO $verify$
<<fixture>>
DECLARE
    owner_id uuid := gen_random_uuid();
    admin_id uuid := gen_random_uuid();
    file_id uuid := gen_random_uuid();
    ticket_id uuid := gen_random_uuid();
    message_id uuid := gen_random_uuid();
    set_id uuid := gen_random_uuid();
    role_id uuid := gen_random_uuid();
    n integer;
BEGIN
    SELECT count(*) INTO n FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      AND table_name = ANY(ARRAY['user', 'admin_permission', 'file', 'user_activity',
          'user_session', 'support_ticket', 'support_message',
          'support_message_attachment', 'notification', 'announcement', 'system_setting',
          'user_mfa', 'user_mfa_recovery_code', 'rbac_permission_set',
          'rbac_permission_set_item', 'rbac_role', 'rbac_role_permission_set',
          'rbac_user_role', 'rbac_user_permission_set']);
    IF n <> 19 THEN RAISE EXCEPTION 'Tables applicatives attendues : 19, trouvees : %', n; END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') THEN
        RAISE EXCEPTION 'Extension pg_trgm absente';
    END IF;
    IF (SELECT count(*) FROM public.alembic_version) <> 1 OR
       (SELECT version_num FROM public.alembic_version) <> 'b7c8d9e0f1a2' THEN
        RAISE EXCEPTION 'Revision Alembic incorrecte';
    END IF;

    INSERT INTO public."user" (id, email, is_active, is_verified, role, hashed_password, created_at, updated_at)
    VALUES (owner_id, owner_id::text || '@verify.invalid', true, false, 'user', 'test-only', now(), now()),
           (admin_id, admin_id::text || '@verify.invalid', true, true, 'admin', 'test-only', now(), now());
    BEGIN
        INSERT INTO public."user" (id, email, is_active, role, hashed_password, created_at, updated_at)
        VALUES (gen_random_uuid(), owner_id::text || '@verify.invalid', true, 'user', 'test-only', now(), now());
        RAISE EXCEPTION 'Unicite email non appliquee';
    EXCEPTION WHEN unique_violation THEN NULL;
    END;
    INSERT INTO public.file (id, uploaded_by_id, url, public_id, content_type, size, created_at, updated_at)
    VALUES (file_id, owner_id, 'https://example.invalid/test', file_id::text, 'image/png', 10, now(), now());
    UPDATE public."user" SET avatar_file_id = file_id WHERE id = owner_id;
    INSERT INTO public.support_ticket (id, user_id, subject, status, priority, assigned_admin_id, last_message_at, created_at, updated_at)
    VALUES (ticket_id, owner_id, 'Verification', 'open', 'normal', admin_id, now(), now(), now());
    INSERT INTO public.support_message (id, ticket_id, sender_id, sender_role, body, created_at)
    VALUES (message_id, ticket_id, admin_id, 'admin', 'Verification', now());
    INSERT INTO public.support_message_attachment (id, message_id, file_id, created_at)
    VALUES (gen_random_uuid(), message_id, file_id, now());
    BEGIN
        INSERT INTO public.support_message_attachment (id, message_id, file_id, created_at)
        VALUES (gen_random_uuid(), message_id, file_id, now());
        RAISE EXCEPTION 'Unicite piece jointe non appliquee';
    EXCEPTION WHEN unique_violation THEN NULL;
    END;
    INSERT INTO public.admin_permission (id, user_id, permission, granted_by, granted_at)
    VALUES (gen_random_uuid(), admin_id, 'users:read', owner_id, now());
    INSERT INTO public.notification (id, user_id, type, data, created_at)
    VALUES (gen_random_uuid(), owner_id, 'test', '{}', now());
    INSERT INTO public.user_session (id, user_id, refresh_jti, created_at, last_used_at, expires_at)
    VALUES (gen_random_uuid(), owner_id, gen_random_uuid()::text, now(), now(), now() + interval '1 day');
    INSERT INTO public.user_activity (id, user_id, activity_type, resource_type, details, status, created_at)
    VALUES (gen_random_uuid(), owner_id, 'create', 'user', '{}', 'success', now());
    INSERT INTO public.user_mfa (user_id, secret_encrypted, created_at)
    VALUES (owner_id, 'test-only', now());
    INSERT INTO public.user_mfa_recovery_code (id, user_id, code_hash)
    VALUES (gen_random_uuid(), owner_id, repeat('a', 64));
    INSERT INTO public.system_setting (id, key, value, updated_by, updated_at)
    VALUES (gen_random_uuid(), 'verify_' || owner_id::text, 'true', admin_id, now());
    INSERT INTO public.announcement (id, kind, variables, translations, level, audience, show_banner, send_email, created_by, created_at)
    VALUES (gen_random_uuid(), 'custom', '{}', '{}', 'info', 'all', false, false, admin_id, now());
    INSERT INTO public.rbac_permission_set (id, key, name, audience, is_system, created_at, updated_at)
    VALUES (set_id, 'verify_' || set_id::text, 'Verification', 'admin', false, now(), now());
    INSERT INTO public.rbac_permission_set_item (set_id, permission)
    VALUES (set_id, 'users:read');
    INSERT INTO public.rbac_role (id, key, name, audience, is_system, created_at, updated_at)
    VALUES (role_id, 'verify_' || role_id::text, 'Verification', 'admin', false, now(), now());
    INSERT INTO public.rbac_role_permission_set (role_id, set_id) VALUES (role_id, set_id);
    INSERT INTO public.rbac_user_role (id, user_id, role_id, assigned_by, created_at)
    VALUES (gen_random_uuid(), owner_id, role_id, admin_id, now());
    INSERT INTO public.rbac_user_permission_set (id, user_id, set_id, assigned_by, created_at)
    VALUES (gen_random_uuid(), owner_id, set_id, admin_id, now());
    BEGIN
        INSERT INTO public.rbac_user_role (id, user_id, role_id, created_at)
        VALUES (gen_random_uuid(), owner_id, role_id, now());
        RAISE EXCEPTION 'Unicite role utilisateur non appliquee';
    EXCEPTION WHEN unique_violation THEN NULL;
    END;
    BEGIN
        INSERT INTO public.rbac_user_permission_set (id, user_id, set_id, created_at)
        VALUES (gen_random_uuid(), owner_id, set_id, now());
        RAISE EXCEPTION 'Unicite jeu de permissions utilisateur non appliquee';
    EXCEPTION WHEN unique_violation THEN NULL;
    END;
    BEGIN
        DELETE FROM public.rbac_permission_set WHERE id = fixture.set_id;
        RAISE EXCEPTION 'RESTRICT jeu de permissions non applique';
    EXCEPTION WHEN foreign_key_violation THEN NULL;
    END;
    BEGIN
        DELETE FROM public.rbac_role WHERE id = fixture.role_id;
        RAISE EXCEPTION 'RESTRICT role non applique';
    EXCEPTION WHEN foreign_key_violation THEN NULL;
    END;
    DELETE FROM public."user" WHERE id = admin_id;
    IF NOT EXISTS (SELECT 1 FROM public.rbac_user_role
                   WHERE user_id = owner_id AND assigned_by IS NULL)
       OR NOT EXISTS (SELECT 1 FROM public.rbac_user_permission_set
                      WHERE user_id = owner_id AND assigned_by IS NULL) THEN
        RAISE EXCEPTION 'Suppression administrateur : assigned_by RBAC non mis a NULL';
    END IF;
    IF EXISTS (SELECT 1 FROM public.support_ticket WHERE id = ticket_id AND assigned_admin_id IS NOT NULL)
       OR EXISTS (SELECT 1 FROM public.support_message WHERE id = message_id AND sender_id IS NOT NULL)
       OR EXISTS (SELECT 1 FROM public.admin_permission WHERE user_id = admin_id)
       OR EXISTS (SELECT 1 FROM public.system_setting WHERE updated_by = admin_id)
       OR EXISTS (SELECT 1 FROM public.announcement WHERE created_by = admin_id) THEN
        RAISE EXCEPTION 'Suppression administrateur : CASCADE/SET NULL incorrect';
    END IF;
    DELETE FROM public.file WHERE id = file_id;
    IF EXISTS (SELECT 1 FROM public."user" WHERE id = owner_id AND avatar_file_id IS NOT NULL)
       OR EXISTS (SELECT 1 FROM public.support_message_attachment a WHERE a.message_id = fixture.message_id AND a.file_id = fixture.file_id) THEN
        RAISE EXCEPTION 'Suppression fichier : avatar/piece jointe incorrect';
    END IF;
    DELETE FROM public."user" WHERE id = owner_id;
    IF EXISTS (SELECT 1 FROM public.support_ticket t WHERE t.id = ticket_id)
       OR EXISTS (SELECT 1 FROM public.support_message m WHERE m.id = message_id)
       OR EXISTS (SELECT 1 FROM public.notification WHERE user_id = owner_id)
       OR EXISTS (SELECT 1 FROM public.user_session WHERE user_id = owner_id)
       OR EXISTS (SELECT 1 FROM public.user_mfa WHERE user_id = owner_id)
       OR EXISTS (SELECT 1 FROM public.user_mfa_recovery_code WHERE user_id = owner_id)
       OR EXISTS (SELECT 1 FROM public.rbac_user_role WHERE user_id = owner_id)
       OR EXISTS (SELECT 1 FROM public.rbac_user_permission_set WHERE user_id = owner_id)
       OR EXISTS (SELECT 1 FROM public.user_activity WHERE user_id = owner_id) THEN
        RAISE EXCEPTION 'Suppression compte : cascade incomplete';
    END IF;
    SELECT count(*) INTO n FROM public.user_activity
    WHERE user_id IS NULL AND activity_type = 'create' AND resource_type = 'user';
    IF n <> 1 THEN
        RAISE EXCEPTION 'Suppression compte : journal d''activite non conserve (SET NULL)';
    END IF;
    DELETE FROM public.rbac_role WHERE id = fixture.role_id;
    DELETE FROM public.rbac_permission_set WHERE id = fixture.set_id;
    IF EXISTS (SELECT 1 FROM public.rbac_role_permission_set rps WHERE rps.role_id = fixture.role_id)
       OR EXISTS (SELECT 1 FROM public.rbac_permission_set_item i WHERE i.set_id = fixture.set_id) THEN
        RAISE EXCEPTION 'Suppression role/jeu : cascade incomplete';
    END IF;
    RAISE NOTICE 'OK : 19 tables, revision, extension, unicites, CASCADE, RESTRICT et SET NULL';
END
$verify$;
ROLLBACK;
