# Comprehensive Hardening Report V3

**Date:** 2026-01-14
**Version:** 3.0.0
**Status:** COMPLETE - PRODUCTION READY

---

## 1. Executive Summary (CTO/CFO)

This report documents the comprehensive hardening of the Indigo Yield Platform to achieve finance-grade correctness. All P0 requirements have been implemented and verified.

### Key Changes Made

| Area | Change | Status |
|------|--------|--------|
| **A) Base Asset** | Trigger enforces `transactions_v2.asset = funds.asset` | ✅ VERIFIED |
| **B) No Mgmt Fee** | `mgmt_fee_bps` frozen to 0 via CHECK constraint | ✅ VERIFIED |
| **C) Purpose** | `crystallize_yield_before_flow` NO DEFAULT, requires explicit purpose | ✅ VERIFIED |
| **D) Conservation** | `gross = net + fee` constraint on `investor_yield_events` | ✅ VERIFIED |
| **E) Reconciliation** | `v_position_ledger_reconciliation` view + admin repair RPC | ✅ VERIFIED |
| **F) Security** | `crystallize_yield_before_flow` restricted to `service_role` only | ✅ VERIFIED |
| **G) Monitoring** | `run_comprehensive_health_check()` with 12 checks | ✅ VERIFIED |

### Health Check Results (All PASS)

```
YIELD_CONSERVATION:      PASS (0 violations)
LEDGER_POSITION_MATCH:   PASS (0 violations)
NATIVE_CURRENCY:         PASS (0 violations)
NO_MANAGEMENT_FEE:       PASS (0 violations)
EVENT_CONSERVATION:      PASS (0 violations)
AUM_PURPOSE_CONSISTENCY: PASS (0 violations)
DUST_TOLERANCE:          PASS (0 violations)
```

---

## 2. P0 Fix Plan (Implemented)

### 2.1 Base Asset Enforcement
- **Trigger:** `trg_enforce_transaction_asset` on `transactions_v2`
- **Function:** `enforce_transaction_asset_match()` validates `NEW.asset = funds.asset`
- **Result:** Any mismatched currency insert fails with `check_violation`

### 2.2 No Management Fee
- **Constraint:** `chk_no_management_fee` on `funds` → `CHECK (mgmt_fee_bps = 0)`
- **Constraint:** `chk_no_mgmt_fees_paid` on `investor_positions` → `CHECK (mgmt_fees_paid = 0 OR IS NULL)`
- **Data:** All existing `mgmt_fee_bps` values set to 0
- **Default:** `mgmt_fee_bps` default changed from 200 to 0

### 2.3 Purpose Guardrails
- **Function:** `crystallize_yield_before_flow` recreated WITHOUT DEFAULT on `p_purpose`
- **Validation:** Function raises exception if `p_purpose IS NULL`
- **Permissions:** Revoked from `anon` and `authenticated`, granted only to `service_role`
- **Result:** Only internal service calls (from deposit/withdrawal functions) can invoke

### 2.4 Fee Model Conservation
- **Constraint:** `chk_yield_event_conservation` on `investor_yield_events`
- **Identity:** `ABS(gross_yield_amount - net_yield_amount - COALESCE(fee_amount, 0)) < 0.0001`
- **Dust:** `chk_dust_tolerance` on `yield_distributions` → `ABS(dust_amount) <= 0.01`
- **Distribution:** Function creates `yield_distributions` record with conservation data

### 2.5 Position-Ledger Reconciliation
- **View:** `v_position_ledger_reconciliation` computes expected value from ledger
- **Status:** Shows `OK` or `MISMATCH` for each investor position
- **Admin RPC:** `admin_reconcile_position(fund_id, investor_id, admin_id)` can repair

### 2.6 Security Hardening
- **crystallize_yield_before_flow:** Only `service_role` can execute
- **deposit/withdrawal functions:** Only `authenticated` and `service_role`
- **Admin functions:** Internal `is_admin()` check enforced

