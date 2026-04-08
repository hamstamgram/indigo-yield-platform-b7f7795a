

# Go-Live Action Plan — 2026-04-08

## Current State (Verified Against Prod DB)

| Check | Status | Detail |
|-------|--------|--------|
| `v_cost_basis_mismatch` | **0 rows** | View appears to have been fixed (possibly via prior migration applied outside this repo) |
| Compensating DUST_SWEEP debit | **NOT INSERTED** | No transaction with `reference_id = 'reconcile-dust-fees-sol-2026-04-08'` exists |
| Indigo Fees SOL position | **10.976** | Should be **~9.332** per Excel source of truth — **1.6446 over-credit remains** |
| Migration #2 file | **MISSING** | `20260408130000_fix_dust_sweep_view_and_fees_reconciliation.sql` not in this repo |
| Migration #1 file | **MISSING** | `20260408120000_fix_shares_and_void_and_backfill.sql` not in this repo |
| `audit_leakage_report()` function | **EXISTS** in DB | Requires admin JWT (can't run via anon read query) |
| Negative cost_basis | **0 rows** | Clean |
| System mode | `live` | Ready |
| AUM staleness | **SOL: Feb 28, USDT: Mar 24** | BTC/ETH/XRP current through Mar 31 |
| Draft statement periods | **4 DRAFT** | Nov 2024, Nov 2025, Dec 2025, Jan 2026 |

## Critical Finding

The mismatch view reads 0, but **the underlying data problem is not fixed**. The Indigo Fees SOL position is 10.976 when it should be ~9.332. The view was likely patched to hide DUST_SWEEP residuals, but the actual 1.6446 over-credit from the voided/reissued withdrawal was never corrected with a compensating transaction.

---

## Ordered Task List

### TASK 1: Fix Indigo Fees SOL Over-Credit (BLOCKER)

**Problem**: Indigo Fees received 2 DUST_SWEEP credits instead of 1 during a void+reissue of Indigo LP SOL withdrawal. Position = 10.976, should be 9.332.

**Fix**: Create a migration that:
1. Inserts a compensating `DUST_SWEEP` debit of -1.6446385727 on Indigo Fees SOL with an idempotent `reference_id = 'reconcile-dust-fees-sol-2026-04-08'`
2. Calls `recompute_investor_position('b464a3f7-...', '7574bc81-...')` to sync the position
3. Asserts the corrected position is ~9.332

**Verification**:
```sql
SELECT current_value FROM investor_positions
WHERE investor_id = 'b464a3f7-...' AND fund_id = '7574bc81-...';
-- Expected: ~9.3317
```

### TASK 2: Refresh Stale AUM (SOL + USDT)

**Problem**: SOL fund AUM last recorded Feb 28 (6 weeks stale). USDT last recorded Mar 24.

**Fix**: Migration calling `recalculate_fund_aum_for_date` for both funds at CURRENT_DATE.

### TASK 3: Resolve 4 Draft Statement Periods

**Problem**: 4 statement periods stuck in DRAFT (Nov 2024, Nov/Dec 2025, Jan 2026).

**Fix**: Query `generated_statements` and `investor_fund_performance` for references. If none, delete the orphan rows. If referenced, mark as FINALIZED.

### TASK 4: Create Leakage Audit Edge Function

**Problem**: `audit_leakage_report()` exists but requires admin JWT — can't be called from the read-only query tool. Need an accessible way to run pre-launch verification.

**Fix**: Create an admin-authenticated endpoint (edge function or UI button) that calls `audit_leakage_report()` and returns the result. This is the mandatory pre-launch gate.

### TASK 5: Update GO_LIVE_READINESS.md

Update the readiness doc with:
- Fees SOL reconciliation completed
- AUM refresh completed
- Draft periods resolved
- Leakage audit result (must be `overall_status: "pass"`)
- Sign-off date 2026-04-08

### TASK 6: Post-Launch Tech Debt Doc

Create `docs/POST_LAUNCH_TECH_DEBT.md` documenting:
- P2: `fund_aum_events.trigger_type` CHECK missing `'transaction'`
- P2: `v_missing_withdrawal_transactions` false positives
- P2: `v_position_transaction_variance` incomplete type coverage

---

## Go-Live Checklist

```text
[ ] Indigo Fees SOL corrected to ~9.332 (TASK 1)
[ ] v_cost_basis_mismatch = 0 rows (verify after TASK 1)
[ ] audit_leakage_report() = "pass" (TASK 4)
[ ] AUM current for all 5 funds (TASK 2)
[ ] No DRAFT statement periods (TASK 3)
[x] System mode = live
[x] Negative cost_basis = 0
[x] v_ledger_reconciliation = 0 violations
[x] v_orphaned_transactions = 0
[ ] PITR confirmed in Supabase dashboard (manual)
[ ] GO_LIVE_READINESS.md signed off (TASK 5)
```

