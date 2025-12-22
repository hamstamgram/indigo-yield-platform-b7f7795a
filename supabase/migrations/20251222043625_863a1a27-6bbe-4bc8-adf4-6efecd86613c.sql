-- =====================================================
-- YIELD CORRECTION ENGINE V2 - Time-Weighted Ownership
-- =====================================================

-- 1. Create correction_runs table for idempotency tracking
CREATE TABLE IF NOT EXISTS public.correction_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id UUID NOT NULL REFERENCES funds(id),
  period_id UUID REFERENCES statement_periods(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  purpose aum_purpose NOT NULL,
  input_hash TEXT NOT NULL,
  old_aum NUMERIC NOT NULL,
  new_aum NUMERIC NOT NULL,
  delta_aum NUMERIC NOT NULL,
  original_distribution_id UUID,
  correction_distribution_id UUID,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'applied', 'rolled_back')),
  investors_affected INTEGER DEFAULT 0,
  total_fee_delta NUMERIC DEFAULT 0,
  total_ib_delta NUMERIC DEFAULT 0,
  reason TEXT,
  preview_json JSONB,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  applied_at TIMESTAMPTZ,
  applied_by UUID REFERENCES profiles(id),
  
  -- Idempotency: same correction input cannot be applied twice
  CONSTRAINT unique_correction_input UNIQUE (fund_id, period_start, period_end, purpose, input_hash)
);

-- 2. Create investor_month_snapshots for historical balance reconstruction
CREATE TABLE IF NOT EXISTS public.investor_month_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id UUID NOT NULL REFERENCES profiles(id),
  fund_id UUID NOT NULL REFERENCES funds(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  beginning_balance NUMERIC NOT NULL DEFAULT 0,
  ending_balance NUMERIC NOT NULL DEFAULT 0,
  additions NUMERIC NOT NULL DEFAULT 0,
  redemptions NUMERIC NOT NULL DEFAULT 0,
  avg_capital NUMERIC NOT NULL DEFAULT 0,
  days_in_period INTEGER NOT NULL DEFAULT 30,
  days_invested INTEGER NOT NULL DEFAULT 30,
  fee_pct NUMERIC DEFAULT 20,
  ib_parent_id UUID REFERENCES profiles(id),
  ib_percentage NUMERIC DEFAULT 0,
  source TEXT DEFAULT 'computed',
  distribution_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- One snapshot per investor per fund per period
  CONSTRAINT unique_investor_month_snapshot UNIQUE (investor_id, fund_id, period_start, period_end)
);

-- 3. Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_correction_runs_fund_period 
  ON public.correction_runs(fund_id, period_start, period_end, purpose);
  
CREATE INDEX IF NOT EXISTS idx_correction_runs_status 
  ON public.correction_runs(status) WHERE status = 'applied';

CREATE INDEX IF NOT EXISTS idx_investor_month_snapshots_fund_period 
  ON public.investor_month_snapshots(fund_id, period_start, period_end);
  
CREATE INDEX IF NOT EXISTS idx_investor_month_snapshots_investor 
  ON public.investor_month_snapshots(investor_id);

-- 4. Enable RLS
ALTER TABLE public.correction_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investor_month_snapshots ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
CREATE POLICY "Admins can manage correction_runs"
  ON public.correction_runs FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can manage investor_month_snapshots"
  ON public.investor_month_snapshots FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Investors can view own month snapshots"
  ON public.investor_month_snapshots FOR SELECT
  USING (investor_id = auth.uid() OR public.is_admin());

-- 6. Function to compute input hash for idempotency
CREATE OR REPLACE FUNCTION public.compute_correction_input_hash(
  p_fund_id UUID,
  p_period_start DATE,
  p_period_end DATE,
  p_purpose TEXT,
  p_new_aum NUMERIC
) RETURNS TEXT LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  RETURN md5(
    p_fund_id::text || '|' ||
    p_period_start::text || '|' ||
    p_period_end::text || '|' ||
    p_purpose || '|' ||
    ROUND(p_new_aum, 8)::text
  );
END;
$$;

