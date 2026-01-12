-- ============================================================================
-- pg_cron Integrity Check Scheduler
-- ============================================================================
-- Sets up automated daily integrity checks using pg_cron + pg_net
-- to trigger the scheduled-integrity-check edge function.
--
-- Prerequisites:
--   - pg_cron extension enabled
--   - pg_net extension enabled
--   - Edge function deployed: scheduled-integrity-check
-- ============================================================================

-- Enable required extensions (idempotent)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Grant cron usage to postgres role
GRANT USAGE ON SCHEMA cron TO postgres;

-- ============================================================================
-- Cron Job: Daily Integrity Check at 06:00 UTC
-- ============================================================================
-- Schedule: Every day at 06:00 UTC (after overnight batch processing)
-- This job triggers the edge function which:
--   1. Runs all integrity views
--   2. Records results in system_health_snapshots
--   3. Sends alerts if critical issues found
-- ============================================================================

-- Remove existing job if present (for idempotent migrations)
SELECT cron.unschedule('daily-integrity-check')
WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'daily-integrity-check'
);

-- Create the scheduled job
-- Note: Uses pg_net to make HTTP request to the edge function
SELECT cron.schedule(
    'daily-integrity-check',           -- job name
    '0 6 * * *',                       -- cron expression: 06:00 UTC daily
    $$
    SELECT net.http_post(
        url := current_setting('app.edge_function_url') || '/scheduled-integrity-check',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.service_role_key')
        ),
        body := jsonb_build_object(
            'trigger', 'pg_cron',
            'scheduled_at', now()::text
        )
    );
    $$
);

-- ============================================================================
-- Cron Job: Hourly Health Snapshot (lightweight)
-- ============================================================================
-- Schedule: Every hour at minute 15
-- This is a lighter-weight check that just records basic metrics
-- ============================================================================

SELECT cron.unschedule('hourly-health-snapshot')
WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'hourly-health-snapshot'
);

-- Create lightweight hourly snapshot job
SELECT cron.schedule(
    'hourly-health-snapshot',
    '15 * * * *',                      -- Every hour at :15
    $$
    SELECT net.http_post(
        url := current_setting('app.edge_function_url') || '/scheduled-integrity-check',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.service_role_key')
        ),
        body := jsonb_build_object(
            'trigger', 'pg_cron_hourly',
            'mode', 'quick',
            'scheduled_at', now()::text
        )
    );
    $$
);

-- ============================================================================
-- Database Settings for Edge Function URL
-- ============================================================================
-- IMPORTANT: These settings must be configured by a superuser or via the
-- Supabase dashboard for each environment:
--
-- Development:
--   ALTER DATABASE postgres SET app.edge_function_url = 'http://127.0.0.1:54321/functions/v1';
--   ALTER DATABASE postgres SET app.service_role_key = '<local-service-role-key>';
--
-- Production:
--   ALTER DATABASE postgres SET app.edge_function_url = 'https://<project-ref>.supabase.co/functions/v1';
--   ALTER DATABASE postgres SET app.service_role_key = '<production-service-role-key>';
--
-- Note: The cron jobs will fail silently if these settings are not configured.
-- Check cron.job_run_details for execution status.
-- ============================================================================

-- ============================================================================
-- Verification Query
-- ============================================================================
-- Run this to verify cron jobs are scheduled:
--   SELECT * FROM cron.job;
-- ============================================================================

COMMENT ON EXTENSION pg_cron IS 'Job scheduler for PostgreSQL - used for automated integrity checks';
