# Void & Reissue Full-Exit Cascade — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When voiding and reissuing a full-exit withdrawal, the system re-runs the entire withdrawal approval flow (truncation, dust sweep creation, fees routing, position zeroing) instead of just inserting a raw replacement transaction.

**Architecture:** New dedicated RPC `void_and_reissue_full_exit` that voids the original transaction + dust sweeps, then calls the existing `approve_and_complete_withdrawal` logic to re-process. Frontend dialog auto-detects full-exit context and switches between simple V&R and full-exit V&R modes.

**Tech Stack:** PostgreSQL RPC, React 18, TypeScript, Supabase

---

## Overview

```
Current V&R Flow (simple):
  void original tx → insert new tx with p_new_amount → update position

New Full-Exit V&R Flow:
  void original tx (cascades to dust sweeps) →
  update withdrawal_request with new amount →
  re-call approve_and_complete_withdrawal logic →
    → creates new WITHDRAWAL tx (truncated to send_precision)
    → creates new DUST_SWEEP txs (investor debit + fees credit)
    → updates investor position to 0
    → updates fees account position
    → recalculates AUM
```

---

## Task 1: Create `void_and_reissue_full_exit` PostgreSQL RPC

**Files:**
- Create: `supabase/migrations/20260321_void_reissue_full_exit.sql`

**RPC Signature:**
```sql
CREATE OR REPLACE FUNCTION void_and_reissue_full_exit(
  p_transaction_id uuid,       -- The WITHDRAWAL tx to void & reissue
  p_new_amount numeric,        -- New withdrawal amount (positive, will be negated)
  p_admin_id uuid,
  p_reason text,
  p_send_precision int DEFAULT 3  -- Decimal places for truncation
) RETURNS json
```

**Logic:**

- [ ] **Step 1: Write the RPC function**

```sql
-- 1. Validate admin, fetch original tx
-- 2. Verify tx is WITHDRAWAL type and not already voided
-- 3. Find the withdrawal_request linked to this tx (via reference_id pattern or tx_date+investor+fund match)
-- 4. Call void_transaction(p_transaction_id) — cascades to dust sweeps
-- 5. Reset withdrawal_request status to 'approved' (so it can be re-processed)
-- 6. Update withdrawal_request.requested_amount with p_new_amount
-- 7. Call the approve_and_complete_withdrawal logic:
--    a. Fetch investor position balance
--    b. Determine if this is still full exit (p_new_amount >= balance after void)
--    c. TRUNC(balance, p_send_precision) for final amount
--    d. Calculate dust = balance - final_amount
--    e. Insert WITHDRAWAL transaction (-final_amount)
--    f. Insert DUST_SWEEP debit from investor (-dust)
--    g. Insert DUST_SWEEP credit to fees account (+dust)
--    h. Update investor_positions (should go to 0 for full exit)
--    i. Update fees account position
--    j. Recalculate fund AUM
--    k. Update withdrawal_request to completed with new processed_amount
-- 8. Audit log the entire operation
-- 9. Return JSON with all IDs and amounts
```

**IMPORTANT:** Do NOT duplicate the `approve_and_complete_withdrawal` logic. Instead, either:
- Option A: Call `approve_and_complete_withdrawal` directly (if it can accept a pre-voided state)
- Option B: Extract the shared logic into a helper function both RPCs call
- Option C: Inline the critical path (truncation + dust + insert) with clear comments referencing the source

Preferred: **Option A** — void the tx, reset withdrawal_request to 'approved', then call `approve_and_complete_withdrawal(p_request_id, p_new_amount, ...)`. This reuses all existing logic.

- [ ] **Step 2: Test the RPC manually in SQL Editor**

```sql
-- Find a test withdrawal tx ID
SELECT id, amount, type, investor_id, fund_id, tx_date
FROM transactions_v2
WHERE type = 'WITHDRAWAL' AND is_voided = false
LIMIT 5;

-- Dry run (on a test/staging record only)
SELECT void_and_reissue_full_exit(
  'TX_ID_HERE'::uuid,
  236.02,  -- new amount
  'ADMIN_ID_HERE'::uuid,
  'Test full-exit V&R correction'
);

-- Verify: original tx voided, dust sweeps voided, new tx + dust created
SELECT id, type, amount, is_voided, reference_id
FROM transactions_v2
WHERE investor_id = 'INVESTOR_ID' AND fund_id = 'FUND_ID'
ORDER BY created_at DESC LIMIT 10;
```

- [ ] **Step 3: Commit migration**

```bash
git add supabase/migrations/20260321_void_reissue_full_exit.sql
git commit -m "feat: void_and_reissue_full_exit RPC for full-exit withdrawal corrections"
```

---

## Task 2: Create Detection Service — Is This a Full-Exit Transaction?

**Files:**
- Modify: `src/services/admin/adminTransactionHistoryService.ts`

- [ ] **Step 1: Add `getTransactionContext` function**

```typescript
export async function getTransactionContext(transactionId: string): Promise<{
  isFullExit: boolean;
  hasDustSweeps: boolean;
  withdrawalRequestId: string | null;
  dustSweepCount: number;
  originalRequestedAmount: string | null;
}> {
  // 1. Fetch the transaction
  // 2. Check if type === 'WITHDRAWAL'
  // 3. Look for DUST_SWEEP transactions on same fund + date + (investor or fees account)
  // 4. Look for matching withdrawal_request (by investor_id, fund_id, tx_date proximity)
  // 5. Check withdrawal_request.withdrawal_type === 'FULL' or is_full_exit flag
  // Return context
}
```

- [ ] **Step 2: Commit**

