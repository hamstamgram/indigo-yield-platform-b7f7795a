-- Generated yield distribution script
-- Applies 45 month-fund yield distributions via V5 engine
-- Generated at 2026-02-17T21:21:35.603Z

-- 2024-08 BTC: 2 segments, gross_yield = 0.0321682150
DO $$
DECLARE
  v_opening numeric;
  v_flows numeric;
  v_balance_sum numeric;
  v_recorded_aum numeric;
  v_result jsonb;
  v_gross_yield numeric := 0.0321682150;
  v_activated integer;
BEGIN
  -- Set auth context
  PERFORM set_config('request.jwt.claim.sub', 'a16a7e50-fefd-4bfe-897c-d16279b457c2', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"a16a7e50-fefd-4bfe-897c-d16279b457c2","role":"authenticated"}', true);
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Ensure all positions for this fund are active (V5 only processes active positions)
  UPDATE investor_positions SET is_active = true
  WHERE fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid AND is_active = false;
  GET DIAGNOSTICS v_activated = ROW_COUNT;
  IF v_activated > 0 THEN
    RAISE NOTICE '2024-08 BTC: Activated % positions', v_activated;
  END IF;

  -- V5-matching balance_sum: per-investor opening through investor_positions
  SELECT COALESCE(SUM(inv_balance), 0) INTO v_opening
  FROM (
    SELECT COALESCE((
      SELECT SUM(t.amount) FROM transactions_v2 t
      WHERE t.investor_id = ip.investor_id
        AND t.fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid
        AND t.tx_date < '2024-08-01'::date
        AND t.is_voided = false
    ), 0) as inv_balance
    FROM investor_positions ip
    WHERE ip.fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid AND ip.is_active = true
  ) sub;

  -- V5-matching flows: DEP/WD/ADJ within period for active investors only
  SELECT COALESCE(SUM(t.amount), 0) INTO v_flows
  FROM transactions_v2 t
  WHERE t.fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid
    AND t.is_voided = false
    AND t.type IN ('DEPOSIT'::tx_type, 'WITHDRAWAL'::tx_type, 'ADJUSTMENT'::tx_type)
    AND t.tx_date >= '2024-08-01'::date
    AND t.tx_date <= '2024-08-31'::date
    AND t.investor_id IN (
      SELECT ip.investor_id FROM investor_positions ip
      WHERE ip.fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid AND ip.is_active = true
    );

  v_balance_sum := v_opening + v_flows;
  v_recorded_aum := v_balance_sum + v_gross_yield;

  RAISE NOTICE '2024-08 BTC: opening=%, flows=%, balance_sum=%, gross_yield=%, recorded_aum=%',
    v_opening, v_flows, v_balance_sum, v_gross_yield, v_recorded_aum;

  -- Call V5 apply
  v_result := apply_segmented_yield_distribution_v5(
    p_fund_id := '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    p_period_end := '2024-08-31'::date,
    p_recorded_aum := v_recorded_aum,
    p_admin_id := 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid,
    p_purpose := 'reporting'::aum_purpose
  );

  -- Check result
  IF (v_result->>'success')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION '2024-08 BTC FAILED: %', v_result->>'error';
  END IF;

  -- Re-activate any positions that went inactive from YIELD transactions
  UPDATE investor_positions SET is_active = true
  WHERE fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid AND is_active = false;

  RAISE NOTICE '2024-08 BTC SUCCESS: gross=%, net=%, fees=%, ib=%',
    v_result->'summary'->>'total_gross',
    v_result->'summary'->>'total_net',
    v_result->'summary'->>'total_fees',
    v_result->'summary'->>'total_ib';
END;
$$;

-- 2024-09 BTC: 1 segments, gross_yield = 0.0100181818
DO $$
DECLARE
  v_opening numeric;
  v_flows numeric;
  v_balance_sum numeric;
  v_recorded_aum numeric;
  v_result jsonb;
  v_gross_yield numeric := 0.0100181818;
  v_activated integer;
BEGIN
  -- Set auth context
  PERFORM set_config('request.jwt.claim.sub', 'a16a7e50-fefd-4bfe-897c-d16279b457c2', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"a16a7e50-fefd-4bfe-897c-d16279b457c2","role":"authenticated"}', true);
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Ensure all positions for this fund are active (V5 only processes active positions)
  UPDATE investor_positions SET is_active = true
  WHERE fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid AND is_active = false;
  GET DIAGNOSTICS v_activated = ROW_COUNT;
  IF v_activated > 0 THEN
    RAISE NOTICE '2024-09 BTC: Activated % positions', v_activated;
  END IF;

  -- V5-matching balance_sum: per-investor opening through investor_positions
  SELECT COALESCE(SUM(inv_balance), 0) INTO v_opening
  FROM (
    SELECT COALESCE((
      SELECT SUM(t.amount) FROM transactions_v2 t
      WHERE t.investor_id = ip.investor_id
        AND t.fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid
        AND t.tx_date < '2024-09-01'::date
        AND t.is_voided = false
    ), 0) as inv_balance
    FROM investor_positions ip
    WHERE ip.fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid AND ip.is_active = true
  ) sub;

  -- V5-matching flows: DEP/WD/ADJ within period for active investors only
  SELECT COALESCE(SUM(t.amount), 0) INTO v_flows
  FROM transactions_v2 t
  WHERE t.fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid
    AND t.is_voided = false
    AND t.type IN ('DEPOSIT'::tx_type, 'WITHDRAWAL'::tx_type, 'ADJUSTMENT'::tx_type)
    AND t.tx_date >= '2024-09-01'::date
    AND t.tx_date <= '2024-09-30'::date
    AND t.investor_id IN (
      SELECT ip.investor_id FROM investor_positions ip
      WHERE ip.fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid AND ip.is_active = true
    );

  v_balance_sum := v_opening + v_flows;
  v_recorded_aum := v_balance_sum + v_gross_yield;

  RAISE NOTICE '2024-09 BTC: opening=%, flows=%, balance_sum=%, gross_yield=%, recorded_aum=%',
    v_opening, v_flows, v_balance_sum, v_gross_yield, v_recorded_aum;

  -- Call V5 apply
  v_result := apply_segmented_yield_distribution_v5(
    p_fund_id := '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    p_period_end := '2024-09-30'::date,
    p_recorded_aum := v_recorded_aum,
    p_admin_id := 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid,
    p_purpose := 'reporting'::aum_purpose
  );

  -- Check result
  IF (v_result->>'success')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION '2024-09 BTC FAILED: %', v_result->>'error';
  END IF;

  -- Re-activate any positions that went inactive from YIELD transactions
  UPDATE investor_positions SET is_active = true
  WHERE fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid AND is_active = false;

  RAISE NOTICE '2024-09 BTC SUCCESS: gross=%, net=%, fees=%, ib=%',
    v_result->'summary'->>'total_gross',
    v_result->'summary'->>'total_net',
    v_result->'summary'->>'total_fees',
    v_result->'summary'->>'total_ib';
END;
$$;

-- 2024-10 BTC: 1 segments, gross_yield = 0.0301633394
DO $$
DECLARE
  v_opening numeric;
  v_flows numeric;
  v_balance_sum numeric;
  v_recorded_aum numeric;
  v_result jsonb;
  v_gross_yield numeric := 0.0301633394;
  v_activated integer;
BEGIN
  -- Set auth context
  PERFORM set_config('request.jwt.claim.sub', 'a16a7e50-fefd-4bfe-897c-d16279b457c2', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"a16a7e50-fefd-4bfe-897c-d16279b457c2","role":"authenticated"}', true);
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Ensure all positions for this fund are active (V5 only processes active positions)
  UPDATE investor_positions SET is_active = true
  WHERE fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid AND is_active = false;
  GET DIAGNOSTICS v_activated = ROW_COUNT;
  IF v_activated > 0 THEN
    RAISE NOTICE '2024-10 BTC: Activated % positions', v_activated;
  END IF;

  -- V5-matching balance_sum: per-investor opening through investor_positions
  SELECT COALESCE(SUM(inv_balance), 0) INTO v_opening
  FROM (
    SELECT COALESCE((
      SELECT SUM(t.amount) FROM transactions_v2 t
      WHERE t.investor_id = ip.investor_id
        AND t.fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid
        AND t.tx_date < '2024-10-01'::date
        AND t.is_voided = false
    ), 0) as inv_balance
    FROM investor_positions ip
    WHERE ip.fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid AND ip.is_active = true
  ) sub;

  -- V5-matching flows: DEP/WD/ADJ within period for active investors only
  SELECT COALESCE(SUM(t.amount), 0) INTO v_flows
  FROM transactions_v2 t
  WHERE t.fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid
    AND t.is_voided = false
    AND t.type IN ('DEPOSIT'::tx_type, 'WITHDRAWAL'::tx_type, 'ADJUSTMENT'::tx_type)
    AND t.tx_date >= '2024-10-01'::date
    AND t.tx_date <= '2024-10-31'::date
    AND t.investor_id IN (
      SELECT ip.investor_id FROM investor_positions ip
      WHERE ip.fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid AND ip.is_active = true
    );

  v_balance_sum := v_opening + v_flows;
  v_recorded_aum := v_balance_sum + v_gross_yield;

  RAISE NOTICE '2024-10 BTC: opening=%, flows=%, balance_sum=%, gross_yield=%, recorded_aum=%',
    v_opening, v_flows, v_balance_sum, v_gross_yield, v_recorded_aum;

  -- Call V5 apply
  v_result := apply_segmented_yield_distribution_v5(
    p_fund_id := '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    p_period_end := '2024-10-31'::date,
    p_recorded_aum := v_recorded_aum,
    p_admin_id := 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid,
    p_purpose := 'reporting'::aum_purpose
  );

  -- Check result
  IF (v_result->>'success')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION '2024-10 BTC FAILED: %', v_result->>'error';
  END IF;

  -- Re-activate any positions that went inactive from YIELD transactions
  UPDATE investor_positions SET is_active = true
  WHERE fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid AND is_active = false;

  RAISE NOTICE '2024-10 BTC SUCCESS: gross=%, net=%, fees=%, ib=%',
    v_result->'summary'->>'total_gross',
    v_result->'summary'->>'total_net',
    v_result->'summary'->>'total_fees',
    v_result->'summary'->>'total_ib';
END;
$$;

-- 2024-11 BTC: 2 segments, gross_yield = 0.1413010228
DO $$
DECLARE
  v_opening numeric;
  v_flows numeric;
  v_balance_sum numeric;
  v_recorded_aum numeric;
  v_result jsonb;
  v_gross_yield numeric := 0.1413010228;
  v_activated integer;
BEGIN
  -- Set auth context
  PERFORM set_config('request.jwt.claim.sub', 'a16a7e50-fefd-4bfe-897c-d16279b457c2', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"a16a7e50-fefd-4bfe-897c-d16279b457c2","role":"authenticated"}', true);
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Ensure all positions for this fund are active (V5 only processes active positions)
  UPDATE investor_positions SET is_active = true
  WHERE fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid AND is_active = false;
  GET DIAGNOSTICS v_activated = ROW_COUNT;
  IF v_activated > 0 THEN
    RAISE NOTICE '2024-11 BTC: Activated % positions', v_activated;
  END IF;

  -- V5-matching balance_sum: per-investor opening through investor_positions
  SELECT COALESCE(SUM(inv_balance), 0) INTO v_opening
  FROM (
    SELECT COALESCE((
      SELECT SUM(t.amount) FROM transactions_v2 t
      WHERE t.investor_id = ip.investor_id
        AND t.fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid
        AND t.tx_date < '2024-11-01'::date
        AND t.is_voided = false
    ), 0) as inv_balance
    FROM investor_positions ip
    WHERE ip.fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid AND ip.is_active = true
  ) sub;

  -- V5-matching flows: DEP/WD/ADJ within period for active investors only
  SELECT COALESCE(SUM(t.amount), 0) INTO v_flows
  FROM transactions_v2 t
  WHERE t.fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid
    AND t.is_voided = false
    AND t.type IN ('DEPOSIT'::tx_type, 'WITHDRAWAL'::tx_type, 'ADJUSTMENT'::tx_type)
    AND t.tx_date >= '2024-11-01'::date
    AND t.tx_date <= '2024-11-30'::date
    AND t.investor_id IN (
      SELECT ip.investor_id FROM investor_positions ip
      WHERE ip.fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid AND ip.is_active = true
    );

  v_balance_sum := v_opening + v_flows;
  v_recorded_aum := v_balance_sum + v_gross_yield;

  RAISE NOTICE '2024-11 BTC: opening=%, flows=%, balance_sum=%, gross_yield=%, recorded_aum=%',
    v_opening, v_flows, v_balance_sum, v_gross_yield, v_recorded_aum;

  -- Call V5 apply
  v_result := apply_segmented_yield_distribution_v5(
    p_fund_id := '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    p_period_end := '2024-11-30'::date,
    p_recorded_aum := v_recorded_aum,
    p_admin_id := 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid,
    p_purpose := 'reporting'::aum_purpose
  );

  -- Check result
  IF (v_result->>'success')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION '2024-11 BTC FAILED: %', v_result->>'error';
  END IF;

  -- Re-activate any positions that went inactive from YIELD transactions
  UPDATE investor_positions SET is_active = true
  WHERE fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid AND is_active = false;

  RAISE NOTICE '2024-11 BTC SUCCESS: gross=%, net=%, fees=%, ib=%',
    v_result->'summary'->>'total_gross',
    v_result->'summary'->>'total_net',
    v_result->'summary'->>'total_fees',
    v_result->'summary'->>'total_ib';
END;
$$;

-- 2024-12 BTC: 2 segments, gross_yield = 0.1304456739
DO $$
DECLARE
  v_opening numeric;
  v_flows numeric;
  v_balance_sum numeric;
  v_recorded_aum numeric;
  v_result jsonb;
  v_gross_yield numeric := 0.1304456739;
  v_activated integer;
BEGIN
  -- Set auth context
  PERFORM set_config('request.jwt.claim.sub', 'a16a7e50-fefd-4bfe-897c-d16279b457c2', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"a16a7e50-fefd-4bfe-897c-d16279b457c2","role":"authenticated"}', true);
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Ensure all positions for this fund are active (V5 only processes active positions)
  UPDATE investor_positions SET is_active = true
  WHERE fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid AND is_active = false;
  GET DIAGNOSTICS v_activated = ROW_COUNT;
  IF v_activated > 0 THEN
    RAISE NOTICE '2024-12 BTC: Activated % positions', v_activated;
  END IF;

  -- V5-matching balance_sum: per-investor opening through investor_positions
  SELECT COALESCE(SUM(inv_balance), 0) INTO v_opening
  FROM (
    SELECT COALESCE((
      SELECT SUM(t.amount) FROM transactions_v2 t
      WHERE t.investor_id = ip.investor_id
        AND t.fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid
        AND t.tx_date < '2024-12-01'::date
        AND t.is_voided = false
    ), 0) as inv_balance
    FROM investor_positions ip
    WHERE ip.fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid AND ip.is_active = true
  ) sub;

  -- V5-matching flows: DEP/WD/ADJ within period for active investors only
  SELECT COALESCE(SUM(t.amount), 0) INTO v_flows
  FROM transactions_v2 t
  WHERE t.fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid
    AND t.is_voided = false
    AND t.type IN ('DEPOSIT'::tx_type, 'WITHDRAWAL'::tx_type, 'ADJUSTMENT'::tx_type)
    AND t.tx_date >= '2024-12-01'::date
    AND t.tx_date <= '2024-12-31'::date
    AND t.investor_id IN (
      SELECT ip.investor_id FROM investor_positions ip
      WHERE ip.fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid AND ip.is_active = true
    );

  v_balance_sum := v_opening + v_flows;
  v_recorded_aum := v_balance_sum + v_gross_yield;

  RAISE NOTICE '2024-12 BTC: opening=%, flows=%, balance_sum=%, gross_yield=%, recorded_aum=%',
    v_opening, v_flows, v_balance_sum, v_gross_yield, v_recorded_aum;

  -- Call V5 apply
  v_result := apply_segmented_yield_distribution_v5(
    p_fund_id := '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    p_period_end := '2024-12-31'::date,
    p_recorded_aum := v_recorded_aum,
    p_admin_id := 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid,
    p_purpose := 'reporting'::aum_purpose
  );

  -- Check result
  IF (v_result->>'success')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION '2024-12 BTC FAILED: %', v_result->>'error';
  END IF;

  -- Re-activate any positions that went inactive from YIELD transactions
  UPDATE investor_positions SET is_active = true
  WHERE fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid AND is_active = false;

  RAISE NOTICE '2024-12 BTC SUCCESS: gross=%, net=%, fees=%, ib=%',
    v_result->'summary'->>'total_gross',
    v_result->'summary'->>'total_net',
    v_result->'summary'->>'total_fees',
    v_result->'summary'->>'total_ib';
END;
$$;

-- 2025-01 BTC: 1 segments, gross_yield = 0.0523664347
DO $$
DECLARE
  v_opening numeric;
  v_flows numeric;
  v_balance_sum numeric;
  v_recorded_aum numeric;
  v_result jsonb;
  v_gross_yield numeric := 0.0523664347;
  v_activated integer;
BEGIN
  -- Set auth context
  PERFORM set_config('request.jwt.claim.sub', 'a16a7e50-fefd-4bfe-897c-d16279b457c2', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"a16a7e50-fefd-4bfe-897c-d16279b457c2","role":"authenticated"}', true);
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Ensure all positions for this fund are active (V5 only processes active positions)
  UPDATE investor_positions SET is_active = true
  WHERE fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid AND is_active = false;
  GET DIAGNOSTICS v_activated = ROW_COUNT;
  IF v_activated > 0 THEN
    RAISE NOTICE '2025-01 BTC: Activated % positions', v_activated;
  END IF;

  -- V5-matching balance_sum: per-investor opening through investor_positions
  SELECT COALESCE(SUM(inv_balance), 0) INTO v_opening
  FROM (
    SELECT COALESCE((
      SELECT SUM(t.amount) FROM transactions_v2 t
      WHERE t.investor_id = ip.investor_id
        AND t.fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid
        AND t.tx_date < '2025-01-01'::date
        AND t.is_voided = false
    ), 0) as inv_balance
    FROM investor_positions ip
    WHERE ip.fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid AND ip.is_active = true
  ) sub;

  -- V5-matching flows: DEP/WD/ADJ within period for active investors only
  SELECT COALESCE(SUM(t.amount), 0) INTO v_flows
  FROM transactions_v2 t
  WHERE t.fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid
    AND t.is_voided = false
    AND t.type IN ('DEPOSIT'::tx_type, 'WITHDRAWAL'::tx_type, 'ADJUSTMENT'::tx_type)
    AND t.tx_date >= '2025-01-01'::date
    AND t.tx_date <= '2025-01-31'::date
    AND t.investor_id IN (
      SELECT ip.investor_id FROM investor_positions ip
      WHERE ip.fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid AND ip.is_active = true
    );

  v_balance_sum := v_opening + v_flows;
  v_recorded_aum := v_balance_sum + v_gross_yield;

  RAISE NOTICE '2025-01 BTC: opening=%, flows=%, balance_sum=%, gross_yield=%, recorded_aum=%',
    v_opening, v_flows, v_balance_sum, v_gross_yield, v_recorded_aum;

  -- Call V5 apply
  v_result := apply_segmented_yield_distribution_v5(
    p_fund_id := '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    p_period_end := '2025-01-31'::date,
    p_recorded_aum := v_recorded_aum,
    p_admin_id := 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid,
    p_purpose := 'reporting'::aum_purpose
  );

  -- Check result
  IF (v_result->>'success')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION '2025-01 BTC FAILED: %', v_result->>'error';
  END IF;

  -- Re-activate any positions that went inactive from YIELD transactions
  UPDATE investor_positions SET is_active = true
  WHERE fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid AND is_active = false;

  RAISE NOTICE '2025-01 BTC SUCCESS: gross=%, net=%, fees=%, ib=%',
    v_result->'summary'->>'total_gross',
    v_result->'summary'->>'total_net',
    v_result->'summary'->>'total_fees',
    v_result->'summary'->>'total_ib';
