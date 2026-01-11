# INDIGO Platform Ground Truth Verification Report

> **Date:** 2026-01-11
> **Protocol:** Verification-First (Trust Nothing, Verify Everything)
> **Database:** postgres.nkfimvovosdehmyyjubn (us-east-2)
> **Auditor:** Claude Code (CTO/DBA Role)

---

## Executive Summary

| Verification | Expected | Actual | Status |
|--------------|----------|--------|--------|
| SECURITY DEFINER Compliance | ~68 missing | **0 missing** | **BETTER THAN EXPECTED** |
| Advisory Locks | 6/6 | **5/6** | **GAP: void_transaction** |
| Delta Triggers | 4/4 | **4/4 ENABLED** | PASS |
| Financial Precision | NUMERIC(28,10) | **Mixed** | WARNING |
| Integrity Views | 8/8 | **7/8** | **GAP: v_security_definer_audit** |
| Conservation Law | < 10^-10 | **conserved=true** | PASS |
| Legacy tx_date refs | 0 | **0** | PASS |
| Zod Transforms | 6/6 | **6/6** | PASS |
| RPC Parameter Order | Aligned | **Aligned** | PASS |

**Critical Finding:** Documentation overstated security issues. Actual compliance is significantly better than reported.

---

## Phase 1: Ground Truth Verification Results

### 1.1 SECURITY DEFINER Function Compliance

**Query:**
```sql
SELECT
  COUNT(*) as total_security_definer,
  COUNT(*) FILTER (WHERE proconfig IS NOT NULL
    AND 'search_path=public' = ANY(proconfig)) as with_search_path,
  COUNT(*) FILTER (WHERE proconfig IS NULL
    OR NOT 'search_path=public' = ANY(proconfig)) as missing_search_path
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.prosecdef = true AND n.nspname = 'public';
```

**Result:**
| Metric | Value |
|--------|-------|
| Total SECURITY DEFINER | 189 |
| With search_path=public | 189 |
| Missing search_path | **0** |

**Assessment:** PASS - All SECURITY DEFINER functions are properly configured. The audit report claiming ~68-380 missing functions was **incorrect** or based on stale data.

---

### 1.2 Advisory Lock Coverage

**Query:**
```sql
SELECT proname,
  pg_get_functiondef(oid) ILIKE '%pg_advisory%' as has_advisory_lock
FROM pg_proc
WHERE proname IN ('admin_create_transaction', 'approve_withdrawal',
                  'complete_withdrawal', 'create_withdrawal_request',
                  'apply_daily_yield_to_fund_v3', 'void_transaction')
AND pronamespace = 'public'::regnamespace;
```

**Result:**
| Function | Advisory Lock |
|----------|---------------|
| admin_create_transaction | YES |
| approve_withdrawal | YES |
| complete_withdrawal | YES |
| create_withdrawal_request | YES |
| apply_daily_yield_to_fund_v3 | YES |
| **void_transaction** | **NO** |

**Assessment:** PARTIAL PASS - 5/6 critical mutation functions have advisory locks. `void_transaction` is missing.

**Risk:** Race condition in concurrent void operations (low probability but possible).

---

### 1.3 Delta Audit Triggers

**Query:**
```sql
SELECT tgname, tgrelid::regclass, tgenabled
FROM pg_trigger
WHERE tgname LIKE 'delta_audit_%';
```

**Result:**
| Trigger | Table | Status |
|---------|-------|--------|
| delta_audit_transactions_v2 | transactions_v2 | O (ENABLED) |
| delta_audit_investor_positions | investor_positions | O (ENABLED) |
| delta_audit_yield_distributions | yield_distributions | O (ENABLED) |
| delta_audit_withdrawal_requests | withdrawal_requests | O (ENABLED) |

**Assessment:** PASS - All 4 delta audit triggers are active and enabled.

---

### 1.4 Financial Precision Verification

**Query:**
```sql
SELECT table_name, column_name,
  numeric_precision, numeric_scale
FROM information_schema.columns
WHERE table_schema = 'public'
AND data_type = 'numeric'
AND column_name IN ('amount', 'balance', 'current_value', 'principal',
                    'gross_yield', 'net_yield', 'fee_amount', 'ib_amount');
```

