-- Phase 1: Create All Investor Profiles
-- Strategy: Insert auth.users (trigger auto-creates profile), then UPDATE profile fields

BEGIN;

-- Step 1: Delete orphaned auth.users (those without admin profiles)
DELETE FROM auth.users
WHERE id NOT IN (
  SELECT id FROM profiles WHERE is_admin = true
);

-- Step 2: Insert auth.users with raw_user_meta_data for names
-- The on_auth_user_created trigger will auto-create profiles

-- IB Accounts (5)
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change, email_change_token_current, reauthentication_token, phone_change_token, phone_change)
VALUES
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
   'alec.beckman@indigo.fund', crypt('IndigoInvestor2026!', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}',
   '{"first_name":"Alec","last_name":"Beckman"}', now(), now(), '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
   'alex.jacobs@indigo.fund', crypt('IndigoInvestor2026!', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}',
   '{"first_name":"Alex","last_name":"Jacobs"}', now(), now(), '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
   'joel.barbeau@indigo.fund', crypt('IndigoInvestor2026!', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}',
   '{"first_name":"Joel","last_name":"Barbeau"}', now(), now(), '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
   'lars.ahlgreen@indigo.fund', crypt('IndigoInvestor2026!', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}',
   '{"first_name":"Lars","last_name":"Ahlgreen"}', now(), now(), '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
   'ryan.vanderwall@indigo.fund', crypt('IndigoInvestor2026!', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}',
   '{"first_name":"Ryan","last_name":"Van Der Wall"}', now(), now(), '', '', '', '', '', '', '', '');

-- Fees Account (1)
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change, email_change_token_current, reauthentication_token, phone_change_token, phone_change)
VALUES
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
   'fees@indigo.fund', crypt('IndigoInvestor2026!', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}',
   '{"first_name":"Indigo","last_name":"Fees"}', now(), now(), '', '', '', '', '', '', '', '');

-- Company Accounts (2)
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change, email_change_token_current, reauthentication_token, phone_change_token, phone_change)
VALUES
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
   'lp@indigo.fund', crypt('IndigoInvestor2026!', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}',
   '{"first_name":"INDIGO DIGITAL ASSET FUND","last_name":"LP"}', now(), now(), '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
   'ventures@indigo.fund', crypt('IndigoInvestor2026!', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}',
   '{"first_name":"INDIGO","last_name":"Ventures"}', now(), now(), '', '', '', '', '', '', '', '');

