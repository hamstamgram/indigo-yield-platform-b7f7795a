DO $$
DECLARE
  v_dist_id uuid := 'ba6cc885-8c4b-4b1b-b686-50907aa57a43';
  v_admin_id uuid;
  v_fund_id uuid := '58f8bcad-56b0-4369-a6c6-34c5d4aaa961';
  r record;
BEGIN
  SELECT id INTO v_admin_id FROM profiles WHERE email = 'qa.admin@indigo.fund';
  
  -- 1. Void the distribution (this voids associated YIELD, FEE_CREDIT, IB_CREDIT txs)
  RAISE NOTICE 'Voiding distribution %', v_dist_id;
  PERFORM void_yield_distribution(v_dist_id, v_admin_id, '[SIM] Reset for clean start');
  
  -- 2. Void any remaining deposits/adjustments for this specific fund
  FOR r IN (SELECT id, reference_id FROM transactions_v2 WHERE fund_id = v_fund_id AND is_voided = false) LOOP
    RAISE NOTICE 'Voiding transaction % (ref: %)', r.id, r.reference_id;
    PERFORM void_transaction(r.id, v_admin_id, '[SIM] Reset for clean start');
  END LOOP;
  
  -- 3. Hard delete ephemeral AUM/yield tracking records for this fund to ensure clean simulation
  RAISE NOTICE 'Cleaning up snapshots and daily AUM for fund %', v_fund_id;
  DELETE FROM fund_yield_snapshots WHERE fund_id = v_fund_id;
  DELETE FROM fund_aum_events WHERE fund_id = v_fund_id;
  DELETE FROM fund_daily_aum WHERE fund_id = v_fund_id;
  
  -- 4. Reset position crystallization dates to simulate a brand new fund
  UPDATE investor_positions 
  SET last_yield_crystallization_date = '2025-11-01',
      shares = 0,
      current_value = 0,
      cost_basis = 0
  WHERE fund_id = v_fund_id;
  
  RAISE NOTICE 'Cleanup complete for fund %', v_fund_id;
END $$;
