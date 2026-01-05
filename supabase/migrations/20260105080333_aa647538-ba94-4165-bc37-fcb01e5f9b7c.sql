-- Add aum_record_id column to yield_distributions
ALTER TABLE yield_distributions
ADD COLUMN IF NOT EXISTS aum_record_id uuid REFERENCES fund_daily_aum(id);

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_yield_distributions_aum_record_id 
ON yield_distributions(aum_record_id) 
WHERE aum_record_id IS NOT NULL;

-- Backfill existing records by matching fund_id, effective_date, and purpose
UPDATE yield_distributions yd
SET aum_record_id = fda.id
FROM fund_daily_aum fda
WHERE yd.aum_record_id IS NULL
  AND yd.fund_id = fda.fund_id
  AND yd.effective_date = fda.aum_date
  AND yd.purpose::text = fda.purpose::text
  AND fda.is_voided = false;

-- Update apply_daily_yield_to_fund_v3 to set aum_record_id
CREATE OR REPLACE FUNCTION apply_daily_yield_to_fund_v3(
  p_fund_id uuid,
  p_yield_date date,
  p_new_aum numeric,
  p_purpose aum_purpose DEFAULT 'reporting',
  p_admin_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fund RECORD;
  v_current_aum numeric;
  v_gross_yield numeric;
  v_yield_pct numeric;
  v_investor RECORD;
  v_investor_yield numeric;
  v_investor_fee numeric;
  v_investor_net numeric;
  v_fee_pct numeric;
  v_total_fees numeric := 0;
  v_total_ib numeric := 0;
  v_net_yield numeric := 0;
  v_count integer := 0;
  v_distribution_id uuid;
  v_aum_record_id uuid;
  v_ref_id text;
  v_existing_ref text;
  v_ib_parent_id uuid;
  v_ib_pct numeric;
  v_ib_amount numeric;
  v_ib_source text;
  v_indigo_fees_id uuid;
  v_indigo_credit numeric := 0;
  v_skipped integer := 0;
BEGIN
  -- Get fund details
  SELECT * INTO v_fund FROM funds WHERE id = p_fund_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Fund not found');
  END IF;

  -- Get current AUM from positions
  SELECT COALESCE(SUM(current_value), 0) INTO v_current_aum
  FROM investor_positions WHERE fund_id = p_fund_id;

  -- Calculate gross yield
  v_gross_yield := p_new_aum - v_current_aum;
  IF v_current_aum > 0 THEN
    v_yield_pct := (v_gross_yield / v_current_aum) * 100;
  ELSE
    v_yield_pct := 0;
  END IF;

  -- Upsert fund_daily_aum and get the record id
  INSERT INTO fund_daily_aum (fund_id, aum_date, total_aum, source, purpose, is_month_end, created_by)
  VALUES (p_fund_id, p_yield_date, p_new_aum, 'yield_distribution', p_purpose, 
          (EXTRACT(DAY FROM (p_yield_date + INTERVAL '1 day')) = 1), p_admin_id)
  ON CONFLICT (fund_id, aum_date, purpose) 
  DO UPDATE SET total_aum = EXCLUDED.total_aum, updated_at = NOW(), updated_by = p_admin_id
  RETURNING id INTO v_aum_record_id;

  -- Create yield distribution record with aum_record_id
  INSERT INTO yield_distributions (
    fund_id, effective_date, opening_aum, closing_aum, gross_yield, 
    yield_percentage, purpose, status, created_by, aum_record_id
  )
  VALUES (
    p_fund_id, p_yield_date, v_current_aum, p_new_aum, v_gross_yield,
    v_yield_pct, p_purpose, 'applied', p_admin_id, v_aum_record_id
  )
  RETURNING id INTO v_distribution_id;

  -- Get Indigo Fees account
  SELECT id INTO v_indigo_fees_id FROM profiles WHERE full_name = 'Indigo Fees' LIMIT 1;

  -- Process each investor with a position
  FOR v_investor IN 
    SELECT 
      ip.investor_id,
      ip.current_value,
      ip.fund_id,
      p.full_name,
      p.account_type,
      p.ib_parent_id,
      p.ib_percentage,
      p.ib_source
    FROM investor_positions ip
    JOIN profiles p ON p.id = ip.investor_id
    WHERE ip.fund_id = p_fund_id AND ip.current_value > 0
  LOOP
    v_count := v_count + 1;
    
    -- Calculate allocation percentage
    v_investor_yield := (v_investor.current_value / v_current_aum) * v_gross_yield;
    
    -- Get fee percentage
    SELECT COALESCE(
      (SELECT fee_pct FROM investor_fee_schedule 
       WHERE investor_id = v_investor.investor_id 
         AND (fund_id = p_fund_id OR fund_id IS NULL)
         AND effective_date <= p_yield_date
         AND (end_date IS NULL OR end_date >= p_yield_date)
       ORDER BY fund_id NULLS LAST, effective_date DESC LIMIT 1),
      0
    ) INTO v_fee_pct;
    
    v_investor_fee := v_investor_yield * (v_fee_pct / 100);
    v_investor_net := v_investor_yield - v_investor_fee;
    
    -- Generate reference ID
    v_ref_id := 'YLD-' || v_fund.code || '-' || TO_CHAR(p_yield_date, 'YYYYMMDD') || '-' || LEFT(v_investor.investor_id::text, 8);
    
    -- Check for existing transaction
    SELECT reference_id INTO v_existing_ref FROM transactions_v2 
    WHERE reference_id = v_ref_id AND is_voided = false LIMIT 1;
    
    IF v_existing_ref IS NOT NULL THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;
    
    -- Create yield transaction
    INSERT INTO transactions_v2 (
      investor_id, fund_id, tx_type, amount, effective_date, 
      reference_id, notes, created_by, source, distribution_id
    )
    VALUES (
      v_investor.investor_id, p_fund_id, 'yield', v_investor_net, p_yield_date,
      v_ref_id, 'Yield distribution', p_admin_id, 'system', v_distribution_id
    );
    
    -- Update investor position
    UPDATE investor_positions 
    SET current_value = current_value + v_investor_net,
        cumulative_yield_earned = COALESCE(cumulative_yield_earned, 0) + v_investor_net,
        last_yield_crystallization_date = p_yield_date,
        updated_at = NOW()
    WHERE investor_id = v_investor.investor_id AND fund_id = p_fund_id;
    
    -- Create investor yield event
    INSERT INTO investor_yield_events (
      investor_id, fund_id, distribution_id, effective_date,
      opening_balance, gross_yield, fee_pct, fee_amount, ib_amount, net_yield, closing_balance,
      purpose, created_by
    )
    VALUES (
      v_investor.investor_id, p_fund_id, v_distribution_id, p_yield_date,
      v_investor.current_value, v_investor_yield, v_fee_pct, v_investor_fee, 0, v_investor_net, 
      v_investor.current_value + v_investor_net, p_purpose, p_admin_id
    );
    
    -- Process fees
    IF v_investor_fee > 0 THEN
      v_total_fees := v_total_fees + v_investor_fee;
      
      -- Create fee allocation
      INSERT INTO fee_allocations (
        distribution_id, investor_id, fund_id, fee_percentage, fee_amount,
        base_net_income, period_start, period_end, purpose, created_by
      )
      VALUES (
        v_distribution_id, v_investor.investor_id, p_fund_id, v_fee_pct, v_investor_fee,
        v_investor_yield, p_yield_date, p_yield_date, p_purpose, p_admin_id
      );
      
      -- Credit Indigo Fees
      IF v_indigo_fees_id IS NOT NULL THEN
        v_indigo_credit := v_indigo_credit + v_investor_fee;
      END IF;
    END IF;
    
    -- Process IB allocations
    v_ib_parent_id := v_investor.ib_parent_id;
    v_ib_pct := COALESCE(v_investor.ib_percentage, 0);
    v_ib_source := COALESCE(v_investor.ib_source, 'from_platform_fees');
    
    IF v_ib_parent_id IS NOT NULL AND v_ib_pct > 0 THEN
      IF v_ib_source = 'from_platform_fees' AND v_investor_fee > 0 THEN
        v_ib_amount := v_investor_fee * (v_ib_pct / 100);
        v_indigo_credit := v_indigo_credit - v_ib_amount;
      ELSIF v_ib_source = 'from_investor_yield' THEN
        v_ib_amount := v_investor_yield * (v_ib_pct / 100);
      ELSE
        v_ib_amount := 0;
      END IF;
      
      IF v_ib_amount > 0 THEN
        v_total_ib := v_total_ib + v_ib_amount;
        
        INSERT INTO ib_allocations (
          distribution_id, ib_investor_id, source_investor_id, fund_id,
          ib_percentage, ib_fee_amount, source_net_income, source,
          effective_date, period_start, period_end, purpose, created_by
        )
        VALUES (
          v_distribution_id, v_ib_parent_id, v_investor.investor_id, p_fund_id,
          v_ib_pct, v_ib_amount, v_investor_yield, v_ib_source,
          p_yield_date, p_yield_date, p_yield_date, p_purpose, p_admin_id
        );
      END IF;
    END IF;
    
    v_net_yield := v_net_yield + v_investor_net;
  END LOOP;

  -- Update distribution totals
  UPDATE yield_distributions
  SET total_fees = v_total_fees,
      total_ib_fees = v_total_ib,
      net_yield = v_net_yield,
      investor_count = v_count
  WHERE id = v_distribution_id;

  -- Recompute AUM percentages
  PERFORM recompute_aum_percentages(p_fund_id);

  RETURN jsonb_build_object(
    'success', true,
    'distribution_id', v_distribution_id,
    'aum_record_id', v_aum_record_id,
    'fund_id', p_fund_id,
    'yield_date', p_yield_date,
    'gross_yield', v_gross_yield,
    'total_fees', v_total_fees,
    'total_ib_fees', v_total_ib,
    'net_yield', v_net_yield,
    'investor_count', v_count,
    'skipped', v_skipped,
    'indigo_credit', v_indigo_credit
  );
END;
$$;

-- Update void_fund_daily_aum to use aum_record_id for cascade
CREATE OR REPLACE FUNCTION void_fund_daily_aum(
  p_record_id uuid,
  p_admin_id uuid,
  p_reason text DEFAULT 'Admin void'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record RECORD;
  v_distribution RECORD;
  v_dist_count integer := 0;
  v_tx_count integer := 0;
  v_event_count integer := 0;
  v_fee_count integer := 0;
  v_ib_count integer := 0;
  v_position_updates integer := 0;
BEGIN
  -- Get the AUM record
  SELECT * INTO v_record FROM fund_daily_aum WHERE id = p_record_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Record not found');
  END IF;
  
  IF v_record.is_voided THEN
    RETURN jsonb_build_object('success', false, 'error', 'Record already voided');
  END IF;

  -- Void the AUM record
  UPDATE fund_daily_aum
  SET is_voided = true,
      voided_at = NOW(),
      voided_by = p_admin_id,
      void_reason = p_reason
  WHERE id = p_record_id;

  -- Find and void related yield distributions using aum_record_id (preferred) or fallback to matching
  FOR v_distribution IN
    SELECT id, fund_id FROM yield_distributions
    WHERE (aum_record_id = p_record_id 
           OR (aum_record_id IS NULL 
               AND fund_id = v_record.fund_id 
               AND effective_date = v_record.aum_date 
               AND purpose::text = v_record.purpose::text))
      AND status != 'voided'
  LOOP
    v_dist_count := v_dist_count + 1;

    -- Void the distribution
    UPDATE yield_distributions
    SET status = 'voided',
        voided_at = NOW(),
        voided_by = p_admin_id,
        void_reason = 'Cascade from fund_daily_aum: ' || p_reason
    WHERE id = v_distribution.id;

    -- Void related transactions and reverse positions
    WITH voided_txs AS (
      UPDATE transactions_v2
      SET is_voided = true,
          voided_at = NOW(),
          voided_by = p_admin_id,
          void_reason = 'Cascade from fund_daily_aum: ' || p_reason
      WHERE distribution_id = v_distribution.id
        AND is_voided = false
      RETURNING investor_id, fund_id, amount, tx_type
    )
    SELECT COUNT(*) INTO v_tx_count FROM voided_txs;

    -- Reverse position changes from voided transactions
    UPDATE investor_positions ip
    SET current_value = ip.current_value - t.amount,
        cumulative_yield_earned = COALESCE(ip.cumulative_yield_earned, 0) - t.amount,
        updated_at = NOW()
    FROM transactions_v2 t
    WHERE t.distribution_id = v_distribution.id
      AND t.is_voided = true
      AND t.tx_type = 'yield'
      AND ip.investor_id = t.investor_id
      AND ip.fund_id = t.fund_id;
    
    GET DIAGNOSTICS v_position_updates = ROW_COUNT;

    -- Void investor yield events
    WITH voided_events AS (
      UPDATE investor_yield_events
      SET is_voided = true,
          voided_at = NOW(),
          voided_by = p_admin_id,
          void_reason = 'Cascade from fund_daily_aum: ' || p_reason
      WHERE distribution_id = v_distribution.id
        AND is_voided = false
      RETURNING id
    )
    SELECT COUNT(*) INTO v_event_count FROM voided_events;

    -- Void fee allocations
    WITH voided_fees AS (
      UPDATE fee_allocations
      SET is_voided = true,
          voided_at = NOW(),
          voided_by = p_admin_id
      WHERE distribution_id = v_distribution.id
        AND is_voided = false
      RETURNING id
    )
    SELECT COUNT(*) INTO v_fee_count FROM voided_fees;

    -- Void IB allocations
    WITH voided_ibs AS (
      UPDATE ib_allocations
      SET is_voided = true,
          voided_at = NOW(),
          voided_by = p_admin_id
      WHERE distribution_id = v_distribution.id
        AND is_voided = false
      RETURNING id
    )
    SELECT COUNT(*) INTO v_ib_count FROM voided_ibs;
  END LOOP;

  -- Recompute AUM percentages
  PERFORM recompute_aum_percentages(v_record.fund_id);

  RETURN jsonb_build_object(
    'success', true,
    'voided_aum_record', p_record_id,
    'distributions_voided', v_dist_count,
    'transactions_voided', v_tx_count,
    'events_voided', v_event_count,
    'fee_allocations_voided', v_fee_count,
    'ib_allocations_voided', v_ib_count,
    'positions_updated', v_position_updates
  );
END;
$$;