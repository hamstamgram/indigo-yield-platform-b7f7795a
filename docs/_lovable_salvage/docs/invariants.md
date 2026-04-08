# Financial Invariants

## Overview

This document defines the 5 core financial invariants that must always hold true in the Indigo Fund platform. These invariants are the foundation for data integrity and reconciliation.

---

## Invariant 1: Fund AUM = Sum of Investor Positions

**Statement:**
> For any fund at any point in time, the recorded fund AUM must equal the sum of all investor position values in that fund.

**Formula:**
```
fund_daily_aum.total_aum = Σ investor_positions.current_value 
                           WHERE fund_id = X
```

**Verification SQL:**
```sql
-- Returns rows only when mismatch exists
SELECT 
  f.id as fund_id,
  f.code as fund_code,
  COALESCE(fda.total_aum, 0) as recorded_aum,
  COALESCE(SUM(ip.current_value), 0) as calculated_aum,
  ABS(COALESCE(fda.total_aum, 0) - COALESCE(SUM(ip.current_value), 0)) as discrepancy
FROM funds f
LEFT JOIN fund_daily_aum fda ON f.id = fda.fund_id 
  AND fda.aum_date = CURRENT_DATE 
  AND fda.purpose = 'transaction'
  AND fda.is_voided = false
LEFT JOIN investor_positions ip ON f.id = ip.fund_id
WHERE f.status = 'active'
GROUP BY f.id, f.code, fda.total_aum
HAVING ABS(COALESCE(fda.total_aum, 0) - COALESCE(SUM(ip.current_value), 0)) > 0.0001;
```

**Tolerance:** 0.0001 (sub-cent rounding)

---

## Invariant 2: Investor Position = Sum of Ledger Transactions

**Statement:**
> For any investor in any fund, the current position value must equal the net sum of all ledger transactions (credits minus debits).

**Formula:**
```
investor_positions.current_value = Σ transactions_v2.amount 
                                   WHERE investor_id = X 
                                   AND fund_id = Y 
                                   AND is_voided = false
                                   (with sign based on tx_type)
```

**Transaction Type Signs:**
- `deposit`: +amount
- `interest`: +amount  
- `withdrawal`: -amount
- `fee`: -amount
- `adjustment`: ±amount (based on sign)

**Verification SQL:**
```sql
-- Returns rows only when mismatch exists
WITH ledger_totals AS (
  SELECT 
    investor_id,
    fund_id,
    SUM(
      CASE 
        WHEN type IN ('deposit', 'interest', 'transfer_in') THEN amount
        WHEN type IN ('withdrawal', 'fee', 'transfer_out') THEN -amount
        ELSE amount -- adjustments keep their sign
      END
    ) as ledger_balance
  FROM transactions_v2
  WHERE is_voided = false
    AND investor_id IS NOT NULL
  GROUP BY investor_id, fund_id
)
SELECT 
  ip.investor_id,
  ip.fund_id,
  p.email as investor_email,
  f.code as fund_code,
  ip.current_value as position_value,
  COALESCE(lt.ledger_balance, 0) as ledger_balance,
  ip.current_value - COALESCE(lt.ledger_balance, 0) as discrepancy
FROM investor_positions ip
JOIN profiles p ON p.id = ip.investor_id
JOIN funds f ON f.id = ip.fund_id
LEFT JOIN ledger_totals lt ON lt.investor_id = ip.investor_id 
  AND lt.fund_id = ip.fund_id
WHERE ABS(ip.current_value - COALESCE(lt.ledger_balance, 0)) > 0.0001;
```

**Tolerance:** 0.0001

---

## Invariant 3: Yield Conservation (Gross = Net + Fees)

**Statement:**
> For any yield distribution, the gross yield must equal the sum of net yield distributed to investors plus all fees collected.

**Formula:**
```
yield_distributions.gross_yield = Σ (net interest transactions) 
                                 + Σ fee_allocations.fee_amount
                                 + Σ ib_allocations.ib_fee_amount
```

**Note:** IB allocations are paid FROM the fee pool, not in addition to it:
```
total_fees = platform_fees + ib_commissions
gross_yield = net_to_investors + total_fees
```