```bash
git add src/services/admin/adminTransactionHistoryService.ts
git commit -m "feat: getTransactionContext detects full-exit withdrawal context"
```

---

## Task 3: Add `voidAndReissueFullExit` Service Function

**Files:**
- Modify: `src/services/admin/adminTransactionHistoryService.ts`

- [ ] **Step 1: Add service function that calls the new RPC**

```typescript
export async function voidAndReissueFullExit(params: {
  transactionId: string;
  newAmount: string;  // Positive amount (RPC handles sign)
  reason: string;
}): Promise<VoidAndReissueResult> {
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await rpc.call("void_and_reissue_full_exit", {
    p_transaction_id: params.transactionId,
    p_new_amount: parseFinancial(params.newAmount).toString() as unknown as number,
    p_admin_id: user.id,
    p_reason: params.reason,
  });

  if (error) throw new Error(error.userMessage || error.message);

  // Map response
  const result = data as Record<string, unknown>;
  return {
    success: true,
    voided_transaction_id: (result.voided_tx_id as string) || params.transactionId,
    new_transaction_id: (result.new_tx_id as string) || "",
    message: (result.message as string) || "Full-exit withdrawal corrected successfully",
  };
}
```

- [ ] **Step 2: Add to useTransactionMutations hook**

```typescript
const voidAndReissueFullExitMutation = useMutation({
  mutationFn: (params) => adminTransactionHistoryService.voidAndReissueFullExit(params),
  onSettled: (_, __, variables) => {
    invalidateAfterTransaction(queryClient, variables.investorId, variables.fundId);
  },
});
```

- [ ] **Step 3: Commit**

---

## Task 4: Update VoidAndReissueDialog — Auto-Detect Full-Exit Mode

**Files:**
- Modify: `src/features/admin/transactions/VoidAndReissueDialog.tsx`

- [ ] **Step 1: Fetch transaction context when dialog opens**

```typescript
const [txContext, setTxContext] = useState<TransactionContext | null>(null);

useEffect(() => {
  if (transaction && open) {
    getTransactionContext(transaction.id).then(setTxContext);
  }
}, [transaction, open]);

const isFullExit = txContext?.isFullExit ?? false;
```

- [ ] **Step 2: Show full-exit warning banner**

```tsx
{isFullExit && (
  <Alert className="border-amber-500/20 bg-amber-500/5">
    <AlertTriangle className="h-4 w-4 text-amber-400" />
    <AlertDescription>
      <strong>Full-exit withdrawal detected.</strong>
      <p className="text-sm mt-1">
        This correction will void the original withdrawal + {txContext.dustSweepCount} dust
        sweep transactions, then re-process the full exit with the new amount.
        Dust will be recalculated automatically.
      </p>
    </AlertDescription>
  </Alert>
)}
```

- [ ] **Step 3: Show simplified form for full-exit (amount only)**

When `isFullExit`:
- Hide date field (full-exit uses current date)
- Show amount field with label "New Withdrawal Amount (SOL)"
- Show read-only info: "Dust will be recalculated based on position balance"
- Show the investor's current position balance for reference

- [ ] **Step 4: Route to correct mutation on submit**

```typescript
if (isFullExit) {
  voidAndReissueFullExitMutation.mutate({
    transactionId: transaction.id,
    newAmount: data.amount,  // Positive, RPC handles sign
    reason: data.reason,
    investorId: transaction.investorId,
    fundId: transaction.fundId,
  });
} else {
  // Existing simple V&R flow
  voidAndReissueMutation.mutate({ ... });
}
```

- [ ] **Step 5: Commit**

```bash
git add src/features/admin/transactions/VoidAndReissueDialog.tsx
git commit -m "feat: V&R dialog auto-detects full-exit and uses cascading correction"
```

---

## Task 5: Register New RPC in TypeScript Contracts

**Files:**
- Modify: `src/contracts/rpcSignatures.ts`
- Modify: `src/integrations/supabase/types.ts` (add RPC type)

- [ ] **Step 1: Add RPC signature**

```typescript
void_and_reissue_full_exit: {
  Args: {
    p_transaction_id: string;
    p_new_amount: number;
    p_admin_id: string;
    p_reason: string;
    p_send_precision?: number;
  };
  Returns: Json;
};
```

- [ ] **Step 2: Commit**

---

## Task 6: Final Verification

- [ ] **Step 1: Run tsc**
- [ ] **Step 2: Run build**
- [ ] **Step 3: Apply migration to Supabase via SQL Editor**
- [ ] **Step 4: Test full flow in UI:**
  1. Find a full-exit withdrawal in the ledger
  2. Click V&R — verify dialog shows "Full-exit withdrawal detected" banner
  3. Change amount → enter reason → type REISSUE → submit
  4. Verify: original tx voided, dust sweeps voided, new tx + new dust sweeps created
  5. Verify: investor position = 0, fees account received dust
  6. Verify: AUM recalculated
- [ ] **Step 5: Push**

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Calling approve_and_complete_withdrawal with pre-voided state | Test that RPC handles the case where position is already adjusted from void |
| Double dust sweeps | void_transaction cascade (v6) must complete before re-processing |
| Position goes negative | Full exit always reads live balance, which should be correct after void reversal |
| Withdrawal request not found | Fallback to simple V&R if no withdrawal_request linked |

## Summary

| Task | Files | Complexity |
|------|-------|-----------|
| 1: New RPC | 1 migration SQL | HIGH (core logic) |
| 2: Detection service | 1 TS file | LOW |
| 3: Service + mutation | 2 TS files | MEDIUM |
| 4: Dialog update | 1 TSX file | MEDIUM |
| 5: Contract registration | 2 TS files | LOW |
| 6: Verify + deploy | 0 files | LOW |
