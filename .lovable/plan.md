

## Fix INDIGO Fees Cards Consistency

### Problem
1. **Balance card** reads from `investor_positions` (includes ALL transactions -- both reporting + checkpoint)
2. **Yield Earned card** now excludes checkpoint transactions after our filter fix, creating a gap (116.56 vs 56.80)
3. **Yield Earned card** mislabels its content -- it includes FEE_CREDIT (revenue) but title says "yield earned on fee balances"

### Solution

Split the Fees account data into two clear concepts:

#### Card 1: INDIGO Fees Account Balance (no change)
Keep reading from `investor_positions.current_value` -- this is the correct live position (116.558517 XRP). No code change needed.

#### Card 2: Rename "Yield Earned" → "Fee Revenue Collected"
Update the card to clearly represent **total fee revenue credited to the INDIGO Fees account** (reporting-purpose only). This is the FEE_CREDIT transactions from investor yield distributions.

- Update title: "Fee Revenue Collected" with description "From yield distributions"
- Keep the `purpose != 'transaction'` filter (correct -- we only report on reporting-purpose distributions)
- The 56.80 XRP figure is correct for reporting-only fee revenue

#### Optional: Add a third metric for actual yield-on-yield
If desired, add a small line showing YIELD-type transactions only (the 0.09 XRP compounding return on fee balances). This would be the true "yield earned on fee balances."

### Files to Change

1. **`src/features/admin/fees/components/YieldEarnedSummaryCard.tsx`**
   - Rename title from "Yield Earned" → "Fee Revenue Collected"
   - Update description from "On fee balances" → "From yield distributions"
   - Update icon color from `text-yield` to `text-primary` (fee revenue, not yield)

2. **`src/features/admin/fees/components/YieldEarnedTab.tsx`**
   - Same title/description updates for consistency

3. **`src/services/admin/feesService.ts` → `getYieldEarned()`**
   - Narrow the type filter to only `["FEE_CREDIT"]` for the revenue card (remove YIELD, IB_CREDIT, DEPOSIT, DUST_SWEEP, INTERNAL_CREDIT which are separate concepts)
   - OR: keep all types but clearly label the card as "Total Credits" rather than "Yield Earned"

### Recommendation
The simplest accurate fix: rename the card and keep the query as-is (all reporting-purpose credits to fees account = 56.80). The balance card (116.56) correctly shows the real position including checkpoint effects -- this is expected since checkpoints genuinely adjust positions.

