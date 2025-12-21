# Idempotency Mechanisms

## Database Constraints

| Table | Constraint | Columns | Purpose |
|-------|------------|---------|---------|
| generated_statements | unique_investor_period | investor_id, period_id | One report per period |
| transactions_v2 | idx_transactions_v2_reference_id_unique | reference_id | Prevent duplicate yields |
| fee_allocations | fee_allocations_unique | distribution_id, fund_id, investor_id, fees_account_id | Prevent duplicate fees |
| ib_allocations | ib_allocations_idempotency | source_investor_id, ib_investor_id, period_start, period_end, fund_id | Prevent duplicate IB |
| investor_fund_performance | investor_fund_performance_unique_with_purpose | investor_id, period_id, fund_name, purpose | One record per purpose |

## Code Enforcement

All insert operations use `ON CONFLICT DO NOTHING` or throw errors on duplicates.