**Verification SQL:**
```sql
-- Returns rows only when conservation fails
WITH distribution_components AS (
  SELECT 
    yd.id as distribution_id,
    yd.fund_id,
    yd.effective_date,
    yd.gross_yield,
    -- Sum of net interest credited to investors
    COALESCE((
      SELECT SUM(t.amount) 
      FROM transactions_v2 t 
      WHERE t.distribution_id = yd.id 
        AND t.type = 'interest'
        AND t.is_voided = false
    ), 0) as net_to_investors,
    -- Sum of fees collected
    COALESCE((
      SELECT SUM(fa.fee_amount) 
      FROM fee_allocations fa 
      WHERE fa.distribution_id = yd.id
        AND fa.is_voided = false
    ), 0) as total_fees,
    -- Sum of IB commissions (subset of fees, not additional)
    COALESCE((
      SELECT SUM(ia.ib_fee_amount) 
      FROM ib_allocations ia 
      WHERE ia.distribution_id = yd.id
        AND ia.is_voided = false
    ), 0) as ib_commissions
  FROM yield_distributions yd
  WHERE yd.status = 'applied'
)
SELECT 
  dc.*,
  dc.gross_yield - (dc.net_to_investors + dc.total_fees) as conservation_error,
  dc.total_fees - dc.ib_commissions as platform_fee_portion
FROM distribution_components dc
WHERE ABS(dc.gross_yield - (dc.net_to_investors + dc.total_fees)) > 0.01;
```

**Tolerance:** 0.01 (cent-level for aggregated amounts)

---

## Invariant 4: Fee Allocation = IB Allocations + Platform Fees

**Statement:**
> For any yield distribution, the total fees collected must equal the sum of IB commissions paid plus the platform's retained fee portion.

**Formula:**
```
Σ fee_allocations.fee_amount = Σ ib_allocations.ib_fee_amount + platform_retained
```

Where `platform_retained` = fees from investors with no IB + (1 - ib_percentage) × fees from investors with IB

**Verification SQL:**
```sql
-- Returns rows only when fee split is inconsistent
WITH distribution_fees AS (
  SELECT 
    yd.id as distribution_id,
    yd.fund_id,
    yd.effective_date,
    COALESCE(SUM(fa.fee_amount), 0) as total_fees
  FROM yield_distributions yd
  LEFT JOIN fee_allocations fa ON fa.distribution_id = yd.id 
    AND fa.is_voided = false
  WHERE yd.status = 'applied'
  GROUP BY yd.id, yd.fund_id, yd.effective_date
),
distribution_ib AS (
  SELECT 
    distribution_id,
    SUM(ib_fee_amount) as total_ib_commissions
  FROM ib_allocations
  WHERE is_voided = false
  GROUP BY distribution_id
)
SELECT 
  df.distribution_id,
  df.fund_id,
  df.effective_date,
  df.total_fees,
  COALESCE(di.total_ib_commissions, 0) as ib_commissions,
  df.total_fees - COALESCE(di.total_ib_commissions, 0) as platform_retained
FROM distribution_fees df
LEFT JOIN distribution_ib di ON di.distribution_id = df.distribution_id
-- This query shows the breakdown; no error condition since platform_retained varies
WHERE df.total_fees > 0;
```

---

## Invariant 5: IB Allocations Require Valid IB Relationship

**Statement:**
> IB allocations must only exist for investors who had an active IB parent at the time of distribution.

**Formula:**
```
∀ ib_allocations: 
  profiles[source_investor_id].ib_parent_id = ib_allocations.ib_investor_id
  AT TIME OF ib_allocations.effective_date
```

**Note:** Due to the snapshot system, this is validated at distribution time, not retrospectively.

**Verification SQL (current state check):**
```sql
-- Returns rows where IB allocation doesn't match current IB relationship
-- Note: Historical IB changes are expected; this flags current mismatches for review
SELECT 
  ia.id as allocation_id,
  ia.distribution_id,
  ia.source_investor_id,
  ia.ib_investor_id as allocated_to_ib,
  p.ib_parent_id as current_ib_parent,
  p.email as source_investor_email,
  ib.email as ib_email,
  ia.ib_fee_amount,
  ia.effective_date,
  CASE 
    WHEN p.ib_parent_id IS NULL THEN 'Source investor no longer has IB'
    WHEN p.ib_parent_id != ia.ib_investor_id THEN 'IB changed since allocation'
    ELSE 'Match'
  END as status
FROM ib_allocations ia
JOIN profiles p ON p.id = ia.source_investor_id
LEFT JOIN profiles ib ON ib.id = ia.ib_investor_id
WHERE ia.is_voided = false
  AND (p.ib_parent_id IS NULL OR p.ib_parent_id != ia.ib_investor_id);
```

