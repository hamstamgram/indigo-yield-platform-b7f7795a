

# Fix: Canonical Flag Missing from Critical RPCs

## The Problem

The `void_yield_distribution` function in the **live database** is missing `PERFORM set_config('indigo.canonical_rpc', 'true', true)`. Without this flag, the `trg_enforce_canonical_transaction` trigger blocks all UPDATE/DELETE operations on `transactions_v2`, causing the error you saw.

The correct migration exists (`20260327173212`) but the live function was overwritten — likely by a Supabase schema diff/reset that deployed a stale version.

## Full Audit: RPCs That Touch transactions_v2 Without the Canonical Flag

| Function | Operation | Actually Broken? | Why |
|---|---|---|---|
| **void_yield_distribution** | UPDATE | **YES — CRITICAL** | No flag, trigger blocks UPDATE |
| **edit_transaction** | UPDATE | **YES** | No flag, trigger blocks UPDATE |
| **delete_transaction** | DELETE | **YES** | No flag, trigger blocks DELETE |
| adjust_investor_position | INSERT (ADJUSTMENT) | No | ADJUSTMENT is in trigger's allowed-types list |
| void_and_reissue_transaction | INSERT | No | Calls void_transaction first which sets flag for entire transaction |
| internal_route_to_fees | INSERT | No | Uses INTERNAL_WITHDRAWAL/INTERNAL_CREDIT (allowed types) + is_system_generated=true |
| cascade_void_from_transaction | UPDATE (trigger) | No | Fires as part of an UPDATE that already has the flag set |

## Fix: Single Migration

One migration that rebuilds 3 functions to add the canonical flag:

### 1. `void_yield_distribution` — Restore the correct version from migration `20260327173212`
- Adds `PERFORM set_config('indigo.canonical_rpc', 'true', true)` at the top of the function body
- Keeps all existing logic: admin check, advisory lock, cascade to allocations/ledgers, position recompute, AUM refresh, audit log
- Keeps the 4-parameter signature (distribution_id, admin_id, reason, void_crystals)
- Re-applies GRANT/REVOKE for authenticated/service_role

### 2. `edit_transaction` — Add canonical flag
- Adds `PERFORM set_config('indigo.canonical_rpc', 'true', true)` after the admin check
- All existing logic preserved (advisory lock, historical lock checks, immutable field protection, audit logging)

### 3. `delete_transaction` — Add canonical flag
- Adds `PERFORM set_config('indigo.canonical_rpc', 'true', true)` after the admin check
- All existing logic preserved (confirmation check, only-voided guard, audit log, position recompute)

## No Frontend Changes Needed

The frontend `voidYieldDistribution()` in `yieldManagementService.ts` already calls the correct RPC with the correct parameters. The bug is entirely in the database function.

## Verification After Migration

1. Void the distribution that failed — should succeed
2. Run `run_integrity_pack()` — should return `pass`
3. All 5 integrity views return 0 rows

