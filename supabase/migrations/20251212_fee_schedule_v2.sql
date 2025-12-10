-- ==============================================================================
-- Fee Schedule Alignment (V2 schema)
-- - Removes legacy YF fund data
-- - Ensures investor_fee_schedule table exists (profiles-based)
-- - Upserts per-investor fee_pct (performance fee as % of yield)
-- - Fills missing investor/fund pairs with defaults to guarantee coverage
-- Notes:
--   * fund codes are IND-* only; legacy YF/BST/TAC are removed
--   * fee_pct is interpreted as % of gross yield taken as fee
--   * mgmt fee is not handled by the yield RPC; this seeds performance fee only
-- ==============================================================================

CREATE TEMP TABLE IF NOT EXISTS tmp_legacy_funds AS
  SELECT id FROM public.funds WHERE code IN ('BTCYF','ETHYF','USDTYF','SOLYF','XRPYF','BTCBST','ETHTAC');

DELETE FROM public.transactions_v2   WHERE fund_id IN (SELECT id FROM tmp_legacy_funds);
DELETE FROM public.investor_positions WHERE fund_id IN (SELECT id FROM tmp_legacy_funds);
DELETE FROM public.fund_daily_aum    WHERE fund_id::uuid IN (SELECT id FROM tmp_legacy_funds);
DELETE FROM public.funds             WHERE id      IN (SELECT id FROM tmp_legacy_funds);

DROP TABLE IF EXISTS tmp_legacy_funds;

-- Ensure table exists (profiles-based FK)
CREATE TABLE IF NOT EXISTS public.investor_fee_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  fund_id uuid NOT NULL REFERENCES public.funds(id) ON DELETE CASCADE,
  effective_date date NOT NULL DEFAULT '2024-01-01',
  fee_pct numeric NOT NULL CHECK (fee_pct >= 0 AND fee_pct <= 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(investor_id, fund_id, effective_date)
);

-- Add missing columns if table existed prior to this migration
ALTER TABLE public.investor_fee_schedule
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE public.investor_fee_schedule
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_fee_schedule_investor_fund_date
  ON public.investor_fee_schedule (investor_id, fund_id, effective_date DESC);

-- Override rows from provided fee schedule (perf fee bps -> pct)
WITH fund_map(legacy_code, ind_code) AS (
  VALUES
    ('BTCYF','IND-BTC'),
    ('ETHYF','IND-ETH'),
    ('USDTYF','IND-USDT'),
    ('SOLYF','IND-SOL'),
    ('XRPYF','IND-XRP')
),
rows(name, legacy_code, perf_bps) AS (
  VALUES
    ('Jose Molla','BTCYF',2000),
    ('Kyle Gulamerian','BTCYF',1500),
    ('Matthias Reiser','BTCYF',1000),
    ('Thomas Puech','BTCYF',0),
    ('Danielle Richetta','BTCYF',1000),
    ('Kabbaj','BTCYF',2000),
    ('Victoria Pariente-Cohen','BTCYF',0),
    ('Nathanaël Cohen','BTCYF',0),
    ('Vivie-Ann Bakos','BTCYF',0),
    ('Oliver Loisel','BTCYF',1000),
    ('Paul Johnson','BTCYF',1350),
    ('Alex Jacobs','BTCYF',2000),
    ('Sam Johnson','BTCYF',1800),
    ('Ryan Van Der Wall','BTCYF',2000),
    ('Vivie & Liana','BTCYF',0)
)
INSERT INTO public.investor_fee_schedule (investor_id, fund_id, fee_pct, effective_date)
SELECT p.id, f.id, (r.perf_bps::numeric / 100.0), '2024-01-01'
FROM rows r
JOIN fund_map fm ON fm.legacy_code = r.legacy_code
JOIN public.funds f ON f.code = fm.ind_code
JOIN public.profiles p
  ON lower(trim(coalesce(p.first_name,''))) || ' ' || lower(trim(coalesce(p.last_name,''))) = lower(r.name)
WHERE p.email NOT IN ('testadmin@indigo.fund','test_auth_insert@test.com','testinvestor@indigo.fund','hammadou@indigo.fund')
ON CONFLICT (investor_id, fund_id, effective_date)
DO UPDATE SET fee_pct = EXCLUDED.fee_pct, updated_at = now();

-- Fill gaps: any investor/fund pair seen in positions/transactions without a fee gets default 20%
WITH pairs AS (
  SELECT investor_id, fund_id FROM public.investor_positions
  UNION
  SELECT investor_id, fund_id FROM public.transactions_v2
),
missing AS (
  SELECT DISTINCT p.investor_id, p.fund_id
  FROM pairs p
  LEFT JOIN public.investor_fee_schedule fs
    ON fs.investor_id = p.investor_id AND fs.fund_id = p.fund_id
  WHERE fs.investor_id IS NULL
),
defaults AS (
  SELECT m.investor_id, m.fund_id, '2024-01-01'::date AS effective_date,
         20.0::numeric AS fee_pct  -- 2000 bps default
  FROM missing m
)
INSERT INTO public.investor_fee_schedule (investor_id, fund_id, fee_pct, effective_date)
SELECT investor_id, fund_id, fee_pct, effective_date FROM defaults
ON CONFLICT (investor_id, fund_id, effective_date) DO NOTHING;

-- Coverage check: list gaps (should return zero rows)
-- SELECT p.email, f.code
-- FROM public.profiles p
-- JOIN public.investor_positions ip ON ip.investor_id = p.id
-- JOIN public.funds f ON f.id = ip.fund_id
-- WHERE NOT EXISTS (
--   SELECT 1 FROM public.investor_fee_schedule fs
--   WHERE fs.investor_id = p.id AND fs.fund_id = f.id
-- );
