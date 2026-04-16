# Financial Logic Domain Audit

**Date**: 2026-04-16
**Status**: COMPLETE
**Auditor**: Agent (opencode)
**Scope**: Financial correctness, type safety in RPC paths, invariant coverage, DEPRECATED marking

---

## Findings

### FL-1 — V3 Yield Functions are Dead Code (SEVERITY: LOW)
**Finding**: `apply_adb_yield_distribution_v3`, `preview_adb_yield_distribution_v3`, and `preview_daily_yield_to_fund_v3` exist in the database but are never called by the frontend. Frontend exclusively uses V5 (`apply_segmented_yield_distribution_v5`).
**Fix**: Added DEPRECATED comments to all three functions via migration `20260416055420_financial_logic_p2_fixes.sql`.
**Status**: FIXED

### FL-2 — `as any` Casts in Financial RPC Paths (SEVERITY: CRITICAL)
**Finding**: `adminTransactionHistoryService.ts` called `void_and_reissue_full_exit` with `rpc.call("void_and_reissue_full_exit" as any, {...} as any)` and cast `parseFinancial(x).toString() as unknown as number` for numeric params. `yieldApplyService.ts` similarly cast `callRPC as any`.
**Fix**: Replaced with typed `rpc.call()` / `callRPC()` and `.toNumber()` for numeric params.
**Status**: FIXED

### FL-3 — `data as any` Untyped Data Access (SEVERITY: HIGH)
**Finding**: `adminTransactionHistoryService.ts` used `data as any` to access response fields without type safety.
**Fix**: Replaced with `Record<string, unknown>` typed access pattern.
**Status**: FIXED

### FL-4 — Unvoid Does Not Restore Cascade-Voided Records (SEVERITY: MEDIUM)
**Finding**: `unvoid_transaction` only restores the transaction itself — yield distributions, fee allocations, and IB ledger entries remain voided. AUM is recalculated, but operator must manually re-apply yield distributions.
**Fix**: Enhanced UI warning in `UnvoidTransactionDialog.tsx` and documented in `DEPLOYMENT_RUNBOOK.md` under "Known Operational Gaps". No DB change — by design.
**Status**: DOCUMENTED (by design)

### FL-5 — `run_invariant_checks()` Check 3 Missing Transaction-Purpose Distributions (SEVERITY: HIGH)
**Finding**: Check 3 (yield conservation) filtered `AND yd.purpose = 'reporting'::aum_purpose`, excluding `purpose = 'transaction'` distributions created by `crystallize_yield_before_flow`. These represent real yield that must also pass conservation checks.
**Fix**: Removed `purpose` filter from Check 3 and Check 12 (ib_allocation_count_matches) in `run_invariant_checks()`.
**Status**: FIXED

### FL-6 — `.toString() as unknown as number` Pattern (SEVERITY: CRITICAL)
**Finding**: Auto-generated types declare numeric RPC params as `number`, so `parseFinancial(x).toString()` creates a type mismatch requiring `as unknown as number` cast — losing type safety.
**Fix**: Changed to `.toNumber()` in `yieldApplyService.ts`.
**Status**: FIXED

### FL-7 — Duplicate `set_config` in `void_transaction` (SEVERITY: LOW)
**Finding**: `void_transaction()` called `set_config('indigo.canonical_rpc', 'true', TRUE)` and `set_config('app.canonical_rpc', 'true', TRUE)` twice — once before the admin check (line 17553-17554) and once after the UPDATE (line 17582-17583). The second set is redundant.
**Fix**: Removed duplicate calls from the function body.
**Status**: FIXED

### FL-8 — Reconciliation Views Lack `security_invoker` (SEVERITY: MEDIUM)
**Finding**: 3 reconciliation views (`v_fee_calculation_orphans`, `v_ledger_position_mismatches`, `v_orphaned_transactions`) lacked `security_invoker = 'on'`, meaning they ran with view owner (postgres) privileges. The remaining 4 views (`v_ledger_reconciliation`, `mv_admin_repair_usage`, `mv_aum_position_drift`, `mv_position_ledger_drift`) were assessed but deferred — they are admin-only materialized views with existing RLS protection.
**Fix**: Added `ALTER VIEW ... SET (security_invoker = on)` for the 3 views.
**Status**: FIXED

---

## Migration

**File**: `supabase/migrations/20260416055420_financial_logic_p2_fixes.sql`
**Applied**: 2026-04-16 to both local and remote (nkfimvovosdehmyyjubn)
**Local test**: `npx supabase db reset` — PASS
**Remote test**: `npx supabase db push --linked` — PASS
**Build test**: `npm run build` — PASS

## Squash Baseline Updates

The canonical squash baseline (`20260415000000_squash_canonical_baseline.sql`) was updated to reflect P2 changes:
- Removed `yd.purpose = 'reporting'::aum_purpose` filter from Check 3 and Check 12 of `run_invariant_checks()`
- Removed duplicate `set_config` calls from `void_transaction()`
- Added DEPRECATED comments to V3 yield functions
- Types regenerated: `src/integrations/supabase/types.ts` (8,564 lines)

## Frontend Changes (P1 — applied 2026-04-15)

| File | Change |
|------|--------|
| `src/features/admin/transactions/services/adminTransactionHistoryService.ts` | Removed `as any` casts, `.toNumber()` for numerics, typed `Record<string, unknown>` access |
| `src/features/admin/yields/services/yields/yieldApplyService.ts` | Removed `callRPC as any`, `.toString() as unknown as number` → `.toNumber()` |
| `src/features/admin/transactions/components/UnvoidTransactionDialog.tsx` | Enhanced cascade warning text |

## Open Items (Not Fixed, Documented)

1. **tsc --noEmit OOM** — TypeScript compiler runs out of memory even at 16GB heap. Pre-existing, not caused by our changes. Build (Vite/esbuild) works fine.
2. **4 remaining views without `security_invoker`** — `v_ledger_reconciliation`, `mv_admin_repair_usage`, `mv_aum_position_drift`, `mv_position_ledger_drift` — deferred, admin-only materialized views with RLS.
3. **V3 functions still exist** — Marked DEPRECATED but not dropped. Consider dropping in a future cleanup.

## Next Domain Options

- **Security**: 216 SECURITY DEFINER functions without admin gates
- **Frontend Contracts**: Enum/RPC alignment between TypeScript and Supabase
- **DevOps**: CI/CD gaps, tsc OOM fix