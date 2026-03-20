-- Update password for thomas.puech@indigo.fund
-- New password: TestAdmin2026!

-- Note: We use auth.users table for Supabase authentication
-- and the crypt function for hashing.

BEGIN;

UPDATE auth.users
SET encrypted_password = crypt('TestAdmin2026!', gen_salt('bf', 10))
WHERE email = 'thomas.puech@indigo.fund';

COMMIT;