**Result:**
| Table | Column | Precision | Scale | Status |
|-------|--------|-----------|-------|--------|
| transactions_v2 | amount | 28 | 10 | CORRECT |
| investor_positions | current_value | 28 | 10 | CORRECT |
| investor_positions | principal | 28 | 10 | CORRECT |
| yield_distributions | gross_yield | NULL | NULL | **UNSPECIFIED** |
| yield_distributions | net_yield | NULL | NULL | **UNSPECIFIED** |
| yield_distributions | fee_amount | NULL | NULL | **UNSPECIFIED** |

**Assessment:** PARTIAL PASS - Core transaction columns use NUMERIC(28,10). Some yield distribution columns use unspecified precision (PostgreSQL defaults to arbitrary precision, which is actually safe but inconsistent with documentation).

---

### 1.5 Integrity Views Inventory

**Query:**
```sql
SELECT viewname FROM pg_views
WHERE schemaname = 'public'
AND viewname IN ('v_ledger_reconciliation', 'v_orphaned_positions',
                 'v_yield_conservation_check', 'v_fee_allocation_orphans',
                 'v_ib_allocation_orphans', 'fund_aum_mismatch',
                 'v_duplicate_transactions', 'v_security_definer_audit');
```

**Result:**
| View | Exists |
|------|--------|
| v_ledger_reconciliation | YES |
| v_orphaned_positions | YES |
| v_yield_conservation_check | YES |
| v_fee_allocation_orphans | YES |
| v_ib_allocation_orphans | YES |
| fund_aum_mismatch | YES |
| v_duplicate_transactions | YES |
| **v_security_definer_audit** | **NO** |

**Assessment:** PARTIAL PASS - 7/8 integrity views exist. `v_security_definer_audit` is missing (migration not applied).

---

### 1.6 Yield Conservation Law Verification

**Query:**
```sql
SELECT id, effective_date, gross_yield,
  (net_yield + fee_amount + ib_amount + COALESCE(dust_amount, 0)) as allocated_total,
  gross_yield - (net_yield + fee_amount + ib_amount + COALESCE(dust_amount, 0)) as variance,
  ABS(gross_yield - (net_yield + fee_amount + ib_amount + COALESCE(dust_amount, 0))) < 0.0000000001 as conserved
FROM yield_distributions
WHERE voided_at IS NULL
ORDER BY created_at DESC
LIMIT 10;
```

**Result:**
| ID | Effective Date | Gross Yield | Allocated Total | Variance | Conserved |
|----|----------------|-------------|-----------------|----------|-----------|
| 1a564c4a... | 2025-12-29 | 100000 | 100000.000... | 0 | **TRUE** |

**Assessment:** PASS - Conservation law verified. `|Gross - Allocated| < 10^-10`

---

### 1.7 Legacy transaction_date References

**Query:**
```sql
SELECT tgname, pg_get_triggerdef(oid)
FROM pg_trigger
WHERE pg_get_triggerdef(oid) ILIKE '%transaction_date%';
```

**Result:** 0 rows

**Assessment:** PASS - No active triggers reference deprecated `transaction_date` column.

---

### 1.8 TypeScript Financial Type Audit

**Method:** Grep for `number` type in financial contexts

**Files with `number` types for financial values:**
- `src/types/asset.ts`: balance, principal, totalEarned, yields (50+ instances)
- `src/types/domains/yieldDistributionRecord.ts`: recordedAum, grossYield, totalGrossYield, totalNetYield
- `src/types/domains/fund.ts`: aum, mgmt_fee_bps, perf_fee_bps

**Assessment:** WARNING - TypeScript uses JavaScript `number` (IEEE 754 double) for financial values instead of `string` for safe transport. This is a known limitation mitigated by:
1. Database uses NUMERIC(28,10) for storage
2. UI uses Decimal.js for display precision
3. All calculations happen in PostgreSQL

**Recommendation:** Consider migrating to string types for API transport layer.

---

### 1.9 Zod Schema Transform Verification

**Location:** `src/lib/validation/schemas.ts`

