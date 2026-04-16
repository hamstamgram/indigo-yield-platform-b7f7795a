
-- Retroactive DUST_SWEEP correction for Ryan Van Der Wall's IND-XRP full exit
DO $$
DECLARE
  v_ryan_id uuid := 'f462d9e5-7363-4c82-a144-4e694d2b55da';
  v_fund_id uuid := '2c123c4f-76b4-4504-867e-059649855417';
  v_fees_id uuid := 'b464a3f7-60d5-4bc0-9833-7b413bcc6cae';
  v_dust numeric(38,18);
  v_tx_date date := '2026-03-24';
  v_ref_out text := 'DUST_SWEEP_RETRO_OUT:ryan-xrp-20260324';
  v_ref_in  text := 'DUST_SWEEP_RETRO_IN:ryan-xrp-20260324';
BEGIN
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  IF EXISTS (SELECT 1 FROM transactions_v2 WHERE reference_id = v_ref_out AND is_voided = false) THEN
    RETURN;
  END IF;

  SELECT COALESCE(current_value, 0) INTO v_dust
  FROM investor_positions
  WHERE investor_id = v_ryan_id AND fund_id = v_fund_id;

  IF v_dust IS NULL OR v_dust <= 0 THEN
    RETURN;
  END IF;

  -- DUST_SWEEP debit from Ryan
  INSERT INTO transactions_v2 (
    fund_id, investor_id, type, amount, tx_date, asset, fund_class,
    reference_id, notes, is_voided, visibility_scope, source
  ) VALUES (
    v_fund_id, v_ryan_id, 'DUST_SWEEP', -v_dust, v_tx_date, 'XRP', 'XRP',
    v_ref_out,
    'Retroactive dust sweep: full exit residual ' || v_dust::text || ' XRP swept to Indigo Fees',
    false, 'admin_only', 'migration'
  );

  -- DUST_SWEEP credit to Indigo Fees
  INSERT INTO transactions_v2 (
    fund_id, investor_id, type, amount, tx_date, asset, fund_class,
    reference_id, notes, is_voided, visibility_scope, source
  ) VALUES (
    v_fund_id, v_fees_id, 'DUST_SWEEP', v_dust, v_tx_date, 'XRP', 'XRP',
    v_ref_in,
    'Dust received from Ryan Van Der Wall full exit: ' || v_dust::text || ' XRP',
    false, 'admin_only', 'migration'
  );

  -- Deactivate Ryan's position
  UPDATE investor_positions
  SET is_active = false, updated_at = NOW()
  WHERE investor_id = v_ryan_id AND fund_id = v_fund_id;
END;
$$;
