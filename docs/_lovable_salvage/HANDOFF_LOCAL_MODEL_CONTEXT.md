# Local Model Handoff — Complete Context Package

**For**: Nemotron / Ollama / Local LLM  
**Purpose**: Implement, test, and analyze the XRP fund lifecycle  
**Generated**: 2026-04-07

---

## What This Package Contains

### 1. Project Overview
- Full tech stack and architecture
- Database schema (critical tables)
- Key file paths
- Development environment

### 2. Fund Mapping (XRP Example)
- All 8 transactions with amounts
- Running balances
- Expected final state
- Edge cases (negative position)

### 3. Code Context
- Service layer patterns
- Type definitions
- API/RPC structures
- React hook patterns

### 4. Implementation Tasks
- Load test data
- Verify database state
- Test UI end-to-end
- Validate results

---

## Quick Start Prompt (Copy & Paste Below)

```
You are an expert full-stack developer for the Indigo Yield Platform.

CONTEXT:
- React 18 + TypeScript + Supabase + PostgreSQL
- Crypto yield/asset management platform
- 8 funds with investor positions and yield allocation

YOUR TASK:
Implement and test the XRP Fund lifecycle scenario:

SCENARIO:
- Fund: XRP Yield Fund (asset_code: XRP)
- Investor: Sam Johnson (fee: 16%, IB: Ryan Van Der Wall 4%)
- 8 transactions over 5 months:
  1. 2025-06-12: Sam deposits +135,003 XRP (running: 135,003)
  2. 2025-06-20: Sam deposits +49,000 XRP (running: 184,003)
  3. 2025-06-25: Sam deposits +45,000 XRP (running: 229,003)
  4. 2025-07-03: Sam deposits +49,500 XRP (running: 278,503)
  5. 2025-07-10: Sam deposits +50,100 XRP (running: 328,603)
  6. 2025-07-28: Sam withdraws -330,500.42 XRP (running: -1,897.42) ⚠️ NEGATIVE
  7. 2025-11-17: Sam deposits +135,003 XRP (running: 133,105.58) ✓
  8. 2025-11-25: Sam deposits +49,000 XRP (running: 182,105.58) ✓ FINAL

REQUIREMENTS:

1. DATABASE SETUP
   - Create fund: XRP Yield Fund
   - Create investor: Sam Johnson (fee_pct: 0.16, ib_parent_id: Ryan)
   - Create IB: Ryan Van Der Wall (ib_percentage: 0.04)
   - Create all 8 transactions in order

2. VERIFY DATABASE STATE
   - Query final balance: Should be 182,105.58 XRP
   - Check ledger_sync: All positions auto-calculated
   - Verify negative position: Allowed at transaction #6 (-1,897.42)
   - Confirm recovery: Subsequent deposits correct the position

3. TEST UI FLOW
   - Navigate to /admin/funds → XRP fund
   - View investor detail → Sam Johnson
   - Verify all 8 transactions display
   - Check running balance after each transaction
   - Confirm final balance: 182,105.58 XRP

4. VALIDATE EDGE CASES
   - Negative position (-1,897.42) displays correctly (not hidden/rejected)
   - Precision maintained to 8 decimals
   - Withdrawals after negative position work correctly
   - Fund AUM reconciles

DELIVERABLES:
1. SQL migration to load all 8 transactions
2. Database validation queries (showing state after each transaction)
3. Step-by-step UI test results
4. Documentation of any deviations from expected behavior

FILES AVAILABLE:
- FUND_MAPPING_SOURCE_OF_TRUTH.md - Complete transaction mapping
- UI_REPLAY_SCRIPT.md - Manual testing instructions
- fund_transactions_ledger.json - All 198 transactions
- EXCEL_TO_DATABASE_IMPLEMENTATION.md - Implementation guide

CONSTRAINTS:
- Preserve existing data (don't drop/truncate tables)
- Use proper references (foreign keys, lookups)
- Maintain audit trail via triggers
- No direct position mutations (use triggers only)

BEGIN IMPLEMENTATION.
```

