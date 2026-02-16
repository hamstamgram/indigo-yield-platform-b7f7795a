
# Yield Recording Logic Audit -- Findings and Fix Plan

## Confirmed Bugs (with evidence from DB and code)

### BUG 1: CRITICAL -- Opening AUM Excludes INDIGO Fees (229,287 vs 229,358)

**Evidence:** Database query confirms:
- `investor_only` sum = 229,287 XRP (Sam only)
- `actual_all_accounts` sum = 229,358 XRP (Sam + Ryan 14.20 + Indigo 56.80)

**Root Cause: `get_active_funds_summary` RPC** (lines from DB function):
```sql
SUM(CASE WHEN p.account_type = 'investor' THEN ip.current_value ELSE 0 END)
```
This filter only counts `account_type = 'investor'`, excluding `ib` and `fees_account`.

**Fix:** Change to include ALL account types:
```sql
SUM(ip.current_value) as calculated_aum
```
Keep investor_count as investor-only (cosmetic metric).

---

### BUG 2: CRITICAL -- Fund Composition Excludes INDIGO Fees and IB from Investor List

**Root Cause: `get_fund_composition` RPC** has TWO filters:
```sql
-- AUM denominator: investor only
WHERE ip.fund_id = p_fund_id AND p.account_type = 'investor'

-- Result set: investor only  
WHERE ip.fund_id = p_fund_id AND p.account_type = 'investor'
```

Ryan and INDIGO Fees never appear in the fund composition panel.

**Fix:** Remove the `account_type = 'investor'` filter from both the AUM denominator query and the main result query. All accounts with `current_value > 0` should appear.

---

### BUG 3: MEDIUM -- Frontend `getCurrentFundAUM` Excludes fees_account

**File:** `src/services/admin/yields/yieldHistoryService.ts` line 121

```typescript
.filter((p) => p.account_type === "investor" || p.account_type === "ib")
```

This includes IB but excludes `fees_account`. Must add `fees_account` to the filter.

---

### BUG 4: LOW -- Preview RPC Excludes INDIGO Fees from Allocations Output

**Root Cause:** `preview_segmented_yield_distribution_v5` line 295:
```sql
WHERE t.total_gross > 0 AND t.investor_id != v_fees_account_id
```

The V5 engine correctly includes INDIGO Fees in yield calculation internally (line 204-206: earns yield at 0% fee), but excludes it from the final allocations output. This means the preview table won't show INDIGO Fees as a row.

**Fix:** Remove `AND t.investor_id != v_fees_account_id` from the output query. INDIGO Fees should appear as a visible row in the preview/confirmation table.

---

### ALREADY FIXED (from previous session)

- **Issue 3 (Transaction Date visibility):** Fixed in `YieldInputForm.tsx` -- hidden when `isReporting`.
- **Issue 4 (Zero Yield block):** Fixed in `useYieldCalculation.ts` -- validation removed.

---

## Fix Plan

### Step 1: Database Migration -- Fix `get_active_funds_summary`
Change AUM calculation from investor-only to all account types:
```sql
-- Before: SUM(CASE WHEN p.account_type = 'investor' THEN ip.current_value ELSE 0 END)
-- After:  SUM(ip.current_value)
```

### Step 2: Database Migration -- Fix `get_fund_composition`
Remove `account_type = 'investor'` filter from both the AUM denominator and the main query. All accounts with `current_value > 0` in the fund should appear.

### Step 3: Database Migration -- Fix `preview_segmented_yield_distribution_v5`
Remove `AND t.investor_id != v_fees_account_id` from the final allocations output loop (around line 295 of the function). INDIGO Fees should appear as a visible allocation row.

### Step 4: Frontend -- Fix `getCurrentFundAUM`
**File:** `src/services/admin/yields/yieldHistoryService.ts` line 121
Add `fees_account` to the account type filter:
```typescript
.filter((p) => p.account_type === "investor" || p.account_type === "ib" || p.account_type === "fees_account")
```

### Summary

| Fix | Type | Impact |
|-----|------|--------|
| `get_active_funds_summary` AUM filter | DB Migration | AUM cards show correct totals |
| `get_fund_composition` account filter | DB Migration | Composition shows all accounts |
| V5 preview allocations output filter | DB Migration | INDIGO Fees appears in preview table |
| `getCurrentFundAUM` frontend filter | Code change | Yield form shows correct "Current AUM" |

### Verification After Fix
- XRP fund "Current AUM" should display **229,358** (not 229,287)
- Fund composition should list 3 rows: Sam Johnson, ryan van der wall, INDIGO FEES
- Yield preview should show INDIGO FEES earning proportional yield at 0% fee
