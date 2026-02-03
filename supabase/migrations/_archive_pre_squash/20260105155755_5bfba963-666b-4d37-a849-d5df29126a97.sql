-- First drop the existing function to allow replacement
DROP FUNCTION IF EXISTS public.crystallize_yield_before_flow(uuid, timestamptz, numeric, text, text, aum_purpose, uuid);

-- Now recreate with updated logic (fees_account included in yield)
CREATE OR REPLACE FUNCTION public.crystallize_yield_before_flow(
  p_fund_id uuid,
  p_event_ts timestamptz,
  p_closing_aum numeric(28,10),
  p_trigger_type text,
  p_trigger_reference text,
  p_purpose aum_purpose,
  p_admin_id uuid
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_opening_aum numeric(28,10);
  v_gross_yield numeric(28,10);
  v_event_date date;
  v_last_checkpoint record;
  v_fund record;
  v_investor record;
  v_total_positions numeric(28,10);
  v_investor_share numeric(28,10);
  v_investor_yield numeric(28,10);
  v_distributed_yield numeric(28,10) := 0;
  v_remainder numeric(28,10);
  v_largest_investor_id uuid;
  v_largest_balance numeric(28,10) := 0;
  v_snapshot_id uuid;
  v_tx_count int := 0;
  v_reference_id text;
BEGIN
  -- Validate inputs
  IF p_fund_id IS NULL THEN
    RAISE EXCEPTION 'p_fund_id is required';
  END IF;
  
  IF p_closing_aum IS NULL THEN
    RAISE EXCEPTION 'p_closing_aum (preflow AUM) is required';
  END IF;
  
  IF p_trigger_type NOT IN ('deposit', 'withdrawal', 'yield', 'month_end', 'manual', 'backfill') THEN
    RAISE EXCEPTION 'Invalid trigger_type: %', p_trigger_type;
  END IF;
  
  v_event_date := date(p_event_ts);
  
  -- Get fund info
  SELECT * INTO v_fund FROM funds WHERE id = p_fund_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Fund not found: %', p_fund_id;
  END IF;
  
  -- Check idempotency: if already crystallized for this trigger_reference, return success
  IF p_trigger_reference IS NOT NULL THEN
    SELECT id INTO v_snapshot_id
    FROM fund_aum_events
    WHERE fund_id = p_fund_id
      AND trigger_type = p_trigger_type
      AND trigger_reference = p_trigger_reference
      AND is_voided = false
    LIMIT 1;
    
    IF FOUND THEN
      RETURN jsonb_build_object(
        'success', true,
        'skipped', true,
        'reason', 'Already crystallized for this trigger_reference',
        'snapshot_id', v_snapshot_id
      );
    END IF;
  END IF;
  
  -- Get opening AUM from last non-voided checkpoint
  SELECT closing_aum, event_ts INTO v_last_checkpoint
  FROM fund_aum_events
  WHERE fund_id = p_fund_id
    AND is_voided = false
    AND event_ts < p_event_ts
  ORDER BY event_ts DESC
  LIMIT 1;
  
  IF FOUND THEN
    v_opening_aum := v_last_checkpoint.closing_aum;
  ELSE
    -- No prior checkpoint, use 0 or the first AUM record
    SELECT total_aum INTO v_opening_aum
    FROM fund_daily_aum
    WHERE fund_id = p_fund_id
      AND is_voided = false
    ORDER BY aum_date ASC
    LIMIT 1;
    
    v_opening_aum := COALESCE(v_opening_aum, 0);
  END IF;
  
  -- Calculate gross yield
  v_gross_yield := p_closing_aum - v_opening_aum;
  
  -- CRITICAL: Yield cannot be negative
  IF v_gross_yield < 0 THEN
    RAISE EXCEPTION 'Yield cannot be negative. Opening AUM: %, Closing AUM: %, Calculated yield: %. Please correct the AUM snapshot.', 
      v_opening_aum, p_closing_aum, v_gross_yield;
  END IF;
  
  -- Insert fund_aum_events checkpoint for yield
  INSERT INTO fund_aum_events (
    fund_id,
    event_ts,
    event_date,
    purpose,
    trigger_type,
    trigger_reference,
    opening_aum,
    closing_aum,
    created_by,
    created_at
  ) VALUES (
    p_fund_id,
    p_event_ts,
    v_event_date,
    p_purpose,
    p_trigger_type,
    p_trigger_reference,
    v_opening_aum,
    p_closing_aum,
    p_admin_id,
    now()
  )
  RETURNING id INTO v_snapshot_id;
  
  -- If zero yield, we're done (checkpoint recorded but no distributions needed)
  IF v_gross_yield = 0 THEN
    RETURN jsonb_build_object(
      'success', true,
      'skipped', false,
      'snapshot_id', v_snapshot_id,
      'fund_id', p_fund_id,
      'trigger_date', v_event_date,
      'trigger_type', p_trigger_type,
      'opening_aum', v_opening_aum,
      'closing_aum', p_closing_aum,
      'gross_yield', 0,
      'investors_processed', 0,
      'total_yield_distributed', 0
    );
  END IF;
  
  -- Get total positions for pro-rata calculation
  -- NOTE: fees_account IS included per user requirement "Never exclude"
  SELECT COALESCE(SUM(ip.current_value), 0) INTO v_total_positions
  FROM investor_positions ip
  JOIN profiles p ON p.id = ip.investor_id
  WHERE ip.fund_id = p_fund_id
    AND ip.current_value > 0;
  
  IF v_total_positions <= 0 THEN
    RETURN jsonb_build_object(
      'success', true,
      'skipped', false,
      'snapshot_id', v_snapshot_id,
      'fund_id', p_fund_id,
      'trigger_date', v_event_date,
      'trigger_type', p_trigger_type,
      'opening_aum', v_opening_aum,
      'closing_aum', p_closing_aum,
      'gross_yield', v_gross_yield,
      'investors_processed', 0,
      'total_yield_distributed', 0,
      'reason', 'No investor positions with positive balance'
    );
  END IF;
  
  -- Distribute yield pro-rata to all investors (including fees_account)
  FOR v_investor IN
    SELECT 
      ip.investor_id,
      ip.current_value,
      p.first_name,
      p.last_name
    FROM investor_positions ip
    JOIN profiles p ON p.id = ip.investor_id
    WHERE ip.fund_id = p_fund_id
      AND ip.current_value > 0
    ORDER BY ip.current_value DESC
  LOOP
    -- Calculate pro-rata share (10 decimal precision)
    v_investor_share := ROUND(v_investor.current_value / v_total_positions, 10);
    v_investor_yield := ROUND(v_gross_yield * v_investor_share, 10);
    
    -- Track largest investor for remainder allocation
    IF v_investor.current_value > v_largest_balance THEN
      v_largest_balance := v_investor.current_value;
      v_largest_investor_id := v_investor.investor_id;
    END IF;
    
    -- Generate deterministic reference_id
    v_reference_id := 'YLD:' || v_fund.code || ':' || to_char(v_event_date, 'YYYYMMDD') || ':' || 
                      left(v_investor.investor_id::text, 8) || ':' || 
                      COALESCE(left(p_trigger_reference, 20), left(v_snapshot_id::text, 8));
    
    -- Check idempotency for this specific yield transaction
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE reference_id = v_reference_id
        AND is_voided = false
    ) THEN
      -- Insert YIELD transaction
      INSERT INTO transactions_v2 (
        investor_id,
        fund_id,
        type,
        amount,
        tx_date,
        value_date,
        asset,
        purpose,
        source,
        reference_id,
        visibility_scope,
        notes,
        created_by
      ) VALUES (
        v_investor.investor_id,
        p_fund_id,
        'YIELD'::tx_type,
        v_investor_yield,
        v_event_date,
        v_event_date,
        v_fund.asset,
        p_purpose,
        'yield_distribution'::tx_source,
        v_reference_id,
        'investor_visible',
        'Yield crystallization: ' || p_trigger_type,
        p_admin_id
      );
      
      v_tx_count := v_tx_count + 1;
    END IF;
    
    v_distributed_yield := v_distributed_yield + v_investor_yield;
  END LOOP;
  
  -- Handle remainder (allocate to largest balance investor deterministically)
  v_remainder := v_gross_yield - v_distributed_yield;
  IF v_remainder > 0 AND v_largest_investor_id IS NOT NULL THEN
    v_reference_id := 'YLD:' || v_fund.code || ':' || to_char(v_event_date, 'YYYYMMDD') || ':' || 
                      left(v_largest_investor_id::text, 8) || ':REMAINDER:' || 
                      COALESCE(left(p_trigger_reference, 20), left(v_snapshot_id::text, 8));
    
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE reference_id = v_reference_id
        AND is_voided = false
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id,
        fund_id,
        type,
        amount,
        tx_date,
        value_date,
        asset,
        purpose,
        source,
        reference_id,
        visibility_scope,
        notes,
        created_by
      ) VALUES (
        v_largest_investor_id,
        p_fund_id,
        'YIELD'::tx_type,
        v_remainder,
        v_event_date,
        v_event_date,
        v_fund.asset,
        p_purpose,
        'yield_distribution'::tx_source,
        v_reference_id,
        'investor_visible',
        'Yield remainder allocation',
        p_admin_id
      );
      
      v_tx_count := v_tx_count + 1;
    END IF;
    
    v_distributed_yield := v_distributed_yield + v_remainder;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'skipped', false,
    'snapshot_id', v_snapshot_id,
    'fund_id', p_fund_id,
    'trigger_date', v_event_date,
    'trigger_type', p_trigger_type,
    'period_start', v_last_checkpoint.event_ts,
    'opening_aum', v_opening_aum,
    'closing_aum', p_closing_aum,
    'gross_yield', v_gross_yield,
    'investors_processed', v_tx_count,
    'total_yield_distributed', v_distributed_yield
  );