END;
$$;

-- 2025-02 BTC: 1 segments, gross_yield = 0.0603515625
DO $$
DECLARE
  v_opening numeric;
  v_flows numeric;
  v_balance_sum numeric;
  v_recorded_aum numeric;
  v_result jsonb;
  v_gross_yield numeric := 0.0603515625;
  v_activated integer;
BEGIN
  -- Set auth context
  PERFORM set_config('request.jwt.claim.sub', 'a16a7e50-fefd-4bfe-897c-d16279b457c2', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"a16a7e50-fefd-4bfe-897c-d16279b457c2","role":"authenticated"}', true);
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Ensure all positions for this fund are active (V5 only processes active positions)
  UPDATE investor_positions SET is_active = true
  WHERE fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid AND is_active = false;
  GET DIAGNOSTICS v_activated = ROW_COUNT;
  IF v_activated > 0 THEN
    RAISE NOTICE '2025-02 BTC: Activated % positions', v_activated;
  END IF;

  -- V5-matching balance_sum: per-investor opening through investor_positions
  SELECT COALESCE(SUM(inv_balance), 0) INTO v_opening
  FROM (
    SELECT COALESCE((
      SELECT SUM(t.amount) FROM transactions_v2 t
      WHERE t.investor_id = ip.investor_id
        AND t.fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid
        AND t.tx_date < '2025-02-01'::date
        AND t.is_voided = false
    ), 0) as inv_balance
    FROM investor_positions ip
    WHERE ip.fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid AND ip.is_active = true
  ) sub;

  -- V5-matching flows: DEP/WD/ADJ within period for active investors only
  SELECT COALESCE(SUM(t.amount), 0) INTO v_flows
  FROM transactions_v2 t
  WHERE t.fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid
    AND t.is_voided = false
    AND t.type IN ('DEPOSIT'::tx_type, 'WITHDRAWAL'::tx_type, 'ADJUSTMENT'::tx_type)
    AND t.tx_date >= '2025-02-01'::date
    AND t.tx_date <= '2025-02-28'::date
    AND t.investor_id IN (
      SELECT ip.investor_id FROM investor_positions ip
      WHERE ip.fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid AND ip.is_active = true
    );

  v_balance_sum := v_opening + v_flows;
  v_recorded_aum := v_balance_sum + v_gross_yield;

  RAISE NOTICE '2025-02 BTC: opening=%, flows=%, balance_sum=%, gross_yield=%, recorded_aum=%',
    v_opening, v_flows, v_balance_sum, v_gross_yield, v_recorded_aum;

  -- Call V5 apply
  v_result := apply_segmented_yield_distribution_v5(
    p_fund_id := '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    p_period_end := '2025-02-28'::date,
    p_recorded_aum := v_recorded_aum,
    p_admin_id := 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid,
    p_purpose := 'reporting'::aum_purpose
  );

  -- Check result
  IF (v_result->>'success')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION '2025-02 BTC FAILED: %', v_result->>'error';
  END IF;

  -- Re-activate any positions that went inactive from YIELD transactions
  UPDATE investor_positions SET is_active = true
  WHERE fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid AND is_active = false;

  RAISE NOTICE '2025-02 BTC SUCCESS: gross=%, net=%, fees=%, ib=%',
    v_result->'summary'->>'total_gross',
    v_result->'summary'->>'total_net',
    v_result->'summary'->>'total_fees',
    v_result->'summary'->>'total_ib';
END;
$$;

-- 2025-03 BTC: 1 segments, gross_yield = 0.0401553398
DO $$
DECLARE
  v_opening numeric;
  v_flows numeric;
  v_balance_sum numeric;
  v_recorded_aum numeric;
  v_result jsonb;
  v_gross_yield numeric := 0.0401553398;
  v_activated integer;
BEGIN
  -- Set auth context
  PERFORM set_config('request.jwt.claim.sub', 'a16a7e50-fefd-4bfe-897c-d16279b457c2', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"a16a7e50-fefd-4bfe-897c-d16279b457c2","role":"authenticated"}', true);
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Ensure all positions for this fund are active (V5 only processes active positions)
  UPDATE investor_positions SET is_active = true
  WHERE fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid AND is_active = false;
  GET DIAGNOSTICS v_activated = ROW_COUNT;
  IF v_activated > 0 THEN
    RAISE NOTICE '2025-03 BTC: Activated % positions', v_activated;
  END IF;

  -- V5-matching balance_sum: per-investor opening through investor_positions
  SELECT COALESCE(SUM(inv_balance), 0) INTO v_opening
  FROM (
    SELECT COALESCE((
      SELECT SUM(t.amount) FROM transactions_v2 t
      WHERE t.investor_id = ip.investor_id
        AND t.fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid
        AND t.tx_date < '2025-03-01'::date
        AND t.is_voided = false
    ), 0) as inv_balance
    FROM investor_positions ip
    WHERE ip.fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid AND ip.is_active = true
  ) sub;

  -- V5-matching flows: DEP/WD/ADJ within period for active investors only
  SELECT COALESCE(SUM(t.amount), 0) INTO v_flows
  FROM transactions_v2 t
  WHERE t.fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid
    AND t.is_voided = false
    AND t.type IN ('DEPOSIT'::tx_type, 'WITHDRAWAL'::tx_type, 'ADJUSTMENT'::tx_type)
    AND t.tx_date >= '2025-03-01'::date
    AND t.tx_date <= '2025-03-31'::date
    AND t.investor_id IN (
      SELECT ip.investor_id FROM investor_positions ip
      WHERE ip.fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid AND ip.is_active = true
    );

  v_balance_sum := v_opening + v_flows;
  v_recorded_aum := v_balance_sum + v_gross_yield;

  RAISE NOTICE '2025-03 BTC: opening=%, flows=%, balance_sum=%, gross_yield=%, recorded_aum=%',
    v_opening, v_flows, v_balance_sum, v_gross_yield, v_recorded_aum;

  -- Call V5 apply
  v_result := apply_segmented_yield_distribution_v5(
    p_fund_id := '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    p_period_end := '2025-03-31'::date,
    p_recorded_aum := v_recorded_aum,
    p_admin_id := 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid,
    p_purpose := 'reporting'::aum_purpose
  );

  -- Check result
  IF (v_result->>'success')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION '2025-03 BTC FAILED: %', v_result->>'error';
  END IF;

  -- Re-activate any positions that went inactive from YIELD transactions
  UPDATE investor_positions SET is_active = true
  WHERE fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid AND is_active = false;

  RAISE NOTICE '2025-03 BTC SUCCESS: gross=%, net=%, fees=%, ib=%',
    v_result->'summary'->>'total_gross',
    v_result->'summary'->>'total_net',
    v_result->'summary'->>'total_fees',
    v_result->'summary'->>'total_ib';
END;
$$;

-- 2025-04 BTC: 2 segments, gross_yield = 0.0652243676
DO $$
DECLARE
  v_opening numeric;
  v_flows numeric;
  v_balance_sum numeric;
  v_recorded_aum numeric;
  v_result jsonb;
  v_gross_yield numeric := 0.0652243676;
  v_activated integer;
BEGIN
  -- Set auth context
  PERFORM set_config('request.jwt.claim.sub', 'a16a7e50-fefd-4bfe-897c-d16279b457c2', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"a16a7e50-fefd-4bfe-897c-d16279b457c2","role":"authenticated"}', true);
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Ensure all positions for this fund are active (V5 only processes active positions)
  UPDATE investor_positions SET is_active = true
  WHERE fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid AND is_active = false;
  GET DIAGNOSTICS v_activated = ROW_COUNT;
  IF v_activated > 0 THEN
    RAISE NOTICE '2025-04 BTC: Activated % positions', v_activated;
  END IF;

  -- V5-matching balance_sum: per-investor opening through investor_positions
  SELECT COALESCE(SUM(inv_balance), 0) INTO v_opening
  FROM (
    SELECT COALESCE((
      SELECT SUM(t.amount) FROM transactions_v2 t
      WHERE t.investor_id = ip.investor_id
        AND t.fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid
        AND t.tx_date < '2025-04-01'::date
        AND t.is_voided = false
    ), 0) as inv_balance
    FROM investor_positions ip
    WHERE ip.fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid AND ip.is_active = true
  ) sub;

  -- V5-matching flows: DEP/WD/ADJ within period for active investors only
  SELECT COALESCE(SUM(t.amount), 0) INTO v_flows
  FROM transactions_v2 t
  WHERE t.fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid
    AND t.is_voided = false
    AND t.type IN ('DEPOSIT'::tx_type, 'WITHDRAWAL'::tx_type, 'ADJUSTMENT'::tx_type)
    AND t.tx_date >= '2025-04-01'::date
    AND t.tx_date <= '2025-04-30'::date
    AND t.investor_id IN (
      SELECT ip.investor_id FROM investor_positions ip
      WHERE ip.fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid AND ip.is_active = true
    );

  v_balance_sum := v_opening + v_flows;
  v_recorded_aum := v_balance_sum + v_gross_yield;

  RAISE NOTICE '2025-04 BTC: opening=%, flows=%, balance_sum=%, gross_yield=%, recorded_aum=%',
    v_opening, v_flows, v_balance_sum, v_gross_yield, v_recorded_aum;

  -- Call V5 apply
  v_result := apply_segmented_yield_distribution_v5(
    p_fund_id := '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    p_period_end := '2025-04-30'::date,
    p_recorded_aum := v_recorded_aum,
    p_admin_id := 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid,
    p_purpose := 'reporting'::aum_purpose
  );

  -- Check result
  IF (v_result->>'success')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION '2025-04 BTC FAILED: %', v_result->>'error';
  END IF;

  -- Re-activate any positions that went inactive from YIELD transactions
  UPDATE investor_positions SET is_active = true
  WHERE fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid AND is_active = false;

  RAISE NOTICE '2025-04 BTC SUCCESS: gross=%, net=%, fees=%, ib=%',
    v_result->'summary'->>'total_gross',
    v_result->'summary'->>'total_net',
    v_result->'summary'->>'total_fees',
    v_result->'summary'->>'total_ib';
END;
$$;

-- 2025-05 BTC: 2 segments, gross_yield = 0.0802546801
DO $$
DECLARE
  v_opening numeric;
  v_flows numeric;
  v_balance_sum numeric;
  v_recorded_aum numeric;
  v_result jsonb;
  v_gross_yield numeric := 0.0802546801;
  v_activated integer;
BEGIN
  -- Set auth context
  PERFORM set_config('request.jwt.claim.sub', 'a16a7e50-fefd-4bfe-897c-d16279b457c2', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"a16a7e50-fefd-4bfe-897c-d16279b457c2","role":"authenticated"}', true);
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Ensure all positions for this fund are active (V5 only processes active positions)
  UPDATE investor_positions SET is_active = true
  WHERE fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid AND is_active = false;
  GET DIAGNOSTICS v_activated = ROW_COUNT;
  IF v_activated > 0 THEN
    RAISE NOTICE '2025-05 BTC: Activated % positions', v_activated;
  END IF;

  -- V5-matching balance_sum: per-investor opening through investor_positions
  SELECT COALESCE(SUM(inv_balance), 0) INTO v_opening
  FROM (
    SELECT COALESCE((
      SELECT SUM(t.amount) FROM transactions_v2 t
      WHERE t.investor_id = ip.investor_id
        AND t.fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid
        AND t.tx_date < '2025-05-01'::date
        AND t.is_voided = false
    ), 0) as inv_balance
    FROM investor_positions ip
    WHERE ip.fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid AND ip.is_active = true
  ) sub;

  -- V5-matching flows: DEP/WD/ADJ within period for active investors only
  SELECT COALESCE(SUM(t.amount), 0) INTO v_flows
  FROM transactions_v2 t
  WHERE t.fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid
    AND t.is_voided = false
    AND t.type IN ('DEPOSIT'::tx_type, 'WITHDRAWAL'::tx_type, 'ADJUSTMENT'::tx_type)
    AND t.tx_date >= '2025-05-01'::date
    AND t.tx_date <= '2025-05-31'::date
    AND t.investor_id IN (
      SELECT ip.investor_id FROM investor_positions ip
      WHERE ip.fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid AND ip.is_active = true
    );

  v_balance_sum := v_opening + v_flows;
  v_recorded_aum := v_balance_sum + v_gross_yield;

  RAISE NOTICE '2025-05 BTC: opening=%, flows=%, balance_sum=%, gross_yield=%, recorded_aum=%',
    v_opening, v_flows, v_balance_sum, v_gross_yield, v_recorded_aum;

  -- Call V5 apply
  v_result := apply_segmented_yield_distribution_v5(
    p_fund_id := '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    p_period_end := '2025-05-31'::date,
    p_recorded_aum := v_recorded_aum,
    p_admin_id := 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid,
    p_purpose := 'reporting'::aum_purpose
  );

  -- Check result
  IF (v_result->>'success')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION '2025-05 BTC FAILED: %', v_result->>'error';
  END IF;

  -- Re-activate any positions that went inactive from YIELD transactions
  UPDATE investor_positions SET is_active = true
  WHERE fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid AND is_active = false;

  RAISE NOTICE '2025-05 BTC SUCCESS: gross=%, net=%, fees=%, ib=%',
    v_result->'summary'->>'total_gross',
    v_result->'summary'->>'total_net',
    v_result->'summary'->>'total_fees',
    v_result->'summary'->>'total_ib';
END;
$$;

-- 2025-06 BTC: 2 segments, gross_yield = 0.1051217408
DO $$
DECLARE
  v_opening numeric;
  v_flows numeric;
  v_balance_sum numeric;
  v_recorded_aum numeric;
  v_result jsonb;
  v_gross_yield numeric := 0.1051217408;
  v_activated integer;
BEGIN
  -- Set auth context
  PERFORM set_config('request.jwt.claim.sub', 'a16a7e50-fefd-4bfe-897c-d16279b457c2', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"a16a7e50-fefd-4bfe-897c-d16279b457c2","role":"authenticated"}', true);
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Ensure all positions for this fund are active (V5 only processes active positions)
  UPDATE investor_positions SET is_active = true
  WHERE fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid AND is_active = false;
  GET DIAGNOSTICS v_activated = ROW_COUNT;
  IF v_activated > 0 THEN
    RAISE NOTICE '2025-06 BTC: Activated % positions', v_activated;
  END IF;

  -- V5-matching balance_sum: per-investor opening through investor_positions
  SELECT COALESCE(SUM(inv_balance), 0) INTO v_opening
  FROM (
    SELECT COALESCE((
      SELECT SUM(t.amount) FROM transactions_v2 t
      WHERE t.investor_id = ip.investor_id
        AND t.fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid
        AND t.tx_date < '2025-06-01'::date
        AND t.is_voided = false
    ), 0) as inv_balance
    FROM investor_positions ip
    WHERE ip.fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid AND ip.is_active = true
  ) sub;

  -- V5-matching flows: DEP/WD/ADJ within period for active investors only
  SELECT COALESCE(SUM(t.amount), 0) INTO v_flows
  FROM transactions_v2 t
  WHERE t.fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid
    AND t.is_voided = false
    AND t.type IN ('DEPOSIT'::tx_type, 'WITHDRAWAL'::tx_type, 'ADJUSTMENT'::tx_type)
    AND t.tx_date >= '2025-06-01'::date
    AND t.tx_date <= '2025-06-30'::date
    AND t.investor_id IN (
      SELECT ip.investor_id FROM investor_positions ip
      WHERE ip.fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid AND ip.is_active = true
    );

  v_balance_sum := v_opening + v_flows;
  v_recorded_aum := v_balance_sum + v_gross_yield;

  RAISE NOTICE '2025-06 BTC: opening=%, flows=%, balance_sum=%, gross_yield=%, recorded_aum=%',
    v_opening, v_flows, v_balance_sum, v_gross_yield, v_recorded_aum;

  -- Call V5 apply
  v_result := apply_segmented_yield_distribution_v5(
    p_fund_id := '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    p_period_end := '2025-06-30'::date,
    p_recorded_aum := v_recorded_aum,
    p_admin_id := 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid,
    p_purpose := 'reporting'::aum_purpose
  );

  -- Check result
  IF (v_result->>'success')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION '2025-06 BTC FAILED: %', v_result->>'error';
  END IF;

  -- Re-activate any positions that went inactive from YIELD transactions
  UPDATE investor_positions SET is_active = true
  WHERE fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid AND is_active = false;

  RAISE NOTICE '2025-06 BTC SUCCESS: gross=%, net=%, fees=%, ib=%',
    v_result->'summary'->>'total_gross',
    v_result->'summary'->>'total_net',
    v_result->'summary'->>'total_fees',
    v_result->'summary'->>'total_ib';
END;
$$;

-- 2025-06 ETH: 1 segments, gross_yield = 0.2202395920
DO $$
DECLARE
  v_opening numeric;
  v_flows numeric;
  v_balance_sum numeric;
  v_recorded_aum numeric;
  v_result jsonb;
  v_gross_yield numeric := 0.2202395920;
  v_activated integer;
BEGIN
  -- Set auth context
  PERFORM set_config('request.jwt.claim.sub', 'a16a7e50-fefd-4bfe-897c-d16279b457c2', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"a16a7e50-fefd-4bfe-897c-d16279b457c2","role":"authenticated"}', true);
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Ensure all positions for this fund are active (V5 only processes active positions)
  UPDATE investor_positions SET is_active = true
  WHERE fund_id = '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid AND is_active = false;
  GET DIAGNOSTICS v_activated = ROW_COUNT;
  IF v_activated > 0 THEN
    RAISE NOTICE '2025-06 ETH: Activated % positions', v_activated;
  END IF;

  -- V5-matching balance_sum: per-investor opening through investor_positions
  SELECT COALESCE(SUM(inv_balance), 0) INTO v_opening
  FROM (
    SELECT COALESCE((
      SELECT SUM(t.amount) FROM transactions_v2 t
      WHERE t.investor_id = ip.investor_id
        AND t.fund_id = '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid
        AND t.tx_date < '2025-06-01'::date
        AND t.is_voided = false
    ), 0) as inv_balance
    FROM investor_positions ip
    WHERE ip.fund_id = '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid AND ip.is_active = true
  ) sub;

  -- V5-matching flows: DEP/WD/ADJ within period for active investors only
  SELECT COALESCE(SUM(t.amount), 0) INTO v_flows
  FROM transactions_v2 t
  WHERE t.fund_id = '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid
    AND t.is_voided = false
    AND t.type IN ('DEPOSIT'::tx_type, 'WITHDRAWAL'::tx_type, 'ADJUSTMENT'::tx_type)
    AND t.tx_date >= '2025-06-01'::date
    AND t.tx_date <= '2025-06-30'::date
    AND t.investor_id IN (
      SELECT ip.investor_id FROM investor_positions ip
      WHERE ip.fund_id = '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid AND ip.is_active = true
    );

  v_balance_sum := v_opening + v_flows;
  v_recorded_aum := v_balance_sum + v_gross_yield;

  RAISE NOTICE '2025-06 ETH: opening=%, flows=%, balance_sum=%, gross_yield=%, recorded_aum=%',
    v_opening, v_flows, v_balance_sum, v_gross_yield, v_recorded_aum;

  -- Call V5 apply
  v_result := apply_segmented_yield_distribution_v5(
    p_fund_id := '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid,
    p_period_end := '2025-06-30'::date,
    p_recorded_aum := v_recorded_aum,
    p_admin_id := 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid,
    p_purpose := 'reporting'::aum_purpose
  );

  -- Check result
  IF (v_result->>'success')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION '2025-06 ETH FAILED: %', v_result->>'error';
  END IF;

  -- Re-activate any positions that went inactive from YIELD transactions
  UPDATE investor_positions SET is_active = true
  WHERE fund_id = '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid AND is_active = false;

  RAISE NOTICE '2025-06 ETH SUCCESS: gross=%, net=%, fees=%, ib=%',
    v_result->'summary'->>'total_gross',
    v_result->'summary'->>'total_net',
    v_result->'summary'->>'total_fees',
    v_result->'summary'->>'total_ib';
