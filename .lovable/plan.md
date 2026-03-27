

# Platform Certification Report -- Indigo Yield Platform

## Overview

This plan covers a 4-phase audit: visual architecture diagrams, dead code identification, Excel parity verification, and a final structural risk assessment. Implementation will produce 3 Mermaid diagrams, a dead code purge list, parity scripts execution, and any required fixes.

---

## PHASE 1: Visual Blueprint Generation (3 Mermaid Diagrams)

### Diagram 1: Database ERD

Core tables and relationships to render:

```text
transactions_v2 (L0 ledger, source of truth)
  |-- investor_id --> profiles.id
  |-- fund_id --> funds.id
  |-- distribution_id --> yield_distributions.id
  |
  +-- triggers: trg_ledger_sync --> fn_ledger_drives_position --> investor_positions
  +-- triggers: trg_recompute_on_void --> recompute_on_void --> investor_positions

investor_positions (L1 derived cache)
  |-- (investor_id, fund_id) composite PK
  |-- driven ONLY by trg_ledger_sync

yield_distributions 1-->* yield_allocations (per investor)
yield_distributions 1-->* fee_allocations (per investor)
yield_distributions 1-->* ib_allocations (per IB)
yield_distributions 1-->* ib_commission_ledger
yield_distributions 1-->* platform_fee_ledger
yield_distributions 1-->* transactions_v2 (YIELD, FEE_CREDIT, IB_CREDIT rows)

fund_daily_aum (L1 cache)
  |-- fund_id --> funds.id
  |-- driven by recalculate_fund_aum_for_date()
```

### Diagram 2: Trigger & RPC Cascade Flowchart

Two critical paths to render:

**void_transaction(p_transaction_id, p_admin_id, p_reason):**
1. Advisory lock -> Validate admin + tx exists + not voided
2. UPDATE transactions_v2 SET is_voided=true
3. CASCADE: void fund_daily_aum (tx_sync sources)
4. PERFORM recalculate_fund_aum_for_date
5. CASCADE: void fee_allocations by tx_id
6. CASCADE: void ib_commission_ledger by tx_id
7. CASCADE: void platform_fee_ledger by tx_id
8. CASCADE (guarded): void investor_yield_events IF table exists
9. CASCADE: void DUST transactions (both patterns)
10. TRIGGER fires: trg_ledger_sync (incremental delta)
11. TRIGGER fires: trg_recompute_on_void (full recompute)
12. INSERT audit_log

**approve_and_complete_withdrawal(p_request_id, ...):**
1. Advisory lock -> Validate admin + request pending
2. If full_exit: crystallize_yield_before_flow
3. Re-read balance post-crystallization
4. INSERT WITHDRAWAL into transactions_v2
5. If full_exit + dust > 0: INSERT DUST_SWEEP (debit investor) + INSERT DUST_SWEEP (credit fees_account)
6. SET is_active=false on investor_positions
7. UPDATE withdrawal_requests SET status='completed'
8. log_withdrawal_action

### Diagram 3: UI Architecture Map

Key admin feature areas mapped to hooks and RPCs:

| Feature Area | Component Root | Hook | RPC/Service |
|---|---|---|---|
| Yield Distribution | `yields/` | `useYieldDistributions`, `useRecordedYieldsPage` | `apply_segmented_yield_distribution_v5`, `preview_segmented_yield_distribution_v5` |
| Void Transaction | `transactions/` | `useVoidTransaction` | `void_transaction` |
| Void Yield | `yields/` | `useRecordedYieldsPage` | `void_yield_distribution` |
| Withdrawal | `withdrawals/` | `useWithdrawalActions` | `approve_and_complete_withdrawal` |
| Investor Detail | `investors/` | `useInvestorDetail` | `investorDetailService` -> `investor_positions`, `transactions_v2` |
| System Health | `system/` | `useAUMReconciliation`, `useIntegrityChecks` | `check_aum_reconciliation`, `run_integrity_pack` |

**Implementation**: Create 3 `.mmd` files in `/mnt/documents/` and emit `presentation-artifact` tags.

---

## PHASE 2: Dead Code & Ghost Audit

### Files/Functions confirmed orphaned (to delete):