END;
$$;

-- Create month-end crystallization wrapper
CREATE OR REPLACE FUNCTION public.crystallize_month_end(
  p_fund_id uuid,
  p_month_end_date date,
  p_closing_aum numeric(28,10),
  p_admin_id uuid
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result jsonb;
  v_trigger_reference text;
  v_month_end_ts timestamptz;
BEGIN
  -- Generate deterministic trigger reference for month-end
  v_trigger_reference := 'MONTH_END:' || p_fund_id::text || ':' || to_char(p_month_end_date, 'YYYY-MM');
  
  -- Use end of day for month-end timestamp
  v_month_end_ts := (p_month_end_date::timestamp + interval '23 hours 59 minutes 59 seconds')::timestamptz;
  
  -- Call the main crystallization function with month_end trigger type
  v_result := public.crystallize_yield_before_flow(
    p_fund_id,
    v_month_end_ts,
    p_closing_aum,
    'month_end',
    v_trigger_reference,
    'reporting'::public.aum_purpose,
    p_admin_id
  );
  
  -- Add month-end specific info to result
  v_result := v_result || jsonb_build_object(
    'month_end_date', p_month_end_date,
    'is_month_end', true
  );
  
  RETURN v_result;
END;
$$;

-- Create trigger to sync YIELD transactions to investor_yield_events (derived reporting)
CREATE OR REPLACE FUNCTION public.sync_yield_to_investor_yield_events()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_fund record;
  v_aum_event record;
BEGIN
  -- Only process YIELD transactions that are not voided
  IF NEW.type = 'YIELD'::public.tx_type AND NOT NEW.is_voided THEN
    -- Get fund info
    SELECT * INTO v_fund FROM funds WHERE id = NEW.fund_id;
    
    -- Try to find the related AUM event for period info
    SELECT * INTO v_aum_event
    FROM fund_aum_events
    WHERE fund_id = NEW.fund_id
      AND event_date = NEW.tx_date
      AND is_voided = false
    ORDER BY event_ts DESC
    LIMIT 1;
    
    -- Insert into investor_yield_events for derived reporting
    INSERT INTO public.investor_yield_events (
      investor_id,
      fund_id,
      event_date,
      trigger_type,
      trigger_transaction_id,
      fund_aum_before,
      fund_aum_after,
      investor_balance,
      investor_share_pct,
      fund_yield_pct,
      gross_yield_amount,
      fee_pct,
      fee_amount,
      net_yield_amount,
      period_start,
      period_end,
      days_in_period,
      visibility_scope,
      reference_id,
      created_by
    )
    VALUES (
      NEW.investor_id,
      NEW.fund_id,
      NEW.tx_date,
      COALESCE(v_aum_event.trigger_type, 'yield'),
      NEW.id,
      COALESCE(v_aum_event.opening_aum, 0),
      COALESCE(v_aum_event.closing_aum, 0),
      0,
      0,
      0,
      NEW.amount,
      0,
      0,
      NEW.amount,
      COALESCE(v_aum_event.event_date, NEW.tx_date),
      NEW.tx_date,
      1,
      COALESCE(NEW.visibility_scope, 'investor_visible'),
      NEW.reference_id,
      NEW.created_by
    )
    ON CONFLICT (reference_id) WHERE reference_id IS NOT NULL
    DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists, then create new one
DROP TRIGGER IF EXISTS trg_sync_yield_to_events ON public.transactions_v2;

CREATE TRIGGER trg_sync_yield_to_events
AFTER INSERT ON public.transactions_v2
FOR EACH ROW
WHEN (NEW.type = 'YIELD'::public.tx_type)
EXECUTE FUNCTION public.sync_yield_to_investor_yield_events();

-- Validate CHECK constraints
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_transactions_v2_deposit_amount_sign') THEN
    ALTER TABLE transactions_v2 VALIDATE CONSTRAINT chk_transactions_v2_deposit_amount_sign;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_transactions_v2_withdrawal_amount_sign') THEN
    ALTER TABLE transactions_v2 VALIDATE CONSTRAINT chk_transactions_v2_withdrawal_amount_sign;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_transactions_v2_yield_amount_nonnegative') THEN
    ALTER TABLE transactions_v2 VALIDATE CONSTRAINT chk_transactions_v2_yield_amount_nonnegative;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_transactions_v2_yield_reference_required') THEN
    ALTER TABLE transactions_v2 VALIDATE CONSTRAINT chk_transactions_v2_yield_reference_required;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_transactions_v2_internal_credit_amount_sign') THEN
    ALTER TABLE transactions_v2 VALIDATE CONSTRAINT chk_transactions_v2_internal_credit_amount_sign;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_transactions_v2_internal_withdrawal_amount_sign') THEN
    ALTER TABLE transactions_v2 VALIDATE CONSTRAINT chk_transactions_v2_internal_withdrawal_amount_sign;
  END IF;
END $$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.crystallize_yield_before_flow(uuid, timestamptz, numeric, text, text, aum_purpose, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.crystallize_month_end(uuid, date, numeric, uuid) TO authenticated;