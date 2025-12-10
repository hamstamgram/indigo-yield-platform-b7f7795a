# Database Schema Audit - Executive Summary

**Date:** 2025-12-08
**Project:** Indigo Yield Platform
**Architecture:** V2 (One ID Unification)

---

## Overview

Comprehensive audit of 56 SQL migration files following V2 architecture implementation. The One ID Unification successfully migrated from a dual-table system (`investors` + `profiles`) to a unified `profiles` table where `profiles.id = auth.user.id = investor_id`.

## Health Score: 🟡 83% - Good with Minor Issues

| Category | Score | Status |
|----------|-------|--------|
| Core Architecture | 95% | ✅ Excellent |
| Foreign Keys | 85% | ⚠️ 1 broken FK |
| Views & Functions | 90% | ✅ Good |
| RLS Policies | 75% | ⚠️ Some broken |
| Performance | 90% | ✅ Good |
| Code Alignment | 60% | ⚠️ Needs audit |

---

## Critical Findings

### ✅ **RESOLVED ISSUES**

1. **investor_fund_performance.user_id → investor_id** ✅
   - Renamed to match V2 naming convention
   - FK updated to reference profiles

2. **withdrawal_queue view** ✅
   - Updated to use profiles instead of investors

3. **v_investor_kpis view** ✅
   - Updated to use profiles instead of investors

4. **Core performance indexes** ✅
   - Added 4 critical indexes for AUM, transactions, withdrawals

5. **Fund code standardization** ✅
   - All 5 funds follow BTCYF pattern

### ❌ **REMAINING ISSUES**

1. **onboarding_submissions table** (CRITICAL)
   - FK still references dropped `investors` table
   - **Fix**: Run `20251208_post_audit_fixes.sql`

2. **Broken RLS policies** (HIGH)
   - withdrawal_requests policies use subquery to `investors`
   - **Fix**: Included in post_audit_fixes migration

3. **TypeScript code audit needed** (HIGH)
   - 48 references to "investors" variable in src/
   - Some may be `.select('*, investors(...)')` queries
   - **Action Required**: Manual code review

### ⚠️ **WARNINGS**

1. **Legacy tables exist**
   - `positions` may conflict with `investor_positions`
   - `transactions` replaced by `transactions_v2`
   - **Recommendation**: Verify data migration, then drop

2. **Multiple One ID migration files**
   - 5 versions suggest iterative fixes
   - **Recommendation**: Archive old versions

---

## V2 Architecture Summary

### Core Tables (Source of Truth)

```
profiles (id = auth.user.id)
  ├── investor_positions (investor_id → profiles.id)
  │     └── funds (fund_id)
  └── transactions_v2 (investor_id → profiles.id)
        └── funds (fund_id)
```

### Active Funds (Production)

| Code | Name | Asset | Investors | AUM |
|------|------|-------|-----------|-----|
| BTCYF | BTC Yield Fund | BTC | 14 | 44.89 BTC |
| ETHYF | ETH Yield Fund | ETH | 12 | 717.83 ETH |
| USDTYF | USDT Yield Fund | USDT | 20 | 3,428,235 USDT |
| SOLYF | SOL Yield Fund | SOL | 5 | 3,635.82 SOL |
| XRPYF | XRP Yield Fund | XRP | 2 | 229,294 XRP |

---

## Immediate Actions Required

### 🔴 CRITICAL (Do First)

1. **Apply post-audit fixes**
   ```bash
   psql -f supabase/migrations/20251208_post_audit_fixes.sql
   ```

2. **Run health check**
   ```bash
   psql -f scripts/verify-database-health.sql
   ```

3. **Verify no broken FKs**
   ```sql
   SELECT conname, conrelid::regclass, confrelid::regclass
   FROM pg_constraint
   WHERE confrelid::regclass::text = 'public.investors'
     AND contype = 'f';
   -- Should return 0 rows
   ```

### 🟡 HIGH PRIORITY (This Week)

4. **Audit TypeScript code**
   ```bash
   grep -r "\.select.*investors(" src/ --include="*.ts" --include="*.tsx"
   ```
   - Replace with: `.select('*, profiles!investor_id(...)')`

