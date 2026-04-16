# Dead Code / Deprecation Domain Audit

**ID**: 57
**Date**: 2026-04-16
**Status**: COMPLETE — READ-ONLY audit, no source files modified
**Predecessor**: #07-dead-code-register.md (preliminary register), #08-domain-canonical-contracts.md

---

## 1. DB Function Deprecation Inventory

### 1.1 Functions Marked DEPRECATED in DB Body

| Function | Marked | Raises on Call | Called by DB | Called by Frontend | Called by Edge | Recommendation |
|----------|--------|---------------|-------------|-------------------|---------------|----------------|
| `batch_crystallize_fund(p_fund_id, p_effective_date, p_force_override)` | RAISE EXCEPTION with 'deprecated' | Yes — raises informative error | No | Only in `rpcSignatures.ts` + `types.ts` (type def only) | Only in `database.types.ts` (type def only) | **DROP** — already raises on call, crystallization is automatic via `crystallize_yield_before_flow()` |

**Evidence**: Function body contains `RAISE EXCEPTION 'batch_crystallize_fund is deprecated...'`. No code path invokes it except type definitions. Frontend `rpcSignatures.ts` has `@deprecated` JSDoc marker.

### 1.2 V3 Yield Functions (Pre-deprecated by V5)

| Function | Called by DB | Called by Frontend | Called by Edge | Recommendation |
|----------|-------------|-------------------|---------------|----------------|
| `apply_adb_yield_distribution_v3` | Self only (recursive check returns just itself) | Only in `rpcSignatures.ts` + `types.ts` | No | **DROP** — V5 is canonical, V3 has zero active callers |
| `preview_adb_yield_distribution_v3` | No | Only in `rpcSignatures.ts` + `types.ts` | No | **DROP** — V5 preview is canonical |
| `preview_daily_yield_to_fund_v3` | No | Only in `rpcSignatures.ts` + `types.ts` | No | **DROP** — superseded by V5 functions |

**V5 (Canonical) Functions — Confirmed Active**:
| Function | DB Callers | Frontend Usage | Notes |
|----------|-----------|---------------|-------|
| `apply_segmented_yield_distribution_v5` | `apply_yield_distribution_v5_with_lock` | `yieldApplyService.ts` | Core yield path |
| `apply_yield_distribution_v5_with_lock` | `void_transaction_with_lock` | `yieldApplyService.ts` | Lock wrapper for V5 |
| `preview_segmented_yield_distribution_v5` | No DB callers | `yieldPreviewService.ts` | Active preview |

### 1.3 Stale Admin/Utility Functions (From Register #07)

| Function | Called by DB | Called by Frontend | Notes | Recommendation |
|----------|-------------|-------------------|-------|----------------|
| `cleanup_dormant_positions` | No | No | Maintenance utility, no callers | **DROP** |
| `export_investor_data` | No | No | GDPR export helper, no callers | **DROP** (re-implement when needed) |
| `force_delete_investor` | No | `reconciliationService.ts` | Dangerous, only in reconciliation service | **DEPRECATE** — add DEPRECATED comment, gate behind confirmation |
| `initialize_crystallization_dates` | No | No | One-time setup helper, no callers | **DROP** |
| `initialize_fund_aum_from_positions` | `batch_initialize_fund_aum` | No | Called by batch helper only | **DROP** both (batch helper also has no frontend caller) |
| `batch_initialize_fund_aum` | No | No | Wrapper around initialize function, no callers | **DROP** |
| `merge_duplicate_profiles` | `preview_merge_duplicate_profiles` | `integrityOperationsService.ts` | Active in admin UI | **KEEP** — actively used |
| `preview_merge_duplicate_profiles` | No | No (type def only) | Preview for merge, no direct frontend call | **VERIFY** — may be called via RPC dynamically |
| `reset_all_data_keep_profiles` | No | No | Dangerous reset, no callers | **DROP** |
| `create_profile_on_signup` | No (no active trigger) | No | Trigger function with NO active trigger | **DROP** — trigger was removed, function is orphaned |

---

## 2. Sync Function Redundancy Analysis

### 2.1 Trigger-Bound Sync Functions (24 total)

