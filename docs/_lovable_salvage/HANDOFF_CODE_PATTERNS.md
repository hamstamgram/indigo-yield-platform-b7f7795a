# Local Model Handoff — Code Patterns & Examples

## Service Layer Pattern (Gateway)

### Transaction Service
```typescript
// src/services/admin/yields/transactionService.ts

import { supabase } from "@/lib/supabase/client";
import { callRPC } from "@/lib/supabase/typedRPC";

interface CreateTransactionInput {
  investorId: string;
  fundId: string;
  amount: string; // Use string, not number
  txDate: string; // ISO date: 2025-06-12
  txType: "DEPOSIT" | "WITHDRAWAL" | "YIELD" | "FEE_CREDIT" | "IB_CREDIT";
  referenceId: string; // For idempotency
}

export async function createTransaction(
  input: CreateTransactionInput
): Promise<{ success: boolean; transactionId: string; newBalance: string }> {
  const { data, error } = await callRPC("apply_transaction_with_crystallization", {
    p_investor_id: input.investorId,
    p_fund_id: input.fundId,
    p_amount: input.amount,
    p_tx_date: input.txDate,
    p_tx_type: input.txType,
    p_reference_id: input.referenceId,
  });

  if (error) {
    throw new Error(`Transaction failed: ${error.message}`);
  }

  return {
    success: data.success,
    transactionId: data.transaction_id,
    newBalance: data.new_balance,
  };
}

// Verification query
export async function getInvestorBalance(
  investorId: string,
  fundId: string
): Promise<string> {
  const { data, error } = await supabase
    .from("investor_positions")
    .select("current_value")
    .eq("investor_id", investorId)
    .eq("fund_id", fundId)
    .single();

  if (error) {
    throw new Error(`Position lookup failed: ${error.message}`);
  }

  return data.current_value;
}

// Ledger reconciliation
export async function getTransactionSum(
  investorId: string,
  fundId: string
): Promise<string> {
  const { data, error } = await supabase.rpc("get_ledger_sum_for_investor", {
    p_investor_id: investorId,
    p_fund_id: fundId,
  });

  if (error) {
    throw new Error(`Ledger sum failed: ${error.message}`);
  }

  return data.sum;
}
```

### Profile Service
```typescript
// src/services/shared/profileService.ts

export async function getOrCreateProfile(
  email: string,
  name: string,
  accountType: "investor" | "ib" | "admin" | "fees_account",
  options?: {
    feePct?: number;
    ibParentId?: string;
    ibPercentage?: number;
  }
) {
  // First, check if profile exists
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .single();

  if (existing) {
    return existing.id;
  }

  // Create new profile
  const { data, error } = await supabase
    .from("profiles")
    .insert({
      email,
      name,
      account_type: accountType,
      fee_pct: options?.feePct || 0,
      ib_parent_id: options?.ibParentId || null,
      ib_percentage: options?.ibPercentage || 0,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Profile creation failed: ${error.message}`);
  }

  return data.id;
}
```

### Fund Service
```typescript
// src/services/shared/fundService.ts

