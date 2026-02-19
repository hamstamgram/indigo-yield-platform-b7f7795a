-- Direct yield seeding from spreadsheet balance progression
-- Generated at 2026-02-17T22:22:54.405Z
-- Total yield entries: 409

-- Disable yield distribution guard trigger for bulk seeding
ALTER TABLE transactions_v2 DISABLE TRIGGER trg_enforce_yield_distribution_guard;

-- Set auth context and bypass guards
DO $$ BEGIN
  PERFORM set_config('request.jwt.claim.sub', 'a16a7e50-fefd-4bfe-897c-d16279b457c2', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"a16a7e50-fefd-4bfe-897c-d16279b457c2","role":"authenticated"}', true);
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
END; $$;

-- ================================================
-- Month: 2024-08 (2 yield entries)
-- ================================================
DO $$
DECLARE
  v_tx_id uuid;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', 'a16a7e50-fefd-4bfe-897c-d16279b457c2', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"a16a7e50-fefd-4bfe-897c-d16279b457c2","role":"authenticated"}', true);
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Indigo Fees BTC: prev=0.0000000000, flows=0.0000000000, yield=0.0048080372, end=0.0048080372
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'b464a3f7-60d5-4bc0-9833-7b413bcc6cae'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0048080372,
    '2024-08-31'::date,
    'spreadsheet-yield-BTC-2024-08-Indigo_Fees',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Jose Molla BTC: prev=3.4680000000, flows=0.0000000000, yield=0.0271919630, end=3.4951919630
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '172d6461-f6cb-4457-a8c3-75c978cc12be'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0271919630,
    '2024-08-31'::date,
    'spreadsheet-yield-BTC-2024-08-Jose_Molla',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  RAISE NOTICE 'Month 2024-08: inserted 2 yield transactions';
END;
$$;

-- ================================================
-- Month: 2024-09 (3 yield entries)
-- ================================================
DO $$
DECLARE
  v_tx_id uuid;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', 'a16a7e50-fefd-4bfe-897c-d16279b457c2', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"a16a7e50-fefd-4bfe-897c-d16279b457c2","role":"authenticated"}', true);
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Indigo Fees BTC: prev=0.0048080372, flows=0.0000000000, yield=0.0015074306, end=0.0063154679
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'b464a3f7-60d5-4bc0-9833-7b413bcc6cae'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0015074306,
    '2024-09-30'::date,
    'spreadsheet-yield-BTC-2024-09-Indigo_Fees',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Jose Molla BTC: prev=3.4951919630, flows=0.0000000000, yield=0.0054016600, end=3.5005936230
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '172d6461-f6cb-4457-a8c3-75c978cc12be'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0054016600,
    '2024-09-30'::date,
    'spreadsheet-yield-BTC-2024-09-Jose_Molla',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Kyle Gulamerian BTC: prev=2.0000000000, flows=0.0000000000, yield=0.0030909090, end=2.0030909090
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'b4f5d56b-b128-4799-b805-d34264165f45'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0030909090,
    '2024-09-30'::date,
    'spreadsheet-yield-BTC-2024-09-Kyle_Gulamerian',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  RAISE NOTICE 'Month 2024-09: inserted 3 yield transactions';
END;
$$;

-- ================================================
-- Month: 2024-10 (3 yield entries)
-- ================================================
DO $$
DECLARE
  v_tx_id uuid;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', 'a16a7e50-fefd-4bfe-897c-d16279b457c2', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"a16a7e50-fefd-4bfe-897c-d16279b457c2","role":"authenticated"}', true);
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Indigo Fees BTC: prev=0.0063154679, flows=0.0000000000, yield=0.0045292277, end=0.0108446955
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'b464a3f7-60d5-4bc0-9833-7b413bcc6cae'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0045292277,
    '2024-10-31'::date,
    'spreadsheet-yield-BTC-2024-10-Indigo_Fees',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Jose Molla BTC: prev=3.5005936230, flows=0.0000000000, yield=0.0162005690, end=3.5167941920
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '172d6461-f6cb-4457-a8c3-75c978cc12be'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0162005690,
    '2024-10-31'::date,
    'spreadsheet-yield-BTC-2024-10-Jose_Molla',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Kyle Gulamerian BTC: prev=2.0030909090, flows=0.0000000000, yield=0.0092702030, end=2.0123611120
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'b4f5d56b-b128-4799-b805-d34264165f45'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0092702030,
    '2024-10-31'::date,
    'spreadsheet-yield-BTC-2024-10-Kyle_Gulamerian',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  RAISE NOTICE 'Month 2024-10: inserted 3 yield transactions';
END;
$$;

-- ================================================
-- Month: 2024-11 (6 yield entries)
-- ================================================
DO $$
DECLARE
  v_tx_id uuid;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', 'a16a7e50-fefd-4bfe-897c-d16279b457c2', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"a16a7e50-fefd-4bfe-897c-d16279b457c2","role":"authenticated"}', true);
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Danielle Richetta BTC: prev=5.2000000000, flows=-0.2700000000, yield=0.0300926140, end=4.9600926140
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'e134e0df-d4e7-49c4-80b3-4ef37af6bebf'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0300926140,
    '2024-11-30'::date,
    'spreadsheet-yield-BTC-2024-11-Danielle_Richetta',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Indigo Fees BTC: prev=0.0108446955, flows=0.0000000000, yield=0.0117291692, end=0.0225738647
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'b464a3f7-60d5-4bc0-9833-7b413bcc6cae'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0117291692,
    '2024-11-30'::date,
    'spreadsheet-yield-BTC-2024-11-Indigo_Fees',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Jose Molla BTC: prev=3.5167941920, flows=0.0000000000, yield=0.0192201440, end=3.5360143360
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '172d6461-f6cb-4457-a8c3-75c978cc12be'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0192201440,
    '2024-11-30'::date,
    'spreadsheet-yield-BTC-2024-11-Jose_Molla',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Kyle Gulamerian BTC: prev=2.0123611120, flows=0.0000000000, yield=0.0109980470, end=2.0233591590
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'b4f5d56b-b128-4799-b805-d34264165f45'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0109980470,
    '2024-11-30'::date,
    'spreadsheet-yield-BTC-2024-11-Kyle_Gulamerian',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Matthias Reiser BTC: prev=4.6200000000, flows=0.0000000000, yield=0.0267361300, end=4.6467361300
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'd8643c68-7045-458a-b105-a41f56085c55'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0267361300,
    '2024-11-30'::date,
    'spreadsheet-yield-BTC-2024-11-Matthias_Reiser',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Thomas Puech BTC: prev=6.5193000000, flows=0.0000000000, yield=0.0419238970, end=6.5612238970
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '44801beb-4476-4a9b-9751-4e70267f6953'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0419238970,
    '2024-11-30'::date,
    'spreadsheet-yield-BTC-2024-11-Thomas_Puech',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  RAISE NOTICE 'Month 2024-11: inserted 6 yield transactions';
END;
$$;

-- ================================================
-- Month: 2024-12 (6 yield entries)
-- ================================================
DO $$
DECLARE
  v_tx_id uuid;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', 'a16a7e50-fefd-4bfe-897c-d16279b457c2', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"a16a7e50-fefd-4bfe-897c-d16279b457c2","role":"authenticated"}', true);
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Danielle Richetta BTC: prev=4.9600926140, flows=-0.1240000000, yield=0.0266784940, end=4.8627711080
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'e134e0df-d4e7-49c4-80b3-4ef37af6bebf'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0266784940,
    '2024-12-31'::date,
    'spreadsheet-yield-BTC-2024-12-Danielle_Richetta',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Indigo Fees BTC: prev=0.0225738647, flows=0.0000000000, yield=0.0109102304, end=0.0334840951
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'b464a3f7-60d5-4bc0-9833-7b413bcc6cae'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0109102304,
    '2024-12-31'::date,
    'spreadsheet-yield-BTC-2024-12-Indigo_Fees',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Jose Molla BTC: prev=3.5360143360, flows=0.0000000000, yield=0.0179611620, end=3.5539754980
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '172d6461-f6cb-4457-a8c3-75c978cc12be'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0179611620,
    '2024-12-31'::date,
    'spreadsheet-yield-BTC-2024-12-Jose_Molla',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Kyle Gulamerian BTC: prev=2.0233591590, flows=0.0000000000, yield=0.0102776400, end=2.0336367990
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'b4f5d56b-b128-4799-b805-d34264165f45'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0102776400,
    '2024-12-31'::date,
    'spreadsheet-yield-BTC-2024-12-Kyle_Gulamerian',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Matthias Reiser BTC: prev=4.6467361300, flows=0.0000000000, yield=0.0249930660, end=4.6717291960
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'd8643c68-7045-458a-b105-a41f56085c55'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0249930660,
    '2024-12-31'::date,
    'spreadsheet-yield-BTC-2024-12-Matthias_Reiser',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Thomas Puech BTC: prev=6.5612238970, flows=0.0000000000, yield=0.0392165100, end=6.6004404070
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '44801beb-4476-4a9b-9751-4e70267f6953'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0392165100,
    '2024-12-31'::date,
    'spreadsheet-yield-BTC-2024-12-Thomas_Puech',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  RAISE NOTICE 'Month 2024-12: inserted 6 yield transactions';
END;
$$;

-- ================================================
-- Month: 2025-01 (3 yield entries)
-- ================================================
DO $$
DECLARE
  v_tx_id uuid;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', 'a16a7e50-fefd-4bfe-897c-d16279b457c2', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"a16a7e50-fefd-4bfe-897c-d16279b457c2","role":"authenticated"}', true);
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Indigo Fees BTC: prev=0.0334840951, flows=0.0000000000, yield=0.0028974411, end=0.0363815362
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'b464a3f7-60d5-4bc0-9833-7b413bcc6cae'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0028974411,
    '2025-01-31'::date,
    'spreadsheet-yield-BTC-2025-01-Indigo_Fees',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Jose Molla BTC: prev=3.5539754980, flows=0.0000000000, yield=0.0154485030, end=3.5694240010
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '172d6461-f6cb-4457-a8c3-75c978cc12be'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0154485030,
    '2025-01-31'::date,
    'spreadsheet-yield-BTC-2025-01-Jose_Molla',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Thomas Puech BTC: prev=6.6004404070, flows=0.0000000000, yield=0.0337540560, end=6.6341944630
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '44801beb-4476-4a9b-9751-4e70267f6953'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0337540560,
    '2025-01-31'::date,
    'spreadsheet-yield-BTC-2025-01-Thomas_Puech',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  RAISE NOTICE 'Month 2025-01: inserted 3 yield transactions';
END;
$$;

-- ================================================
-- Month: 2025-02 (3 yield entries)
-- ================================================
DO $$
DECLARE
  v_tx_id uuid;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', 'a16a7e50-fefd-4bfe-897c-d16279b457c2', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"a16a7e50-fefd-4bfe-897c-d16279b457c2","role":"authenticated"}', true);
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Indigo Fees BTC: prev=0.0363815362, flows=0.0000000000, yield=0.0033503621, end=0.0397318983
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'b464a3f7-60d5-4bc0-9833-7b413bcc6cae'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0033503621,
    '2025-02-28'::date,
    'spreadsheet-yield-BTC-2025-02-Indigo_Fees',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Jose Molla BTC: prev=3.5694240010, flows=0.0000000000, yield=0.0177774050, end=3.5872014060
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '172d6461-f6cb-4457-a8c3-75c978cc12be'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0177774050,
    '2025-02-28'::date,
    'spreadsheet-yield-BTC-2025-02-Jose_Molla',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Thomas Puech BTC: prev=6.6341944630, flows=0.0000000000, yield=0.0388722330, end=6.6730666960
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '44801beb-4476-4a9b-9751-4e70267f6953'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0388722330,
    '2025-02-28'::date,
    'spreadsheet-yield-BTC-2025-02-Thomas_Puech',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  RAISE NOTICE 'Month 2025-02: inserted 3 yield transactions';
END;
$$;

-- ================================================
-- Month: 2025-03 (3 yield entries)
-- ================================================
DO $$
DECLARE
  v_tx_id uuid;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', 'a16a7e50-fefd-4bfe-897c-d16279b457c2', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"a16a7e50-fefd-4bfe-897c-d16279b457c2","role":"authenticated"}', true);
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Indigo Fees BTC: prev=0.0397318983, flows=0.0000000000, yield=0.0022439305, end=0.0419758288
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'b464a3f7-60d5-4bc0-9833-7b413bcc6cae'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0022439305,
    '2025-03-31'::date,
    'spreadsheet-yield-BTC-2025-03-Indigo_Fees',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Jose Molla BTC: prev=3.5872014060, flows=0.0000000000, yield=0.0118412470, end=3.5990426530
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '172d6461-f6cb-4457-a8c3-75c978cc12be'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0118412470,
    '2025-03-31'::date,
    'spreadsheet-yield-BTC-2025-03-Jose_Molla',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Thomas Puech BTC: prev=6.6730666960, flows=0.0000000000, yield=0.0259148220, end=6.6989815180
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '44801beb-4476-4a9b-9751-4e70267f6953'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0259148220,
    '2025-03-31'::date,
    'spreadsheet-yield-BTC-2025-03-Thomas_Puech',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  RAISE NOTICE 'Month 2025-03: inserted 3 yield transactions';
END;
$$;

-- ================================================
-- Month: 2025-04 (5 yield entries)
-- ================================================
DO $$
DECLARE
  v_tx_id uuid;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', 'a16a7e50-fefd-4bfe-897c-d16279b457c2', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"a16a7e50-fefd-4bfe-897c-d16279b457c2","role":"authenticated"}', true);
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Danielle Richetta BTC: prev=4.8627711080, flows=0.0000000000, yield=0.1707288920, end=5.0335000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'e134e0df-d4e7-49c4-80b3-4ef37af6bebf'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.1707288920,
    '2025-04-30'::date,
    'spreadsheet-yield-BTC-2025-04-Danielle_Richetta',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Indigo Fees BTC: prev=0.0419758288, flows=0.0000000000, yield=0.0560382169, end=0.0980140458
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'b464a3f7-60d5-4bc0-9833-7b413bcc6cae'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0560382169,
    '2025-04-30'::date,
    'spreadsheet-yield-BTC-2025-04-Indigo_Fees',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Jose Molla BTC: prev=3.5990426530, flows=0.0000000000, yield=0.0327433010, end=3.6317859540
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '172d6461-f6cb-4457-a8c3-75c978cc12be'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0327433010,
    '2025-04-30'::date,
    'spreadsheet-yield-BTC-2025-04-Jose_Molla',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Kyle Gulamerian BTC: prev=2.0336367990, flows=0.0000000000, yield=0.0673632010, end=2.1010000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'b4f5d56b-b128-4799-b805-d34264165f45'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0673632010,
    '2025-04-30'::date,
    'spreadsheet-yield-BTC-2025-04-Kyle_Gulamerian',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Matthias Reiser BTC: prev=4.6717291960, flows=0.0000000000, yield=0.1639708040, end=4.8357000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'd8643c68-7045-458a-b105-a41f56085c55'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.1639708040,
    '2025-04-30'::date,
    'spreadsheet-yield-BTC-2025-04-Matthias_Reiser',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  RAISE NOTICE 'Month 2025-04: inserted 5 yield transactions';
END;
$$;

-- ================================================
-- Month: 2025-05 (6 yield entries)
-- ================================================
DO $$
DECLARE
  v_tx_id uuid;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', 'a16a7e50-fefd-4bfe-897c-d16279b457c2', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"a16a7e50-fefd-4bfe-897c-d16279b457c2","role":"authenticated"}', true);
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Danielle Richetta BTC: prev=5.0335000000, flows=0.0000000000, yield=0.0230813700, end=5.0565813700
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'e134e0df-d4e7-49c4-80b3-4ef37af6bebf'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0230813700,
    '2025-05-31'::date,
    'spreadsheet-yield-BTC-2025-05-Danielle_Richetta',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Indigo Fees BTC: prev=0.0980140458, flows=0.0000000000, yield=0.0099164996, end=0.1079305454
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'b464a3f7-60d5-4bc0-9833-7b413bcc6cae'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0099164996,
    '2025-05-31'::date,
    'spreadsheet-yield-BTC-2025-05-Indigo_Fees',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Jose Molla BTC: prev=3.6317859540, flows=0.0000000000, yield=0.0157277830, end=3.6475137370
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '172d6461-f6cb-4457-a8c3-75c978cc12be'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0157277830,
    '2025-05-31'::date,
    'spreadsheet-yield-BTC-2025-05-Jose_Molla',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Kyle Gulamerian BTC: prev=2.1010000000, flows=-2.1101000000, yield=0.0091000000, end=0.0000000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'b4f5d56b-b128-4799-b805-d34264165f45'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0091000000,
    '2025-05-31'::date,
    'spreadsheet-yield-BTC-2025-05-Kyle_Gulamerian',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Matthias Reiser BTC: prev=4.8357000000, flows=0.0000000000, yield=0.0221743480, end=4.8578743480
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'd8643c68-7045-458a-b105-a41f56085c55'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0221743480,
    '2025-05-31'::date,
    'spreadsheet-yield-BTC-2025-05-Matthias_Reiser',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Babak Eftekhari ETH: prev=0.0000000000, flows=59.2600000000, yield=-32.2500000000, end=27.0100000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'cdcccf6e-32f9-475a-9f88-34272ca3e64b'::uuid,
    '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid,
    'YIELD'::tx_type,
    -32.2500000000,
    '2025-05-31'::date,
    'spreadsheet-yield-ETH-2025-05-Babak_Eftekhari',
    'yield_distribution'::tx_source,
    'ETH'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  RAISE NOTICE 'Month 2025-05: inserted 6 yield transactions';
END;
$$;

-- ================================================
-- Month: 2025-06 (8 yield entries)
-- ================================================
DO $$
DECLARE
  v_tx_id uuid;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', 'a16a7e50-fefd-4bfe-897c-d16279b457c2', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"a16a7e50-fefd-4bfe-897c-d16279b457c2","role":"authenticated"}', true);
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Danielle Richetta BTC: prev=5.0565813700, flows=-0.1300000000, yield=0.0346298820, end=4.9612112520
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'e134e0df-d4e7-49c4-80b3-4ef37af6bebf'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0346298820,
    '2025-06-30'::date,
    'spreadsheet-yield-BTC-2025-06-Danielle_Richetta',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Indigo Fees BTC: prev=0.1079305454, flows=0.0000000000, yield=0.0126377655, end=0.1205683109
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'b464a3f7-60d5-4bc0-9833-7b413bcc6cae'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0126377655,
    '2025-06-30'::date,
    'spreadsheet-yield-BTC-2025-06-Indigo_Fees',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Jose Molla BTC: prev=3.6475137370, flows=0.0000000000, yield=0.0238278540, end=3.6713415910
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '172d6461-f6cb-4457-a8c3-75c978cc12be'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0238278540,
    '2025-06-30'::date,
    'spreadsheet-yield-BTC-2025-06-Jose_Molla',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Matthias Reiser BTC: prev=4.8578743480, flows=0.0000000000, yield=0.0336044970, end=4.8914788450
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'd8643c68-7045-458a-b105-a41f56085c55'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0336044970,
    '2025-06-30'::date,
    'spreadsheet-yield-BTC-2025-06-Matthias_Reiser',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Babak Eftekhari ETH: prev=27.0100000000, flows=0.0000000000, yield=32.2735323004, end=59.2835323004
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'cdcccf6e-32f9-475a-9f88-34272ca3e64b'::uuid,
    '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid,
    'YIELD'::tx_type,
    32.2735323004,
    '2025-06-30'::date,
    'spreadsheet-yield-ETH-2025-06-Babak_Eftekhari',
    'yield_distribution'::tx_source,
    'ETH'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- INDIGO DIGITAL ASSET FUND LP ETH: prev=175.0000000000, flows=0.0000000000, yield=0.1905846000, end=175.1905846000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'd91f3eb7-bd47-4c42-ab4f-c4f20fb41b13'::uuid,
    '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid,
    'YIELD'::tx_type,
    0.1905846000,
    '2025-06-30'::date,
    'spreadsheet-yield-ETH-2025-06-INDIGO_DIGITAL_ASSET_FUND_LP',
    'yield_distribution'::tx_source,
    'ETH'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Indigo Fees ETH: prev=0.0000000000, flows=0.0000000000, yield=0.0058830751, end=0.0058830751
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'b464a3f7-60d5-4bc0-9833-7b413bcc6cae'::uuid,
    '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid,
    'YIELD'::tx_type,
    0.0058830751,
    '2025-06-30'::date,
    'spreadsheet-yield-ETH-2025-06-Indigo_Fees',
    'yield_distribution'::tx_source,
    'ETH'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Nathanaël Cohen ETH: prev=26.8340000000, flows=3.0466000000, yield=-26.8340000000, end=3.0466000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'ed91c89d-23de-4981-b6b7-60e13f1a6767'::uuid,
    '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid,
    'YIELD'::tx_type,
    -26.8340000000,
    '2025-06-30'::date,
    'spreadsheet-yield-ETH-2025-06-Nathana_l_Cohen',
    'yield_distribution'::tx_source,
    'ETH'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  RAISE NOTICE 'Month 2025-06: inserted 8 yield transactions';
