# Expert Handoff Prompt: Indigo Yield Platform Launch (Tomorrow)

**Status**: LAUNCH READINESS ANALYSIS COMPLETE  
**Date**: 2026-04-07  
**Remaining Work**: 1-2 days (backend schema + integration tests)  
**Critical Path**: Fee template persistence + yield allocation verification

---

## MISSION (Read First)

You are taking over the Indigo Yield platform launch. **The core issue**: Excel and code have different yield allocation methods.

- **Excel uses**: Simple percentage split (IB%, Fees%, Investor%)
- **Code uses**: ADB time-weighting (Average Daily Balance per investor)
- **Result**: Same yield, different distributions

**Your job**: Confirm which method is correct, implement it, add tests, and launch tomorrow.

---

## SYSTEM OVERVIEW

### What This System Does
1. **Investors deposit** crypto into yield funds (e.g., 135,003 XRP on 17/11/2025)
2. **Transaction recorded** in `transactions_v2` table with investor name, amount, date, fee structure
3. **Month-end AUM snapshot** recorded (e.g., 184,358 XRP on 30/11/2025)
4. **Yield calculated** as: AUM - sum of all transactions = 355 XRP
5. **Yield allocated** to three recipients:
   - **Investor**: Gets 80% of yield (hardcoded or per-investor?)
   - **Intro Broker (IB)**: Gets 4% of yield (if specified in transaction)
   - **INDIGO Fees**: Gets 16% of yield (management fee)
6. **Fund state updated**: Each recipient's cumulative balance increases

### Real Example (XRP Fund)
```
Sam Johnson deposits:  +135,003 XRP (17/11/2025, IB=Ryan 4%, Fees=16%)
Sam Johnson deposits:  +49,000 XRP (25/11/2025, no fees)
Month-end AUM:        184,358 XRP (30/11/2025)

Yield = 184,358 - 184,003 = 355 XRP

Allocation:
  Sam (Investor 80%):   284 XRP
  Ryan (IB 4%):         14.20 XRP
  INDIGO (16%):         56.80 XRP
  ─────────────────
  Total:                355 XRP ✓

Fund State (30/11):
  Sam:     184,003 + 284 = 184,287 XRP
  Ryan:    0 + 14.20 = 14.20 XRP
  INDIGO:  0 + 56.80 = 56.80 XRP
```

---

## CRITICAL FINDINGS

### Finding 1: Two Different Allocation Methods (BLOCKER)
**Problem**: Code and Excel disagree on how yield is split.

**Excel Method** (Simple Percentage):
```
Yield_to_IB = Total_Yield × 4%
Yield_to_Investor = Total_Yield × 80%
Yield_to_Fees = Total_Yield × 16%
```

**Code Method** (ADB Time-Weighting):
```
Investor_ADB = sum(daily_balance × days_held)  // Time-weighted
Investor_yield = (Investor_ADB / Total_ADB) × Total_Yield
```

**Impact**: If investor A deposits on day 1 and investor B deposits on day 29:
- Excel: Both get 80% of total yield (split equally if same fund)
- Code: Investor A gets ~80% of 29/30 days = ~77%, Investor B gets ~80% of 1/30 days = ~2.7%

**Decision Required**: Which is correct? (Likely ADB is correct for yield funds, but Excel doesn't show it)

### Finding 2: Fee Template Not Persisted (CRITICAL)
**Problem**: Excel rule: "Fee structure from FIRST transaction applies to all yield"  
**Code**: No database table storing this. Manual workaround only.

**Current State**: 
```
Transaction 1: Fee=16%, IB=4% → Template set
Transaction 2: Fee=0%, IB=0% → Should IGNORE and use template from T1
```

**Missing**: `fund_fee_templates` table
```sql
CREATE TABLE fund_fee_templates (
  id UUID PRIMARY KEY,
  fund_id UUID UNIQUE NOT NULL,
  ib_percent NUMERIC(28,10) NOT NULL,
  fees_percent NUMERIC(28,10) NOT NULL,
  investor_percent NUMERIC(28,10) NOT NULL,
  effective_from TIMESTAMP NOT NULL
);
```

**Required Before Launch**: 
- [ ] Create table + migration
- [ ] Update RPC `apply_adb_yield_distribution_v3` to read from this table
- [ ] Add UI form to set/edit fee template
- [ ] Backfill existing funds from transaction history

### Finding 3: Crystallization Timing Unclear (CRITICAL)
**Problem**: When is yield automatically crystallized?

**Options**:
- A) Before every deposit (user must wait for yield crystallization)
- B) Only on month-end reporting (ongoing accrual until period-end)
- C) On-demand via admin button

