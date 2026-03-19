

## Revenue Page & Void Cascade Audit

### Database State (Verified)

The void cascade **worked correctly** -- all voided distributions and their transactions have `is_voided = true`. The problem is **not** voided records leaking through.

The issue is **checkpoint (purpose='transaction') yields being double-counted** alongside reporting yields across multiple pages.

### Current Non-Voided Transactions

```text
PURPOSE       TYPE        WHO          AMOUNT
─────────────────────────────────────────────
reporting     YIELD       Sam          284.00
reporting     FEE_CREDIT  Indigo        56.80
reporting     IB_CREDIT   Ryan          14.20
transaction   YIELD       Sam          298.31  ← checkpoint
transaction   FEE_CREDIT  Indigo        59.66  ← checkpoint
transaction   FEE_CREDIT  Indigo         0.005 ← checkpoint
transaction   IB_CREDIT   Ryan          14.92  ← checkpoint
transaction   YIELD       Indigo         0.09  ← checkpoint
transaction   YIELD       Ryan           0.02  ← checkpoint
```

Both reporting AND checkpoint entries are valid non-voided records. The checkpoint entries exist because you applied a "transaction" purpose distribution on 2025-11-30 (the December AUM checkpoint). These are real position-affecting transactions.

---

### Issues Found

#### 1. Revenue Page -- Platform Fees Tab (Admin)
**`getFeeTransactions()`** and **`FeeRevenueKPIs`** do NOT filter by `purpose`. Result:
- KPIs show ~116.47 XRP in fee revenue instead of 56.80 (reporting only)
- Transaction table shows checkpoint FEE_CREDIT/IB_CREDIT entries alongside reporting ones
- ITD revenue is inflated by checkpoint amounts

**Fix**: Filter `getFeeTransactions()` to exclude `purpose = 'transaction'` for FEE_CREDIT/IB_CREDIT types, matching the fix already applied to `generate-fund-performance`.

#### 2. Revenue Page -- IB Management Tab (Admin)
**`getIBCredits()`** in `src/services/ib/management.ts` does NOT filter by purpose. Result:
- Ryan's total earnings show ~29.12 XRP instead of 14.20 XRP
- Checkpoint IB_CREDIT entries are summed into his earnings

**Fix**: Add `purpose = 'reporting'` filter to `getIBCredits()`, or exclude `purpose = 'transaction'`.

#### 3. Yield Earned Summary Card (Admin)
**`getYieldEarned()`** in `feesService.ts` includes checkpoint YIELD/FEE_CREDIT for the Indigo Fees account without filtering purpose. Result:
- Shows inflated yield earned for the fees account

**Fix**: Add purpose filter to exclude checkpoint entries.

#### 4. Investor Yield History (Investor-Facing)
**`investorYieldService.ts`** and **`investorYieldHistoryService.ts`** query YIELD/FEE_CREDIT transactions with `is_voided = false` but do NOT filter by purpose or `visibility_scope`. Result:
- Sam sees BOTH his 284.00 reporting yield AND 298.31 checkpoint yield in his yield history
- This makes it appear his November yield was ~582.31

**Fix**: Add `purpose != 'transaction'` filter, or filter to `purpose = 'reporting'` only, in investor-facing yield queries.

#### 5. Investor Transaction List (Investor-Facing)
**`investorPortalService.ts`** filters by `visibility_scope = 'investor_visible'` and `is_voided = false`. Checkpoint YIELD transactions have `visibility_scope = 'investor_visible'`, so they show in the investor's transaction list.

**Fix**: Add purpose filter to exclude checkpoint entries from investor-visible transactions, OR update the RPC to set checkpoint YIELD transactions to `visibility_scope = 'admin_only'`.

---

### Recommended Approach

**One consistent fix across all services**: Exclude `purpose = 'transaction'` from all revenue/yield display queries. This is the same pattern already applied in `generate-fund-performance`.

#### Files to Change

1. **`src/services/admin/feesService.ts`**
   - `getFeeTransactions()`: Add `.neq("purpose", "transaction")`
   - `getYieldEarned()`: Add `.neq("purpose", "transaction")`

2. **`src/services/ib/management.ts`**
   - `getIBCredits()`: Add `.neq("purpose", "transaction")`

3. **`src/features/investor/yields/services/investorYieldService.ts`**
   - Add `.neq("purpose", "transaction")` to yield query

4. **`src/features/investor/yields/services/investorYieldHistoryService.ts`**
   - Add `.neq("purpose", "transaction")` to yield history query

5. **`src/services/investor/investorPortalService.ts`**
   - `getInvestorTransactionsList()`: Add `.neq("purpose", "transaction")` for yield-family types, or apply globally

No database migrations needed. No RPC changes needed.