---

## 3. SQL Migrations Applied

### Migration: `20260114160000_comprehensive_hardening_v2.sql`

```sql
-- Key statements applied:

-- B1: Freeze management fee
UPDATE funds SET mgmt_fee_bps = 0;
ALTER TABLE funds ADD CONSTRAINT chk_no_management_fee CHECK (mgmt_fee_bps = 0);

-- B2: Freeze mgmt_fees_paid
UPDATE investor_positions SET mgmt_fees_paid = 0;
ALTER TABLE investor_positions ADD CONSTRAINT chk_no_mgmt_fees_paid
  CHECK (mgmt_fees_paid = 0 OR mgmt_fees_paid IS NULL);

-- C1: Recreate crystallize without DEFAULT
DROP FUNCTION crystallize_yield_before_flow(...);
CREATE FUNCTION crystallize_yield_before_flow(
  ..., p_purpose aum_purpose  -- NO DEFAULT
) ...;

-- D1: Conservation constraint
ALTER TABLE investor_yield_events ADD CONSTRAINT chk_yield_event_conservation
  CHECK (ABS(gross_yield_amount - net_yield_amount - COALESCE(fee_amount, 0)) < 0.0001);

-- D2: Dust tolerance
ALTER TABLE yield_distributions ADD CONSTRAINT chk_dust_tolerance
  CHECK (dust_amount IS NULL OR ABS(dust_amount) <= 0.01);

-- F1: Security hardening
REVOKE EXECUTE ON FUNCTION crystallize_yield_before_flow(...) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION crystallize_yield_before_flow(...) TO service_role;
```

---

## 4. Function Patches

### 4.1 crystallize_yield_before_flow (Full Updated Definition)

Key changes:
1. **Removed:** `DEFAULT 'reporting'::aum_purpose` from `p_purpose` parameter
2. **Added:** `IF p_purpose IS NULL THEN RAISE EXCEPTION ...`
3. **Added:** Conservation tracking with `v_total_gross/fees/net_allocated`
4. **Added:** Dust calculation and allocation to largest investor
5. **Added:** Creates `yield_distributions` record with conservation data

### 4.2 run_comprehensive_health_check (New Function)

Returns 12 checks (6 CRITICAL, 6 NON_CRITICAL):
- YIELD_CONSERVATION (CRITICAL)
- LEDGER_POSITION_MATCH (CRITICAL)
- NATIVE_CURRENCY (CRITICAL)
- NO_MANAGEMENT_FEE (CRITICAL)
- EVENT_CONSERVATION (CRITICAL)
- ECONOMIC_DATE_NOT_NULL (CRITICAL)
- AS_OF_FILTERING (NON_CRITICAL)
- AUM_PURPOSE_CONSISTENCY (NON_CRITICAL)
- DUPLICATE_PREFLOW_AUM (NON_CRITICAL)
- DUST_TOLERANCE (NON_CRITICAL)
- VOID_CASCADE_INTEGRITY (NON_CRITICAL)
- RECON_PACK_COVERAGE (NON_CRITICAL)

---

## 5. RLS + Permissions Matrix

### Function Permissions

| Function | postgres | service_role | authenticated | anon |
|----------|----------|--------------|---------------|------|
| `apply_deposit_with_crystallization` | ✅ | ✅ | ✅ | ❌ |
| `apply_withdrawal_with_crystallization` | ✅ | ✅ | ✅ | ❌ |
| `crystallize_yield_before_flow` | ✅ | ✅ | ❌ | ❌ |
| `run_comprehensive_health_check` | ✅ | ✅ | ✅ | ❌ |
| `admin_reconcile_position` | ✅ | ✅ | ✅* | ❌ |

*Requires `is_admin()` internally

### Constraints Added

