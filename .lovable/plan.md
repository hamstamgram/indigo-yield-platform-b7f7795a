
# SOL Fund September 2025: Ghost Report Audit & Repair

## Diagnosis Summary

### Task 1: Ghost Reports (Family Kabbaj & Vivie)

**Root Cause Found:** Stale `investor_fund_performance` records from a previous (now voided) yield distribution run.

Evidence:
- Family Kabbaj (`f917cd8b`) and Vivie & Liana (`981dd85c`) have records in `investor_fund_performance` for Sept 2025 SOL showing `mtd_additions: 55/50`, `mtd_ending_balance: 56.46/51.66`
- But they have **zero transactions** in `transactions_v2` (any asset, any date)
- Their `investor_positions` show `is_active: false`, `current_value: 0`
- There are no `yield_allocations` for them in the current (non-voided) distributions

The `generate-fund-performance` edge function has guards (lines 408-451) that prevent creating NEW ghost records. However, it uses **UPSERT** (line 578), which only updates or inserts records for investors in the current computation set. It **never deletes** records for investors who were in a PRIOR run but no longer qualify. When their yield distributions were voided, these orphaned performance records were left behind.

### Task 2: Missing IB Report (Alex Jacobs)

**By Design, Not a Bug:** The `generate-fund-performance` function (line 213) filters: `!p.account_type || p.account_type === 'investor'`. This intentionally excludes `account_type = 'ib'` and `fees_account` from report generation. IBs receive commission credits to their positions but do not receive investor performance statements.

Alex Jacobs's IB credit of 0.0327 SOL is correctly recorded in `yield_allocations` and his `investor_positions.current_value = 0.0327`. The ledger is correct; the reporting exclusion is intentional.

### Task 3: Control Group (LP vs Kabbaj)

| Field | Indigo LP (success) | Family Kabbaj (ghost) |
|-------|--------------------|-----------------------|
| transactions_v2 records | Has DEPOSIT + YIELD entries | Zero transactions |
| investor_positions.is_active | false (withdrawn) | false |
| yield_allocations (non-voided) | 2 records (checkpoint + reporting) | 0 records |
| investor_fund_performance | Valid (from edge function run) | Stale orphan from voided run |

The discriminator: LP has ledger transactions backing its performance record. Kabbaj has none.

## Task 4: Structural Healing

### Fix 1: SQL Cleanup (Stale Data)

Delete the two orphaned `investor_fund_performance` records for Family Kabbaj and Vivie & Liana for Sept 2025 SOL.

```sql
DELETE FROM investor_fund_performance
WHERE period_id = 'a0fcc3fd-0912-4338-8829-3e1cb6b0589a'  -- Sept 2025
  AND fund_name = 'SOL'
  AND investor_id IN (
    'f917cd8b-2d12-428c-ae3c-210b7ee3ae75',  -- Family Kabbaj
    '981dd85c-35c8-4254-a3e9-27c2af302815'   -- Vivie & Liana
  );
```

### Fix 2: Edge Function Prevention (generate-fund-performance)

Add a cleanup step after computing `performanceRecords` (after line 569, before the upsert at line 576). This deletes stale records for investors who are no longer in the computed set for a given period + fund_name combination.

```typescript
// After line 569: performanceRecords are computed

// Build set of (investor_id, fund_name) tuples that were generated
const generatedKeys = new Set(
  performanceRecords.map(r => `${r.investor_id}:${r.fund_name}`)
);

// Find existing records for this period to identify stale ones
const { data: existingRecords } = await supabase
  .from("investor_fund_performance")
  .select("id, investor_id, fund_name")
  .eq("period_id", periodId)
  .eq("purpose", "reporting");

const staleIds = (existingRecords || [])
  .filter(r => !generatedKeys.has(`${r.investor_id}:${r.fund_name}`))
  .map(r => r.id);

if (staleIds.length > 0) {
  await supabase
    .from("investor_fund_performance")
    .delete()
    .in("id", staleIds);
  console.log(`Cleaned up ${staleIds.length} stale performance records`);
}
```

When running for a single investor (`investorId` param), skip the cleanup to avoid deleting other investors' records.

### Files Changed

| File | Change |
|------|--------|
| `supabase/functions/generate-fund-performance/index.ts` | Add stale record cleanup after line 569, before upsert |

No other files need changes. The yield preview UI already has zero-amount filtering via the system accounts toggle.