| Function | Trigger Name | Table | Active | Recommendation |
|----------|-------------|-------|--------|----------------|
| `sync_aum_on_position_change` | `trg_sync_aum_on_position` | investor_positions | Yes — trigger | **DEPRECATE** — doc 08 says merge into `sync_aum_on_transaction`; redundant AUM sync path |
| `sync_aum_on_transaction` | `trg_sync_aum_on_transaction` | transactions_v2 | Yes — trigger | **KEEP** — canonical AUM sync path |
| `sync_documents_profile_ids` | `trg_documents_sync_profile_ids` | documents | Yes — trigger | **KEEP** — legitimate FK sync |
| `sync_fee_allocations_voided_by_profile` | `trg_fee_allocations_sync_voided_by` | profiles | Yes — trigger | **KEEP** — void cascade for fees |
| `sync_fund_aum_after_position` | `trg_sync_aum_after_position` | investor_positions | Yes — trigger | **DEPRECATE** — overlaps with `sync_aum_on_position_change` and `sync_aum_on_transaction`; 3 AUM sync triggers is 2 too many |
| `sync_fund_aum_events_voided_by_profile` | `trg_fund_aum_events_sync_voided_by` | profiles | Yes — trigger | **KEEP** — void cascade for AUM events |
| `sync_fund_daily_aum_voided_by_profile` | `trg_fund_daily_aum_sync_voided_by` | profiles | Yes — trigger | **KEEP** — void cascade for daily AUM |
| `sync_ib_account_type` | `trigger_sync_ib_account_type` | profiles | Yes — trigger | **KEEP** — IB account classification sync |
| `sync_ib_allocations_from_commission_ledger` | `trg_ib_commission_ledger_sync_allocations` | ib_commission_ledger | Yes — trigger | **KEEP** — IB allocation cascade |
| `sync_ib_allocations_voided_by_profile` | `trg_ib_allocations_sync_voided_by` | profiles | Yes — trigger | **KEEP** — IB void cascade |
| `sync_ib_commission_ledger_voided_by_profile` | `trg_ib_commission_ledger_sync_voided_by` | profiles | Yes — trigger | **KEEP** — IB ledger void cascade |
| `sync_investor_yield_events_voided_by_profile` | `trg_investor_yield_events_sync_voided_by` | profiles | Yes — trigger | **KEEP** — yield event void cascade |
| `sync_platform_fee_ledger_voided_by_profile` | `trg_platform_fee_ledger_sync_voided_by` | profiles | Yes — trigger | **KEEP** — platform fee void cascade |
| `sync_profile_is_admin` | `sync_admin_status_on_role_change` | profiles | Yes — trigger | **KEEP** — admin flag sync |
| `sync_profile_role_from_profiles` | `trg_sync_profile_role_from_profiles` | profiles | Yes — trigger | **DEPRECATE** — duplicate of `sync_profile_role_from_roles` (see below) |
| `sync_profile_role_from_roles` | `trg_sync_profile_role_from_roles` | user_roles | Yes — trigger | **KEEP** — roles-based role sync (more reliable) |
| `sync_reporting_aum_to_transaction` | `trg_sync_reporting_aum_to_transaction` | fund_daily_aum | Yes — trigger | **KEEP** — reporting AUM → transaction sync |
| `sync_statements_investor_profile_id` | `trg_statements_sync_profile_id` | generated_statements | Yes — trigger | **KEEP** — statement profile FK sync |
| `sync_transactions_v2_voided_by_profile` | `trg_transactions_v2_sync_voided_by` | profiles | Yes — trigger | **KEEP** — transaction void cascade |
| `sync_yield_allocations_voided_by_profile` | `trg_yield_allocations_sync_voided_by` | profiles | Yes — trigger | **KEEP** — yield allocation void cascade |
| `sync_yield_date` | `trg_sync_yield_date` | yield_distributions | Yes — trigger | **KEEP** — yield date normalization |
| `sync_yield_distribution_legacy_totals` | `trg_sync_yield_distribution_legacy_totals` | yield_distributions | Yes — trigger | **DEPRECATE** — name says "legacy", investigate if still needed |
| `sync_yield_distributions_voided_by_profile` | `trg_yield_distributions_sync_voided_by` | profiles | Yes — trigger | **KEEP** — yield distribution void cascade |
| `sync_yield_to_investor_yield_events` | `trg_sync_yield_to_events` | yield_distributions | Yes — trigger | **KEEP** — yield → investor events sync |