export async function getOrCreateFund(
  assetCode: string,
  fundName: string
) {
  // Check if exists
  const { data: existing } = await supabase
    .from("funds")
    .select("id")
    .eq("asset_code", assetCode)
    .single();

  if (existing) {
    return existing.id;
  }

  // Create new fund
  const { data, error } = await supabase
    .from("funds")
    .insert({
      asset_code: assetCode,
      fund_name: fundName,
      status: "active",
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Fund creation failed: ${error.message}`);
  }

  return data.id;
}

// Get fund with AUM
export async function getFundWithAUM(fundId: string) {
  const { data, error } = await supabase.rpc("get_funds_with_aum", {
    p_fund_id: fundId,
  });

  if (error) {
    throw new Error(`Fund lookup failed: ${error.message}`);
  }

  return data[0];
}
```

---

## React Hook Pattern

```typescript
// src/hooks/data/admin/useTransactions.ts

import { useQuery } from "@tanstack/react-query";
import { getTransactionHistory } from "@/services/admin/transactionService";

export function useTransactionHistory(investorId: string, fundId: string) {
  return useQuery({
    queryKey: ["transactions", investorId, fundId],
    queryFn: () => getTransactionHistory(investorId, fundId),
    staleTime: 5 * 60 * 1000, // 5 min
    gcTime: 10 * 60 * 1000, // 10 min
  });
}

// Usage in component
export function InvestorTransactionList({ investorId, fundId }) {
  const { data: transactions, isLoading, error } = useTransactionHistory(investorId, fundId);

  if (isLoading) return <Spinner />;
  if (error) return <Error message={error.message} />;

  return (
    <table>
      <tbody>
        {transactions.map((tx) => (
          <tr key={tx.id}>
            <td>{tx.tx_date}</td>
            <td>{tx.amount}</td>
            <td>{tx.tx_type}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

---

## Type Definitions

```typescript
// src/types/domains/transaction.ts

export interface Transaction {
  id: string;
  investor_id: string;
  fund_id: string;
  amount: string; // ALWAYS string, use Decimal.js for calculations
  tx_date: string; // ISO: 2025-06-12
  tx_type: TxType;
  reference_id: string;
  is_voided: boolean;
  visibility_scope: VisibilityScope;
  created_at: string;
  asset?: string; // Denormalized for display
}

export type TxType =
  | "DEPOSIT"
  | "WITHDRAWAL"
  | "YIELD"
  | "FEE_CREDIT"
  | "IB_CREDIT"
  | "ADJUSTMENT";

export type VisibilityScope = "investor_visible" | "admin_only";

// src/types/domains/profile.ts

export interface Profile {
  id: string;
  email: string;
  name: string;
  account_type: AccountType;
  fee_pct: number; // 0.16 = 16%
  ib_parent_id: string | null;
  ib_percentage: number; // 0.04 = 4%
  created_at: string;
}

export type AccountType = "investor" | "ib" | "admin" | "fees_account";

// src/types/domains/position.ts

export interface InvestorPosition {
  investor_id: string;
  fund_id: string;
  current_value: string; // SUM(transactions) for this investor+fund
  cost_basis: string;
  shares: string;
}

// src/types/domains/fund.ts

export interface Fund {
  id: string;
  asset_code: string; // XRP, BTC, ETH, USDT, SOL
  fund_name: string;
  status: "active" | "inactive" | "suspended";
  mgmt_fee_bps: number; // Always 0
}
```

---

## SQL Patterns

### Create Test Data

```sql
-- 1. Create profiles
INSERT INTO profiles (id, email, name, account_type, fee_pct, ib_parent_id, ib_percentage)
VALUES 
  -- Investor
  (gen_random_uuid(), 'sam.johnson@indigo.fund', 'Sam Johnson', 'investor', 0.16, 
   (SELECT id FROM profiles WHERE name = 'Ryan Van Der Wall' LIMIT 1), NULL),
  
  -- IB
  (gen_random_uuid(), 'ryan@indigo.fund', 'Ryan Van Der Wall', 'ib', 0, NULL, 0.04);

-- 2. Get IDs
SELECT id, name, account_type FROM profiles WHERE name IN ('Sam Johnson', 'Ryan Van Der Wall');

-- 3. Create fund
INSERT INTO funds (id, asset_code, fund_name, status)
VALUES (gen_random_uuid(), 'XRP', 'XRP Yield Fund', 'active');

SELECT id, asset_code FROM funds WHERE asset_code = 'XRP';

-- 4. Load transactions (in date order)
INSERT INTO transactions_v2 
  (id, investor_id, fund_id, amount, tx_date, tx_type, reference_id, visibility_scope, created_at)
VALUES
  (gen_random_uuid(), 'sam-id', 'xrp-fund-id', 135003.00, '2025-06-12', 'DEPOSIT', 'xrp-sam-135003-2025-06-12', 'investor_visible', NOW()),
  (gen_random_uuid(), 'sam-id', 'xrp-fund-id', 49000.00, '2025-06-20', 'DEPOSIT', 'xrp-sam-49000-2025-06-20', 'investor_visible', NOW()),
  (gen_random_uuid(), 'sam-id', 'xrp-fund-id', 45000.00, '2025-06-25', 'DEPOSIT', 'xrp-sam-45000-2025-06-25', 'investor_visible', NOW()),
  (gen_random_uuid(), 'sam-id', 'xrp-fund-id', 49500.00, '2025-07-03', 'DEPOSIT', 'xrp-sam-49500-2025-07-03', 'investor_visible', NOW()),
  (gen_random_uuid(), 'sam-id', 'xrp-fund-id', 50100.00, '2025-07-10', 'DEPOSIT', 'xrp-sam-50100-2025-07-10', 'investor_visible', NOW()),
  (gen_random_uuid(), 'sam-id', 'xrp-fund-id', -330500.42, '2025-07-28', 'WITHDRAWAL', 'xrp-sam-330500.42-2025-07-28', 'investor_visible', NOW()),
  (gen_random_uuid(), 'sam-id', 'xrp-fund-id', 135003.00, '2025-11-17', 'DEPOSIT', 'xrp-sam-135003-2025-11-17', 'investor_visible', NOW()),
  (gen_random_uuid(), 'sam-id', 'xrp-fund-id', 49000.00, '2025-11-25', 'DEPOSIT', 'xrp-sam-49000-2025-11-25', 'investor_visible', NOW());
```

### Verify State

```sql
-- Check final position
SELECT current_value FROM investor_positions
WHERE investor_id = (SELECT id FROM profiles WHERE name = 'Sam Johnson')
  AND fund_id = (SELECT id FROM funds WHERE asset_code = 'XRP');
-- Expected: 182105.58

-- Check ledger reconciliation
SELECT 
  'Position' as record_type,
  ip.current_value,
  'vs' as compare,
  'Ledger Sum' as record_type2,
  SUM(t.amount) as ledger_sum,
  'Match' as status
FROM investor_positions ip
LEFT JOIN transactions_v2 t ON (
  ip.investor_id = t.investor_id 
  AND ip.fund_id = t.fund_id
)
WHERE ip.investor_id = (SELECT id FROM profiles WHERE name = 'Sam Johnson')
  AND ip.fund_id = (SELECT id FROM funds WHERE asset_code = 'XRP')
GROUP BY ip.current_value;
-- Expected: 182105.58 = 182105.58

-- Check running balance at each step
WITH running_balance AS (
  SELECT 
    tx_date,
    amount,
    tx_type,
    SUM(amount) OVER (ORDER BY tx_date) as balance
  FROM transactions_v2
  WHERE investor_id = (SELECT id FROM profiles WHERE name = 'Sam Johnson')
    AND fund_id = (SELECT id FROM funds WHERE asset_code = 'XRP')
  ORDER BY tx_date
)
SELECT 
  tx_date,
  amount,
  balance,
  CASE 
    WHEN balance < 0 THEN '⚠️ NEGATIVE'
    ELSE '✓ POSITIVE'
  END as status
FROM running_balance;
/* Expected:
  2025-06-12   135003.00   135003.00   ✓ POSITIVE
  2025-06-20    49000.00   184003.00   ✓ POSITIVE
  2025-06-25    45000.00   229003.00   ✓ POSITIVE
  2025-07-03    49500.00   278503.00   ✓ POSITIVE
  2025-07-10    50100.00   328603.00   ✓ POSITIVE
  2025-07-28  -330500.42   -1897.42    ⚠️ NEGATIVE  ← KEY TEST
  2025-11-17   135003.00   133105.58   ✓ POSITIVE
  2025-11-25    49000.00   182105.58   ✓ POSITIVE
*/
```

---

## Key Constraints & Rules

### 1. Amounts as Strings
```typescript
// ✅ CORRECT
const amount = "182105.58"; // string
const decimal = new Decimal(amount);

// ❌ WRONG
const amount = 182105.58; // number - precision loss!
```

### 2. Dates in ISO Format
```typescript
// ✅ CORRECT
const txDate = "2025-06-12"; // ISO format

// ❌ WRONG
const txDate = new Date("June 12, 2025"); // Timezone dependent
```

### 3. Reference IDs for Idempotency
```typescript
// ✅ CORRECT - Deterministic, re-submitting won't create duplicate
const referenceId = `xrp-sam-${amount}-${txDate}`;

// ❌ WRONG - Non-deterministic
const referenceId = crypto.randomUUID();
```

### 4. Position Queries
```typescript
// ✅ CORRECT - Use composite primary key (investor_id, fund_id)
SELECT current_value FROM investor_positions
WHERE investor_id = '...' AND fund_id = '...';

// ❌ WRONG - No id column on investor_positions!
SELECT current_value FROM investor_positions WHERE id = '...';
```

### 5. IB Attribution
```typescript
// ✅ CORRECT - Sam has fee_pct and ib_parent_id
profile: {
  fee_pct: 0.16,        // Sam pays 16% fee
  ib_parent_id: 'ryan-id',  // To Ryan Van Der Wall
}

// ❌ WRONG - Missing one or the other
```

---

## Testing Checklist (for Local Model)

```
TASK: Load XRP scenario, verify all 8 transactions appear correctly

[ ] Profiles created
    - Sam Johnson (investor, fee_pct 0.16)
    - Ryan Van Der Wall (ib, ib_percentage 0.04)

[ ] Fund created
    - Asset: XRP
    - Status: active

[ ] All 8 transactions loaded
    - In correct date order
    - Amounts match exactly (to 10 decimal places)
    - Reference IDs are deterministic

[ ] Database state verified
    - Final position: 182105.58 XRP
    - Ledger sum matches position
    - Negative position exists at Tx #6: -1897.42

[ ] No errors or warnings
    - RLS policies pass
    - Triggers fire correctly
    - Audit log created

[ ] UI displays correctly
    - Fund appears in fund list
    - Sam appears as investor
    - All 8 transactions visible in order
    - Running balances correct
    - Final balance matches database

[ ] Edge case handled
    - Negative position displays (not hidden)
    - Subsequent deposits add correctly
    - No "insufficient funds" errors
```

---

## Debugging Tips

### If Transaction Fails
```sql
-- Check if fund exists
SELECT id, asset_code FROM funds WHERE asset_code = 'XRP';

-- Check if investor exists
SELECT id, name, fee_pct, ib_parent_id FROM profiles WHERE name = 'Sam Johnson';

-- Check reference_id uniqueness
SELECT reference_id, COUNT(*) FROM transactions_v2 GROUP BY reference_id HAVING COUNT(*) > 1;

-- Check RLS policy
SELECT * FROM auth.users WHERE email = 'qa.admin@indigo.fund';
```

### If Position Doesn't Update
```sql
-- Check trigger exists
SELECT trigger_name FROM information_schema.triggers 
WHERE trigger_name = 'trg_ledger_sync';

-- Check if position row created
SELECT * FROM investor_positions 
WHERE investor_id = '...' AND fund_id = '...';

-- Manually trigger recalculation
SELECT recompute_investor_position(
  'sam-id', 
  'xrp-fund-id'
);
```

### If UI Shows Old Data
```typescript
// Hard refresh React Query cache
queryClient.invalidateQueries({
  queryKey: ["investor_positions"],
});

// Force refetch
refetch();
```

---

## Summary

You now have all patterns needed to:
1. Create profiles with correct fee/IB structure
2. Create funds and transactions
3. Query positions and verify balances
4. Display data in React components
5. Handle edge cases (negative positions, precision)

Copy the main prompt from HANDOFF_LOCAL_MODEL_CONTEXT.md and paste into your local model.

---

**Version**: 1.0  
**Status**: READY FOR IMPLEMENTATION
