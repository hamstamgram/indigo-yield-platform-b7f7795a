-- ============================================
-- Platform Hardening: Internal Routing & Visibility
-- ============================================

-- 1. Create visibility_scope enum
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'visibility_scope') THEN
    CREATE TYPE visibility_scope AS ENUM ('investor_visible', 'admin_only');
  END IF;
END $$;

-- 2. Add visibility_scope column to transactions_v2
ALTER TABLE public.transactions_v2 
ADD COLUMN IF NOT EXISTS visibility_scope visibility_scope NOT NULL DEFAULT 'investor_visible';

-- 3. Add transfer_id for linking paired internal transactions
ALTER TABLE public.transactions_v2
ADD COLUMN IF NOT EXISTS transfer_id UUID NULL;

-- 4. Add include_in_reporting to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS include_in_reporting BOOLEAN NOT NULL DEFAULT false;

-- 5. Create index for visibility filtering
CREATE INDEX IF NOT EXISTS idx_transactions_visibility 
ON public.transactions_v2 (investor_id, visibility_scope);

-- 6. Create index for transfer_id lookups
CREATE INDEX IF NOT EXISTS idx_transactions_transfer_id 
ON public.transactions_v2 (transfer_id) WHERE transfer_id IS NOT NULL;

-- 7. Trigger to enforce admin_only for internal transaction types
CREATE OR REPLACE FUNCTION public.enforce_internal_tx_visibility()
RETURNS TRIGGER AS $$
BEGIN
  -- Force admin_only for internal routing transactions
  IF NEW.type IN ('INTERNAL_WITHDRAWAL', 'INTERNAL_CREDIT') THEN
    NEW.visibility_scope := 'admin_only';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_enforce_internal_visibility ON public.transactions_v2;
CREATE TRIGGER trg_enforce_internal_visibility
BEFORE INSERT OR UPDATE ON public.transactions_v2
FOR EACH ROW
EXECUTE FUNCTION public.enforce_internal_tx_visibility();

-- 8. Update RLS policy for transactions_v2 - investors only see investor_visible
DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions_v2;
DROP POLICY IF EXISTS "Users can view own investor-visible transactions" ON public.transactions_v2;

CREATE POLICY "Users can view own investor-visible transactions"
ON public.transactions_v2 FOR SELECT
USING (
  (investor_id = auth.uid() AND visibility_scope = 'investor_visible')
  OR is_admin()
);

