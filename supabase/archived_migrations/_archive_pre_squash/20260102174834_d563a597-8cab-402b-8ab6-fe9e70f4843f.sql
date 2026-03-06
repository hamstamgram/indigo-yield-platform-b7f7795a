-- ============================================================================
-- Migration: Integrate Yield Crystallization into Position Adjustments
-- ============================================================================
-- This migration modifies adjust_investor_position to call crystallize_yield_before_flow
-- before processing deposits/withdrawals, ensuring yield is captured before capital events.
-- ============================================================================

-- Drop and recreate adjust_investor_position with yield crystallization
DROP FUNCTION IF EXISTS public.adjust_investor_position(uuid, uuid, numeric, text, uuid, text, date, text);

CREATE OR REPLACE FUNCTION public.adjust_investor_position(
  p_investor_id uuid,
  p_fund_id uuid,
  p_delta numeric,
  p_note text DEFAULT NULL,
  p_admin_id uuid DEFAULT NULL,
  p_tx_type text DEFAULT 'ADJUSTMENT',
  p_tx_date date DEFAULT CURRENT_DATE,
  p_reference_id text DEFAULT NULL
)
RETURNS TABLE (
  out_investor_id uuid,
  out_fund_id uuid,
  out_previous_balance numeric,
  out_new_balance numeric,
  out_transaction_id uuid,
  out_reference_id text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_value numeric;
  v_new_balance numeric;
  v_tx_id uuid;
  v_fund_asset text;
  v_final_reference_id text;
  v_effective_type text;
  v_crystallization_result jsonb;
BEGIN
  -- Validate inputs
  IF p_investor_id IS NULL THEN
    RAISE EXCEPTION 'investor_id is required';
  END IF;
  
  IF p_fund_id IS NULL THEN
    RAISE EXCEPTION 'fund_id is required';
  END IF;
  
  IF p_delta IS NULL OR p_delta = 0 THEN
    RAISE EXCEPTION 'delta must be non-zero';
  END IF;

  -- Verify fund exists and get asset
  SELECT f.asset INTO v_fund_asset
  FROM public.funds f
  WHERE f.id = p_fund_id;
  
  IF v_fund_asset IS NULL THEN
    RAISE EXCEPTION 'Fund not found: %', p_fund_id;
  END IF;

  -- Verify investor exists
  IF NOT EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.id = p_investor_id) THEN
    RAISE EXCEPTION 'Investor not found: %', p_investor_id;
  END IF;

  -- Map transaction type
  v_effective_type := CASE 
    WHEN UPPER(p_tx_type) IN ('DEPOSIT', 'SUBSCRIPTION') THEN 'DEPOSIT'
    WHEN UPPER(p_tx_type) IN ('WITHDRAWAL', 'REDEMPTION') THEN 'WITHDRAWAL'
    WHEN UPPER(p_tx_type) = 'YIELD' THEN 'YIELD'
    WHEN UPPER(p_tx_type) = 'FEE' THEN 'FEE'
    ELSE 'ADJUSTMENT'
  END;

  -- =========================================================================
  -- YIELD CRYSTALLIZATION: Before deposit/withdrawal, crystallize any accrued yield
  -- This captures yield earned up to this point before the capital event changes ownership
  -- =========================================================================
  IF v_effective_type IN ('DEPOSIT', 'WITHDRAWAL') THEN
    BEGIN
      SELECT public.crystallize_yield_before_flow(
        p_fund_id,
        LOWER(v_effective_type),
        p_tx_date,
        p_admin_id
      ) INTO v_crystallization_result;
      
      -- Log crystallization result (non-blocking, just for audit)
      IF v_crystallization_result IS NOT NULL AND (v_crystallization_result->>'success')::boolean THEN
        RAISE NOTICE 'Yield crystallized before %: % investors processed, % yield distributed',
          v_effective_type,
          v_crystallization_result->>'investors_processed',
          v_crystallization_result->>'total_yield_distributed';
      ELSIF v_crystallization_result IS NOT NULL AND (v_crystallization_result->>'skipped')::boolean THEN
        RAISE NOTICE 'Yield crystallization skipped: %', v_crystallization_result->>'reason';
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- Log but don't fail the transaction if crystallization fails
      -- The position adjustment should still proceed
      RAISE WARNING 'Yield crystallization failed (non-fatal): %', SQLERRM;
    END;
  END IF;
  -- =========================================================================

  -- Get current position value (using correct column name: current_value)
  SELECT COALESCE(ip.current_value, 0)
  INTO v_current_value
  FROM public.investor_positions ip
  WHERE ip.investor_id = p_investor_id AND ip.fund_id = p_fund_id;
  
  -- Default to 0 if no position exists
  v_current_value := COALESCE(v_current_value, 0);
  
  -- Calculate new balance
  v_new_balance := v_current_value + p_delta;
  
  -- Prevent negative balance for withdrawals
  IF v_new_balance < 0 THEN
    RAISE EXCEPTION 'Insufficient balance. Current: %, Requested: %', v_current_value, ABS(p_delta);
  END IF;

  -- Generate unique reference_id if not provided
  v_final_reference_id := COALESCE(
    p_reference_id, 
    'adj_' || p_investor_id::text || '_' || p_fund_id::text || '_' || gen_random_uuid()::text
  );

  -- Create transaction record
  INSERT INTO public.transactions_v2 (
    investor_id,
    fund_id,
    type,
    amount,
    asset,
    tx_date,
    notes,
    reference_id,
    created_by,
    status
  ) VALUES (
    p_investor_id,
    p_fund_id,
    v_effective_type::tx_type,
    p_delta,
    v_fund_asset,
    p_tx_date,
    COALESCE(p_note, 'Position adjustment'),
    v_final_reference_id,
    p_admin_id,
    'CONFIRMED'
  )
  RETURNING id INTO v_tx_id;

  -- Upsert investor position (using correct column name: current_value)
  INSERT INTO public.investor_positions (
    investor_id,
    fund_id,
    current_value,
    cost_basis,
    created_at,
    updated_at
  ) VALUES (
    p_investor_id,
    p_fund_id,
    v_new_balance,
    CASE WHEN p_delta > 0 THEN p_delta ELSE 0 END,
    NOW(),
    NOW()
  )
  ON CONFLICT (investor_id, fund_id) DO UPDATE SET
    current_value = v_new_balance,
    cost_basis = CASE 
      WHEN p_delta > 0 THEN investor_positions.cost_basis + p_delta 
      ELSE investor_positions.cost_basis 
    END,
    updated_at = NOW();

  -- Return result
  RETURN QUERY SELECT
    p_investor_id,
    p_fund_id,
    v_current_value,
    v_new_balance,
    v_tx_id,
    v_final_reference_id;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.adjust_investor_position(uuid, uuid, numeric, text, uuid, text, date, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.adjust_investor_position(uuid, uuid, numeric, text, uuid, text, date, text) TO service_role;

-- Add comment
COMMENT ON FUNCTION public.adjust_investor_position(uuid, uuid, numeric, text, uuid, text, date, text) IS 
'Adjusts investor position balance and creates a transaction record.
Now includes automatic yield crystallization before deposits/withdrawals to capture
accrued yield before capital events change ownership percentages.';

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';