

# Phase 9 & 10: Scorched Earth Cleanup + Mathematical Validation

## Phase 10: Mathematical Validation -- COMPLETE (ALL PASS)

| Integrity View | Result |
|---|---|
| `v_ledger_reconciliation` | 0 violations |
| `yield_distribution_conservation_check` | 0 violations |
| `investor_position_ledger_mismatch` | 0 violations |
| `position_transaction_reconciliation` | 0 violations |
| `v_orphaned_positions` | 0 orphans |
| `v_orphaned_transactions` | 0 orphans |
| `v_fee_allocation_orphans` | 0 orphans |
| `v_fee_calculation_orphans` | 0 orphans |

**The ledger is mathematically clean. Conservation identity holds across all funds.**

---

## Phase 9: Dead Code Inventory

### Database Layer -- Items to Drop

| # | Artifact | Type | Status | Action |
|---|----------|------|--------|--------|
| 1 | `fund_aum_events` | VIEW | Exists as stub (`WHERE false`) returning NULLs. Zero rows. | **DROP VIEW** |
| 2 | `_v5_check_distribution_uniqueness` | FUNCTION | Active, called by yield engine. Despite `v5` name, logic is current. | **KEEP** (rename later) |
| 3 | `verify_aum_purpose_usage` | FUNCTION | Exists in DB. Legacy diagnostic. | **DROP FUNCTION** |
| 4 | `fund_aum_mismatch` | VIEW | Referenced in docs but **does not exist** in DB. | **Remove from docs/VIEW_INVENTORY.md** |

### Frontend Layer -- Dead Code to Remove

| # | File | Issue | Action |
|---|------|-------|--------|
| 1 | `src/contracts/dbSchema.ts` (lines 451-485) | `investor_yield_events` schema for a dropped table | **Remove entry** |
| 2 | `src/contracts/rpcSignatures.ts` (line 232) | `void_investor_yield_events_for_distribution` -- RPC does not exist in DB | **Remove from list + metadata** |
| 3 | `src/features/admin/funds/services/reconciliationService.ts` | `reconcileFundPeriod()` and `reconcileInvestorPosition()` throw errors unconditionally. `testAllFunctions()` tests them knowing they fail. Dead code. | **Remove dead functions + test harness** (keep `getVoidYieldImpact` and `forceDeleteInvestor`) |
| 4 | `src/features/admin/investors/components/expert/ExpertInvestorDashboard.tsx` | Returns `null`, zero imports anywhere | **Delete file** |
| 5 | `src/integrations/supabase/types.ts` | Contains `fund_aum_events` view type -- auto-generated, will regenerate after view drop | **Auto-fixed by type regen** |

### Contracts Cleanup -- Ghost RPCs in `rpcSignatures.ts`

RPCs listed in the contracts file but **not present in the database**:

| RPC Name | Exists in DB? | Action |
|----------|--------------|--------|
| `void_investor_yield_events_for_distribution` | No | **Remove** |
| `reconcile_fund_aum_with_positions` | No | **Remove** |
| `void_fund_daily_aum` | No | **Remove** |
| `recalculate_all_aum` | No | **Remove** |
| `replace_aum_snapshot` | No | **Remove** |
| `set_fund_daily_aum` | No | **Remove** |
| `sync_all_fund_aum` | No | **Remove** |
| `sync_aum_to_positions` | No | **Remove** |
| `sync_transaction_aum_after_yield` | No | **Remove** |
| `update_fund_daily_aum` | No | **Remove** |
| `update_fund_daily_aum_with_recalc` | No | **Remove** |
| `upsert_fund_aum_after_yield` | No | **Remove** |

These 12 ghost RPCs in the contracts file reference functions that were dropped in the AUM purge migrations. They must be removed from both the `RPC_NAMES` array and the `RPC_SIGNATURES` metadata object.

### Documentation Fixes

| File | Fix |
|------|-----|
| `docs/patterns/VIEW_INVENTORY.md` | Remove `fund_aum_mismatch` from "Admin Integrity Views" (does not exist). Note `fund_aum_events` as dropped stub. |

---

## Implementation Steps

### Step 1: Migration -- Drop DB dead weight
```sql
DROP VIEW IF EXISTS fund_aum_events;
DROP FUNCTION IF EXISTS verify_aum_purpose_usage();
```

### Step 2: Clean `rpcSignatures.ts`
Remove the 12 ghost RPC entries from `RPC_NAMES` array and their corresponding metadata blocks.

### Step 3: Clean `dbSchema.ts`
Remove the `investor_yield_events` table entry.

### Step 4: Clean `reconciliationService.ts`
Remove `reconcileFundPeriod`, `reconcileInvestorPosition`, their interfaces (`FundPeriodReconciliationResult`, `InvestorPositionReconciliationResult`), and the `testAllFunctions` harness. Keep `getVoidYieldImpact` and `forceDeleteInvestor`.

### Step 5: Delete dead component
Delete `src/features/admin/investors/components/expert/ExpertInvestorDashboard.tsx`.

### Step 6: Update VIEW_INVENTORY.md
Remove `fund_aum_mismatch` reference, add note about `fund_aum_events` stub being dropped.

### Step 7: Verify
Run `npx tsc --noEmit` to confirm no type breakage.