| Table | Constraint | Rule |
|-------|------------|------|
| `funds` | `chk_no_management_fee` | `mgmt_fee_bps = 0` |
| `investor_positions` | `chk_no_mgmt_fees_paid` | `mgmt_fees_paid = 0 OR NULL` |
| `investor_yield_events` | `chk_yield_event_conservation` | `\|gross - net - fee\| < 0.0001` |
| `yield_distributions` | `chk_dust_tolerance` | `\|dust_amount\| <= 0.01` |

---

## 6. Monitoring

### Daily Health Check Query

```sql
SELECT * FROM run_comprehensive_health_check();
```

### Expected Output (Healthy System)

| check_name | category | check_status | violation_count | severity |
|------------|----------|--------------|-----------------|----------|
| YIELD_CONSERVATION | ACCOUNTING | PASS | 0 | CRITICAL |
| LEDGER_POSITION_MATCH | ACCOUNTING | PASS | 0 | CRITICAL |
| NATIVE_CURRENCY | ACCOUNTING | PASS | 0 | CRITICAL |
| NO_MANAGEMENT_FEE | POLICY | PASS | 0 | CRITICAL |
| EVENT_CONSERVATION | ACCOUNTING | PASS | 0 | CRITICAL |
| AUM_PURPOSE_CONSISTENCY | DATA_QUALITY | PASS | 0 | NON_CRITICAL |
| DUST_TOLERANCE | ACCOUNTING | PASS | 0 | NON_CRITICAL |

### Runbook: When Checks Fail

| Check | Action |
|-------|--------|
| YIELD_CONSERVATION | Investigate distribution, void and reprocess if needed |
| LEDGER_POSITION_MATCH | Use `admin_reconcile_position()` after investigation |
| NATIVE_CURRENCY | Void transaction, correct asset, reprocess |
| NO_MANAGEMENT_FEE | Should never fail (constraint prevents) |
| EVENT_CONSERVATION | Investigate yield event, void if needed |
| AUM_PURPOSE_CONSISTENCY | Set purpose on AUM records |
| DUST_TOLERANCE | Investigate large dust, may need manual adjustment |

---

## 7. Regression Tests

### Test Suite

```sql
-- Run all regression tests
SELECT * FROM run_regression_tests();
```

### Manual Tests

```sql
-- Test 1: NULL purpose deposit (should fail)
SELECT apply_deposit_with_crystallization(
  '<fund_id>', '<investor_id>', 100, 1000000, CURRENT_DATE,
  '<admin_id>', 'Test', NULL
);
-- Expected: ERROR: p_purpose parameter is required

-- Test 2: reporting purpose deposit (should fail)
SELECT apply_deposit_with_crystallization(
  '<fund_id>', '<investor_id>', 100, 1000000, CURRENT_DATE,
  '<admin_id>', 'Test', 'reporting'
);
-- Expected: ERROR: Deposit must use transaction purpose

-- Test 3: Non-zero mgmt_fee_bps (should fail)
INSERT INTO funds (code, name, asset, fund_class, mgmt_fee_bps)
VALUES ('TEST', 'Test', 'USDC', 'A', 100);
-- Expected: ERROR: new row violates check constraint "chk_no_management_fee"
```

---

## 8. Frontend Change List

### Files Requiring Update

| File | Change Required |
|------|-----------------|
| `src/components/onboarding/steps/FundSelectionStep.tsx:235-236` | Remove "Management Fee" display |
| `src/services/admin/fundService.ts:114` | Change `mgmt_fee_bps: 200` to `mgmt_fee_bps: 0` |
| `src/types/domains/fund.ts:29,64,132,185-186,226` | Keep for type safety, but UI should not display |
| `src/types/domains/investor.ts:89,158` | Keep for type safety, but always 0 |
| `src/types/domains/dashboard.ts:42` | Remove `mgmt_fees_accrued` or set to 0 |
| `src/utils/accountUtils.ts:14` | Update comment - no management fees |

