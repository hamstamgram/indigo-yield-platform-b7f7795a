

## Deep Audit: `fund_daily_aum` Duplicate Key Violation

### Root Cause Found

The error `duplicate key value violates unique constraint "fund_daily_aum_fund_date_purpose_unique"` is caused by a **trigger-RPC race** inside `apply_segmented_yield_distribution_v5`.

**Chain of events:**

```text
1. RPC INSERTs into yield_distributions (line 97-110)
     ↓
2. TRIGGER trg_sync_yield_to_aum fires (AFTER INSERT on yield_distributions)
     → sync_reporting_aum_to_transaction() INSERTs into fund_daily_aum
       with purpose = 'transaction', using ON CONFLICT upsert ✓
     ↓
3. RPC continues, UPDATEs yield_distributions (line 336-352)
     ↓
4. TRIGGER fires AGAIN (AFTER UPDATE)
     → upserts fund_daily_aum again (ON CONFLICT handles it) ✓
     ↓
5. RPC reaches line 364-365: raw INSERT into fund_daily_aum
   for 'transaction' purpose — NO ON CONFLICT clause
     ↓
6. BOOM: Row already exists from step 2 → unique constraint violation
```

**Secondary issue:** The trigger `sync_reporting_aum_to_transaction` always writes with purpose `'transaction'` regardless of the yield's actual purpose. This means it conflicts with both the `transaction` path (raw INSERT, no ON CONFLICT = crash) and could create phantom transaction-purpose AUM rows for reporting yields.

### Trigger/Function Audit Summary

| Component | Status | Issue |
|---|---|---|
| `trg_sync_yield_to_aum` (on yield_distributions) | **BUG** | Races with the RPC's own fund_daily_aum INSERT; always hardcodes purpose='transaction' |
| `apply_segmented_yield_distribution_v5` lines 364-365 | **BUG** | Raw INSERT for 'transaction' purpose — no ON CONFLICT, no UPDATE-then-INSERT |
| `apply_transaction_with_crystallization` | Safe | Uses ON CONFLICT with partial index correctly |
| `fn_ledger_drives_position` (on transactions_v2) | Safe | Does not touch fund_daily_aum |
| All other transactions_v2 triggers | Safe | No fund_daily_aum writes |
| All investor_positions triggers | Safe | No fund_daily_aum writes |
| No triggers on fund_daily_aum itself | Safe | Confirmed empty |

### Fix Plan

**One database migration with two changes:**

**1. Fix `apply_segmented_yield_distribution_v5` — use UPDATE-then-INSERT for both paths**

Replace lines 357-366 with the safe UPDATE-then-INSERT pattern (same pattern already used in `apply_deposit_with_crystallization` and `apply_withdrawal_with_crystallization`):

```sql
-- For BOTH reporting and transaction purposes:
UPDATE fund_daily_aum
SET total_aum = p_recorded_aum,
    source = 'yield_distribution_v5',
    is_month_end = v_is_month_end,
    updated_at = now()
WHERE fund_id = p_fund_id
  AND aum_date = v_period_end
  AND purpose = p_purpose
  AND is_voided = false;

GET DIAGNOSTICS v_updated_rows = ROW_COUNT;

IF v_updated_rows = 0 THEN
  INSERT INTO fund_daily_aum (
    fund_id, aum_date, total_aum, purpose,
    source, created_by, is_month_end
  ) VALUES (
    p_fund_id, v_period_end, p_recorded_aum, p_purpose,
    'yield_distribution_v5', v_admin, v_is_month_end
  );
END IF;
```

**2. Drop the redundant `trg_sync_yield_to_aum` trigger**

This trigger is completely redundant — the RPC already handles its own `fund_daily_aum` write. The trigger causes:
- Double-writes (trigger + RPC both write to same table)
- Hardcoded `'transaction'` purpose regardless of actual yield purpose
- The race condition that causes the duplicate key error

```sql
DROP TRIGGER IF EXISTS trg_sync_yield_to_aum ON yield_distributions;
```

The function `sync_reporting_aum_to_transaction` can be kept (no harm) but the trigger that fires it must be removed.

### What This Does NOT Touch

- No frontend code changes needed
- No changes to `apply_investor_transaction`, `apply_deposit_with_crystallization`, or `apply_withdrawal_with_crystallization` — all already use safe patterns
- No changes to the partial unique index `fund_daily_aum_fund_date_purpose_unique` — it's correct
- No changes to `fn_ledger_drives_position` or any other trigger
- No schema changes

### Risk Assessment

- **Low risk**: The trigger being dropped is purely redundant — the RPC already does the exact same INSERT/upsert
- **No data loss**: Existing `fund_daily_aum` rows are unaffected
- **Backwards compatible**: The RPC's behavior is unchanged except it no longer crashes on duplicates

