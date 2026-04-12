-- Create admin user and assign super_admin role
DO $$
DECLARE
  admin_user_id UUID;
BEGIN
  -- Check if admin user already exists
  SELECT id INTO admin_user_id 
  FROM auth.users 
  WHERE email = 'admin@test.local';
  
  IF admin_user_id IS NULL THEN
    -- Create admin user
    INSERT INTO auth.users (instance_id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at, last_sign_in_at, ambiguity_role, role, aud, raw_app_meta_data)
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      'admin@test.local',
      crypt('TestAdmin2026!', gen_salt('bf')),
      NOW(),
      '{"email_verified": true}',
      NOW(),
      NOW(),
      NOW(),
      'authenticated',
      'authenticated',
      'authenticated',
      '{"provider": "email", "providers": ["email"]}'
    )
    ON CONFLICT (email) DO NOTHING
    RETURNING id INTO admin_user_id;
  END IF;
  
  IF admin_user_id IS NOT NULL THEN
    -- Create profile
    INSERT INTO public.profiles (id, email, first_name, last_name, role, status)
    VALUES (admin_user_id, 'admin@test.local', 'Admin', 'User', 'admin', 'active')
    ON CONFLICT (id) DO NOTHING;
    
    -- Create user_roles entry
    INSERT INTO public.user_roles (user_id, role)
    VALUES (admin_user_id, 'super_admin')
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE 'Admin user created/updated: %', admin_user_id;
  ELSE
    RAISE NOTICE 'Admin user already exists';
  END IF;
END $$;