END;
$$;

-- ================================================
-- Month: 2025-07 (28 yield entries)
-- ================================================
DO $$
DECLARE
  v_tx_id uuid;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', 'a16a7e50-fefd-4bfe-897c-d16279b457c2', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"a16a7e50-fefd-4bfe-897c-d16279b457c2","role":"authenticated"}', true);
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Blondish BTC: prev=4.1210000000, flows=0.0000000000, yield=-0.0173310980, end=4.1036689020
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '529cac24-615c-4408-b683-2c4ab635d6fd'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    -0.0173310980,
    '2025-07-31'::date,
    'spreadsheet-yield-BTC-2025-07-Blondish',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Danielle Richetta BTC: prev=4.9612112520, flows=-0.2600000000, yield=0.0251558400, end=4.7263670920
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'e134e0df-d4e7-49c4-80b3-4ef37af6bebf'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0251558400,
    '2025-07-31'::date,
    'spreadsheet-yield-BTC-2025-07-Danielle_Richetta',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Indigo Fees BTC: prev=0.1205683109, flows=0.0000000000, yield=0.0120056327, end=0.1325739436
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'b464a3f7-60d5-4bc0-9833-7b413bcc6cae'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0120056327,
    '2025-07-31'::date,
    'spreadsheet-yield-BTC-2025-07-Indigo_Fees',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Jose Molla BTC: prev=3.6713415910, flows=0.0000000000, yield=0.0176892750, end=3.6890308660
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '172d6461-f6cb-4457-a8c3-75c978cc12be'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0176892750,
    '2025-07-31'::date,
    'spreadsheet-yield-BTC-2025-07-Jose_Molla',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Kabbaj BTC: prev=2.0000000000, flows=1.5914000000, yield=0.0098560590, end=3.6012560590
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'f917cd8b-2d12-428c-ae3c-210b7ee3ae75'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0098560590,
    '2025-07-31'::date,
    'spreadsheet-yield-BTC-2025-07-Kabbaj',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Matthias Reiser BTC: prev=4.8914788450, flows=0.0000000000, yield=0.0249562860, end=4.9164351310
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'd8643c68-7045-458a-b105-a41f56085c55'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0249562860,
    '2025-07-31'::date,
    'spreadsheet-yield-BTC-2025-07-Matthias_Reiser',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Nathanaël Cohen BTC: prev=0.4483000000, flows=0.0000000000, yield=-0.0018573397, end=0.4464426603
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'ed91c89d-23de-4981-b6b7-60e13f1a6767'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    -0.0018573397,
    '2025-07-31'::date,
    'spreadsheet-yield-BTC-2025-07-Nathana_l_Cohen',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Oliver Loisel BTC: prev=0.0000000000, flows=2.1153640000, yield=0.0013741520, end=2.1167381520
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'fbf8e2f4-7c5d-4496-a486-f0d8e88cc794'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0013741520,
    '2025-07-31'::date,
    'spreadsheet-yield-BTC-2025-07-Oliver_Loisel',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Thomas Puech BTC: prev=6.6989815180, flows=0.0000000000, yield=-0.0023416140, end=6.6966399040
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '44801beb-4476-4a9b-9751-4e70267f6953'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    -0.0023416140,
    '2025-07-31'::date,
    'spreadsheet-yield-BTC-2025-07-Thomas_Puech',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Victoria Pariente-Cohen BTC: prev=0.1492000000, flows=0.0000000000, yield=-0.0006527112, end=0.1485472888
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '249f4ab3-3433-4d81-ac92-1531b3573a50'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    -0.0006527112,
    '2025-07-31'::date,
    'spreadsheet-yield-BTC-2025-07-Victoria_Pariente_Cohen',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Babak Eftekhari ETH: prev=59.2835323004, flows=0.0000000000, yield=0.8603596180, end=60.1438919184
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'cdcccf6e-32f9-475a-9f88-34272ca3e64b'::uuid,
    '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid,
    'YIELD'::tx_type,
    0.8603596180,
    '2025-07-31'::date,
    'spreadsheet-yield-ETH-2025-07-Babak_Eftekhari',
    'yield_distribution'::tx_source,
    'ETH'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Blondish ETH: prev=120.0000000000, flows=0.0000000000, yield=0.3391856000, end=120.3391856000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '529cac24-615c-4408-b683-2c4ab635d6fd'::uuid,
    '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid,
    'YIELD'::tx_type,
    0.3391856000,
    '2025-07-31'::date,
    'spreadsheet-yield-ETH-2025-07-Blondish',
    'yield_distribution'::tx_source,
    'ETH'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- INDIGO DIGITAL ASSET FUND LP ETH: prev=175.1905846000, flows=-178.3700000000, yield=3.1794154000, end=0.0000000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'd91f3eb7-bd47-4c42-ab4f-c4f20fb41b13'::uuid,
    '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid,
    'YIELD'::tx_type,
    3.1794154000,
    '2025-07-31'::date,
    'spreadsheet-yield-ETH-2025-07-INDIGO_DIGITAL_ASSET_FUND_LP',
    'yield_distribution'::tx_source,
    'ETH'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Indigo Fees ETH: prev=0.0058830751, flows=0.0000000000, yield=1.1619629269, end=1.1678460020
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'b464a3f7-60d5-4bc0-9833-7b413bcc6cae'::uuid,
    '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid,
    'YIELD'::tx_type,
    1.1619629269,
    '2025-07-31'::date,
    'spreadsheet-yield-ETH-2025-07-Indigo_Fees',
    'yield_distribution'::tx_source,
    'ETH'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Jose Molla ETH: prev=61.5000000000, flows=0.0000000000, yield=1.3718430800, end=62.8718430800
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '172d6461-f6cb-4457-a8c3-75c978cc12be'::uuid,
    '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid,
    'YIELD'::tx_type,
    1.3718430800,
    '2025-07-31'::date,
    'spreadsheet-yield-ETH-2025-07-Jose_Molla',
    'yield_distribution'::tx_source,
    'ETH'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Nathanaël Cohen ETH: prev=3.0466000000, flows=2.0000000000, yield=26.8782486500, end=31.9248486500
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'ed91c89d-23de-4981-b6b7-60e13f1a6767'::uuid,
    '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid,
    'YIELD'::tx_type,
    26.8782486500,
    '2025-07-31'::date,
    'spreadsheet-yield-ETH-2025-07-Nathana_l_Cohen',
    'yield_distribution'::tx_source,
    'ETH'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Alain Bensimon USDT: prev=0.0000000000, flows=136737.0000000000, yield=280.4819000000, end=137017.4819000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '20396ec2-c919-46ef-b3a3-8005a8a34bd3'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    280.4819000000,
    '2025-07-31'::date,
    'spreadsheet-yield-USDT-2025-07-Alain_Bensimon',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Anne Cecile Noique USDT: prev=0.0000000000, flows=222687.0000000000, yield=456.7869000000, end=223143.7869000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '64cb831a-3365-4a89-9369-620ab7a1ff26'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    456.7869000000,
    '2025-07-31'::date,
    'spreadsheet-yield-USDT-2025-07-Anne_Cecile_Noique',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Babak Eftekhari USDT: prev=135726.7500000000, flows=46955.2800000000, yield=1299.0652000000, end=183981.0952000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'cdcccf6e-32f9-475a-9f88-34272ca3e64b'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    1299.0652000000,
    '2025-07-31'::date,
    'spreadsheet-yield-USDT-2025-07-Babak_Eftekhari',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Bo De Kriek USDT: prev=0.0000000000, flows=273807.0000000000, yield=1242.0697000000, end=275049.0697000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '98dd4ff5-b5cb-4257-a501-aa25a6d638c5'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    1242.0697000000,
    '2025-07-31'::date,
    'spreadsheet-yield-USDT-2025-07-Bo_De_Kriek',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Daniele Francilia USDT: prev=0.0000000000, flows=109776.0000000000, yield=497.9765000000, end=110273.9765000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'd1f39136-4d87-4e7f-8885-a413c21d9a56'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    497.9765000000,
    '2025-07-31'::date,
    'spreadsheet-yield-USDT-2025-07-Daniele_Francilia',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Dario Deiana USDT: prev=0.0000000000, flows=199659.7200000000, yield=566.0979000000, end=200225.8179000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'bb655a37-9e91-4166-b575-cafbbbb8c200'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    566.0979000000,
    '2025-07-31'::date,
    'spreadsheet-yield-USDT-2025-07-Dario_Deiana',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Indigo Fees USDT: prev=0.0000000000, flows=0.0000000000, yield=898.4752495000, end=898.4752495000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'b464a3f7-60d5-4bc0-9833-7b413bcc6cae'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    898.4752495000,
    '2025-07-31'::date,
    'spreadsheet-yield-USDT-2025-07-Indigo_Fees',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Julien Grunebaum USDT: prev=0.0000000000, flows=109392.0000000000, yield=496.2345000000, end=109888.2345000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '7fdedf56-e838-45ea-91f8-6e441810c761'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    496.2345000000,
    '2025-07-31'::date,
    'spreadsheet-yield-USDT-2025-07-Julien_Grunebaum',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Lars Ahlgreen USDT: prev=0.0000000000, flows=0.0000000000, yield=21.2971911700, end=21.2971911700
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '9405071c-0b52-4399-85da-9f1ba9b289c1'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    21.2971911700,
    '2025-07-31'::date,
    'spreadsheet-yield-USDT-2025-07-Lars_Ahlgreen',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Matthew Beatty USDT: prev=0.0000000000, flows=255504.0000000000, yield=1159.0419000000, end=256663.0419000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '24f3054e-a125-4954-8861-55aa617cbb2c'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    1159.0419000000,
    '2025-07-31'::date,
    'spreadsheet-yield-USDT-2025-07-Matthew_Beatty',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Pierre Bezencon USDT: prev=0.0000000000, flows=109333.0000000000, yield=495.9669000000, end=109828.9669000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '511991c7-93a2-4d2b-b42a-43120d58f672'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    495.9669000000,
    '2025-07-31'::date,
    'spreadsheet-yield-USDT-2025-07-Pierre_Bezencon',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Terance Chen USDT: prev=0.0000000000, flows=219747.0000000000, yield=450.7562000000, end=220197.7562000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '3705c2cd-49d2-4e3b-ac09-7c1f98ebb93c'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    450.7562000000,
    '2025-07-31'::date,
    'spreadsheet-yield-USDT-2025-07-Terance_Chen',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  RAISE NOTICE 'Month 2025-07: inserted 28 yield transactions';
END;
$$;

-- ================================================
-- Month: 2025-08 (23 yield entries)
-- ================================================
DO $$
DECLARE
  v_tx_id uuid;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', 'a16a7e50-fefd-4bfe-897c-d16279b457c2', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"a16a7e50-fefd-4bfe-897c-d16279b457c2","role":"authenticated"}', true);
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Blondish BTC: prev=4.1036689020, flows=0.0000000000, yield=0.0130653580, end=4.1167342600
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '529cac24-615c-4408-b683-2c4ab635d6fd'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0130653580,
    '2025-08-31'::date,
    'spreadsheet-yield-BTC-2025-08-Blondish',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Danielle Richetta BTC: prev=4.7263670920, flows=-0.1100000000, yield=0.0134939580, end=4.6298610500
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'e134e0df-d4e7-49c4-80b3-4ef37af6bebf'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0134939580,
    '2025-08-31'::date,
    'spreadsheet-yield-BTC-2025-08-Danielle_Richetta',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Indigo Fees BTC: prev=0.1325739436, flows=0.0000000000, yield=0.0082184399, end=0.1407923835
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'b464a3f7-60d5-4bc0-9833-7b413bcc6cae'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0082184399,
    '2025-08-31'::date,
    'spreadsheet-yield-BTC-2025-08-Indigo_Fees',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Jose Molla BTC: prev=3.6890308660, flows=0.0000000000, yield=0.0099828190, end=3.6990136850
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '172d6461-f6cb-4457-a8c3-75c978cc12be'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0099828190,
    '2025-08-31'::date,
    'spreadsheet-yield-BTC-2025-08-Jose_Molla',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Kabbaj BTC: prev=3.6012560590, flows=0.9102000000, yield=0.0091718510, end=4.5206279100
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'f917cd8b-2d12-428c-ae3c-210b7ee3ae75'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0091718510,
    '2025-08-31'::date,
    'spreadsheet-yield-BTC-2025-08-Kabbaj',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Matthias Reiser BTC: prev=4.9164351310, flows=0.0000000000, yield=0.0140871720, end=4.9305223030
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'd8643c68-7045-458a-b105-a41f56085c55'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0140871720,
    '2025-08-31'::date,
    'spreadsheet-yield-BTC-2025-08-Matthias_Reiser',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Nathanaël Cohen BTC: prev=0.4464426603, flows=0.0000000000, yield=0.0014213948, end=0.4478640551
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'ed91c89d-23de-4981-b6b7-60e13f1a6767'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0014213948,
    '2025-08-31'::date,
    'spreadsheet-yield-BTC-2025-08-Nathana_l_Cohen',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Oliver Loisel BTC: prev=2.1167381520, flows=0.0000000000, yield=0.0060651380, end=2.1228032900
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'fbf8e2f4-7c5d-4496-a486-f0d8e88cc794'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0060651380,
    '2025-08-31'::date,
    'spreadsheet-yield-BTC-2025-08-Oliver_Loisel',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Thomas Puech BTC: prev=6.6966399040, flows=0.0000000000, yield=0.0213209220, end=6.7179608260
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '44801beb-4476-4a9b-9751-4e70267f6953'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0213209220,
    '2025-08-31'::date,
    'spreadsheet-yield-BTC-2025-08-Thomas_Puech',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Victoria Pariente-Cohen BTC: prev=0.1485472888, flows=0.0000000000, yield=0.0004729484, end=0.1490202372
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '249f4ab3-3433-4d81-ac92-1531b3573a50'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0004729484,
    '2025-08-31'::date,
    'spreadsheet-yield-BTC-2025-08-Victoria_Pariente_Cohen',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Alain Bensimon USDT: prev=137017.4819000000, flows=0.0000000000, yield=741.8530000000, end=137759.3349000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '20396ec2-c919-46ef-b3a3-8005a8a34bd3'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    741.8530000000,
    '2025-08-31'::date,
    'spreadsheet-yield-USDT-2025-08-Alain_Bensimon',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Anne Cecile Noique USDT: prev=223143.7869000000, flows=0.0000000000, yield=1208.1662000000, end=224351.9531000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '64cb831a-3365-4a89-9369-620ab7a1ff26'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    1208.1662000000,
    '2025-08-31'::date,
    'spreadsheet-yield-USDT-2025-08-Anne_Cecile_Noique',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Babak Eftekhari USDT: prev=183981.0952000000, flows=10000.0000000000, yield=929.0021000000, end=194910.0973000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'cdcccf6e-32f9-475a-9f88-34272ca3e64b'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    929.0021000000,
    '2025-08-31'::date,
    'spreadsheet-yield-USDT-2025-08-Babak_Eftekhari',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Bo De Kriek USDT: prev=275049.0697000000, flows=0.0000000000, yield=1489.1967000000, end=276538.2664000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '98dd4ff5-b5cb-4257-a501-aa25a6d638c5'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    1489.1967000000,
    '2025-08-31'::date,
    'spreadsheet-yield-USDT-2025-08-Bo_De_Kriek',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Daniele Francilia USDT: prev=110273.9765000000, flows=0.0000000000, yield=597.0558000000, end=110871.0323000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'd1f39136-4d87-4e7f-8885-a413c21d9a56'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    597.0558000000,
    '2025-08-31'::date,
    'spreadsheet-yield-USDT-2025-08-Daniele_Francilia',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Dario Deiana USDT: prev=200225.8179000000, flows=0.0000000000, yield=963.4796000000, end=201189.2975000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'bb655a37-9e91-4166-b575-cafbbbb8c200'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    963.4796000000,
    '2025-08-31'::date,
    'spreadsheet-yield-USDT-2025-08-Dario_Deiana',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Indigo Fees USDT: prev=898.4752495000, flows=0.0000000000, yield=1329.1245705000, end=2227.5998200000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'b464a3f7-60d5-4bc0-9833-7b413bcc6cae'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    1329.1245705000,
    '2025-08-31'::date,
    'spreadsheet-yield-USDT-2025-08-Indigo_Fees',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- INDIGO Ventures USDT: prev=0.0000000000, flows=130000.0000000000, yield=710.1483000000, end=130710.1483000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '3d606d2e-28cf-41e7-96f2-aeb52551c053'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    710.1483000000,
    '2025-08-31'::date,
    'spreadsheet-yield-USDT-2025-08-INDIGO_Ventures',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Julien Grunebaum USDT: prev=109888.2345000000, flows=0.0000000000, yield=594.9673000000, end=110483.2018000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '7fdedf56-e838-45ea-91f8-6e441810c761'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    594.9673000000,
    '2025-08-31'::date,
    'spreadsheet-yield-USDT-2025-08-Julien_Grunebaum',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Lars Ahlgreen USDT: prev=21.2971911700, flows=0.0000000000, yield=23.3558014800, end=44.6529926500
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '9405071c-0b52-4399-85da-9f1ba9b289c1'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    23.3558014800,
    '2025-08-31'::date,
    'spreadsheet-yield-USDT-2025-08-Lars_Ahlgreen',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Matthew Beatty USDT: prev=256663.0419000000, flows=25900.0000000000, yield=1427.7886000000, end=283990.8305000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '24f3054e-a125-4954-8861-55aa617cbb2c'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    1427.7886000000,
    '2025-08-31'::date,
    'spreadsheet-yield-USDT-2025-08-Matthew_Beatty',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Pierre Bezencon USDT: prev=109828.9669000000, flows=0.0000000000, yield=594.6464000000, end=110423.6133000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '511991c7-93a2-4d2b-b42a-43120d58f672'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    594.6464000000,
    '2025-08-31'::date,
    'spreadsheet-yield-USDT-2025-08-Pierre_Bezencon',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Terance Chen USDT: prev=220197.7562000000, flows=0.0000000000, yield=1192.2155000000, end=221389.9717000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '3705c2cd-49d2-4e3b-ac09-7c1f98ebb93c'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    1192.2155000000,
    '2025-08-31'::date,
    'spreadsheet-yield-USDT-2025-08-Terance_Chen',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  RAISE NOTICE 'Month 2025-08: inserted 23 yield transactions';
END;
$$;

