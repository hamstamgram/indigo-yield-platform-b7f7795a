-- Grant Admin Access to h.lodumonoja@gmail.com
-- This script updates the profiles table to set is_admin = true

DO $$
DECLARE
  target_email TEXT := 'h.lodumonoja@gmail.com';
  target_user_id UUID;
BEGIN
  -- Find user ID from auth.users (if possible) or profiles
  -- Note: accessing auth.users requires special permissions usually available to postgres/service_role
  
  -- First try to find in profiles directly if email is stored there (it should be)
  SELECT id INTO target_user_id
  FROM public.profiles
  WHERE email = target_email;

  -- If not found in profiles, check auth.users (this part depends on permissions)
  IF target_user_id IS NULL THEN
    SELECT id INTO target_user_id
    FROM auth.users
    WHERE email = target_email;
  END IF;

  IF target_user_id IS NOT NULL THEN
    -- Update profile
    UPDATE public.profiles
    SET is_admin = true
    WHERE id = target_user_id;
    
    RAISE NOTICE 'Successfully granted admin privileges to % (ID: %)', target_email, target_user_id;
  ELSE
    RAISE WARNING 'User % not found in profiles or auth.users', target_email;
  END IF;
END $$;