-- Regular Investors (34)
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change, email_change_token_current, reauthentication_token, phone_change_token, phone_change)
VALUES
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
   'advantage.blockchain@indigo.fund', crypt('IndigoInvestor2026!', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}',
   '{"first_name":"Advantage","last_name":"Blockchain"}', now(), now(), '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
   'alain.bensimon@indigo.fund', crypt('IndigoInvestor2026!', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}',
   '{"first_name":"Alain","last_name":"Bensimon"}', now(), now(), '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
   'alok.batra@indigo.fund', crypt('IndigoInvestor2026!', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}',
   '{"first_name":"Alok Pavan","last_name":"Batra"}', now(), now(), '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
   'anne.noique@indigo.fund', crypt('IndigoInvestor2026!', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}',
   '{"first_name":"Anne Cecile","last_name":"Noique"}', now(), now(), '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
   'babak.eftekhari@indigo.fund', crypt('IndigoInvestor2026!', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}',
   '{"first_name":"Babak","last_name":"Eftekhari"}', now(), now(), '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
   'blondish@indigo.fund', crypt('IndigoInvestor2026!', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}',
   '{"first_name":"Blondish","last_name":""}', now(), now(), '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
   'bo.kriek@indigo.fund', crypt('IndigoInvestor2026!', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}',
   '{"first_name":"Bo","last_name":"De Kriek"}', now(), now(), '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
   'brandon.hood@indigo.fund', crypt('IndigoInvestor2026!', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}',
   '{"first_name":"Brandon","last_name":"Hood"}', now(), now(), '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
   'daniele.francilia@indigo.fund', crypt('IndigoInvestor2026!', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}',
   '{"first_name":"Daniele","last_name":"Francilia"}', now(), now(), '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
   'danielle.richetta@indigo.fund', crypt('IndigoInvestor2026!', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}',
   '{"first_name":"Danielle","last_name":"Richetta"}', now(), now(), '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
   'dario.deiana@indigo.fund', crypt('IndigoInvestor2026!', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}',
   '{"first_name":"Dario","last_name":"Deiana"}', now(), now(), '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
   'halley@indigo.fund', crypt('IndigoInvestor2026!', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}',
   '{"first_name":"HALLEY86","last_name":""}', now(), now(), '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
   'jose.molla@indigo.fund', crypt('IndigoInvestor2026!', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}',
   '{"first_name":"Jose","last_name":"Molla"}', now(), now(), '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
   'julien.grunebaum@indigo.fund', crypt('IndigoInvestor2026!', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}',
   '{"first_name":"Julien","last_name":"Grunebaum"}', now(), now(), '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
   'kabbaj@indigo.fund', crypt('IndigoInvestor2026!', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}',
   '{"first_name":"Kabbaj","last_name":""}', now(), now(), '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
   'kyle.gulamerian@indigo.fund', crypt('IndigoInvestor2026!', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}',
   '{"first_name":"Kyle","last_name":"Gulamerian"}', now(), now(), '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
   'matthew.beatty@indigo.fund', crypt('IndigoInvestor2026!', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}',
   '{"first_name":"Matthew","last_name":"Beatty"}', now(), now(), '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
   'matthias.reiser@indigo.fund', crypt('IndigoInvestor2026!', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}',
   '{"first_name":"Matthias","last_name":"Reiser"}', now(), now(), '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
   'monica.chicheportiche@indigo.fund', crypt('IndigoInvestor2026!', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}',
   '{"first_name":"Monica","last_name":"Levy Chicheportiche"}', now(), now(), '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
   'nath.thomas@indigo.fund', crypt('IndigoInvestor2026!', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}',
   '{"first_name":"Nath & Thomas","last_name":""}', now(), now(), '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
   'nsvo.holdings@indigo.fund', crypt('IndigoInvestor2026!', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}',
   '{"first_name":"NSVO","last_name":"Holdings"}', now(), now(), '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
   'oliver.loisel@indigo.fund', crypt('IndigoInvestor2026!', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}',
   '{"first_name":"Oliver","last_name":"Loisel"}', now(), now(), '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
   'paul.johnson@indigo.fund', crypt('IndigoInvestor2026!', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}',
   '{"first_name":"Paul","last_name":"Johnson"}', now(), now(), '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
   'pierre.bezencon@indigo.fund', crypt('IndigoInvestor2026!', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}',
   '{"first_name":"Pierre","last_name":"Bezencon"}', now(), now(), '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
   'sacha.oshry@indigo.fund', crypt('IndigoInvestor2026!', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}',
   '{"first_name":"Sacha","last_name":"Oshry"}', now(), now(), '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
   'sam.johnson@indigo.fund', crypt('IndigoInvestor2026!', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}',
   '{"first_name":"Sam","last_name":"Johnson"}', now(), now(), '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
   'terance.chen@indigo.fund', crypt('IndigoInvestor2026!', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}',
   '{"first_name":"Terance","last_name":"Chen"}', now(), now(), '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
   'thomas.puech@indigo.fund', crypt('IndigoInvestor2026!', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}',
   '{"first_name":"Thomas","last_name":"Puech"}', now(), now(), '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
   'tomer.mazar@indigo.fund', crypt('IndigoInvestor2026!', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}',
   '{"first_name":"Tomer","last_name":"Mazar"}', now(), now(), '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
   'tomer.zur@indigo.fund', crypt('IndigoInvestor2026!', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}',
   '{"first_name":"Tomer","last_name":"Zur"}', now(), now(), '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
   'valeria.cruz@indigo.fund', crypt('IndigoInvestor2026!', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}',
   '{"first_name":"Valeria","last_name":"Cruz"}', now(), now(), '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
   'ventures.lifestyle@indigo.fund', crypt('IndigoInvestor2026!', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}',
   '{"first_name":"Ventures","last_name":"Life Style"}', now(), now(), '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
   'victoria.parientecohen@indigo.fund', crypt('IndigoInvestor2026!', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}',
   '{"first_name":"Victoria","last_name":"Pariente-Cohen"}', now(), now(), '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
   'vivie.liana@indigo.fund', crypt('IndigoInvestor2026!', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}',
   '{"first_name":"Vivie & Liana","last_name":""}', now(), now(), '', '', '', '', '', '', '', '');