-- ================================================
-- Month: 2025-09 (39 yield entries)
-- ================================================
DO $$
DECLARE
  v_tx_id uuid;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', 'a16a7e50-fefd-4bfe-897c-d16279b457c2', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"a16a7e50-fefd-4bfe-897c-d16279b457c2","role":"authenticated"}', true);
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Blondish BTC: prev=4.1167342600, flows=0.0000000000, yield=0.0163229610, end=4.1330572210
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '529cac24-615c-4408-b683-2c4ab635d6fd'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0163229610,
    '2025-09-30'::date,
    'spreadsheet-yield-BTC-2025-09-Blondish',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Danielle Richetta BTC: prev=4.6298610500, flows=0.0000000000, yield=0.0165210840, end=4.6463821340
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'e134e0df-d4e7-49c4-80b3-4ef37af6bebf'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0165210840,
    '2025-09-30'::date,
    'spreadsheet-yield-BTC-2025-09-Danielle_Richetta',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Indigo Fees BTC: prev=0.1407923835, flows=0.0000000000, yield=0.0109792346, end=0.1517716181
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'b464a3f7-60d5-4bc0-9833-7b413bcc6cae'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0109792346,
    '2025-09-30'::date,
    'spreadsheet-yield-BTC-2025-09-Indigo_Fees',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Jose Molla BTC: prev=3.6990136850, flows=0.0000000000, yield=0.0124659100, end=3.7114795950
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '172d6461-f6cb-4457-a8c3-75c978cc12be'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0124659100,
    '2025-09-30'::date,
    'spreadsheet-yield-BTC-2025-09-Jose_Molla',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Kabbaj BTC: prev=4.5206279100, flows=0.0000000000, yield=0.0143383390, end=4.5349662490
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'f917cd8b-2d12-428c-ae3c-210b7ee3ae75'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0143383390,
    '2025-09-30'::date,
    'spreadsheet-yield-BTC-2025-09-Kabbaj',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Matthias Reiser BTC: prev=4.9305223030, flows=0.0000000000, yield=0.0175939580, end=4.9481162610
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'd8643c68-7045-458a-b105-a41f56085c55'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0175939580,
    '2025-09-30'::date,
    'spreadsheet-yield-BTC-2025-09-Matthias_Reiser',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Nathanaël Cohen BTC: prev=0.4478640551, flows=0.0000000000, yield=0.0017757928, end=0.4496398479
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'ed91c89d-23de-4981-b6b7-60e13f1a6767'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0017757928,
    '2025-09-30'::date,
    'spreadsheet-yield-BTC-2025-09-Nathana_l_Cohen',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Oliver Loisel BTC: prev=2.1228032900, flows=0.0000000000, yield=0.0075749600, end=2.1303782500
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'fbf8e2f4-7c5d-4496-a486-f0d8e88cc794'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0075749600,
    '2025-09-30'::date,
    'spreadsheet-yield-BTC-2025-09-Oliver_Loisel',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Thomas Puech BTC: prev=6.7179608260, flows=0.0000000000, yield=0.0266368920, end=6.7445977180
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '44801beb-4476-4a9b-9751-4e70267f6953'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0266368920,
    '2025-09-30'::date,
    'spreadsheet-yield-BTC-2025-09-Thomas_Puech',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Victoria Pariente-Cohen BTC: prev=0.1490202372, flows=0.0000000000, yield=0.0005908691, end=0.1496111063
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '249f4ab3-3433-4d81-ac92-1531b3573a50'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0005908691,
    '2025-09-30'::date,
    'spreadsheet-yield-BTC-2025-09-Victoria_Pariente_Cohen',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Advantage Blockchain ETH: prev=32.0000000000, flows=0.0000000000, yield=0.4055528600, end=32.4055528600
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '3a9a5615-d4dd-4b7f-ae20-3d48a7de3dcc'::uuid,
    '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid,
    'YIELD'::tx_type,
    0.4055528600,
    '2025-09-30'::date,
    'spreadsheet-yield-ETH-2025-09-Advantage_Blockchain',
    'yield_distribution'::tx_source,
    'ETH'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Alec Beckman ETH: prev=0.0000000000, flows=0.0000000000, yield=0.0101804629, end=0.0101804629
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '5fc170e2-7a07-4f32-991f-d8b6deec277c'::uuid,
    '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid,
    'YIELD'::tx_type,
    0.0101804629,
    '2025-09-30'::date,
    'spreadsheet-yield-ETH-2025-09-Alec_Beckman',
    'yield_distribution'::tx_source,
    'ETH'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Alex Jacobs ETH: prev=0.0000000000, flows=0.0000000000, yield=0.0017385531, end=0.0017385531
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'd681a28c-bb59-4bb7-bf34-ab23910596df'::uuid,
    '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid,
    'YIELD'::tx_type,
    0.0017385531,
    '2025-09-30'::date,
    'spreadsheet-yield-ETH-2025-09-Alex_Jacobs',
    'yield_distribution'::tx_source,
    'ETH'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Babak Eftekhari ETH: prev=60.1438919184, flows=0.0000000000, yield=0.7622352316, end=60.9061271500
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'cdcccf6e-32f9-475a-9f88-34272ca3e64b'::uuid,
    '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid,
    'YIELD'::tx_type,
    0.7622352316,
    '2025-09-30'::date,
    'spreadsheet-yield-ETH-2025-09-Babak_Eftekhari',
    'yield_distribution'::tx_source,
    'ETH'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Blondish ETH: prev=120.3391856000, flows=0.0000000000, yield=1.9083607000, end=122.2475463000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '529cac24-615c-4408-b683-2c4ab635d6fd'::uuid,
    '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid,
    'YIELD'::tx_type,
    1.9083607000,
    '2025-09-30'::date,
    'spreadsheet-yield-ETH-2025-09-Blondish',
    'yield_distribution'::tx_source,
    'ETH'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Indigo Fees ETH: prev=1.1678460020, flows=0.0000000000, yield=0.4682190920, end=1.6360650940
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'b464a3f7-60d5-4bc0-9833-7b413bcc6cae'::uuid,
    '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid,
    'YIELD'::tx_type,
    0.4682190920,
    '2025-09-30'::date,
    'spreadsheet-yield-ETH-2025-09-Indigo_Fees',
    'yield_distribution'::tx_source,
    'ETH'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Jose Molla ETH: prev=62.8718430800, flows=0.0000000000, yield=0.8468258500, end=63.7186689300
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '172d6461-f6cb-4457-a8c3-75c978cc12be'::uuid,
    '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid,
    'YIELD'::tx_type,
    0.8468258500,
    '2025-09-30'::date,
    'spreadsheet-yield-ETH-2025-09-Jose_Molla',
    'yield_distribution'::tx_source,
    'ETH'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Lars Ahlgreen ETH: prev=0.0000000000, flows=0.0000000000, yield=0.0191341457, end=0.0191341457
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '9405071c-0b52-4399-85da-9f1ba9b289c1'::uuid,
    '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid,
    'YIELD'::tx_type,
    0.0191341457,
    '2025-09-30'::date,
    'spreadsheet-yield-ETH-2025-09-Lars_Ahlgreen',
    'yield_distribution'::tx_source,
    'ETH'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Nathanaël Cohen ETH: prev=31.9248486500, flows=3.3500000000, yield=0.5202000400, end=35.7950486900
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'ed91c89d-23de-4981-b6b7-60e13f1a6767'::uuid,
    '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid,
    'YIELD'::tx_type,
    0.5202000400,
    '2025-09-30'::date,
    'spreadsheet-yield-ETH-2025-09-Nathana_l_Cohen',
    'yield_distribution'::tx_source,
    'ETH'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Paul Johnson ETH: prev=0.0000000000, flows=24.0327000000, yield=0.0984058000, end=24.1311058000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'd1f8c666-58c5-4a83-a5c6-0f66a380aaf2'::uuid,
    '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid,
    'YIELD'::tx_type,
    0.0984058000,
    '2025-09-30'::date,
    'spreadsheet-yield-ETH-2025-09-Paul_Johnson',
    'yield_distribution'::tx_source,
    'ETH'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Tomer Zur ETH: prev=0.0000000000, flows=63.1000000000, yield=0.0788319900, end=63.1788319900
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '82f58ac0-2d34-4c00-b0df-34383c1d1dfd'::uuid,
    '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid,
    'YIELD'::tx_type,
    0.0788319900,
    '2025-09-30'::date,
    'spreadsheet-yield-ETH-2025-09-Tomer_Zur',
    'yield_distribution'::tx_source,
    'ETH'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Alex Jacobs SOL: prev=0.0000000000, flows=0.0000000000, yield=0.0326870859, end=0.0326870859
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'd681a28c-bb59-4bb7-bf34-ab23910596df'::uuid,
    '7574bc81-aab3-4175-9e7f-803aa6f9eb8f'::uuid,
    'YIELD'::tx_type,
    0.0326870859,
    '2025-09-30'::date,
    'spreadsheet-yield-SOL-2025-09-Alex_Jacobs',
    'yield_distribution'::tx_source,
    'SOL'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- INDIGO DIGITAL ASSET FUND LP SOL: prev=0.0000000000, flows=1250.0000000000, yield=13.6508610000, end=1263.6508610000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'd91f3eb7-bd47-4c42-ab4f-c4f20fb41b13'::uuid,
    '7574bc81-aab3-4175-9e7f-803aa6f9eb8f'::uuid,
    'YIELD'::tx_type,
    13.6508610000,
    '2025-09-30'::date,
    'spreadsheet-yield-SOL-2025-09-INDIGO_DIGITAL_ASSET_FUND_LP',
    'yield_distribution'::tx_source,
    'SOL'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Indigo Fees SOL: prev=0.0000000000, flows=0.0000000000, yield=0.2941837734, end=0.2941837734
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'b464a3f7-60d5-4bc0-9833-7b413bcc6cae'::uuid,
    '7574bc81-aab3-4175-9e7f-803aa6f9eb8f'::uuid,
    'YIELD'::tx_type,
    0.2941837734,
    '2025-09-30'::date,
    'spreadsheet-yield-SOL-2025-09-Indigo_Fees',
    'yield_distribution'::tx_source,
    'SOL'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Paul Johnson SOL: prev=0.0000000000, flows=234.1700000000, yield=1.8522682000, end=236.0222682000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'd1f8c666-58c5-4a83-a5c6-0f66a380aaf2'::uuid,
    '7574bc81-aab3-4175-9e7f-803aa6f9eb8f'::uuid,
    'YIELD'::tx_type,
    1.8522682000,
    '2025-09-30'::date,
    'spreadsheet-yield-SOL-2025-09-Paul_Johnson',
    'yield_distribution'::tx_source,
    'SOL'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Alain Bensimon USDT: prev=137759.3349000000, flows=0.0000000000, yield=1577.5787000000, end=139336.9136000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '20396ec2-c919-46ef-b3a3-8005a8a34bd3'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    1577.5787000000,
    '2025-09-30'::date,
    'spreadsheet-yield-USDT-2025-09-Alain_Bensimon',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Anne Cecile Noique USDT: prev=224351.9531000000, flows=0.0000000000, yield=2569.2115000000, end=226921.1646000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '64cb831a-3365-4a89-9369-620ab7a1ff26'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    2569.2115000000,
    '2025-09-30'::date,
    'spreadsheet-yield-USDT-2025-09-Anne_Cecile_Noique',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Babak Eftekhari USDT: prev=194910.0973000000, flows=10000.0000000000, yield=2000.2450000000, end=206910.3423000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'cdcccf6e-32f9-475a-9f88-34272ca3e64b'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    2000.2450000000,
    '2025-09-30'::date,
    'spreadsheet-yield-USDT-2025-09-Babak_Eftekhari',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Bo De Kriek USDT: prev=276538.2664000000, flows=0.0000000000, yield=3166.8336000000, end=279705.1000000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '98dd4ff5-b5cb-4257-a501-aa25a6d638c5'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    3166.8336000000,
    '2025-09-30'::date,
    'spreadsheet-yield-USDT-2025-09-Bo_De_Kriek',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Daniele Francilia USDT: prev=110871.0323000000, flows=0.0000000000, yield=1269.6619000000, end=112140.6942000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'd1f39136-4d87-4e7f-8885-a413c21d9a56'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    1269.6619000000,
    '2025-09-30'::date,
    'spreadsheet-yield-USDT-2025-09-Daniele_Francilia',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Dario Deiana USDT: prev=201189.2975000000, flows=0.0000000000, yield=2047.1829000000, end=203236.4804000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'bb655a37-9e91-4166-b575-cafbbbb8c200'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    2047.1829000000,
    '2025-09-30'::date,
    'spreadsheet-yield-USDT-2025-09-Dario_Deiana',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- INDIGO DIGITAL ASSET FUND LP USDT: prev=111370.0000000000, flows=0.0000000000, yield=1417.6251000000, end=112787.6251000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'd91f3eb7-bd47-4c42-ab4f-c4f20fb41b13'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    1417.6251000000,
    '2025-09-30'::date,
    'spreadsheet-yield-USDT-2025-09-INDIGO_DIGITAL_ASSET_FUND_LP',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Indigo Fees USDT: prev=2227.5998200000, flows=0.0000000000, yield=2879.0155930000, end=5106.6154130000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'b464a3f7-60d5-4bc0-9833-7b413bcc6cae'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    2879.0155930000,
    '2025-09-30'::date,
    'spreadsheet-yield-USDT-2025-09-Indigo_Fees',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- INDIGO Ventures USDT: prev=130710.1483000000, flows=0.0000000000, yield=1663.8052000000, end=132373.9535000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '3d606d2e-28cf-41e7-96f2-aeb52551c053'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    1663.8052000000,
    '2025-09-30'::date,
    'spreadsheet-yield-USDT-2025-09-INDIGO_Ventures',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Julien Grunebaum USDT: prev=110483.2018000000, flows=0.0000000000, yield=1265.2206000000, end=111748.4224000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '7fdedf56-e838-45ea-91f8-6e441810c761'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    1265.2206000000,
    '2025-09-30'::date,
    'spreadsheet-yield-USDT-2025-09-Julien_Grunebaum',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Lars Ahlgreen USDT: prev=44.6529926500, flows=0.0000000000, yield=50.6118622900, end=95.2648549400
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '9405071c-0b52-4399-85da-9f1ba9b289c1'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    50.6118622900,
    '2025-09-30'::date,
    'spreadsheet-yield-USDT-2025-09-Lars_Ahlgreen',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Matthew Beatty USDT: prev=283990.8305000000, flows=0.0000000000, yield=3252.1781000000, end=287243.0086000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '24f3054e-a125-4954-8861-55aa617cbb2c'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    3252.1781000000,
    '2025-09-30'::date,
    'spreadsheet-yield-USDT-2025-09-Matthew_Beatty',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Pierre Bezencon USDT: prev=110423.6133000000, flows=0.0000000000, yield=1264.5382000000, end=111688.1515000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '511991c7-93a2-4d2b-b42a-43120d58f672'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    1264.5382000000,
    '2025-09-30'::date,
    'spreadsheet-yield-USDT-2025-09-Pierre_Bezencon',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Terance Chen USDT: prev=221389.9717000000, flows=0.0000000000, yield=2535.2918000000, end=223925.2635000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '3705c2cd-49d2-4e3b-ac09-7c1f98ebb93c'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    2535.2918000000,
    '2025-09-30'::date,
    'spreadsheet-yield-USDT-2025-09-Terance_Chen',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  RAISE NOTICE 'Month 2025-09: inserted 39 yield transactions';
END;
$$;

