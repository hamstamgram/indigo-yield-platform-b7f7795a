
-- Monthly Yield Distribution Script
-- Generated from accounting data with compounding
-- Run this to create YIELD transactions for all investors

DO $$
DECLARE
  v_fund_id UUID;
  v_investor_id UUID;
  v_admin_id UUID;
BEGIN
  -- Get admin ID for created_by
  SELECT id INTO v_admin_id FROM profiles WHERE email = 'nathanael@indigo.fund' LIMIT 1;
  IF v_admin_id IS NULL THEN
    SELECT id INTO v_admin_id FROM profiles WHERE is_admin = true LIMIT 1;
  END IF;


  -- Jose Molla - IND-BTC - 2024-08
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE (LOWER(TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))) LIKE '%jose molla%'
    OR p.first_name || ' ' || COALESCE(p.last_name, '') ILIKE '%Jose Molla%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    -- Check if yield for this month already exists
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id
        AND fund_id = v_fund_id
        AND type = 'YIELD'
        AND tx_date >= '2024-08-01'::date
        AND tx_date < ('2024-08-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0255495702,
        '2024-08-28'::date, '2024-08-28'::date,
        'COMPLETED', 'Monthly yield distribution for 2024-08',
        v_admin_id
      );

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + 0.0255495702,
          updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      RAISE NOTICE 'Created YIELD for Jose Molla in IND-BTC for 2024-08: 0.02554957';
    ELSE
      RAISE NOTICE 'YIELD already exists for Jose Molla in IND-BTC for 2024-08';
    END IF;
  ELSE
    RAISE WARNING 'Could not find investor "Jose Molla" or fund "IND-BTC"';
  END IF;


  -- Jose Molla - IND-BTC - 2024-09
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE (LOWER(TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))) LIKE '%jose molla%'
    OR p.first_name || ' ' || COALESCE(p.last_name, '') ILIKE '%Jose Molla%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    -- Check if yield for this month already exists
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id
        AND fund_id = v_fund_id
        AND type = 'YIELD'
        AND tx_date >= '2024-09-01'::date
        AND tx_date < ('2024-09-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0201499898,
        '2024-09-28'::date, '2024-09-28'::date,
        'COMPLETED', 'Monthly yield distribution for 2024-09',
        v_admin_id
      );

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + 0.0201499898,
          updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      RAISE NOTICE 'Created YIELD for Jose Molla in IND-BTC for 2024-09: 0.02014999';
    ELSE
      RAISE NOTICE 'YIELD already exists for Jose Molla in IND-BTC for 2024-09';
    END IF;
  ELSE
    RAISE WARNING 'Could not find investor "Jose Molla" or fund "IND-BTC"';
  END IF;


  -- Jose Molla - IND-BTC - 2024-11
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE (LOWER(TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))) LIKE '%jose molla%'
    OR p.first_name || ' ' || COALESCE(p.last_name, '') ILIKE '%Jose Molla%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    -- Check if yield for this month already exists
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id
        AND fund_id = v_fund_id
        AND type = 'YIELD'
        AND tx_date >= '2024-11-01'::date
        AND tx_date < ('2024-11-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0178222832,
        '2024-11-28'::date, '2024-11-28'::date,
        'COMPLETED', 'Monthly yield distribution for 2024-11',
        v_admin_id
      );

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + 0.0178222832,
          updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      RAISE NOTICE 'Created YIELD for Jose Molla in IND-BTC for 2024-11: 0.01782228';
    ELSE
      RAISE NOTICE 'YIELD already exists for Jose Molla in IND-BTC for 2024-11';
    END IF;
  ELSE
    RAISE WARNING 'Could not find investor "Jose Molla" or fund "IND-BTC"';
  END IF;


  -- Matthias Reiser - IND-BTC - 2024-11
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE (LOWER(TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))) LIKE '%matthias reiser%'
    OR p.first_name || ' ' || COALESCE(p.last_name, '') ILIKE '%Matthias Reiser%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    -- Check if yield for this month already exists
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id
        AND fund_id = v_fund_id
        AND type = 'YIELD'
        AND tx_date >= '2024-11-01'::date
        AND tx_date < ('2024-11-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0237424880,
        '2024-11-28'::date, '2024-11-28'::date,
        'COMPLETED', 'Monthly yield distribution for 2024-11',
        v_admin_id
      );

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + 0.0237424880,
          updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      RAISE NOTICE 'Created YIELD for Matthias Reiser in IND-BTC for 2024-11: 0.02374249';
    ELSE
      RAISE NOTICE 'YIELD already exists for Matthias Reiser in IND-BTC for 2024-11';
    END IF;
  ELSE
    RAISE WARNING 'Could not find investor "Matthias Reiser" or fund "IND-BTC"';
  END IF;


  -- Thomas Puech - IND-BTC - 2024-11
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE (LOWER(TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))) LIKE '%thomas puech%'
    OR p.first_name || ' ' || COALESCE(p.last_name, '') ILIKE '%Thomas Puech%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    -- Check if yield for this month already exists
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id
        AND fund_id = v_fund_id
        AND type = 'YIELD'
        AND tx_date >= '2024-11-01'::date
        AND tx_date < ('2024-11-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0335031174,
        '2024-11-28'::date, '2024-11-28'::date,
        'COMPLETED', 'Monthly yield distribution for 2024-11',
        v_admin_id
      );

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + 0.0335031174,
          updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      RAISE NOTICE 'Created YIELD for Thomas Puech in IND-BTC for 2024-11: 0.03350312';
    ELSE
      RAISE NOTICE 'YIELD already exists for Thomas Puech in IND-BTC for 2024-11';
    END IF;
  ELSE
    RAISE WARNING 'Could not find investor "Thomas Puech" or fund "IND-BTC"';
  END IF;


  -- Danielle Richetta - IND-BTC - 2024-11
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE (LOWER(TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))) LIKE '%danielle richetta%'
    OR p.first_name || ' ' || COALESCE(p.last_name, '') ILIKE '%Danielle Richetta%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    -- Check if yield for this month already exists
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id
        AND fund_id = v_fund_id
        AND type = 'YIELD'
        AND tx_date >= '2024-11-01'::date
        AND tx_date < ('2024-11-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0264514390,
        '2024-11-28'::date, '2024-11-28'::date,
        'COMPLETED', 'Monthly yield distribution for 2024-11',
        v_admin_id
      );

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + 0.0264514390,
          updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      RAISE NOTICE 'Created YIELD for Danielle Richetta in IND-BTC for 2024-11: 0.02645144';
    ELSE
      RAISE NOTICE 'YIELD already exists for Danielle Richetta in IND-BTC for 2024-11';
    END IF;
  ELSE
    RAISE WARNING 'Could not find investor "Danielle Richetta" or fund "IND-BTC"';
  END IF;


  -- Jose Molla - IND-BTC - 2024-12
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE (LOWER(TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))) LIKE '%jose molla%'
    OR p.first_name || ' ' || COALESCE(p.last_name, '') ILIKE '%Jose Molla%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    -- Check if yield for this month already exists
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id
        AND fund_id = v_fund_id
        AND type = 'YIELD'
        AND tx_date >= '2024-12-01'::date
        AND tx_date < ('2024-12-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0165615945,
        '2024-12-28'::date, '2024-12-28'::date,
        'COMPLETED', 'Monthly yield distribution for 2024-12',
        v_admin_id
      );

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + 0.0165615945,
          updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      RAISE NOTICE 'Created YIELD for Jose Molla in IND-BTC for 2024-12: 0.01656159';
    ELSE
      RAISE NOTICE 'YIELD already exists for Jose Molla in IND-BTC for 2024-12';
    END IF;
  ELSE
    RAISE WARNING 'Could not find investor "Jose Molla" or fund "IND-BTC"';
  END IF;


  -- Matthias Reiser - IND-BTC - 2024-12
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE (LOWER(TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))) LIKE '%matthias reiser%'
    OR p.first_name || ' ' || COALESCE(p.last_name, '') ILIKE '%Matthias Reiser%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    -- Check if yield for this month already exists
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id
        AND fund_id = v_fund_id
        AND type = 'YIELD'
        AND tx_date >= '2024-12-01'::date
        AND tx_date < ('2024-12-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0220630239,
        '2024-12-28'::date, '2024-12-28'::date,
        'COMPLETED', 'Monthly yield distribution for 2024-12',
        v_admin_id
      );

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + 0.0220630239,
          updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      RAISE NOTICE 'Created YIELD for Matthias Reiser in IND-BTC for 2024-12: 0.02206302';
    ELSE
      RAISE NOTICE 'YIELD already exists for Matthias Reiser in IND-BTC for 2024-12';
    END IF;
  ELSE
    RAISE WARNING 'Could not find investor "Matthias Reiser" or fund "IND-BTC"';
  END IF;


  -- Thomas Puech - IND-BTC - 2024-12
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE (LOWER(TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))) LIKE '%thomas puech%'
    OR p.first_name || ' ' || COALESCE(p.last_name, '') ILIKE '%Thomas Puech%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    -- Check if yield for this month already exists
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id
        AND fund_id = v_fund_id
        AND type = 'YIELD'
        AND tx_date >= '2024-12-01'::date
        AND tx_date < ('2024-12-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0311332189,
        '2024-12-28'::date, '2024-12-28'::date,
        'COMPLETED', 'Monthly yield distribution for 2024-12',
        v_admin_id
      );

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + 0.0311332189,
          updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      RAISE NOTICE 'Created YIELD for Thomas Puech in IND-BTC for 2024-12: 0.03113322';
    ELSE
      RAISE NOTICE 'YIELD already exists for Thomas Puech in IND-BTC for 2024-12';
    END IF;
  ELSE
    RAISE WARNING 'Could not find investor "Thomas Puech" or fund "IND-BTC"';
  END IF;


  -- Danielle Richetta - IND-BTC - 2024-12
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE (LOWER(TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))) LIKE '%danielle richetta%'
    OR p.first_name || ' ' || COALESCE(p.last_name, '') ILIKE '%Danielle Richetta%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    -- Check if yield for this month already exists
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id
        AND fund_id = v_fund_id
        AND type = 'YIELD'
        AND tx_date >= '2024-12-01'::date
        AND tx_date < ('2024-12-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0235121187,
        '2024-12-28'::date, '2024-12-28'::date,
        'COMPLETED', 'Monthly yield distribution for 2024-12',
        v_admin_id
      );

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + 0.0235121187,
          updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      RAISE NOTICE 'Created YIELD for Danielle Richetta in IND-BTC for 2024-12: 0.02351212';
    ELSE
      RAISE NOTICE 'YIELD already exists for Danielle Richetta in IND-BTC for 2024-12';
    END IF;
  ELSE
    RAISE WARNING 'Could not find investor "Danielle Richetta" or fund "IND-BTC"';
  END IF;


  -- Jose Molla - IND-BTC - 2025-01
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE (LOWER(TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))) LIKE '%jose molla%'
    OR p.first_name || ' ' || COALESCE(p.last_name, '') ILIKE '%Jose Molla%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    -- Check if yield for this month already exists
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id
        AND fund_id = v_fund_id
        AND type = 'YIELD'
        AND tx_date >= '2025-01-01'::date
        AND tx_date < ('2025-01-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0141880309,
        '2025-01-28'::date, '2025-01-28'::date,
        'COMPLETED', 'Monthly yield distribution for 2025-01',
        v_admin_id
      );

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + 0.0141880309,
          updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      RAISE NOTICE 'Created YIELD for Jose Molla in IND-BTC for 2025-01: 0.01418803';
    ELSE
      RAISE NOTICE 'YIELD already exists for Jose Molla in IND-BTC for 2025-01';
    END IF;
  ELSE
    RAISE WARNING 'Could not find investor "Jose Molla" or fund "IND-BTC"';
  END IF;


  -- Matthias Reiser - IND-BTC - 2025-01
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE (LOWER(TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))) LIKE '%matthias reiser%'
    OR p.first_name || ' ' || COALESCE(p.last_name, '') ILIKE '%Matthias Reiser%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    -- Check if yield for this month already exists
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id
        AND fund_id = v_fund_id
        AND type = 'YIELD'
        AND tx_date >= '2025-01-01'::date
        AND tx_date < ('2025-01-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0189010100,
        '2025-01-28'::date, '2025-01-28'::date,
        'COMPLETED', 'Monthly yield distribution for 2025-01',
        v_admin_id
      );

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + 0.0189010100,
          updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      RAISE NOTICE 'Created YIELD for Matthias Reiser in IND-BTC for 2025-01: 0.01890101';
    ELSE
      RAISE NOTICE 'YIELD already exists for Matthias Reiser in IND-BTC for 2025-01';
    END IF;
  ELSE
    RAISE WARNING 'Could not find investor "Matthias Reiser" or fund "IND-BTC"';
  END IF;


  -- Thomas Puech - IND-BTC - 2025-01
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE (LOWER(TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))) LIKE '%thomas puech%'
    OR p.first_name || ' ' || COALESCE(p.last_name, '') ILIKE '%Thomas Puech%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    -- Check if yield for this month already exists
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id
        AND fund_id = v_fund_id
        AND type = 'YIELD'
        AND tx_date >= '2025-01-01'::date
        AND tx_date < ('2025-01-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0266712889,
        '2025-01-28'::date, '2025-01-28'::date,
        'COMPLETED', 'Monthly yield distribution for 2025-01',
        v_admin_id
      );

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + 0.0266712889,
          updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      RAISE NOTICE 'Created YIELD for Thomas Puech in IND-BTC for 2025-01: 0.02667129';
    ELSE
      RAISE NOTICE 'YIELD already exists for Thomas Puech in IND-BTC for 2025-01';
    END IF;
  ELSE
    RAISE WARNING 'Could not find investor "Thomas Puech" or fund "IND-BTC"';
  END IF;


  -- Danielle Richetta - IND-BTC - 2025-01
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE (LOWER(TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))) LIKE '%danielle richetta%'
    OR p.first_name || ' ' || COALESCE(p.last_name, '') ILIKE '%Danielle Richetta%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    -- Check if yield for this month already exists
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id
        AND fund_id = v_fund_id
        AND type = 'YIELD'
        AND tx_date >= '2025-01-01'::date
        AND tx_date < ('2025-01-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0198663671,
        '2025-01-28'::date, '2025-01-28'::date,
        'COMPLETED', 'Monthly yield distribution for 2025-01',
        v_admin_id
      );

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + 0.0198663671,
          updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      RAISE NOTICE 'Created YIELD for Danielle Richetta in IND-BTC for 2025-01: 0.01986637';
    ELSE
      RAISE NOTICE 'YIELD already exists for Danielle Richetta in IND-BTC for 2025-01';
    END IF;
  ELSE
    RAISE WARNING 'Could not find investor "Danielle Richetta" or fund "IND-BTC"';
  END IF;


  -- Jose Molla - IND-BTC - 2025-02
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE (LOWER(TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))) LIKE '%jose molla%'
    OR p.first_name || ' ' || COALESCE(p.last_name, '') ILIKE '%Jose Molla%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    -- Check if yield for this month already exists
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id
        AND fund_id = v_fund_id
        AND type = 'YIELD'
        AND tx_date >= '2025-02-01'::date
        AND tx_date < ('2025-02-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0162562500,
        '2025-02-28'::date, '2025-02-28'::date,
        'COMPLETED', 'Monthly yield distribution for 2025-02',
        v_admin_id
      );

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + 0.0162562500,
          updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      RAISE NOTICE 'Created YIELD for Jose Molla in IND-BTC for 2025-02: 0.01625625';
    ELSE
      RAISE NOTICE 'YIELD already exists for Jose Molla in IND-BTC for 2025-02';
    END IF;
  ELSE
    RAISE WARNING 'Could not find investor "Jose Molla" or fund "IND-BTC"';
  END IF;


  -- Matthias Reiser - IND-BTC - 2025-02
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE (LOWER(TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))) LIKE '%matthias reiser%'
    OR p.first_name || ' ' || COALESCE(p.last_name, '') ILIKE '%Matthias Reiser%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    -- Check if yield for this month already exists
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id
        AND fund_id = v_fund_id
        AND type = 'YIELD'
        AND tx_date >= '2025-02-01'::date
        AND tx_date < ('2025-02-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0216562500,
        '2025-02-28'::date, '2025-02-28'::date,
        'COMPLETED', 'Monthly yield distribution for 2025-02',
        v_admin_id
      );

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + 0.0216562500,
          updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      RAISE NOTICE 'Created YIELD for Matthias Reiser in IND-BTC for 2025-02: 0.02165625';
    ELSE
      RAISE NOTICE 'YIELD already exists for Matthias Reiser in IND-BTC for 2025-02';
    END IF;
  ELSE
    RAISE WARNING 'Could not find investor "Matthias Reiser" or fund "IND-BTC"';
  END IF;


  -- Thomas Puech - IND-BTC - 2025-02
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE (LOWER(TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))) LIKE '%thomas puech%'
    OR p.first_name || ' ' || COALESCE(p.last_name, '') ILIKE '%Thomas Puech%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    -- Check if yield for this month already exists
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id
        AND fund_id = v_fund_id
        AND type = 'YIELD'
        AND tx_date >= '2025-02-01'::date
        AND tx_date < ('2025-02-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0305592188,
        '2025-02-28'::date, '2025-02-28'::date,
        'COMPLETED', 'Monthly yield distribution for 2025-02',
        v_admin_id
      );

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + 0.0305592188,
          updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      RAISE NOTICE 'Created YIELD for Thomas Puech in IND-BTC for 2025-02: 0.03055922';
    ELSE
      RAISE NOTICE 'YIELD already exists for Thomas Puech in IND-BTC for 2025-02';
    END IF;
  ELSE
    RAISE WARNING 'Could not find investor "Thomas Puech" or fund "IND-BTC"';
  END IF;


  -- Danielle Richetta - IND-BTC - 2025-02
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE (LOWER(TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))) LIKE '%danielle richetta%'
    OR p.first_name || ' ' || COALESCE(p.last_name, '') ILIKE '%Danielle Richetta%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    -- Check if yield for this month already exists
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id
        AND fund_id = v_fund_id
        AND type = 'YIELD'
        AND tx_date >= '2025-02-01'::date
        AND tx_date < ('2025-02-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0227623292,
        '2025-02-28'::date, '2025-02-28'::date,
        'COMPLETED', 'Monthly yield distribution for 2025-02',
        v_admin_id
      );

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + 0.0227623292,
          updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      RAISE NOTICE 'Created YIELD for Danielle Richetta in IND-BTC for 2025-02: 0.02276233';
    ELSE
      RAISE NOTICE 'YIELD already exists for Danielle Richetta in IND-BTC for 2025-02';
    END IF;
  ELSE
    RAISE WARNING 'Could not find investor "Danielle Richetta" or fund "IND-BTC"';
  END IF;


  -- Jose Molla - IND-BTC - 2025-03
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE (LOWER(TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))) LIKE '%jose molla%'
    OR p.first_name || ' ' || COALESCE(p.last_name, '') ILIKE '%Jose Molla%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    -- Check if yield for this month already exists
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id
        AND fund_id = v_fund_id
        AND type = 'YIELD'
        AND tx_date >= '2025-03-01'::date
        AND tx_date < ('2025-03-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0215070575,
        '2025-03-28'::date, '2025-03-28'::date,
        'COMPLETED', 'Monthly yield distribution for 2025-03',
        v_admin_id
      );

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + 0.0215070575,
          updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      RAISE NOTICE 'Created YIELD for Jose Molla in IND-BTC for 2025-03: 0.02150706';
    ELSE
      RAISE NOTICE 'YIELD already exists for Jose Molla in IND-BTC for 2025-03';
    END IF;
  ELSE
    RAISE WARNING 'Could not find investor "Jose Molla" or fund "IND-BTC"';
  END IF;


  -- Matthias Reiser - IND-BTC - 2025-03
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE (LOWER(TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))) LIKE '%matthias reiser%'
    OR p.first_name || ' ' || COALESCE(p.last_name, '') ILIKE '%Matthias Reiser%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    -- Check if yield for this month already exists
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id
        AND fund_id = v_fund_id
        AND type = 'YIELD'
        AND tx_date >= '2025-03-01'::date
        AND tx_date < ('2025-03-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0286512704,
        '2025-03-28'::date, '2025-03-28'::date,
        'COMPLETED', 'Monthly yield distribution for 2025-03',
        v_admin_id
      );

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + 0.0286512704,
          updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      RAISE NOTICE 'Created YIELD for Matthias Reiser in IND-BTC for 2025-03: 0.02865127';
    ELSE
      RAISE NOTICE 'YIELD already exists for Matthias Reiser in IND-BTC for 2025-03';
    END IF;
  ELSE
    RAISE WARNING 'Could not find investor "Matthias Reiser" or fund "IND-BTC"';
  END IF;


  -- Thomas Puech - IND-BTC - 2025-03
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE (LOWER(TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))) LIKE '%thomas puech%'
    OR p.first_name || ' ' || COALESCE(p.last_name, '') ILIKE '%Thomas Puech%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    -- Check if yield for this month already exists
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id
        AND fund_id = v_fund_id
        AND type = 'YIELD'
        AND tx_date >= '2025-03-01'::date
        AND tx_date < ('2025-03-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0404299193,
        '2025-03-28'::date, '2025-03-28'::date,
        'COMPLETED', 'Monthly yield distribution for 2025-03',
        v_admin_id
      );

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + 0.0404299193,
          updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      RAISE NOTICE 'Created YIELD for Thomas Puech in IND-BTC for 2025-03: 0.04042992';
    ELSE
      RAISE NOTICE 'YIELD already exists for Thomas Puech in IND-BTC for 2025-03';
    END IF;
  ELSE
    RAISE WARNING 'Could not find investor "Thomas Puech" or fund "IND-BTC"';
  END IF;


  -- Danielle Richetta - IND-BTC - 2025-03
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE (LOWER(TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))) LIKE '%danielle richetta%'
    OR p.first_name || ' ' || COALESCE(p.last_name, '') ILIKE '%Danielle Richetta%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    -- Check if yield for this month already exists
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id
        AND fund_id = v_fund_id
        AND type = 'YIELD'
        AND tx_date >= '2025-03-01'::date
        AND tx_date < ('2025-03-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0301146158,
        '2025-03-28'::date, '2025-03-28'::date,
        'COMPLETED', 'Monthly yield distribution for 2025-03',
        v_admin_id
      );

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + 0.0301146158,
          updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      RAISE NOTICE 'Created YIELD for Danielle Richetta in IND-BTC for 2025-03: 0.03011462';
    ELSE
      RAISE NOTICE 'YIELD already exists for Danielle Richetta in IND-BTC for 2025-03';
    END IF;
  ELSE
    RAISE WARNING 'Could not find investor "Danielle Richetta" or fund "IND-BTC"';
  END IF;


  -- Jose Molla - IND-BTC - 2025-04
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE (LOWER(TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))) LIKE '%jose molla%'
    OR p.first_name || ' ' || COALESCE(p.last_name, '') ILIKE '%Jose Molla%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    -- Check if yield for this month already exists
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id
        AND fund_id = v_fund_id
        AND type = 'YIELD'
        AND tx_date >= '2025-04-01'::date
        AND tx_date < ('2025-04-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0189003201,
        '2025-04-28'::date, '2025-04-28'::date,
        'COMPLETED', 'Monthly yield distribution for 2025-04',
        v_admin_id
      );

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + 0.0189003201,
          updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      RAISE NOTICE 'Created YIELD for Jose Molla in IND-BTC for 2025-04: 0.01890032';
    ELSE
      RAISE NOTICE 'YIELD already exists for Jose Molla in IND-BTC for 2025-04';
    END IF;
  ELSE
    RAISE WARNING 'Could not find investor "Jose Molla" or fund "IND-BTC"';
  END IF;


  -- Matthias Reiser - IND-BTC - 2025-04
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE (LOWER(TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))) LIKE '%matthias reiser%'
    OR p.first_name || ' ' || COALESCE(p.last_name, '') ILIKE '%Matthias Reiser%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    -- Check if yield for this month already exists
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id
        AND fund_id = v_fund_id
        AND type = 'YIELD'
        AND tx_date >= '2025-04-01'::date
        AND tx_date < ('2025-04-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0251786271,
        '2025-04-28'::date, '2025-04-28'::date,
        'COMPLETED', 'Monthly yield distribution for 2025-04',
        v_admin_id
      );

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + 0.0251786271,
          updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      RAISE NOTICE 'Created YIELD for Matthias Reiser in IND-BTC for 2025-04: 0.02517863';
    ELSE
      RAISE NOTICE 'YIELD already exists for Matthias Reiser in IND-BTC for 2025-04';
    END IF;
  ELSE
    RAISE WARNING 'Could not find investor "Matthias Reiser" or fund "IND-BTC"';
  END IF;


  -- Thomas Puech - IND-BTC - 2025-04
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE (LOWER(TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))) LIKE '%thomas puech%'
    OR p.first_name || ' ' || COALESCE(p.last_name, '') ILIKE '%Thomas Puech%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    -- Check if yield for this month already exists
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id
        AND fund_id = v_fund_id
        AND type = 'YIELD'
        AND tx_date >= '2025-04-01'::date
        AND tx_date < ('2025-04-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0355296588,
        '2025-04-28'::date, '2025-04-28'::date,
        'COMPLETED', 'Monthly yield distribution for 2025-04',
        v_admin_id
      );

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + 0.0355296588,
          updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      RAISE NOTICE 'Created YIELD for Thomas Puech in IND-BTC for 2025-04: 0.03552966';
    ELSE
      RAISE NOTICE 'YIELD already exists for Thomas Puech in IND-BTC for 2025-04';
    END IF;
  ELSE
    RAISE WARNING 'Could not find investor "Thomas Puech" or fund "IND-BTC"';
  END IF;


  -- Danielle Richetta - IND-BTC - 2025-04
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE (LOWER(TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))) LIKE '%danielle richetta%'
    OR p.first_name || ' ' || COALESCE(p.last_name, '') ILIKE '%Danielle Richetta%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    -- Check if yield for this month already exists
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id
        AND fund_id = v_fund_id
        AND type = 'YIELD'
        AND tx_date >= '2025-04-01'::date
        AND tx_date < ('2025-04-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0264646095,
        '2025-04-28'::date, '2025-04-28'::date,
        'COMPLETED', 'Monthly yield distribution for 2025-04',
        v_admin_id
      );

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + 0.0264646095,
          updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      RAISE NOTICE 'Created YIELD for Danielle Richetta in IND-BTC for 2025-04: 0.02646461';
    ELSE
      RAISE NOTICE 'YIELD already exists for Danielle Richetta in IND-BTC for 2025-04';
    END IF;
  ELSE
    RAISE WARNING 'Could not find investor "Danielle Richetta" or fund "IND-BTC"';
  END IF;


  -- Nathanael Cohen - IND-BTC - 2025-04
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE (LOWER(TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))) LIKE '%nathanael cohen%'
    OR p.first_name || ' ' || COALESCE(p.last_name, '') ILIKE '%Nathanael Cohen%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    -- Check if yield for this month already exists
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id
        AND fund_id = v_fund_id
        AND type = 'YIELD'
        AND tx_date >= '2025-04-01'::date
        AND tx_date < ('2025-04-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0024431988,
        '2025-04-28'::date, '2025-04-28'::date,
        'COMPLETED', 'Monthly yield distribution for 2025-04',
        v_admin_id
      );

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + 0.0024431988,
          updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      RAISE NOTICE 'Created YIELD for Nathanael Cohen in IND-BTC for 2025-04: 0.00244320';
    ELSE
      RAISE NOTICE 'YIELD already exists for Nathanael Cohen in IND-BTC for 2025-04';
    END IF;
  ELSE
    RAISE WARNING 'Could not find investor "Nathanael Cohen" or fund "IND-BTC"';
  END IF;


  -- Blondish - IND-BTC - 2025-04
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE (LOWER(TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))) LIKE '%blondish%'
    OR p.first_name || ' ' || COALESCE(p.last_name, '') ILIKE '%Blondish%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    -- Check if yield for this month already exists
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id
        AND fund_id = v_fund_id
        AND type = 'YIELD'
        AND tx_date >= '2025-04-01'::date
        AND tx_date < ('2025-04-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0224591174,
        '2025-04-28'::date, '2025-04-28'::date,
        'COMPLETED', 'Monthly yield distribution for 2025-04',
        v_admin_id
      );

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + 0.0224591174,
          updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      RAISE NOTICE 'Created YIELD for Blondish in IND-BTC for 2025-04: 0.02245912';
    ELSE
      RAISE NOTICE 'YIELD already exists for Blondish in IND-BTC for 2025-04';
    END IF;
  ELSE
    RAISE WARNING 'Could not find investor "Blondish" or fund "IND-BTC"';
  END IF;


  -- Jose Molla - IND-BTC - 2025-05
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE (LOWER(TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))) LIKE '%jose molla%'
    OR p.first_name || ' ' || COALESCE(p.last_name, '') ILIKE '%Jose Molla%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    -- Check if yield for this month already exists
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id
        AND fund_id = v_fund_id
        AND type = 'YIELD'
        AND tx_date >= '2025-05-01'::date
        AND tx_date < ('2025-05-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0271328587,
        '2025-05-28'::date, '2025-05-28'::date,
        'COMPLETED', 'Monthly yield distribution for 2025-05',
        v_admin_id
      );

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + 0.0271328587,
          updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      RAISE NOTICE 'Created YIELD for Jose Molla in IND-BTC for 2025-05: 0.02713286';
    ELSE
      RAISE NOTICE 'YIELD already exists for Jose Molla in IND-BTC for 2025-05';
    END IF;
  ELSE
    RAISE WARNING 'Could not find investor "Jose Molla" or fund "IND-BTC"';
  END IF;


  -- Matthias Reiser - IND-BTC - 2025-05
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE (LOWER(TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))) LIKE '%matthias reiser%'
    OR p.first_name || ' ' || COALESCE(p.last_name, '') ILIKE '%Matthias Reiser%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    -- Check if yield for this month already exists
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id
        AND fund_id = v_fund_id
        AND type = 'YIELD'
        AND tx_date >= '2025-05-01'::date
        AND tx_date < ('2025-05-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0361458498,
        '2025-05-28'::date, '2025-05-28'::date,
        'COMPLETED', 'Monthly yield distribution for 2025-05',
        v_admin_id
      );

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + 0.0361458498,
          updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      RAISE NOTICE 'Created YIELD for Matthias Reiser in IND-BTC for 2025-05: 0.03614585';
    ELSE
      RAISE NOTICE 'YIELD already exists for Matthias Reiser in IND-BTC for 2025-05';
    END IF;
  ELSE
    RAISE WARNING 'Could not find investor "Matthias Reiser" or fund "IND-BTC"';
  END IF;


  -- Thomas Puech - IND-BTC - 2025-05
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE (LOWER(TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))) LIKE '%thomas puech%'
    OR p.first_name || ' ' || COALESCE(p.last_name, '') ILIKE '%Thomas Puech%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    -- Check if yield for this month already exists
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id
        AND fund_id = v_fund_id
        AND type = 'YIELD'
        AND tx_date >= '2025-05-01'::date
        AND tx_date < ('2025-05-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0510055494,
        '2025-05-28'::date, '2025-05-28'::date,
        'COMPLETED', 'Monthly yield distribution for 2025-05',
        v_admin_id
      );

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + 0.0510055494,
          updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      RAISE NOTICE 'Created YIELD for Thomas Puech in IND-BTC for 2025-05: 0.05100555';
    ELSE
      RAISE NOTICE 'YIELD already exists for Thomas Puech in IND-BTC for 2025-05';
    END IF;
  ELSE
    RAISE WARNING 'Could not find investor "Thomas Puech" or fund "IND-BTC"';
  END IF;


  -- Danielle Richetta - IND-BTC - 2025-05
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE (LOWER(TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))) LIKE '%danielle richetta%'
    OR p.first_name || ' ' || COALESCE(p.last_name, '') ILIKE '%Danielle Richetta%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    -- Check if yield for this month already exists
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id
        AND fund_id = v_fund_id
        AND type = 'YIELD'
        AND tx_date >= '2025-05-01'::date
        AND tx_date < ('2025-05-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0379506529,
        '2025-05-28'::date, '2025-05-28'::date,
        'COMPLETED', 'Monthly yield distribution for 2025-05',
        v_admin_id
      );

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + 0.0379506529,
          updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      RAISE NOTICE 'Created YIELD for Danielle Richetta in IND-BTC for 2025-05: 0.03795065';
    ELSE
      RAISE NOTICE 'YIELD already exists for Danielle Richetta in IND-BTC for 2025-05';
    END IF;
  ELSE
    RAISE WARNING 'Could not find investor "Danielle Richetta" or fund "IND-BTC"';
  END IF;


  -- Nathanael Cohen - IND-BTC - 2025-05
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE (LOWER(TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))) LIKE '%nathanael cohen%'
    OR p.first_name || ' ' || COALESCE(p.last_name, '') ILIKE '%Nathanael Cohen%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    -- Check if yield for this month already exists
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id
        AND fund_id = v_fund_id
        AND type = 'YIELD'
        AND tx_date >= '2025-05-01'::date
        AND tx_date < ('2025-05-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0035348046,
        '2025-05-28'::date, '2025-05-28'::date,
        'COMPLETED', 'Monthly yield distribution for 2025-05',
        v_admin_id
      );

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + 0.0035348046,
          updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      RAISE NOTICE 'Created YIELD for Nathanael Cohen in IND-BTC for 2025-05: 0.00353480';
    ELSE
      RAISE NOTICE 'YIELD already exists for Nathanael Cohen in IND-BTC for 2025-05';
    END IF;
  ELSE
    RAISE WARNING 'Could not find investor "Nathanael Cohen" or fund "IND-BTC"';
  END IF;


  -- Blondish - IND-BTC - 2025-05
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE (LOWER(TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))) LIKE '%blondish%'
    OR p.first_name || ' ' || COALESCE(p.last_name, '') ILIKE '%Blondish%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    -- Check if yield for this month already exists
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id
        AND fund_id = v_fund_id
        AND type = 'YIELD'
        AND tx_date >= '2025-05-01'::date
        AND tx_date < ('2025-05-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0324937091,
        '2025-05-28'::date, '2025-05-28'::date,
        'COMPLETED', 'Monthly yield distribution for 2025-05',
        v_admin_id
      );

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + 0.0324937091,
          updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      RAISE NOTICE 'Created YIELD for Blondish in IND-BTC for 2025-05: 0.03249371';
    ELSE
      RAISE NOTICE 'YIELD already exists for Blondish in IND-BTC for 2025-05';
    END IF;
  ELSE
    RAISE WARNING 'Could not find investor "Blondish" or fund "IND-BTC"';
  END IF;


  -- Jose Molla - IND-BTC - 2025-06
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE (LOWER(TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))) LIKE '%jose molla%'
    OR p.first_name || ' ' || COALESCE(p.last_name, '') ILIKE '%Jose Molla%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    -- Check if yield for this month already exists
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id
        AND fund_id = v_fund_id
        AND type = 'YIELD'
        AND tx_date >= '2025-06-01'::date
        AND tx_date < ('2025-06-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0106031075,
        '2025-06-28'::date, '2025-06-28'::date,
        'COMPLETED', 'Monthly yield distribution for 2025-06',
        v_admin_id
      );

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + 0.0106031075,
          updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      RAISE NOTICE 'Created YIELD for Jose Molla in IND-BTC for 2025-06: 0.01060311';
    ELSE
      RAISE NOTICE 'YIELD already exists for Jose Molla in IND-BTC for 2025-06';
    END IF;
  ELSE
    RAISE WARNING 'Could not find investor "Jose Molla" or fund "IND-BTC"';
  END IF;


  -- Matthias Reiser - IND-BTC - 2025-06
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE (LOWER(TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))) LIKE '%matthias reiser%'
    OR p.first_name || ' ' || COALESCE(p.last_name, '') ILIKE '%Matthias Reiser%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    -- Check if yield for this month already exists
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id
        AND fund_id = v_fund_id
        AND type = 'YIELD'
        AND tx_date >= '2025-06-01'::date
        AND tx_date < ('2025-06-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0141252470,
        '2025-06-28'::date, '2025-06-28'::date,
        'COMPLETED', 'Monthly yield distribution for 2025-06',
        v_admin_id
      );

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + 0.0141252470,
          updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      RAISE NOTICE 'Created YIELD for Matthias Reiser in IND-BTC for 2025-06: 0.01412525';
    ELSE
      RAISE NOTICE 'YIELD already exists for Matthias Reiser in IND-BTC for 2025-06';
    END IF;
  ELSE
    RAISE WARNING 'Could not find investor "Matthias Reiser" or fund "IND-BTC"';
  END IF;


  -- Thomas Puech - IND-BTC - 2025-06
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE (LOWER(TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))) LIKE '%thomas puech%'
    OR p.first_name || ' ' || COALESCE(p.last_name, '') ILIKE '%Thomas Puech%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    -- Check if yield for this month already exists
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id
        AND fund_id = v_fund_id
        AND type = 'YIELD'
        AND tx_date >= '2025-06-01'::date
        AND tx_date < ('2025-06-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0199321911,
        '2025-06-28'::date, '2025-06-28'::date,
        'COMPLETED', 'Monthly yield distribution for 2025-06',
        v_admin_id
      );

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + 0.0199321911,
          updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      RAISE NOTICE 'Created YIELD for Thomas Puech in IND-BTC for 2025-06: 0.01993219';
    ELSE
      RAISE NOTICE 'YIELD already exists for Thomas Puech in IND-BTC for 2025-06';
    END IF;
  ELSE
    RAISE WARNING 'Could not find investor "Thomas Puech" or fund "IND-BTC"';
  END IF;


  -- Danielle Richetta - IND-BTC - 2025-06
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE (LOWER(TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))) LIKE '%danielle richetta%'
    OR p.first_name || ' ' || COALESCE(p.last_name, '') ILIKE '%Danielle Richetta%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    -- Check if yield for this month already exists
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id
        AND fund_id = v_fund_id
        AND type = 'YIELD'
        AND tx_date >= '2025-06-01'::date
        AND tx_date < ('2025-06-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0148685718,
        '2025-06-28'::date, '2025-06-28'::date,
        'COMPLETED', 'Monthly yield distribution for 2025-06',
        v_admin_id
      );

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + 0.0148685718,
          updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      RAISE NOTICE 'Created YIELD for Danielle Richetta in IND-BTC for 2025-06: 0.01486857';
    ELSE
      RAISE NOTICE 'YIELD already exists for Danielle Richetta in IND-BTC for 2025-06';
    END IF;
  ELSE
    RAISE WARNING 'Could not find investor "Danielle Richetta" or fund "IND-BTC"';
  END IF;


  -- Nathanael Cohen - IND-BTC - 2025-06
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE (LOWER(TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))) LIKE '%nathanael cohen%'
    OR p.first_name || ' ' || COALESCE(p.last_name, '') ILIKE '%Nathanael Cohen%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    -- Check if yield for this month already exists
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id
        AND fund_id = v_fund_id
        AND type = 'YIELD'
        AND tx_date >= '2025-06-01'::date
        AND tx_date < ('2025-06-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0013896419,
        '2025-06-28'::date, '2025-06-28'::date,
        'COMPLETED', 'Monthly yield distribution for 2025-06',
        v_admin_id
      );

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + 0.0013896419,
          updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      RAISE NOTICE 'Created YIELD for Nathanael Cohen in IND-BTC for 2025-06: 0.00138964';
    ELSE
      RAISE NOTICE 'YIELD already exists for Nathanael Cohen in IND-BTC for 2025-06';
    END IF;
  ELSE
    RAISE WARNING 'Could not find investor "Nathanael Cohen" or fund "IND-BTC"';
  END IF;


  -- Blondish - IND-BTC - 2025-06
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE (LOWER(TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))) LIKE '%blondish%'
    OR p.first_name || ' ' || COALESCE(p.last_name, '') ILIKE '%Blondish%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    -- Check if yield for this month already exists
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id
        AND fund_id = v_fund_id
        AND type = 'YIELD'
        AND tx_date >= '2025-06-01'::date
        AND tx_date < ('2025-06-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0127742904,
        '2025-06-28'::date, '2025-06-28'::date,
        'COMPLETED', 'Monthly yield distribution for 2025-06',
        v_admin_id
      );

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + 0.0127742904,
          updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      RAISE NOTICE 'Created YIELD for Blondish in IND-BTC for 2025-06: 0.01277429';
    ELSE
      RAISE NOTICE 'YIELD already exists for Blondish in IND-BTC for 2025-06';
    END IF;
  ELSE
    RAISE WARNING 'Could not find investor "Blondish" or fund "IND-BTC"';
  END IF;


  -- Kabbaj - IND-BTC - 2025-06
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE (LOWER(TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))) LIKE '%kabbaj%'
    OR p.first_name || ' ' || COALESCE(p.last_name, '') ILIKE '%Kabbaj%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    -- Check if yield for this month already exists
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id
        AND fund_id = v_fund_id
        AND type = 'YIELD'
        AND tx_date >= '2025-06-01'::date
        AND tx_date < ('2025-06-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0061180243,
        '2025-06-28'::date, '2025-06-28'::date,
        'COMPLETED', 'Monthly yield distribution for 2025-06',
        v_admin_id
      );

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + 0.0061180243,
          updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      RAISE NOTICE 'Created YIELD for Kabbaj in IND-BTC for 2025-06: 0.00611802';
    ELSE
      RAISE NOTICE 'YIELD already exists for Kabbaj in IND-BTC for 2025-06';
    END IF;
  ELSE
    RAISE WARNING 'Could not find investor "Kabbaj" or fund "IND-BTC"';
  END IF;


  -- Jose Molla - IND-BTC - 2025-07
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE (LOWER(TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))) LIKE '%jose molla%'
    OR p.first_name || ' ' || COALESCE(p.last_name, '') ILIKE '%Jose Molla%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    -- Check if yield for this month already exists
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id
        AND fund_id = v_fund_id
        AND type = 'YIELD'
        AND tx_date >= '2025-07-01'::date
        AND tx_date < ('2025-07-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0133844294,
        '2025-07-28'::date, '2025-07-28'::date,
        'COMPLETED', 'Monthly yield distribution for 2025-07',
        v_admin_id
      );

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + 0.0133844294,
          updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      RAISE NOTICE 'Created YIELD for Jose Molla in IND-BTC for 2025-07: 0.01338443';
    ELSE
      RAISE NOTICE 'YIELD already exists for Jose Molla in IND-BTC for 2025-07';
    END IF;
  ELSE
    RAISE WARNING 'Could not find investor "Jose Molla" or fund "IND-BTC"';
  END IF;


  -- Matthias Reiser - IND-BTC - 2025-07
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE (LOWER(TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))) LIKE '%matthias reiser%'
    OR p.first_name || ' ' || COALESCE(p.last_name, '') ILIKE '%Matthias Reiser%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    -- Check if yield for this month already exists
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id
        AND fund_id = v_fund_id
        AND type = 'YIELD'
        AND tx_date >= '2025-07-01'::date
        AND tx_date < ('2025-07-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0178304682,
        '2025-07-28'::date, '2025-07-28'::date,
        'COMPLETED', 'Monthly yield distribution for 2025-07',
        v_admin_id
      );

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + 0.0178304682,
          updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      RAISE NOTICE 'Created YIELD for Matthias Reiser in IND-BTC for 2025-07: 0.01783047';
    ELSE
      RAISE NOTICE 'YIELD already exists for Matthias Reiser in IND-BTC for 2025-07';
    END IF;
  ELSE
    RAISE WARNING 'Could not find investor "Matthias Reiser" or fund "IND-BTC"';
  END IF;


  -- Thomas Puech - IND-BTC - 2025-07
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE (LOWER(TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))) LIKE '%thomas puech%'
    OR p.first_name || ' ' || COALESCE(p.last_name, '') ILIKE '%Thomas Puech%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    -- Check if yield for this month already exists
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id
        AND fund_id = v_fund_id
        AND type = 'YIELD'
        AND tx_date >= '2025-07-01'::date
        AND tx_date < ('2025-07-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0251606431,
        '2025-07-28'::date, '2025-07-28'::date,
        'COMPLETED', 'Monthly yield distribution for 2025-07',
        v_admin_id
      );

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + 0.0251606431,
          updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      RAISE NOTICE 'Created YIELD for Thomas Puech in IND-BTC for 2025-07: 0.02516064';
    ELSE
      RAISE NOTICE 'YIELD already exists for Thomas Puech in IND-BTC for 2025-07';
    END IF;
  ELSE
    RAISE WARNING 'Could not find investor "Thomas Puech" or fund "IND-BTC"';
  END IF;


  -- Danielle Richetta - IND-BTC - 2025-07
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE (LOWER(TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))) LIKE '%danielle richetta%'
    OR p.first_name || ' ' || COALESCE(p.last_name, '') ILIKE '%Danielle Richetta%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    -- Check if yield for this month already exists
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id
        AND fund_id = v_fund_id
        AND type = 'YIELD'
        AND tx_date >= '2025-07-01'::date
        AND tx_date < ('2025-07-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0186365597,
        '2025-07-28'::date, '2025-07-28'::date,
        'COMPLETED', 'Monthly yield distribution for 2025-07',
        v_admin_id
      );

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + 0.0186365597,
          updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      RAISE NOTICE 'Created YIELD for Danielle Richetta in IND-BTC for 2025-07: 0.01863656';
    ELSE
      RAISE NOTICE 'YIELD already exists for Danielle Richetta in IND-BTC for 2025-07';
    END IF;
  ELSE
    RAISE WARNING 'Could not find investor "Danielle Richetta" or fund "IND-BTC"';
  END IF;


  -- Nathanael Cohen - IND-BTC - 2025-07
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE (LOWER(TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))) LIKE '%nathanael cohen%'
    OR p.first_name || ' ' || COALESCE(p.last_name, '') ILIKE '%Nathanael Cohen%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    -- Check if yield for this month already exists
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id
        AND fund_id = v_fund_id
        AND type = 'YIELD'
        AND tx_date >= '2025-07-01'::date
        AND tx_date < ('2025-07-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0017597842,
        '2025-07-28'::date, '2025-07-28'::date,
        'COMPLETED', 'Monthly yield distribution for 2025-07',
        v_admin_id
      );

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + 0.0017597842,
          updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      RAISE NOTICE 'Created YIELD for Nathanael Cohen in IND-BTC for 2025-07: 0.00175978';
    ELSE
      RAISE NOTICE 'YIELD already exists for Nathanael Cohen in IND-BTC for 2025-07';
    END IF;
  ELSE
    RAISE WARNING 'Could not find investor "Nathanael Cohen" or fund "IND-BTC"';
  END IF;


  -- Blondish - IND-BTC - 2025-07
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE (LOWER(TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))) LIKE '%blondish%'
    OR p.first_name || ' ' || COALESCE(p.last_name, '') ILIKE '%Blondish%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    -- Check if yield for this month already exists
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id
        AND fund_id = v_fund_id
        AND type = 'YIELD'
        AND tx_date >= '2025-07-01'::date
        AND tx_date < ('2025-07-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0161768255,
        '2025-07-28'::date, '2025-07-28'::date,
        'COMPLETED', 'Monthly yield distribution for 2025-07',
        v_admin_id
      );

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + 0.0161768255,
          updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      RAISE NOTICE 'Created YIELD for Blondish in IND-BTC for 2025-07: 0.01617683';
    ELSE
      RAISE NOTICE 'YIELD already exists for Blondish in IND-BTC for 2025-07';
    END IF;
  ELSE
    RAISE WARNING 'Could not find investor "Blondish" or fund "IND-BTC"';
  END IF;


  -- Kabbaj - IND-BTC - 2025-07
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE (LOWER(TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))) LIKE '%kabbaj%'
    OR p.first_name || ' ' || COALESCE(p.last_name, '') ILIKE '%Kabbaj%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    -- Check if yield for this month already exists
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id
        AND fund_id = v_fund_id
        AND type = 'YIELD'
        AND tx_date >= '2025-07-01'::date
        AND tx_date < ('2025-07-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0118968106,
        '2025-07-28'::date, '2025-07-28'::date,
        'COMPLETED', 'Monthly yield distribution for 2025-07',
        v_admin_id
      );

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + 0.0118968106,
          updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      RAISE NOTICE 'Created YIELD for Kabbaj in IND-BTC for 2025-07: 0.01189681';
    ELSE
      RAISE NOTICE 'YIELD already exists for Kabbaj in IND-BTC for 2025-07';
    END IF;
  ELSE
    RAISE WARNING 'Could not find investor "Kabbaj" or fund "IND-BTC"';
  END IF;


  -- Jose Molla - IND-BTC - 2025-08
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE (LOWER(TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))) LIKE '%jose molla%'
    OR p.first_name || ' ' || COALESCE(p.last_name, '') ILIKE '%Jose Molla%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    -- Check if yield for this month already exists
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id
        AND fund_id = v_fund_id
        AND type = 'YIELD'
        AND tx_date >= '2025-08-01'::date
        AND tx_date < ('2025-08-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0088295344,
        '2025-08-28'::date, '2025-08-28'::date,
        'COMPLETED', 'Monthly yield distribution for 2025-08',
        v_admin_id
      );

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + 0.0088295344,
          updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      RAISE NOTICE 'Created YIELD for Jose Molla in IND-BTC for 2025-08: 0.00882953';
    ELSE
      RAISE NOTICE 'YIELD already exists for Jose Molla in IND-BTC for 2025-08';
    END IF;
  ELSE
    RAISE WARNING 'Could not find investor "Jose Molla" or fund "IND-BTC"';
  END IF;


  -- Matthias Reiser - IND-BTC - 2025-08
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE (LOWER(TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))) LIKE '%matthias reiser%'
    OR p.first_name || ' ' || COALESCE(p.last_name, '') ILIKE '%Matthias Reiser%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    -- Check if yield for this month already exists
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id
        AND fund_id = v_fund_id
        AND type = 'YIELD'
        AND tx_date >= '2025-08-01'::date
        AND tx_date < ('2025-08-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0117625285,
        '2025-08-28'::date, '2025-08-28'::date,
        'COMPLETED', 'Monthly yield distribution for 2025-08',
        v_admin_id
      );

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + 0.0117625285,
          updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      RAISE NOTICE 'Created YIELD for Matthias Reiser in IND-BTC for 2025-08: 0.01176253';
    ELSE
      RAISE NOTICE 'YIELD already exists for Matthias Reiser in IND-BTC for 2025-08';
    END IF;
  ELSE
    RAISE WARNING 'Could not find investor "Matthias Reiser" or fund "IND-BTC"';
  END IF;


  -- Thomas Puech - IND-BTC - 2025-08
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE (LOWER(TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))) LIKE '%thomas puech%'
    OR p.first_name || ' ' || COALESCE(p.last_name, '') ILIKE '%Thomas Puech%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    -- Check if yield for this month already exists
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id
        AND fund_id = v_fund_id
        AND type = 'YIELD'
        AND tx_date >= '2025-08-01'::date
        AND tx_date < ('2025-08-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0165981498,
        '2025-08-28'::date, '2025-08-28'::date,
        'COMPLETED', 'Monthly yield distribution for 2025-08',
        v_admin_id
      );

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + 0.0165981498,
          updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      RAISE NOTICE 'Created YIELD for Thomas Puech in IND-BTC for 2025-08: 0.01659815';
    ELSE
      RAISE NOTICE 'YIELD already exists for Thomas Puech in IND-BTC for 2025-08';
    END IF;
  ELSE
    RAISE WARNING 'Could not find investor "Thomas Puech" or fund "IND-BTC"';
  END IF;


  -- Danielle Richetta - IND-BTC - 2025-08
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE (LOWER(TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))) LIKE '%danielle richetta%'
    OR p.first_name || ' ' || COALESCE(p.last_name, '') ILIKE '%Danielle Richetta%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    -- Check if yield for this month already exists
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id
        AND fund_id = v_fund_id
        AND type = 'YIELD'
        AND tx_date >= '2025-08-01'::date
        AND tx_date < ('2025-08-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0115286299,
        '2025-08-28'::date, '2025-08-28'::date,
        'COMPLETED', 'Monthly yield distribution for 2025-08',
        v_admin_id
      );

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + 0.0115286299,
          updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      RAISE NOTICE 'Created YIELD for Danielle Richetta in IND-BTC for 2025-08: 0.01152863';
    ELSE
      RAISE NOTICE 'YIELD already exists for Danielle Richetta in IND-BTC for 2025-08';
    END IF;
  ELSE
    RAISE WARNING 'Could not find investor "Danielle Richetta" or fund "IND-BTC"';
  END IF;


  -- Nathanael Cohen - IND-BTC - 2025-08
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE (LOWER(TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))) LIKE '%nathanael cohen%'
    OR p.first_name || ' ' || COALESCE(p.last_name, '') ILIKE '%Nathanael Cohen%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    -- Check if yield for this month already exists
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id
        AND fund_id = v_fund_id
        AND type = 'YIELD'
        AND tx_date >= '2025-08-01'::date
        AND tx_date < ('2025-08-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0011649980,
        '2025-08-28'::date, '2025-08-28'::date,
        'COMPLETED', 'Monthly yield distribution for 2025-08',
        v_admin_id
      );

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + 0.0011649980,
          updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      RAISE NOTICE 'Created YIELD for Nathanael Cohen in IND-BTC for 2025-08: 0.00116500';
    ELSE
      RAISE NOTICE 'YIELD already exists for Nathanael Cohen in IND-BTC for 2025-08';
    END IF;
  ELSE
    RAISE WARNING 'Could not find investor "Nathanael Cohen" or fund "IND-BTC"';
  END IF;


  -- Blondish - IND-BTC - 2025-08
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE (LOWER(TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))) LIKE '%blondish%'
    OR p.first_name || ' ' || COALESCE(p.last_name, '') ILIKE '%Blondish%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    -- Check if yield for this month already exists
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id
        AND fund_id = v_fund_id
        AND type = 'YIELD'
        AND tx_date >= '2025-08-01'::date
        AND tx_date < ('2025-08-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0107092496,
        '2025-08-28'::date, '2025-08-28'::date,
        'COMPLETED', 'Monthly yield distribution for 2025-08',
        v_admin_id
      );

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + 0.0107092496,
          updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      RAISE NOTICE 'Created YIELD for Blondish in IND-BTC for 2025-08: 0.01070925';
    ELSE
      RAISE NOTICE 'YIELD already exists for Blondish in IND-BTC for 2025-08';
    END IF;
  ELSE
    RAISE WARNING 'Could not find investor "Blondish" or fund "IND-BTC"';
  END IF;


  -- Kabbaj - IND-BTC - 2025-08
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE (LOWER(TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))) LIKE '%kabbaj%'
    OR p.first_name || ' ' || COALESCE(p.last_name, '') ILIKE '%Kabbaj%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    -- Check if yield for this month already exists
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id
        AND fund_id = v_fund_id
        AND type = 'YIELD'
        AND tx_date >= '2025-08-01'::date
        AND tx_date < ('2025-08-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0095501549,
        '2025-08-28'::date, '2025-08-28'::date,
        'COMPLETED', 'Monthly yield distribution for 2025-08',
        v_admin_id
      );

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + 0.0095501549,
          updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      RAISE NOTICE 'Created YIELD for Kabbaj in IND-BTC for 2025-08: 0.00955015';
    ELSE
      RAISE NOTICE 'YIELD already exists for Kabbaj in IND-BTC for 2025-08';
    END IF;
  ELSE
    RAISE WARNING 'Could not find investor "Kabbaj" or fund "IND-BTC"';
  END IF;


  -- Jose Molla - IND-BTC - 2025-09
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE (LOWER(TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))) LIKE '%jose molla%'
    OR p.first_name || ' ' || COALESCE(p.last_name, '') ILIKE '%Jose Molla%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    -- Check if yield for this month already exists
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id
        AND fund_id = v_fund_id
        AND type = 'YIELD'
        AND tx_date >= '2025-09-01'::date
        AND tx_date < ('2025-09-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0109960123,
        '2025-09-28'::date, '2025-09-28'::date,
        'COMPLETED', 'Monthly yield distribution for 2025-09',
        v_admin_id
      );

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + 0.0109960123,
          updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      RAISE NOTICE 'Created YIELD for Jose Molla in IND-BTC for 2025-09: 0.01099601';
    ELSE
      RAISE NOTICE 'YIELD already exists for Jose Molla in IND-BTC for 2025-09';
    END IF;
  ELSE
    RAISE WARNING 'Could not find investor "Jose Molla" or fund "IND-BTC"';
  END IF;


  -- Matthias Reiser - IND-BTC - 2025-09
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE (LOWER(TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))) LIKE '%matthias reiser%'
    OR p.first_name || ' ' || COALESCE(p.last_name, '') ILIKE '%Matthias Reiser%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    -- Check if yield for this month already exists
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id
        AND fund_id = v_fund_id
        AND type = 'YIELD'
        AND tx_date >= '2025-09-01'::date
        AND tx_date < ('2025-09-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0146486669,
        '2025-09-28'::date, '2025-09-28'::date,
        'COMPLETED', 'Monthly yield distribution for 2025-09',
        v_admin_id
      );

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + 0.0146486669,
          updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      RAISE NOTICE 'Created YIELD for Matthias Reiser in IND-BTC for 2025-09: 0.01464867';
    ELSE
      RAISE NOTICE 'YIELD already exists for Matthias Reiser in IND-BTC for 2025-09';
    END IF;
  ELSE
    RAISE WARNING 'Could not find investor "Matthias Reiser" or fund "IND-BTC"';
  END IF;


  -- Thomas Puech - IND-BTC - 2025-09
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE (LOWER(TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))) LIKE '%thomas puech%'
    OR p.first_name || ' ' || COALESCE(p.last_name, '') ILIKE '%Thomas Puech%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    -- Check if yield for this month already exists
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id
        AND fund_id = v_fund_id
        AND type = 'YIELD'
        AND tx_date >= '2025-09-01'::date
        AND tx_date < ('2025-09-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0206707909,
        '2025-09-28'::date, '2025-09-28'::date,
        'COMPLETED', 'Monthly yield distribution for 2025-09',
        v_admin_id
      );

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + 0.0206707909,
          updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      RAISE NOTICE 'Created YIELD for Thomas Puech in IND-BTC for 2025-09: 0.02067079';
    ELSE
      RAISE NOTICE 'YIELD already exists for Thomas Puech in IND-BTC for 2025-09';
    END IF;
  ELSE
    RAISE WARNING 'Could not find investor "Thomas Puech" or fund "IND-BTC"';
  END IF;


  -- Danielle Richetta - IND-BTC - 2025-09
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE (LOWER(TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))) LIKE '%danielle richetta%'
    OR p.first_name || ' ' || COALESCE(p.last_name, '') ILIKE '%Danielle Richetta%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    -- Check if yield for this month already exists
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id
        AND fund_id = v_fund_id
        AND type = 'YIELD'
        AND tx_date >= '2025-09-01'::date
        AND tx_date < ('2025-09-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0143835134,
        '2025-09-28'::date, '2025-09-28'::date,
        'COMPLETED', 'Monthly yield distribution for 2025-09',
        v_admin_id
      );

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + 0.0143835134,
          updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      RAISE NOTICE 'Created YIELD for Danielle Richetta in IND-BTC for 2025-09: 0.01438351';
    ELSE
      RAISE NOTICE 'YIELD already exists for Danielle Richetta in IND-BTC for 2025-09';
    END IF;
  ELSE
    RAISE WARNING 'Could not find investor "Danielle Richetta" or fund "IND-BTC"';
  END IF;


  -- Nathanael Cohen - IND-BTC - 2025-09
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE (LOWER(TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))) LIKE '%nathanael cohen%'
    OR p.first_name || ' ' || COALESCE(p.last_name, '') ILIKE '%Nathanael Cohen%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    -- Check if yield for this month already exists
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id
        AND fund_id = v_fund_id
        AND type = 'YIELD'
        AND tx_date >= '2025-09-01'::date
        AND tx_date < ('2025-09-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0014545444,
        '2025-09-28'::date, '2025-09-28'::date,
        'COMPLETED', 'Monthly yield distribution for 2025-09',
        v_admin_id
      );

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + 0.0014545444,
          updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      RAISE NOTICE 'Created YIELD for Nathanael Cohen in IND-BTC for 2025-09: 0.00145454';
    ELSE
      RAISE NOTICE 'YIELD already exists for Nathanael Cohen in IND-BTC for 2025-09';
    END IF;
  ELSE
    RAISE WARNING 'Could not find investor "Nathanael Cohen" or fund "IND-BTC"';
  END IF;


  -- Blondish - IND-BTC - 2025-09
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE (LOWER(TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))) LIKE '%blondish%'
    OR p.first_name || ' ' || COALESCE(p.last_name, '') ILIKE '%Blondish%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    -- Check if yield for this month already exists
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id
        AND fund_id = v_fund_id
        AND type = 'YIELD'
        AND tx_date >= '2025-09-01'::date
        AND tx_date < ('2025-09-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0133709063,
        '2025-09-28'::date, '2025-09-28'::date,
        'COMPLETED', 'Monthly yield distribution for 2025-09',
        v_admin_id
      );

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + 0.0133709063,
          updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      RAISE NOTICE 'Created YIELD for Blondish in IND-BTC for 2025-09: 0.01337091';
    ELSE
      RAISE NOTICE 'YIELD already exists for Blondish in IND-BTC for 2025-09';
    END IF;
  ELSE
    RAISE WARNING 'Could not find investor "Blondish" or fund "IND-BTC"';
  END IF;


  -- Kabbaj - IND-BTC - 2025-09
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE (LOWER(TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))) LIKE '%kabbaj%'
    OR p.first_name || ' ' || COALESCE(p.last_name, '') ILIKE '%Kabbaj%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    -- Check if yield for this month already exists
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id
        AND fund_id = v_fund_id
        AND type = 'YIELD'
        AND tx_date >= '2025-09-01'::date
        AND tx_date < ('2025-09-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0143606557,
        '2025-09-28'::date, '2025-09-28'::date,
        'COMPLETED', 'Monthly yield distribution for 2025-09',
        v_admin_id
      );

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + 0.0143606557,
          updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      RAISE NOTICE 'Created YIELD for Kabbaj in IND-BTC for 2025-09: 0.01436066';
    ELSE
      RAISE NOTICE 'YIELD already exists for Kabbaj in IND-BTC for 2025-09';
    END IF;
  ELSE
    RAISE WARNING 'Could not find investor "Kabbaj" or fund "IND-BTC"';
  END IF;


  -- Jose Molla - IND-BTC - 2025-10
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE (LOWER(TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))) LIKE '%jose molla%'
    OR p.first_name || ' ' || COALESCE(p.last_name, '') ILIKE '%Jose Molla%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    -- Check if yield for this month already exists
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id
        AND fund_id = v_fund_id
        AND type = 'YIELD'
        AND tx_date >= '2025-10-01'::date
        AND tx_date < ('2025-10-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0100436405,
        '2025-10-28'::date, '2025-10-28'::date,
        'COMPLETED', 'Monthly yield distribution for 2025-10',
        v_admin_id
      );

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + 0.0100436405,
          updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      RAISE NOTICE 'Created YIELD for Jose Molla in IND-BTC for 2025-10: 0.01004364';
    ELSE
      RAISE NOTICE 'YIELD already exists for Jose Molla in IND-BTC for 2025-10';
    END IF;
  ELSE
    RAISE WARNING 'Could not find investor "Jose Molla" or fund "IND-BTC"';
  END IF;


  -- Matthias Reiser - IND-BTC - 2025-10
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE (LOWER(TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))) LIKE '%matthias reiser%'
    OR p.first_name || ' ' || COALESCE(p.last_name, '') ILIKE '%Matthias Reiser%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    -- Check if yield for this month already exists
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id
        AND fund_id = v_fund_id
        AND type = 'YIELD'
        AND tx_date >= '2025-10-01'::date
        AND tx_date < ('2025-10-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0125379384,
        '2025-10-28'::date, '2025-10-28'::date,
        'COMPLETED', 'Monthly yield distribution for 2025-10',
        v_admin_id
      );

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + 0.0125379384,
          updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      RAISE NOTICE 'Created YIELD for Matthias Reiser in IND-BTC for 2025-10: 0.01253794';
    ELSE
      RAISE NOTICE 'YIELD already exists for Matthias Reiser in IND-BTC for 2025-10';
    END IF;
  ELSE
    RAISE WARNING 'Could not find investor "Matthias Reiser" or fund "IND-BTC"';
  END IF;


  -- Thomas Puech - IND-BTC - 2025-10
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE (LOWER(TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))) LIKE '%thomas puech%'
    OR p.first_name || ' ' || COALESCE(p.last_name, '') ILIKE '%Thomas Puech%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    -- Check if yield for this month already exists
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id
        AND fund_id = v_fund_id
        AND type = 'YIELD'
        AND tx_date >= '2025-10-01'::date
        AND tx_date < ('2025-10-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0176923338,
        '2025-10-28'::date, '2025-10-28'::date,
        'COMPLETED', 'Monthly yield distribution for 2025-10',
        v_admin_id
      );

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + 0.0176923338,
          updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      RAISE NOTICE 'Created YIELD for Thomas Puech in IND-BTC for 2025-10: 0.01769233';
    ELSE
      RAISE NOTICE 'YIELD already exists for Thomas Puech in IND-BTC for 2025-10';
    END IF;
  ELSE
    RAISE WARNING 'Could not find investor "Thomas Puech" or fund "IND-BTC"';
  END IF;


  -- Danielle Richetta - IND-BTC - 2025-10
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE (LOWER(TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))) LIKE '%danielle richetta%'
    OR p.first_name || ' ' || COALESCE(p.last_name, '') ILIKE '%Danielle Richetta%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    -- Check if yield for this month already exists
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id
        AND fund_id = v_fund_id
        AND type = 'YIELD'
        AND tx_date >= '2025-10-01'::date
        AND tx_date < ('2025-10-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0123109909,
        '2025-10-28'::date, '2025-10-28'::date,
        'COMPLETED', 'Monthly yield distribution for 2025-10',
        v_admin_id
      );

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + 0.0123109909,
          updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      RAISE NOTICE 'Created YIELD for Danielle Richetta in IND-BTC for 2025-10: 0.01231099';
    ELSE
      RAISE NOTICE 'YIELD already exists for Danielle Richetta in IND-BTC for 2025-10';
    END IF;
  ELSE
    RAISE WARNING 'Could not find investor "Danielle Richetta" or fund "IND-BTC"';
  END IF;


  -- Nathanael Cohen - IND-BTC - 2025-10
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE (LOWER(TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))) LIKE '%nathanael cohen%'
    OR p.first_name || ' ' || COALESCE(p.last_name, '') ILIKE '%Nathanael Cohen%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    -- Check if yield for this month already exists
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id
        AND fund_id = v_fund_id
        AND type = 'YIELD'
        AND tx_date >= '2025-10-01'::date
        AND tx_date < ('2025-10-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0012491916,
        '2025-10-28'::date, '2025-10-28'::date,
        'COMPLETED', 'Monthly yield distribution for 2025-10',
        v_admin_id
      );

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + 0.0012491916,
          updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      RAISE NOTICE 'Created YIELD for Nathanael Cohen in IND-BTC for 2025-10: 0.00124919';
    ELSE
      RAISE NOTICE 'YIELD already exists for Nathanael Cohen in IND-BTC for 2025-10';
    END IF;
  ELSE
    RAISE WARNING 'Could not find investor "Nathanael Cohen" or fund "IND-BTC"';
  END IF;


  -- Blondish - IND-BTC - 2025-10
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE (LOWER(TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))) LIKE '%blondish%'
    OR p.first_name || ' ' || COALESCE(p.last_name, '') ILIKE '%Blondish%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    -- Check if yield for this month already exists
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id
        AND fund_id = v_fund_id
        AND type = 'YIELD'
        AND tx_date >= '2025-10-01'::date
        AND tx_date < ('2025-10-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0114832001,
        '2025-10-28'::date, '2025-10-28'::date,
        'COMPLETED', 'Monthly yield distribution for 2025-10',
        v_admin_id
      );

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + 0.0114832001,
          updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      RAISE NOTICE 'Created YIELD for Blondish in IND-BTC for 2025-10: 0.01148320';
    ELSE
      RAISE NOTICE 'YIELD already exists for Blondish in IND-BTC for 2025-10';
    END IF;
  ELSE
    RAISE WARNING 'Could not find investor "Blondish" or fund "IND-BTC"';
  END IF;


  -- Kabbaj - IND-BTC - 2025-10
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE (LOWER(TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))) LIKE '%kabbaj%'
    OR p.first_name || ' ' || COALESCE(p.last_name, '') ILIKE '%Kabbaj%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    -- Check if yield for this month already exists
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id
        AND fund_id = v_fund_id
        AND type = 'YIELD'
        AND tx_date >= '2025-10-01'::date
        AND tx_date < ('2025-10-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0122914268,
        '2025-10-28'::date, '2025-10-28'::date,
        'COMPLETED', 'Monthly yield distribution for 2025-10',
        v_admin_id
      );

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + 0.0122914268,
          updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      RAISE NOTICE 'Created YIELD for Kabbaj in IND-BTC for 2025-10: 0.01229143';
    ELSE
      RAISE NOTICE 'YIELD already exists for Kabbaj in IND-BTC for 2025-10';
    END IF;
  ELSE
    RAISE WARNING 'Could not find investor "Kabbaj" or fund "IND-BTC"';
  END IF;


  -- Paul Johnson - IND-BTC - 2025-10
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE (LOWER(TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))) LIKE '%paul johnson%'
    OR p.first_name || ' ' || COALESCE(p.last_name, '') ILIKE '%Paul Johnson%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    -- Check if yield for this month already exists
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id
        AND fund_id = v_fund_id
        AND type = 'YIELD'
        AND tx_date >= '2025-10-01'::date
        AND tx_date < ('2025-10-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0011932237,
        '2025-10-28'::date, '2025-10-28'::date,
        'COMPLETED', 'Monthly yield distribution for 2025-10',
        v_admin_id
      );

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + 0.0011932237,
          updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      RAISE NOTICE 'Created YIELD for Paul Johnson in IND-BTC for 2025-10: 0.00119322';
    ELSE
      RAISE NOTICE 'YIELD already exists for Paul Johnson in IND-BTC for 2025-10';
    END IF;
  ELSE
    RAISE WARNING 'Could not find investor "Paul Johnson" or fund "IND-BTC"';
  END IF;


  -- Jose Molla - IND-BTC - 2025-11
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE (LOWER(TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))) LIKE '%jose molla%'
    OR p.first_name || ' ' || COALESCE(p.last_name, '') ILIKE '%Jose Molla%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    -- Check if yield for this month already exists
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id
        AND fund_id = v_fund_id
        AND type = 'YIELD'
        AND tx_date >= '2025-11-01'::date
        AND tx_date < ('2025-11-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0103186312,
        '2025-11-28'::date, '2025-11-28'::date,
        'COMPLETED', 'Monthly yield distribution for 2025-11',
        v_admin_id
      );

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + 0.0103186312,
          updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      RAISE NOTICE 'Created YIELD for Jose Molla in IND-BTC for 2025-11: 0.01031863';
    ELSE
      RAISE NOTICE 'YIELD already exists for Jose Molla in IND-BTC for 2025-11';
    END IF;
  ELSE
    RAISE WARNING 'Could not find investor "Jose Molla" or fund "IND-BTC"';
  END IF;


  -- Matthias Reiser - IND-BTC - 2025-11
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE (LOWER(TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))) LIKE '%matthias reiser%'
    OR p.first_name || ' ' || COALESCE(p.last_name, '') ILIKE '%Matthias Reiser%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    -- Check if yield for this month already exists
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id
        AND fund_id = v_fund_id
        AND type = 'YIELD'
        AND tx_date >= '2025-11-01'::date
        AND tx_date < ('2025-11-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0113228859,
        '2025-11-28'::date, '2025-11-28'::date,
        'COMPLETED', 'Monthly yield distribution for 2025-11',
        v_admin_id
      );

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + 0.0113228859,
          updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      RAISE NOTICE 'Created YIELD for Matthias Reiser in IND-BTC for 2025-11: 0.01132289';
    ELSE
      RAISE NOTICE 'YIELD already exists for Matthias Reiser in IND-BTC for 2025-11';
    END IF;
  ELSE
    RAISE WARNING 'Could not find investor "Matthias Reiser" or fund "IND-BTC"';
  END IF;


  -- Thomas Puech - IND-BTC - 2025-11
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE (LOWER(TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))) LIKE '%thomas puech%'
    OR p.first_name || ' ' || COALESCE(p.last_name, '') ILIKE '%Thomas Puech%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    -- Check if yield for this month already exists
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id
        AND fund_id = v_fund_id
        AND type = 'YIELD'
        AND tx_date >= '2025-11-01'::date
        AND tx_date < ('2025-11-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0159777685,
        '2025-11-28'::date, '2025-11-28'::date,
        'COMPLETED', 'Monthly yield distribution for 2025-11',
        v_admin_id
      );

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + 0.0159777685,
          updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      RAISE NOTICE 'Created YIELD for Thomas Puech in IND-BTC for 2025-11: 0.01597777';
    ELSE
      RAISE NOTICE 'YIELD already exists for Thomas Puech in IND-BTC for 2025-11';
    END IF;
  ELSE
    RAISE WARNING 'Could not find investor "Thomas Puech" or fund "IND-BTC"';
  END IF;


  -- Danielle Richetta - IND-BTC - 2025-11
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE (LOWER(TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))) LIKE '%danielle richetta%'
    OR p.first_name || ' ' || COALESCE(p.last_name, '') ILIKE '%Danielle Richetta%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    -- Check if yield for this month already exists
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id
        AND fund_id = v_fund_id
        AND type = 'YIELD'
        AND tx_date >= '2025-11-01'::date
        AND tx_date < ('2025-11-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0104982913,
        '2025-11-28'::date, '2025-11-28'::date,
        'COMPLETED', 'Monthly yield distribution for 2025-11',
        v_admin_id
      );

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + 0.0104982913,
          updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      RAISE NOTICE 'Created YIELD for Danielle Richetta in IND-BTC for 2025-11: 0.01049829';
    ELSE
      RAISE NOTICE 'YIELD already exists for Danielle Richetta in IND-BTC for 2025-11';
    END IF;
  ELSE
    RAISE WARNING 'Could not find investor "Danielle Richetta" or fund "IND-BTC"';
  END IF;


  -- Nathanael Cohen - IND-BTC - 2025-11
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE (LOWER(TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))) LIKE '%nathanael cohen%'
    OR p.first_name || ' ' || COALESCE(p.last_name, '') ILIKE '%Nathanael Cohen%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    -- Check if yield for this month already exists
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id
        AND fund_id = v_fund_id
        AND type = 'YIELD'
        AND tx_date >= '2025-11-01'::date
        AND tx_date < ('2025-11-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0011315135,
        '2025-11-28'::date, '2025-11-28'::date,
        'COMPLETED', 'Monthly yield distribution for 2025-11',
        v_admin_id
      );

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + 0.0011315135,
          updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      RAISE NOTICE 'Created YIELD for Nathanael Cohen in IND-BTC for 2025-11: 0.00113151';
    ELSE
      RAISE NOTICE 'YIELD already exists for Nathanael Cohen in IND-BTC for 2025-11';
    END IF;
  ELSE
    RAISE WARNING 'Could not find investor "Nathanael Cohen" or fund "IND-BTC"';
  END IF;


  -- Blondish - IND-BTC - 2025-11
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE (LOWER(TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))) LIKE '%blondish%'
    OR p.first_name || ' ' || COALESCE(p.last_name, '') ILIKE '%Blondish%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    -- Check if yield for this month already exists
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id
        AND fund_id = v_fund_id
        AND type = 'YIELD'
        AND tx_date >= '2025-11-01'::date
        AND tx_date < ('2025-11-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0104014431,
        '2025-11-28'::date, '2025-11-28'::date,
        'COMPLETED', 'Monthly yield distribution for 2025-11',
        v_admin_id
      );

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + 0.0104014431,
          updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      RAISE NOTICE 'Created YIELD for Blondish in IND-BTC for 2025-11: 0.01040144';
    ELSE
      RAISE NOTICE 'YIELD already exists for Blondish in IND-BTC for 2025-11';
    END IF;
  ELSE
    RAISE WARNING 'Could not find investor "Blondish" or fund "IND-BTC"';
  END IF;


  -- Kabbaj - IND-BTC - 2025-11
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE (LOWER(TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))) LIKE '%kabbaj%'
    OR p.first_name || ' ' || COALESCE(p.last_name, '') ILIKE '%Kabbaj%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    -- Check if yield for this month already exists
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id
        AND fund_id = v_fund_id
        AND type = 'YIELD'
        AND tx_date >= '2025-11-01'::date
        AND tx_date < ('2025-11-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0111002638,
        '2025-11-28'::date, '2025-11-28'::date,
        'COMPLETED', 'Monthly yield distribution for 2025-11',
        v_admin_id
      );

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + 0.0111002638,
          updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      RAISE NOTICE 'Created YIELD for Kabbaj in IND-BTC for 2025-11: 0.01110026';
    ELSE
      RAISE NOTICE 'YIELD already exists for Kabbaj in IND-BTC for 2025-11';
    END IF;
  ELSE
    RAISE WARNING 'Could not find investor "Kabbaj" or fund "IND-BTC"';
  END IF;


  -- Sam Johnson - IND-BTC - 2025-11
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE (LOWER(TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))) LIKE '%sam johnson%'
    OR p.first_name || ' ' || COALESCE(p.last_name, '') ILIKE '%Sam Johnson%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    -- Check if yield for this month already exists
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id
        AND fund_id = v_fund_id
        AND type = 'YIELD'
        AND tx_date >= '2025-11-01'::date
        AND tx_date < ('2025-11-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0030390041,
        '2025-11-28'::date, '2025-11-28'::date,
        'COMPLETED', 'Monthly yield distribution for 2025-11',
        v_admin_id
      );

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + 0.0030390041,
          updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      RAISE NOTICE 'Created YIELD for Sam Johnson in IND-BTC for 2025-11: 0.00303900';
    ELSE
      RAISE NOTICE 'YIELD already exists for Sam Johnson in IND-BTC for 2025-11';
    END IF;
  ELSE
    RAISE WARNING 'Could not find investor "Sam Johnson" or fund "IND-BTC"';
  END IF;


  -- Nath & Thomas - IND-BTC - 2025-11
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE (LOWER(TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))) LIKE '%nath & thomas%'
    OR p.first_name || ' ' || COALESCE(p.last_name, '') ILIKE '%Nath & Thomas%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    -- Check if yield for this month already exists
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id
        AND fund_id = v_fund_id
        AND type = 'YIELD'
        AND tx_date >= '2025-11-01'::date
        AND tx_date < ('2025-11-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0002601062,
        '2025-11-28'::date, '2025-11-28'::date,
        'COMPLETED', 'Monthly yield distribution for 2025-11',
        v_admin_id
      );

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + 0.0002601062,
          updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      RAISE NOTICE 'Created YIELD for Nath & Thomas in IND-BTC for 2025-11: 0.00026011';
    ELSE
      RAISE NOTICE 'YIELD already exists for Nath & Thomas in IND-BTC for 2025-11';
    END IF;
  ELSE
    RAISE WARNING 'Could not find investor "Nath & Thomas" or fund "IND-BTC"';
  END IF;


  -- Jose Molla - IND-BTC - 2025-12
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE (LOWER(TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))) LIKE '%jose molla%'
    OR p.first_name || ' ' || COALESCE(p.last_name, '') ILIKE '%Jose Molla%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    -- Check if yield for this month already exists
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id
        AND fund_id = v_fund_id
        AND type = 'YIELD'
        AND tx_date >= '2025-12-01'::date
        AND tx_date < ('2025-12-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0108104654,
        '2025-12-28'::date, '2025-12-28'::date,
        'COMPLETED', 'Monthly yield distribution for 2025-12',
        v_admin_id
      );

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + 0.0108104654,
          updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      RAISE NOTICE 'Created YIELD for Jose Molla in IND-BTC for 2025-12: 0.01081047';
    ELSE
      RAISE NOTICE 'YIELD already exists for Jose Molla in IND-BTC for 2025-12';
    END IF;
  ELSE
    RAISE WARNING 'Could not find investor "Jose Molla" or fund "IND-BTC"';
  END IF;


  -- Matthias Reiser - IND-BTC - 2025-12
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE (LOWER(TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))) LIKE '%matthias reiser%'
    OR p.first_name || ' ' || COALESCE(p.last_name, '') ILIKE '%Matthias Reiser%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    -- Check if yield for this month already exists
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id
        AND fund_id = v_fund_id
        AND type = 'YIELD'
        AND tx_date >= '2025-12-01'::date
        AND tx_date < ('2025-12-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0095714130,
        '2025-12-28'::date, '2025-12-28'::date,
        'COMPLETED', 'Monthly yield distribution for 2025-12',
        v_admin_id
      );

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + 0.0095714130,
          updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      RAISE NOTICE 'Created YIELD for Matthias Reiser in IND-BTC for 2025-12: 0.00957141';
    ELSE
      RAISE NOTICE 'YIELD already exists for Matthias Reiser in IND-BTC for 2025-12';
    END IF;
  ELSE
    RAISE WARNING 'Could not find investor "Matthias Reiser" or fund "IND-BTC"';
  END IF;


  -- Thomas Puech - IND-BTC - 2025-12
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE (LOWER(TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))) LIKE '%thomas puech%'
    OR p.first_name || ' ' || COALESCE(p.last_name, '') ILIKE '%Thomas Puech%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    -- Check if yield for this month already exists
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id
        AND fund_id = v_fund_id
        AND type = 'YIELD'
        AND tx_date >= '2025-12-01'::date
        AND tx_date < ('2025-12-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0160161365,
        '2025-12-28'::date, '2025-12-28'::date,
        'COMPLETED', 'Monthly yield distribution for 2025-12',
        v_admin_id
      );

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + 0.0160161365,
          updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      RAISE NOTICE 'Created YIELD for Thomas Puech in IND-BTC for 2025-12: 0.01601614';
    ELSE
      RAISE NOTICE 'YIELD already exists for Thomas Puech in IND-BTC for 2025-12';
    END IF;
  ELSE
    RAISE WARNING 'Could not find investor "Thomas Puech" or fund "IND-BTC"';
  END IF;


  -- Danielle Richetta - IND-BTC - 2025-12
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE (LOWER(TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))) LIKE '%danielle richetta%'
    OR p.first_name || ' ' || COALESCE(p.last_name, '') ILIKE '%Danielle Richetta%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    -- Check if yield for this month already exists
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id
        AND fund_id = v_fund_id
        AND type = 'YIELD'
        AND tx_date >= '2025-12-01'::date
        AND tx_date < ('2025-12-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0096273331,
        '2025-12-28'::date, '2025-12-28'::date,
        'COMPLETED', 'Monthly yield distribution for 2025-12',
        v_admin_id
      );

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + 0.0096273331,
          updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      RAISE NOTICE 'Created YIELD for Danielle Richetta in IND-BTC for 2025-12: 0.00962733';
    ELSE
      RAISE NOTICE 'YIELD already exists for Danielle Richetta in IND-BTC for 2025-12';
    END IF;
  ELSE
    RAISE WARNING 'Could not find investor "Danielle Richetta" or fund "IND-BTC"';
  END IF;


  -- Nathanael Cohen - IND-BTC - 2025-12
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE (LOWER(TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))) LIKE '%nathanael cohen%'
    OR p.first_name || ' ' || COALESCE(p.last_name, '') ILIKE '%Nathanael Cohen%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    -- Check if yield for this month already exists
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id
        AND fund_id = v_fund_id
        AND type = 'YIELD'
        AND tx_date >= '2025-12-01'::date
        AND tx_date < ('2025-12-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0010399662,
        '2025-12-28'::date, '2025-12-28'::date,
        'COMPLETED', 'Monthly yield distribution for 2025-12',
        v_admin_id
      );

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + 0.0010399662,
          updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      RAISE NOTICE 'Created YIELD for Nathanael Cohen in IND-BTC for 2025-12: 0.00103997';
    ELSE
      RAISE NOTICE 'YIELD already exists for Nathanael Cohen in IND-BTC for 2025-12';
    END IF;
  ELSE
    RAISE WARNING 'Could not find investor "Nathanael Cohen" or fund "IND-BTC"';
  END IF;


  -- Blondish - IND-BTC - 2025-12
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE (LOWER(TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))) LIKE '%blondish%'
    OR p.first_name || ' ' || COALESCE(p.last_name, '') ILIKE '%Blondish%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    -- Check if yield for this month already exists
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id
        AND fund_id = v_fund_id
        AND type = 'YIELD'
        AND tx_date >= '2025-12-01'::date
        AND tx_date < ('2025-12-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0095598942,
        '2025-12-28'::date, '2025-12-28'::date,
        'COMPLETED', 'Monthly yield distribution for 2025-12',
        v_admin_id
      );

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + 0.0095598942,
          updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      RAISE NOTICE 'Created YIELD for Blondish in IND-BTC for 2025-12: 0.00955989';
    ELSE
      RAISE NOTICE 'YIELD already exists for Blondish in IND-BTC for 2025-12';
    END IF;
  ELSE
    RAISE WARNING 'Could not find investor "Blondish" or fund "IND-BTC"';
  END IF;


  -- Kabbaj - IND-BTC - 2025-12
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE (LOWER(TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))) LIKE '%kabbaj%'
    OR p.first_name || ' ' || COALESCE(p.last_name, '') ILIKE '%Kabbaj%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    -- Check if yield for this month already exists
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id
        AND fund_id = v_fund_id
        AND type = 'YIELD'
        AND tx_date >= '2025-12-01'::date
        AND tx_date < ('2025-12-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0101783404,
        '2025-12-28'::date, '2025-12-28'::date,
        'COMPLETED', 'Monthly yield distribution for 2025-12',
        v_admin_id
      );

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + 0.0101783404,
          updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      RAISE NOTICE 'Created YIELD for Kabbaj in IND-BTC for 2025-12: 0.01017834';
    ELSE
      RAISE NOTICE 'YIELD already exists for Kabbaj in IND-BTC for 2025-12';
    END IF;
  ELSE
    RAISE WARNING 'Could not find investor "Kabbaj" or fund "IND-BTC"';
  END IF;


  -- Sam Johnson - IND-BTC - 2025-12
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE (LOWER(TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))) LIKE '%sam johnson%'
    OR p.first_name || ' ' || COALESCE(p.last_name, '') ILIKE '%Sam Johnson%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    -- Check if yield for this month already exists
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id
        AND fund_id = v_fund_id
        AND type = 'YIELD'
        AND tx_date >= '2025-12-01'::date
        AND tx_date < ('2025-12-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0153293346,
        '2025-12-28'::date, '2025-12-28'::date,
        'COMPLETED', 'Monthly yield distribution for 2025-12',
        v_admin_id
      );

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + 0.0153293346,
          updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      RAISE NOTICE 'Created YIELD for Sam Johnson in IND-BTC for 2025-12: 0.01532933';
    ELSE
      RAISE NOTICE 'YIELD already exists for Sam Johnson in IND-BTC for 2025-12';
    END IF;
  ELSE
    RAISE WARNING 'Could not find investor "Sam Johnson" or fund "IND-BTC"';
  END IF;


  -- Nath & Thomas - IND-BTC - 2025-12
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE (LOWER(TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))) LIKE '%nath & thomas%'
    OR p.first_name || ' ' || COALESCE(p.last_name, '') ILIKE '%Nath & Thomas%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    -- Check if yield for this month already exists
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id
        AND fund_id = v_fund_id
        AND type = 'YIELD'
        AND tx_date >= '2025-12-01'::date
        AND tx_date < ('2025-12-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0022495121,
        '2025-12-28'::date, '2025-12-28'::date,
        'COMPLETED', 'Monthly yield distribution for 2025-12',
        v_admin_id
      );

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + 0.0022495121,
          updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      RAISE NOTICE 'Created YIELD for Nath & Thomas in IND-BTC for 2025-12: 0.00224951';
    ELSE
      RAISE NOTICE 'YIELD already exists for Nath & Thomas in IND-BTC for 2025-12';
    END IF;
  ELSE
    RAISE WARNING 'Could not find investor "Nath & Thomas" or fund "IND-BTC"';
  END IF;


  -- Jose Molla - IND-BTC - 2026-01
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE (LOWER(TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))) LIKE '%jose molla%'
    OR p.first_name || ' ' || COALESCE(p.last_name, '') ILIKE '%Jose Molla%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    -- Check if yield for this month already exists
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id
        AND fund_id = v_fund_id
        AND type = 'YIELD'
        AND tx_date >= '2026-01-01'::date
        AND tx_date < ('2026-01-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0100955001,
        '2026-01-28'::date, '2026-01-28'::date,
        'COMPLETED', 'Monthly yield distribution for 2026-01',
        v_admin_id
      );

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + 0.0100955001,
          updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      RAISE NOTICE 'Created YIELD for Jose Molla in IND-BTC for 2026-01: 0.01009550';
    ELSE
      RAISE NOTICE 'YIELD already exists for Jose Molla in IND-BTC for 2026-01';
    END IF;
  ELSE
    RAISE WARNING 'Could not find investor "Jose Molla" or fund "IND-BTC"';
  END IF;


  -- Thomas Puech - IND-BTC - 2026-01
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE (LOWER(TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))) LIKE '%thomas puech%'
    OR p.first_name || ' ' || COALESCE(p.last_name, '') ILIKE '%Thomas Puech%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    -- Check if yield for this month already exists
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id
        AND fund_id = v_fund_id
        AND type = 'YIELD'
        AND tx_date >= '2026-01-01'::date
        AND tx_date < ('2026-01-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0160320093,
        '2026-01-28'::date, '2026-01-28'::date,
        'COMPLETED', 'Monthly yield distribution for 2026-01',
        v_admin_id
      );

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + 0.0160320093,
          updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      RAISE NOTICE 'Created YIELD for Thomas Puech in IND-BTC for 2026-01: 0.01603201';
    ELSE
      RAISE NOTICE 'YIELD already exists for Thomas Puech in IND-BTC for 2026-01';
    END IF;
  ELSE
    RAISE WARNING 'Could not find investor "Thomas Puech" or fund "IND-BTC"';
  END IF;


  -- Danielle Richetta - IND-BTC - 2026-01
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE (LOWER(TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))) LIKE '%danielle richetta%'
    OR p.first_name || ' ' || COALESCE(p.last_name, '') ILIKE '%Danielle Richetta%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    -- Check if yield for this month already exists
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id
        AND fund_id = v_fund_id
        AND type = 'YIELD'
        AND tx_date >= '2026-01-01'::date
        AND tx_date < ('2026-01-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0089384771,
        '2026-01-28'::date, '2026-01-28'::date,
        'COMPLETED', 'Monthly yield distribution for 2026-01',
        v_admin_id
      );

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + 0.0089384771,
          updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      RAISE NOTICE 'Created YIELD for Danielle Richetta in IND-BTC for 2026-01: 0.00893848';
    ELSE
      RAISE NOTICE 'YIELD already exists for Danielle Richetta in IND-BTC for 2026-01';
    END IF;
  ELSE
    RAISE WARNING 'Could not find investor "Danielle Richetta" or fund "IND-BTC"';
  END IF;


  -- Nathanael Cohen - IND-BTC - 2026-01
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE (LOWER(TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))) LIKE '%nathanael cohen%'
    OR p.first_name || ' ' || COALESCE(p.last_name, '') ILIKE '%Nathanael Cohen%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    -- Check if yield for this month already exists
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id
        AND fund_id = v_fund_id
        AND type = 'YIELD'
        AND tx_date >= '2026-01-01'::date
        AND tx_date < ('2026-01-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0009711865,
        '2026-01-28'::date, '2026-01-28'::date,
        'COMPLETED', 'Monthly yield distribution for 2026-01',
        v_admin_id
      );

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + 0.0009711865,
          updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      RAISE NOTICE 'Created YIELD for Nathanael Cohen in IND-BTC for 2026-01: 0.00097119';
    ELSE
      RAISE NOTICE 'YIELD already exists for Nathanael Cohen in IND-BTC for 2026-01';
    END IF;
  ELSE
    RAISE WARNING 'Could not find investor "Nathanael Cohen" or fund "IND-BTC"';
  END IF;


  -- Blondish - IND-BTC - 2026-01
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE (LOWER(TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))) LIKE '%blondish%'
    OR p.first_name || ' ' || COALESCE(p.last_name, '') ILIKE '%Blondish%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    -- Check if yield for this month already exists
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id
        AND fund_id = v_fund_id
        AND type = 'YIELD'
        AND tx_date >= '2026-01-01'::date
        AND tx_date < ('2026-01-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0089276372,
        '2026-01-28'::date, '2026-01-28'::date,
        'COMPLETED', 'Monthly yield distribution for 2026-01',
        v_admin_id
      );

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + 0.0089276372,
          updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      RAISE NOTICE 'Created YIELD for Blondish in IND-BTC for 2026-01: 0.00892764';
    ELSE
      RAISE NOTICE 'YIELD already exists for Blondish in IND-BTC for 2026-01';
    END IF;
  ELSE
    RAISE WARNING 'Could not find investor "Blondish" or fund "IND-BTC"';
  END IF;


  -- Kabbaj - IND-BTC - 2026-01
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE (LOWER(TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))) LIKE '%kabbaj%'
    OR p.first_name || ' ' || COALESCE(p.last_name, '') ILIKE '%Kabbaj%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    -- Check if yield for this month already exists
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id
        AND fund_id = v_fund_id
        AND type = 'YIELD'
        AND tx_date >= '2026-01-01'::date
        AND tx_date < ('2026-01-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0141126205,
        '2026-01-28'::date, '2026-01-28'::date,
        'COMPLETED', 'Monthly yield distribution for 2026-01',
        v_admin_id
      );

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + 0.0141126205,
          updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      RAISE NOTICE 'Created YIELD for Kabbaj in IND-BTC for 2026-01: 0.01411262';
    ELSE
      RAISE NOTICE 'YIELD already exists for Kabbaj in IND-BTC for 2026-01';
    END IF;
  ELSE
    RAISE WARNING 'Could not find investor "Kabbaj" or fund "IND-BTC"';
  END IF;


  -- Sam Johnson - IND-BTC - 2026-01
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE (LOWER(TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))) LIKE '%sam johnson%'
    OR p.first_name || ' ' || COALESCE(p.last_name, '') ILIKE '%Sam Johnson%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    -- Check if yield for this month already exists
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id
        AND fund_id = v_fund_id
        AND type = 'YIELD'
        AND tx_date >= '2026-01-01'::date
        AND tx_date < ('2026-01-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0000066392,
        '2026-01-28'::date, '2026-01-28'::date,
        'COMPLETED', 'Monthly yield distribution for 2026-01',
        v_admin_id
      );

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + 0.0000066392,
          updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      RAISE NOTICE 'Created YIELD for Sam Johnson in IND-BTC for 2026-01: 0.00000664';
    ELSE
      RAISE NOTICE 'YIELD already exists for Sam Johnson in IND-BTC for 2026-01';
    END IF;
  ELSE
    RAISE WARNING 'Could not find investor "Sam Johnson" or fund "IND-BTC"';
  END IF;


  -- Nath & Thomas - IND-BTC - 2026-01
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE (LOWER(TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))) LIKE '%nath & thomas%'
    OR p.first_name || ' ' || COALESCE(p.last_name, '') ILIKE '%Nath & Thomas%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    -- Check if yield for this month already exists
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id
        AND fund_id = v_fund_id
        AND type = 'YIELD'
        AND tx_date >= '2026-01-01'::date
        AND tx_date < ('2026-01-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0021007375,
        '2026-01-28'::date, '2026-01-28'::date,
        'COMPLETED', 'Monthly yield distribution for 2026-01',
        v_admin_id
      );

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + 0.0021007375,
          updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      RAISE NOTICE 'Created YIELD for Nath & Thomas in IND-BTC for 2026-01: 0.00210074';
    ELSE
      RAISE NOTICE 'YIELD already exists for Nath & Thomas in IND-BTC for 2026-01';
    END IF;
  ELSE
    RAISE WARNING 'Could not find investor "Nath & Thomas" or fund "IND-BTC"';
  END IF;


  -- NSVO Holdings - IND-BTC - 2026-01
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE (LOWER(TRIM(p.first_name || ' ' || COALESCE(p.last_name, ''))) LIKE '%nsvo holdings%'
    OR p.first_name || ' ' || COALESCE(p.last_name, '') ILIKE '%NSVO Holdings%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    -- Check if yield for this month already exists
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id
        AND fund_id = v_fund_id
        AND type = 'YIELD'
        AND tx_date >= '2026-01-01'::date
        AND tx_date < ('2026-01-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0010800268,
        '2026-01-28'::date, '2026-01-28'::date,
        'COMPLETED', 'Monthly yield distribution for 2026-01',
        v_admin_id
      );

      -- Update position
      UPDATE investor_positions
      SET current_value = current_value + 0.0010800268,
          updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      RAISE NOTICE 'Created YIELD for NSVO Holdings in IND-BTC for 2026-01: 0.00108003';
    ELSE
      RAISE NOTICE 'YIELD already exists for NSVO Holdings in IND-BTC for 2026-01';
    END IF;
  ELSE
    RAISE WARNING 'Could not find investor "NSVO Holdings" or fund "IND-BTC"';
  END IF;


END $$;

-- Verify results
SELECT
  COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '') as investor,
  f.code as fund,
  ip.current_value as position,
  (SELECT SUM(amount) FROM transactions_v2 WHERE investor_id = ip.investor_id AND fund_id = ip.fund_id AND type = 'YIELD' AND NOT is_voided) as total_yield
FROM investor_positions ip
JOIN profiles p ON ip.investor_id = p.id
JOIN funds f ON ip.fund_id = f.id
WHERE ip.current_value > 0
ORDER BY f.code, investor;
