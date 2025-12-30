-- Phase 1: Fix critical column name bug in apply_daily_yield_to_fund_v2
-- The function references 'total_ib_fees' but the column is 'total_ib'

CREATE OR REPLACE FUNCTION public.apply_daily_yield_to_fund_v2(
  p_fund_id uuid,
  p_gross_yield numeric,
  p_effective_date date DEFAULT CURRENT_DATE,
  p_purpose aum_purpose DEFAULT 'reporting'::aum_purpose
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_preview jsonb;
  v_distribution_id uuid;
  v_investor jsonb;
  v_total_net numeric := 0;
  v_total_fees numeric := 0;
  v_total_ib numeric := 0;
  v_fund_code text;
  v_fund_asset text;
  v_actor_id uuid;
  v_tx_id uuid;
  v_fee_tx_id uuid;
  v_ib_tx_id uuid;
  v_indigo_fees_id uuid := '169bb053-36cb-4f6e-93ea-831f0dfeaf1d';
BEGIN
  -- Get actor
  v_actor_id := auth.uid();
  
  -- Get fund info
  SELECT code, asset INTO v_fund_code, v_fund_asset
  FROM funds WHERE id = p_fund_id;
  
  IF v_fund_code IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Fund not found');
  END IF;

  -- Get preview data (reuse preview logic for consistency)
  v_preview := preview_daily_yield_to_fund_v2(p_fund_id, p_gross_yield, p_effective_date, p_purpose);
  
  IF NOT (v_preview->>'success')::boolean THEN
    RETURN v_preview;
  END IF;

  -- Create distribution record
  v_distribution_id := gen_random_uuid();
  
  INSERT INTO yield_distributions (
    id,
    fund_id,
    effective_date,
    gross_yield,
    net_yield,
    total_fees,
    total_ib,
    investor_count,
    purpose,
    status,
    created_by
  ) VALUES (
    v_distribution_id,
    p_fund_id,
    p_effective_date,
    p_gross_yield,
    (v_preview->>'net_yield')::numeric,
    (v_preview->>'total_fees')::numeric,
    (v_preview->>'total_ib')::numeric,
    (v_preview->>'investor_count')::int,
    p_purpose,
    'applied',
    v_actor_id
  );

  -- Process each investor from preview
  FOR v_investor IN SELECT * FROM jsonb_array_elements(v_preview->'distributions')
  LOOP
    -- Skip if this is INDIGO FEES account
    IF (v_investor->>'investor_id')::uuid = v_indigo_fees_id THEN
      CONTINUE;
    END IF;

    -- Create yield transaction for investor
    INSERT INTO transactions_v2 (
      investor_id,
      fund_id,
      transaction_type,
      amount,
      tx_date,
      status,
      distribution_id,
      purpose,
      created_by,
      notes
    ) VALUES (
      (v_investor->>'investor_id')::uuid,
      p_fund_id,
      'yield',
      (v_investor->>'net_yield')::numeric,
      p_effective_date,
      'settled',
      v_distribution_id,
      p_purpose,
      v_actor_id,
      'Yield distribution for ' || p_effective_date::text
    ) RETURNING id INTO v_tx_id;

    -- Update investor position (both current_value AND shares)
    UPDATE investor_positions
    SET 
      current_value = current_value + (v_investor->>'net_yield')::numeric,
      shares = shares + (v_investor->>'net_yield')::numeric,
      updated_at = now()
    WHERE investor_id = (v_investor->>'investor_id')::uuid
      AND fund_id = p_fund_id;

    -- Create fee allocation if fee > 0
    IF (v_investor->>'fee_amount')::numeric > 0 THEN
      -- Fee debit from investor
      INSERT INTO transactions_v2 (
        investor_id,
        fund_id,
        transaction_type,
        amount,
        tx_date,
        status,
        distribution_id,
        purpose,
        created_by,
        notes
      ) VALUES (
        (v_investor->>'investor_id')::uuid,
        p_fund_id,
        'fee',
        -(v_investor->>'fee_amount')::numeric,
        p_effective_date,
        'settled',
        v_distribution_id,
        p_purpose,
        v_actor_id,
        'Management fee for ' || p_effective_date::text
      ) RETURNING id INTO v_fee_tx_id;

      INSERT INTO fee_allocations (
        distribution_id,
        fund_id,
        investor_id,
        fees_account_id,
        period_start,
        period_end,
        purpose,
        base_net_income,
        fee_percentage,
        fee_amount,
        debit_transaction_id,
        created_by
      ) VALUES (
        v_distribution_id,
        p_fund_id,
        (v_investor->>'investor_id')::uuid,
        v_indigo_fees_id,
        p_effective_date,
        p_effective_date,
        p_purpose,
        (v_investor->>'gross_yield')::numeric,
        (v_investor->>'fee_pct')::numeric,
        (v_investor->>'fee_amount')::numeric,
        v_fee_tx_id,
        v_actor_id
      );

      v_total_fees := v_total_fees + (v_investor->>'fee_amount')::numeric;
    END IF;

    -- Create IB allocation if ib_amount > 0
    IF (v_investor->>'ib_amount')::numeric > 0 AND v_investor->>'ib_parent_id' IS NOT NULL THEN
      INSERT INTO ib_allocations (
        distribution_id,
        fund_id,
        source_investor_id,
        ib_investor_id,
        effective_date,
        period_start,
        period_end,
        purpose,
        source_net_income,
        ib_percentage,
        ib_fee_amount,
        payout_status,
        created_by
      ) VALUES (
        v_distribution_id,
        p_fund_id,
        (v_investor->>'investor_id')::uuid,
        (v_investor->>'ib_parent_id')::uuid,
        p_effective_date,
        p_effective_date,
        p_effective_date,
        p_purpose,
        (v_investor->>'net_yield')::numeric,
        (v_investor->>'ib_pct')::numeric,
        (v_investor->>'ib_amount')::numeric,
        'pending',
        v_actor_id
      );

      v_total_ib := v_total_ib + (v_investor->>'ib_amount')::numeric;
    END IF;

    v_total_net := v_total_net + (v_investor->>'net_yield')::numeric;
  END LOOP;

  -- Credit fees to INDIGO FEES account
  IF v_total_fees > 0 THEN
    -- Create fee credit transaction
    INSERT INTO transactions_v2 (
      investor_id,
      fund_id,
      transaction_type,
      amount,
      tx_date,
      status,
      distribution_id,
      purpose,
      created_by,
      notes
    ) VALUES (
      v_indigo_fees_id,
      p_fund_id,
      'fee',
      v_total_fees,
      p_effective_date,
      'settled',
      v_distribution_id,
      p_purpose,
      v_actor_id,
      'Platform fees collected for ' || p_effective_date::text
    );

    -- Update INDIGO FEES position (both current_value AND shares)
    UPDATE investor_positions
    SET 
      current_value = current_value + v_total_fees,
      shares = shares + v_total_fees,
      updated_at = now()
    WHERE investor_id = v_indigo_fees_id
      AND fund_id = p_fund_id;

    -- Insert if position doesn't exist
    IF NOT FOUND THEN
      INSERT INTO investor_positions (
        investor_id,
        fund_id,
        shares,
        cost_basis,
        current_value,
        unrealized_pnl,
        realized_pnl
      ) VALUES (
        v_indigo_fees_id,
        p_fund_id,
        v_total_fees,
        0,
        v_total_fees,
        0,
        0
      );
    END IF;
  END IF;

  -- Update fund_daily_aum
  INSERT INTO fund_daily_aum (
    fund_id,
    aum_date,
    total_aum,
    purpose,
    source,
    created_by
  )
  SELECT 
    p_fund_id,
    p_effective_date,
    COALESCE(SUM(current_value), 0),
    p_purpose,
    'yield_distribution',
    v_actor_id
  FROM investor_positions
  WHERE fund_id = p_fund_id
  ON CONFLICT (fund_id, aum_date, purpose) 
  DO UPDATE SET 
    total_aum = EXCLUDED.total_aum,
    updated_at = now(),
    updated_by = v_actor_id;

  RETURN jsonb_build_object(
    'success', true,
    'distribution_id', v_distribution_id,
    'fund_id', p_fund_id,
    'fund_code', v_fund_code,
    'effective_date', p_effective_date,
    'gross_yield', p_gross_yield,
    'net_yield', v_total_net,
    'total_fees', v_total_fees,
    'total_ib', v_total_ib,
    'investor_count', jsonb_array_length(v_preview->'distributions') - 1
  );
END;
$$;

-- Phase 2: Sync AUM records - backfill fund_daily_aum from current positions
INSERT INTO fund_daily_aum (fund_id, aum_date, total_aum, purpose, source, created_by)
SELECT 
  f.id,
  CURRENT_DATE,
  COALESCE(SUM(ip.current_value), 0),
  'reporting'::aum_purpose,
  'schema_audit_backfill',
  NULL
FROM funds f
LEFT JOIN investor_positions ip ON ip.fund_id = f.id
WHERE f.status = 'active'
GROUP BY f.id
ON CONFLICT (fund_id, aum_date, purpose) 
DO UPDATE SET 
  total_aum = EXCLUDED.total_aum,
  updated_at = now(),
  source = 'schema_audit_backfill';

-- Also insert transaction purpose records
INSERT INTO fund_daily_aum (fund_id, aum_date, total_aum, purpose, source, created_by)
SELECT 
  f.id,
  CURRENT_DATE,
  COALESCE(SUM(ip.current_value), 0),
  'transaction'::aum_purpose,
  'schema_audit_backfill',
  NULL
FROM funds f
LEFT JOIN investor_positions ip ON ip.fund_id = f.id
WHERE f.status = 'active'
GROUP BY f.id
ON CONFLICT (fund_id, aum_date, purpose) 
DO UPDATE SET 
  total_aum = EXCLUDED.total_aum,
  updated_at = now(),
  source = 'schema_audit_backfill';

-- Phase 2b: Backfill daily_nav - delete existing then insert (PK doesn't include purpose)
DELETE FROM daily_nav WHERE nav_date = CURRENT_DATE;

INSERT INTO daily_nav (fund_id, nav_date, aum, purpose, investor_count, created_by)
SELECT 
  f.id,
  CURRENT_DATE,
  COALESCE(SUM(ip.current_value), 0),
  'reporting'::aum_purpose,
  COUNT(ip.investor_id)::int,
  NULL
FROM funds f
LEFT JOIN investor_positions ip ON ip.fund_id = f.id
WHERE f.status = 'active'
GROUP BY f.id;

-- Phase 3: Add foreign key constraints for data integrity
-- investor_positions constraints
ALTER TABLE investor_positions
  DROP CONSTRAINT IF EXISTS fk_investor_positions_investor,
  DROP CONSTRAINT IF EXISTS fk_investor_positions_fund;

ALTER TABLE investor_positions
  ADD CONSTRAINT fk_investor_positions_investor 
    FOREIGN KEY (investor_id) REFERENCES profiles(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_investor_positions_fund 
    FOREIGN KEY (fund_id) REFERENCES funds(id) ON DELETE RESTRICT;

-- transactions_v2 constraints
ALTER TABLE transactions_v2
  DROP CONSTRAINT IF EXISTS fk_transactions_v2_investor,
  DROP CONSTRAINT IF EXISTS fk_transactions_v2_fund;

ALTER TABLE transactions_v2
  ADD CONSTRAINT fk_transactions_v2_investor 
    FOREIGN KEY (investor_id) REFERENCES profiles(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_transactions_v2_fund 
    FOREIGN KEY (fund_id) REFERENCES funds(id) ON DELETE RESTRICT;

-- fee_allocations constraints (some may already exist)
ALTER TABLE fee_allocations
  DROP CONSTRAINT IF EXISTS fk_fee_allocations_investor_new,
  DROP CONSTRAINT IF EXISTS fk_fee_allocations_fund_new;

ALTER TABLE fee_allocations
  ADD CONSTRAINT fk_fee_allocations_investor_new 
    FOREIGN KEY (investor_id) REFERENCES profiles(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_fee_allocations_fund_new 
    FOREIGN KEY (fund_id) REFERENCES funds(id) ON DELETE RESTRICT;

-- ib_allocations constraints
ALTER TABLE ib_allocations
  DROP CONSTRAINT IF EXISTS fk_ib_allocations_source_investor,
  DROP CONSTRAINT IF EXISTS fk_ib_allocations_ib_investor;

ALTER TABLE ib_allocations
  ADD CONSTRAINT fk_ib_allocations_source_investor 
    FOREIGN KEY (source_investor_id) REFERENCES profiles(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_ib_allocations_ib_investor 
    FOREIGN KEY (ib_investor_id) REFERENCES profiles(id) ON DELETE RESTRICT;