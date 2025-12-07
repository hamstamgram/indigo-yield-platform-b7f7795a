-- Add preferences column to profiles table for user settings
-- This stores user preferences like theme, language, dashboard settings

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.preferences IS 'User preferences including theme, language, dashboard settings, and notification preferences';

-- Create index for JSONB queries if needed
CREATE INDEX IF NOT EXISTS idx_profiles_preferences ON public.profiles USING gin (preferences);