-- Step 3: Update auto-created profiles with correct fee_pct, account_type, status
-- IB Accounts
UPDATE profiles SET account_type = 'ib'::account_type, fee_pct = 0, status = 'active', kyc_status = 'approved'
WHERE email = 'alec.beckman@indigo.fund';

UPDATE profiles SET account_type = 'ib'::account_type, fee_pct = 20, status = 'active', kyc_status = 'approved'
WHERE email = 'alex.jacobs@indigo.fund';

UPDATE profiles SET account_type = 'ib'::account_type, fee_pct = 20, status = 'active', kyc_status = 'approved'
WHERE email = 'joel.barbeau@indigo.fund';

UPDATE profiles SET account_type = 'ib'::account_type, fee_pct = 0, status = 'active', kyc_status = 'approved'
WHERE email = 'lars.ahlgreen@indigo.fund';

UPDATE profiles SET account_type = 'ib'::account_type, fee_pct = 0, status = 'active', kyc_status = 'approved'
WHERE email = 'ryan.vanderwall@indigo.fund';

-- Fees Account
UPDATE profiles SET account_type = 'fees_account'::account_type, fee_pct = 0, is_system_account = true, status = 'active', kyc_status = 'approved'
WHERE email = 'fees@indigo.fund';

-- Company Accounts (0% fee)
UPDATE profiles SET fee_pct = 0, status = 'active', kyc_status = 'approved'
WHERE email IN ('lp@indigo.fund', 'ventures@indigo.fund');

