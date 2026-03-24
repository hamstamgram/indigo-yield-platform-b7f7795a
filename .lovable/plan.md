

# Fix: Manual Withdrawals Not Creating Withdrawal Request Records

## Problem

When an admin creates a withdrawal via the **Add Transaction dialog**, it calls `createInvestorTransaction` → `apply_transaction_with_crystallization` RPC. This only creates a `transactions_v2` ledger entry. It does **not** create a `withdrawal_requests` record.

The **Withdrawals table** (`/admin/ledger?tab=withdrawals`) queries the `withdrawal_requests` table — so manual withdrawals never appear there.

The dust sweep also fails because it uses fragile client-side logic instead of the atomic `approve_and_complete_withdrawal` RPC.

## Fix

For WITHDRAWAL-type transactions in `useTransactionSubmit.ts`, replace the current two-step approach with:

1. **Insert a `withdrawal_requests` record** via `withdrawalService.createWithdrawal()` — status `pending`, with `is_full_exit` flag
2. **Immediately approve and complete it** via `withdrawalService.approveAndComplete()` — which atomically creates the ledger entry, handles dust sweep for full exits, and sets the withdrawal to `completed`
3. **Remove** the client-side dust sweep code (lines 103-152) entirely

For non-full-exit withdrawals, also use this same path so ALL withdrawals appear in the withdrawal table consistently.

## Files to Change

| File | Change |
|------|--------|
| `src/features/admin/transactions/hooks/useTransactionSubmit.ts` | For WITHDRAWAL type: insert `withdrawal_requests` record via `withdrawalService.createWithdrawal`, then call `withdrawalService.approveAndComplete`. Remove client-side dust sweep. Keep DEPOSIT/FIRST_INVESTMENT/ADJUSTMENT paths unchanged. |

## What stays the same
- All non-withdrawal transaction types use the existing `createInvestorTransaction` path
- The `approve_and_complete_withdrawal` RPC is already battle-tested from the Command Center queue
- No database or migration changes needed
- No other UI components affected

## Safety
- The withdrawal request insert + approve/complete is a proven path already used by the investor portal flow
- The `approve_and_complete_withdrawal` RPC handles dust atomically in one DB transaction — no more client-side race conditions
- If the approve step fails after insert, the request stays as `pending` in the queue (visible, recoverable)

