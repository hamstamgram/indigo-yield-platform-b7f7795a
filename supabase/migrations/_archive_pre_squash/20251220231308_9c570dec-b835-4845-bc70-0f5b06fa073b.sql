-- ============================================
-- DATABASE AUDIT FIX MIGRATION (FINAL)
-- Priority: CRITICAL -> HIGH -> MEDIUM -> LOW
-- ============================================

-- ============================================
-- 🔴 CRITICAL #1: Fix Admin Functions to Use user_roles Table
-- ============================================

-- Redefine is_admin_safe() to use user_roles
CREATE OR REPLACE FUNCTION public.is_admin_safe()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin'::app_role, 'super_admin'::app_role)
  )
$$;

-- Redefine is_admin() to use is_admin_safe()
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT public.is_admin_safe()
$$;

-- Redefine is_admin_for_jwt() to use user_roles
CREATE OR REPLACE FUNCTION public.is_admin_for_jwt()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin'::app_role, 'super_admin'::app_role)
  )
$$;

-- Redefine ensure_admin() to use user_roles
CREATE OR REPLACE FUNCTION public.ensure_admin()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin'::app_role, 'super_admin'::app_role)
  ) THEN
    RAISE EXCEPTION 'Admin only operation';
  END IF;
END;
$$;

-- Update check_is_admin in place (keep original parameter name to avoid dependency issues)
CREATE OR REPLACE FUNCTION public.check_is_admin(user_id uuid)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = check_is_admin.user_id
    AND role IN ('admin'::app_role, 'super_admin'::app_role)
  )
$$;

-- ============================================
-- 🔴 CRITICAL #2: Add Authorization to Critical RPCs
-- ============================================

