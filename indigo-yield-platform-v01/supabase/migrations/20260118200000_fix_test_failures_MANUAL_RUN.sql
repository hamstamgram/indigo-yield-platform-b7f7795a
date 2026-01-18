-- =============================================================================
-- FIX TEST FAILURES - MANUAL EXECUTION REQUIRED
-- =============================================================================
-- This migration must be run manually via the Supabase SQL Editor:
-- 1. Go to https://supabase.com/dashboard/project/nkfimvovosdehmyyjubn/sql/new
-- 2. Paste this entire file
-- 3. Click "Run"
--
-- This migration fixes:
-- 1. Balance chain verification (balance_before/balance_after columns)
-- 2. Yield allocation position values (position_value_at_calc)
-- =============================================================================

-- Enable canonical RPC for this session
SELECT set_canonical_rpc(true);

-- =============================================================================
-- FIX 1: BACKFILL BALANCE CHAIN
-- =============================================================================

-- Create the backfill function
CREATE OR REPLACE FUNCTION public.backfill_balance_chain_fix(
  p_investor_id UUID,
  p_fund_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  r RECORD;
  v_running_balance NUMERIC(28,10) := 0;
  v_expected_after NUMERIC(28,10);
  v_transactions_updated INTEGER := 0;
  v_negative_types TEXT[] := ARRAY['WITHDRAWAL', 'FEE', 'INTERNAL_WITHDRAWAL', 'IB_DEBIT'];
BEGIN
  -- Set canonical RPC flag
  PERFORM set_config('app.canonical_rpc', 'true', true);

  -- Process all non-voided transactions in chronological order
  FOR r IN (
    SELECT id, type, amount, balance_before, balance_after, tx_date, created_at
    FROM transactions_v2
    WHERE investor_id = p_investor_id
      AND fund_id = p_fund_id
      AND is_voided = false
    ORDER BY tx_date ASC, created_at ASC
  ) LOOP
    -- Calculate expected balance_after based on transaction type
    IF r.type = ANY(v_negative_types) THEN
      v_expected_after := v_running_balance - ABS(r.amount);
    ELSE
      v_expected_after := v_running_balance + r.amount;
    END IF;

    -- Update if balance_before or balance_after is wrong
    IF r.balance_before IS DISTINCT FROM v_running_balance
       OR r.balance_after IS DISTINCT FROM v_expected_after THEN
      UPDATE transactions_v2
      SET
        balance_before = v_running_balance,
        balance_after = v_expected_after
      WHERE id = r.id;

      v_transactions_updated := v_transactions_updated + 1;
    END IF;

    -- Update running balance for next iteration
    v_running_balance := v_expected_after;
  END LOOP;

  RETURN jsonb_build_object(
    'investor_id', p_investor_id,
    'fund_id', p_fund_id,
    'transactions_updated', v_transactions_updated,
    'final_balance', v_running_balance
  );
END;
$$;

-- Create batch backfill function
CREATE OR REPLACE FUNCTION public.batch_backfill_balance_chain_fix()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  r RECORD;
  v_result JSONB;
  v_total_combinations INTEGER := 0;
  v_total_transactions_updated INTEGER := 0;
  v_combination_result JSONB;
BEGIN
  -- Set canonical RPC flag
  PERFORM set_config('app.canonical_rpc', 'true', true);

  -- Process all unique investor-fund combinations with transactions
  FOR r IN (
    SELECT DISTINCT investor_id, fund_id
    FROM transactions_v2
    WHERE is_voided = false
    ORDER BY investor_id, fund_id
  ) LOOP
    v_total_combinations := v_total_combinations + 1;

    SELECT backfill_balance_chain_fix(r.investor_id, r.fund_id)
    INTO v_combination_result;

    v_total_transactions_updated := v_total_transactions_updated +
      COALESCE((v_combination_result->>'transactions_updated')::INTEGER, 0);
  END LOOP;

  v_result := jsonb_build_object(
    'total_investor_fund_combinations', v_total_combinations,
    'total_transactions_updated', v_total_transactions_updated,
    'executed_at', now()
  );

  RETURN v_result;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.backfill_balance_chain_fix TO authenticated;
GRANT EXECUTE ON FUNCTION public.batch_backfill_balance_chain_fix TO authenticated;

-- Execute balance chain backfill
DO $$
DECLARE
  v_result JSONB;
BEGIN
  PERFORM set_config('app.canonical_rpc', 'true', true);
  SELECT batch_backfill_balance_chain_fix() INTO v_result;
  RAISE NOTICE 'Balance Chain Backfill Result: %', v_result;
END;
$$;

-- =============================================================================
-- FIX 2: BACKFILL YIELD ALLOCATION POSITIONS
-- =============================================================================

-- Create position calculation function
CREATE OR REPLACE FUNCTION public.calculate_position_at_date_fix(
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

-- Create yield allocation backfill function
CREATE OR REPLACE FUNCTION public.backfill_yield_allocation_positions_fix()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_dist RECORD;
  v_alloc RECORD;
  v_position_value NUMERIC(28,10);
  v_total_positions NUMERIC(28,10);
  v_expected_ownership NUMERIC(10,6);
  v_total_distributions INTEGER := 0;
  v_total_allocations_updated INTEGER := 0;
  v_negative_types TEXT[] := ARRAY['WITHDRAWAL', 'FEE', 'INTERNAL_WITHDRAWAL', 'IB_DEBIT'];
BEGIN
  -- Set canonical RPC flag
  PERFORM set_config('app.canonical_rpc', 'true', true);

  -- Process all distributions with allocations that have position_value_at_calc = 0 or NULL
  FOR v_dist IN (
    SELECT DISTINCT yd.id, yd.fund_id, yd.effective_date, yd.opening_aum
    FROM yield_distributions yd
    JOIN yield_allocations ya ON ya.distribution_id = yd.id
    WHERE ya.position_value_at_calc IS NULL
       OR ya.position_value_at_calc = 0
       OR ya.ownership_pct = 0
    ORDER BY yd.effective_date DESC
  ) LOOP
    v_total_distributions := v_total_distributions + 1;
    v_total_positions := 0;

    -- First pass: calculate all position values
    FOR v_alloc IN (
      SELECT ya.id, ya.investor_id
      FROM yield_allocations ya
      WHERE ya.distribution_id = v_dist.id
    ) LOOP
      -- Calculate position at the effective date
      v_position_value := calculate_position_at_date_fix(
        v_alloc.investor_id,
        v_dist.fund_id,
        v_dist.effective_date
      );

      -- Update position_value_at_calc
      UPDATE yield_allocations
      SET position_value_at_calc = v_position_value
      WHERE id = v_alloc.id;

      v_total_positions := v_total_positions + v_position_value;
      v_total_allocations_updated := v_total_allocations_updated + 1;
    END LOOP;

    -- Second pass: recalculate ownership percentages
    IF v_total_positions > 0 THEN
      FOR v_alloc IN (
        SELECT ya.id, ya.position_value_at_calc
        FROM yield_allocations ya
        WHERE ya.distribution_id = v_dist.id
      ) LOOP
        v_expected_ownership := (v_alloc.position_value_at_calc / v_total_positions) * 100;

        UPDATE yield_allocations
        SET ownership_pct = v_expected_ownership
        WHERE id = v_alloc.id;
      END LOOP;

      -- Update distribution's opening_aum if needed
      IF v_dist.opening_aum IS DISTINCT FROM v_total_positions THEN
        UPDATE yield_distributions
        SET opening_aum = v_total_positions
        WHERE id = v_dist.id;
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'total_distributions_processed', v_total_distributions,
    'total_allocations_updated', v_total_allocations_updated,
    'executed_at', now()
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.calculate_position_at_date_fix TO authenticated;
GRANT EXECUTE ON FUNCTION public.backfill_yield_allocation_positions_fix TO authenticated;

-- Execute yield allocation backfill
DO $$
DECLARE
  v_result JSONB;
BEGIN
  PERFORM set_config('app.canonical_rpc', 'true', true);
  SELECT backfill_yield_allocation_positions_fix() INTO v_result;
  RAISE NOTICE 'Yield Allocation Backfill Result: %', v_result;
END;
$$;

-- =============================================================================
-- VERIFY RESULTS
-- =============================================================================

-- Check balance chain status
DO $$
DECLARE
  v_broken_chains INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_broken_chains
  FROM (
    SELECT
      t1.id,
      t1.investor_id,
      t1.fund_id,
      t1.balance_after as current_after,
      t2.balance_before as next_before
    FROM transactions_v2 t1
    JOIN transactions_v2 t2 ON t2.investor_id = t1.investor_id
      AND t2.fund_id = t1.fund_id
      AND t2.is_voided = false
      AND (t2.tx_date > t1.tx_date OR (t2.tx_date = t1.tx_date AND t2.created_at > t1.created_at))
    WHERE t1.is_voided = false
      AND ABS(t1.balance_after - t2.balance_before) > 0.01
    GROUP BY t1.id, t1.investor_id, t1.fund_id, t1.balance_after, t2.balance_before
  ) broken;

  RAISE NOTICE 'Broken balance chains remaining: %', v_broken_chains;
END;
$$;

-- Check yield allocations with zero position
DO $$
DECLARE
  v_zero_allocations INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_zero_allocations
  FROM yield_allocations
  WHERE position_value_at_calc IS NULL OR position_value_at_calc = 0;

  RAISE NOTICE 'Yield allocations with zero position remaining: %', v_zero_allocations;
END;
$$;

-- Log migration completion
INSERT INTO audit_log (
  action,
  entity_type,
  entity_id,
  details,
  created_at
) VALUES (
  'MIGRATION_APPLIED',
  'SYSTEM',
  '20260118200000',
  jsonb_build_object(
    'migration', '20260118200000_fix_test_failures_MANUAL_RUN',
    'description', 'Fixed balance chain and yield allocation positions',
    'applied_at', now()
  ),
  now()
);

SELECT 'Migration complete! Check the NOTICE messages above for results.' AS status;
