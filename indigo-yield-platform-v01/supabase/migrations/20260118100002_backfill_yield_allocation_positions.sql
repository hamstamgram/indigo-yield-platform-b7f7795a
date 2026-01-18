-- =============================================================================
-- BACKFILL POSITION VALUES IN YIELD ALLOCATIONS
-- Migration: 20260118100002_backfill_yield_allocation_positions.sql
-- Purpose: Repair position_value_at_calc for historical yield allocations
-- =============================================================================

-- 1) Create function to calculate position value at a specific date
CREATE OR REPLACE FUNCTION public.calculate_position_at_date(
  p_investor_id UUID,
  p_fund_id UUID,
  p_as_of_date DATE
)
RETURNS NUMERIC(28,10)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_position_value NUMERIC(28,10);
  v_negative_types TEXT[] := ARRAY['WITHDRAWAL', 'FEE', 'INTERNAL_WITHDRAWAL', 'IB_DEBIT'];
BEGIN
  -- Calculate position from all non-voided transactions up to and including the date
  SELECT COALESCE(SUM(
    CASE
      WHEN type = ANY(v_negative_types) THEN -ABS(amount)
      ELSE amount
    END
  ), 0)
  INTO v_position_value
  FROM transactions_v2
  WHERE investor_id = p_investor_id
    AND fund_id = p_fund_id
    AND is_voided = false
    AND tx_date <= p_as_of_date;

  RETURN v_position_value;
END;
$$;

-- 2) Create function to backfill a single yield distribution's allocations
CREATE OR REPLACE FUNCTION public.backfill_yield_distribution_positions(
  p_distribution_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_distribution RECORD;
  v_allocation RECORD;
  v_position_value NUMERIC(28,10);
  v_total_positions NUMERIC(28,10) := 0;
  v_allocations_updated INTEGER := 0;
  v_expected_ownership NUMERIC(10,6);
BEGIN
  -- Set canonical RPC flag
  PERFORM set_config('app.canonical_rpc', 'true', true);

  -- Get distribution details
  SELECT id, fund_id, effective_date, opening_aum, gross_yield_amount
  INTO v_distribution
  FROM yield_distributions
  WHERE id = p_distribution_id;

  IF v_distribution IS NULL THEN
    RETURN jsonb_build_object('error', 'Distribution not found');
  END IF;

  -- First pass: calculate all position values and total
  FOR v_allocation IN (
    SELECT ya.id, ya.investor_id, ya.position_value_at_calc, ya.ownership_pct
    FROM yield_allocations ya
    WHERE ya.distribution_id = p_distribution_id
  ) LOOP
    -- Calculate position at the effective date (day before distribution)
    v_position_value := calculate_position_at_date(
      v_allocation.investor_id,
      v_distribution.fund_id,
      v_distribution.effective_date
    );

    -- Accumulate total
    v_total_positions := v_total_positions + v_position_value;

    -- Update position_value_at_calc if different
    IF v_allocation.position_value_at_calc IS DISTINCT FROM v_position_value
       OR v_allocation.position_value_at_calc = 0
       OR v_allocation.position_value_at_calc IS NULL THEN
      UPDATE yield_allocations
      SET position_value_at_calc = v_position_value,
          updated_at = now()
      WHERE id = v_allocation.id;

      v_allocations_updated := v_allocations_updated + 1;
    END IF;
  END LOOP;

  -- Second pass: recalculate ownership percentages based on new position values
  IF v_total_positions > 0 THEN
    FOR v_allocation IN (
      SELECT ya.id, ya.investor_id, ya.position_value_at_calc
      FROM yield_allocations ya
      WHERE ya.distribution_id = p_distribution_id
    ) LOOP
      -- Get the just-updated position value
      SELECT position_value_at_calc INTO v_position_value
      FROM yield_allocations
      WHERE id = v_allocation.id;

      -- Calculate ownership percentage
      v_expected_ownership := (v_position_value / v_total_positions) * 100;

      -- Update ownership_pct
      UPDATE yield_allocations
      SET ownership_pct = v_expected_ownership,
          updated_at = now()
      WHERE id = v_allocation.id;
    END LOOP;
  END IF;

  -- Also update the distribution's opening_aum if it was 0 or mismatched
  IF v_distribution.opening_aum IS DISTINCT FROM v_total_positions
     AND v_total_positions > 0 THEN
    UPDATE yield_distributions
    SET opening_aum = v_total_positions,
        updated_at = now()
    WHERE id = p_distribution_id;
  END IF;

  RETURN jsonb_build_object(
    'distribution_id', p_distribution_id,
    'effective_date', v_distribution.effective_date,
    'allocations_updated', v_allocations_updated,
    'total_positions_calculated', v_total_positions,
    'original_opening_aum', v_distribution.opening_aum
  );
END;
$$;

-- 3) Create batch backfill function for all distributions
CREATE OR REPLACE FUNCTION public.batch_backfill_yield_allocation_positions()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  r RECORD;
  v_result JSONB;
  v_total_distributions INTEGER := 0;
  v_total_allocations_updated INTEGER := 0;
  v_distribution_result JSONB;