**Code supports**: All three (RPC `crystallize_yield_before_flow` exists)  
**Excel shows**: Not specified  
**Decision Required**: Which triggers automatic crystallization?

### Finding 4: IB Allocation Not Tested (RISK)
**Problem**: Zero automated tests for IB commission logic.

**Current Code**: Uses `profiles.ib_parent_id` + `ib_commission_schedule` table  
**Risk**: Edge cases around multi-IB scenarios untested  
**Required**: Add 5+ test scenarios before launch

### Finding 5: Fund-Level vs. Investor-Level Fee Structure (AMBIGUITY)
**Excel shows**: One fee template per fund (4% IB, 16% Fees applies to all investors)  
**Code allows**: Per-investor fee percentages via `ib_commission_schedule`

**Reconciliation**: Must confirm if fees are fund-level or investor-level.

---

## CODEBASE STRUCTURE (File Paths)

### Type Definitions
```
/src/types/domains/
├── fund.ts              (Fund, FundPerformance)
├── transaction.ts       (Transaction, TransactionWithFund)
├── yield.ts             (YieldDistribution, YieldCalculationResult)
├── yieldDistribution.ts (Historical yield records)
├── feeAllocation.ts     (Fee credit breakdown)
├── ibAllocation.ts      (IB commission breakdown)
└── enums.ts             (TransactionType, AccountType)
```

### Database Procedures (Critical)
```
Supabase RPC Functions:
├── apply_transaction_with_crystallization(investor_id, fund_id, type, amount, asset, tx_date)
│   └─ Writes: transactions_v2, investor_positions
│   └─ Auto-triggers: crystallize_yield_before_flow if configured
│
├── apply_adb_yield_distribution_v3(fund_id, new_aum, snapshot_date, purpose)
│   └─ Reads: transactions_v2 (get baseline), ib_commission_schedule
│   └─ Writes: yield_distributions, yield_allocations, fee_allocations, ib_allocations, transactions_v2
│   └─ Returns: YieldCalculationResult with conservation_check flag
│
├── preview_adb_yield_distribution_v3(same params)
│   └─ Read-only version of apply_adb
│
└── crystallize_yield_before_flow(investor_id, fund_id)
    └─ Auto-distribute accrued yield before investor withdrawal
```

### Services
```
/src/services/admin/yields/
├── yieldApplyService.ts              (Call apply_adb_yield_distribution_v3)
├── yieldPreviewService.ts            (Call preview_adb_yield_distribution_v3)
├── yieldCrystallizationService.ts    (Call crystallize_yield_before_flow)
├── yieldManagementService.ts         (Void/restore yields)
└── yieldHistoryService.ts            (Fetch historical yields)

/src/services/admin/
├── transactionDetailsService.ts      (Get transactions with investor/fund joins)
└── feesService.ts                    (Fee revenue tracking)

/src/services/investor/
└── transactionsV2Service.ts          (Investor ledger queries)
```

### UI Components
```
/src/features/admin/
├── transactions/
│   ├── AddTransactionDialog.tsx       (Create DEPOSIT/WITHDRAWAL)
│   └── pages/AdminTransactionsPage.tsx
├── yields/
│   ├── pages/AdminYieldOpsPage.tsx    (Month-end yield entry)
│   ├── pages/AdminYieldDistributionsPage.tsx (Preview/apply yields)
│   └── components/YieldPreviewTable.tsx
└── fees/
    ├── pages/FeesOverviewPage.tsx
    ├── components/FeeAllocationAuditTable.tsx
    └── components/YieldEarnedTab.tsx

/src/features/investor/
├── portfolio/pages/PortfolioPage.tsx  (Fund balances)
└── yield-history/YieldHistoryPage.tsx (Investor yield events)
```

### Database Tables (Key)
```
transactions_v2
├── id (UUID)
├── investor_id (UUID)
├── fund_id (UUID)
├── type (ENUM: DEPOSIT, WITHDRAWAL, YIELD, FEE_CREDIT, IB_CREDIT, ADJUSTMENT)
├── amount (NUMERIC 28,10)
├── tx_date (DATE)
├── reference_id (UNIQUE, for idempotency)
└── visibility_scope (investor_visible | admin_only)

investor_positions (derived, auto-synced via trigger)
├── investor_id (UUID)
├── fund_id (UUID)
├── balance (NUMERIC 28,10)
└── last_updated (TIMESTAMP)

yield_distributions
├── id (UUID)
├── fund_id (UUID)
├── snapshot_date (DATE)
├── gross_yield (NUMERIC 28,10)
├── total_fees (NUMERIC 28,10)
├── total_ib (NUMERIC 28,10)
└── is_voided (BOOLEAN)

yield_allocations
├── distribution_id (FK)
├── investor_id (UUID)
├── allocation_amount (NUMERIC 28,10)
└── allocation_type (ENUM: investor | ib | fees)

ib_allocations
├── ib_investor_id (UUID)
├── source_investor_id (UUID)
├── ib_amount (NUMERIC 28,10)
└── is_voided (BOOLEAN)

fee_allocations
├── fees_account_id (UUID)  // INDIGO fees account
├── source_investor_id (UUID)
├── fee_amount (NUMERIC 28,10)
└── is_voided (BOOLEAN)
```