### 2.2 Non-Trigger Sync Functions (5 total)

| Function | Called by DB | Called by Frontend | Trigger Exists? | Recommendation |
|----------|-------------|-------------------|-----------------|----------------|
| `sync_all_fund_aum` | No | Only in `rpcSignatures.ts` + `types.ts` | No | **DEPRECATE** — manual bulk sync, but triggers handle this; keep for admin break-glass if needed |
| `sync_aum_to_positions` | No | Only in `rpcSignatures.ts` + `types.ts` | No | **DEPRECATE** — reverse-direction AUM sync (AUM → positions), normally positions → AUM |
| `sync_position_last_tx_date` | No | No | No (trigger removed) | **DROP** — orphaned trigger function with no active trigger |
| `sync_profile_last_activity` | No | No | No (trigger removed) | **DROP** — orphaned trigger function with no active trigger |
| `sync_transaction_aum_after_yield` | No | Only in `rpcSignatures.ts` + `types.ts` | No | **DEPRECATE** — redundant with `sync_aum_on_transaction` trigger |

### 2.3 Position Sync Redundancy (Doc 08 Concern)

Doc 08 identified 8 redundant position sync functions. Current state:

**AUM Sync Redundancy (3 triggers on 2 tables — over-instrumented)**:
1. `sync_aum_on_transaction` (trg on transactions_v2) — **CANONICAL**
2. `sync_aum_on_position_change` (trg on investor_positions) — **REDUNDANT** — already covered by transaction trigger
3. `sync_fund_aum_after_position` (trg on investor_positions) — **REDUNDANT** — 3 AUM sync paths for 2 tables

**Recommendation**: Remove `sync_aum_on_position_change` and `sync_fund_aum_after_position` triggers. Canonical path is transaction → AUM only.

**Profile Role Sync Redundancy (2 triggers)**:
1. `sync_profile_role_from_profiles` — on profiles table
2. `sync_profile_role_from_roles` — on user_roles table

**Recommendation**: Keep `sync_profile_role_from_roles` only. Drop `sync_profile_role_from_profiles` — roles table is the source of truth.

---

## 3. View Consolidation Plan

### 3.1 Current Views (10 total, not 21 — consolidation already partially done)

| View | Used by Frontend | Used by DB Functions | Materialized | Recommendation |
|------|-----------------|---------------------|-------------|----------------|
| `v_concentration_risk` | Yes — `systemAdminService`, `useRiskAlerts`, `SystemIntegrityStatus` | No | No | **KEEP** — active risk monitoring |
| `v_cost_basis_mismatch` | Type def only | `run_integrity_pack` | No | **MERGE** into unified `v_position_health` view |
| `v_fee_calculation_orphans` | Yes — `integrityOperationsService` | No | No | **KEEP** — orphan detection used in admin UI |
| `v_fund_aum_position_health` | Type def only | `check_aum_position_health` | No | **KEEP** — AUM health check, used by integrity functions |
| `v_ledger_position_mismatches` | Yes — `systemAdminService` | `run_daily_health_check` | No | **KEEP** — primary reconciliation view |
| `v_ledger_reconciliation` | Yes — `systemAdminService`, `integrityOperationsService` | `assert_integrity_or_raise`, `run_integrity_pack`, `run_comprehensive_health_check` | No | **KEEP** — core integrity view, most DB function consumers |
| `v_liquidity_risk` | Yes — `systemAdminService`, `useRiskAlerts`, `SystemIntegrityStatus` | No | No | **KEEP** — active risk monitoring |
| `v_orphaned_positions` | Yes — `systemAdminService`, `integrityOperationsService` | `run_integrity_pack` | No | **KEEP** — orphan detection |
| `v_orphaned_transactions` | Yes — `systemAdminService`, `useRiskAlerts` | No | No | **KEEP** — active monitoring |
| `v_yield_conservation_violations` | Type def only (viewTypes) | `run_integrity_pack`, `run_comprehensive_health_check`, `run_daily_health_check` | No | **KEEP** — financial invariant check, 3 DB consumers |

### 3.2 Consolidation Plan

Doc 08 proposed reducing 21 views to 5. Currently there are 10 views. Further reduction:

