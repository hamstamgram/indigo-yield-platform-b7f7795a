

# Fix: Orphaned `fund_aum_events` Causing Stale Opening AUM in Yield Preview

## Problem Identified

After voiding all transactions, the **Yield Crystallization Preview** shows:
- Opening AUM: **1262.00 SOL** (stale - from old checkpoint)
- Pre-deposit yield: **-1262.00 SOL** (calculated as new closing AUM minus stale opening)
- Yield %: **-100%**

This blocks new deposits because the system detects "negative yield."

### Root Cause

**The `void_transaction` RPC does NOT void the corresponding `fund_aum_events` records.**

Database evidence:
| Table | fund_id | is_voided | Data |
|-------|---------|-----------|------|
| `transactions_v2` | SOL fund | **ALL voided** | 6 voided DEPOSITs and YIELDs |
| `investor_positions` | SOL fund | all 0 | Correctly zeroed |
| `fund_daily_aum` | SOL fund | only 1 non-voided | total_aum: 0 |
| **`fund_aum_events`** | SOL fund | **2 NOT voided** | `post_flow_aum: 1262` and `1250` |

The yield preview logic (`depositWithYieldService.ts` line 82-99) queries:
```typescript
const { data: lastCheckpointRaw } = await supabase
  .from("fund_aum_events")
  .select("closing_aum, post_flow_aum, event_ts")
  .eq("fund_id", fundId)
  .eq("is_voided", false)  // <-- Still finding stale records!
  .order("event_ts", { ascending: false })
  .limit(1)
  .maybeSingle();
```

This returns the stale `post_flow_aum: 1262` from the voided deposit, causing the preview to calculate:
```
preDepositYield = closingAumBeforeDeposit (0) - openingAum (1262) = -1262
```

## Solution

### Part 1: Update `void_transaction` RPC

Add cascade voiding of related `fund_aum_events` when a DEPOSIT or WITHDRAWAL transaction is voided:

```sql
-- When voiding a DEPOSIT/WITHDRAWAL transaction, also void related fund_aum_events
UPDATE fund_aum_events
SET is_voided = true
WHERE fund_id = v_tx_record.fund_id
  AND event_date = v_tx_record.tx_date
  AND trigger_reference LIKE '%' || v_tx_record.id || '%'
  AND is_voided = false;
```

### Part 2: Data Fix for Existing Orphans

Find and void all `fund_aum_events` that reference voided transactions:

```sql
UPDATE fund_aum_events fae
SET is_voided = true
WHERE EXISTS (
  SELECT 1 FROM transactions_v2 t
  WHERE t.is_voided = true
    AND fae.trigger_reference LIKE '%' || t.id::text || '%'
)
AND fae.is_voided = false;
```

Additionally, void any `fund_aum_events` for funds where ALL transactions are voided:

```sql
UPDATE fund_aum_events
SET is_voided = true
WHERE fund_id = '7574bc81-aab3-4175-9e7f-803aa6f9eb8f'  -- Solana fund
  AND is_voided = false;
```

### Part 3: Alternative - Reset via ensure_preflow_aum

If the admin wants to proceed without fixing historical data, they can create a new preflow checkpoint:
1. Go to the fund management page
2. Create a new AUM snapshot with the correct current value (0 SOL)
3. This will create a new `fund_aum_events` record that becomes the new "opening AUM"

## Technical Implementation

### Migration: `supabase/migrations/20260130_fix_void_transaction_cascade_aum_events.sql`

```sql
-- Part 1: Fix existing orphaned fund_aum_events for Solana fund
DO $$
BEGIN
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  PERFORM set_config('app.canonical_rpc', 'true', true);
  
  -- Void all fund_aum_events for funds with zero active positions
  UPDATE fund_aum_events fae
  SET is_voided = true
  WHERE fae.is_voided = false
    AND NOT EXISTS (
      SELECT 1 FROM investor_positions ip
      WHERE ip.fund_id = fae.fund_id
        AND ip.is_active = true
        AND ip.current_value > 0
    )
    AND NOT EXISTS (
      SELECT 1 FROM transactions_v2 t
      WHERE t.fund_id = fae.fund_id
        AND t.is_voided = false
        AND t.type = 'DEPOSIT'
    );
END;
$$;

-- Part 2: Update void_transaction to cascade to fund_aum_events
-- (Full function replacement with added logic)
```

## Summary

| Issue | Cause | Fix |
|-------|-------|-----|
| Stale Opening AUM in yield preview | `void_transaction` doesn't void `fund_aum_events` | Add cascade void of related `fund_aum_events` |
| Existing orphan records blocking deposits | 2 `fund_aum_events` for SOL fund not voided | Data fix to void records for funds with no active positions |
| Negative yield calculation | `post_flow_aum: 1262` used as opening when actual AUM is 0 | Fix data, update RPC |

## Testing After Implementation

1. Refresh the Add Transaction page
2. Select Solana Yield Fund and enter a new deposit
3. Verify Opening AUM shows 0 SOL (not 1262)
4. Verify Pre-deposit yield is 0 SOL (new fund, no yield to crystallize)
5. Confirm deposit can be submitted successfully