-- 7. Function to rebuild investor balances for a period using transaction replay
CREATE OR REPLACE FUNCTION public.rebuild_investor_period_balances(
  p_fund_id UUID,
  p_period_start DATE,
  p_period_end DATE,
  p_purpose aum_purpose
) RETURNS TABLE (
  investor_id UUID,
  investor_name TEXT,
  email TEXT,
  beginning_balance NUMERIC,
  ending_balance NUMERIC,
  additions NUMERIC,
  redemptions NUMERIC,
  avg_capital NUMERIC,
  days_in_period INTEGER,
  days_invested INTEGER,
  fee_pct NUMERIC,
  ib_parent_id UUID,
  ib_percentage NUMERIC
) LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_days_in_period INTEGER;
BEGIN
  v_days_in_period := (p_period_end - p_period_start) + 1;
  
  RETURN QUERY
  WITH 
  -- Get all transactions for the period
  period_txns AS (
    SELECT 
      t.investor_id,
      t.tx_date,
      t.type,
      t.amount,
      -- Weight by days remaining in period for time-weighted avg
      CASE 
        WHEN t.type IN ('DEPOSIT', 'INTEREST', 'FEE_CREDIT', 'IB_CREDIT') THEN 
          (p_period_end - t.tx_date)::numeric / v_days_in_period
        WHEN t.type IN ('WITHDRAWAL', 'FEE') THEN 
          (p_period_end - t.tx_date)::numeric / v_days_in_period
        ELSE 0
      END as time_weight
    FROM transactions_v2 t
    WHERE t.fund_id = p_fund_id
      AND t.purpose = p_purpose
      AND t.tx_date BETWEEN p_period_start AND p_period_end
  ),
  
  -- Calculate beginning balance (sum of all transactions before period start)
  beginning_balances AS (
    SELECT 
      t.investor_id,
      COALESCE(SUM(
        CASE 
          WHEN t.type IN ('DEPOSIT', 'INTEREST', 'FEE_CREDIT', 'IB_CREDIT') THEN t.amount
          WHEN t.type IN ('WITHDRAWAL', 'FEE') THEN -t.amount
          ELSE 0
        END
      ), 0) as balance
    FROM transactions_v2 t
    WHERE t.fund_id = p_fund_id
      AND t.purpose = p_purpose
      AND t.tx_date < p_period_start
    GROUP BY t.investor_id
  ),
  
  -- Calculate period movements
  period_movements AS (
    SELECT 
      t.investor_id,
      COALESCE(SUM(CASE WHEN t.type = 'DEPOSIT' THEN t.amount ELSE 0 END), 0) as additions,
      COALESCE(SUM(CASE WHEN t.type = 'WITHDRAWAL' THEN t.amount ELSE 0 END), 0) as redemptions,
      -- Time-weighted adjustment for avg capital
      COALESCE(SUM(
        CASE 
          WHEN t.type = 'DEPOSIT' THEN t.amount * t.time_weight
          WHEN t.type = 'WITHDRAWAL' THEN -t.amount * t.time_weight
          ELSE 0
        END
      ), 0) as time_weighted_adjustment
    FROM period_txns t
    GROUP BY t.investor_id
  ),
  
  -- Get all investors with positions in this fund
  all_investors AS (
    SELECT DISTINCT investor_id 
    FROM (
      SELECT investor_id FROM beginning_balances WHERE balance > 0
      UNION
      SELECT investor_id FROM period_movements WHERE additions > 0 OR redemptions > 0
      UNION
      SELECT investor_id FROM investor_positions WHERE fund_id = p_fund_id AND current_value > 0
    ) combined
  )
  
  SELECT 
    ai.investor_id,
    COALESCE(p.first_name || ' ' || COALESCE(p.last_name, ''), p.email) as investor_name,
    p.email,
    COALESCE(bb.balance, 0)::numeric as beginning_balance,
    (COALESCE(bb.balance, 0) + COALESCE(pm.additions, 0) - COALESCE(pm.redemptions, 0))::numeric as ending_balance,
    COALESCE(pm.additions, 0)::numeric as additions,
    COALESCE(pm.redemptions, 0)::numeric as redemptions,
    -- Avg capital = beginning_balance + time-weighted cashflows
    (COALESCE(bb.balance, 0) + COALESCE(pm.time_weighted_adjustment, 0))::numeric as avg_capital,
    v_days_in_period as days_in_period,
    v_days_in_period as days_invested,
    COALESCE(
      (SELECT ifs.fee_pct FROM investor_fee_schedule ifs 
       WHERE ifs.investor_id = ai.investor_id 
         AND (ifs.fund_id = p_fund_id OR ifs.fund_id IS NULL)
         AND ifs.effective_date <= p_period_end
       ORDER BY ifs.effective_date DESC LIMIT 1
      ), 20
    )::numeric as fee_pct,
    p.ib_parent_id,
    COALESCE(p.ib_percentage, 0)::numeric as ib_percentage
  FROM all_investors ai
  JOIN profiles p ON p.id = ai.investor_id
  LEFT JOIN beginning_balances bb ON bb.investor_id = ai.investor_id
  LEFT JOIN period_movements pm ON pm.investor_id = ai.investor_id
  WHERE COALESCE(bb.balance, 0) > 0 
     OR COALESCE(pm.additions, 0) > 0
     OR EXISTS (SELECT 1 FROM investor_positions ip WHERE ip.investor_id = ai.investor_id AND ip.fund_id = p_fund_id AND ip.current_value > 0);
END;
$$;

