# PS-3: Repair & Admin Function Isolation

**Phase:** Position Sync Phase 2 — Batch PS-3  
**Date:** 2026-04-28  
**Status:** COMPLETE  
**Duration:** 2 days  
**Purpose:** Formally isolate operator-facing repair/admin functions from production-safe paths  
**Scope:** Documentation, classification, decision tree, restriction recommendations  
**Code changes:** NONE (documentation and analysis only)

---

## A. REPAIR / ADMIN FUNCTION REGISTRY

Every function that can mutate positions, AUM, or related state outside the production
trigger chain is listed here. Production triggers (`fn_ledger_drives_position`,
`sync_aum_on_position_change`, etc.) are **excluded** — they are documented in PS-1
and must never be called directly.

---

### CLASS 1: ROUTINE REPAIR

Functions an admin operator may call during day-to-day operations.
Low blast-radius, well-understood, audit-logged.

#### 1.1 `recompute_investor_position(p_investor_id, p_fund_id)`

| Field | Detail |
|-------|--------|
| **Purpose** | Recalculate a single investor's position from the transaction ledger |
| **Parameters** | `investor_id UUID`, `fund_id UUID` |
| **Returns** | `void` |
| **Admin check** | None (SECURITY DEFINER — relies on caller being trusted) |
| **Locking** | None (no advisory lock) |
| **Dry-run** | No |
| **Audit trail** | None |
| **Correct use** | Investor's displayed balance looks wrong; you want to force a re-read from ledger |
| **Preconditions** | Investor and fund exist; no concurrent bulk repair running |
| **Risks** | Safe. Overwrites position with SUM(ledger). If ledger is wrong, position will be wrong. |
| **Never use for** | Bulk repairs (use `reconcile_all_positions` instead); adjusting a balance that should be adjusted via transaction |
| **Code location** | Baseline line 11718 |

#### 1.2 `recompute_investor_positions_for_investor(p_investor_id)`

| Field | Detail |
|-------|--------|
| **Purpose** | Recalculate **all** positions for a single investor across all funds |
| **Parameters** | `investor_id UUID` |
| **Returns** | `void` |
| **Admin check** | None |
| **Mechanism** | Loops over distinct fund_ids in transactions_v2, calls `recompute_investor_position` for each |
| **Correct use** | Investor has positions in multiple funds and something is off across all of them |
| **Preconditions** | Same as 1.1 for each (investor, fund) pair |
| **Risks** | Low. Serially calls 1.1 for each fund. No concurrency protection. |
| **Never use for** | System-wide repair |
| **Code location** | Baseline line 11790 |

#### 1.3 `reconcile_investor_position_internal(p_fund_id, p_investor_id)`

| Field | Detail |
|-------|--------|
| **Purpose** | Recalculate a single position from ledger and upsert. Similar to 1.1 but different implementation. |
| **Parameters** | `fund_id UUID`, `investor_id UUID` (⚠️ reversed parameter order from 1.1) |
| **Returns** | `void` |
| **Admin check** | None |
| **Mechanism** | SUM(transactions_v2.amount) where is_voided=false; upserts investor_positions |
| **Correct use** | Called internally from `recompute_on_void()` trigger; also safe for manual admin use |
| **Preconditions** | Investor and fund exist |
| **Risks** | Low. Same ledger-driven logic as 1.1 but also handles cost_basis differently (uses DEPOSIT/WITHDRAWAL sign convention) |
| **Known issue** | Parameter order (`fund_id, investor_id`) is reversed from `recompute_investor_position(investor_id, fund_id)` — confusing |
| **Never use for** | Adjustments — this recalculates from ledger, it doesn't add new amounts |
| **Code location** | Baseline line 12029 |

---

### CLASS 2: PRIVILEGED REPAIR

Functions that affect multiple positions or AUM records. Require deliberate
intent. Should always be run with `dry_run = true` first.

#### 2.1 `rebuild_position_from_ledger(p_investor_id, p_fund_id, p_admin_id, p_reason, p_dry_run)`

