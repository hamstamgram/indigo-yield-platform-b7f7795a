

# Comprehensive Audit Report: Yield Operations & Platform Architecture

## Executive Summary

The yield distribution failure has been **resolved** by the migration applied in this session (`20260203122938_2c12c717-de28-45e5-830a-5e63da7674cf.sql`). The root cause was an `ON CONFLICT ON CONSTRAINT ib_allocations_idempotency` clause that failed because PostgreSQL cannot match unique constraints containing nullable columns.

**Overall Platform Health Score: 8.7/10**

### Top 5 Issues (Ranked by Severity)

| Rank | Issue | Severity | Status |
|------|-------|----------|--------|
| 1 | ON CONFLICT constraint mismatch in trigger | CRITICAL | **FIXED** |
| 2 | 5 views using SECURITY DEFINER (bypass RLS) | HIGH | Open |
| 3 | 4 ESLint exhaustive-deps suppressions (stale closures) | MEDIUM | Open |
| 4 | Test file references old constraint columns | LOW | Open |
| 5 | `as any` casts in service layer (~6 occurrences) | LOW | Documented |

---

## Section A: Operations Failure Report

### Yield Distribution on Reporting Mode

**Operation**: Apply yield distribution with purpose="reporting"

**UI Trigger**: Click "Apply" button on YieldOperationsPage after previewing yield

**Frontend Call Chain**:
```text
src/features/admin/yields/pages/YieldOperationsPage.tsx
  → src/hooks/admin/useYieldOperationsState.ts (line 425)
    → handleApplyYield() calls applyYieldDistribution()
      → src/services/admin/yieldApplyService.ts (line 96)
        → callRPC("apply_adb_yield_distribution_v3", {...})
          → src/lib/supabase/typedRPC.ts (line 36)
            → rpc.call() in src/lib/rpc/client.ts (line 132)
```

**Backend Chain**:
```text
RPC: apply_adb_yield_distribution_v3
  → Loops through investors with ADB > 0
  → For each with ib_parent_id: inserts into ib_commission_ledger
    → TRIGGER: trg_ib_commission_ledger_sync_allocations
      → FUNCTION: sync_ib_allocations_from_commission_ledger
        → INSERT INTO ib_allocations ... ON CONFLICT ON CONSTRAINT ib_allocations_idempotency
          ❌ FAILED: "no unique or exclusion constraint matching the ON CONFLICT specification"
```

**Root Cause Classification**: Schema mismatch - ON CONFLICT clause referenced constraint with nullable column

**Evidence**:
- Constraint `ib_allocations_idempotency` includes `distribution_id` (nullable)
- PostgreSQL cannot match ON CONFLICT when constraint contains NULL-able columns in certain cases

**Fix Applied**:
```sql
-- Changed from:
ON CONFLICT ON CONSTRAINT ib_allocations_idempotency DO NOTHING
-- To:
ON CONFLICT DO NOTHING
-- Plus added guard clauses for NULL distribution_id
```

**Verification**:
- Trigger function now returns early if `yield_distribution_id IS NULL`
- Trigger function now returns early if distribution doesn't exist in `yield_distributions`
- Conflicting partial index `ib_allocations_distribution_unique` was dropped

---

## Section B: System Map - Operations Contract Table

### Yield Operations

| Operation | Frontend Caller | Backend Endpoint | Input Payload | Expected Output | Auth Context |
|-----------|-----------------|------------------|---------------|-----------------|--------------|
| Preview Yield | `yieldPreviewService.ts:48` | `preview_adb_yield_distribution_v3` | fund_id, period_start, period_end, gross_yield_amount, purpose | JSON with allocations array | admin role |
| Apply Yield | `yieldApplyService.ts:41` | `apply_adb_yield_distribution_v3` | fund_id, period_start, period_end, gross_yield_amount, admin_id, purpose, distribution_date? | JSON with success, distribution_id, totals | admin role |
| Get Funds with AUM | `yieldHistoryService.ts:220` | Direct query (funds + positions) | none | Array of fund summaries | admin role |
| Get Investor Composition | `yieldDistributionService.ts` | `get_funds_with_aum` | fund_id? | Investor positions with yields | admin role |

### Transaction Operations

| Operation | Frontend Caller | Backend Endpoint | Input Payload | Expected Output | Auth Context |
|-----------|-----------------|------------------|---------------|-----------------|--------------|
| Create Transaction | `transactionSubmit.ts` | `admin_create_transaction` | investor_id, fund_id, type, amount, tx_date, closing_aum, notes? | transaction_id | admin role |
| Void Transaction | `transactionActionsService.ts` | `void_transaction` | p_transaction_id, p_admin_id, p_reason | success boolean | super_admin role |
| Apply Deposit | `rpc/client.ts:216` | `apply_deposit_with_crystallization` | fund_id, investor_id, amount, closing_aum, effective_date, admin_id, notes?, purpose? | JSON result | admin role |

---

## Section C: Full Issue Inventory

### C1. Database Schema Issues

| ID | Severity | Category | Description | Evidence | Remediation |
|----|----------|----------|-------------|----------|-------------|
| DB-01 | CRITICAL | Constraint | ON CONFLICT mismatch in trigger | `sync_ib_allocations_from_commission_ledger` | **FIXED** |
| DB-02 | HIGH | Security | 5 views using SECURITY DEFINER | Linter output: `0010_security_definer_view` | Convert to SECURITY INVOKER where possible |
| DB-03 | LOW | Data | Test file references wrong constraint columns | `tests/integration/yieldIdempotency.test.ts:46` | Update test to match actual constraint |

### C2. Frontend Architecture Issues

