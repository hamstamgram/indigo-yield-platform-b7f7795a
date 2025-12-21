-- =====================================================
-- Yield Correction System: Database Schema
-- =====================================================

-- 1. Create yield_distributions table (tracks all original and correction distributions)
CREATE TABLE IF NOT EXISTS public.yield_distributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id UUID NOT NULL REFERENCES public.funds(id),
  effective_date DATE NOT NULL,
  purpose public.aum_purpose NOT NULL,
  is_month_end BOOLEAN NOT NULL DEFAULT false,
  recorded_aum NUMERIC NOT NULL,
  previous_aum NUMERIC,
  gross_yield NUMERIC NOT NULL DEFAULT 0,
  distribution_type TEXT NOT NULL CHECK (distribution_type IN ('original', 'correction')),
  parent_distribution_id UUID REFERENCES public.yield_distributions(id),
  status TEXT NOT NULL DEFAULT 'applied' CHECK (status IN ('draft', 'applied', 'rolled_back')),
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reason TEXT,
  summary_json JSONB,
  
  CONSTRAINT chk_correction_has_parent 
    CHECK (distribution_type = 'original' OR parent_distribution_id IS NOT NULL),
  CONSTRAINT chk_correction_has_reason
    CHECK (distribution_type = 'original' OR reason IS NOT NULL)
);

-- Unique constraint for original distributions only
CREATE UNIQUE INDEX IF NOT EXISTS idx_yield_distributions_unique_original 
ON public.yield_distributions (fund_id, effective_date, purpose)
WHERE distribution_type = 'original' AND status = 'applied';

-- 2. Create yield_corrections table (links original to correction with preview data)
CREATE TABLE IF NOT EXISTS public.yield_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_distribution_id UUID NOT NULL REFERENCES public.yield_distributions(id),
  correction_distribution_id UUID NOT NULL REFERENCES public.yield_distributions(id),
  status TEXT NOT NULL DEFAULT 'previewed' CHECK (status IN ('previewed', 'applied', 'rolled_back')),
  old_aum NUMERIC NOT NULL,
  new_aum NUMERIC NOT NULL,
  delta_aum NUMERIC NOT NULL,
  old_gross_yield NUMERIC NOT NULL DEFAULT 0,
  new_gross_yield NUMERIC NOT NULL DEFAULT 0,
  delta_gross_yield NUMERIC NOT NULL DEFAULT 0,
  investors_affected INTEGER NOT NULL DEFAULT 0,
  total_fee_delta NUMERIC NOT NULL DEFAULT 0,
  total_ib_delta NUMERIC NOT NULL DEFAULT 0,
  preview_json JSONB NOT NULL,
  applied_at TIMESTAMPTZ,
  applied_by UUID,
  rolled_back_at TIMESTAMPTZ,
  rolled_back_by UUID,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  
  CONSTRAINT unique_correction_pair UNIQUE (original_distribution_id, correction_distribution_id)
);

-- 3. Add distribution_id and correction_id columns to transactions_v2 if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'transactions_v2' AND column_name = 'distribution_id') THEN
    ALTER TABLE public.transactions_v2 ADD COLUMN distribution_id UUID;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'transactions_v2' AND column_name = 'correction_id') THEN
    ALTER TABLE public.transactions_v2 ADD COLUMN correction_id UUID;
  END IF;
END $$;

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_yield_distributions_fund_date 
ON public.yield_distributions(fund_id, effective_date, purpose);

CREATE INDEX IF NOT EXISTS idx_yield_distributions_parent 
ON public.yield_distributions(parent_distribution_id) 
WHERE parent_distribution_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_yield_corrections_original 
ON public.yield_corrections(original_distribution_id);

CREATE INDEX IF NOT EXISTS idx_yield_corrections_status 
ON public.yield_corrections(status);

CREATE INDEX IF NOT EXISTS idx_transactions_v2_distribution 
ON public.transactions_v2(distribution_id) 
WHERE distribution_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_v2_correction 
ON public.transactions_v2(correction_id) 
WHERE correction_id IS NOT NULL;