-- 9. Create internal routing RPC
CREATE OR REPLACE FUNCTION public.internal_route_to_fees(
  p_from_investor_id UUID,
  p_fund_id UUID,
  p_amount NUMERIC,
  p_effective_date DATE,
  p_reason TEXT,
  p_admin_id UUID
) RETURNS TABLE(
  transfer_id UUID,
  debit_tx_id UUID,
  credit_tx_id UUID,
  success BOOLEAN,
  message TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transfer_id UUID := gen_random_uuid();
  v_debit_tx_id UUID;
  v_credit_tx_id UUID;
  v_fund_asset TEXT;
  v_fund_class TEXT;
  v_investor_balance NUMERIC;
  v_fees_account_id UUID := '169bb053-36cb-4f6e-93ea-831f0dfeaf1d';
BEGIN
  -- Verify admin
  IF NOT public.is_admin_for_jwt() THEN
    RETURN QUERY SELECT NULL::UUID, NULL::UUID, NULL::UUID, false, 'Admin access required';
    RETURN;
  END IF;

  -- Validate amount
  IF p_amount <= 0 THEN
    RETURN QUERY SELECT NULL::UUID, NULL::UUID, NULL::UUID, false, 'Amount must be positive';
    RETURN;
  END IF;
  
  -- Get fund details
  SELECT asset, fund_class INTO v_fund_asset, v_fund_class 
  FROM funds WHERE id = p_fund_id;
  
  IF v_fund_asset IS NULL THEN
    RETURN QUERY SELECT NULL::UUID, NULL::UUID, NULL::UUID, false, 'Fund not found';
    RETURN;
  END IF;
  
  -- Check investor balance
  SELECT current_value INTO v_investor_balance
  FROM investor_positions
  WHERE investor_id = p_from_investor_id AND fund_id = p_fund_id;
  
  IF v_investor_balance IS NULL OR v_investor_balance < p_amount THEN
    RETURN QUERY SELECT NULL::UUID, NULL::UUID, NULL::UUID, false, 
      format('Insufficient balance: has %s, needs %s', COALESCE(v_investor_balance, 0), p_amount);
    RETURN;
  END IF;
  
  -- Check idempotency - prevent duplicate transfers
  IF EXISTS (
    SELECT 1 FROM transactions_v2 
    WHERE transfer_id = v_transfer_id
  ) THEN
    RETURN QUERY SELECT NULL::UUID, NULL::UUID, NULL::UUID, false, 'Transfer already processed';
    RETURN;
  END IF;
  
  -- Insert INTERNAL_WITHDRAWAL (debit from investor) - amount stored as positive but represents outflow
  INSERT INTO transactions_v2 (
    id, investor_id, fund_id, asset, fund_class, amount, type, 
    tx_date, value_date, source, is_system_generated,
    visibility_scope, transfer_id, notes, created_by, created_at
  ) VALUES (
    gen_random_uuid(), p_from_investor_id, p_fund_id, v_fund_asset, v_fund_class, 
    p_amount, 'INTERNAL_WITHDRAWAL',
    p_effective_date, p_effective_date, 'internal_routing', false,
    'admin_only', v_transfer_id, p_reason, p_admin_id, NOW()
  ) RETURNING id INTO v_debit_tx_id;
  
  -- Insert INTERNAL_CREDIT (credit to INDIGO FEES)
  INSERT INTO transactions_v2 (
    id, investor_id, fund_id, asset, fund_class, amount, type,
    tx_date, value_date, source, is_system_generated,
    visibility_scope, transfer_id, notes, created_by, created_at
  ) VALUES (
    gen_random_uuid(), v_fees_account_id, p_fund_id, v_fund_asset, v_fund_class,
    p_amount, 'INTERNAL_CREDIT',
    p_effective_date, p_effective_date, 'internal_routing', false,
    'admin_only', v_transfer_id, p_reason, p_admin_id, NOW()
  ) RETURNING id INTO v_credit_tx_id;
  
  -- Update investor position (decrease)
  UPDATE investor_positions
  SET current_value = current_value - p_amount,
      shares = shares - p_amount,
      updated_at = NOW()
  WHERE investor_id = p_from_investor_id AND fund_id = p_fund_id;
  
  -- Update or insert INDIGO FEES position (increase)
  INSERT INTO investor_positions (investor_id, fund_id, fund_class, current_value, shares, cost_basis)
  VALUES (v_fees_account_id, p_fund_id, v_fund_class, p_amount, p_amount, 0)
  ON CONFLICT (investor_id, fund_id) DO UPDATE
  SET current_value = investor_positions.current_value + p_amount,
      shares = investor_positions.shares + p_amount,
      updated_at = NOW();
  
  -- Audit log
  INSERT INTO audit_log (action, entity, entity_id, actor_user, new_values)
  VALUES (
    'INTERNAL_ROUTE_TO_FEES',
    'transfer',
    v_transfer_id::text,
    p_admin_id,
    jsonb_build_object(
      'from_investor_id', p_from_investor_id,
      'to_fees_account', v_fees_account_id,
      'fund_id', p_fund_id,
      'asset', v_fund_asset,
      'amount', p_amount,
      'reason', p_reason,
      'debit_tx_id', v_debit_tx_id,
      'credit_tx_id', v_credit_tx_id
    )
  );
  
  RETURN QUERY SELECT v_transfer_id, v_debit_tx_id, v_credit_tx_id, true, 'Internal transfer completed successfully';
END;
$$;

-- 10. Create report eligibility RPC
CREATE OR REPLACE FUNCTION public.get_reporting_eligible_investors(
  p_period_id UUID
) RETURNS TABLE (
  investor_id UUID,
  investor_name TEXT,
  email TEXT,
  eligibility_reason TEXT,
  is_eligible BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH period_info AS (
    SELECT 
      sp.year,
      sp.month,
      sp.period_start_date,
      sp.period_end_date
    FROM statement_periods sp
    WHERE sp.id = p_period_id
  ),
  investor_eligibility AS (
    SELECT 
      p.id AS inv_id,
      COALESCE(NULLIF(TRIM(p.first_name || ' ' || COALESCE(p.last_name, '')), ''), p.email) AS inv_name,
      p.email AS inv_email,
      p.include_in_reporting AS has_override,
      -- Has positions with value > 0
      EXISTS (
        SELECT 1 FROM investor_positions ip
        WHERE ip.investor_id = p.id AND ip.current_value > 0
      ) AS has_positions,
      -- Has investor-visible transactions in period
      EXISTS (
        SELECT 1 FROM transactions_v2 t, period_info pi
        WHERE t.investor_id = p.id 
          AND t.tx_date BETWEEN pi.period_start_date AND pi.period_end_date
          AND t.visibility_scope = 'investor_visible'
      ) AS has_transactions
    FROM profiles p
    WHERE p.is_admin = false
      AND (p.account_type IS NULL OR p.account_type != 'fees_account')
  )
  SELECT 
    ie.inv_id,
    ie.inv_name,
    ie.inv_email,
    CASE 
      WHEN ie.has_override THEN 'Admin override'
      WHEN ie.has_positions THEN 'Has active positions'
      WHEN ie.has_transactions THEN 'Has transactions in period'
      ELSE 'No assets or transactions'
    END,
    (ie.has_override OR ie.has_positions OR ie.has_transactions)
  FROM investor_eligibility ie
  ORDER BY 
    (ie.has_override OR ie.has_positions OR ie.has_transactions) DESC,
    ie.inv_name;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.internal_route_to_fees TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_reporting_eligible_investors TO authenticated;