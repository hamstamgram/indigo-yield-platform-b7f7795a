-- ====================================================================
-- HISTORICAL DATA IMPORT MIGRATION
-- Generated: 2025-12-07
-- Source: Copy of Accounting Yield Funds.xlsx
-- ====================================================================
-- IMPORTANT: All balances are in NATIVE TOKENS (not USD)
-- BTC balances are in BTC, ETH in ETH, USDT in USDT, etc.
-- ====================================================================

-- STEP 1: Ensure funds exist with correct asset codes

INSERT INTO funds (code, name, asset, fund_class, inception_date, status)
VALUES 
  ('BTCYF', 'BTC Yield Fund', 'BTC', 'Yield', '2024-08-01', 'active'),
  ('ETHYF', 'ETH Yield Fund', 'ETH', 'Yield', '2025-05-26', 'active'),
  ('USDTYF', 'USDT Yield Fund', 'USDT', 'Yield', '2025-06-16', 'active'),
  ('SOLYF', 'SOL Yield Fund', 'SOL', 'Yield', '2025-09-02', 'active'),
  ('XRPYF', 'XRP Yield Fund', 'XRP', 'Yield', '2025-11-17', 'active')
ON CONFLICT (code) DO UPDATE SET status = 'active';

-- STEP 2: Create staging tables

CREATE TABLE IF NOT EXISTS staging_investor_import (
  investor_name TEXT NOT NULL,
  asset TEXT NOT NULL,
  balance NUMERIC NOT NULL,
  deposited NUMERIC DEFAULT 0,
  fee_percentage NUMERIC DEFAULT 0.20,
  PRIMARY KEY (investor_name, asset)
);

CREATE TABLE IF NOT EXISTS staging_transactions_import (
  tx_date DATE NOT NULL,
  investor_name TEXT NOT NULL,
  asset TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  notes TEXT
);

