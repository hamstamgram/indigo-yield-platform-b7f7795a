

# Fix: Ryan's Missing Dust Sweep — Retroactive Correction

## Problem

Ryan's withdrawal was processed via the old manual path (before the unified withdrawal flow fix). That path never created DUST_SWEEP transactions, so:
- Ryan's position still has residual dust (0.02 per QA audit)
- No dust appears on the Revenue page or any ledger
- The position-ledger mismatch is -317.62

## Approach

This is a **data correction**, not a code change. The code is already fixed (unified withdrawal flow + revenue page filters include DUST_SWEEP). The missing piece is that Ryan's historical withdrawal never generated the dust records.

## Steps

### Step 1: Investigate Ryan's Current State
Query `transactions_v2` for Ryan's IND-XRP fund to see all ledger entries, confirm the withdrawal amount, and identify the exact dust residual. Also check `withdrawal_requests` to see if a record exists.

### Step 2: Create Corrective Migration
A one-time SQL migration that:

1. **Inserts a DUST_SWEEP debit** from Ryan's position (negative amount = residual balance) with:
   - `type = 'DUST_SWEEP'`
   - `tx_date` = the original withdrawal date (not today)
   - `visibility_scope = 'admin_only'`
   - `reference_id = 'DUST_SWEEP_RETRO:ryan-xrp'`
   - `notes` explaining the retroactive correction

2. **Inserts a DUST_SWEEP credit** to the INDIGO Fees account (positive amount) with matching date and reference

3. **Deactivates Ryan's position** (`is_active = false`) since this is a full exit

4. The `trg_ledger_sync` trigger will automatically update position balances when the transactions are inserted

### Step 3: Verify
- Position balance goes to 0
- Dust appears on Revenue page (DUST_SWEEP type is already included in the query filter)
- Dust appears in admin ledger
- Date matches original withdrawal date

## Safety
- Uses the same transaction types and patterns as the production `approve_and_complete_withdrawal` RPC
- `trg_ledger_sync` handles position updates automatically — no manual position edits
- Migration is idempotent: checks if corrective entries already exist before inserting
- No code changes needed — all filters already support DUST_SWEEP

## Files to Change

| Type | Detail |
|------|--------|
| Migration | One-time corrective SQL to insert missing DUST_SWEEP pair for Ryan's IND-XRP withdrawal |