| Field | Detail |
|-------|--------|
| **Purpose** | Full position rebuild with preview, audit trail, and advisory lock |
| **Parameters** | `investor_id`, `fund_id`, `admin_id`, `reason TEXT`, `dry_run BOOLEAN (default: true)` |
| **Returns** | `JSONB` with old/new values and breakdown |
| **Admin check** | Yes — verifies `profiles.is_admin = true` |
| **Locking** | Advisory lock per (investor, fund) |
| **Dry-run** | Yes ✅ (default: `true`) |
| **Audit trail** | Yes — writes to `audit_log` with old/new values and reason |
| **Correct use** | Investigating corruption for a single position; need to preview before committing |
| **Preconditions** | Admin role; position already exists |
| **Risks** | Low when `dry_run=true`. Medium when `dry_run=false` — overwrites position from ledger |
| **Never use for** | Bulk operations — this is single-position only |
| **Code location** | Baseline line 11466 |

#### 2.2 `reconcile_all_positions(p_dry_run)`

| Field | Detail |
|-------|--------|
| **Purpose** | Find every position that doesn't match its ledger balance and fix (or preview) |
| **Parameters** | `dry_run BOOLEAN (default: true)` |
| **Returns** | `TABLE(investor_id, fund_id, investor_name, fund_name, old_value, new_value, old_shares, new_shares, action)` |
| **Admin check** | Yes — calls `ensure_admin()` |
| **Locking** | None (no advisory lock — ⚠️ gap) |
| **Dry-run** | Yes ✅ (default: `true`) |
| **Audit trail** | Yes — writes to `audit_log` when `dry_run=false` |
| **Correct use** | System-wide reconciliation check. Always run `dry_run=true` first and review output. |
| **Preconditions** | Admin role; no concurrent bulk repair running |
| **Risks** | Medium. Overwrites every mismatched position. Can't be undone. Output shows exactly what changed. |
| **Tolerance** | 0.0001 — positions within this tolerance are not updated |
| **Never use for** | Routine single-position fixes (use 1.1 instead) |
| **Code location** | Baseline line 11860 |

#### 2.3 `reconcile_fund_aum_with_positions()`

| Field | Detail |
|-------|--------|
| **Purpose** | For each fund, set the latest fund_daily_aum to match SUM(investor_positions) |
| **Parameters** | None |
| **Returns** | `TABLE(fund_id, fund_code, old_aum, new_aum, difference)` |
| **Admin check** | None (⚠️ gap — uses canonical_rpc bypass but no explicit admin check) |
| **Locking** | None |
| **Dry-run** | No (⚠️ always writes) |
| **Audit trail** | None (⚠️ gap) |
| **Correct use** | AUM has drifted from positions (Invariant 2 violated); repair AUM from positions |
| **Preconditions** | Positions are correct (run position reconciliation first) |
| **Risks** | Medium. Overwrites AUM records. If positions are wrong, AUM will be wrong too. |
| **Never use for** | Correcting positions — this only fixes AUM |
| **Code location** | Baseline line 11959 |

#### 2.4 `adjust_investor_position(p_investor_id, p_fund_id, p_amount, p_reason, p_tx_date, p_admin_id)`

| Field | Detail |
|-------|--------|
| **Purpose** | Create an ADJUSTMENT transaction that modifies a position |
| **Parameters** | `investor_id`, `fund_id`, `amount NUMERIC`, `reason TEXT`, `tx_date DATE`, `admin_id UUID` |
| **Returns** | `JSONB` with transaction_id, balance_before, balance_after |
| **Admin check** | Yes — calls `is_admin()` |
| **Locking** | Advisory lock per (investor, fund) |
| **Dry-run** | No |
| **Audit trail** | Yes — writes to `audit_log` with old/new balances and reason |
| **Correct use** | You need to change a position by a specific amount AND want a permanent audit-trailed transaction |
| **Preconditions** | Admin role; fund exists; resulting balance must be >= 0 |
| **Risks** | Low-medium. Creates a real ADJUSTMENT transaction. Position updated via trigger chain (not directly). Amount must have correct sign. |
| **Key property** | This is the ONLY repair function that creates a transaction. All others bypass the ledger. |
| **Never use for** | Fixing ledger/position drift (use `recompute_investor_position` — the problem is drift, not a missing transaction) |
| **Code location** | Baseline line 659 |

#### 2.5 `recalculate_all_aum()`