END;
$$;

-- 2025-07 BTC: 5 segments, gross_yield = 0.1025923849
DO $$
DECLARE
  v_opening numeric;
  v_flows numeric;
  v_balance_sum numeric;
  v_recorded_aum numeric;
  v_result jsonb;
  v_gross_yield numeric := 0.1025923849;
  v_activated integer;
BEGIN
  -- Set auth context
  PERFORM set_config('request.jwt.claim.sub', 'a16a7e50-fefd-4bfe-897c-d16279b457c2', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"a16a7e50-fefd-4bfe-897c-d16279b457c2","role":"authenticated"}', true);
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Ensure all positions for this fund are active (V5 only processes active positions)
  UPDATE investor_positions SET is_active = true
  WHERE fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid AND is_active = false;
  GET DIAGNOSTICS v_activated = ROW_COUNT;
  IF v_activated > 0 THEN
    RAISE NOTICE '2025-07 BTC: Activated % positions', v_activated;
  END IF;

  -- V5-matching balance_sum: per-investor opening through investor_positions
  SELECT COALESCE(SUM(inv_balance), 0) INTO v_opening
  FROM (
    SELECT COALESCE((
      SELECT SUM(t.amount) FROM transactions_v2 t
      WHERE t.investor_id = ip.investor_id
        AND t.fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid
        AND t.tx_date < '2025-07-01'::date
        AND t.is_voided = false
    ), 0) as inv_balance
    FROM investor_positions ip
    WHERE ip.fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid AND ip.is_active = true
  ) sub;

  -- V5-matching flows: DEP/WD/ADJ within period for active investors only
  SELECT COALESCE(SUM(t.amount), 0) INTO v_flows
  FROM transactions_v2 t
  WHERE t.fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid
    AND t.is_voided = false
    AND t.type IN ('DEPOSIT'::tx_type, 'WITHDRAWAL'::tx_type, 'ADJUSTMENT'::tx_type)
    AND t.tx_date >= '2025-07-01'::date
    AND t.tx_date <= '2025-07-31'::date
    AND t.investor_id IN (
      SELECT ip.investor_id FROM investor_positions ip
      WHERE ip.fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid AND ip.is_active = true
    );

  v_balance_sum := v_opening + v_flows;
  v_recorded_aum := v_balance_sum + v_gross_yield;

  RAISE NOTICE '2025-07 BTC: opening=%, flows=%, balance_sum=%, gross_yield=%, recorded_aum=%',
    v_opening, v_flows, v_balance_sum, v_gross_yield, v_recorded_aum;

  -- Call V5 apply
  v_result := apply_segmented_yield_distribution_v5(
    p_fund_id := '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    p_period_end := '2025-07-31'::date,
    p_recorded_aum := v_recorded_aum,
    p_admin_id := 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid,
    p_purpose := 'reporting'::aum_purpose
  );

  -- Check result
  IF (v_result->>'success')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION '2025-07 BTC FAILED: %', v_result->>'error';
  END IF;

  -- Re-activate any positions that went inactive from YIELD transactions
  UPDATE investor_positions SET is_active = true
  WHERE fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid AND is_active = false;

  RAISE NOTICE '2025-07 BTC SUCCESS: gross=%, net=%, fees=%, ib=%',
    v_result->'summary'->>'total_gross',
    v_result->'summary'->>'total_net',
    v_result->'summary'->>'total_fees',
    v_result->'summary'->>'total_ib';
END;
$$;

-- 2025-07 ETH: 3 segments, gross_yield = 5.3354614543
DO $$
DECLARE
  v_opening numeric;
  v_flows numeric;
  v_balance_sum numeric;
  v_recorded_aum numeric;
  v_result jsonb;
  v_gross_yield numeric := 5.3354614543;
  v_activated integer;
BEGIN
  -- Set auth context
  PERFORM set_config('request.jwt.claim.sub', 'a16a7e50-fefd-4bfe-897c-d16279b457c2', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"a16a7e50-fefd-4bfe-897c-d16279b457c2","role":"authenticated"}', true);
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Ensure all positions for this fund are active (V5 only processes active positions)
  UPDATE investor_positions SET is_active = true
  WHERE fund_id = '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid AND is_active = false;
  GET DIAGNOSTICS v_activated = ROW_COUNT;
  IF v_activated > 0 THEN
    RAISE NOTICE '2025-07 ETH: Activated % positions', v_activated;
  END IF;

  -- V5-matching balance_sum: per-investor opening through investor_positions
  SELECT COALESCE(SUM(inv_balance), 0) INTO v_opening
  FROM (
    SELECT COALESCE((
      SELECT SUM(t.amount) FROM transactions_v2 t
      WHERE t.investor_id = ip.investor_id
        AND t.fund_id = '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid
        AND t.tx_date < '2025-07-01'::date
        AND t.is_voided = false
    ), 0) as inv_balance
    FROM investor_positions ip
    WHERE ip.fund_id = '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid AND ip.is_active = true
  ) sub;

  -- V5-matching flows: DEP/WD/ADJ within period for active investors only
  SELECT COALESCE(SUM(t.amount), 0) INTO v_flows
  FROM transactions_v2 t
  WHERE t.fund_id = '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid
    AND t.is_voided = false
    AND t.type IN ('DEPOSIT'::tx_type, 'WITHDRAWAL'::tx_type, 'ADJUSTMENT'::tx_type)
    AND t.tx_date >= '2025-07-01'::date
    AND t.tx_date <= '2025-07-31'::date
    AND t.investor_id IN (
      SELECT ip.investor_id FROM investor_positions ip
      WHERE ip.fund_id = '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid AND ip.is_active = true
    );

  v_balance_sum := v_opening + v_flows;
  v_recorded_aum := v_balance_sum + v_gross_yield;

  RAISE NOTICE '2025-07 ETH: opening=%, flows=%, balance_sum=%, gross_yield=%, recorded_aum=%',
    v_opening, v_flows, v_balance_sum, v_gross_yield, v_recorded_aum;

  -- Call V5 apply
  v_result := apply_segmented_yield_distribution_v5(
    p_fund_id := '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid,
    p_period_end := '2025-07-31'::date,
    p_recorded_aum := v_recorded_aum,
    p_admin_id := 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid,
    p_purpose := 'reporting'::aum_purpose
  );

  -- Check result
  IF (v_result->>'success')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION '2025-07 ETH FAILED: %', v_result->>'error';
  END IF;

  -- Re-activate any positions that went inactive from YIELD transactions
  UPDATE investor_positions SET is_active = true
  WHERE fund_id = '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid AND is_active = false;

  RAISE NOTICE '2025-07 ETH SUCCESS: gross=%, net=%, fees=%, ib=%',
    v_result->'summary'->>'total_gross',
    v_result->'summary'->>'total_net',
    v_result->'summary'->>'total_fees',
    v_result->'summary'->>'total_ib';
END;
$$;

-- 2025-07 USDT: 5 segments, gross_yield = 7879.7165297478
DO $$
DECLARE
  v_opening numeric;
  v_flows numeric;
  v_balance_sum numeric;
  v_recorded_aum numeric;
  v_result jsonb;
  v_gross_yield numeric := 7879.7165297478;
  v_activated integer;
BEGIN
  -- Set auth context
  PERFORM set_config('request.jwt.claim.sub', 'a16a7e50-fefd-4bfe-897c-d16279b457c2', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"a16a7e50-fefd-4bfe-897c-d16279b457c2","role":"authenticated"}', true);
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Ensure all positions for this fund are active (V5 only processes active positions)
  UPDATE investor_positions SET is_active = true
  WHERE fund_id = '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid AND is_active = false;
  GET DIAGNOSTICS v_activated = ROW_COUNT;
  IF v_activated > 0 THEN
    RAISE NOTICE '2025-07 USDT: Activated % positions', v_activated;
  END IF;

  -- V5-matching balance_sum: per-investor opening through investor_positions
  SELECT COALESCE(SUM(inv_balance), 0) INTO v_opening
  FROM (
    SELECT COALESCE((
      SELECT SUM(t.amount) FROM transactions_v2 t
      WHERE t.investor_id = ip.investor_id
        AND t.fund_id = '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid
        AND t.tx_date < '2025-07-01'::date
        AND t.is_voided = false
    ), 0) as inv_balance
    FROM investor_positions ip
    WHERE ip.fund_id = '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid AND ip.is_active = true
  ) sub;

  -- V5-matching flows: DEP/WD/ADJ within period for active investors only
  SELECT COALESCE(SUM(t.amount), 0) INTO v_flows
  FROM transactions_v2 t
  WHERE t.fund_id = '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid
    AND t.is_voided = false
    AND t.type IN ('DEPOSIT'::tx_type, 'WITHDRAWAL'::tx_type, 'ADJUSTMENT'::tx_type)
    AND t.tx_date >= '2025-07-01'::date
    AND t.tx_date <= '2025-07-31'::date
    AND t.investor_id IN (
      SELECT ip.investor_id FROM investor_positions ip
      WHERE ip.fund_id = '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid AND ip.is_active = true
    );

  v_balance_sum := v_opening + v_flows;
  v_recorded_aum := v_balance_sum + v_gross_yield;

  RAISE NOTICE '2025-07 USDT: opening=%, flows=%, balance_sum=%, gross_yield=%, recorded_aum=%',
    v_opening, v_flows, v_balance_sum, v_gross_yield, v_recorded_aum;

  -- Call V5 apply
  v_result := apply_segmented_yield_distribution_v5(
    p_fund_id := '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    p_period_end := '2025-07-31'::date,
    p_recorded_aum := v_recorded_aum,
    p_admin_id := 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid,
    p_purpose := 'reporting'::aum_purpose
  );

  -- Check result
  IF (v_result->>'success')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION '2025-07 USDT FAILED: %', v_result->>'error';
  END IF;

  -- Re-activate any positions that went inactive from YIELD transactions
  UPDATE investor_positions SET is_active = true
  WHERE fund_id = '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid AND is_active = false;

  RAISE NOTICE '2025-07 USDT SUCCESS: gross=%, net=%, fees=%, ib=%',
    v_result->'summary'->>'total_gross',
    v_result->'summary'->>'total_net',
    v_result->'summary'->>'total_fees',
    v_result->'summary'->>'total_ib';
END;
$$;

-- 2025-08 BTC: 2 segments, gross_yield = 0.0975288757
DO $$
DECLARE
  v_opening numeric;
  v_flows numeric;
  v_balance_sum numeric;
  v_recorded_aum numeric;
  v_result jsonb;
  v_gross_yield numeric := 0.0975288757;
  v_activated integer;
BEGIN
  -- Set auth context
  PERFORM set_config('request.jwt.claim.sub', 'a16a7e50-fefd-4bfe-897c-d16279b457c2', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"a16a7e50-fefd-4bfe-897c-d16279b457c2","role":"authenticated"}', true);
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Ensure all positions for this fund are active (V5 only processes active positions)
  UPDATE investor_positions SET is_active = true
  WHERE fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid AND is_active = false;
  GET DIAGNOSTICS v_activated = ROW_COUNT;
  IF v_activated > 0 THEN
    RAISE NOTICE '2025-08 BTC: Activated % positions', v_activated;
  END IF;

  -- V5-matching balance_sum: per-investor opening through investor_positions
  SELECT COALESCE(SUM(inv_balance), 0) INTO v_opening
  FROM (
    SELECT COALESCE((
      SELECT SUM(t.amount) FROM transactions_v2 t
      WHERE t.investor_id = ip.investor_id
        AND t.fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid
        AND t.tx_date < '2025-08-01'::date
        AND t.is_voided = false
    ), 0) as inv_balance
    FROM investor_positions ip
    WHERE ip.fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid AND ip.is_active = true
  ) sub;

  -- V5-matching flows: DEP/WD/ADJ within period for active investors only
  SELECT COALESCE(SUM(t.amount), 0) INTO v_flows
  FROM transactions_v2 t
  WHERE t.fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid
    AND t.is_voided = false
    AND t.type IN ('DEPOSIT'::tx_type, 'WITHDRAWAL'::tx_type, 'ADJUSTMENT'::tx_type)
    AND t.tx_date >= '2025-08-01'::date
    AND t.tx_date <= '2025-08-31'::date
    AND t.investor_id IN (
      SELECT ip.investor_id FROM investor_positions ip
      WHERE ip.fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid AND ip.is_active = true
    );

  v_balance_sum := v_opening + v_flows;
  v_recorded_aum := v_balance_sum + v_gross_yield;

  RAISE NOTICE '2025-08 BTC: opening=%, flows=%, balance_sum=%, gross_yield=%, recorded_aum=%',
    v_opening, v_flows, v_balance_sum, v_gross_yield, v_recorded_aum;

  -- Call V5 apply
  v_result := apply_segmented_yield_distribution_v5(
    p_fund_id := '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    p_period_end := '2025-08-31'::date,
    p_recorded_aum := v_recorded_aum,
    p_admin_id := 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid,
    p_purpose := 'reporting'::aum_purpose
  );

  -- Check result
  IF (v_result->>'success')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION '2025-08 BTC FAILED: %', v_result->>'error';
  END IF;

  -- Re-activate any positions that went inactive from YIELD transactions
  UPDATE investor_positions SET is_active = true
  WHERE fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid AND is_active = false;

  RAISE NOTICE '2025-08 BTC SUCCESS: gross=%, net=%, fees=%, ib=%',
    v_result->'summary'->>'total_gross',
    v_result->'summary'->>'total_net',
    v_result->'summary'->>'total_fees',
    v_result->'summary'->>'total_ib';
END;
$$;

-- 2025-08 USDT: 3 segments, gross_yield = 11835.6379201915
DO $$
DECLARE
  v_opening numeric;
  v_flows numeric;
  v_balance_sum numeric;
  v_recorded_aum numeric;
  v_result jsonb;
  v_gross_yield numeric := 11835.6379201915;
  v_activated integer;
BEGIN
  -- Set auth context
  PERFORM set_config('request.jwt.claim.sub', 'a16a7e50-fefd-4bfe-897c-d16279b457c2', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"a16a7e50-fefd-4bfe-897c-d16279b457c2","role":"authenticated"}', true);
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Ensure all positions for this fund are active (V5 only processes active positions)
  UPDATE investor_positions SET is_active = true
  WHERE fund_id = '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid AND is_active = false;
  GET DIAGNOSTICS v_activated = ROW_COUNT;
  IF v_activated > 0 THEN
    RAISE NOTICE '2025-08 USDT: Activated % positions', v_activated;
  END IF;

  -- V5-matching balance_sum: per-investor opening through investor_positions
  SELECT COALESCE(SUM(inv_balance), 0) INTO v_opening
  FROM (
    SELECT COALESCE((
      SELECT SUM(t.amount) FROM transactions_v2 t
      WHERE t.investor_id = ip.investor_id
        AND t.fund_id = '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid
        AND t.tx_date < '2025-08-01'::date
        AND t.is_voided = false
    ), 0) as inv_balance
    FROM investor_positions ip
    WHERE ip.fund_id = '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid AND ip.is_active = true
  ) sub;

  -- V5-matching flows: DEP/WD/ADJ within period for active investors only
  SELECT COALESCE(SUM(t.amount), 0) INTO v_flows
  FROM transactions_v2 t
  WHERE t.fund_id = '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid
    AND t.is_voided = false
    AND t.type IN ('DEPOSIT'::tx_type, 'WITHDRAWAL'::tx_type, 'ADJUSTMENT'::tx_type)
    AND t.tx_date >= '2025-08-01'::date
    AND t.tx_date <= '2025-08-31'::date
    AND t.investor_id IN (
      SELECT ip.investor_id FROM investor_positions ip
      WHERE ip.fund_id = '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid AND ip.is_active = true
    );

  v_balance_sum := v_opening + v_flows;
  v_recorded_aum := v_balance_sum + v_gross_yield;

  RAISE NOTICE '2025-08 USDT: opening=%, flows=%, balance_sum=%, gross_yield=%, recorded_aum=%',
    v_opening, v_flows, v_balance_sum, v_gross_yield, v_recorded_aum;

  -- Call V5 apply
  v_result := apply_segmented_yield_distribution_v5(
    p_fund_id := '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    p_period_end := '2025-08-31'::date,
    p_recorded_aum := v_recorded_aum,
    p_admin_id := 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid,
    p_purpose := 'reporting'::aum_purpose
  );

  -- Check result
  IF (v_result->>'success')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION '2025-08 USDT FAILED: %', v_result->>'error';
  END IF;

  -- Re-activate any positions that went inactive from YIELD transactions
  UPDATE investor_positions SET is_active = true
  WHERE fund_id = '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid AND is_active = false;

  RAISE NOTICE '2025-08 USDT SUCCESS: gross=%, net=%, fees=%, ib=%',
    v_result->'summary'->>'total_gross',
    v_result->'summary'->>'total_net',
    v_result->'summary'->>'total_fees',
    v_result->'summary'->>'total_ib';
END;
$$;

-- 2025-09 BTC: 2 segments, gross_yield = 0.1251912081
DO $$
DECLARE
  v_opening numeric;
  v_flows numeric;
  v_balance_sum numeric;
  v_recorded_aum numeric;
  v_result jsonb;
  v_gross_yield numeric := 0.1251912081;
  v_activated integer;
