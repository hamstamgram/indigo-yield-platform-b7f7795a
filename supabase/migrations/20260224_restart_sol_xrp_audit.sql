-- =============================================================================
-- MIGRATION: 20260224_restart_sol_xrp_audit (REWRITTEN for First Principles API)
-- PURPOSE: Full restart of SOL and XRP fund data to exactly match Excel source
--
-- RULES:
--   1. Investor withdrawals: 3 decimal places max
--   2. Sub-3-decimal dust after withdrawal -> DEPOSIT to Indigo Fees
--   3. All amounts sourced from Excel "Accounting Yield Funds" workbook
--
-- API: apply_investor_transaction + apply_segmented_yield_distribution_v5
-- SOL Fund ID: 7574bc81-aab3-4175-9e7f-803aa6f9eb8f
-- XRP Fund ID: 2c123c4f-76b4-4504-867e-059649855417
-- =============================================================================

-- SECTION 1: Override historical lock to FALSE for backfill
-- (Both 2-param and 3-param, since V5 calls the 3-param version)
CREATE OR REPLACE FUNCTION public.check_historical_lock(p_fund_id uuid, p_tx_date date)
RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$ SELECT false $$;

CREATE OR REPLACE FUNCTION public.check_historical_lock(p_fund_id uuid, p_tx_date date, p_is_distribution boolean)
RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$ SELECT false $$;

-- =============================================================================
-- SECTION 2: Data entry DO block
-- =============================================================================
DO $$
DECLARE
  v_sol_fund  uuid := '7574bc81-aab3-4175-9e7f-803aa6f9eb8f';
  v_xrp_fund  uuid := '2c123c4f-76b4-4504-867e-059649855417';

  v_indigo_lp uuid := 'd91f3eb7-bd47-4c42-ab4f-c4f20fb41b13';
  v_paul      uuid := 'd1f8c666-58c5-4a83-a5c6-0f66a380aaf2';
  v_alex      uuid := 'd681a28c-bb59-4bb7-bf34-ab23910596df';
  v_jose      uuid;
  v_sam       uuid := '2f7b8bb2-6a60-4fc9-953d-b9fae44337c1';
  v_ryan      uuid := 'f462d9e5-7363-4c82-a144-4e694d2b55da';
  v_fees      uuid := 'b464a3f7-60d5-4bc0-9833-7b413bcc6cae';
  v_alok      uuid := 'bd8ba788-4d65-4cb8-8b7b-784b3156baf7';

  v_admin     uuid;
  v_dust      numeric;
  v_dist_id   uuid;
  v_inv_id    uuid;
  v_sum_pos   numeric;