| Schema | Transform | Status |
|--------|-----------|--------|
| adminTransactionDbSchema | investorId → investor_id, txDate → tx_date | PASS |
| voidTransactionDbSchema | transactionId → transaction_id | PASS |
| withdrawalApprovalDbSchema | requestId → request_id | PASS |
| yieldPreviewDbSchema | fundId → p_fund_id, targetDate → p_target_date | PASS |
| aumRecordDbSchema | fundId → fund_id, aumDate → aum_date | PASS |
| withdrawalCreationDbSchema | investorId → p_investor_id | PASS |

**Assessment:** PASS - All 6 critical schemas have proper camelCase → snake_case transforms.

---

### 1.10 RPC Parameter Order Verification

**Database Function Signature:**
```sql
crystallize_yield_before_flow(
  p_fund_id uuid,
  p_closing_aum numeric,
  p_trigger_type text,
  p_trigger_reference text,
  p_event_ts timestamp with time zone,
  p_admin_id uuid,
  p_purpose aum_purpose
)
```

**TypeScript Service Call (`yieldCrystallizationService.ts:82-90`):**
```typescript
{
  p_fund_id: fundId,
  p_closing_aum: closingAum,
  p_trigger_type: triggerType,
  p_trigger_reference: triggerReference || null,
  p_event_ts: eventTs.toISOString(),
  p_admin_id: adminId || null,
  p_purpose: "transaction",
}
```

**Assessment:** PASS - Parameter order is aligned. Supabase RPC uses named parameters so order is technically irrelevant, but matching order improves readability.

---

## Identified Gaps Requiring Remediation

### Critical (0 items)
None.

### High Priority (2 items)

| # | Issue | Impact | Remediation |
|---|-------|--------|-------------|
| 1 | `void_transaction` missing advisory lock | Race condition risk | Add `pg_advisory_xact_lock(hashtext('void:' \|\| p_transaction_id::text))` |
| 2 | `v_security_definer_audit` view missing | Cannot audit SECURITY DEFINER compliance | Apply migration or create view |

### Medium Priority (1 item)

| # | Issue | Impact | Remediation |
|---|-------|--------|-------------|
| 3 | TypeScript uses `number` for financial values | Precision loss in JS (IEEE 754 limits) | Consider string transport, document limitation |

### Low Priority (1 item)

| # | Issue | Impact | Remediation |
|---|-------|--------|-------------|
| 4 | Some yield_distributions columns lack explicit precision | PostgreSQL defaults to arbitrary precision (safe) | Add explicit NUMERIC(28,10) for consistency |

---

## Documentation Corrections Required

| Document | Section | Current State | Correct State |
|----------|---------|---------------|---------------|
| FULL_STACK_AUDIT_REPORT.md | 1.4 Security Configuration | Claims 68-380 missing search_path | Actually 0 missing |
| FULL_STACK_AUDIT_REPORT.md | Layer 5 | Lists v_security_definer_audit as existing | View does not exist |

---

## Next Steps

1. **Phase 3:** Execute remediation
   - Add advisory lock to `void_transaction`
   - Create `v_security_definer_audit` view

2. **Phase 4:** Update documentation
   - Correct FULL_STACK_AUDIT_REPORT.md with actual values
   - Update ARCHITECTURE.md if needed

3. **Phase 5:** Final validation
   - Re-run all verification queries
   - Confirm zero gaps remain

---

## Verification Queries (For Re-Execution)

```sql
-- Security compliance check
SELECT COUNT(*) FILTER (WHERE proconfig IS NULL
  OR NOT 'search_path=public' = ANY(proconfig)) as missing
FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.prosecdef = true AND n.nspname = 'public';
-- Expected: 0

-- Advisory lock check
SELECT proname, pg_get_functiondef(oid) ILIKE '%pg_advisory%' as has_lock
FROM pg_proc WHERE proname = 'void_transaction'
AND pronamespace = 'public'::regnamespace;
-- Expected: has_lock = true (after remediation)

-- View existence check
SELECT COUNT(*) FROM pg_views
WHERE schemaname = 'public' AND viewname = 'v_security_definer_audit';
-- Expected: 1 (after remediation)
```

---

**Report Generated:** 2026-01-11 14:30 UTC
**Auditor:** Claude Code (Ground Truth Protocol)
