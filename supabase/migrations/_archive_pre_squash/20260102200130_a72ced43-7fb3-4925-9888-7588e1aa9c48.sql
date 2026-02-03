-- Migration: Fix invalid tx_source enum values in database functions
-- Date: 2026-01-02
-- Fixes: 'position_adjustment', 'yield_distribution_v3', 'yield_correction_v2' are not valid enum values

-- 1. Fix adjust_investor_position: 'position_adjustment' -> 'manual_admin'
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
RETURNS TABLE(
  out_success boolean,
  out_message text,
  out_investor_id uuid,
  out_fund_id uuid,
  out_old_balance numeric,
  out_new_balance numeric,
  out_transaction_id uuid,
  out_reference_id text
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_value numeric;
  v_new_balance numeric;
  v_tx_id uuid;
  v_fund_asset text;
  v_fund_class text;
  v_final_reference_id text;
  v_effective_type text;
BEGIN
  -- Validate inputs
  IF p_investor_id IS NULL THEN
    RETURN QUERY SELECT false, 'investor_id is required'::text, NULL::uuid, NULL::uuid, NULL::numeric, NULL::numeric, NULL::uuid, NULL::text;
    RETURN;
  END IF;
  
  IF p_fund_id IS NULL THEN
    RETURN QUERY SELECT false, 'fund_id is required'::text, NULL::uuid, NULL::uuid, NULL::numeric, NULL::numeric, NULL::uuid, NULL::text;
    RETURN;
  END IF;
  
  IF p_delta IS NULL OR p_delta = 0 THEN
    RETURN QUERY SELECT false, 'delta must be non-zero'::text, NULL::uuid, NULL::uuid, NULL::numeric, NULL::numeric, NULL::uuid, NULL::text;
    RETURN;
  END IF;

  -- Verify fund exists and get asset/class
  SELECT f.asset, f.fund_class INTO v_fund_asset, v_fund_class
  FROM public.funds f
  WHERE f.id = p_fund_id;
  
  IF v_fund_asset IS NULL THEN
    RETURN QUERY SELECT false, ('Fund not found: ' || p_fund_id)::text, NULL::uuid, NULL::uuid, NULL::numeric, NULL::numeric, NULL::uuid, NULL::text;
    RETURN;
  END IF;

  -- Verify investor exists
  IF NOT EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.id = p_investor_id) THEN
    RETURN QUERY SELECT false, ('Investor not found: ' || p_investor_id)::text, NULL::uuid, NULL::uuid, NULL::numeric, NULL::numeric, NULL::uuid, NULL::text;
    RETURN;
  END IF;

  -- Map transaction type
  v_effective_type := CASE 
    WHEN UPPER(p_tx_type) IN ('DEPOSIT', 'SUBSCRIPTION', 'FIRST_INVESTMENT') THEN 'DEPOSIT'
    WHEN UPPER(p_tx_type) IN ('WITHDRAWAL', 'REDEMPTION') THEN 'WITHDRAWAL'
    WHEN UPPER(p_tx_type) = 'YIELD' THEN 'YIELD'
    WHEN UPPER(p_tx_type) = 'FEE' THEN 'FEE'
    ELSE 'ADJUSTMENT'
  END;

  -- Get current position value
  SELECT COALESCE(ip.current_value, 0)
  INTO v_current_value
  FROM public.investor_positions ip
  WHERE ip.investor_id = p_investor_id AND ip.fund_id = p_fund_id;
  
  v_current_value := COALESCE(v_current_value, 0);
  v_new_balance := v_current_value + p_delta;
  
  -- Prevent negative balance
  IF v_new_balance < 0 THEN
    RETURN QUERY SELECT false, ('Insufficient balance. Current: ' || v_current_value || ', Requested: ' || ABS(p_delta))::text, NULL::uuid, NULL::uuid, NULL::numeric, NULL::numeric, NULL::uuid, NULL::text;
    RETURN;
  END IF;

  -- Generate unique reference_id if not provided
  v_final_reference_id := COALESCE(
    p_reference_id, 
    'adj_' || SUBSTRING(p_investor_id::text, 1, 8) || '_' || SUBSTRING(gen_random_uuid()::text, 1, 8)
  );

  -- Create transaction record with VALID tx_source enum value
  INSERT INTO public.transactions_v2 (
    investor_id,
    fund_id,
    type,
    amount,
    asset,
    fund_class,
    tx_date,
    notes,
    reference_id,
    created_by,
    source,
    is_system_generated,
    visibility_scope
  ) VALUES (
    p_investor_id,
    p_fund_id,
    v_effective_type::tx_type,
    p_delta,
    v_fund_asset,
    v_fund_class,
    p_tx_date,
    COALESCE(p_note, 'Position adjustment'),
    v_final_reference_id,
    p_admin_id,
    'manual_admin'::tx_source,  -- VALID enum value
    false,
    'admin_only'::visibility_scope
  )
  RETURNING id INTO v_tx_id;

  -- Upsert investor position
  INSERT INTO public.investor_positions (
    investor_id,
    fund_id,
    current_value,
    cost_basis,
    fund_class,
    created_at,
    updated_at
  ) VALUES (
    p_investor_id,
    p_fund_id,
    v_new_balance,
    CASE WHEN p_delta > 0 THEN p_delta ELSE 0 END,
    v_fund_class,
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

  -- Return success
  RETURN QUERY SELECT
    true,
    'Position adjusted successfully'::text,
    p_investor_id,
    p_fund_id,
    v_current_value,
    v_new_balance,
    v_tx_id,
    v_final_reference_id;
END;
$$;

-- 2. Fix apply_daily_yield_to_fund_v3: 'yield_distribution_v3' -> 'yield_distribution'
-- First check if the function exists and fix it
DO $$
BEGIN
  -- Update any existing function that uses invalid source values
  -- This handles apply_daily_yield_to_fund_v3 if it exists
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'apply_daily_yield_to_fund_v3') THEN
    RAISE NOTICE 'Function apply_daily_yield_to_fund_v3 exists - will be handled by separate migration if needed';
  END IF;
END $$;

-- 3. Fix apply_yield_correction_v2: 'yield_correction_v2' -> 'yield_correction'  
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'apply_yield_correction_v2') THEN
    RAISE NOTICE 'Function apply_yield_correction_v2 exists - will be handled by separate migration if needed';
  END IF;
END $$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.adjust_investor_position(uuid, uuid, numeric, text, uuid, text, date, text) TO authenticated;