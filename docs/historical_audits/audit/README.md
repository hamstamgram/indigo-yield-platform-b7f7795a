# SQL Function Audit - Index

**Generated**: 2026-02-02
**Database**: Indigo Yield Platform (Supabase)
**Scope**: All 432 user-defined functions, 175 triggers, 54 tables

---

## Quick Summary

✅ **Database Health**: Excellent - Highly sophisticated trigger architecture
❌ **Contract Mismatches**: 5 critical issues found
⚠️ **Function Overloads**: 4 functions with ambiguous overloads
📋 **Total Functions Audited**: 432

---

## Audit Reports

### 1. Full Audit Report
**File**: [`SQL_FUNCTION_AUDIT_REPORT.md`](./SQL_FUNCTION_AUDIT_REPORT.md)

Comprehensive analysis of all database functions, triggers, and schema. Includes:
- Complete function inventory (432 functions)
- Trigger inventory (175 triggers)
- Parameter mismatch analysis
- Security definer validation
- Column schema validation
- Enum type validation

**Read this first** for complete context.

---

### 2. Critical Fixes Required
**File**: [`CRITICAL_FIXES_REQUIRED.md`](./CRITICAL_FIXES_REQUIRED.md)

Actionable fix list with exact code changes needed. Includes:
- **Fix #1**: Add missing `p_distribution_id` parameter (5 minutes)
- **Fix #2**: Correct `securityDefiner` flags (10 minutes)
- **Fix #3**: Resolve function overloads (30 minutes)
- **Fix #4**: Add missing functions to contracts (20 minutes)
- **Fix #5**: Add enum type validation (15 minutes)

**Use this** to apply fixes immediately.

---

### 3. Function Signatures Reference
**File**: [`FUNCTION_SIGNATURES.csv`](./FUNCTION_SIGNATURES.csv)

CSV export of key function signatures for quick reference. Useful for:
- Excel/Google Sheets analysis
- Import into DB tools
- Quick lookup of parameter order

---

## Key Findings

### 🔴 Critical Issues

1. **Missing Parameter in Core Transaction Function**
   - Function: `apply_transaction_with_crystallization`
   - Missing: `p_distribution_id uuid`
   - Impact: Cannot link transactions to yield distributions
   - Fix: 1-line change in `rpcSignatures.ts`

2. **Function Overloads Create Ambiguity**
   - `apply_daily_yield_to_fund_v3` has 2 overloads with swapped parameter positions
   - `upsert_fund_aum_after_yield` has 2 overloads with different semantics
   - Impact: May call wrong function variant at runtime
   - Fix: Rename one overload in SQL

### 🟡 Medium Issues

3. **Security Definer Flag Mismatches**
   - 3 functions have incorrect `securityDefiner: false` in frontend
   - Database has `SECURITY DEFINER` (elevated privileges)
   - Impact: Misleading documentation
   - Fix: Change 3 boolean flags

4. **Missing Functions in Frontend Contracts**
   - `void_yield_distribution` - void distributions
   - `force_delete_investor` - delete investors
   - `crystallize_yield_before_flow` - manual crystallization
   - Impact: Cannot call these functions from frontend
   - Fix: Add 3 function contracts

### 🟢 Low Issues

5. **Enum Type Validation Missing**
   - `aum_purpose` type is enum in DB but `string` in TypeScript
   - Impact: Could pass invalid values like `'invalid'`
   - Fix: Add TypeScript enum type

---

## Database Architecture Highlights

### Protected Table Pattern
The database uses a sophisticated **canonical RPC** pattern to protect financial data:

```sql
-- All financial mutations must call:
PERFORM set_config('indigo.canonical_rpc', 'true', true);

-- Otherwise, triggers block the mutation:
CREATE TRIGGER enforce_canonical_transaction
  BEFORE INSERT OR UPDATE OR DELETE ON transactions_v2
  FOR EACH ROW EXECUTE FUNCTION enforce_canonical_transaction_mutation();
```

**Protected Tables:**
- `transactions_v2` - all financial transactions
- `investor_positions` - position balances
- `yield_distributions` - yield distribution records
- `fund_daily_aum` - fund AUM snapshots
- `fund_aum_events` - AUM change events

**Canonical RPCs:**
- `apply_transaction_with_crystallization`
- `apply_adb_yield_distribution_v3`
- `void_yield_distribution`
- `set_fund_daily_aum`
- `crystallize_yield_before_flow`

### Trigger Architecture

**175 triggers** across 25 tables provide:

1. **Audit Logging** - Every change logged to `audit_log`
2. **Delta Tracking** - Old/new value comparison in `audit_delta_trigger`
3. **Automatic Recomputation** - Position balances recalc on transaction insert
4. **Cascade Voiding** - Voided distributions cascade to all transactions
5. **Integrity Enforcement** - 18+ integrity check triggers

