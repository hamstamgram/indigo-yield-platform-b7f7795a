-- =============================================
-- FIX adjust_investor_position FUNCTION
-- Correct column names: type (not tx_type), notes (not note)
-- =============================================

-- Drop the broken function
DROP FUNCTION IF EXISTS public.adjust_investor_position(uuid, uuid, numeric, text, uuid, text, date, text);

-- Recreate with correct column names
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
RETURNS TABLE(transaction_id uuid, old_balance numeric, new_balance numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_balance numeric;
  v_new_balance numeric;
  v_tx_id uuid;
  v_fund_class text;
  v_asset text;
BEGIN
  -- Get fund details
  SELECT fund_class, asset INTO v_fund_class, v_asset
  FROM funds WHERE id = p_fund_id;
  
  IF v_fund_class IS NULL THEN
    RAISE EXCEPTION 'Fund not found: %', p_fund_id;
  END IF;

  -- Get current balance
  SELECT COALESCE(current_value, 0) INTO v_old_balance
  FROM investor_positions
  WHERE investor_id = p_investor_id AND fund_id = p_fund_id;
  
  v_old_balance := COALESCE(v_old_balance, 0);
  v_new_balance := v_old_balance + p_delta;
  
  -- Prevent negative balances
  IF v_new_balance < 0 THEN
    RAISE EXCEPTION 'Insufficient balance. Current: %, Requested: %', v_old_balance, p_delta;
  END IF;

  -- Create transaction record (FIXED: type instead of tx_type, notes instead of note)
  INSERT INTO transactions_v2 (
    investor_id, fund_id, type, amount, 
    asset, notes, created_by, tx_date, reference_id
  ) VALUES (
    p_investor_id, p_fund_id, p_tx_type::tx_type, p_delta,
    v_asset, p_note, p_admin_id, p_tx_date, p_reference_id
  )
  RETURNING id INTO v_tx_id;

  -- Update or insert position
  INSERT INTO investor_positions (
    investor_id, fund_id, current_value, cost_basis, fund_class,
    shares, updated_at, last_transaction_date
  ) VALUES (
    p_investor_id, p_fund_id, v_new_balance,
    CASE WHEN p_delta > 0 THEN p_delta ELSE 0 END,
    v_fund_class, v_new_balance, NOW(), p_tx_date
  )
  ON CONFLICT (investor_id, fund_id) DO UPDATE SET
    current_value = v_new_balance,
    shares = v_new_balance,
    cost_basis = CASE 
      WHEN p_delta > 0 THEN investor_positions.cost_basis + p_delta 
      ELSE investor_positions.cost_basis 
    END,
    updated_at = NOW(),
    last_transaction_date = p_tx_date;

  -- Recalculate fund AUM for the transaction date
  PERFORM recalculate_fund_aum_for_date(
    p_fund_id, 
    p_tx_date, 
    'transaction'::aum_purpose, 
    p_admin_id
  );

  RETURN QUERY SELECT v_tx_id, v_old_balance, v_new_balance;
END;
$$;

GRANT EXECUTE ON FUNCTION public.adjust_investor_position TO authenticated;

-- =============================================
-- DROP DEPRECATED V1 FUNCTIONS
-- =============================================

DROP FUNCTION IF EXISTS public.apply_daily_yield_to_fund(uuid, date, numeric, uuid);
DROP FUNCTION IF EXISTS public.apply_yield_correction(uuid, date, text, numeric, text, text);
DROP FUNCTION IF EXISTS public.preview_yield_correction(uuid, date, text, numeric);
DROP FUNCTION IF EXISTS public.update_position_on_transaction();