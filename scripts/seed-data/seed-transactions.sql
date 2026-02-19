-- Phase 2: Seed all 196 historical transactions via direct INSERT
-- Bypasses balance check, uses canonical_rpc to bypass guards

DO $seed$
DECLARE
  v_investor_id uuid;
  v_count int := 0;
BEGIN
  -- Set JWT context for admin auth
  PERFORM set_config('request.jwt.claim.sub', 'a16a7e50-fefd-4bfe-897c-d16279b457c2', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"a16a7e50-fefd-4bfe-897c-d16279b457c2","role":"authenticated"}', true);
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Pre-create investor positions for all investor-fund pairs
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'advantage.blockchain@indigo.fund';
  INSERT INTO investor_positions (investor_id, fund_id, current_value, cost_basis, shares, is_active)
  VALUES (v_investor_id, '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid, 0, 0, 0, true)
  ON CONFLICT (investor_id, fund_id) DO NOTHING;

  SELECT id INTO v_investor_id FROM profiles WHERE email = 'alain.bensimon@indigo.fund';
  INSERT INTO investor_positions (investor_id, fund_id, current_value, cost_basis, shares, is_active)
  VALUES (v_investor_id, '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid, 0, 0, 0, true)
  ON CONFLICT (investor_id, fund_id) DO NOTHING;

  SELECT id INTO v_investor_id FROM profiles WHERE email = 'alok.batra@indigo.fund';
  INSERT INTO investor_positions (investor_id, fund_id, current_value, cost_basis, shares, is_active)
  VALUES (v_investor_id, '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid, 0, 0, 0, true)
  ON CONFLICT (investor_id, fund_id) DO NOTHING;

  SELECT id INTO v_investor_id FROM profiles WHERE email = 'alok.batra@indigo.fund';
  INSERT INTO investor_positions (investor_id, fund_id, current_value, cost_basis, shares, is_active)
  VALUES (v_investor_id, '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid, 0, 0, 0, true)
  ON CONFLICT (investor_id, fund_id) DO NOTHING;

  SELECT id INTO v_investor_id FROM profiles WHERE email = 'alok.batra@indigo.fund';
  INSERT INTO investor_positions (investor_id, fund_id, current_value, cost_basis, shares, is_active)
  VALUES (v_investor_id, '7574bc81-aab3-4175-9e7f-803aa6f9eb8f'::uuid, 0, 0, 0, true)
  ON CONFLICT (investor_id, fund_id) DO NOTHING;

  SELECT id INTO v_investor_id FROM profiles WHERE email = 'anne.noique@indigo.fund';
  INSERT INTO investor_positions (investor_id, fund_id, current_value, cost_basis, shares, is_active)
  VALUES (v_investor_id, '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid, 0, 0, 0, true)
  ON CONFLICT (investor_id, fund_id) DO NOTHING;

  SELECT id INTO v_investor_id FROM profiles WHERE email = 'babak.eftekhari@indigo.fund';
  INSERT INTO investor_positions (investor_id, fund_id, current_value, cost_basis, shares, is_active)
  VALUES (v_investor_id, '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid, 0, 0, 0, true)
  ON CONFLICT (investor_id, fund_id) DO NOTHING;

  SELECT id INTO v_investor_id FROM profiles WHERE email = 'babak.eftekhari@indigo.fund';
  INSERT INTO investor_positions (investor_id, fund_id, current_value, cost_basis, shares, is_active)
  VALUES (v_investor_id, '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid, 0, 0, 0, true)
  ON CONFLICT (investor_id, fund_id) DO NOTHING;

  SELECT id INTO v_investor_id FROM profiles WHERE email = 'blondish@indigo.fund';
  INSERT INTO investor_positions (investor_id, fund_id, current_value, cost_basis, shares, is_active)
  VALUES (v_investor_id, '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid, 0, 0, 0, true)
  ON CONFLICT (investor_id, fund_id) DO NOTHING;

  SELECT id INTO v_investor_id FROM profiles WHERE email = 'blondish@indigo.fund';
  INSERT INTO investor_positions (investor_id, fund_id, current_value, cost_basis, shares, is_active)
  VALUES (v_investor_id, '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid, 0, 0, 0, true)
  ON CONFLICT (investor_id, fund_id) DO NOTHING;

  SELECT id INTO v_investor_id FROM profiles WHERE email = 'bo.kriek@indigo.fund';
  INSERT INTO investor_positions (investor_id, fund_id, current_value, cost_basis, shares, is_active)
  VALUES (v_investor_id, '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid, 0, 0, 0, true)
  ON CONFLICT (investor_id, fund_id) DO NOTHING;

  SELECT id INTO v_investor_id FROM profiles WHERE email = 'brandon.hood@indigo.fund';
  INSERT INTO investor_positions (investor_id, fund_id, current_value, cost_basis, shares, is_active)
  VALUES (v_investor_id, '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid, 0, 0, 0, true)
  ON CONFLICT (investor_id, fund_id) DO NOTHING;

  SELECT id INTO v_investor_id FROM profiles WHERE email = 'daniele.francilia@indigo.fund';
  INSERT INTO investor_positions (investor_id, fund_id, current_value, cost_basis, shares, is_active)
  VALUES (v_investor_id, '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid, 0, 0, 0, true)
  ON CONFLICT (investor_id, fund_id) DO NOTHING;

  SELECT id INTO v_investor_id FROM profiles WHERE email = 'danielle.richetta@indigo.fund';
  INSERT INTO investor_positions (investor_id, fund_id, current_value, cost_basis, shares, is_active)
  VALUES (v_investor_id, '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid, 0, 0, 0, true)
  ON CONFLICT (investor_id, fund_id) DO NOTHING;

  SELECT id INTO v_investor_id FROM profiles WHERE email = 'dario.deiana@indigo.fund';
  INSERT INTO investor_positions (investor_id, fund_id, current_value, cost_basis, shares, is_active)
  VALUES (v_investor_id, '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid, 0, 0, 0, true)
  ON CONFLICT (investor_id, fund_id) DO NOTHING;

  SELECT id INTO v_investor_id FROM profiles WHERE email = 'fees@indigo.fund';
  INSERT INTO investor_positions (investor_id, fund_id, current_value, cost_basis, shares, is_active)
  VALUES (v_investor_id, '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid, 0, 0, 0, true)
  ON CONFLICT (investor_id, fund_id) DO NOTHING;

  SELECT id INTO v_investor_id FROM profiles WHERE email = 'fees@indigo.fund';
  INSERT INTO investor_positions (investor_id, fund_id, current_value, cost_basis, shares, is_active)
  VALUES (v_investor_id, '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid, 0, 0, 0, true)
  ON CONFLICT (investor_id, fund_id) DO NOTHING;

  SELECT id INTO v_investor_id FROM profiles WHERE email = 'fees@indigo.fund';
  INSERT INTO investor_positions (investor_id, fund_id, current_value, cost_basis, shares, is_active)
  VALUES (v_investor_id, '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid, 0, 0, 0, true)
  ON CONFLICT (investor_id, fund_id) DO NOTHING;

  SELECT id INTO v_investor_id FROM profiles WHERE email = 'halley@indigo.fund';
  INSERT INTO investor_positions (investor_id, fund_id, current_value, cost_basis, shares, is_active)
  VALUES (v_investor_id, '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid, 0, 0, 0, true)
  ON CONFLICT (investor_id, fund_id) DO NOTHING;

  SELECT id INTO v_investor_id FROM profiles WHERE email = 'jose.molla@indigo.fund';
  INSERT INTO investor_positions (investor_id, fund_id, current_value, cost_basis, shares, is_active)
  VALUES (v_investor_id, '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid, 0, 0, 0, true)
  ON CONFLICT (investor_id, fund_id) DO NOTHING;

  SELECT id INTO v_investor_id FROM profiles WHERE email = 'jose.molla@indigo.fund';
  INSERT INTO investor_positions (investor_id, fund_id, current_value, cost_basis, shares, is_active)
  VALUES (v_investor_id, '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid, 0, 0, 0, true)
  ON CONFLICT (investor_id, fund_id) DO NOTHING;

  SELECT id INTO v_investor_id FROM profiles WHERE email = 'jose.molla@indigo.fund';
  INSERT INTO investor_positions (investor_id, fund_id, current_value, cost_basis, shares, is_active)
  VALUES (v_investor_id, '7574bc81-aab3-4175-9e7f-803aa6f9eb8f'::uuid, 0, 0, 0, true)
  ON CONFLICT (investor_id, fund_id) DO NOTHING;

  SELECT id INTO v_investor_id FROM profiles WHERE email = 'jose.molla@indigo.fund';
  INSERT INTO investor_positions (investor_id, fund_id, current_value, cost_basis, shares, is_active)
  VALUES (v_investor_id, '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid, 0, 0, 0, true)
  ON CONFLICT (investor_id, fund_id) DO NOTHING;

  SELECT id INTO v_investor_id FROM profiles WHERE email = 'julien.grunebaum@indigo.fund';
  INSERT INTO investor_positions (investor_id, fund_id, current_value, cost_basis, shares, is_active)
  VALUES (v_investor_id, '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid, 0, 0, 0, true)
  ON CONFLICT (investor_id, fund_id) DO NOTHING;

  SELECT id INTO v_investor_id FROM profiles WHERE email = 'kabbaj@indigo.fund';
  INSERT INTO investor_positions (investor_id, fund_id, current_value, cost_basis, shares, is_active)
  VALUES (v_investor_id, '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid, 0, 0, 0, true)
  ON CONFLICT (investor_id, fund_id) DO NOTHING;

  SELECT id INTO v_investor_id FROM profiles WHERE email = 'kyle.gulamerian@indigo.fund';
  INSERT INTO investor_positions (investor_id, fund_id, current_value, cost_basis, shares, is_active)
  VALUES (v_investor_id, '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid, 0, 0, 0, true)
  ON CONFLICT (investor_id, fund_id) DO NOTHING;

  SELECT id INTO v_investor_id FROM profiles WHERE email = 'lp@indigo.fund';
  INSERT INTO investor_positions (investor_id, fund_id, current_value, cost_basis, shares, is_active)
  VALUES (v_investor_id, '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid, 0, 0, 0, true)
  ON CONFLICT (investor_id, fund_id) DO NOTHING;

  SELECT id INTO v_investor_id FROM profiles WHERE email = 'lp@indigo.fund';
  INSERT INTO investor_positions (investor_id, fund_id, current_value, cost_basis, shares, is_active)
  VALUES (v_investor_id, '7574bc81-aab3-4175-9e7f-803aa6f9eb8f'::uuid, 0, 0, 0, true)
  ON CONFLICT (investor_id, fund_id) DO NOTHING;

  SELECT id INTO v_investor_id FROM profiles WHERE email = 'lp@indigo.fund';
  INSERT INTO investor_positions (investor_id, fund_id, current_value, cost_basis, shares, is_active)
  VALUES (v_investor_id, '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid, 0, 0, 0, true)
  ON CONFLICT (investor_id, fund_id) DO NOTHING;

  SELECT id INTO v_investor_id FROM profiles WHERE email = 'matthew.beatty@indigo.fund';
  INSERT INTO investor_positions (investor_id, fund_id, current_value, cost_basis, shares, is_active)
  VALUES (v_investor_id, '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid, 0, 0, 0, true)
  ON CONFLICT (investor_id, fund_id) DO NOTHING;

  SELECT id INTO v_investor_id FROM profiles WHERE email = 'matthias.reiser@indigo.fund';
  INSERT INTO investor_positions (investor_id, fund_id, current_value, cost_basis, shares, is_active)
  VALUES (v_investor_id, '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid, 0, 0, 0, true)
  ON CONFLICT (investor_id, fund_id) DO NOTHING;

  SELECT id INTO v_investor_id FROM profiles WHERE email = 'monica.chicheportiche@indigo.fund';
  INSERT INTO investor_positions (investor_id, fund_id, current_value, cost_basis, shares, is_active)
  VALUES (v_investor_id, '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid, 0, 0, 0, true)
  ON CONFLICT (investor_id, fund_id) DO NOTHING;

  SELECT id INTO v_investor_id FROM profiles WHERE email = 'nath.thomas@indigo.fund';
  INSERT INTO investor_positions (investor_id, fund_id, current_value, cost_basis, shares, is_active)
  VALUES (v_investor_id, '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid, 0, 0, 0, true)
  ON CONFLICT (investor_id, fund_id) DO NOTHING;

  SELECT id INTO v_investor_id FROM profiles WHERE email = 'nath.thomas@indigo.fund';
  INSERT INTO investor_positions (investor_id, fund_id, current_value, cost_basis, shares, is_active)
  VALUES (v_investor_id, '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid, 0, 0, 0, true)
  ON CONFLICT (investor_id, fund_id) DO NOTHING;

  SELECT id INTO v_investor_id FROM profiles WHERE email = 'nathanael@indigo.fund';
  INSERT INTO investor_positions (investor_id, fund_id, current_value, cost_basis, shares, is_active)
  VALUES (v_investor_id, '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid, 0, 0, 0, true)
  ON CONFLICT (investor_id, fund_id) DO NOTHING;

  SELECT id INTO v_investor_id FROM profiles WHERE email = 'nathanael@indigo.fund';
  INSERT INTO investor_positions (investor_id, fund_id, current_value, cost_basis, shares, is_active)
  VALUES (v_investor_id, '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid, 0, 0, 0, true)
  ON CONFLICT (investor_id, fund_id) DO NOTHING;

  SELECT id INTO v_investor_id FROM profiles WHERE email = 'nathanael@indigo.fund';
  INSERT INTO investor_positions (investor_id, fund_id, current_value, cost_basis, shares, is_active)
  VALUES (v_investor_id, '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid, 0, 0, 0, true)
  ON CONFLICT (investor_id, fund_id) DO NOTHING;

  SELECT id INTO v_investor_id FROM profiles WHERE email = 'nsvo.holdings@indigo.fund';
  INSERT INTO investor_positions (investor_id, fund_id, current_value, cost_basis, shares, is_active)
  VALUES (v_investor_id, '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid, 0, 0, 0, true)
  ON CONFLICT (investor_id, fund_id) DO NOTHING;

  SELECT id INTO v_investor_id FROM profiles WHERE email = 'nsvo.holdings@indigo.fund';
  INSERT INTO investor_positions (investor_id, fund_id, current_value, cost_basis, shares, is_active)
  VALUES (v_investor_id, '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid, 0, 0, 0, true)
  ON CONFLICT (investor_id, fund_id) DO NOTHING;

  SELECT id INTO v_investor_id FROM profiles WHERE email = 'oliver.loisel@indigo.fund';
  INSERT INTO investor_positions (investor_id, fund_id, current_value, cost_basis, shares, is_active)
  VALUES (v_investor_id, '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid, 0, 0, 0, true)
  ON CONFLICT (investor_id, fund_id) DO NOTHING;

  SELECT id INTO v_investor_id FROM profiles WHERE email = 'paul.johnson@indigo.fund';
  INSERT INTO investor_positions (investor_id, fund_id, current_value, cost_basis, shares, is_active)
  VALUES (v_investor_id, '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid, 0, 0, 0, true)
  ON CONFLICT (investor_id, fund_id) DO NOTHING;

  SELECT id INTO v_investor_id FROM profiles WHERE email = 'paul.johnson@indigo.fund';
  INSERT INTO investor_positions (investor_id, fund_id, current_value, cost_basis, shares, is_active)
  VALUES (v_investor_id, '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid, 0, 0, 0, true)
  ON CONFLICT (investor_id, fund_id) DO NOTHING;

  SELECT id INTO v_investor_id FROM profiles WHERE email = 'paul.johnson@indigo.fund';
  INSERT INTO investor_positions (investor_id, fund_id, current_value, cost_basis, shares, is_active)
  VALUES (v_investor_id, '7574bc81-aab3-4175-9e7f-803aa6f9eb8f'::uuid, 0, 0, 0, true)
  ON CONFLICT (investor_id, fund_id) DO NOTHING;

  SELECT id INTO v_investor_id FROM profiles WHERE email = 'pierre.bezencon@indigo.fund';
  INSERT INTO investor_positions (investor_id, fund_id, current_value, cost_basis, shares, is_active)
  VALUES (v_investor_id, '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid, 0, 0, 0, true)
  ON CONFLICT (investor_id, fund_id) DO NOTHING;

  SELECT id INTO v_investor_id FROM profiles WHERE email = 'sacha.oshry@indigo.fund';
  INSERT INTO investor_positions (investor_id, fund_id, current_value, cost_basis, shares, is_active)
  VALUES (v_investor_id, '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid, 0, 0, 0, true)
  ON CONFLICT (investor_id, fund_id) DO NOTHING;

  SELECT id INTO v_investor_id FROM profiles WHERE email = 'sam.johnson@indigo.fund';
  INSERT INTO investor_positions (investor_id, fund_id, current_value, cost_basis, shares, is_active)
  VALUES (v_investor_id, '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid, 0, 0, 0, true)
  ON CONFLICT (investor_id, fund_id) DO NOTHING;

  SELECT id INTO v_investor_id FROM profiles WHERE email = 'sam.johnson@indigo.fund';
  INSERT INTO investor_positions (investor_id, fund_id, current_value, cost_basis, shares, is_active)
  VALUES (v_investor_id, '2c123c4f-76b4-4504-867e-059649855417'::uuid, 0, 0, 0, true)
  ON CONFLICT (investor_id, fund_id) DO NOTHING;

  SELECT id INTO v_investor_id FROM profiles WHERE email = 'sam.johnson@indigo.fund';
  INSERT INTO investor_positions (investor_id, fund_id, current_value, cost_basis, shares, is_active)
  VALUES (v_investor_id, '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid, 0, 0, 0, true)
  ON CONFLICT (investor_id, fund_id) DO NOTHING;

  SELECT id INTO v_investor_id FROM profiles WHERE email = 'sam.johnson@indigo.fund';
  INSERT INTO investor_positions (investor_id, fund_id, current_value, cost_basis, shares, is_active)
  VALUES (v_investor_id, '7574bc81-aab3-4175-9e7f-803aa6f9eb8f'::uuid, 0, 0, 0, true)
  ON CONFLICT (investor_id, fund_id) DO NOTHING;

  SELECT id INTO v_investor_id FROM profiles WHERE email = 'sam.johnson@indigo.fund';
  INSERT INTO investor_positions (investor_id, fund_id, current_value, cost_basis, shares, is_active)
  VALUES (v_investor_id, '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid, 0, 0, 0, true)
  ON CONFLICT (investor_id, fund_id) DO NOTHING;

  SELECT id INTO v_investor_id FROM profiles WHERE email = 'terance.chen@indigo.fund';
  INSERT INTO investor_positions (investor_id, fund_id, current_value, cost_basis, shares, is_active)
  VALUES (v_investor_id, '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid, 0, 0, 0, true)
  ON CONFLICT (investor_id, fund_id) DO NOTHING;

  SELECT id INTO v_investor_id FROM profiles WHERE email = 'thomas.puech@indigo.fund';
  INSERT INTO investor_positions (investor_id, fund_id, current_value, cost_basis, shares, is_active)
  VALUES (v_investor_id, '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid, 0, 0, 0, true)
  ON CONFLICT (investor_id, fund_id) DO NOTHING;

  SELECT id INTO v_investor_id FROM profiles WHERE email = 'thomas.puech@indigo.fund';
  INSERT INTO investor_positions (investor_id, fund_id, current_value, cost_basis, shares, is_active)
  VALUES (v_investor_id, '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid, 0, 0, 0, true)
  ON CONFLICT (investor_id, fund_id) DO NOTHING;

  SELECT id INTO v_investor_id FROM profiles WHERE email = 'tomer.mazar@indigo.fund';
  INSERT INTO investor_positions (investor_id, fund_id, current_value, cost_basis, shares, is_active)
  VALUES (v_investor_id, '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid, 0, 0, 0, true)
  ON CONFLICT (investor_id, fund_id) DO NOTHING;

  SELECT id INTO v_investor_id FROM profiles WHERE email = 'tomer.zur@indigo.fund';
  INSERT INTO investor_positions (investor_id, fund_id, current_value, cost_basis, shares, is_active)
  VALUES (v_investor_id, '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid, 0, 0, 0, true)
  ON CONFLICT (investor_id, fund_id) DO NOTHING;

  SELECT id INTO v_investor_id FROM profiles WHERE email = 'valeria.cruz@indigo.fund';
  INSERT INTO investor_positions (investor_id, fund_id, current_value, cost_basis, shares, is_active)
  VALUES (v_investor_id, '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid, 0, 0, 0, true)
  ON CONFLICT (investor_id, fund_id) DO NOTHING;

  SELECT id INTO v_investor_id FROM profiles WHERE email = 'ventures.lifestyle@indigo.fund';
  INSERT INTO investor_positions (investor_id, fund_id, current_value, cost_basis, shares, is_active)
  VALUES (v_investor_id, '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid, 0, 0, 0, true)
  ON CONFLICT (investor_id, fund_id) DO NOTHING;

  SELECT id INTO v_investor_id FROM profiles WHERE email = 'ventures@indigo.fund';
  INSERT INTO investor_positions (investor_id, fund_id, current_value, cost_basis, shares, is_active)
  VALUES (v_investor_id, '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid, 0, 0, 0, true)
  ON CONFLICT (investor_id, fund_id) DO NOTHING;

  SELECT id INTO v_investor_id FROM profiles WHERE email = 'victoria.parientecohen@indigo.fund';
  INSERT INTO investor_positions (investor_id, fund_id, current_value, cost_basis, shares, is_active)
  VALUES (v_investor_id, '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid, 0, 0, 0, true)
  ON CONFLICT (investor_id, fund_id) DO NOTHING;

  SELECT id INTO v_investor_id FROM profiles WHERE email = 'vivie.liana@indigo.fund';
  INSERT INTO investor_positions (investor_id, fund_id, current_value, cost_basis, shares, is_active)
  VALUES (v_investor_id, '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid, 0, 0, 0, true)
  ON CONFLICT (investor_id, fund_id) DO NOTHING;

  -- Insert all 196 transactions
  -- TX 1/196: Jose Molla DEPOSIT 2.723 BTC on 2024-06-12
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'jose.molla@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid, '2024-06-12'::date, '2024-06-12'::date,
    'BTC', 2.723, 'DEPOSIT'::tx_type,
    'seed-deposit-2024-06-12-jose_molla-btc-0', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 2/196: Jose Molla DEPOSIT 52.4 ETH TAC on 2024-06-12
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'jose.molla@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid, '2024-06-12'::date, '2024-06-12'::date,
    'ETH', 52.4, 'DEPOSIT'::tx_type,
    'seed-deposit-2024-06-12-jose_molla-eth-1', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 3/196: Jose Molla DEPOSIT 0.745 BTC on 2024-07-08
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'jose.molla@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid, '2024-07-08'::date, '2024-07-08'::date,
    'BTC', 0.745, 'DEPOSIT'::tx_type,
    'seed-deposit-2024-07-08-jose_molla-btc-2', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 4/196: Jose Molla DEPOSIT 9.1 ETH TAC on 2024-07-08
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'jose.molla@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid, '2024-07-08'::date, '2024-07-08'::date,
    'ETH', 9.1, 'DEPOSIT'::tx_type,
    'seed-deposit-2024-07-08-jose_molla-eth-3', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 5/196: Kyle Gulamerian DEPOSIT 0.01 BTC on 2024-08-21
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'kyle.gulamerian@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid, '2024-08-21'::date, '2024-08-21'::date,
    'BTC', 0.01, 'DEPOSIT'::tx_type,
    'seed-deposit-2024-08-21-kyle_gulamerian-btc-4', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 6/196: Kyle Gulamerian DEPOSIT 1.99 BTC on 2024-08-21
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'kyle.gulamerian@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid, '2024-08-21'::date, '2024-08-21'::date,
    'BTC', 1.99, 'DEPOSIT'::tx_type,
    'seed-deposit-2024-08-21-kyle_gulamerian-btc-5', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 7/196: Matthias Reiser DEPOSIT 4.62 BTC on 2024-10-01
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'matthias.reiser@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid, '2024-10-01'::date, '2024-10-01'::date,
    'BTC', 4.62, 'DEPOSIT'::tx_type,
    'seed-deposit-2024-10-01-matthias_reiser-btc-6', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 8/196: Thomas Puech DEPOSIT 6.5193 BTC on 2024-10-01
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'thomas.puech@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid, '2024-10-01'::date, '2024-10-01'::date,
    'BTC', 6.5193, 'DEPOSIT'::tx_type,
    'seed-deposit-2024-10-01-thomas_puech-btc-7', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 9/196: Danielle Richetta DEPOSIT 5.2 BTC on 2024-10-01
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'danielle.richetta@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid, '2024-10-01'::date, '2024-10-01'::date,
    'BTC', 5.2, 'DEPOSIT'::tx_type,
    'seed-deposit-2024-10-01-danielle_richetta-btc-8', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 10/196: Nathanaël Cohen DEPOSIT 17 ETH TAC on 2024-10-01
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'nathanael@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid, '2024-10-01'::date, '2024-10-01'::date,
    'ETH', 17, 'DEPOSIT'::tx_type,
    'seed-deposit-2024-10-01-nathanael_cohen-eth-9', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 11/196: Blondish DEPOSIT 120 ETH TAC on 2024-10-24
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'blondish@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid, '2024-10-24'::date, '2024-10-24'::date,
    'ETH', 120, 'DEPOSIT'::tx_type,
    'seed-deposit-2024-10-24-blondish-eth-10', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 12/196: Danielle Richetta WITHDRAWAL 0.27 BTC on 2024-11-09
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'danielle.richetta@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid, '2024-11-09'::date, '2024-11-09'::date,
    'BTC', -0.27, 'WITHDRAWAL'::tx_type,
    'seed-withdrawal-2024-11-09-danielle_richetta-btc-11', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 13/196: Danielle Richetta WITHDRAWAL 0.124 BTC on 2024-12-14
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'danielle.richetta@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid, '2024-12-14'::date, '2024-12-14'::date,
    'BTC', -0.124, 'WITHDRAWAL'::tx_type,
    'seed-withdrawal-2024-12-14-danielle_richetta-btc-12', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 14/196: Danielle Richetta WITHDRAWAL 4.8628 BTC on 2024-12-15
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'danielle.richetta@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid, '2024-12-15'::date, '2024-12-15'::date,
    'BTC', -4.8628, 'WITHDRAWAL'::tx_type,
    'seed-withdrawal-2024-12-15-danielle_richetta-btc-13', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 15/196: Kyle Gulamerian WITHDRAWAL 2.0336 BTC on 2024-12-15
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'kyle.gulamerian@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid, '2024-12-15'::date, '2024-12-15'::date,
    'BTC', -2.0336, 'WITHDRAWAL'::tx_type,
    'seed-withdrawal-2024-12-15-kyle_gulamerian-btc-14', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 16/196: Matthias Reiser WITHDRAWAL 4.6717 BTC on 2024-12-15
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'matthias.reiser@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid, '2024-12-15'::date, '2024-12-15'::date,
    'BTC', -4.6717, 'WITHDRAWAL'::tx_type,
    'seed-withdrawal-2024-12-15-matthias_reiser-btc-15', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 17/196: Danielle Richetta DEPOSIT 4.8628 BTC BOOST on 2024-12-15
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'danielle.richetta@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid, '2024-12-15'::date, '2024-12-15'::date,
    'BTC', 4.8628, 'DEPOSIT'::tx_type,
    'seed-deposit-2024-12-15-danielle_richetta-btc-16', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 18/196: Kyle Gulamerian DEPOSIT 2.0336 BTC BOOST on 2024-12-15
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'kyle.gulamerian@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid, '2024-12-15'::date, '2024-12-15'::date,
    'BTC', 2.0336, 'DEPOSIT'::tx_type,
    'seed-deposit-2024-12-15-kyle_gulamerian-btc-17', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 19/196: Matthias Reiser DEPOSIT 4.6717 BTC BOOST on 2024-12-15
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'matthias.reiser@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid, '2024-12-15'::date, '2024-12-15'::date,
    'BTC', 4.6717, 'DEPOSIT'::tx_type,
    'seed-deposit-2024-12-15-matthias_reiser-btc-18', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 20/196: Nathanaël Cohen DEPOSIT 4.608 ETH TAC on 2025-03-01
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'nathanael@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid, '2025-03-01'::date, '2025-03-01'::date,
    'ETH', 4.608, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-03-01-nathanael_cohen-eth-19', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;
  RAISE NOTICE 'Progress: %/196 transactions inserted', v_count;

  -- TX 21/196: Nathanaël Cohen DEPOSIT 5.226 ETH TAC on 2025-03-31
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'nathanael@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid, '2025-03-31'::date, '2025-03-31'::date,
    'ETH', 5.226, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-03-31-nathanael_cohen-eth-20', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 22/196: Victoria Pariente-Cohen DEPOSIT 0.1492 BTC TAC on 2025-04-01
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'victoria.parientecohen@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid, '2025-04-01'::date, '2025-04-01'::date,
    'BTC', 0.1492, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-04-01-victoria_pariente-cohen-btc-21', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 23/196: Nathanaël Cohen DEPOSIT 0.4483 BTC TAC on 2025-04-01
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'nathanael@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid, '2025-04-01'::date, '2025-04-01'::date,
    'BTC', 0.4483, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-04-01-nathanael_cohen-btc-22', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 24/196: Blondish DEPOSIT 4.121 BTC TAC on 2025-04-01
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'blondish@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid, '2025-04-01'::date, '2025-04-01'::date,
    'BTC', 4.121, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-04-01-blondish-btc-23', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 25/196: Thomas Puech WITHDRAWAL 6.7249 BTC on 2025-04-01
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'thomas.puech@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid, '2025-04-01'::date, '2025-04-01'::date,
    'BTC', -6.7249, 'WITHDRAWAL'::tx_type,
    'seed-withdrawal-2025-04-01-thomas_puech-btc-24', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 26/196: Thomas Puech DEPOSIT 6.7249 BTC TAC on 2025-04-01
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'thomas.puech@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid, '2025-04-01'::date, '2025-04-01'::date,
    'BTC', 6.7249, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-04-01-thomas_puech-btc-25', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 27/196: Kyle Gulamerian DEPOSIT 2.101 BTC on 2025-04-16
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'kyle.gulamerian@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid, '2025-04-16'::date, '2025-04-16'::date,
    'BTC', 2.101, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-04-16-kyle_gulamerian-btc-26', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 28/196: Matthias Reiser DEPOSIT 4.8357 BTC on 2025-04-16
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'matthias.reiser@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid, '2025-04-16'::date, '2025-04-16'::date,
    'BTC', 4.8357, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-04-16-matthias_reiser-btc-27', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 29/196: Danielle Richetta DEPOSIT 5.0335 BTC on 2025-04-16
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'danielle.richetta@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid, '2025-04-16'::date, '2025-04-16'::date,
    'BTC', 5.0335, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-04-16-danielle_richetta-btc-28', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 30/196: Kyle Gulamerian WITHDRAWAL 2.101 BTC BOOST on 2025-04-16
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'kyle.gulamerian@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid, '2025-04-16'::date, '2025-04-16'::date,
    'BTC', -2.101, 'WITHDRAWAL'::tx_type,
    'seed-withdrawal-2025-04-16-kyle_gulamerian-btc-29', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 31/196: Matthias Reiser WITHDRAWAL 4.8357 BTC BOOST on 2025-04-16
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'matthias.reiser@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid, '2025-04-16'::date, '2025-04-16'::date,
    'BTC', -4.8357, 'WITHDRAWAL'::tx_type,
    'seed-withdrawal-2025-04-16-matthias_reiser-btc-30', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 32/196: Danielle Richetta WITHDRAWAL 5.0335 BTC BOOST on 2025-04-16
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'danielle.richetta@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid, '2025-04-16'::date, '2025-04-16'::date,
    'BTC', -5.0335, 'WITHDRAWAL'::tx_type,
    'seed-withdrawal-2025-04-16-danielle_richetta-btc-31', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 33/196: INDIGO Fees DEPOSIT 0.0498 BTC on 2025-04-16
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'fees@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid, '2025-04-16'::date, '2025-04-16'::date,
    'BTC', 0.0498, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-04-16-indigo_fees-btc-32', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 34/196: INDIGO Fees WITHDRAWAL 0.0498 BTC BOOST on 2025-04-16
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'fees@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid, '2025-04-16'::date, '2025-04-16'::date,
    'BTC', -0.0498, 'WITHDRAWAL'::tx_type,
    'seed-withdrawal-2025-04-16-indigo_fees-btc-33', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 35/196: Kyle Gulamerian WITHDRAWAL 2.1101 BTC on 2025-05-13
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'kyle.gulamerian@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid, '2025-05-13'::date, '2025-05-13'::date,
    'BTC', -2.1101, 'WITHDRAWAL'::tx_type,
    'seed-withdrawal-2025-05-13-kyle_gulamerian-btc-34', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 36/196: Babak Eftekhari DEPOSIT 27.01 ETH on 2025-05-26
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'babak.eftekhari@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid, '2025-05-26'::date, '2025-05-26'::date,
    'ETH', 27.01, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-05-26-babak_eftekhari-eth-35', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 37/196: INDIGO DIGITAL ASSET FUND LP DEPOSIT 175 ETH on 2025-05-26
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'lp@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid, '2025-05-26'::date, '2025-05-26'::date,
    'ETH', 175, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-05-26-indigo_digital_asset_fund_lp-eth-36', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 38/196: Babak Eftekhari DEPOSIT 32.25 ETH on 2025-05-30
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'babak.eftekhari@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid, '2025-05-30'::date, '2025-05-30'::date,
    'ETH', 32.25, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-05-30-babak_eftekhari-eth-37', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 39/196: Nathanaël Cohen DEPOSIT 3.0466 ETH on 2025-06-01
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'nathanael@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid, '2025-06-01'::date, '2025-06-01'::date,
    'ETH', 3.0466, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-06-01-nathanael_cohen-eth-38', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 40/196: danielle Richetta WITHDRAWAL 0.13 BTC on 2025-06-01
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'danielle.richetta@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid, '2025-06-01'::date, '2025-06-01'::date,
    'BTC', -0.13, 'WITHDRAWAL'::tx_type,
    'seed-withdrawal-2025-06-01-danielle_richetta-btc-39', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;
  RAISE NOTICE 'Progress: %/196 transactions inserted', v_count;

  -- TX 41/196: Kabbaj DEPOSIT 2 BTC on 2025-06-11
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'kabbaj@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid, '2025-06-11'::date, '2025-06-11'::date,
    'BTC', 2, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-06-11-kabbaj-btc-40', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 42/196: Babak Eftekhari DEPOSIT 135726.75 USDT on 2025-06-16
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'babak.eftekhari@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid, '2025-06-16'::date, '2025-06-16'::date,
    'USDT', 135726.75, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-06-16-babak_eftekhari-usdt-41', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 43/196: Nathanaël Cohen DEPOSIT 2 ETH on 2025-07-01
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'nathanael@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid, '2025-07-01'::date, '2025-07-01'::date,
    'ETH', 2, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-07-01-nathanael_cohen-eth-42', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 44/196: Jose Molla WITHDRAWAL 62.6261 ETH TAC on 2025-07-11
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'jose.molla@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid, '2025-07-11'::date, '2025-07-11'::date,
    'ETH', -62.6261, 'WITHDRAWAL'::tx_type,
    'seed-withdrawal-2025-07-11-jose_molla-eth-43', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 45/196: Nathanaël Cohen WITHDRAWAL 26.6797 ETH TAC on 2025-07-11
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'nathanael@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid, '2025-07-11'::date, '2025-07-11'::date,
    'ETH', -26.6797, 'WITHDRAWAL'::tx_type,
    'seed-withdrawal-2025-07-11-nathanael_cohen-eth-44', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 46/196: Blondish WITHDRAWAL 119.7862 ETH TAC on 2025-07-11
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'blondish@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid, '2025-07-11'::date, '2025-07-11'::date,
    'ETH', -119.7862, 'WITHDRAWAL'::tx_type,
    'seed-withdrawal-2025-07-11-blondish-eth-45', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 47/196: Indigo Fees WITHDRAWAL 0.898 ETH TAC on 2025-07-11
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'fees@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid, '2025-07-11'::date, '2025-07-11'::date,
    'ETH', -0.898, 'WITHDRAWAL'::tx_type,
    'seed-withdrawal-2025-07-11-indigo_fees-eth-46', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 48/196: Jose Molla DEPOSIT 62.6261 ETH on 2025-07-11
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'jose.molla@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid, '2025-07-11'::date, '2025-07-11'::date,
    'ETH', 62.6261, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-07-11-jose_molla-eth-47', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 49/196: Nathanaël Cohen DEPOSIT 26.6797 ETH on 2025-07-11
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'nathanael@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid, '2025-07-11'::date, '2025-07-11'::date,
    'ETH', 26.6797, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-07-11-nathanael_cohen-eth-48', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 50/196: Blondish DEPOSIT 119.7862 ETH on 2025-07-11
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'blondish@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid, '2025-07-11'::date, '2025-07-11'::date,
    'ETH', 119.7862, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-07-11-blondish-eth-49', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 51/196: Indigo Fees DEPOSIT 0.898 ETH on 2025-07-11
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'fees@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid, '2025-07-11'::date, '2025-07-11'::date,
    'ETH', 0.898, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-07-11-indigo_fees-eth-50', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 52/196: Kabbaj DEPOSIT 0.9914 BTC on 2025-07-11
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'kabbaj@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid, '2025-07-11'::date, '2025-07-11'::date,
    'BTC', 0.9914, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-07-11-kabbaj-btc-51', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 53/196: Victoria Pariente-Cohen DEPOSIT 0.1484 BTC on 2025-07-11
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'victoria.parientecohen@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid, '2025-07-11'::date, '2025-07-11'::date,
    'BTC', 0.1484, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-07-11-victoria_pariente-cohen-btc-52', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 54/196: Nathanaël Cohen DEPOSIT 0.446 BTC on 2025-07-11
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'nathanael@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid, '2025-07-11'::date, '2025-07-11'::date,
    'BTC', 0.446, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-07-11-nathanael_cohen-btc-53', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 55/196: Thomas Puech DEPOSIT 6.69 BTC on 2025-07-11
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'thomas.puech@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid, '2025-07-11'::date, '2025-07-11'::date,
    'BTC', 6.69, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-07-11-thomas_puech-btc-54', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 56/196: Blondish DEPOSIT 4.0996 BTC on 2025-07-11
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'blondish@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid, '2025-07-11'::date, '2025-07-11'::date,
    'BTC', 4.0996, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-07-11-blondish-btc-55', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 57/196: Victoria Pariente-Cohen WITHDRAWAL 0.1484 BTC TAC on 2025-07-11
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'victoria.parientecohen@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid, '2025-07-11'::date, '2025-07-11'::date,
    'BTC', -0.1484, 'WITHDRAWAL'::tx_type,
    'seed-withdrawal-2025-07-11-victoria_pariente-cohen-btc-56', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 58/196: Nathanaël Cohen WITHDRAWAL 0.446 BTC TAC on 2025-07-11
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'nathanael@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid, '2025-07-11'::date, '2025-07-11'::date,
    'BTC', -0.446, 'WITHDRAWAL'::tx_type,
    'seed-withdrawal-2025-07-11-nathanael_cohen-btc-57', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 59/196: Thomas Puech WITHDRAWAL 6.69 BTC TAC on 2025-07-11
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'thomas.puech@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid, '2025-07-11'::date, '2025-07-11'::date,
    'BTC', -6.69, 'WITHDRAWAL'::tx_type,
    'seed-withdrawal-2025-07-11-thomas_puech-btc-58', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 60/196: Blondish WITHDRAWAL 4.0996 BTC TAC on 2025-07-11
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'blondish@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid, '2025-07-11'::date, '2025-07-11'::date,
    'BTC', -4.0996, 'WITHDRAWAL'::tx_type,
    'seed-withdrawal-2025-07-11-blondish-btc-59', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;
  RAISE NOTICE 'Progress: %/196 transactions inserted', v_count;

  -- TX 61/196: Julien Grunebaum DEPOSIT 109392 USDT on 2025-07-14
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'julien.grunebaum@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid, '2025-07-14'::date, '2025-07-14'::date,
    'USDT', 109392, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-07-14-julien_grunebaum-usdt-60', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 62/196: Daniele Francilia DEPOSIT 109776 USDT on 2025-07-14
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'daniele.francilia@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid, '2025-07-14'::date, '2025-07-14'::date,
    'USDT', 109776, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-07-14-daniele_francilia-usdt-61', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 63/196: Pierre Bezencon DEPOSIT 109333 USDT on 2025-07-14
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'pierre.bezencon@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid, '2025-07-14'::date, '2025-07-14'::date,
    'USDT', 109333, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-07-14-pierre_bezencon-usdt-62', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 64/196: Matthew Beatty DEPOSIT 255504 USDT on 2025-07-14
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'matthew.beatty@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid, '2025-07-14'::date, '2025-07-14'::date,
    'USDT', 255504, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-07-14-matthew_beatty-usdt-63', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 65/196: Bo De Kriek DEPOSIT 273807 USDT on 2025-07-14
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'bo.kriek@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid, '2025-07-14'::date, '2025-07-14'::date,
    'USDT', 273807, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-07-14-bo_de_kriek-usdt-64', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 66/196: Dario Deiana DEPOSIT 199659.72 USDT on 2025-07-19
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'dario.deiana@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid, '2025-07-19'::date, '2025-07-19'::date,
    'USDT', 199659.72, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-07-19-dario_deiana-usdt-65', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 67/196: Babak Eftekhari DEPOSIT 46955.28 USDT on 2025-07-19
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'babak.eftekhari@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid, '2025-07-19'::date, '2025-07-19'::date,
    'USDT', 46955.28, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-07-19-babak_eftekhari-usdt-66', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 68/196: Alain Bensimon DEPOSIT 136737 USDT on 2025-07-23
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'alain.bensimon@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid, '2025-07-23'::date, '2025-07-23'::date,
    'USDT', 136737, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-07-23-alain_bensimon-usdt-67', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 69/196: Anne Cecile Noique DEPOSIT 222687 USDT on 2025-07-23
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'anne.noique@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid, '2025-07-23'::date, '2025-07-23'::date,
    'USDT', 222687, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-07-23-anne_cecile_noique-usdt-68', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 70/196: Terance Chen DEPOSIT 219747 USDT on 2025-07-23
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'terance.chen@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid, '2025-07-23'::date, '2025-07-23'::date,
    'USDT', 219747, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-07-23-terance_chen-usdt-69', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 71/196: Oliver Loisel DEPOSIT 2.115364 BTC on 2025-07-24
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'oliver.loisel@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid, '2025-07-24'::date, '2025-07-24'::date,
    'BTC', 2.115364, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-07-24-oliver_loisel-btc-70', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 72/196: Danielle Richetta WITHDRAWAL 0.26 BTC on 2025-07-25
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'danielle.richetta@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid, '2025-07-25'::date, '2025-07-25'::date,
    'BTC', -0.26, 'WITHDRAWAL'::tx_type,
    'seed-withdrawal-2025-07-25-danielle_richetta-btc-71', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 73/196: Advantage Blockchain DEPOSIT 32 ETH on 2025-07-30
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'advantage.blockchain@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid, '2025-07-30'::date, '2025-07-30'::date,
    'ETH', 32, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-07-30-advantage_blockchain-eth-72', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 74/196: INDIGO DIGITAL ASSET FUND LP WITHDRAWAL 178.37 ETH on 2025-07-30
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'lp@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid, '2025-07-30'::date, '2025-07-30'::date,
    'ETH', -178.37, 'WITHDRAWAL'::tx_type,
    'seed-withdrawal-2025-07-30-indigo_digital_asset_fund_lp-eth-73', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 75/196: Kabbaj DEPOSIT 0.6 BTC on 2025-07-31
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'kabbaj@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid, '2025-07-31'::date, '2025-07-31'::date,
    'BTC', 0.6, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-07-31-kabbaj-btc-74', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 76/196: INDIGO Ventures DEPOSIT 130000 USDT on 2025-08-04
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'ventures@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid, '2025-08-04'::date, '2025-08-04'::date,
    'USDT', 130000, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-08-04-indigo_ventures-usdt-75', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 77/196: Babak Eftekhari DEPOSIT 10000 USDT on 2025-08-04
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'babak.eftekhari@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid, '2025-08-04'::date, '2025-08-04'::date,
    'USDT', 10000, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-08-04-babak_eftekhari-usdt-76', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 78/196: Matthew Beatty DEPOSIT 25900 USDT on 2025-08-14
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'matthew.beatty@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid, '2025-08-14'::date, '2025-08-14'::date,
    'USDT', 25900, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-08-14-matthew_beatty-usdt-77', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 79/196: INDIGO DIGITAL ASSET FUND LP DEPOSIT 111370 USDT on 2025-08-19
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'lp@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid, '2025-08-19'::date, '2025-08-19'::date,
    'USDT', 111370, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-08-19-indigo_digital_asset_fund_lp-usdt-78', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 80/196: Danielle Richetta WITHDRAWAL 0.11 BTC on 2025-08-20
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'danielle.richetta@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid, '2025-08-20'::date, '2025-08-20'::date,
    'BTC', -0.11, 'WITHDRAWAL'::tx_type,
    'seed-withdrawal-2025-08-20-danielle_richetta-btc-79', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;
  RAISE NOTICE 'Progress: %/196 transactions inserted', v_count;

  -- TX 81/196: Kabbaj DEPOSIT 0.9102 BTC on 2025-08-25
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'kabbaj@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid, '2025-08-25'::date, '2025-08-25'::date,
    'BTC', 0.9102, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-08-25-kabbaj-btc-80', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 82/196: INDIGO DIGITAL ASSET FUND LP DEPOSIT 1250 SOL on 2025-09-02
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'lp@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '7574bc81-aab3-4175-9e7f-803aa6f9eb8f'::uuid, '2025-09-02'::date, '2025-09-02'::date,
    'SOL', 1250, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-09-02-indigo_digital_asset_fund_lp-sol-81', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 83/196: Paul Johnson DEPOSIT 234.17 SOL on 2025-09-04
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'paul.johnson@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '7574bc81-aab3-4175-9e7f-803aa6f9eb8f'::uuid, '2025-09-04'::date, '2025-09-04'::date,
    'SOL', 234.17, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-09-04-paul_johnson-sol-82', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 84/196: Paul Johnson DEPOSIT 10.44 ETH on 2025-09-04
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'paul.johnson@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid, '2025-09-04'::date, '2025-09-04'::date,
    'ETH', 10.44, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-09-04-paul_johnson-eth-83', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 85/196: Paul Johnson DEPOSIT 4.6327 ETH on 2025-09-10
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'paul.johnson@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid, '2025-09-10'::date, '2025-09-10'::date,
    'ETH', 4.6327, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-09-10-paul_johnson-eth-84', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 86/196: Paul Johnson DEPOSIT 8.96 ETH on 2025-09-12
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'paul.johnson@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid, '2025-09-12'::date, '2025-09-12'::date,
    'ETH', 8.96, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-09-12-paul_johnson-eth-85', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 87/196: Nathanaël Cohen DEPOSIT 3.35 ETH on 2025-09-12
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'nathanael@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid, '2025-09-12'::date, '2025-09-12'::date,
    'ETH', 3.35, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-09-12-nathanael_cohen-eth-86', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 88/196: Babak Eftekhari DEPOSIT 10000 USDT on 2025-09-24
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'babak.eftekhari@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid, '2025-09-24'::date, '2025-09-24'::date,
    'USDT', 10000, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-09-24-babak_eftekhari-usdt-87', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 89/196: Tomer Zur DEPOSIT 63.1 ETH on 2025-09-27
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'tomer.zur@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid, '2025-09-27'::date, '2025-09-27'::date,
    'ETH', 63.1, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-09-27-tomer_zur-eth-88', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 90/196: Paul Johnson DEPOSIT 0.4395 BTC on 2025-10-03
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'paul.johnson@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid, '2025-10-03'::date, '2025-10-03'::date,
    'BTC', 0.4395, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-10-03-paul_johnson-btc-89', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 91/196: Paul Johnson WITHDRAWAL 236.02 SOL on 2025-10-03
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'paul.johnson@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '7574bc81-aab3-4175-9e7f-803aa6f9eb8f'::uuid, '2025-10-03'::date, '2025-10-03'::date,
    'SOL', -236.02, 'WITHDRAWAL'::tx_type,
    'seed-withdrawal-2025-10-03-paul_johnson-sol-90', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 92/196: Paul Johnson WITHDRAWAL 12 ETH on 2025-10-03
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'paul.johnson@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid, '2025-10-03'::date, '2025-10-03'::date,
    'ETH', -12, 'WITHDRAWAL'::tx_type,
    'seed-withdrawal-2025-10-03-paul_johnson-eth-91', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 93/196: INDIGO Ventures WITHDRAWAL 100000 USDT on 2025-10-06
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'ventures@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid, '2025-10-06'::date, '2025-10-06'::date,
    'USDT', -100000, 'WITHDRAWAL'::tx_type,
    'seed-withdrawal-2025-10-06-indigo_ventures-usdt-92', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 94/196: Sacha Oshry DEPOSIT 100000 USDT on 2025-10-06
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'sacha.oshry@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid, '2025-10-06'::date, '2025-10-06'::date,
    'USDT', 100000, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-10-06-sacha_oshry-usdt-93', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 95/196: Tomer Zur DEPOSIT 10.051 ETH on 2025-10-08
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'tomer.zur@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid, '2025-10-08'::date, '2025-10-08'::date,
    'ETH', 10.051, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-10-08-tomer_zur-eth-94', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 96/196: Babak Eftekhari DEPOSIT 20000 USDT on 2025-10-09
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'babak.eftekhari@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid, '2025-10-09'::date, '2025-10-09'::date,
    'USDT', 20000, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-10-09-babak_eftekhari-usdt-95', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 97/196: INDIGO Ventures WITHDRAWAL 27594.55 USDT on 2025-10-13
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'ventures@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid, '2025-10-13'::date, '2025-10-13'::date,
    'USDT', -27594.55, 'WITHDRAWAL'::tx_type,
    'seed-withdrawal-2025-10-13-indigo_ventures-usdt-96', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 98/196: Tomer Zur DEPOSIT 64.27 ETH on 2025-10-14
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'tomer.zur@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid, '2025-10-14'::date, '2025-10-14'::date,
    'ETH', 64.27, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-10-14-tomer_zur-eth-97', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 99/196: Babak Eftekhari DEPOSIT 3.75 ETH on 2025-10-14
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'babak.eftekhari@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid, '2025-10-14'::date, '2025-10-14'::date,
    'ETH', 3.75, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-10-14-babak_eftekhari-eth-98', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 100/196: HALLEY86 DEPOSIT 99990 USDT on 2025-10-15
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'halley@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid, '2025-10-15'::date, '2025-10-15'::date,
    'USDT', 99990, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-10-15-halley86-usdt-99', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;
  RAISE NOTICE 'Progress: %/196 transactions inserted', v_count;

  -- TX 101/196: Babak Eftekhari DEPOSIT 3.1 ETH on 2025-10-17
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'babak.eftekhari@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid, '2025-10-17'::date, '2025-10-17'::date,
    'ETH', 3.1, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-10-17-babak_eftekhari-eth-100', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 102/196: Tomer Zur DEPOSIT 6.5417 ETH on 2025-10-20
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'tomer.zur@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid, '2025-10-20'::date, '2025-10-20'::date,
    'ETH', 6.5417, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-10-20-tomer_zur-eth-101', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 103/196: Jose Molla DEPOSIT 1.2 ETH on 2025-10-23
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'jose.molla@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid, '2025-10-23'::date, '2025-10-23'::date,
    'ETH', 1.2, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-10-23-jose_molla-eth-102', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 104/196: Tomer Zur DEPOSIT 6.4 ETH on 2025-10-23
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'tomer.zur@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid, '2025-10-23'::date, '2025-10-23'::date,
    'ETH', 6.4, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-10-23-tomer_zur-eth-103', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 105/196: Jose Molla DEPOSIT 87.98 SOL on 2025-10-23
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'jose.molla@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '7574bc81-aab3-4175-9e7f-803aa6f9eb8f'::uuid, '2025-10-23'::date, '2025-10-23'::date,
    'SOL', 87.98, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-10-23-jose_molla-sol-104', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 106/196: Jose Molla DEPOSIT 0.062 BTC on 2025-10-23
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'jose.molla@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid, '2025-10-23'::date, '2025-10-23'::date,
    'BTC', 0.062, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-10-23-jose_molla-btc-105', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 107/196: Jose Molla DEPOSIT 97695 USDT on 2025-10-23
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'jose.molla@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid, '2025-10-23'::date, '2025-10-23'::date,
    'USDT', 97695, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-10-23-jose_molla-usdt-106', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 108/196: Babak Eftekhari DEPOSIT 10450 USDT on 2025-10-23
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'babak.eftekhari@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid, '2025-10-23'::date, '2025-10-23'::date,
    'USDT', 10450, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-10-23-babak_eftekhari-usdt-107', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 109/196: Indigo Fees DEPOSIT 0.03593745021234585 ETH on 2025-11-03
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'fees@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid, '2025-11-03'::date, '2025-11-03'::date,
    'ETH', 0.03593745021234585, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-11-03-indigo_fees-eth-108', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 110/196: Jose Molla DEPOSIT 2.5063577386065177 ETH on 2025-11-03
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'jose.molla@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid, '2025-11-03'::date, '2025-11-03'::date,
    'ETH', 2.5063577386065177, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-11-03-jose_molla-eth-109', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 111/196: Nathanaël Cohen DEPOSIT 1.067745459138733 ETH on 2025-11-03
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'nathanael@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid, '2025-11-03'::date, '2025-11-03'::date,
    'ETH', 1.067745459138733, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-11-03-nathanael_cohen-eth-110', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 112/196: Blondish DEPOSIT 4.793959352042402 ETH on 2025-11-03
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'blondish@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid, '2025-11-03'::date, '2025-11-03'::date,
    'ETH', 4.793959352042402, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-11-03-blondish-eth-111', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 113/196: INDIGO DIGITAL ASSET FUND LP WITHDRAWAL 113841.65 USDT on 2025-11-03
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'lp@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid, '2025-11-03'::date, '2025-11-03'::date,
    'USDT', -113841.65, 'WITHDRAWAL'::tx_type,
    'seed-withdrawal-2025-11-03-indigo_digital_asset_fund_lp-usdt-112', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 114/196: Tomer Zur DEPOSIT 6.9519 ETH on 2025-11-04
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'tomer.zur@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid, '2025-11-04'::date, '2025-11-04'::date,
    'ETH', 6.9519, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-11-04-tomer_zur-eth-113', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 115/196: Matthew Beatty DEPOSIT 35300 USDT on 2025-11-04
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'matthew.beatty@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid, '2025-11-04'::date, '2025-11-04'::date,
    'USDT', 35300, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-11-04-matthew_beatty-usdt-114', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 116/196: Tomer Zur DEPOSIT 7.6215 ETH on 2025-11-05
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'tomer.zur@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid, '2025-11-05'::date, '2025-11-05'::date,
    'ETH', 7.6215, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-11-05-tomer_zur-eth-115', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 117/196: Danielle Richetta WITHDRAWAL 0.283 BTC on 2025-11-05
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'danielle.richetta@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid, '2025-11-05'::date, '2025-11-05'::date,
    'BTC', -0.283, 'WITHDRAWAL'::tx_type,
    'seed-withdrawal-2025-11-05-danielle_richetta-btc-116', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 118/196: Paul Johnson WITHDRAWAL 0.4408 BTC on 2025-11-05
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'paul.johnson@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid, '2025-11-05'::date, '2025-11-05'::date,
    'BTC', -0.4408, 'WITHDRAWAL'::tx_type,
    'seed-withdrawal-2025-11-05-paul_johnson-btc-117', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 119/196: Paul Johnson WITHDRAWAL 12.22 ETH on 2025-11-05
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'paul.johnson@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid, '2025-11-05'::date, '2025-11-05'::date,
    'ETH', -12.22, 'WITHDRAWAL'::tx_type,
    'seed-withdrawal-2025-11-05-paul_johnson-eth-118', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 120/196: Monica Levy Chicheportiche DEPOSIT 840168.03 USDT on 2025-11-07
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'monica.chicheportiche@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid, '2025-11-07'::date, '2025-11-07'::date,
    'USDT', 840168.03, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-11-07-monica_levy_chicheportiche-usdt-119', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;
  RAISE NOTICE 'Progress: %/196 transactions inserted', v_count;

  -- TX 121/196: Tomer Zur DEPOSIT 10.224 ETH on 2025-11-07
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'tomer.zur@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid, '2025-11-07'::date, '2025-11-07'::date,
    'ETH', 10.224, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-11-07-tomer_zur-eth-120', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 122/196: Jose Molla WITHDRAWAL 50000 USDT on 2025-11-08
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'jose.molla@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid, '2025-11-08'::date, '2025-11-08'::date,
    'USDT', -50000, 'WITHDRAWAL'::tx_type,
    'seed-withdrawal-2025-11-08-jose_molla-usdt-121', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 123/196: Jose Molla DEPOSIT 0.4867 BTC on 2025-11-08
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'jose.molla@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid, '2025-11-08'::date, '2025-11-08'::date,
    'BTC', 0.4867, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-11-08-jose_molla-btc-122', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 124/196: Nath & Thomas DEPOSIT 299915.77 USDT on 2025-11-13
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'nath.thomas@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid, '2025-11-13'::date, '2025-11-13'::date,
    'USDT', 299915.77, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-11-13-nath_and_thomas-usdt-123', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 125/196: Sam Johnson DEPOSIT 3.3 BTC on 2025-11-17
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'sam.johnson@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid, '2025-11-17'::date, '2025-11-17'::date,
    'BTC', 3.3, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-11-17-sam_johnson-btc-124', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 126/196: Sam Johnson DEPOSIT 78 ETH on 2025-11-17
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'sam.johnson@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid, '2025-11-17'::date, '2025-11-17'::date,
    'ETH', 78, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-11-17-sam_johnson-eth-125', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 127/196: Sam Johnson DEPOSIT 1800.05 SOL on 2025-11-17
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'sam.johnson@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '7574bc81-aab3-4175-9e7f-803aa6f9eb8f'::uuid, '2025-11-17'::date, '2025-11-17'::date,
    'SOL', 1800.05, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-11-17-sam_johnson-sol-126', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 128/196: Sam Johnson DEPOSIT 135003 XRP on 2025-11-17
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'sam.johnson@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '2c123c4f-76b4-4504-867e-059649855417'::uuid, '2025-11-17'::date, '2025-11-17'::date,
    'XRP', 135003, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-11-17-sam_johnson-xrp-127', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 129/196: Tomer Zur DEPOSIT 6.234 ETH on 2025-11-17
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'tomer.zur@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid, '2025-11-17'::date, '2025-11-17'::date,
    'ETH', 6.234, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-11-17-tomer_zur-eth-128', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 130/196: Jose Molla WITHDRAWAL 47908 USDT on 2025-11-21
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'jose.molla@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid, '2025-11-21'::date, '2025-11-21'::date,
    'USDT', -47908, 'WITHDRAWAL'::tx_type,
    'seed-withdrawal-2025-11-21-jose_molla-usdt-129', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 131/196: Sam Johnson DEPOSIT 1 BTC on 2025-11-25
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'sam.johnson@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid, '2025-11-25'::date, '2025-11-25'::date,
    'BTC', 1, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-11-25-sam_johnson-btc-130', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 132/196: Sam Johnson DEPOSIT 49000 XRP on 2025-11-25
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'sam.johnson@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '2c123c4f-76b4-4504-867e-059649855417'::uuid, '2025-11-25'::date, '2025-11-25'::date,
    'XRP', 49000, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-11-25-sam_johnson-xrp-131', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 133/196: Sam Johnson DEPOSIT 750 SOL on 2025-11-25
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'sam.johnson@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '7574bc81-aab3-4175-9e7f-803aa6f9eb8f'::uuid, '2025-11-25'::date, '2025-11-25'::date,
    'SOL', 750, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-11-25-sam_johnson-sol-132', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 134/196: Sam Johnson DEPOSIT 35 ETH on 2025-11-25
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'sam.johnson@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid, '2025-11-25'::date, '2025-11-25'::date,
    'ETH', 35, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-11-25-sam_johnson-eth-133', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 135/196: Jose Molla DEPOSIT 0.548 BTC on 2025-11-25
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'jose.molla@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid, '2025-11-25'::date, '2025-11-25'::date,
    'BTC', 0.548, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-11-25-jose_molla-btc-134', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 136/196: Valeria Cruz DEPOSIT 50000 USDT on 2025-11-25
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'valeria.cruz@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid, '2025-11-25'::date, '2025-11-25'::date,
    'USDT', 50000, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-11-25-valeria_cruz-usdt-135', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 137/196: Matthew Beatty DEPOSIT 18000 USDT on 2025-11-26
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'matthew.beatty@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid, '2025-11-26'::date, '2025-11-26'::date,
    'USDT', 18000, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-11-26-matthew_beatty-usdt-136', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 138/196: Nath & Thomas WITHDRAWAL 87937 USDT on 2025-11-26
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'nath.thomas@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid, '2025-11-26'::date, '2025-11-26'::date,
    'USDT', -87937, 'WITHDRAWAL'::tx_type,
    'seed-withdrawal-2025-11-26-nath_and_thomas-usdt-137', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 139/196: Ventures Life Style DEPOSIT 100000 USDT on 2025-11-27
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'ventures.lifestyle@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid, '2025-11-27'::date, '2025-11-27'::date,
    'USDT', 100000, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-11-27-ventures_life_style-usdt-138', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 140/196: Nath & Thomas DEPOSIT 1 BTC on 2025-11-27
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'nath.thomas@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid, '2025-11-27'::date, '2025-11-27'::date,
    'BTC', 1, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-11-27-nath_and_thomas-btc-139', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;
  RAISE NOTICE 'Progress: %/196 transactions inserted', v_count;

  -- TX 141/196: Vivie & Liana DEPOSIT 3.411 BTC on 2025-11-27
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'vivie.liana@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid, '2025-11-27'::date, '2025-11-27'::date,
    'BTC', 3.411, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-11-27-vivie_and_liana-btc-140', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 142/196: Sam Johnson DEPOSIT 1.2 BTC on 2025-11-30
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'sam.johnson@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid, '2025-11-30'::date, '2025-11-30'::date,
    'BTC', 1.2, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-11-30-sam_johnson-btc-141', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 143/196: Sam Johnson DEPOSIT 45000 XRP on 2025-11-30
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'sam.johnson@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '2c123c4f-76b4-4504-867e-059649855417'::uuid, '2025-11-30'::date, '2025-11-30'::date,
    'XRP', 45000, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-11-30-sam_johnson-xrp-142', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 144/196: Sam Johnson DEPOSIT 750 SOL on 2025-11-30
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'sam.johnson@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '7574bc81-aab3-4175-9e7f-803aa6f9eb8f'::uuid, '2025-11-30'::date, '2025-11-30'::date,
    'SOL', 750, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-11-30-sam_johnson-sol-143', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 145/196: Sam Johnson DEPOSIT 33 ETH on 2025-11-30
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'sam.johnson@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid, '2025-11-30'::date, '2025-11-30'::date,
    'ETH', 33, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-11-30-sam_johnson-eth-144', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 146/196: Tomer Zur DEPOSIT 9.143 ETH on 2025-12-02
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'tomer.zur@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid, '2025-12-02'::date, '2025-12-02'::date,
    'ETH', 9.143, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-12-02-tomer_zur-eth-145', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 147/196: INDIGO DIGITAL ASSET FUND LP WITHDRAWAL 1285.66 SOL on 2025-12-04
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'lp@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '7574bc81-aab3-4175-9e7f-803aa6f9eb8f'::uuid, '2025-12-04'::date, '2025-12-04'::date,
    'SOL', -1285.66, 'WITHDRAWAL'::tx_type,
    'seed-withdrawal-2025-12-04-indigo_digital_asset_fund_lp-sol-146', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 148/196: Brandon Hood DEPOSIT 31.37 ETH on 2025-12-04
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'brandon.hood@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid, '2025-12-04'::date, '2025-12-04'::date,
    'ETH', 31.37, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-12-04-brandon_hood-eth-147', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 149/196: Nath & Thomas WITHDRAWAL 213501.6 USDT on 2025-12-08
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'nath.thomas@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid, '2025-12-08'::date, '2025-12-08'::date,
    'USDT', -213501.6, 'WITHDRAWAL'::tx_type,
    'seed-withdrawal-2025-12-08-nath_and_thomas-usdt-148', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 150/196: Thomas Puech DEPOSIT 46750.8 USDT on 2025-12-08
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'thomas.puech@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid, '2025-12-08'::date, '2025-12-08'::date,
    'USDT', 46750.8, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-12-08-thomas_puech-usdt-149', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 151/196: Sam Johnson DEPOSIT 49500 XRP on 2025-12-08
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'sam.johnson@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '2c123c4f-76b4-4504-867e-059649855417'::uuid, '2025-12-08'::date, '2025-12-08'::date,
    'XRP', 49500, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-12-08-sam_johnson-xrp-150', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 152/196: Sam Johnson DEPOSIT 770 SOL on 2025-12-08
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'sam.johnson@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '7574bc81-aab3-4175-9e7f-803aa6f9eb8f'::uuid, '2025-12-08'::date, '2025-12-08'::date,
    'SOL', 770, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-12-08-sam_johnson-sol-151', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 153/196: Sam Johnson DEPOSIT 34 ETH on 2025-12-08
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'sam.johnson@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid, '2025-12-08'::date, '2025-12-08'::date,
    'ETH', 34, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-12-08-sam_johnson-eth-152', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 154/196: Sam Johnson DEPOSIT 1.1 BTC on 2025-12-08
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'sam.johnson@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid, '2025-12-08'::date, '2025-12-08'::date,
    'BTC', 1.1, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-12-08-sam_johnson-btc-153', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 155/196: Thomas Puech DEPOSIT 0.657 BTC on 2025-12-09
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'thomas.puech@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid, '2025-12-09'::date, '2025-12-09'::date,
    'BTC', 0.657, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-12-09-thomas_puech-btc-154', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 156/196: Sam Johnson DEPOSIT 50100 XRP on 2025-12-15
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'sam.johnson@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '2c123c4f-76b4-4504-867e-059649855417'::uuid, '2025-12-15'::date, '2025-12-15'::date,
    'XRP', 50100, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-12-15-sam_johnson-xrp-155', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 157/196: Sam Johnson DEPOSIT 766 SOL on 2025-12-15
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'sam.johnson@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '7574bc81-aab3-4175-9e7f-803aa6f9eb8f'::uuid, '2025-12-15'::date, '2025-12-15'::date,
    'SOL', 766, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-12-15-sam_johnson-sol-156', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 158/196: Sam Johnson DEPOSIT 32.5 ETH on 2025-12-15
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'sam.johnson@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid, '2025-12-15'::date, '2025-12-15'::date,
    'ETH', 32.5, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-12-15-sam_johnson-eth-157', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 159/196: Sam Johnson DEPOSIT 1.17 BTC on 2025-12-15
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'sam.johnson@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid, '2025-12-15'::date, '2025-12-15'::date,
    'BTC', 1.17, 'DEPOSIT'::tx_type,
    'seed-deposit-2025-12-15-sam_johnson-btc-158', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 160/196: Matthias Reiser WITHDRAWAL 4.9895 BTC on 2025-12-23
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'matthias.reiser@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid, '2025-12-23'::date, '2025-12-23'::date,
    'BTC', -4.9895, 'WITHDRAWAL'::tx_type,
    'seed-withdrawal-2025-12-23-matthias_reiser-btc-159', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;
  RAISE NOTICE 'Progress: %/196 transactions inserted', v_count;

  -- TX 161/196: Sam Johnson WITHDRAWAL 330500.42 XRP on 2026-01-02
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'sam.johnson@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '2c123c4f-76b4-4504-867e-059649855417'::uuid, '2026-01-02'::date, '2026-01-02'::date,
    'XRP', -330500.42, 'WITHDRAWAL'::tx_type,
    'seed-withdrawal-2026-01-02-sam_johnson-xrp-160', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 162/196: Sam Johnson WITHDRAWAL 4873.15 SOL on 2026-01-02
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'sam.johnson@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '7574bc81-aab3-4175-9e7f-803aa6f9eb8f'::uuid, '2026-01-02'::date, '2026-01-02'::date,
    'SOL', -4873.15, 'WITHDRAWAL'::tx_type,
    'seed-withdrawal-2026-01-02-sam_johnson-sol-161', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 163/196: Sam Johnson WITHDRAWAL 213.73 ETH on 2026-01-02
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'sam.johnson@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid, '2026-01-02'::date, '2026-01-02'::date,
    'ETH', -213.73, 'WITHDRAWAL'::tx_type,
    'seed-withdrawal-2026-01-02-sam_johnson-eth-162', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 164/196: Sam Johnson WITHDRAWAL 7.7852 BTC on 2026-01-02
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'sam.johnson@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid, '2026-01-02'::date, '2026-01-02'::date,
    'BTC', -7.7852, 'WITHDRAWAL'::tx_type,
    'seed-withdrawal-2026-01-02-sam_johnson-btc-163', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 165/196: Advantage Blockchain DEPOSIT 18 ETH on 2026-01-02
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'advantage.blockchain@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid, '2026-01-02'::date, '2026-01-02'::date,
    'ETH', 18, 'DEPOSIT'::tx_type,
    'seed-deposit-2026-01-02-advantage_blockchain-eth-164', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 166/196: Vivie & Liana WITHDRAWAL 3.4221 BTC on 2026-01-05
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'vivie.liana@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid, '2026-01-05'::date, '2026-01-05'::date,
    'BTC', -3.4221, 'WITHDRAWAL'::tx_type,
    'seed-withdrawal-2026-01-05-vivie_and_liana-btc-165', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 167/196: Nathanaël Cohen DEPOSIT 11.84556 ETH on 2026-01-05
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'nathanael@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid, '2026-01-05'::date, '2026-01-05'::date,
    'ETH', 11.84556, 'DEPOSIT'::tx_type,
    'seed-deposit-2026-01-05-nathanael_cohen-eth-166', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 168/196: Kabbaj DEPOSIT 2.1577 BTC on 2026-01-05
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'kabbaj@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid, '2026-01-05'::date, '2026-01-05'::date,
    'BTC', 2.1577, 'DEPOSIT'::tx_type,
    'seed-deposit-2026-01-05-kabbaj-btc-167', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 169/196: INDIGO Ventures WITHDRAWAL 5115.04 USDT on 2026-01-08
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'ventures@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid, '2026-01-08'::date, '2026-01-08'::date,
    'USDT', -5115.04, 'WITHDRAWAL'::tx_type,
    'seed-withdrawal-2026-01-08-indigo_ventures-usdt-168', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 170/196: Daniele Francilia WITHDRAWAL 114867.59 USDT on 2026-01-08
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'daniele.francilia@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid, '2026-01-08'::date, '2026-01-08'::date,
    'USDT', -114867.59, 'WITHDRAWAL'::tx_type,
    'seed-withdrawal-2026-01-08-daniele_francilia-usdt-169', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 171/196: NSVO Holdings DEPOSIT 0.622 BTC on 2026-01-13
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'nsvo.holdings@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid, '2026-01-13'::date, '2026-01-13'::date,
    'BTC', 0.622, 'DEPOSIT'::tx_type,
    'seed-deposit-2026-01-13-nsvo_holdings-btc-170', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 172/196: NSVO Holdings DEPOSIT 25.03 ETH on 2026-01-13
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'nsvo.holdings@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid, '2026-01-13'::date, '2026-01-13'::date,
    'ETH', 25.03, 'DEPOSIT'::tx_type,
    'seed-deposit-2026-01-13-nsvo_holdings-eth-171', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 173/196: Thomas Puech DEPOSIT 0.1135766 BTC on 2026-01-13
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'thomas.puech@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid, '2026-01-13'::date, '2026-01-13'::date,
    'BTC', 0.1135766, 'DEPOSIT'::tx_type,
    'seed-deposit-2026-01-13-thomas_puech-btc-172', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 174/196: Kyle Gulamerian DEPOSIT 3.9998 BTC on 2026-01-19
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'kyle.gulamerian@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid, '2026-01-19'::date, '2026-01-19'::date,
    'BTC', 3.9998, 'DEPOSIT'::tx_type,
    'seed-deposit-2026-01-19-kyle_gulamerian-btc-173', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 175/196: Danielle Richetta WITHDRAWAL 0.12 BTC on 2026-01-19
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'danielle.richetta@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid, '2026-01-19'::date, '2026-01-19'::date,
    'BTC', -0.12, 'WITHDRAWAL'::tx_type,
    'seed-withdrawal-2026-01-19-danielle_richetta-btc-174', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 176/196: Sam Johnson DEPOSIT 4200000 USDT on 2026-01-19
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'sam.johnson@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid, '2026-01-19'::date, '2026-01-19'::date,
    'USDT', 4200000, 'DEPOSIT'::tx_type,
    'seed-deposit-2026-01-19-sam_johnson-usdt-175', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 177/196: Kyle Gulamerian WITHDRAWAL 3.99 BTC on 2026-01-23
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'kyle.gulamerian@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid, '2026-01-23'::date, '2026-01-23'::date,
    'BTC', -3.99, 'WITHDRAWAL'::tx_type,
    'seed-withdrawal-2026-01-23-kyle_gulamerian-btc-176', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 178/196: Sam Johnson DEPOSIT 600000 USDT on 2026-01-26
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'sam.johnson@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid, '2026-01-26'::date, '2026-01-26'::date,
    'USDT', 600000, 'DEPOSIT'::tx_type,
    'seed-deposit-2026-01-26-sam_johnson-usdt-177', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 179/196: Sam Johnson DEPOSIT 400000 USDT on 2026-01-28
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'sam.johnson@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid, '2026-01-28'::date, '2026-01-28'::date,
    'USDT', 400000, 'DEPOSIT'::tx_type,
    'seed-deposit-2026-01-28-sam_johnson-usdt-178', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 180/196: Thomas Puech DEPOSIT 0.14207 BTC on 2026-01-30
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'thomas.puech@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid, '2026-01-30'::date, '2026-01-30'::date,
    'BTC', 0.14207, 'DEPOSIT'::tx_type,
    'seed-deposit-2026-01-30-thomas_puech-btc-179', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;
  RAISE NOTICE 'Progress: %/196 transactions inserted', v_count;

  -- TX 181/196: Sam Johnson DEPOSIT 750000 USDT on 2026-02-02
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'sam.johnson@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid, '2026-02-02'::date, '2026-02-02'::date,
    'USDT', 750000, 'DEPOSIT'::tx_type,
    'seed-deposit-2026-02-02-sam_johnson-usdt-180', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 182/196: Thomas Puech WITHDRAWAL 47373.77 USDT on 2026-02-02
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'thomas.puech@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid, '2026-02-02'::date, '2026-02-02'::date,
    'USDT', -47373.77, 'WITHDRAWAL'::tx_type,
    'seed-withdrawal-2026-02-02-thomas_puech-usdt-181', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 183/196: Thomas Puech DEPOSIT 0.60672 BTC on 2026-02-03
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'thomas.puech@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid, '2026-02-03'::date, '2026-02-03'::date,
    'BTC', 0.60672, 'DEPOSIT'::tx_type,
    'seed-deposit-2026-02-03-thomas_puech-btc-182', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 184/196: INDIGO Fees WITHDRAWAL 20000 USDT on 2026-02-06
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'fees@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid, '2026-02-06'::date, '2026-02-06'::date,
    'USDT', -20000, 'WITHDRAWAL'::tx_type,
    'seed-withdrawal-2026-02-06-indigo_fees-usdt-183', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 185/196: NSVO Holdings DEPOSIT 0.1773 BTC on 2026-02-06
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'nsvo.holdings@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid, '2026-02-06'::date, '2026-02-06'::date,
    'BTC', 0.1773, 'DEPOSIT'::tx_type,
    'seed-deposit-2026-02-06-nsvo_holdings-btc-184', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 186/196: Sam Johnson DEPOSIT 550000 USDT on 2026-02-08
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'sam.johnson@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid, '2026-02-08'::date, '2026-02-08'::date,
    'USDT', 550000, 'DEPOSIT'::tx_type,
    'seed-deposit-2026-02-08-sam_johnson-usdt-185', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 187/196: Jose Molla DEPOSIT 2.766 BTC on 2026-02-12
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'jose.molla@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid, '2026-02-12'::date, '2026-02-12'::date,
    'BTC', 2.766, 'DEPOSIT'::tx_type,
    'seed-deposit-2026-02-12-jose_molla-btc-186', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 188/196: ALOK PAVAN BATRA DEPOSIT 6 BTC on 2026-02-12
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'alok.batra@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid, '2026-02-12'::date, '2026-02-12'::date,
    'BTC', 6, 'DEPOSIT'::tx_type,
    'seed-deposit-2026-02-12-alok_pavan_batra-btc-187', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 189/196: Jose Molla DEPOSIT 47.32 ETH on 2026-02-12
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'jose.molla@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid, '2026-02-12'::date, '2026-02-12'::date,
    'ETH', 47.32, 'DEPOSIT'::tx_type,
    'seed-deposit-2026-02-12-jose_molla-eth-188', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 190/196: ALOK PAVAN BATRA DEPOSIT 103.38 ETH on 2026-02-12
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'alok.batra@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '717614a2-9e24-4abc-a89d-02209a3a772a'::uuid, '2026-02-12'::date, '2026-02-12'::date,
    'ETH', 103.38, 'DEPOSIT'::tx_type,
    'seed-deposit-2026-02-12-alok_pavan_batra-eth-189', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 191/196: Jose Molla DEPOSIT 393.77 SOL on 2026-02-12
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'jose.molla@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '7574bc81-aab3-4175-9e7f-803aa6f9eb8f'::uuid, '2026-02-12'::date, '2026-02-12'::date,
    'SOL', 393.77, 'DEPOSIT'::tx_type,
    'seed-deposit-2026-02-12-jose_molla-sol-190', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 192/196: ALOK PAVAN BATRA DEPOSIT 826.54 SOL on 2026-02-12
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'alok.batra@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '7574bc81-aab3-4175-9e7f-803aa6f9eb8f'::uuid, '2026-02-12'::date, '2026-02-12'::date,
    'SOL', 826.54, 'DEPOSIT'::tx_type,
    'seed-deposit-2026-02-12-alok_pavan_batra-sol-191', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 193/196: Thomas Puech DEPOSIT 0.6555 BTC on 2026-02-13
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'thomas.puech@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid, '2026-02-13'::date, '2026-02-13'::date,
    'BTC', 0.6555, 'DEPOSIT'::tx_type,
    'seed-deposit-2026-02-13-thomas_puech-btc-192', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 194/196: Nathanaël Cohen DEPOSIT 93819.18 USDT on 2026-02-13
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'nathanael@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid, '2026-02-13'::date, '2026-02-13'::date,
    'USDT', 93819.18, 'DEPOSIT'::tx_type,
    'seed-deposit-2026-02-13-nathanael_cohen-usdt-193', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 195/196: Tomer Mazar DEPOSIT 28567.67 USDT on 2026-02-13
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'tomer.mazar@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '8ef9dc49-e76c-4882-84ab-a449ef4326db'::uuid, '2026-02-13'::date, '2026-02-13'::date,
    'USDT', 28567.67, 'DEPOSIT'::tx_type,
    'seed-deposit-2026-02-13-tomer_mazar-usdt-194', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  -- TX 196/196: Danielle Richetta WITHDRAWAL 4.3 BTC on 2026-02-13
  SELECT id INTO v_investor_id FROM profiles WHERE email = 'danielle.richetta@indigo.fund';
  INSERT INTO transactions_v2 (
    investor_id, fund_id, tx_date, value_date, asset, amount, type,
    reference_id, notes, created_by, approved_by, approved_at,
    source, purpose, is_voided, visibility_scope
  ) VALUES (
    v_investor_id, '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid, '2026-02-13'::date, '2026-02-13'::date,
    'BTC', -4.3, 'WITHDRAWAL'::tx_type,
    'seed-withdrawal-2026-02-13-danielle_richetta-btc-195', 'Historical seed from Excel',
    'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, 'a16a7e50-fefd-4bfe-897c-d16279b457c2'::uuid, now(),
    'manual_admin'::tx_source, 'transaction'::aum_purpose, false, 'investor_visible'::visibility_scope
  );
  v_count := v_count + 1;

  RAISE NOTICE 'All % transactions seeded successfully', v_count;
END;
$seed$;

-- Verification
SELECT 'Total transactions' as check, count(*)::text as result FROM transactions_v2 WHERE NOT is_voided
UNION ALL
SELECT 'Deposits', count(*)::text FROM transactions_v2 WHERE type = 'DEPOSIT' AND NOT is_voided
UNION ALL
SELECT 'Withdrawals', count(*)::text FROM transactions_v2 WHERE type = 'WITHDRAWAL' AND NOT is_voided
UNION ALL
SELECT 'Active positions', count(*)::text FROM investor_positions WHERE is_active
UNION ALL
SELECT 'AUM records', count(*)::text FROM fund_daily_aum WHERE NOT is_voided;