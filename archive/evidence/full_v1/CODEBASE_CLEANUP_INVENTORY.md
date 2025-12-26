# Codebase Cleanup Inventory

## Generated: 2024-12-26

This document inventories potentially unused database objects, functions, and code patterns that could be cleaned up in a future maintenance sprint.

---

## 1. Unused Database Functions

### GiST B-Tree Functions (btree_gist extension)
These 80+ functions are from the `btree_gist` PostgreSQL extension and are NOT used by the application code:

```sql
-- Pattern: gbt_* functions
gbt_bit_compress, gbt_bit_consistent, gbt_bit_penalty, gbt_bit_picksplit, gbt_bit_same, gbt_bit_union
gbt_bool_compress, gbt_bool_consistent, gbt_bool_fetch, gbt_bool_penalty, gbt_bool_picksplit, gbt_bool_same, gbt_bool_union
gbt_bpchar_compress, gbt_bpchar_consistent
gbt_bytea_compress, gbt_bytea_consistent, gbt_bytea_penalty, gbt_bytea_picksplit, gbt_bytea_same, gbt_bytea_union
gbt_cash_compress, gbt_cash_consistent, gbt_cash_distance, gbt_cash_fetch, gbt_cash_penalty, gbt_cash_picksplit, gbt_cash_same, gbt_cash_union
gbt_date_compress, gbt_date_consistent, gbt_date_distance, gbt_date_fetch, gbt_date_penalty, gbt_date_picksplit, gbt_date_same, gbt_date_union
gbt_decompress
gbt_enum_compress, gbt_enum_consistent, gbt_enum_fetch, gbt_enum_penalty, gbt_enum_picksplit, gbt_enum_same, gbt_enum_union
gbt_float4_*, gbt_float8_*, gbt_inet_*, gbt_int2_*, gbt_int4_*, gbt_int8_*
gbt_intv_*, gbt_macad_*, gbt_macad8_*, gbt_numeric_*, gbt_oid_*, gbt_text_*, gbt_time_*, gbt_timetz_*, gbt_ts_*, gbt_tstz_*, gbt_uuid_*, gbt_var_*
```

**Action**: These are internal PostgreSQL functions. Do NOT delete. They support GiST indexes.

### Distribution Functions (likely unused)
```sql
cash_dist, date_dist, float4_dist, float8_dist
int2_dist, int4_dist, int8_dist, interval_dist
oid_dist, time_dist, timetz_dist, ts_dist, tstz_dist
```

**Action**: These are internal PostgreSQL functions from btree_gist. Do NOT delete.

---

## 2. Potentially Unused Application RPCs

### Functions Called in Code (KEEP)
Based on search results, these RPCs are actively used:
- `approve_withdrawal` ✅
- `reject_withdrawal` ✅  
- `start_processing_withdrawal` ✅
- `complete_withdrawal` ✅
- `cancel_withdrawal_by_admin` ✅
- `create_withdrawal_request` ✅
- `route_withdrawal_to_fees` ✅
- `distribute_yield_v2` ✅
- `apply_yield_correction_v2` ✅
- `preview_yield_correction_v2` ✅
- `get_yield_corrections` ✅
- `queue_statement_deliveries` ✅
- `retry_delivery` ✅
- `cancel_delivery` ✅
- `mark_sent_manually` ✅
- `get_delivery_stats` ✅
- `check_duplicate_transaction_refs` ✅
- `check_duplicate_ib_allocations` ✅
- `is_super_admin` ✅
- `get_historical_nav` ✅
- `internal_route_to_fees` ✅
- `get_statement_period_summary` ✅

### Functions Needing Verification
These exist in database but weren't found in code search:
```sql
-- May be unused or called indirectly via triggers
apply_daily_yield_to_fund
apply_daily_yield_to_fund_v2
apply_daily_yield_with_fees
apply_yield_with_ib
distribute_monthly_yield  -- Possibly superseded by distribute_yield_v2
```

**Action**: Review if these are called by triggers or other DB functions before removing.

---

