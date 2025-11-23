-- ================================================================
-- Migration: Auto-Create Profiles via Trigger
-- Date: 2025-11-22
-- Severity: MEDIUM
-- Description: Remove manual profile INSERT policy and replace
--              with automatic trigger on user creation
-- ================================================================

BEGIN;

-- Drop existing INSERT policy (if it exists)
DROP POLICY IF EXISTS "profiles_own_insert" ON public.profiles;

-- Create trigger function to auto-create profiles
CREATE OR REPLACE FUNCTION public.create_profile_on_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Auto-create profile for new user
    INSERT INTO public.profiles (
        id,
        email,
        first_name,
        last_name,
        is_admin,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
        COALESCE((NEW.raw_user_meta_data->>'is_admin')::BOOLEAN, FALSE),
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO NOTHING;

    RAISE NOTICE 'Profile created for user: %', NEW.email;
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Failed to create profile for %: %', NEW.email, SQLERRM;
        RETURN NEW;  -- Don't block user creation if profile fails
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.create_profile_on_signup();

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.create_profile_on_signup() TO postgres, service_role;

-- Verification message
DO $$
BEGIN
    RAISE NOTICE 'Profile creation trigger installed successfully';
    RAISE NOTICE 'Profiles will now be created automatically on user signup';
END $$;

COMMIT;
