-- Bootstrap AUM record for XRP fund (Ripple Yield Fund)
-- All previous records were voided, need a baseline to calculate yield from
INSERT INTO fund_daily_aum (
  fund_id,
  aum_date,
  total_aum,
  is_month_end,
  purpose,
  source,
  is_voided,
  created_by
) VALUES (
  '2c123c4f-76b4-4504-867e-059649855417', -- XRP Fund (Ripple Yield Fund)
  '2025-11-25',                            -- Date of last deposit
  184003,                                  -- 135,003 + 49,000 = 184,003 XRP
  false,
  'transaction',
  'manual_bootstrap',
  false,
  '55586442-641c-4d9e-939a-85f09b816073'   -- Admin user
);