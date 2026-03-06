-- Migration: Fix transactions_v2 status column references
-- Date: 2026-01-02
-- Issue: column "STATUS" of relation "transactions_v2" does not exist

-- Drop existing functions first to handle return type changes
DROP FUNCTION IF EXISTS public.adjust_investor_position(uuid,uuid,numeric,text,uuid,text,date,text);
DROP FUNCTION IF EXISTS public.get_position_reconciliation(date,uuid);

-- 1. Recreate adjust_investor_position function (removes invalid status column reference)
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
  out_investor_id uuid,
  out_fund_id uuid,
  out_old_balance numeric,
  out_new_balance numeric,
  out_transaction_id uuid,
  out_reference_id text
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_current_value numeric;
  v_new_balance numeric;
  v_tx_id uuid;
  v_fund_asset text;
  v_fund_class text;
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

  -- Verify fund exists and get asset/class
  SELECT f.asset, f.fund_class INTO v_fund_asset, v_fund_class
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

  -- Yield crystallization before deposit/withdrawal
  IF v_effective_type IN ('DEPOSIT', 'WITHDRAWAL') THEN
    BEGIN
      SELECT public.crystallize_yield_before_flow(
        p_fund_id,
        LOWER(v_effective_type),
        p_tx_date,
        p_admin_id
      ) INTO v_crystallization_result;
      
      IF v_crystallization_result IS NOT NULL AND (v_crystallization_result->>'success')::boolean THEN
        RAISE NOTICE 'Yield crystallized before %: % investors processed',
          v_effective_type,
          v_crystallization_result->>'investors_processed';
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Yield crystallization failed (non-fatal): %', SQLERRM;
    END;
  END IF;

  -- Get current position value
  SELECT COALESCE(ip.current_value, 0)
  INTO v_current_value
  FROM public.investor_positions ip
  WHERE ip.investor_id = p_investor_id AND ip.fund_id = p_fund_id;
  
  v_current_value := COALESCE(v_current_value, 0);
  v_new_balance := v_current_value + p_delta;
  
  -- Prevent negative balance
  IF v_new_balance < 0 THEN
    RAISE EXCEPTION 'Insufficient balance. Current: %, Requested: %', v_current_value, ABS(p_delta);
  END IF;

  -- Generate unique reference_id if not provided
  v_final_reference_id := COALESCE(
    p_reference_id, 
    'adj_' || p_investor_id::text || '_' || p_fund_id::text || '_' || gen_random_uuid()::text
  );

  -- Create transaction record (WITHOUT status column - uses is_voided pattern)
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
    'position_adjustment',
    false,
    'admin_only'
  )
  RETURNING id INTO v_tx_id;

  -- Upsert investor position
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

-- 2. Recreate get_position_reconciliation function (removes invalid status filter)
CREATE OR REPLACE FUNCTION public.get_position_reconciliation(
  p_as_of_date date DEFAULT CURRENT_DATE,
  p_fund_id uuid DEFAULT NULL
)
RETURNS TABLE(
  out_investor_id uuid,
  out_fund_id uuid,
  out_investor_name text,
  out_fund_name text,
  out_position_balance numeric,
  out_ledger_balance numeric,
  out_difference numeric,
  out_is_matched boolean
)
LANGUAGE plpgsql SECURITY DEFINER
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
          AND COALESCE(t.is_voided, false) = false
        GROUP BY t.investor_id, t.fund_id
    ) ledger ON ledger.investor_id = ip.investor_id AND ledger.fund_id = ip.fund_id
    WHERE (p_fund_id IS NULL OR ip.fund_id = p_fund_id);
END;
$$;