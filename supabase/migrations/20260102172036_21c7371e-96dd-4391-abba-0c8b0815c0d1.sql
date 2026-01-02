-- ============================================
-- YIELD CRYSTALLIZATION ON CAPITAL EVENTS
-- ============================================

-- 1. Create investor_yield_events table
CREATE TABLE public.investor_yield_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Core relationships
  investor_id uuid NOT NULL,
  fund_id uuid NOT NULL,
  
  -- Timing
  event_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  
  -- Trigger context
  trigger_type text NOT NULL CHECK (trigger_type IN ('deposit', 'withdrawal', 'month_end', 'manual')),
  trigger_transaction_id uuid,
  
  -- AUM snapshot at crystallization
  fund_aum_before numeric NOT NULL,
  fund_aum_after numeric NOT NULL,
  
  -- Investor position snapshot
  investor_balance numeric NOT NULL,
  investor_share_pct numeric NOT NULL,
  
  -- Yield calculation
  fund_yield_pct numeric NOT NULL,
  gross_yield_amount numeric NOT NULL,
  
  -- Fee deductions
  fee_pct numeric DEFAULT 0,
  fee_amount numeric DEFAULT 0,
  net_yield_amount numeric NOT NULL,
  
  -- Period tracking
  period_start date NOT NULL,
  period_end date NOT NULL,
  days_in_period integer NOT NULL,
  
  -- VISIBILITY CONTROL
  visibility_scope text NOT NULL DEFAULT 'admin_only' 
    CHECK (visibility_scope IN ('admin_only', 'investor_visible')),
  made_visible_at timestamptz,
  made_visible_by uuid,
  
  -- Idempotency and audit
  reference_id text UNIQUE NOT NULL,
  is_voided boolean NOT NULL DEFAULT false,
  voided_at timestamptz,
  voided_by uuid,
  created_by uuid,
  
  -- Foreign keys
  CONSTRAINT fk_yield_events_investor FOREIGN KEY (investor_id) REFERENCES profiles(id),
  CONSTRAINT fk_yield_events_fund FOREIGN KEY (fund_id) REFERENCES funds(id),
  CONSTRAINT fk_yield_events_trigger_tx FOREIGN KEY (trigger_transaction_id) REFERENCES transactions_v2(id),
  CONSTRAINT fk_yield_events_visible_by FOREIGN KEY (made_visible_by) REFERENCES profiles(id),
  CONSTRAINT fk_yield_events_voided_by FOREIGN KEY (voided_by) REFERENCES profiles(id),
  CONSTRAINT fk_yield_events_created_by FOREIGN KEY (created_by) REFERENCES profiles(id)
);

-- Indexes for performance
CREATE INDEX idx_yield_events_investor_fund ON investor_yield_events(investor_id, fund_id);
CREATE INDEX idx_yield_events_fund_date ON investor_yield_events(fund_id, event_date);
CREATE INDEX idx_yield_events_visibility ON investor_yield_events(visibility_scope, is_voided);
CREATE INDEX idx_yield_events_period ON investor_yield_events(fund_id, period_start, period_end);
CREATE INDEX idx_yield_events_trigger_tx ON investor_yield_events(trigger_transaction_id);

-- 2. Create fund_yield_snapshots table
CREATE TABLE public.fund_yield_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id uuid NOT NULL,
  snapshot_date date NOT NULL,
  
  opening_aum numeric NOT NULL,
  closing_aum numeric NOT NULL,
  gross_yield_pct numeric NOT NULL,
  gross_yield_amount numeric NOT NULL,
  
  period_start date NOT NULL,
  period_end date NOT NULL,
  days_in_period integer NOT NULL,
  
  trigger_type text NOT NULL CHECK (trigger_type IN ('deposit', 'withdrawal', 'month_end', 'manual')),
  trigger_reference text,
  
  is_voided boolean NOT NULL DEFAULT false,
  voided_at timestamptz,
  voided_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  
  CONSTRAINT fk_yield_snapshots_fund FOREIGN KEY (fund_id) REFERENCES funds(id),
  CONSTRAINT fk_yield_snapshots_voided_by FOREIGN KEY (voided_by) REFERENCES profiles(id),
  CONSTRAINT fk_yield_snapshots_created_by FOREIGN KEY (created_by) REFERENCES profiles(id),
  UNIQUE(fund_id, snapshot_date, trigger_reference)
);

CREATE INDEX idx_yield_snapshots_fund_date ON fund_yield_snapshots(fund_id, snapshot_date);

-- 3. Add columns to investor_positions
ALTER TABLE investor_positions 
ADD COLUMN IF NOT EXISTS last_yield_crystallization_date date,
ADD COLUMN IF NOT EXISTS cumulative_yield_earned numeric DEFAULT 0;