-- 5. Enable RLS
ALTER TABLE public.yield_distributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yield_corrections ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for yield_distributions
CREATE POLICY "Admins can view all yield distributions" 
ON public.yield_distributions FOR SELECT 
USING (public.check_is_admin(auth.uid()));

CREATE POLICY "Admins can insert yield distributions" 
ON public.yield_distributions FOR INSERT 
WITH CHECK (public.check_is_admin(auth.uid()));

CREATE POLICY "Admins can update yield distributions" 
ON public.yield_distributions FOR UPDATE 
USING (public.check_is_admin(auth.uid()));

-- 7. RLS Policies for yield_corrections
CREATE POLICY "Admins can view all yield corrections" 
ON public.yield_corrections FOR SELECT 
USING (public.check_is_admin(auth.uid()));

CREATE POLICY "Admins can insert yield corrections" 
ON public.yield_corrections FOR INSERT 
WITH CHECK (public.check_is_admin(auth.uid()));

CREATE POLICY "Admins can update yield corrections" 
ON public.yield_corrections FOR UPDATE 
USING (public.check_is_admin(auth.uid()));

-- =====================================================
-- Preview Yield Correction RPC
-- Read-only function that calculates impact without writing
-- =====================================================

CREATE OR REPLACE FUNCTION public.preview_yield_correction(
  p_fund_id UUID,
  p_date DATE,
  p_purpose TEXT,
  p_new_aum NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_purpose_enum aum_purpose;
  v_fund RECORD;
  v_old_aum NUMERIC;
  v_previous_aum NUMERIC;
  v_old_gross_yield NUMERIC;
  v_new_gross_yield NUMERIC;
  v_delta_aum NUMERIC;
  v_delta_gross NUMERIC;
  v_total_positions NUMERIC;
  v_investors_affected INTEGER := 0;
  v_total_fee_delta NUMERIC := 0;
  v_total_ib_delta NUMERIC := 0;
  v_total_net_delta NUMERIC := 0;
  v_indigo_fees_id UUID := '169bb053-36cb-4f6e-93ea-831f0dfeaf1d';
  v_investor_rows JSONB := '[]'::jsonb;
  v_tx_diffs JSONB := '[]'::jsonb;
  v_report_impacts JSONB := '[]'::jsonb;
  v_is_month_closed BOOLEAN := false;
  v_original_distribution_id UUID;
  rec RECORD;
  v_share NUMERIC;
  v_old_gross NUMERIC;
  v_new_gross NUMERIC;
  v_old_fee_pct NUMERIC;
  v_new_fee_pct NUMERIC;
  v_old_fee NUMERIC;
  v_new_fee NUMERIC;
  v_old_net NUMERIC;
  v_new_net NUMERIC;
  v_delta_fee NUMERIC;
  v_delta_net NUMERIC;
  v_ib_parent_id UUID;
  v_ib_pct NUMERIC;
  v_old_ib NUMERIC;
  v_new_ib NUMERIC;
  v_delta_ib NUMERIC;
  v_period_id UUID;
BEGIN
  -- Validate admin access
  IF NOT public.check_is_admin(auth.uid()) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin access required');
  END IF;
  
  -- Cast purpose
  v_purpose_enum := p_purpose::aum_purpose;
  
  -- Get fund details
  SELECT * INTO v_fund FROM funds WHERE id = p_fund_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Fund not found');
  END IF;
  
  -- Get current recorded AUM for this date
  SELECT id, total_aum INTO v_original_distribution_id, v_old_aum
  FROM fund_daily_aum
  WHERE fund_id = p_fund_id::text AND aum_date = p_date AND purpose = v_purpose_enum
  LIMIT 1;
  
  IF v_old_aum IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No yield record found for this date');
  END IF;
  
  -- Get previous AUM (before this date) to calculate gross yields
  SELECT total_aum INTO v_previous_aum
  FROM fund_daily_aum
  WHERE fund_id = p_fund_id::text AND aum_date < p_date AND purpose = v_purpose_enum
  ORDER BY aum_date DESC
  LIMIT 1;
  
  IF v_previous_aum IS NULL THEN
    v_previous_aum := v_old_aum; -- First entry, no previous
  END IF;
  
  -- Calculate deltas
  v_delta_aum := p_new_aum - v_old_aum;
  v_old_gross_yield := v_old_aum - v_previous_aum;
  v_new_gross_yield := p_new_aum - v_previous_aum;
  v_delta_gross := v_new_gross_yield - v_old_gross_yield;
  
  -- Check if month is closed
  SELECT EXISTS (
    SELECT 1 FROM fund_reporting_month_closures
    WHERE fund_id = p_fund_id 
      AND p_date BETWEEN month_start AND month_end
  ) INTO v_is_month_closed;
  
  -- Get statement period for report impacts
  SELECT id INTO v_period_id
  FROM statement_periods
  WHERE period_end_date >= p_date
  ORDER BY period_end_date ASC
  LIMIT 1;
  
  -- Get total positions to calculate shares
  SELECT COALESCE(SUM(current_value), 0) INTO v_total_positions
  FROM investor_positions
  WHERE fund_id = p_fund_id AND current_value > 0;
  
  IF v_total_positions <= 0 THEN
    RETURN jsonb_build_object(
      'success', true,
      'summary', jsonb_build_object(
        'fund_id', p_fund_id,
        'fund_name', v_fund.name,
        'fund_asset', v_fund.asset,
        'effective_date', p_date,
        'purpose', p_purpose,
        'old_aum', v_old_aum,
        'new_aum', p_new_aum,
        'delta_aum', v_delta_aum,
        'old_gross_yield', v_old_gross_yield,
        'new_gross_yield', v_new_gross_yield,
        'delta_gross_yield', v_delta_gross,
        'investors_affected', 0,
        'total_fee_delta', 0,
        'total_ib_delta', 0,
        'total_net_delta', 0,
        'is_month_closed', v_is_month_closed
      ),
      'investor_rows', '[]'::jsonb,
      'tx_diffs', '[]'::jsonb,
      'report_impacts', '[]'::jsonb
    );
  END IF;
  
  -- Calculate per-investor impact
  FOR rec IN 
    SELECT 
      ip.investor_id,
      ip.current_value,
      p.first_name,
      p.last_name,
      p.email,
      p.ib_parent_id,
      p.ib_percentage
    FROM investor_positions ip
    JOIN profiles p ON p.id = ip.investor_id
    WHERE ip.fund_id = p_fund_id AND ip.current_value > 0
  LOOP
    v_investors_affected := v_investors_affected + 1;
    
    -- Calculate investor's share
    v_share := rec.current_value / v_total_positions;
    
    -- Old and new gross for this investor
    v_old_gross := v_old_gross_yield * v_share;
    v_new_gross := v_new_gross_yield * v_share;
    
    -- Get fee percentage as-of effective date (time-travel)
    SELECT COALESCE(fee_pct, 20) INTO v_old_fee_pct
    FROM investor_fee_schedule
    WHERE investor_id = rec.investor_id
      AND (fund_id = p_fund_id OR fund_id IS NULL)
      AND effective_date <= p_date
    ORDER BY effective_date DESC
    LIMIT 1;
    
    IF v_old_fee_pct IS NULL THEN
      v_old_fee_pct := 20;
    END IF;
    
    v_new_fee_pct := v_old_fee_pct; -- Same fee schedule for correction
    
    -- Skip fee for INDIGO FEES account
    IF rec.investor_id = v_indigo_fees_id THEN
      v_old_fee := 0;
      v_new_fee := 0;
    ELSE
      v_old_fee := GREATEST(0, v_old_gross * (v_old_fee_pct / 100.0));
      v_new_fee := GREATEST(0, v_new_gross * (v_new_fee_pct / 100.0));
    END IF;
    
    v_old_net := v_old_gross - v_old_fee;
    v_new_net := v_new_gross - v_new_fee;
    v_delta_fee := v_new_fee - v_old_fee;
    v_delta_net := v_new_net - v_old_net;
    
    v_total_fee_delta := v_total_fee_delta + v_delta_fee;
    v_total_net_delta := v_total_net_delta + v_delta_net;
    
    -- IB calculation
    v_ib_parent_id := rec.ib_parent_id;
    v_ib_pct := COALESCE(rec.ib_percentage, 0);
    
    IF v_ib_parent_id IS NOT NULL AND v_ib_pct > 0 AND rec.investor_id != v_indigo_fees_id THEN
      v_old_ib := v_old_fee * (v_ib_pct / 100.0);
      v_new_ib := v_new_fee * (v_ib_pct / 100.0);
      v_delta_ib := v_new_ib - v_old_ib;
      v_total_ib_delta := v_total_ib_delta + v_delta_ib;
    ELSE
      v_old_ib := 0;
      v_new_ib := 0;
      v_delta_ib := 0;
    END IF;
    
    -- Build investor row
    v_investor_rows := v_investor_rows || jsonb_build_object(
      'investor_id', rec.investor_id,
      'investor_name', COALESCE(rec.first_name || ' ' || COALESCE(rec.last_name, ''), rec.email),
      'email', rec.email,
      'position_value', rec.current_value,
      'share_pct', ROUND((v_share * 100)::numeric, 4),
      'old_gross', ROUND(v_old_gross::numeric, 8),
      'new_gross', ROUND(v_new_gross::numeric, 8),
      'delta_gross', ROUND((v_new_gross - v_old_gross)::numeric, 8),
      'fee_pct', v_old_fee_pct,
      'old_fee', ROUND(v_old_fee::numeric, 8),
      'new_fee', ROUND(v_new_fee::numeric, 8),
      'delta_fee', ROUND(v_delta_fee::numeric, 8),
      'old_net', ROUND(v_old_net::numeric, 8),
      'new_net', ROUND(v_new_net::numeric, 8),
      'delta_net', ROUND(v_delta_net::numeric, 8),
      'ib_parent_id', v_ib_parent_id,
      'ib_pct', v_ib_pct,
      'old_ib', ROUND(v_old_ib::numeric, 8),
      'new_ib', ROUND(v_new_ib::numeric, 8),
      'delta_ib', ROUND(v_delta_ib::numeric, 8),
      'ib_source', CASE WHEN v_ib_parent_id IS NOT NULL THEN 'from_platform_fees' ELSE NULL END
    );
    
    -- Build transaction diffs for this investor
    IF ABS(v_delta_net) > 0.00000001 THEN
      v_tx_diffs := v_tx_diffs || jsonb_build_object(
        'tx_type', 'INTEREST',
        'investor_id', rec.investor_id,
        'investor_name', COALESCE(rec.first_name || ' ' || COALESCE(rec.last_name, ''), rec.email),
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
        'investor_name', COALESCE(rec.first_name || ' ' || COALESCE(rec.last_name, ''), rec.email),
        'old_amount', ROUND(v_old_fee::numeric, 8),
        'new_amount', ROUND(v_new_fee::numeric, 8),
        'delta_amount', ROUND(v_delta_fee::numeric, 8),
        'visibility_scope', 'investor_visible'
      );
    END IF;
    
    IF ABS(v_delta_ib) > 0.00000001 THEN
      v_tx_diffs := v_tx_diffs || jsonb_build_object(
        'tx_type', 'IB_CREDIT',
        'investor_id', v_ib_parent_id,
        'source_investor_id', rec.investor_id,
        'old_amount', ROUND(v_old_ib::numeric, 8),
        'new_amount', ROUND(v_new_ib::numeric, 8),
        'delta_amount', ROUND(v_delta_ib::numeric, 8),
        'visibility_scope', 'admin_only'
      );
    END IF;
  END LOOP;
  
  -- Add FEE_CREDIT transaction diff for INDIGO FEES
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
  
  -- Build report impacts
  IF v_period_id IS NOT NULL THEN
    v_report_impacts := v_report_impacts || jsonb_build_object(
      'period_id', v_period_id,
      'investors_affected', v_investors_affected,
      'needs_regeneration', true,
      'tables_affected', ARRAY['investor_fund_performance', 'generated_statements']
    );
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'summary', jsonb_build_object(
      'fund_id', p_fund_id,
      'fund_name', v_fund.name,
      'fund_asset', v_fund.asset,
      'effective_date', p_date,
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
      'original_distribution_id', v_original_distribution_id
    ),
    'investor_rows', v_investor_rows,
    'tx_diffs', v_tx_diffs,
    'report_impacts', v_report_impacts
  );