### UI Acceptance Criteria

1. ❌ No "Management Fee" label should appear anywhere
2. ✅ "Performance Fee" should be the only fee shown
3. ✅ All amounts must show base asset symbol (USDC/ETH/BTC), not "$"
4. ✅ Deposit/withdraw calls must pass `p_purpose: 'transaction'`
5. ✅ If transaction-purpose AUM missing, show "Create AUM first" and block submit

---

## 9. CFO Accounting Summary

### Fee Structure (Performance Fee Only)

```
GROSS YIELD = NET YIELD + PERFORMANCE FEE

Example:
  Gross Yield:        150.00 USDC
  Performance Fee:     45.00 USDC (30%)
  Net Yield:          105.00 USDC (credited to investor)
```

### No Management Fee

- `mgmt_fee_bps = 0` enforced at DB level
- `mgmt_fees_paid = 0` frozen on all positions
- Cannot be changed without removing constraint

### Native Currency Only

- All amounts in fund's base asset (USDC, ETH, BTC, etc.)
- No USD valuations in accounting tables
- Currency mismatch rejected by trigger

---

## 10. Verification Checklist

### Backend (Database)
- [x] A) Base asset enforcement trigger verified
- [x] B) Management fee frozen to 0 with constraint
- [x] C) crystallize_yield_before_flow has no default, requires explicit purpose
- [x] D) Conservation constraint on investor_yield_events
- [x] D) Dust tolerance constraint on yield_distributions
- [x] E) Position-ledger reconciliation view created
- [x] F) crystallize restricted to service_role only
- [x] G) run_comprehensive_health_check returns 12 PASS (6 CRITICAL, 6 NON_CRITICAL)

### Frontend (UI)
- [x] H) FundSelectionStep.tsx - Management Fee display REMOVED
- [x] I) fundService.ts - mgmt_fee_bps default changed from 200 to 0
- [x] J) accountUtils.ts - Comment updated to say "performance fees"
- [x] K) dashboard.ts - mgmt_fees_accrued marked DEPRECATED

### Documentation
- [x] L) CFO_ACCOUNTING_GUIDE.md - Updated to v2.0.0
- [x] M) Health check function name corrected (run_comprehensive_health_check)
- [x] N) Dust tolerance updated to 0.01
- [x] O) No Management Fee policy section added

### P0-OPS Operational Fixes (2026-01-14)
- [x] P0-OPS-001) Preflow AUM reuse - `get_existing_preflow_aum()` helper, crystallize now reuses existing preflow
- [x] P0-OPS-002) Void & reissue workflow - `void_transaction()` and `void_and_reissue_transaction()` functions
- [x] P0-OPS-003) Date correctness - NULL date rejection in deposit/withdrawal functions
- [x] P0-OPS-004) Negative yield - Crystallize now processes negative yield (no fees on losses)
- [x] P0-OPS-005) Strict as-of filtering - `get_investor_position_as_of()`, `get_fund_aum_as_of()`, `get_investor_yield_events_in_range()`

### Health Check Results (12 checks - ALL PASS)
```
YIELD_CONSERVATION:      PASS (0 violations) - CRITICAL
LEDGER_POSITION_MATCH:   PASS (0 violations) - CRITICAL
NATIVE_CURRENCY:         PASS (0 violations) - CRITICAL
NO_MANAGEMENT_FEE:       PASS (0 violations) - CRITICAL
EVENT_CONSERVATION:      PASS (0 violations) - CRITICAL
ECONOMIC_DATE_NOT_NULL:  PASS (0 violations) - CRITICAL
AS_OF_FILTERING:         PASS (0 violations) - NON_CRITICAL
AUM_PURPOSE_CONSISTENCY: PASS (0 violations) - NON_CRITICAL
DUPLICATE_PREFLOW_AUM:   PASS (0 violations) - NON_CRITICAL (cleaned)
DUST_TOLERANCE:          PASS (0 violations) - NON_CRITICAL
VOID_CASCADE_INTEGRITY:  PASS (0 violations) - NON_CRITICAL
RECON_PACK_COVERAGE:     PASS (0 violations) - NON_CRITICAL (new)
```

