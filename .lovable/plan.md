

# Full Platform Audit Report — Senior Developer / CTO Review

## Executive Summary

Based on a complete codebase and live database inspection, the platform is in strong shape. All 6 integrity views return **0 violations**. The critical bugs encountered during the go-live session have been fixed. One minor code fix remains, and the RPC signatures file has known documentation debt that does not affect runtime behavior.

---

## SECTION A: BUGS ENCOUNTERED & RESOLUTION STATUS

### A1. Resolved Bugs

| # | Bug | Root Cause | Fix | Migration/File | Status |
|---|-----|-----------|-----|----------------|--------|
| 1 | `admin_integrity_runs` CHECK constraint rejects 'running'/'warning' | CHECK only allowed 'pass'/'fail' | Added 'running' and 'warning' to constraint | `20260408141927` | FIXED |
| 2 | Investor cancel withdrawal bypasses state machine | Frontend used `.update()` instead of RPC | Switched to `cancel_withdrawal_by_investor` RPC | Frontend fix | FIXED |
| 3 | `fundService.ts` uses `Number()` for AUM | IEEE 754 precision loss on large balances | Replaced with `parseFinancial().toNumber()` | Frontend fix | FIXED |
| 4 | Yield distribution toast shows "0.000 BTC / 0 investors" | `yieldApplyService.ts` reads wrong field names from V5 RPC response | Added fallback mapping: `rpcResult.gross ?? rpcResult.gross_yield` | Frontend fix | FIXED |
| 5 | `void_yield_distribution` blocked by `CANONICAL_MUTATION_REQUIRED` | Function missing `set_config('indigo.canonical_rpc', 'true', true)` | Rebuilt function with canonical flag | `20260408153659` | FIXED |
| 6 | `edit_transaction` blocked by canonical guard | Same as #5 | Same migration | `20260408153659` | FIXED |
| 7 | `delete_transaction` blocked by canonical guard | Same as #5 | Same migration | `20260408153659` | FIXED |
| 8 | `void_yield_distribution` → `recalculate_fund_aum_for_date(uuid, date, aum_purpose)` does not exist | Function rebuilt with stale 3-arg signature; live DB only has 2-arg version | Rebuilt with `recalculate_fund_aum_for_date(fund_id, date)` | `20260408154352` | FIXED |
| 9 | Indigo Fees SOL double-credited during void+reissue | DUST_SWEEP credit not reversed on void; reissue added second credit | Compensating DUST_SWEEP debit + position recompute | Data fix | FIXED |
| 10 | `sync_ib_account_type` trigger overwrites account types | Trigger fired on profile update, resetting account_type | Trigger removed | Migration | FIXED |
| 11 | IEEE 754 full-exit precision loss | JS floating-point rounding causes sub-satoshi residuals | UI floors to 10 decimal places before submitting | Frontend fix | FIXED |
| 12 | Yield conservation violations | Rounding drift between header gross and sum of allocations | Engine uses ROUND(..., 18) matching numeric(38,18) | Migration | FIXED |

### A2. Remaining Bug (1 item)

| # | Bug | File | Line | Current | Required Fix |
|---|-----|------|------|---------|-------------|
| 13 | `MonthlyReportsTable` uses `parseFloat()` for financial edit | `src/features/admin/investors/components/reports/MonthlyReportsTable.tsx` | 115 | `parseFloat(trimmed)` | `parseFinancial(trimmed).toNumber()` |

**Risk**: Low — only triggers when admin manually edits a report cell value. But violates the platform's financial precision standard.

---

## SECTION B: LIVE DATABASE INTEGRITY (verified 2026-04-08)

| Integrity View | Violations |
|---|---|
| `v_ledger_reconciliation` | **0** |
| `v_cost_basis_mismatch` | **0** |
| `v_position_transaction_variance` | **0** |
| `yield_distribution_conservation_check` | **0** |
| `v_orphaned_transactions` | **0** |
| `v_transaction_distribution_orphans` | **0** |

---

## SECTION C: CANONICAL MUTATION GUARD AUDIT

All functions that UPDATE/DELETE on `transactions_v2` or `investor_positions` have been verified:

