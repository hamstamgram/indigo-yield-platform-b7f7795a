-- Rollback: Remove user_preferences table and referral features

-- Drop user_preferences table (CASCADE removes all policies and triggers)
DROP TABLE IF EXISTS public.user_preferences CASCADE;

-- Remove referral_code column from profiles
ALTER TABLE public.profiles DROP COLUMN IF EXISTS referral_code;

-- Drop referral_code index if it exists
DROP INDEX IF EXISTS public.idx_profiles_referral_code;;
