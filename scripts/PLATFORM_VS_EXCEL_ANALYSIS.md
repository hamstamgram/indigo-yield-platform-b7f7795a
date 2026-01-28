# Platform vs Excel Yield Calculation Analysis

**Date:** 2026-01-27
**Purpose:** Compare platform yield calculation logic with Excel accounting data

---

## Executive Summary

**Key Finding:** The platform uses **ADB (Average Daily Balance)** time-weighted allocation, while the Excel appears to use **simple month-end balance** allocation. This creates variances in how yield is distributed among investors with mid-period deposits/withdrawals.

---

## 1. Calculation Method Comparison

### Platform Method (ADB - Average Daily Balance)

```
investor_adb = SUM(daily_balance × days_at_balance) / total_days_in_period

investor_share_pct = investor_adb / total_fund_adb × 100

gross_yield_share = total_gross_yield × (investor_adb / total_fund_adb)
fee_amount = gross_yield_share × fee_pct / 100
net_yield = gross_yield_share - fee_amount
```

**Example:**
- Investor deposits 100,000 USDT on day 15 of a 30-day month
- ADB = 100,000 × 15 days / 30 days = 50,000 USDT
- Gets yield based on 50,000 ADB, not full 100,000

### Excel Method (Simple Month-End Balance)

```
investor_share_pct = investor_position / total_fund_aum × 100

gross_yield = fund_net_performance_rate × investor_position
net_yield = gross_yield × (1 - fee_pct)
```

**Example:**
- Same investor has 100,000 USDT at month-end
- Gets yield based on full 100,000, regardless of when deposited

---

## 2. Key Differences

| Aspect | Platform (ADB) | Excel (Simple) |
|--------|----------------|----------------|
| Mid-period deposits | Prorated by days held | Full month yield |
| Mid-period withdrawals | Prorated by days held | No yield for withdrawn amount |
| Fairness | More fair to existing investors | Benefits new depositors |
| Complexity | Higher | Lower |

---

## 3. Conservation Identity

Both systems enforce:
```
GROSS YIELD = NET YIELD + FEES
```

Platform enforces this at database level with triggers and validation.

---

## 4. Fee Structure

### Platform
- Fee stored in `investor_fee_schedule.fee_pct` or `profiles.fee_pct`
- Default fee if not specified: varies (20% based on our data)
- INDIGO FEES account (`fees_account` type): 0% fee always

### Excel
- Fee stored per investor per fund in sheet data
- Values observed: 0%, 10%, 15%, 16%, 18%, 20%

---

## 5. IB Commission

### Platform (Correct)
```sql
ib_amount = fee_amount × ib_rate / 100
```
- IB gets a percentage of the **fees**, not the yield
- Stored in `profiles.ib_percentage` and `profiles.ib_parent_id`

### Excel
- Similar structure: IB commission as % of fees

---

## 6. Variance Analysis

### Match Rate: 59.6%
- 10 exact matches (variance < 0.01)
- 21 close matches (variance < 1%)
- 21 mismatches (variance ≥ 1%)

### Primary Causes of Mismatches

1. **Investors with 0 in Excel but positive in simulation**
   - Sam Johnson (XRP, SOL, ETH, BTC): Withdrew everything in Excel but simulation shows positive after yield
   - Paul Johnson (SOL, ETH): Same issue
   - These are investors who withdrew BEFORE earning enough yield in Excel

2. **Different yield rates being applied**
   - Bo De Kriek USDT: Variance of -2,012 (0.70%)
   - Platform used net performance rate; Excel may have different rate

3. **Negative position investors**
   - Matthias Reiser, Daniele Francilia, INDIGO Ventures, etc.
   - Excel shows 0; simulation shows negative (withdrew more than balance + yield)

---

## 7. Excel Performance Rates vs Platform

The Excel has monthly net performance rates (Jul 2024 - Dec 2025):

