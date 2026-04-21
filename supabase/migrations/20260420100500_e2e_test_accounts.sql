-- ============================================================
-- E2E test accounts — FRESH UUIDs (NOT the canonical @indigo.fund users)
-- Date: 2026-04-20
--
-- Rationale for fresh UUIDs:
--   The original plan proposed UPSERTing auth.users keyed on the canonical
--   profile IDs (e438bfff / c7b18014 / 96fbdf46 / 4ca7a856 / 40c33d59).
--   On prod those IDs belong to real people (Adriel + Ryan/Alex/Paul/Sam).
--   Overwriting their auth.users.email to *@indigo.test would break their
--   production login. This migration provisions FIVE BRAND-NEW accounts
--   with deterministic UUIDs prefixed `e2e00000-…` so they are easy to
--   recognise and safe to wipe.
--
-- Scope:
--   - auth.users (5 rows): email_confirmed_at set, placeholder password
--     (real passwords get set later by scripts/seed-e2e-auth.ts via
--     the service-role API using env-sourced E2E_PASSWORD_{ADMIN,INVESTOR}).
--   - auth.identities (5 rows): provider='email' so password login works.
--   - public.profiles (5 rows): admin flag + investor rows, fee_pct=0 on
--     admin to avoid fees-account validation trigger surprises.
--   - public.user_roles (1 row): admin role for the admin E2E account.
--     Investor accounts rely on profiles.account_type='investor' +
--     sync_profile_role_from_profiles trigger to populate profiles.role.
--
-- Idempotent: all inserts use ON CONFLICT DO UPDATE / DO NOTHING, so
-- re-runs after seed-e2e-auth.ts has set real passwords will NOT
-- overwrite them (we preserve encrypted_password on conflict).
-- ============================================================

DO $$
DECLARE
  v_placeholder_hash text := crypt('indigo-placeholder-reset-me', gen_salt('bf'));
  v_admin_id   uuid := 'e2e00000-0000-0000-0000-000000000001'::uuid;
  v_sam_id     uuid := 'e2e00000-0000-0000-0000-000000000002'::uuid;
  v_paul_id    uuid := 'e2e00000-0000-0000-0000-000000000003'::uuid;
  v_alex_id    uuid := 'e2e00000-0000-0000-0000-000000000004'::uuid;
  v_ryan_id    uuid := 'e2e00000-0000-0000-0000-000000000005'::uuid;
