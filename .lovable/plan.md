
# Comprehensive Database Function Audit

## Critical Bugs Found

### BUG 1: `void_fund_daily_aum` calls `void_yield_distribution` with 3 args -- needs 4

The function on line 337 calls:
```sql
PERFORM void_yield_distribution(v_dist_id, p_admin_id, 'Cascade...');
```
But `void_yield_distribution` requires **4 parameters**: `(p_distribution_id, p_admin_id, p_reason, p_void_crystals boolean)`. The missing `p_void_crystals` argument will cause a **runtime crash** whenever voiding an AUM record that has linked yield distributions.

**Severity**: HIGH -- cascade void from AUM page will fail
**Fix**: Add `false` as the 4th argument (safe default -- don't cascade crystal voids)

---

### BUG 2: `void_and_reissue_transaction` (4-param overload) skips cascade voiding

Two overloads exist:
- **6-param** (used by frontend): `(p_original_tx_id, p_admin_id, p_reason, p_new_amount, p_new_date, p_new_notes)` -- correctly calls `void_transaction()` for cascade
- **4-param** (legacy): `(p_record_id, p_new_values, p_admin_id, p_reason)` -- does a raw `UPDATE SET is_voided=true` WITHOUT calling `void_transaction()`, so cascade voiding of AUM, fee_allocations, ib_ledger, platform_fee_ledger, and yield_allocations is **silently skipped**

Also, the 4-param version is missing `SET search_path TO 'public'` (minor security defect for a SECURITY DEFINER function).

**Severity**: HIGH -- data integrity risk if 4-param overload is ever called
**Fix**: Drop the 4-param overload entirely (frontend only uses 6-param version)

---

### BUG 3: `apply_segmented_yield_distribution_v5` calls `calculate_yield_allocations` up to 6 times

The expensive allocation calculation is called repeatedly:
1. Step 3: Calculate totals
2. Step 5: Insert yield_allocations
3. Step 6a: Loop for YIELD transactions
4. Step 6c: Loop for IB_CREDIT transactions
5. Step 7: Insert fee_allocations
6. Step 8: Insert ib_allocations

Each call re-executes the full CTE chain (joins, aggregations, fee/IB lookups). This is a major performance issue -- should materialize into a temp table once.

**Severity**: MEDIUM -- performance (6x slower than necessary), but also a correctness risk if position data changes mid-execution (though advisory locks mitigate this)
**Fix**: Materialize `calculate_yield_allocations` into a temp table at step 3, then reference it in all subsequent steps

---

### BUG 4: `upsert_fund_aum_after_yield` AUM calculation inconsistency

In the ELSE branch (no existing AUM record), it excludes `fees_account` from the position sum:
```sql
WHERE COALESCE(p.account_type::text, '') <> 'fees_account'
```
But `recalculate_fund_aum_for_date` includes ALL accounts:
```sql
WHERE ip.fund_id = p_fund_id AND ip.current_value > 0
```
This means AUM values differ depending on which code path is taken.

**Severity**: LOW -- `apply_segmented_yield_distribution_v5` now bypasses this function (fixed in previous migration), but the function is still callable and will produce wrong AUM values.
**Fix**: Align the filter to include all accounts (matching `recalculate_fund_aum_for_date`)

---

## Overloaded Functions (7 pairs)

| Function | Overloads | Verdict |
|----------|-----------|---------|
| `void_and_reissue_transaction` | 4-param (legacy, broken) + 6-param (correct) | DROP the 4-param overload |
| `get_fund_composition` | 1-param (current) + 2-param (historical by date) | KEEP both -- legitimate |
| `is_admin` | 0-param (JWT check) + 1-param (user_id check) | KEEP both -- used everywhere |
| `is_super_admin` | 0-param + 1-param | KEEP both |
| `log_audit_event` | trigger + callable | KEEP both |
| `require_super_admin` | 0-param (returns uuid) + 2-param (returns void) | KEEP both -- different use cases |
| `run_integrity_pack` | 0-param (simple) + 2-param (scoped) | KEEP both |

---

## Ghost Functions (Exist in Contracts/Docs but NOT in Database)

These are referenced in `src/contracts/rpcSignatures.ts` and documentation but do **not exist** in the database:

| Function | Status |
|----------|--------|
| `apply_adb_yield_distribution_v3` | Does not exist |
| `preview_adb_yield_distribution_v3` | Does not exist |
| `apply_daily_yield_to_fund_v3` | Does not exist |
| `crystallize_yield_before_flow` | Does not exist |
| `batch_crystallize_fund` | Does not exist |
| `apply_deposit_with_crystallization` | Does not exist |
| `apply_withdrawal_with_crystallization` | Does not exist |
| `admin_create_transaction` | Does not exist |
| `admin_create_transactions_batch` | Does not exist |
| `apply_transaction_with_crystallization` | Does not exist |

These are not called from any service code (confirmed via search), so they are dead contract entries. No runtime impact, but they clutter the contract and could mislead future development.

**Fix**: Remove these entries from `src/contracts/rpcSignatures.ts`

---

## Implementation Plan

### Migration 1: Fix runtime bugs (SQL)

1. Fix `void_fund_daily_aum` -- add missing `p_void_crystals := false` argument
2. Drop the broken 4-param `void_and_reissue_transaction` overload
3. Fix `upsert_fund_aum_after_yield` -- remove `fees_account` exclusion filter
4. Optimize `apply_segmented_yield_distribution_v5` -- materialize `calculate_yield_allocations` into a temp table, reference it in all 6 locations

### Code Change 1: Clean up ghost contracts

Remove the 10 non-existent function entries from `src/contracts/rpcSignatures.ts` and any rate-limit entries in `src/lib/rpc/client.ts` that reference them.

### Sequencing

1. SQL migration first (fixes runtime crashes)
2. Contract cleanup second (cosmetic, no runtime impact)

### Technical: SQL for Bug 1 fix

```sql
-- In void_fund_daily_aum, change:
PERFORM void_yield_distribution(v_dist_id, p_admin_id, 'Cascade...' || p_reason);
-- To:
PERFORM void_yield_distribution(v_dist_id, p_admin_id, 'Cascade...' || p_reason, false);
```

### Technical: SQL for Bug 3 fix (performance)

```sql
-- At top of apply_segmented_yield_distribution_v5, after step 2:
CREATE TEMP TABLE _yield_alloc ON COMMIT DROP AS
  SELECT * FROM calculate_yield_allocations(p_fund_id, p_recorded_aum, p_period_end);

-- Then replace all subsequent calculate_yield_allocations(...) calls with:
-- SELECT ... FROM _yield_alloc ...
```