-- ================================================
-- Month: 2025-10 (44 yield entries)
-- ================================================
DO $$
DECLARE
  v_tx_id uuid;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', 'a16a7e50-fefd-4bfe-897c-d16279b457c2', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"a16a7e50-fefd-4bfe-897c-d16279b457c2","role":"authenticated"}', true);
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Alex Jacobs BTC: prev=0.0000000000, flows=0.0000000000, yield=0.0000181981, end=0.0000181981
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'd681a28c-bb59-4bb7-bf34-ab23910596df'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0000181981,
    '2025-10-31'::date,
    'spreadsheet-yield-BTC-2025-10-Alex_Jacobs',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Blondish BTC: prev=4.1330572210, flows=0.0000000000, yield=0.0140303650, end=4.1470875860
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '529cac24-615c-4408-b683-2c4ab635d6fd'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0140303650,
    '2025-10-31'::date,
    'spreadsheet-yield-BTC-2025-10-Blondish',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Danielle Richetta BTC: prev=4.6463821340, flows=0.0000000000, yield=0.0141946500, end=4.6605767840
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'e134e0df-d4e7-49c4-80b3-4ef37af6bebf'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0141946500,
    '2025-10-31'::date,
    'spreadsheet-yield-BTC-2025-10-Danielle_Richetta',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Indigo Fees BTC: prev=0.1517716181, flows=0.0000000000, yield=0.0096356987, end=0.1614073168
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'b464a3f7-60d5-4bc0-9833-7b413bcc6cae'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0096356987,
    '2025-10-31'::date,
    'spreadsheet-yield-BTC-2025-10-Indigo_Fees',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Jose Molla BTC: prev=3.7114795950, flows=0.0620000000, yield=0.0107213310, end=3.7842009260
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '172d6461-f6cb-4457-a8c3-75c978cc12be'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0107213310,
    '2025-10-31'::date,
    'spreadsheet-yield-BTC-2025-10-Jose_Molla',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Kabbaj BTC: prev=4.5349662490, flows=0.0000000000, yield=0.0123140510, end=4.5472803000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'f917cd8b-2d12-428c-ae3c-210b7ee3ae75'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0123140510,
    '2025-10-31'::date,
    'spreadsheet-yield-BTC-2025-10-Kabbaj',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Matthias Reiser BTC: prev=4.9481162610, flows=0.0000000000, yield=0.0151164440, end=4.9632327050
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'd8643c68-7045-458a-b105-a41f56085c55'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0151164440,
    '2025-10-31'::date,
    'spreadsheet-yield-BTC-2025-10-Matthias_Reiser',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Nathanaël Cohen BTC: prev=0.4496398479, flows=0.0000000000, yield=0.0015263789, end=0.4511662268
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'ed91c89d-23de-4981-b6b7-60e13f1a6767'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0015263789,
    '2025-10-31'::date,
    'spreadsheet-yield-BTC-2025-10-Nathana_l_Cohen',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Oliver Loisel BTC: prev=2.1303782500, flows=0.0000000000, yield=0.0065082830, end=2.1368865330
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'fbf8e2f4-7c5d-4496-a486-f0d8e88cc794'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0065082830,
    '2025-10-31'::date,
    'spreadsheet-yield-BTC-2025-10-Oliver_Loisel',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Paul Johnson BTC: prev=0.0000000000, flows=0.4395000000, yield=0.0010310364, end=0.4405310364
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'd1f8c666-58c5-4a83-a5c6-0f66a380aaf2'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0010310364,
    '2025-10-31'::date,
    'spreadsheet-yield-BTC-2025-10-Paul_Johnson',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Thomas Puech BTC: prev=6.7445977180, flows=0.0000000000, yield=0.0228956840, end=6.7674934020
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '44801beb-4476-4a9b-9751-4e70267f6953'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0228956840,
    '2025-10-31'::date,
    'spreadsheet-yield-BTC-2025-10-Thomas_Puech',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Victoria Pariente-Cohen BTC: prev=0.1496111063, flows=0.0000000000, yield=0.0005078804, end=0.1501189867
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '249f4ab3-3433-4d81-ac92-1531b3573a50'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0005078804,
    '2025-10-31'::date,
    'spreadsheet-yield-BTC-2025-10-Victoria_Pariente_Cohen',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Advantage Blockchain ETH: prev=32.4055528600, flows=0.0000000000, yield=0.1944808100, end=32.6000336700
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '3a9a5615-d4dd-4b7f-ae20-3d48a7de3dcc'::uuid,
    '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid,
    'YIELD'::tx_type,
    0.1944808100,
    '2025-10-31'::date,
    'spreadsheet-yield-ETH-2025-10-Advantage_Blockchain',
    'yield_distribution'::tx_source,
    'ETH'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Alec Beckman ETH: prev=0.0101804629, flows=0.0000000000, yield=0.0049343522, end=0.0151148151
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '5fc170e2-7a07-4f32-991f-d8b6deec277c'::uuid,
    '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid,
    'YIELD'::tx_type,
    0.0049343522,
    '2025-10-31'::date,
    'spreadsheet-yield-ETH-2025-10-Alec_Beckman',
    'yield_distribution'::tx_source,
    'ETH'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Alex Jacobs ETH: prev=0.0017385531, flows=0.0000000000, yield=0.0014689969, end=0.0032075500
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'd681a28c-bb59-4bb7-bf34-ab23910596df'::uuid,
    '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid,
    'YIELD'::tx_type,
    0.0014689969,
    '2025-10-31'::date,
    'spreadsheet-yield-ETH-2025-10-Alex_Jacobs',
    'yield_distribution'::tx_source,
    'ETH'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Babak Eftekhari ETH: prev=60.9061271500, flows=6.8500000000, yield=0.3881339600, end=68.1442611100
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'cdcccf6e-32f9-475a-9f88-34272ca3e64b'::uuid,
    '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid,
    'YIELD'::tx_type,
    0.3881339600,
    '2025-10-31'::date,
    'spreadsheet-yield-ETH-2025-10-Babak_Eftekhari',
    'yield_distribution'::tx_source,
    'ETH'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Blondish ETH: prev=122.2475463000, flows=0.0000000000, yield=0.9176105000, end=123.1651568000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '529cac24-615c-4408-b683-2c4ab635d6fd'::uuid,
    '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid,
    'YIELD'::tx_type,
    0.9176105000,
    '2025-10-31'::date,
    'spreadsheet-yield-ETH-2025-10-Blondish',
    'yield_distribution'::tx_source,
    'ETH'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Indigo Fees ETH: prev=1.6360650940, flows=0.0000000000, yield=0.3978820970, end=2.0339471910
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'b464a3f7-60d5-4bc0-9833-7b413bcc6cae'::uuid,
    '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid,
    'YIELD'::tx_type,
    0.3978820970,
    '2025-10-31'::date,
    'spreadsheet-yield-ETH-2025-10-Indigo_Fees',
    'yield_distribution'::tx_source,
    'ETH'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Jose Molla ETH: prev=63.7186689300, flows=1.2000000000, yield=0.4089066500, end=65.3275755800
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '172d6461-f6cb-4457-a8c3-75c978cc12be'::uuid,
    '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid,
    'YIELD'::tx_type,
    0.4089066500,
    '2025-10-31'::date,
    'spreadsheet-yield-ETH-2025-10-Jose_Molla',
    'yield_distribution'::tx_source,
    'ETH'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Lars Ahlgreen ETH: prev=0.0191341457, flows=0.0000000000, yield=0.0098397612, end=0.0289739069
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '9405071c-0b52-4399-85da-9f1ba9b289c1'::uuid,
    '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid,
    'YIELD'::tx_type,
    0.0098397612,
    '2025-10-31'::date,
    'spreadsheet-yield-ETH-2025-10-Lars_Ahlgreen',
    'yield_distribution'::tx_source,
    'ETH'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Nathanaël Cohen ETH: prev=35.7950486900, flows=0.0000000000, yield=0.2686836000, end=36.0637322900
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'ed91c89d-23de-4981-b6b7-60e13f1a6767'::uuid,
    '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid,
    'YIELD'::tx_type,
    0.2686836000,
    '2025-10-31'::date,
    'spreadsheet-yield-ETH-2025-10-Nathana_l_Cohen',
    'yield_distribution'::tx_source,
    'ETH'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Paul Johnson ETH: prev=24.1311058000, flows=-12.0000000000, yield=0.0824448100, end=12.2135506100
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'd1f8c666-58c5-4a83-a5c6-0f66a380aaf2'::uuid,
    '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid,
    'YIELD'::tx_type,
    0.0824448100,
    '2025-10-31'::date,
    'spreadsheet-yield-ETH-2025-10-Paul_Johnson',
    'yield_distribution'::tx_source,
    'ETH'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Tomer Zur ETH: prev=63.1788319900, flows=87.2627000000, yield=0.6729145100, end=151.1144465000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '82f58ac0-2d34-4c00-b0df-34383c1d1dfd'::uuid,
    '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid,
    'YIELD'::tx_type,
    0.6729145100,
    '2025-10-31'::date,
    'spreadsheet-yield-ETH-2025-10-Tomer_Zur',
    'yield_distribution'::tx_source,
    'ETH'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Alex Jacobs SOL: prev=0.0326870859, flows=0.0000000000, yield=0.0002656483, end=0.0329527342
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'd681a28c-bb59-4bb7-bf34-ab23910596df'::uuid,
    '7574bc81-aab3-4175-9e7f-803aa6f9eb8f'::uuid,
    'YIELD'::tx_type,
    0.0002656483,
    '2025-10-31'::date,
    'spreadsheet-yield-SOL-2025-10-Alex_Jacobs',
    'yield_distribution'::tx_source,
    'SOL'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- INDIGO DIGITAL ASSET FUND LP SOL: prev=1263.6508610000, flows=0.0000000000, yield=12.8415720000, end=1276.4924330000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'd91f3eb7-bd47-4c42-ab4f-c4f20fb41b13'::uuid,
    '7574bc81-aab3-4175-9e7f-803aa6f9eb8f'::uuid,
    'YIELD'::tx_type,
    12.8415720000,
    '2025-10-31'::date,
    'spreadsheet-yield-SOL-2025-10-INDIGO_DIGITAL_ASSET_FUND_LP',
    'yield_distribution'::tx_source,
    'SOL'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Indigo Fees SOL: prev=0.2941837734, flows=0.0000000000, yield=0.0346098575, end=0.3287936309
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'b464a3f7-60d5-4bc0-9833-7b413bcc6cae'::uuid,
    '7574bc81-aab3-4175-9e7f-803aa6f9eb8f'::uuid,
    'YIELD'::tx_type,
    0.0346098575,
    '2025-10-31'::date,
    'spreadsheet-yield-SOL-2025-10-Indigo_Fees',
    'yield_distribution'::tx_source,
    'SOL'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Jose Molla SOL: prev=0.0000000000, flows=87.9800000000, yield=0.1658208300, end=88.1458208300
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '172d6461-f6cb-4457-a8c3-75c978cc12be'::uuid,
    '7574bc81-aab3-4175-9e7f-803aa6f9eb8f'::uuid,
    'YIELD'::tx_type,
    0.1658208300,
    '2025-10-31'::date,
    'spreadsheet-yield-SOL-2025-10-Jose_Molla',
    'yield_distribution'::tx_source,
    'SOL'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Alain Bensimon USDT: prev=139336.9136000000, flows=0.0000000000, yield=1171.4804000000, end=140508.3940000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '20396ec2-c919-46ef-b3a3-8005a8a34bd3'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    1171.4804000000,
    '2025-10-31'::date,
    'spreadsheet-yield-USDT-2025-10-Alain_Bensimon',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Anne Cecile Noique USDT: prev=226921.1646000000, flows=0.0000000000, yield=1907.8482000000, end=228829.0128000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '64cb831a-3365-4a89-9369-620ab7a1ff26'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    1907.8482000000,
    '2025-10-31'::date,
    'spreadsheet-yield-USDT-2025-10-Anne_Cecile_Noique',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Babak Eftekhari USDT: prev=206910.3423000000, flows=30450.0000000000, yield=1673.8500000000, end=239034.1923000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'cdcccf6e-32f9-475a-9f88-34272ca3e64b'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    1673.8500000000,
    '2025-10-31'::date,
    'spreadsheet-yield-USDT-2025-10-Babak_Eftekhari',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Bo De Kriek USDT: prev=279705.1000000000, flows=0.0000000000, yield=2351.6311000000, end=282056.7311000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '98dd4ff5-b5cb-4257-a501-aa25a6d638c5'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    2351.6311000000,
    '2025-10-31'::date,
    'spreadsheet-yield-USDT-2025-10-Bo_De_Kriek',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Daniele Francilia USDT: prev=112140.6942000000, flows=0.0000000000, yield=942.8271000000, end=113083.5213000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'd1f39136-4d87-4e7f-8885-a413c21d9a56'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    942.8271000000,
    '2025-10-31'::date,
    'spreadsheet-yield-USDT-2025-10-Daniele_Francilia',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Dario Deiana USDT: prev=203236.4804000000, flows=0.0000000000, yield=1518.2891000000, end=204754.7695000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'bb655a37-9e91-4166-b575-cafbbbb8c200'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    1518.2891000000,
    '2025-10-31'::date,
    'spreadsheet-yield-USDT-2025-10-Dario_Deiana',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- HALLEY86 USDT: prev=0.0000000000, flows=99990.0000000000, yield=338.7759000000, end=100328.7759000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '32d75475-0b78-4b7b-925a-e9429f6fe66d'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    338.7759000000,
    '2025-10-31'::date,
    'spreadsheet-yield-USDT-2025-10-HALLEY86',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- INDIGO DIGITAL ASSET FUND LP USDT: prev=112787.6251000000, flows=0.0000000000, yield=1054.0258000000, end=113841.6509000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'd91f3eb7-bd47-4c42-ab4f-c4f20fb41b13'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    1054.0258000000,
    '2025-10-31'::date,
    'spreadsheet-yield-USDT-2025-10-INDIGO_DIGITAL_ASSET_FUND_LP',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Indigo Fees USDT: prev=5106.6154130000, flows=0.0000000000, yield=2457.9461170000, end=7564.5615300000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'b464a3f7-60d5-4bc0-9833-7b413bcc6cae'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    2457.9461170000,
    '2025-10-31'::date,
    'spreadsheet-yield-USDT-2025-10-Indigo_Fees',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- INDIGO Ventures USDT: prev=132373.9535000000, flows=-127594.5500000000, yield=247.4593950000, end=5026.8628950000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '3d606d2e-28cf-41e7-96f2-aeb52551c053'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    247.4593950000,
    '2025-10-31'::date,
    'spreadsheet-yield-USDT-2025-10-INDIGO_Ventures',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Jose Molla USDT: prev=0.0000000000, flows=97695.0000000000, yield=226.7024800000, end=97921.7024800000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '172d6461-f6cb-4457-a8c3-75c978cc12be'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    226.7024800000,
    '2025-10-31'::date,
    'spreadsheet-yield-USDT-2025-10-Jose_Molla',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Julien Grunebaum USDT: prev=111748.4224000000, flows=0.0000000000, yield=939.5291000000, end=112687.9515000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '7fdedf56-e838-45ea-91f8-6e441810c761'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    939.5291000000,
    '2025-10-31'::date,
    'spreadsheet-yield-USDT-2025-10-Julien_Grunebaum',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Lars Ahlgreen USDT: prev=95.2648549400, flows=0.0000000000, yield=42.6792140600, end=137.9440690000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '9405071c-0b52-4399-85da-9f1ba9b289c1'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    42.6792140600,
    '2025-10-31'::date,
    'spreadsheet-yield-USDT-2025-10-Lars_Ahlgreen',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Matthew Beatty USDT: prev=287243.0086000000, flows=0.0000000000, yield=2415.0064000000, end=289658.0150000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '24f3054e-a125-4954-8861-55aa617cbb2c'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    2415.0064000000,
    '2025-10-31'::date,
    'spreadsheet-yield-USDT-2025-10-Matthew_Beatty',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Pierre Bezencon USDT: prev=111688.1515000000, flows=0.0000000000, yield=939.0223000000, end=112627.1738000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '511991c7-93a2-4d2b-b42a-43120d58f672'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    939.0223000000,
    '2025-10-31'::date,
    'spreadsheet-yield-USDT-2025-10-Pierre_Bezencon',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Sacha Oshry USDT: prev=0.0000000000, flows=100000.0000000000, yield=714.8172000000, end=100714.8172000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'd5719d57-5308-4b9d-8a4f-a9a8aa596af4'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    714.8172000000,
    '2025-10-31'::date,
    'spreadsheet-yield-USDT-2025-10-Sacha_Oshry',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Terance Chen USDT: prev=223925.2635000000, flows=0.0000000000, yield=1882.6601000000, end=225807.9236000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '3705c2cd-49d2-4e3b-ac09-7c1f98ebb93c'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    1882.6601000000,
    '2025-10-31'::date,
    'spreadsheet-yield-USDT-2025-10-Terance_Chen',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  RAISE NOTICE 'Month 2025-10: inserted 44 yield transactions';
END;
$$;