| Field | Detail |
|-------|--------|
| **Purpose** | Loop through all funds, set every non-voided AUM record's total_aum to SUM(investor_positions) |
| **Parameters** | None |
| **Returns** | `JSONB` with funds_fixed count |
| **Admin check** | Yes — calls `check_is_admin(auth.uid())` |
| **Locking** | None |
| **Dry-run** | No (⚠️ always writes) |
| **Audit trail** | Yes — writes to `audit_log` |
| **Correct use** | System-wide AUM drift detected across multiple funds |
| **Preconditions** | Admin role; positions are correct |
| **Risks** | High. Overwrites ALL non-voided AUM records across ALL funds. Appends ` (auto-synced)` to source field. |
| **Never use for** | Single-fund AUM fix (use `reconcile_fund_aum_with_positions` instead) |
| **Code location** | Baseline line 11536 |

#### 2.6 `replace_aum_snapshot(p_fund_id, p_aum_date, p_new_total_aum, p_purpose, p_admin_id, p_reason)`

| Field | Detail |
|-------|--------|
| **Purpose** | Replace an AUM snapshot with a corrected value, voiding the old one |
| **Parameters** | `fund_id`, `aum_date`, `new_total_aum NUMERIC`, `purpose aum_purpose`, `admin_id`, `reason TEXT` |
| **Returns** | `JSONB` |
| **Admin check** | Yes — calls `is_admin()` |
| **Locking** | Advisory lock per (fund, date) |
| **Dry-run** | No, but has built-in validation (rejects >10% deviation from positions) |
| **Audit trail** | Yes — writes to `audit_log` |
| **Correct use** | Manual AUM correction for a specific date — e.g., after importing external data |
| **Preconditions** | Admin role; reason required; new value within 10% of positions |
| **Risks** | Low-medium. Validates before writing. Voids old record (preserves history). |
| **Never use for** | Bulk AUM repair (use `reconcile_fund_aum_with_positions`) |
| **Code location** | Baseline line 12354 |

---

### CLASS 3: BULK / EMERGENCY

Functions with system-wide impact. Require explicit decision and review.

#### 3.1 `batch_reconcile_all_positions()`

| Field | Detail |
|-------|--------|
| **Purpose** | Loop through every position, call `admin_fix_position()` for each |
| **Parameters** | None |
| **Returns** | `JSONB` with success/error counts and total variance |
| **Admin check** | None (⚠️ gap) |
| **Locking** | Advisory lock (`batch_reconcile`, `global`) |
| **Dry-run** | No (⚠️ always writes) |
| **Audit trail** | None (⚠️ gap) |
| **Correct use** | Unknown — delegates to `admin_fix_position()` which is not documented in PS-1 |
| **Preconditions** | ⚠️ Calls an unknown function `admin_fix_position()` — must verify it exists |
| **Risks** | High. No admin check. No dry-run. No audit trail. Processes every position. Uses unknown sub-function. |
| **Status** | **DEPRECATED — Use `reconcile_all_positions(dry_run)` instead** |
| **Code location** | Baseline line 3469 |

#### 3.2 `repair_all_positions()`

| Field | Detail |
|-------|--------|
| **Purpose** | Loop through all unique (investor_id, fund_id) in transactions_v2, call `recompute_investor_position()` for each |
| **Parameters** | None |
| **Returns** | `JSONB` with positions_repaired count |
| **Admin check** | Yes — calls `check_is_admin(auth.uid())` |
| **Locking** | None (⚠️ no advisory lock despite bulk operation) |
| **Dry-run** | No (⚠️ always writes) |
| **Audit trail** | Yes — writes to `audit_log` |
| **Correct use** | Emergency: every position in the system may be wrong; you want to recompute all from ledger |
| **Preconditions** | Admin role; ledger (transactions_v2) is known to be correct; no concurrent operations |
| **Risks** | High. Overwrites ALL positions. No preview. No locking. If ledger is wrong, all positions will be wrong. |
| **Status** | **RESTRICTED — Architect approval required** |
| **Code location** | Baseline line 12301 |
| **App usage** | Not called anywhere in application code (only in auto-generated types) |

---

### CLASS 4: DESTRUCTIVE / NUCLEAR

Functions that cause data loss. Must never be called in production without
written architect approval and a recovery plan.

#### 4.1 `reset_all_investor_positions(p_admin_id, p_confirmation_code)`