BEGIN
  -- Set auth context
  PERFORM set_config('request.jwt.claim.sub', 'a16a7e50-fefd-4bfe-897c-d16279b457c2', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"a16a7e50-fefd-4bfe-897c-d16279b457c2","role":"authenticated"}', true);
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Ensure all positions for this fund are active (V5 only processes active positions)
  UPDATE investor_positions SET is_active = true
  WHERE fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid AND is_active = false;
  GET DIAGNOSTICS v_activated = ROW_COUNT;
  IF v_activated > 0 THEN
    RAISE NOTICE '2025-09 BTC: Activated % positions', v_activated;
  END IF;

  -- V5-matching balance_sum: per-investor opening through investor_positions
  SELECT COALESCE(SUM(inv_balance), 0) INTO v_opening
  FROM (
    SELECT COALESCE((
      SELECT SUM(t.amount) FROM transactions_v2 t
      WHERE t.investor_id = ip.investor_id
        AND t.fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid
        AND t.tx_date < '2025-09-01'::date
        AND t.is_voided = false
    ), 0) as inv_balance
    FROM investor_positions ip
    WHERE ip.fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid AND ip.is_active = true
  ) sub;

  -- V5-matching flows: DEP/WD/ADJ within period for active investors only
  SELECT COALESCE(SUM(t.amount), 0) INTO v_flows
  FROM transactions_v2 t
  WHERE t.fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid
    AND t.is_voided = false
    AND t.type IN ('DEPOSIT'::tx_type, 'WITHDRAWAL'::tx_type, 'ADJUSTMENT'::tx_type)
    AND t.tx_date >= '2025-09-01'::date
    AND t.tx_date <= '2025-09-30'::date
    AND t.investor_id IN (
      SELECT ip.investor_id FROM investor_positions ip
      WHERE ip.fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid AND ip.is_active = true
    );

  v_balance_sum := v_opening + v_flows;
  v_recorded_aum := v_balance_sum + v_gross_yield;

  RAISE NOTICE '2025-09 BTC: opening=%, flows=%, balance_sum=%, gross_yield=%, recorded_aum=%',
    v_opening, v_flows, v_balance_sum, v_gross_yield, v_recorded_aum;

  -- Call V5 apply
  v_result := apply_segmented_yield_distribution_v5(
    p_fund_id := '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    p_period_end := '2025-09-30'::date,
    p_recorded_aum := v_recorded_aum,
    p_admin_id := 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid,
    p_purpose := 'reporting'::aum_purpose
  );

  -- Check result
  IF (v_result->>'success')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION '2025-09 BTC FAILED: %', v_result->>'error';
  END IF;

  -- Re-activate any positions that went inactive from YIELD transactions
  UPDATE investor_positions SET is_active = true
  WHERE fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid AND is_active = false;

  RAISE NOTICE '2025-09 BTC SUCCESS: gross=%, net=%, fees=%, ib=%',
    v_result->'summary'->>'total_gross',
    v_result->'summary'->>'total_net',
    v_result->'summary'->>'total_fees',
    v_result->'summary'->>'total_ib';
END;
$$;

-- 2025-09 ETH: 6 segments, gross_yield = 5.1469448355
DO $$
DECLARE
  v_opening numeric;
  v_flows numeric;
  v_balance_sum numeric;
  v_recorded_aum numeric;
  v_result jsonb;
  v_gross_yield numeric := 5.1469448355;
  v_activated integer;
BEGIN
  -- Set auth context
  PERFORM set_config('request.jwt.claim.sub', 'a16a7e50-fefd-4bfe-897c-d16279b457c2', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"a16a7e50-fefd-4bfe-897c-d16279b457c2","role":"authenticated"}', true);
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Ensure all positions for this fund are active (V5 only processes active positions)
  UPDATE investor_positions SET is_active = true
  WHERE fund_id = '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid AND is_active = false;
  GET DIAGNOSTICS v_activated = ROW_COUNT;
  IF v_activated > 0 THEN
    RAISE NOTICE '2025-09 ETH: Activated % positions', v_activated;
  END IF;

  -- V5-matching balance_sum: per-investor opening through investor_positions
  SELECT COALESCE(SUM(inv_balance), 0) INTO v_opening
  FROM (
    SELECT COALESCE((
      SELECT SUM(t.amount) FROM transactions_v2 t
      WHERE t.investor_id = ip.investor_id
        AND t.fund_id = '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid
        AND t.tx_date < '2025-09-01'::date
        AND t.is_voided = false
    ), 0) as inv_balance
    FROM investor_positions ip
    WHERE ip.fund_id = '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid AND ip.is_active = true
  ) sub;

  -- V5-matching flows: DEP/WD/ADJ within period for active investors only
  SELECT COALESCE(SUM(t.amount), 0) INTO v_flows
  FROM transactions_v2 t
  WHERE t.fund_id = '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid
    AND t.is_voided = false
    AND t.type IN ('DEPOSIT'::tx_type, 'WITHDRAWAL'::tx_type, 'ADJUSTMENT'::tx_type)
    AND t.tx_date >= '2025-09-01'::date
    AND t.tx_date <= '2025-09-30'::date
    AND t.investor_id IN (
      SELECT ip.investor_id FROM investor_positions ip
      WHERE ip.fund_id = '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid AND ip.is_active = true
    );

  v_balance_sum := v_opening + v_flows;
  v_recorded_aum := v_balance_sum + v_gross_yield;

  RAISE NOTICE '2025-09 ETH: opening=%, flows=%, balance_sum=%, gross_yield=%, recorded_aum=%',
    v_opening, v_flows, v_balance_sum, v_gross_yield, v_recorded_aum;

  -- Call V5 apply
  v_result := apply_segmented_yield_distribution_v5(
    p_fund_id := '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid,
    p_period_end := '2025-09-30'::date,
    p_recorded_aum := v_recorded_aum,
    p_admin_id := 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid,
    p_purpose := 'reporting'::aum_purpose
  );

  -- Check result
  IF (v_result->>'success')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION '2025-09 ETH FAILED: %', v_result->>'error';
  END IF;

  -- Re-activate any positions that went inactive from YIELD transactions
  UPDATE investor_positions SET is_active = true
  WHERE fund_id = '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid AND is_active = false;

  RAISE NOTICE '2025-09 ETH SUCCESS: gross=%, net=%, fees=%, ib=%',
    v_result->'summary'->>'total_gross',
    v_result->'summary'->>'total_net',
    v_result->'summary'->>'total_fees',
    v_result->'summary'->>'total_ib';
END;
$$;

-- 2025-09 USDT: 3 segments, gross_yield = 27094.7226186590
DO $$
DECLARE
  v_opening numeric;
  v_flows numeric;
  v_balance_sum numeric;
  v_recorded_aum numeric;
  v_result jsonb;
  v_gross_yield numeric := 27094.7226186590;
  v_activated integer;
BEGIN
  -- Set auth context
  PERFORM set_config('request.jwt.claim.sub', 'a16a7e50-fefd-4bfe-897c-d16279b457c2', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"a16a7e50-fefd-4bfe-897c-d16279b457c2","role":"authenticated"}', true);
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Ensure all positions for this fund are active (V5 only processes active positions)
  UPDATE investor_positions SET is_active = true
  WHERE fund_id = '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid AND is_active = false;
  GET DIAGNOSTICS v_activated = ROW_COUNT;
  IF v_activated > 0 THEN
    RAISE NOTICE '2025-09 USDT: Activated % positions', v_activated;
  END IF;

  -- V5-matching balance_sum: per-investor opening through investor_positions
  SELECT COALESCE(SUM(inv_balance), 0) INTO v_opening
  FROM (
    SELECT COALESCE((
      SELECT SUM(t.amount) FROM transactions_v2 t
      WHERE t.investor_id = ip.investor_id
        AND t.fund_id = '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid
        AND t.tx_date < '2025-09-01'::date
        AND t.is_voided = false
    ), 0) as inv_balance
    FROM investor_positions ip
    WHERE ip.fund_id = '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid AND ip.is_active = true
  ) sub;

  -- V5-matching flows: DEP/WD/ADJ within period for active investors only
  SELECT COALESCE(SUM(t.amount), 0) INTO v_flows
  FROM transactions_v2 t
  WHERE t.fund_id = '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid
    AND t.is_voided = false
    AND t.type IN ('DEPOSIT'::tx_type, 'WITHDRAWAL'::tx_type, 'ADJUSTMENT'::tx_type)
    AND t.tx_date >= '2025-09-01'::date
    AND t.tx_date <= '2025-09-30'::date
    AND t.investor_id IN (
      SELECT ip.investor_id FROM investor_positions ip
      WHERE ip.fund_id = '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid AND ip.is_active = true
    );

  v_balance_sum := v_opening + v_flows;
  v_recorded_aum := v_balance_sum + v_gross_yield;

  RAISE NOTICE '2025-09 USDT: opening=%, flows=%, balance_sum=%, gross_yield=%, recorded_aum=%',
    v_opening, v_flows, v_balance_sum, v_gross_yield, v_recorded_aum;

  -- Call V5 apply
  v_result := apply_segmented_yield_distribution_v5(
    p_fund_id := '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    p_period_end := '2025-09-30'::date,
    p_recorded_aum := v_recorded_aum,
    p_admin_id := 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid,
    p_purpose := 'reporting'::aum_purpose
  );

  -- Check result
  IF (v_result->>'success')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION '2025-09 USDT FAILED: %', v_result->>'error';
  END IF;

  -- Re-activate any positions that went inactive from YIELD transactions
  UPDATE investor_positions SET is_active = true
  WHERE fund_id = '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid AND is_active = false;

  RAISE NOTICE '2025-09 USDT SUCCESS: gross=%, net=%, fees=%, ib=%',
    v_result->'summary'->>'total_gross',
    v_result->'summary'->>'total_net',
    v_result->'summary'->>'total_fees',
    v_result->'summary'->>'total_ib';
END;
$$;

-- 2025-09 SOL: 2 segments, gross_yield = 15.9618992065
DO $$
DECLARE
  v_opening numeric;
  v_flows numeric;
  v_balance_sum numeric;
  v_recorded_aum numeric;
  v_result jsonb;
  v_gross_yield numeric := 15.9618992065;
  v_activated integer;
BEGIN
  -- Set auth context
  PERFORM set_config('request.jwt.claim.sub', 'a16a7e50-fefd-4bfe-897c-d16279b457c2', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"a16a7e50-fefd-4bfe-897c-d16279b457c2","role":"authenticated"}', true);
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Ensure all positions for this fund are active (V5 only processes active positions)
  UPDATE investor_positions SET is_active = true
  WHERE fund_id = '7574bc81-aab3-4175-9e7f-803aa6f9eb8f'::uuid AND is_active = false;
  GET DIAGNOSTICS v_activated = ROW_COUNT;
  IF v_activated > 0 THEN
    RAISE NOTICE '2025-09 SOL: Activated % positions', v_activated;
  END IF;

  -- V5-matching balance_sum: per-investor opening through investor_positions
  SELECT COALESCE(SUM(inv_balance), 0) INTO v_opening
  FROM (
    SELECT COALESCE((
      SELECT SUM(t.amount) FROM transactions_v2 t
      WHERE t.investor_id = ip.investor_id
        AND t.fund_id = '7574bc81-aab3-4175-9e7f-803aa6f9eb8f'::uuid
        AND t.tx_date < '2025-09-01'::date
        AND t.is_voided = false
    ), 0) as inv_balance
    FROM investor_positions ip
    WHERE ip.fund_id = '7574bc81-aab3-4175-9e7f-803aa6f9eb8f'::uuid AND ip.is_active = true
  ) sub;

  -- V5-matching flows: DEP/WD/ADJ within period for active investors only
  SELECT COALESCE(SUM(t.amount), 0) INTO v_flows
  FROM transactions_v2 t
  WHERE t.fund_id = '7574bc81-aab3-4175-9e7f-803aa6f9eb8f'::uuid
    AND t.is_voided = false
    AND t.type IN ('DEPOSIT'::tx_type, 'WITHDRAWAL'::tx_type, 'ADJUSTMENT'::tx_type)
    AND t.tx_date >= '2025-09-01'::date
    AND t.tx_date <= '2025-09-30'::date
    AND t.investor_id IN (
      SELECT ip.investor_id FROM investor_positions ip
      WHERE ip.fund_id = '7574bc81-aab3-4175-9e7f-803aa6f9eb8f'::uuid AND ip.is_active = true
    );

  v_balance_sum := v_opening + v_flows;
  v_recorded_aum := v_balance_sum + v_gross_yield;

  RAISE NOTICE '2025-09 SOL: opening=%, flows=%, balance_sum=%, gross_yield=%, recorded_aum=%',
    v_opening, v_flows, v_balance_sum, v_gross_yield, v_recorded_aum;

  -- Call V5 apply
  v_result := apply_segmented_yield_distribution_v5(
    p_fund_id := '7574bc81-aab3-4175-9e7f-803aa6f9eb8f'::uuid,
    p_period_end := '2025-09-30'::date,
    p_recorded_aum := v_recorded_aum,
    p_admin_id := 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid,
    p_purpose := 'reporting'::aum_purpose
  );

  -- Check result
  IF (v_result->>'success')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION '2025-09 SOL FAILED: %', v_result->>'error';
  END IF;

  -- Re-activate any positions that went inactive from YIELD transactions
  UPDATE investor_positions SET is_active = true
  WHERE fund_id = '7574bc81-aab3-4175-9e7f-803aa6f9eb8f'::uuid AND is_active = false;

  RAISE NOTICE '2025-09 SOL SUCCESS: gross=%, net=%, fees=%, ib=%',
    v_result->'summary'->>'total_gross',
    v_result->'summary'->>'total_net',
    v_result->'summary'->>'total_fees',
    v_result->'summary'->>'total_ib';
END;
$$;

-- 2025-10 BTC: 3 segments, gross_yield = 0.1087167777
DO $$
DECLARE
  v_opening numeric;
  v_flows numeric;
  v_balance_sum numeric;
  v_recorded_aum numeric;
  v_result jsonb;
  v_gross_yield numeric := 0.1087167777;
  v_activated integer;
BEGIN
  -- Set auth context
  PERFORM set_config('request.jwt.claim.sub', 'a16a7e50-fefd-4bfe-897c-d16279b457c2', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"a16a7e50-fefd-4bfe-897c-d16279b457c2","role":"authenticated"}', true);
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Ensure all positions for this fund are active (V5 only processes active positions)
  UPDATE investor_positions SET is_active = true
  WHERE fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid AND is_active = false;
  GET DIAGNOSTICS v_activated = ROW_COUNT;
  IF v_activated > 0 THEN
    RAISE NOTICE '2025-10 BTC: Activated % positions', v_activated;
  END IF;

  -- V5-matching balance_sum: per-investor opening through investor_positions
  SELECT COALESCE(SUM(inv_balance), 0) INTO v_opening
  FROM (
    SELECT COALESCE((
      SELECT SUM(t.amount) FROM transactions_v2 t
      WHERE t.investor_id = ip.investor_id
        AND t.fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid
        AND t.tx_date < '2025-10-01'::date
        AND t.is_voided = false
    ), 0) as inv_balance
    FROM investor_positions ip
    WHERE ip.fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid AND ip.is_active = true
  ) sub;

  -- V5-matching flows: DEP/WD/ADJ within period for active investors only
  SELECT COALESCE(SUM(t.amount), 0) INTO v_flows
  FROM transactions_v2 t
  WHERE t.fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid
    AND t.is_voided = false
    AND t.type IN ('DEPOSIT'::tx_type, 'WITHDRAWAL'::tx_type, 'ADJUSTMENT'::tx_type)
    AND t.tx_date >= '2025-10-01'::date
    AND t.tx_date <= '2025-10-31'::date
    AND t.investor_id IN (
      SELECT ip.investor_id FROM investor_positions ip
      WHERE ip.fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid AND ip.is_active = true
    );

  v_balance_sum := v_opening + v_flows;
  v_recorded_aum := v_balance_sum + v_gross_yield;

  RAISE NOTICE '2025-10 BTC: opening=%, flows=%, balance_sum=%, gross_yield=%, recorded_aum=%',
    v_opening, v_flows, v_balance_sum, v_gross_yield, v_recorded_aum;

  -- Call V5 apply
  v_result := apply_segmented_yield_distribution_v5(
    p_fund_id := '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    p_period_end := '2025-10-31'::date,
    p_recorded_aum := v_recorded_aum,
    p_admin_id := 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid,
    p_purpose := 'reporting'::aum_purpose
  );

  -- Check result
  IF (v_result->>'success')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION '2025-10 BTC FAILED: %', v_result->>'error';
  END IF;

  -- Re-activate any positions that went inactive from YIELD transactions
  UPDATE investor_positions SET is_active = true
  WHERE fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid AND is_active = false;

  RAISE NOTICE '2025-10 BTC SUCCESS: gross=%, net=%, fees=%, ib=%',
    v_result->'summary'->>'total_gross',
    v_result->'summary'->>'total_net',
    v_result->'summary'->>'total_fees',
    v_result->'summary'->>'total_ib';
END;
$$;

-- 2025-10 ETH: 6 segments, gross_yield = 3.3531407325
DO $$
DECLARE
  v_opening numeric;
  v_flows numeric;
  v_balance_sum numeric;
  v_recorded_aum numeric;
  v_result jsonb;
  v_gross_yield numeric := 3.3531407325;
  v_activated integer;
BEGIN
  -- Set auth context
  PERFORM set_config('request.jwt.claim.sub', 'a16a7e50-fefd-4bfe-897c-d16279b457c2', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"a16a7e50-fefd-4bfe-897c-d16279b457c2","role":"authenticated"}', true);
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Ensure all positions for this fund are active (V5 only processes active positions)
  UPDATE investor_positions SET is_active = true
  WHERE fund_id = '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid AND is_active = false;
  GET DIAGNOSTICS v_activated = ROW_COUNT;
  IF v_activated > 0 THEN
    RAISE NOTICE '2025-10 ETH: Activated % positions', v_activated;
  END IF;

  -- V5-matching balance_sum: per-investor opening through investor_positions
  SELECT COALESCE(SUM(inv_balance), 0) INTO v_opening
  FROM (
    SELECT COALESCE((
      SELECT SUM(t.amount) FROM transactions_v2 t
      WHERE t.investor_id = ip.investor_id
        AND t.fund_id = '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid
        AND t.tx_date < '2025-10-01'::date
        AND t.is_voided = false
    ), 0) as inv_balance
    FROM investor_positions ip
    WHERE ip.fund_id = '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid AND ip.is_active = true
  ) sub;

  -- V5-matching flows: DEP/WD/ADJ within period for active investors only
  SELECT COALESCE(SUM(t.amount), 0) INTO v_flows
  FROM transactions_v2 t
  WHERE t.fund_id = '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid
    AND t.is_voided = false
    AND t.type IN ('DEPOSIT'::tx_type, 'WITHDRAWAL'::tx_type, 'ADJUSTMENT'::tx_type)
    AND t.tx_date >= '2025-10-01'::date
    AND t.tx_date <= '2025-10-31'::date
    AND t.investor_id IN (
      SELECT ip.investor_id FROM investor_positions ip
      WHERE ip.fund_id = '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid AND ip.is_active = true
    );

  v_balance_sum := v_opening + v_flows;
  v_recorded_aum := v_balance_sum + v_gross_yield;

  RAISE NOTICE '2025-10 ETH: opening=%, flows=%, balance_sum=%, gross_yield=%, recorded_aum=%',
    v_opening, v_flows, v_balance_sum, v_gross_yield, v_recorded_aum;

  -- Call V5 apply
  v_result := apply_segmented_yield_distribution_v5(
    p_fund_id := '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid,
    p_period_end := '2025-10-31'::date,
    p_recorded_aum := v_recorded_aum,
    p_admin_id := 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid,
    p_purpose := 'reporting'::aum_purpose
  );

  -- Check result
  IF (v_result->>'success')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION '2025-10 ETH FAILED: %', v_result->>'error';
  END IF;

  -- Re-activate any positions that went inactive from YIELD transactions
  UPDATE investor_positions SET is_active = true
  WHERE fund_id = '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid AND is_active = false;

  RAISE NOTICE '2025-10 ETH SUCCESS: gross=%, net=%, fees=%, ib=%',
    v_result->'summary'->>'total_gross',
    v_result->'summary'->>'total_net',
    v_result->'summary'->>'total_fees',
    v_result->'summary'->>'total_ib';
END;
$$;

-- 2025-10 USDT: 6 segments, gross_yield = 20862.1720472996
DO $$
DECLARE
  v_opening numeric;
  v_flows numeric;
  v_balance_sum numeric;
  v_recorded_aum numeric;
  v_result jsonb;
  v_gross_yield numeric := 20862.1720472996;
  v_activated integer;
