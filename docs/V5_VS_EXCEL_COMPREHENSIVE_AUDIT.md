# V5 Engine vs Excel Spreadsheet: Comprehensive Audit

> **Date**: February 18, 2026
> **Auditors**: Senior Developer + CFO/Accountant + CTO perspective
> **Scope**: Every function, formula, and logic path in the V5 yield engine vs the Excel spreadsheet
> **Status**: AUDIT COMPLETE - 9 discrepancies identified, 7 require code changes

---

## Executive Summary

The V5 segmented yield distribution engine (`apply_segmented_yield_distribution_v5`) has **9 discrepancies** with the Excel spreadsheet model. Of these:

| Severity | Count | Impact |
|----------|-------|--------|
| CRITICAL | 2 | Yield allocated to wrong investors, wrong amounts |
| HIGH | 3 | Incorrect segment boundaries, historical replay broken |
| MEDIUM | 2 | Dust routing, comment/code mismatch |
| LOW | 2 | Cosmetic, precision |

**The two CRITICAL issues cause yield to be allocated incorrectly for every month that has mid-period flows (deposits/withdrawals).** This affects 42 of 48 fund-months (87.5%).

---

## Discrepancy 1: Allocation Timing (CRITICAL)

### What the Excel does

The Excel allocates yield to **opening-balance holders BEFORE flows**. New depositors in a segment receive **zero yield** for that segment.

```
Excel segment model:
  1. Start with opening balances
  2. Compute gross yield = opening_AUM * grossPct
  3. Distribute yield proportionally to OPENING holders only
  4. THEN apply capital flows (deposits/withdrawals)
  5. Closing balance = opening + yield_net + flows
```

### What V5 does

V5 applies capital flows FIRST, then distributes yield to ALL holders (including new depositors):

```
V5 segment model (lines 271-302):
  1. Start with opening balances
  2. Apply capital flows (deposits/withdrawals) -> new depositors now have balance
  3. balance_sum = SUM(all balances including new depositors)
  4. seg_yield = closing_aum - balance_sum
  5. Distribute yield proportionally to ALL holders with balance > 0
```

### Evidence

BTC October 2024:
- Opening holders: Jose (3.50), Kyle (2.00), Fees (0.01) = 5.51 total
- Flows: Matthias DEP 4.62, Thomas DEP 6.52, Danielle DEP 5.20 = +16.34
- Gross yield = 0.03 BTC

**Excel result**: Only Jose, Kyle, Fees receive yield. Matthias, Thomas, Danielle get 0.
**V5 result**: All 6 investors share the 0.03 proportionally (new depositors dilute existing holders).

### Fix Required

In V5 lines 320-326, change the yield allocation loop to use **opening balances** (before flows) for yield distribution, not post-flow balances. After yield is distributed, THEN apply flows:

```sql
-- BEFORE (current V5): flows applied, then yield to everyone
FOR v_inv IN SELECT ... FROM _v5_bal b WHERE b.balance > 0 LOOP
  v_share := v_inv.balance / v_balance_sum;  -- includes new depositors

-- AFTER (match Excel): yield to opening holders only, then flows
-- Option A: Track opening_balance separately in _v5_bal
-- Option B: Compute yield BEFORE the flow-application loop
```

**Recommended approach**: Add an `opening_balance` column to `_v5_bal`. Compute yield using opening balances, then apply flows. This preserves the segment structure while matching the Excel model.

### Files to Modify

- `apply_segmented_yield_distribution_v5` (database function)
- `preview_segmented_yield_distribution_v5` (database function - must match)

---

## Discrepancy 2: IB Parent Activation Timing (CRITICAL)

### What the Excel does

IB parents only receive commissions starting from specific dates per fund:
- **ETH**: Lars/Alec/Alex start Sep 2025 (not from inception May 2025)
- **USDT**: Lars starts Jul 2025
- **BTC**: Ryan starts Nov 2025
- **SOL**: Alex/Ryan start Sep 2025
- **XRP**: Ryan starts Nov 2025

Before activation, the IB amount (2% or 4%) is included in the fees_account balance (the total deduction = fee% + ib% all goes to Indigo Fees).

### What V5 does

V5 always routes IB to the IB parent if `ib_parent_id IS NOT NULL AND ib_rate > 0` (line 353). There is no concept of "IB activation date" per fund.

### Evidence