| Field | Detail |
|-------|--------|
| **Purpose** | Zero out ALL investor positions, DELETE all transactions, DELETE all AUM, DELETE all performance records |
| **Parameters** | `admin_id UUID`, `confirmation_code TEXT` (must equal `'RESET POSITIONS'`) |
| **Returns** | `JSONB` with counts of affected records |
| **Admin check** | Yes — verifies `profiles.is_admin = true` |
| **Locking** | Advisory lock (`bulk_reset_all_positions`) |
| **Dry-run** | No |
| **Confirmation** | Yes — requires exact string `'RESET POSITIONS'` |
| **Audit trail** | Yes |
| **Correct use** | Full environment reset (development/staging only). This deletes ALL financial data. |
| **What it does** | Zeros all positions → deletes all performance → deletes all AUM → nulls FK references in fee/yield allocations → deletes ALL transactions |
| **Risks** | 🔴 TOTAL DATA LOSS. Irreversible. Deletes every transaction, AUM, and performance record in the system. |
| **Never use for** | Production. Ever. Under any circumstances. |
| **Status** | **PRODUCTION-BANNED — Must be removed from production or restricted to dev/staging** |
| **App usage** | Not called anywhere in application code |
| **Code location** | Baseline line 12639 |

#### 4.2 `cleanup_dormant_positions(p_dry_run)`

| Field | Detail |
|-------|--------|
| **Purpose** | DELETE position records where `current_value = 0` AND no non-voided transactions exist |
| **Parameters** | `dry_run BOOLEAN (default: true)` |
| **Returns** | `JSONB` with count of dormant positions |
| **Admin check** | None (⚠️ gap) |
| **Locking** | None |
| **Dry-run** | Yes ✅ (default: `true`) |
| **Audit trail** | None (⚠️ gap) |
| **Correct use** | Cleanup after data migration when shell positions exist with no transactions |
| **Preconditions** | Verify zero-value positions truly have no transactions (the function checks this) |
| **Risks** | Medium. Deletes position records. If a position has zero value but a transaction that was voided, this will delete the position (correct behavior). |
| **Status** | **RESTRICTED — Requires dry_run=true first** |
| **Code location** | Baseline line 4729 |

---

### CLASS 5: BOOTSTRAP (MIGRATION-ONLY)

Functions for initial data setup. Must never run in production.

#### 5.1 `initialize_fund_aum_from_positions(p_fund_id, p_admin_id, p_aum_date)`

| Field | Detail |
|-------|--------|
| **Purpose** | Create initial fund_daily_aum record from current positions |
| **Correct use** | New fund setup only — when first positions are created |
| **Status** | **MIGRATION-ONLY** |
| **Code location** | Baseline line 8286 |

#### 5.2 `batch_initialize_fund_aum(p_admin_id, p_dry_run)`

| Field | Detail |
|-------|--------|
| **Purpose** | Initialize AUM for all funds that have positions but no AUM record |
| **Dry-run** | Yes ✅ |
| **Correct use** | Post-migration bootstrap |
| **Status** | **MIGRATION-ONLY** |
| **Code location** | Baseline line 3413 |

#### 5.3 `initialize_all_hwm_values()`

| Field | Detail |
|-------|--------|
| **Purpose** | Set high_water_mark = MAX(current_value, cost_basis) for positions where HWM is null/0 |
| **Correct use** | Initial HWM setup after migrating positions from another system |
| **Status** | **MIGRATION-ONLY** |
| **Code location** | Baseline line 8177 |

---

### CLASS 6: SUPPORTING INFRASTRUCTURE

Functions that support the repair surface but don't directly mutate positions.

#### 6.1 `acquire_position_lock(p_investor_id, p_fund_id)`

| Field | Detail |
|-------|--------|
| **Purpose** | Acquire advisory lock for an (investor, fund) pair |
| **Correct use** | Called before concurrent-sensitive position operations |
| **Risk** | None (locking only) |
| **Code location** | Baseline line 562 |

#### 6.2 `recompute_on_void()` (TRIGGER FUNCTION)

