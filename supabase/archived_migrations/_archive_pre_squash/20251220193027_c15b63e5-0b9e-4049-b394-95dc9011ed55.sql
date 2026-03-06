-- Add rate limiting columns to user_totp_settings if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_totp_settings' 
    AND column_name = 'failed_attempts'
  ) THEN
    ALTER TABLE public.user_totp_settings ADD COLUMN failed_attempts INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_totp_settings' 
    AND column_name = 'locked_until'
  ) THEN
    ALTER TABLE public.user_totp_settings ADD COLUMN locked_until TIMESTAMPTZ DEFAULT NULL;
  END IF;
END $$;

-- Add comment explaining the rate limiting columns
COMMENT ON COLUMN public.user_totp_settings.failed_attempts IS 'Counter for failed TOTP verification attempts for rate limiting';
COMMENT ON COLUMN public.user_totp_settings.locked_until IS 'Timestamp until which the account is locked due to too many failed attempts';