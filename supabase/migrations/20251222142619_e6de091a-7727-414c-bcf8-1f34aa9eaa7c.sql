-- ============================================================
-- PHASE 1: Fix UUID/TEXT type mismatches and create recompute system
-- ============================================================

-- 1. Add unique constraint on investor_positions if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'investor_positions_investor_fund_unique'
  ) THEN
    ALTER TABLE investor_positions 
    ADD CONSTRAINT investor_positions_investor_fund_unique 
    UNIQUE (investor_id, fund_id);
  END IF;
END $$;

-- 2. Create the recompute_investor_position function
CREATE OR REPLACE FUNCTION public.recompute_investor_position(
  p_investor_id uuid, 
  p_fund_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_calculated RECORD;
  v_fund_class TEXT;
BEGIN
  -- Get fund class
  SELECT fund_class INTO v_fund_class FROM funds WHERE id = p_fund_id;

  -- Calculate from transactions
  SELECT 
    COALESCE(SUM(CASE WHEN type = 'DEPOSIT' THEN amount ELSE 0 END), 0) as deposits,
    COALESCE(SUM(CASE WHEN type = 'WITHDRAWAL' THEN amount ELSE 0 END), 0) as withdrawals,
    COALESCE(SUM(CASE WHEN type IN ('YIELD', 'INTEREST', 'FEE_CREDIT', 'IB_CREDIT') THEN amount ELSE 0 END), 0) as yields,
    COALESCE(SUM(CASE WHEN type = 'FEE' THEN amount ELSE 0 END), 0) as fees,
    COALESCE(SUM(amount), 0) as total,
    MAX(tx_date) as last_tx_date
  INTO v_calculated
  FROM transactions_v2
  WHERE investor_id = p_investor_id AND fund_id = p_fund_id;

  -- Upsert position
  INSERT INTO investor_positions (
    investor_id, fund_id, fund_class,
    current_value, cost_basis, shares,
    last_transaction_date, updated_at
  ) VALUES (
    p_investor_id, p_fund_id, v_fund_class,
    v_calculated.total, v_calculated.deposits, v_calculated.total,
    v_calculated.last_tx_date, now()
  )
  ON CONFLICT (investor_id, fund_id) DO UPDATE SET
    current_value = EXCLUDED.current_value,
    cost_basis = EXCLUDED.cost_basis,
    shares = EXCLUDED.shares,
    last_transaction_date = EXCLUDED.last_transaction_date,
    updated_at = now();
    
  -- If total is 0 or negative and no recent transactions, remove position
  IF v_calculated.total <= 0 AND v_calculated.last_tx_date IS NULL THEN
    DELETE FROM investor_positions 
    WHERE investor_id = p_investor_id AND fund_id = p_fund_id;
  END IF;
END;
$$;

-- 3. Create function to recompute all positions for an investor
CREATE OR REPLACE FUNCTION public.recompute_investor_positions_for_investor(
  p_investor_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT DISTINCT fund_id 
    FROM transactions_v2 
    WHERE investor_id = p_investor_id
  LOOP
    PERFORM public.recompute_investor_position(p_investor_id, r.fund_id);
  END LOOP;
END;
$$;

-- 4. Create trigger function for automatic recompute
CREATE OR REPLACE FUNCTION public.trigger_recompute_position()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recompute_investor_position(OLD.investor_id, OLD.fund_id);
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Recompute for old and new if fund changed
    PERFORM public.recompute_investor_position(NEW.investor_id, NEW.fund_id);
    IF OLD.fund_id != NEW.fund_id OR OLD.investor_id != NEW.investor_id THEN
      PERFORM public.recompute_investor_position(OLD.investor_id, OLD.fund_id);
    END IF;
    RETURN NEW;
  ELSE
    PERFORM public.recompute_investor_position(NEW.investor_id, NEW.fund_id);
    RETURN NEW;
  END IF;
END;
$$;

-- 5. Drop existing trigger if exists and create new one
DROP TRIGGER IF EXISTS trg_recompute_position_on_tx ON transactions_v2;
CREATE TRIGGER trg_recompute_position_on_tx
AFTER INSERT OR UPDATE OR DELETE ON transactions_v2
FOR EACH ROW EXECUTE FUNCTION public.trigger_recompute_position();

-- 6. Create audit trigger for transaction changes
CREATE OR REPLACE FUNCTION public.audit_transaction_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log (action, entity, entity_id, old_values, actor_user, meta)
    VALUES ('DELETE', 'transactions_v2', OLD.id, to_jsonb(OLD), auth.uid(), 
            jsonb_build_object('trigger', 'audit_transaction_changes'));
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log (action, entity, entity_id, old_values, new_values, actor_user, meta)
    VALUES ('UPDATE', 'transactions_v2', NEW.id, to_jsonb(OLD), to_jsonb(NEW), auth.uid(),
            jsonb_build_object('trigger', 'audit_transaction_changes'));
    RETURN NEW;
  ELSE
    INSERT INTO audit_log (action, entity, entity_id, new_values, actor_user, meta)
    VALUES ('INSERT', 'transactions_v2', NEW.id, to_jsonb(NEW), auth.uid(),
            jsonb_build_object('trigger', 'audit_transaction_changes'));
    RETURN NEW;
  END IF;
END;
$$;

-- Create the audit trigger
DROP TRIGGER IF EXISTS trg_audit_transactions ON transactions_v2;
CREATE TRIGGER trg_audit_transactions
AFTER INSERT OR UPDATE OR DELETE ON transactions_v2
FOR EACH ROW EXECUTE FUNCTION public.audit_transaction_changes();

-- 7. Create transaction type validation trigger
CREATE OR REPLACE FUNCTION public.validate_transaction_type()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_current_balance NUMERIC;
BEGIN
  -- Get current balance (before this transaction)
  SELECT COALESCE(current_value, 0) INTO v_current_balance
  FROM investor_positions
  WHERE investor_id = NEW.investor_id AND fund_id = NEW.fund_id;

  -- If deposit and balance is 0, set to first_investment
  IF NEW.type = 'DEPOSIT' AND COALESCE(v_current_balance, 0) = 0 THEN
    NEW.tx_subtype := 'first_investment';
  -- If trying to use first_investment when balance exists, reject or convert to deposit
  ELSIF NEW.type = 'DEPOSIT' AND NEW.tx_subtype = 'first_investment' AND COALESCE(v_current_balance, 0) > 0 THEN
    NEW.tx_subtype := 'deposit';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_tx_type ON transactions_v2;
CREATE TRIGGER trg_validate_tx_type
BEFORE INSERT ON transactions_v2
FOR EACH ROW EXECUTE FUNCTION public.validate_transaction_type();

-- 8. Create AUM check function
CREATE OR REPLACE FUNCTION public.check_aum_exists_for_date(
  p_fund_id uuid,
  p_date date
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM fund_daily_aum 
    WHERE fund_id = p_fund_id 
    AND aum_date = p_date 
    AND purpose = 'transaction'
  );
$$;

-- 9. Fix the admin_create_transaction function
CREATE OR REPLACE FUNCTION public.admin_create_transaction(
  p_investor_id uuid, 
  p_fund_id uuid,
  p_transaction_type text, 
  p_amount numeric, 
  p_tx_date date DEFAULT CURRENT_DATE,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_transaction_id UUID;
  v_fund RECORD;
  v_current_balance NUMERIC;
  v_balance_before NUMERIC;
  v_tx_subtype TEXT;
BEGIN
  -- Admin check
  IF NOT public.is_admin_for_jwt() THEN
    RAISE EXCEPTION 'Only admins can create transactions';
  END IF;

  -- Get fund details
  SELECT * INTO v_fund FROM funds WHERE id = p_fund_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Fund not found: %', p_fund_id;
  END IF;

  -- Get current balance for this investor/fund
  SELECT COALESCE(current_value, 0) INTO v_current_balance
  FROM investor_positions
  WHERE investor_id = p_investor_id AND fund_id = p_fund_id;

  v_balance_before := COALESCE(v_current_balance, 0);
  
  -- Determine tx_subtype
  IF p_transaction_type = 'DEPOSIT' AND v_balance_before = 0 THEN
    v_tx_subtype := 'first_investment';
  ELSIF p_transaction_type = 'DEPOSIT' THEN
    v_tx_subtype := 'deposit';
  ELSIF p_transaction_type = 'WITHDRAWAL' THEN
    v_tx_subtype := 'withdrawal';
  ELSE
    v_tx_subtype := lower(p_transaction_type);
  END IF;

  -- Insert into transactions_v2
  INSERT INTO public.transactions_v2 (
    investor_id, fund_id, type, asset, amount, 
    tx_date, value_date, notes, source,
    created_by, approved_by, approved_at, purpose,
    balance_before, balance_after, tx_subtype
  ) VALUES (
    p_investor_id, p_fund_id, p_transaction_type::tx_type, 
    v_fund.asset, p_amount, p_tx_date, p_tx_date, p_notes, 
    'manual_admin', auth.uid(), auth.uid(), now(), 'transaction',
    v_balance_before, v_balance_before + p_amount, v_tx_subtype
  )
  RETURNING id INTO v_transaction_id;

  RETURN v_transaction_id;
END;
$$;

-- 10. Fix preview_daily_yield_to_fund_v2 - remove ::text cast
CREATE OR REPLACE FUNCTION public.preview_daily_yield_to_fund_v2(
  p_fund_id uuid,
  p_effective_date date,
  p_gross_rate numeric,
  p_purpose aum_purpose DEFAULT 'reporting'
)
RETURNS TABLE (
  investor_id uuid,
  investor_name text,
  email text,
  beginning_balance numeric,
  fee_pct numeric,
  gross_yield numeric,
  fee_amount numeric,
  net_yield numeric,
  ib_investor_id uuid,
  ib_pct numeric,
  ib_amount numeric,
  final_net_yield numeric,
  ending_balance numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_fund RECORD;
  v_period_start date;
BEGIN
  -- Get fund details
  SELECT * INTO v_fund FROM funds WHERE id = p_fund_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Fund not found: %', p_fund_id;
  END IF;

  -- Calculate period start (first of month)
  v_period_start := date_trunc('month', p_effective_date)::date;

  RETURN QUERY
  WITH investor_balances AS (
    -- Get each investor's balance at period start
    SELECT 
      t.investor_id,
      p.full_name as investor_name,
      p.email,
      COALESCE(SUM(t.amount) FILTER (WHERE t.tx_date < v_period_start), 0) as beginning_balance
    FROM transactions_v2 t
    JOIN profiles p ON p.id = t.investor_id
    WHERE t.fund_id = p_fund_id  -- FIXED: No ::text cast
      AND t.purpose = p_purpose
      AND p.fee_percentage IS DISTINCT FROM 0  -- Exclude INDIGO FEES account
    GROUP BY t.investor_id, p.full_name, p.email
    HAVING COALESCE(SUM(t.amount) FILTER (WHERE t.tx_date < v_period_start), 0) > 0
  ),
  fee_schedules AS (
    -- Get effective fee for each investor
    SELECT 
      ib.investor_id,
      COALESCE(ifs.fee_pct, p.fee_percentage, 15) as fee_pct,
      p.ib_parent_id,
      COALESCE(p.ib_percentage, 0) as ib_pct
    FROM investor_balances ib
    JOIN profiles p ON p.id = ib.investor_id
    LEFT JOIN investor_fee_schedule ifs ON ifs.investor_id = ib.investor_id
      AND ifs.fund_id = p_fund_id
      AND ifs.effective_date <= p_effective_date
      AND (ifs.end_date IS NULL OR ifs.end_date > p_effective_date)
  )
  SELECT 
    ib.investor_id,
    ib.investor_name,
    ib.email,
    ib.beginning_balance,
    fs.fee_pct,
    ROUND(ib.beginning_balance * p_gross_rate / 100, 8) as gross_yield,
    ROUND(ib.beginning_balance * p_gross_rate / 100 * fs.fee_pct / 100, 8) as fee_amount,
    ROUND(ib.beginning_balance * p_gross_rate / 100 * (1 - fs.fee_pct / 100), 8) as net_yield,
    fs.ib_parent_id as ib_investor_id,
    fs.ib_pct,
    ROUND(ib.beginning_balance * p_gross_rate / 100 * (1 - fs.fee_pct / 100) * fs.ib_pct / 100, 8) as ib_amount,
    ROUND(ib.beginning_balance * p_gross_rate / 100 * (1 - fs.fee_pct / 100) * (1 - fs.ib_pct / 100), 8) as final_net_yield,
    ib.beginning_balance + ROUND(ib.beginning_balance * p_gross_rate / 100 * (1 - fs.fee_pct / 100) * (1 - fs.ib_pct / 100), 8) as ending_balance
  FROM investor_balances ib
  JOIN fee_schedules fs ON fs.investor_id = ib.investor_id
  ORDER BY ib.beginning_balance DESC;
END;
$$;

-- 11. Repair existing position discrepancies by recomputing all positions
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT DISTINCT investor_id, fund_id 
    FROM transactions_v2
  LOOP
    PERFORM public.recompute_investor_position(r.investor_id, r.fund_id);
  END LOOP;
END $$;