-- ================================================
-- Month: 2025-11 (57 yield entries)
-- ================================================
DO $$
DECLARE
  v_tx_id uuid;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', 'a16a7e50-fefd-4bfe-897c-d16279b457c2', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"a16a7e50-fefd-4bfe-897c-d16279b457c2","role":"authenticated"}', true);
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Alex Jacobs BTC: prev=0.0000181981, flows=0.0000000000, yield=0.0000041557, end=0.0000223538
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'd681a28c-bb59-4bb7-bf34-ab23910596df'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0000041557,
    '2025-11-30'::date,
    'spreadsheet-yield-BTC-2025-11-Alex_Jacobs',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Blondish BTC: prev=4.1470875860, flows=0.0000000000, yield=0.0127181600, end=4.1598057460
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '529cac24-615c-4408-b683-2c4ab635d6fd'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0127181600,
    '2025-11-30'::date,
    'spreadsheet-yield-BTC-2025-11-Blondish',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Danielle Richetta BTC: prev=4.6605767840, flows=-0.2830000000, yield=0.0122397440, end=4.3898165280
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'e134e0df-d4e7-49c4-80b3-4ef37af6bebf'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0122397440,
    '2025-11-30'::date,
    'spreadsheet-yield-BTC-2025-11-Danielle_Richetta',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Indigo Fees BTC: prev=0.1614073168, flows=0.0000000000, yield=0.0088974651, end=0.1703047819
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'b464a3f7-60d5-4bc0-9833-7b413bcc6cae'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0088974651,
    '2025-11-30'::date,
    'spreadsheet-yield-BTC-2025-11-Indigo_Fees',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Jose Molla BTC: prev=3.7842009260, flows=1.0347000000, yield=0.0104498390, end=4.8293507650
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '172d6461-f6cb-4457-a8c3-75c978cc12be'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0104498390,
    '2025-11-30'::date,
    'spreadsheet-yield-BTC-2025-11-Jose_Molla',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Kabbaj BTC: prev=4.5472803000, flows=0.0000000000, yield=0.0111540250, end=4.5584343250
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'f917cd8b-2d12-428c-ae3c-210b7ee3ae75'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0111540250,
    '2025-11-30'::date,
    'spreadsheet-yield-BTC-2025-11-Kabbaj',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Matthias Reiser BTC: prev=4.9632327050, flows=0.0000000000, yield=0.0136975410, end=4.9769302460
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'd8643c68-7045-458a-b105-a41f56085c55'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0136975410,
    '2025-11-30'::date,
    'spreadsheet-yield-BTC-2025-11-Matthias_Reiser',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Nathanaël Cohen BTC: prev=0.4511662268, flows=0.0000000000, yield=0.0013836226, end=0.4525498494
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'ed91c89d-23de-4981-b6b7-60e13f1a6767'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0013836226,
    '2025-11-30'::date,
    'spreadsheet-yield-BTC-2025-11-Nathana_l_Cohen',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Oliver Loisel BTC: prev=2.1368865330, flows=0.0000000000, yield=0.0058973850, end=2.1427839180
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'fbf8e2f4-7c5d-4496-a486-f0d8e88cc794'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0058973850,
    '2025-11-30'::date,
    'spreadsheet-yield-BTC-2025-11-Oliver_Loisel',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Paul Johnson BTC: prev=0.0000000000, flows=-0.4408000000, yield=0.0002689636, end=0.0000000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'd1f8c666-58c5-4a83-a5c6-0f66a380aaf2'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0002689636,
    '2025-11-30'::date,
    'spreadsheet-yield-BTC-2025-11-Paul_Johnson',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Ryan Van Der Wall BTC: prev=0.0000000000, flows=0.0000000000, yield=0.0000559228, end=0.0000559228
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'f462d9e5-7363-4c82-a144-4e694d2b55da'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0000559228,
    '2025-11-30'::date,
    'spreadsheet-yield-BTC-2025-11-Ryan_Van_Der_Wall',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Sam Johnson BTC: prev=0.0000000000, flows=5.5000000000, yield=0.0011184570, end=5.5011184570
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '2f7b8bb2-6a60-4fc9-953d-b9fae44337c1'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0011184570,
    '2025-11-30'::date,
    'spreadsheet-yield-BTC-2025-11-Sam_Johnson',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Thomas Puech BTC: prev=6.7674934020, flows=0.0000000000, yield=0.0207543390, end=6.7882477410
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '44801beb-4476-4a9b-9751-4e70267f6953'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0207543390,
    '2025-11-30'::date,
    'spreadsheet-yield-BTC-2025-11-Thomas_Puech',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Victoria Pariente-Cohen BTC: prev=0.1501189867, flows=0.0000000000, yield=0.0004603802, end=0.1505793669
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '249f4ab3-3433-4d81-ac92-1531b3573a50'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0004603802,
    '2025-11-30'::date,
    'spreadsheet-yield-BTC-2025-11-Victoria_Pariente_Cohen',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Advantage Blockchain ETH: prev=32.6000336700, flows=0.0000000000, yield=0.1494420500, end=32.7494757200
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '3a9a5615-d4dd-4b7f-ae20-3d48a7de3dcc'::uuid,
    '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid,
    'YIELD'::tx_type,
    0.1494420500,
    '2025-11-30'::date,
    'spreadsheet-yield-ETH-2025-11-Advantage_Blockchain',
    'yield_distribution'::tx_source,
    'ETH'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Alec Beckman ETH: prev=0.0151148151, flows=0.0000000000, yield=0.0038118769, end=0.0189266920
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '5fc170e2-7a07-4f32-991f-d8b6deec277c'::uuid,
    '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid,
    'YIELD'::tx_type,
    0.0038118769,
    '2025-11-30'::date,
    'spreadsheet-yield-ETH-2025-11-Alec_Beckman',
    'yield_distribution'::tx_source,
    'ETH'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Alex Jacobs ETH: prev=0.0032075500, flows=0.0000000000, yield=0.0001408390, end=0.0033483890
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'd681a28c-bb59-4bb7-bf34-ab23910596df'::uuid,
    '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid,
    'YIELD'::tx_type,
    0.0001408390,
    '2025-11-30'::date,
    'spreadsheet-yield-ETH-2025-11-Alex_Jacobs',
    'yield_distribution'::tx_source,
    'ETH'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Babak Eftekhari ETH: prev=68.1442611100, flows=0.0000000000, yield=0.3123806000, end=68.4566417100
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'cdcccf6e-32f9-475a-9f88-34272ca3e64b'::uuid,
    '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid,
    'YIELD'::tx_type,
    0.3123806000,
    '2025-11-30'::date,
    'spreadsheet-yield-ETH-2025-11-Babak_Eftekhari',
    'yield_distribution'::tx_source,
    'ETH'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Blondish ETH: prev=123.1651568000, flows=4.7939593520, yield=0.7333880480, end=128.6925042000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '529cac24-615c-4408-b683-2c4ab635d6fd'::uuid,
    '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid,
    'YIELD'::tx_type,
    0.7333880480,
    '2025-11-30'::date,
    'spreadsheet-yield-ETH-2025-11-Blondish',
    'yield_distribution'::tx_source,
    'ETH'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Indigo Fees ETH: prev=2.0339471910, flows=0.0359374502, yield=0.4316120338, end=2.5014966750
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'b464a3f7-60d5-4bc0-9833-7b413bcc6cae'::uuid,
    '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid,
    'YIELD'::tx_type,
    0.4316120338,
    '2025-11-30'::date,
    'spreadsheet-yield-ETH-2025-11-Indigo_Fees',
    'yield_distribution'::tx_source,
    'ETH'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Jose Molla ETH: prev=65.3275755800, flows=2.5063577386, yield=0.3303842514, end=68.1643175700
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '172d6461-f6cb-4457-a8c3-75c978cc12be'::uuid,
    '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid,
    'YIELD'::tx_type,
    0.3303842514,
    '2025-11-30'::date,
    'spreadsheet-yield-ETH-2025-11-Jose_Molla',
    'yield_distribution'::tx_source,
    'ETH'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Lars Ahlgreen ETH: prev=0.0289739069, flows=0.0000000000, yield=0.0079560004, end=0.0369299073
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '9405071c-0b52-4399-85da-9f1ba9b289c1'::uuid,
    '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid,
    'YIELD'::tx_type,
    0.0079560004,
    '2025-11-30'::date,
    'spreadsheet-yield-ETH-2025-11-Lars_Ahlgreen',
    'yield_distribution'::tx_source,
    'ETH'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Nathanaël Cohen ETH: prev=36.0637322900, flows=1.0677454591, yield=0.2127719709, end=37.3442497200
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'ed91c89d-23de-4981-b6b7-60e13f1a6767'::uuid,
    '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid,
    'YIELD'::tx_type,
    0.2127719709,
    '2025-11-30'::date,
    'spreadsheet-yield-ETH-2025-11-Nathana_l_Cohen',
    'yield_distribution'::tx_source,
    'ETH'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Paul Johnson ETH: prev=12.2135506100, flows=-12.2200000000, yield=0.0064493900, end=0.0000000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'd1f8c666-58c5-4a83-a5c6-0f66a380aaf2'::uuid,
    '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid,
    'YIELD'::tx_type,
    0.0064493900,
    '2025-11-30'::date,
    'spreadsheet-yield-ETH-2025-11-Paul_Johnson',
    'yield_distribution'::tx_source,
    'ETH'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Ryan Van Der Wall ETH: prev=0.0000000000, flows=0.0000000000, yield=0.0133382057, end=0.0133382057
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'f462d9e5-7363-4c82-a144-4e694d2b55da'::uuid,
    '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid,
    'YIELD'::tx_type,
    0.0133382057,
    '2025-11-30'::date,
    'spreadsheet-yield-ETH-2025-11-Ryan_Van_Der_Wall',
    'yield_distribution'::tx_source,
    'ETH'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Sam Johnson ETH: prev=0.0000000000, flows=146.0000000000, yield=0.2666340000, end=146.2666340000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '2f7b8bb2-6a60-4fc9-953d-b9fae44337c1'::uuid,
    '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid,
    'YIELD'::tx_type,
    0.2666340000,
    '2025-11-30'::date,
    'spreadsheet-yield-ETH-2025-11-Sam_Johnson',
    'yield_distribution'::tx_source,
    'ETH'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Tomer Zur ETH: prev=151.1144465000, flows=31.0314000000, yield=0.8062906000, end=182.9521371000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '82f58ac0-2d34-4c00-b0df-34383c1d1dfd'::uuid,
    '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid,
    'YIELD'::tx_type,
    0.8062906000,
    '2025-11-30'::date,
    'spreadsheet-yield-ETH-2025-11-Tomer_Zur',
    'yield_distribution'::tx_source,
    'ETH'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Alex Jacobs SOL: prev=0.0329527342, flows=0.0000000000, yield=0.0001891405, end=0.0331418747
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'd681a28c-bb59-4bb7-bf34-ab23910596df'::uuid,
    '7574bc81-aab3-4175-9e7f-803aa6f9eb8f'::uuid,
    'YIELD'::tx_type,
    0.0001891405,
    '2025-11-30'::date,
    'spreadsheet-yield-SOL-2025-11-Alex_Jacobs',
    'yield_distribution'::tx_source,
    'SOL'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- INDIGO DIGITAL ASSET FUND LP SOL: prev=1276.4924330000, flows=0.0000000000, yield=9.1627470000, end=1285.6551800000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'd91f3eb7-bd47-4c42-ab4f-c4f20fb41b13'::uuid,
    '7574bc81-aab3-4175-9e7f-803aa6f9eb8f'::uuid,
    'YIELD'::tx_type,
    9.1627470000,
    '2025-11-30'::date,
    'spreadsheet-yield-SOL-2025-11-INDIGO_DIGITAL_ASSET_FUND_LP',
    'yield_distribution'::tx_source,
    'SOL'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Indigo Fees SOL: prev=0.3287936309, flows=0.0000000000, yield=1.5629091091, end=1.8917027400
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'b464a3f7-60d5-4bc0-9833-7b413bcc6cae'::uuid,
    '7574bc81-aab3-4175-9e7f-803aa6f9eb8f'::uuid,
    'YIELD'::tx_type,
    1.5629091091,
    '2025-11-30'::date,
    'spreadsheet-yield-SOL-2025-11-Indigo_Fees',
    'yield_distribution'::tx_source,
    'SOL'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Jose Molla SOL: prev=88.1458208300, flows=0.0000000000, yield=0.5376192500, end=88.6834400800
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '172d6461-f6cb-4457-a8c3-75c978cc12be'::uuid,
    '7574bc81-aab3-4175-9e7f-803aa6f9eb8f'::uuid,
    'YIELD'::tx_type,
    0.5376192500,
    '2025-11-30'::date,
    'spreadsheet-yield-SOL-2025-11-Jose_Molla',
    'yield_distribution'::tx_source,
    'SOL'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Ryan Van Der Wall SOL: prev=0.0000000000, flows=0.0000000000, yield=0.3662706324, end=0.3662706324
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'f462d9e5-7363-4c82-a144-4e694d2b55da'::uuid,
    '7574bc81-aab3-4175-9e7f-803aa6f9eb8f'::uuid,
    'YIELD'::tx_type,
    0.3662706324,
    '2025-11-30'::date,
    'spreadsheet-yield-SOL-2025-11-Ryan_Van_Der_Wall',
    'yield_distribution'::tx_source,
    'SOL'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Sam Johnson SOL: prev=0.0000000000, flows=3300.0500000000, yield=7.3202640000, end=3307.3702640000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '2f7b8bb2-6a60-4fc9-953d-b9fae44337c1'::uuid,
    '7574bc81-aab3-4175-9e7f-803aa6f9eb8f'::uuid,
    'YIELD'::tx_type,
    7.3202640000,
    '2025-11-30'::date,
    'spreadsheet-yield-SOL-2025-11-Sam_Johnson',
    'yield_distribution'::tx_source,
    'SOL'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Alain Bensimon USDT: prev=140508.3940000000, flows=0.0000000000, yield=1077.2730000000, end=141585.6670000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '20396ec2-c919-46ef-b3a3-8005a8a34bd3'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    1077.2730000000,
    '2025-11-30'::date,
    'spreadsheet-yield-USDT-2025-11-Alain_Bensimon',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Anne Cecile Noique USDT: prev=228829.0128000000, flows=0.0000000000, yield=1754.4243000000, end=230583.4371000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '64cb831a-3365-4a89-9369-620ab7a1ff26'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    1754.4243000000,
    '2025-11-30'::date,
    'spreadsheet-yield-USDT-2025-11-Anne_Cecile_Noique',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Babak Eftekhari USDT: prev=239034.1923000000, flows=0.0000000000, yield=1628.4656000000, end=240662.6579000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'cdcccf6e-32f9-475a-9f88-34272ca3e64b'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    1628.4656000000,
    '2025-11-30'::date,
    'spreadsheet-yield-USDT-2025-11-Babak_Eftekhari',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Bo De Kriek USDT: prev=282056.7311000000, flows=0.0000000000, yield=2162.5194000000, end=284219.2505000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '98dd4ff5-b5cb-4257-a501-aa25a6d638c5'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    2162.5194000000,
    '2025-11-30'::date,
    'spreadsheet-yield-USDT-2025-11-Bo_De_Kriek',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Daniele Francilia USDT: prev=113083.5213000000, flows=0.0000000000, yield=867.0075000000, end=113950.5288000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'd1f39136-4d87-4e7f-8885-a413c21d9a56'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    867.0075000000,
    '2025-11-30'::date,
    'spreadsheet-yield-USDT-2025-11-Daniele_Francilia',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Dario Deiana USDT: prev=204754.7695000000, flows=0.0000000000, yield=1394.9306000000, end=206149.7001000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'bb655a37-9e91-4166-b575-cafbbbb8c200'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    1394.9306000000,
    '2025-11-30'::date,
    'spreadsheet-yield-USDT-2025-11-Dario_Deiana',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- HALLEY86 USDT: prev=100328.7759000000, flows=0.0000000000, yield=683.5087000000, end=101012.2846000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '32d75475-0b78-4b7b-925a-e9429f6fe66d'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    683.5087000000,
    '2025-11-30'::date,
    'spreadsheet-yield-USDT-2025-11-HALLEY86',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Indigo Fees USDT: prev=7564.5615300000, flows=0.0000000000, yield=3652.8926100000, end=11217.4541400000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'b464a3f7-60d5-4bc0-9833-7b413bcc6cae'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    3652.8926100000,
    '2025-11-30'::date,
    'spreadsheet-yield-USDT-2025-11-Indigo_Fees',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- INDIGO Ventures USDT: prev=5026.8628950000, flows=0.0000000000, yield=42.8381280000, end=5069.7010230000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '3d606d2e-28cf-41e7-96f2-aeb52551c053'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    42.8381280000,
    '2025-11-30'::date,
    'spreadsheet-yield-USDT-2025-11-INDIGO_Ventures',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Joel Barbeau USDT: prev=0.0000000000, flows=0.0000000000, yield=7.7966676550, end=7.7966676550
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '99e56523-32a6-43e5-b9b3-789992cc347c'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    7.7966676550,
    '2025-11-30'::date,
    'spreadsheet-yield-USDT-2025-11-Joel_Barbeau',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Jose Molla USDT: prev=97921.7024800000, flows=-97908.0000000000, yield=312.5355211000, end=326.2380011000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '172d6461-f6cb-4457-a8c3-75c978cc12be'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    312.5355211000,
    '2025-11-30'::date,
    'spreadsheet-yield-USDT-2025-11-Jose_Molla',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Julien Grunebaum USDT: prev=112687.9515000000, flows=0.0000000000, yield=863.9747000000, end=113551.9262000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '7fdedf56-e838-45ea-91f8-6e441810c761'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    863.9747000000,
    '2025-11-30'::date,
    'spreadsheet-yield-USDT-2025-11-Julien_Grunebaum',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Lars Ahlgreen USDT: prev=137.9440690000, flows=0.0000000000, yield=41.7657214000, end=179.7097904000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '9405071c-0b52-4399-85da-9f1ba9b289c1'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    41.7657214000,
    '2025-11-30'::date,
    'spreadsheet-yield-USDT-2025-11-Lars_Ahlgreen',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Matthew Beatty USDT: prev=289658.0150000000, flows=53300.0000000000, yield=2506.9181000000, end=345464.9331000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '24f3054e-a125-4954-8861-55aa617cbb2c'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    2506.9181000000,
    '2025-11-30'::date,
    'spreadsheet-yield-USDT-2025-11-Matthew_Beatty',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Monica Levy Chicheportiche USDT: prev=0.0000000000, flows=840168.0300000000, yield=4455.1505999999, end=844623.1806000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'c85bddf5-7720-47a5-8336-669ea604b94b'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    4455.1505999999,
    '2025-11-30'::date,
    'spreadsheet-yield-USDT-2025-11-Monica_Levy_Chicheportiche',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Nath & Thomas USDT: prev=0.0000000000, flows=211978.7700000000, yield=1280.4454000000, end=213259.2154000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '99e5a116-44ba-4a45-9f56-5877b235f960'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    1280.4454000000,
    '2025-11-30'::date,
    'spreadsheet-yield-USDT-2025-11-Nath___Thomas',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Pierre Bezencon USDT: prev=112627.1738000000, flows=0.0000000000, yield=863.5087000000, end=113490.6825000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '511991c7-93a2-4d2b-b42a-43120d58f672'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    863.5087000000,
    '2025-11-30'::date,
    'spreadsheet-yield-USDT-2025-11-Pierre_Bezencon',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Sacha Oshry USDT: prev=100714.8172000000, flows=0.0000000000, yield=729.1504000000, end=101443.9676000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'd5719d57-5308-4b9d-8a4f-a9a8aa596af4'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    729.1504000000,
    '2025-11-30'::date,
    'spreadsheet-yield-USDT-2025-11-Sacha_Oshry',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Terance Chen USDT: prev=225807.9236000000, flows=0.0000000000, yield=1731.2616000000, end=227539.1852000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '3705c2cd-49d2-4e3b-ac09-7c1f98ebb93c'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    1731.2616000000,
    '2025-11-30'::date,
    'spreadsheet-yield-USDT-2025-11-Terance_Chen',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Valeria Cruz USDT: prev=0.0000000000, flows=50000.0000000000, yield=86.5504100000, end=50086.5504100000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'e9bbc28b-5d8d-410c-940b-b37a54a726e0'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    86.5504100000,
    '2025-11-30'::date,
    'spreadsheet-yield-USDT-2025-11-Valeria_Cruz',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Ventures Life Style USDT: prev=0.0000000000, flows=100000.0000000000, yield=155.9334000000, end=100155.9334000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '7d049f7f-b77f-4650-b772-6a8806f00103'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    155.9334000000,
    '2025-11-30'::date,
    'spreadsheet-yield-USDT-2025-11-Ventures_Life_Style',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Indigo Fees XRP: prev=0.0000000000, flows=0.0000000000, yield=56.8000000000, end=56.8000000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'b464a3f7-60d5-4bc0-9833-7b413bcc6cae'::uuid,
    '2c123c4f-76b4-4504-867e-059649855417'::uuid,
    'YIELD'::tx_type,
    56.8000000000,
    '2025-11-30'::date,
    'spreadsheet-yield-XRP-2025-11-Indigo_Fees',
    'yield_distribution'::tx_source,
    'XRP'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Ryan Van Der Wall XRP: prev=0.0000000000, flows=0.0000000000, yield=14.2000000000, end=14.2000000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'f462d9e5-7363-4c82-a144-4e694d2b55da'::uuid,
    '2c123c4f-76b4-4504-867e-059649855417'::uuid,
    'YIELD'::tx_type,
    14.2000000000,
    '2025-11-30'::date,
    'spreadsheet-yield-XRP-2025-11-Ryan_Van_Der_Wall',
    'yield_distribution'::tx_source,
    'XRP'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Sam Johnson XRP: prev=0.0000000000, flows=229003.0000000000, yield=284.0000000000, end=229287.0000000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '2f7b8bb2-6a60-4fc9-953d-b9fae44337c1'::uuid,
    '2c123c4f-76b4-4504-867e-059649855417'::uuid,
    'YIELD'::tx_type,
    284.0000000000,
    '2025-11-30'::date,
    'spreadsheet-yield-XRP-2025-11-Sam_Johnson',
    'yield_distribution'::tx_source,
    'XRP'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  RAISE NOTICE 'Month 2025-11: inserted 57 yield transactions';
END;
$$;