**Scripts (legacy/one-off, never imported by app):**
- `scripts/draft_apply_yield_v6.sql` -- never referenced by frontend or migrations
- `scripts/draft_calculate_yield_v6.sql` -- same
- `scripts/fix_v5_yield.ts` -- legacy V5 fix script
- `scripts/run-eurc-simulation.ts` -- simulation, not referenced
- `scripts/run-grand-simulation.ts` -- simulation, not referenced
- `scripts/trigger-production-sim.ts` -- simulation, not referenced
- `scripts/setup-sim-actors.ts` -- simulation actors
- `supabase/migrations/draft_calculate_yield_distribution.sql` -- draft file in migrations folder (not a real migration, no timestamp prefix)

**Edge Functions (verify usage before deleting):**
- `supabase/functions/grand-simulation/` -- simulation only
- `supabase/functions/reset-positions/` -- dangerous, should not exist in prod
- `supabase/functions/bootstrap-system-users/` -- one-time setup, already run
- `supabase/functions/session-cleanup/` -- verify if pg_cron calls this

**Feature flags marking dead code:**
- `CUSTOM_REPORTS: false` in `src/config/features.ts` -- `reportEngine.ts` and `excelGenerator.ts` are stubs behind this flag. Not actively used.

**Archived migrations (already archived, no action needed):**
- `supabase/archived_migrations/` -- already separated

### NOT orphaned (confirmed wired):
- `commandPaletteService.ts` -- actively used by `useCommandPalette` hook
- `scripts/compare-balances.mjs` -- diagnostic tool, keep

---

## PHASE 3: Golden Excel Parity Verification

### Approach
1. Run `bun run scripts/compare-both-sources.mjs` to compare platform positions against both `fund-balances.json` and `excel-events-v3.json` final balances
2. Run `bun run scripts/analyze-drifts.mjs` to trace any remaining Satoshi-level drifts
3. Query the integrity views via `supabase--read_query`:
   - `SELECT COUNT(*) FROM v_ledger_reconciliation` (must be 0)
   - `SELECT COUNT(*) FROM fund_aum_mismatch` (must be 0)
   - `SELECT COUNT(*) FROM yield_distribution_conservation_check WHERE NOT conservation_met` (must be 0)

### Known parity status (from memory context):
The V5 engine's math is verified to match the Excel within 18-decimal precision. Any remaining drifts are from missing historical capital flows, not math bugs.

---

## PHASE 4: Remaining Structural Risks

| # | Risk | Severity | Detail | Fix |
|---|---|---|---|---|
| 1 | **`statementCalculations.ts` precision pipeline** | P1 | 53 instances of `.toNumber()` mid-pipeline converting Decimal back to JS float. Statements may show dust-level differences from ledger. | Refactor to keep Decimal throughout; only `.toString()` at display boundary. |
| 2 | **`parseFloat()` in 11 admin input components** | P2 | Used for form validation (amounts, percentages). Most are non-arithmetic but `FundPositionCard.tsx` and `PositionsStep.tsx` feed values into position edits. | Replace with `parseFinancial()` for amount fields; keep `parseFloat` for percentage/UI-only fields. |
| 3 | **`draft_calculate_yield_distribution.sql` in migrations folder** | P1 | File has no timestamp prefix so won't run, but pollutes the migration directory and could confuse tooling. | Delete it. |
| 4 | **Void date-scoping for dust** | P2 | `void_transaction` matches dust by `tx_date = v_tx.tx_date`. Edge case: settlement_date differs from dust creation date. | Broaden to also match by embedded request_id in reference_id pattern. |
| 5 | **`reset-positions` Edge Function exists** | CRITICAL | This function can wipe all investor positions. Must not exist in production. | Delete the function directory entirely. |

---

## Implementation Summary

| Step | Action | Files |
|---|---|---|
| 1 | Create 3 Mermaid diagrams | `/mnt/documents/erd.mmd`, `/mnt/documents/cascade_flow.mmd`, `/mnt/documents/ui_architecture.mmd` |
| 2 | Delete dead code | ~8 scripts, 1 draft migration, 3-4 edge function directories |
| 3 | Run parity scripts + integrity queries | Terminal execution of comparison scripts |
| 4 | Fix `statementCalculations.ts` precision | Replace `.toNumber()` pipeline with Decimal-throughout pattern |
| 5 | Delete `reset-positions` edge function | `supabase/functions/reset-positions/` |

Total estimated changes: 3 new diagram files, ~10 file deletions, 1 major refactor (statementCalculations.ts), 0 SQL migrations needed (all DB fixes already deployed).