| Field | Detail |
|-------|--------|
| **Purpose** | Trigger function that fires when `is_voided` changes; calls `reconcile_investor_position_internal` |
| **Correct use** | Never called directly — fires as trigger |
| **Note** | Overlaps with `fn_ledger_drives_position()` void handling (Redundancy Area 1 from PS-1) |
| **Code location** | Baseline line 11811 |

---

## B. OPERATOR DECISION TREE

### Scenario 1: Single Investor's Balance Looks Wrong

```
Is the position simply out-of-sync with the ledger?
├─ YES (ledger is correct, position drifted)
│  └─ Use: recompute_investor_position(investor_id, fund_id)
│     Safe. No audit trail needed (ledger is unchanged).
│
├─ UNSURE (need to preview the difference first)
│  └─ Use: rebuild_position_from_ledger(investor_id, fund_id, admin_id, reason, dry_run=true)
│     Review the old/new output. If correct, re-run with dry_run=false.
│
└─ NO (ledger is missing a transaction — e.g., a deposit was never recorded)
   └─ Use: adjust_investor_position(investor_id, fund_id, amount, reason)
      Creates an ADJUSTMENT transaction. Position updated via trigger chain.
```

### Scenario 2: Multiple Investor Positions Are Wrong

```
How many positions are affected?
├─ 1-5 positions
│  └─ Use recompute_investor_position() for each. Simple and safe.
│
├─ 6-50 positions
│  └─ Step 1: reconcile_all_positions(dry_run=true)
│     Step 2: Review the output — are the corrections expected?
│     Step 3: reconcile_all_positions(dry_run=false) if all looks right
│
├─ All positions for one investor
│  └─ Use: recompute_investor_positions_for_investor(investor_id)
│
└─ Every position in the system
   └─ ⚠️ STOP. Investigate root cause first.
      ├─ If root cause is known and ledger is trustworthy:
      │  repair_all_positions()  [REQUIRES ARCHITECT APPROVAL]
      │
      └─ If root cause is unknown:
         DO NOT run repair_all_positions(). Debug first.
```

### Scenario 3: Fund AUM Doesn't Match Positions

```
Is it one fund or many?
├─ One fund
│  └─ Step 1: validate_aum_matches_positions(fund_id)  [read-only check]
│     Step 2: Are the positions correct? (check ledger)
│     ├─ Positions correct → reconcile_fund_aum_with_positions()
│     └─ Positions wrong → Fix positions first (Scenario 2), then fix AUM
│
├─ Multiple funds
│  └─ Step 1: check_aum_position_health()  [read-only overview]
│     Step 2: Fix positions first (Scenario 2)
│     Step 3: recalculate_all_aum()  [updates ALL AUM records]
│
└─ Need to correct a specific AUM entry
   └─ Use: replace_aum_snapshot(fund_id, date, new_aum, purpose, admin_id, reason)
      Validates against positions (rejects >10% deviation). Voids old record.
```

### Scenario 4: Zero-Balance Positions Need Cleanup

```
cleanup_dormant_positions(dry_run=true)
├─ Review output: are these truly dormant (zero value, no transactions)?
│  ├─ YES → cleanup_dormant_positions(dry_run=false)
│  └─ NO → Investigate why they appear dormant
└─ Records deleted are GONE. No undo.
```

### Scenario 5: Environment Reset (Dev/Staging Only)

```
Is this production?
├─ YES → ❌ STOP. You may not reset production.
└─ NO (dev/staging)
   └─ reset_all_investor_positions(admin_id, 'RESET POSITIONS')
      ⚠️ DELETES ALL: transactions, AUM, performance, zeroes positions
      No undo. Full environment reset.
```

---

## C. DANGEROUS FUNCTION RESTRICTIONS

### 🔴 PRODUCTION-BANNED

| Function | Reason | Action Required |
|----------|--------|-----------------|
| `reset_all_investor_positions()` | Deletes ALL financial data | Remove from production schema or restrict to service_role only |

### 🟠 ARCHITECT-ONLY

| Function | Reason | Control |
|----------|--------|---------|
| `repair_all_positions()` | No dry-run, no locking, bulk overwrite | Require architect sign-off before execution |
| `recalculate_all_aum()` | No dry-run, overwrites ALL AUM records | Require admin + reason |

### 🟡 DRY-RUN-FIRST

