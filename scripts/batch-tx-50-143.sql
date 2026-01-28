-- Batch execute transactions 50-143
-- Generated from master-transactions.json

DO $$
DECLARE
  v_investor_id uuid;
  v_fund_id uuid;
  v_preflow_aum numeric;
  v_admin_id uuid := '5bdcf3ee-60ee-4edc-beae-26740c6ed4ab'; -- QA Admin
  r record;
BEGIN
  -- Transaction data: (investor_email, fund_code, amount, tx_date, tx_type)
  FOR r IN
    SELECT * FROM (VALUES
      -- Tx 50: Paul Johnson, 234.17 SOL, Sep 4, 2025
      ('paul.johnson@example.com', 'IND-SOL', 234.17, '2025-09-04'::date, 'DEPOSIT'),
      -- Tx 51: Paul Johnson, 10.44 ETH, Sep 4, 2025
      ('paul.johnson@example.com', 'IND-ETH', 10.44, '2025-09-04'::date, 'DEPOSIT'),
      -- Tx 52: Paul Johnson, 4.6327 ETH, Sep 10, 2025
      ('paul.johnson@example.com', 'IND-ETH', 4.6327, '2025-09-10'::date, 'DEPOSIT'),
      -- Tx 53: Paul Johnson, 8.96 ETH, Sep 12, 2025
      ('paul.johnson@example.com', 'IND-ETH', 8.96, '2025-09-12'::date, 'DEPOSIT'),
      -- Tx 54: Nathanael Cohen, 3.35 ETH, Sep 12, 2025
      ('nathanael@indigo.fund', 'IND-ETH', 3.35, '2025-09-12'::date, 'DEPOSIT'),
      -- Tx 55: Babak Eftekhari, 10000 USDT, Sep 24, 2025
      ('babak.eftekhari@example.com', 'IND-USDT', 10000, '2025-09-24'::date, 'DEPOSIT'),
      -- Tx 56: Tomer Zur, 63.1 ETH, Sep 27, 2025
      ('tomer.zur@example.com', 'IND-ETH', 63.1, '2025-09-27'::date, 'DEPOSIT'),
      -- Tx 57: Paul Johnson, 0.4395 BTC, Oct 3, 2025
      ('paul.johnson@example.com', 'IND-BTC', 0.4395, '2025-10-03'::date, 'DEPOSIT'),
      -- Tx 58: Paul Johnson, -236.02 SOL WITHDRAWAL, Oct 3, 2025
      ('paul.johnson@example.com', 'IND-SOL', -236.02, '2025-10-03'::date, 'WITHDRAWAL'),
      -- Tx 59: Paul Johnson, -12 ETH WITHDRAWAL, Oct 3, 2025
      ('paul.johnson@example.com', 'IND-ETH', -12, '2025-10-03'::date, 'WITHDRAWAL'),
      -- Tx 60: INDIGO Ventures, -100000 USDT WITHDRAWAL, Oct 6, 2025
      ('indigo.ventures@example.com', 'IND-USDT', -100000, '2025-10-06'::date, 'WITHDRAWAL'),
      -- Tx 61: Sacha Oshry, 100000 USDT, Oct 6, 2025
      ('sacha.oshry@example.com', 'IND-USDT', 100000, '2025-10-06'::date, 'DEPOSIT'),
      -- Tx 62: Tomer Zur, 10.051 ETH, Oct 8, 2025
      ('tomer.zur@example.com', 'IND-ETH', 10.051, '2025-10-08'::date, 'DEPOSIT'),
      -- Tx 63: Babak Eftekhari, 20000 USDT, Oct 9, 2025
      ('babak.eftekhari@example.com', 'IND-USDT', 20000, '2025-10-09'::date, 'DEPOSIT'),
      -- Tx 64: INDIGO Ventures, -27594.55 USDT WITHDRAWAL, Oct 13, 2025
      ('indigo.ventures@example.com', 'IND-USDT', -27594.55, '2025-10-13'::date, 'WITHDRAWAL'),
      -- Tx 65: Tomer Zur, 64.27 ETH, Oct 14, 2025
      ('tomer.zur@example.com', 'IND-ETH', 64.27, '2025-10-14'::date, 'DEPOSIT'),
      -- Tx 66: Babak Eftekhari, 3.75 ETH, Oct 14, 2025
      ('babak.eftekhari@example.com', 'IND-ETH', 3.75, '2025-10-14'::date, 'DEPOSIT'),
      -- Tx 67: HALLEY86, 99990 USDT, Oct 15, 2025
      ('halley86@example.com', 'IND-USDT', 99990, '2025-10-15'::date, 'DEPOSIT'),
      -- Tx 68: Babak Eftekhari, 3.1 ETH, Oct 17, 2025
      ('babak.eftekhari@example.com', 'IND-ETH', 3.1, '2025-10-17'::date, 'DEPOSIT'),
      -- Tx 69: Tomer Zur, 6.5417 ETH, Oct 20, 2025
      ('tomer.zur@example.com', 'IND-ETH', 6.5417, '2025-10-20'::date, 'DEPOSIT'),
      -- Tx 70: Jose Molla, 1.2 ETH, Oct 23, 2025
      ('jose.molla@example.com', 'IND-ETH', 1.2, '2025-10-23'::date, 'DEPOSIT'),
      -- Tx 71: Tomer Zur, 6.4 ETH, Oct 23, 2025
      ('tomer.zur@example.com', 'IND-ETH', 6.4, '2025-10-23'::date, 'DEPOSIT'),
      -- Tx 72: Jose Molla, 87.98 SOL, Oct 23, 2025
      ('jose.molla@example.com', 'IND-SOL', 87.98, '2025-10-23'::date, 'DEPOSIT'),
      -- Tx 73: Jose Molla, 0.062 BTC, Oct 23, 2025
      ('jose.molla@example.com', 'IND-BTC', 0.062, '2025-10-23'::date, 'DEPOSIT'),
      -- Tx 74: Jose Molla, 97695 USDT, Oct 23, 2025
      ('jose.molla@example.com', 'IND-USDT', 97695, '2025-10-23'::date, 'DEPOSIT'),
      -- Tx 75: Babak Eftekhari, 10450 USDT, Oct 23, 2025
      ('babak.eftekhari@example.com', 'IND-USDT', 10450, '2025-10-23'::date, 'DEPOSIT'),
      -- Tx 76: Indigo Fees, 0.03593745021234585 ETH, Nov 3, 2025
      ('indigo.lp@example.com', 'IND-ETH', 0.03593745021234585, '2025-11-03'::date, 'DEPOSIT'),
      -- Tx 77: Jose Molla, 2.5063577386065177 ETH, Nov 3, 2025
      ('jose.molla@example.com', 'IND-ETH', 2.5063577386065177, '2025-11-03'::date, 'DEPOSIT'),
      -- Tx 78: Nathanael Cohen, 1.067745459138733 ETH, Nov 3, 2025
      ('nathanael@indigo.fund', 'IND-ETH', 1.067745459138733, '2025-11-03'::date, 'DEPOSIT'),
      -- Tx 79: Blondish, 4.793959352042402 ETH, Nov 3, 2025
      ('blondish@example.com', 'IND-ETH', 4.793959352042402, '2025-11-03'::date, 'DEPOSIT'),
      -- Tx 80: INDIGO DIGITAL ASSET FUND LP, -113841.65 USDT WITHDRAWAL, Nov 3, 2025
      ('Hello@test.fund', 'IND-USDT', -113841.65, '2025-11-03'::date, 'WITHDRAWAL'),
      -- Tx 81: Tomer Zur, 6.9519 ETH, Nov 4, 2025
      ('tomer.zur@example.com', 'IND-ETH', 6.9519, '2025-11-04'::date, 'DEPOSIT'),
      -- Tx 82: Matthew Beatty, 35300 USDT, Nov 4, 2025
      ('matthew@example.com', 'IND-USDT', 35300, '2025-11-04'::date, 'DEPOSIT'),
      -- Tx 83: Tomer Zur, 7.6215 ETH, Nov 5, 2025
      ('tomer.zur@example.com', 'IND-ETH', 7.6215, '2025-11-05'::date, 'DEPOSIT'),
      -- Tx 84: Danielle Richetta, -0.283 BTC WITHDRAWAL, Nov 5, 2025
      ('danielle@example.com', 'IND-BTC', -0.283, '2025-11-05'::date, 'WITHDRAWAL'),
      -- Tx 85: Paul Johnson, -0.4408 BTC WITHDRAWAL, Nov 5, 2025
      ('paul.johnson@example.com', 'IND-BTC', -0.4408, '2025-11-05'::date, 'WITHDRAWAL'),
      -- Tx 86: Paul Johnson, -12.22 ETH WITHDRAWAL, Nov 5, 2025
      ('paul.johnson@example.com', 'IND-ETH', -12.22, '2025-11-05'::date, 'WITHDRAWAL'),
      -- Tx 87: Monica Levy Chicheportiche, 840168.03 USDT, Nov 7, 2025
      ('monica.levy.chicheportiche@example.com', 'IND-USDT', 840168.03, '2025-11-07'::date, 'DEPOSIT'),
      -- Tx 88: Tomer Zur, 10.224 ETH, Nov 7, 2025
      ('tomer.zur@example.com', 'IND-ETH', 10.224, '2025-11-07'::date, 'DEPOSIT'),
      -- Tx 89: Jose Molla, -50000 USDT WITHDRAWAL, Nov 8, 2025
      ('jose.molla@example.com', 'IND-USDT', -50000, '2025-11-08'::date, 'WITHDRAWAL'),
      -- Tx 90: Jose Molla, 0.4867 BTC, Nov 8, 2025
      ('jose.molla@example.com', 'IND-BTC', 0.4867, '2025-11-08'::date, 'DEPOSIT'),
      -- Tx 91: Nath & Thomas, 299915.77 USDT, Nov 13, 2025
      ('nath.thomas@example.com', 'IND-USDT', 299915.77, '2025-11-13'::date, 'DEPOSIT'),
      -- Tx 92: Sam Johnson, 3.3 BTC, Nov 17, 2025
      ('sam.johnson@example.com', 'IND-BTC', 3.3, '2025-11-17'::date, 'DEPOSIT'),
      -- Tx 93: Sam Johnson, 78 ETH, Nov 17, 2025
      ('sam.johnson@example.com', 'IND-ETH', 78, '2025-11-17'::date, 'DEPOSIT'),
      -- Tx 94: Sam Johnson, 1800.05 SOL, Nov 17, 2025
      ('sam.johnson@example.com', 'IND-SOL', 1800.05, '2025-11-17'::date, 'DEPOSIT'),
      -- Tx 95: Sam Johnson, 135003 XRP, Nov 17, 2025
      ('sam.johnson@example.com', 'IND-XRP', 135003, '2025-11-17'::date, 'DEPOSIT'),
      -- Tx 96: Tomer Zur, 6.234 ETH, Nov 17, 2025
      ('tomer.zur@example.com', 'IND-ETH', 6.234, '2025-11-17'::date, 'DEPOSIT'),
      -- Tx 97: Jose Molla, -47908 USDT WITHDRAWAL, Nov 21, 2025
      ('jose.molla@example.com', 'IND-USDT', -47908, '2025-11-21'::date, 'WITHDRAWAL'),
      -- Tx 98: Sam Johnson, 1 BTC, Nov 25, 2025
      ('sam.johnson@example.com', 'IND-BTC', 1, '2025-11-25'::date, 'DEPOSIT'),
      -- Tx 99: Sam Johnson, 49000 XRP, Nov 25, 2025
      ('sam.johnson@example.com', 'IND-XRP', 49000, '2025-11-25'::date, 'DEPOSIT'),
      -- Tx 100: Sam Johnson, 750 SOL, Nov 25, 2025
      ('sam.johnson@example.com', 'IND-SOL', 750, '2025-11-25'::date, 'DEPOSIT'),
      -- Tx 101: Sam Johnson, 35 ETH, Nov 25, 2025
      ('sam.johnson@example.com', 'IND-ETH', 35, '2025-11-25'::date, 'DEPOSIT'),
      -- Tx 102: Jose Molla, 0.548 BTC, Nov 25, 2025
      ('jose.molla@example.com', 'IND-BTC', 0.548, '2025-11-25'::date, 'DEPOSIT'),
      -- Tx 103: Valeria Cruz, 50000 USDT, Nov 25, 2025
      ('valeria.cruz@example.com', 'IND-USDT', 50000, '2025-11-25'::date, 'DEPOSIT'),
      -- Tx 104: Matthew Beatty, 18000 USDT, Nov 26, 2025
      ('matthew@example.com', 'IND-USDT', 18000, '2025-11-26'::date, 'DEPOSIT'),
      -- Tx 105: Nath & Thomas, -87937 USDT WITHDRAWAL, Nov 26, 2025
      ('nath.thomas@example.com', 'IND-USDT', -87937, '2025-11-26'::date, 'WITHDRAWAL'),
      -- Tx 106: Ventures Life Style, 100000 USDT, Nov 27, 2025
      ('ventures.lifestyle@example.com', 'IND-USDT', 100000, '2025-11-27'::date, 'DEPOSIT'),
      -- Tx 107: Nath & Thomas, 1 BTC, Nov 27, 2025
      ('nath.thomas@example.com', 'IND-BTC', 1, '2025-11-27'::date, 'DEPOSIT'),
      -- Tx 108: Vivie & Liana, 3.411 BTC, Nov 27, 2025
      ('vivie.liana@example.com', 'IND-BTC', 3.411, '2025-11-27'::date, 'DEPOSIT'),
      -- Tx 109: Sam Johnson, 1.2 BTC, Nov 30, 2025
      ('sam.johnson@example.com', 'IND-BTC', 1.2, '2025-11-30'::date, 'DEPOSIT'),
      -- Tx 110: Sam Johnson, 45000 XRP, Nov 30, 2025
      ('sam.johnson@example.com', 'IND-XRP', 45000, '2025-11-30'::date, 'DEPOSIT'),
      -- Tx 111: Sam Johnson, 750 SOL, Nov 30, 2025
      ('sam.johnson@example.com', 'IND-SOL', 750, '2025-11-30'::date, 'DEPOSIT'),
      -- Tx 112: Sam Johnson, 33 ETH, Nov 30, 2025
      ('sam.johnson@example.com', 'IND-ETH', 33, '2025-11-30'::date, 'DEPOSIT'),
      -- Tx 113: Tomer Zur, 9.143 ETH, Dec 2, 2025
      ('tomer.zur@example.com', 'IND-ETH', 9.143, '2025-12-02'::date, 'DEPOSIT'),
      -- Tx 114: INDIGO DIGITAL ASSET FUND LP, -1285.66 SOL WITHDRAWAL, Dec 4, 2025
      ('Hello@test.fund', 'IND-SOL', -1285.66, '2025-12-04'::date, 'WITHDRAWAL'),
      -- Tx 115: Brandon Hood, 31.37 ETH, Dec 4, 2025
      ('brandon.hood@example.com', 'IND-ETH', 31.37, '2025-12-04'::date, 'DEPOSIT'),
      -- Tx 116: Nath & Thomas, -213501.6 USDT WITHDRAWAL, Dec 8, 2025
      ('nath.thomas@example.com', 'IND-USDT', -213501.6, '2025-12-08'::date, 'WITHDRAWAL'),
      -- Tx 117: Thomas Puech, 46750.8 USDT, Dec 8, 2025
      ('thomas.puech@example.com', 'IND-USDT', 46750.8, '2025-12-08'::date, 'DEPOSIT'),
      -- Tx 118: Sam Johnson, 49500 XRP, Dec 8, 2025
      ('sam.johnson@example.com', 'IND-XRP', 49500, '2025-12-08'::date, 'DEPOSIT'),
      -- Tx 119: Sam Johnson, 770 SOL, Dec 8, 2025
      ('sam.johnson@example.com', 'IND-SOL', 770, '2025-12-08'::date, 'DEPOSIT'),
      -- Tx 120: Sam Johnson, 34 ETH, Dec 8, 2025
      ('sam.johnson@example.com', 'IND-ETH', 34, '2025-12-08'::date, 'DEPOSIT'),
      -- Tx 121: Sam Johnson, 1.1 BTC, Dec 8, 2025
      ('sam.johnson@example.com', 'IND-BTC', 1.1, '2025-12-08'::date, 'DEPOSIT'),
      -- Tx 122: Thomas Puech, 0.657 BTC, Dec 9, 2025
      ('thomas.puech@example.com', 'IND-BTC', 0.657, '2025-12-09'::date, 'DEPOSIT'),
      -- Tx 123: Sam Johnson, 50100 XRP, Dec 15, 2025
      ('sam.johnson@example.com', 'IND-XRP', 50100, '2025-12-15'::date, 'DEPOSIT'),
      -- Tx 124: Sam Johnson, 766 SOL, Dec 15, 2025
      ('sam.johnson@example.com', 'IND-SOL', 766, '2025-12-15'::date, 'DEPOSIT'),
      -- Tx 125: Sam Johnson, 32.5 ETH, Dec 15, 2025
      ('sam.johnson@example.com', 'IND-ETH', 32.5, '2025-12-15'::date, 'DEPOSIT'),
      -- Tx 126: Sam Johnson, 1.17 BTC, Dec 15, 2025
      ('sam.johnson@example.com', 'IND-BTC', 1.17, '2025-12-15'::date, 'DEPOSIT'),
      -- Tx 127: Matthias Reiser, -4.9895 BTC WITHDRAWAL, Dec 23, 2025
      ('matthias@example.com', 'IND-BTC', -4.9895, '2025-12-23'::date, 'WITHDRAWAL'),
      -- Tx 128: Sam Johnson, -330500.42 XRP WITHDRAWAL, Jan 2, 2026
      ('sam.johnson@example.com', 'IND-XRP', -330500.42, '2026-01-02'::date, 'WITHDRAWAL'),
      -- Tx 129: Sam Johnson, -4873.15 SOL WITHDRAWAL, Jan 2, 2026
      ('sam.johnson@example.com', 'IND-SOL', -4873.15, '2026-01-02'::date, 'WITHDRAWAL'),
      -- Tx 130: Sam Johnson, -213.73 ETH WITHDRAWAL, Jan 2, 2026
      ('sam.johnson@example.com', 'IND-ETH', -213.73, '2026-01-02'::date, 'WITHDRAWAL'),
      -- Tx 131: Sam Johnson, -7.7852 BTC WITHDRAWAL, Jan 2, 2026
      ('sam.johnson@example.com', 'IND-BTC', -7.7852, '2026-01-02'::date, 'WITHDRAWAL'),
      -- Tx 132: Advantage Blockchain, 18 ETH, Jan 2, 2026
      ('advantage.blockchain@example.com', 'IND-ETH', 18, '2026-01-02'::date, 'DEPOSIT'),
      -- Tx 133: Vivie & Liana, -3.4221 BTC WITHDRAWAL, Jan 5, 2026
      ('vivie.liana@example.com', 'IND-BTC', -3.4221, '2026-01-05'::date, 'WITHDRAWAL'),
      -- Tx 134: Nathanael Cohen, 11.84556 ETH, Jan 5, 2026
      ('nathanael@indigo.fund', 'IND-ETH', 11.84556, '2026-01-05'::date, 'DEPOSIT'),
      -- Tx 135: Kabbaj, 2.1577 BTC, Jan 5, 2026
      ('kabbaj@example.com', 'IND-BTC', 2.1577, '2026-01-05'::date, 'DEPOSIT'),
      -- Tx 136: INDIGO Ventures, -5115.04 USDT WITHDRAWAL, Jan 8, 2026
      ('indigo.ventures@example.com', 'IND-USDT', -5115.04, '2026-01-08'::date, 'WITHDRAWAL'),
      -- Tx 137: Daniele Francilia, -114867.59 USDT WITHDRAWAL, Jan 8, 2026
      ('daniele.francilia@example.com', 'IND-USDT', -114867.59, '2026-01-08'::date, 'WITHDRAWAL'),
      -- Tx 138: NSVO Holdings, 0.622 BTC, Jan 13, 2026
      ('nsvo.holdings@example.com', 'IND-BTC', 0.622, '2026-01-13'::date, 'DEPOSIT'),
      -- Tx 139: NSVO Holdings, 25.03 ETH, Jan 13, 2026
      ('nsvo.holdings@example.com', 'IND-ETH', 25.03, '2026-01-13'::date, 'DEPOSIT'),
      -- Tx 140: Thomas Puech, 0.1135766 BTC, Jan 13, 2026
      ('thomas.puech@example.com', 'IND-BTC', 0.1135766, '2026-01-13'::date, 'DEPOSIT'),
      -- Tx 141: Kyle Gulamerian, 3.9998 BTC, Jan 19, 2026
      ('updated.email.1768776102586@test.indigo.fund', 'IND-BTC', 3.9998, '2026-01-19'::date, 'DEPOSIT'),
      -- Tx 142: Danielle Richetta, -0.12 BTC WITHDRAWAL, Jan 19, 2026
      ('danielle@example.com', 'IND-BTC', -0.12, '2026-01-19'::date, 'WITHDRAWAL'),
      -- Tx 143: Sam Johnson, 4200000 USDT, Jan 19, 2026
      ('sam.johnson@example.com', 'IND-USDT', 4200000, '2026-01-19'::date, 'DEPOSIT')
    ) AS t(investor_email, fund_code, amount, tx_date, tx_type)
  LOOP
    -- Get investor ID
    SELECT id INTO v_investor_id FROM profiles WHERE email = r.investor_email;
    IF v_investor_id IS NULL THEN
      RAISE NOTICE 'Skipping: Unknown investor %', r.investor_email;
      CONTINUE;
    END IF;

    -- Get fund ID
    SELECT id INTO v_fund_id FROM funds WHERE code = r.fund_code;
    IF v_fund_id IS NULL THEN
      RAISE NOTICE 'Skipping: Unknown fund %', r.fund_code;
      CONTINUE;
    END IF;

    -- Get current AUM for preflow snapshot
    SELECT COALESCE(SUM(current_value), 0) INTO v_preflow_aum
    FROM investor_positions
    WHERE fund_id = v_fund_id;

    -- Execute transaction
    IF r.tx_type = 'DEPOSIT' THEN
      PERFORM apply_deposit_with_crystallization(
        v_investor_id,
        v_fund_id,
        ABS(r.amount),
        r.tx_date,
        NULL,
        v_preflow_aum
      );
      RAISE NOTICE 'DEPOSIT: % +% % on %', r.investor_email, r.amount, r.fund_code, r.tx_date;
    ELSE
      -- For withdrawals, insert directly into transactions_v2
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, status,
        preflow_aum_snapshot, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'WITHDRAWAL', -ABS(r.amount), r.tx_date, 'completed',
        v_preflow_aum, v_admin_id
      );

      -- Update investor position
      UPDATE investor_positions
      SET current_value = current_value - ABS(r.amount),
          updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      RAISE NOTICE 'WITHDRAWAL: % -% % on %', r.investor_email, ABS(r.amount), r.fund_code, r.tx_date;
    END IF;
  END LOOP;

  RAISE NOTICE 'Batch execution complete!';
END $$;
