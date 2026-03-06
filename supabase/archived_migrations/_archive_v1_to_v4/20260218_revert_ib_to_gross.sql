-- =============================================================================
-- Revert IB Commission to from GROSS yield (ADDITIVE model)
--
-- The Excel spreadsheet (source of truth) shows:
--   fee = fee_pct of GROSS
--   IB  = ib_pct of GROSS  (NOT of NET)
--   total_deduction = fee + IB (both from gross)
--   investor_net = gross - fee - IB
--
-- This migration patches apply_segmented_yield_distribution_v5 and
-- preview_segmented_yield_distribution_v5 to use IB from GROSS.
--
-- Approach: Extract function source via pg_get_functiondef, replace the
-- IB-from-NET patterns with IB-from-GROSS, and re-execute.
-- =============================================================================

DO $$
DECLARE
  v_src text;
  v_oid oid;
BEGIN
  -- ================================================================
  -- PATCH 1: apply_segmented_yield_distribution_v5
  -- ================================================================
  SELECT oid INTO v_oid FROM pg_proc
  WHERE proname = 'apply_segmented_yield_distribution_v5'
    AND pronamespace = 'public'::regnamespace;

  IF v_oid IS NOT NULL THEN
    SELECT pg_get_functiondef(v_oid) INTO v_src;

    -- Main IB calculation: (v_gross - v_fee) * rate -> v_gross * rate
    v_src := replace(v_src,
      '((v_gross - v_fee) * v_ib_rate_seg / 100)',
      '(v_gross * v_ib_rate_seg / 100)');

    -- Dust adjustment IB: (v_residual - v_adj_fee) * rate -> v_residual * rate
    v_src := replace(v_src,
      '((v_residual - v_adj_fee) * COALESCE(v_largest_ib_rate, 0) / 100)',
      '(v_residual * COALESCE(v_largest_ib_rate, 0) / 100)');

    -- Update metadata strings
    v_src := replace(v_src, '''net_yield''', '''gross_yield''');
    v_src := replace(v_src, '''ib_from_net_yield''', '''ib_from_gross_yield''');

    EXECUTE v_src;
    RAISE NOTICE 'Patched apply_segmented_yield_distribution_v5: IB now from GROSS';
  ELSE
    RAISE NOTICE 'apply_segmented_yield_distribution_v5 not found, skipping';
  END IF;

  -- ================================================================
  -- PATCH 2: preview_segmented_yield_distribution_v5
  -- ================================================================
  SELECT oid INTO v_oid FROM pg_proc
  WHERE proname = 'preview_segmented_yield_distribution_v5'
    AND pronamespace = 'public'::regnamespace;

  IF v_oid IS NOT NULL THEN
    SELECT pg_get_functiondef(v_oid) INTO v_src;

    -- Main IB calculation: (v_inv_gross - v_inv_fee) * rate -> v_inv_gross * rate
    v_src := replace(v_src,
      '((v_inv_gross - v_inv_fee) * v_ib_pct / 100.0)',
      '(v_inv_gross * v_ib_pct / 100.0)');

    EXECUTE v_src;
    RAISE NOTICE 'Patched preview_segmented_yield_distribution_v5: IB now from GROSS';
  ELSE
    RAISE NOTICE 'preview_segmented_yield_distribution_v5 not found, skipping';
  END IF;
END $$;
