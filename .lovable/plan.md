

# XRP Fund Reconciliation Fix

## What Happened
Sam's 330,500.42 XRP withdrawal (Jan 2) was voided during testing, inflating his position by ~330k. The Excel treats it as real. Everything else cascaded from that.

## Actions Required

### 1. Un-void Sam's withdrawal (the main fix)
- Transaction `43a80892-14ed-4c5c-b4b7-8042b9c34629` — WITHDRAWAL of -330,500.42 XRP on 2026-01-02
- Use the `unvoid_transaction` RPC to restore it
- Also update the withdrawal_request `8b440397` status from `voided` back to `completed`
- The ledger trigger will automatically subtract 330,500.42 from Sam's position

### 2. Void the Jan 5 deposits (not in Excel)
- Ryan's 63.284 XRP deposit — not in Excel investments sheet
- Indigo's 253.136 XRP deposit — not in Excel investments sheet
- These were manual top-ups that don't exist in the source of truth

### 3. Void the stray 0.1 YIELD to Indigo (Nov 30)
- Orphan YIELD with no distribution_id — test artifact

### 4. Verify Jan 31 yield is now correct
- With the withdrawal restored, AUM ~795 becomes the correct value
- The existing Jan 31 yield distribution (which used AUM=795) would then be correct
- Verify the yield amounts match Excel expectations

### 5. Run integrity pack
- Confirm zero violations after all corrections

## Technical Details
- Un-void uses the `unvoid_transaction` RPC which sets `is_voided = false` and the `fn_ledger_drives_position` trigger automatically restores the position effect
- Withdrawal request status update requires a migration since the state machine trigger guards transitions — we'll use `set_config('indigo.canonical_rpc', 'true', true)` to bypass
- Void operations for items 2-3 use the existing `void_transaction` RPC

## Expected Final State (XRP Fund)
After fixes, Sam's position drops from ~330,202 to near 0, matching the Excel. Total fund AUM drops to ~795 range. Jan 31 yield distribution becomes correct.