| Function | Reason | Control |
|----------|--------|---------|
| `reconcile_all_positions()` | Bulk position overwrite | Default dry_run=true; require review of output before dry_run=false |
| `cleanup_dormant_positions()` | Deletes position records | Default dry_run=true; require review |
| `batch_initialize_fund_aum()` | Creates AUM records | Default dry_run=true; migration context only |

### ⚠️ DEPRECATED

| Function | Replacement | Reason |
|----------|-------------|--------|
| `batch_reconcile_all_positions()` | `reconcile_all_positions(dry_run)` | No admin check, no audit trail, no dry-run, calls unknown function `admin_fix_position()` |

---

## D. IDENTIFIED SAFETY GAPS & MINIMAL HARDENING ACTIONS

### Gap 1: Missing Admin Checks

| Function | Risk | Recommended Fix |
|----------|------|-----------------|
| `recompute_investor_position()` | LOW | Add `ensure_admin()` or document that callers must verify |
| `recompute_investor_positions_for_investor()` | LOW | Same |
| `reconcile_investor_position_internal()` | LOW | Called by trigger — admin check would break trigger chain. Document "internal only". |
| `batch_reconcile_all_positions()` | HIGH | Deprecated — replace with `reconcile_all_positions()` |
| `cleanup_dormant_positions()` | MEDIUM | Add `ensure_admin()` |
| `reconcile_fund_aum_with_positions()` | MEDIUM | Add `ensure_admin()` |

### Gap 2: Missing Audit Trail

| Function | Risk | Recommended Fix |
|----------|------|-----------------|
| `recompute_investor_position()` | LOW | Add audit_log INSERT for transparency |
| `batch_reconcile_all_positions()` | HIGH | Deprecated — not worth fixing |
| `cleanup_dormant_positions()` | MEDIUM | Add audit_log INSERT |
| `reconcile_fund_aum_with_positions()` | MEDIUM | Add audit_log INSERT |

### Gap 3: Missing Advisory Locks

| Function | Risk | Recommended Fix |
|----------|------|-----------------|
| `reconcile_all_positions()` | MEDIUM | Add global advisory lock to prevent concurrent runs |
| `repair_all_positions()` | HIGH | Add global advisory lock |
| `recalculate_all_aum()` | MEDIUM | Add global advisory lock |

### Gap 4: Confusing API Surface

| Issue | Detail | Recommended Fix |
|-------|--------|-----------------|
| Parameter order inconsistency | `recompute_investor_position(investor_id, fund_id)` vs `reconcile_investor_position_internal(fund_id, investor_id)` | Document prominently; do not change signatures (would break callers) |
| Naming overlap | `batch_reconcile_all_positions()` vs `reconcile_all_positions()` vs `repair_all_positions()` | Deprecate `batch_reconcile_all_positions()`; document the difference between reconcile and repair |
| Ambiguous function names | "reconcile" vs "repair" vs "recompute" vs "rebuild" | Create naming glossary (Section E below) |

---

## E. NAMING GLOSSARY

To reduce operator confusion, here is the canonical meaning of each verb in the
repair function surface:

| Verb | Meaning | Data Flow | Example |
|------|---------|-----------|---------|
| **recompute** | Recalculate position from ledger, overwrite current value | ledger → position | `recompute_investor_position()` |
| **rebuild** | Same as recompute but with preview, audit trail, and locking | ledger → position (guarded) | `rebuild_position_from_ledger()` |
| **reconcile** | Find mismatches between actual and expected, then fix | compare → fix | `reconcile_all_positions()` |
| **adjust** | Create a new transaction to change a position by a specific amount | new transaction → trigger chain → position | `adjust_investor_position()` |
| **recalculate** | Recompute AUM from positions | positions → AUM | `recalculate_all_aum()` |
| **repair** | Emergency full recomputation of all positions | ledger → all positions (bulk) | `repair_all_positions()` |
| **reset** | Zero/delete everything — total data loss | everything → 0 / DELETE | `reset_all_investor_positions()` |
| **initialize** | Create records from scratch (bootstrap only) | positions → new AUM records | `initialize_fund_aum_from_positions()` |
| **cleanup** | Remove stale/orphaned records | DELETE where zero & no txns | `cleanup_dormant_positions()` |

---

## F. RUNBOOK: STANDARD OPERATING PROCEDURES

### SOP-1: Monthly Position Reconciliation Check

