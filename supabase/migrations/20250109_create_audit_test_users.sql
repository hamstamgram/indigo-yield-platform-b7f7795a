-- Create test users for design audit
-- These are temporary users that should be deleted after audit completion

-- Create test investor user
DO $$
DECLARE
    investor_user_id uuid;
    admin_user_id uuid;
BEGIN
    -- Generate UUIDs for the users
    investor_user_id := gen_random_uuid();
    admin_user_id := gen_random_uuid();
    
    -- Insert test investor (if not exists)
    INSERT INTO auth.users (
        id,
        email,
        email_confirmed_at,
        encrypted_password,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        instance_id,
        aud,
        role
    )
    VALUES (
        investor_user_id,
        'test.investor@audit.indigo.com',
        NOW(),
        crypt('AuditTest123!', gen_salt('bf')),
        '{"provider": "email", "providers": ["email"]}',
        '{"first_name": "Test", "last_name": "Investor", "role": "investor"}',
        NOW(),
        NOW(),
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated'
    )
    ON CONFLICT (email) DO NOTHING;
    
    -- Insert test admin (if not exists)
    INSERT INTO auth.users (
        id,
        email,
        email_confirmed_at,
        encrypted_password,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        instance_id,
        aud,
        role
    )
    VALUES (
        admin_user_id,
        'test.admin@audit.indigo.com',
        NOW(),
        crypt('AuditAdmin123!', gen_salt('bf')),
        '{"provider": "email", "providers": ["email"]}',
        '{"first_name": "Test", "last_name": "Admin", "role": "admin"}',
        NOW(),
        NOW(),
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated'
    )
    ON CONFLICT (email) DO NOTHING;
    
    -- Create profiles for test users
    INSERT INTO public.profiles (id, email, first_name, last_name, role, created_at, updated_at)
    SELECT 
        u.id,
        u.email,
        (u.raw_user_meta_data->>'first_name')::text,
        (u.raw_user_meta_data->>'last_name')::text,
        (u.raw_user_meta_data->>'role')::text,
        NOW(),
        NOW()
    FROM auth.users u
    WHERE u.email IN ('test.investor@audit.indigo.com', 'test.admin@audit.indigo.com')
    ON CONFLICT (id) DO UPDATE SET
        role = EXCLUDED.role,
        updated_at = NOW();
    
    -- Create portfolios for test investor
    INSERT INTO public.portfolios (investor_id, total_invested, current_value, total_returns, created_at, updated_at)
    SELECT 
        u.id,
        10000.00,  -- $10,000 initial investment
        10500.00,  -- 5% return
        500.00,
        NOW(),
        NOW()
    FROM auth.users u
    WHERE u.email = 'test.investor@audit.indigo.com'
    ON CONFLICT (investor_id) DO NOTHING;
    
    -- Grant admin privileges
    UPDATE public.profiles 
    SET role = 'admin' 
    WHERE email = 'test.admin@audit.indigo.com';
    
    RAISE NOTICE 'Test users created successfully';
    RAISE NOTICE 'Investor: test.investor@audit.indigo.com / AuditTest123!';
    RAISE NOTICE 'Admin: test.admin@audit.indigo.com / AuditAdmin123!';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error creating test users: %', SQLERRM;
END $$;
