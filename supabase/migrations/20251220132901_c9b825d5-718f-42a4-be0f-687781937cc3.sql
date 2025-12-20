-- =============================================================================
-- Phase 2: Create Snapshot Tables for Historical Yield Attribution
-- =============================================================================

-- 1. Fund Period Snapshot - Stores point-in-time fund AUM for a period
CREATE TABLE IF NOT EXISTS public.fund_period_snapshot (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id UUID NOT NULL REFERENCES public.funds(id),
  period_id UUID NOT NULL REFERENCES public.statement_periods(id),
  snapshot_date DATE NOT NULL,
  total_aum NUMERIC(28,10) NOT NULL,
  investor_count INTEGER NOT NULL DEFAULT 0,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  locked_at TIMESTAMPTZ,
  locked_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id),
  UNIQUE(fund_id, period_id)
);

-- 2. Investor Period Snapshot - Stores each investor's ownership at snapshot time
CREATE TABLE IF NOT EXISTS public.investor_period_snapshot (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_period_snapshot_id UUID NOT NULL REFERENCES public.fund_period_snapshot(id) ON DELETE CASCADE,
  investor_id UUID NOT NULL REFERENCES public.profiles(id),
  fund_id UUID NOT NULL REFERENCES public.funds(id),
  period_id UUID NOT NULL REFERENCES public.statement_periods(id),
  balance_at_snapshot NUMERIC(28,10) NOT NULL,
  ownership_pct NUMERIC(10,6) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(investor_id, fund_id, period_id)
);

-- 3. Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_fund_period_snapshot_fund_period 
  ON public.fund_period_snapshot(fund_id, period_id);

CREATE INDEX IF NOT EXISTS idx_fund_period_snapshot_locked 
  ON public.fund_period_snapshot(is_locked) WHERE is_locked = true;

CREATE INDEX IF NOT EXISTS idx_investor_period_snapshot_investor 
  ON public.investor_period_snapshot(investor_id);

CREATE INDEX IF NOT EXISTS idx_investor_period_snapshot_fund_period 
  ON public.investor_period_snapshot(fund_id, period_id);

-- 4. Enable RLS
ALTER TABLE public.fund_period_snapshot ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investor_period_snapshot ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for fund_period_snapshot
CREATE POLICY "Admins can manage fund_period_snapshot"
  ON public.fund_period_snapshot
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Authenticated users can view fund_period_snapshot"
  ON public.fund_period_snapshot
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- 6. RLS Policies for investor_period_snapshot
CREATE POLICY "Admins can manage investor_period_snapshot"
  ON public.investor_period_snapshot
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Investors can view own period snapshots"
  ON public.investor_period_snapshot
  FOR SELECT
  USING (investor_id = auth.uid() OR public.is_admin());

