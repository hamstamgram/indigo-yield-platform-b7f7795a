# ✅ COMPLETED: Fix Orphaned `fund_aum_events` Causing Stale Opening AUM

## Summary

Fixed the `void_transaction` RPC to cascade void related `fund_aum_events` records when voiding DEPOSIT/WITHDRAWAL transactions.

### Changes Made

1. **Data Fix**: Voided all orphaned `fund_aum_events` for funds with no active positions or deposits
2. **RPC Update**: Added cascade void logic to `void_transaction` function for DEPOSIT/WITHDRAWAL types
3. **Audit Trail**: Added `aum_events_voided` count to audit log and return JSON

### Testing

- Opening AUM should now show 0 SOL for the Solana fund
- New deposits should work without negative yield errors
- Future transaction voids will automatically cascade to `fund_aum_events`