BEGIN
  -- Set auth context
  PERFORM set_config('request.jwt.claim.sub', 'a16a7e50-fefd-4bfe-897c-d16279b457c2', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"a16a7e50-fefd-4bfe-897c-d16279b457c2","role":"authenticated"}', true);
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Ensure all positions for this fund are active (V5 only processes active positions)
  UPDATE investor_positions SET is_active = true
  WHERE fund_id = '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid AND is_active = false;
  GET DIAGNOSTICS v_activated = ROW_COUNT;
  IF v_activated > 0 THEN
    RAISE NOTICE '2025-10 USDT: Activated % positions', v_activated;
  END IF;

  -- V5-matching balance_sum: per-investor opening through investor_positions
  SELECT COALESCE(SUM(inv_balance), 0) INTO v_opening
  FROM (
    SELECT COALESCE((
      SELECT SUM(t.amount) FROM transactions_v2 t
      WHERE t.investor_id = ip.investor_id
        AND t.fund_id = '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid
        AND t.tx_date < '2025-10-01'::date
        AND t.is_voided = false
    ), 0) as inv_balance
    FROM investor_positions ip
    WHERE ip.fund_id = '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid AND ip.is_active = true
  ) sub;

  -- V5-matching flows: DEP/WD/ADJ within period for active investors only
  SELECT COALESCE(SUM(t.amount), 0) INTO v_flows
  FROM transactions_v2 t
  WHERE t.fund_id = '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid
    AND t.is_voided = false
    AND t.type IN ('DEPOSIT'::tx_type, 'WITHDRAWAL'::tx_type, 'ADJUSTMENT'::tx_type)
    AND t.tx_date >= '2025-10-01'::date
    AND t.tx_date <= '2025-10-31'::date
    AND t.investor_id IN (
      SELECT ip.investor_id FROM investor_positions ip
      WHERE ip.fund_id = '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid AND ip.is_active = true
    );

  v_balance_sum := v_opening + v_flows;
  v_recorded_aum := v_balance_sum + v_gross_yield;

  RAISE NOTICE '2025-10 USDT: opening=%, flows=%, balance_sum=%, gross_yield=%, recorded_aum=%',
    v_opening, v_flows, v_balance_sum, v_gross_yield, v_recorded_aum;

  -- Call V5 apply
  v_result := apply_segmented_yield_distribution_v5(
    p_fund_id := '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    p_period_end := '2025-10-31'::date,
    p_recorded_aum := v_recorded_aum,
    p_admin_id := 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid,
    p_purpose := 'reporting'::aum_purpose
  );

  -- Check result
  IF (v_result->>'success')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION '2025-10 USDT FAILED: %', v_result->>'error';
  END IF;

  -- Re-activate any positions that went inactive from YIELD transactions
  UPDATE investor_positions SET is_active = true
  WHERE fund_id = '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid AND is_active = false;

  RAISE NOTICE '2025-10 USDT SUCCESS: gross=%, net=%, fees=%, ib=%',
    v_result->'summary'->>'total_gross',
    v_result->'summary'->>'total_net',
    v_result->'summary'->>'total_fees',
    v_result->'summary'->>'total_ib';
END;
$$;

-- 2025-10 SOL: 2 segments, gross_yield = 13.1261283797
DO $$
DECLARE
  v_opening numeric;
  v_flows numeric;
  v_balance_sum numeric;
  v_recorded_aum numeric;
  v_result jsonb;
  v_gross_yield numeric := 13.1261283797;
  v_activated integer;
BEGIN
  -- Set auth context
  PERFORM set_config('request.jwt.claim.sub', 'a16a7e50-fefd-4bfe-897c-d16279b457c2', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"a16a7e50-fefd-4bfe-897c-d16279b457c2","role":"authenticated"}', true);
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Ensure all positions for this fund are active (V5 only processes active positions)
  UPDATE investor_positions SET is_active = true
  WHERE fund_id = '7574bc81-aab3-4175-9e7f-803aa6f9eb8f'::uuid AND is_active = false;
  GET DIAGNOSTICS v_activated = ROW_COUNT;
  IF v_activated > 0 THEN
    RAISE NOTICE '2025-10 SOL: Activated % positions', v_activated;
  END IF;

  -- V5-matching balance_sum: per-investor opening through investor_positions
  SELECT COALESCE(SUM(inv_balance), 0) INTO v_opening
  FROM (
    SELECT COALESCE((
      SELECT SUM(t.amount) FROM transactions_v2 t
      WHERE t.investor_id = ip.investor_id
        AND t.fund_id = '7574bc81-aab3-4175-9e7f-803aa6f9eb8f'::uuid
        AND t.tx_date < '2025-10-01'::date
        AND t.is_voided = false
    ), 0) as inv_balance
    FROM investor_positions ip
    WHERE ip.fund_id = '7574bc81-aab3-4175-9e7f-803aa6f9eb8f'::uuid AND ip.is_active = true
  ) sub;

  -- V5-matching flows: DEP/WD/ADJ within period for active investors only
  SELECT COALESCE(SUM(t.amount), 0) INTO v_flows
  FROM transactions_v2 t
  WHERE t.fund_id = '7574bc81-aab3-4175-9e7f-803aa6f9eb8f'::uuid
    AND t.is_voided = false
    AND t.type IN ('DEPOSIT'::tx_type, 'WITHDRAWAL'::tx_type, 'ADJUSTMENT'::tx_type)
    AND t.tx_date >= '2025-10-01'::date
    AND t.tx_date <= '2025-10-31'::date
    AND t.investor_id IN (
      SELECT ip.investor_id FROM investor_positions ip
      WHERE ip.fund_id = '7574bc81-aab3-4175-9e7f-803aa6f9eb8f'::uuid AND ip.is_active = true
    );

  v_balance_sum := v_opening + v_flows;
  v_recorded_aum := v_balance_sum + v_gross_yield;

  RAISE NOTICE '2025-10 SOL: opening=%, flows=%, balance_sum=%, gross_yield=%, recorded_aum=%',
    v_opening, v_flows, v_balance_sum, v_gross_yield, v_recorded_aum;

  -- Call V5 apply
  v_result := apply_segmented_yield_distribution_v5(
    p_fund_id := '7574bc81-aab3-4175-9e7f-803aa6f9eb8f'::uuid,
    p_period_end := '2025-10-31'::date,
    p_recorded_aum := v_recorded_aum,
    p_admin_id := 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid,
    p_purpose := 'reporting'::aum_purpose
  );

  -- Check result
  IF (v_result->>'success')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION '2025-10 SOL FAILED: %', v_result->>'error';
  END IF;

  -- Re-activate any positions that went inactive from YIELD transactions
  UPDATE investor_positions SET is_active = true
  WHERE fund_id = '7574bc81-aab3-4175-9e7f-803aa6f9eb8f'::uuid AND is_active = false;

  RAISE NOTICE '2025-10 SOL SUCCESS: gross=%, net=%, fees=%, ib=%',
    v_result->'summary'->>'total_gross',
    v_result->'summary'->>'total_net',
    v_result->'summary'->>'total_fees',
    v_result->'summary'->>'total_ib';
END;
$$;

-- 2025-11 BTC: 4 segments, gross_yield = 0.0991941568
DO $$
DECLARE
  v_opening numeric;
  v_flows numeric;
  v_balance_sum numeric;
  v_recorded_aum numeric;
  v_result jsonb;
  v_gross_yield numeric := 0.0991941568;
  v_activated integer;
BEGIN
  -- Set auth context
  PERFORM set_config('request.jwt.claim.sub', 'a16a7e50-fefd-4bfe-897c-d16279b457c2', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"a16a7e50-fefd-4bfe-897c-d16279b457c2","role":"authenticated"}', true);
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Ensure all positions for this fund are active (V5 only processes active positions)
  UPDATE investor_positions SET is_active = true
  WHERE fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid AND is_active = false;
  GET DIAGNOSTICS v_activated = ROW_COUNT;
  IF v_activated > 0 THEN
    RAISE NOTICE '2025-11 BTC: Activated % positions', v_activated;
  END IF;

  -- V5-matching balance_sum: per-investor opening through investor_positions
  SELECT COALESCE(SUM(inv_balance), 0) INTO v_opening
  FROM (
    SELECT COALESCE((
      SELECT SUM(t.amount) FROM transactions_v2 t
      WHERE t.investor_id = ip.investor_id
        AND t.fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid
        AND t.tx_date < '2025-11-01'::date
        AND t.is_voided = false
    ), 0) as inv_balance
    FROM investor_positions ip
    WHERE ip.fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid AND ip.is_active = true
  ) sub;

  -- V5-matching flows: DEP/WD/ADJ within period for active investors only
  SELECT COALESCE(SUM(t.amount), 0) INTO v_flows
  FROM transactions_v2 t
  WHERE t.fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid
    AND t.is_voided = false
    AND t.type IN ('DEPOSIT'::tx_type, 'WITHDRAWAL'::tx_type, 'ADJUSTMENT'::tx_type)
    AND t.tx_date >= '2025-11-01'::date
    AND t.tx_date <= '2025-11-30'::date
    AND t.investor_id IN (
      SELECT ip.investor_id FROM investor_positions ip
      WHERE ip.fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid AND ip.is_active = true
    );

  v_balance_sum := v_opening + v_flows;
  v_recorded_aum := v_balance_sum + v_gross_yield;

  RAISE NOTICE '2025-11 BTC: opening=%, flows=%, balance_sum=%, gross_yield=%, recorded_aum=%',
    v_opening, v_flows, v_balance_sum, v_gross_yield, v_recorded_aum;

  -- Call V5 apply
  v_result := apply_segmented_yield_distribution_v5(
    p_fund_id := '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    p_period_end := '2025-11-30'::date,
    p_recorded_aum := v_recorded_aum,
    p_admin_id := 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid,
    p_purpose := 'reporting'::aum_purpose
  );

  -- Check result
  IF (v_result->>'success')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION '2025-11 BTC FAILED: %', v_result->>'error';
  END IF;

  -- Re-activate any positions that went inactive from YIELD transactions
  UPDATE investor_positions SET is_active = true
  WHERE fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid AND is_active = false;

  RAISE NOTICE '2025-11 BTC SUCCESS: gross=%, net=%, fees=%, ib=%',
    v_result->'summary'->>'total_gross',
    v_result->'summary'->>'total_net',
    v_result->'summary'->>'total_fees',
    v_result->'summary'->>'total_ib';
END;
$$;

-- 2025-11 ETH: 7 segments, gross_yield = 3.2791932539
DO $$
DECLARE
  v_opening numeric;
  v_flows numeric;
  v_balance_sum numeric;
  v_recorded_aum numeric;
  v_result jsonb;
  v_gross_yield numeric := 3.2791932539;
  v_activated integer;
BEGIN
  -- Set auth context
  PERFORM set_config('request.jwt.claim.sub', 'a16a7e50-fefd-4bfe-897c-d16279b457c2', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"a16a7e50-fefd-4bfe-897c-d16279b457c2","role":"authenticated"}', true);
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Ensure all positions for this fund are active (V5 only processes active positions)
  UPDATE investor_positions SET is_active = true
  WHERE fund_id = '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid AND is_active = false;
  GET DIAGNOSTICS v_activated = ROW_COUNT;
  IF v_activated > 0 THEN
    RAISE NOTICE '2025-11 ETH: Activated % positions', v_activated;
  END IF;

  -- V5-matching balance_sum: per-investor opening through investor_positions
  SELECT COALESCE(SUM(inv_balance), 0) INTO v_opening
  FROM (
    SELECT COALESCE((
      SELECT SUM(t.amount) FROM transactions_v2 t
      WHERE t.investor_id = ip.investor_id
        AND t.fund_id = '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid
        AND t.tx_date < '2025-11-01'::date
        AND t.is_voided = false
    ), 0) as inv_balance
    FROM investor_positions ip
    WHERE ip.fund_id = '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid AND ip.is_active = true
  ) sub;

  -- V5-matching flows: DEP/WD/ADJ within period for active investors only
  SELECT COALESCE(SUM(t.amount), 0) INTO v_flows
  FROM transactions_v2 t
  WHERE t.fund_id = '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid
    AND t.is_voided = false
    AND t.type IN ('DEPOSIT'::tx_type, 'WITHDRAWAL'::tx_type, 'ADJUSTMENT'::tx_type)
    AND t.tx_date >= '2025-11-01'::date
    AND t.tx_date <= '2025-11-30'::date
    AND t.investor_id IN (
      SELECT ip.investor_id FROM investor_positions ip
      WHERE ip.fund_id = '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid AND ip.is_active = true
    );

  v_balance_sum := v_opening + v_flows;
  v_recorded_aum := v_balance_sum + v_gross_yield;

  RAISE NOTICE '2025-11 ETH: opening=%, flows=%, balance_sum=%, gross_yield=%, recorded_aum=%',
    v_opening, v_flows, v_balance_sum, v_gross_yield, v_recorded_aum;

  -- Call V5 apply
  v_result := apply_segmented_yield_distribution_v5(
    p_fund_id := '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid,
    p_period_end := '2025-11-30'::date,
    p_recorded_aum := v_recorded_aum,
    p_admin_id := 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid,
    p_purpose := 'reporting'::aum_purpose
  );

  -- Check result
  IF (v_result->>'success')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION '2025-11 ETH FAILED: %', v_result->>'error';
  END IF;

  -- Re-activate any positions that went inactive from YIELD transactions
  UPDATE investor_positions SET is_active = true
  WHERE fund_id = '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid AND is_active = false;

  RAISE NOTICE '2025-11 ETH SUCCESS: gross=%, net=%, fees=%, ib=%',
    v_result->'summary'->>'total_gross',
    v_result->'summary'->>'total_net',
    v_result->'summary'->>'total_fees',
    v_result->'summary'->>'total_ib';
END;
$$;

-- 2025-11 USDT: 9 segments, gross_yield = 26338.4807130965
DO $$
DECLARE
  v_opening numeric;
  v_flows numeric;
  v_balance_sum numeric;
  v_recorded_aum numeric;
  v_result jsonb;
  v_gross_yield numeric := 26338.4807130965;
  v_activated integer;
BEGIN
  -- Set auth context
  PERFORM set_config('request.jwt.claim.sub', 'a16a7e50-fefd-4bfe-897c-d16279b457c2', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"a16a7e50-fefd-4bfe-897c-d16279b457c2","role":"authenticated"}', true);
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Ensure all positions for this fund are active (V5 only processes active positions)
  UPDATE investor_positions SET is_active = true
  WHERE fund_id = '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid AND is_active = false;
  GET DIAGNOSTICS v_activated = ROW_COUNT;
  IF v_activated > 0 THEN
    RAISE NOTICE '2025-11 USDT: Activated % positions', v_activated;
  END IF;

  -- V5-matching balance_sum: per-investor opening through investor_positions
  SELECT COALESCE(SUM(inv_balance), 0) INTO v_opening
  FROM (
    SELECT COALESCE((
      SELECT SUM(t.amount) FROM transactions_v2 t
      WHERE t.investor_id = ip.investor_id
        AND t.fund_id = '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid
        AND t.tx_date < '2025-11-01'::date
        AND t.is_voided = false
    ), 0) as inv_balance
    FROM investor_positions ip
    WHERE ip.fund_id = '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid AND ip.is_active = true
  ) sub;

  -- V5-matching flows: DEP/WD/ADJ within period for active investors only
  SELECT COALESCE(SUM(t.amount), 0) INTO v_flows
  FROM transactions_v2 t
  WHERE t.fund_id = '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid
    AND t.is_voided = false
    AND t.type IN ('DEPOSIT'::tx_type, 'WITHDRAWAL'::tx_type, 'ADJUSTMENT'::tx_type)
    AND t.tx_date >= '2025-11-01'::date
    AND t.tx_date <= '2025-11-30'::date
    AND t.investor_id IN (
      SELECT ip.investor_id FROM investor_positions ip
      WHERE ip.fund_id = '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid AND ip.is_active = true
    );

  v_balance_sum := v_opening + v_flows;
  v_recorded_aum := v_balance_sum + v_gross_yield;

  RAISE NOTICE '2025-11 USDT: opening=%, flows=%, balance_sum=%, gross_yield=%, recorded_aum=%',
    v_opening, v_flows, v_balance_sum, v_gross_yield, v_recorded_aum;

  -- Call V5 apply
  v_result := apply_segmented_yield_distribution_v5(
    p_fund_id := '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    p_period_end := '2025-11-30'::date,
    p_recorded_aum := v_recorded_aum,
    p_admin_id := 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid,
    p_purpose := 'reporting'::aum_purpose
  );

  -- Check result
  IF (v_result->>'success')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION '2025-11 USDT FAILED: %', v_result->>'error';
  END IF;

  -- Re-activate any positions that went inactive from YIELD transactions
  UPDATE investor_positions SET is_active = true
  WHERE fund_id = '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid AND is_active = false;

  RAISE NOTICE '2025-11 USDT SUCCESS: gross=%, net=%, fees=%, ib=%',
    v_result->'summary'->>'total_gross',
    v_result->'summary'->>'total_net',
    v_result->'summary'->>'total_fees',
    v_result->'summary'->>'total_ib';
END;
$$;

-- 2025-11 SOL: 3 segments, gross_yield = 18.9932651397
DO $$
DECLARE
  v_opening numeric;
  v_flows numeric;
  v_balance_sum numeric;
  v_recorded_aum numeric;
  v_result jsonb;
  v_gross_yield numeric := 18.9932651397;
  v_activated integer;
BEGIN
  -- Set auth context
  PERFORM set_config('request.jwt.claim.sub', 'a16a7e50-fefd-4bfe-897c-d16279b457c2', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"a16a7e50-fefd-4bfe-897c-d16279b457c2","role":"authenticated"}', true);
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Ensure all positions for this fund are active (V5 only processes active positions)
  UPDATE investor_positions SET is_active = true
  WHERE fund_id = '7574bc81-aab3-4175-9e7f-803aa6f9eb8f'::uuid AND is_active = false;
  GET DIAGNOSTICS v_activated = ROW_COUNT;
  IF v_activated > 0 THEN
    RAISE NOTICE '2025-11 SOL: Activated % positions', v_activated;
  END IF;

  -- V5-matching balance_sum: per-investor opening through investor_positions
  SELECT COALESCE(SUM(inv_balance), 0) INTO v_opening
  FROM (
    SELECT COALESCE((
      SELECT SUM(t.amount) FROM transactions_v2 t
      WHERE t.investor_id = ip.investor_id
        AND t.fund_id = '7574bc81-aab3-4175-9e7f-803aa6f9eb8f'::uuid
        AND t.tx_date < '2025-11-01'::date
        AND t.is_voided = false
    ), 0) as inv_balance
    FROM investor_positions ip
    WHERE ip.fund_id = '7574bc81-aab3-4175-9e7f-803aa6f9eb8f'::uuid AND ip.is_active = true
  ) sub;

  -- V5-matching flows: DEP/WD/ADJ within period for active investors only
  SELECT COALESCE(SUM(t.amount), 0) INTO v_flows
  FROM transactions_v2 t
  WHERE t.fund_id = '7574bc81-aab3-4175-9e7f-803aa6f9eb8f'::uuid
    AND t.is_voided = false
    AND t.type IN ('DEPOSIT'::tx_type, 'WITHDRAWAL'::tx_type, 'ADJUSTMENT'::tx_type)
    AND t.tx_date >= '2025-11-01'::date
    AND t.tx_date <= '2025-11-30'::date
    AND t.investor_id IN (
      SELECT ip.investor_id FROM investor_positions ip
      WHERE ip.fund_id = '7574bc81-aab3-4175-9e7f-803aa6f9eb8f'::uuid AND ip.is_active = true
    );

  v_balance_sum := v_opening + v_flows;
  v_recorded_aum := v_balance_sum + v_gross_yield;

  RAISE NOTICE '2025-11 SOL: opening=%, flows=%, balance_sum=%, gross_yield=%, recorded_aum=%',
    v_opening, v_flows, v_balance_sum, v_gross_yield, v_recorded_aum;

  -- Call V5 apply
  v_result := apply_segmented_yield_distribution_v5(
    p_fund_id := '7574bc81-aab3-4175-9e7f-803aa6f9eb8f'::uuid,
    p_period_end := '2025-11-30'::date,
    p_recorded_aum := v_recorded_aum,
    p_admin_id := 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid,
    p_purpose := 'reporting'::aum_purpose
  );

  -- Check result
  IF (v_result->>'success')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION '2025-11 SOL FAILED: %', v_result->>'error';
  END IF;

  -- Re-activate any positions that went inactive from YIELD transactions
  UPDATE investor_positions SET is_active = true
  WHERE fund_id = '7574bc81-aab3-4175-9e7f-803aa6f9eb8f'::uuid AND is_active = false;

  RAISE NOTICE '2025-11 SOL SUCCESS: gross=%, net=%, fees=%, ib=%',
    v_result->'summary'->>'total_gross',
    v_result->'summary'->>'total_net',
    v_result->'summary'->>'total_fees',
    v_result->'summary'->>'total_ib';