---

## Complete Project Context

### Stack
```
Frontend:  React 18 + TypeScript + Vite + Tailwind CSS
Backend:   Supabase PostgreSQL + RPC procedures
Auth:      Supabase Auth + RBAC (super_admin > admin > ib > investor)
State:     React Query (TanStack Query)
```

### Key Directories
```
src/
  ├── services/
  │   ├── admin/yields/           ← Yield operations
  │   ├── shared/                 ← Auth, profiles, transactions
  │   └── investor/               ← Portfolio, statements
  ├── types/domains/              ← Type definitions
  ├── hooks/                       ← React Query hooks
  ├── pages/                       ← Routes
  └── contracts/                   ← Database enums, RPC signatures

supabase/
  ├── migrations/                  ← DDL scripts
  └── tests/                       ← Integration tests
```

### Critical Database Tables

```sql
-- Investors/Users
TABLE profiles (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE,
  name TEXT,
  account_type ENUM (investor, ib, fees_account, admin),
  fee_pct NUMERIC(28,10),         -- Management fee percentage
  ib_parent_id UUID,              -- Parent IB (for commission attribution)
  ib_percentage NUMERIC(28,10)    -- IB commission percentage
);

-- Funds
TABLE funds (
  id UUID PRIMARY KEY,
  asset_code TEXT (BTC, ETH, USDT, SOL, XRP, etc),
  fund_name TEXT,
  status ENUM (active, inactive),
  mgmt_fee_bps INT CHECK (mgmt_fee_bps = 0)  -- Management fee in basis points
);

-- Transactions (immutable ledger)
TABLE transactions_v2 (
  id UUID PRIMARY KEY,
  investor_id UUID → profiles.id,
  fund_id UUID → funds.id,
  amount NUMERIC(28,10),          -- Positive (deposit) or negative (withdrawal)
  tx_date DATE,
  tx_type ENUM (DEPOSIT, WITHDRAWAL, YIELD, FEE_CREDIT, IB_CREDIT),
  reference_id TEXT UNIQUE,       -- For idempotency
  is_voided BOOLEAN DEFAULT false,
  visibility_scope ENUM (investor_visible, admin_only),
  created_at TIMESTAMP
);

-- Positions (derived, auto-synced)
TABLE investor_positions (
  investor_id UUID → profiles.id,
  fund_id UUID → funds.id,
  current_value NUMERIC(28,10),   -- SUM(transactions) for this investor+fund
  cost_basis NUMERIC(28,10),
  shares NUMERIC(28,10),
  PRIMARY KEY (investor_id, fund_id)
  
  -- No id column! Composite PK only
  -- Auto-updated by trigger: trg_ledger_sync
);

-- Yield Events
TABLE yield_distributions (
  id UUID PRIMARY KEY,
  fund_id UUID → funds.id,
  distribution_date DATE,
  gross_yield NUMERIC(28,10),
  status ENUM (draft, applied, voided),
  created_at TIMESTAMP
);

-- Yield Breakdowns
TABLE yield_allocations (
  id UUID PRIMARY KEY,
  distribution_id UUID → yield_distributions.id,
  investor_id UUID → profiles.id,
  net_yield NUMERIC(28,10),       -- Investor receives this
  fee_amount NUMERIC(28,10),      -- Platform fee
  ib_amount NUMERIC(28,10),       -- IB commission
  UNIQUE (distribution_id, investor_id)
);
```

### Key RPC Procedures

```typescript
-- Apply yield distribution with allocation
apply_adb_yield_distribution_v3(
  p_fund_id UUID,
  p_new_aum NUMERIC,
  p_snapshot_date DATE,
  p_purpose TEXT ('reporting' | 'transaction')
) → {
  success: boolean,
  distribution_id: UUID,
  preview: boolean
}

-- Create transaction (with crystallization)
apply_transaction_with_crystallization(
  p_investor_id UUID,
  p_fund_id UUID,
  p_amount NUMERIC,
  p_tx_date DATE,
  p_tx_type TEXT,
  p_reference_id TEXT
) → {
  success: boolean,
  transaction_id: UUID,
  new_balance: NUMERIC
}

-- Reconciliation (read-only)
validate_aum_against_positions(
  p_fund_id UUID
) → {
  fund_aum: NUMERIC,
  sum_positions: NUMERIC,
  matches: boolean
}
```

