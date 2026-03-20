-- Update email and grant super_admin to Thomas
-- Old email: thomas.puech@indigo.fund
-- New email: thomas@indigo.fund

BEGIN;

-- 1. Get the user ID
DO $$
DECLARE
    target_user_id uuid;
BEGIN
    SELECT id INTO target_user_id FROM auth.users WHERE email = 'thomas.puech@indigo.fund';

    IF target_user_id IS NULL THEN
        RAISE EXCEPTION 'User thomas.puech@indigo.fund not found';
    END IF;

    -- 2. Update auth.users email
    UPDATE auth.users SET email = 'thomas@indigo.fund' WHERE id = target_user_id;

    -- 3. Update profiles email and admin status
    UPDATE public.profiles 
    SET 
        email = 'thomas@indigo.fund',
        is_admin = true,
        role = 'super_admin'
    WHERE id = target_user_id;

    -- 4. Assign super_admin role in user_roles
    INSERT INTO public.user_roles (user_id, role)
    VALUES (target_user_id, 'super_admin')
    ON CONFLICT (user_id, role) DO NOTHING;

    -- Remove lower roles if necessary (optional, but cleaner)
    DELETE FROM public.user_roles WHERE user_id = target_user_id AND role != 'super_admin';

END $$;

COMMIT;