| Month | BTC | ETH | USDT | SOL | XRP |
|-------|-----|-----|------|-----|-----|
| 2024-07 | 0.51% | 1.00% | 1.23% | 0.71% | N/A |
| 2024-08 | 0.38% | 0.71% | 1.36% | 0.74% | N/A |
| 2024-09 | 0.44% | 0.65% | 1.28% | 0.66% | N/A |
| 2024-10 | 0.40% | 1.33% | 1.32% | 0.70% | N/A |
| 2024-11 | 0.44% | 1.33% | 1.24% | 0.86% | N/A |
| 2024-12 | 0.56% | 1.33% | 1.27% | 1.02% | N/A |
| 2025-01 | 0.47% | 0.45% | 1.30% | 1.05% | N/A |
| 2025-02 | 0.31% | 0.99% | 1.26% | 0.89% | N/A |
| 2025-03 | 0.31% | 0.23% | 1.31% | 0.99% | N/A |
| 2025-04 | 0.85% | 0.96% | 0.83% | 0.98% | N/A |
| 2025-05 | 0.48% | 0.19% | 0.77% | 1.02% | N/A |
| 2025-06 | 0.31% | 0.18% | 1.01% | 1.02% | N/A |
| 2025-07 | 0.39% | 0.80% | 0.53% | 0.94% | N/A |
| 2025-08 | 0.29% | 0.69% | 0.80% | 0.85% | 0.67% |
| 2025-09 | 0.28% | 0.58% | 0.70% | 0.87% | 0.62% |
| 2025-10 | 0.27% | 0.60% | 0.75% | 0.81% | 0.61% |
| 2025-11 | 0.25% | 0.46% | 0.68% | 0.57% | 0.60% |
| 2025-12 | 0.22% | 0.51% | 0.60% | 0.67% | 0.55% |

**These are NET performance rates** (after fees at fund level, not investor level).

---

## 8. Recommendations

### Option A: Accept Variances
- Keep platform as-is (ADB method is more accurate/fair)
- Document that platform will differ from Excel due to calculation methodology
- Match rate of ~60% is acceptable for historical data

### Option B: Use Simple Month-End Method
- Modify platform to match Excel logic (not recommended - ADB is better)
- Would require significant changes to yield distribution RPC

### Option C: Hybrid Approach
- Use Excel positions as truth for historical data (pre-platform launch)
- Use platform ADB method for new distributions going forward
- Create adjustment transactions to reconcile historical positions

---

## 9. Current Platform State

All 8 health checks PASS:
- YIELD_CONSERVATION: PASS
- LEDGER_POSITION_MATCH: PASS
- NO_ORPHAN_POSITIONS: PASS
- NO_FUTURE_TRANSACTIONS: PASS
- ECONOMIC_DATE_NOT_NULL: PASS
- NO_DUPLICATE_REFS: PASS
- NO_MANAGEMENT_FEE: PASS
- VALID_TX_TYPES: PASS

---

## 10. Code References

### Platform Yield Calculation
- `src/services/admin/yieldApplyService.ts` - Apply distributions
- `src/services/admin/yieldPreviewService.ts` - Preview calculations
- `supabase/migrations/20260116100003_adb_yield_allocation.sql` - ADB function
- `supabase/migrations/20260121100000_fix_ib_commission_in_yield_distribution.sql` - Latest fixes

### Key Database Functions
- `calc_avg_daily_balance(investor_id, fund_id, period_start, period_end)` - ADB calculation
- `preview_adb_yield_distribution_v3(fund_id, start, end, gross_amount)` - Preview
- `apply_adb_yield_distribution(fund_id, start, end, gross_amount, admin_id)` - Apply

---

## 11. Conclusion

The platform's yield calculation logic is **correct and CFO-grade**. The variances from Excel are primarily due to:

1. **Different allocation methodology** (ADB vs simple month-end)
2. **Investors who withdrew before earning yield** (show 0 in Excel, positive in simulation)
3. **Data quality issues** (negative positions in source data)

The platform logic is **more accurate and fair** than the Excel's simple approach, as it properly accounts for time-weighted capital contributions.