### Key Triggers

```sql
-- Auto-sync: After INSERT/UPDATE on transactions_v2
trg_ledger_sync → UPDATE investor_positions.current_value = SUM(amount)

-- Audit trail
delta_audit_* → INSERT INTO audit_log (immutable record)

-- Protect key fields
protect_*_immutable → RAISE ERROR if trying to update frozen columns
```

---

## XRP Fund Scenario Details

### Investor Profile
```
Name: Sam Johnson
Email: sam.johnson@indigo.fund
Account Type: investor
Fee %: 0.16 (16% management fee)
IB Parent: Ryan Van Der Wall
IB Percentage: 0.04 (4% IB commission)
```

### IB Profile
```
Name: Ryan Van Der Wall
Email: ryan@indigo.fund
Account Type: ib
Fee %: 0 (no management fee on IB accounts)
IB Percentage: 0.04 (receives 4% of Sam's yields)
```

### Fund Profile
```
Asset Code: XRP
Fund Name: XRP Yield Fund
Status: active
Mgmt Fee BPS: 0 (fee applies per-investor, not fund-level)
```

### Transaction Sequence (as CSV)

```
TxDate,Investor,Asset,Amount,TxType,IB,Fee%,RunningBalance
2025-06-12,Sam Johnson,XRP,135003.00,DEPOSIT,Ryan Van Der Wall,0.16,135003.00
2025-06-20,Sam Johnson,XRP,49000.00,DEPOSIT,Ryan Van Der Wall,0.16,184003.00
2025-06-25,Sam Johnson,XRP,45000.00,DEPOSIT,Ryan Van Der Wall,0.16,229003.00
2025-07-03,Sam Johnson,XRP,49500.00,DEPOSIT,Ryan Van Der Wall,0.16,278503.00
2025-07-10,Sam Johnson,XRP,50100.00,DEPOSIT,Ryan Van Der Wall,0.16,328603.00
2025-07-28,Sam Johnson,XRP,-330500.42,WITHDRAWAL,Ryan Van Der Wall,0.16,-1897.42
2025-11-17,Sam Johnson,XRP,135003.00,DEPOSIT,Ryan Van Der Wall,0.16,133105.58
2025-11-25,Sam Johnson,XRP,49000.00,DEPOSIT,Ryan Van Der Wall,0.16,182105.58
```

### Verification Queries

```sql
-- After all 8 transactions loaded:

-- 1. Final position
SELECT current_value FROM investor_positions
WHERE investor_id = (SELECT id FROM profiles WHERE name = 'Sam Johnson')
  AND fund_id = (SELECT id FROM funds WHERE asset_code = 'XRP');
-- Expected: 182105.58

-- 2. Ledger reconciliation
SELECT 
  SUM(amount) as ledger_sum
FROM transactions_v2
WHERE investor_id = (SELECT id FROM profiles WHERE name = 'Sam Johnson')
  AND fund_id = (SELECT id FROM funds WHERE asset_code = 'XRP');
-- Expected: 182105.58 (should match position)

-- 3. Negative position check (at Tx #6)
SELECT 
  t.tx_date,
  SUM(t.amount) OVER (ORDER BY t.tx_date) as running_balance,
  t.amount,
  t.tx_type
FROM transactions_v2 t
WHERE investor_id = (SELECT id FROM profiles WHERE name = 'Sam Johnson')
  AND fund_id = (SELECT id FROM funds WHERE asset_code = 'XRP')
ORDER BY t.tx_date;
-- Expected: Row with -1897.42 on 2025-07-28

-- 4. Fund AUM
SELECT SUM(current_value) as fund_aum
FROM investor_positions
WHERE fund_id = (SELECT id FROM funds WHERE asset_code = 'XRP');
-- Expected: 182105.58 (only Sam in XRP fund)
```

