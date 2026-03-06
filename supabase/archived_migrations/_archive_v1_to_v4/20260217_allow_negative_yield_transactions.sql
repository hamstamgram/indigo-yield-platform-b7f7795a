-- Allow negative YIELD transactions for loss months (Scorched Earth Phase 1 addendum)
-- The old constraint blocked amount < 0 for YIELD type transactions.
-- Negative yield is proportional loss distribution where all wallets decrease.

ALTER TABLE transactions_v2 DROP CONSTRAINT IF EXISTS chk_transactions_v2_yield_amount_nonnegative;

-- Also allow negative gross/net amounts in yield_allocations for negative yield
ALTER TABLE yield_allocations DROP CONSTRAINT IF EXISTS yield_allocations_gross_amount_check;
ALTER TABLE yield_allocations DROP CONSTRAINT IF EXISTS yield_allocations_net_amount_check;

-- yield_distributions can have negative gross_yield_amount for negative yield months
ALTER TABLE yield_distributions DROP CONSTRAINT IF EXISTS yield_distributions_gross_yield_amount_check;