-- STEP 3: Insert investor balances (ALL IN NATIVE TOKENS)
INSERT INTO staging_investor_import (investor_name, asset, balance, fee_percentage) VALUES
  ('Advantage Blockchain', 'ETH', 32.77317929, 0.18),
  ('Alain Bensimon', 'USDT', 141585.66700000, 0.1),
  ('Alec Beckman', 'ETH', 0.01953308, 0.2),
  ('Alex Jacobs', 'ETH', 0.00335081, 0.2),
  ('Alex Jacobs', 'SOL', 0.03317584, 0.2),
  ('Anne Cecile Noique', 'USDT', 230583.43710000, 0.1),
  ('Babak Eftekhari', 'ETH', 68.50618959, 0.18),
  ('Babak Eftekhari', 'USDT', 240662.65790000, 0.18),
  ('Blondish', 'BTC', 4.15980575, 0.0),
  ('Blondish', 'ETH', 128.80894140, 0.0),
  ('Bo De kriek', 'USDT', 284219.25050000, 0.1),
  ('Brandon Hood', 'ETH', 31.37000000, 0.2),
  ('Daniele Francilia', 'USDT', 113950.52880000, 0.1),
  ('Danielle Richetta', 'BTC', 4.38981604, 0.1),
  ('Dario Deiana', 'USDT', 206149.70010000, 0.2),
  ('HALLEY86', 'USDT', 101012.28460000, 0.2),
  ('Joel Barbeau', 'USDT', 3.89833383, 0.2),
  ('Jose Molla', 'BTC', 4.81326780, 0.2),
  ('Jose Molla', 'ETH', 68.10454728, 0.2),
  ('Jose Molla', 'USDT', 294.34546870, 0.2),
  ('Jose Molla', 'SOL', 88.73278289, 0.2),
  ('Julien Grunebaum', 'USDT', 113551.92620000, 0.1),
  ('Kabbaj', 'BTC', 4.55843433, 0.2),
  ('Kyle Gulamerian', 'BTC', 2.10782490, 0.15),
  ('Lars Ahlgreen', 'ETH', 0.03819555, 0.2),
  ('Lars Ahlgreen', 'USDT', 157.78250040, 0.2),
  ('Matthew Beatty', 'USDT', 345464.93310000, 0.1),
  ('Matthias Reiser', 'BTC', 4.97692978, 0.1),
  ('Monica Levy Chicheportiche', 'USDT', 844623.18060000, 0.2),
  ('Nath & Thomas', 'BTC', 1.00000000, 0.0),
  ('Nath & Thomas', 'USDT', 213259.21540000, 0.0),
  ('Nathanaël Cohen', 'BTC', 0.45254985, 0.0),
  ('Nathanaël Cohen', 'ETH', 37.37803768, 0.0),
  ('Oliver Loisel', 'BTC', 2.14278392, 0.1),
  ('Paul Johnson', 'BTC', 0.44053104, 0.135),
  ('Paul Johnson', 'ETH', 12.21734330, 0.135),
  ('Paul Johnson', 'SOL', 236.02226820, 0.135),
  ('Pierre Bezençon', 'USDT', 113490.68250000, 0.1),
  ('Rabih Mokbel', 'USDT', 100155.93340000, 0.18),
  ('Ryan Van Der Wall', 'ETH', 0.00932103, 0.2),
  ('Ryan Van Der Wall', 'SOL', 0.26805493, 0.2),
  ('Ryan Van Der Wall', 'XRP', 7.10000000, 0.2),
  ('Sacha Oshry', 'USDT', 101443.96760000, 0.15),
  ('Sam Johnson', 'BTC', 5.50114642, 0.18),
  ('Sam Johnson', 'ETH', 146.37249960, 0.18),
  ('Sam Johnson', 'SOL', 3310.75954200, 0.18),
  ('Sam Johnson', 'XRP', 229287.00000000, 0.18),
  ('Terance Chen', 'USDT', 227539.18520000, 0.1),
  ('Thomas Puech', 'BTC', 6.78824774, 0.0),
  ('Tomer Zur', 'ETH', 192.23022490, 0.2),
  ('Valeria Cruz', 'USDT', 50086.55041000, 0.2),
  ('Victoria Pariente-Cohen', 'BTC', 0.15057937, 0.0),
  ('Vivie & Liana', 'BTC', 3.41100000, 0.0);