END;
$$;

-- =====================================================
-- Apply Yield Correction RPC
-- Posts delta transactions and updates positions
-- =====================================================

CREATE OR REPLACE FUNCTION public.apply_yield_correction(
  p_fund_id UUID,
  p_date DATE,
  p_purpose TEXT,
  p_new_aum NUMERIC,
  p_reason TEXT,
  p_confirmation TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
  v_correction_id UUID := gen_random_uuid();
  v_old_aum NUMERIC;
  v_delta_aum NUMERIC;
  v_admin_id UUID := auth.uid();
  v_fund RECORD;
  v_tx RECORD;
  v_inv RECORD;
  v_ref_prefix TEXT;
  v_tx_id UUID;
  v_indigo_fees_id UUID := '169bb053-36cb-4f6e-93ea-831f0dfeaf1d';
  v_total_fee_credit_delta NUMERIC := 0;
BEGIN
  -- Validate admin access
  IF NOT public.check_is_admin(auth.uid()) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin access required');
  END IF;
  
  -- Check super admin for closed months
  SELECT public.is_super_admin() INTO v_is_super_admin;
  
  v_purpose_enum := p_purpose::aum_purpose;
  
  -- Check if month is closed
  SELECT EXISTS (
    SELECT 1 FROM fund_reporting_month_closures
    WHERE fund_id = p_fund_id 
      AND p_date BETWEEN month_start AND month_end
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
  
  -- Get preview (reuse same logic)
  v_preview := public.preview_yield_correction(p_fund_id, p_date, p_purpose, p_new_aum);
  
  IF NOT (v_preview->>'success')::boolean THEN
    RETURN v_preview;
  END IF;
  
  v_summary := v_preview->'summary';
  v_investor_rows := v_preview->'investor_rows';
  v_tx_diffs := v_preview->'tx_diffs';
  v_original_dist_id := (v_summary->>'original_distribution_id')::uuid;
  v_old_aum := (v_summary->>'old_aum')::numeric;
  v_delta_aum := (v_summary->>'delta_aum')::numeric;
  
  -- Get fund details
  SELECT * INTO v_fund FROM funds WHERE id = p_fund_id;
  
  -- Check for existing correction with same parameters (idempotency)
  IF EXISTS (
    SELECT 1 FROM yield_corrections yc
    JOIN yield_distributions yd ON yd.id = yc.correction_distribution_id
    WHERE yd.fund_id = p_fund_id 
      AND yd.effective_date = p_date 
      AND yd.purpose = v_purpose_enum
      AND yc.new_aum = p_new_aum
      AND yc.status = 'applied'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'This correction has already been applied');
  END IF;
  
  -- Create yield_distributions record for original if not exists
  INSERT INTO yield_distributions (
    id, fund_id, effective_date, purpose, is_month_end, recorded_aum,
    gross_yield, distribution_type, status, created_by, reason, summary_json
  )
  SELECT 
    COALESCE(v_original_dist_id, gen_random_uuid()),
    p_fund_id,
    p_date,
    v_purpose_enum,
    COALESCE((SELECT is_month_end FROM fund_daily_aum WHERE id = v_original_dist_id::text), false),
    v_old_aum,
    (v_summary->>'old_gross_yield')::numeric,
    'original',
    'applied',
    v_admin_id,
    'Original distribution (backfilled for correction tracking)',
    NULL
  ON CONFLICT DO NOTHING;
  
  -- Get the original distribution id if we just created it
  IF v_original_dist_id IS NULL THEN
    SELECT id INTO v_original_dist_id
    FROM yield_distributions
    WHERE fund_id = p_fund_id AND effective_date = p_date AND purpose = v_purpose_enum AND distribution_type = 'original';
  END IF;
  
  -- Create yield_distributions record for correction
  INSERT INTO yield_distributions (
    id, fund_id, effective_date, purpose, is_month_end, recorded_aum,
    previous_aum, gross_yield, distribution_type, parent_distribution_id,
    status, created_by, reason, summary_json
  ) VALUES (
    v_correction_dist_id,
    p_fund_id,
    p_date,
    v_purpose_enum,
    COALESCE((v_summary->>'is_month_end')::boolean, false),
    p_new_aum,
    v_old_aum,
    (v_summary->>'new_gross_yield')::numeric,
    'correction',
    v_original_dist_id,
    'applied',
    v_admin_id,
    p_reason,
    v_preview
  );
  
  -- Create yield_corrections record
  INSERT INTO yield_corrections (
    id, original_distribution_id, correction_distribution_id,
    status, old_aum, new_aum, delta_aum,
    old_gross_yield, new_gross_yield, delta_gross_yield,
    investors_affected, total_fee_delta, total_ib_delta,
    preview_json, applied_at, applied_by, reason, created_by
  ) VALUES (
    v_correction_id,
    v_original_dist_id,
    v_correction_dist_id,
    'applied',
    v_old_aum,
    p_new_aum,
    v_delta_aum,
    (v_summary->>'old_gross_yield')::numeric,
    (v_summary->>'new_gross_yield')::numeric,
    (v_summary->>'delta_gross_yield')::numeric,
    (v_summary->>'investors_affected')::integer,
    (v_summary->>'total_fee_delta')::numeric,
    (v_summary->>'total_ib_delta')::numeric,
    v_preview,
    now(),
    v_admin_id,
    p_reason,
    v_admin_id
  );
  
  -- Reference prefix for idempotency
  v_ref_prefix := format('correction:%s:', v_correction_id);
  
  -- Post delta transactions for each investor
  FOR v_inv IN SELECT * FROM jsonb_array_elements(v_investor_rows)
  LOOP
    -- Post INTEREST delta transaction if non-zero
    IF ABS((v_inv.value->>'delta_net')::numeric) > 0.00000001 THEN
      INSERT INTO transactions_v2 (
        id, investor_id, fund_id, type, asset, fund_class, amount,
        tx_date, reference_id, notes, created_by, created_at, purpose,
        distribution_id, correction_id, visibility_scope, is_system_generated, source
      ) VALUES (
        gen_random_uuid(),
        (v_inv.value->>'investor_id')::uuid,
        p_fund_id,
        'INTEREST',
        v_fund.asset,
        v_fund.fund_class,
        (v_inv.value->>'delta_net')::numeric,
        p_date,
        v_ref_prefix || (v_inv.value->>'investor_id') || ':INTEREST',
        format('Yield correction: %s', p_reason),
        v_admin_id,
        now(),
        v_purpose_enum,
        v_correction_dist_id,
        v_correction_id,
        'investor_visible',
        true,
        'yield_correction'
      )
      ON CONFLICT (reference_id) WHERE reference_id IS NOT NULL DO NOTHING;
      
      -- Update investor position
      UPDATE investor_positions
      SET current_value = current_value + (v_inv.value->>'delta_net')::numeric,
          updated_at = now()
      WHERE investor_id = (v_inv.value->>'investor_id')::uuid AND fund_id = p_fund_id;
    END IF;
    
    -- Post FEE delta transaction if non-zero (not for INDIGO FEES account)
    IF ABS((v_inv.value->>'delta_fee')::numeric) > 0.00000001 
       AND (v_inv.value->>'investor_id')::uuid != v_indigo_fees_id THEN
      INSERT INTO transactions_v2 (
        id, investor_id, fund_id, type, asset, fund_class, amount,
        tx_date, reference_id, notes, created_by, created_at, purpose,
        distribution_id, correction_id, visibility_scope, is_system_generated, source
      ) VALUES (
        gen_random_uuid(),
        (v_inv.value->>'investor_id')::uuid,
        p_fund_id,
        'FEE',
        v_fund.asset,
        v_fund.fund_class,
        (v_inv.value->>'delta_fee')::numeric,
        p_date,
        v_ref_prefix || (v_inv.value->>'investor_id') || ':FEE',
        format('Fee correction: %s', p_reason),
        v_admin_id,
        now(),
        v_purpose_enum,
        v_correction_dist_id,
        v_correction_id,
        'investor_visible',
        true,
        'yield_correction'
      )
      ON CONFLICT (reference_id) WHERE reference_id IS NOT NULL DO NOTHING;
      
      -- Track fee credit delta (fees minus IB)
      v_total_fee_credit_delta := v_total_fee_credit_delta + 
        (v_inv.value->>'delta_fee')::numeric - COALESCE((v_inv.value->>'delta_ib')::numeric, 0);
    END IF;
    
    -- Post IB_CREDIT delta transaction if non-zero
    IF (v_inv.value->>'ib_parent_id') IS NOT NULL 
       AND ABS(COALESCE((v_inv.value->>'delta_ib')::numeric, 0)) > 0.00000001 THEN
      INSERT INTO transactions_v2 (
        id, investor_id, fund_id, type, asset, fund_class, amount,
        tx_date, reference_id, notes, created_by, created_at, purpose,
        distribution_id, correction_id, visibility_scope, is_system_generated, source
      ) VALUES (
        gen_random_uuid(),
        (v_inv.value->>'ib_parent_id')::uuid,
        p_fund_id,
        'IB_CREDIT',
        v_fund.asset,
        v_fund.fund_class,
        (v_inv.value->>'delta_ib')::numeric,
        p_date,
        v_ref_prefix || (v_inv.value->>'investor_id') || ':IB_CREDIT',
        format('IB correction from %s: %s', v_inv.value->>'investor_name', p_reason),
        v_admin_id,
        now(),
        v_purpose_enum,
        v_correction_dist_id,
        v_correction_id,
        'admin_only',
        true,
        'yield_correction'
      )
      ON CONFLICT (reference_id) WHERE reference_id IS NOT NULL DO NOTHING;
      
      -- Update IB parent position
      UPDATE investor_positions
      SET current_value = current_value + (v_inv.value->>'delta_ib')::numeric,
          updated_at = now()
      WHERE investor_id = (v_inv.value->>'ib_parent_id')::uuid AND fund_id = p_fund_id;
    END IF;
  END LOOP;
  
  -- Post FEE_CREDIT delta to INDIGO FEES if non-zero
  IF ABS(v_total_fee_credit_delta) > 0.00000001 THEN
    INSERT INTO transactions_v2 (
      id, investor_id, fund_id, type, asset, fund_class, amount,
      tx_date, reference_id, notes, created_by, created_at, purpose,
      distribution_id, correction_id, visibility_scope, is_system_generated, source
    ) VALUES (
      gen_random_uuid(),
      v_indigo_fees_id,
      p_fund_id,
      'FEE_CREDIT',
      v_fund.asset,
      v_fund.fund_class,
      v_total_fee_credit_delta,
      p_date,
      v_ref_prefix || 'INDIGO_FEES:FEE_CREDIT',
      format('Platform fee correction: %s', p_reason),
      v_admin_id,
      now(),
      v_purpose_enum,
      v_correction_dist_id,
      v_correction_id,
      'admin_only',
      true,
      'yield_correction'
    )
    ON CONFLICT (reference_id) WHERE reference_id IS NOT NULL DO NOTHING;
    
    -- Update INDIGO FEES position
    UPDATE investor_positions
    SET current_value = current_value + v_total_fee_credit_delta,
        updated_at = now()
    WHERE investor_id = v_indigo_fees_id AND fund_id = p_fund_id;
  END IF;
  
  -- Update fund_daily_aum with new value
  UPDATE fund_daily_aum
  SET total_aum = p_new_aum,
      source = format('corrected:%s', v_correction_id),
      updated_at = now(),
      updated_by = v_admin_id
  WHERE fund_id = p_fund_id::text AND aum_date = p_date AND purpose = v_purpose_enum;
  
  -- Log to audit_log
  INSERT INTO audit_log (action, entity, entity_id, actor_user, old_values, new_values, meta)
  VALUES (
    'YIELD_CORRECTION_APPLIED',
    'yield_corrections',
    v_correction_id::text,
    v_admin_id,
    jsonb_build_object('old_aum', v_old_aum),
    jsonb_build_object('new_aum', p_new_aum, 'delta', v_delta_aum),
    jsonb_build_object(
      'fund_id', p_fund_id,
      'effective_date', p_date,
      'purpose', p_purpose,
      'reason', p_reason,
      'is_month_closed', v_is_month_closed,
      'investors_affected', (v_summary->>'investors_affected')::integer
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'correction_id', v_correction_id,
    'distribution_id', v_correction_dist_id,
    'original_distribution_id', v_original_dist_id,
    'delta_aum', v_delta_aum,
    'investors_affected', (v_summary->>'investors_affected')::integer,
    'total_fee_delta', (v_summary->>'total_fee_delta')::numeric,
    'total_ib_delta', (v_summary->>'total_ib_delta')::numeric,
    'is_month_closed', v_is_month_closed,
    'message', format('Correction applied successfully. %s investors updated.', (v_summary->>'investors_affected')::integer)
  );
END;
$$;

-- =====================================================
-- Get Correction History RPC
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_yield_corrections(
  p_fund_id UUID DEFAULT NULL,
  p_date_from DATE DEFAULT NULL,
  p_date_to DATE DEFAULT NULL
)
RETURNS TABLE (
  correction_id UUID,
  fund_id UUID,
  fund_name TEXT,
  fund_asset TEXT,
  effective_date DATE,
  purpose TEXT,
  old_aum NUMERIC,
  new_aum NUMERIC,
  delta_aum NUMERIC,
  investors_affected INTEGER,
  total_fee_delta NUMERIC,
  total_ib_delta NUMERIC,
  reason TEXT,
  status TEXT,
  applied_at TIMESTAMPTZ,
  applied_by_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.check_is_admin(auth.uid()) THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    yc.id AS correction_id,
    yd.fund_id,
    f.name AS fund_name,
    f.asset AS fund_asset,
    yd.effective_date,
    yd.purpose::text,
    yc.old_aum,
    yc.new_aum,
    yc.delta_aum,
    yc.investors_affected,
    yc.total_fee_delta,
    yc.total_ib_delta,
    yc.reason,
    yc.status,
    yc.applied_at,
    COALESCE(p.first_name || ' ' || COALESCE(p.last_name, ''), p.email, 'Unknown') AS applied_by_name
  FROM yield_corrections yc
  JOIN yield_distributions yd ON yd.id = yc.correction_distribution_id
  JOIN funds f ON f.id = yd.fund_id
  LEFT JOIN profiles p ON p.id = yc.applied_by
  WHERE (p_fund_id IS NULL OR yd.fund_id = p_fund_id)
    AND (p_date_from IS NULL OR yd.effective_date >= p_date_from)
    AND (p_date_to IS NULL OR yd.effective_date <= p_date_to)
  ORDER BY yc.applied_at DESC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.preview_yield_correction TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_yield_correction TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_yield_corrections TO authenticated;