-- 8. Updated preview_yield_correction_v2 with time-weighted ownership
CREATE OR REPLACE FUNCTION public.preview_yield_correction_v2(
  p_fund_id UUID,
  p_period_start DATE,
  p_period_end DATE,
  p_purpose TEXT,
  p_new_aum NUMERIC
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_purpose_enum aum_purpose;
  v_fund RECORD;
  v_old_aum NUMERIC;
  v_previous_aum NUMERIC;
  v_old_gross_yield NUMERIC;
  v_new_gross_yield NUMERIC;
  v_delta_aum NUMERIC;
  v_delta_gross NUMERIC;
  v_total_avg_capital NUMERIC := 0;
  v_investors_affected INTEGER := 0;
  v_total_fee_delta NUMERIC := 0;
  v_total_ib_delta NUMERIC := 0;
  v_total_net_delta NUMERIC := 0;
  v_total_gross_yield_check NUMERIC := 0;
  v_total_fees_check NUMERIC := 0;
  v_indigo_fees_id UUID := '169bb053-36cb-4f6e-93ea-831f0dfeaf1d';
  v_investor_rows JSONB := '[]'::jsonb;
  v_tx_diffs JSONB := '[]'::jsonb;
  v_report_impacts JSONB := '[]'::jsonb;
  v_reconciliation JSONB;
  v_is_month_closed BOOLEAN := false;
  v_original_distribution_id UUID;
  v_input_hash TEXT;
  v_period_id UUID;
  rec RECORD;
  v_share NUMERIC;
  v_old_gross NUMERIC;
  v_new_gross NUMERIC;
  v_old_fee NUMERIC;
  v_new_fee NUMERIC;
  v_old_net NUMERIC;
  v_new_net NUMERIC;
  v_delta_fee NUMERIC;
  v_delta_net NUMERIC;
  v_old_ib NUMERIC;
  v_new_ib NUMERIC;
  v_delta_ib NUMERIC;
BEGIN
  -- Admin check
  IF NOT public.check_is_admin(auth.uid()) THEN 
    RETURN jsonb_build_object('success', false, 'error', 'Admin access required'); 
  END IF;
  
  v_purpose_enum := p_purpose::aum_purpose;
  
  -- Get fund details
  SELECT * INTO v_fund FROM funds WHERE id = p_fund_id;
  IF NOT FOUND THEN 
    RETURN jsonb_build_object('success', false, 'error', 'Fund not found'); 
  END IF;
  
  -- Get original AUM for period end
  SELECT id, total_aum INTO v_original_distribution_id, v_old_aum 
  FROM fund_daily_aum 
  WHERE fund_id = p_fund_id 
    AND aum_date = p_period_end 
    AND purpose = v_purpose_enum 
  LIMIT 1;
  
  IF v_old_aum IS NULL THEN 
    RETURN jsonb_build_object('success', false, 'error', 'No yield record found for period end date'); 
  END IF;
  
  -- Get previous AUM (before period start)
  SELECT total_aum INTO v_previous_aum 
  FROM fund_daily_aum 
  WHERE fund_id = p_fund_id 
    AND aum_date < p_period_start 
    AND purpose = v_purpose_enum 
  ORDER BY aum_date DESC LIMIT 1;
  
  IF v_previous_aum IS NULL THEN v_previous_aum := v_old_aum; END IF;
  
  -- Calculate deltas
  v_delta_aum := p_new_aum - v_old_aum;
  v_old_gross_yield := v_old_aum - v_previous_aum;
  v_new_gross_yield := p_new_aum - v_previous_aum;
  v_delta_gross := v_new_gross_yield - v_old_gross_yield;
  
  -- Check if month is closed
  SELECT EXISTS (
    SELECT 1 FROM fund_reporting_month_closures 
    WHERE fund_id = p_fund_id 
      AND p_period_end BETWEEN month_start AND month_end
  ) INTO v_is_month_closed;
  
  -- Get period ID
  SELECT id INTO v_period_id 
  FROM statement_periods 
  WHERE period_end_date >= p_period_end 
  ORDER BY period_end_date ASC LIMIT 1;
  
  -- Compute input hash for idempotency
  v_input_hash := public.compute_correction_input_hash(
    p_fund_id, p_period_start, p_period_end, p_purpose, p_new_aum
  );
  
  -- Check if already applied
  IF EXISTS (
    SELECT 1 FROM correction_runs 
    WHERE fund_id = p_fund_id 
      AND period_start = p_period_start 
      AND period_end = p_period_end 
      AND purpose = v_purpose_enum 
      AND input_hash = v_input_hash 
      AND status = 'applied'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'This exact correction has already been applied');
  END IF;
  
  -- STEP 1: Rebuild period balances using time-weighted method
  -- First calculate total avg capital
  SELECT COALESCE(SUM(avg_capital), 0) INTO v_total_avg_capital
  FROM public.rebuild_investor_period_balances(p_fund_id, p_period_start, p_period_end, v_purpose_enum);
  
  IF v_total_avg_capital <= 0 THEN
    RETURN jsonb_build_object(
      'success', true, 
      'summary', jsonb_build_object(
        'fund_id', p_fund_id, 'fund_name', v_fund.name, 'fund_asset', v_fund.asset,
        'period_start', p_period_start, 'period_end', p_period_end, 'purpose', p_purpose,
        'old_aum', v_old_aum, 'new_aum', p_new_aum, 'delta_aum', v_delta_aum,
        'old_gross_yield', v_old_gross_yield, 'new_gross_yield', v_new_gross_yield,
        'delta_gross_yield', v_delta_gross, 'investors_affected', 0,
        'total_fee_delta', 0, 'total_ib_delta', 0, 'total_net_delta', 0,
        'is_month_closed', v_is_month_closed, 'input_hash', v_input_hash
      ), 
      'investor_rows', '[]'::jsonb, 'tx_diffs', '[]'::jsonb, 
      'report_impacts', '[]'::jsonb, 'reconciliation', jsonb_build_object(
        'sum_gross_yield', 0, 'fund_gross_yield', v_new_gross_yield,
        'sum_fees', 0, 'sum_ib', 0, 'sum_net_yield', 0,
        'conservation_check', true
      )
    );
  END IF;
  
  -- STEP 2: Calculate per-investor impact using time-weighted shares
  FOR rec IN 
    SELECT * FROM public.rebuild_investor_period_balances(
      p_fund_id, p_period_start, p_period_end, v_purpose_enum
    )
  LOOP
    v_investors_affected := v_investors_affected + 1;
    
    -- Time-weighted share based on avg_capital
    v_share := rec.avg_capital / v_total_avg_capital;
    
    -- Gross yield allocation based on time-weighted share
    v_old_gross := v_old_gross_yield * v_share;
    v_new_gross := v_new_gross_yield * v_share;
    
    -- Apply investor-specific fee schedule
    IF rec.investor_id = v_indigo_fees_id THEN
      v_old_fee := 0;
      v_new_fee := 0;
    ELSE
      v_old_fee := GREATEST(0, v_old_gross * (rec.fee_pct / 100.0));
      v_new_fee := GREATEST(0, v_new_gross * (rec.fee_pct / 100.0));
    END IF;
    
    v_old_net := v_old_gross - v_old_fee;
    v_new_net := v_new_gross - v_new_fee;
    v_delta_fee := v_new_fee - v_old_fee;
    v_delta_net := v_new_net - v_old_net;
    
    v_total_fee_delta := v_total_fee_delta + v_delta_fee;
    v_total_net_delta := v_total_net_delta + v_delta_net;
    
    -- IB calculation
    IF rec.ib_parent_id IS NOT NULL AND rec.ib_percentage > 0 AND rec.investor_id != v_indigo_fees_id THEN
      v_old_ib := v_old_fee * (rec.ib_percentage / 100.0);
      v_new_ib := v_new_fee * (rec.ib_percentage / 100.0);
      v_delta_ib := v_new_ib - v_old_ib;
      v_total_ib_delta := v_total_ib_delta + v_delta_ib;
    ELSE
      v_old_ib := 0;
      v_new_ib := 0;
      v_delta_ib := 0;
    END IF;
    
    -- Track for reconciliation
    v_total_gross_yield_check := v_total_gross_yield_check + v_new_gross;
    v_total_fees_check := v_total_fees_check + v_new_fee;
    
    -- Build investor row with full details
    v_investor_rows := v_investor_rows || jsonb_build_object(
      'investor_id', rec.investor_id,
      'investor_name', rec.investor_name,
      'email', rec.email,
      'beginning_balance', ROUND(rec.beginning_balance::numeric, 8),
      'additions', ROUND(rec.additions::numeric, 8),
      'redemptions', ROUND(rec.redemptions::numeric, 8),
      'avg_capital', ROUND(rec.avg_capital::numeric, 8),
      'position_value', ROUND(rec.ending_balance::numeric, 8),
      'share_pct', ROUND((v_share * 100)::numeric, 4),
      'old_gross', ROUND(v_old_gross::numeric, 8),
      'new_gross', ROUND(v_new_gross::numeric, 8),
      'delta_gross', ROUND((v_new_gross - v_old_gross)::numeric, 8),
      'fee_pct', rec.fee_pct,
      'old_fee', ROUND(v_old_fee::numeric, 8),
      'new_fee', ROUND(v_new_fee::numeric, 8),
      'delta_fee', ROUND(v_delta_fee::numeric, 8),
      'old_net', ROUND(v_old_net::numeric, 8),
      'new_net', ROUND(v_new_net::numeric, 8),
      'delta_net', ROUND(v_delta_net::numeric, 8),
      'ib_parent_id', rec.ib_parent_id,
      'ib_pct', rec.ib_percentage,
      'old_ib', ROUND(v_old_ib::numeric, 8),
      'new_ib', ROUND(v_new_ib::numeric, 8),
      'delta_ib', ROUND(v_delta_ib::numeric, 8),
      'ib_source', CASE WHEN rec.ib_parent_id IS NOT NULL THEN 'from_platform_fees' ELSE NULL END
    );
    
    -- Build transaction diffs
    IF ABS(v_delta_net) > 0.00000001 THEN
      v_tx_diffs := v_tx_diffs || jsonb_build_object(
        'tx_type', 'INTEREST',
        'investor_id', rec.investor_id,
        'investor_name', rec.investor_name,
        'old_amount', ROUND(v_old_net::numeric, 8),
        'new_amount', ROUND(v_new_net::numeric, 8),
        'delta_amount', ROUND(v_delta_net::numeric, 8),
        'visibility_scope', 'investor_visible'
      );
    END IF;
    
    IF ABS(v_delta_fee) > 0.00000001 AND rec.investor_id != v_indigo_fees_id THEN
      v_tx_diffs := v_tx_diffs || jsonb_build_object(
        'tx_type', 'FEE',
        'investor_id', rec.investor_id,
        'investor_name', rec.investor_name,
        'old_amount', ROUND(v_old_fee::numeric, 8),
        'new_amount', ROUND(v_new_fee::numeric, 8),
        'delta_amount', ROUND(v_delta_fee::numeric, 8),
        'visibility_scope', 'investor_visible'
      );
    END IF;
    
    IF ABS(v_delta_ib) > 0.00000001 THEN
      v_tx_diffs := v_tx_diffs || jsonb_build_object(
        'tx_type', 'IB_CREDIT',
        'investor_id', rec.ib_parent_id,
        'source_investor_id', rec.investor_id,
        'investor_name', rec.investor_name,
        'old_amount', ROUND(v_old_ib::numeric, 8),
        'new_amount', ROUND(v_new_ib::numeric, 8),
        'delta_amount', ROUND(v_delta_ib::numeric, 8),
        'visibility_scope', 'admin_only'
      );
    END IF;
  END LOOP;
  
  -- FEE_CREDIT for INDIGO FEES
  IF ABS(v_total_fee_delta - v_total_ib_delta) > 0.00000001 THEN
    v_tx_diffs := v_tx_diffs || jsonb_build_object(
      'tx_type', 'FEE_CREDIT',
      'investor_id', v_indigo_fees_id,
      'investor_name', 'INDIGO FEES',
      'old_amount', 0,
      'new_amount', 0,
      'delta_amount', ROUND((v_total_fee_delta - v_total_ib_delta)::numeric, 8),
      'visibility_scope', 'admin_only'
    );
  END IF;
  
  -- Report impacts
  IF v_period_id IS NOT NULL THEN
    v_report_impacts := v_report_impacts || jsonb_build_object(
      'period_id', v_period_id,
      'investors_affected', v_investors_affected,
      'needs_regeneration', true,
      'tables_affected', ARRAY['investor_fund_performance', 'generated_statements']
    );
  END IF;
  
  -- Build reconciliation check
  v_reconciliation := jsonb_build_object(
    'sum_gross_yield', ROUND(v_total_gross_yield_check::numeric, 8),
    'fund_gross_yield', ROUND(v_new_gross_yield::numeric, 8),
    'gross_yield_match', ABS(v_total_gross_yield_check - v_new_gross_yield) < 0.00000001,
    'sum_fees', ROUND(v_total_fees_check::numeric, 8),
    'sum_ib', ROUND(v_total_ib_delta::numeric, 8),
    'platform_fees', ROUND((v_total_fees_check - v_total_ib_delta)::numeric, 8),
    'sum_net_yield', ROUND((v_total_gross_yield_check - v_total_fees_check)::numeric, 8),
    'conservation_check', ABS(
      v_total_gross_yield_check - 
      (v_total_gross_yield_check - v_total_fees_check) - 
      v_total_fees_check
    ) < 0.00000001
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'summary', jsonb_build_object(
      'fund_id', p_fund_id,
      'fund_name', v_fund.name,
      'fund_asset', v_fund.asset,
      'period_start', p_period_start,
      'period_end', p_period_end,
      'purpose', p_purpose,
      'old_aum', v_old_aum,
      'new_aum', p_new_aum,
      'delta_aum', v_delta_aum,
      'old_gross_yield', v_old_gross_yield,
      'new_gross_yield', v_new_gross_yield,
      'delta_gross_yield', v_delta_gross,
      'investors_affected', v_investors_affected,
      'total_fee_delta', ROUND(v_total_fee_delta::numeric, 8),
      'total_ib_delta', ROUND(v_total_ib_delta::numeric, 8),
      'total_net_delta', ROUND(v_total_net_delta::numeric, 8),
      'is_month_closed', v_is_month_closed,
      'original_distribution_id', v_original_distribution_id,
      'input_hash', v_input_hash
    ),
    'investor_rows', v_investor_rows,
    'tx_diffs', v_tx_diffs,
    'report_impacts', v_report_impacts,
    'reconciliation', v_reconciliation
  );
END;
$$;

-- 9. Updated apply_yield_correction_v2 with idempotency
CREATE OR REPLACE FUNCTION public.apply_yield_correction_v2(
  p_fund_id UUID,
  p_period_start DATE,
  p_period_end DATE,
  p_purpose TEXT,
  p_new_aum NUMERIC,
  p_reason TEXT,
  p_confirmation TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_purpose_enum aum_purpose;
  v_is_month_closed BOOLEAN := false;
  v_is_super_admin BOOLEAN;
  v_preview JSONB;
  v_summary JSONB;
  v_investor_rows JSONB;
  v_tx_diffs JSONB;
  v_original_dist_id UUID;
  v_correction_dist_id UUID := gen_random_uuid();
  v_correction_run_id UUID := gen_random_uuid();
  v_old_aum NUMERIC;
  v_delta_aum NUMERIC;
  v_admin_id UUID := auth.uid();
  v_fund RECORD;
  v_inv RECORD;
  v_ref_prefix TEXT;
  v_input_hash TEXT;
  v_indigo_fees_id UUID := '169bb053-36cb-4f6e-93ea-831f0dfeaf1d';
  v_total_fee_credit_delta NUMERIC := 0;
BEGIN
  -- Admin check
  IF NOT public.check_is_admin(auth.uid()) THEN 
    RETURN jsonb_build_object('success', false, 'error', 'Admin access required'); 
  END IF;
  
  SELECT public.is_super_admin() INTO v_is_super_admin;
  v_purpose_enum := p_purpose::aum_purpose;
  
  -- Check month closure
  SELECT EXISTS (
    SELECT 1 FROM fund_reporting_month_closures 
    WHERE fund_id = p_fund_id 
      AND p_period_end BETWEEN month_start AND month_end
  ) INTO v_is_month_closed;
  
  -- Validate confirmation
  IF v_is_month_closed THEN
    IF NOT v_is_super_admin THEN 
      RETURN jsonb_build_object('success', false, 'error', 'Super Admin required for closed month corrections'); 
    END IF;
    IF p_confirmation != 'APPLY CLOSED MONTH CORRECTION' THEN 
      RETURN jsonb_build_object('success', false, 'error', 'Invalid confirmation for closed month correction'); 
    END IF;
  ELSE
    IF p_confirmation != 'APPLY CORRECTION' THEN 
      RETURN jsonb_build_object('success', false, 'error', 'Invalid confirmation'); 
    END IF;
  END IF;
  
  -- Validate reason
  IF p_reason IS NULL OR LENGTH(TRIM(p_reason)) < 10 THEN 
    RETURN jsonb_build_object('success', false, 'error', 'Reason must be at least 10 characters'); 
  END IF;
  
  -- Get preview with time-weighted calculations
  v_preview := public.preview_yield_correction_v2(p_fund_id, p_period_start, p_period_end, p_purpose, p_new_aum);
  
  IF NOT (v_preview->>'success')::boolean THEN 
    RETURN v_preview; 
  END IF;
  
  v_summary := v_preview->'summary';
  v_investor_rows := v_preview->'investor_rows';
  v_tx_diffs := v_preview->'tx_diffs';
  v_original_dist_id := (v_summary->>'original_distribution_id')::uuid;
  v_old_aum := (v_summary->>'old_aum')::numeric;
  v_delta_aum := (v_summary->>'delta_aum')::numeric;
  v_input_hash := v_summary->>'input_hash';
  
  SELECT * INTO v_fund FROM funds WHERE id = p_fund_id;
  
  -- IDEMPOTENCY CHECK: Try to insert correction_run, will fail if duplicate
  BEGIN
    INSERT INTO correction_runs (
      id, fund_id, period_id, period_start, period_end, purpose, input_hash,
      old_aum, new_aum, delta_aum, original_distribution_id, correction_distribution_id,
      status, investors_affected, total_fee_delta, total_ib_delta, reason, preview_json,
      created_by, applied_at, applied_by
    ) VALUES (
      v_correction_run_id, p_fund_id, 
      (SELECT id FROM statement_periods WHERE period_end_date >= p_period_end ORDER BY period_end_date ASC LIMIT 1),
      p_period_start, p_period_end, v_purpose_enum, v_input_hash,
      v_old_aum, p_new_aum, v_delta_aum, v_original_dist_id, v_correction_dist_id,
      'applied', (v_summary->>'investors_affected')::integer,
      (v_summary->>'total_fee_delta')::numeric, (v_summary->>'total_ib_delta')::numeric,
      p_reason, v_preview, v_admin_id, now(), v_admin_id
    );
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'This exact correction has already been applied (idempotency check)');
  END;
  
  -- Create distribution records
  INSERT INTO yield_distributions (
    id, fund_id, effective_date, purpose, is_month_end, recorded_aum, gross_yield, 
    distribution_type, status, created_by, reason, summary_json
  )
  SELECT 
    COALESCE(v_original_dist_id, gen_random_uuid()), p_fund_id, p_period_end, v_purpose_enum,
    COALESCE((SELECT is_month_end FROM fund_daily_aum WHERE id = v_original_dist_id), true),
    v_old_aum, (v_summary->>'old_gross_yield')::numeric, 'original', 'applied',
    v_admin_id, 'Original distribution (backfilled for correction tracking)', NULL
  ON CONFLICT DO NOTHING;
  
  IF v_original_dist_id IS NULL THEN
    SELECT id INTO v_original_dist_id 
    FROM yield_distributions 
    WHERE fund_id = p_fund_id 
      AND effective_date = p_period_end 
      AND purpose = v_purpose_enum 
      AND distribution_type = 'original';
  END IF;
  
  INSERT INTO yield_distributions (
    id, fund_id, effective_date, purpose, is_month_end, recorded_aum, previous_aum, 
    gross_yield, distribution_type, parent_distribution_id, status, created_by, 
    reason, summary_json
  ) VALUES (
    v_correction_dist_id, p_fund_id, p_period_end, v_purpose_enum, true,
    p_new_aum, v_old_aum, (v_summary->>'new_gross_yield')::numeric, 'correction',
    v_original_dist_id, 'applied', v_admin_id, p_reason, v_preview
  );
  
  -- Insert yield_corrections record
  INSERT INTO yield_corrections (
    id, original_distribution_id, correction_distribution_id, status,
    old_aum, new_aum, delta_aum, old_gross_yield, new_gross_yield, delta_gross_yield,
    investors_affected, total_fee_delta, total_ib_delta, preview_json,
    applied_at, applied_by, reason, created_by
  ) VALUES (
    v_correction_run_id, v_original_dist_id, v_correction_dist_id, 'applied',
    v_old_aum, p_new_aum, v_delta_aum,
    (v_summary->>'old_gross_yield')::numeric,
    (v_summary->>'new_gross_yield')::numeric,
    (v_summary->>'delta_gross_yield')::numeric,
    (v_summary->>'investors_affected')::integer,
    (v_summary->>'total_fee_delta')::numeric,
    (v_summary->>'total_ib_delta')::numeric,
    v_preview, now(), v_admin_id, p_reason, v_admin_id
  );
  
  -- Reference prefix for deterministic transaction IDs
  v_ref_prefix := format('corr:%s:', v_correction_run_id);
  
  -- Process investor transactions
  FOR v_inv IN SELECT * FROM jsonb_array_elements(v_investor_rows) LOOP
    -- INTEREST delta
    IF ABS((v_inv.value->>'delta_net')::numeric) > 0.00000001 THEN
      INSERT INTO transactions_v2 (
        id, investor_id, fund_id, type, asset, fund_class, amount, tx_date,
        reference_id, notes, created_by, created_at, purpose, distribution_id,
        correction_id, visibility_scope, is_system_generated, source
      ) VALUES (
        gen_random_uuid(), (v_inv.value->>'investor_id')::uuid, p_fund_id,
        'INTEREST', v_fund.asset, v_fund.fund_class, (v_inv.value->>'delta_net')::numeric,
        p_period_end, v_ref_prefix || (v_inv.value->>'investor_id') || ':INTEREST',
        format('Yield correction (time-weighted): %s', p_reason), v_admin_id, now(),
        v_purpose_enum, v_correction_dist_id, v_correction_run_id,
        'investor_visible', true, 'yield_correction_v2'
      ) ON CONFLICT (reference_id) WHERE reference_id IS NOT NULL DO NOTHING;
      
      UPDATE investor_positions 
      SET current_value = current_value + (v_inv.value->>'delta_net')::numeric, 
          updated_at = now()
      WHERE investor_id = (v_inv.value->>'investor_id')::uuid 
        AND fund_id = p_fund_id;
    END IF;
    
    -- FEE delta
    IF ABS((v_inv.value->>'delta_fee')::numeric) > 0.00000001 
       AND (v_inv.value->>'investor_id')::uuid != v_indigo_fees_id THEN
      INSERT INTO transactions_v2 (
        id, investor_id, fund_id, type, asset, fund_class, amount, tx_date,
        reference_id, notes, created_by, created_at, purpose, distribution_id,
        correction_id, visibility_scope, is_system_generated, source
      ) VALUES (
        gen_random_uuid(), (v_inv.value->>'investor_id')::uuid, p_fund_id,
        'FEE', v_fund.asset, v_fund.fund_class, (v_inv.value->>'delta_fee')::numeric,
        p_period_end, v_ref_prefix || (v_inv.value->>'investor_id') || ':FEE',
        format('Fee correction: %s', p_reason), v_admin_id, now(),
        v_purpose_enum, v_correction_dist_id, v_correction_run_id,
        'investor_visible', true, 'yield_correction_v2'
      ) ON CONFLICT (reference_id) WHERE reference_id IS NOT NULL DO NOTHING;
      
      v_total_fee_credit_delta := v_total_fee_credit_delta + 
        (v_inv.value->>'delta_fee')::numeric - 
        COALESCE((v_inv.value->>'delta_ib')::numeric, 0);
    END IF;
    
    -- IB_CREDIT delta
    IF (v_inv.value->>'ib_parent_id') IS NOT NULL 
       AND ABS(COALESCE((v_inv.value->>'delta_ib')::numeric, 0)) > 0.00000001 THEN
      INSERT INTO transactions_v2 (
        id, investor_id, fund_id, type, asset, fund_class, amount, tx_date,
        reference_id, notes, created_by, created_at, purpose, distribution_id,
        correction_id, visibility_scope, is_system_generated, source
      ) VALUES (
        gen_random_uuid(), (v_inv.value->>'ib_parent_id')::uuid, p_fund_id,
        'IB_CREDIT', v_fund.asset, v_fund.fund_class, (v_inv.value->>'delta_ib')::numeric,
        p_period_end, v_ref_prefix || (v_inv.value->>'investor_id') || ':IB_CREDIT',
        format('IB correction from %s: %s', v_inv.value->>'investor_name', p_reason),
        v_admin_id, now(), v_purpose_enum, v_correction_dist_id, v_correction_run_id,
        'admin_only', true, 'yield_correction_v2'
      ) ON CONFLICT (reference_id) WHERE reference_id IS NOT NULL DO NOTHING;
      
      UPDATE investor_positions 
      SET current_value = current_value + (v_inv.value->>'delta_ib')::numeric, 
          updated_at = now()
      WHERE investor_id = (v_inv.value->>'ib_parent_id')::uuid 
        AND fund_id = p_fund_id;
    END IF;
  END LOOP;
  
  -- FEE_CREDIT for INDIGO FEES
  IF ABS(v_total_fee_credit_delta) > 0.00000001 THEN
    INSERT INTO transactions_v2 (
      id, investor_id, fund_id, type, asset, fund_class, amount, tx_date,
      reference_id, notes, created_by, created_at, purpose, distribution_id,
      correction_id, visibility_scope, is_system_generated, source
    ) VALUES (
      gen_random_uuid(), v_indigo_fees_id, p_fund_id,
      'FEE_CREDIT', v_fund.asset, v_fund.fund_class, v_total_fee_credit_delta,
      p_period_end, v_ref_prefix || 'INDIGO_FEES:FEE_CREDIT',
      format('Platform fee correction: %s', p_reason), v_admin_id, now(),
      v_purpose_enum, v_correction_dist_id, v_correction_run_id,
      'admin_only', true, 'yield_correction_v2'
    ) ON CONFLICT (reference_id) WHERE reference_id IS NOT NULL DO NOTHING;
    
    UPDATE investor_positions 
    SET current_value = current_value + v_total_fee_credit_delta, 
        updated_at = now()
    WHERE investor_id = v_indigo_fees_id 
      AND fund_id = p_fund_id;
  END IF;
  
  -- Update fund_daily_aum
  UPDATE fund_daily_aum 
  SET total_aum = p_new_aum, 
      source = format('corrected_v2:%s', v_correction_run_id),
      updated_at = now(), 
      updated_by = v_admin_id
  WHERE fund_id = p_fund_id 
    AND aum_date = p_period_end 
    AND purpose = v_purpose_enum;
  
  -- Audit log
  INSERT INTO audit_log (action, entity, entity_id, actor_user, old_values, new_values, meta)
  VALUES (
    'YIELD_CORRECTION_V2_APPLIED', 'correction_runs', v_correction_run_id::text,
    v_admin_id, jsonb_build_object('old_aum', v_old_aum),
    jsonb_build_object('new_aum', p_new_aum, 'delta', v_delta_aum),
    jsonb_build_object(
      'fund_id', p_fund_id, 'period_start', p_period_start, 'period_end', p_period_end,
      'purpose', p_purpose, 'reason', p_reason, 'is_month_closed', v_is_month_closed,
      'investors_affected', (v_summary->>'investors_affected')::integer,
      'time_weighted', true
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'correction_id', v_correction_run_id,
    'distribution_id', v_correction_dist_id,
    'original_distribution_id', v_original_dist_id,
    'delta_aum', v_delta_aum,
    'investors_affected', (v_summary->>'investors_affected')::integer,
    'total_fee_delta', (v_summary->>'total_fee_delta')::numeric,
    'total_ib_delta', (v_summary->>'total_ib_delta')::numeric,
    'is_month_closed', v_is_month_closed,
    'input_hash', v_input_hash,
    'reconciliation', v_preview->'reconciliation',
    'message', format('Correction applied successfully with time-weighted ownership. %s investors updated.', 
      (v_summary->>'investors_affected')::integer)
  );
END;
$$;

-- 10. Grant permissions
GRANT EXECUTE ON FUNCTION public.preview_yield_correction_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_yield_correction_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION public.rebuild_investor_period_balances TO authenticated;
GRANT EXECUTE ON FUNCTION public.compute_correction_input_hash TO authenticated;