-- STEP 4: Insert transactions (ALL IN NATIVE TOKENS)
INSERT INTO staging_transactions_import (tx_date, investor_name, asset, amount, notes) VALUES
  ('2024-06-12', 'Jose Molla', 'BTC', 2.7230, '#REF!'),
  ('2024-06-12', 'Jose Molla', 'ETH', 52.4000, '#REF!'),
  ('2024-07-08', 'Jose Molla', 'BTC', 0.7450, '#REF!'),
  ('2024-07-08', 'Jose Molla', 'ETH', 9.1000, '#REF!'),
  ('2024-08-21', 'Kyle Gulamerian', 'BTC', 0.0100, '#REF!'),
  ('2024-08-21', 'Kyle Gulamerian', 'BTC', 1.9900, '#REF!'),
  ('2024-10-01', 'Matthias Reiser', 'BTC', 4.6200, '#REF!'),
  ('2024-10-01', 'Thomas Puech', 'BTC', 6.5193, '#REF!'),
  ('2024-10-01', 'Danielle Richetta', 'BTC', 5.2000, '#REF!'),
  ('2024-10-01', 'Nathanaël Cohen', 'ETH', 17.0000, '#REF!'),
  ('2024-10-24', 'Blondish', 'ETH', 120.0000, '#REF!'),
  ('2024-11-09', 'Danielle Richetta', 'BTC', -0.2700, '#REF!'),
  ('2024-12-14', 'Danielle Richetta', 'BTC', -0.1240, '#REF!'),
  ('2025-03-01', 'Nathanaël Cohen', 'ETH', 4.6080, '#REF!'),
  ('2025-03-31', 'Nathanaël Cohen', 'ETH', 5.2260, '#REF!'),
  ('2025-04-01', 'Victoria Pariente-Cohen', 'BTC', 0.1492, '#REF!'),
  ('2025-04-01', 'Nathanaël Cohen', 'BTC', 0.4483, '#REF!'),
  ('2025-04-01', 'Blondish', 'BTC', 4.1210, '#REF!'),
  ('2025-05-13', 'Kyle Gulamerian', 'BTC', -2.1101, '#REF!'),
  ('2025-05-26', 'Babak Eftekhari', 'ETH', 27.0100, '#REF!'),
  ('2025-05-30', 'Nathanaël Cohen', 'ETH', 3.0466, '#REF!'),
  ('2025-05-30', 'Babak Eftekhari', 'ETH', 32.2500, '#REF!'),
  ('2025-05-30', 'Danielle Richetta', 'BTC', -0.1300, '#REF!'),
  ('2025-06-11', 'Kabbaj', 'BTC', 2.0000, '#REF!'),
  ('2025-06-16', 'Babak Eftekhari', 'USDT', 135726.7500, '135726.75'),
  ('2025-06-30', 'Nathanaël Cohen', 'ETH', 2.0000, '#REF!'),
  ('2025-07-11', 'Kabbaj', 'BTC', 0.9914, '#REF!'),
  ('2025-07-14', 'Julien Grunebaum', 'USDT', 109392.0000, '109392'),
  ('2025-07-14', 'Daniele Francilia', 'USDT', 109776.0000, '109776'),
  ('2025-07-14', 'Pierre Bezençon', 'USDT', 109333.0000, '109333'),
  ('2025-07-14', 'Matthew Beatty', 'USDT', 255504.0000, '255504'),
  ('2025-07-14', 'Bo De kriek', 'USDT', 273807.0000, '273807'),
  ('2025-07-17', 'Dario Deiana', 'USDT', 199659.7200, '199659.72'),
  ('2025-07-17', 'Babak Eftekhari', 'USDT', 46955.2800, '46955.28'),
  ('2025-07-23', 'Alain Bensimon', 'USDT', 136737.0000, '136737'),
  ('2025-07-23', 'Anne Cecile Noique', 'USDT', 222687.0000, '222687'),
  ('2025-07-23', 'Terance Chen', 'USDT', 219747.0000, '219747'),
  ('2025-07-24', 'Oliver Loisel', 'BTC', 2.1154, '#REF!'),
  ('2025-07-25', 'Danielle Richetta', 'BTC', -0.2600, '#REF!'),
  ('2025-07-30', 'Advantage Blockchain', 'ETH', 32.0000, '#REF!'),
  ('2025-07-31', 'Kabbaj', 'BTC', 0.6000, '#REF!'),
  ('2025-08-04', 'Babak Eftekhari', 'USDT', 10000.0000, '10000'),
  ('2025-08-14', 'Matthew Beatty', 'USDT', 25900.0000, '25900'),
  ('2025-08-20', 'Danielle Richetta', 'BTC', -0.1100, '#REF!'),
  ('2025-08-25', 'Kabbaj', 'BTC', 0.9102, '#REF!'),
  ('2025-09-04', 'Paul Johnson', 'SOL', 234.1700, '#REF!'),
  ('2025-09-04', 'Paul Johnson', 'ETH', 10.4400, '#REF!'),
  ('2025-09-10', 'Paul Johnson', 'ETH', 4.6327, '#REF!'),
  ('2025-09-12', 'Paul Johnson', 'ETH', 8.9600, '#REF!'),
  ('2025-09-12', 'Nathanaël Cohen', 'ETH', 3.3500, '#REF!'),
  ('2025-09-24', 'Babak Eftekhari', 'USDT', 10000.0000, '10000'),
  ('2025-09-27', 'Tomer Zur', 'ETH', 63.1000, '#REF!'),
  ('2025-10-03', 'Paul Johnson', 'BTC', 0.4395, '#REF!'),
  ('2025-10-03', 'Paul Johnson', 'SOL', -236.0200, '#REF!'),
  ('2025-10-03', 'Paul Johnson', 'ETH', -12.0000, '#REF!'),
  ('2025-10-06', 'Sacha Oshry', 'USDT', 100000.0000, '100000'),
  ('2025-10-08', 'Tomer Zur', 'ETH', 10.0510, '#REF!'),
  ('2025-10-09', 'Babak Eftekhari', 'USDT', 20000.0000, '20000'),
  ('2025-10-14', 'Tomer Zur', 'ETH', 64.2700, '#REF!'),
  ('2025-10-14', 'Babak Eftekhari', 'ETH', 3.7500, '#REF!'),
  ('2025-10-15', 'HALLEY86', 'USDT', 99990.0000, '99990'),
  ('2025-10-17', 'Babak Eftekhari', 'ETH', 3.1000, '#REF!'),
  ('2025-10-20', 'Tomer Zur', 'ETH', 6.5417, '#REF!'),
  ('2025-10-23', 'Jose Molla', 'ETH', 1.2000, '#REF!'),
  ('2025-10-23', 'Tomer Zur', 'ETH', 6.4000, '#REF!'),
  ('2025-10-23', 'Jose Molla', 'SOL', 87.9800, '#REF!'),
  ('2025-10-23', 'Jose Molla', 'BTC', 0.0620, '#REF!'),
  ('2025-10-23', 'Jose Molla', 'USDT', 97695.0000, '97695'),
  ('2025-10-23', 'Babak Eftekhari', 'USDT', 10450.0000, '10450'),
  ('2025-11-03', 'Jose Molla', 'ETH', 2.5064, '#REF!'),
  ('2025-11-03', 'Nathanaël Cohen', 'ETH', 1.0677, '#REF!'),
  ('2025-11-03', 'Blondish', 'ETH', 4.7940, '#REF!'),
  ('2025-11-04', 'Tomer Zur', 'ETH', 6.9519, '#REF!'),
  ('2025-11-04', 'Matthew Beatty', 'USDT', 35300.0000, '35300'),
  ('2025-11-05', 'Tomer Zur', 'ETH', 7.6215, '#REF!'),
  ('2025-11-05', 'Danielle Richetta', 'BTC', -0.2830, '#REF!'),
  ('2025-11-05', 'Paul Johnson', 'BTC', -0.4408, '#REF!'),
  ('2025-11-05', 'Paul Johnson', 'ETH', -12.2200, '#REF!'),
  ('2025-11-07', 'Monica Levy Chicheportiche', 'USDT', 840168.0300, '840168.03'),
  ('2025-11-07', 'Tomer Zur', 'ETH', 10.2240, '#REF!'),
  ('2025-11-08', 'Jose Molla', 'USDT', -50000.0000, '-50000'),
  ('2025-11-08', 'Jose Molla', 'BTC', 0.4867, '#REF!'),
  ('2025-11-13', 'Nath & Thomas', 'USDT', 299915.7700, '299915.77'),
  ('2025-11-17', 'Sam Johnson', 'BTC', 3.3000, '#REF!'),
  ('2025-11-17', 'Sam Johnson', 'ETH', 78.0000, '#REF!'),
  ('2025-11-17', 'Sam Johnson', 'SOL', 1800.0500, '#REF!'),
  ('2025-11-17', 'Sam Johnson', 'XRP', 135003.0000, '#REF!'),
  ('2025-11-17', 'Tomer Zur', 'ETH', 6.2340, '#REF!'),
  ('2025-11-21', 'Jose Molla', 'USDT', -47908.0000, '-47908'),
  ('2025-11-25', 'Sam Johnson', 'BTC', 1.0000, '#REF!'),
  ('2025-11-25', 'Sam Johnson', 'XRP', 49000.0000, '#REF!'),
  ('2025-11-25', 'Sam Johnson', 'SOL', 750.0000, '#REF!'),
  ('2025-11-25', 'Sam Johnson', 'ETH', 35.0000, '#REF!'),
  ('2025-11-25', 'Jose Molla', 'BTC', 0.5480, '#REF!'),
  ('2025-11-25', 'Valeria Cruz', 'USDT', 50000.0000, '50000'),
  ('2025-11-26', 'Matthew Beatty', 'USDT', 18000.0000, '18000'),
  ('2025-11-26', 'Nath & Thomas', 'USDT', -87937.0000, '-87937'),
  ('2025-11-27', 'Rabih Mokbel', 'USDT', 100000.0000, '100000'),
  ('2025-11-27', 'Nath & Thomas', 'BTC', 1.0000, '#REF!'),
  ('2025-11-27', 'Vivie & Liana', 'BTC', 3.4110, '#REF!'),
  ('2025-11-30', 'Sam Johnson', 'BTC', 1.2000, '#REF!'),
  ('2025-11-30', 'Sam Johnson', 'XRP', 45000.0000, '#REF!'),
  ('2025-11-30', 'Sam Johnson', 'SOL', 750.0000, '#REF!'),
  ('2025-11-30', 'Sam Johnson', 'ETH', 33.0000, '#REF!'),
  ('2025-12-02', 'Tomer Zur', 'ETH', 9.1430, '#REF!'),
  ('2025-12-04', 'Brandon Hood', 'ETH', 31.3700, '#REF!');

