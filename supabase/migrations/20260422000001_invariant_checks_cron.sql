-- ============================================================
-- Wire run_invariant_checks into pg_cron for continuous monitoring
-- Date: 2026-04-22
--
-- Problem: run_invariant_checks() is a manual, one-time operation.
-- The go-live plan calls for running it once before launch, but
-- data drift can appear at any time after. Continuous monitoring
-- catches regressions early instead of discovering them at the
-- next manual check.
--
-- This migration:
--   1. Creates invariant_check_results table to store historical runs.
--   2. Creates a wrapper function that runs invariant checks,
--      persists results, and fires integrity_alerts on failures.
--   3. Enables pg_cron and schedules every-6-hour execution.
--   4. Adds a 90-day retention policy via pg_cron to prevent
--      unbounded table growth.
-- ============================================================

-- Step 1: Results table
CREATE TABLE IF NOT EXISTS public.invariant_check_results (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at        timestamptz NOT NULL DEFAULT now(),
  total_checks  int NOT NULL,
  passed        int NOT NULL,
  failed        int NOT NULL,
  all_passed    boolean NOT NULL,
  result_json   jsonb NOT NULL,
  run_source    text NOT NULL DEFAULT 'cron'
);

-- Partition by month for cheap retention (drop old partitions instead of DELETE)
-- Using simple index approach since Supabase doesn't support declarative partitioning easily
CREATE INDEX IF NOT EXISTS idx_invariant_check_results_run_at
  ON public.invariant_check_results (run_at DESC);

ALTER TABLE public.invariant_check_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read invariant check results"
  ON public.invariant_check_results FOR SELECT
  TO authenticated
  USING (public.is_admin());
CREATE POLICY "Service role can manage invariant check results"
  ON public.invariant_check_results FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- Step 2: Wrapper that persists + alerts on failure
CREATE OR REPLACE FUNCTION public.run_invariant_checks_monitored(
  p_source text DEFAULT 'cron'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result jsonb;
  v_total  int;
  v_passed int;
  v_failed int;
  v_all_ok boolean;
BEGIN
  v_result := public.run_invariant_checks();

  v_total  := COALESCE((v_result->'summary'->>'total')::int, 0);
  v_passed := COALESCE((v_result->'summary'->>'passed')::int, 0);
  v_failed := COALESCE((v_result->'summary'->>'failed')::int, 0);
  v_all_ok := COALESCE((v_result->'summary'->>'all_passed')::boolean, false);

  INSERT INTO public.invariant_check_results
    (total_checks, passed, failed, all_passed, result_json, run_source)
  VALUES (v_total, v_passed, v_failed, v_all_ok, v_result, p_source);

  IF NOT v_all_ok THEN
    PERFORM public.create_integrity_alert(
      'invariant_check_failure',
      CASE WHEN v_failed > 3 THEN 'critical' ELSE 'warning' END,
      'Invariant check failure: ' || v_failed || ' of ' || v_total || ' checks failed',
      'Automated invariant monitoring detected ' || v_failed || ' failing check(s). Run run_invariant_checks() for details.',
      v_result
    );
  END IF;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.run_invariant_checks_monitored(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.run_invariant_checks_monitored(text) TO authenticated, service_role;

COMMENT ON FUNCTION public.run_invariant_checks_monitored(text) IS
  'Runs run_invariant_checks(), persists results to invariant_check_results, and fires integrity_alert on failure. p_source identifies the trigger (cron/manual).';

-- Step 3: Enable pg_cron and schedule
-- pg_cron is a Supabase-supported extension; must be created in the extensions schema
CREATE EXTENSION IF NOT EXISTS pg_cron SCHEMA extensions;

-- Schedule: every 6 hours at :03 past the hour (avoid :00 stampede)
SELECT cron.schedule(
  'invariant-checks-every-6h',
  '3 */6 * * *',
  $$SELECT public.run_invariant_checks_monitored('cron')$$
);

-- Step 4: 90-day retention policy (runs daily at 03:17)
SELECT cron.schedule(
  'invariant-checks-retention',
  '17 3 * * *',
  $$DELETE FROM public.invariant_check_results WHERE run_at < now() - interval '90 days'$$
);

-- Step 5: Backfill one initial run so the table isn't empty
-- This runs inline during migration, not via cron
-- Uses 'migration' as source to distinguish from scheduled runs
DO $$
DECLARE
  v_result jsonb;
BEGIN
  -- run_invariant_checks requires admin; in migration context we are superuser
  v_result := public.run_invariant_checks_monitored('migration');
  RAISE NOTICE 'Initial invariant check: %', v_result->'summary';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Initial invariant check skipped (will run on first cron tick): %', SQLERRM;
END $$;