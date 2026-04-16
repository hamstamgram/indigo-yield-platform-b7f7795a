-- Create admin profile for testing
-- Date: 2026-04-12
-- Purpose: Create the admin user that tests use

INSERT INTO profiles (id, email, first_name, last_name, role)
VALUES 
  ('cd60cf98-8ae8-436d-b53c-d1b3cbca3c47', 'admin@test.local', 'Admin', 'User', 'admin')
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  role = 'admin';

-- Also create user_roles entry
INSERT INTO user_roles (user_id, role)
VALUES ('cd60cf98-8ae8-436d-b53c-d1b3cbca3c47', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;