BEGIN
  -- ================================================================
  -- SETUP
  -- ================================================================
  SELECT id INTO v_admin FROM profiles
  WHERE is_admin = true ORDER BY created_at LIMIT 1;
  IF v_admin IS NULL THEN RAISE EXCEPTION 'No admin found'; END IF;

  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  PERFORM set_config('app.canonical_rpc', 'true', true);
  UPDATE system_config SET value = '"backfill"' WHERE key = 'system_mode';
  PERFORM set_config('request.jwt.claims',
    '{"sub":"' || v_admin::text || '","role":"authenticated"}', true);
  RAISE NOTICE 'Setup: admin=%', v_admin;

  -- ================================================================
  -- PHASE 0: Create Jose Molla (idempotent)
  -- ================================================================
  SELECT id INTO v_jose FROM profiles WHERE email = 'jose.molla@indigofund.placeholder';
  IF v_jose IS NULL THEN
    v_jose := gen_random_uuid();
    INSERT INTO auth.users (
      id, email, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, role, aud,
      encrypted_password,
      confirmation_token, recovery_token,
      email_change_token_new, email_change,
      email_change_token_current, reauthentication_token,
      phone_change_token, phone_change
    ) VALUES (
      v_jose, 'jose.molla@indigofund.placeholder', now(),
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
      '2025-10-01 00:00:00+00', '2025-10-01 00:00:00+00',
      'authenticated', 'authenticated',
      crypt('TempPass2026!', gen_salt('bf')),
      '', '', '', '', '', '', '', ''
    );
    INSERT INTO profiles (
      id, first_name, last_name, email,
      account_type, is_admin, fee_percentage, ib_parent_id, ib_percentage, created_at
    ) VALUES (
      v_jose, 'Jose', 'Molla', 'jose.molla@indigofund.placeholder',
      'investor', false, 0.15, NULL, 0,
      '2025-10-01 00:00:00+00'::timestamptz
    );
    RAISE NOTICE 'Jose Molla created: %', v_jose;
  ELSE
    RAISE NOTICE 'Jose Molla exists: %', v_jose;
  END IF;

  -- ================================================================
  -- PHASE 0.5: Verify fee/IB settings
  -- ================================================================
  UPDATE profiles SET fee_percentage = 0.00, ib_parent_id = NULL, ib_percentage = 0
  WHERE id = v_indigo_lp;
  UPDATE profiles SET fee_percentage = 0.135, ib_parent_id = v_alex, ib_percentage = 0.015
  WHERE id = v_paul;
  UPDATE profiles SET fee_percentage = 0.20, ib_parent_id = NULL, ib_percentage = 0
  WHERE id = v_alex;
  UPDATE profiles SET fee_percentage = 0.16, ib_parent_id = v_ryan, ib_percentage = 0.04
  WHERE id = v_sam;
  UPDATE profiles SET fee_percentage = 0.20, ib_parent_id = NULL, ib_percentage = 0
  WHERE id = v_ryan;
  UPDATE profiles SET fee_percentage = 0.20, ib_parent_id = NULL, ib_percentage = 0
  WHERE id = v_alok;
  UPDATE profiles SET fee_percentage = 0.00, ib_parent_id = NULL, ib_percentage = 0
  WHERE id = v_fees;
  RAISE NOTICE 'Fee/IB settings confirmed';

  -- ================================================================
  -- PHASE 1: Void ALL existing SOL data
  -- ================================================================
  FOR v_dist_id IN
    SELECT id FROM yield_distributions
    WHERE fund_id = v_sol_fund AND is_voided = false
  LOOP
    PERFORM void_yield_distribution(
      v_dist_id, v_admin,
      'Audit restart 2026-02-24: re-entering from Excel source', true
    );
  END LOOP;

  UPDATE transactions_v2
  SET is_voided = true, voided_at = now(), voided_by = v_admin,
      void_reason = 'Audit restart 2026-02-24: re-entering from Excel source'
  WHERE fund_id = v_sol_fund AND is_voided = false;

  FOR v_inv_id IN
    SELECT DISTINCT investor_id FROM investor_positions WHERE fund_id = v_sol_fund
  LOOP
    PERFORM recompute_investor_position(v_inv_id, v_sol_fund);
  END LOOP;

  UPDATE investor_positions SET is_active = false, updated_at = NOW()
  WHERE fund_id = v_sol_fund AND is_active = true;

  RAISE NOTICE 'SOL voided and reset';

  -- ================================================================
  -- PHASE 2: Void ALL existing XRP data
  -- ================================================================
  FOR v_dist_id IN
    SELECT id FROM yield_distributions
    WHERE fund_id = v_xrp_fund AND is_voided = false
  LOOP
    PERFORM void_yield_distribution(
      v_dist_id, v_admin,
      'Audit restart 2026-02-24: re-entering from Excel source', true
    );
  END LOOP;

  UPDATE transactions_v2
  SET is_voided = true, voided_at = now(), voided_by = v_admin,
      void_reason = 'Audit restart 2026-02-24: re-entering from Excel source'
  WHERE fund_id = v_xrp_fund AND is_voided = false;

  FOR v_inv_id IN
    SELECT DISTINCT investor_id FROM investor_positions WHERE fund_id = v_xrp_fund
  LOOP
    PERFORM recompute_investor_position(v_inv_id, v_xrp_fund);
  END LOOP;

  UPDATE investor_positions SET is_active = false, updated_at = NOW()
  WHERE fund_id = v_xrp_fund AND is_active = true;

  RAISE NOTICE 'XRP voided and reset';

  -- ================================================================
  -- PHASE 3: SOL Yield Fund - Re-enter from Excel
  --
  -- Model: call apply_segmented_yield_distribution_v5 BEFORE each
  -- deposit/withdrawal that has prior accrued yield (AUM Before > AUM After prev).
  -- For standalone month-end distributions: use SUM(positions) + exact_yield.
  -- ================================================================

  -- 2025-09-02: INDIGO LP initial deposit 1,250 SOL (no prior AUM, no yield)
  PERFORM apply_investor_transaction(
    p_fund_id     := v_sol_fund,
    p_investor_id := v_indigo_lp,
    p_tx_type     := 'DEPOSIT'::tx_type,
    p_amount      := 1250.000,
    p_tx_date     := '2025-09-02'::date,
    p_reference_id := 'sol_dep_indigo_20250902',
    p_admin_id    := v_admin,
    p_notes       := 'INDIGO LP initial deposit 2025-09-02'
  );
  RAISE NOTICE 'SOL 2025-09-02 INDIGO LP deposit done';

  -- 2025-09-04: Pre-deposit yield (AUM Before=1252, yield=2), then Paul deposits 234.170
  v_dist_id := apply_segmented_yield_distribution_v5(
    p_fund_id          := v_sol_fund,
    p_period_end       := '2025-09-04'::date,
    p_recorded_aum     := 1252.000,
    p_created_by       := v_admin,
    p_purpose          := 'transaction'::aum_purpose,
    p_distribution_date := '2025-09-04'::date
  );
  RAISE NOTICE 'SOL 2025-09-04 pre-deposit yield dist: %', v_dist_id;

  PERFORM apply_investor_transaction(
    p_fund_id     := v_sol_fund,
    p_investor_id := v_paul,
    p_tx_type     := 'DEPOSIT'::tx_type,
    p_amount      := 234.170,
    p_tx_date     := '2025-09-04'::date,
    p_reference_id := 'sol_dep_paul_20250904',
    p_admin_id    := v_admin,
    p_notes       := 'Paul Johnson deposit 2025-09-04'
  );
  RAISE NOTICE 'SOL 2025-09-04 Paul deposit done';

  -- 2025-09-30: Monthly yield distribution (yield=13.830, AUM After=1500)
  SELECT COALESCE(SUM(current_value), 0) INTO v_sum_pos
  FROM investor_positions WHERE fund_id = v_sol_fund AND is_active = true;
  v_dist_id := apply_segmented_yield_distribution_v5(
    p_fund_id          := v_sol_fund,
    p_period_end       := '2025-09-30'::date,
    p_recorded_aum     := v_sum_pos + 13.830,
    p_created_by       := v_admin,
    p_purpose          := 'transaction'::aum_purpose,
    p_distribution_date := '2025-09-30'::date
  );
  RAISE NOTICE 'SOL 2025-09-30 monthly yield dist: %, recorded_aum=% (pos=%+13.830)', v_dist_id, v_sum_pos + 13.830, v_sum_pos;

  -- 2025-10-03: Paul withdraws 236.020 (AUM Before=1500=AUM After Sep-30, no yield)
  PERFORM apply_investor_transaction(
    p_fund_id     := v_sol_fund,
    p_investor_id := v_paul,
    p_tx_type     := 'WITHDRAWAL'::tx_type,
    p_amount      := 236.020,
    p_tx_date     := '2025-10-03'::date,
    p_reference_id := 'sol_wd_paul_20251003',
    p_admin_id    := v_admin,
    p_notes       := 'Paul Johnson exit 2025-10-03 (3-decimal)'
  );
  -- Dust sweep: remaining position -> Indigo Fees
  SELECT COALESCE(current_value, 0) INTO v_dust
  FROM investor_positions WHERE investor_id = v_paul AND fund_id = v_sol_fund;
  IF v_dust > 0.0000000001 THEN
    RAISE NOTICE 'SOL Paul dust: % SOL', v_dust;
    PERFORM apply_investor_transaction(
      p_fund_id     := v_sol_fund, p_investor_id := v_paul,
      p_tx_type     := 'WITHDRAWAL'::tx_type, p_amount := v_dust,
      p_tx_date     := '2025-10-03'::date,
      p_reference_id := 'sol_dust_out_paul_20251003',
      p_admin_id    := v_admin, p_notes := 'Paul exit dust'
    );
    PERFORM apply_investor_transaction(
      p_fund_id     := v_sol_fund, p_investor_id := v_fees,
      p_tx_type     := 'DEPOSIT'::tx_type, p_amount := v_dust,
      p_tx_date     := '2025-10-03'::date,
      p_reference_id := 'sol_dust_recv_paul_20251003',
      p_admin_id    := v_admin, p_notes := 'Paul exit dust to Indigo Fees'
    );
  END IF;
  UPDATE investor_positions SET is_active = false, updated_at = NOW()
  WHERE investor_id = v_paul AND fund_id = v_sol_fund;
  RAISE NOTICE 'SOL Paul exit complete (dust=%)', v_dust;

  -- 2025-10-23: Pre-deposit yield (AUM Before=1274), then Jose deposits 87.980
  v_dist_id := apply_segmented_yield_distribution_v5(
    p_fund_id          := v_sol_fund,
    p_period_end       := '2025-10-23'::date,
    p_recorded_aum     := 1274.000,
    p_created_by       := v_admin,
    p_purpose          := 'transaction'::aum_purpose,
    p_distribution_date := '2025-10-23'::date
  );
  RAISE NOTICE 'SOL 2025-10-23 pre-deposit yield dist: %', v_dist_id;

  PERFORM apply_investor_transaction(
    p_fund_id     := v_sol_fund,
    p_investor_id := v_jose,
    p_tx_type     := 'DEPOSIT'::tx_type,
    p_amount      := 87.980,
    p_tx_date     := '2025-10-23'::date,
    p_reference_id := 'sol_dep_jose_20251023',
    p_admin_id    := v_admin,
    p_notes       := 'Jose Molla deposit 2025-10-23'
  );
  RAISE NOTICE 'SOL 2025-10-23 Jose deposit done';

  -- 2025-10-31: Monthly yield distribution (yield=3.020)
  SELECT COALESCE(SUM(current_value), 0) INTO v_sum_pos
  FROM investor_positions WHERE fund_id = v_sol_fund AND is_active = true;
  v_dist_id := apply_segmented_yield_distribution_v5(
    p_fund_id          := v_sol_fund,
    p_period_end       := '2025-10-31'::date,
    p_recorded_aum     := v_sum_pos + 3.020,
    p_created_by       := v_admin,
    p_purpose          := 'transaction'::aum_purpose,
    p_distribution_date := '2025-10-31'::date
  );
  RAISE NOTICE 'SOL 2025-10-31 monthly yield dist: %, recorded_aum=%+3.020', v_dist_id, v_sum_pos;

  -- 2025-11-17: Pre-deposit yield (AUM Before=1369), then Sam deposits 1800.050
  v_dist_id := apply_segmented_yield_distribution_v5(
    p_fund_id          := v_sol_fund,
    p_period_end       := '2025-11-17'::date,
    p_recorded_aum     := 1369.000,
    p_created_by       := v_admin,
    p_purpose          := 'transaction'::aum_purpose,
    p_distribution_date := '2025-11-17'::date
  );
  RAISE NOTICE 'SOL 2025-11-17 pre-deposit yield dist: %', v_dist_id;

  PERFORM apply_investor_transaction(
    p_fund_id     := v_sol_fund,
    p_investor_id := v_sam,
    p_tx_type     := 'DEPOSIT'::tx_type,
    p_amount      := 1800.050,
    p_tx_date     := '2025-11-17'::date,
    p_reference_id := 'sol_dep_sam_20251117',
    p_admin_id    := v_admin,
    p_notes       := 'Sam Johnson deposit 2025-11-17'
  );
  RAISE NOTICE 'SOL 2025-11-17 Sam deposit done';

  -- 2025-11-25: Pre-deposit yield (AUM Before=3176), then Sam deposits 750
  v_dist_id := apply_segmented_yield_distribution_v5(
    p_fund_id          := v_sol_fund,
    p_period_end       := '2025-11-25'::date,
    p_recorded_aum     := 3176.000,
    p_created_by       := v_admin,
    p_purpose          := 'transaction'::aum_purpose,
    p_distribution_date := '2025-11-25'::date
  );
  RAISE NOTICE 'SOL 2025-11-25 pre-deposit yield dist: %', v_dist_id;

  PERFORM apply_investor_transaction(
    p_fund_id     := v_sol_fund,
    p_investor_id := v_sam,
    p_tx_type     := 'DEPOSIT'::tx_type,
    p_amount      := 750.000,
    p_tx_date     := '2025-11-25'::date,
    p_reference_id := 'sol_dep_sam_20251125',
    p_admin_id    := v_admin,
    p_notes       := 'Sam Johnson deposit 2025-11-25'
  );
  RAISE NOTICE 'SOL 2025-11-25 Sam deposit done';

  -- 2025-11-30: Pre-deposit yield (AUM Before=3934), then Sam deposits 750
  v_dist_id := apply_segmented_yield_distribution_v5(
    p_fund_id          := v_sol_fund,
    p_period_end       := '2025-11-30'::date,
    p_recorded_aum     := 3934.000,
    p_created_by       := v_admin,
    p_purpose          := 'transaction'::aum_purpose,
    p_distribution_date := '2025-11-30'::date
  );
  RAISE NOTICE 'SOL 2025-11-30 pre-deposit yield dist: %', v_dist_id;

  PERFORM apply_investor_transaction(
    p_fund_id     := v_sol_fund,
    p_investor_id := v_sam,
    p_tx_type     := 'DEPOSIT'::tx_type,
    p_amount      := 750.000,
    p_tx_date     := '2025-11-30'::date,
    p_reference_id := 'sol_dep_sam_20251130',
    p_admin_id    := v_admin,
    p_notes       := 'Sam Johnson deposit 2025-11-30'
  );
  RAISE NOTICE 'SOL 2025-11-30 Sam deposit done';

  -- 2025-12-04: Pre-withdrawal yield (AUM Before=4690), then INDIGO LP withdraws 1285.660
  v_dist_id := apply_segmented_yield_distribution_v5(
    p_fund_id          := v_sol_fund,
    p_period_end       := '2025-12-04'::date,
    p_recorded_aum     := 4690.000,
    p_created_by       := v_admin,
    p_purpose          := 'transaction'::aum_purpose,
    p_distribution_date := '2025-12-04'::date
  );
  RAISE NOTICE 'SOL 2025-12-04 pre-withdrawal yield dist: %', v_dist_id;

  PERFORM apply_investor_transaction(
    p_fund_id     := v_sol_fund,
    p_investor_id := v_indigo_lp,
    p_tx_type     := 'WITHDRAWAL'::tx_type,
    p_amount      := 1285.660,
    p_tx_date     := '2025-12-04'::date,
    p_reference_id := 'sol_wd_indigo_20251204',
    p_admin_id    := v_admin,
    p_notes       := 'INDIGO LP exit 2025-12-04 (3-decimal)'
  );
  -- Dust sweep INDIGO LP
  SELECT COALESCE(current_value, 0) INTO v_dust
  FROM investor_positions WHERE investor_id = v_indigo_lp AND fund_id = v_sol_fund;
  IF v_dust > 0.0000000001 THEN
    RAISE NOTICE 'SOL INDIGO LP dust: % SOL', v_dust;
    PERFORM apply_investor_transaction(
      p_fund_id     := v_sol_fund, p_investor_id := v_indigo_lp,
      p_tx_type     := 'WITHDRAWAL'::tx_type, p_amount := v_dust,
      p_tx_date     := '2025-12-04'::date,
      p_reference_id := 'sol_dust_out_indigo_20251204',
      p_admin_id    := v_admin, p_notes := 'INDIGO LP exit dust'
    );
    PERFORM apply_investor_transaction(
      p_fund_id     := v_sol_fund, p_investor_id := v_fees,
      p_tx_type     := 'DEPOSIT'::tx_type, p_amount := v_dust,
      p_tx_date     := '2025-12-04'::date,
      p_reference_id := 'sol_dust_recv_indigo_20251204',
      p_admin_id    := v_admin, p_notes := 'INDIGO LP exit dust to Indigo Fees'
    );
  END IF;
  UPDATE investor_positions SET is_active = false, updated_at = NOW()
  WHERE investor_id = v_indigo_lp AND fund_id = v_sol_fund;
  RAISE NOTICE 'SOL INDIGO LP exit complete (dust=%)', v_dust;

  -- 2025-12-08: Pre-deposit yield (AUM Before=3405), then Sam deposits 770
  v_dist_id := apply_segmented_yield_distribution_v5(
    p_fund_id          := v_sol_fund,
    p_period_end       := '2025-12-08'::date,
    p_recorded_aum     := 3405.000,
    p_created_by       := v_admin,
    p_purpose          := 'transaction'::aum_purpose,
    p_distribution_date := '2025-12-08'::date
  );
  RAISE NOTICE 'SOL 2025-12-08 pre-deposit yield dist: %', v_dist_id;

  PERFORM apply_investor_transaction(
    p_fund_id     := v_sol_fund,
    p_investor_id := v_sam,
    p_tx_type     := 'DEPOSIT'::tx_type,
    p_amount      := 770.000,
    p_tx_date     := '2025-12-08'::date,
    p_reference_id := 'sol_dep_sam_20251208',
    p_admin_id    := v_admin,
    p_notes       := 'Sam Johnson deposit 2025-12-08'
  );
  RAISE NOTICE 'SOL 2025-12-08 Sam deposit done';

  -- 2025-12-15: Pre-deposit yield (AUM Before=4181), then Sam deposits 766
  v_dist_id := apply_segmented_yield_distribution_v5(
    p_fund_id          := v_sol_fund,
    p_period_end       := '2025-12-15'::date,
    p_recorded_aum     := 4181.000,
    p_created_by       := v_admin,
    p_purpose          := 'transaction'::aum_purpose,
    p_distribution_date := '2025-12-15'::date
  );
  RAISE NOTICE 'SOL 2025-12-15 pre-deposit yield dist: %', v_dist_id;

  PERFORM apply_investor_transaction(
    p_fund_id     := v_sol_fund,
    p_investor_id := v_sam,
    p_tx_type     := 'DEPOSIT'::tx_type,
    p_amount      := 766.000,
    p_tx_date     := '2025-12-15'::date,
    p_reference_id := 'sol_dep_sam_20251215',
    p_admin_id    := v_admin,
    p_notes       := 'Sam Johnson deposit 2025-12-15'
  );
  RAISE NOTICE 'SOL 2025-12-15 Sam deposit done';

  -- 2026-01-01: Monthly yield distribution (yield=27.000)
  SELECT COALESCE(SUM(current_value), 0) INTO v_sum_pos
  FROM investor_positions WHERE fund_id = v_sol_fund AND is_active = true;
  v_dist_id := apply_segmented_yield_distribution_v5(
    p_fund_id          := v_sol_fund,
    p_period_end       := '2026-01-01'::date,
    p_recorded_aum     := v_sum_pos + 27.000,
    p_created_by       := v_admin,
    p_purpose          := 'transaction'::aum_purpose,
    p_distribution_date := '2026-01-01'::date
  );
  RAISE NOTICE 'SOL 2026-01-01 monthly yield dist: %, recorded_aum=%+27', v_dist_id, v_sum_pos;

  -- 2026-01-02: Sam withdraws 4873.150 (AUM Before=4974=AUM After Jan-01, no yield)
  PERFORM apply_investor_transaction(
    p_fund_id     := v_sol_fund,
    p_investor_id := v_sam,
    p_tx_type     := 'WITHDRAWAL'::tx_type,
    p_amount      := 4873.150,
    p_tx_date     := '2026-01-02'::date,
    p_reference_id := 'sol_wd_sam_20260102',
    p_admin_id    := v_admin,
    p_notes       := 'Sam Johnson exit 2026-01-02 (3-decimal)'
  );
  -- Dust sweep Sam
  SELECT COALESCE(current_value, 0) INTO v_dust
  FROM investor_positions WHERE investor_id = v_sam AND fund_id = v_sol_fund;
  IF v_dust > 0.0000000001 THEN
    RAISE NOTICE 'SOL Sam dust: % SOL', v_dust;
    PERFORM apply_investor_transaction(
      p_fund_id     := v_sol_fund, p_investor_id := v_sam,
      p_tx_type     := 'WITHDRAWAL'::tx_type, p_amount := v_dust,
      p_tx_date     := '2026-01-02'::date,
      p_reference_id := 'sol_dust_out_sam_20260102',
      p_admin_id    := v_admin, p_notes := 'Sam exit dust'
    );
    PERFORM apply_investor_transaction(
      p_fund_id     := v_sol_fund, p_investor_id := v_fees,
      p_tx_type     := 'DEPOSIT'::tx_type, p_amount := v_dust,
      p_tx_date     := '2026-01-02'::date,
      p_reference_id := 'sol_dust_recv_sam_20260102',
      p_admin_id    := v_admin, p_notes := 'Sam exit dust to Indigo Fees'
    );
  END IF;
  UPDATE investor_positions SET is_active = false, updated_at = NOW()
  WHERE investor_id = v_sam AND fund_id = v_sol_fund;
  RAISE NOTICE 'SOL Sam exit complete (dust=%)', v_dust;

  -- 2026-02-01: Monthly yield distribution (yield=1.150)
  SELECT COALESCE(SUM(current_value), 0) INTO v_sum_pos
  FROM investor_positions WHERE fund_id = v_sol_fund AND is_active = true;
  v_dist_id := apply_segmented_yield_distribution_v5(
    p_fund_id          := v_sol_fund,
    p_period_end       := '2026-02-01'::date,
    p_recorded_aum     := v_sum_pos + 1.150,
    p_created_by       := v_admin,
    p_purpose          := 'transaction'::aum_purpose,
    p_distribution_date := '2026-02-01'::date
  );
  RAISE NOTICE 'SOL 2026-02-01 monthly yield dist: %, recorded_aum=%+1.150', v_dist_id, v_sum_pos;

  -- 2026-02-12: Jose deposits 393.770, Alok deposits 826.540 (no prior yield)
  -- AUM Before = 102 = AUM After Feb-01
  PERFORM apply_investor_transaction(
    p_fund_id     := v_sol_fund,
    p_investor_id := v_jose,
    p_tx_type     := 'DEPOSIT'::tx_type,
    p_amount      := 393.770,
    p_tx_date     := '2026-02-12'::date,
    p_reference_id := 'sol_dep_jose_20260212',
    p_admin_id    := v_admin,
    p_notes       := 'Jose Molla deposit 2026-02-12'
  );
  PERFORM apply_investor_transaction(
    p_fund_id     := v_sol_fund,
    p_investor_id := v_alok,
    p_tx_type     := 'DEPOSIT'::tx_type,
    p_amount      := 826.540,
    p_tx_date     := '2026-02-12'::date,
    p_reference_id := 'sol_dep_alok_20260212',
    p_admin_id    := v_admin,
    p_notes       := 'Alok Pavan Batra deposit 2026-02-12'
  );
  RAISE NOTICE 'SOL re-entry complete. Final AUM should be ~1322.310';

  -- ================================================================
  -- PHASE 4: XRP Yield Fund - Re-enter from Excel
  -- ================================================================

  -- 2025-11-17: Sam initial deposit 135,003 XRP (no prior AUM, no yield)
  PERFORM apply_investor_transaction(
    p_fund_id     := v_xrp_fund,
    p_investor_id := v_sam,
    p_tx_type     := 'DEPOSIT'::tx_type,
    p_amount      := 135003.000,
    p_tx_date     := '2025-11-17'::date,
    p_reference_id := 'xrp_dep_sam_20251117',
    p_admin_id    := v_admin,
    p_notes       := 'Sam Johnson XRP initial deposit 2025-11-17'
  );
  RAISE NOTICE 'XRP 2025-11-17 Sam deposit done';

  -- 2025-11-25: Sam deposits 49,000 XRP (no prior yield - AUM Before=135003=AUM After Nov-17)
  PERFORM apply_investor_transaction(
    p_fund_id     := v_xrp_fund,
    p_investor_id := v_sam,
    p_tx_type     := 'DEPOSIT'::tx_type,
    p_amount      := 49000.000,
    p_tx_date     := '2025-11-25'::date,
    p_reference_id := 'xrp_dep_sam_20251125',
    p_admin_id    := v_admin,
    p_notes       := 'Sam Johnson XRP deposit 2025-11-25'
  );
  RAISE NOTICE 'XRP 2025-11-25 Sam deposit done';

  -- 2025-11-30: Pre-deposit yield (AUM Before=184358, yield=355), then Sam deposits 45,000
  v_dist_id := apply_segmented_yield_distribution_v5(
    p_fund_id          := v_xrp_fund,
    p_period_end       := '2025-11-30'::date,
    p_recorded_aum     := 184358.000,
    p_created_by       := v_admin,
    p_purpose          := 'transaction'::aum_purpose,
    p_distribution_date := '2025-11-30'::date
  );
  RAISE NOTICE 'XRP 2025-11-30 pre-deposit yield dist: %', v_dist_id;

  PERFORM apply_investor_transaction(
    p_fund_id     := v_xrp_fund,
    p_investor_id := v_sam,
    p_tx_type     := 'DEPOSIT'::tx_type,
    p_amount      := 45000.000,
    p_tx_date     := '2025-11-30'::date,
    p_reference_id := 'xrp_dep_sam_20251130',
    p_admin_id    := v_admin,
    p_notes       := 'Sam Johnson XRP deposit 2025-11-30'
  );
  RAISE NOTICE 'XRP 2025-11-30 Sam deposit done';

  -- 2025-12-08: Pre-deposit yield (AUM Before=229731, yield=373), then Sam deposits 49,500
  v_dist_id := apply_segmented_yield_distribution_v5(
    p_fund_id          := v_xrp_fund,
    p_period_end       := '2025-12-08'::date,
    p_recorded_aum     := 229731.000,
    p_created_by       := v_admin,
    p_purpose          := 'transaction'::aum_purpose,
    p_distribution_date := '2025-12-08'::date
  );
  RAISE NOTICE 'XRP 2025-12-08 pre-deposit yield dist: %', v_dist_id;

  PERFORM apply_investor_transaction(
    p_fund_id     := v_xrp_fund,
    p_investor_id := v_sam,
    p_tx_type     := 'DEPOSIT'::tx_type,
    p_amount      := 49500.000,
    p_tx_date     := '2025-12-08'::date,
    p_reference_id := 'xrp_dep_sam_20251208',
    p_admin_id    := v_admin,
    p_notes       := 'Sam Johnson XRP deposit 2025-12-08'
  );
  RAISE NOTICE 'XRP 2025-12-08 Sam deposit done';

  -- 2025-12-15: Pre-deposit yield (AUM Before=279719, yield=488), then Sam deposits 50,100
  v_dist_id := apply_segmented_yield_distribution_v5(
    p_fund_id          := v_xrp_fund,
    p_period_end       := '2025-12-15'::date,
    p_recorded_aum     := 279719.000,
    p_created_by       := v_admin,
    p_purpose          := 'transaction'::aum_purpose,
    p_distribution_date := '2025-12-15'::date
  );
  RAISE NOTICE 'XRP 2025-12-15 pre-deposit yield dist: %', v_dist_id;

  PERFORM apply_investor_transaction(
    p_fund_id     := v_xrp_fund,
    p_investor_id := v_sam,
    p_tx_type     := 'DEPOSIT'::tx_type,
    p_amount      := 50100.000,
    p_tx_date     := '2025-12-15'::date,
    p_reference_id := 'xrp_dep_sam_20251215',
    p_admin_id    := v_admin,
    p_notes       := 'Sam Johnson XRP deposit 2025-12-15'
  );
  RAISE NOTICE 'XRP 2025-12-15 Sam deposit done';

  -- 2026-01-01: Monthly yield distribution (yield=1157)
  SELECT COALESCE(SUM(current_value), 0) INTO v_sum_pos
  FROM investor_positions WHERE fund_id = v_xrp_fund AND is_active = true;
  v_dist_id := apply_segmented_yield_distribution_v5(
    p_fund_id          := v_xrp_fund,
    p_period_end       := '2026-01-01'::date,
    p_recorded_aum     := v_sum_pos + 1157.000,
    p_created_by       := v_admin,
    p_purpose          := 'transaction'::aum_purpose,
    p_distribution_date := '2026-01-01'::date
  );
  RAISE NOTICE 'XRP 2026-01-01 monthly yield dist: %, recorded_aum=%+1157', v_dist_id, v_sum_pos;

  -- 2026-01-02: Sam withdraws 330,500.420 (AUM Before=330976=AUM After Jan-01, no yield)
  PERFORM apply_investor_transaction(
    p_fund_id     := v_xrp_fund,
    p_investor_id := v_sam,
    p_tx_type     := 'WITHDRAWAL'::tx_type,
    p_amount      := 330500.420,
    p_tx_date     := '2026-01-02'::date,
    p_reference_id := 'xrp_wd_sam_20260102',
    p_admin_id    := v_admin,
    p_notes       := 'Sam Johnson XRP exit 2026-01-02 (3-decimal)'
  );
  -- Dust sweep Sam XRP
  SELECT COALESCE(current_value, 0) INTO v_dust
  FROM investor_positions WHERE investor_id = v_sam AND fund_id = v_xrp_fund;
  IF v_dust > 0.0000000001 THEN
    RAISE NOTICE 'XRP Sam dust: % XRP', v_dust;
    PERFORM apply_investor_transaction(
      p_fund_id     := v_xrp_fund, p_investor_id := v_sam,
      p_tx_type     := 'WITHDRAWAL'::tx_type, p_amount := v_dust,
      p_tx_date     := '2026-01-02'::date,
      p_reference_id := 'xrp_dust_out_sam_20260102',
      p_admin_id    := v_admin, p_notes := 'Sam XRP exit dust'
    );
    PERFORM apply_investor_transaction(
      p_fund_id     := v_xrp_fund, p_investor_id := v_fees,
      p_tx_type     := 'DEPOSIT'::tx_type, p_amount := v_dust,
      p_tx_date     := '2026-01-02'::date,
      p_reference_id := 'xrp_dust_recv_sam_20260102',
      p_admin_id    := v_admin, p_notes := 'Sam XRP exit dust to Indigo Fees'
    );
  END IF;
  UPDATE investor_positions SET is_active = false, updated_at = NOW()
  WHERE investor_id = v_sam AND fund_id = v_xrp_fund;
  RAISE NOTICE 'XRP Sam exit complete (dust=%)', v_dust;

  -- 2026-01-05: External injection 316.420 XRP
  -- Indigo Fees 80% = 253.136, Ryan 20% = 63.284 (no management fee on this)
  PERFORM apply_investor_transaction(
    p_fund_id     := v_xrp_fund,
    p_investor_id := v_fees,
    p_tx_type     := 'FEE_CREDIT'::tx_type,
    p_amount      := 253.136,
    p_tx_date     := '2026-01-05'::date,
    p_reference_id := 'xrp_jan5_fees_20260105',
    p_admin_id    := v_admin,
    p_notes       := 'Jan 5 external distribution to Indigo Fees (80%)'
  );
  PERFORM apply_investor_transaction(
    p_fund_id     := v_xrp_fund,
    p_investor_id := v_ryan,
    p_tx_type     := 'FEE_CREDIT'::tx_type,
    p_amount      := 63.284,
    p_tx_date     := '2026-01-05'::date,
    p_reference_id := 'xrp_jan5_ryan_20260105',
    p_admin_id    := v_admin,
    p_notes       := 'Jan 5 external distribution to Ryan Van Der Wall (20%)'
  );
  RAISE NOTICE 'XRP 2026-01-05 special distribution done';

  -- 2026-02-01: Monthly yield distribution (yield=3.000)
  -- Remaining investors: Indigo Fees (~633.65+253.14=886.78), Ryan (~158.35+63.28=221.63)
  SELECT COALESCE(SUM(current_value), 0) INTO v_sum_pos
  FROM investor_positions WHERE fund_id = v_xrp_fund AND is_active = true;
  v_dist_id := apply_segmented_yield_distribution_v5(
    p_fund_id          := v_xrp_fund,
    p_period_end       := '2026-02-01'::date,
    p_recorded_aum     := v_sum_pos + 3.000,
    p_created_by       := v_admin,
    p_purpose          := 'transaction'::aum_purpose,
    p_distribution_date := '2026-02-01'::date
  );
  RAISE NOTICE 'XRP 2026-02-01 monthly yield dist: %, recorded_aum=%+3.000', v_dist_id, v_sum_pos;

  -- ================================================================
  -- PHASE 5: Restore system mode
  -- ================================================================
  UPDATE system_config SET value = '"live"' WHERE key = 'system_mode';

  RAISE NOTICE '=== SOL/XRP audit restart migration completed ===';
  RAISE NOTICE 'Jose Molla UUID: %', v_jose;

END $$;

-- =============================================================================
-- SECTION 3: Restore check_historical_lock to real logic
-- =============================================================================

-- Restore 2-param version (original from 20260306)
CREATE OR REPLACE FUNCTION public.check_historical_lock(p_fund_id uuid, p_tx_date date)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_locked boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM yield_distributions
    WHERE fund_id = p_fund_id
      AND effective_date >= p_tx_date
      AND is_voided = false
  ) INTO v_locked;
  RETURN v_locked;
END;
$$;

-- Restore/define 3-param version (called by V5; same logic, boolean param ignored)
CREATE OR REPLACE FUNCTION public.check_historical_lock(p_fund_id uuid, p_tx_date date, p_is_distribution boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_locked boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM yield_distributions
    WHERE fund_id = p_fund_id
      AND effective_date >= p_tx_date
      AND is_voided = false
  ) INTO v_locked;
  RETURN v_locked;
END;
$$;
