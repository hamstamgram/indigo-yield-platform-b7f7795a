# Audit 35 — Void Isolation Level Incident
**Date:** 2026-04-14  
**Severity:** Production blocker (void/unvoid path completely non-functional)  
**Status:** RESOLVED  
**Migration:** `20260414000010_fix_void_isolation_level_blocker.sql`

---

## Incident Summary

All calls to `void_transaction` and `unvoid_transaction` via Supabase RPC were failing with:

```
SET TRANSACTION ISOLATION LEVEL must be called before any query
```

This blocked the entire void/unvoid verification path in the UI. Since voiding is part of the core go-live checklist, functional UI testing could not proceed.

---

## Root Cause

### PostgreSQL transaction boundary rule

`SET TRANSACTION ISOLATION LEVEL` is a transaction-level command that must execute before any query runs in the current transaction. Once any query, DML, lock, or `SET LOCAL` call has executed, PostgreSQL locks in the isolation level and raises an error if you attempt to change it.

### Why this fails in Supabase/PostgREST

PostgREST does not give your RPC function a fresh, empty transaction. Before your function body executes line 1, PostgREST has already:

1. Issued `BEGIN` (implicit transaction open)
2. Executed `SET LOCAL role TO authenticated`
3. Executed `SET LOCAL request.jwt.claims TO '...'`
4. Executed `SET LOCAL request.jwt.role TO '...'`

All of those are queries within the transaction. The isolation level is already fixed at `READ COMMITTED` (PostgreSQL default) by the time any RPC function body starts. `SET TRANSACTION ISOLATION LEVEL SERIALIZABLE` inside a function body is therefore always illegal in this execution model — regardless of whether it is the first line of the function.

### Additional compounding factor — the `_with_lock` call chain

`void_transaction_with_lock` performed a `SELECT fund_id FROM transactions_v2` before calling `void_transaction`. Even if PostgREST had not already run queries (which it had), this wrapper query guaranteed the error before the inner function was ever reached.

### Why the broken code existed

The planning document `docs/superpowers/plans/2026-05-05-financial-architecture-hardening.md` contained pseudocode with `SET TRANSACTION ISOLATION LEVEL SERIALIZABLE` inside the function bodies. This pseudocode was applied directly to the live database (via dashboard SQL editor or an untracked migration) rather than through the corrected repo migration files. The corrected repo migrations (`20260505000000_void_transaction_isolation.sql` etc., dated May 2026) existed in the codebase but had not been applied.

### Secondary bugs found in the old live functions

| Function | Additional bug |
|---|---|
| `void_transaction` | Wrong column: `aum` instead of `total_aum` on `fund_daily_aum` |
| `void_transaction` | Missing cascade: only 3 steps instead of 9 (no fee, IB, platform fee, yield event cascade) |
| `unvoid_transaction` | Wrong column: `aum` instead of `total_aum` on `fund_daily_aum` |
| `unvoid_transaction` | Wrong `audit_log` column names: `entity_type`, `performed_by`, `details` (non-existent) |
| `apply_yield_distribution_v5_with_lock` | Completely wrong call signature: `(investor_id, fund_id, yield_amount)` instead of the 7-parameter actual signature |
| `void/unvoid_transaction_with_lock` | Used `pg_advisory_lock`/`pg_advisory_unlock` pairs (can leak on error) instead of `pg_advisory_xact_lock` |

---

## Fix Applied

Migration `20260414000010_fix_void_isolation_level_blocker.sql` applied 2026-04-14.

### Functions replaced

| Function | Change |
|---|---|
| `void_transaction(uuid, uuid, text)` | Removed `SET TRANSACTION ISOLATION LEVEL`. Deployed full 9-step cascade. Fixed column names. |
| `unvoid_transaction(uuid, uuid, text)` | Removed `SET TRANSACTION ISOLATION LEVEL`. Fixed audit_log column names. |
| `void_transaction_with_lock(uuid, uuid, text)` | Converted `pg_advisory_lock`/unlock → `pg_advisory_xact_lock` |
| `unvoid_transaction_with_lock(uuid, uuid, text)` | Converted `pg_advisory_lock`/unlock → `pg_advisory_xact_lock` |
| `apply_yield_distribution_v5_with_lock(...)` | Fixed call signature. Converted to `pg_advisory_xact_lock`. Dropped old broken overload `(uuid, uuid, numeric)`. |

### What was NOT changed

- Advisory locking strategy (preserved, just converted lock type)
- Cascade targets and cascade logic (preserved, extended to full 9-step)
- `SET` canonical RPC flags (preserved)
- Admin authorization checks (preserved, enhanced with dual check)
- `SELECT FOR UPDATE` row locking in `unvoid_transaction` (preserved)
- `void_completed_withdrawal` (not affected — does not call `void_transaction`)

