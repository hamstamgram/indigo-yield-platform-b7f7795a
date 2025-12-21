-- Constraints and Indexes Query
-- Key idempotency constraints for INDIGO platform

-- 1. generated_statements unique constraint (one report per investor per period)
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'generated_statements' 
AND indexname LIKE '%unique%';

-- 2. investor_fund_performance uniqueness with purpose
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'investor_fund_performance';

-- 3. transactions_v2 reference_id uniqueness
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'transactions_v2' 
AND indexdef LIKE '%reference_id%';

-- 4. fee_allocations idempotency
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'fee_allocations';

-- 5. ib_allocations idempotency
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'ib_allocations';

-- Expected output:
-- unique_investor_period | CREATE UNIQUE INDEX unique_investor_period ON public.generated_statements (investor_id, period_id)
-- idx_transactions_v2_reference_id_unique | CREATE UNIQUE INDEX ... ON public.transactions_v2 (reference_id) WHERE reference_id IS NOT NULL
-- fee_allocations_unique | CREATE UNIQUE INDEX ... ON public.fee_allocations (distribution_id, fund_id, investor_id, fees_account_id)
-- ib_allocations_idempotency | CREATE UNIQUE INDEX ... ON public.ib_allocations (source_investor_id, ib_investor_id, period_start, period_end, fund_id)