---

## DECISIONS REQUIRED (Before Writing Code)

### Decision 1: ADB vs. Percentage Split
**Question**: Is yield allocated by (A) simple percentage or (B) time-weighted ADB?

**Option A - Simple Percentage**:
- Pro: Matches Excel exactly
- Con: Unfair to investors who deposit late (they get same % yield)
- Code change: Simplify `apply_adb_yield_distribution_v3` RPC (remove ADB logic)

**Option B - Time-Weighted ADB**:
- Pro: Fair (reward early investors more)
- Con: Requires explaining to investors why deposit date matters
- Code change: Document ADB formula; update tests

**Recommended**: Option B (ADB is industry standard), but confirm with business.

### Decision 2: Fund-Level Fee Structure
**Question**: Are fees fund-wide (same for all investors) or per-investor?

**Option A - Fund-Level** (Excel model):
- All investors in XRP fund pay 16% fees regardless of their fee structure
- Simple, auditable
- Code change: Create `fund_fee_templates` table, validate transaction fees match template

**Option B - Per-Investor** (Current code):
- Different investors in same fund can have different fees
- Flexible but complex
- Code change: Document fee hierarchy in code

**Recommended**: Option A (simpler, matches Excel). Implement `fund_fee_templates` table.

### Decision 3: Crystallization Trigger
**Question**: When does yield automatically crystallize?

**Option A - Before Every Deposit**:
- Investor must wait while yield settles
- Ensures clean fund state
- Longer transaction time

**Option B - Monthly (Month-End)**:
- Yield accrues; investor can see pending amount
- Matches Excel's month-end reporting
- Investor has floating gains until month-end

**Option C - On-Demand Admin Button**:
- No automation; admin controls timing
- Most control, most manual work

**Recommended**: Option B (matches Excel month-end pattern). Schedule daily auto-crystallization (e.g., 23:59 UTC on last day of month).

### Decision 4: IB Attribution
**Question**: Can an investor have multiple IBs, or one IB per investor?

**Excel shows**: One IB per transaction (4% goes to Ryan)  
**Code supports**: Multi-IB via `ib_commission_schedule` table

**Recommended**: One IB per investor (simpler). Update code to enforce uniqueness: `UNIQUE(investor_id, fund_id)` on IB assignments.

---

## LAUNCH CHECKLIST (Priority Order)

### PHASE 1: Decisions & Schema (4 hours)
- [ ] **Decide**: ADB vs. percentage (confirm with business owner)
- [ ] **Decide**: Fund-level vs. per-investor fees (likely fund-level)
- [ ] **Decide**: Crystallization trigger timing (likely monthly)
- [ ] **Decide**: IB attribution rules (likely one per investor)
- [ ] **Create**: `fund_fee_templates` migration + table
- [ ] **Create**: `TRANSACTION_YIELD_SCHEMA.md` (already exists, verify accuracy)
- [ ] **Create**: Test fixtures matching schema (Python + TypeScript)

### PHASE 2: Backend Integration (6 hours)
- [ ] **Update RPC**: `apply_adb_yield_distribution_v3` to read from `fund_fee_templates`
- [ ] **Add migration**: Backfill `fund_fee_templates` from existing transactions
- [ ] **Update types**: Ensure `FeeTemplate` persists correctly
- [ ] **Add validation**: Transaction fee % must match fund template (or error)
- [ ] **Add tests**: Yield allocation with fee template (5+ scenarios)
- [ ] **Add tests**: IB allocation scenarios (5+ scenarios)
- [ ] **Add tests**: Multi-transaction fund state (XRP example from Excel)

### PHASE 3: UI Integration (3 hours)
- [ ] **Add validation**: Zod schema for `YieldDistribution` payload
- [ ] **Add test data**: Extend fixtures with full `YieldDistribution` examples
- [ ] **Add reconciliation view**: Display `gross = net + fees + ib` check
- [ ] **Test flow**: Transaction creation → yield recording → state verification
- [ ] **Test UI**: Fund snapshot card displays correct AUM

