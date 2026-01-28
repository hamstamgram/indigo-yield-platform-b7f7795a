
-- ============================================
-- MONTHLY YIELD DISTRIBUTION SQL
-- Generated from accounting Excel data
-- ============================================

DO $$
DECLARE
  v_fund_id UUID;
  v_investor_id UUID;
  v_admin_id UUID;
  v_tx_count INT := 0;
BEGIN
  -- Get admin ID
  SELECT id INTO v_admin_id FROM profiles WHERE email = 'nathanael@indigo.fund' LIMIT 1;
  IF v_admin_id IS NULL THEN
    SELECT id INTO v_admin_id FROM profiles WHERE is_admin = true LIMIT 1;
  END IF;


  -- Jose Molla - IND-BTC - 2024-07: 0.01760000
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Jose Molla%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2024-07-01'::date
        AND tx_date < ('2024-07-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0176000000,
        '2024-07-28'::date, '2024-07-28'::date,
        'COMPLETED', 'Monthly yield for 2024-07', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0176000000, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Jose Molla - IND-ETH - 2024-07: 0.61600000
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-ETH';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Jose Molla%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2024-07-01'::date
        AND tx_date < ('2024-07-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.6159999998,
        '2024-07-28'::date, '2024-07-28'::date,
        'COMPLETED', 'Monthly yield for 2024-07', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.6159999998, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Jose Molla - IND-BTC - 2024-08: 0.01300550
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Jose Molla%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2024-08-01'::date
        AND tx_date < ('2024-08-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0130054968,
        '2024-08-28'::date, '2024-08-28'::date,
        'COMPLETED', 'Monthly yield for 2024-08', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0130054968, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Jose Molla - IND-ETH - 2024-08: 0.43455918
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-ETH';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Jose Molla%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2024-08-01'::date
        AND tx_date < ('2024-08-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.4345591778,
        '2024-08-28'::date, '2024-08-28'::date,
        'COMPLETED', 'Monthly yield for 2024-08', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.4345591778, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Jose Molla - IND-BTC - 2024-09: 0.01510563
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Jose Molla%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2024-09-01'::date
        AND tx_date < ('2024-09-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0151056261,
        '2024-09-28'::date, '2024-09-28'::date,
        'COMPLETED', 'Monthly yield for 2024-09', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0151056261, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Jose Molla - IND-ETH - 2024-09: 0.39942693
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-ETH';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Jose Molla%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2024-09-01'::date
        AND tx_date < ('2024-09-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.3994269341,
        '2024-09-28'::date, '2024-09-28'::date,
        'COMPLETED', 'Monthly yield for 2024-09', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.3994269341, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Jose Molla - IND-BTC - 2024-10: 0.01403729
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Jose Molla%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2024-10-01'::date
        AND tx_date < ('2024-10-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0140372900,
        '2024-10-28'::date, '2024-10-28'::date,
        'COMPLETED', 'Monthly yield for 2024-10', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0140372900, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Matthias Reiser - IND-BTC - 2024-10: 0.01870020
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Matthias Reiser%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2024-10-01'::date
        AND tx_date < ('2024-10-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0187001961,
        '2024-10-28'::date, '2024-10-28'::date,
        'COMPLETED', 'Monthly yield for 2024-10', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0187001961, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Thomas Puech - IND-BTC - 2024-10: 0.02638792
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Thomas Puech%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2024-10-01'::date
        AND tx_date < ('2024-10-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0263879195,
        '2024-10-28'::date, '2024-10-28'::date,
        'COMPLETED', 'Monthly yield for 2024-10', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0263879195, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Danielle Richetta - IND-BTC - 2024-10: 0.02104784
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Danielle Richetta%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2024-10-01'::date
        AND tx_date < ('2024-10-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0210478397,
        '2024-10-28'::date, '2024-10-28'::date,
        'COMPLETED', 'Monthly yield for 2024-10', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0210478397, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Jose Molla - IND-ETH - 2024-10: 0.81672000
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-ETH';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Jose Molla%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2024-10-01'::date
        AND tx_date < ('2024-10-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.8167200000,
        '2024-10-28'::date, '2024-10-28'::date,
        'COMPLETED', 'Monthly yield for 2024-10', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.8167200000, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Nathanael Cohen - IND-ETH - 2024-10: 0.22576000
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-ETH';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Nathanael Cohen%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2024-10-01'::date
        AND tx_date < ('2024-10-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.2257600000,
        '2024-10-28'::date, '2024-10-28'::date,
        'COMPLETED', 'Monthly yield for 2024-10', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.2257600000, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Blondish - IND-ETH - 2024-10: 1.59360000
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-ETH';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Blondish%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2024-10-01'::date
        AND tx_date < ('2024-10-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 1.5936000000,
        '2024-10-28'::date, '2024-10-28'::date,
        'COMPLETED', 'Monthly yield for 2024-10', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 1.5936000000, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Jose Molla - IND-BTC - 2024-11: 0.01527780
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Jose Molla%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2024-11-01'::date
        AND tx_date < ('2024-11-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0152777987,
        '2024-11-28'::date, '2024-11-28'::date,
        'COMPLETED', 'Monthly yield for 2024-11', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0152777987, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Matthias Reiser - IND-BTC - 2024-11: 0.02035278
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Matthias Reiser%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2024-11-01'::date
        AND tx_date < ('2024-11-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0203527768,
        '2024-11-28'::date, '2024-11-28'::date,
        'COMPLETED', 'Monthly yield for 2024-11', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0203527768, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Thomas Puech - IND-BTC - 2024-11: 0.02871988
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Thomas Puech%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2024-11-01'::date
        AND tx_date < ('2024-11-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0287198826,
        '2024-11-28'::date, '2024-11-28'::date,
        'COMPLETED', 'Monthly yield for 2024-11', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0287198826, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Danielle Richetta - IND-BTC - 2024-11: 0.02171844
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Danielle Richetta%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2024-11-01'::date
        AND tx_date < ('2024-11-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0217184393,
        '2024-11-28'::date, '2024-11-28'::date,
        'COMPLETED', 'Monthly yield for 2024-11', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0217184393, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Jose Molla - IND-ETH - 2024-11: 0.81672000
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-ETH';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Jose Molla%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2024-11-01'::date
        AND tx_date < ('2024-11-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.8167200000,
        '2024-11-28'::date, '2024-11-28'::date,
        'COMPLETED', 'Monthly yield for 2024-11', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.8167200000, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Nathanael Cohen - IND-ETH - 2024-11: 0.22576000
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-ETH';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Nathanael Cohen%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2024-11-01'::date
        AND tx_date < ('2024-11-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.2257600000,
        '2024-11-28'::date, '2024-11-28'::date,
        'COMPLETED', 'Monthly yield for 2024-11', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.2257600000, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Blondish - IND-ETH - 2024-11: 1.59360000
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-ETH';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Blondish%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2024-11-01'::date
        AND tx_date < ('2024-11-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 1.5936000000,
        '2024-11-28'::date, '2024-11-28'::date,
        'COMPLETED', 'Monthly yield for 2024-11', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 1.5936000000, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Jose Molla - IND-BTC - 2024-12: 0.01929014
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Jose Molla%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2024-12-01'::date
        AND tx_date < ('2024-12-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0192901379,
        '2024-12-28'::date, '2024-12-28'::date,
        'COMPLETED', 'Monthly yield for 2024-12', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0192901379, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Matthias Reiser - IND-BTC - 2024-12: 0.02569793
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Matthias Reiser%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2024-12-01'::date
        AND tx_date < ('2024-12-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0256979346,
        '2024-12-28'::date, '2024-12-28'::date,
        'COMPLETED', 'Monthly yield for 2024-12', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0256979346, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Thomas Puech - IND-BTC - 2024-12: 0.03626246
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Thomas Puech%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2024-12-01'::date
        AND tx_date < ('2024-12-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0362624556,
        '2024-12-28'::date, '2024-12-28'::date,
        'COMPLETED', 'Monthly yield for 2024-12', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0362624556, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Danielle Richetta - IND-BTC - 2024-12: 0.02673253
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Danielle Richetta%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2024-12-01'::date
        AND tx_date < ('2024-12-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0267325268,
        '2024-12-28'::date, '2024-12-28'::date,
        'COMPLETED', 'Monthly yield for 2024-12', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0267325268, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Jose Molla - IND-ETH - 2024-12: 0.81672000
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-ETH';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Jose Molla%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2024-12-01'::date
        AND tx_date < ('2024-12-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.8167200000,
        '2024-12-28'::date, '2024-12-28'::date,
        'COMPLETED', 'Monthly yield for 2024-12', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.8167200000, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Nathanael Cohen - IND-ETH - 2024-12: 0.22576000
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-ETH';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Nathanael Cohen%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2024-12-01'::date
        AND tx_date < ('2024-12-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.2257600000,
        '2024-12-28'::date, '2024-12-28'::date,
        'COMPLETED', 'Monthly yield for 2024-12', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.2257600000, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Blondish - IND-ETH - 2024-12: 1.59360000
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-ETH';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Blondish%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2024-12-01'::date
        AND tx_date < ('2024-12-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 1.5936000000,
        '2024-12-28'::date, '2024-12-28'::date,
        'COMPLETED', 'Monthly yield for 2024-12', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 1.5936000000, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Jose Molla - IND-BTC - 2025-01: 0.01625625
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Jose Molla%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-01-01'::date
        AND tx_date < ('2025-01-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0162562500,
        '2025-01-28'::date, '2025-01-28'::date,
        'COMPLETED', 'Monthly yield for 2025-01', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0162562500, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Matthias Reiser - IND-BTC - 2025-01: 0.02165625
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Matthias Reiser%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-01-01'::date
        AND tx_date < ('2025-01-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0216562500,
        '2025-01-28'::date, '2025-01-28'::date,
        'COMPLETED', 'Monthly yield for 2025-01', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0216562500, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Thomas Puech - IND-BTC - 2025-01: 0.03055922
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Thomas Puech%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-01-01'::date
        AND tx_date < ('2025-01-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0305592187,
        '2025-01-28'::date, '2025-01-28'::date,
        'COMPLETED', 'Monthly yield for 2025-01', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0305592187, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Danielle Richetta - IND-BTC - 2025-01: 0.02252812
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Danielle Richetta%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-01-01'::date
        AND tx_date < ('2025-01-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0225281250,
        '2025-01-28'::date, '2025-01-28'::date,
        'COMPLETED', 'Monthly yield for 2025-01', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0225281250, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Jose Molla - IND-ETH - 2025-01: 0.27624751
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-ETH';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Jose Molla%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-01-01'::date
        AND tx_date < ('2025-01-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.2762475090,
        '2025-01-28'::date, '2025-01-28'::date,
        'COMPLETED', 'Monthly yield for 2025-01', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.2762475090, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Nathanael Cohen - IND-ETH - 2025-01: 0.07636110
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-ETH';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Nathanael Cohen%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-01-01'::date
        AND tx_date < ('2025-01-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0763611000,
        '2025-01-28'::date, '2025-01-28'::date,
        'COMPLETED', 'Monthly yield for 2025-01', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0763611000, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Blondish - IND-ETH - 2025-01: 0.53901953
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-ETH';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Blondish%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-01-01'::date
        AND tx_date < ('2025-01-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.5390195297,
        '2025-01-28'::date, '2025-01-28'::date,
        'COMPLETED', 'Monthly yield for 2025-01', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.5390195297, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Jose Molla - IND-BTC - 2025-02: 0.01077437
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Jose Molla%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-02-01'::date
        AND tx_date < ('2025-02-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0107743689,
        '2025-02-28'::date, '2025-02-28'::date,
        'COMPLETED', 'Monthly yield for 2025-02', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0107743689, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Matthias Reiser - IND-BTC - 2025-02: 0.01435340
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Matthias Reiser%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-02-01'::date
        AND tx_date < ('2025-02-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0143533981,
        '2025-02-28'::date, '2025-02-28'::date,
        'COMPLETED', 'Monthly yield for 2025-02', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0143533981, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Thomas Puech - IND-BTC - 2025-02: 0.02025414
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Thomas Puech%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-02-01'::date
        AND tx_date < ('2025-02-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0202541359,
        '2025-02-28'::date, '2025-02-28'::date,
        'COMPLETED', 'Monthly yield for 2025-02', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0202541359, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Danielle Richetta - IND-BTC - 2025-02: 0.01493126
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Danielle Richetta%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-02-01'::date
        AND tx_date < ('2025-02-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0149312621,
        '2025-02-28'::date, '2025-02-28'::date,
        'COMPLETED', 'Monthly yield for 2025-02', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0149312621, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Jose Molla - IND-ETH - 2025-02: 0.61010369
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-ETH';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Jose Molla%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-02-01'::date
        AND tx_date < ('2025-02-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.6101036924,
        '2025-02-28'::date, '2025-02-28'::date,
        'COMPLETED', 'Monthly yield for 2025-02', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.6101036924, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Nathanael Cohen - IND-ETH - 2025-02: 0.16864655
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-ETH';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Nathanael Cohen%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-02-01'::date
        AND tx_date < ('2025-02-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.1686465491,
        '2025-02-28'::date, '2025-02-28'::date,
        'COMPLETED', 'Monthly yield for 2025-02', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.1686465491, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Blondish - IND-ETH - 2025-02: 1.19044623
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-ETH';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Blondish%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-02-01'::date
        AND tx_date < ('2025-02-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 1.1904462290,
        '2025-02-28'::date, '2025-02-28'::date,
        'COMPLETED', 'Monthly yield for 2025-02', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 1.1904462290, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Jose Molla - IND-BTC - 2025-03: 0.04818709
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Jose Molla%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-03-01'::date
        AND tx_date < ('2025-03-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0481870886,
        '2025-03-28'::date, '2025-03-28'::date,
        'COMPLETED', 'Monthly yield for 2025-03', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0481870886, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Matthias Reiser - IND-BTC - 2025-03: 0.06419387
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Matthias Reiser%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-03-01'::date
        AND tx_date < ('2025-03-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0641938723,
        '2025-03-28'::date, '2025-03-28'::date,
        'COMPLETED', 'Monthly yield for 2025-03', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0641938723, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Thomas Puech - IND-BTC - 2025-03: 0.09058422
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Thomas Puech%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-03-01'::date
        AND tx_date < ('2025-03-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0905842234,
        '2025-03-28'::date, '2025-03-28'::date,
        'COMPLETED', 'Monthly yield for 2025-03', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0905842234, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Danielle Richetta - IND-BTC - 2025-03: 0.06677830
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Danielle Richetta%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-03-01'::date
        AND tx_date < ('2025-03-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0667783010,
        '2025-03-28'::date, '2025-03-28'::date,
        'COMPLETED', 'Monthly yield for 2025-03', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0667783010, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Jose Molla - IND-ETH - 2025-03: 0.14009514
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-ETH';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Jose Molla%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-03-01'::date
        AND tx_date < ('2025-03-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.1400951388,
        '2025-03-28'::date, '2025-03-28'::date,
        'COMPLETED', 'Monthly yield for 2025-03', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.1400951388, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Nathanael Cohen - IND-ETH - 2025-03: 0.06112704
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-ETH';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Nathanael Cohen%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-03-01'::date
        AND tx_date < ('2025-03-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0611270399,
        '2025-03-28'::date, '2025-03-28'::date,
        'COMPLETED', 'Monthly yield for 2025-03', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0611270399, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Blondish - IND-ETH - 2025-03: 0.27335637
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-ETH';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Blondish%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-03-01'::date
        AND tx_date < ('2025-03-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.2733563683,
        '2025-03-28'::date, '2025-03-28'::date,
        'COMPLETED', 'Monthly yield for 2025-03', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.2733563683, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Jose Molla - IND-BTC - 2025-04: 0.05175611
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Jose Molla%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-04-01'::date
        AND tx_date < ('2025-04-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0517561071,
        '2025-04-28'::date, '2025-04-28'::date,
        'COMPLETED', 'Monthly yield for 2025-04', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0517561071, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Matthias Reiser - IND-BTC - 2025-04: 0.06894845
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Matthias Reiser%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-04-01'::date
        AND tx_date < ('2025-04-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0689484471,
        '2025-04-28'::date, '2025-04-28'::date,
        'COMPLETED', 'Monthly yield for 2025-04', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0689484471, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Thomas Puech - IND-BTC - 2025-04: 0.09729342
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Thomas Puech%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-04-01'::date
        AND tx_date < ('2025-04-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0972934224,
        '2025-04-28'::date, '2025-04-28'::date,
        'COMPLETED', 'Monthly yield for 2025-04', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0972934224, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Danielle Richetta - IND-BTC - 2025-04: 0.07172429
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Danielle Richetta%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-04-01'::date
        AND tx_date < ('2025-04-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0717242937,
        '2025-04-28'::date, '2025-04-28'::date,
        'COMPLETED', 'Monthly yield for 2025-04', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0717242937, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Nathanael Cohen - IND-BTC - 2025-04: 0.00669039
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Nathanael Cohen%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-04-01'::date
        AND tx_date < ('2025-04-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0066903872,
        '2025-04-28'::date, '2025-04-28'::date,
        'COMPLETED', 'Monthly yield for 2025-04', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0066903872, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Blondish - IND-BTC - 2025-04: 0.06150142
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Blondish%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-04-01'::date
        AND tx_date < ('2025-04-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0615014179,
        '2025-04-28'::date, '2025-04-28'::date,
        'COMPLETED', 'Monthly yield for 2025-04', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0615014179, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Jose Molla - IND-ETH - 2025-04: 0.58837316
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-ETH';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Jose Molla%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-04-01'::date
        AND tx_date < ('2025-04-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.5883731650,
        '2025-04-28'::date, '2025-04-28'::date,
        'COMPLETED', 'Monthly yield for 2025-04', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.5883731650, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Nathanael Cohen - IND-ETH - 2025-04: 0.25672204
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-ETH';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Nathanael Cohen%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-04-01'::date
        AND tx_date < ('2025-04-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.2567220408,
        '2025-04-28'::date, '2025-04-28'::date,
        'COMPLETED', 'Monthly yield for 2025-04', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.2567220408, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Blondish - IND-ETH - 2025-04: 1.14804520
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-ETH';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Blondish%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-04-01'::date
        AND tx_date < ('2025-04-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 1.1480452000,
        '2025-04-28'::date, '2025-04-28'::date,
        'COMPLETED', 'Monthly yield for 2025-04', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 1.1480452000, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Jose Molla - IND-BTC - 2025-05: 0.04012566
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Jose Molla%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-05-01'::date
        AND tx_date < ('2025-05-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0401256635,
        '2025-05-28'::date, '2025-05-28'::date,
        'COMPLETED', 'Monthly yield for 2025-05', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0401256635, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Matthias Reiser - IND-BTC - 2025-05: 0.05345460
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Matthias Reiser%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-05-01'::date
        AND tx_date < ('2025-05-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0534546036,
        '2025-05-28'::date, '2025-05-28'::date,
        'COMPLETED', 'Monthly yield for 2025-05', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0534546036, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Thomas Puech - IND-BTC - 2025-05: 0.07543000
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Thomas Puech%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-05-01'::date
        AND tx_date < ('2025-05-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0754299994,
        '2025-05-28'::date, '2025-05-28'::date,
        'COMPLETED', 'Monthly yield for 2025-05', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0754299994, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Danielle Richetta - IND-BTC - 2025-05: 0.05410254
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Danielle Richetta%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-05-01'::date
        AND tx_date < ('2025-05-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0541025382,
        '2025-05-28'::date, '2025-05-28'::date,
        'COMPLETED', 'Monthly yield for 2025-05', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0541025382, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Nathanael Cohen - IND-BTC - 2025-05: 0.00523116
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Nathanael Cohen%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-05-01'::date
        AND tx_date < ('2025-05-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0052311608,
        '2025-05-28'::date, '2025-05-28'::date,
        'COMPLETED', 'Monthly yield for 2025-05', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0052311608, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Blondish - IND-BTC - 2025-05: 0.04808747
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Blondish%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-05-01'::date
        AND tx_date < ('2025-05-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0480874723,
        '2025-05-28'::date, '2025-05-28'::date,
        'COMPLETED', 'Monthly yield for 2025-05', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0480874723, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Jose Molla - IND-ETH - 2025-05: 0.11655565
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-ETH';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Jose Molla%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-05-01'::date
        AND tx_date < ('2025-05-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.1165556540,
        '2025-05-28'::date, '2025-05-28'::date,
        'COMPLETED', 'Monthly yield for 2025-05', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.1165556540, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Nathanael Cohen - IND-ETH - 2025-05: 0.05663013
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-ETH';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Nathanael Cohen%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-05-01'::date
        AND tx_date < ('2025-05-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0566301280,
        '2025-05-28'::date, '2025-05-28'::date,
        'COMPLETED', 'Monthly yield for 2025-05', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0566301280, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Blondish - IND-ETH - 2025-05: 0.22742567
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-ETH';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Blondish%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-05-01'::date
        AND tx_date < ('2025-05-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.2274256663,
        '2025-05-28'::date, '2025-05-28'::date,
        'COMPLETED', 'Monthly yield for 2025-05', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.2274256663, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Babak Eftekhari - IND-ETH - 2025-05: 0.11511813
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-ETH';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Babak Eftekhari%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-05-01'::date
        AND tx_date < ('2025-05-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.1151181343,
        '2025-05-28'::date, '2025-05-28'::date,
        'COMPLETED', 'Monthly yield for 2025-05', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.1151181343, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- INDIGO DIGITAL ASSET FUND LP - IND-ETH - 2025-05: 0.33166243
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-ETH';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%INDIGO DIGITAL ASSET FUND LP%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-05-01'::date
        AND tx_date < ('2025-05-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.3316624300,
        '2025-05-28'::date, '2025-05-28'::date,
        'COMPLETED', 'Monthly yield for 2025-05', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.3316624300, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Jose Molla - IND-BTC - 2025-06: 0.03349745
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Jose Molla%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-06-01'::date
        AND tx_date < ('2025-06-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0334974541,
        '2025-06-28'::date, '2025-06-28'::date,
        'COMPLETED', 'Monthly yield for 2025-06', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0334974541, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Matthias Reiser - IND-BTC - 2025-06: 0.04462464
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Matthias Reiser%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-06-01'::date
        AND tx_date < ('2025-06-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0446246361,
        '2025-06-28'::date, '2025-06-28'::date,
        'COMPLETED', 'Monthly yield for 2025-06', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0446246361, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Thomas Puech - IND-BTC - 2025-06: 0.06297000
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Thomas Puech%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-06-01'::date
        AND tx_date < ('2025-06-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0629699979,
        '2025-06-28'::date, '2025-06-28'::date,
        'COMPLETED', 'Monthly yield for 2025-06', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0629699979, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Danielle Richetta - IND-BTC - 2025-06: 0.04516554
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Danielle Richetta%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-06-01'::date
        AND tx_date < ('2025-06-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0451655408,
        '2025-06-28'::date, '2025-06-28'::date,
        'COMPLETED', 'Monthly yield for 2025-06', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0451655408, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Nathanael Cohen - IND-BTC - 2025-06: 0.00438788
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Nathanael Cohen%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-06-01'::date
        AND tx_date < ('2025-06-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0043878768,
        '2025-06-28'::date, '2025-06-28'::date,
        'COMPLETED', 'Monthly yield for 2025-06', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0043878768, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Blondish - IND-BTC - 2025-06: 0.04033558
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Blondish%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-06-01'::date
        AND tx_date < ('2025-06-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0403355791,
        '2025-06-28'::date, '2025-06-28'::date,
        'COMPLETED', 'Monthly yield for 2025-06', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0403355791, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Kabbaj - IND-BTC - 2025-06: 0.01931802
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Kabbaj%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-06-01'::date
        AND tx_date < ('2025-06-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0193180243,
        '2025-06-28'::date, '2025-06-28'::date,
        'COMPLETED', 'Monthly yield for 2025-06', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0193180243, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Jose Molla - IND-ETH - 2025-06: 0.11144741
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-ETH';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Jose Molla%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-06-01'::date
        AND tx_date < ('2025-06-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.1114474090,
        '2025-06-28'::date, '2025-06-28'::date,
        'COMPLETED', 'Monthly yield for 2025-06', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.1114474090, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Nathanael Cohen - IND-ETH - 2025-06: 0.05777252
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-ETH';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Nathanael Cohen%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-06-01'::date
        AND tx_date < ('2025-06-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0577725247,
        '2025-06-28'::date, '2025-06-28'::date,
        'COMPLETED', 'Monthly yield for 2025-06', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0577725247, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Blondish - IND-ETH - 2025-06: 0.21745836
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-ETH';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Blondish%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-06-01'::date
        AND tx_date < ('2025-06-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.2174583590,
        '2025-06-28'::date, '2025-06-28'::date,
        'COMPLETED', 'Monthly yield for 2025-06', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.2174583590, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Babak Eftekhari - IND-ETH - 2025-06: 0.11007289
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-ETH';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Babak Eftekhari%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-06-01'::date
        AND tx_date < ('2025-06-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.1100728910,
        '2025-06-28'::date, '2025-06-28'::date,
        'COMPLETED', 'Monthly yield for 2025-06', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.1100728910, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- INDIGO DIGITAL ASSET FUND LP - IND-ETH - 2025-06: 0.31712677
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-ETH';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%INDIGO DIGITAL ASSET FUND LP%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-06-01'::date
        AND tx_date < ('2025-06-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.3171267736,
        '2025-06-28'::date, '2025-06-28'::date,
        'COMPLETED', 'Monthly yield for 2025-06', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.3171267736, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Babak Eftekhari - IND-USDT - 2025-06: 1405.11117938
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-USDT';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Babak Eftekhari%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-06-01'::date
        AND tx_date < ('2025-06-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 1405.1111793750,
        '2025-06-28'::date, '2025-06-28'::date,
        'COMPLETED', 'Monthly yield for 2025-06', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 1405.1111793750, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Jose Molla - IND-BTC - 2025-07: 0.03558858
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Jose Molla%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-07-01'::date
        AND tx_date < ('2025-07-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0355885841,
        '2025-07-28'::date, '2025-07-28'::date,
        'COMPLETED', 'Monthly yield for 2025-07', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0355885841, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Matthias Reiser - IND-BTC - 2025-07: 0.04741040
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Matthias Reiser%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-07-01'::date
        AND tx_date < ('2025-07-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0474103974,
        '2025-07-28'::date, '2025-07-28'::date,
        'COMPLETED', 'Monthly yield for 2025-07', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0474103974, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Thomas Puech - IND-BTC - 2025-07: 0.06690100
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Thomas Puech%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-07-01'::date
        AND tx_date < ('2025-07-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0669009966,
        '2025-07-28'::date, '2025-07-28'::date,
        'COMPLETED', 'Monthly yield for 2025-07', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0669009966, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Danielle Richetta - IND-BTC - 2025-07: 0.04531695
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Danielle Richetta%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-07-01'::date
        AND tx_date < ('2025-07-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0453169513,
        '2025-07-28'::date, '2025-07-28'::date,
        'COMPLETED', 'Monthly yield for 2025-07', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0453169513, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Nathanael Cohen - IND-BTC - 2025-07: 0.00467606
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Nathanael Cohen%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-07-01'::date
        AND tx_date < ('2025-07-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0046760572,
        '2025-07-28'::date, '2025-07-28'::date,
        'COMPLETED', 'Monthly yield for 2025-07', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0046760572, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Blondish - IND-BTC - 2025-07: 0.04298468
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Blondish%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-07-01'::date
        AND tx_date < ('2025-07-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0429846791,
        '2025-07-28'::date, '2025-07-28'::date,
        'COMPLETED', 'Monthly yield for 2025-07', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0429846791, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Kabbaj - IND-BTC - 2025-07: 0.03685491
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Kabbaj%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-07-01'::date
        AND tx_date < ('2025-07-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0368549137,
        '2025-07-28'::date, '2025-07-28'::date,
        'COMPLETED', 'Monthly yield for 2025-07', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0368549137, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Jose Molla - IND-ETH - 2025-07: 0.49301764
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-ETH';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Jose Molla%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-07-01'::date
        AND tx_date < ('2025-07-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.4930176435,
        '2025-07-28'::date, '2025-07-28'::date,
        'COMPLETED', 'Monthly yield for 2025-07', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.4930176435, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Nathanael Cohen - IND-ETH - 2025-07: 0.25557233
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-ETH';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Nathanael Cohen%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-07-01'::date
        AND tx_date < ('2025-07-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.2555723298,
        '2025-07-28'::date, '2025-07-28'::date,
        'COMPLETED', 'Monthly yield for 2025-07', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.2555723298, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Blondish - IND-ETH - 2025-07: 0.96198565
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-ETH';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Blondish%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-07-01'::date
        AND tx_date < ('2025-07-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.9619856458,
        '2025-07-28'::date, '2025-07-28'::date,
        'COMPLETED', 'Monthly yield for 2025-07', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.9619856458, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Babak Eftekhari - IND-ETH - 2025-07: 0.48693709
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-ETH';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Babak Eftekhari%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-07-01'::date
        AND tx_date < ('2025-07-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.4869370925,
        '2025-07-28'::date, '2025-07-28'::date,
        'COMPLETED', 'Monthly yield for 2025-07', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.4869370925, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Advantage Blockchain - IND-ETH - 2025-07: 0.26294274
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-ETH';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Advantage Blockchain%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-07-01'::date
        AND tx_date < ('2025-07-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.2629427432,
        '2025-07-28'::date, '2025-07-28'::date,
        'COMPLETED', 'Monthly yield for 2025-07', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.2629427432, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Babak Eftekhari - IND-USDT - 2025-07: 986.30159143
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-USDT';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Babak Eftekhari%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-07-01'::date
        AND tx_date < ('2025-07-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 986.3015914306,
        '2025-07-28'::date, '2025-07-28'::date,
        'COMPLETED', 'Monthly yield for 2025-07', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 986.3015914306, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Julien Grunebaum - IND-USDT - 2025-07: 648.22850486
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-USDT';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Julien Grunebaum%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-07-01'::date
        AND tx_date < ('2025-07-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 648.2285048601,
        '2025-07-28'::date, '2025-07-28'::date,
        'COMPLETED', 'Monthly yield for 2025-07', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 648.2285048601, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Daniele Francilia - IND-USDT - 2025-07: 650.50398886
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-USDT';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Daniele Francilia%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-07-01'::date
        AND tx_date < ('2025-07-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 650.5039888613,
        '2025-07-28'::date, '2025-07-28'::date,
        'COMPLETED', 'Monthly yield for 2025-07', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 650.5039888613, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Pierre Bezençon - IND-USDT - 2025-07: 647.87888622
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-USDT';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Pierre Bezençon%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-07-01'::date
        AND tx_date < ('2025-07-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 647.8788862245,
        '2025-07-28'::date, '2025-07-28'::date,
        'COMPLETED', 'Monthly yield for 2025-07', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 647.8788862245, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Matthew Beatty - IND-USDT - 2025-07: 1514.05016734
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-USDT';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Matthew Beatty%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-07-01'::date
        AND tx_date < ('2025-07-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 1514.0501673410,
        '2025-07-28'::date, '2025-07-28'::date,
        'COMPLETED', 'Monthly yield for 2025-07', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 1514.0501673410, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Bo De kriek - IND-USDT - 2025-07: 1622.50897900
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-USDT';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Bo De kriek%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-07-01'::date
        AND tx_date < ('2025-07-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 1622.5089789950,
        '2025-07-28'::date, '2025-07-28'::date,
        'COMPLETED', 'Monthly yield for 2025-07', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 1622.5089789950, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Dario Deiana - IND-USDT - 2025-07: 1051.67245036
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-USDT';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Dario Deiana%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-07-01'::date
        AND tx_date < ('2025-07-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 1051.6724503631,
        '2025-07-28'::date, '2025-07-28'::date,
        'COMPLETED', 'Monthly yield for 2025-07', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 1051.6724503631, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Alain Bensimon - IND-USDT - 2025-07: 810.26785386
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-USDT';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Alain Bensimon%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-07-01'::date
        AND tx_date < ('2025-07-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 810.2678538563,
        '2025-07-28'::date, '2025-07-28'::date,
        'COMPLETED', 'Monthly yield for 2025-07', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 810.2678538563, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Anne Cecile Noique - IND-USDT - 2025-07: 1319.58517133
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-USDT';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Anne Cecile Noique%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-07-01'::date
        AND tx_date < ('2025-07-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 1319.5851713268,
        '2025-07-28'::date, '2025-07-28'::date,
        'COMPLETED', 'Monthly yield for 2025-07', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 1319.5851713268, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Terance Chen - IND-USDT - 2025-07: 1302.16349694
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-USDT';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Terance Chen%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-07-01'::date
        AND tx_date < ('2025-07-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 1302.1634969421,
        '2025-07-28'::date, '2025-07-28'::date,
        'COMPLETED', 'Monthly yield for 2025-07', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 1302.1634969421, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Jose Molla - IND-BTC - 2025-08: 0.03545674
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Jose Molla%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-08-01'::date
        AND tx_date < ('2025-08-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0354567447,
        '2025-08-28'::date, '2025-08-28'::date,
        'COMPLETED', 'Monthly yield for 2025-08', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0354567447, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Matthias Reiser - IND-BTC - 2025-08: 0.04723476
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Matthias Reiser%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-08-01'::date
        AND tx_date < ('2025-08-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0472347637,
        '2025-08-28'::date, '2025-08-28'::date,
        'COMPLETED', 'Monthly yield for 2025-08', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0472347637, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Thomas Puech - IND-BTC - 2025-08: 0.06665316
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Thomas Puech%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-08-01'::date
        AND tx_date < ('2025-08-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0666531592,
        '2025-08-28'::date, '2025-08-28'::date,
        'COMPLETED', 'Monthly yield for 2025-08', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0666531592, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Danielle Richetta - IND-BTC - 2025-08: 0.04402444
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Danielle Richetta%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-08-01'::date
        AND tx_date < ('2025-08-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0440244356,
        '2025-08-28'::date, '2025-08-28'::date,
        'COMPLETED', 'Monthly yield for 2025-08', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0440244356, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Nathanael Cohen - IND-BTC - 2025-08: 0.00467673
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Nathanael Cohen%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-08-01'::date
        AND tx_date < ('2025-08-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0046767265,
        '2025-08-28'::date, '2025-08-28'::date,
        'COMPLETED', 'Monthly yield for 2025-08', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0046767265, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Blondish - IND-BTC - 2025-08: 0.04299083
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Blondish%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-08-01'::date
        AND tx_date < ('2025-08-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0429908321,
        '2025-08-28'::date, '2025-08-28'::date,
        'COMPLETED', 'Monthly yield for 2025-08', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0429908321, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Kabbaj - IND-BTC - 2025-08: 0.04602425
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Kabbaj%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-08-01'::date
        AND tx_date < ('2025-08-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0460242451,
        '2025-08-28'::date, '2025-08-28'::date,
        'COMPLETED', 'Monthly yield for 2025-08', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0460242451, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Jose Molla - IND-ETH - 2025-08: 0.42148269
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-ETH';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Jose Molla%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-08-01'::date
        AND tx_date < ('2025-08-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.4214826915,
        '2025-08-28'::date, '2025-08-28'::date,
        'COMPLETED', 'Monthly yield for 2025-08', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.4214826915, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Nathanael Cohen - IND-ETH - 2025-08: 0.21848977
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-ETH';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Nathanael Cohen%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-08-01'::date
        AND tx_date < ('2025-08-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.2184897739,
        '2025-08-28'::date, '2025-08-28'::date,
        'COMPLETED', 'Monthly yield for 2025-08', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.2184897739, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Blondish - IND-ETH - 2025-08: 0.82240525
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-ETH';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Blondish%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-08-01'::date
        AND tx_date < ('2025-08-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.8224052516,
        '2025-08-28'::date, '2025-08-28'::date,
        'COMPLETED', 'Monthly yield for 2025-08', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.8224052516, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Babak Eftekhari - IND-ETH - 2025-08: 0.41628440
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-ETH';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Babak Eftekhari%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-08-01'::date
        AND tx_date < ('2025-08-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.4162844049,
        '2025-08-28'::date, '2025-08-28'::date,
        'COMPLETED', 'Monthly yield for 2025-08', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.4162844049, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Advantage Blockchain - IND-ETH - 2025-08: 0.22479077
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-ETH';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Advantage Blockchain%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-08-01'::date
        AND tx_date < ('2025-08-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.2247907688,
        '2025-08-28'::date, '2025-08-28'::date,
        'COMPLETED', 'Monthly yield for 2025-08', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.2247907688, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Babak Eftekhari - IND-USDT - 2025-08: 1574.74123511
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-USDT';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Babak Eftekhari%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-08-01'::date
        AND tx_date < ('2025-08-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 1574.7412351074,
        '2025-08-28'::date, '2025-08-28'::date,
        'COMPLETED', 'Monthly yield for 2025-08', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 1574.7412351074, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Julien Grunebaum - IND-USDT - 2025-08: 987.07039686
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-USDT';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Julien Grunebaum%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-08-01'::date
        AND tx_date < ('2025-08-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 987.0703968613,
        '2025-08-28'::date, '2025-08-28'::date,
        'COMPLETED', 'Monthly yield for 2025-08', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 987.0703968613, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Daniele Francilia - IND-USDT - 2025-08: 984.70024425
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-USDT';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Daniele Francilia%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-08-01'::date
        AND tx_date < ('2025-08-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 984.7002442481,
        '2025-08-28'::date, '2025-08-28'::date,
        'COMPLETED', 'Monthly yield for 2025-08', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 984.7002442481, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Pierre Bezençon - IND-USDT - 2025-08: 986.53802563
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-USDT';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Pierre Bezençon%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-08-01'::date
        AND tx_date < ('2025-08-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 986.5380256330,
        '2025-08-28'::date, '2025-08-28'::date,
        'COMPLETED', 'Monthly yield for 2025-08', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 986.5380256330, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Matthew Beatty - IND-USDT - 2025-08: 2524.21829482
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-USDT';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Matthew Beatty%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-08-01'::date
        AND tx_date < ('2025-08-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 2524.2182948221,
        '2025-08-28'::date, '2025-08-28'::date,
        'COMPLETED', 'Monthly yield for 2025-08', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 2524.2182948221, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Bo De kriek - IND-USDT - 2025-08: 2470.62659201
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-USDT';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Bo De kriek%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-08-01'::date
        AND tx_date < ('2025-08-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 2470.6265920124,
        '2025-08-28'::date, '2025-08-28'::date,
        'COMPLETED', 'Monthly yield for 2025-08', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 2470.6265920124, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Dario Deiana - IND-USDT - 2025-08: 1600.35431480
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-USDT';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Dario Deiana%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-08-01'::date
        AND tx_date < ('2025-08-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 1600.3543148006,
        '2025-08-28'::date, '2025-08-28'::date,
        'COMPLETED', 'Monthly yield for 2025-08', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 1600.3543148006, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Alain Bensimon - IND-USDT - 2025-08: 1233.81092635
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-USDT';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Alain Bensimon%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-08-01'::date
        AND tx_date < ('2025-08-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 1233.8109263532,
        '2025-08-28'::date, '2025-08-28'::date,
        'COMPLETED', 'Monthly yield for 2025-08', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 1233.8109263532, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Anne Cecile Noique - IND-USDT - 2025-08: 2009.35850397
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-USDT';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Anne Cecile Noique%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-08-01'::date
        AND tx_date < ('2025-08-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 2009.3585039661,
        '2025-08-28'::date, '2025-08-28'::date,
        'COMPLETED', 'Monthly yield for 2025-08', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 2009.3585039661, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Terance Chen - IND-USDT - 2025-08: 1982.83017496
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-USDT';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Terance Chen%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-08-01'::date
        AND tx_date < ('2025-08-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 1982.8301749588,
        '2025-08-28'::date, '2025-08-28'::date,
        'COMPLETED', 'Monthly yield for 2025-08', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 1982.8301749588, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- INDIGO Ventures - IND-USDT - 2025-08: 1036.54335902
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-USDT';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%INDIGO Ventures%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-08-01'::date
        AND tx_date < ('2025-08-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 1036.5433590200,
        '2025-08-28'::date, '2025-08-28'::date,
        'COMPLETED', 'Monthly yield for 2025-08', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 1036.5433590200, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- INDIGO DIGITAL ASSET FUND LP - IND-USDT - 2025-08: 887.99872226
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-USDT';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%INDIGO DIGITAL ASSET FUND LP%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-08-01'::date
        AND tx_date < ('2025-08-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 887.9987222620,
        '2025-08-28'::date, '2025-08-28'::date,
        'COMPLETED', 'Monthly yield for 2025-08', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 887.9987222620, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Jose Molla - IND-BTC - 2025-09: 0.03015266
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Jose Molla%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-09-01'::date
        AND tx_date < ('2025-09-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0301526576,
        '2025-09-28'::date, '2025-09-28'::date,
        'COMPLETED', 'Monthly yield for 2025-09', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0301526576, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Matthias Reiser - IND-BTC - 2025-09: 0.04016877
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Matthias Reiser%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-09-01'::date
        AND tx_date < ('2025-09-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0401687653,
        '2025-09-28'::date, '2025-09-28'::date,
        'COMPLETED', 'Monthly yield for 2025-09', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0401687653, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Thomas Puech - IND-BTC - 2025-09: 0.05668230
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Thomas Puech%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-09-01'::date
        AND tx_date < ('2025-09-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0566823013,
        '2025-09-28'::date, '2025-09-28'::date,
        'COMPLETED', 'Monthly yield for 2025-09', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0566823013, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Danielle Richetta - IND-BTC - 2025-09: 0.03743868
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Danielle Richetta%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-09-01'::date
        AND tx_date < ('2025-09-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0374386804,
        '2025-09-28'::date, '2025-09-28'::date,
        'COMPLETED', 'Monthly yield for 2025-09', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0374386804, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Nathanael Cohen - IND-BTC - 2025-09: 0.00398875
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Nathanael Cohen%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-09-01'::date
        AND tx_date < ('2025-09-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0039887491,
        '2025-09-28'::date, '2025-09-28'::date,
        'COMPLETED', 'Monthly yield for 2025-09', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0039887491, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Blondish - IND-BTC - 2025-09: 0.03666660
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Blondish%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-09-01'::date
        AND tx_date < ('2025-09-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0366665965,
        '2025-09-28'::date, '2025-09-28'::date,
        'COMPLETED', 'Monthly yield for 2025-09', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0366665965, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Kabbaj - IND-BTC - 2025-09: 0.03913933
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Kabbaj%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-09-01'::date
        AND tx_date < ('2025-09-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0391393320,
        '2025-09-28'::date, '2025-09-28'::date,
        'COMPLETED', 'Monthly yield for 2025-09', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0391393320, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Jose Molla - IND-ETH - 2025-09: 0.35550282
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-ETH';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Jose Molla%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-09-01'::date
        AND tx_date < ('2025-09-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.3555028186,
        '2025-09-28'::date, '2025-09-28'::date,
        'COMPLETED', 'Monthly yield for 2025-09', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.3555028186, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Nathanael Cohen - IND-ETH - 2025-09: 0.20365167
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-ETH';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Nathanael Cohen%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-09-01'::date
        AND tx_date < ('2025-09-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.2036516683,
        '2025-09-28'::date, '2025-09-28'::date,
        'COMPLETED', 'Monthly yield for 2025-09', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.2036516683, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Blondish - IND-ETH - 2025-09: 0.69366404
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-ETH';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Blondish%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-09-01'::date
        AND tx_date < ('2025-09-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.6936640363,
        '2025-09-28'::date, '2025-09-28'::date,
        'COMPLETED', 'Monthly yield for 2025-09', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.6936640363, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Babak Eftekhari - IND-ETH - 2025-09: 0.35111828
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-ETH';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Babak Eftekhari%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-09-01'::date
        AND tx_date < ('2025-09-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.3511182839,
        '2025-09-28'::date, '2025-09-28'::date,
        'COMPLETED', 'Monthly yield for 2025-09', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.3511182839, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Advantage Blockchain - IND-ETH - 2025-09: 0.18960150
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-ETH';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Advantage Blockchain%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-09-01'::date
        AND tx_date < ('2025-09-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.1896015033,
        '2025-09-28'::date, '2025-09-28'::date,
        'COMPLETED', 'Monthly yield for 2025-09', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.1896015033, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Paul Johnson - IND-ETH - 2025-09: 0.15020923
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-ETH';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Paul Johnson%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-09-01'::date
        AND tx_date < ('2025-09-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.1502092295,
        '2025-09-28'::date, '2025-09-28'::date,
        'COMPLETED', 'Monthly yield for 2025-09', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.1502092295, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Tomer Zur - IND-ETH - 2025-09: 0.36475167
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-ETH';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Tomer Zur%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-09-01'::date
        AND tx_date < ('2025-09-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.3647516724,
        '2025-09-28'::date, '2025-09-28'::date,
        'COMPLETED', 'Monthly yield for 2025-09', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.3647516724, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Babak Eftekhari - IND-USDT - 2025-09: 1455.70914070
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-USDT';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Babak Eftekhari%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-09-01'::date
        AND tx_date < ('2025-09-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 1455.7091406966,
        '2025-09-28'::date, '2025-09-28'::date,
        'COMPLETED', 'Monthly yield for 2025-09', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 1455.7091406966, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Julien Grunebaum - IND-USDT - 2025-09: 875.22113194
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-USDT';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Julien Grunebaum%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-09-01'::date
        AND tx_date < ('2025-09-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 875.2211319368,
        '2025-09-28'::date, '2025-09-28'::date,
        'COMPLETED', 'Monthly yield for 2025-09', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 875.2211319368, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Daniele Francilia - IND-USDT - 2025-09: 865.35722232
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-USDT';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Daniele Francilia%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-09-01'::date
        AND tx_date < ('2025-09-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 865.3572223219,
        '2025-09-28'::date, '2025-09-28'::date,
        'COMPLETED', 'Monthly yield for 2025-09', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 865.3572223219, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Pierre Bezençon - IND-USDT - 2025-09: 874.74908602
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-USDT';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Pierre Bezençon%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-09-01'::date
        AND tx_date < ('2025-09-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 874.7490860214,
        '2025-09-28'::date, '2025-09-28'::date,
        'COMPLETED', 'Monthly yield for 2025-09', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 874.7490860214, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Matthew Beatty - IND-USDT - 2025-09: 2218.28982465
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-USDT';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Matthew Beatty%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-09-01'::date
        AND tx_date < ('2025-09-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 2218.2898246454,
        '2025-09-28'::date, '2025-09-28'::date,
        'COMPLETED', 'Monthly yield for 2025-09', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 2218.2898246454, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Bo De kriek - IND-USDT - 2025-09: 2190.66908432
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-USDT';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Bo De kriek%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-09-01'::date
        AND tx_date < ('2025-09-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 2190.6690843227,
        '2025-09-28'::date, '2025-09-28'::date,
        'COMPLETED', 'Monthly yield for 2025-09', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 2190.6690843227, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Dario Deiana - IND-USDT - 2025-09: 1417.60944488
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-USDT';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Dario Deiana%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-09-01'::date
        AND tx_date < ('2025-09-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 1417.6094448800,
        '2025-09-28'::date, '2025-09-28'::date,
        'COMPLETED', 'Monthly yield for 2025-09', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 1417.6094448800, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Alain Bensimon - IND-USDT - 2025-09: 1094.00241259
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-USDT';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Alain Bensimon%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-09-01'::date
        AND tx_date < ('2025-09-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 1094.0024125864,
        '2025-09-28'::date, '2025-09-28'::date,
        'COMPLETED', 'Monthly yield for 2025-09', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 1094.0024125864, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Anne Cecile Noique - IND-USDT - 2025-09: 1781.66930130
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-USDT';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Anne Cecile Noique%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-09-01'::date
        AND tx_date < ('2025-09-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 1781.6693012982,
        '2025-09-28'::date, '2025-09-28'::date,
        'COMPLETED', 'Monthly yield for 2025-09', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 1781.6693012982, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Terance Chen - IND-USDT - 2025-09: 1758.14701331
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-USDT';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Terance Chen%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-09-01'::date
        AND tx_date < ('2025-09-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 1758.1470133074,
        '2025-09-28'::date, '2025-09-28'::date,
        'COMPLETED', 'Monthly yield for 2025-09', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 1758.1470133074, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- INDIGO Ventures - IND-USDT - 2025-09: 910.91709098
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-USDT';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%INDIGO Ventures%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-09-01'::date
        AND tx_date < ('2025-09-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 910.9170909800,
        '2025-09-28'::date, '2025-09-28'::date,
        'COMPLETED', 'Monthly yield for 2025-09', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 910.9170909800, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- INDIGO DIGITAL ASSET FUND LP - IND-USDT - 2025-09: 780.37566479
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-USDT';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%INDIGO DIGITAL ASSET FUND LP%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-09-01'::date
        AND tx_date < ('2025-09-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 780.3756647880,
        '2025-09-28'::date, '2025-09-28'::date,
        'COMPLETED', 'Monthly yield for 2025-09', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 780.3756647880, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- INDIGO DIGITAL ASSET FUND LP - IND-SOL - 2025-09: 10.91771089
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-SOL';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%INDIGO DIGITAL ASSET FUND LP%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-09-01'::date
        AND tx_date < ('2025-09-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 10.9177108950,
        '2025-09-28'::date, '2025-09-28'::date,
        'COMPLETED', 'Monthly yield for 2025-09', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 10.9177108950, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Paul Johnson - IND-SOL - 2025-09: 2.21145931
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-SOL';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Paul Johnson%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-09-01'::date
        AND tx_date < ('2025-09-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 2.2114593116,
        '2025-09-28'::date, '2025-09-28'::date,
        'COMPLETED', 'Monthly yield for 2025-09', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 2.2114593116, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Jose Molla - IND-BTC - 2025-10: 0.03182421
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Jose Molla%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-10-01'::date
        AND tx_date < ('2025-10-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0318242090,
        '2025-10-28'::date, '2025-10-28'::date,
        'COMPLETED', 'Monthly yield for 2025-10', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0318242090, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Matthias Reiser - IND-BTC - 2025-10: 0.04165095
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Matthias Reiser%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-10-01'::date
        AND tx_date < ('2025-10-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0416509477,
        '2025-10-28'::date, '2025-10-28'::date,
        'COMPLETED', 'Monthly yield for 2025-10', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0416509477, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Thomas Puech - IND-BTC - 2025-10: 0.05877381
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Thomas Puech%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-10-01'::date
        AND tx_date < ('2025-10-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0587738146,
        '2025-10-28'::date, '2025-10-28'::date,
        'COMPLETED', 'Monthly yield for 2025-10', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0587738146, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Danielle Richetta - IND-BTC - 2025-10: 0.03882013
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Danielle Richetta%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-10-01'::date
        AND tx_date < ('2025-10-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0388201257,
        '2025-10-28'::date, '2025-10-28'::date,
        'COMPLETED', 'Monthly yield for 2025-10', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0388201257, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Nathanael Cohen - IND-BTC - 2025-10: 0.00414749
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Nathanael Cohen%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-10-01'::date
        AND tx_date < ('2025-10-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0041474875,
        '2025-10-28'::date, '2025-10-28'::date,
        'COMPLETED', 'Monthly yield for 2025-10', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0041474875, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Blondish - IND-BTC - 2025-10: 0.03812580
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Blondish%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-10-01'::date
        AND tx_date < ('2025-10-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0381257999,
        '2025-10-28'::date, '2025-10-28'::date,
        'COMPLETED', 'Monthly yield for 2025-10', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0381257999, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Kabbaj - IND-BTC - 2025-10: 0.04058353
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Kabbaj%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-10-01'::date
        AND tx_date < ('2025-10-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0405835295,
        '2025-10-28'::date, '2025-10-28'::date,
        'COMPLETED', 'Monthly yield for 2025-10', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0405835295, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Paul Johnson - IND-BTC - 2025-10: 0.00396225
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Paul Johnson%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-10-01'::date
        AND tx_date < ('2025-10-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0039622492,
        '2025-10-28'::date, '2025-10-28'::date,
        'COMPLETED', 'Monthly yield for 2025-10', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0039622492, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Jose Molla - IND-ETH - 2025-10: 0.37629189
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-ETH';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Jose Molla%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-10-01'::date
        AND tx_date < ('2025-10-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.3762918901,
        '2025-10-28'::date, '2025-10-28'::date,
        'COMPLETED', 'Monthly yield for 2025-10', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.3762918901, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Nathanael Cohen - IND-ETH - 2025-10: 0.21143523
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-ETH';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Nathanael Cohen%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-10-01'::date
        AND tx_date < ('2025-10-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.2114352323,
        '2025-10-28'::date, '2025-10-28'::date,
        'COMPLETED', 'Monthly yield for 2025-10', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.2114352323, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Blondish - IND-ETH - 2025-10: 0.72017587
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-ETH';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Blondish%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-10-01'::date
        AND tx_date < ('2025-10-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.7201758662,
        '2025-10-28'::date, '2025-10-28'::date,
        'COMPLETED', 'Monthly yield for 2025-10', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.7201758662, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Babak Eftekhari - IND-ETH - 2025-10: 0.41577715
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-ETH';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Babak Eftekhari%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-10-01'::date
        AND tx_date < ('2025-10-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.4157771468,
        '2025-10-28'::date, '2025-10-28'::date,
        'COMPLETED', 'Monthly yield for 2025-10', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.4157771468, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Advantage Blockchain - IND-ETH - 2025-10: 0.19684807
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-ETH';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Advantage Blockchain%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-10-01'::date
        AND tx_date < ('2025-10-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.1968480701,
        '2025-10-28'::date, '2025-10-28'::date,
        'COMPLETED', 'Monthly yield for 2025-10', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.1968480701, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Paul Johnson - IND-ETH - 2025-10: 0.07808121
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-ETH';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Paul Johnson%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-10-01'::date
        AND tx_date < ('2025-10-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0780812086,
        '2025-10-28'::date, '2025-10-28'::date,
        'COMPLETED', 'Monthly yield for 2025-10', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0780812086, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Tomer Zur - IND-ETH - 2025-10: 0.90239656
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-ETH';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Tomer Zur%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-10-01'::date
        AND tx_date < ('2025-10-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.9023965644,
        '2025-10-28'::date, '2025-10-28'::date,
        'COMPLETED', 'Monthly yield for 2025-10', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.9023965644, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Babak Eftekhari - IND-USDT - 2025-10: 1826.68307514
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-USDT';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Babak Eftekhari%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-10-01'::date
        AND tx_date < ('2025-10-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 1826.6830751391,
        '2025-10-28'::date, '2025-10-28'::date,
        'COMPLETED', 'Monthly yield for 2025-10', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 1826.6830751391, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Julien Grunebaum - IND-USDT - 2025-10: 940.47059281
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-USDT';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Julien Grunebaum%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-10-01'::date
        AND tx_date < ('2025-10-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 940.4705928097,
        '2025-10-28'::date, '2025-10-28'::date,
        'COMPLETED', 'Monthly yield for 2025-10', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 940.4705928097, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Daniele Francilia - IND-USDT - 2025-10: 922.59852383
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-USDT';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Daniele Francilia%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-10-01'::date
        AND tx_date < ('2025-10-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 922.5985238333,
        '2025-10-28'::date, '2025-10-28'::date,
        'COMPLETED', 'Monthly yield for 2025-10', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 922.5985238333, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Pierre Bezençon - IND-USDT - 2025-10: 939.96335494
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-USDT';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Pierre Bezençon%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-10-01'::date
        AND tx_date < ('2025-10-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 939.9633549406,
        '2025-10-28'::date, '2025-10-28'::date,
        'COMPLETED', 'Monthly yield for 2025-10', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 939.9633549406, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Matthew Beatty - IND-USDT - 2025-10: 2365.02436781
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-USDT';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Matthew Beatty%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-10-01'::date
        AND tx_date < ('2025-10-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 2365.0243678106,
        '2025-10-28'::date, '2025-10-28'::date,
        'COMPLETED', 'Monthly yield for 2025-10', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 2365.0243678106, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Bo De kriek - IND-USDT - 2025-10: 2353.98778343
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-USDT';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Bo De kriek%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-10-01'::date
        AND tx_date < ('2025-10-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 2353.9877834342,
        '2025-10-28'::date, '2025-10-28'::date,
        'COMPLETED', 'Monthly yield for 2025-10', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 2353.9877834342, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Dario Deiana - IND-USDT - 2025-10: 1521.97123274
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-USDT';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Dario Deiana%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-10-01'::date
        AND tx_date < ('2025-10-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 1521.9712327397,
        '2025-10-28'::date, '2025-10-28'::date,
        'COMPLETED', 'Monthly yield for 2025-10', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 1521.9712327397, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Alain Bensimon - IND-USDT - 2025-10: 1175.56244926
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-USDT';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Alain Bensimon%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-10-01'::date
        AND tx_date < ('2025-10-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 1175.5624492560,
        '2025-10-28'::date, '2025-10-28'::date,
        'COMPLETED', 'Monthly yield for 2025-10', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 1175.5624492560, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Anne Cecile Noique - IND-USDT - 2025-10: 1914.49626025
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-USDT';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Anne Cecile Noique%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-10-01'::date
        AND tx_date < ('2025-10-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 1914.4962602476,
        '2025-10-28'::date, '2025-10-28'::date,
        'COMPLETED', 'Monthly yield for 2025-10', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 1914.4962602476, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Terance Chen - IND-USDT - 2025-10: 1889.22033931
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-USDT';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Terance Chen%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-10-01'::date
        AND tx_date < ('2025-10-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 1889.2203393132,
        '2025-10-28'::date, '2025-10-28'::date,
        'COMPLETED', 'Monthly yield for 2025-10', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 1889.2203393132, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- INDIGO Ventures - IND-USDT - 2025-10: 17.97004501
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-USDT';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%INDIGO Ventures%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-10-01'::date
        AND tx_date < ('2025-10-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 17.9700450141,
        '2025-10-28'::date, '2025-10-28'::date,
        'COMPLETED', 'Monthly yield for 2025-10', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 17.9700450141, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- INDIGO DIGITAL ASSET FUND LP - IND-USDT - 2025-10: 831.99564041
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-USDT';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%INDIGO DIGITAL ASSET FUND LP%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-10-01'::date
        AND tx_date < ('2025-10-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 831.9956404096,
        '2025-10-28'::date, '2025-10-28'::date,
        'COMPLETED', 'Monthly yield for 2025-10', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 831.9956404096, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Sacha Oshry - IND-USDT - 2025-10: 793.74640202
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-USDT';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Sacha Oshry%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-10-01'::date
        AND tx_date < ('2025-10-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 793.7464020250,
        '2025-10-28'::date, '2025-10-28'::date,
        'COMPLETED', 'Monthly yield for 2025-10', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 793.7464020250, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- HALLEY86 - IND-USDT - 2025-10: 746.98073166
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-USDT';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%HALLEY86%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-10-01'::date
        AND tx_date < ('2025-10-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 746.9807316563,
        '2025-10-28'::date, '2025-10-28'::date,
        'COMPLETED', 'Monthly yield for 2025-10', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 746.9807316563, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Jose Molla - IND-USDT - 2025-10: 729.83580937
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-USDT';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Jose Molla%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-10-01'::date
        AND tx_date < ('2025-10-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 729.8358093725,
        '2025-10-28'::date, '2025-10-28'::date,
        'COMPLETED', 'Monthly yield for 2025-10', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 729.8358093725, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- INDIGO DIGITAL ASSET FUND LP - IND-SOL - 2025-10: 10.15876286
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-SOL';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%INDIGO DIGITAL ASSET FUND LP%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-10-01'::date
        AND tx_date < ('2025-10-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 10.1587628575,
        '2025-10-28'::date, '2025-10-28'::date,
        'COMPLETED', 'Monthly yield for 2025-10', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 10.1587628575, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Paul Johnson - IND-SOL - 2025-10: 0.00317626
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-SOL';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Paul Johnson%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-10-01'::date
        AND tx_date < ('2025-10-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0031762622,
        '2025-10-28'::date, '2025-10-28'::date,
        'COMPLETED', 'Monthly yield for 2025-10', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0031762622, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Jose Molla - IND-SOL - 2025-10: 0.71501436
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-SOL';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Jose Molla%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-10-01'::date
        AND tx_date < ('2025-10-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.7150143650,
        '2025-10-28'::date, '2025-10-28'::date,
        'COMPLETED', 'Monthly yield for 2025-10', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.7150143650, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Jose Molla - IND-BTC - 2025-11: 0.04629823
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Jose Molla%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-11-01'::date
        AND tx_date < ('2025-11-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0462982331,
        '2025-11-28'::date, '2025-11-28'::date,
        'COMPLETED', 'Monthly yield for 2025-11', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0462982331, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Matthias Reiser - IND-BTC - 2025-11: 0.04459640
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Matthias Reiser%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-11-01'::date
        AND tx_date < ('2025-11-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0445963990,
        '2025-11-28'::date, '2025-11-28'::date,
        'COMPLETED', 'Monthly yield for 2025-11', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0445963990, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Thomas Puech - IND-BTC - 2025-11: 0.06293015
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Thomas Puech%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-11-01'::date
        AND tx_date < ('2025-11-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0629301524,
        '2025-11-28'::date, '2025-11-28'::date,
        'COMPLETED', 'Monthly yield for 2025-11', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0629301524, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Danielle Richetta - IND-BTC - 2025-11: 0.03883362
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Danielle Richetta%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-11-01'::date
        AND tx_date < ('2025-11-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0388336176,
        '2025-11-28'::date, '2025-11-28'::date,
        'COMPLETED', 'Monthly yield for 2025-11', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0388336176, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Nathanael Cohen - IND-BTC - 2025-11: 0.00445285
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Nathanael Cohen%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-11-01'::date
        AND tx_date < ('2025-11-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0044528458,
        '2025-11-28'::date, '2025-11-28'::date,
        'COMPLETED', 'Monthly yield for 2025-11', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0044528458, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Blondish - IND-BTC - 2025-11: 0.04093281
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Blondish%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-11-01'::date
        AND tx_date < ('2025-11-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0409328077,
        '2025-11-28'::date, '2025-11-28'::date,
        'COMPLETED', 'Monthly yield for 2025-11', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0409328077, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Kabbaj - IND-BTC - 2025-11: 0.04345350
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Kabbaj%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-11-01'::date
        AND tx_date < ('2025-11-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0434534956,
        '2025-11-28'::date, '2025-11-28'::date,
        'COMPLETED', 'Monthly yield for 2025-11', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0434534956, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Sam Johnson - IND-BTC - 2025-11: 0.05309095
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Sam Johnson%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-11-01'::date
        AND tx_date < ('2025-11-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0530909512,
        '2025-11-28'::date, '2025-11-28'::date,
        'COMPLETED', 'Monthly yield for 2025-11', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0530909512, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Nath & Thomas - IND-BTC - 2025-11: 0.00965290
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Nath & Thomas%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-11-01'::date
        AND tx_date < ('2025-11-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0096529002,
        '2025-11-28'::date, '2025-11-28'::date,
        'COMPLETED', 'Monthly yield for 2025-11', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0096529002, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Paul Johnson - IND-BTC - 2025-11: 0.00001917
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Paul Johnson%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-11-01'::date
        AND tx_date < ('2025-11-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0000191682,
        '2025-11-28'::date, '2025-11-28'::date,
        'COMPLETED', 'Monthly yield for 2025-11', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0000191682, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Jose Molla - IND-ETH - 2025-11: 0.33278612
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-ETH';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Jose Molla%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-11-01'::date
        AND tx_date < ('2025-11-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.3327861151,
        '2025-11-28'::date, '2025-11-28'::date,
        'COMPLETED', 'Monthly yield for 2025-11', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.3327861151, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Nathanael Cohen - IND-ETH - 2025-11: 0.16639551
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-ETH';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Nathanael Cohen%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-11-01'::date
        AND tx_date < ('2025-11-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.1663955088,
        '2025-11-28'::date, '2025-11-28'::date,
        'COMPLETED', 'Monthly yield for 2025-11', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.1663955088, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Blondish - IND-ETH - 2025-11: 0.62512894
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-ETH';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Blondish%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-11-01'::date
        AND tx_date < ('2025-11-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.6251289374,
        '2025-11-28'::date, '2025-11-28'::date,
        'COMPLETED', 'Monthly yield for 2025-11', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.6251289374, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Babak Eftekhari - IND-ETH - 2025-11: 0.31953722
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-ETH';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Babak Eftekhari%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-11-01'::date
        AND tx_date < ('2025-11-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.3195372163,
        '2025-11-28'::date, '2025-11-28'::date,
        'COMPLETED', 'Monthly yield for 2025-11', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.3195372163, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Advantage Blockchain - IND-ETH - 2025-11: 0.15035872
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-ETH';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Advantage Blockchain%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-11-01'::date
        AND tx_date < ('2025-11-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.1503587180,
        '2025-11-28'::date, '2025-11-28'::date,
        'COMPLETED', 'Monthly yield for 2025-11', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.1503587180, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Paul Johnson - IND-ETH - 2025-11: 0.00020317
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-ETH';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Paul Johnson%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-11-01'::date
        AND tx_date < ('2025-11-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0002031718,
        '2025-11-28'::date, '2025-11-28'::date,
        'COMPLETED', 'Monthly yield for 2025-11', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0002031718, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Tomer Zur - IND-ETH - 2025-11: 0.83153001
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-ETH';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Tomer Zur%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-11-01'::date
        AND tx_date < ('2025-11-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.8315300100,
        '2025-11-28'::date, '2025-11-28'::date,
        'COMPLETED', 'Monthly yield for 2025-11', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.8315300100, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Sam Johnson - IND-ETH - 2025-11: 0.70274364
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-ETH';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Sam Johnson%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-11-01'::date
        AND tx_date < ('2025-11-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.7027436423,
        '2025-11-28'::date, '2025-11-28'::date,
        'COMPLETED', 'Monthly yield for 2025-11', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.7027436423, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Babak Eftekhari - IND-USDT - 2025-11: 1678.57911211
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-USDT';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Babak Eftekhari%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-11-01'::date
        AND tx_date < ('2025-11-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 1678.5791121139,
        '2025-11-28'::date, '2025-11-28'::date,
        'COMPLETED', 'Monthly yield for 2025-11', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 1678.5791121139, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Julien Grunebaum - IND-USDT - 2025-11: 864.85975288
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-USDT';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Julien Grunebaum%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-11-01'::date
        AND tx_date < ('2025-11-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 864.8597528752,
        '2025-11-28'::date, '2025-11-28'::date,
        'COMPLETED', 'Monthly yield for 2025-11', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 864.8597528752, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Daniele Francilia - IND-USDT - 2025-11: 841.35349218
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-USDT';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Daniele Francilia%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-11-01'::date
        AND tx_date < ('2025-11-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 841.3534921801,
        '2025-11-28'::date, '2025-11-28'::date,
        'COMPLETED', 'Monthly yield for 2025-11', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 841.3534921801, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Pierre Bezençon - IND-USDT - 2025-11: 864.39329532
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-USDT';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Pierre Bezençon%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-11-01'::date
        AND tx_date < ('2025-11-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 864.3932953150,
        '2025-11-28'::date, '2025-11-28'::date,
        'COMPLETED', 'Monthly yield for 2025-11', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 864.3932953150, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Matthew Beatty - IND-USDT - 2025-11: 2631.34180441
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-USDT';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Matthew Beatty%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-11-01'::date
        AND tx_date < ('2025-11-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 2631.3418044128,
        '2025-11-28'::date, '2025-11-28'::date,
        'COMPLETED', 'Monthly yield for 2025-11', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 2631.3418044128, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Bo De kriek - IND-USDT - 2025-11: 2164.73466392
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-USDT';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Bo De kriek%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-11-01'::date
        AND tx_date < ('2025-11-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 2164.7346639195,
        '2025-11-28'::date, '2025-11-28'::date,
        'COMPLETED', 'Monthly yield for 2025-11', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 2164.7346639195, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Dario Deiana - IND-USDT - 2025-11: 1398.31350401
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-USDT';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Dario Deiana%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-11-01'::date
        AND tx_date < ('2025-11-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 1398.3135040129,
        '2025-11-28'::date, '2025-11-28'::date,
        'COMPLETED', 'Monthly yield for 2025-11', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 1398.3135040129, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Alain Bensimon - IND-USDT - 2025-11: 1081.05097291
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-USDT';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Alain Bensimon%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-11-01'::date
        AND tx_date < ('2025-11-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 1081.0509729129,
        '2025-11-28'::date, '2025-11-28'::date,
        'COMPLETED', 'Monthly yield for 2025-11', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 1081.0509729129, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Anne Cecile Noique - IND-USDT - 2025-11: 1760.57685926
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-USDT';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Anne Cecile Noique%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-11-01'::date
        AND tx_date < ('2025-11-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 1760.5768592631,
        '2025-11-28'::date, '2025-11-28'::date,
        'COMPLETED', 'Monthly yield for 2025-11', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 1760.5768592631, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Terance Chen - IND-USDT - 2025-11: 1737.33304186
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-USDT';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Terance Chen%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-11-01'::date
        AND tx_date < ('2025-11-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 1737.3330418591,
        '2025-11-28'::date, '2025-11-28'::date,
        'COMPLETED', 'Monthly yield for 2025-11', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 1737.3330418591, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- INDIGO Ventures - IND-USDT - 2025-11: 16.38758326
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-USDT';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%INDIGO Ventures%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-11-01'::date
        AND tx_date < ('2025-11-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 16.3875832626,
        '2025-11-28'::date, '2025-11-28'::date,
        'COMPLETED', 'Monthly yield for 2025-11', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 16.3875832626, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- INDIGO DIGITAL ASSET FUND LP - IND-USDT - 2025-11: 0.19566062
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-USDT';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%INDIGO DIGITAL ASSET FUND LP%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-11-01'::date
        AND tx_date < ('2025-11-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.1956606212,
        '2025-11-28'::date, '2025-11-28'::date,
        'COMPLETED', 'Monthly yield for 2025-11', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.1956606212, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Sacha Oshry - IND-USDT - 2025-11: 729.59374794
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-USDT';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Sacha Oshry%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-11-01'::date
        AND tx_date < ('2025-11-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 729.5937479399,
        '2025-11-28'::date, '2025-11-28'::date,
        'COMPLETED', 'Monthly yield for 2025-11', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 729.5937479399, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- HALLEY86 - IND-USDT - 2025-11: 686.28974178
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-USDT';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%HALLEY86%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-11-01'::date
        AND tx_date < ('2025-11-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 686.2897417793,
        '2025-11-28'::date, '2025-11-28'::date,
        'COMPLETED', 'Monthly yield for 2025-11', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 686.2897417793, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Jose Molla - IND-USDT - 2025-11: 3.52104174
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-USDT';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Jose Molla%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-11-01'::date
        AND tx_date < ('2025-11-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 3.5210417424,
        '2025-11-28'::date, '2025-11-28'::date,
        'COMPLETED', 'Monthly yield for 2025-11', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 3.5210417424, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Monica Levy Chicheportiche - IND-USDT - 2025-11: 5723.80367341
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-USDT';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Monica Levy Chicheportiche%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-11-01'::date
        AND tx_date < ('2025-11-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 5723.8036734081,
        '2025-11-28'::date, '2025-11-28'::date,
        'COMPLETED', 'Monthly yield for 2025-11', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 5723.8036734081, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Nath & Thomas - IND-USDT - 2025-11: 1444.14547934
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-USDT';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Nath & Thomas%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-11-01'::date
        AND tx_date < ('2025-11-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 1444.1454793401,
        '2025-11-28'::date, '2025-11-28'::date,
        'COMPLETED', 'Monthly yield for 2025-11', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 1444.1454793401, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Valeria Cruz - IND-USDT - 2025-11: 340.63446055
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-USDT';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Valeria Cruz%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-11-01'::date
        AND tx_date < ('2025-11-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 340.6344605500,
        '2025-11-28'::date, '2025-11-28'::date,
        'COMPLETED', 'Monthly yield for 2025-11', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 340.6344605500, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Ventures Life Style - IND-USDT - 2025-11: 715.33236715
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-USDT';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Ventures Life Style%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-11-01'::date
        AND tx_date < ('2025-11-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 715.3323671550,
        '2025-11-28'::date, '2025-11-28'::date,
        'COMPLETED', 'Monthly yield for 2025-11', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 715.3323671550, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- INDIGO DIGITAL ASSET FUND LP - IND-SOL - 2025-11: 7.17468837
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-SOL';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%INDIGO DIGITAL ASSET FUND LP%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-11-01'::date
        AND tx_date < ('2025-11-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 7.1746883675,
        '2025-11-28'::date, '2025-11-28'::date,
        'COMPLETED', 'Monthly yield for 2025-11', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 7.1746883675, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Paul Johnson - IND-SOL - 2025-11: 0.00226297
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-SOL';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Paul Johnson%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-11-01'::date
        AND tx_date < ('2025-11-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0022629668,
        '2025-11-28'::date, '2025-11-28'::date,
        'COMPLETED', 'Monthly yield for 2025-11', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0022629668, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Jose Molla - IND-SOL - 2025-11: 0.50908727
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-SOL';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Jose Molla%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-11-01'::date
        AND tx_date < ('2025-11-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.5090872703,
        '2025-11-28'::date, '2025-11-28'::date,
        'COMPLETED', 'Monthly yield for 2025-11', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.5090872703, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Sam Johnson - IND-SOL - 2025-11: 19.88853749
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-SOL';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Sam Johnson%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-11-01'::date
        AND tx_date < ('2025-11-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 19.8885374916,
        '2025-11-28'::date, '2025-11-28'::date,
        'COMPLETED', 'Monthly yield for 2025-11', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 19.8885374916, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Sam Johnson - IND-XRP - 2025-11: 1442.71890000
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-XRP';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Sam Johnson%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-11-01'::date
        AND tx_date < ('2025-11-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 1442.7189000000,
        '2025-11-28'::date, '2025-11-28'::date,
        'COMPLETED', 'Monthly yield for 2025-11', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 1442.7189000000, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Jose Molla - IND-BTC - 2025-12: 0.04206543
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Jose Molla%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-12-01'::date
        AND tx_date < ('2025-12-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0420654344,
        '2025-12-28'::date, '2025-12-28'::date,
        'COMPLETED', 'Monthly yield for 2025-12', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0420654344, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Thomas Puech - IND-BTC - 2025-12: 0.06278493
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Thomas Puech%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-12-01'::date
        AND tx_date < ('2025-12-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0627849261,
        '2025-12-28'::date, '2025-12-28'::date,
        'COMPLETED', 'Monthly yield for 2025-12', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0627849261, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Danielle Richetta - IND-BTC - 2025-12: 0.03519693
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Danielle Richetta%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-12-01'::date
        AND tx_date < ('2025-12-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0351969340,
        '2025-12-28'::date, '2025-12-28'::date,
        'COMPLETED', 'Monthly yield for 2025-12', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0351969340, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Nathanael Cohen - IND-BTC - 2025-12: 0.00404575
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Nathanael Cohen%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-12-01'::date
        AND tx_date < ('2025-12-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0040457461,
        '2025-12-28'::date, '2025-12-28'::date,
        'COMPLETED', 'Monthly yield for 2025-12', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0040457461, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Blondish - IND-BTC - 2025-12: 0.03719054
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Blondish%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-12-01'::date
        AND tx_date < ('2025-12-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0371905410,
        '2025-12-28'::date, '2025-12-28'::date,
        'COMPLETED', 'Monthly yield for 2025-12', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0371905410, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Kabbaj - IND-BTC - 2025-12: 0.03938417
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Kabbaj%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-12-01'::date
        AND tx_date < ('2025-12-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0393841705,
        '2025-12-28'::date, '2025-12-28'::date,
        'COMPLETED', 'Monthly yield for 2025-12', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0393841705, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Sam Johnson - IND-BTC - 2025-12: 0.06797916
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Sam Johnson%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-12-01'::date
        AND tx_date < ('2025-12-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0679791641,
        '2025-12-28'::date, '2025-12-28'::date,
        'COMPLETED', 'Monthly yield for 2025-12', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0679791641, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Nath & Thomas - IND-BTC - 2025-12: 0.00877039
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Nath & Thomas%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-12-01'::date
        AND tx_date < ('2025-12-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0087703874,
        '2025-12-28'::date, '2025-12-28'::date,
        'COMPLETED', 'Monthly yield for 2025-12', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0087703874, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Matthias Reiser - IND-BTC - 2025-12: 0.00119303
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Matthias Reiser%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-12-01'::date
        AND tx_date < ('2025-12-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0011930320,
        '2025-12-28'::date, '2025-12-28'::date,
        'COMPLETED', 'Monthly yield for 2025-12', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0011930320, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Paul Johnson - IND-BTC - 2025-12: 0.00001743
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-BTC';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Paul Johnson%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-12-01'::date
        AND tx_date < ('2025-12-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0000174292,
        '2025-12-28'::date, '2025-12-28'::date,
        'COMPLETED', 'Monthly yield for 2025-12', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0000174292, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Jose Molla - IND-ETH - 2025-12: 0.36876998
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-ETH';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Jose Molla%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-12-01'::date
        AND tx_date < ('2025-12-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.3687699752,
        '2025-12-28'::date, '2025-12-28'::date,
        'COMPLETED', 'Monthly yield for 2025-12', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.3687699752, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Nathanael Cohen - IND-ETH - 2025-12: 0.18354631
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-ETH';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Nathanael Cohen%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-12-01'::date
        AND tx_date < ('2025-12-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.1835463080,
        '2025-12-28'::date, '2025-12-28'::date,
        'COMPLETED', 'Monthly yield for 2025-12', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.1835463080, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Blondish - IND-ETH - 2025-12: 0.69272356
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-ETH';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Blondish%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-12-01'::date
        AND tx_date < ('2025-12-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.6927235612,
        '2025-12-28'::date, '2025-12-28'::date,
        'COMPLETED', 'Monthly yield for 2025-12', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.6927235612, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Babak Eftekhari - IND-ETH - 2025-12: 0.35412888
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-ETH';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Babak Eftekhari%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-12-01'::date
        AND tx_date < ('2025-12-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.3541288793,
        '2025-12-28'::date, '2025-12-28'::date,
        'COMPLETED', 'Monthly yield for 2025-12', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.3541288793, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Advantage Blockchain - IND-ETH - 2025-12: 0.16585657
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-ETH';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Advantage Blockchain%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-12-01'::date
        AND tx_date < ('2025-12-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.1658565652,
        '2025-12-28'::date, '2025-12-28'::date,
        'COMPLETED', 'Monthly yield for 2025-12', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.1658565652, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Paul Johnson - IND-ETH - 2025-12: 0.00022522
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-ETH';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Paul Johnson%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-12-01'::date
        AND tx_date < ('2025-12-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0002252241,
        '2025-12-28'::date, '2025-12-28'::date,
        'COMPLETED', 'Monthly yield for 2025-12', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0002252241, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Tomer Zur - IND-ETH - 2025-12: 0.97408258
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-ETH';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Tomer Zur%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-12-01'::date
        AND tx_date < ('2025-12-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.9740825768,
        '2025-12-28'::date, '2025-12-28'::date,
        'COMPLETED', 'Monthly yield for 2025-12', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.9740825768, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Sam Johnson - IND-ETH - 2025-12: 1.12825445
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-ETH';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Sam Johnson%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-12-01'::date
        AND tx_date < ('2025-12-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 1.1282544547,
        '2025-12-28'::date, '2025-12-28'::date,
        'COMPLETED', 'Monthly yield for 2025-12', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 1.1282544547, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Brandon Hood - IND-ETH - 2025-12: 0.15862562
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-ETH';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Brandon Hood%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-12-01'::date
        AND tx_date < ('2025-12-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.1586256235,
        '2025-12-28'::date, '2025-12-28'::date,
        'COMPLETED', 'Monthly yield for 2025-12', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.1586256235, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Babak Eftekhari - IND-USDT - 2025-12: 1477.62267367
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-USDT';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Babak Eftekhari%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-12-01'::date
        AND tx_date < ('2025-12-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 1477.6226736677,
        '2025-12-28'::date, '2025-12-28'::date,
        'COMPLETED', 'Monthly yield for 2025-12', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 1477.6226736677, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Julien Grunebaum - IND-USDT - 2025-12: 761.83538335
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-USDT';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Julien Grunebaum%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-12-01'::date
        AND tx_date < ('2025-12-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 761.8353833470,
        '2025-12-28'::date, '2025-12-28'::date,
        'COMPLETED', 'Monthly yield for 2025-12', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 761.8353833470, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Daniele Francilia - IND-USDT - 2025-12: 735.49223526
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-USDT';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Daniele Francilia%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-12-01'::date
        AND tx_date < ('2025-12-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 735.4922352617,
        '2025-12-28'::date, '2025-12-28'::date,
        'COMPLETED', 'Monthly yield for 2025-12', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 735.4922352617, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Pierre Bezençon - IND-USDT - 2025-12: 761.42449144
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-USDT';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Pierre Bezençon%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-12-01'::date
        AND tx_date < ('2025-12-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 761.4244914389,
        '2025-12-28'::date, '2025-12-28'::date,
        'COMPLETED', 'Monthly yield for 2025-12', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 761.4244914389, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Matthew Beatty - IND-USDT - 2025-12: 2317.88944464
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-USDT';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Matthew Beatty%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-12-01'::date
        AND tx_date < ('2025-12-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 2317.8894446384,
        '2025-12-28'::date, '2025-12-28'::date,
        'COMPLETED', 'Monthly yield for 2025-12', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 2317.8894446384, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Bo De kriek - IND-USDT - 2025-12: 1906.86577454
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-USDT';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Bo De kriek%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-12-01'::date
        AND tx_date < ('2025-12-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 1906.8657745365,
        '2025-12-28'::date, '2025-12-28'::date,
        'COMPLETED', 'Monthly yield for 2025-12', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 1906.8657745365, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Dario Deiana - IND-USDT - 2025-12: 1230.70176307
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-USDT';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Dario Deiana%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-12-01'::date
        AND tx_date < ('2025-12-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 1230.7017630729,
        '2025-12-28'::date, '2025-12-28'::date,
        'COMPLETED', 'Monthly yield for 2025-12', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 1230.7017630729, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Alain Bensimon - IND-USDT - 2025-12: 952.27333637
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-USDT';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Alain Bensimon%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-12-01'::date
        AND tx_date < ('2025-12-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 952.2733363749,
        '2025-12-28'::date, '2025-12-28'::date,
        'COMPLETED', 'Monthly yield for 2025-12', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 952.2733363749, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Anne Cecile Noique - IND-USDT - 2025-12: 1550.85231106
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-USDT';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Anne Cecile Noique%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-12-01'::date
        AND tx_date < ('2025-12-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 1550.8523110593,
        '2025-12-28'::date, '2025-12-28'::date,
        'COMPLETED', 'Monthly yield for 2025-12', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 1550.8523110593, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Terance Chen - IND-USDT - 2025-12: 1530.37735835
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-USDT';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Terance Chen%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-12-01'::date
        AND tx_date < ('2025-12-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 1530.3773583476,
        '2025-12-28'::date, '2025-12-28'::date,
        'COMPLETED', 'Monthly yield for 2025-12', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 1530.3773583476, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- INDIGO Ventures - IND-USDT - 2025-12: 14.32565545
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-USDT';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%INDIGO Ventures%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-12-01'::date
        AND tx_date < ('2025-12-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 14.3256554544,
        '2025-12-28'::date, '2025-12-28'::date,
        'COMPLETED', 'Monthly yield for 2025-12', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 14.3256554544, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- INDIGO DIGITAL ASSET FUND LP - IND-USDT - 2025-12: 0.17220736
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-USDT';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%INDIGO DIGITAL ASSET FUND LP%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-12-01'::date
        AND tx_date < ('2025-12-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.1722073561,
        '2025-12-28'::date, '2025-12-28'::date,
        'COMPLETED', 'Monthly yield for 2025-12', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.1722073561, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Sacha Oshry - IND-USDT - 2025-12: 642.41105242
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-USDT';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Sacha Oshry%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-12-01'::date
        AND tx_date < ('2025-12-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 642.4110524200,
        '2025-12-28'::date, '2025-12-28'::date,
        'COMPLETED', 'Monthly yield for 2025-12', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 642.4110524200, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- HALLEY86 - IND-USDT - 2025-12: 604.02620211
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-USDT';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%HALLEY86%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-12-01'::date
        AND tx_date < ('2025-12-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 604.0262021090,
        '2025-12-28'::date, '2025-12-28'::date,
        'COMPLETED', 'Monthly yield for 2025-12', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 604.0262021090, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Jose Molla - IND-USDT - 2025-12: 3.09898479
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-USDT';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Jose Molla%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-12-01'::date
        AND tx_date < ('2025-12-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 3.0989847897,
        '2025-12-28'::date, '2025-12-28'::date,
        'COMPLETED', 'Monthly yield for 2025-12', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 3.0989847897, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Monica Levy Chicheportiche - IND-USDT - 2025-12: 5037.70810489
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-USDT';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Monica Levy Chicheportiche%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-12-01'::date
        AND tx_date < ('2025-12-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 5037.7081048928,
        '2025-12-28'::date, '2025-12-28'::date,
        'COMPLETED', 'Monthly yield for 2025-12', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 5037.7081048928, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Valeria Cruz - IND-USDT - 2025-12: 299.80360624
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-USDT';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Valeria Cruz%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-12-01'::date
        AND tx_date < ('2025-12-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 299.8036062437,
        '2025-12-28'::date, '2025-12-28'::date,
        'COMPLETED', 'Monthly yield for 2025-12', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 299.8036062437, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Ventures Life Style - IND-USDT - 2025-12: 629.80058118
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-USDT';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Ventures Life Style%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-12-01'::date
        AND tx_date < ('2025-12-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 629.8005811773,
        '2025-12-28'::date, '2025-12-28'::date,
        'COMPLETED', 'Monthly yield for 2025-12', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 629.8005811773, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Thomas Puech - IND-USDT - 2025-12: 278.42435013
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-USDT';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Thomas Puech%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-12-01'::date
        AND tx_date < ('2025-12-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 278.4243501293,
        '2025-12-28'::date, '2025-12-28'::date,
        'COMPLETED', 'Monthly yield for 2025-12', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 278.4243501293, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Paul Johnson - IND-SOL - 2025-12: 0.00266094
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-SOL';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Paul Johnson%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-12-01'::date
        AND tx_date < ('2025-12-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.0026609411,
        '2025-12-28'::date, '2025-12-28'::date,
        'COMPLETED', 'Monthly yield for 2025-12', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.0026609411, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Jose Molla - IND-SOL - 2025-12: 0.59833992
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-SOL';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Jose Molla%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-12-01'::date
        AND tx_date < ('2025-12-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 0.5983399233,
        '2025-12-28'::date, '2025-12-28'::date,
        'COMPLETED', 'Monthly yield for 2025-12', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 0.5983399233, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Sam Johnson - IND-SOL - 2025-12: 34.05988985
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-SOL';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Sam Johnson%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-12-01'::date
        AND tx_date < ('2025-12-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 34.0598898462,
        '2025-12-28'::date, '2025-12-28'::date,
        'COMPLETED', 'Monthly yield for 2025-12', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 34.0598898462, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  -- Sam Johnson - IND-XRP - 2025-12: 1902.83543753
  SELECT id INTO v_fund_id FROM funds WHERE code = 'IND-XRP';
  SELECT p.id INTO v_investor_id FROM profiles p
    WHERE LOWER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) LIKE LOWER('%Sam Johnson%')
    LIMIT 1;

  IF v_investor_id IS NOT NULL AND v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM transactions_v2
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id
        AND type = 'YIELD' AND tx_date >= '2025-12-01'::date
        AND tx_date < ('2025-12-01'::date + INTERVAL '1 month')
        AND NOT is_voided
    ) THEN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, economic_date,
        status, notes, created_by
      ) VALUES (
        v_investor_id, v_fund_id, 'YIELD', 1902.8354375343,
        '2025-12-28'::date, '2025-12-28'::date,
        'COMPLETED', 'Monthly yield for 2025-12', v_admin_id
      );

      UPDATE investor_positions
      SET current_value = current_value + 1902.8354375343, updated_at = NOW()
      WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

      v_tx_count := v_tx_count + 1;
    END IF;
  END IF;


  RAISE NOTICE 'Created % YIELD transactions', v_tx_count;
END $$;

-- Verification query
SELECT
  COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '') as investor,
  f.code as fund,
  ip.current_value as position,
  COALESCE((SELECT SUM(amount) FROM transactions_v2
    WHERE investor_id = ip.investor_id AND fund_id = ip.fund_id
    AND type = 'YIELD' AND NOT is_voided), 0) as total_yield,
  COALESCE((SELECT SUM(amount) FROM transactions_v2
    WHERE investor_id = ip.investor_id AND fund_id = ip.fund_id
    AND type = 'DEPOSIT' AND NOT is_voided), 0) as total_deposits
FROM investor_positions ip
JOIN profiles p ON ip.investor_id = p.id
JOIN funds f ON ip.fund_id = f.id
WHERE ip.current_value > 0
ORDER BY f.code, investor;