ETH June 2025 (before IB activation):
- Babak (fee=18%, IB=2%): total deduction = 20% of gross, ALL to fees_account
- Fees_account end = 0.0058830751 = Babak_gross * 20% (fee + IB combined)
- Lars: NOT in June balances at all

ETH Sep 2025 (after IB activation):
- Lars appears with IB balance entries
- Babak's deduction now splits: 18% to fees_account, 2% to Lars

### Fix Required

Two options:

**Option A**: Add `ib_effective_date` to `ib_commission_schedule` and respect it in V5:
```sql
-- In V5, only route IB to parent if past effective date
IF v_inv.ib_parent_id IS NOT NULL AND v_ib_rate_seg > 0
   AND v_seg_end >= get_ib_activation_date(v_inv.investor_id, p_fund_id) THEN
  -- route to IB parent
ELSE
  -- include IB amount in fee (route to fees_account)
END IF;
```

**Option B**: Set `ib_commission_schedule.effective_date` correctly per fund so `get_investor_ib_pct()` returns 0 before activation. This requires populating the schedule table with fund-specific effective dates.

**Recommended**: Option B - uses existing infrastructure.

### Data to Insert

```sql
-- ib_commission_schedule entries with fund-specific effective dates
-- (investor_id, fund_id, ib_percentage, effective_date)
-- Lars/Babak ETH: effective_date = '2025-09-01'
-- Lars/Babak USDT: effective_date = '2025-07-01'
-- etc.
```

### Files to Modify

- `ib_commission_schedule` table (data insert)
- Possibly `_resolve_investor_ib_pct` if it needs fund-specific logic

---

## Discrepancy 3: Segment Boundary - Crystallization Marker Exclusion (HIGH)

### What V5 does

V5 line 208: `yd.effective_date > v_period_start` (strict greater-than)

This excludes crystallization markers on the period start date (day 1 of the month). If a deposit/withdrawal happens on the first day of the month, V5 won't create a segment boundary for it.

### What the Excel does

The Excel creates segment boundaries for flows on ANY day of the month, including day 1.

### Fix Required

Change line 208 from `>` to `>=`:

```sql
-- BEFORE
AND yd.effective_date > v_period_start

-- AFTER
AND yd.effective_date >= v_period_start
```

**Caution**: This changes segment construction for months where flows happen on day 1. Need to verify that the opening balance calculation (line 175: `tx_date < v_period_start`) still works correctly with this change.

### Files to Modify

- `apply_segmented_yield_distribution_v5` (line 208)
- `preview_segmented_yield_distribution_v5` (corresponding line)

---

## Discrepancy 4: is_active Filter for Historical Replay (HIGH)

### What V5 does

V5 line 183: `ip.is_active = true` - only includes investors with active positions.

During historical replay (after voiding all YIELD/FEE_CREDIT/IB_CREDIT transactions), some investors have `is_active = false` because their position net = 0 or negative (e.g., they deposited, earned yield, then withdrew including yield - but with yield voided, the withdrawal exceeds the deposit).

### Impact

Kyle Gulamerian in BTC: Position = -0.033 (2.0 deposit + 0.0336 yield voided - 2.0336 share-class WD = -0.033). V5 excludes Kyle from September 2024 yield distribution because `is_active = false`.

### Fix Required

For historical replay, all positions should be set to `is_active = true` before running V5. The position value may be wrong, but V5 recalculates balances from SUM(transactions) anyway (line 172-175), so the is_active flag only gates inclusion.

**Better permanent fix**: Change line 183 to include ALL investors who have ANY non-voided transactions in the fund, regardless of is_active:

```sql
-- BEFORE
FROM investor_positions ip
JOIN profiles p ON p.id = ip.investor_id
WHERE ip.fund_id = p_fund_id AND ip.is_active = true

-- AFTER: Include any investor with transactions in this fund
FROM (
  SELECT DISTINCT t.investor_id
  FROM transactions_v2 t
  WHERE t.fund_id = p_fund_id AND t.is_voided = false
) active_investors
JOIN profiles p ON p.id = active_investors.investor_id
LEFT JOIN investor_positions ip ON ip.investor_id = active_investors.investor_id
  AND ip.fund_id = p_fund_id
```

### Files to Modify

- `apply_segmented_yield_distribution_v5` (lines 169-183)
- `preview_segmented_yield_distribution_v5` (corresponding section)

