-- ============================================================================
-- CONSOLIDATION MIGRATION: Restore adjust_investor_position with correct signature
-- ============================================================================
-- This migration fixes the RPC mismatch by:
-- 1. Dropping the broken 6-param function that overwrote the correct one
-- 2. Recreating the 8-param function that matches frontend calls
-- 3. Using out_ prefixed RETURNS TABLE columns to avoid PL/pgSQL scope collisions
-- 4. Using correct transactions_v2 column names (asset, type, tx_date, notes)
-- ============================================================================

-- Drop all versions of adjust_investor_position to start fresh
DROP FUNCTION IF EXISTS public.adjust_investor_position(uuid, uuid, numeric, text, text, uuid);
DROP FUNCTION IF EXISTS public.adjust_investor_position(uuid, uuid, numeric, text, uuid, text, date, text);

-- Create the canonical 8-parameter function matching frontend expectations
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
  out_new_balance numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_value numeric := 0;
  v_new_balance numeric;
  v_fund_asset text;
  v_fund_class text;
  v_effective_type text;
  v_effective_ref text;
  v_tx_id uuid;
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

  -- Get fund details (asset and fund_class are required for transactions_v2)
  SELECT f.asset, f.fund_class 
  INTO v_fund_asset, v_fund_class
  FROM public.funds f 
  WHERE f.id = p_fund_id;
  
  IF v_fund_asset IS NULL THEN
    RAISE EXCEPTION 'Fund not found: %', p_fund_id;
  END IF;

  -- Validate investor exists
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_investor_id) THEN
    RAISE EXCEPTION 'Investor not found: %', p_investor_id;
  END IF;

  -- Get current balance (default to 0 if no position exists)
  SELECT COALESCE(ip.current_value, 0)
  INTO v_current_value
  FROM public.investor_positions ip
  WHERE ip.investor_id = p_investor_id AND ip.fund_id = p_fund_id;
  
  IF v_current_value IS NULL THEN
    v_current_value := 0;
  END IF;

  -- Calculate new balance
  v_new_balance := v_current_value + p_delta;

  -- Prevent negative balances for withdrawals
  IF v_new_balance < 0 THEN
    RAISE EXCEPTION 'Insufficient balance. Current: %, Requested withdrawal: %', v_current_value, ABS(p_delta);
  END IF;

  -- Determine effective transaction type
  v_effective_type := COALESCE(p_tx_type, 'ADJUSTMENT');
  
  -- Validate transaction type exists in enum
  IF v_effective_type NOT IN ('DEPOSIT', 'WITHDRAWAL', 'ADJUSTMENT', 'YIELD', 'FEE', 'IB_PAYOUT', 'TRANSFER_IN', 'TRANSFER_OUT') THEN
    RAISE EXCEPTION 'Invalid transaction type: %', v_effective_type;
  END IF;

  -- Generate unique reference_id if not provided (prevents duplicate constraint violations)
  v_effective_ref := COALESCE(p_reference_id, 'adj_' || gen_random_uuid()::text);

  -- Upsert investor position
  INSERT INTO public.investor_positions (
    investor_id,
    fund_id,
    current_value,
    cost_basis,
    created_at,
    updated_at
  )
  VALUES (
    p_investor_id,
    p_fund_id,
    v_new_balance,
    CASE WHEN p_delta > 0 THEN p_delta ELSE 0 END,
    now(),
    now()
  )
  ON CONFLICT (investor_id, fund_id) DO UPDATE SET
    current_value = v_new_balance,
    cost_basis = public.investor_positions.cost_basis + CASE WHEN p_delta > 0 THEN p_delta ELSE 0 END,
    updated_at = now();

  -- Insert transaction record with correct column names
  INSERT INTO public.transactions_v2 (
    investor_id,
    fund_id,
    amount,
    type,
    tx_date,
    asset,
    notes,
    reference_id,
    created_by,
    created_at
  )
  VALUES (
    p_investor_id,
    p_fund_id,
    p_delta,
    v_effective_type::tx_type,
    COALESCE(p_tx_date, CURRENT_DATE),
    v_fund_asset,
    p_note,
    v_effective_ref,
    p_admin_id,
    now()
  )
  RETURNING id INTO v_tx_id;

  -- Log the adjustment in audit_log
  INSERT INTO public.audit_log (
    entity,
    entity_id,
    action,
    actor_user,
    old_values,
    new_values,
    created_at
  )
  VALUES (
    'investor_positions',
    p_investor_id::text || '_' || p_fund_id::text,
    'POSITION_ADJUSTMENT',
    p_admin_id,
    jsonb_build_object('balance', v_current_value),
    jsonb_build_object('balance', v_new_balance, 'delta', p_delta, 'tx_id', v_tx_id),
    now()
  );

  -- Return result with out_ prefixed column names
  RETURN QUERY SELECT 
    p_investor_id AS out_investor_id,
    p_fund_id AS out_fund_id,
    v_current_value AS out_previous_balance,
    v_new_balance AS out_new_balance;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.adjust_investor_position(uuid, uuid, numeric, text, uuid, text, date, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.adjust_investor_position(uuid, uuid, numeric, text, uuid, text, date, text) TO service_role;

-- Add comment documenting the function
COMMENT ON FUNCTION public.adjust_investor_position(uuid, uuid, numeric, text, uuid, text, date, text) IS 
'Adjusts investor position balance and creates a transaction record.
Parameters:
  p_investor_id: UUID of the investor
  p_fund_id: UUID of the fund
  p_delta: Amount to adjust (positive for deposits, negative for withdrawals)
  p_note: Optional note/description
  p_admin_id: UUID of the admin performing the action
  p_tx_type: Transaction type (DEPOSIT, WITHDRAWAL, ADJUSTMENT, etc.)
  p_tx_date: Date of the transaction (defaults to current date)
  p_reference_id: Optional idempotency key
Returns: Previous and new balance for the position';

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';