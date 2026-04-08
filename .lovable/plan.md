

# Fix: Dust Credit to Indigo Fees Not Voided on Withdrawal Void

## Root Cause

The `void_completed_withdrawal` RPC filters voided transactions with:
```sql
WHERE investor_id = v_request.investor_id  -- Only matches the withdrawing investor
  AND type IN ('WITHDRAWAL', 'DUST_SWEEP')
```

The DUST_SWEEP credit to **Indigo Fees** has `investor_id = b464a3f7` (the fees system account), not the withdrawing investor. So it's never matched and never voided.

The investor's dust-sweep debit IS voided (same investor_id), but the corresponding credit to Indigo Fees is left behind — creating a position drift on the fees account.

## Fix

One migration to `CREATE OR REPLACE FUNCTION void_completed_withdrawal` that adds a second UPDATE to void dust credits on the fees account:

```sql
-- Void dust credits to Indigo Fees for this withdrawal
UPDATE transactions_v2
SET is_voided = true, voided_by_profile_id = v_admin_id, voided_at = NOW(),
    void_reason = p_reason
WHERE type = 'DUST_SWEEP'
  AND fund_id = v_request.fund_id
  AND is_voided = false
  AND investor_id != v_request.investor_id  -- Fees account
  AND reference_id LIKE 'dust-credit-' || p_withdrawal_id::text || '%';
```

This mirrors the pattern already used in `void_transaction` and `cancel_withdrawal_by_admin`, which both handle the fees-side dust credit correctly.

## Immediate Data Fix

Also void the orphaned dust credit `2cbbd551` from the current incident, and recompute the Indigo Fees position.

## Scope
- 1 migration (RPC rebuild + data fix)
- No frontend changes