**Proposed 5 Canonical Views**:
1. `v_ledger_reconciliation` — Core ledger vs position reconciliation (absorbs `v_cost_basis_mismatch`, `v_ledger_position_mismatches`)
2. `v_fund_aum_position_health` — AUM health monitoring (keep as-is)
3. `v_orphaned_entities` — All orphans in one view (merge `v_orphaned_positions`, `v_orphaned_transactions`, `v_fee_calculation_orphans`)
4. `v_risk_dashboard` — Consolidated risk (merge `v_concentration_risk`, `v_liquidity_risk`)
5. `v_yield_conservation_violations` — Financial invariant (keep as-is)

**Views to Merge**:
| Source | Target | Reason |
|--------|--------|--------|
| `v_cost_basis_mismatch` | `v_ledger_reconciliation` | Cost basis mismatches are a subset of ledger reconciliation |
| `v_ledger_position_mismatches` | `v_ledger_reconciliation` | Position mismatches are a subset of ledger reconciliation |
| `v_orphaned_positions` + `v_orphaned_transactions` + `v_fee_calculation_orphans` | `v_orphaned_entities` | All orphan detection, unified entity type column |
| `v_concentration_risk` + `v_liquidity_risk` | `v_risk_dashboard` | Both are risk metrics, unified with `risk_type` column |

### 3.3 Migration Complexity

- All views are non-materialized (no `REFRESH` concerns)
- Frontend references need updating in: `systemAdminService.ts`, `integrityOperationsService.ts`, `useRiskAlerts.ts`, `SystemIntegrityStatus.tsx`, `viewTypes.ts`
- DB function references need updating in: `run_integrity_pack`, `run_daily_health_check`, `run_comprehensive_health_check`, `assert_integrity_or_raise`, `check_aum_position_health`

---

## 4. Frontend Dead Code Inventory

### 4.1 Deprecated Re-Export Modules (Zero Importers)

| File | @deprecated Message | Importers | Recommendation |
|------|---------------------|-----------|----------------|
| `src/services/ib/index.ts` | "Import directly from @/features/admin/ib/services/" | 0 | **DELETE** |
| `src/services/core/index.ts` | "Import directly from feature paths instead" | 0 | **DELETE** |
| `src/lib/export/csv-export.ts` | "Import from @/utils/export/csv-export instead" | 0 | **DELETE** |
| `src/lib/pdf/statementGenerator.ts` | "Import from @/features/admin/reports/lib/statementGenerator instead" | 0 | **DELETE** |
| `src/lib/pdf/chart-export.ts` | "Import from @/features/admin/reports/lib/chart-export instead" | 0 | **DELETE** |

### 4.2 Deprecated Types/Functions Still in Use

| Item | Location | @deprecated Message | Still Used By | Recommendation |
|------|----------|---------------------|--------------|----------------|
| `FeeAllocation` | `feesService.ts` | "Use PlatformFeeLedgerEntry instead" | 6 files | **Migrate** — rename imports in 6 consumers, then remove alias |
| `useInvestorPositions` | `useInvestorDetailHooks.ts` | "Use useAdminInvestorPositions instead" | 5+ files | **Migrate** — replace with canonical hook in all consumers |
| `createWithdrawalRequest` | `investorPortfolioService.ts` | "Use withdrawalService.submitInvestorWithdrawal() directly" | 2 files (usePortfolio, investorWithdrawalService) | **Migrate** — delegate calls already exist, just remove wrapper |
| `upsertStatement` | `reportUpsertService.ts` | "Use strictInsertStatement instead" | `StatementManager.tsx` | **Migrate** — 1 consumer, switch to strictInsert |

### 4.3 V3 RPC Signatures (Type-Only Dead Code)

| Item | Location | Usage | Recommendation |
|------|----------|-------|----------------|
| `apply_adb_yield_distribution_v3` | `rpcSignatures.ts` | Type def only, no RPC calls | **REMOVE** from rpcSignatures when DB function drops |
| `preview_adb_yield_distribution_v3` | `rpcSignatures.ts` | Type def only, no RPC calls | **REMOVE** from rpcSignatures when DB function drops |
| `preview_daily_yield_to_fund_v3` | `rpcSignatures.ts` | Type def only, no RPC calls | **REMOVE** from rpcSignatures when DB function drops |
| `batch_crystallize_fund` | `rpcSignatures.ts` | Type def only, no RPC calls | **REMOVE** from rpcSignatures when DB function drops |