## 3. Duplicate/Legacy Code Patterns

### Transaction Services
```
src/services/investor/transactionService.ts  
src/services/admin/transactionAdminService.ts
src/hooks/data/useTransactions.ts
```
These may have overlapping functionality. Consider consolidating.

### Yield Services
```
src/services/admin/yieldCorrectionService.ts
src/services/admin/yieldOperationsService.ts
```
Well-separated concerns. KEEP as-is.

### Profile Hooks
```
src/hooks/data/useProfiles.ts
src/hooks/useAdminCheck.ts
```
Could be consolidated but low priority.

---

## 4. Unused Views

### Views in Database
```sql
current_user_investor_ids
ib_investor_earnings
import_status
investor_aum_summary
investor_positions_computed  -- May be superseded by investor_positions table
investor_snapshot
v_investor_kpis
v_withdrawal_requests
```

**Action**: Verify each view is used before removing. Many are used by RLS policies.

---

## 5. Legacy Tables (Potential Candidates)

### Tables to Investigate
```sql
-- May have been replaced by newer tables
generated_reports  -- Check if superseded by generated_statements
investor_monthly_reports  -- Legacy, now using investor_fund_performance

-- Archive tables (keep for audit trail)
fund_daily_aum_archive  -- Intentional archive, KEEP
```

**Action**: Do NOT delete without thorough investigation. Archive tables are intentional.

---

## 6. Frontend Components

### Potentially Unused Components
Search for components with zero imports:
```bash
# Find components with no imports
grep -rL "import.*ComponentName" src/components/
```

Based on current structure, all major components are in use.

---

## 7. Recommended Cleanup Actions

### Phase 1: Safe Cleanup (No Risk)
- [ ] Remove console.log statements in production code
- [ ] Remove commented-out code blocks
- [ ] Consolidate duplicate type definitions

### Phase 2: Code Consolidation (Low Risk)
- [ ] Merge similar service functions where appropriate
- [ ] Create shared hooks for common patterns
- [ ] Standardize error handling across services

### Phase 3: Database Cleanup (Medium Risk)
- [ ] Archive and remove truly unused tables after verification
- [ ] Consolidate similar RPC functions
- [ ] Remove unused views after RLS impact analysis

### Phase 4: Deep Cleanup (High Risk - Post-Launch)
- [ ] Migrate from legacy tables to new structures
- [ ] Remove backward-compatibility code paths
- [ ] Consolidate migrations into fewer files

---

## 8. Verification Queries

### Check Table Usage
```sql
-- Find tables with no rows (potentially unused)
SELECT schemaname, relname, n_live_tup 
FROM pg_stat_user_tables 
WHERE schemaname = 'public' 
AND n_live_tup = 0
ORDER BY relname;
```

### Check Function Usage (requires pg_stat_statements)
```sql
-- This requires pg_stat_statements extension enabled
-- Not available in standard Supabase setup
```

### Check View Dependencies
```sql
SELECT 
  dependent_view.relname AS view_name,
  source_table.relname AS table_name
FROM pg_depend
JOIN pg_rewrite ON pg_depend.objid = pg_rewrite.oid
JOIN pg_class dependent_view ON pg_rewrite.ev_class = dependent_view.oid
JOIN pg_class source_table ON pg_depend.refobjid = source_table.oid
WHERE source_table.relkind = 'r'
AND dependent_view.relkind = 'v'
AND pg_depend.classid = 'pg_rewrite'::regclass
ORDER BY view_name;
```

---

## Summary

| Category | Count | Action |
|----------|-------|--------|
| btree_gist functions | 80+ | KEEP (internal PostgreSQL) |
| Application RPCs | 50+ | 20+ confirmed in use, 5 need verification |
| Views | 9 | All likely in use via RLS |
| Legacy tables | 2-3 | Investigate before removing |
| Duplicate code patterns | 3-5 | Consolidate in future sprint |

**Recommendation**: Focus on Phase 1-2 cleanup post-launch. Phase 3-4 require careful planning and testing.