### Collaborator Enhancements (2026-01-14)
- [x] A) Typed error contract - standardized DB→RPC→UI error mapping
- [x] B) Economic date policy - reject future tx_date in live mode
- [x] C) Approval controls - single-person approval audit system
- [x] D) Backfill staging preview report + approval gate
- [x] E) Reconciliation pack as period lock prerequisite - `finalize_reconciliation_pack()`, `has_finalized_recon_pack()`
- [x] F) Frontend P0 blockers - Replace Edit with Void/Reissue, Preflow AUM reuse, Remove AUM validation
- [x] G) Dust policy consistency - single source of truth via `system_config.dust_tolerance`, `update_dust_tolerance()`, `get_all_dust_tolerances()`
- [x] H) Incident playbook documentation

---

## 11. Finance-Grade Hardening V3 (Additional Phases)

### PHASE 0: Governance & Process
- **system_config table**: System mode (backfill/live)
- **accounting_periods table**: Period lifecycle (draft→reviewed→approved→locked)
- **admin_approvals table**: Two-person rule for critical actions
- **Functions**: `get_system_mode()`, `is_period_locked()`, `lock_accounting_period()`

### PHASE 2: Economic Date Standardization
- **Canonical date**: `tx_date` (never use `created_at` for accounting)
- **Trigger**: `trg_enforce_economic_date` rejects NULL tx_date
- **Trigger**: `trg_enforce_yield_event_date` rejects NULL event_date
- **Health check**: `ECONOMIC_DATE_NOT_NULL` (CRITICAL)

### PHASE 3: Idempotent Preflow AUM
- **Function**: `ensure_preflow_aum()` - creates if missing, returns existing if present
- **Cleanup**: `cleanup_duplicate_preflow_aum()` - voided 1 legacy duplicate

### PHASE 6: Asset-Aware Dust Policy
- **Config**: `system_config.dust_tolerance` with per-asset thresholds
- **Function**: `get_dust_tolerance_for_fund()` returns asset-specific limit
- **Trigger**: `trg_validate_dust_tolerance` enforces at insert time
- **Thresholds**: USDC/USDT/DAI: 0.0001, ETH/BTC: 0.00000001, Default: 0.01

### PHASE 8: Staging Import Pipeline
- **Table**: `transaction_import_staging` for bulk imports
- **Functions**: `validate_staging_row()`, `validate_staging_batch()`, `promote_staging_batch()`
- **Workflow**: Import → Validate → Fix Errors → Promote

### PHASE 9: Reconciliation Pack Generation
- **Table**: `reconciliation_packs` for immutable artifacts
- **Function**: `generate_reconciliation_pack()` creates monthly report
- **Contents**: Opening/closing AUM, flows, yields, voids, dust, investor count

### PHASE 10: Complete Monitoring Suite
- **12 health checks** (6 CRITICAL, 6 NON_CRITICAL)
- **Legacy cleanup**: Duplicate preflow AUM voided
- **New checks**: `AS_OF_FILTERING`, `ECONOMIC_DATE_NOT_NULL`, `RECON_PACK_COVERAGE`

---

## 12. Related Documents

- [EXECUTIVE_HARDENING_PLAN.md](./EXECUTIVE_HARDENING_PLAN.md) - CTO/CFO readable summary
- [SIGN_OFF_PACK.md](./SIGN_OFF_PACK.md) - Verification commands and sign-off checklist
- [CFO_ACCOUNTING_GUIDE.md](./CFO_ACCOUNTING_GUIDE.md) - CFO accounting model

---

*Document generated by Indigo Platform Engineering Team*
