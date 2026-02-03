-- Fix: Add missing p_reference_id parameter to adjust_investor_position
-- This makes the function signature match the frontend's 8-parameter call

-- Drop all existing versions of the function
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN 
    SELECT p.oid::regprocedure as func_sig
    FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'adjust_investor_position'
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || r.func_sig || ' CASCADE';
  END LOOP;
END $$;

-- Create with CORRECT 8-parameter signature matching frontend call
CREATE OR REPLACE FUNCTION public.adjust_investor_position(
  p_investor_id uuid,
  p_fund_id uuid,
  p_delta numeric,
  p_note text DEFAULT ''::text,
  p_admin_id uuid DEFAULT NULL::uuid,
  p_tx_type text DEFAULT 'ADJUSTMENT'::text,
  p_tx_date date DEFAULT CURRENT_DATE,
  p_reference_id text DEFAULT NULL::text
)
RETURNS TABLE(
  out_success boolean,
  out_transaction_id uuid,
  out_old_balance numeric,
  out_new_balance numeric,
  out_message text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_current_value numeric;
  v_new_balance numeric;
  v_tx_id uuid;
  v_fund_asset text;
  v_fund_class text;
  v_effective_type text;
  v_final_reference_id text;
BEGIN
  -- Validate inputs
  IF p_investor_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::numeric, NULL::numeric, 'investor_id is required'::text;
    RETURN;
  END IF;
  
  IF p_fund_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::numeric, NULL::numeric, 'fund_id is required'::text;
    RETURN;
  END IF;
  
  IF p_delta IS NULL OR p_delta = 0 THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::numeric, NULL::numeric, 'delta must be non-zero'::text;
    RETURN;
  END IF;

  -- Get fund details
  SELECT f.asset, f.fund_class
  INTO v_fund_asset, v_fund_class
  FROM public.funds f
  WHERE f.id = p_fund_id;
  
  IF v_fund_asset IS NULL THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::numeric, NULL::numeric, 'Fund not found'::text;
    RETURN;
  END IF;

  -- Get current position value (using correct column: current_value)
  SELECT COALESCE(ip.current_value, 0)
  INTO v_current_value
  FROM public.investor_positions ip
  WHERE ip.investor_id = p_investor_id 
    AND ip.fund_id = p_fund_id;
  
  IF v_current_value IS NULL THEN
    v_current_value := 0;
  END IF;

  v_new_balance := v_current_value + p_delta;

  IF v_new_balance < 0 THEN
    RETURN QUERY SELECT false, NULL::uuid, v_current_value, v_new_balance, 
      format('Insufficient balance. Current: %s, Requested: %s', v_current_value, p_delta)::text;
    RETURN;
  END IF;

  v_effective_type := COALESCE(p_tx_type, 'ADJUSTMENT');
  
  -- Use provided reference_id OR generate one
  v_final_reference_id := COALESCE(
    p_reference_id,
    'adj_' || p_investor_id::text || '_' || p_fund_id::text || '_' || extract(epoch from now())::text
  );

  -- Idempotency check - if reference_id already exists, return existing transaction
  SELECT id INTO v_tx_id 
  FROM public.transactions_v2 
  WHERE reference_id = v_final_reference_id;
  
  IF v_tx_id IS NOT NULL THEN
    RETURN QUERY SELECT true, v_tx_id, v_current_value, v_current_value, 
      'Transaction already exists (idempotent)'::text;
    RETURN;
  END IF;

  -- Create transaction (using is_voided, NOT status)
  INSERT INTO public.transactions_v2 (
    investor_id, fund_id, type, amount, asset, tx_date, notes, reference_id, created_by, is_voided
  ) VALUES (
    p_investor_id, p_fund_id, v_effective_type::tx_type, p_delta, v_fund_asset,
    COALESCE(p_tx_date, CURRENT_DATE), COALESCE(p_note, 'Position adjustment'),
    v_final_reference_id, p_admin_id, false
  )
  RETURNING id INTO v_tx_id;

  -- Update position (using current_value, NOT current_balance)
  INSERT INTO public.investor_positions (
    investor_id, fund_id, current_value, cost_basis, fund_class, created_at, updated_at
  ) VALUES (
    p_investor_id, p_fund_id, v_new_balance,
    CASE WHEN p_delta > 0 THEN p_delta ELSE 0 END, v_fund_class, now(), now()
  )
  ON CONFLICT (investor_id, fund_id) DO UPDATE SET
    current_value = v_new_balance,
    cost_basis = investor_positions.cost_basis + CASE WHEN p_delta > 0 THEN p_delta ELSE 0 END,
    updated_at = now();

  RETURN QUERY SELECT true, v_tx_id, v_current_value, v_new_balance, 'Position adjusted successfully'::text;
END;
$function$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.adjust_investor_position(uuid, uuid, numeric, text, uuid, text, date, text) TO authenticated;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';