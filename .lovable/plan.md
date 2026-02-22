

# Audit Result: AUM Update After Yield Distribution

## Critical Bug Found in Step 10

The `apply_segmented_yield_distribution_v5` function has a **fatal bug** in step 10 that will crash at runtime, preventing AUM from ever being updated after yield distribution.

### The Broken Call (line 204-206)

```sql
PERFORM upsert_fund_aum_after_yield(
    p_fund_id, p_period_end, v_closing_aum, p_created_by, true
);
```

### The Function Signature

```text
upsert_fund_aum_after_yield(
    p_fund_id    uuid,
    p_aum_date   date,
    p_yield_amount numeric,    -- expects incremental yield, not absolute AUM
    p_purpose    aum_purpose,  -- receives p_created_by (uuid) -- TYPE MISMATCH
    p_actor_id   uuid          -- receives true (boolean) -- TYPE MISMATCH
)
```

### Three Bugs in One Call

| Argument | Expected | Passed | Problem |
|----------|----------|--------|---------|
| 3rd: `p_yield_amount` | Incremental yield amount | `v_closing_aum` (total absolute AUM) | Wrong value -- would double-count |
| 4th: `p_purpose` | `aum_purpose` enum | `p_created_by` (uuid) | Type mismatch -- runtime crash |
| 5th: `p_actor_id` | `uuid` | `true` (boolean) | Type mismatch -- runtime crash |

PostgreSQL cannot cast boolean to uuid, so this call **always throws an exception**, which aborts the entire transaction. No yield distribution can succeed.

### Why `sync_aum_on_transaction` Doesn't Help

The `sync_aum_on_transaction` trigger on `transactions_v2` explicitly **skips** reporting-purpose transactions:

```sql
IF NEW.purpose = 'reporting'::aum_purpose THEN
    RETURN NEW;
END IF;
```

This is by design -- the trigger defers to the distribution function for AUM updates. But the distribution function's AUM update call is broken, so neither path works.

### The Correct AUM Path

Since `v_closing_aum` (computed at step 9) already reflects the post-yield positions (updated by `fn_ledger_drives_position` trigger on each YIELD transaction insert), we should directly upsert `fund_daily_aum` with this absolute value instead of using the incremental `upsert_fund_aum_after_yield` function.

## Fix (SQL migration)

Replace step 10 in `apply_segmented_yield_distribution_v5` with a direct upsert:

```sql
-- 10. Upsert reporting AUM
IF p_purpose = 'reporting' THEN
    UPDATE fund_daily_aum
    SET total_aum = v_closing_aum, updated_at = now(),
        updated_by = p_created_by, source = 'yield_distribution_v5'
    WHERE fund_id = p_fund_id AND aum_date = p_period_end
      AND purpose = 'reporting' AND is_voided = false;

    IF NOT FOUND THEN
        INSERT INTO fund_daily_aum (
            fund_id, aum_date, total_aum, purpose, source,
            created_by, is_voided, is_month_end
        ) VALUES (
            p_fund_id, p_period_end, v_closing_aum, 'reporting',
            'yield_distribution_v5', p_created_by, false, true
        );
    END IF;
END IF;
```

This approach:
- Uses the absolute `v_closing_aum` (already correct from step 9)
- Avoids the incremental `upsert_fund_aum_after_yield` function entirely
- Sets `is_month_end = true` so investors can see it per RLS policy
- Sets `source = 'yield_distribution_v5'` which triggers the `sync_reporting_aum_to_transaction` trigger to auto-create the transaction-purpose copy

### Files Changed

| File | Change |
|------|--------|
| New SQL migration | `CREATE OR REPLACE FUNCTION apply_segmented_yield_distribution_v5` -- fix step 10 only (replace `PERFORM upsert_fund_aum_after_yield(...)` with direct upsert) |

No other files need changes.