### Conservation Identities

The database enforces financial conservation laws via triggers:

```sql
-- Yield Conservation: gross = net + fees + ib
ABS(gross_yield - (total_net_amount + total_fee_amount + total_ib_amount)) < dust_tolerance

-- Position Conservation: current_value = SUM(transactions)
SUM(amount WHERE is_voided = false) = current_value
```

---

## Function Categories

| Category | Count | Key Functions |
|----------|-------|---------------|
| **Yield Distribution** | 12 | `apply_adb_yield_distribution_v3`, `void_yield_distribution` |
| **Transactions** | 18 | `apply_transaction_with_crystallization`, `edit_transaction` |
| **Crystallization** | 8 | `crystallize_yield_before_flow`, `preview_crystallization` |
| **AUM Management** | 22 | `set_fund_daily_aum`, `sync_aum_on_transaction` |
| **Position Management** | 15 | `reconcile_investor_position`, `recompute_investor_position` |
| **Withdrawals** | 10 | `create_withdrawal_request`, `approve_withdrawal` |
| **Admin/Security** | 25 | `is_admin`, `require_super_admin`, `force_delete_investor` |
| **Integrity Checks** | 18 | `run_integrity_check`, `assert_integrity_or_raise` |
| **Reporting** | 14 | `generate_reconciliation_pack`, `get_fund_summary` |
| **Utilities** | 290 | Various helpers, validators, getters |

**Total**: 432 functions

---

## Trigger Categories

| Category | Count | Example Triggers |
|----------|-------|------------------|
| **Canonical RPC Guards** | 25 | `enforce_canonical_transaction` |
| **Audit Logging** | 40 | `audit_delta_trigger`, `log_data_edit` |
| **Synchronization** | 35 | `sync_yield_to_investor_yield_events` |
| **Voiding Cascade** | 12 | `cascade_void_from_transaction` |
| **Position Recomputation** | 8 | `trigger_recompute_position` |
| **Validation** | 30 | `validate_transaction_has_aum` |
| **Auto-Updates** | 25 | `update_updated_at`, `sync_profile_role` |

**Total**: 175 triggers

---

## Next Steps

### Immediate (30 minutes)
1. Read [`CRITICAL_FIXES_REQUIRED.md`](./CRITICAL_FIXES_REQUIRED.md)
2. Apply Fix #1 and Fix #2 (contract updates)
3. Run `npm run contracts:verify`
4. Run `npx tsc --noEmit`

### Short Term (2 hours)
5. Apply Fix #3 (rename function overloads)
6. Apply Fix #4 (add missing functions)
7. Apply Fix #5 (enum validation)
8. Run full test suite

### Long Term (Ongoing)
9. Document canonical RPC pattern in `PLATFORM_INVENTORY.md`
10. Add automated contract verification to CI/CD
11. Create TypeScript types for all DB enums
12. Add RPC integration tests

---

## Verification Commands

```bash
# Type check
npx tsc --noEmit

# Contract verification
npm run contracts:verify

# Build check
npm run build

# SQL hygiene
npm run sql:hygiene

# Full verification
npm run verify-app
```

---

## Related Documentation

- [`PLATFORM_INVENTORY.md`](../PLATFORM_INVENTORY.md) - Complete schema inventory
- [`CFO_ACCOUNTING_GUIDE.md`](../CFO_ACCOUNTING_GUIDE.md) - Financial logic documentation
- [`ARCHITECTURE.md`](../ARCHITECTURE.md) - System architecture
- [`OPERATIONS_MANUAL.md`](../OPERATIONS_MANUAL.md) - Operational procedures

---

## SQL Queries for Investigation

### Check function signature in database
```sql
SELECT
  p.proname,
  pg_get_function_arguments(p.oid) as arguments,
  pg_get_function_result(p.oid) as return_type,
  p.prosecdef as security_definer
FROM pg_proc p
WHERE p.proname = 'apply_transaction_with_crystallization';
```

### Find function overloads
```sql
SELECT
  p.proname,
  COUNT(*) as overload_count
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.prokind = 'f'
GROUP BY p.proname
HAVING COUNT(*) > 1
ORDER BY overload_count DESC;
```

### List all triggers on a table
```sql
SELECT
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'transactions_v2'
ORDER BY action_timing, trigger_name;
```

### Check enum values
```sql
SELECT
  t.typname,
  e.enumlabel
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname = 'aum_purpose'
ORDER BY e.enumsortorder;
```

---

**Audit Status**: ✅ Complete
**Audit Date**: 2026-02-02
**Auditor**: Database Specialist Agent
**Database Version**: PostgreSQL 15 (Supabase)
**Total Functions**: 432
**Total Triggers**: 175
**Critical Issues**: 5
**Estimated Fix Time**: 80 minutes