-- Fix apply_daily_yield_with_fees - ADD AUTHORIZATION
CREATE OR REPLACE FUNCTION public.apply_daily_yield_with_fees(p_fund_id text, p_rate_date date, p_gross_rate numeric, p_fee_rate numeric DEFAULT 0)
RETURNS TABLE(positions_updated integer, gross_yield numeric, fees_collected numeric, net_yield numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated_count INTEGER := 0;
  v_total_value_before NUMERIC;
  v_gross_yield NUMERIC;
  v_fees NUMERIC;
  v_net_rate NUMERIC;
BEGIN
  -- SECURITY: Authorization check
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) 
     AND NOT public.has_role(auth.uid(), 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized: Admin role required';
  END IF;

  v_net_rate := p_gross_rate * (1 - p_fee_rate);

  SELECT COALESCE(SUM(current_value), 0) INTO v_total_value_before
  FROM public.investor_positions
  WHERE fund_id = p_fund_id::uuid;

  UPDATE public.investor_positions
  SET current_value = current_value * (1 + v_net_rate), updated_at = now()
  WHERE fund_id = p_fund_id::uuid;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  v_gross_yield := v_total_value_before * p_gross_rate;
  v_fees := v_total_value_before * p_gross_rate * p_fee_rate;

  RETURN QUERY SELECT v_updated_count, v_gross_yield, v_fees, v_gross_yield - v_fees;
END;
$$;

-- Fix apply_daily_yield_to_fund
CREATE OR REPLACE FUNCTION public.apply_daily_yield_to_fund(p_fund_id text, p_rate_date date, p_daily_rate numeric)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated_count INTEGER := 0;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) 
     AND NOT public.has_role(auth.uid(), 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'Admin access required to apply yield';
  END IF;

  UPDATE public.investor_positions
  SET current_value = current_value * (1 + p_daily_rate), updated_at = now()
  WHERE fund_id = p_fund_id::uuid;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  INSERT INTO public.audit_log (action, entity, entity_id, actor_user, new_values)
  VALUES (
    'YIELD_APPLIED', 'investor_positions', p_fund_id, auth.uid(),
    jsonb_build_object('fund_id', p_fund_id, 'rate_date', p_rate_date, 'daily_rate', p_daily_rate, 'positions_updated', v_updated_count)
  );

  RETURN v_updated_count;
END;
$$;

-- ============================================
-- 🔴 CRITICAL #3: Add Unique Index on transactions_v2.reference_id
-- ============================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_v2_reference_id_unique 
ON transactions_v2 (reference_id) 
WHERE reference_id IS NOT NULL;

-- ============================================
-- 🟠 HIGH #4: Add Missing tx_type Enum Values
-- ============================================

DO $$ BEGIN ALTER TYPE tx_type ADD VALUE IF NOT EXISTS 'FEE_CREDIT'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE tx_type ADD VALUE IF NOT EXISTS 'IB_CREDIT'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE tx_type ADD VALUE IF NOT EXISTS 'YIELD'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================
-- 🟠 HIGH #5: Make ib_allocations.purpose NOT NULL
-- ============================================

UPDATE ib_allocations SET purpose = 'reporting' WHERE purpose IS NULL;
ALTER TABLE ib_allocations ALTER COLUMN purpose SET DEFAULT 'reporting';
ALTER TABLE ib_allocations ALTER COLUMN purpose SET NOT NULL;

-- ============================================
-- 🟡 MEDIUM #6: Add Missing RLS Policy for fee_allocations
-- ============================================

DROP POLICY IF EXISTS "fee_allocations_select_own" ON fee_allocations;
CREATE POLICY "fee_allocations_select_own" ON fee_allocations FOR SELECT USING (investor_id = auth.uid() OR is_admin());

-- ============================================
-- 🟢 LOW #7: Create Position-Transaction Reconciliation View
-- ============================================

CREATE OR REPLACE VIEW position_transaction_reconciliation AS
SELECT 
  ip.investor_id,
  ip.fund_id,
  ip.current_value as position_balance,
  COALESCE(tx_sum.total, 0) as transaction_sum,
  ip.current_value - COALESCE(tx_sum.total, 0) as discrepancy,
  CASE WHEN ABS(ip.current_value - COALESCE(tx_sum.total, 0)) < 0.01 THEN 'OK' ELSE 'MISMATCH' END as status
FROM investor_positions ip
LEFT JOIN (
  SELECT investor_id, fund_id,
    SUM(CASE 
      WHEN type::text IN ('DEPOSIT', 'INTEREST', 'YIELD', 'FEE_CREDIT', 'IB_CREDIT', 'ADJUSTMENT') THEN amount
      WHEN type::text IN ('WITHDRAWAL', 'FEE') THEN -amount
      ELSE 0
    END) as total
  FROM transactions_v2 GROUP BY investor_id, fund_id
) tx_sum ON tx_sum.investor_id = ip.investor_id AND tx_sum.fund_id = ip.fund_id
WHERE ip.current_value > 0;

GRANT SELECT ON position_transaction_reconciliation TO authenticated;

-- ============================================
-- 🟢 LOW #8: Secure reconciliation function
-- ============================================

CREATE OR REPLACE FUNCTION public.get_position_reconciliation(p_investor_id uuid DEFAULT NULL)
RETURNS TABLE(investor_id uuid, fund_id uuid, position_balance numeric, transaction_sum numeric, discrepancy numeric, status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role) THEN
    RETURN QUERY SELECT ptr.investor_id, ptr.fund_id, ptr.position_balance, ptr.transaction_sum, ptr.discrepancy, ptr.status 
    FROM position_transaction_reconciliation ptr WHERE p_investor_id IS NULL OR ptr.investor_id = p_investor_id;
  ELSE
    RETURN QUERY SELECT ptr.investor_id, ptr.fund_id, ptr.position_balance, ptr.transaction_sum, ptr.discrepancy, ptr.status 
    FROM position_transaction_reconciliation ptr WHERE ptr.investor_id = auth.uid();
  END IF;
END;
$$;

-- ============================================
-- AUDIT LOG
-- ============================================

INSERT INTO audit_log (action, entity, entity_id, actor_user, meta)
VALUES ('DATABASE_AUDIT_FIX', 'system', 'migration_' || now()::text, NULL,
  jsonb_build_object('fixes_applied', ARRAY[
    'is_admin_safe() -> user_roles', 'is_admin() -> user_roles', 'is_admin_for_jwt() -> user_roles',
    'ensure_admin() -> user_roles', 'check_is_admin() -> user_roles',
    'apply_daily_yield_with_fees authorization', 'apply_daily_yield_to_fund authorization',
    'transactions_v2.reference_id unique index', 'tx_type enum values',
    'ib_allocations.purpose NOT NULL', 'fee_allocations_select_own policy', 'position_transaction_reconciliation view'
  ], 'migration_date', now()));