### Why financial correctness is maintained

- **Atomicity**: All 9 cascade steps run in the same PostgreSQL transaction (all-or-nothing). No change needed.
- **Concurrency**: `pg_advisory_xact_lock` on the transaction ID (inner) and fund ID (outer wrappers) prevents concurrent operations. Equivalent or stronger than the prior `pg_advisory_lock` pattern.
- **`SERIALIZABLE` isolation was never effective**: PostgREST had already fixed isolation level at `READ COMMITTED` before the function ran. Removing the statement changes nothing about actual isolation behaviour — it was a no-op that happened to throw an error.
- **`READ COMMITTED` with advisory locks is sufficient**: For the void cascade pattern (all writes to known row IDs), there are no phantom read risks that require SERIALIZABLE. The advisory locks provide the needed mutual exclusion.

---

## Verification Performed

```sql
-- Confirmed zero executable SET TRANSACTION ISOLATION LEVEL lines:
SELECT p.proname,
  (SELECT COUNT(*) FROM unnest(string_to_array(pg_get_functiondef(p.oid), E'\n')) AS line
   WHERE TRIM(line) LIKE 'SET TRANSACTION ISOLATION LEVEL%') AS executable_isolation_lines
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('void_transaction', 'unvoid_transaction');
-- Result: 0 for both functions ✓
```

---

## Secondary Bug — `updated_at` on `transactions_v2` (discovered same session)

**Migration:** `20260414000020_fix_updated_at_on_transactions_v2.sql`  
**Status:** RESOLVED

### Incident

Every call to `void_transaction` and `unvoid_transaction` after `20260414000010` was applied failed with:

```
column "updated_at" of relation "transactions_v2" does not exist
```

### Root Cause

Migration `20260414000010` included `updated_at = NOW()` in both `UPDATE public.transactions_v2` statements — one in `void_transaction` (Step 1) and one in `unvoid_transaction`. `transactions_v2` is an intentionally append-only financial ledger with no `updated_at` column. Void state is expressed through five dedicated columns: `is_voided`, `voided_at`, `voided_by`, `voided_by_profile_id`, `void_reason`. The `updated_at` assignment was copied from planning doc pseudocode without schema verification.

The other `updated_at = NOW()` clauses in those same functions (Steps 2, 3, 5, 6, 7, 8) target `fund_aum_events`, `fund_daily_aum`, `fee_allocations`, `ib_commission_ledger`, `platform_fee_ledger`, `investor_yield_events` — those tables have the column and are unaffected.

### Fix

Removed `updated_at = NOW()` from both `UPDATE public.transactions_v2` statements. No column added. No schema change.

### Verification

```sql
-- Confirmed: zero updated_at references in transactions_v2 UPDATE blocks
-- void_transaction UPDATE public.transactions_v2 at line N
-- first updated_at appears 17 lines later (fund_aum_events cascade block)
-- lines 42-57 (the SET/WHERE clause of the transactions_v2 UPDATE) produced no updated_at matches
```

### Architectural Rule Reinforced

> **Never assume `transactions_v2` has `updated_at`.** It is an append-only ledger. Void state lives in dedicated columns. Any migration touching `transactions_v2` must be verified against its live schema before deployment.

---

## Post-Fix Testing Required

Before resuming go-live UI testing, the following must be verified via the UI (not SQL editor — must use PostgREST RPC with authenticated token):

- [ ] `void_transaction` returns `{"success": true, ...}` with cascade counts
- [ ] `unvoid_transaction` returns `{"success": true, ...}`
- [ ] Void cascade: `aum_events_voided`, `fee_allocations_voided`, `ib_ledger_voided`, `yield_events_voided` non-zero where applicable
- [ ] AUM reconciliation: `SUM(investor_positions.current_value) = fund_daily_aum.total_aum` within 0.01 after void
- [ ] Completed withdrawal void (`void_completed_withdrawal`) — unaffected but confirm still works
- [ ] Yield apply (`apply_segmented_yield_distribution_v5`) — unaffected but confirm still works

---

## Architectural Rule Going Forward

> **Never use `SET TRANSACTION ISOLATION LEVEL` inside a PL/pgSQL function body called via Supabase RPC.**

PostgREST owns the transaction. Functions run inside an already-started transaction with auth context queries already executed. If SERIALIZABLE isolation is ever genuinely required for a specific operation, it must be set at the connection level before the RPC call — which is not supported in standard PostgREST mode.

For all financial correctness requirements in this platform: advisory locks (`pg_advisory_xact_lock`) combined with `SELECT FOR UPDATE` row locking and PostgreSQL transaction atomicity are the correct and sufficient mechanisms.