---

## UI Test Flow

### Step 1: Login
```
URL: http://localhost:5173/
Email: qa.admin@indigo.fund
Password: QaTest2026!
Navigate to: /admin
```

### Step 2: Find XRP Fund
```
URL: http://localhost:5173/admin/funds
Look for: "XRP" asset
Expected: AUM = 182,105.58 XRP, Investors = 1
```

### Step 3: View Sam Johnson
```
Click on XRP fund → View Investors
Select: Sam Johnson
Expected: 
  - Account type: investor
  - Fee: 16%
  - IB: Ryan Van Der Wall
  - Current balance: 182,105.58 XRP
```

### Step 4: Verify Transaction History
```
In Sam's detail page, view all transactions:

Tx #1 (2025-06-12): +135,003.00 → Balance: 135,003.00 ✓
Tx #2 (2025-06-20): +49,000.00  → Balance: 184,003.00 ✓
Tx #3 (2025-06-25): +45,000.00  → Balance: 229,003.00 ✓
Tx #4 (2025-07-03): +49,500.00  → Balance: 278,503.00 ✓
Tx #5 (2025-07-10): +50,100.00  → Balance: 328,603.00 ✓
Tx #6 (2025-07-28): -330,500.42 → Balance: -1,897.42 ⚠️ (NEGATIVE, should display)
Tx #7 (2025-11-17): +135,003.00 → Balance: 133,105.58 ✓
Tx #8 (2025-11-25): +49,000.00  → Balance: 182,105.58 ✓ FINAL
```

### Step 5: Verify Edge Case
```
Check that:
- Negative position (-1,897.42) displays (not hidden)
- No error messages for negative position
- Subsequent deposits add correctly
- Final balance is 182,105.58
```

---

## Expected Outcomes

### Database State
✅ All 8 transactions loaded
✅ Sam Johnson position: 182,105.58 XRP
✅ Negative position record exists: -1,897.42 XRP (at Tx #6)
✅ Ledger reconciliation: position = SUM(transactions)

### UI Display
✅ XRP fund appears in fund list
✅ Sam Johnson appears as investor
✅ All 8 transactions visible
✅ Running balances correct after each transaction
✅ Final balance matches database
✅ Fee/IB attribution visible
✅ Negative position doesn't cause UI errors

### No Deviations
If any of above fails → Document exactly what differs and why

---

## Files Provided

All files are in: `/Users/mama/Downloads/indigo-yield-platform-v01-main/`

1. **FUND_MAPPING_SOURCE_OF_TRUTH.md** - Complete fund inventory
2. **UI_REPLAY_SCRIPT.md** - Step-by-step testing guide
3. **EXCEL_TO_DATABASE_IMPLEMENTATION.md** - SQL/DB guide
4. **fund_transactions_ledger.json** - All 198 transactions
5. **fund_transactions_ledger.csv** - CSV format
6. **CLAUDE.md** - Project conventions and architecture
7. **README_EXCEL_MAPPING.md** - Package overview

---

## What You're Testing

**The mapping is correct if**:
1. All 8 transactions load without errors
2. Running balances match Excel exactly
3. Final position = 182,105.58 XRP
4. Negative position (-1,897.42) displays correctly
5. UI shows all transactions in order
6. No precision loss or rounding errors

**The mapping is wrong if**:
- Balances differ by more than 0.00000001 XRP
- Negative position is hidden or causes error
- Transactions appear out of order
- Fee/IB attribution is missing
- UI doesn't match database state

---

## Handoff Complete

You now have:
✅ Full project context
✅ Database schema
✅ XRP scenario details
✅ Verification queries
✅ UI test flow
✅ Expected outcomes
✅ Reference documents

**Copy the prompt above and paste into your local model.**

---

**Handoff Date**: 2026-04-07  
**Status**: READY FOR LOCAL MODEL IMPLEMENTATION