-- STEP 5: Import positions

INSERT INTO investor_positions (investor_id, fund_id, shares, current_value, cost_basis, unrealized_pnl)
SELECT 
  p.id as investor_id,
  f.id as fund_id,
  s.balance as shares,
  s.balance as current_value,
  COALESCE((
    SELECT SUM(amount) 
    FROM staging_transactions_import t 
    WHERE t.investor_name = s.investor_name 
      AND t.asset = s.asset 
      AND t.amount > 0
  ), s.balance * 0.95) as cost_basis,
  s.balance - COALESCE((
    SELECT SUM(amount) 
    FROM staging_transactions_import t 
    WHERE t.investor_name = s.investor_name 
      AND t.asset = s.asset 
      AND t.amount > 0
  ), s.balance * 0.95) as unrealized_pnl
FROM staging_investor_import s
JOIN profiles p ON LOWER(CONCAT(p.first_name, ' ', p.last_name)) = LOWER(s.investor_name)
JOIN funds f ON f.asset = s.asset
ON CONFLICT (investor_id, fund_id) 
DO UPDATE SET 
  shares = EXCLUDED.shares,
  current_value = EXCLUDED.current_value,
  cost_basis = EXCLUDED.cost_basis,
  unrealized_pnl = EXCLUDED.unrealized_pnl;

-- STEP 6: Import transactions

INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, tx_date, value_date, asset, notes)
SELECT 
  p.id as investor_id,
  f.id as fund_id,
  CASE WHEN t.amount > 0 THEN 'DEPOSIT' ELSE 'WITHDRAWAL' END as type,
  ABS(t.amount) as amount,
  t.tx_date,
  t.tx_date as value_date,
  t.asset,
  COALESCE(NULLIF(t.notes, ''), 'Historical import') as notes
FROM staging_transactions_import t
JOIN profiles p ON LOWER(CONCAT(p.first_name, ' ', p.last_name)) = LOWER(t.investor_name)
JOIN funds f ON f.asset = t.asset
ON CONFLICT DO NOTHING;

-- STEP 7: Verification

SELECT f.asset, SUM(ip.current_value) as total_aum, COUNT(DISTINCT ip.investor_id) as investors
FROM investor_positions ip JOIN funds f ON f.id = ip.fund_id GROUP BY f.asset;
-- Expected: BTC: 44.89, ETH: 717.83, SOL: 3635.82, USDT: 3428235, XRP: 229294
