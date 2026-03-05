-- Inception Seed Adjustments
-- Bridge the gap between SUM(pre-period transactions) and Excel baseAum
-- for each fund's first yield month. The gap represents "inception yield"
-- that accrued between deposit dates and the first yield distribution
-- but was never recorded as transactions.
--
-- Seed amounts:
--   BTC: 3.49 - 3.468 = 0.022 (Jul 2024 inception yield)
--   ETH: 202.23 - 202.01 = 0.22 (May 2025 inception yield)
--   USDT: 136175.4023 - 135726.75 = 448.6523 (Jun 2025 inception yield)
--   SOL: 1252 - 1250 = 2 (Sep 2025 inception yield)
--   XRP: no seed needed (gap = 0)

DO $$
DECLARE
  v_fund_id uuid;
  v_total_balance numeric;
  v_seed_gap numeric;
  v_investor record;
  v_share numeric;
  v_seed_amount numeric;
  v_ref text;
  v_allocated numeric;
  v_count int;
BEGIN
  -- Bypass canonical RPC guard and economic date enforcement
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  UPDATE system_config SET value = '"backfill"' WHERE key = 'system_mode';

  -- ============================================
  -- BTC: baseAum=3.49, first yield month=2024-08
  -- balance_cutoff: tx_date < 2024-08-01
  -- seed_date: 2024-07-31
  -- ============================================
  SELECT id INTO v_fund_id FROM funds WHERE asset = 'BTC' LIMIT 1;

  SELECT COALESCE(SUM(amount), 0) INTO v_total_balance
  FROM transactions_v2
  WHERE fund_id = v_fund_id AND is_voided = false AND tx_date < '2024-08-01';

  v_seed_gap := 3.49 - v_total_balance;
  v_allocated := 0;
  v_count := 0;

  IF v_seed_gap > 0.000000001 THEN
    FOR v_investor IN
      SELECT investor_id, SUM(amount) as balance
      FROM transactions_v2
      WHERE fund_id = v_fund_id AND is_voided = false AND tx_date < '2024-08-01'
      GROUP BY investor_id
      HAVING SUM(amount) > 0
      ORDER BY SUM(amount) DESC
    LOOP
      v_share := v_investor.balance / v_total_balance;
      v_seed_amount := ROUND(v_seed_gap * v_share, 10);
      v_allocated := v_allocated + v_seed_amount;
      v_count := v_count + 1;
      v_ref := 'inception-seed:BTC:' || v_investor.investor_id;

      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date,
        reference_id, source, asset, visibility_scope, purpose
      ) VALUES (
        v_investor.investor_id, v_fund_id, 'ADJUSTMENT', v_seed_amount, '2024-07-31',
        v_ref, 'system_bootstrap', 'BTC', 'admin_only', 'transaction'
      ) ON CONFLICT (reference_id) WHERE reference_id IS NOT NULL AND NOT is_voided DO NOTHING;
    END LOOP;

    RAISE NOTICE 'BTC: seed_gap=%, allocated=%, dust=%, investors=%',
      v_seed_gap, v_allocated, v_seed_gap - v_allocated, v_count;
  ELSE
    RAISE NOTICE 'BTC: no seed needed (gap=% <= 0)', v_seed_gap;
  END IF;

  -- ============================================
  -- ETH: baseAum=202.23, first yield month=2025-06
  -- balance_cutoff: tx_date < 2025-06-01
  -- seed_date: 2025-05-31
  -- ============================================
  SELECT id INTO v_fund_id FROM funds WHERE asset = 'ETH' LIMIT 1;

  SELECT COALESCE(SUM(amount), 0) INTO v_total_balance
  FROM transactions_v2
  WHERE fund_id = v_fund_id AND is_voided = false AND tx_date < '2025-06-01';

  v_seed_gap := 202.23 - v_total_balance;
  v_allocated := 0;
  v_count := 0;

  IF v_seed_gap > 0.000000001 THEN
    FOR v_investor IN
      SELECT investor_id, SUM(amount) as balance
      FROM transactions_v2
      WHERE fund_id = v_fund_id AND is_voided = false AND tx_date < '2025-06-01'
      GROUP BY investor_id
      HAVING SUM(amount) > 0
      ORDER BY SUM(amount) DESC
    LOOP
      v_share := v_investor.balance / v_total_balance;
      v_seed_amount := ROUND(v_seed_gap * v_share, 10);
      v_allocated := v_allocated + v_seed_amount;
      v_count := v_count + 1;
      v_ref := 'inception-seed:ETH:' || v_investor.investor_id;

      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date,
        reference_id, source, asset, visibility_scope, purpose
      ) VALUES (
        v_investor.investor_id, v_fund_id, 'ADJUSTMENT', v_seed_amount, '2025-05-31',
        v_ref, 'system_bootstrap', 'ETH', 'admin_only', 'transaction'
      ) ON CONFLICT (reference_id) WHERE reference_id IS NOT NULL AND NOT is_voided DO NOTHING;
    END LOOP;

    RAISE NOTICE 'ETH: seed_gap=%, allocated=%, dust=%, investors=%',
      v_seed_gap, v_allocated, v_seed_gap - v_allocated, v_count;
  ELSE
    RAISE NOTICE 'ETH: no seed needed (gap=% <= 0)', v_seed_gap;
  END IF;

  -- ============================================
  -- USDT: baseAum=136175.4023, first yield month=2025-07
  -- balance_cutoff: tx_date < 2025-07-01
  -- seed_date: 2025-06-30
  -- ============================================
  SELECT id INTO v_fund_id FROM funds WHERE asset = 'USDT' LIMIT 1;

  SELECT COALESCE(SUM(amount), 0) INTO v_total_balance
  FROM transactions_v2
  WHERE fund_id = v_fund_id AND is_voided = false AND tx_date < '2025-07-01';

  v_seed_gap := 136175.4023 - v_total_balance;
  v_allocated := 0;
  v_count := 0;

  IF v_seed_gap > 0.000000001 THEN
    FOR v_investor IN
      SELECT investor_id, SUM(amount) as balance
      FROM transactions_v2
      WHERE fund_id = v_fund_id AND is_voided = false AND tx_date < '2025-07-01'
      GROUP BY investor_id
      HAVING SUM(amount) > 0
      ORDER BY SUM(amount) DESC
    LOOP
      v_share := v_investor.balance / v_total_balance;
      v_seed_amount := ROUND(v_seed_gap * v_share, 10);
      v_allocated := v_allocated + v_seed_amount;
      v_count := v_count + 1;
      v_ref := 'inception-seed:USDT:' || v_investor.investor_id;

      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date,
        reference_id, source, asset, visibility_scope, purpose
      ) VALUES (
        v_investor.investor_id, v_fund_id, 'ADJUSTMENT', v_seed_amount, '2025-06-30',
        v_ref, 'system_bootstrap', 'USDT', 'admin_only', 'transaction'
      ) ON CONFLICT (reference_id) WHERE reference_id IS NOT NULL AND NOT is_voided DO NOTHING;
    END LOOP;

    RAISE NOTICE 'USDT: seed_gap=%, allocated=%, dust=%, investors=%',
      v_seed_gap, v_allocated, v_seed_gap - v_allocated, v_count;
  ELSE
    RAISE NOTICE 'USDT: no seed needed (gap=% <= 0)', v_seed_gap;
  END IF;

  -- ============================================
  -- SOL: baseAum=1252, first yield month=2025-09
  -- balance_cutoff: tx_date < 2025-09-02 (includes Sep 1 deposits)
  -- seed_date: 2025-08-31
  -- ============================================
  SELECT id INTO v_fund_id FROM funds WHERE asset = 'SOL' LIMIT 1;

  SELECT COALESCE(SUM(amount), 0) INTO v_total_balance
  FROM transactions_v2
  WHERE fund_id = v_fund_id AND is_voided = false AND tx_date < '2025-09-02';

  v_seed_gap := 1252 - v_total_balance;
  v_allocated := 0;
  v_count := 0;

  IF v_seed_gap > 0.000000001 THEN
    FOR v_investor IN
      SELECT investor_id, SUM(amount) as balance
      FROM transactions_v2
      WHERE fund_id = v_fund_id AND is_voided = false AND tx_date < '2025-09-02'
      GROUP BY investor_id
      HAVING SUM(amount) > 0
      ORDER BY SUM(amount) DESC
    LOOP
      v_share := v_investor.balance / v_total_balance;
      v_seed_amount := ROUND(v_seed_gap * v_share, 10);
      v_allocated := v_allocated + v_seed_amount;
      v_count := v_count + 1;
      v_ref := 'inception-seed:SOL:' || v_investor.investor_id;

      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date,
        reference_id, source, asset, visibility_scope, purpose
      ) VALUES (
        v_investor.investor_id, v_fund_id, 'ADJUSTMENT', v_seed_amount, '2025-08-31',
        v_ref, 'system_bootstrap', 'SOL', 'admin_only', 'transaction'
      ) ON CONFLICT (reference_id) WHERE reference_id IS NOT NULL AND NOT is_voided DO NOTHING;
    END LOOP;

    RAISE NOTICE 'SOL: seed_gap=%, allocated=%, dust=%, investors=%',
      v_seed_gap, v_allocated, v_seed_gap - v_allocated, v_count;
  ELSE
    RAISE NOTICE 'SOL: no seed needed (gap=% <= 0)', v_seed_gap;
  END IF;

  -- XRP: no seed needed (inception closingAum = first yield openingAum = 135003)
  RAISE NOTICE 'XRP: no seed needed (gap = 0)';

  -- Restore system mode
  UPDATE system_config SET value = '"live"' WHERE key = 'system_mode';
END $$;
