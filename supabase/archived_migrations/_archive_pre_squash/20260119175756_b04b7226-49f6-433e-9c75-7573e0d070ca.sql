-- Phase 7: Drop orphaned temp tables
-- These tables have single columns, zero rows, and are not referenced by any functions or code

-- Drop temp_balance (single column: bal numeric, 0 rows)
DROP TABLE IF EXISTS temp_balance;

-- Drop temp_fund (single column: id uuid, 0 rows)
DROP TABLE IF EXISTS temp_fund;

-- Drop temp_investor (single column: id uuid, 0 rows)
DROP TABLE IF EXISTS temp_investor;