-- Investors with custom fees
UPDATE profiles SET fee_pct = 18, status = 'active', kyc_status = 'approved' WHERE email = 'advantage.blockchain@indigo.fund';
UPDATE profiles SET fee_pct = 10, status = 'active', kyc_status = 'approved' WHERE email = 'alain.bensimon@indigo.fund';
UPDATE profiles SET fee_pct = 20, status = 'active', kyc_status = 'approved' WHERE email = 'alok.batra@indigo.fund';
UPDATE profiles SET fee_pct = 10, status = 'active', kyc_status = 'approved' WHERE email = 'anne.noique@indigo.fund';
UPDATE profiles SET fee_pct = 18, status = 'active', kyc_status = 'approved' WHERE email = 'babak.eftekhari@indigo.fund';
UPDATE profiles SET fee_pct = 0, status = 'active', kyc_status = 'approved' WHERE email = 'blondish@indigo.fund';
UPDATE profiles SET fee_pct = 10, status = 'active', kyc_status = 'approved' WHERE email = 'bo.kriek@indigo.fund';
UPDATE profiles SET fee_pct = 20, status = 'active', kyc_status = 'approved' WHERE email = 'brandon.hood@indigo.fund';
UPDATE profiles SET fee_pct = 10, status = 'active', kyc_status = 'approved' WHERE email = 'daniele.francilia@indigo.fund';
UPDATE profiles SET fee_pct = 10, status = 'active', kyc_status = 'approved' WHERE email = 'danielle.richetta@indigo.fund';
UPDATE profiles SET fee_pct = 20, status = 'active', kyc_status = 'approved' WHERE email = 'dario.deiana@indigo.fund';
UPDATE profiles SET fee_pct = 20, status = 'active', kyc_status = 'approved' WHERE email = 'halley@indigo.fund';
UPDATE profiles SET fee_pct = 15, status = 'active', kyc_status = 'approved' WHERE email = 'jose.molla@indigo.fund';
UPDATE profiles SET fee_pct = 10, status = 'active', kyc_status = 'approved' WHERE email = 'julien.grunebaum@indigo.fund';
UPDATE profiles SET fee_pct = 20, status = 'active', kyc_status = 'approved' WHERE email = 'kabbaj@indigo.fund';
UPDATE profiles SET fee_pct = 15, status = 'active', kyc_status = 'approved' WHERE email = 'kyle.gulamerian@indigo.fund';
UPDATE profiles SET fee_pct = 10, status = 'active', kyc_status = 'approved' WHERE email = 'matthew.beatty@indigo.fund';
UPDATE profiles SET fee_pct = 10, status = 'active', kyc_status = 'approved' WHERE email = 'matthias.reiser@indigo.fund';
UPDATE profiles SET fee_pct = 20, status = 'active', kyc_status = 'approved' WHERE email = 'monica.chicheportiche@indigo.fund';
UPDATE profiles SET fee_pct = 0, status = 'active', kyc_status = 'approved' WHERE email = 'nath.thomas@indigo.fund';
UPDATE profiles SET fee_pct = 20, status = 'active', kyc_status = 'approved' WHERE email = 'nsvo.holdings@indigo.fund';
UPDATE profiles SET fee_pct = 10, status = 'active', kyc_status = 'approved' WHERE email = 'oliver.loisel@indigo.fund';
UPDATE profiles SET fee_pct = 13.5, status = 'active', kyc_status = 'approved' WHERE email = 'paul.johnson@indigo.fund';
UPDATE profiles SET fee_pct = 10, status = 'active', kyc_status = 'approved' WHERE email = 'pierre.bezencon@indigo.fund';
UPDATE profiles SET fee_pct = 15, status = 'active', kyc_status = 'approved' WHERE email = 'sacha.oshry@indigo.fund';
UPDATE profiles SET fee_pct = 16, status = 'active', kyc_status = 'approved' WHERE email = 'sam.johnson@indigo.fund';
UPDATE profiles SET fee_pct = 10, status = 'active', kyc_status = 'approved' WHERE email = 'terance.chen@indigo.fund';
UPDATE profiles SET fee_pct = 0, status = 'active', kyc_status = 'approved' WHERE email = 'thomas.puech@indigo.fund';
UPDATE profiles SET fee_pct = 0, status = 'active', kyc_status = 'approved' WHERE email = 'tomer.mazar@indigo.fund';
UPDATE profiles SET fee_pct = 20, status = 'active', kyc_status = 'approved' WHERE email = 'tomer.zur@indigo.fund';
UPDATE profiles SET fee_pct = 20, status = 'active', kyc_status = 'approved' WHERE email = 'valeria.cruz@indigo.fund';
UPDATE profiles SET fee_pct = 16, status = 'active', kyc_status = 'approved' WHERE email = 'ventures.lifestyle@indigo.fund';
UPDATE profiles SET fee_pct = 0, status = 'active', kyc_status = 'approved' WHERE email = 'victoria.parientecohen@indigo.fund';
UPDATE profiles SET fee_pct = 0, status = 'active', kyc_status = 'approved' WHERE email = 'vivie.liana@indigo.fund';

-- Update existing admin: Nathanael Cohen fee_pct = 0
UPDATE profiles SET fee_pct = 0 WHERE id = 'ed91c89d-23de-4981-b6b7-60e13f1a6767';

