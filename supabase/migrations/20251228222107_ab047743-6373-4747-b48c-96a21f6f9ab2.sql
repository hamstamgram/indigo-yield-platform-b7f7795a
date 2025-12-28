-- ============================================================================
-- CONSOLIDATION MIGRATION: Fix All Schema Mismatches
-- ============================================================================
-- Drop ALL versions of adjust_investor_position first
-- ============================================================================

-- Drop all possible overloads
DROP FUNCTION IF EXISTS public.adjust_investor_position(uuid, uuid, numeric, text, uuid, text, date);
DROP FUNCTION IF EXISTS public.adjust_investor_position(uuid, uuid, numeric, text, uuid, text);
DROP FUNCTION IF EXISTS public.adjust_investor_position(uuid, uuid, numeric, text, uuid);
DROP FUNCTION IF EXISTS public.adjust_investor_position(uuid, uuid, numeric, text);
DROP FUNCTION IF EXISTS public.adjust_investor_position(uuid, uuid, numeric);

-- Force drop any remaining with CASCADE
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT p.oid::regprocedure as func_sig
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' 
      AND p.proname = 'adjust_investor_position'
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || r.func_sig || ' CASCADE';
  END LOOP;
END $$;

-- ============================================================================
-- FIX 1: Create canonical adjust_investor_position
-- ============================================================================

CREATE FUNCTION public.adjust_investor_position(
  p_investor_id uuid,
  p_fund_id uuid,
  p_delta numeric,
  p_note text DEFAULT '',
  p_admin_id uuid DEFAULT NULL,
  p_tx_type text DEFAULT 'ADJUSTMENT',
  p_tx_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  out_success boolean,
  out_transaction_id uuid,
  out_old_balance numeric,
  out_new_balance numeric,
  out_message text
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
  v_final_reference_id := 'adj_' || p_investor_id::text || '_' || p_fund_id::text || '_' || extract(epoch from now())::text;

  -- Create transaction (NO status column - use is_voided)
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
$$;

GRANT EXECUTE ON FUNCTION public.adjust_investor_position(uuid, uuid, numeric, text, uuid, text, date) TO authenticated;

-- ============================================================================
-- FIX 2: Drop all versions of get_position_reconciliation and recreate
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_position_reconciliation(date);
DROP FUNCTION IF EXISTS public.get_position_reconciliation();

CREATE FUNCTION public.get_position_reconciliation(
  p_as_of_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  out_investor_id uuid,
  out_fund_id uuid,
  out_investor_name text,
  out_fund_code text,
  out_position_value numeric,
  out_ledger_balance numeric,
  out_discrepancy numeric,
  out_last_tx_date date
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH ledger_balances AS (
    SELECT 
      t.investor_id,
      t.fund_id,
      SUM(t.amount) as total_amount,
      MAX(t.tx_date) as last_tx_date
    FROM public.transactions_v2 t
    WHERE t.tx_date <= p_as_of_date
      AND (t.is_voided IS NULL OR t.is_voided = false)
    GROUP BY t.investor_id, t.fund_id
  )
  SELECT 
    ip.investor_id,
    ip.fund_id,
    COALESCE(pr.name, pr.email, 'Unknown')::text,
    f.code::text,
    COALESCE(ip.current_value, 0),
    COALESCE(lb.total_amount, 0),
    COALESCE(ip.current_value, 0) - COALESCE(lb.total_amount, 0),
    lb.last_tx_date
  FROM public.investor_positions ip
  LEFT JOIN ledger_balances lb ON lb.investor_id = ip.investor_id AND lb.fund_id = ip.fund_id
  LEFT JOIN public.profiles pr ON pr.id = ip.investor_id
  LEFT JOIN public.funds f ON f.id = ip.fund_id
  WHERE ABS(COALESCE(ip.current_value, 0) - COALESCE(lb.total_amount, 0)) > 0.01
  ORDER BY ABS(COALESCE(ip.current_value, 0) - COALESCE(lb.total_amount, 0)) DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_position_reconciliation(date) TO authenticated;

-- ============================================================================
-- FIX 3: Drop all versions of get_historical_nav and recreate
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_historical_nav(uuid, date, date);
DROP FUNCTION IF EXISTS public.get_historical_nav(uuid, date);
DROP FUNCTION IF EXISTS public.get_historical_nav(uuid);

CREATE FUNCTION public.get_historical_nav(
  p_fund_id uuid,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  out_fund_id uuid,
  out_nav_date date,
  out_aum numeric,
  out_nav_per_share numeric,
  out_shares_outstanding numeric,
  out_purpose text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT dn.fund_id, dn.nav_date, dn.aum, dn.nav_per_share, dn.shares_outstanding, dn.purpose::text
  FROM public.daily_nav dn
  WHERE dn.fund_id = p_fund_id
    AND (p_start_date IS NULL OR dn.nav_date >= p_start_date)
    AND dn.nav_date <= p_end_date
  ORDER BY dn.nav_date DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_historical_nav(uuid, date, date) TO authenticated;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';

COMMENT ON FUNCTION public.adjust_investor_position IS 
'Adjusts investor position. Uses is_voided (not status) and current_value (not current_balance).';