-- =============================================
-- INDIGO FEES YIELDING SYSTEM MIGRATION
-- =============================================

-- 1. Create fee_allocations table for auditable, idempotent fee tracking
CREATE TABLE IF NOT EXISTS public.fee_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  distribution_id UUID NOT NULL,
  fund_id UUID NOT NULL REFERENCES public.funds(id),
  investor_id UUID NOT NULL REFERENCES public.profiles(id),
  fees_account_id UUID NOT NULL DEFAULT '169bb053-36cb-4f6e-93ea-831f0dfeaf1d' REFERENCES public.profiles(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  purpose aum_purpose NOT NULL,
  base_net_income NUMERIC NOT NULL,
  fee_percentage NUMERIC NOT NULL CHECK (fee_percentage >= 0 AND fee_percentage <= 100),
  fee_amount NUMERIC NOT NULL CHECK (fee_amount >= 0),
  credit_transaction_id UUID REFERENCES public.transactions_v2(id),
  debit_transaction_id UUID REFERENCES public.transactions_v2(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id),
  
  -- Idempotency constraint
  CONSTRAINT fee_allocations_unique UNIQUE (distribution_id, fund_id, investor_id, fees_account_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_fee_allocations_distribution ON public.fee_allocations(distribution_id);
CREATE INDEX IF NOT EXISTS idx_fee_allocations_fund ON public.fee_allocations(fund_id);
CREATE INDEX IF NOT EXISTS idx_fee_allocations_investor ON public.fee_allocations(investor_id);
CREATE INDEX IF NOT EXISTS idx_fee_allocations_period ON public.fee_allocations(period_end);

-- Enable RLS
ALTER TABLE public.fee_allocations ENABLE ROW LEVEL SECURITY;

-- Admin-only access policies
CREATE POLICY "fee_allocations_select_admin" ON public.fee_allocations
  FOR SELECT USING (is_admin());

CREATE POLICY "fee_allocations_insert_admin" ON public.fee_allocations
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "fee_allocations_update_admin" ON public.fee_allocations
  FOR UPDATE USING (is_admin());

CREATE POLICY "fee_allocations_delete_admin" ON public.fee_allocations
  FOR DELETE USING (is_admin());

-- 2. Update apply_yield_with_ib to include INDIGO FEES in yield distribution
-- and properly record fee allocations
CREATE OR REPLACE FUNCTION public.apply_yield_with_ib(
  p_fund_id uuid, 
  p_date date, 
  p_new_aum numeric, 
  p_purpose aum_purpose, 
  p_created_by uuid DEFAULT auth.uid()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_distribution_id UUID;
  v_old_aum NUMERIC;
  v_growth_rate NUMERIC;
  v_total_fees NUMERIC := 0;
  v_total_ib_fees NUMERIC := 0;
  v_investor_count INTEGER := 0;
  rec RECORD;
  v_share NUMERIC;
  v_gross NUMERIC;
  v_fee_pct NUMERIC;
  v_fee NUMERIC;
  v_net NUMERIC;
  v_ib_parent_id UUID;
  v_ib_pct NUMERIC;
  v_ib_amount NUMERIC;
  v_ib_source TEXT;
  v_existing_count INTEGER;
  v_is_month_end BOOLEAN;
  v_indigo_fees_id UUID := '169bb053-36cb-4f6e-93ea-831f0dfeaf1d';
  v_credit_tx_id UUID;
  v_debit_tx_id UUID;
BEGIN
  -- Generate unique distribution ID for this run
  v_distribution_id := gen_random_uuid();
  
  -- Check if this is month end
  v_is_month_end := (p_date = (date_trunc('month', p_date) + interval '1 month - 1 day')::date);
  
  -- Get previous AUM for the fund
  SELECT total_aum INTO v_old_aum
  FROM fund_daily_aum
  WHERE fund_id = p_fund_id::text
    AND aum_date < p_date
    AND purpose = p_purpose
  ORDER BY aum_date DESC
  LIMIT 1;
  
  IF v_old_aum IS NULL OR v_old_aum = 0 THEN
    v_old_aum := p_new_aum;
    v_growth_rate := 0;
  ELSE
    v_growth_rate := (p_new_aum - v_old_aum) / v_old_aum;
  END IF;
  
  -- Check for existing distribution to prevent duplicates
  SELECT COUNT(*) INTO v_existing_count
  FROM fund_daily_aum
  WHERE fund_id = p_fund_id::text
    AND aum_date = p_date
    AND purpose = p_purpose;
  
  IF v_existing_count > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Yield already distributed for this fund, date, and purpose'
    );
  END IF;
  
  -- Process ALL investors with positions in this fund (INCLUDING INDIGO FEES)
  -- INDIGO FEES will receive yield on its beginning balance just like any investor
  FOR rec IN 
    SELECT 
      ip.investor_id,
      ip.current_value,
      p.ib_parent_id,
      p.ib_percentage
    FROM investor_positions ip
    JOIN profiles p ON p.id = ip.investor_id
    WHERE ip.fund_id = p_fund_id
      AND ip.current_value > 0
      -- NO LONGER EXCLUDING INDIGO FEES - it earns yield like any investor
  LOOP
    v_investor_count := v_investor_count + 1;
    
    -- Calculate investor's share of growth
    v_share := rec.current_value / NULLIF(v_old_aum, 0);
    v_gross := (p_new_aum - v_old_aum) * COALESCE(v_share, 0);
    
    -- INDIGO FEES does NOT pay fees (it's the fee collector)
    IF rec.investor_id = v_indigo_fees_id THEN
      v_fee_pct := 0;
      v_fee := 0;
      v_net := v_gross;
    ELSE
      -- Get investor's fee percentage
      SELECT COALESCE(fee_pct, 20) INTO v_fee_pct
      FROM investor_fee_schedule
      WHERE investor_id = rec.investor_id
        AND (fund_id = p_fund_id OR fund_id IS NULL)
      ORDER BY effective_date DESC
      LIMIT 1;
      
      IF v_fee_pct IS NULL THEN
        v_fee_pct := 20;
      END IF;
      
      -- Calculate fee and net income
      v_fee := GREATEST(0, v_gross * (v_fee_pct / 100));
      v_net := v_gross - v_fee;
      v_total_fees := v_total_fees + v_fee;
      
      -- Record fee allocation for audit trail (only for reporting + month end)
      IF p_purpose = 'reporting' AND v_is_month_end AND v_fee > 0 THEN
        INSERT INTO fee_allocations (
          distribution_id, fund_id, investor_id, fees_account_id,
          period_start, period_end, purpose, base_net_income,
          fee_percentage, fee_amount, created_by
        ) VALUES (
          v_distribution_id, p_fund_id, rec.investor_id, v_indigo_fees_id,
          date_trunc('month', p_date)::date, p_date, p_purpose,
          v_gross, v_fee_pct, v_fee, p_created_by
        )
        ON CONFLICT (distribution_id, fund_id, investor_id, fees_account_id) DO NOTHING;
      END IF;
    END IF;
    
    -- IB allocation - ONLY for reporting purpose and month end
    v_ib_parent_id := rec.ib_parent_id;
    v_ib_pct := COALESCE(rec.ib_percentage, 0);
    
    IF p_purpose = 'reporting' AND v_is_month_end 
       AND v_ib_parent_id IS NOT NULL AND v_ib_pct > 0 AND v_net > 0
       AND rec.investor_id != v_indigo_fees_id THEN
      
      -- IB fee is percentage of NET INCOME
      v_ib_amount := v_net * (v_ib_pct / 100.0);
      
      -- Determine source: prefer platform fees, fallback to investor yield
      IF v_total_fees >= v_ib_amount THEN
        v_ib_source := 'from_platform_fees';
        v_total_fees := v_total_fees - v_ib_amount;
      ELSE
        v_ib_source := 'from_investor_yield';
        v_net := v_net - v_ib_amount;
      END IF;
      
      v_total_ib_fees := v_total_ib_fees + v_ib_amount;
      
      -- Record IB allocation
      INSERT INTO ib_allocations (
        distribution_id, fund_id, source_investor_id, ib_investor_id,
        period_start, period_end, purpose, source_net_income,
        ib_percentage, ib_fee_amount, source, effective_date, created_by
      ) VALUES (
        v_distribution_id, p_fund_id, rec.investor_id, v_ib_parent_id,
        date_trunc('month', p_date)::date, p_date, p_purpose,
        v_net + v_ib_amount, v_ib_pct, v_ib_amount, v_ib_source, p_date, p_created_by
      )
      ON CONFLICT (distribution_id, fund_id, source_investor_id, ib_investor_id) 
      WHERE distribution_id IS NOT NULL DO NOTHING;
      
      -- Credit IB parent position
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, effective_date, status, notes, created_by, reference_id
      ) VALUES (
        v_ib_parent_id, p_fund_id, 'IB_CREDIT', v_ib_amount, p_date, 'COMPLETED',
        format('IB fee from investor %s: %s%% of %s net income', rec.investor_id, v_ib_pct, round(v_net + v_ib_amount, 2)),
        p_created_by, format('ib_credit:%s:%s:%s:%s', v_distribution_id, p_fund_id, rec.investor_id, p_date)
      )
      ON CONFLICT (reference_id) WHERE reference_id IS NOT NULL DO NOTHING;
      
      -- Update IB parent's position
      UPDATE investor_positions
      SET current_value = current_value + v_ib_amount, updated_at = NOW()
      WHERE investor_id = v_ib_parent_id AND fund_id = p_fund_id;
        
      IF NOT FOUND THEN
        INSERT INTO investor_positions (investor_id, fund_id, current_value, cost_basis, shares)
        VALUES (v_ib_parent_id, p_fund_id, v_ib_amount, 0, 0);
      END IF;
    END IF;
    
    -- Update investor position with net yield
    UPDATE investor_positions
    SET current_value = current_value + v_net, updated_at = NOW()
    WHERE investor_id = rec.investor_id AND fund_id = p_fund_id;
  END LOOP;
  
  -- Credit remaining platform fees to INDIGO FEES account
  IF v_total_fees > 0 THEN
    INSERT INTO transactions_v2 (
      investor_id, fund_id, type, amount, effective_date, status, notes, created_by, reference_id
    ) VALUES (
      v_indigo_fees_id, p_fund_id, 'FEE_CREDIT', v_total_fees, p_date, 'COMPLETED',
      format('Platform fees for %s distribution on %s', p_purpose, p_date),
      p_created_by, format('fee_credit:%s:%s:%s', p_fund_id, p_date, p_purpose)
    )
    ON CONFLICT (reference_id) WHERE reference_id IS NOT NULL DO NOTHING;
    
    UPDATE investor_positions
    SET current_value = current_value + v_total_fees, updated_at = NOW()
    WHERE investor_id = v_indigo_fees_id AND fund_id = p_fund_id;
      
    IF NOT FOUND THEN
      INSERT INTO investor_positions (investor_id, fund_id, current_value, cost_basis, shares)
      VALUES (v_indigo_fees_id, p_fund_id, v_total_fees, 0, 0);
    END IF;
  END IF;
  
  -- Record fund AUM
  INSERT INTO fund_daily_aum (
    fund_id, aum_date, total_aum, purpose, is_month_end, source, created_by
  ) VALUES (
    p_fund_id::text, p_date, p_new_aum, p_purpose, v_is_month_end, 'yield_distribution', p_created_by
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'distribution_id', v_distribution_id,
    'investors_processed', v_investor_count,
    'total_platform_fees', v_total_fees,
    'total_ib_fees', v_total_ib_fees,
    'growth_rate', v_growth_rate,
    'is_month_end', v_is_month_end,
    'indigo_fees_included_in_yield', true
  );
END;
$function$;