-- ============================================================================
-- Migration: Fix adjust_investor_position Column Names
-- ============================================================================
-- Fixes:
-- 1. adjust_investor_position: current_balance -> current_value
-- 2. get_historical_nav: Add out_ prefix to return columns
-- 3. get_position_reconciliation: Add out_ prefix to return columns
-- ============================================================================

-- Drop existing functions to recreate with correct signatures
DROP FUNCTION IF EXISTS public.adjust_investor_position(uuid, uuid, numeric, text, uuid, text, date, text);
DROP FUNCTION IF EXISTS public.get_historical_nav(date);
DROP FUNCTION IF EXISTS public.get_position_reconciliation(uuid, date);

-- ============================================================================
-- 1. FIXED: adjust_investor_position with correct column name (current_value)
-- ============================================================================
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

-- ============================================================================
-- 2. FIXED: get_historical_nav with out_ prefixed columns
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_historical_nav(target_date DATE)
RETURNS TABLE (
    out_fund_id UUID,
    out_fund_name TEXT,
    out_asset_code TEXT,
    out_aum NUMERIC,
    out_daily_inflows NUMERIC,
    out_daily_outflows NUMERIC,
    out_net_flow_24h NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        f.id AS out_fund_id,
        f.name AS out_fund_name,
        f.asset AS out_asset_code,
        COALESCE(dn.aum, 0) AS out_aum,
        COALESCE(dn.total_inflows, 0) AS out_daily_inflows,
        COALESCE(dn.total_outflows, 0) AS out_daily_outflows,
        (COALESCE(dn.total_inflows, 0) - COALESCE(dn.total_outflows, 0)) AS out_net_flow_24h
    FROM 
        public.funds f
    LEFT JOIN 
        public.daily_nav dn ON f.id = dn.fund_id AND dn.nav_date = target_date;
END;
$$;

-- ============================================================================
-- 3. FIXED: get_position_reconciliation with out_ prefixed columns
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_position_reconciliation(
  p_fund_id uuid DEFAULT NULL,
  p_as_of_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    out_investor_id UUID,
    out_fund_id UUID,
    out_investor_name TEXT,
    out_fund_name TEXT,
    out_position_balance NUMERIC,
    out_ledger_balance NUMERIC,
    out_difference NUMERIC,
    out_is_matched BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ip.investor_id AS out_investor_id,
        ip.fund_id AS out_fund_id,
        pr.full_name AS out_investor_name,
        f.name AS out_fund_name,
        ip.current_value AS out_position_balance,
        COALESCE(ledger.total, 0) AS out_ledger_balance,
        (ip.current_value - COALESCE(ledger.total, 0)) AS out_difference,
        (ABS(ip.current_value - COALESCE(ledger.total, 0)) < 0.01) AS out_is_matched
    FROM public.investor_positions ip
    JOIN public.profiles pr ON pr.id = ip.investor_id
    JOIN public.funds f ON f.id = ip.fund_id
    LEFT JOIN (
        SELECT 
            t.investor_id,
            t.fund_id,
            SUM(t.amount) AS total
        FROM public.transactions_v2 t
        WHERE t.tx_date <= p_as_of_date
          AND t.status = 'CONFIRMED'
          AND (t.is_voided IS NULL OR t.is_voided = false)
        GROUP BY t.investor_id, t.fund_id
    ) ledger ON ledger.investor_id = ip.investor_id AND ledger.fund_id = ip.fund_id
    WHERE (p_fund_id IS NULL OR ip.fund_id = p_fund_id);
END;
$$;

-- ============================================================================
-- Grant permissions
-- ============================================================================
GRANT EXECUTE ON FUNCTION public.adjust_investor_position(uuid, uuid, numeric, text, uuid, text, date, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_historical_nav(date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_position_reconciliation(uuid, date) TO authenticated;

-- ============================================================================
-- Refresh PostgREST schema cache
-- ============================================================================
NOTIFY pgrst, 'reload schema';