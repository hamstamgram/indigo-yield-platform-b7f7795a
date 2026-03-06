\set ON_ERROR_STOP on
\x on

BEGIN;

DO $$ 
DECLARE
  v_admin_id uuid;
  v_fund_id uuid;
  v_result jsonb;
BEGIN
  -- Get the QA Admin ID
  SELECT id INTO v_admin_id FROM profiles WHERE email = 'qa.admin@indigo.fund' LIMIT 1;
  
  -- Get the Fund ID
  SELECT id INTO v_fund_id FROM funds WHERE code = 'INDIGO01' LIMIT 1;

  -- Mock opening aum and deposit so Yield actually has something to do
  -- (Since the db reset wiped everything and we are in a transaction)
  
  -- Actually, let's just see if the Yield Distribution works on whatever state the DB is in right now.
  -- The E2E script ran in the background, so the deposit of 10000 might exist. 
  
  SELECT apply_segmented_yield_distribution_v5(
      v_fund_id,
      '2026-03-31'::date,
      10500::numeric,
      v_admin_id, 
      'reporting'::aum_purpose,
      '2026-03-31'::date
  ) INTO v_result;

  RAISE NOTICE 'RESULT: %', v_result;

END $$;

ROLLBACK;
