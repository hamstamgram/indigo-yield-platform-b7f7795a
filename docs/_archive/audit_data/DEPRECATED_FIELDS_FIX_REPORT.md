# Deprecated Field Names - Audit and Fix Report

**Date**: 2026-01-09  
**Project**: Indigo Yield Platform v01

## Executive Summary

Comprehensive audit completed to find and fix all deprecated field name references per DATA_MODEL.md mappings:
- `tx_type` → `type` (transactions_v2)
- `effective_date` → `tx_date` (transactions_v2)
- `current_balance` → `current_value` (investor_positions)

## Findings

### ✅ TypeScript/JavaScript Code - CLEAN
**Status**: No issues found

All application code correctly uses the proper field names:
- `type` field for transactions_v2 (not `tx_type`)
- `tx_date` field for transactions_v2 (not `effective_date`)
- `current_value` field for investor_positions (not `current_balance`)

**Note**: References to `tx_type` in TypeScript are for the DATABASE ENUM TYPE NAME, not a field name. This is correct usage:
```typescript
type TransactionType = Database["public"]["Enums"]["tx_type"];
// The transactions_v2.type column uses values from the tx_type enum
```

### ❌ Documentation Errors - FIXED
**Status**: 2 files updated

#### 1. docs/DATA_MODEL.md
**Issue**: Line 136 showed `effective_date` instead of `tx_date` for transactions_v2 table definition

**Fix Applied**:
```diff
- | effective_date | DATE | No | When transaction takes effect |
+ | tx_date | DATE | No | When transaction takes effect |
```

#### 2. docs/erd.md  
**Issue**: Line 93 description said "Effective date" for tx_date field

**Fix Applied**:
```diff
- date tx_date "Effective date"
+ date tx_date "Transaction date"
```

### ❌ SQL Migration Files - FIXED
**Status**: 4 files corrected

#### Files Fixed:
1. **supabase/migrations/20260108193011_8c89d7d3-0f89-410d-97c3-9782620e7a92.sql**
   - Function: `apply_daily_yield_to_fund_v3`
   - Fixed 3 occurrences: Lines 92, 103, 149
   - Changed: `current_balance` → `current_value`

2. **supabase/migrations/20260101221402_6d8fa245-34ef-44fc-a424-8eb11b48280b.sql**
   - Function: Transaction voiding logic
   - Fixed: Line 56
   - Changed: `current_balance` → `current_value`

3. **supabase/migrations/20251228220634_b51656af-fea4-44a3-9c6b-2cc23175c007.sql**
   - Function: Position adjustment logic
   - Fixed: Multiple occurrences (lines 74, 106, 120, etc.)
   - Changed: `current_balance` → `current_value`

4. **supabase/migrations/20251222234720_445cc60c-91e1-4271-9d2d-e50998ba1301.sql**
   - Function: `preview_daily_yield_to_fund_v2`
   - Fixed: Lines 87, 106, 344
   - Changed: `ip.current_balance` → `ip.current_value`

### ✅ Other Documentation - VERIFIED CORRECT

The following files correctly use `effective_date` for OTHER tables (not transactions_v2):
- **docs/page-contracts/yield-operations.md**: Uses `effective_date` for `yield_distributions` table (CORRECT)
- **docs/page-contracts/fund-management.md**: Uses `effective_date` for `yield_distributions` table (CORRECT)
- **docs/page-contracts/investor-detail.md**: Uses `effective_date` for `yield_distributions` table (CORRECT)

### ✅ Comments Improved

Updated comment in `src/types/domains/transaction.ts` to clarify:
```typescript
// OLD: Get enum types from database - tx_type is the actual transactions_v2 column enum
// NEW: Get enum types from database - tx_type is the database enum type name
//      The transactions_v2 table uses the 'type' column with values from the tx_type enum
```

## Summary of Changes

| Category | Files Changed | Issues Fixed |
|----------|--------------|--------------|
| TypeScript/JS Code | 1 | 0 (comment clarification only) |
| Documentation | 2 | 2 field reference errors |
| SQL Migrations | 4 | ~15 column reference errors |
| **TOTAL** | **7** | **~17** |

## Verification

All deprecated field references have been eliminated:
- ✅ No TypeScript code using deprecated field names
- ✅ No SQL queries using wrong column names for transactions_v2 or investor_positions
- ✅ Documentation updated to reflect correct schema
- ✅ Migration files corrected to use proper column names

## Database Schema Confirmation

### transactions_v2 Table
- ✅ Uses `type` column (enum type: tx_type)
- ✅ Uses `tx_date` column (NOT effective_date)

### investor_positions Table
- ✅ Uses `current_value` column (NOT current_balance)

### Other Tables (Correct Usage)
- `yield_distributions` - HAS `effective_date` column (CORRECT)
- `ib_allocations` - HAS `effective_date` column (CORRECT)
- `investor_fee_schedule` - HAS `effective_date` column (CORRECT)

## Recommendations

1. **Apply SQL Migration Fixes**: The 4 corrected migration files should be reviewed and re-applied to any databases that ran the original versions
2. **Database Validation**: Run integrity checks to ensure investor_positions.current_value matches transaction history
3. **Code Review**: All future PRs should reference this audit to prevent regression
4. **Documentation**: Keep DATA_MODEL.md as the single source of truth for field mappings

## Files Modified

### Documentation
- `/docs/DATA_MODEL.md` (line 136)
- `/docs/erd.md` (line 93)

### TypeScript
- `/src/types/domains/transaction.ts` (lines 10-11, comment clarification)

### SQL Migrations
- `/supabase/migrations/20260108193011_8c89d7d3-0f89-410d-97c3-9782620e7a92.sql`
- `/supabase/migrations/20260101221402_6d8fa245-34ef-44fc-a424-8eb11b48280b.sql`
- `/supabase/migrations/20251228220634_b51656af-fea4-44a3-9c6b-2cc23175c007.sql`
- `/supabase/migrations/20251222234720_445cc60c-91e1-4271-9d2d-e50998ba1301.sql`

---
**Report Generated**: 2026-01-09  
**Audited By**: Claude (Sonnet 4.5)
