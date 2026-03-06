-- Set passwords for seeded users
-- 1. Seeded Investors (password123)
UPDATE auth.users
SET encrypted_password = crypt('password123', gen_salt('bf', 10))
WHERE email IN ('investor.a@test.com', 'investor.b@test.com');

-- 2. Test Admin (TestAdmin2026!)
UPDATE auth.users
SET encrypted_password = crypt('TestAdmin2026!', gen_salt('bf', 10))
WHERE email = 'qa.admin@indigo.fund';

-- 3. Test Investor (Alice!Investor2026#Secure)
UPDATE auth.users
SET encrypted_password = crypt('Alice!Investor2026#Secure', gen_salt('bf', 10))
WHERE email = 'alice@test.indigo.com';