### PHASE 4: End-to-End Testing (3 hours)
- [ ] **Run XRP example**: Sam +135K, +49K → yield 355 XRP (expected: 284/14.20/56.80)
- [ ] **Run SOL example**: INDIGO +1250, Paul +234.17 → yield 15.83 (expected: see results)
- [ ] **Run integration test**: Deposit → yield crystallization → investor statement
- [ ] **Run rollback test**: Void yield distribution → verify ledger reconciles
- [ ] **Load test**: 1000 yield distributions, verify performance

### PHASE 5: Launch (1 hour)
- [ ] **Deploy migration**: `fund_fee_templates` table
- [ ] **Deploy code**: Updated RPC + services
- [ ] **Backfill data**: Set fee templates for all existing funds
- [ ] **Verify**: Production data (reconciliation views show zero errors)
- [ ] **Go live**: Open to investors

---

## KEY FILES TO MODIFY

### 1. New Files (Create)
```
supabase/migrations/20260407_create_fund_fee_templates.sql
src/types/domains/fundFeeTemplate.ts
src/lib/validation/yieldSchema.ts
src/services/admin/yields/fundFeeTemplateService.ts
tests/integration/yieldAllocation.test.ts
tests/integration/ibAllocation.test.ts
```

### 2. Modify Existing RPC
```
supabase/migrations/20260407_update_apply_adb_yield_v3.sql
(Add fund_fee_templates read, validate transaction fees match template)
```

### 3. Update Services
```
/src/services/admin/yields/yieldApplyService.ts
(Add fee template validation before RPC call)

/src/services/admin/transactionDetailsService.ts
(Add fund fee template to transaction response)
```

### 4. Update UI
```
/src/features/admin/yields/pages/AdminYieldOpsPage.tsx
(Add fee template display/edit)

/src/lib/validation/yieldSchema.ts
(Add Zod validation for yield payloads)

/tests/fixtures/yieldTestData.ts
(Extend with complete examples)
```

---

## REAL DATA EXAMPLES (Verify Code Against These)

### Example 1: XRP Fund (Sam Johnson)
```
Fund: XRP Yield Fund
Asset: XRP

Transaction 1 (17/11/2025):
  Investor: Sam Johnson
  Amount: 135,003 XRP
  IB: Ryan Van Der Wall (4%)
  Fee: 16%
  Investor share: 80%

Transaction 2 (25/11/2025):
  Investor: Sam Johnson
  Amount: 49,000 XRP
  (no IB/Fee specified; inherits 4%/16%/80%)

Yield Record (30/11/2025):
  Total AUM: 184,358 XRP
  Prior baseline: 184,003 XRP
  Yield: 355 XRP

EXPECTED Allocation:
  Sam Johnson (80%):      284 XRP
  Ryan Van Der Wall (4%): 14.20 XRP
  INDIGO Fees (16%):      56.80 XRP

Fund State (30/11):
  Sam:     184,287 XRP  (184,003 + 284)
  Ryan:    14.20 XRP    (0 + 14.20)
  INDIGO:  56.80 XRP    (0 + 56.80)
  Total:   184,358 XRP  ✓ RECONCILES
```

### Example 2: SOL Fund (Paul Johnson)
```
Fund: SOL Yield Fund
Asset: SOL

Transaction 1 (02/09/2025):
  Investor: INDIGO LP
  Amount: 1,250 SOL
  Fee: 0% (no fee template yet)

Transaction 2 (10/09/2025):
  Investor: Paul Johnson
  Amount: 234.17 SOL
  IB: Alex Jacobs (4%)
  Fee: 16%
  (THIS SETS THE FEE TEMPLATE FOR FUND)

Yield Record (30/09/2025):
  Total AUM: 1,500 SOL
  Prior baseline: 1,484.17 SOL
  Yield: 15.83 SOL

EXPECTED Allocation (Using 4%/16%/80% template from Transaction 2):
  INDIGO LP (80%):   12.664 SOL
  Paul Johnson (80%): ~1.2 SOL  (his share of 80%)
  Alex Jacobs (4%):  0.633 SOL
  INDIGO Fees (16%): 2.528 SOL

NOTE: Both INDIGO LP and Paul get 80% of their respective yields
This is where Excel gets tricky—need to clarify if they split the 80% or each get 80%
```

---

## TESTING STRATEGY (Minimum Required)