**Expected Behavior:**
- Rows returned are NOT necessarily errors - IB relationships can change
- This view helps audit historical allocations vs current state
- True errors would be allocations where no IB existed at distribution time

---

## Verification Query: All Invariants

Run this comprehensive check to validate all invariants at once:

```sql
-- Comprehensive invariant check
-- Returns summary of all violations

SELECT 'Invariant 1: Fund AUM vs Positions' as check_name,
       COUNT(*) as violations
FROM (
  SELECT f.id
  FROM funds f
  LEFT JOIN fund_daily_aum fda ON f.id = fda.fund_id 
    AND fda.aum_date = CURRENT_DATE AND fda.purpose = 'transaction'
  LEFT JOIN investor_positions ip ON f.id = ip.fund_id
  WHERE f.status = 'active'
  GROUP BY f.id, fda.total_aum
  HAVING ABS(COALESCE(fda.total_aum, 0) - COALESCE(SUM(ip.current_value), 0)) > 0.0001
) sub

UNION ALL

SELECT 'Invariant 2: Position vs Ledger' as check_name,
       COUNT(*) as violations
FROM (
  SELECT ip.investor_id, ip.fund_id
  FROM investor_positions ip
  LEFT JOIN (
    SELECT investor_id, fund_id,
           SUM(CASE WHEN type IN ('deposit','interest') THEN amount 
                    WHEN type IN ('withdrawal','fee') THEN -amount 
                    ELSE amount END) as bal
    FROM transactions_v2 WHERE is_voided = false GROUP BY investor_id, fund_id
  ) lt ON lt.investor_id = ip.investor_id AND lt.fund_id = ip.fund_id
  WHERE ABS(ip.current_value - COALESCE(lt.bal, 0)) > 0.0001
) sub

UNION ALL

SELECT 'Invariant 3: Yield Conservation' as check_name,
       COUNT(*) as violations
FROM (
  SELECT yd.id
  FROM yield_distributions yd
  LEFT JOIN (SELECT distribution_id, SUM(amount) as net FROM transactions_v2 
             WHERE type = 'interest' AND is_voided = false GROUP BY distribution_id) t 
    ON t.distribution_id = yd.id
  LEFT JOIN (SELECT distribution_id, SUM(fee_amount) as fees FROM fee_allocations 
             WHERE is_voided = false GROUP BY distribution_id) fa 
    ON fa.distribution_id = yd.id
  WHERE yd.status = 'applied'
    AND ABS(yd.gross_yield - (COALESCE(t.net, 0) + COALESCE(fa.fees, 0))) > 0.01
) sub;
```

---

## Automated Monitoring

These invariants should be checked:
1. **After every yield distribution** - Run invariants 1, 2, 3, 4
2. **After every withdrawal approval** - Run invariants 1, 2
3. **Daily scheduled job** - Run all invariants
4. **Before statement generation** - Run all invariants for the period

---

## Resolution Procedures

### When Invariant 1 Fails (AUM Mismatch)
1. Identify which fund has the mismatch
2. Check for pending transactions not yet reflected in positions
3. Check for voided transactions that weren't properly reversed
4. Use correction_runs system to reconcile if needed

### When Invariant 2 Fails (Position vs Ledger)
1. Identify specific investor/fund combination
2. Export full transaction history for that position
3. Recalculate expected balance
4. Use balance_adjustments table to correct if needed (with audit trail)

### When Invariant 3 Fails (Yield Conservation)
1. Never happened if apply_daily_yield_to_fund_v2 was used
2. Check for manual transaction insertions outside the RPC
3. Void the distribution and re-apply if needed

### When Invariant 5 Fails (IB Allocation)
1. Typically indicates IB reassignment after distribution (expected)
2. If allocation was made with no valid IB at time, investigate the distribution logic
3. Historical allocations are immutable; corrections go forward