-- 4. RLS Policies for investor_yield_events
ALTER TABLE investor_yield_events ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "yield_events_admin_all" ON investor_yield_events
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Investors can only see their own visible events
CREATE POLICY "yield_events_investor_select" ON investor_yield_events
  FOR SELECT USING (
    investor_id = auth.uid() 
    AND visibility_scope = 'investor_visible' 
    AND is_voided = false
  );

-- 5. RLS Policies for fund_yield_snapshots
ALTER TABLE fund_yield_snapshots ENABLE ROW LEVEL SECURITY;

-- Admin only
CREATE POLICY "yield_snapshots_admin_all" ON fund_yield_snapshots
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- 6. Create crystallize_yield_before_flow RPC
CREATE OR REPLACE FUNCTION public.crystallize_yield_before_flow(
  p_fund_id uuid,
  p_trigger_type text,
  p_trigger_date date,
  p_trigger_transaction_id uuid DEFAULT NULL,
  p_admin_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last_snapshot record;
  v_current_fund_aum numeric;
  v_previous_fund_aum numeric;
  v_period_start date;
  v_fund_yield_pct numeric;
  v_gross_fund_yield numeric;
  v_snapshot_id uuid;
  v_investors_processed integer := 0;
  v_total_yield_distributed numeric := 0;
  v_reference_id text;
  v_inv record;
  v_investor_yield numeric;
  v_fee_pct numeric;
  v_fee_amount numeric;
  v_net_yield numeric;
BEGIN
  -- 1. Get current fund AUM from positions (source of truth)
  SELECT COALESCE(SUM(current_value), 0)
  INTO v_current_fund_aum
  FROM investor_positions
  WHERE fund_id = p_fund_id;
  
  -- Skip if no AUM
  IF v_current_fund_aum = 0 THEN
    RETURN jsonb_build_object(
      'success', true,
      'skipped', true,
      'reason', 'No AUM in fund'
    );
  END IF;
  
  -- 2. Get last crystallization point for this fund
  SELECT snapshot_date, closing_aum
  INTO v_period_start, v_previous_fund_aum
  FROM fund_yield_snapshots
  WHERE fund_id = p_fund_id
    AND is_voided = false
  ORDER BY snapshot_date DESC, created_at DESC
  LIMIT 1;
  
  -- If no previous snapshot, use fund inception or earliest position
  IF v_previous_fund_aum IS NULL THEN
    SELECT COALESCE(MIN(created_at::date), CURRENT_DATE)
    INTO v_period_start
    FROM investor_positions
    WHERE fund_id = p_fund_id;
    
    v_previous_fund_aum := v_current_fund_aum; -- No yield for first snapshot
  END IF;
  
  -- Skip if same day crystallization already exists
  IF v_period_start = p_trigger_date THEN
    RETURN jsonb_build_object(
      'success', true,
      'skipped', true,
      'reason', 'Already crystallized today'
    );
  END IF;
  
  -- 3. Calculate fund yield percentage
  IF v_previous_fund_aum > 0 THEN
    v_fund_yield_pct := (v_current_fund_aum - v_previous_fund_aum) / v_previous_fund_aum;
    v_gross_fund_yield := v_current_fund_aum - v_previous_fund_aum;
  ELSE
    v_fund_yield_pct := 0;
    v_gross_fund_yield := 0;
  END IF;
  
  -- 4. Create fund-level snapshot
  v_reference_id := 'yield_crystal:' || p_fund_id || ':' || p_trigger_date || ':' || gen_random_uuid();
  
  INSERT INTO fund_yield_snapshots (
    fund_id, snapshot_date, opening_aum, closing_aum,
    gross_yield_pct, gross_yield_amount,
    period_start, period_end, days_in_period,
    trigger_type, trigger_reference, created_by
  )
  VALUES (
    p_fund_id, p_trigger_date, v_previous_fund_aum, v_current_fund_aum,
    v_fund_yield_pct, v_gross_fund_yield,
    v_period_start, p_trigger_date, GREATEST(1, p_trigger_date - v_period_start),
    p_trigger_type, v_reference_id, p_admin_id
  )
  RETURNING id INTO v_snapshot_id;
  
  -- 5. Distribute yield to each investor pro-rata
  FOR v_inv IN 
    SELECT 
      ip.investor_id, 
      ip.current_value,
      CASE WHEN v_current_fund_aum > 0 
           THEN ip.current_value / v_current_fund_aum 
           ELSE 0 END as share_pct
    FROM investor_positions ip
    WHERE ip.fund_id = p_fund_id AND ip.current_value > 0
  LOOP
    -- Calculate investor's share of yield
    v_investor_yield := v_inv.current_value * v_fund_yield_pct;
    
    -- Get fee percentage for this investor (from investor_fee_schedule)
    SELECT COALESCE(ifs.fee_pct, 0) INTO v_fee_pct
    FROM investor_fee_schedule ifs
    WHERE ifs.investor_id = v_inv.investor_id
      AND (ifs.fund_id = p_fund_id OR ifs.fund_id IS NULL)
      AND ifs.effective_date <= p_trigger_date
      AND (ifs.end_date IS NULL OR ifs.end_date >= p_trigger_date)
    ORDER BY ifs.effective_date DESC
    LIMIT 1;
    
    v_fee_pct := COALESCE(v_fee_pct, 0);
    v_fee_amount := v_investor_yield * v_fee_pct / 100;
    v_net_yield := v_investor_yield - v_fee_amount;
    
    -- Insert yield event for this investor (admin_only visibility)
    INSERT INTO investor_yield_events (
      investor_id, fund_id, event_date,
      trigger_type, trigger_transaction_id,
      fund_aum_before, fund_aum_after,
      investor_balance, investor_share_pct,
      fund_yield_pct, gross_yield_amount,
      fee_pct, fee_amount, net_yield_amount,
      period_start, period_end, days_in_period,
      visibility_scope, reference_id, created_by
    )
    VALUES (
      v_inv.investor_id, p_fund_id, p_trigger_date,
      p_trigger_type, p_trigger_transaction_id,
      v_previous_fund_aum, v_current_fund_aum,
      v_inv.current_value, v_inv.share_pct,
      v_fund_yield_pct, v_investor_yield,
      v_fee_pct, v_fee_amount, v_net_yield,
      v_period_start, p_trigger_date, GREATEST(1, p_trigger_date - v_period_start),
      'admin_only', v_reference_id || ':' || v_inv.investor_id, p_admin_id
    );
    
    -- Update cumulative yield on position
    UPDATE investor_positions
    SET cumulative_yield_earned = COALESCE(cumulative_yield_earned, 0) + v_net_yield,
        last_yield_crystallization_date = p_trigger_date
    WHERE investor_id = v_inv.investor_id AND fund_id = p_fund_id;
    
    v_investors_processed := v_investors_processed + 1;
    v_total_yield_distributed := v_total_yield_distributed + v_net_yield;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'snapshot_id', v_snapshot_id,
    'fund_id', p_fund_id,
    'trigger_date', p_trigger_date,
    'trigger_type', p_trigger_type,
    'period_start', v_period_start,
    'previous_aum', v_previous_fund_aum,
    'current_aum', v_current_fund_aum,
    'fund_yield_pct', v_fund_yield_pct,
    'gross_yield', v_gross_fund_yield,
    'investors_processed', v_investors_processed,
    'total_yield_distributed', v_total_yield_distributed
  );