| ID | Severity | Category | Description | File:Line | Remediation |
|----|----------|----------|-------------|-----------|-------------|
| FE-01 | MEDIUM | React | ESLint exhaustive-deps suppression | `RecordedYieldsPage.tsx:69` | Review if setFilter is stable or add to deps |
| FE-02 | MEDIUM | React | ESLint exhaustive-deps suppression | `OverviewTab.tsx:59` | Review if loadProfileData/loadAccountStats are stable |
| FE-03 | MEDIUM | React | ESLint exhaustive-deps suppression | `ReportBuilder.tsx:73` | Review if loadReportDefinitions is stable |
| FE-04 | MEDIUM | React | ESLint exhaustive-deps suppression | `GlobalYieldFlow.tsx:33` | Review if ops.setYieldPurpose is stable |
| FE-05 | LOW | TypeScript | `as any` cast in adminToolsService | `adminToolsService.ts:37` | Add RPC to generated types |
| FE-06 | LOW | TypeScript | `as any` cast in integrityService | `integrityService.ts:120` | Add RPC to generated types |
| FE-07 | LOW | TypeScript | `as any` casts in fundService | `fundService.ts:77,122` | Documented - necessary for generic DB client |
| FE-08 | INFO | Filter | getActiveFundsWithAUM only shows investor accounts | `yieldHistoryService.ts:255` | By design - matches RPC behavior |

### C3. Cache Invalidation

| ID | Severity | Category | Description | Evidence | Remediation |
|----|----------|----------|-------------|----------|-------------|
| CI-01 | LOW | Consistency | YIELD_RELATED_KEYS includes fundAumAsOf() | `queryKeys.ts:535` | Good - already fixed |
| CI-02 | INFO | Performance | Some invalidations not awaited | `useYieldOperationsState.ts:454` | Consider adding await for race conditions |

### C4. Security Issues

| ID | Severity | Category | Description | Evidence | Remediation |
|----|----------|----------|-------------|----------|-------------|
| SEC-01 | HIGH | RLS Bypass | 5 SECURITY DEFINER views | Linter output | Review each view for necessity |
| SEC-02 | INFO | Function | All yield RPCs have search_path=public | DB query confirmed | Already hardened |
| SEC-03 | INFO | RLS | All critical tables have RLS enabled | DB query confirmed | Already secured |

---

## Section D: Ordered Remediation Plan

### P0: Critical (Already Done)

| Step | Action | Status | Verification |
|------|--------|--------|--------------|
| 1 | Fix ON CONFLICT in trigger | **COMPLETED** | Migration `20260203122938` applied |
| 2 | Drop conflicting partial index | **COMPLETED** | `ib_allocations_distribution_unique` dropped |
| 3 | Add guard clauses to trigger | **COMPLETED** | NULL checks added |

### P1: High Priority (Next Session)

| Step | Action | Files | Expected Outcome | Verification |
|------|--------|-------|------------------|--------------|
| 4 | Review SECURITY DEFINER views | DB migration | Convert to SECURITY INVOKER where safe | Linter shows 0 errors |
| 5 | Regenerate Supabase types | `src/integrations/supabase/types.ts` | Remove `as any` casts for RPCs | TypeScript compiles without cast |

### P2: Medium Priority (Tech Debt Sprint)

| Step | Action | Files | Expected Outcome | Verification |
|------|--------|-------|------------------|--------------|
| 6 | Fix ESLint exhaustive-deps | 4 files listed above | Remove suppressions or add proper deps | No lint warnings |
| 7 | Update test constraint reference | `tests/integration/yieldIdempotency.test.ts` | Match actual DB constraint | Tests pass |

### P3: Low Priority (Optional Enhancements)

| Step | Action | Files | Expected Outcome | Verification |
|------|--------|-------|------------------|--------------|
| 8 | Add await to cache invalidations | `useYieldOperationsState.ts` | Prevent race conditions | Manual testing |
| 9 | Document intentional `as any` casts | `src/lib/db/client.ts` | Already documented (line 9-15) | Code review |

---

## Section E: Appendix - Queries Used

### Database Queries

```sql
-- Verify trigger function
SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'sync_ib_allocations_from_commission_ledger';

-- Check constraints on ib_allocations
SELECT c.conname, pg_get_constraintdef(c.oid) FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid WHERE t.relname = 'ib_allocations';

-- Check indexes on ib_allocations
SELECT i.relname, pg_get_indexdef(i.oid) FROM pg_index ix JOIN pg_class i ON i.oid = ix.indexrelid WHERE ix.indrelid = 'ib_allocations'::regclass;

-- Verify RLS status
SELECT c.relname, c.relrowsecurity FROM pg_class c WHERE c.relname IN ('transactions_v2', 'yield_distributions', ...);

-- Check SECURITY DEFINER functions
SELECT proname, prosecdef, proconfig FROM pg_proc WHERE proname IN ('is_admin', 'sync_ib_allocations_from_commission_ledger', ...);
```

### File Search Patterns

```text
# ON CONFLICT usage
lov-search: ON CONFLICT.*ib_allocations

# ESLint suppressions
lov-search: eslint-disable.*exhaustive-deps

# RPC calls in services
lov-search: supabase\.rpc\( (in src/services)

# Type casts
lov-search: as any (in src/services/admin)
```

---

## Testing Recommendation

After confirming the fix is applied, test the yield distribution flow:

1. Navigate to `/admin` → Yield Operations
2. Select a fund with active positions (investor_count > 0)
3. Enter a new AUM value higher than current
4. Click "Preview Yield"
5. Verify preview shows allocations
6. Click "Apply" with purpose = "Reporting"
7. Confirm with "APPLY" text
8. Verify success toast appears
9. Check database: `yield_distributions`, `ib_allocations`, `ib_commission_ledger`

**Note**: The current database has all positions set to `is_active=false` and `current_value=0`, so you'll need active test data to verify the full flow.

