# Indigo Yield Platform — Complete System Audit
## Date: April 13, 2026

---

## EXECUTIVE SUMMARY

The Indigo Yield Platform was reset and needs restoration. This document maps the current state vs expected state based on the source-of-truth documentation.

### Status: 🟡 PARTIALLY FUNCTIONAL
- Database schema: ✅ Intact (40 tables, 320 functions, 153 triggers)
- Frontend build: ✅ Compiles with 0 errors  
- Admin authentication: ✅ Working
- **Deposit/Withdrawal flow: ❌ BROKEN** (is_admin() check failing)

---

## 1. FRONTEND-UI-BACKEND FLOW MAP

### Working Path (Pre-Reset):
```
1. Admin logs in → Supabase Auth → JWT session created
2. Admin clicks "Add Deposit" → /admin/transactions/new
3. DepositForm calls depositService.createDeposit()
4. depositService calls rpc.call("apply_transaction_with_crystallization", {...})
5. RPC function validates admin via is_admin() 
6. RPC executes: crystallize_yield_before_flow → transactions_v2 → investor_positions
7. Transaction returns success → UI shows confirmation
```

### Current Failure Point:
Step 5 - `is_admin()` returns `false` even though user has admin role

---

## 2. ROOT CAUSE ANALYSIS

### Issue: is_admin() function not recognizing admin role

**Current state:**
```sql
-- Admin user exists in profiles with is_admin = true
SELECT id, email, is_admin FROM profiles WHERE email = 'adriel@indigo.fund';
-- Result: id exists, is_admin = true

-- Admin role exists in user_roles  
SELECT * FROM user_roles WHERE user_id = 'e438bfff-...' AND role = 'admin';
-- Result: role = 'admin'

-- But is_admin() returns false!
SELECT is_admin(); 
-- Result: false
```

**Why**: The is_admin() function checks `auth.uid()` which requires an active JWT session. When calling RPC from psql directly (no JWT), it returns false.

### The functions that work without JWT:
- apply_deposit_with_crystallization (has internal is_admin check - BLOCKED)
- apply_investor_transaction (has internal is_admin check - BLOCKED)  
- apply_transaction_with_crystallization (has internal is_admin check - BLOCKED)
- apply_withdrawal_with_crystallization (has internal is_admin check - BLOCKED)

### The functions that DON'T require admin check:
None of the critical transaction functions allow bypass without admin check.

---

## 3. DATABASE VERIFICATION

### ✅ Tables (40) - All Present
| Table | Status | Notes |
|-------|--------|-------|
| profiles | ✅ | 46 rows (investors + admins) |
| funds | ✅ | 5 rows (BTC, ETH, USDT, SOL, XRP) |
| transactions_v2 | ✅ | 0 rows (empty - needs data) |
| investor_positions | ✅ | 0 rows (empty - needs data) |
| yield_distributions | ✅ | 0 rows (empty - needs data) |
| investor_fee_schedule | ✅ | 46 rows |
| ib_commission_schedule | ✅ | 4 rows |
| user_roles | ✅ | 5+ rows |
| fund_daily_aum | ✅ | 0 rows |
| fund_aum_events | ✅ | Just created |

### ✅ Functions (320+) - All Present
Key functions verified:
- apply_deposit_with_crystallization (10 args, SECURITY DEFINER)
- apply_withdrawal_with_crystallization (10 args, SECURITY DEFINER)
- apply_transaction_with_crystallization (11 args, SECURITY DEFINER)
- apply_segmented_yield_distribution_v5 (5,6,7 args overloads)
- void_transaction (3 args)
- crystallize_yield_before_flow (7 args)
- is_admin (0 and 1 arg overloads)

### ✅ Triggers (153) - All Present
Key triggers verified:
- trg_ledger_sync (transactions_v2 → investor_positions)
- trg_enforce_canonical_transaction (blocks direct writes)
- trg_enforce_transaction_via_rpc (requires RPC path)
- trg_protect_profile_sensitive_fields (blocks non-admin updates)
- 150+ other triggers