---

## Discrepancy 5: Opening Balance Source (HIGH)

### What V5 does

V5 computes opening balances from SUM(transactions) but joins through `investor_positions` (line 181-183):

```sql
SELECT p.id, COALESCE((
  SELECT SUM(t.amount) FROM transactions_v2 t
  WHERE t.investor_id = p.id AND t.fund_id = p_fund_id
    AND t.tx_date < v_period_start AND t.is_voided = false
), 0)
FROM investor_positions ip
JOIN profiles p ON p.id = ip.investor_id
WHERE ip.fund_id = p_fund_id AND ip.is_active = true
```

This has TWO problems:
1. `is_active = true` gate (Discrepancy 4)
2. Only finds investors who have an `investor_positions` row. New depositors mid-month may not have a position row yet if the deposit is their first transaction.

### What the Excel does

The Excel tracks all investors who have any balance at the start of the month. No dependency on a separate "positions" table.

### Fix Required

See Discrepancy 4 fix - replace the `investor_positions` join with a direct `transactions_v2` query to find all investors with pre-period-start transactions.

### Files to Modify

- Same as Discrepancy 4

---

## Discrepancy 6: Preview Function Uses Different Logic (MEDIUM)

### What V5 Apply does

The apply function (`apply_segmented_yield_distribution_v5`) uses crystallization markers from `yield_distributions` table to build segments (lines 197-219).

### What V5 Preview does

The preview function (`preview_segmented_yield_distribution_v5`) uses a DIFFERENT approach:
- Gets crystallization dates from `investor_yield_events` (not `yield_distributions`)
- Distributes yield proportionally by TIME (days in segment / total days), not by closing_aum per segment
- Uses `investor_positions.current_value` directly instead of SUM(transactions)
- Does NOT apply capital flows at all

### Impact

Preview results don't match Apply results. This confuses admins who preview a distribution and then see different numbers after applying it.

### Fix Required

The preview function should use the SAME algorithm as the apply function:
1. Build segments from the same source (yield_distributions or a temporary calculation)
2. Use the same balance computation (SUM of transactions)
3. Use the same yield allocation logic (opening balances, not current positions)

### Files to Modify

- `preview_segmented_yield_distribution_v5` (full rewrite to match apply logic)

---

## Discrepancy 7: Dust Routing (MEDIUM)

### What V5 does

V5 uses "largest remainder" method - dust goes to the investor with the largest gross allocation (line 411-417). This is a REAL INVESTOR, not the fees_account.

### What the Excel does

Dust amounts are minimal (sub-satoshi for BTC). The Excel appears to route all residuals to the Indigo Fees account.

### Fix Required

Change the dust recipient from largest investor to fees_account:

```sql
-- BEFORE (line 434)
IF v_residual != 0 AND v_largest_investor_id IS NOT NULL THEN
  -- adjustments applied to v_largest_investor_id

-- AFTER
IF v_residual != 0 THEN
  -- Route dust to fees_account
  UPDATE _v5_tot SET
    total_gross = total_gross + v_residual,
    total_net = total_net + v_residual  -- no fee/IB on dust
  WHERE investor_id = v_fees_account_id;
  -- Don't add to header totals (fees_account is excluded)
```

### Files to Modify

- `apply_segmented_yield_distribution_v5` (lines 431-454)
- `preview_segmented_yield_distribution_v5` (corresponding section)

---

## Discrepancy 8: IB Comment/Code Mismatch (LOW - No Code Change Needed)

### Issue

V5 line 350-351 comment says:
```sql
-- SCORCHED EARTH FIX: IB commission from NET yield (not GROSS)
-- IB = (gross - platform_fee) * ib_rate / 100
```

But the actual code on line 354 does:
```sql
v_ib := ROUND((v_gross * v_ib_rate_seg / 100)::numeric, 8);
```

