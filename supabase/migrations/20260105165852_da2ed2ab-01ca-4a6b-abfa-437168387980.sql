-- Drop all existing overloads of the functions
DROP FUNCTION IF EXISTS public.crystallize_yield_before_flow(uuid, text, date, uuid, uuid);
DROP FUNCTION IF EXISTS public.crystallize_yield_before_flow(uuid, uuid, date, numeric, uuid);
DROP FUNCTION IF EXISTS public.crystallize_yield_before_flow(uuid, timestamptz, numeric, text, text, aum_purpose, uuid);
DROP FUNCTION IF EXISTS public.crystallize_yield_before_flow(uuid, numeric, text, text, timestamptz, uuid, aum_purpose);

DROP FUNCTION IF EXISTS public.apply_deposit_with_crystallization(uuid, uuid, numeric, timestamptz, numeric, text, aum_purpose, uuid);
DROP FUNCTION IF EXISTS public.apply_withdrawal_with_crystallization(uuid, uuid, numeric, timestamptz, numeric, text, aum_purpose, uuid);

-- 1. Add post_flow_aum column to fund_aum_events (if not exists)
ALTER TABLE public.fund_aum_events 
ADD COLUMN IF NOT EXISTS post_flow_aum numeric(28,10) NULL;

COMMENT ON COLUMN public.fund_aum_events.post_flow_aum IS 
  'AUM after the flow transaction is applied. Used as opening_aum for the next yield calculation.';

-- 2. Create crystallize_yield_before_flow with corrected logic
CREATE OR REPLACE FUNCTION public.crystallize_yield_before_flow(
  p_fund_id uuid,
  p_closing_aum numeric,
  p_trigger_type text,
  p_trigger_reference text,
  p_event_ts timestamptz,
  p_admin_id uuid,
  p_purpose aum_purpose DEFAULT 'reporting'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last_checkpoint RECORD;
  v_opening_aum numeric(28,10);
  v_yield_amount numeric(28,10);
  v_yield_pct numeric(18,10);
  v_event_date date;
  v_period_start date;
  v_days_in_period int;
  v_snapshot_id uuid;
  v_investors_processed int := 0;
  v_total_yield_distributed numeric(28,10) := 0;
  v_investor RECORD;
  v_investor_yield numeric(28,10);
  v_investor_fee numeric(28,10);
  v_investor_net numeric(28,10);
  v_fee_pct numeric(10,6);
  v_reference_id text;
BEGIN
  v_event_date := (p_event_ts AT TIME ZONE 'UTC')::date;
  
  -- Get last checkpoint - USE post_flow_aum if available, otherwise closing_aum
  SELECT 
    id,
    COALESCE(post_flow_aum, closing_aum) as effective_aum,
    event_ts,
    event_date
  INTO v_last_checkpoint
  FROM fund_aum_events
  WHERE fund_id = p_fund_id
    AND is_voided = false
    AND purpose = p_purpose
    AND event_ts < p_event_ts
  ORDER BY event_ts DESC
  LIMIT 1;
  
  -- Determine opening AUM and period start
  IF v_last_checkpoint.id IS NULL THEN
    v_opening_aum := 0;
    v_period_start := v_event_date;
  ELSE
    v_opening_aum := v_last_checkpoint.effective_aum;
    v_period_start := v_last_checkpoint.event_date;
  END IF;
  
  v_days_in_period := v_event_date - v_period_start;
  v_yield_amount := p_closing_aum - v_opening_aum;
  
  IF v_opening_aum > 0 THEN
    v_yield_pct := (v_yield_amount / v_opening_aum) * 100;
  ELSE
    v_yield_pct := 0;
  END IF;
  
  -- Insert the AUM checkpoint event
  INSERT INTO fund_aum_events (
    fund_id, event_date, event_ts, trigger_type, trigger_reference,
    opening_aum, closing_aum, purpose, created_by
  ) VALUES (
    p_fund_id, v_event_date, p_event_ts, p_trigger_type, p_trigger_reference,
    v_opening_aum, p_closing_aum, p_purpose, p_admin_id
  )
  RETURNING id INTO v_snapshot_id;
  
  -- Only distribute yield if there's actual positive yield and opening AUM > 0
  IF v_yield_amount > 0 AND v_opening_aum > 0 THEN
    INSERT INTO fund_yield_snapshots (
      fund_id, snapshot_date, opening_aum, closing_aum, gross_yield_pct, gross_yield_amount,
      period_start, period_end, days_in_period, trigger_type, trigger_reference, created_by
    ) VALUES (
      p_fund_id, v_event_date, v_opening_aum, p_closing_aum, v_yield_pct, v_yield_amount,
      v_period_start, v_event_date, v_days_in_period, p_trigger_type, p_trigger_reference, p_admin_id
    );
    
    FOR v_investor IN
      SELECT ip.investor_id, ip.current_value, COALESCE(ifs.fee_pct, 0.30) as fee_pct
      FROM investor_positions ip
      LEFT JOIN investor_fee_schedule ifs ON ifs.investor_id = ip.investor_id
        AND ifs.fund_id = p_fund_id
        AND ifs.effective_date <= v_event_date
        AND (ifs.end_date IS NULL OR ifs.end_date >= v_event_date)
      WHERE ip.fund_id = p_fund_id AND ip.current_value > 0
    LOOP
      v_investor_yield := v_yield_amount * (v_investor.current_value / v_opening_aum);
      v_fee_pct := v_investor.fee_pct;
      v_investor_fee := v_investor_yield * v_fee_pct;
      v_investor_net := v_investor_yield - v_investor_fee;
      v_reference_id := 'YLD:' || p_fund_id::text || ':' || v_event_date::text || ':' || v_investor.investor_id::text;
      
      INSERT INTO investor_yield_events (
        investor_id, fund_id, event_date, trigger_type, trigger_transaction_id,
        fund_aum_before, fund_aum_after, investor_balance, investor_share_pct,
        fund_yield_pct, gross_yield_amount, fee_pct, fee_amount, net_yield_amount,
        period_start, period_end, days_in_period, visibility_scope, reference_id, created_by
      ) VALUES (
        v_investor.investor_id, p_fund_id, v_event_date, p_trigger_type,
        CASE WHEN p_trigger_reference ~ '^[0-9a-f-]{36}$' THEN p_trigger_reference::uuid ELSE NULL END,
        v_opening_aum, p_closing_aum, v_investor.current_value,
        (v_investor.current_value / v_opening_aum) * 100, v_yield_pct, v_investor_yield,
        v_fee_pct, v_investor_fee, v_investor_net, v_period_start, v_event_date,
        v_days_in_period, 'admin_only', v_reference_id, p_admin_id
      );
      
      v_investors_processed := v_investors_processed + 1;
      v_total_yield_distributed := v_total_yield_distributed + v_investor_net;
    END LOOP;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true, 'snapshot_id', v_snapshot_id, 'fund_id', p_fund_id,
    'trigger_date', v_event_date, 'trigger_type', p_trigger_type,
    'period_start', v_period_start, 'opening_aum', v_opening_aum,
    'closing_aum', p_closing_aum, 'fund_yield_pct', v_yield_pct,
    'gross_yield', v_yield_amount, 'investors_processed', v_investors_processed,
    'total_yield_distributed', v_total_yield_distributed
  );