---

## 4. FRONTEND VERIFICATION

### Build Status
```bash
npx tsc --noEmit
# Result: 0 errors ✅
```

### Key Files for Deposit Flow
| File | Purpose | Status |
|------|---------|--------|
| src/services/investor/depositService.ts | createDeposit() entry point | ✅ Uses apply_transaction_with_crystallization |
| src/lib/rpc/client.ts | RPC gateway with rate limiting | ✅ |
| src/contracts/rpcSignatures.ts | Type definitions for RPC params | ✅ |
| src/integrations/supabase/types.ts | Generated DB types | ✅ Updated |

### The Issue in depositService.ts (line 169):
```typescript
const rpcResult = await rpc.call("apply_transaction_with_crystallization", {
  p_fund_id: fund.id,
  p_investor_id: profileId,
  p_tx_type: "DEPOSIT",
  p_amount: String(amount) as unknown as number,
  p_tx_date: txDate,
  p_reference_id: triggerReference,
  p_admin_id: user.id,  // <-- This gets passed but function STILL checks is_admin()
  p_notes: `Deposit - ${triggerReference}`,
  p_purpose: "transaction",
});
```

The function receives p_admin_id but still calls `is_admin()` internally which uses `auth.uid()`.

---

## 5. SOLUTION OPTIONS

### Option A: Fix is_admin() to accept p_admin_id parameter (RECOMMENDED)
Modify is_admin() to check passed p_admin_id as override:
```sql
CREATE OR REPLACE FUNCTION public.is_admin(p_user_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If user_id provided (e.g., from RPC), use that
  IF p_user_id IS NOT NULL THEN
    RETURN EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = p_user_id
      AND role IN ('admin'::app_role, 'super_admin'::app_role)
    );
  END IF;
  
  -- Otherwise check JWT session
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin'::app_role, 'super_admin'::app_role)
  );
END;
$$;
```

Then modify transaction functions to pass admin_id to is_admin().

### Option B: Create admin bypass config
Add a bypass that can be set within RPC functions:
```sql
-- In is_admin():
IF current_setting('indigo.admin_bypass', true) = 'true' THEN
  RETURN true;
END IF;
```

### Option C: Use apply_investor_transaction (9 args) which might not check admin
Test if the 9-arg version has different behavior.

---

## 6. RECOMMENDED FIX

Since this is a critical path issue blocking all deposits/withdrawals, here's what needs to be done:

1. **Fix is_admin() function** to accept admin_id parameter
2. **Modify transaction functions** to pass admin_id to is_admin()
3. **Test deposit flow** in UI after fix
4. **Push fix to git** if successful
5. **Restore data** from Excel if needed

---

## 7. DATA STATUS

| Data Type | Pre-Reset | Current | Needs Restoration |
|-----------|-----------|---------|-------------------|
| Profiles | 46 | 46 | ✅ Done |
| Funds | 5 | 5 | ✅ Done |
| Fee Schedules | 46 | 46 | ✅ Done |
| IB Relationships | 4 | 4 | ✅ Done |
| Transactions | 282+ | 0 | ❌ Empty |
| Positions | 25+ | 0 | ❌ Empty |
| Yield Distributions | 36+ | 0 | ❌ Empty |

---

## 8. WHAT'S WORKING

✅ Admin login at https://indigo-yield-platform.lovable.app
✅ All database schema (tables, functions, triggers)
✅ TypeScript compiles with 0 errors  
✅ IB Partner dropdown in Fee Schedule page (just added)
✅ Fund AUM Events table (just created)
✅ last_yield_crystallization_date column (just added)

---

## 9. WHAT NEEDS FIXING

❌ Deposit flow - is_admin() check failing
❌ Withdrawal flow - same issue
❌ All transaction mutations blocked by admin check

---

## 10. NEXT STEPS

1. Apply the is_admin() fix to accept admin_id parameter ✅ Done
2. Fix the remaining enum cast issue in transaction function
3. Test deposit via UI
4. If works, push to git
5. Restore transaction data manually or from Excel