This is IB from **GROSS**, not NET. The Excel also uses IB from GROSS (verified: Babak's total deduction = 20% = 18% fee + 2% IB, both from gross).

### Evidence

Babak ETH June 2025:
- Babak gross: 0.0294153755
- Total deduction: 0.0058830751 = exactly 20% of gross
- If IB from NET: deduction would be 18% + (82% * 2%) = 19.64%, giving 0.005775 (doesn't match)
- If IB from GROSS: deduction = 18% + 2% = 20%, giving 0.005883 (matches exactly)

### Fix Required

**Fix the misleading comments only.** The code is correct (IB from GROSS matches Excel):

```sql
-- BEFORE (misleading)
-- SCORCHED EARTH FIX: IB commission from NET yield (not GROSS)
-- IB = (gross - platform_fee) * ib_rate / 100

-- AFTER (accurate)
-- IB commission from GROSS yield (additive model: total deduction = fee% + ib%)
-- IB = gross * ib_rate / 100
```

Also fix the memory entry that says "IB from NET" - the code does IB from GROSS, which matches the Excel.

### Files to Modify

- `apply_segmented_yield_distribution_v5` (comment only, lines 350-351)
- `preview_segmented_yield_distribution_v5` (same comment)
- Memory file (correct the misleading "IB from NET" entry)

---

## Discrepancy 9: Combined Segments Lose Intermediate Compounding (LOW)

### Issue

When multiple Excel segments are combined into a single V5 segment (e.g., to work around Discrepancy 1), the intermediate compounding is lost.

Example - BTC Aug 2024 (2 segments in Excel):
- Seg1: Jose earns yield, Fees earns fee. Jose now has 3.4867, Fees has 0.0033.
- Seg2: Jose gets yield on 3.4867 (not 3.468), Fees gets yield on 0.0033.
- The 0.0033 in Fees earns a tiny amount of yield in seg2 (compounding).

If combined into 1 V5 segment, Fees starts at 0 and doesn't compound between segments.

### Impact

8 satoshis per month drift for BTC. Within dust tolerance. Proportionally similar for other assets.

### Fix Required

No code change needed if V5 properly creates segment boundaries at each flow date. The V5 engine already supports multi-segment months via crystallization markers. Ensure markers are created at each flow date to preserve intermediate compounding.

---

## Summary: Required Code Changes

### Database Functions to Modify

| Function | Discrepancy | Priority | Effort |
|----------|-------------|----------|--------|
| `apply_segmented_yield_distribution_v5` | #1, #3, #4, #5, #7, #8 | CRITICAL | Large |
| `preview_segmented_yield_distribution_v5` | #1, #3, #4, #5, #6, #7, #8 | HIGH | Large (rewrite) |

### Data Changes Required

| Table | Discrepancy | Action |
|-------|-------------|--------|
| `ib_commission_schedule` | #2 | Insert fund-specific effective dates |
| `investor_positions` | #4 | Set all `is_active = true` for replay |

### Algorithm Changes (V5 Apply Function)

#### Change 1: Opening-balance-only yield allocation (Discrepancy #1)

```
Current flow:
  for each segment:
    apply_flows()              -- deposits/withdrawals modify balances
    balance_sum = SUM(balance)  -- includes new depositors
    yield = closing_aum - balance_sum
    allocate_yield(balance)     -- new depositors get yield

Required flow:
  for each segment:
    save_opening_balances()     -- snapshot before flows
    apply_flows()               -- deposits/withdrawals modify balances
    balance_sum = SUM(opening_balance) -- only pre-existing holders
    yield = closing_aum - SUM(balance) -- use post-flow for yield computation
    allocate_yield(opening_balance)     -- only opening holders get yield
```

**Key insight**: `closing_aum` in the Excel = openingAum + flows (EXCLUDES yield). So:
- `yield = closing_aum - SUM(opening_balance)` -- wrong, this includes flows
- Need: `yield = actual_AUM * grossPct` or `yield` computed from the known total

The Excel computes yield as: `gross_yield = opening_AUM * grossPct / 100`

V5 computes yield as: `seg_yield = closing_aum - balance_sum` (where balance_sum includes flows)

These are equivalent when flows are excluded from balance_sum. If we compute yield BEFORE applying flows:
```sql
v_balance_sum_before := SUM(opening_balance);  -- before flows
v_seg_yield := v_seg_closing_aum - v_balance_sum_before;  -- this IS the gross yield
-- Now allocate v_seg_yield to opening_balance holders only
-- Then apply flows to update balances
```

Wait - this doesn't work either because `closing_aum = opening_aum + flows` in the Excel. So:
```
closing_aum - opening_balance_sum = opening_aum + flows - opening_balance_sum
                                  = yield + flows (if opening_balance_sum = opening_aum)
```

We need to subtract flows too. Or equivalently, compute yield as:
```
yield = closing_aum - opening_balance_sum - segment_flows
```

Where `segment_flows = SUM of DEP/WD amounts in this segment`.

#### Change 2: Segment boundary inclusion (Discrepancy #3)

```sql
-- Line 208: change > to >=
AND yd.effective_date >= v_period_start
```

#### Change 3: Remove is_active gate (Discrepancies #4, #5)

Replace investor_positions join with direct transactions_v2 query to find all eligible investors.

#### Change 4: Dust routing to fees_account (Discrepancy #7)

Route residual amount to fees_account instead of largest investor.

#### Change 5: Fix IB comments (Discrepancy #8)

Update comments to say "IB from GROSS" (code already correct).

---

## Fee Schedule Verification

### Investor Fee Percentages (DB vs Excel)

| Investor | DB fee_pct | Excel fee_pct | Match |
|----------|-----------|---------------|-------|
| Jose Molla | 15% | 15% | YES |
| Kyle Gulamerian | 15% | 15% | YES |
| Sacha Oshry | 15% | 15% | YES |
| INDIGO DIGITAL ASSET FUND LP | 0% | 0% | YES |
| INDIGO Ventures | 0% | 0% | YES |
| Nathanael Cohen | 0% | 0% | YES |
| Thomas Puech | 0% | 0% | YES |
| Victoria Pariente-Cohen | 0% | 0% | YES |
| Blondish | 0% | 0% | YES |
| Nath & Thomas | 0% | 0% | YES |
| Tomer Mazar | 0% | 0% | YES |
| Matthew Beatty | 10% | 10% | YES |
| Alain Bensimon | 10% | 10% | YES |
| Pierre Bezencon | 10% | 10% | YES |
| Terance Chen | 10% | 10% | YES |
| Bo De Kriek | 10% | 10% | YES |
| Julien Grunebaum | 10% | 10% | YES |
| Anne Cecile Noique | 10% | 10% | YES |
| Danielle Richetta | 10% | 10% | YES |
| Matthias Reiser | 10% | 10% | YES |
| Oliver Loisel | 10% | 10% | YES |
| Daniele Francilia | 10% | 10% | YES |
| Kabbaj | 20% | 20% | YES |
| HALLEY86 | 20% | 20% | YES |
| Dario Deiana | 20% | 20% | YES |
| Valeria Cruz | 20% | 20% | YES |
| Monica Levy Chicheportiche | 20% | 20% | YES |
| Brandon Hood | 20% | 20% | YES |
| NSVO Holdings | 20% | 20% | YES |
| Tomer Zur | 20% | 20% | YES |
| Babak Eftekhari | 18% (+2% IB) | 20% total | YES |
| Advantage Blockchain | 18% (+2% IB) | 20% total | YES |
| Sam Johnson | 16% (+4% IB) | 20% total | YES |
| Ventures Life Style | 16% (+4% IB) | 20% total | YES |
| Paul Johnson | 13.5% (+1.5% IB) | 15% total | YES |
| All IB accounts (Lars, Alex, Alec, Ryan, Joel) | 0% | 0% | YES |
| Indigo Fees | 0% | 0% (receives fees) | YES |

### IB Commission Rates (DB vs Excel)

| IB Parent | Source Investor | DB ib_pct | Excel ib_pct | Match |
|-----------|----------------|-----------|-------------|-------|
| Ryan Van Der Wall | Sam Johnson | 4% | 4% | YES |
| Alex Jacobs | Paul Johnson | 1.5% | 1.5% | YES |
| Lars Ahlgreen | Babak Eftekhari | 2% | 2% | YES |
| Alec Beckman | Advantage Blockchain | 2% | 2% | YES |
| Joel Barbeau | Ventures Life Style | 4% | 4% | YES |

### IB Formula: IB from GROSS (Confirmed)

Both the V5 code and the Excel use: `IB = gross_yield * ib_rate / 100`

This is the ADDITIVE model: total deduction = fee% + ib% (both from gross).
- Babak: 18% fee + 2% IB = 20% total deduction from gross (confirmed)
- Sam Johnson: 16% fee + 4% IB = 20% total deduction from gross

---

## Fund-Month Segment Map

Total: 48 fund-months across 5 funds

| Fund | Months | Multi-Segment | With Flows |
|------|--------|--------------|------------|
| BTC | 20 | 15 (75%) | 15 |
| ETH | 9 | 7 (78%) | 9 |
| SOL | 6 | 6 (100%) | 6 |
| USDT | 9 | 8 (89%) | 9 |
| XRP | 4 | 3 (75%) | 3 |
| **Total** | **48** | **39 (81%)** | **42 (87.5%)** |

81% of months have multiple segments. The allocation timing discrepancy (#1) affects 87.5% of months (those with flows).

---

## Crystallization Function Audit

### `crystallize_yield_before_flow`

This function creates segment boundary markers for V5. Key findings:

1. **AUM lookup**: Uses `aum_date <= v_event_date` (fixed in Feb 2026). Correct.
2. **Negative yield**: Sets `v_yield_amount := 0` for negative values. This differs from V5 which allows negative segments.
3. **Creates**: `yield_distributions` (with `distribution_type` = trigger type) + `fund_aum_events` + `investor_yield_events`. These are the markers V5 reads for segment building.
4. **Consolidated**: V5 consolidates these markers (`consolidated_into_id` = main distribution ID).

### Issue for Historical Replay

During historical replay (backfill mode), there are no crystallization events because deposits were seeded directly (not through `apply_transaction_with_crystallization`). V5 will see 0 crystallization markers and create a single segment for the entire month.

**Fix**: Create crystallization markers manually at each flow date with the correct `closing_aum` from performance.json. This is a data preparation step, not a code change.

---

## Action Items (Ordered by Priority)

### P0: CRITICAL (Must fix before replay)

1. **Modify V5 allocation timing** - yield to opening holders only, flows applied after
2. **Create crystallization markers** for all 153 segments from performance.json
3. **Fix `is_active` filter** - include all investors with transactions in the fund

### P1: HIGH (Must fix for accuracy)

4. **Fix segment boundary** - change `>` to `>=` for day-1 flows
5. **Populate `ib_commission_schedule`** with fund-specific effective dates
6. **Rewrite preview function** to match apply logic

### P2: MEDIUM (Should fix)

7. **Change dust routing** to fees_account
8. **Fix IB comments** in V5 code

### P3: LOW (Nice to have)

9. **Memory file correction** - update "IB from NET" to "IB from GROSS"

---

## Risk Assessment

| Change | Risk | Mitigation |
|--------|------|------------|
| Allocation timing change | HIGH - core algorithm change | Verify BTC Aug 2024 (simplest month) first, then expand |
| is_active removal | MEDIUM - may include unexpected investors | Verify against Excel investor lists per month |
| Segment boundary change | MEDIUM - affects period boundaries | Test with BTC Oct 2024 (day-1 deposits) |
| IB schedule dates | LOW - data-only change | Verify each date against Excel IB parent appearance |
| Dust routing | LOW - sub-satoshi amounts | Conservation identity check after change |
| Preview rewrite | MEDIUM - user-facing function | Compare preview vs apply for test month |

---

## Implementation Order

```
1. Fix V5 allocation timing (P0)
   - Add opening_balance tracking to _v5_bal
   - Compute yield using opening balances
   - Apply flows AFTER yield distribution
   - Test with BTC Aug 2024

2. Fix is_active filter (P0)
   - Replace investor_positions join with transactions_v2 query
   - Test with BTC Sep 2024 (Kyle should be included)

3. Fix segment boundary (P1)
   - Change > to >= on line 208
   - Test with BTC Oct 2024 (Oct 1 deposits)

4. Create crystallization markers (P0 - data prep)
   - Script to read performance.json segments
   - Create yield_distributions + fund_aum_events for each segment boundary
   - Verify markers are read correctly by V5

5. Populate ib_commission_schedule (P1)
   - ETH: Lars/Babak effective 2025-09-01, Alec/Advantage 2025-09-01
   - USDT: Lars/Babak effective 2025-07-01
   - BTC: Ryan/Sam effective 2025-11-01
   - SOL: Alex/Paul effective 2025-09-01, Ryan/Sam effective 2025-11-01
   - XRP: Ryan/Sam effective 2025-11-01

6. Change dust routing (P2)
   - Route to fees_account instead of largest investor

7. Fix comments (P2)
   - IB from GROSS, not NET

8. Rewrite preview function (P1)
   - Match apply function algorithm exactly

9. Full replay and verification (after all fixes)
   - 48 fund-months x all investors
   - Conservation identity for every distribution
   - Balance comparison against fund-balances.json
```