END;
$$;

-- 3. Create apply_deposit_with_crystallization with post_flow_aum
CREATE OR REPLACE FUNCTION public.apply_deposit_with_crystallization(
  p_fund_id uuid,
  p_investor_id uuid,
  p_amount numeric,
  p_closing_aum numeric,
  p_effective_date date,
  p_admin_id uuid,
  p_notes text DEFAULT NULL,
  p_purpose aum_purpose DEFAULT 'reporting'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_crystal_result jsonb;
  v_tx_id uuid;
  v_snapshot_id uuid;
  v_event_ts timestamptz;
  v_post_flow_aum numeric(28,10);
  v_current_position numeric(28,10);
  v_new_position numeric(28,10);
BEGIN
  SELECT asset INTO STRICT v_current_position FROM funds WHERE id = p_fund_id;
  
  v_event_ts := (p_effective_date::timestamp AT TIME ZONE 'UTC') + interval '12 hours';
  
  v_crystal_result := crystallize_yield_before_flow(
    p_fund_id, p_closing_aum, 'deposit', NULL, v_event_ts, p_admin_id, p_purpose
  );
  
  v_snapshot_id := (v_crystal_result->>'snapshot_id')::uuid;
  
  SELECT COALESCE(current_value, 0) INTO v_current_position
  FROM investor_positions WHERE investor_id = p_investor_id AND fund_id = p_fund_id;
  v_current_position := COALESCE(v_current_position, 0);
  v_new_position := v_current_position + p_amount;
  
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_type, amount, effective_date, tx_date,
    purpose, notes, status, created_by, reference_id
  ) VALUES (
    p_investor_id, p_fund_id, 'DEPOSIT', p_amount, p_effective_date, p_effective_date,
    p_purpose, COALESCE(p_notes, 'Deposit with yield crystallization'), 'completed', p_admin_id,
    'DEP:' || p_fund_id::text || ':' || p_effective_date::text || ':' || p_investor_id::text
  ) RETURNING id INTO v_tx_id;
  
  INSERT INTO investor_positions (investor_id, fund_id, current_value, cost_basis, shares, last_transaction_date)
  VALUES (p_investor_id, p_fund_id, v_new_position, v_new_position, v_new_position, p_effective_date)
  ON CONFLICT (investor_id, fund_id) DO UPDATE SET
    current_value = investor_positions.current_value + p_amount,
    cost_basis = investor_positions.cost_basis + p_amount,
    shares = investor_positions.shares + p_amount,
    last_transaction_date = p_effective_date, updated_at = now();
  
  v_post_flow_aum := p_closing_aum + p_amount;
  
  UPDATE fund_aum_events SET post_flow_aum = v_post_flow_aum, trigger_reference = v_tx_id::text
  WHERE id = v_snapshot_id;
  
  RETURN jsonb_build_object(
    'success', true, 'transaction_id', v_tx_id, 'snapshot_id', v_snapshot_id,
    'crystallization', v_crystal_result, 'deposit_amount', p_amount,
    'previous_position', v_current_position, 'new_position', v_new_position,
    'closing_aum', p_closing_aum, 'post_flow_aum', v_post_flow_aum
  );