5. **Verify data integrity**
   - Run all checks in `verify-database-health.sql`
   - Confirm 0 orphaned records

6. **Clean up migrations**
   ```bash
   mv supabase/migrations/20251208_one_id_unification*.sql \
      supabase/migrations/_archived_deprecated/
   # Keep only: 20251208_one_id_unification_sanitized.sql
   ```

### 🟢 MEDIUM PRIORITY (This Month)

7. **Document final schema**
   - Update CLAUDE.md with table list
   - Create ER diagram

8. **Performance testing**
   - Load test with new indexes
   - Monitor query performance

9. **Legacy table cleanup**
   - Verify `positions` and `transactions` are unused
   - Drop if safe

---

## Files Generated

1. **DATABASE_AUDIT_REPORT.md** (18 KB)
   - Complete findings
   - All 56 migrations analyzed
   - Detailed fix recommendations

2. **supabase/migrations/20251208_post_audit_fixes.sql** (6 KB)
   - Fixes broken FK constraints
   - Updates RLS policies
   - Adds missing indexes
   - Includes verification queries

3. **scripts/verify-database-health.sql** (9 KB)
   - 12 automated health checks
   - RLS verification
   - Data integrity checks
   - AUM validation

---

## Migration History

### One ID Unification Timeline

1. **20251208_one_id_unification.sql** - First attempt
2. **20251208_one_id_unification_fixed.sql** - Bug fixes
3. **20251208_one_id_unification_final.sql** - Retry
4. **20251208_one_id_unification_sanitized.sql** - ✅ Working version
5. **20251208_one_id_unification_complete.sql** - Duplicate?
6. **20251208_critical_fixes.sql** - Post-migration fixes
7. **20251208_post_audit_fixes.sql** - Final cleanup

**Recommendation**: Archive versions 1-5, keep only sanitized + fixes

---

## Known Safe Patterns

### ✅ Correct: Using profiles table
```typescript
const { data } = await supabase
  .from('investor_positions')
  .select(`
    *,
    profiles!investor_id(first_name, last_name, email),
    funds(code, name, asset)
  `);
```

### ❌ Broken: Using investors table
```typescript
const { data } = await supabase
  .from('investor_positions')
  .select('*, investors(name, email)') // ❌ Table doesn't exist
```

### ✅ Correct: RLS policy
```sql
CREATE POLICY "select_own" ON investor_positions
  FOR SELECT USING (investor_id = auth.uid());
```

### ❌ Broken: RLS with subquery
```sql
CREATE POLICY "select_own" ON investor_positions
  FOR SELECT USING (
    investor_id IN (SELECT id FROM investors WHERE profile_id = auth.uid())
  ); -- ❌ investors table dropped
```

---

## Database Statistics

- **Total Tables**: 35+
- **Active Funds**: 5
- **Core V2 Tables**: 6
  - profiles
  - funds
  - investor_positions
  - transactions_v2
  - withdrawal_requests
  - investor_fund_performance

- **Legacy Tables**: 3 (to be verified/dropped)
  - positions
  - transactions
  - statements

- **Supporting Tables**: 25+
  - audit_log, email_logs, notifications, etc.

---

## Verification Checklist

Run this checklist after applying fixes:

- [ ] `investors` table is dropped
- [ ] No FK constraints reference `investors`
- [ ] All `investor_id` columns reference `profiles.id`
- [ ] RLS policies don't query dropped tables
- [ ] All views use `profiles` not `investors`
- [ ] investor_fund_performance uses `investor_id` not `user_id`
- [ ] 5 active funds exist (BTCYF, ETHYF, USDTYF, SOLYF, XRPYF)
- [ ] Performance indexes exist
- [ ] TypeScript code updated
- [ ] Health check passes 100%

---

## Contact & Support

**Auditor**: Claude Code (Database Specialist)
**Report Date**: 2025-12-08
**Next Review**: After post-audit fixes applied

For questions about this audit:
1. Review full report: `DATABASE_AUDIT_REPORT.md`
2. Run health check: `scripts/verify-database-health.sql`
3. Apply fixes: `supabase/migrations/20251208_post_audit_fixes.sql`

---

**Status**: 🟡 Ready for final fixes and verification
