

# Withdrawal Flow Audit: Partial, Full Exit + Dust, Void & Revert

## Current Architecture

The withdrawal lifecycle has 3 RPCs and 3 state machine guards:

```text
PARTIAL WITHDRAWAL:
  investor submits → pending → admin calls approve_and_complete_withdrawal(is_full_exit=false)
    → WITHDRAWAL tx inserted (negative) → trg_ledger_sync updates position → completed

FULL EXIT + DUST:
  admin calls approve_and_complete_withdrawal(is_full_exit=true)
    → crystallize_yield_before_flow() → WITHDRAWAL tx → DUST_SWEEP (debit investor)
    → DUST_SWEEP (credit fees_account) → position.is_active = false → completed

VOID COMPLETED WITHDRAWAL:
  admin calls void_completed_withdrawal(p_withdrawal_id)
    → voids WITHDRAWAL + DUST_SWEEP txs → recompute_investor_position → status → cancelled

VOID & REISSUE:
  admin calls void_and_reissue_full_exit(p_transaction_id, p_new_amount)
    → void_transaction cascade → re-activate position → cancel old request
    → create new pending request → approve_and_complete_withdrawal → dust sweep remainder
```

## Issues Found (5 bugs, 2 will crash in production)

### BUG 1: `routeToFees` bypasses state machine guard — WILL CRASH (CRITICAL)

**File**: `src/features/investor/withdrawals/services/withdrawalService.ts` line 466-477

The `routeToFees` method does a direct `.update({ status: 'completed' })` on `withdrawal_requests`. The `trg_guard_withdrawal_state` trigger blocks ANY status change to `completed` unless `indigo.canonical_rpc = 'true'`. This direct update does NOT set that flag.

**Result**: Clicking "Route to INDIGO FEES" on any pending withdrawal will throw: `CRITICAL: Status change to completed must be performed via canonical Indigo RPC`.

**Fix**: Create a `route_to_fees` database RPC (SECURITY DEFINER) that sets `indigo.canonical_rpc`, creates the paired INTERNAL transactions, and updates status atomically. Replace the direct update in `withdrawalService.ts`.

### BUG 2: `rejectWithdrawal` bypasses `reject_withdrawal` RPC (MODERATE)

**File**: `src/features/investor/withdrawals/services/withdrawalService.ts` line 290-323

The service does a direct `.update({ status: 'rejected' })` instead of calling the `reject_withdrawal` RPC that exists in the database. The guard trigger currently allows this (it only blocks `approved` and `completed`), but it bypasses the RPC's audit logging and validation.

**Fix**: Replace direct update with `supabase.rpc("reject_withdrawal", { p_request_id, p_reason, p_admin_notes })`.

### BUG 3: `restoreWithdrawal` sets `pending` on terminal states — WILL CRASH (CRITICAL)

**File**: `src/features/investor/withdrawals/services/withdrawalService.ts` line 522-554

The restore method does `.update({ status: 'pending' })` on cancelled/rejected withdrawals. The `validate_withdrawal_transition` function defines `cancelled` and `rejected` as terminal states — no transitions allowed. The guard trigger will block this.

**Result**: Clicking "Restore" on any cancelled or rejected withdrawal will throw an `INVALID TRANSITION` error.

**Fix**: Create a `restore_withdrawal` RPC (SECURITY DEFINER) that sets the canonical flag and validates the restore is legitimate (e.g., only admin, only if no conflicting transactions exist).

### BUG 4: `deleteWithdrawal` does direct cancel without canonical flag (MODERATE)

**File**: `src/features/investor/withdrawals/services/withdrawalService.ts` line 499-516

The soft-delete path does `.update({ status: 'cancelled' })` directly. If the withdrawal is `completed`, the guard will block this (completed → cancelled requires canonical RPC). For `pending` withdrawals, the guard allows it but it bypasses audit trails.

**Fix**: Route through `void_completed_withdrawal` for completed ones (already done in `cancelWithdrawal`), and through `cancel_withdrawal_by_admin` RPC for pending ones.

### BUG 5: `requestsQueueService.rejectWithdrawal` also bypasses RPC (DUPLICATE)

**File**: `src/features/admin/operations/services/requestsQueueService.ts` line 35-46

Same direct update pattern as Bug 2. There's a second code path for rejecting withdrawals that also skips the RPC.

**Fix**: Use `reject_withdrawal` RPC here too.

## Remediation Plan

### Migration 1: Create `route_to_fees` RPC

New SECURITY DEFINER function that:
- Validates admin access
- Sets `indigo.canonical_rpc = 'true'`
- Creates paired DUST_SWEEP transactions (debit investor, credit fees_account)
- Updates withdrawal status to `completed`
- Logs to audit_log

### Migration 2: Create `restore_withdrawal` RPC

New SECURITY DEFINER function that:
- Validates admin access and sets canonical flag
- Only allows restore from `cancelled` or `rejected`
- Checks no conflicting active withdrawal exists for same investor+fund
- Resets status to `pending`
- Logs to audit_log

### Code Fix 1: `withdrawalService.routeToFees` → call new `route_to_fees` RPC

### Code Fix 2: `withdrawalService.rejectWithdrawal` → call `reject_withdrawal` RPC

### Code Fix 3: `withdrawalService.restoreWithdrawal` → call new `restore_withdrawal` RPC

### Code Fix 4: `withdrawalService.deleteWithdrawal` soft-delete → call `cancel_withdrawal_by_admin` RPC

### Code Fix 5: `requestsQueueService.rejectWithdrawal` → call `reject_withdrawal` RPC

## Verified Working (No Issues)

- `approve_and_complete_withdrawal` — full exit with dust sweep is correctly implemented with advisory locks, crystallization, and atomic dust routing
- `void_completed_withdrawal` — correctly voids WITHDRAWAL + DUST_SWEEP transactions, recomputes position, and uses canonical flag
- `void_and_reissue_full_exit` — correctly chains void → re-activate → new request → re-approve with dust
- `cancelWithdrawal` for completed status — correctly routes through `void_completed_withdrawal` RPC
- `submitInvestorWithdrawal` — correctly inserts as `pending` (no guard issues)
- `guard_withdrawal_state_transitions` trigger — correctly allows completed→cancelled via canonical RPC

## Files to Change

| File | Change |
|------|--------|
| New migration SQL | `route_to_fees` + `restore_withdrawal` RPCs |
| `src/features/investor/withdrawals/services/withdrawalService.ts` | Fix 5 methods to use RPCs |
| `src/features/admin/operations/services/requestsQueueService.ts` | Fix reject to use RPC |