END;
$$;

-- 2025-11 XRP: 1 segments, gross_yield = 355.6849073405
DO $$
DECLARE
  v_opening numeric;
  v_flows numeric;
  v_balance_sum numeric;
  v_recorded_aum numeric;
  v_result jsonb;
  v_gross_yield numeric := 355.6849073405;
  v_activated integer;
BEGIN
  -- Set auth context
  PERFORM set_config('request.jwt.claim.sub', 'a16a7e50-fefd-4bfe-897c-d16279b457c2', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"a16a7e50-fefd-4bfe-897c-d16279b457c2","role":"authenticated"}', true);
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Ensure all positions for this fund are active (V5 only processes active positions)
  UPDATE investor_positions SET is_active = true
  WHERE fund_id = '2c123c4f-76b4-4504-867e-059649855417'::uuid AND is_active = false;
  GET DIAGNOSTICS v_activated = ROW_COUNT;
  IF v_activated > 0 THEN
    RAISE NOTICE '2025-11 XRP: Activated % positions', v_activated;
  END IF;

  -- V5-matching balance_sum: per-investor opening through investor_positions
  SELECT COALESCE(SUM(inv_balance), 0) INTO v_opening
  FROM (
    SELECT COALESCE((
      SELECT SUM(t.amount) FROM transactions_v2 t
      WHERE t.investor_id = ip.investor_id
        AND t.fund_id = '2c123c4f-76b4-4504-867e-059649855417'::uuid
        AND t.tx_date < '2025-11-01'::date
        AND t.is_voided = false
    ), 0) as inv_balance
    FROM investor_positions ip
    WHERE ip.fund_id = '2c123c4f-76b4-4504-867e-059649855417'::uuid AND ip.is_active = true
  ) sub;

  -- V5-matching flows: DEP/WD/ADJ within period for active investors only
  SELECT COALESCE(SUM(t.amount), 0) INTO v_flows
  FROM transactions_v2 t
  WHERE t.fund_id = '2c123c4f-76b4-4504-867e-059649855417'::uuid
    AND t.is_voided = false
    AND t.type IN ('DEPOSIT'::tx_type, 'WITHDRAWAL'::tx_type, 'ADJUSTMENT'::tx_type)
    AND t.tx_date >= '2025-11-01'::date
    AND t.tx_date <= '2025-11-30'::date
    AND t.investor_id IN (
      SELECT ip.investor_id FROM investor_positions ip
      WHERE ip.fund_id = '2c123c4f-76b4-4504-867e-059649855417'::uuid AND ip.is_active = true
    );

  v_balance_sum := v_opening + v_flows;
  v_recorded_aum := v_balance_sum + v_gross_yield;

  RAISE NOTICE '2025-11 XRP: opening=%, flows=%, balance_sum=%, gross_yield=%, recorded_aum=%',
    v_opening, v_flows, v_balance_sum, v_gross_yield, v_recorded_aum;

  -- Call V5 apply
  v_result := apply_segmented_yield_distribution_v5(
    p_fund_id := '2c123c4f-76b4-4504-867e-059649855417'::uuid,
    p_period_end := '2025-11-30'::date,
    p_recorded_aum := v_recorded_aum,
    p_admin_id := 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid,
    p_purpose := 'reporting'::aum_purpose
  );

  -- Check result
  IF (v_result->>'success')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION '2025-11 XRP FAILED: %', v_result->>'error';
  END IF;

  -- Re-activate any positions that went inactive from YIELD transactions
  UPDATE investor_positions SET is_active = true
  WHERE fund_id = '2c123c4f-76b4-4504-867e-059649855417'::uuid AND is_active = false;

  RAISE NOTICE '2025-11 XRP SUCCESS: gross=%, net=%, fees=%, ib=%',
    v_result->'summary'->>'total_gross',
    v_result->'summary'->>'total_net',
    v_result->'summary'->>'total_fees',
    v_result->'summary'->>'total_ib';
END;
$$;

-- 2025-12 BTC: 4 segments, gross_yield = 0.1221196893
DO $$
DECLARE
  v_opening numeric;
  v_flows numeric;
  v_balance_sum numeric;
  v_recorded_aum numeric;
  v_result jsonb;
  v_gross_yield numeric := 0.1221196893;
  v_activated integer;
BEGIN
  -- Set auth context
  PERFORM set_config('request.jwt.claim.sub', 'a16a7e50-fefd-4bfe-897c-d16279b457c2', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"a16a7e50-fefd-4bfe-897c-d16279b457c2","role":"authenticated"}', true);
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Ensure all positions for this fund are active (V5 only processes active positions)
  UPDATE investor_positions SET is_active = true
  WHERE fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid AND is_active = false;
  GET DIAGNOSTICS v_activated = ROW_COUNT;
  IF v_activated > 0 THEN
    RAISE NOTICE '2025-12 BTC: Activated % positions', v_activated;
  END IF;

  -- V5-matching balance_sum: per-investor opening through investor_positions
  SELECT COALESCE(SUM(inv_balance), 0) INTO v_opening
  FROM (
    SELECT COALESCE((
      SELECT SUM(t.amount) FROM transactions_v2 t
      WHERE t.investor_id = ip.investor_id
        AND t.fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid
        AND t.tx_date < '2025-12-01'::date
        AND t.is_voided = false
    ), 0) as inv_balance
    FROM investor_positions ip
    WHERE ip.fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid AND ip.is_active = true
  ) sub;

  -- V5-matching flows: DEP/WD/ADJ within period for active investors only
  SELECT COALESCE(SUM(t.amount), 0) INTO v_flows
  FROM transactions_v2 t
  WHERE t.fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid
    AND t.is_voided = false
    AND t.type IN ('DEPOSIT'::tx_type, 'WITHDRAWAL'::tx_type, 'ADJUSTMENT'::tx_type)
    AND t.tx_date >= '2025-12-01'::date
    AND t.tx_date <= '2025-12-31'::date
    AND t.investor_id IN (
      SELECT ip.investor_id FROM investor_positions ip
      WHERE ip.fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid AND ip.is_active = true
    );

  v_balance_sum := v_opening + v_flows;
  v_recorded_aum := v_balance_sum + v_gross_yield;

  RAISE NOTICE '2025-12 BTC: opening=%, flows=%, balance_sum=%, gross_yield=%, recorded_aum=%',
    v_opening, v_flows, v_balance_sum, v_gross_yield, v_recorded_aum;

  -- Call V5 apply
  v_result := apply_segmented_yield_distribution_v5(
    p_fund_id := '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    p_period_end := '2025-12-31'::date,
    p_recorded_aum := v_recorded_aum,
    p_admin_id := 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid,
    p_purpose := 'reporting'::aum_purpose
  );

  -- Check result
  IF (v_result->>'success')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION '2025-12 BTC FAILED: %', v_result->>'error';
  END IF;

  -- Re-activate any positions that went inactive from YIELD transactions
  UPDATE investor_positions SET is_active = true
  WHERE fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid AND is_active = false;

  RAISE NOTICE '2025-12 BTC SUCCESS: gross=%, net=%, fees=%, ib=%',
    v_result->'summary'->>'total_gross',
    v_result->'summary'->>'total_net',
    v_result->'summary'->>'total_fees',
    v_result->'summary'->>'total_ib';
END;
$$;

-- 2025-12 ETH: 4 segments, gross_yield = 1.9485790074
DO $$
DECLARE
  v_opening numeric;
  v_flows numeric;
  v_balance_sum numeric;
  v_recorded_aum numeric;
  v_result jsonb;
  v_gross_yield numeric := 1.9485790074;
  v_activated integer;
BEGIN
  -- Set auth context
  PERFORM set_config('request.jwt.claim.sub', 'a16a7e50-fefd-4bfe-897c-d16279b457c2', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"a16a7e50-fefd-4bfe-897c-d16279b457c2","role":"authenticated"}', true);
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Ensure all positions for this fund are active (V5 only processes active positions)
  UPDATE investor_positions SET is_active = true
  WHERE fund_id = '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid AND is_active = false;
  GET DIAGNOSTICS v_activated = ROW_COUNT;
  IF v_activated > 0 THEN
    RAISE NOTICE '2025-12 ETH: Activated % positions', v_activated;
  END IF;

  -- V5-matching balance_sum: per-investor opening through investor_positions
  SELECT COALESCE(SUM(inv_balance), 0) INTO v_opening
  FROM (
    SELECT COALESCE((
      SELECT SUM(t.amount) FROM transactions_v2 t
      WHERE t.investor_id = ip.investor_id
        AND t.fund_id = '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid
        AND t.tx_date < '2025-12-01'::date
        AND t.is_voided = false
    ), 0) as inv_balance
    FROM investor_positions ip
    WHERE ip.fund_id = '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid AND ip.is_active = true
  ) sub;

  -- V5-matching flows: DEP/WD/ADJ within period for active investors only
  SELECT COALESCE(SUM(t.amount), 0) INTO v_flows
  FROM transactions_v2 t
  WHERE t.fund_id = '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid
    AND t.is_voided = false
    AND t.type IN ('DEPOSIT'::tx_type, 'WITHDRAWAL'::tx_type, 'ADJUSTMENT'::tx_type)
    AND t.tx_date >= '2025-12-01'::date
    AND t.tx_date <= '2025-12-31'::date
    AND t.investor_id IN (
      SELECT ip.investor_id FROM investor_positions ip
      WHERE ip.fund_id = '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid AND ip.is_active = true
    );

  v_balance_sum := v_opening + v_flows;
  v_recorded_aum := v_balance_sum + v_gross_yield;

  RAISE NOTICE '2025-12 ETH: opening=%, flows=%, balance_sum=%, gross_yield=%, recorded_aum=%',
    v_opening, v_flows, v_balance_sum, v_gross_yield, v_recorded_aum;

  -- Call V5 apply
  v_result := apply_segmented_yield_distribution_v5(
    p_fund_id := '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid,
    p_period_end := '2025-12-31'::date,
    p_recorded_aum := v_recorded_aum,
    p_admin_id := 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid,
    p_purpose := 'reporting'::aum_purpose
  );

  -- Check result
  IF (v_result->>'success')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION '2025-12 ETH FAILED: %', v_result->>'error';
  END IF;

  -- Re-activate any positions that went inactive from YIELD transactions
  UPDATE investor_positions SET is_active = true
  WHERE fund_id = '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid AND is_active = false;

  RAISE NOTICE '2025-12 ETH SUCCESS: gross=%, net=%, fees=%, ib=%',
    v_result->'summary'->>'total_gross',
    v_result->'summary'->>'total_net',
    v_result->'summary'->>'total_fees',
    v_result->'summary'->>'total_ib';
END;
$$;

-- 2025-12 USDT: 1 segments, gross_yield = 3919.4496651981
DO $$
DECLARE
  v_opening numeric;
  v_flows numeric;
  v_balance_sum numeric;
  v_recorded_aum numeric;
  v_result jsonb;
  v_gross_yield numeric := 3919.4496651981;
  v_activated integer;
BEGIN
  -- Set auth context
  PERFORM set_config('request.jwt.claim.sub', 'a16a7e50-fefd-4bfe-897c-d16279b457c2', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"a16a7e50-fefd-4bfe-897c-d16279b457c2","role":"authenticated"}', true);
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Ensure all positions for this fund are active (V5 only processes active positions)
  UPDATE investor_positions SET is_active = true
  WHERE fund_id = '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid AND is_active = false;
  GET DIAGNOSTICS v_activated = ROW_COUNT;
  IF v_activated > 0 THEN
    RAISE NOTICE '2025-12 USDT: Activated % positions', v_activated;
  END IF;

  -- V5-matching balance_sum: per-investor opening through investor_positions
  SELECT COALESCE(SUM(inv_balance), 0) INTO v_opening
  FROM (
    SELECT COALESCE((
      SELECT SUM(t.amount) FROM transactions_v2 t
      WHERE t.investor_id = ip.investor_id
        AND t.fund_id = '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid
        AND t.tx_date < '2025-12-01'::date
        AND t.is_voided = false
    ), 0) as inv_balance
    FROM investor_positions ip
    WHERE ip.fund_id = '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid AND ip.is_active = true
  ) sub;

  -- V5-matching flows: DEP/WD/ADJ within period for active investors only
  SELECT COALESCE(SUM(t.amount), 0) INTO v_flows
  FROM transactions_v2 t
  WHERE t.fund_id = '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid
    AND t.is_voided = false
    AND t.type IN ('DEPOSIT'::tx_type, 'WITHDRAWAL'::tx_type, 'ADJUSTMENT'::tx_type)
    AND t.tx_date >= '2025-12-01'::date
    AND t.tx_date <= '2025-12-31'::date
    AND t.investor_id IN (
      SELECT ip.investor_id FROM investor_positions ip
      WHERE ip.fund_id = '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid AND ip.is_active = true
    );

  v_balance_sum := v_opening + v_flows;
  v_recorded_aum := v_balance_sum + v_gross_yield;

  RAISE NOTICE '2025-12 USDT: opening=%, flows=%, balance_sum=%, gross_yield=%, recorded_aum=%',
    v_opening, v_flows, v_balance_sum, v_gross_yield, v_recorded_aum;

  -- Call V5 apply
  v_result := apply_segmented_yield_distribution_v5(
    p_fund_id := '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    p_period_end := '2025-12-31'::date,
    p_recorded_aum := v_recorded_aum,
    p_admin_id := 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid,
    p_purpose := 'reporting'::aum_purpose
  );

  -- Check result
  IF (v_result->>'success')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION '2025-12 USDT FAILED: %', v_result->>'error';
  END IF;

  -- Re-activate any positions that went inactive from YIELD transactions
  UPDATE investor_positions SET is_active = true
  WHERE fund_id = '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid AND is_active = false;

  RAISE NOTICE '2025-12 USDT SUCCESS: gross=%, net=%, fees=%, ib=%',
    v_result->'summary'->>'total_gross',
    v_result->'summary'->>'total_net',
    v_result->'summary'->>'total_fees',
    v_result->'summary'->>'total_ib';
END;
$$;

-- 2025-12 SOL: 3 segments, gross_yield = 12.6764364474
DO $$
DECLARE
  v_opening numeric;
  v_flows numeric;
  v_balance_sum numeric;
  v_recorded_aum numeric;
  v_result jsonb;
  v_gross_yield numeric := 12.6764364474;
  v_activated integer;
BEGIN
  -- Set auth context
  PERFORM set_config('request.jwt.claim.sub', 'a16a7e50-fefd-4bfe-897c-d16279b457c2', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"a16a7e50-fefd-4bfe-897c-d16279b457c2","role":"authenticated"}', true);
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Ensure all positions for this fund are active (V5 only processes active positions)
  UPDATE investor_positions SET is_active = true
  WHERE fund_id = '7574bc81-aab3-4175-9e7f-803aa6f9eb8f'::uuid AND is_active = false;
  GET DIAGNOSTICS v_activated = ROW_COUNT;
  IF v_activated > 0 THEN
    RAISE NOTICE '2025-12 SOL: Activated % positions', v_activated;
  END IF;

  -- V5-matching balance_sum: per-investor opening through investor_positions
  SELECT COALESCE(SUM(inv_balance), 0) INTO v_opening
  FROM (
    SELECT COALESCE((
      SELECT SUM(t.amount) FROM transactions_v2 t
      WHERE t.investor_id = ip.investor_id
        AND t.fund_id = '7574bc81-aab3-4175-9e7f-803aa6f9eb8f'::uuid
        AND t.tx_date < '2025-12-01'::date
        AND t.is_voided = false
    ), 0) as inv_balance
    FROM investor_positions ip
    WHERE ip.fund_id = '7574bc81-aab3-4175-9e7f-803aa6f9eb8f'::uuid AND ip.is_active = true
  ) sub;

  -- V5-matching flows: DEP/WD/ADJ within period for active investors only
  SELECT COALESCE(SUM(t.amount), 0) INTO v_flows
  FROM transactions_v2 t
  WHERE t.fund_id = '7574bc81-aab3-4175-9e7f-803aa6f9eb8f'::uuid
    AND t.is_voided = false
    AND t.type IN ('DEPOSIT'::tx_type, 'WITHDRAWAL'::tx_type, 'ADJUSTMENT'::tx_type)
    AND t.tx_date >= '2025-12-01'::date
    AND t.tx_date <= '2025-12-31'::date
    AND t.investor_id IN (
      SELECT ip.investor_id FROM investor_positions ip
      WHERE ip.fund_id = '7574bc81-aab3-4175-9e7f-803aa6f9eb8f'::uuid AND ip.is_active = true
    );

  v_balance_sum := v_opening + v_flows;
  v_recorded_aum := v_balance_sum + v_gross_yield;

  RAISE NOTICE '2025-12 SOL: opening=%, flows=%, balance_sum=%, gross_yield=%, recorded_aum=%',
    v_opening, v_flows, v_balance_sum, v_gross_yield, v_recorded_aum;

  -- Call V5 apply
  v_result := apply_segmented_yield_distribution_v5(
    p_fund_id := '7574bc81-aab3-4175-9e7f-803aa6f9eb8f'::uuid,
    p_period_end := '2025-12-31'::date,
    p_recorded_aum := v_recorded_aum,
    p_admin_id := 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid,
    p_purpose := 'reporting'::aum_purpose
  );

  -- Check result
  IF (v_result->>'success')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION '2025-12 SOL FAILED: %', v_result->>'error';
  END IF;

  -- Re-activate any positions that went inactive from YIELD transactions
  UPDATE investor_positions SET is_active = true
  WHERE fund_id = '7574bc81-aab3-4175-9e7f-803aa6f9eb8f'::uuid AND is_active = false;

  RAISE NOTICE '2025-12 SOL SUCCESS: gross=%, net=%, fees=%, ib=%',
    v_result->'summary'->>'total_gross',
    v_result->'summary'->>'total_net',
    v_result->'summary'->>'total_fees',
    v_result->'summary'->>'total_ib';
END;
$$;

-- 2025-12 XRP: 2 segments, gross_yield = 862.4594585697
DO $$
DECLARE
  v_opening numeric;
  v_flows numeric;
  v_balance_sum numeric;
  v_recorded_aum numeric;
  v_result jsonb;
  v_gross_yield numeric := 862.4594585697;
  v_activated integer;