-- Step 4: Create user_roles entries
-- IB roles
INSERT INTO user_roles (user_id, role)
SELECT p.id, 'ib'::app_role FROM profiles p WHERE p.email = 'alec.beckman@indigo.fund'
ON CONFLICT (user_id, role) DO NOTHING;
INSERT INTO user_roles (user_id, role)
SELECT p.id, 'ib'::app_role FROM profiles p WHERE p.email = 'alex.jacobs@indigo.fund'
ON CONFLICT (user_id, role) DO NOTHING;
INSERT INTO user_roles (user_id, role)
SELECT p.id, 'ib'::app_role FROM profiles p WHERE p.email = 'joel.barbeau@indigo.fund'
ON CONFLICT (user_id, role) DO NOTHING;
INSERT INTO user_roles (user_id, role)
SELECT p.id, 'ib'::app_role FROM profiles p WHERE p.email = 'lars.ahlgreen@indigo.fund'
ON CONFLICT (user_id, role) DO NOTHING;
INSERT INTO user_roles (user_id, role)
SELECT p.id, 'ib'::app_role FROM profiles p WHERE p.email = 'ryan.vanderwall@indigo.fund'
ON CONFLICT (user_id, role) DO NOTHING;

-- Investor roles for all investor-type profiles (auto-created profiles may not have roles)
INSERT INTO user_roles (user_id, role)
SELECT p.id, 'investor'::app_role
FROM profiles p
WHERE p.account_type IN ('investor', 'fees_account')
  AND NOT p.is_admin
  AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = p.id AND ur.role = 'investor')
ON CONFLICT (user_id, role) DO NOTHING;

-- Step 5: Set IB relationships
-- Must be done after IB roles are created (trigger validates IB parent has 'ib' role)

-- Advantage Blockchain -> Alec Beckman (2%)
UPDATE profiles SET
  ib_parent_id = (SELECT p.id FROM profiles p WHERE p.email = 'alec.beckman@indigo.fund'),
  ib_percentage = 2
WHERE email = 'advantage.blockchain@indigo.fund';

-- Babak Eftekhari -> Lars Ahlgreen (2%)
UPDATE profiles SET
  ib_parent_id = (SELECT p.id FROM profiles p WHERE p.email = 'lars.ahlgreen@indigo.fund'),
  ib_percentage = 2
WHERE email = 'babak.eftekhari@indigo.fund';

-- Paul Johnson -> Alex Jacobs (1.5%)
UPDATE profiles SET
  ib_parent_id = (SELECT p.id FROM profiles p WHERE p.email = 'alex.jacobs@indigo.fund'),
  ib_percentage = 1.5
WHERE email = 'paul.johnson@indigo.fund';

-- Sam Johnson -> Ryan Van Der Wall (4%)
UPDATE profiles SET
  ib_parent_id = (SELECT p.id FROM profiles p WHERE p.email = 'ryan.vanderwall@indigo.fund'),
  ib_percentage = 4
WHERE email = 'sam.johnson@indigo.fund';

-- Ventures Life Style -> Joel Barbeau (4%)
UPDATE profiles SET
  ib_parent_id = (SELECT p.id FROM profiles p WHERE p.email = 'joel.barbeau@indigo.fund'),
  ib_percentage = 4
WHERE email = 'ventures.lifestyle@indigo.fund';

COMMIT;

-- Verification queries
SELECT 'Total profiles' as check, count(*) as result FROM profiles
UNION ALL
SELECT 'Non-admin profiles', count(*) FROM profiles WHERE NOT is_admin
UNION ALL
SELECT 'IB accounts', count(*) FROM profiles WHERE account_type = 'ib'
UNION ALL
SELECT 'Fees accounts', count(*) FROM profiles WHERE account_type = 'fees_account'
UNION ALL
SELECT 'Investor accounts', count(*) FROM profiles WHERE account_type = 'investor' AND NOT is_admin
UNION ALL
SELECT 'With IB parent', count(*) FROM profiles WHERE ib_parent_id IS NOT NULL
UNION ALL
SELECT 'User roles', count(*) FROM user_roles;