| Function | Has `indigo.canonical_rpc` flag | Verified |
|---|---|---|
| `void_yield_distribution` | YES | Confirmed in `prosrc` |
| `edit_transaction` | YES | Confirmed |
| `delete_transaction` | YES | Confirmed |
| `void_transaction` | YES | Confirmed |
| `apply_investor_transaction` (both overloads) | YES | Confirmed |

---

## SECTION D: RPC SIGNATURE CONTRACT AUDIT

### D1. Ghost RPCs (in contract but not in DB)
All 3 Tier 0 ghosts (`fix_cost_basis_anomalies`, `fix_doubled_cost_basis`, `fix_position_metadata`) have been **removed** from `rpcSignatures.ts`.

Additionally, `batch_crystallize_fund`, `get_kpi_metrics`, and `upsert_fund_aum_after_yield` do not exist in the DB but are also **not referenced** anywhere in the codebase — no runtime impact.

### D2. Parameter Order
PostgreSQL uses **named parameters** for RPC calls via Supabase (JSON object, not positional). The `CRITICAL_RPCS_TO_FIX.md` Tier 2 warnings about parameter order are a **false alarm** — Supabase sends parameters by name, not position. The frontend's alphabetical ordering in the contract metadata is irrelevant at runtime.

### D3. Parameter Count Mismatches
The Tier 1 items (`adjust_investor_position`, `force_delete_investor`, `route_withdrawal_to_fees`) have been verified: the current `rpcSignatures.ts` entries match the live DB signatures.

### D4. Recommendation
The `CRITICAL_RPCS_TO_FIX.md` document is **stale** and should be archived or deleted. Most issues it describes have been resolved or were false positives.

---

## SECTION E: SECURITY AUDIT

| Check | Result |
|---|---|
| SECURITY DEFINER functions missing `search_path = public` | **0** |
| `anon` role can execute mutation RPCs | **No** — REVOKE applied |
| `is_admin()` used in RLS (not `profiles.is_admin`) | **Yes** — verified |
| Audit log immutable (UPDATE/DELETE blocked) | **Yes** — RLS enforced |
| Field-level immutability triggers on `transactions_v2` | **Active** |

---

## SECTION F: FINANCIAL PRECISION AUDIT

| Layer | Standard | Status |
|---|---|---|
| Database columns | `numeric(38,18)` | Compliant |
| RPC amount parameters | String → numeric cast (no JS float) | Compliant |
| Frontend arithmetic | `Decimal.js` mandatory | Compliant (1 exception: Bug #13) |
| Yield engine rounding | `ROUND(..., 18)` | Compliant |
| Conservation identity | `net + fees + IB = gross` per allocation | Verified (0 violations) |

---

## SECTION G: POST-LAUNCH TECH DEBT (P2, non-blocking)

From `docs/POST_LAUNCH_TECH_DEBT.md`:

| Item | Risk | Effort |
|---|---|---|
| `fund_aum_events.trigger_type` CHECK missing 'transaction' | Low | 30 min |
| `v_missing_withdrawal_transactions` false positives | Low | 1 hour |
| `v_position_transaction_variance` missing YIELD type | Low | 1 hour |
| SECURITY DEFINER views linter audit | Medium | 2-3 hours |

---

## SECTION H: IMPLEMENTATION PLAN

### Immediate (1 fix)

**Fix Bug #13** — `MonthlyReportsTable.tsx` line 115:
Replace `parseFloat(trimmed)` with `parseFinancial(trimmed).toNumber()` to maintain the platform's financial precision standard.

### Housekeeping (cleanup)

1. Archive or delete `scripts/CRITICAL_RPCS_TO_FIX.md` — it is stale and misleading
2. Schedule Sprint 1 for the 3 P2 tech debt items (view fixes)
3. Schedule Sprint 2 for SECURITY DEFINER view audit

### Manual E2E Verification (recommended before sign-off)

1. Retry voiding the yield distribution that previously failed
2. Run "Full Check" from Operations page → confirm all 16 checks pass
3. Record a new test yield distribution → verify toast shows correct values
4. Submit and cancel a withdrawal as an investor → confirm RPC path
5. Compare one investor's balance across admin and investor portals