-- ================================================
-- Month: 2025-12 (58 yield entries)
-- ================================================
DO $$
DECLARE
  v_tx_id uuid;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', 'a16a7e50-fefd-4bfe-897c-d16279b457c2', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"a16a7e50-fefd-4bfe-897c-d16279b457c2","role":"authenticated"}', true);
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Alex Jacobs BTC: prev=0.0000223538, flows=0.0000000000, yield=0.0000000503, end=0.0000224040
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'd681a28c-bb59-4bb7-bf34-ab23910596df'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0000000503,
    '2025-12-31'::date,
    'spreadsheet-yield-BTC-2025-12-Alex_Jacobs',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Blondish BTC: prev=4.1598057460, flows=0.0000000000, yield=0.0116960060, end=4.1715017520
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '529cac24-615c-4408-b683-2c4ab635d6fd'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0116960060,
    '2025-12-31'::date,
    'spreadsheet-yield-BTC-2025-12-Blondish',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Danielle Richetta BTC: prev=4.3898165280, flows=0.0000000000, yield=0.0111074370, end=4.4009239650
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'e134e0df-d4e7-49c4-80b3-4ef37af6bebf'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0111074370,
    '2025-12-31'::date,
    'spreadsheet-yield-BTC-2025-12-Danielle_Richetta',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Indigo Fees BTC: prev=0.1703047819, flows=0.0000000000, yield=0.0111540872, end=0.1814588691
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'b464a3f7-60d5-4bc0-9833-7b413bcc6cae'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0111540872,
    '2025-12-31'::date,
    'spreadsheet-yield-BTC-2025-12-Indigo_Fees',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Jose Molla BTC: prev=4.8293507650, flows=0.0000000000, yield=0.0115401880, end=4.8408909530
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '172d6461-f6cb-4457-a8c3-75c978cc12be'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0115401880,
    '2025-12-31'::date,
    'spreadsheet-yield-BTC-2025-12-Jose_Molla',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Kabbaj BTC: prev=4.5584343250, flows=0.0000000000, yield=0.0102515860, end=4.5686859110
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'f917cd8b-2d12-428c-ae3c-210b7ee3ae75'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0102515860,
    '2025-12-31'::date,
    'spreadsheet-yield-BTC-2025-12-Kabbaj',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Matthias Reiser BTC: prev=4.9769302460, flows=-4.9895000000, yield=0.0125697540, end=0.0000000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'd8643c68-7045-458a-b105-a41f56085c55'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0125697540,
    '2025-12-31'::date,
    'spreadsheet-yield-BTC-2025-12-Matthias_Reiser',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Nath & Thomas BTC: prev=1.0000000000, flows=0.0000000000, yield=0.0028116710, end=1.0028116710
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '99e5a116-44ba-4a45-9f56-5877b235f960'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0028116710,
    '2025-12-31'::date,
    'spreadsheet-yield-BTC-2025-12-Nath___Thomas',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Nathanaël Cohen BTC: prev=0.4525498494, flows=0.0000000000, yield=0.0012724214, end=0.4538222708
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'ed91c89d-23de-4981-b6b7-60e13f1a6767'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0012724214,
    '2025-12-31'::date,
    'spreadsheet-yield-BTC-2025-12-Nathana_l_Cohen',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Oliver Loisel BTC: prev=2.1427839180, flows=0.0000000000, yield=0.0054218290, end=2.1482057470
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'fbf8e2f4-7c5d-4496-a486-f0d8e88cc794'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0054218290,
    '2025-12-31'::date,
    'spreadsheet-yield-BTC-2025-12-Oliver_Loisel',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Ryan Van Der Wall BTC: prev=0.0000559228, flows=0.0000000000, yield=0.0007023815, end=0.0007583043
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'f462d9e5-7363-4c82-a144-4e694d2b55da'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0007023815,
    '2025-12-31'::date,
    'spreadsheet-yield-BTC-2025-12-Ryan_Van_Der_Wall',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Sam Johnson BTC: prev=5.5011184570, flows=2.2700000000, yield=0.0140356400, end=7.7851540970
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '2f7b8bb2-6a60-4fc9-953d-b9fae44337c1'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0140356400,
    '2025-12-31'::date,
    'spreadsheet-yield-BTC-2025-12-Sam_Johnson',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Thomas Puech BTC: prev=6.7882477410, flows=0.6570000000, yield=0.0194229580, end=7.4646706990
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '44801beb-4476-4a9b-9751-4e70267f6953'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0194229580,
    '2025-12-31'::date,
    'spreadsheet-yield-BTC-2025-12-Thomas_Puech',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Victoria Pariente-Cohen BTC: prev=0.1505793669, flows=0.0000000000, yield=0.0004233797, end=0.1510027466
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '249f4ab3-3433-4d81-ac92-1531b3573a50'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0004233797,
    '2025-12-31'::date,
    'spreadsheet-yield-BTC-2025-12-Victoria_Pariente_Cohen',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Vivie & Liana BTC: prev=3.4110000000, flows=0.0000000000, yield=0.0095906100, end=3.4205906100
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '981dd85c-35c8-4254-a3e9-27c2af302815'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0095906100,
    '2025-12-31'::date,
    'spreadsheet-yield-BTC-2025-12-Vivie___Liana',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Advantage Blockchain ETH: prev=32.7494757200, flows=0.0000000000, yield=0.0718934000, end=32.8213691200
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '3a9a5615-d4dd-4b7f-ae20-3d48a7de3dcc'::uuid,
    '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid,
    'YIELD'::tx_type,
    0.0718934000,
    '2025-12-31'::date,
    'spreadsheet-yield-ETH-2025-12-Advantage_Blockchain',
    'yield_distribution'::tx_source,
    'ETH'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Alec Beckman ETH: prev=0.0189266920, flows=0.0000000000, yield=0.0018402805, end=0.0207669725
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '5fc170e2-7a07-4f32-991f-d8b6deec277c'::uuid,
    '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid,
    'YIELD'::tx_type,
    0.0018402805,
    '2025-12-31'::date,
    'spreadsheet-yield-ETH-2025-12-Alec_Beckman',
    'yield_distribution'::tx_source,
    'ETH'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Alex Jacobs ETH: prev=0.0033483890, flows=0.0000000000, yield=0.0000073506, end=0.0033557396
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'd681a28c-bb59-4bb7-bf34-ab23910596df'::uuid,
    '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid,
    'YIELD'::tx_type,
    0.0000073506,
    '2025-12-31'::date,
    'spreadsheet-yield-ETH-2025-12-Alex_Jacobs',
    'yield_distribution'::tx_source,
    'ETH'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Babak Eftekhari ETH: prev=68.4566417100, flows=0.0000000000, yield=0.1502796900, end=68.6069214000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'cdcccf6e-32f9-475a-9f88-34272ca3e64b'::uuid,
    '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid,
    'YIELD'::tx_type,
    0.1502796900,
    '2025-12-31'::date,
    'spreadsheet-yield-ETH-2025-12-Babak_Eftekhari',
    'yield_distribution'::tx_source,
    'ETH'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Blondish ETH: prev=128.6925042000, flows=0.0000000000, yield=0.3532095000, end=129.0457137000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '529cac24-615c-4408-b683-2c4ab635d6fd'::uuid,
    '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid,
    'YIELD'::tx_type,
    0.3532095000,
    '2025-12-31'::date,
    'spreadsheet-yield-ETH-2025-12-Blondish',
    'yield_distribution'::tx_source,
    'ETH'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Brandon Hood ETH: prev=0.0000000000, flows=31.3700000000, yield=0.0461265900, end=31.4161265900
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'a00073d1-f37d-4e21-a54b-1b55df17e85a'::uuid,
    '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid,
    'YIELD'::tx_type,
    0.0461265900,
    '2025-12-31'::date,
    'spreadsheet-yield-ETH-2025-12-Brandon_Hood',
    'yield_distribution'::tx_source,
    'ETH'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Indigo Fees ETH: prev=2.5014966750, flows=0.0000000000, yield=0.2714650290, end=2.7729617040
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'b464a3f7-60d5-4bc0-9833-7b413bcc6cae'::uuid,
    '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid,
    'YIELD'::tx_type,
    0.2714650290,
    '2025-12-31'::date,
    'spreadsheet-yield-ETH-2025-12-Indigo_Fees',
    'yield_distribution'::tx_source,
    'ETH'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Jose Molla ETH: prev=68.1643175700, flows=0.0000000000, yield=0.1589980500, end=68.3233156200
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '172d6461-f6cb-4457-a8c3-75c978cc12be'::uuid,
    '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid,
    'YIELD'::tx_type,
    0.1589980500,
    '2025-12-31'::date,
    'spreadsheet-yield-ETH-2025-12-Jose_Molla',
    'yield_distribution'::tx_source,
    'ETH'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Lars Ahlgreen ETH: prev=0.0369299073, flows=0.0000000000, yield=0.0038409819, end=0.0407708892
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '9405071c-0b52-4399-85da-9f1ba9b289c1'::uuid,
    '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid,
    'YIELD'::tx_type,
    0.0038409819,
    '2025-12-31'::date,
    'spreadsheet-yield-ETH-2025-12-Lars_Ahlgreen',
    'yield_distribution'::tx_source,
    'ETH'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Nathanaël Cohen ETH: prev=37.3442497200, flows=0.0000000000, yield=0.1024950200, end=37.4467447400
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'ed91c89d-23de-4981-b6b7-60e13f1a6767'::uuid,
    '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid,
    'YIELD'::tx_type,
    0.1024950200,
    '2025-12-31'::date,
    'spreadsheet-yield-ETH-2025-12-Nathana_l_Cohen',
    'yield_distribution'::tx_source,
    'ETH'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Ryan Van Der Wall ETH: prev=0.0133382057, flows=0.0000000000, yield=0.0176159667, end=0.0309541724
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'f462d9e5-7363-4c82-a144-4e694d2b55da'::uuid,
    '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid,
    'YIELD'::tx_type,
    0.0176159667,
    '2025-12-31'::date,
    'spreadsheet-yield-ETH-2025-12-Ryan_Van_Der_Wall',
    'yield_distribution'::tx_source,
    'ETH'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Sam Johnson ETH: prev=146.2666340000, flows=66.5000000000, yield=0.3514843000, end=213.1181183000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '2f7b8bb2-6a60-4fc9-953d-b9fae44337c1'::uuid,
    '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid,
    'YIELD'::tx_type,
    0.3514843000,
    '2025-12-31'::date,
    'spreadsheet-yield-ETH-2025-12-Sam_Johnson',
    'yield_distribution'::tx_source,
    'ETH'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Tomer Zur ETH: prev=182.9521371000, flows=9.1430000000, yield=0.4177440000, end=192.5128811000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '82f58ac0-2d34-4c00-b0df-34383c1d1dfd'::uuid,
    '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid,
    'YIELD'::tx_type,
    0.4177440000,
    '2025-12-31'::date,
    'spreadsheet-yield-ETH-2025-12-Tomer_Zur',
    'yield_distribution'::tx_source,
    'ETH'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Alex Jacobs SOL: prev=0.0331418747, flows=0.0000000000, yield=0.0000772563, end=0.0332191310
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'd681a28c-bb59-4bb7-bf34-ab23910596df'::uuid,
    '7574bc81-aab3-4175-9e7f-803aa6f9eb8f'::uuid,
    'YIELD'::tx_type,
    0.0000772563,
    '2025-12-31'::date,
    'spreadsheet-yield-SOL-2025-12-Alex_Jacobs',
    'yield_distribution'::tx_source,
    'SOL'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- INDIGO DIGITAL ASSET FUND LP SOL: prev=0.0000000000, flows=-1285.6600000000, yield=0.0048200000, end=0.0000000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'd91f3eb7-bd47-4c42-ab4f-c4f20fb41b13'::uuid,
    '7574bc81-aab3-4175-9e7f-803aa6f9eb8f'::uuid,
    'YIELD'::tx_type,
    0.0048200000,
    '2025-12-31'::date,
    'spreadsheet-yield-SOL-2025-12-INDIGO_DIGITAL_ASSET_FUND_LP',
    'yield_distribution'::tx_source,
    'SOL'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Indigo Fees SOL: prev=1.8917027400, flows=0.0000000000, yield=3.4095849760, end=5.3012877160
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'b464a3f7-60d5-4bc0-9833-7b413bcc6cae'::uuid,
    '7574bc81-aab3-4175-9e7f-803aa6f9eb8f'::uuid,
    'YIELD'::tx_type,
    3.4095849760,
    '2025-12-31'::date,
    'spreadsheet-yield-SOL-2025-12-Indigo_Fees',
    'yield_distribution'::tx_source,
    'SOL'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Jose Molla SOL: prev=88.6834400800, flows=0.0000000000, yield=0.2196573900, end=88.9030974700
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '172d6461-f6cb-4457-a8c3-75c978cc12be'::uuid,
    '7574bc81-aab3-4175-9e7f-803aa6f9eb8f'::uuid,
    'YIELD'::tx_type,
    0.2196573900,
    '2025-12-31'::date,
    'spreadsheet-yield-SOL-2025-12-Jose_Molla',
    'yield_distribution'::tx_source,
    'SOL'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Ryan Van Der Wall SOL: prev=0.3662706324, flows=0.0000000000, yield=0.4308547635, end=0.7971253959
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'f462d9e5-7363-4c82-a144-4e694d2b55da'::uuid,
    '7574bc81-aab3-4175-9e7f-803aa6f9eb8f'::uuid,
    'YIELD'::tx_type,
    0.4308547635,
    '2025-12-31'::date,
    'spreadsheet-yield-SOL-2025-12-Ryan_Van_Der_Wall',
    'yield_distribution'::tx_source,
    'SOL'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Sam Johnson SOL: prev=3307.3702640000, flows=1536.0000000000, yield=8.5950060000, end=4851.9652700000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '2f7b8bb2-6a60-4fc9-953d-b9fae44337c1'::uuid,
    '7574bc81-aab3-4175-9e7f-803aa6f9eb8f'::uuid,
    'YIELD'::tx_type,
    8.5950060000,
    '2025-12-31'::date,
    'spreadsheet-yield-SOL-2025-12-Sam_Johnson',
    'yield_distribution'::tx_source,
    'SOL'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Alain Bensimon USDT: prev=141585.6670000000, flows=0.0000000000, yield=144.8296000000, end=141730.4966000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '20396ec2-c919-46ef-b3a3-8005a8a34bd3'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    144.8296000000,
    '2025-12-31'::date,
    'spreadsheet-yield-USDT-2025-12-Alain_Bensimon',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Anne Cecile Noique USDT: prev=230583.4371000000, flows=0.0000000000, yield=235.8664000000, end=230819.3035000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '64cb831a-3365-4a89-9369-620ab7a1ff26'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    235.8664000000,
    '2025-12-31'::date,
    'spreadsheet-yield-USDT-2025-12-Anne_Cecile_Noique',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Babak Eftekhari USDT: prev=240662.6579000000, flows=0.0000000000, yield=218.8237000000, end=240881.4816000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'cdcccf6e-32f9-475a-9f88-34272ca3e64b'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    218.8237000000,
    '2025-12-31'::date,
    'spreadsheet-yield-USDT-2025-12-Babak_Eftekhari',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Bo De Kriek USDT: prev=284219.2505000000, flows=0.0000000000, yield=290.7311000000, end=284509.9816000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '98dd4ff5-b5cb-4257-a501-aa25a6d638c5'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    290.7311000000,
    '2025-12-31'::date,
    'spreadsheet-yield-USDT-2025-12-Bo_De_Kriek',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Daniele Francilia USDT: prev=113950.5288000000, flows=0.0000000000, yield=116.5613000000, end=114067.0901000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'd1f39136-4d87-4e7f-8885-a413c21d9a56'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    116.5613000000,
    '2025-12-31'::date,
    'spreadsheet-yield-USDT-2025-12-Daniele_Francilia',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Dario Deiana USDT: prev=206149.7001000000, flows=0.0000000000, yield=187.4426000000, end=206337.1427000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'bb655a37-9e91-4166-b575-cafbbbb8c200'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    187.4426000000,
    '2025-12-31'::date,
    'spreadsheet-yield-USDT-2025-12-Dario_Deiana',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- HALLEY86 USDT: prev=101012.2846000000, flows=0.0000000000, yield=91.8459000000, end=101104.1305000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '32d75475-0b78-4b7b-925a-e9429f6fe66d'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    91.8459000000,
    '2025-12-31'::date,
    'spreadsheet-yield-USDT-2025-12-HALLEY86',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Indigo Fees USDT: prev=11217.4541400000, flows=0.0000000000, yield=549.2770100000, end=11766.7311500000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'b464a3f7-60d5-4bc0-9833-7b413bcc6cae'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    549.2770100000,
    '2025-12-31'::date,
    'spreadsheet-yield-USDT-2025-12-Indigo_Fees',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- INDIGO Ventures USDT: prev=5069.7010230000, flows=0.0000000000, yield=5.7620610000, end=5075.4630840000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '3d606d2e-28cf-41e7-96f2-aeb52551c053'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    5.7620610000,
    '2025-12-31'::date,
    'spreadsheet-yield-USDT-2025-12-INDIGO_Ventures',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Joel Barbeau USDT: prev=7.7966676550, flows=0.0000000000, yield=4.5604510050, end=12.3571186600
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '99e56523-32a6-43e5-b9b3-789992cc347c'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    4.5604510050,
    '2025-12-31'::date,
    'spreadsheet-yield-USDT-2025-12-Joel_Barbeau',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Jose Molla USDT: prev=326.2380011000, flows=0.0000000000, yield=0.3151730000, end=326.5531741000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '172d6461-f6cb-4457-a8c3-75c978cc12be'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    0.3151730000,
    '2025-12-31'::date,
    'spreadsheet-yield-USDT-2025-12-Jose_Molla',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Julien Grunebaum USDT: prev=113551.9262000000, flows=0.0000000000, yield=116.1535000000, end=113668.0797000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '7fdedf56-e838-45ea-91f8-6e441810c761'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    116.1535000000,
    '2025-12-31'::date,
    'spreadsheet-yield-USDT-2025-12-Julien_Grunebaum',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Lars Ahlgreen USDT: prev=179.7097904000, flows=0.0000000000, yield=5.6339923000, end=185.3437827000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '9405071c-0b52-4399-85da-9f1ba9b289c1'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    5.6339923000,
    '2025-12-31'::date,
    'spreadsheet-yield-USDT-2025-12-Lars_Ahlgreen',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Matthew Beatty USDT: prev=345464.9331000000, flows=0.0000000000, yield=353.3800000000, end=345818.3131000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '24f3054e-a125-4954-8861-55aa617cbb2c'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    353.3800000000,
    '2025-12-31'::date,
    'spreadsheet-yield-USDT-2025-12-Matthew_Beatty',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Monica Levy Chicheportiche USDT: prev=844623.1806000000, flows=0.0000000000, yield=767.9774000001, end=845391.1580000001
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'c85bddf5-7720-47a5-8336-669ea604b94b'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    767.9774000001,
    '2025-12-31'::date,
    'spreadsheet-yield-USDT-2025-12-Monica_Levy_Chicheportiche',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Nath & Thomas USDT: prev=0.0000000000, flows=-213501.6000000000, yield=242.3846000000, end=0.0000000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '99e5a116-44ba-4a45-9f56-5877b235f960'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    242.3846000000,
    '2025-12-31'::date,
    'spreadsheet-yield-USDT-2025-12-Nath___Thomas',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Pierre Bezencon USDT: prev=113490.6825000000, flows=0.0000000000, yield=116.0909000000, end=113606.7734000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '511991c7-93a2-4d2b-b42a-43120d58f672'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    116.0909000000,
    '2025-12-31'::date,
    'spreadsheet-yield-USDT-2025-12-Pierre_Bezencon',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Sacha Oshry USDT: prev=101443.9676000000, flows=0.0000000000, yield=98.0033000000, end=101541.9709000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'd5719d57-5308-4b9d-8a4f-a9a8aa596af4'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    98.0033000000,
    '2025-12-31'::date,
    'spreadsheet-yield-USDT-2025-12-Sacha_Oshry',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Terance Chen USDT: prev=227539.1852000000, flows=0.0000000000, yield=232.7525000000, end=227771.9377000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '3705c2cd-49d2-4e3b-ac09-7c1f98ebb93c'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    232.7525000000,
    '2025-12-31'::date,
    'spreadsheet-yield-USDT-2025-12-Terance_Chen',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Valeria Cruz USDT: prev=50086.5504100000, flows=0.0000000000, yield=45.5414300000, end=50132.0918400000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'e9bbc28b-5d8d-410c-940b-b37a54a726e0'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    45.5414300000,
    '2025-12-31'::date,
    'spreadsheet-yield-USDT-2025-12-Valeria_Cruz',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Ventures Life Style USDT: prev=100155.9334000000, flows=0.0000000000, yield=91.0672000000, end=100247.0006000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '7d049f7f-b77f-4650-b772-6a8806f00103'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    91.0672000000,
    '2025-12-31'::date,
    'spreadsheet-yield-USDT-2025-12-Ventures_Life_Style',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Indigo Fees XRP: prev=56.8000000000, flows=0.0000000000, yield=138.0116650000, end=194.8116650000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'b464a3f7-60d5-4bc0-9833-7b413bcc6cae'::uuid,
    '2c123c4f-76b4-4504-867e-059649855417'::uuid,
    'YIELD'::tx_type,
    138.0116650000,
    '2025-12-31'::date,
    'spreadsheet-yield-XRP-2025-12-Indigo_Fees',
    'yield_distribution'::tx_source,
    'XRP'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Ryan Van Der Wall XRP: prev=14.2000000000, flows=0.0000000000, yield=34.4844038700, end=48.6844038700
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'f462d9e5-7363-4c82-a144-4e694d2b55da'::uuid,
    '2c123c4f-76b4-4504-867e-059649855417'::uuid,
    'YIELD'::tx_type,
    34.4844038700,
    '2025-12-31'::date,
    'spreadsheet-yield-XRP-2025-12-Ryan_Van_Der_Wall',
    'yield_distribution'::tx_source,
    'XRP'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Sam Johnson XRP: prev=229287.0000000000, flows=99600.0000000000, yield=688.5039000000, end=329575.5039000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '2f7b8bb2-6a60-4fc9-953d-b9fae44337c1'::uuid,
    '2c123c4f-76b4-4504-867e-059649855417'::uuid,
    'YIELD'::tx_type,
    688.5039000000,
    '2025-12-31'::date,
    'spreadsheet-yield-XRP-2025-12-Sam_Johnson',
    'yield_distribution'::tx_source,
    'XRP'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  RAISE NOTICE 'Month 2025-12: inserted 58 yield transactions';
END;
$$;