BEGIN
  -- Set canonical RPC flag
  PERFORM set_config('app.canonical_rpc', 'true', true);

  -- Process all distributions that have allocations with position_value_at_calc = 0 or NULL
  FOR r IN (
    SELECT DISTINCT yd.id
    FROM yield_distributions yd
    JOIN yield_allocations ya ON ya.distribution_id = yd.id
    WHERE ya.position_value_at_calc IS NULL
       OR ya.position_value_at_calc = 0
       OR ya.ownership_pct = 0
    ORDER BY yd.effective_date DESC
  ) LOOP
    v_total_distributions := v_total_distributions + 1;

    SELECT backfill_yield_distribution_positions(r.id)
    INTO v_distribution_result;

    v_total_allocations_updated := v_total_allocations_updated +
      COALESCE((v_distribution_result->>'allocations_updated')::INTEGER, 0);
  END LOOP;

  v_result := jsonb_build_object(
    'total_distributions_processed', v_total_distributions,
    'total_allocations_updated', v_total_allocations_updated,
    'executed_at', now()
  );

  RETURN v_result;
END;
$$;

-- 4) Execute the batch backfill
DO $$
DECLARE
  v_result JSONB;
BEGIN
  -- Set canonical RPC flag
  PERFORM set_config('app.canonical_rpc', 'true', true);

  SELECT batch_backfill_yield_allocation_positions() INTO v_result;

  -- Log the backfill results
  INSERT INTO audit_log (
    action,
    entity_type,
    entity_id,
    details,
    created_at
  ) VALUES (
    'YIELD_ALLOCATION_POSITION_BACKFILL',
    'SYSTEM',
    '20260118100002',
    v_result || jsonb_build_object('migration', '20260118100002_backfill_yield_allocation_positions'),
    now()
  );

  RAISE NOTICE 'Yield allocation position backfill complete: %', v_result;
END;
$$;

-- 5) Grant permissions
GRANT EXECUTE ON FUNCTION public.calculate_position_at_date TO authenticated;
GRANT EXECUTE ON FUNCTION public.backfill_yield_distribution_positions TO authenticated;
GRANT EXECUTE ON FUNCTION public.batch_backfill_yield_allocation_positions TO authenticated;

-- 6) Log migration
INSERT INTO public.audit_log (
  action,
  entity_type,
  entity_id,
  details,
  created_at
) VALUES (
  'MIGRATION_APPLIED',
  'SYSTEM',
  '20260118100002',
  jsonb_build_object(
    'migration', '20260118100002_backfill_yield_allocation_positions',
    'description', 'Backfill position_value_at_calc and ownership_pct in yield allocations',
    'functions_created', ARRAY['calculate_position_at_date', 'backfill_yield_distribution_positions', 'batch_backfill_yield_allocation_positions']
  ),
  now()
);
