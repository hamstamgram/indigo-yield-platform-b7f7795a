-- Migration: IB commission schedule fund-specific activation dates
-- Date: 2026-02-28
--
-- From V5_VS_EXCEL_COMPREHENSIVE_AUDIT.md Discrepancy #2:
-- IB parents only receive commissions starting from specific dates per fund.
-- Before activation, the IB% is included in the fee (total deduction stays the same).
--
-- Strategy:
-- 1. Insert ib_commission_schedule entries with fund-specific effective_date
--    -> get_investor_ib_pct() returns 0 before effective_date (no schedule match, no fallback)
-- 2. Insert investor_fee_schedule entries for pre-activation periods with combined rate (fee + IB)
--    -> get_investor_fee_pct() returns the higher combined rate before IB activation
-- 3. Insert investor_fee_schedule entries at activation date with the base fee rate
--    -> get_investor_fee_pct() returns the lower base rate after IB activation
--
-- This ensures total_deduction = fee% + ib% is constant regardless of IB activation.
--
-- IB Relationships from seed data:
--   Babak Eftekhari -> Lars Ahlgreen (2% IB, 18% fee = 20% total)
--   Advantage Blockchain -> Alec Beckman (2% IB, 18% fee = 20% total)
--   Sam Johnson -> Ryan Van Der Wall (4% IB, 16% fee = 20% total)
--   Paul Johnson -> Alex Jacobs (1.5% IB, 13.5% fee = 15% total)
--   Ventures Life Style -> Joel Barbeau (4% IB, 16% fee = 20% total)

-- First, remove any existing profile-level ib_percentage to force schedule-based lookups only.
-- This prevents fallback to profile.ib_percentage when no schedule row matches.
-- We'll set profile ib_percentage to NULL so only schedule controls IB activation.