-- ================================================
-- Month: 2026-01 (59 yield entries)
-- ================================================
DO $$
DECLARE
  v_tx_id uuid;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', 'a16a7e50-fefd-4bfe-897c-d16279b457c2', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"a16a7e50-fefd-4bfe-897c-d16279b457c2","role":"authenticated"}', true);
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Alex Jacobs BTC: prev=0.0000224040, flows=0.0000000000, yield=0.0000000470, end=0.0000224511
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'd681a28c-bb59-4bb7-bf34-ab23910596df'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0000000470,
    '2026-01-31'::date,
    'spreadsheet-yield-BTC-2026-01-Alex_Jacobs',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Blondish BTC: prev=4.1715017520, flows=0.0000000000, yield=0.0109511510, end=4.1824529030
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '529cac24-615c-4408-b683-2c4ab635d6fd'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0109511510,
    '2026-01-31'::date,
    'spreadsheet-yield-BTC-2026-01-Blondish',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Danielle Richetta BTC: prev=4.4009239650, flows=-0.1200000000, yield=0.0103968020, end=4.2913207670
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'e134e0df-d4e7-49c4-80b3-4ef37af6bebf'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0103968020,
    '2026-01-31'::date,
    'spreadsheet-yield-BTC-2026-01-Danielle_Richetta',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Indigo Fees BTC: prev=0.1814588691, flows=0.0000000000, yield=0.0172994523, end=0.1987583214
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'b464a3f7-60d5-4bc0-9833-7b413bcc6cae'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0172994523,
    '2026-01-31'::date,
    'spreadsheet-yield-BTC-2026-01-Indigo_Fees',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Jose Molla BTC: prev=4.8408909530, flows=0.0000000000, yield=0.0108011000, end=4.8516920530
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '172d6461-f6cb-4457-a8c3-75c978cc12be'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0108011000,
    '2026-01-31'::date,
    'spreadsheet-yield-BTC-2026-01-Jose_Molla',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Kabbaj BTC: prev=4.5686859110, flows=2.1577000000, yield=0.0133499220, end=6.7397358330
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'f917cd8b-2d12-428c-ae3c-210b7ee3ae75'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0133499220,
    '2026-01-31'::date,
    'spreadsheet-yield-BTC-2026-01-Kabbaj',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Nath & Thomas BTC: prev=1.0028116710, flows=0.0000000000, yield=0.0026326110, end=1.0054442820
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '99e5a116-44ba-4a45-9f56-5877b235f960'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0026326110,
    '2026-01-31'::date,
    'spreadsheet-yield-BTC-2026-01-Nath___Thomas',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Nathanaël Cohen BTC: prev=0.4538222708, flows=0.0000000000, yield=0.0011913878, end=0.4550136586
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'ed91c89d-23de-4981-b6b7-60e13f1a6767'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0011913878,
    '2026-01-31'::date,
    'spreadsheet-yield-BTC-2026-01-Nathana_l_Cohen',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- NSVO Holdings BTC: prev=0.0000000000, flows=0.6220000000, yield=0.0002246348, end=0.6222246348
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '114164b0-1aba-4b40-9abc-8d72adfdc60a'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0002246348,
    '2026-01-31'::date,
    'spreadsheet-yield-BTC-2026-01-NSVO_Holdings',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Oliver Loisel BTC: prev=2.1482057470, flows=0.0000000000, yield=0.0050752410, end=2.1532809880
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'fbf8e2f4-7c5d-4496-a486-f0d8e88cc794'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0050752410,
    '2026-01-31'::date,
    'spreadsheet-yield-BTC-2026-01-Oliver_Loisel',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Ryan Van Der Wall BTC: prev=0.0007583043, flows=0.0000000000, yield=0.0000015924, end=0.0007598967
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'f462d9e5-7363-4c82-a144-4e694d2b55da'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0000015924,
    '2026-01-31'::date,
    'spreadsheet-yield-BTC-2026-01-Ryan_Van_Der_Wall',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Sam Johnson BTC: prev=7.7851540970, flows=-7.7852000000, yield=0.0000459030, end=0.0000000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '2f7b8bb2-6a60-4fc9-953d-b9fae44337c1'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0000459030,
    '2026-01-31'::date,
    'spreadsheet-yield-BTC-2026-01-Sam_Johnson',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Thomas Puech BTC: prev=7.4646706990, flows=0.2556466000, yield=0.0196477490, end=7.7399650480
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '44801beb-4476-4a9b-9751-4e70267f6953'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0196477490,
    '2026-01-31'::date,
    'spreadsheet-yield-BTC-2026-01-Thomas_Puech',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Victoria Pariente-Cohen BTC: prev=0.1510027466, flows=0.0000000000, yield=0.0003964169, end=0.1513991635
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '249f4ab3-3433-4d81-ac92-1531b3573a50'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0003964169,
    '2026-01-31'::date,
    'spreadsheet-yield-BTC-2026-01-Victoria_Pariente_Cohen',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Vivie & Liana BTC: prev=3.4205906100, flows=-3.4221000000, yield=0.0015093900, end=0.0000000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '981dd85c-35c8-4254-a3e9-27c2af302815'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0015093900,
    '2026-01-31'::date,
    'spreadsheet-yield-BTC-2026-01-Vivie___Liana',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Advantage Blockchain ETH: prev=32.8213691200, flows=18.0000000000, yield=0.1612867300, end=50.9826558500
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '3a9a5615-d4dd-4b7f-ae20-3d48a7de3dcc'::uuid,
    '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid,
    'YIELD'::tx_type,
    0.1612867300,
    '2026-01-31'::date,
    'spreadsheet-yield-ETH-2026-01-Advantage_Blockchain',
    'yield_distribution'::tx_source,
    'ETH'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Alec Beckman ETH: prev=0.0207669725, flows=0.0000000000, yield=0.0041224889, end=0.0248894614
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '5fc170e2-7a07-4f32-991f-d8b6deec277c'::uuid,
    '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid,
    'YIELD'::tx_type,
    0.0041224889,
    '2026-01-31'::date,
    'spreadsheet-yield-ETH-2026-01-Alec_Beckman',
    'yield_distribution'::tx_source,
    'ETH'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Alex Jacobs ETH: prev=0.0033557396, flows=0.0000000000, yield=0.0000140477, end=0.0033697872
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'd681a28c-bb59-4bb7-bf34-ab23910596df'::uuid,
    '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid,
    'YIELD'::tx_type,
    0.0000140477,
    '2026-01-31'::date,
    'spreadsheet-yield-ETH-2026-01-Alex_Jacobs',
    'yield_distribution'::tx_source,
    'ETH'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Babak Eftekhari ETH: prev=68.6069214000, flows=0.0000000000, yield=0.2871995700, end=68.8941209700
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'cdcccf6e-32f9-475a-9f88-34272ca3e64b'::uuid,
    '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid,
    'YIELD'::tx_type,
    0.2871995700,
    '2026-01-31'::date,
    'spreadsheet-yield-ETH-2026-01-Babak_Eftekhari',
    'yield_distribution'::tx_source,
    'ETH'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Blondish ETH: prev=129.0457137000, flows=0.0000000000, yield=0.6754192000, end=129.7211329000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '529cac24-615c-4408-b683-2c4ab635d6fd'::uuid,
    '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid,
    'YIELD'::tx_type,
    0.6754192000,
    '2026-01-31'::date,
    'spreadsheet-yield-ETH-2026-01-Blondish',
    'yield_distribution'::tx_source,
    'ETH'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Brandon Hood ETH: prev=31.4161265900, flows=0.0000000000, yield=0.1315129400, end=31.5476395300
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'a00073d1-f37d-4e21-a54b-1b55df17e85a'::uuid,
    '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid,
    'YIELD'::tx_type,
    0.1315129400,
    '2026-01-31'::date,
    'spreadsheet-yield-ETH-2026-01-Brandon_Hood',
    'yield_distribution'::tx_source,
    'ETH'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Indigo Fees ETH: prev=2.7729617040, flows=0.0000000000, yield=0.5224554060, end=3.2954171100
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'b464a3f7-60d5-4bc0-9833-7b413bcc6cae'::uuid,
    '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid,
    'YIELD'::tx_type,
    0.5224554060,
    '2026-01-31'::date,
    'spreadsheet-yield-ETH-2026-01-Indigo_Fees',
    'yield_distribution'::tx_source,
    'ETH'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Jose Molla ETH: prev=68.3233156200, flows=0.0000000000, yield=0.3039063200, end=68.6272219400
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '172d6461-f6cb-4457-a8c3-75c978cc12be'::uuid,
    '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid,
    'YIELD'::tx_type,
    0.3039063200,
    '2026-01-31'::date,
    'spreadsheet-yield-ETH-2026-01-Jose_Molla',
    'yield_distribution'::tx_source,
    'ETH'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Lars Ahlgreen ETH: prev=0.0407708892, flows=0.0000000000, yield=0.0073575374, end=0.0481284266
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '9405071c-0b52-4399-85da-9f1ba9b289c1'::uuid,
    '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid,
    'YIELD'::tx_type,
    0.0073575374,
    '2026-01-31'::date,
    'spreadsheet-yield-ETH-2026-01-Lars_Ahlgreen',
    'yield_distribution'::tx_source,
    'ETH'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Nathanaël Cohen ETH: prev=37.4467447400, flows=11.8455600000, yield=0.2128008000, end=49.5051055400
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'ed91c89d-23de-4981-b6b7-60e13f1a6767'::uuid,
    '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid,
    'YIELD'::tx_type,
    0.2128008000,
    '2026-01-31'::date,
    'spreadsheet-yield-ETH-2026-01-Nathana_l_Cohen',
    'yield_distribution'::tx_source,
    'ETH'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Ryan Van Der Wall ETH: prev=0.0309541724, flows=0.0000000000, yield=0.0305934389, end=0.0615476114
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'f462d9e5-7363-4c82-a144-4e694d2b55da'::uuid,
    '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid,
    'YIELD'::tx_type,
    0.0305934389,
    '2026-01-31'::date,
    'spreadsheet-yield-ETH-2026-01-Ryan_Van_Der_Wall',
    'yield_distribution'::tx_source,
    'ETH'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Sam Johnson ETH: prev=213.1181183000, flows=-213.7300000000, yield=0.6118817000, end=0.0000000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '2f7b8bb2-6a60-4fc9-953d-b9fae44337c1'::uuid,
    '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid,
    'YIELD'::tx_type,
    0.6118817000,
    '2026-01-31'::date,
    'spreadsheet-yield-ETH-2026-01-Sam_Johnson',
    'yield_distribution'::tx_source,
    'ETH'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Tomer Zur ETH: prev=192.5128811000, flows=0.0000000000, yield=0.8058898000, end=193.3187709000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '82f58ac0-2d34-4c00-b0df-34383c1d1dfd'::uuid,
    '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid,
    'YIELD'::tx_type,
    0.8058898000,
    '2026-01-31'::date,
    'spreadsheet-yield-ETH-2026-01-Tomer_Zur',
    'yield_distribution'::tx_source,
    'ETH'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Alex Jacobs SOL: prev=0.0332191310, flows=0.0000000000, yield=0.0001450441, end=0.0333641751
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'd681a28c-bb59-4bb7-bf34-ab23910596df'::uuid,
    '7574bc81-aab3-4175-9e7f-803aa6f9eb8f'::uuid,
    'YIELD'::tx_type,
    0.0001450441,
    '2026-01-31'::date,
    'spreadsheet-yield-SOL-2026-01-Alex_Jacobs',
    'yield_distribution'::tx_source,
    'SOL'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Indigo Fees SOL: prev=5.3012877160, flows=0.0000000000, yield=4.3399551380, end=9.6412428540
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'b464a3f7-60d5-4bc0-9833-7b413bcc6cae'::uuid,
    '7574bc81-aab3-4175-9e7f-803aa6f9eb8f'::uuid,
    'YIELD'::tx_type,
    4.3399551380,
    '2026-01-31'::date,
    'spreadsheet-yield-SOL-2026-01-Indigo_Fees',
    'yield_distribution'::tx_source,
    'SOL'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Jose Molla SOL: prev=88.9030974700, flows=0.0000000000, yield=0.4124370600, end=89.3155345300
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '172d6461-f6cb-4457-a8c3-75c978cc12be'::uuid,
    '7574bc81-aab3-4175-9e7f-803aa6f9eb8f'::uuid,
    'YIELD'::tx_type,
    0.4124370600,
    '2026-01-31'::date,
    'spreadsheet-yield-SOL-2026-01-Jose_Molla',
    'yield_distribution'::tx_source,
    'SOL'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Ryan Van Der Wall SOL: prev=0.7971253959, flows=0.0000000000, yield=1.0627330501, end=1.8598584460
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'f462d9e5-7363-4c82-a144-4e694d2b55da'::uuid,
    '7574bc81-aab3-4175-9e7f-803aa6f9eb8f'::uuid,
    'YIELD'::tx_type,
    1.0627330501,
    '2026-01-31'::date,
    'spreadsheet-yield-SOL-2026-01-Ryan_Van_Der_Wall',
    'yield_distribution'::tx_source,
    'SOL'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Sam Johnson SOL: prev=4851.9652700000, flows=-4873.1500000000, yield=21.1847300000, end=0.0000000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '2f7b8bb2-6a60-4fc9-953d-b9fae44337c1'::uuid,
    '7574bc81-aab3-4175-9e7f-803aa6f9eb8f'::uuid,
    'YIELD'::tx_type,
    21.1847300000,
    '2026-01-31'::date,
    'spreadsheet-yield-SOL-2026-01-Sam_Johnson',
    'yield_distribution'::tx_source,
    'SOL'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Alain Bensimon USDT: prev=141730.4966000000, flows=0.0000000000, yield=1448.2461000000, end=143178.7427000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '20396ec2-c919-46ef-b3a3-8005a8a34bd3'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    1448.2461000000,
    '2026-01-31'::date,
    'spreadsheet-yield-USDT-2026-01-Alain_Bensimon',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Anne Cecile Noique USDT: prev=230819.3035000000, flows=0.0000000000, yield=2358.5830000000, end=233177.8865000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '64cb831a-3365-4a89-9369-620ab7a1ff26'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    2358.5830000000,
    '2026-01-31'::date,
    'spreadsheet-yield-USDT-2026-01-Anne_Cecile_Noique',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Babak Eftekhari USDT: prev=240881.4816000000, flows=0.0000000000, yield=2187.1419000000, end=243068.6235000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'cdcccf6e-32f9-475a-9f88-34272ca3e64b'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    2187.1419000000,
    '2026-01-31'::date,
    'spreadsheet-yield-USDT-2026-01-Babak_Eftekhari',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Bo De Kriek USDT: prev=284509.9816000000, flows=0.0000000000, yield=2907.2109000000, end=287417.1925000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '98dd4ff5-b5cb-4257-a501-aa25a6d638c5'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    2907.2109000000,
    '2026-01-31'::date,
    'spreadsheet-yield-USDT-2026-01-Bo_De_Kriek',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Daniele Francilia USDT: prev=114067.0901000000, flows=-114867.5900000000, yield=800.4999000000, end=0.0000000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'd1f39136-4d87-4e7f-8885-a413c21d9a56'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    800.4999000000,
    '2026-01-31'::date,
    'spreadsheet-yield-USDT-2026-01-Daniele_Francilia',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Dario Deiana USDT: prev=206337.1427000000, flows=0.0000000000, yield=1873.4882000000, end=208210.6309000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'bb655a37-9e91-4166-b575-cafbbbb8c200'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    1873.4882000000,
    '2026-01-31'::date,
    'spreadsheet-yield-USDT-2026-01-Dario_Deiana',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- HALLEY86 USDT: prev=101104.1305000000, flows=0.0000000000, yield=917.9995000000, end=102022.1300000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '32d75475-0b78-4b7b-925a-e9429f6fe66d'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    917.9995000000,
    '2026-01-31'::date,
    'spreadsheet-yield-USDT-2026-01-HALLEY86',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Indigo Fees USDT: prev=11766.7311500000, flows=0.0000000000, yield=6333.4070900000, end=18100.1382400000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'b464a3f7-60d5-4bc0-9833-7b413bcc6cae'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    6333.4070900000,
    '2026-01-31'::date,
    'spreadsheet-yield-USDT-2026-01-Indigo_Fees',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- INDIGO Ventures USDT: prev=5075.4630840000, flows=-5115.0400000000, yield=39.5769160000, end=0.0000000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '3d606d2e-28cf-41e7-96f2-aeb52551c053'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    39.5769160000,
    '2026-01-31'::date,
    'spreadsheet-yield-USDT-2026-01-INDIGO_Ventures',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Joel Barbeau USDT: prev=12.3571186600, flows=0.0000000000, yield=45.7512936400, end=58.1084123000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '99e56523-32a6-43e5-b9b3-789992cc347c'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    45.7512936400,
    '2026-01-31'::date,
    'spreadsheet-yield-USDT-2026-01-Joel_Barbeau',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Jose Molla USDT: prev=326.5531741000, flows=0.0000000000, yield=3.1508874000, end=329.7040615000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '172d6461-f6cb-4457-a8c3-75c978cc12be'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    3.1508874000,
    '2026-01-31'::date,
    'spreadsheet-yield-USDT-2026-01-Jose_Molla',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Julien Grunebaum USDT: prev=113668.0797000000, flows=0.0000000000, yield=1161.4956000000, end=114829.5753000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '7fdedf56-e838-45ea-91f8-6e441810c761'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    1161.4956000000,
    '2026-01-31'::date,
    'spreadsheet-yield-USDT-2026-01-Julien_Grunebaum',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Lars Ahlgreen USDT: prev=185.3437827000, flows=0.0000000000, yield=56.5155001000, end=241.8592828000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '9405071c-0b52-4399-85da-9f1ba9b289c1'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    56.5155001000,
    '2026-01-31'::date,
    'spreadsheet-yield-USDT-2026-01-Lars_Ahlgreen',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Matthew Beatty USDT: prev=345818.3131000000, flows=0.0000000000, yield=3533.6785000000, end=349351.9916000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '24f3054e-a125-4954-8861-55aa617cbb2c'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    3533.6785000000,
    '2026-01-31'::date,
    'spreadsheet-yield-USDT-2026-01-Matthew_Beatty',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Monica Levy Chicheportiche USDT: prev=845391.1580000001, flows=0.0000000000, yield=7675.9343999999, end=853067.0924000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'c85bddf5-7720-47a5-8336-669ea604b94b'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    7675.9343999999,
    '2026-01-31'::date,
    'spreadsheet-yield-USDT-2026-01-Monica_Levy_Chicheportiche',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Pierre Bezencon USDT: prev=113606.7734000000, flows=0.0000000000, yield=1160.8692000000, end=114767.6426000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '511991c7-93a2-4d2b-b42a-43120d58f672'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    1160.8692000000,
    '2026-01-31'::date,
    'spreadsheet-yield-USDT-2026-01-Pierre_Bezencon',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Ryan Van Der Wall USDT: prev=0.0000000000, flows=0.0000000000, yield=214.4648998000, end=214.4648998000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'f462d9e5-7363-4c82-a144-4e694d2b55da'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    214.4648998000,
    '2026-01-31'::date,
    'spreadsheet-yield-USDT-2026-01-Ryan_Van_Der_Wall',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Sacha Oshry USDT: prev=101541.9709000000, flows=0.0000000000, yield=979.7709000000, end=102521.7418000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'd5719d57-5308-4b9d-8a4f-a9a8aa596af4'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    979.7709000000,
    '2026-01-31'::date,
    'spreadsheet-yield-USDT-2026-01-Sacha_Oshry',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Sam Johnson USDT: prev=0.0000000000, flows=5200000.0000000000, yield=4288.8169999998, end=5204288.8169999998
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '2f7b8bb2-6a60-4fc9-953d-b9fae44337c1'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    4288.8169999998,
    '2026-01-31'::date,
    'spreadsheet-yield-USDT-2026-01-Sam_Johnson',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Terance Chen USDT: prev=227771.9377000000, flows=0.0000000000, yield=2327.4441000000, end=230099.3818000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '3705c2cd-49d2-4e3b-ac09-7c1f98ebb93c'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    2327.4441000000,
    '2026-01-31'::date,
    'spreadsheet-yield-USDT-2026-01-Terance_Chen',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Thomas Puech USDT: prev=46750.8000000000, flows=0.0000000000, yield=530.9804600000, end=47281.7804600000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '44801beb-4476-4a9b-9751-4e70267f6953'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    530.9804600000,
    '2026-01-31'::date,
    'spreadsheet-yield-USDT-2026-01-Thomas_Puech',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Valeria Cruz USDT: prev=50132.0918400000, flows=0.0000000000, yield=455.1865000000, end=50587.2783400000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'e9bbc28b-5d8d-410c-940b-b37a54a726e0'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    455.1865000000,
    '2026-01-31'::date,
    'spreadsheet-yield-USDT-2026-01-Valeria_Cruz',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Ventures Life Style USDT: prev=100247.0006000000, flows=0.0000000000, yield=910.2170000000, end=101157.2176000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '7d049f7f-b77f-4650-b772-6a8806f00103'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    910.2170000000,
    '2026-01-31'::date,
    'spreadsheet-yield-USDT-2026-01-Ventures_Life_Style',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Indigo Fees XRP: prev=194.8116650000, flows=0.0000000000, yield=438.8368843000, end=633.6485493000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'b464a3f7-60d5-4bc0-9833-7b413bcc6cae'::uuid,
    '2c123c4f-76b4-4504-867e-059649855417'::uuid,
    'YIELD'::tx_type,
    438.8368843000,
    '2026-01-31'::date,
    'spreadsheet-yield-XRP-2026-01-Indigo_Fees',
    'yield_distribution'::tx_source,
    'XRP'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Ryan Van Der Wall XRP: prev=48.6844038700, flows=0.0000000000, yield=109.6664601300, end=158.3508640000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'f462d9e5-7363-4c82-a144-4e694d2b55da'::uuid,
    '2c123c4f-76b4-4504-867e-059649855417'::uuid,
    'YIELD'::tx_type,
    109.6664601300,
    '2026-01-31'::date,
    'spreadsheet-yield-XRP-2026-01-Ryan_Van_Der_Wall',
    'yield_distribution'::tx_source,
    'XRP'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Sam Johnson XRP: prev=329575.5039000000, flows=-330500.4200000000, yield=924.9161000000, end=0.0000000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '2f7b8bb2-6a60-4fc9-953d-b9fae44337c1'::uuid,
    '2c123c4f-76b4-4504-867e-059649855417'::uuid,
    'YIELD'::tx_type,
    924.9161000000,
    '2026-01-31'::date,
    'spreadsheet-yield-XRP-2026-01-Sam_Johnson',
    'yield_distribution'::tx_source,
    'XRP'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  RAISE NOTICE 'Month 2026-01: inserted 59 yield transactions';
END;
$$;

