-- Fix preview_segmented_yield_distribution_v5 volatility.
-- The previous migration (20260308000001) incorrectly set STABLE,
-- but the function uses DROP TABLE / CREATE TEMP TABLE which require VOLATILE.
-- This re-creates the function with VOLATILE to allow temp table operations.

DO $$
DECLARE
  v_src text;
BEGIN
  SELECT prosrc INTO v_src
  FROM pg_catalog.pg_proc
  WHERE proname = 'preview_segmented_yield_distribution_v5'
  ORDER BY oid DESC LIMIT 1;

  IF v_src IS NOT NULL THEN
    EXECUTE format(
      'CREATE OR REPLACE FUNCTION public.preview_segmented_yield_distribution_v5(p_fund_id uuid, p_period_end date, p_recorded_aum numeric, p_purpose aum_purpose DEFAULT ''reporting''::aum_purpose) RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path TO ''public'' AS $fn$%s$fn$',
      v_src
    );
    RAISE NOTICE 'Fixed preview_segmented_yield_distribution_v5: STABLE -> VOLATILE';
  END IF;
END;
$$;
