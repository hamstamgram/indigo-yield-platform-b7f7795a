-- Fix conservation check in both preview and apply segmented yield RPCs.
-- The check was missing the dust/residual amount, causing false mismatches.
-- Correct identity: gross = net + fees + ib + dust
--
-- The conservation_check is informational (in the return jsonb), not a guard.
-- The actual financial math is correct - dust goes to fees_account.
-- This fix ensures the check reports TRUE when gross = net + fees + ib + dust.

DO $$
DECLARE
  v_src text;
  v_fixed text;
BEGIN
  -- Fix preview function
  SELECT prosrc INTO v_src
  FROM pg_catalog.pg_proc
  WHERE proname = 'preview_segmented_yield_distribution_v5'
  ORDER BY oid DESC LIMIT 1;

  IF v_src IS NOT NULL THEN
    v_fixed := replace(
      v_src,
      $$'conservation_check', (v_total_gross = v_total_net + v_total_fees + v_total_ib)$$,
      $$'conservation_check', (v_total_gross = v_total_net + v_total_fees + v_total_ib + COALESCE(v_residual, 0))$$
    );
    IF v_fixed != v_src THEN
      EXECUTE format(
        'CREATE OR REPLACE FUNCTION public.preview_segmented_yield_distribution_v5(p_fund_id uuid, p_period_end date, p_recorded_aum numeric, p_purpose aum_purpose DEFAULT ''reporting''::aum_purpose) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO ''public'' AS $fn$%s$fn$',
        v_fixed
      );
      RAISE NOTICE 'Fixed conservation_check in preview_segmented_yield_distribution_v5';
    END IF;
  END IF;

  -- Fix apply function
  SELECT prosrc INTO v_src
  FROM pg_catalog.pg_proc
  WHERE proname = 'apply_segmented_yield_distribution_v5'
  ORDER BY oid DESC LIMIT 1;

  IF v_src IS NOT NULL THEN
    v_fixed := replace(
      v_src,
      $$'conservation_check', (v_total_gross = v_total_net + v_total_fees + v_total_ib)$$,
      $$'conservation_check', (v_total_gross = v_total_net + v_total_fees + v_total_ib + COALESCE(v_residual, 0))$$
    );
    IF v_fixed != v_src THEN
      EXECUTE format(
        'CREATE OR REPLACE FUNCTION public.apply_segmented_yield_distribution_v5(p_fund_id uuid, p_period_end date, p_recorded_aum numeric, p_admin_id uuid DEFAULT NULL, p_purpose aum_purpose DEFAULT ''reporting''::aum_purpose, p_yield_date date DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''public'' AS $fn$%s$fn$',
        v_fixed
      );
      RAISE NOTICE 'Fixed conservation_check in apply_segmented_yield_distribution_v5';
    END IF;
  END IF;
END;
$$;