-- ================================================
-- Month: 2026-02 (53 yield entries)
-- ================================================
DO $$
DECLARE
  v_tx_id uuid;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', 'a16a7e50-fefd-4bfe-897c-d16279b457c2', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"a16a7e50-fefd-4bfe-897c-d16279b457c2","role":"authenticated"}', true);
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Alex Jacobs BTC: prev=0.0000224511, flows=0.0000000000, yield=0.0000000403, end=0.0000224914
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'd681a28c-bb59-4bb7-bf34-ab23910596df'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0000000403,
    '2026-02-28'::date,
    'spreadsheet-yield-BTC-2026-02-Alex_Jacobs',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Blondish BTC: prev=4.1824529030, flows=0.0000000000, yield=0.0093848090, end=4.1918377120
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '529cac24-615c-4408-b683-2c4ab635d6fd'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0093848090,
    '2026-02-28'::date,
    'spreadsheet-yield-BTC-2026-02-Blondish',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Danielle Richetta BTC: prev=4.2913207670, flows=-4.3000000000, yield=4.3086659340, end=4.2999867010
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'e134e0df-d4e7-49c4-80b3-4ef37af6bebf'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    4.3086659340,
    '2026-02-28'::date,
    'spreadsheet-yield-BTC-2026-02-Danielle_Richetta',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Indigo Fees BTC: prev=0.1987583214, flows=0.0000000000, yield=0.0068203267, end=0.2055786481
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'b464a3f7-60d5-4bc0-9833-7b413bcc6cae'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0068203267,
    '2026-02-28'::date,
    'spreadsheet-yield-BTC-2026-02-Indigo_Fees',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Jose Molla BTC: prev=4.8516920530, flows=2.7660000000, yield=0.0092531120, end=7.6269451650
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '172d6461-f6cb-4457-a8c3-75c978cc12be'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0092531120,
    '2026-02-28'::date,
    'spreadsheet-yield-BTC-2026-02-Jose_Molla',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Kabbaj BTC: prev=6.7397358330, flows=0.0000000000, yield=0.0120976850, end=6.7518335180
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'f917cd8b-2d12-428c-ae3c-210b7ee3ae75'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0120976850,
    '2026-02-28'::date,
    'spreadsheet-yield-BTC-2026-02-Kabbaj',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Nath & Thomas BTC: prev=1.0054442820, flows=0.0000000000, yield=0.0022560690, end=1.0077003510
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '99e5a116-44ba-4a45-9f56-5877b235f960'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0022560690,
    '2026-02-28'::date,
    'spreadsheet-yield-BTC-2026-02-Nath___Thomas',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Nathanaël Cohen BTC: prev=0.4550136586, flows=0.0000000000, yield=0.0010209837, end=0.4560346423
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'ed91c89d-23de-4981-b6b7-60e13f1a6767'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0010209837,
    '2026-02-28'::date,
    'spreadsheet-yield-BTC-2026-02-Nathana_l_Cohen',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- NSVO Holdings BTC: prev=0.6222246348, flows=0.1773000000, yield=0.0011283990, end=0.8006530338
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '114164b0-1aba-4b40-9abc-8d72adfdc60a'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0011283990,
    '2026-02-28'::date,
    'spreadsheet-yield-BTC-2026-02-NSVO_Holdings',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Oliver Loisel BTC: prev=2.1532809880, flows=0.0000000000, yield=0.0043483570, end=2.1576293450
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'fbf8e2f4-7c5d-4496-a486-f0d8e88cc794'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0043483570,
    '2026-02-28'::date,
    'spreadsheet-yield-BTC-2026-02-Oliver_Loisel',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Ryan Van Der Wall BTC: prev=0.0007598967, flows=0.0000000000, yield=0.0000013640, end=0.0007612607
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'f462d9e5-7363-4c82-a144-4e694d2b55da'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0000013640,
    '2026-02-28'::date,
    'spreadsheet-yield-BTC-2026-02-Ryan_Van_Der_Wall',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Thomas Puech BTC: prev=7.7399650480, flows=1.2622200000, yield=0.0185799040, end=9.0207649520
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '44801beb-4476-4a9b-9751-4e70267f6953'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0185799040,
    '2026-02-28'::date,
    'spreadsheet-yield-BTC-2026-02-Thomas_Puech',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Victoria Pariente-Cohen BTC: prev=0.1513991635, flows=0.0000000000, yield=0.0003397175, end=0.1517388810
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '249f4ab3-3433-4d81-ac92-1531b3573a50'::uuid,
    '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
    'YIELD'::tx_type,
    0.0003397175,
    '2026-02-28'::date,
    'spreadsheet-yield-BTC-2026-02-Victoria_Pariente_Cohen',
    'yield_distribution'::tx_source,
    'BTC'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Advantage Blockchain ETH: prev=50.9826558500, flows=0.0000000000, yield=0.2048499700, end=51.1875058200
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '3a9a5615-d4dd-4b7f-ae20-3d48a7de3dcc'::uuid,
    '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid,
    'YIELD'::tx_type,
    0.2048499700,
    '2026-02-28'::date,
    'spreadsheet-yield-ETH-2026-02-Advantage_Blockchain',
    'yield_distribution'::tx_source,
    'ETH'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Alec Beckman ETH: prev=0.0248894614, flows=0.0000000000, yield=0.0052258586, end=0.0301153200
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '5fc170e2-7a07-4f32-991f-d8b6deec277c'::uuid,
    '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid,
    'YIELD'::tx_type,
    0.0052258586,
    '2026-02-28'::date,
    'spreadsheet-yield-ETH-2026-02-Alec_Beckman',
    'yield_distribution'::tx_source,
    'ETH'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Alex Jacobs ETH: prev=0.0033697872, flows=0.0000000000, yield=0.0000135399, end=0.0033833271
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'd681a28c-bb59-4bb7-bf34-ab23910596df'::uuid,
    '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid,
    'YIELD'::tx_type,
    0.0000135399,
    '2026-02-28'::date,
    'spreadsheet-yield-ETH-2026-02-Alex_Jacobs',
    'yield_distribution'::tx_source,
    'ETH'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Babak Eftekhari ETH: prev=68.8941209700, flows=0.0000000000, yield=0.2768188200, end=69.1709397900
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'cdcccf6e-32f9-475a-9f88-34272ca3e64b'::uuid,
    '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid,
    'YIELD'::tx_type,
    0.2768188200,
    '2026-02-28'::date,
    'spreadsheet-yield-ETH-2026-02-Babak_Eftekhari',
    'yield_distribution'::tx_source,
    'ETH'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Blondish ETH: prev=129.7211329000, flows=0.0000000000, yield=0.6516760000, end=130.3728089000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '529cac24-615c-4408-b683-2c4ab635d6fd'::uuid,
    '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid,
    'YIELD'::tx_type,
    0.6516760000,
    '2026-02-28'::date,
    'spreadsheet-yield-ETH-2026-02-Blondish',
    'yield_distribution'::tx_source,
    'ETH'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Brandon Hood ETH: prev=31.5476395300, flows=0.0000000000, yield=0.1267594500, end=31.6743989800
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'a00073d1-f37d-4e21-a54b-1b55df17e85a'::uuid,
    '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid,
    'YIELD'::tx_type,
    0.1267594500,
    '2026-02-28'::date,
    'spreadsheet-yield-ETH-2026-02-Brandon_Hood',
    'yield_distribution'::tx_source,
    'ETH'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Indigo Fees ETH: prev=3.2954171100, flows=0.0000000000, yield=0.4282621600, end=3.7236792700
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'b464a3f7-60d5-4bc0-9833-7b413bcc6cae'::uuid,
    '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid,
    'YIELD'::tx_type,
    0.4282621600,
    '2026-02-28'::date,
    'spreadsheet-yield-ETH-2026-02-Indigo_Fees',
    'yield_distribution'::tx_source,
    'ETH'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Jose Molla ETH: prev=68.6272219400, flows=47.3200000000, yield=0.2929970600, end=116.2402190000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '172d6461-f6cb-4457-a8c3-75c978cc12be'::uuid,
    '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid,
    'YIELD'::tx_type,
    0.2929970600,
    '2026-02-28'::date,
    'spreadsheet-yield-ETH-2026-02-Jose_Molla',
    'yield_distribution'::tx_source,
    'ETH'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Lars Ahlgreen ETH: prev=0.0481284266, flows=0.0000000000, yield=0.0071200719, end=0.0552484985
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '9405071c-0b52-4399-85da-9f1ba9b289c1'::uuid,
    '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid,
    'YIELD'::tx_type,
    0.0071200719,
    '2026-02-28'::date,
    'spreadsheet-yield-ETH-2026-02-Lars_Ahlgreen',
    'yield_distribution'::tx_source,
    'ETH'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Nathanaël Cohen ETH: prev=49.5051055400, flows=0.0000000000, yield=0.2486972800, end=49.7538028200
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'ed91c89d-23de-4981-b6b7-60e13f1a6767'::uuid,
    '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid,
    'YIELD'::tx_type,
    0.2486972800,
    '2026-02-28'::date,
    'spreadsheet-yield-ETH-2026-02-Nathana_l_Cohen',
    'yield_distribution'::tx_source,
    'ETH'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- NSVO Holdings ETH: prev=25.0300000000, flows=0.0000000000, yield=0.1005713600, end=25.1305713600
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '114164b0-1aba-4b40-9abc-8d72adfdc60a'::uuid,
    '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid,
    'YIELD'::tx_type,
    0.1005713600,
    '2026-02-28'::date,
    'spreadsheet-yield-ETH-2026-02-NSVO_Holdings',
    'yield_distribution'::tx_source,
    'ETH'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Ryan Van Der Wall ETH: prev=0.0615476114, flows=0.0000000000, yield=0.0002473003, end=0.0617949117
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'f462d9e5-7363-4c82-a144-4e694d2b55da'::uuid,
    '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid,
    'YIELD'::tx_type,
    0.0002473003,
    '2026-02-28'::date,
    'spreadsheet-yield-ETH-2026-02-Ryan_Van_Der_Wall',
    'yield_distribution'::tx_source,
    'ETH'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Tomer Zur ETH: prev=193.3187709000, flows=0.0000000000, yield=0.7767611000, end=194.0955320000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '82f58ac0-2d34-4c00-b0df-34383c1d1dfd'::uuid,
    '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid,
    'YIELD'::tx_type,
    0.7767611000,
    '2026-02-28'::date,
    'spreadsheet-yield-ETH-2026-02-Tomer_Zur',
    'yield_distribution'::tx_source,
    'ETH'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Alex Jacobs SOL: prev=0.0333641751, flows=0.0000000000, yield=0.0003043633, end=0.0336685384
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'd681a28c-bb59-4bb7-bf34-ab23910596df'::uuid,
    '7574bc81-aab3-4175-9e7f-803aa6f9eb8f'::uuid,
    'YIELD'::tx_type,
    0.0003043633,
    '2026-02-28'::date,
    'spreadsheet-yield-SOL-2026-02-Alex_Jacobs',
    'yield_distribution'::tx_source,
    'SOL'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Indigo Fees SOL: prev=9.6412428540, flows=0.0000000000, yield=0.2670282610, end=9.9082711150
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'b464a3f7-60d5-4bc0-9833-7b413bcc6cae'::uuid,
    '7574bc81-aab3-4175-9e7f-803aa6f9eb8f'::uuid,
    'YIELD'::tx_type,
    0.2670282610,
    '2026-02-28'::date,
    'spreadsheet-yield-SOL-2026-02-Indigo_Fees',
    'yield_distribution'::tx_source,
    'SOL'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Jose Molla SOL: prev=89.3155345300, flows=393.7700000000, yield=0.8657008700, end=483.9512354000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '172d6461-f6cb-4457-a8c3-75c978cc12be'::uuid,
    '7574bc81-aab3-4175-9e7f-803aa6f9eb8f'::uuid,
    'YIELD'::tx_type,
    0.8657008700,
    '2026-02-28'::date,
    'spreadsheet-yield-SOL-2026-02-Jose_Molla',
    'yield_distribution'::tx_source,
    'SOL'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Ryan Van Der Wall SOL: prev=1.8598584460, flows=0.0000000000, yield=0.0169664830, end=1.8768249290
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'f462d9e5-7363-4c82-a144-4e694d2b55da'::uuid,
    '7574bc81-aab3-4175-9e7f-803aa6f9eb8f'::uuid,
    'YIELD'::tx_type,
    0.0169664830,
    '2026-02-28'::date,
    'spreadsheet-yield-SOL-2026-02-Ryan_Van_Der_Wall',
    'yield_distribution'::tx_source,
    'SOL'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Alain Bensimon USDT: prev=143178.7427000000, flows=0.0000000000, yield=521.7586000000, end=143700.5013000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '20396ec2-c919-46ef-b3a3-8005a8a34bd3'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    521.7586000000,
    '2026-02-28'::date,
    'spreadsheet-yield-USDT-2026-02-Alain_Bensimon',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Anne Cecile Noique USDT: prev=233177.8865000000, flows=0.0000000000, yield=849.7251000000, end=234027.6116000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '64cb831a-3365-4a89-9369-620ab7a1ff26'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    849.7251000000,
    '2026-02-28'::date,
    'spreadsheet-yield-USDT-2026-02-Anne_Cecile_Noique',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Babak Eftekhari USDT: prev=243068.6235000000, flows=0.0000000000, yield=787.2474000000, end=243855.8709000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'cdcccf6e-32f9-475a-9f88-34272ca3e64b'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    787.2474000000,
    '2026-02-28'::date,
    'spreadsheet-yield-USDT-2026-02-Babak_Eftekhari',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Bo De Kriek USDT: prev=287417.1925000000, flows=0.0000000000, yield=1047.3790000000, end=288464.5715000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '98dd4ff5-b5cb-4257-a501-aa25a6d638c5'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    1047.3790000000,
    '2026-02-28'::date,
    'spreadsheet-yield-USDT-2026-02-Bo_De_Kriek',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Dario Deiana USDT: prev=208210.6309000000, flows=0.0000000000, yield=674.3498000000, end=208884.9807000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'bb655a37-9e91-4166-b575-cafbbbb8c200'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    674.3498000000,
    '2026-02-28'::date,
    'spreadsheet-yield-USDT-2026-02-Dario_Deiana',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- HALLEY86 USDT: prev=102022.1300000000, flows=0.0000000000, yield=330.4279000000, end=102352.5579000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '32d75475-0b78-4b7b-925a-e9429f6fe66d'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    330.4279000000,
    '2026-02-28'::date,
    'spreadsheet-yield-USDT-2026-02-HALLEY86',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Indigo Fees USDT: prev=18100.1382400000, flows=-20000.0000000000, yield=5650.2421960000, end=3750.3804360000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'b464a3f7-60d5-4bc0-9833-7b413bcc6cae'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    5650.2421960000,
    '2026-02-28'::date,
    'spreadsheet-yield-USDT-2026-02-Indigo_Fees',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Joel Barbeau USDT: prev=58.1084123000, flows=0.0000000000, yield=16.5865044200, end=74.6949167200
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '99e56523-32a6-43e5-b9b3-789992cc347c'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    16.5865044200,
    '2026-02-28'::date,
    'spreadsheet-yield-USDT-2026-02-Joel_Barbeau',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Jose Molla USDT: prev=329.7040615000, flows=0.0000000000, yield=1.1346547000, end=330.8387162000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '172d6461-f6cb-4457-a8c3-75c978cc12be'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    1.1346547000,
    '2026-02-28'::date,
    'spreadsheet-yield-USDT-2026-02-Jose_Molla',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Julien Grunebaum USDT: prev=114829.5753000000, flows=0.0000000000, yield=418.4512000000, end=115248.0265000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '7fdedf56-e838-45ea-91f8-6e441810c761'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    418.4512000000,
    '2026-02-28'::date,
    'spreadsheet-yield-USDT-2026-02-Julien_Grunebaum',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Lars Ahlgreen USDT: prev=241.8592828000, flows=0.0000000000, yield=20.4849060000, end=262.3441888000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '9405071c-0b52-4399-85da-9f1ba9b289c1'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    20.4849060000,
    '2026-02-28'::date,
    'spreadsheet-yield-USDT-2026-02-Lars_Ahlgreen',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Matthew Beatty USDT: prev=349351.9916000000, flows=0.0000000000, yield=1273.0760000000, end=350625.0676000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '24f3054e-a125-4954-8861-55aa617cbb2c'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    1273.0760000000,
    '2026-02-28'::date,
    'spreadsheet-yield-USDT-2026-02-Matthew_Beatty',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Monica Levy Chicheportiche USDT: prev=853067.0924000000, flows=0.0000000000, yield=2762.9023000001, end=855829.9947000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'c85bddf5-7720-47a5-8336-669ea604b94b'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    2762.9023000001,
    '2026-02-28'::date,
    'spreadsheet-yield-USDT-2026-02-Monica_Levy_Chicheportiche',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Pierre Bezencon USDT: prev=114767.6426000000, flows=0.0000000000, yield=418.2255000000, end=115185.8681000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '511991c7-93a2-4d2b-b42a-43120d58f672'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    418.2255000000,
    '2026-02-28'::date,
    'spreadsheet-yield-USDT-2026-02-Pierre_Bezencon',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Ryan Van Der Wall USDT: prev=214.4648998000, flows=0.0000000000, yield=927.8048792000, end=1142.2697790000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'f462d9e5-7363-4c82-a144-4e694d2b55da'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    927.8048792000,
    '2026-02-28'::date,
    'spreadsheet-yield-USDT-2026-02-Ryan_Van_Der_Wall',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Sacha Oshry USDT: prev=102521.7418000000, flows=0.0000000000, yield=352.8218000000, end=102874.5636000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'd5719d57-5308-4b9d-8a4f-a9a8aa596af4'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    352.8218000000,
    '2026-02-28'::date,
    'spreadsheet-yield-USDT-2026-02-Sacha_Oshry',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Sam Johnson USDT: prev=5204288.8169999998, flows=1300000.0000000000, yield=18524.1880000001, end=6522813.0049999999
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '2f7b8bb2-6a60-4fc9-953d-b9fae44337c1'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    18524.1880000001,
    '2026-02-28'::date,
    'spreadsheet-yield-USDT-2026-02-Sam_Johnson',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Terance Chen USDT: prev=230099.3818000000, flows=0.0000000000, yield=838.5067000000, end=230937.8885000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '3705c2cd-49d2-4e3b-ac09-7c1f98ebb93c'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    838.5067000000,
    '2026-02-28'::date,
    'spreadsheet-yield-USDT-2026-02-Terance_Chen',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Thomas Puech USDT: prev=47281.7804600000, flows=-47373.7700000000, yield=47465.7571100000, end=47373.7675700000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '44801beb-4476-4a9b-9751-4e70267f6953'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    47465.7571100000,
    '2026-02-28'::date,
    'spreadsheet-yield-USDT-2026-02-Thomas_Puech',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Valeria Cruz USDT: prev=50587.2783400000, flows=0.0000000000, yield=163.8414000000, end=50751.1197400000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'e9bbc28b-5d8d-410c-940b-b37a54a726e0'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    163.8414000000,
    '2026-02-28'::date,
    'spreadsheet-yield-USDT-2026-02-Valeria_Cruz',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Ventures Life Style USDT: prev=101157.2176000000, flows=0.0000000000, yield=327.6266000000, end=101484.8442000000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    '7d049f7f-b77f-4650-b772-6a8806f00103'::uuid,
    '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid,
    'YIELD'::tx_type,
    327.6266000000,
    '2026-02-28'::date,
    'spreadsheet-yield-USDT-2026-02-Ventures_Life_Style',
    'yield_distribution'::tx_source,
    'USDT'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Indigo Fees XRP: prev=633.6485493000, flows=0.0000000000, yield=2.5201466000, end=636.1686959000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'b464a3f7-60d5-4bc0-9833-7b413bcc6cae'::uuid,
    '2c123c4f-76b4-4504-867e-059649855417'::uuid,
    'YIELD'::tx_type,
    2.5201466000,
    '2026-02-28'::date,
    'spreadsheet-yield-XRP-2026-02-Indigo_Fees',
    'yield_distribution'::tx_source,
    'XRP'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  -- Ryan Van Der Wall XRP: prev=158.3508640000, flows=0.0000000000, yield=0.4798511000, end=158.8307151000
  INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, reference_id, source, asset, purpose, visibility_scope)
  VALUES (
    'f462d9e5-7363-4c82-a144-4e694d2b55da'::uuid,
    '2c123c4f-76b4-4504-867e-059649855417'::uuid,
    'YIELD'::tx_type,
    0.4798511000,
    '2026-02-28'::date,
    'spreadsheet-yield-XRP-2026-02-Ryan_Van_Der_Wall',
    'yield_distribution'::tx_source,
    'XRP'::asset_code,
    'reporting'::aum_purpose,
    'investor_visible'::visibility_scope
  );

  RAISE NOTICE 'Month 2026-02: inserted 53 yield transactions';
END;
$$;

-- Recompute all positions and ensure they are active
DO $$
DECLARE
  r RECORD;
  cnt integer := 0;
BEGIN
  FOR r IN SELECT DISTINCT investor_id, fund_id FROM investor_positions
  LOOP
    PERFORM recompute_investor_position(
      p_investor_id := r.investor_id,
      p_fund_id := r.fund_id
    );
    cnt := cnt + 1;
  END LOOP;
  UPDATE investor_positions SET is_active = true WHERE is_active = false;
  RAISE NOTICE 'Recomputed and activated % positions', cnt;
END;
$$;

-- Re-enable yield distribution guard trigger
ALTER TABLE transactions_v2 ENABLE TRIGGER trg_enforce_yield_distribution_guard;
