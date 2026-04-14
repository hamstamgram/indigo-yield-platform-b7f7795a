# PS-3: Repair/Admin Function Registry

**Phase:** 4A  
**Status:** Active  
**Last Updated:** 2026-04-14

---

## Overview

This document catalogs all operator-facing repair and admin functions in the position-sync subsystem. Functions are classified by risk level and intended use case.

**Guiding Principle:** Production-safe functions should not be confused with administrative overrides.

---

## Function Registry

### Tier 1: Production Triggers (DO NOT CALL DIRECTLY)

These triggers fire automatically on data changes. Operators should never call them directly.

| Function | Trigger | Table | Purpose |
|----------|---------|-------|---------|
| `trigger_recompute_position()` | trg_recompute_position_on_tx | transactions_v2 | Recomputes position on INSERT/DELETE/UPDATE |
| `fn_ledger_drives_position()` | trg_ledger_sync | transactions_v2 | Syncs derived fields on void changes |
| `sync_aum_on_position_change()` | trg_sync_aum_on_position | investor_positions | Syncs AUM on position changes |

---

### Tier 2: Repair Functions (ADMIN ONLY)

Full recomputation from ledger source of truth.

| Function | Classification | Purpose |
|----------|----------------|----------|
| `recompute_investor_position(p_investor_id, p_fund_id)` | **Privileged Repair** | Recompute single position from ledger |
| `recompute_investor_positions_for_investor(p_investor_id)` | **Privileged Repair** | Recompute all positions for one investor |
| `repair_all_positions()` | **Emergency Only** | Nuclear option - recompute ALL positions |
| `reconcile_all_positions(p_dry_run)` | **Privileged Repair** | Reconciliation with dry-run preview |
| `reconcile_investor_position_internal(p_investor_id, p_fund_id)` | **Privileged Repair** | Internal reconciliation helper |
| `reconcile_fund_aum_with_positions()` | **Privileged Repair** | Reconcile AUM with positions sum |

---

### Tier 3: Emergency/Override Functions (HIGH RISK)

These bypass standard production flows and should only be used in incident response.

| Function | Classification | Purpose |
|----------|----------------|----------|
| `void_transaction(p_tx_id, p_admin_id, p_reason)` | **Emergency Only** | Void single transaction |
| `void_transactions_bulk(p_tx_ids[], p_admin_id, p_reason)` | **Emergency Only** | Bulk void transactions |
| `unvoid_transaction(p_tx_id, p_admin_id, p_reason)` | **Emergency Only** | Restore voided transaction |
| `unvoid_transactions_bulk(p_tx_ids[], p_admin_id, p_reason)` | **Emergency Only** | Bulk unvoid transactions |

---

### Tier 4: Query/Validation Functions (SAFE)

These read data and do not modify state.

| Function | Classification | Purpose |
|----------|----------------|----------|
| `get_void_transaction_impact(p_tx_id)` | **Safe** | Preview void cascade impact |
| `check_and_fix_aum_integrity(p_fund_id, p_start, p_end, p_dry_run)` | **Safe** | AUM integrity check |

---

## Decision Tree

```
┌─────────────────────────────────────────────────────────────────┐
│                    OPERATOR DECISION TREE                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │ What is the     │
                    │ issue?           │
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
┌────────────────┐  ┌────────────────┐  ┌────────────────┐
│ Position       │  │ AUM Mismatch   │  │ Transaction    │
│ Value Drift    │  │ (fund vs sum   │  │ Void Status    │
│                │  │ of positions) │  │ Error          │
└───────┬────────┘  └───────┬────────┘  └───────┬────────┘
        │                   │                   │
        ▼                   ▼                   ▼
  Which scope?        Which scope?        What action?
        │                   │                   │
  ┌────┴────┐       ┌────┴────┐       ┌────┴────┐
  ▼         ▼       ▼         ▼       ▼         ▼
 Single   Fund    Single   All    Void   Unvoid
 Position Full   Fund    Funds  Transaction(s)
          Fund
          │
          ▼
  Use:    Use:
  recompute_  reconcile_
  investor_  fund_aum_
  position() with_positions()
          │
          ▼
  ┌──────────────────────────────────┐
  │ STILL MISMATCHED?                │
  └────────────┬───────────────────┘
               ▼
  ┌─────────────────────────────────┐
  │ Try: reconcile_all_positions()  │
  │ (dry_run=true first)             │
  └─────────────────────────────────┘
               │
               ▼
  ┌─────────────────────────────────┐
  │ STILL BROKEN?                    │
  └────────────┬────────────────────┘
               ▼
  ┌─────────────────────────────────┐
  │ ESCALATE to senior engineer       │
  │ or use repair_all_positions()   │
  │ (last resort - full rebuild)    │
  └─────────────────────────────────┘
```

---

## Classification Guide

### Classified: Routine Repair

Used regularly for minor corrections.

- `recompute_investor_position()` — Single position fix
- `reconcile_all_positions(dry_run=true)` — Preview mismatches

### Classified: Privileged Repair

Requires senior engineer approval.

- `reconcile_all_positions(dry_run=false)` — Apply fixes
- `reconcile_fund_aum_with_positions()` — AUM reconciliation

### Classified: Emergency Only

For incident response only. Document all invocations.

- `void_transaction()` / `unvoid_transaction()`
- `void_transactions_bulk()` / `unvoid_transactions_bulk()`

### Classified: Deprecated/Ambiguous

Do not use without explicit approval.

- `reconcile_investor_position_internal()` — Legacy, use recompute_investor_position()

---

## Dangerous Function Warnings

### Warning: Never Use These In Production Flow

1. **`repair_all_positions()`** — Nuclear option
   - Scans ALL transactions in database
   - Can cause severe lock contention
   - Creates audit entries for every position

2. **`void_transactions_bulk()`** — Cascading void
   - Voids ALL related yields and allocations
   - Updates AUM for affected funds
   - Cannot be undone without unvoid

3. **`reconcile_investor_position_internal()`** — Internal helper
   - Has reversed parameter order vs other functions
   - Parameters are (investor_id, fund_id) not (fund_id, investor_id)

---

## Runtime Warnings

The following functions emit runtime warnings when called:

```sql
-- In recompute_investor_position()
RAISE NOTICE 'ADMIN ACTION: Recomputing position for investor % fund %', p_investor_id, p_fund_id;

-- In void_transaction()
RAISE NOTICE 'ADMIN ACTION: Voiding transaction % - cascade will follow', p_transaction_id;

-- In repair_all_positions()
RAISE WARNING 'NUCLEAR OPERATION: Repairing ALL positions in database';
```

---

## Access Control Requirements

| Function | Required Role |
|----------|---------------|
| All Tier 2/3 functions | `is_admin = true` in profiles table |
| repair_all_positions() | Additional auth.uid() verification |
| void_transaction() | admin check via `public.check_is_admin()` |

---

## Runbook References

| Scenario | Runbook |
|----------|---------|
| Position drift detected | `runbook-position-drift.md` |
| AUM mismatch | `runbook-aum-reconciliation.md` |
| Void cascade needed | `runbook-void-unvoid.md` |
| Emergency repair | `runbook-emergency-repair.md` |

---

## Invariant Compliance

All repair functions MUST:

1. ✅ Set `indigo.canonical_rpc = 'true'` before mutations
2. ✅ Create audit_log entries for non-dry-run operations
3. ✅ NOT bypass enforce_canonical_position triggers
4. ✅ Use ledger as source of truth (recompute from transactions_v2)

---

## Document History

| Date | Change | Author |
|------|--------|--------|
| 2026-04-14 | Initial PS-3 registry | Phase 4 Execution |