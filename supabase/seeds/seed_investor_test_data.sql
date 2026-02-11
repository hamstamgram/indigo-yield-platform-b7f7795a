-- Seed investor-visible test data for QA investor
-- Run this to create data that passes E2E tests

DO $$
DECLARE
  v_investor_id uuid;
  v_fund_id uuid;
  v_admin_id uuid;
  v_position_value numeric;
BEGIN
  -- Get QA investor
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'qa.investor@indigo.fund';
  IF v_investor_id IS NULL THEN
    RAISE NOTICE 'QA investor not found, skipping';
    RETURN;
  END IF;
  
  -- Get admin for created_by
  SELECT id INTO v_admin_id FROM profiles WHERE is_admin = true LIMIT 1;
  
  -- Get a fund with active position for investor
  SELECT ip.fund_id, ip.current_value INTO v_fund_id, v_position_value
  FROM investor_positions ip
  WHERE ip.investor_id = v_investor_id AND ip.is_active = true
  LIMIT 1;
  
  IF v_fund_id IS NULL THEN
    RAISE NOTICE 'No active positions for QA investor, skipping';
    RETURN;
  END IF;
  
  RAISE NOTICE 'Seeding data for investor % in fund %', v_investor_id, v_fund_id;
  
  -- 1. Create investor-visible yield event (simulates reporting distribution)
  INSERT INTO investor_yield_events (
    investor_id,
    fund_id,
    event_date,
    trigger_type,
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
    made_visible_at,
    is_voided
  ) VALUES (
    v_investor_id,
    v_fund_id,
    CURRENT_DATE - INTERVAL '1 day',
    'reporting',
    v_position_value,
    100.0,
    0.5,
    v_position_value * 0.005, -- 0.5% gross yield
    10.0,
    v_position_value * 0.005 * 0.1, -- 10% fee
    v_position_value * 0.005 * 0.9, -- net after fee
    (CURRENT_DATE - INTERVAL '1 month')::date,
    (CURRENT_DATE - INTERVAL '1 day')::date,
    30,
    'investor_visible',
    NOW(),
    false
  ) ON CONFLICT DO NOTHING;
  
  RAISE NOTICE 'Created investor-visible yield event';
  
  -- 2. Create pending withdrawal request
  INSERT INTO withdrawal_requests (
    investor_id,
    fund_id,
    requested_amount,
    status,
    request_date,
    notes,
    created_by
  ) VALUES (
    v_investor_id,
    v_fund_id,
    100.0,
    'pending',
    CURRENT_DATE,
    'Test pending withdrawal for E2E',
    COALESCE(v_admin_id, v_investor_id)
  ) ON CONFLICT DO NOTHING;
  
  RAISE NOTICE 'Created pending withdrawal request';
  
  -- 3. Create an investor-visible transaction if none exist
  INSERT INTO transactions_v2 (
    investor_id,
    fund_id,
    tx_date,
    value_date,
    type,
    amount,
    balance_before,
    balance_after,
    reference_id,
    notes,
    visibility_scope,
    is_voided,
    created_by
  )
  SELECT
    v_investor_id,
    v_fund_id,
    CURRENT_DATE - INTERVAL '7 days',
    CURRENT_DATE - INTERVAL '7 days',
    'DEPOSIT',
    1000.0,
    0,
    1000.0,
    'E2E_TEST_DEPOSIT_' || v_investor_id::text,
    'E2E test deposit',
    'investor_visible',
    false,
    COALESCE(v_admin_id, v_investor_id)
  WHERE NOT EXISTS (
    SELECT 1 FROM transactions_v2
    WHERE investor_id = v_investor_id
    AND visibility_scope = 'investor_visible'
    AND is_voided = false
    LIMIT 1
  );
  
  RAISE NOTICE 'Seed complete for QA investor';
END;
$$;
