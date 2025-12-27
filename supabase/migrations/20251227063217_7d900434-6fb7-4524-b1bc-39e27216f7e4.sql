-- Enable required extensions for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Grant usage to postgres role
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Create table to store integrity check logs for the dashboard widget
CREATE TABLE IF NOT EXISTS public.integrity_check_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  total_checks INTEGER NOT NULL,
  passed INTEGER NOT NULL,
  failed INTEGER NOT NULL,
  critical_failures INTEGER NOT NULL,
  results JSONB NOT NULL,
  triggered_by TEXT DEFAULT 'scheduled'
);

-- Enable RLS
ALTER TABLE public.integrity_check_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view integrity logs
CREATE POLICY "Admins can view integrity logs" ON public.integrity_check_log
  FOR SELECT USING (public.is_admin());

-- Only service role can insert (from edge function)
CREATE POLICY "Service role can insert integrity logs" ON public.integrity_check_log
  FOR INSERT WITH CHECK (true);

-- Add index for efficient queries
CREATE INDEX idx_integrity_check_log_checked_at ON public.integrity_check_log(checked_at DESC);