### Unit Tests (5 scenarios)
```typescript
describe('YieldAllocation', () => {
  test('Simple: Single investor, no IB', () => {
    // Investor deposits 1000, AUM becomes 1100, yield=100
    // Expected: investor gets 80, INDIGO gets 20
  });
  
  test('With IB: Investor + IB commission', () => {
    // Sam deposits 135003 (IB=Ryan 4%, Fee=16%)
    // AUM=184358, yield=355
    // Expected: Sam=284, Ryan=14.20, INDIGO=56.80
  });
  
  test('Multiple investors: Different deposit dates', () => {
    // Alice deposits day 1, Bob deposits day 15
    // Verify time-weighted ADB calculation (if applicable)
  });
  
  test('Fee template inheritance: Second transaction inherits first', () => {
    // T1: Fee=16%, IB=4%
    // T2: Fee=0% (should be ignored, inherit from T1)
  });
  
  test('Void yield: Reverse all allocations', () => {
    // Apply yield, then void it
    // Verify balances return to pre-yield state
  });
});
```

### Integration Tests (3 scenarios)
```typescript
describe('YieldAllocation Integration', () => {
  test('XRP Fund: Full lifecycle (Excel example)', () => {
    // Create transactions, record AUM, apply yield
    // Verify final state matches Excel
  });
  
  test('Rollback: Void distribution reconciles ledger', () => {
    // Apply yield, then void
    // Verify sum(balances) == AUM
  });
  
  test('Multiple funds: Fee templates isolated', () => {
    // Two funds with different fee structures
    // Verify no cross-fund contamination
  });
});
```

### E2E Tests (1 flow)
```
Admin: Create transaction (Sam +135K XRP, IB=Ryan 4%, Fee=16%)
Admin: Create transaction (Sam +49K XRP)
Admin: Record AUM (184,358 XRP)
Admin: Preview yield → verify amounts match Excel
Admin: Apply yield → verify state update
Investor (Sam): Check statement → verify 184,287 balance
Investor (Ryan): Check statement → verify 14.20 balance
Admin: Check fees account → verify 56.80 balance
```

---

## CRITICAL QUESTIONS (Ask Before Proceeding)

1. **Is yield allocated by simple percentage or ADB time-weighting?**
   - Excel shows simple %; code uses ADB
   - Which is the source of truth?

2. **Can fees vary by investor within a fund, or are all investors in a fund subject to same fee?**
   - Currently code allows per-investor; Excel shows fund-level
   - Which is correct?

3. **When is yield crystallized?**
   - Options: (A) before every deposit, (B) monthly, (C) on-demand
   - What's the business requirement?

4. **Is the INDIGO LP investor special (0% fees)?**
   - SOL example shows INDIGO LP with 0% fees
   - Do all institutional investors get 0% fees?

5. **Do we need tax loss harvesting / carried loss tracking?**
   - Code has `carriedLoss` field; Excel doesn't mention it
   - Is this in scope for launch?

---

## REFERENCES

- **TRANSACTION_YIELD_SCHEMA.md** — Business logic (created 2026-04-07)
- **transaction_yield.types.ts** — TypeScript contracts
- **transaction_yield.py** — Python Pydantic models
- **test-transaction-yield.example.ts** — Test scenarios
- **Accounting Yield Funds (6).xlsx** — Source of truth (all 12 sheets)

---

## HANDOFF STATUS

**Completed**:
- ✅ Reverse-engineered Excel transaction-yield logic
- ✅ Identified code-Excel mismatches
- ✅ Created schema documentation
- ✅ Created TypeScript + Python type contracts
- ✅ Analyzed codebase (90K tokens)
- ✅ Created UI readiness assessment
- ✅ Listed all critical gaps

**Remaining** (for you):
- Make 4 critical decisions (ADB, fee structure, crystallization, IB attribution)
- Create `fund_fee_templates` migration
- Update RPC to validate fee template
- Add integration tests (5+ scenarios)
- Backfill production data
- Launch

**Time Estimate**: 12-16 hours (launch tomorrow feasible if decisions made in next 2 hours)

---

## GO-LIVE CRITERIA

✅ **All Systems Go IF**:
1. Fee template decision made + `fund_fee_templates` table deployed
2. ADB vs. percentage decision made + RPC updated
3. XRP and SOL examples verified (fund state reconciles)
4. IB allocation tested (5+ scenarios pass)
5. Void yield tested (ledger reconciles after reversal)
6. Production backfill completed (all funds have fee templates)

**Launch**: Push to production when all ✅

---

**Last Updated**: 2026-04-07 @ Claude Opus  
**Next Steps**: Review decisions, create migration, run tests, deploy.