### 4.4 Disabled/Backup Test Files

None found — no `.disabled` or `.bak` suffixed files in `src/`.

### 4.5 Commented-Out Code Blocks (>5 lines)

| File | Description | Recommendation |
|------|-------------|----------------|
| `src/features/admin/system/services/dataIntegrityService.ts:94` | `// const negativeBalances = await this.checkNegativeBalances();` | Single line, not a block — low priority |
| `src/routing/AdminRoute.tsx` | Large comment block | Inspect — likely route documentation |
| `src/config/environment.ts` | Large comment block | Likely env var documentation |

No significant commented-out code blocks found. Codebase is clean in this regard.

---

## 5. Backup Table Status

**Result**: Zero backup tables exist in the public schema.

The register (#07) mentioned 8 backup tables. These have been cleaned up in the migration squash (`20260415000000_squash_canonical_baseline.sql`) or earlier.

Query:
```sql
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
  AND (tablename LIKE '%backup%' OR tablename LIKE '%_bak%'
       OR tablename LIKE '%old%' OR tablename LIKE '%archive%');
```

**No rows returned.** This item is RESOLVED.

---

## 6. Stale Table Status (From Register #07)

| Table | Exists | Frontend Usage | Recommendation |
|-------|--------|---------------|----------------|
| `error_code_metadata` | Yes | `platformErrors.ts` (client-side mirror) | **VERIFY** — used for error code mapping, check if actually queried |
| `rate_limit_config` | Yes | Type def only | **DROP** — no rate limiting implementation found |
| `risk_alerts` | Yes | Type def only (viewTypes) | **VERIFY** — no active frontend consumer beyond type definitions |
| `qa_entity_manifest` | No (dropped in squash) | N/A | **RESOLVED** — already dropped |

---

## 7. Migration Plan

### Phase 1: Immediate Drops (Zero Risk — No Callers)

**Migration 1a: Drop Dead DB Functions**
```
DROP FUNCTION IF EXISTS batch_crystallize_fund;
DROP FUNCTION IF EXISTS apply_adb_yield_distribution_v3;
DROP FUNCTION IF EXISTS preview_adb_yield_distribution_v3;
DROP FUNCTION IF EXISTS preview_daily_yield_to_fund_v3;
DROP FUNCTION IF EXISTS sync_position_last_tx_date;
DROP FUNCTION IF EXISTS sync_profile_last_activity;
DROP FUNCTION IF EXISTS cleanup_dormant_positions;
DROP FUNCTION IF EXISTS export_investor_data;
DROP FUNCTION IF EXISTS initialize_crystallization_dates;
DROP FUNCTION IF EXISTS initialize_fund_aum_from_positions;
DROP FUNCTION IF EXISTS batch_initialize_fund_aum;
DROP FUNCTION IF EXISTS reset_all_data_keep_profiles;
DROP FUNCTION IF EXISTS create_profile_on_signup;
```

**Migration 1b: Drop Dead Tables**
```
DROP TABLE IF EXISTS rate_limit_config;
```

**Migration 1c: Remove Dead Frontend Files**
```
DELETE: src/services/ib/index.ts
DELETE: src/services/core/index.ts
DELETE: src/lib/export/csv-export.ts
DELETE: src/lib/pdf/statementGenerator.ts
DELETE: src/lib/pdf/chart-export.ts
```

**Migration 1d: Clean rpcSignatures.ts**
- Remove 4 V3 + batch_crystallize_fund entries from `rpcSignatures.ts`
- Remove corresponding entries from `database.types.ts` (both src and supabase/functions)

### Phase 2: Deprecation Markers (Low Risk — Add Comments, Not Drops)

**Migration 2a: Add DEPRECATED markers to redundant sync functions**
```sql
COMMENT ON FUNCTION sync_aum_on_position_change IS 'DEPRECATED: Redundant with sync_aum_on_transaction. Remove trigger in Phase 3.';
COMMENT ON FUNCTION sync_fund_aum_after_position IS 'DEPRECATED: Redundant AUM sync path. Remove trigger in Phase 3.';
COMMENT ON FUNCTION sync_profile_role_from_profiles IS 'DEPRECATED: Duplicate of sync_profile_role_from_roles. Remove trigger in Phase 3.';
COMMENT ON FUNCTION sync_yield_distribution_legacy_totals IS 'DEPRECATED: Legacy totals sync. Verify still needed before Phase 3 removal.';
COMMENT ON FUNCTION sync_all_fund_aum IS 'DEPRECATED: Triggers handle AUM sync. Keep as admin break-glass only.';
COMMENT ON FUNCTION sync_aum_to_positions IS 'DEPRECATED: Reverse-direction sync not normally needed.';
COMMENT ON FUNCTION sync_transaction_aum_after_yield IS 'DEPRECATED: Redundant with sync_aum_on_transaction trigger.';
```

**Migration 2b: Mark force_delete_investor as restricted**
```sql
COMMENT ON FUNCTION force_delete_investor IS 'DEPRECATED: Dangerous. Use only in emergency data cleanup.';
```

### Phase 3: Trigger/Function Removal (Medium Risk — Requires Testing)

**Migration 3a: Remove redundant AUM sync triggers**
```
DROP TRIGGER trg_sync_aum_on_position ON investor_positions;
DROP TRIGGER trg_sync_aum_after_position ON investor_positions;
-- Then DROP the functions
```

**Migration 3b: Remove duplicate profile role trigger**
```
DROP TRIGGER trg_sync_profile_role_from_profiles ON profiles;
-- Then DROP FUNCTION sync_profile_role_from_profiles;
```

**Migration 3c: Remove legacy totals trigger**
- First verify `sync_yield_distribution_legacy_totals` is no longer needed
- If confirmed: `DROP TRIGGER trg_sync_yield_distribution_legacy_totals ON yield_distributions;`

**Phase 3 depends on**: Full regression tests for AUM sync, position updates, and yield distribution flows.

### Phase 4: View Consolidation (Higher Risk — Frontend + DB Changes)

1. Create `v_orphaned_entities` (merge 3 orphan views)
2. Create `v_risk_dashboard` (merge 2 risk views)
3. Update `v_ledger_reconciliation` to absorb `v_cost_basis_mismatch` + `v_ledger_position_mismatches`
4. Update all frontend consumers (5 files)
5. Update all DB function consumers (5 functions)
6. Drop old views

**Phase 4 depends on**: Frontend migration, DB function updates, integration tests.

### Phase 5: Frontend Type Migration

1. Replace `FeeAllocation` with `PlatformFeeLedgerEntry` in 6 consumers
2. Replace `useInvestorPositions` with `useAdminInvestorPositions` in 5+ files
3. Replace `createWithdrawalRequest` calls with `withdrawalService.submitInvestorWithdrawal()`
4. Replace `upsertStatement` with `strictInsertStatement` in `StatementManager.tsx`

---

## 8. Summary Statistics

| Category | Total | Drop | Deprecate | Keep | Verify |
|----------|-------|------|-----------|------|--------|
| DEPRECATED DB functions | 1 | 1 | 0 | 0 | 0 |
| V3 yield functions | 3 | 3 | 0 | 0 | 0 |
| Stale admin functions | 10 | 8 | 1 | 1 | 0 |
| Trigger-bound sync functions | 24 | 0 | 4 | 20 | 0 |
| Non-trigger sync functions | 5 | 2 | 3 | 0 | 0 |
| Reconciliation views | 10 | 0 | 0 | 5 | 0 |
| Views to merge | 5 | (5) | 0 | 0 | 0 |
| Stale frontend re-exports | 5 | 5 | 0 | 0 | 0 |
| Deprecated frontend types/hooks | 4 | 0 | 0 | 0 | 4 (migrate) |
| Backup tables | 0 | 0 | 0 | 0 | 0 |
| Stale tables | 3 | 1 | 0 | 0 | 2 |

**Total items to DROP**: 20 functions + 1 table + 5 frontend files = 26 removals
**Total items to DEPRECATE (comment only)**: 5 sync functions + 1 admin function = 6 markers
**Total items to MERGE**: 5 views → 2 new views
**Total items to MIGRATE**: 4 frontend type/hook replacements