-- Increase financial column precision from numeric(28,10) to numeric(38,18)
--
-- ROOT CAUSE: yield amounts stored with 10 decimal places introduce ~1e-10 rounding
-- per investor per event. Over 40+ yield events, this compounds into visible AUM drift
-- (e.g., -0.0000371 BTC after 8 events), which causes Indigo Fees balances to diverge
-- from the Excel expected values by up to 0.009 USDT.
--
-- FIX: increase storage precision to 18 decimal places, which pushes rounding errors
-- to ~1e-18 per operation — effectively zero for financial purposes.
-- IEEE 754 doubles (used by Excel) have ~15.9 significant digits, so 18dp is sufficient.

BEGIN;

-- 1. Core ledger (source of truth)
ALTER TABLE transactions_v2
  ALTER COLUMN amount TYPE numeric(38,18),
  ALTER COLUMN balance_before TYPE numeric(38,18),
  ALTER COLUMN balance_after TYPE numeric(38,18);

-- 2. Derived positions (driven by fn_ledger_drives_position trigger)
ALTER TABLE investor_positions
  ALTER COLUMN current_value TYPE numeric(38,18),
  ALTER COLUMN cost_basis TYPE numeric(38,18),
  ALTER COLUMN shares TYPE numeric(38,18),
  ALTER COLUMN cumulative_yield_earned TYPE numeric(38,18),
  ALTER COLUMN high_water_mark TYPE numeric(38,18),
  ALTER COLUMN mgmt_fees_paid TYPE numeric(38,18),
  ALTER COLUMN perf_fees_paid TYPE numeric(38,18),
  ALTER COLUMN realized_pnl TYPE numeric(38,18),
  ALTER COLUMN unrealized_pnl TYPE numeric(38,18);

-- 3. Yield distribution headers
ALTER TABLE yield_distributions
  ALTER COLUMN opening_aum TYPE numeric(38,18),
  ALTER COLUMN recorded_aum TYPE numeric(38,18),
  ALTER COLUMN closing_aum TYPE numeric(38,18),
  ALTER COLUMN gross_yield_amount TYPE numeric(38,18),
  ALTER COLUMN total_net_amount TYPE numeric(38,18),
  ALTER COLUMN total_fee_amount TYPE numeric(38,18),
  ALTER COLUMN total_ib_amount TYPE numeric(38,18),
  ALTER COLUMN dust_amount TYPE numeric(38,18),
  ALTER COLUMN gross_yield TYPE numeric(38,18),
  ALTER COLUMN net_yield TYPE numeric(38,18),
  ALTER COLUMN total_fees TYPE numeric(38,18),
  ALTER COLUMN total_ib TYPE numeric(38,18),
  ALTER COLUMN total_fee_credit TYPE numeric(38,18),
  ALTER COLUMN total_ib_credit TYPE numeric(38,18),
  ALTER COLUMN previous_aum TYPE numeric(38,18);

-- 4. Yield allocation details (per-investor)
ALTER TABLE yield_allocations
  ALTER COLUMN position_value_at_calc TYPE numeric(38,18),
  ALTER COLUMN ownership_pct TYPE numeric(38,18),
  ALTER COLUMN gross_amount TYPE numeric(38,18),
  ALTER COLUMN fee_amount TYPE numeric(38,18),
  ALTER COLUMN ib_amount TYPE numeric(38,18),
  ALTER COLUMN net_amount TYPE numeric(38,18),
  ALTER COLUMN fee_credit TYPE numeric(38,18),
  ALTER COLUMN ib_credit TYPE numeric(38,18),
  ALTER COLUMN adb_share TYPE numeric(38,18),
  ALTER COLUMN fee_pct TYPE numeric(38,18),
  ALTER COLUMN ib_pct TYPE numeric(38,18);

-- 5. Fee allocation details
ALTER TABLE fee_allocations
  ALTER COLUMN base_net_income TYPE numeric(38,18),
  ALTER COLUMN fee_percentage TYPE numeric(38,18),
  ALTER COLUMN fee_amount TYPE numeric(38,18);

-- 6. IB allocation details
ALTER TABLE ib_allocations
  ALTER COLUMN source_net_income TYPE numeric(38,18),
  ALTER COLUMN ib_percentage TYPE numeric(38,18),
  ALTER COLUMN ib_fee_amount TYPE numeric(38,18);

-- 7. IB commission ledger
ALTER TABLE ib_commission_ledger
  ALTER COLUMN gross_yield_amount TYPE numeric(38,18),
  ALTER COLUMN ib_percentage TYPE numeric(38,18),
  ALTER COLUMN ib_commission_amount TYPE numeric(38,18);

-- 8. Fund AUM tracking
ALTER TABLE fund_daily_aum
  ALTER COLUMN total_aum TYPE numeric(38,18);

COMMIT;