BEGIN
  -- Guard: refuse to clobber if a non-e2e record already holds any of these IDs
  IF EXISTS (
    SELECT 1 FROM auth.users
    WHERE id IN (v_admin_id, v_sam_id, v_paul_id, v_alex_id, v_ryan_id)
      AND email NOT LIKE '%@indigo.test'
  ) THEN
    RAISE EXCEPTION 'refusing to provision: one of the e2e UUIDs is already bound to a non-@indigo.test email';
  END IF;

  -- auth.users
  INSERT INTO auth.users (
    id, email, encrypted_password, email_confirmed_at,
    aud, role, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
  ) VALUES
    (v_admin_id, 'e2e_admin@indigo.test',          v_placeholder_hash, now(), 'authenticated', 'authenticated',
      '{"provider":"email","providers":["email"]}'::jsonb, '{"purpose":"e2e"}'::jsonb, now(), now()),
    (v_sam_id,   'e2e_investor_sam@indigo.test',   v_placeholder_hash, now(), 'authenticated', 'authenticated',
      '{"provider":"email","providers":["email"]}'::jsonb, '{"purpose":"e2e"}'::jsonb, now(), now()),
    (v_paul_id,  'e2e_investor_paul@indigo.test',  v_placeholder_hash, now(), 'authenticated', 'authenticated',
      '{"provider":"email","providers":["email"]}'::jsonb, '{"purpose":"e2e"}'::jsonb, now(), now()),
    (v_alex_id,  'e2e_investor_alex@indigo.test',  v_placeholder_hash, now(), 'authenticated', 'authenticated',
      '{"provider":"email","providers":["email"]}'::jsonb, '{"purpose":"e2e"}'::jsonb, now(), now()),
    (v_ryan_id,  'e2e_investor_ryan@indigo.test',  v_placeholder_hash, now(), 'authenticated', 'authenticated',
      '{"provider":"email","providers":["email"]}'::jsonb, '{"purpose":"e2e"}'::jsonb, now(), now())
  ON CONFLICT (id) DO UPDATE SET
    email              = EXCLUDED.email,
    email_confirmed_at = COALESCE(auth.users.email_confirmed_at, now()),
    updated_at         = now();
  -- Note: encrypted_password intentionally NOT overwritten on conflict,
  -- so subsequent runs preserve any real password set by seed-e2e-auth.ts.

  -- auth.identities. NOTE: `email` is a generated column — do not insert it;
  -- GoTrue derives it from identity_data->>'email'.
  INSERT INTO auth.identities (
    provider_id, user_id, identity_data, provider, created_at, updated_at
  ) VALUES
    ('e2e_admin@indigo.test',         v_admin_id,
      jsonb_build_object('sub', v_admin_id::text, 'email', 'e2e_admin@indigo.test', 'email_verified', true),
      'email', now(), now()),
    ('e2e_investor_sam@indigo.test',  v_sam_id,
      jsonb_build_object('sub', v_sam_id::text, 'email', 'e2e_investor_sam@indigo.test', 'email_verified', true),
      'email', now(), now()),
    ('e2e_investor_paul@indigo.test', v_paul_id,
      jsonb_build_object('sub', v_paul_id::text, 'email', 'e2e_investor_paul@indigo.test', 'email_verified', true),
      'email', now(), now()),
    ('e2e_investor_alex@indigo.test', v_alex_id,
      jsonb_build_object('sub', v_alex_id::text, 'email', 'e2e_investor_alex@indigo.test', 'email_verified', true),
      'email', now(), now()),
    ('e2e_investor_ryan@indigo.test', v_ryan_id,
      jsonb_build_object('sub', v_ryan_id::text, 'email', 'e2e_investor_ryan@indigo.test', 'email_verified', true),
      'email', now(), now())
  ON CONFLICT (provider_id, provider) DO UPDATE SET
    user_id       = EXCLUDED.user_id,
    identity_data = EXCLUDED.identity_data,
    updated_at    = now();

  -- public.profiles
  INSERT INTO public.profiles (
    id, email, first_name, last_name, is_admin, account_type, fee_pct, status, include_in_reporting
  ) VALUES
    (v_admin_id, 'e2e_admin@indigo.test',          'E2E', 'Admin',   true,  'investor', 0,    'active', false),
    (v_sam_id,   'e2e_investor_sam@indigo.test',   'E2E', 'Sam',     false, 'investor', 20,   'active', false),
    (v_paul_id,  'e2e_investor_paul@indigo.test',  'E2E', 'Paul',    false, 'investor', 20,   'active', false),
    (v_alex_id,  'e2e_investor_alex@indigo.test',  'E2E', 'Alex',    false, 'investor', 20,   'active', false),
    (v_ryan_id,  'e2e_investor_ryan@indigo.test',  'E2E', 'Ryan',    false, 'investor', 20,   'active', false)
  ON CONFLICT (id) DO UPDATE SET
    email                = EXCLUDED.email,
    first_name           = EXCLUDED.first_name,
    last_name            = EXCLUDED.last_name,
    is_admin             = EXCLUDED.is_admin,
    account_type         = EXCLUDED.account_type,
    fee_pct              = EXCLUDED.fee_pct,
    status               = EXCLUDED.status,
    include_in_reporting = EXCLUDED.include_in_reporting,
    updated_at           = now();

  -- public.user_roles (admin-only; investors derive role via profiles trigger)
  INSERT INTO public.user_roles (id, user_id, role)
  VALUES (gen_random_uuid(), v_admin_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
END $$;

-- Revoke anon reads on purpose (defense in depth)
REVOKE ALL ON public.profiles FROM anon;
GRANT SELECT ON public.profiles TO authenticated, service_role;

-- Verification
DO $$
DECLARE
  v_users   int;
  v_idents  int;
  v_profs   int;
  v_admins  int;
BEGIN
  SELECT count(*) INTO v_users  FROM auth.users      WHERE email LIKE 'e2e_%@indigo.test';
  SELECT count(*) INTO v_idents FROM auth.identities WHERE email LIKE 'e2e_%@indigo.test';
  SELECT count(*) INTO v_profs  FROM public.profiles WHERE email LIKE 'e2e_%@indigo.test';
  SELECT count(*) INTO v_admins FROM public.user_roles ur
    JOIN public.profiles p ON p.id = ur.user_id
   WHERE p.email = 'e2e_admin@indigo.test' AND ur.role = 'admin';

  IF v_users <> 5 OR v_idents <> 5 OR v_profs <> 5 OR v_admins <> 1 THEN
    RAISE EXCEPTION 'e2e seed verification failed: users=%, idents=%, profiles=%, admin_roles=%',
      v_users, v_idents, v_profs, v_admins;
  END IF;
END $$;