BEGIN
  -- Set auth context
  PERFORM set_config('request.jwt.claim.sub', 'a16a7e50-fefd-4bfe-897c-d16279b457c2', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"a16a7e50-fefd-4bfe-897c-d16279b457c2","role":"authenticated"}', true);
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Ensure all positions for this fund are active (V5 only processes active positions)
  UPDATE investor_positions SET is_active = true
  WHERE fund_id = '2c123c4f-76b4-4504-867e-059649855417'::uuid AND is_active = false;
  GET DIAGNOSTICS v_activated = ROW_COUNT;
  IF v_activated > 0 THEN
    RAISE NOTICE '2025-12 XRP: Activated % positions', v_activated;
  END IF;

  -- V5-matching balance_sum: per-investor opening through investor_positions
  SELECT COALESCE(SUM(inv_balance), 0) INTO v_opening
  FROM (
    SELECT COALESCE((
      SELECT SUM(t.amount) FROM transactions_v2 t
      WHERE t.investor_id = ip.investor_id
        AND t.fund_id = '2c123c4f-76b4-4504-867e-059649855417'::uuid
        AND t.tx_date < '2025-12-01'::date
        AND t.is_voided = false
    ), 0) as inv_balance
    FROM investor_positions ip
    WHERE ip.fund_id = '2c123c4f-76b4-4504-867e-059649855417'::uuid AND ip.is_active = true
  ) sub;

  -- V5-matching flows: DEP/WD/ADJ within period for active investors only
  SELECT COALESCE(SUM(t.amount), 0) INTO v_flows
  FROM transactions_v2 t
  WHERE t.fund_id = '2c123c4f-76b4-4504-867e-059649855417'::uuid
    AND t.is_voided = false
    AND t.type IN ('DEPOSIT'::tx_type, 'WITHDRAWAL'::tx_type, 'ADJUSTMENT'::tx_type)
    AND t.tx_date >= '2025-12-01'::date
    AND t.tx_date <= '2025-12-31'::date
    AND t.investor_id IN (
      SELECT ip.investor_id FROM investor_positions ip
      WHERE ip.fund_id = '2c123c4f-76b4-4504-867e-059649855417'::uuid AND ip.is_active = true
    );

  v_balance_sum := v_opening + v_flows;
  v_recorded_aum := v_balance_sum + v_gross_yield;

  RAISE NOTICE '2025-12 XRP: opening=%, flows=%, balance_sum=%, gross_yield=%, recorded_aum=%',
    v_opening, v_flows, v_balance_sum, v_gross_yield, v_recorded_aum;

  -- Call V5 apply
  v_result := apply_segmented_yield_distribution_v5(
    p_fund_id := '2c123c4f-76b4-4504-867e-059649855417'::uuid,
    p_period_end := '2025-12-31'::date,
    p_recorded_aum := v_recorded_aum,
    p_admin_id := 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid,
    p_purpose := 'reporting'::aum_purpose
  );

  -- Check result
  IF (v_result->>'success')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION '2025-12 XRP FAILED: %', v_result->>'error';
  END IF;

  -- Re-activate any positions that went inactive from YIELD transactions
  UPDATE investor_positions SET is_active = true
  WHERE fund_id = '2c123c4f-76b4-4504-867e-059649855417'::uuid AND is_active = false;

  RAISE NOTICE '2025-12 XRP SUCCESS: gross=%, net=%, fees=%, ib=%',
    v_result->'summary'->>'total_gross',
    v_result->'summary'->>'total_net',
    v_result->'summary'->>'total_fees',
    v_result->'summary'->>'total_ib';
END;
$$;

-- 2026-01 BTC: 4 segments, gross_yield = 0.0838302022
DO $$
DECLARE
  v_opening numeric;
  v_flows numeric;
  v_balance_sum numeric;
  v_recorded_aum numeric;
  v_result jsonb;
  v_gross_yield numeric := 0.0838302022;
  v_activated integer;
BEGIN
  -- Set auth context
  PERFORM set_config('request.jwt.claim.sub', 'a16a7e50-fefd-4bfe-897c-d16279b457c2', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"a16a7e50-fefd-4bfe-897c-d16279b457c2","role":"authenticated"}', true);
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Ensure all positions for this fund are active (V5 only processes active positions)
  UPDATE investor_positions SET is_active = true
  WHERE fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid AND is_active = false;
  GET DIAGNOSTICS v_activated = ROW_COUNT;
  IF v_activated > 0 THEN
    RAISE NOTICE '2026-01 BTC: Activated % positions', v_activated;
  END IF;

  -- V5-matching balance_sum: per-investor opening through investor_positions
  SELECT COALESCE(SUM(inv_balance), 0) INTO v_opening
  FROM (
    SELECT COALESCE((
      SELECT SUM(t.amount) FROM transactions_v2 t
      WHERE t.investor_id = ip.investor_id
        AND t.fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid
        AND t.tx_date < '2026-01-01'::date
        AND t.is_voided = false
    ), 0) as inv_balance
    FROM investor_positions ip
    WHERE ip.fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid AND ip.is_active = true
  ) sub;

  -- V5-matching flows: DEP/WD/ADJ within period for active investors only
  SELECT COALESCE(SUM(t.amount), 0) INTO v_flows
  FROM transactions_v2 t
  WHERE t.fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid
    AND t.is_voided = false
    AND t.type IN ('DEPOSIT'::tx_type, 'WITHDRAWAL'::tx_type, 'ADJUSTMENT'::tx_type)
    AND t.tx_date >= '2026-01-01'::date
    AND t.tx_date <= '2026-01-31'::date
    AND t.investor_id IN (
      SELECT ip.investor_id FROM investor_positions ip
      WHERE ip.fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid AND ip.is_active = true
    );

  v_balance_sum := v_opening + v_flows;
  v_recorded_aum := v_balance_sum + v_gross_yield;

  RAISE NOTICE '2026-01 BTC: opening=%, flows=%, balance_sum=%, gross_yield=%, recorded_aum=%',
    v_opening, v_flows, v_balance_sum, v_gross_yield, v_recorded_aum;

  -- Call V5 apply
  v_result := apply_segmented_yield_distribution_v5(
    p_fund_id := '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    p_period_end := '2026-01-31'::date,
    p_recorded_aum := v_recorded_aum,
    p_admin_id := 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid,
    p_purpose := 'reporting'::aum_purpose
  );

  -- Check result
  IF (v_result->>'success')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION '2026-01 BTC FAILED: %', v_result->>'error';
  END IF;

  -- Re-activate any positions that went inactive from YIELD transactions
  UPDATE investor_positions SET is_active = true
  WHERE fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid AND is_active = false;

  RAISE NOTICE '2026-01 BTC SUCCESS: gross=%, net=%, fees=%, ib=%',
    v_result->'summary'->>'total_gross',
    v_result->'summary'->>'total_net',
    v_result->'summary'->>'total_fees',
    v_result->'summary'->>'total_ib';
END;
$$;

-- 2026-01 ETH: 3 segments, gross_yield = 3.7655574055
DO $$
DECLARE
  v_opening numeric;
  v_flows numeric;
  v_balance_sum numeric;
  v_recorded_aum numeric;
  v_result jsonb;
  v_gross_yield numeric := 3.7655574055;
  v_activated integer;
BEGIN
  -- Set auth context
  PERFORM set_config('request.jwt.claim.sub', 'a16a7e50-fefd-4bfe-897c-d16279b457c2', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"a16a7e50-fefd-4bfe-897c-d16279b457c2","role":"authenticated"}', true);
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Ensure all positions for this fund are active (V5 only processes active positions)
  UPDATE investor_positions SET is_active = true
  WHERE fund_id = '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid AND is_active = false;
  GET DIAGNOSTICS v_activated = ROW_COUNT;
  IF v_activated > 0 THEN
    RAISE NOTICE '2026-01 ETH: Activated % positions', v_activated;
  END IF;

  -- V5-matching balance_sum: per-investor opening through investor_positions
  SELECT COALESCE(SUM(inv_balance), 0) INTO v_opening
  FROM (
    SELECT COALESCE((
      SELECT SUM(t.amount) FROM transactions_v2 t
      WHERE t.investor_id = ip.investor_id
        AND t.fund_id = '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid
        AND t.tx_date < '2026-01-01'::date
        AND t.is_voided = false
    ), 0) as inv_balance
    FROM investor_positions ip
    WHERE ip.fund_id = '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid AND ip.is_active = true
  ) sub;

  -- V5-matching flows: DEP/WD/ADJ within period for active investors only
  SELECT COALESCE(SUM(t.amount), 0) INTO v_flows
  FROM transactions_v2 t
  WHERE t.fund_id = '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid
    AND t.is_voided = false
    AND t.type IN ('DEPOSIT'::tx_type, 'WITHDRAWAL'::tx_type, 'ADJUSTMENT'::tx_type)
    AND t.tx_date >= '2026-01-01'::date
    AND t.tx_date <= '2026-01-31'::date
    AND t.investor_id IN (
      SELECT ip.investor_id FROM investor_positions ip
      WHERE ip.fund_id = '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid AND ip.is_active = true
    );

  v_balance_sum := v_opening + v_flows;
  v_recorded_aum := v_balance_sum + v_gross_yield;

  RAISE NOTICE '2026-01 ETH: opening=%, flows=%, balance_sum=%, gross_yield=%, recorded_aum=%',
    v_opening, v_flows, v_balance_sum, v_gross_yield, v_recorded_aum;

  -- Call V5 apply
  v_result := apply_segmented_yield_distribution_v5(
    p_fund_id := '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid,
    p_period_end := '2026-01-31'::date,
    p_recorded_aum := v_recorded_aum,
    p_admin_id := 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid,
    p_purpose := 'reporting'::aum_purpose
  );

  -- Check result
  IF (v_result->>'success')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION '2026-01 ETH FAILED: %', v_result->>'error';
  END IF;

  -- Re-activate any positions that went inactive from YIELD transactions
  UPDATE investor_positions SET is_active = true
  WHERE fund_id = '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid AND is_active = false;

  RAISE NOTICE '2026-01 ETH SUCCESS: gross=%, net=%, fees=%, ib=%',
    v_result->'summary'->>'total_gross',
    v_result->'summary'->>'total_net',
    v_result->'summary'->>'total_fees',
    v_result->'summary'->>'total_ib';
END;
$$;

-- 2026-01 USDT: 5 segments, gross_yield = 42373.5562136321
DO $$
DECLARE
  v_opening numeric;
  v_flows numeric;
  v_balance_sum numeric;
  v_recorded_aum numeric;
  v_result jsonb;
  v_gross_yield numeric := 42373.5562136321;
  v_activated integer;
BEGIN
  -- Set auth context
  PERFORM set_config('request.jwt.claim.sub', 'a16a7e50-fefd-4bfe-897c-d16279b457c2', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"a16a7e50-fefd-4bfe-897c-d16279b457c2","role":"authenticated"}', true);
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Ensure all positions for this fund are active (V5 only processes active positions)
  UPDATE investor_positions SET is_active = true
  WHERE fund_id = '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid AND is_active = false;
  GET DIAGNOSTICS v_activated = ROW_COUNT;
  IF v_activated > 0 THEN
    RAISE NOTICE '2026-01 USDT: Activated % positions', v_activated;
  END IF;

  -- V5-matching balance_sum: per-investor opening through investor_positions
  SELECT COALESCE(SUM(inv_balance), 0) INTO v_opening
  FROM (
    SELECT COALESCE((
      SELECT SUM(t.amount) FROM transactions_v2 t
      WHERE t.investor_id = ip.investor_id
        AND t.fund_id = '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid
        AND t.tx_date < '2026-01-01'::date
        AND t.is_voided = false
    ), 0) as inv_balance
    FROM investor_positions ip
    WHERE ip.fund_id = '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid AND ip.is_active = true
  ) sub;

  -- V5-matching flows: DEP/WD/ADJ within period for active investors only
  SELECT COALESCE(SUM(t.amount), 0) INTO v_flows
  FROM transactions_v2 t
  WHERE t.fund_id = '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid
    AND t.is_voided = false
    AND t.type IN ('DEPOSIT'::tx_type, 'WITHDRAWAL'::tx_type, 'ADJUSTMENT'::tx_type)
    AND t.tx_date >= '2026-01-01'::date
    AND t.tx_date <= '2026-01-31'::date
    AND t.investor_id IN (
      SELECT ip.investor_id FROM investor_positions ip
      WHERE ip.fund_id = '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid AND ip.is_active = true
    );

  v_balance_sum := v_opening + v_flows;
  v_recorded_aum := v_balance_sum + v_gross_yield;

  RAISE NOTICE '2026-01 USDT: opening=%, flows=%, balance_sum=%, gross_yield=%, recorded_aum=%',
    v_opening, v_flows, v_balance_sum, v_gross_yield, v_recorded_aum;

  -- Call V5 apply
  v_result := apply_segmented_yield_distribution_v5(
    p_fund_id := '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    p_period_end := '2026-01-31'::date,
    p_recorded_aum := v_recorded_aum,
    p_admin_id := 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid,
    p_purpose := 'reporting'::aum_purpose
  );

  -- Check result
  IF (v_result->>'success')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION '2026-01 USDT FAILED: %', v_result->>'error';
  END IF;

  -- Re-activate any positions that went inactive from YIELD transactions
  UPDATE investor_positions SET is_active = true
  WHERE fund_id = '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid AND is_active = false;

  RAISE NOTICE '2026-01 USDT SUCCESS: gross=%, net=%, fees=%, ib=%',
    v_result->'summary'->>'total_gross',
    v_result->'summary'->>'total_net',
    v_result->'summary'->>'total_fees',
    v_result->'summary'->>'total_ib';
END;
$$;

-- 2026-01 SOL: 1 segments, gross_yield = 27.1473620357
DO $$
DECLARE
  v_opening numeric;
  v_flows numeric;
  v_balance_sum numeric;
  v_recorded_aum numeric;
  v_result jsonb;
  v_gross_yield numeric := 27.1473620357;
  v_activated integer;
BEGIN
  -- Set auth context
  PERFORM set_config('request.jwt.claim.sub', 'a16a7e50-fefd-4bfe-897c-d16279b457c2', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"a16a7e50-fefd-4bfe-897c-d16279b457c2","role":"authenticated"}', true);
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Ensure all positions for this fund are active (V5 only processes active positions)
  UPDATE investor_positions SET is_active = true
  WHERE fund_id = '7574bc81-aab3-4175-9e7f-803aa6f9eb8f'::uuid AND is_active = false;
  GET DIAGNOSTICS v_activated = ROW_COUNT;
  IF v_activated > 0 THEN
    RAISE NOTICE '2026-01 SOL: Activated % positions', v_activated;
  END IF;

  -- V5-matching balance_sum: per-investor opening through investor_positions
  SELECT COALESCE(SUM(inv_balance), 0) INTO v_opening
  FROM (
    SELECT COALESCE((
      SELECT SUM(t.amount) FROM transactions_v2 t
      WHERE t.investor_id = ip.investor_id
        AND t.fund_id = '7574bc81-aab3-4175-9e7f-803aa6f9eb8f'::uuid
        AND t.tx_date < '2026-01-01'::date
        AND t.is_voided = false
    ), 0) as inv_balance
    FROM investor_positions ip
    WHERE ip.fund_id = '7574bc81-aab3-4175-9e7f-803aa6f9eb8f'::uuid AND ip.is_active = true
  ) sub;

  -- V5-matching flows: DEP/WD/ADJ within period for active investors only
  SELECT COALESCE(SUM(t.amount), 0) INTO v_flows
  FROM transactions_v2 t
  WHERE t.fund_id = '7574bc81-aab3-4175-9e7f-803aa6f9eb8f'::uuid
    AND t.is_voided = false
    AND t.type IN ('DEPOSIT'::tx_type, 'WITHDRAWAL'::tx_type, 'ADJUSTMENT'::tx_type)
    AND t.tx_date >= '2026-01-01'::date
    AND t.tx_date <= '2026-01-31'::date
    AND t.investor_id IN (
      SELECT ip.investor_id FROM investor_positions ip
      WHERE ip.fund_id = '7574bc81-aab3-4175-9e7f-803aa6f9eb8f'::uuid AND ip.is_active = true
    );

  v_balance_sum := v_opening + v_flows;
  v_recorded_aum := v_balance_sum + v_gross_yield;

  RAISE NOTICE '2026-01 SOL: opening=%, flows=%, balance_sum=%, gross_yield=%, recorded_aum=%',
    v_opening, v_flows, v_balance_sum, v_gross_yield, v_recorded_aum;

  -- Call V5 apply
  v_result := apply_segmented_yield_distribution_v5(
    p_fund_id := '7574bc81-aab3-4175-9e7f-803aa6f9eb8f'::uuid,
    p_period_end := '2026-01-31'::date,
    p_recorded_aum := v_recorded_aum,
    p_admin_id := 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid,
    p_purpose := 'reporting'::aum_purpose
  );

  -- Check result
  IF (v_result->>'success')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION '2026-01 SOL FAILED: %', v_result->>'error';
  END IF;

  -- Re-activate any positions that went inactive from YIELD transactions
  UPDATE investor_positions SET is_active = true
  WHERE fund_id = '7574bc81-aab3-4175-9e7f-803aa6f9eb8f'::uuid AND is_active = false;

  RAISE NOTICE '2026-01 SOL SUCCESS: gross=%, net=%, fees=%, ib=%',
    v_result->'summary'->>'total_gross',
    v_result->'summary'->>'total_net',
    v_result->'summary'->>'total_fees',
    v_result->'summary'->>'total_ib';
END;
$$;

-- 2026-01 XRP: 1 segments, gross_yield = 1161.0587384406
DO $$
DECLARE
  v_opening numeric;
  v_flows numeric;
  v_balance_sum numeric;
  v_recorded_aum numeric;
  v_result jsonb;
  v_gross_yield numeric := 1161.0587384406;
  v_activated integer;
BEGIN
  -- Set auth context
  PERFORM set_config('request.jwt.claim.sub', 'a16a7e50-fefd-4bfe-897c-d16279b457c2', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"a16a7e50-fefd-4bfe-897c-d16279b457c2","role":"authenticated"}', true);
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Ensure all positions for this fund are active (V5 only processes active positions)
  UPDATE investor_positions SET is_active = true
  WHERE fund_id = '2c123c4f-76b4-4504-867e-059649855417'::uuid AND is_active = false;
  GET DIAGNOSTICS v_activated = ROW_COUNT;
  IF v_activated > 0 THEN
    RAISE NOTICE '2026-01 XRP: Activated % positions', v_activated;
  END IF;

  -- V5-matching balance_sum: per-investor opening through investor_positions
  SELECT COALESCE(SUM(inv_balance), 0) INTO v_opening
  FROM (
    SELECT COALESCE((
      SELECT SUM(t.amount) FROM transactions_v2 t
      WHERE t.investor_id = ip.investor_id
        AND t.fund_id = '2c123c4f-76b4-4504-867e-059649855417'::uuid
        AND t.tx_date < '2026-01-01'::date
        AND t.is_voided = false
    ), 0) as inv_balance
    FROM investor_positions ip
    WHERE ip.fund_id = '2c123c4f-76b4-4504-867e-059649855417'::uuid AND ip.is_active = true
  ) sub;

  -- V5-matching flows: DEP/WD/ADJ within period for active investors only
  SELECT COALESCE(SUM(t.amount), 0) INTO v_flows
  FROM transactions_v2 t
  WHERE t.fund_id = '2c123c4f-76b4-4504-867e-059649855417'::uuid
    AND t.is_voided = false
    AND t.type IN ('DEPOSIT'::tx_type, 'WITHDRAWAL'::tx_type, 'ADJUSTMENT'::tx_type)
    AND t.tx_date >= '2026-01-01'::date
    AND t.tx_date <= '2026-01-31'::date
    AND t.investor_id IN (
      SELECT ip.investor_id FROM investor_positions ip
      WHERE ip.fund_id = '2c123c4f-76b4-4504-867e-059649855417'::uuid AND ip.is_active = true
    );

  v_balance_sum := v_opening + v_flows;
  v_recorded_aum := v_balance_sum + v_gross_yield;

  RAISE NOTICE '2026-01 XRP: opening=%, flows=%, balance_sum=%, gross_yield=%, recorded_aum=%',
    v_opening, v_flows, v_balance_sum, v_gross_yield, v_recorded_aum;

  -- Call V5 apply
  v_result := apply_segmented_yield_distribution_v5(
    p_fund_id := '2c123c4f-76b4-4504-867e-059649855417'::uuid,
    p_period_end := '2026-01-31'::date,
    p_recorded_aum := v_recorded_aum,
    p_admin_id := 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid,
    p_purpose := 'reporting'::aum_purpose
  );

  -- Check result
  IF (v_result->>'success')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION '2026-01 XRP FAILED: %', v_result->>'error';
  END IF;

  -- Re-activate any positions that went inactive from YIELD transactions
  UPDATE investor_positions SET is_active = true
  WHERE fund_id = '2c123c4f-76b4-4504-867e-059649855417'::uuid AND is_active = false;

  RAISE NOTICE '2026-01 XRP SUCCESS: gross=%, net=%, fees=%, ib=%',
    v_result->'summary'->>'total_gross',
    v_result->'summary'->>'total_net',
    v_result->'summary'->>'total_fees',
    v_result->'summary'->>'total_ib';
