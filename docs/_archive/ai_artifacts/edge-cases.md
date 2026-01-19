# Edge Cases Matrix

## Overview
Critical edge cases that must be tested to ensure data integrity.

---

## 1. Mid-Period Deposit Before Yield Apply

**Scenario:** Investor deposits funds on the last day of month, just before yield is applied.

**Expected Behavior:**
- Deposit should increase position immediately
- Yield distribution uses position value AT TIME of distribution
- New deposit participates in that day's yield pro-rata

**Test:**
```sql
-- Setup: Investor has $10,000 position
-- Action: Deposit $5,000 at 11:00 AM
-- Action: Apply yield at 2:00 PM (1% gross)
-- Expected: Yield calculated on $15,000 base
```

---

## 2. Pending Withdrawal During Yield Apply

**Scenario:** Withdrawal is pending/approved but not yet processed when yield is applied.

**Expected Behavior:**
- Pending withdrawals do NOT reduce position for yield calculation
- Only processed/completed withdrawals affect position
- Investor receives yield on full pre-withdrawal balance

**Test:**
```sql
-- Setup: Investor has $10,000, requests $5,000 withdrawal (pending)
-- Action: Apply 1% yield
-- Expected: Yield on $10,000 (not $5,000)
```

---

## 3. Zero-Balance Positions

**Scenario:** Investor fully withdraws, position becomes zero.

**Expected Behavior:**
- Position record may remain with current_value = 0
- Investor should NOT appear in "active investors" counts
- Yield distribution skips zero-balance positions
- Fund investor_count excludes zero positions

**Test:**
```sql
SELECT COUNT(*) FROM investor_positions WHERE current_value > 0;
-- Should match "active investors" display
```

---

## 4. Idempotency - Re-running Yield Apply

**Scenario:** Admin accidentally clicks "Apply" twice, or retry after timeout.

**Expected Behavior:**
- Second apply produces ZERO new transactions
- reference_id unique constraint prevents duplicates
- ON CONFLICT handlers silently skip duplicates
- No error thrown to user

**Test:**
```sql
-- Run apply_daily_yield_to_fund_v2 twice with same parameters
-- Count transactions before and after second run
-- Expected: Same count
```

---

## 5. Decimal Precision

**Scenario:** Very small yields on crypto positions.

**Expected Behavior:**
| Asset | Storage Precision | Display Precision |
|-------|-------------------|-------------------|
| BTC | 8 decimals | 8 decimals |
| ETH | 8 decimals | 8 decimals |
| USDT/USDC | 6 decimals | 6 decimals |
| USD display | N/A | 2 decimals |

**Test:**
```sql
-- 0.00001% yield on 0.001 BTC position
-- Expected yield: 0.00000001 BTC (stored as 0.00000001)
-- Display should NOT round to 0.00
```

---

## 6. Missing Statement Period

**Scenario:** Statement generation requested for a month with no period record.

**Expected Behavior:**
- System should auto-create period if missing
- OR reject with clear error message
- Never generate statement with NULL period_id

**Test:**
- Request statement for future month
- Expected: Error "Period not found"

---

## 7. Fund Deactivation and Reactivation

**Scenario:** Fund is deactivated while investors hold positions.

**Expected Behavior:**
- Positions remain intact (not deleted)
- No new deposits allowed
- Withdrawals still permitted
- Yield can still be applied (for unwinding)
- Fund excluded from "active funds" list

**Test:**
```sql
-- Deactivate fund with $100,000 AUM
-- Verify positions still exist
-- Verify withdrawal request succeeds
-- Verify deposit request fails
```

---

## 8. IB Reassignment Mid-Cycle

**Scenario:** Investor's IB is changed between yield distributions.

**Expected Behavior:**
- Historical IB allocations unchanged
- Future allocations go to new IB
- Current month may have split allocations
- Audit log captures the change

**Test:**
```sql
-- Investor A has IB = X
-- Apply yield (creates ib_allocation to X)
-- Reassign Investor A to IB = Y
-- Apply next yield
-- Expected: New allocation to Y, old allocation to X unchanged
```

---

## Automated Test SQL

```sql
-- Run all edge case validations
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Test 3: Zero balance exclusion
  SELECT COUNT(*) INTO v_count 
  FROM investor_positions 
  WHERE current_value = 0;
  
  RAISE NOTICE 'Zero-balance positions: %', v_count;
  
  -- Test 4: Idempotency check
  SELECT COUNT(*) INTO v_count 
  FROM transactions_v2 
  WHERE reference_id IS NOT NULL
  GROUP BY reference_id 
  HAVING COUNT(*) > 1;
  
  IF v_count > 0 THEN
    RAISE WARNING 'Duplicate reference_ids found: %', v_count;
  ELSE
    RAISE NOTICE 'Idempotency OK: No duplicate reference_ids';
  END IF;
  
  -- Test 5: Precision check
  SELECT COUNT(*) INTO v_count 
  FROM transactions_v2 
  WHERE amount != ROUND(amount, 8);
  
  IF v_count > 0 THEN
    RAISE WARNING 'Precision violations: %', v_count;
  END IF;
END $$;
```
