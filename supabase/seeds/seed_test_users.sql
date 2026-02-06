-- Seed Test Users for E2E Suite
-- Purpose: Add specific users required by tests/e2e/helpers/auth.ts

BEGIN;

-- 1. Create Admin User: qa.admin@indigo.fund
INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES 
  ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c11', 'qa.admin@indigo.fund', '{"full_name": "QA Admin"}')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, email, first_name, last_name, role, is_admin)
VALUES
  ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c11', 'qa.admin@indigo.fund', 'QA', 'Admin', 'admin', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Create Investor User: alice@test.indigo.com
INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES 
  ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c12', 'alice@test.indigo.com', '{"full_name": "Alice Test"}')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, email, first_name, last_name, role, is_admin)
VALUES
  ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c12', 'alice@test.indigo.com', 'Alice', 'Test', 'investor', false)
ON CONFLICT (id) DO NOTHING;

COMMIT;