```
1. Run: SELECT * FROM reconcile_all_positions(true);
   → Dry-run. Review output.

2. If output is empty: all positions match ledger. Done.

3. If output shows mismatches:
   a. Investigate root cause (check recent transactions, void operations)
   b. If root cause found and ledger is correct:
      Run: SELECT * FROM reconcile_all_positions(false);
   c. If root cause is NOT clear: escalate to architect

4. After position reconciliation, check AUM:
   Run: SELECT * FROM check_aum_position_health();
   → If any fund shows WARNING or CRITICAL:
      Run: SELECT * FROM reconcile_fund_aum_with_positions();
```

### SOP-2: Single Position Fix

```
1. Identify the investor_id and fund_id

2. Preview:
   SELECT * FROM rebuild_position_from_ledger(
     'investor-uuid', 'fund-uuid', 'your-admin-uuid', 'reason', true
   );

3. Review old vs new values. If correct:
   SELECT * FROM rebuild_position_from_ledger(
     'investor-uuid', 'fund-uuid', 'your-admin-uuid', 'reason', false
   );

4. Verify: SELECT current_value FROM investor_positions
   WHERE investor_id = 'investor-uuid' AND fund_id = 'fund-uuid';
```

### SOP-3: AUM Correction

```
1. Check current state:
   SELECT * FROM validate_aum_matches_positions('fund-uuid');

2. If positions are correct but AUM is wrong:
   SELECT * FROM replace_aum_snapshot(
     'fund-uuid', '2026-04-28', 12345.67, 'transaction', 'admin-uuid', 'reason'
   );

3. If many funds are wrong:
   a. Fix positions first (SOP-1)
   b. Then: SELECT * FROM recalculate_all_aum();
```

---

## G. SUMMARY OF RECOMMENDED CHANGES

### Priority 1 — Documentation Only (This Document)

- [x] Complete function registry with purpose, risks, and correct use
- [x] Operator decision tree
- [x] Naming glossary
- [x] Standard operating procedures
- [x] Dangerous function restrictions table

### Priority 2 — Minimal Code Changes (Future Migration)

These are the smallest safe changes that would materially improve safety.
Each should be a separate, small migration.

| # | Change | Risk | Effort |
|---|--------|------|--------|
| 1 | Add `COMMENT ON FUNCTION` deprecation notice to `batch_reconcile_all_positions()` | NONE | 5 min |
| 2 | Add `COMMENT ON FUNCTION` warning to `repair_all_positions()` and `reset_all_investor_positions()` | NONE | 5 min |
| 3 | Add `ensure_admin()` check to `cleanup_dormant_positions()` | LOW | 10 min |
| 4 | Add `ensure_admin()` check to `reconcile_fund_aum_with_positions()` | LOW | 10 min |
| 5 | Add audit_log INSERT to `reconcile_fund_aum_with_positions()` | LOW | 15 min |
| 6 | Add advisory lock to `repair_all_positions()` | LOW | 10 min |

### Priority 3 — Schema Restriction (Requires Architect Decision)

| # | Change | Risk | Decision Required |
|---|--------|------|-------------------|
| 7 | Revoke EXECUTE on `reset_all_investor_positions` from `authenticated` role | LOW | Confirm production should never call this |
| 8 | Revoke EXECUTE on `repair_all_positions` from `authenticated` role, grant to `service_role` only | LOW | Confirm restricted access |

---

## Success Criteria — PS-3 COMPLETE ✅

- [x] Every repair/admin/emergency function identified (17 functions catalogued)
- [x] Each function classified into one of 6 classes
- [x] Purpose, risks, preconditions, and misuse documented for each
- [x] Operator decision tree covers all 5 common scenarios
- [x] Dangerous functions identified with restrictions
- [x] Safety gaps documented with minimal hardening actions
- [x] Naming glossary created
- [x] Standard operating procedures written
- [x] No code changes made (documentation only — code changes are recommended, not applied)

---

**PS-3 Batch Status: COMPLETE ✅**  
**Next: PS-4 (Duplicate Recomputation Analysis)**  
**Document Created:** 2026-04-28  
**Author:** Claude Code Phase 3 Executor — PS-3  
**Validation:** Every function body read from baseline migration (20260307000000)