-- Step 1: Clear existing ib_commission_schedule (we'll re-create with fund-specific dates)
DELETE FROM ib_commission_schedule WHERE true;

-- Step 2: Insert fund-specific IB activation entries
-- Each entry means: IB parent starts receiving commission on this fund from this date

-- === Babak Eftekhari (IB parent: Lars Ahlgreen, 2%) ===
-- ETH: starts Sep 2025
INSERT INTO ib_commission_schedule (investor_id, fund_id, ib_percentage, effective_date)
SELECT p.id, f.id, 2, '2025-09-01'
FROM profiles p, funds f
WHERE p.email = 'babak.eftekhari@indigo.fund' AND f.asset = 'ETH';

-- USDT: starts Jul 2025
INSERT INTO ib_commission_schedule (investor_id, fund_id, ib_percentage, effective_date)
SELECT p.id, f.id, 2, '2025-07-01'
FROM profiles p, funds f
WHERE p.email = 'babak.eftekhari@indigo.fund' AND f.asset = 'USDT';

-- === Advantage Blockchain (IB parent: Alec Beckman, 2%) ===
-- ETH: starts Sep 2025
INSERT INTO ib_commission_schedule (investor_id, fund_id, ib_percentage, effective_date)
SELECT p.id, f.id, 2, '2025-09-01'
FROM profiles p, funds f
WHERE p.email = 'advantage.blockchain@indigo.fund' AND f.asset = 'ETH';

-- === Sam Johnson (IB parent: Ryan Van Der Wall, 4%) ===
-- BTC: starts Nov 2025
INSERT INTO ib_commission_schedule (investor_id, fund_id, ib_percentage, effective_date)
SELECT p.id, f.id, 4, '2025-11-01'
FROM profiles p, funds f
WHERE p.email = 'sam.johnson@indigo.fund' AND f.asset = 'BTC';

-- ETH: starts Sep 2025
INSERT INTO ib_commission_schedule (investor_id, fund_id, ib_percentage, effective_date)
SELECT p.id, f.id, 4, '2025-09-01'
FROM profiles p, funds f
WHERE p.email = 'sam.johnson@indigo.fund' AND f.asset = 'ETH';

-- USDT: starts Jul 2025
INSERT INTO ib_commission_schedule (investor_id, fund_id, ib_percentage, effective_date)
SELECT p.id, f.id, 4, '2025-07-01'
FROM profiles p, funds f
WHERE p.email = 'sam.johnson@indigo.fund' AND f.asset = 'USDT';

-- SOL: starts Sep 2025
INSERT INTO ib_commission_schedule (investor_id, fund_id, ib_percentage, effective_date)
SELECT p.id, f.id, 4, '2025-09-01'
FROM profiles p, funds f
WHERE p.email = 'sam.johnson@indigo.fund' AND f.asset = 'SOL';

-- XRP: starts Nov 2025
INSERT INTO ib_commission_schedule (investor_id, fund_id, ib_percentage, effective_date)
SELECT p.id, f.id, 4, '2025-11-01'
FROM profiles p, funds f
WHERE p.email = 'sam.johnson@indigo.fund' AND f.asset = 'XRP';

-- === Paul Johnson (IB parent: Alex Jacobs, 1.5%) ===
-- ETH: starts Sep 2025
INSERT INTO ib_commission_schedule (investor_id, fund_id, ib_percentage, effective_date)
SELECT p.id, f.id, 1.5, '2025-09-01'
FROM profiles p, funds f
WHERE p.email = 'paul.johnson@indigo.fund' AND f.asset = 'ETH';

-- SOL: starts Sep 2025
INSERT INTO ib_commission_schedule (investor_id, fund_id, ib_percentage, effective_date)
SELECT p.id, f.id, 1.5, '2025-09-01'
FROM profiles p, funds f
WHERE p.email = 'paul.johnson@indigo.fund' AND f.asset = 'SOL';

-- BTC: starts Nov 2025 (same pattern as Sam's BTC)
INSERT INTO ib_commission_schedule (investor_id, fund_id, ib_percentage, effective_date)
SELECT p.id, f.id, 1.5, '2025-11-01'
FROM profiles p, funds f
WHERE p.email = 'paul.johnson@indigo.fund' AND f.asset = 'BTC';

-- === Ventures Life Style (IB parent: Joel Barbeau, 4%) ===
-- USDT: starts Jul 2025
INSERT INTO ib_commission_schedule (investor_id, fund_id, ib_percentage, effective_date)
SELECT p.id, f.id, 4, '2025-07-01'
FROM profiles p, funds f
WHERE p.email = 'ventures.lifestyle@indigo.fund' AND f.asset = 'USDT';


-- Step 3: Set profile ib_percentage to NULL so only schedule-based lookups apply.
-- This prevents _resolve_investor_ib_pct from falling through to profile.ib_percentage
-- when no schedule row matches (i.e., before activation date).
UPDATE profiles SET ib_percentage = NULL
WHERE email IN (
  'babak.eftekhari@indigo.fund',
  'advantage.blockchain@indigo.fund',
  'sam.johnson@indigo.fund',
  'paul.johnson@indigo.fund',
  'ventures.lifestyle@indigo.fund'
);


-- Step 4: Insert investor_fee_schedule entries for pre-activation periods.
-- Before IB activation, the total deduction must still match the Excel.
-- fee_pct on profile = base rate (e.g., 18% for Babak).
-- Before IB activation: total deduction = fee + ib = 20%, ALL goes to fees_account.
-- So we need a fee_schedule entry with 20% until IB activation date.

-- For this, we insert entries at the fund inception (or earliest tx date) with combined rate,
-- then at activation date with the base rate.

-- === Babak Eftekhari: fee=18% normally, fee=20% before IB activation ===
-- ETH: 20% until Sep 2025, then 18%
INSERT INTO investor_fee_schedule (investor_id, fund_id, fee_pct, effective_date)
SELECT p.id, f.id, 20, '2024-01-01'
FROM profiles p, funds f
WHERE p.email = 'babak.eftekhari@indigo.fund' AND f.asset = 'ETH'
ON CONFLICT DO NOTHING;

INSERT INTO investor_fee_schedule (investor_id, fund_id, fee_pct, effective_date)
SELECT p.id, f.id, 18, '2025-09-01'
FROM profiles p, funds f
WHERE p.email = 'babak.eftekhari@indigo.fund' AND f.asset = 'ETH'
ON CONFLICT DO NOTHING;

-- USDT: 20% until Jul 2025, then 18%
INSERT INTO investor_fee_schedule (investor_id, fund_id, fee_pct, effective_date)
SELECT p.id, f.id, 20, '2024-01-01'
FROM profiles p, funds f
WHERE p.email = 'babak.eftekhari@indigo.fund' AND f.asset = 'USDT'
ON CONFLICT DO NOTHING;

INSERT INTO investor_fee_schedule (investor_id, fund_id, fee_pct, effective_date)
SELECT p.id, f.id, 18, '2025-07-01'
FROM profiles p, funds f
WHERE p.email = 'babak.eftekhari@indigo.fund' AND f.asset = 'USDT'
ON CONFLICT DO NOTHING;

-- === Advantage Blockchain: fee=18% normally, fee=20% before IB activation ===
-- ETH: 20% until Sep 2025, then 18%
INSERT INTO investor_fee_schedule (investor_id, fund_id, fee_pct, effective_date)
SELECT p.id, f.id, 20, '2024-01-01'
FROM profiles p, funds f
WHERE p.email = 'advantage.blockchain@indigo.fund' AND f.asset = 'ETH'
ON CONFLICT DO NOTHING;

INSERT INTO investor_fee_schedule (investor_id, fund_id, fee_pct, effective_date)
SELECT p.id, f.id, 18, '2025-09-01'
FROM profiles p, funds f
WHERE p.email = 'advantage.blockchain@indigo.fund' AND f.asset = 'ETH'
ON CONFLICT DO NOTHING;

-- === Sam Johnson: fee=16% normally, fee=20% before IB activation ===
-- BTC: 20% until Nov 2025, then 16%
INSERT INTO investor_fee_schedule (investor_id, fund_id, fee_pct, effective_date)
SELECT p.id, f.id, 20, '2024-01-01'
FROM profiles p, funds f
WHERE p.email = 'sam.johnson@indigo.fund' AND f.asset = 'BTC'
ON CONFLICT DO NOTHING;

INSERT INTO investor_fee_schedule (investor_id, fund_id, fee_pct, effective_date)
SELECT p.id, f.id, 16, '2025-11-01'
FROM profiles p, funds f
WHERE p.email = 'sam.johnson@indigo.fund' AND f.asset = 'BTC'
ON CONFLICT DO NOTHING;

-- ETH: 20% until Sep 2025, then 16%
INSERT INTO investor_fee_schedule (investor_id, fund_id, fee_pct, effective_date)
SELECT p.id, f.id, 20, '2024-01-01'
FROM profiles p, funds f
WHERE p.email = 'sam.johnson@indigo.fund' AND f.asset = 'ETH'
ON CONFLICT DO NOTHING;

INSERT INTO investor_fee_schedule (investor_id, fund_id, fee_pct, effective_date)
SELECT p.id, f.id, 16, '2025-09-01'
FROM profiles p, funds f
WHERE p.email = 'sam.johnson@indigo.fund' AND f.asset = 'ETH'
ON CONFLICT DO NOTHING;

-- USDT: 20% until Jul 2025, then 16%
INSERT INTO investor_fee_schedule (investor_id, fund_id, fee_pct, effective_date)
SELECT p.id, f.id, 20, '2024-01-01'
FROM profiles p, funds f
WHERE p.email = 'sam.johnson@indigo.fund' AND f.asset = 'USDT'
ON CONFLICT DO NOTHING;

INSERT INTO investor_fee_schedule (investor_id, fund_id, fee_pct, effective_date)
SELECT p.id, f.id, 16, '2025-07-01'
FROM profiles p, funds f
WHERE p.email = 'sam.johnson@indigo.fund' AND f.asset = 'USDT'
ON CONFLICT DO NOTHING;

-- SOL: 20% until Sep 2025, then 16%
INSERT INTO investor_fee_schedule (investor_id, fund_id, fee_pct, effective_date)
SELECT p.id, f.id, 20, '2024-01-01'
FROM profiles p, funds f
WHERE p.email = 'sam.johnson@indigo.fund' AND f.asset = 'SOL'
ON CONFLICT DO NOTHING;

INSERT INTO investor_fee_schedule (investor_id, fund_id, fee_pct, effective_date)
SELECT p.id, f.id, 16, '2025-09-01'
FROM profiles p, funds f
WHERE p.email = 'sam.johnson@indigo.fund' AND f.asset = 'SOL'
ON CONFLICT DO NOTHING;

-- XRP: 20% until Nov 2025, then 16%
INSERT INTO investor_fee_schedule (investor_id, fund_id, fee_pct, effective_date)
SELECT p.id, f.id, 20, '2024-01-01'
FROM profiles p, funds f
WHERE p.email = 'sam.johnson@indigo.fund' AND f.asset = 'XRP'
ON CONFLICT DO NOTHING;

INSERT INTO investor_fee_schedule (investor_id, fund_id, fee_pct, effective_date)
SELECT p.id, f.id, 16, '2025-11-01'
FROM profiles p, funds f
WHERE p.email = 'sam.johnson@indigo.fund' AND f.asset = 'XRP'
ON CONFLICT DO NOTHING;

-- === Paul Johnson: fee=13.5% normally, fee=15% before IB activation ===
-- ETH: 15% until Sep 2025, then 13.5%
INSERT INTO investor_fee_schedule (investor_id, fund_id, fee_pct, effective_date)
SELECT p.id, f.id, 15, '2024-01-01'
FROM profiles p, funds f
WHERE p.email = 'paul.johnson@indigo.fund' AND f.asset = 'ETH'
ON CONFLICT DO NOTHING;

INSERT INTO investor_fee_schedule (investor_id, fund_id, fee_pct, effective_date)
SELECT p.id, f.id, 13.5, '2025-09-01'
FROM profiles p, funds f
WHERE p.email = 'paul.johnson@indigo.fund' AND f.asset = 'ETH'
ON CONFLICT DO NOTHING;

-- SOL: 15% until Sep 2025, then 13.5%
INSERT INTO investor_fee_schedule (investor_id, fund_id, fee_pct, effective_date)
SELECT p.id, f.id, 15, '2024-01-01'
FROM profiles p, funds f
WHERE p.email = 'paul.johnson@indigo.fund' AND f.asset = 'SOL'
ON CONFLICT DO NOTHING;

INSERT INTO investor_fee_schedule (investor_id, fund_id, fee_pct, effective_date)
SELECT p.id, f.id, 13.5, '2025-09-01'
FROM profiles p, funds f
WHERE p.email = 'paul.johnson@indigo.fund' AND f.asset = 'SOL'
ON CONFLICT DO NOTHING;

-- BTC: 15% until Nov 2025, then 13.5%
INSERT INTO investor_fee_schedule (investor_id, fund_id, fee_pct, effective_date)
SELECT p.id, f.id, 15, '2024-01-01'
FROM profiles p, funds f
WHERE p.email = 'paul.johnson@indigo.fund' AND f.asset = 'BTC'
ON CONFLICT DO NOTHING;

INSERT INTO investor_fee_schedule (investor_id, fund_id, fee_pct, effective_date)
SELECT p.id, f.id, 13.5, '2025-11-01'
FROM profiles p, funds f
WHERE p.email = 'paul.johnson@indigo.fund' AND f.asset = 'BTC'
ON CONFLICT DO NOTHING;

-- === Ventures Life Style: fee=16% normally, fee=20% before IB activation ===
-- USDT: 20% until Jul 2025, then 16%
INSERT INTO investor_fee_schedule (investor_id, fund_id, fee_pct, effective_date)
SELECT p.id, f.id, 20, '2024-01-01'
FROM profiles p, funds f
WHERE p.email = 'ventures.lifestyle@indigo.fund' AND f.asset = 'USDT'
ON CONFLICT DO NOTHING;

INSERT INTO investor_fee_schedule (investor_id, fund_id, fee_pct, effective_date)
SELECT p.id, f.id, 16, '2025-07-01'
FROM profiles p, funds f
WHERE p.email = 'ventures.lifestyle@indigo.fund' AND f.asset = 'USDT'
ON CONFLICT DO NOTHING;
