
-- ==========================================
-- PLATFORM AUDIT FIX: IB Rates, Fund Configs, AUM
-- ==========================================

-- ==========================================
-- FIX 1: Update IB commission rates
-- ==========================================

-- Lars Ahlgreen: Set IB commission to 5%
UPDATE profiles
SET ib_percentage = 5.00,
    updated_at = now()
WHERE id = '4ecade70-05ad-4661-8f65-83b1e56b1c17';

-- testAdmin IB: Set IB commission to 10%
UPDATE profiles
SET ib_percentage = 10.00,
    updated_at = now()
WHERE id = 'f850ed52-e5c0-4982-94b5-3131b90861fb';

-- ==========================================
-- FIX 2: Create missing fund_configurations records
-- Using appropriate benchmark types: BTC, ETH, STABLE, CUSTOM
-- ==========================================

-- Bitcoin Yield Fund
INSERT INTO fund_configurations (code, name, currency, inception_date, mgmt_fee_bps, perf_fee_bps, status, benchmark)
VALUES ('IND-BTC', 'Bitcoin Yield Fund', 'BTC', '2024-01-01', 200, 2000, 'active', 'BTC')
ON CONFLICT (code) DO UPDATE SET
  mgmt_fee_bps = EXCLUDED.mgmt_fee_bps,
  perf_fee_bps = EXCLUDED.perf_fee_bps,
  updated_at = now();

-- Ethereum Yield Fund
INSERT INTO fund_configurations (code, name, currency, inception_date, mgmt_fee_bps, perf_fee_bps, status, benchmark)
VALUES ('IND-ETH', 'Ethereum Yield Fund', 'ETH', '2024-01-01', 200, 2000, 'active', 'ETH')
ON CONFLICT (code) DO UPDATE SET
  mgmt_fee_bps = EXCLUDED.mgmt_fee_bps,
  perf_fee_bps = EXCLUDED.perf_fee_bps,
  updated_at = now();

-- Stablecoin Fund (USDT)
INSERT INTO fund_configurations (code, name, currency, inception_date, mgmt_fee_bps, perf_fee_bps, status, benchmark)
VALUES ('IND-USDT', 'Stablecoin Fund', 'USDT', '2024-01-01', 200, 2000, 'active', 'STABLE')
ON CONFLICT (code) DO UPDATE SET
  mgmt_fee_bps = EXCLUDED.mgmt_fee_bps,
  perf_fee_bps = EXCLUDED.perf_fee_bps,
  updated_at = now();

-- Euro Yield Fund
INSERT INTO fund_configurations (code, name, currency, inception_date, mgmt_fee_bps, perf_fee_bps, status, benchmark)
VALUES ('IND-EURC', 'Euro Yield Fund', 'EURC', '2024-01-01', 200, 2000, 'active', 'STABLE')
ON CONFLICT (code) DO UPDATE SET
  mgmt_fee_bps = EXCLUDED.mgmt_fee_bps,
  perf_fee_bps = EXCLUDED.perf_fee_bps,
  updated_at = now();

-- Solana Yield Fund
INSERT INTO fund_configurations (code, name, currency, inception_date, mgmt_fee_bps, perf_fee_bps, status, benchmark)
VALUES ('IND-SOL', 'Solana Yield Fund', 'SOL', '2024-01-01', 200, 2000, 'active', 'CUSTOM')
ON CONFLICT (code) DO UPDATE SET
  mgmt_fee_bps = EXCLUDED.mgmt_fee_bps,
  perf_fee_bps = EXCLUDED.perf_fee_bps,
  updated_at = now();

-- Ripple Yield Fund
INSERT INTO fund_configurations (code, name, currency, inception_date, mgmt_fee_bps, perf_fee_bps, status, benchmark)
VALUES ('IND-XRP', 'Ripple Yield Fund', 'XRP', '2024-01-01', 200, 2000, 'active', 'CUSTOM')
ON CONFLICT (code) DO UPDATE SET
  mgmt_fee_bps = EXCLUDED.mgmt_fee_bps,
  perf_fee_bps = EXCLUDED.perf_fee_bps,
  updated_at = now();

-- Tokenized Gold Fund
INSERT INTO fund_configurations (code, name, currency, inception_date, mgmt_fee_bps, perf_fee_bps, status, benchmark)
VALUES ('IND-XAUT', 'Tokenized Gold', 'xAUT', '2024-01-01', 200, 2000, 'active', 'CUSTOM')
ON CONFLICT (code) DO UPDATE SET
  mgmt_fee_bps = EXCLUDED.mgmt_fee_bps,
  perf_fee_bps = EXCLUDED.perf_fee_bps,
  updated_at = now();

-- ==========================================
-- FIX 3: Update fund_daily_aum for funds with positions
-- ==========================================

-- Insert current AUM for Bitcoin Yield Fund
INSERT INTO fund_daily_aum (fund_id, aum_date, total_aum, source, purpose)
VALUES (
  '0a048d9b-c4cf-46eb-b428-59e10307df93',
  CURRENT_DATE,
  255.0,
  'audit_correction',
  'reporting'
)
ON CONFLICT (fund_id, aum_date, purpose) DO UPDATE SET
  total_aum = 255.0,
  source = 'audit_correction',
  updated_at = now();

-- Insert current AUM for Stablecoin Fund
INSERT INTO fund_daily_aum (fund_id, aum_date, total_aum, source, purpose)
VALUES (
  '8ef9dc49-e76c-4882-84ab-a449ef4326db',
  CURRENT_DATE,
  271453.5,
  'audit_correction',
  'reporting'
)
ON CONFLICT (fund_id, aum_date, purpose) DO UPDATE SET
  total_aum = 271453.5,
  source = 'audit_correction',
  updated_at = now();