END;
$$;

-- 2026-02 BTC: 3 segments, gross_yield = 0.0740334801
DO $$
DECLARE
  v_opening numeric;
  v_flows numeric;
  v_balance_sum numeric;
  v_recorded_aum numeric;
  v_result jsonb;
  v_gross_yield numeric := 0.0740334801;
  v_activated integer;
BEGIN
  -- Set auth context
  PERFORM set_config('request.jwt.claim.sub', 'a16a7e50-fefd-4bfe-897c-d16279b457c2', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"a16a7e50-fefd-4bfe-897c-d16279b457c2","role":"authenticated"}', true);
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Ensure all positions for this fund are active (V5 only processes active positions)
  UPDATE investor_positions SET is_active = true
  WHERE fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid AND is_active = false;
  GET DIAGNOSTICS v_activated = ROW_COUNT;
  IF v_activated > 0 THEN
    RAISE NOTICE '2026-02 BTC: Activated % positions', v_activated;
  END IF;

  -- V5-matching balance_sum: per-investor opening through investor_positions
  SELECT COALESCE(SUM(inv_balance), 0) INTO v_opening
  FROM (
    SELECT COALESCE((
      SELECT SUM(t.amount) FROM transactions_v2 t
      WHERE t.investor_id = ip.investor_id
        AND t.fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid
        AND t.tx_date < '2026-02-01'::date
        AND t.is_voided = false
    ), 0) as inv_balance
    FROM investor_positions ip
    WHERE ip.fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid AND ip.is_active = true
  ) sub;

  -- V5-matching flows: DEP/WD/ADJ within period for active investors only
  SELECT COALESCE(SUM(t.amount), 0) INTO v_flows
  FROM transactions_v2 t
  WHERE t.fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid
    AND t.is_voided = false
    AND t.type IN ('DEPOSIT'::tx_type, 'WITHDRAWAL'::tx_type, 'ADJUSTMENT'::tx_type)
    AND t.tx_date >= '2026-02-01'::date
    AND t.tx_date <= '2026-02-28'::date
    AND t.investor_id IN (
      SELECT ip.investor_id FROM investor_positions ip
      WHERE ip.fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid AND ip.is_active = true
    );

  v_balance_sum := v_opening + v_flows;
  v_recorded_aum := v_balance_sum + v_gross_yield;

  RAISE NOTICE '2026-02 BTC: opening=%, flows=%, balance_sum=%, gross_yield=%, recorded_aum=%',
    v_opening, v_flows, v_balance_sum, v_gross_yield, v_recorded_aum;

  -- Call V5 apply
  v_result := apply_segmented_yield_distribution_v5(
    p_fund_id := '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    p_period_end := '2026-02-28'::date,
    p_recorded_aum := v_recorded_aum,
    p_admin_id := 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid,
    p_purpose := 'reporting'::aum_purpose
  );

  -- Check result
  IF (v_result->>'success')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION '2026-02 BTC FAILED: %', v_result->>'error';
  END IF;

  -- Re-activate any positions that went inactive from YIELD transactions
  UPDATE investor_positions SET is_active = true
  WHERE fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid AND is_active = false;

  RAISE NOTICE '2026-02 BTC SUCCESS: gross=%, net=%, fees=%, ib=%',
    v_result->'summary'->>'total_gross',
    v_result->'summary'->>'total_net',
    v_result->'summary'->>'total_fees',
    v_result->'summary'->>'total_ib';
END;
$$;

-- 2026-02 ETH: 2 segments, gross_yield = 3.1286360180
DO $$
DECLARE
  v_opening numeric;
  v_flows numeric;
  v_balance_sum numeric;
  v_recorded_aum numeric;
  v_result jsonb;
  v_gross_yield numeric := 3.1286360180;
  v_activated integer;
BEGIN
  -- Set auth context
  PERFORM set_config('request.jwt.claim.sub', 'a16a7e50-fefd-4bfe-897c-d16279b457c2', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"a16a7e50-fefd-4bfe-897c-d16279b457c2","role":"authenticated"}', true);
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Ensure all positions for this fund are active (V5 only processes active positions)
  UPDATE investor_positions SET is_active = true
  WHERE fund_id = '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid AND is_active = false;
  GET DIAGNOSTICS v_activated = ROW_COUNT;
  IF v_activated > 0 THEN
    RAISE NOTICE '2026-02 ETH: Activated % positions', v_activated;
  END IF;

  -- V5-matching balance_sum: per-investor opening through investor_positions
  SELECT COALESCE(SUM(inv_balance), 0) INTO v_opening
  FROM (
    SELECT COALESCE((
      SELECT SUM(t.amount) FROM transactions_v2 t
      WHERE t.investor_id = ip.investor_id
        AND t.fund_id = '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid
        AND t.tx_date < '2026-02-01'::date
        AND t.is_voided = false
    ), 0) as inv_balance
    FROM investor_positions ip
    WHERE ip.fund_id = '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid AND ip.is_active = true
  ) sub;

  -- V5-matching flows: DEP/WD/ADJ within period for active investors only
  SELECT COALESCE(SUM(t.amount), 0) INTO v_flows
  FROM transactions_v2 t
  WHERE t.fund_id = '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid
    AND t.is_voided = false
    AND t.type IN ('DEPOSIT'::tx_type, 'WITHDRAWAL'::tx_type, 'ADJUSTMENT'::tx_type)
    AND t.tx_date >= '2026-02-01'::date
    AND t.tx_date <= '2026-02-28'::date
    AND t.investor_id IN (
      SELECT ip.investor_id FROM investor_positions ip
      WHERE ip.fund_id = '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid AND ip.is_active = true
    );

  v_balance_sum := v_opening + v_flows;
  v_recorded_aum := v_balance_sum + v_gross_yield;

  RAISE NOTICE '2026-02 ETH: opening=%, flows=%, balance_sum=%, gross_yield=%, recorded_aum=%',
    v_opening, v_flows, v_balance_sum, v_gross_yield, v_recorded_aum;

  -- Call V5 apply
  v_result := apply_segmented_yield_distribution_v5(
    p_fund_id := '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid,
    p_period_end := '2026-02-28'::date,
    p_recorded_aum := v_recorded_aum,
    p_admin_id := 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid,
    p_purpose := 'reporting'::aum_purpose
  );

  -- Check result
  IF (v_result->>'success')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION '2026-02 ETH FAILED: %', v_result->>'error';
  END IF;

  -- Re-activate any positions that went inactive from YIELD transactions
  UPDATE investor_positions SET is_active = true
  WHERE fund_id = '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid AND is_active = false;

  RAISE NOTICE '2026-02 ETH SUCCESS: gross=%, net=%, fees=%, ib=%',
    v_result->'summary'->>'total_gross',
    v_result->'summary'->>'total_net',
    v_result->'summary'->>'total_fees',
    v_result->'summary'->>'total_ib';
END;
$$;

-- 2026-02 USDT: 4 segments, gross_yield = 36050.1391389879
DO $$
DECLARE
  v_opening numeric;
  v_flows numeric;
  v_balance_sum numeric;
  v_recorded_aum numeric;
  v_result jsonb;
  v_gross_yield numeric := 36050.1391389879;
  v_activated integer;
BEGIN
  -- Set auth context
  PERFORM set_config('request.jwt.claim.sub', 'a16a7e50-fefd-4bfe-897c-d16279b457c2', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"a16a7e50-fefd-4bfe-897c-d16279b457c2","role":"authenticated"}', true);
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Ensure all positions for this fund are active (V5 only processes active positions)
  UPDATE investor_positions SET is_active = true
  WHERE fund_id = '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid AND is_active = false;
  GET DIAGNOSTICS v_activated = ROW_COUNT;
  IF v_activated > 0 THEN
    RAISE NOTICE '2026-02 USDT: Activated % positions', v_activated;
  END IF;

  -- V5-matching balance_sum: per-investor opening through investor_positions
  SELECT COALESCE(SUM(inv_balance), 0) INTO v_opening
  FROM (
    SELECT COALESCE((
      SELECT SUM(t.amount) FROM transactions_v2 t
      WHERE t.investor_id = ip.investor_id
        AND t.fund_id = '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid
        AND t.tx_date < '2026-02-01'::date
        AND t.is_voided = false
    ), 0) as inv_balance
    FROM investor_positions ip
    WHERE ip.fund_id = '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid AND ip.is_active = true
  ) sub;

  -- V5-matching flows: DEP/WD/ADJ within period for active investors only
  SELECT COALESCE(SUM(t.amount), 0) INTO v_flows
  FROM transactions_v2 t
  WHERE t.fund_id = '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid
    AND t.is_voided = false
    AND t.type IN ('DEPOSIT'::tx_type, 'WITHDRAWAL'::tx_type, 'ADJUSTMENT'::tx_type)
    AND t.tx_date >= '2026-02-01'::date
    AND t.tx_date <= '2026-02-28'::date
    AND t.investor_id IN (
      SELECT ip.investor_id FROM investor_positions ip
      WHERE ip.fund_id = '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid AND ip.is_active = true
    );

  v_balance_sum := v_opening + v_flows;
  v_recorded_aum := v_balance_sum + v_gross_yield;

  RAISE NOTICE '2026-02 USDT: opening=%, flows=%, balance_sum=%, gross_yield=%, recorded_aum=%',
    v_opening, v_flows, v_balance_sum, v_gross_yield, v_recorded_aum;

  -- Call V5 apply
  v_result := apply_segmented_yield_distribution_v5(
    p_fund_id := '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    p_period_end := '2026-02-28'::date,
    p_recorded_aum := v_recorded_aum,
    p_admin_id := 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid,
    p_purpose := 'reporting'::aum_purpose
  );

  -- Check result
  IF (v_result->>'success')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION '2026-02 USDT FAILED: %', v_result->>'error';
  END IF;

  -- Re-activate any positions that went inactive from YIELD transactions
  UPDATE investor_positions SET is_active = true
  WHERE fund_id = '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid AND is_active = false;

  RAISE NOTICE '2026-02 USDT SUCCESS: gross=%, net=%, fees=%, ib=%',
    v_result->'summary'->>'total_gross',
    v_result->'summary'->>'total_net',
    v_result->'summary'->>'total_fees',
    v_result->'summary'->>'total_ib';
END;
$$;

-- 2026-02 SOL: 1 segments, gross_yield = 1.1631135347
DO $$
DECLARE
  v_opening numeric;
  v_flows numeric;
  v_balance_sum numeric;
  v_recorded_aum numeric;
  v_result jsonb;
  v_gross_yield numeric := 1.1631135347;
  v_activated integer;
BEGIN
  -- Set auth context
  PERFORM set_config('request.jwt.claim.sub', 'a16a7e50-fefd-4bfe-897c-d16279b457c2', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"a16a7e50-fefd-4bfe-897c-d16279b457c2","role":"authenticated"}', true);
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Ensure all positions for this fund are active (V5 only processes active positions)
  UPDATE investor_positions SET is_active = true
  WHERE fund_id = '7574bc81-aab3-4175-9e7f-803aa6f9eb8f'::uuid AND is_active = false;
  GET DIAGNOSTICS v_activated = ROW_COUNT;
  IF v_activated > 0 THEN
    RAISE NOTICE '2026-02 SOL: Activated % positions', v_activated;
  END IF;

  -- V5-matching balance_sum: per-investor opening through investor_positions
  SELECT COALESCE(SUM(inv_balance), 0) INTO v_opening
  FROM (
    SELECT COALESCE((
      SELECT SUM(t.amount) FROM transactions_v2 t
      WHERE t.investor_id = ip.investor_id
        AND t.fund_id = '7574bc81-aab3-4175-9e7f-803aa6f9eb8f'::uuid
        AND t.tx_date < '2026-02-01'::date
        AND t.is_voided = false
    ), 0) as inv_balance
    FROM investor_positions ip
    WHERE ip.fund_id = '7574bc81-aab3-4175-9e7f-803aa6f9eb8f'::uuid AND ip.is_active = true
  ) sub;

  -- V5-matching flows: DEP/WD/ADJ within period for active investors only
  SELECT COALESCE(SUM(t.amount), 0) INTO v_flows
  FROM transactions_v2 t
  WHERE t.fund_id = '7574bc81-aab3-4175-9e7f-803aa6f9eb8f'::uuid
    AND t.is_voided = false
    AND t.type IN ('DEPOSIT'::tx_type, 'WITHDRAWAL'::tx_type, 'ADJUSTMENT'::tx_type)
    AND t.tx_date >= '2026-02-01'::date
    AND t.tx_date <= '2026-02-28'::date
    AND t.investor_id IN (
      SELECT ip.investor_id FROM investor_positions ip
      WHERE ip.fund_id = '7574bc81-aab3-4175-9e7f-803aa6f9eb8f'::uuid AND ip.is_active = true
    );

  v_balance_sum := v_opening + v_flows;
  v_recorded_aum := v_balance_sum + v_gross_yield;

  RAISE NOTICE '2026-02 SOL: opening=%, flows=%, balance_sum=%, gross_yield=%, recorded_aum=%',
    v_opening, v_flows, v_balance_sum, v_gross_yield, v_recorded_aum;

  -- Call V5 apply
  v_result := apply_segmented_yield_distribution_v5(
    p_fund_id := '7574bc81-aab3-4175-9e7f-803aa6f9eb8f'::uuid,
    p_period_end := '2026-02-28'::date,
    p_recorded_aum := v_recorded_aum,
    p_admin_id := 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid,
    p_purpose := 'reporting'::aum_purpose
  );

  -- Check result
  IF (v_result->>'success')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION '2026-02 SOL FAILED: %', v_result->>'error';
  END IF;

  -- Re-activate any positions that went inactive from YIELD transactions
  UPDATE investor_positions SET is_active = true
  WHERE fund_id = '7574bc81-aab3-4175-9e7f-803aa6f9eb8f'::uuid AND is_active = false;

  RAISE NOTICE '2026-02 SOL SUCCESS: gross=%, net=%, fees=%, ib=%',
    v_result->'summary'->>'total_gross',
    v_result->'summary'->>'total_net',
    v_result->'summary'->>'total_fees',
    v_result->'summary'->>'total_ib';
END;
$$;

-- 2026-02 XRP: 1 segments, gross_yield = 3.0113636365
DO $$
DECLARE
  v_opening numeric;
  v_flows numeric;
  v_balance_sum numeric;
  v_recorded_aum numeric;
  v_result jsonb;
  v_gross_yield numeric := 3.0113636365;
  v_activated integer;
BEGIN
  -- Set auth context
  PERFORM set_config('request.jwt.claim.sub', 'a16a7e50-fefd-4bfe-897c-d16279b457c2', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"a16a7e50-fefd-4bfe-897c-d16279b457c2","role":"authenticated"}', true);
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Ensure all positions for this fund are active (V5 only processes active positions)
  UPDATE investor_positions SET is_active = true
  WHERE fund_id = '2c123c4f-76b4-4504-867e-059649855417'::uuid AND is_active = false;
  GET DIAGNOSTICS v_activated = ROW_COUNT;
  IF v_activated > 0 THEN
    RAISE NOTICE '2026-02 XRP: Activated % positions', v_activated;
  END IF;

  -- V5-matching balance_sum: per-investor opening through investor_positions
  SELECT COALESCE(SUM(inv_balance), 0) INTO v_opening
  FROM (
    SELECT COALESCE((
      SELECT SUM(t.amount) FROM transactions_v2 t
      WHERE t.investor_id = ip.investor_id
        AND t.fund_id = '2c123c4f-76b4-4504-867e-059649855417'::uuid
        AND t.tx_date < '2026-02-01'::date
        AND t.is_voided = false
    ), 0) as inv_balance
    FROM investor_positions ip
    WHERE ip.fund_id = '2c123c4f-76b4-4504-867e-059649855417'::uuid AND ip.is_active = true
  ) sub;

  -- V5-matching flows: DEP/WD/ADJ within period for active investors only
  SELECT COALESCE(SUM(t.amount), 0) INTO v_flows
  FROM transactions_v2 t
  WHERE t.fund_id = '2c123c4f-76b4-4504-867e-059649855417'::uuid
    AND t.is_voided = false
    AND t.type IN ('DEPOSIT'::tx_type, 'WITHDRAWAL'::tx_type, 'ADJUSTMENT'::tx_type)
    AND t.tx_date >= '2026-02-01'::date
    AND t.tx_date <= '2026-02-28'::date
    AND t.investor_id IN (
      SELECT ip.investor_id FROM investor_positions ip
      WHERE ip.fund_id = '2c123c4f-76b4-4504-867e-059649855417'::uuid AND ip.is_active = true
    );

  v_balance_sum := v_opening + v_flows;
  v_recorded_aum := v_balance_sum + v_gross_yield;

  RAISE NOTICE '2026-02 XRP: opening=%, flows=%, balance_sum=%, gross_yield=%, recorded_aum=%',
    v_opening, v_flows, v_balance_sum, v_gross_yield, v_recorded_aum;

  -- Call V5 apply
  v_result := apply_segmented_yield_distribution_v5(
    p_fund_id := '2c123c4f-76b4-4504-867e-059649855417'::uuid,
    p_period_end := '2026-02-28'::date,
    p_recorded_aum := v_recorded_aum,
    p_admin_id := 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid,
    p_purpose := 'reporting'::aum_purpose
  );

  -- Check result
  IF (v_result->>'success')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION '2026-02 XRP FAILED: %', v_result->>'error';
  END IF;

  -- Re-activate any positions that went inactive from YIELD transactions
  UPDATE investor_positions SET is_active = true
  WHERE fund_id = '2c123c4f-76b4-4504-867e-059649855417'::uuid AND is_active = false;

  RAISE NOTICE '2026-02 XRP SUCCESS: gross=%, net=%, fees=%, ib=%',
    v_result->'summary'->>'total_gross',
    v_result->'summary'->>'total_net',
    v_result->'summary'->>'total_fees',
    v_result->'summary'->>'total_ib';
END;
$$;