END;
$$;

-- 7. Create finalize_month_yield RPC
CREATE OR REPLACE FUNCTION public.finalize_month_yield(
  p_fund_id uuid,
  p_period_year integer,
  p_period_month integer,
  p_admin_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period_start date;
  v_period_end date;
  v_events_updated integer;
  v_total_yield numeric;
BEGIN
  -- Calculate period boundaries
  v_period_start := make_date(p_period_year, p_period_month, 1);
  v_period_end := (v_period_start + interval '1 month' - interval '1 day')::date;
  
  -- Get total yield being finalized
  SELECT COALESCE(SUM(net_yield_amount), 0)
  INTO v_total_yield
  FROM investor_yield_events
  WHERE fund_id = p_fund_id
    AND event_date BETWEEN v_period_start AND v_period_end
    AND visibility_scope = 'admin_only'
    AND is_voided = false;
  
  -- Update visibility of all yield events in this period
  UPDATE investor_yield_events
  SET 
    visibility_scope = 'investor_visible',
    made_visible_at = now(),
    made_visible_by = p_admin_id
  WHERE fund_id = p_fund_id
    AND event_date BETWEEN v_period_start AND v_period_end
    AND visibility_scope = 'admin_only'
    AND is_voided = false;
  
  GET DIAGNOSTICS v_events_updated = ROW_COUNT;
  
  RETURN jsonb_build_object(
    'success', true,
    'fund_id', p_fund_id,
    'period_start', v_period_start,
    'period_end', v_period_end,
    'events_made_visible', v_events_updated,
    'total_yield_finalized', v_total_yield
  );
END;
$$;

-- 8. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.crystallize_yield_before_flow TO authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_month_yield TO authenticated;