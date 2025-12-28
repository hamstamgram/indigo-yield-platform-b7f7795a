-- ============================================================================
-- CONSOLIDATION MIGRATION: Canonical adjust_investor_position Function
-- ============================================================================
-- Purpose: Drop ALL existing overloads and create ONE canonical function
-- that matches the frontend signature and generates unique reference_ids
-- ============================================================================

-- PHASE 1: DROP ALL EXISTING OVERLOADS
-- Drop every possible signature that might exist
DROP FUNCTION IF EXISTS public.adjust_investor_position(uuid, uuid, numeric, text, uuid);
DROP FUNCTION IF EXISTS public.adjust_investor_position(uuid, uuid, numeric, text, uuid, text, date);
DROP FUNCTION IF EXISTS public.adjust_investor_position(uuid, uuid, numeric, text, date, text, uuid);
DROP FUNCTION IF EXISTS public.adjust_investor_position(uuid, uuid, numeric, text);
DROP FUNCTION IF EXISTS public.adjust_investor_position(uuid, uuid, numeric);
DROP FUNCTION IF EXISTS public.adjust_investor_position(uuid, uuid, numeric, text, uuid, text, date, text);

-- PHASE 2: CREATE CANONICAL FUNCTION
-- Signature: (p_investor_id, p_fund_id, p_delta, p_note, p_admin_id, p_tx_type, p_tx_date, p_reference_id)
CREATE OR REPLACE FUNCTION public.adjust_investor_position(
  p_investor_id uuid,
  p_fund_id uuid,
  p_delta numeric,
  p_note text,
  p_admin_id uuid,
  p_tx_type text DEFAULT 'ADJUSTMENT',
  p_tx_date date DEFAULT CURRENT_DATE,
  p_reference_id text DEFAULT NULL
)
RETURNS TABLE (
  investor_id uuid,
  fund_id uuid,
  previous_balance numeric,
  new_balance numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_value numeric := 0;
  v_new_value numeric;
  v_effective_type text;
  v_tx_subtype text;
  v_tx_id uuid;
  v_fund_asset text;
  v_fund_class text;
  v_actual_ref_id text;
BEGIN
  -- SECURITY: Hard admin gate
  IF NOT is_admin_for_jwt() THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- VALIDATE & MAP TRANSACTION TYPE
  -- Map frontend types to valid enum values
  v_effective_type := UPPER(TRIM(p_tx_type));
  
  -- Map FIRST_INVESTMENT and TOP_UP to DEPOSIT
  IF v_effective_type IN ('FIRST_INVESTMENT', 'TOP_UP') THEN
    v_effective_type := 'DEPOSIT';
  END IF;
  
  -- Validate against actual tx_type enum
  IF v_effective_type NOT IN ('DEPOSIT', 'WITHDRAWAL', 'INTEREST', 'FEE', 'ADJUSTMENT', 'FEE_CREDIT', 'IB_CREDIT', 'YIELD', 'INTERNAL_WITHDRAWAL', 'INTERNAL_CREDIT') THEN
    RAISE EXCEPTION 'Invalid transaction type: %. Allowed: DEPOSIT, WITHDRAWAL, INTEREST, FEE, ADJUSTMENT, YIELD', p_tx_type;
  END IF;

  -- GET FUND INFO
  SELECT f.asset, f.fund_class INTO v_fund_asset, v_fund_class
  FROM funds f WHERE f.id = p_fund_id;
  
  IF v_fund_asset IS NULL THEN
    RAISE EXCEPTION 'Fund not found: %', p_fund_id;
  END IF;

  -- ENSURE AUM RECORD EXISTS (auto-create if missing for transaction purpose)
  INSERT INTO fund_daily_aum (fund_id, aum_date, total_aum, purpose, source, created_by)
  VALUES (p_fund_id, p_tx_date, 0, 'transaction', 'auto_created_for_transaction', p_admin_id)
  ON CONFLICT (fund_id, aum_date, purpose) 
  DO UPDATE SET updated_at = now();

  -- GET CURRENT POSITION (with lock)
  SELECT COALESCE(ip.current_value, 0) INTO v_current_value
  FROM investor_positions ip
  WHERE ip.investor_id = p_investor_id AND ip.fund_id = p_fund_id
  FOR UPDATE;
  
  -- If no position exists, default to 0
  v_current_value := COALESCE(v_current_value, 0);

  -- CALCULATE NEW BALANCE
  v_new_value := v_current_value + p_delta;
  
  -- PREVENT NEGATIVE BALANCE
  IF v_new_value < 0 THEN
    RAISE EXCEPTION 'Insufficient balance: current=%, requested change=%, would result in %', 
      v_current_value, p_delta, v_new_value;
  END IF;

  -- DETERMINE TX_SUBTYPE
  IF v_effective_type = 'DEPOSIT' THEN
    IF v_current_value = 0 OR v_current_value IS NULL THEN
      v_tx_subtype := 'first_investment';
    ELSE
      v_tx_subtype := 'deposit';
    END IF;
  ELSIF v_effective_type = 'WITHDRAWAL' THEN
    IF v_new_value = 0 THEN
      v_tx_subtype := 'full_redemption';
    ELSE
      v_tx_subtype := 'redemption';
    END IF;
  ELSIF v_effective_type = 'FEE' THEN
    v_tx_subtype := 'fee_charge';
  ELSIF v_effective_type IN ('INTEREST', 'YIELD') THEN
    v_tx_subtype := 'yield_credit';
  ELSE
    v_tx_subtype := 'adjustment';
  END IF;

  -- GENERATE UNIQUE REFERENCE_ID
  -- Format: manual:{fund_id}:{investor_id}:{date}:{uuid}
  v_actual_ref_id := COALESCE(
    NULLIF(TRIM(p_reference_id), ''),
    'manual:' || p_fund_id::text || ':' || p_investor_id::text || ':' || p_tx_date::text || ':' || gen_random_uuid()::text
  );

  -- INSERT TRANSACTION
  INSERT INTO transactions_v2 (
    investor_id,
    fund_id,
    type,
    tx_subtype,
    asset,
    fund_class,
    amount,
    tx_date,
    value_date,
    balance_before,
    balance_after,
    reference_id,
    notes,
    created_by,
    approved_by,
    approved_at,
    visibility_scope,
    source
  ) VALUES (
    p_investor_id,
    p_fund_id,
    v_effective_type::tx_type,
    v_tx_subtype,
    v_fund_asset,
    v_fund_class,
    ABS(p_delta),  -- Store amount as positive, type indicates direction
    p_tx_date,
    p_tx_date,
    v_current_value,
    v_new_value,
    v_actual_ref_id,
    p_note,
    p_admin_id,
    p_admin_id,
    now(),
    'investor_visible',
    'admin_adjustment'
  )
  RETURNING id INTO v_tx_id;

  -- UPSERT INVESTOR POSITION
  INSERT INTO investor_positions (
    investor_id,
    fund_id,
    current_value,
    last_transaction_date,
    fund_class,
    updated_at
  ) VALUES (
    p_investor_id,
    p_fund_id,
    v_new_value,
    p_tx_date,
    v_fund_class,
    now()
  )
  ON CONFLICT (investor_id, fund_id) 
  DO UPDATE SET 
    current_value = v_new_value,
    last_transaction_date = p_tx_date,
    updated_at = now();

  -- AUDIT LOG
  INSERT INTO audit_log (entity, entity_id, action, actor_user, old_values, new_values)
  VALUES (
    'investor_positions',
    p_investor_id::text,
    'adjust_investor_position',
    p_admin_id,
    jsonb_build_object('current_value', v_current_value),
    jsonb_build_object(
      'current_value', v_new_value,
      'delta', p_delta,
      'tx_type', v_effective_type,
      'tx_subtype', v_tx_subtype,
      'transaction_id', v_tx_id,
      'reference_id', v_actual_ref_id
    )
  );

  -- RETURN RESULT
  RETURN QUERY SELECT 
    p_investor_id AS investor_id,
    p_fund_id AS fund_id,
    v_current_value AS previous_balance,
    v_new_value AS new_balance;
END;
$$;

-- PHASE 3: GRANT PERMISSIONS
GRANT EXECUTE ON FUNCTION public.adjust_investor_position(uuid, uuid, numeric, text, uuid, text, date, text) 
TO authenticated, service_role;

-- Add helpful comment
COMMENT ON FUNCTION public.adjust_investor_position(uuid, uuid, numeric, text, uuid, text, date, text) IS 
'Canonical function for adjusting investor positions. Creates transaction and updates position atomically.
Parameters:
- p_investor_id: UUID of the investor
- p_fund_id: UUID of the fund  
- p_delta: Amount to add (positive) or subtract (negative)
- p_note: Transaction note/description
- p_admin_id: UUID of the admin performing the action
- p_tx_type: Transaction type (DEPOSIT, WITHDRAWAL, ADJUSTMENT, etc.)
- p_tx_date: Date of the transaction (defaults to today)
- p_reference_id: Optional unique reference ID (auto-generated if not provided)';