-- 7. Create function to generate a period snapshot for a fund
CREATE OR REPLACE FUNCTION public.generate_fund_period_snapshot(
  p_fund_id UUID,
  p_period_id UUID,
  p_admin_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_snapshot_id UUID;
  v_period_end DATE;
  v_total_aum NUMERIC(28,10) := 0;
  v_investor_count INTEGER := 0;
  v_existing_snapshot_id UUID;
BEGIN
  -- Check if snapshot already exists
  SELECT id INTO v_existing_snapshot_id
  FROM fund_period_snapshot
  WHERE fund_id = p_fund_id AND period_id = p_period_id;
  
  IF v_existing_snapshot_id IS NOT NULL THEN
    -- Return existing snapshot
    RETURN v_existing_snapshot_id;
  END IF;
  
  -- Get period end date
  SELECT period_end_date INTO v_period_end
  FROM statement_periods
  WHERE id = p_period_id;
  
  IF v_period_end IS NULL THEN
    RAISE EXCEPTION 'Statement period not found: %', p_period_id;
  END IF;
  
  -- Calculate investor balances as of period_end by replaying transactions
  -- This is a simplified calculation - sum of all transactions up to period_end
  WITH investor_balances AS (
    SELECT 
      t.investor_id,
      SUM(CASE 
        WHEN t.type IN ('DEPOSIT', 'INTEREST', 'YIELD', 'ADJUSTMENT') THEN t.amount
        WHEN t.type IN ('WITHDRAWAL', 'FEE') THEN -t.amount
        ELSE 0
      END) as balance
    FROM transactions_v2 t
    WHERE t.fund_id = p_fund_id
      AND t.tx_date <= v_period_end
    GROUP BY t.investor_id
    HAVING SUM(CASE 
        WHEN t.type IN ('DEPOSIT', 'INTEREST', 'YIELD', 'ADJUSTMENT') THEN t.amount
        WHEN t.type IN ('WITHDRAWAL', 'FEE') THEN -t.amount
        ELSE 0
      END) > 0
  )
  SELECT 
    COALESCE(SUM(balance), 0),
    COUNT(*)
  INTO v_total_aum, v_investor_count
  FROM investor_balances;
  
  -- If no transaction history, fall back to current investor_positions
  IF v_total_aum = 0 THEN
    SELECT 
      COALESCE(SUM(current_value), 0),
      COUNT(DISTINCT investor_id)
    INTO v_total_aum, v_investor_count
    FROM investor_positions
    WHERE fund_id = p_fund_id AND current_value > 0;
  END IF;
  
  -- Create fund snapshot
  INSERT INTO fund_period_snapshot (
    fund_id, period_id, snapshot_date, total_aum, investor_count, created_by
  ) VALUES (
    p_fund_id, p_period_id, v_period_end, v_total_aum, v_investor_count, p_admin_id
  )
  RETURNING id INTO v_snapshot_id;
  
  -- Create investor snapshots
  WITH investor_balances AS (
    SELECT 
      t.investor_id,
      SUM(CASE 
        WHEN t.type IN ('DEPOSIT', 'INTEREST', 'YIELD', 'ADJUSTMENT') THEN t.amount
        WHEN t.type IN ('WITHDRAWAL', 'FEE') THEN -t.amount
        ELSE 0
      END) as balance
    FROM transactions_v2 t
    WHERE t.fund_id = p_fund_id
      AND t.tx_date <= v_period_end
    GROUP BY t.investor_id
    HAVING SUM(CASE 
        WHEN t.type IN ('DEPOSIT', 'INTEREST', 'YIELD', 'ADJUSTMENT') THEN t.amount
        WHEN t.type IN ('WITHDRAWAL', 'FEE') THEN -t.amount
        ELSE 0
      END) > 0
  )
  INSERT INTO investor_period_snapshot (
    fund_period_snapshot_id, investor_id, fund_id, period_id, balance_at_snapshot, ownership_pct
  )
  SELECT 
    v_snapshot_id,
    ib.investor_id,
    p_fund_id,
    p_period_id,
    ib.balance,
    CASE WHEN v_total_aum > 0 THEN (ib.balance / v_total_aum) * 100 ELSE 0 END
  FROM investor_balances ib;
  
  -- If no transaction-based snapshots, use current positions as fallback
  IF NOT EXISTS (SELECT 1 FROM investor_period_snapshot WHERE fund_period_snapshot_id = v_snapshot_id) THEN
    INSERT INTO investor_period_snapshot (
      fund_period_snapshot_id, investor_id, fund_id, period_id, balance_at_snapshot, ownership_pct
    )
    SELECT 
      v_snapshot_id,
      ip.investor_id,
      p_fund_id,
      p_period_id,
      ip.current_value,
      CASE WHEN v_total_aum > 0 THEN (ip.current_value / v_total_aum) * 100 ELSE 0 END
    FROM investor_positions ip
    WHERE ip.fund_id = p_fund_id AND ip.current_value > 0;
  END IF;
  
  RETURN v_snapshot_id;
END;
$$;

-- 8. Create function to lock a period snapshot
CREATE OR REPLACE FUNCTION public.lock_fund_period_snapshot(
  p_fund_id UUID,
  p_period_id UUID,
  p_admin_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Verify admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_admin_id AND is_admin = true) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  
  UPDATE fund_period_snapshot
  SET 
    is_locked = true,
    locked_at = now(),
    locked_by = p_admin_id
  WHERE fund_id = p_fund_id AND period_id = p_period_id;
  
  RETURN FOUND;
END;
$$;

-- 9. Create function to check if period is locked
CREATE OR REPLACE FUNCTION public.is_period_locked(
  p_fund_id UUID,
  p_period_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM fund_period_snapshot
    WHERE fund_id = p_fund_id 
      AND period_id = p_period_id 
      AND is_locked = true
  );
END;
$$;

-- 10. Create function to get snapshot ownership percentages
CREATE OR REPLACE FUNCTION public.get_period_ownership(
  p_fund_id UUID,
  p_period_id UUID
)
RETURNS TABLE (
  investor_id UUID,
  balance NUMERIC,
  ownership_pct NUMERIC,
  snapshot_date DATE,
  is_locked BOOLEAN
)
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ips.investor_id,
    ips.balance_at_snapshot as balance,
    ips.ownership_pct,
    fps.snapshot_date,
    fps.is_locked
  FROM investor_period_snapshot ips
  JOIN fund_period_snapshot fps ON fps.id = ips.fund_period_snapshot_id
  WHERE fps.fund_id = p_fund_id AND fps.period_id = p_period_id;
END;
$$;