END;
$$;

-- 4. Create apply_withdrawal_with_crystallization with post_flow_aum
CREATE OR REPLACE FUNCTION public.apply_withdrawal_with_crystallization(
  p_fund_id uuid,
  p_investor_id uuid,
  p_amount numeric,
  p_closing_aum numeric,
  p_effective_date date,
  p_admin_id uuid,
  p_notes text DEFAULT NULL,
  p_purpose aum_purpose DEFAULT 'reporting'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_crystal_result jsonb;
  v_tx_id uuid;
  v_snapshot_id uuid;
  v_event_ts timestamptz;
  v_post_flow_aum numeric(28,10);
  v_current_position numeric(28,10);
  v_new_position numeric(28,10);
BEGIN
  v_event_ts := (p_effective_date::timestamp AT TIME ZONE 'UTC') + interval '12 hours';
  
  SELECT COALESCE(current_value, 0) INTO v_current_position
  FROM investor_positions WHERE investor_id = p_investor_id AND fund_id = p_fund_id;
  
  IF v_current_position IS NULL OR v_current_position < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance. Current: %, Requested: %', COALESCE(v_current_position, 0), p_amount;
  END IF;
  
  v_new_position := v_current_position - p_amount;
  
  v_crystal_result := crystallize_yield_before_flow(
    p_fund_id, p_closing_aum, 'withdrawal', NULL, v_event_ts, p_admin_id, p_purpose
  );
  
  v_snapshot_id := (v_crystal_result->>'snapshot_id')::uuid;
  
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_type, amount, effective_date, tx_date,
    purpose, notes, status, created_by, reference_id
  ) VALUES (
    p_investor_id, p_fund_id, 'WITHDRAWAL', p_amount, p_effective_date, p_effective_date,
    p_purpose, COALESCE(p_notes, 'Withdrawal with yield crystallization'), 'completed', p_admin_id,
    'WDR:' || p_fund_id::text || ':' || p_effective_date::text || ':' || p_investor_id::text
  ) RETURNING id INTO v_tx_id;
  
  UPDATE investor_positions SET
    current_value = v_new_position, shares = v_new_position,
    last_transaction_date = p_effective_date, updated_at = now()
  WHERE investor_id = p_investor_id AND fund_id = p_fund_id;
  
  v_post_flow_aum := p_closing_aum - p_amount;
  
  UPDATE fund_aum_events SET post_flow_aum = v_post_flow_aum, trigger_reference = v_tx_id::text
  WHERE id = v_snapshot_id;
  
  RETURN jsonb_build_object(
    'success', true, 'transaction_id', v_tx_id, 'snapshot_id', v_snapshot_id,
    'crystallization', v_crystal_result, 'withdrawal_amount', p_amount,
    'previous_position', v_current_position, 'new_position', v_new_position,
    'closing_aum', p_closing_aum, 'post_flow_aum', v_post_flow_aum
  );
END;
$$;

-- 5. Grant permissions
GRANT EXECUTE ON FUNCTION public.crystallize_yield_before_flow(uuid, numeric, text, text, timestamptz, uuid, aum_purpose) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_deposit_with_crystallization(uuid, uuid, numeric, numeric, date, uuid, text, aum_purpose) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_withdrawal_with_crystallization(uuid, uuid, numeric, numeric, date, uuid, text, aum_purpose) TO authenticated;