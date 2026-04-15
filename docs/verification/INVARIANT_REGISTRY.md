# Financial Invariant Registry

**Date:** 2026-04-14  
**Role:** Staff Engineer  
**Context:** Production financial platform validation

---

## A. Invariant Registry

### Core Financial Invariants

#### I1: AUM Position Reconciliation

| Property | Value |
|----------|-------|
| **ID** | I1 |
| **Name** | AUM Position Reconciliation |
| **Definition** | Σ investor_positions.current_value = fund_daily_aum.total_aum |
| **Tolerance** | 0.01 (absolute) |
| **Severity** | CRITICAL |

**Verification Query:**
```sql
SELECT * FROM check_aum_reconciliation();
-- Expected: { is_valid: true, drift_amount: "0.0000", drift_percentage: "0.0000" }
```

**Manual Query:**
```sql
SELECT
  fda.fund_id,
  fda.total_aum AS reported_aum,
  SUM(ip.current_value) AS position_sum,
  fda.total_aum - SUM(ip.current_value) AS drift
FROM fund_daily_aum fda
JOIN investor_positions ip ON ip.fund_id = fda.fund_id
WHERE ip.is_active = true
  AND fda.aum_date = CURRENT_DATE
GROUP BY fda.fund_id, fda.total_aum
HAVING ABS(fda.total_aum - SUM(ip.current_value)) > 0.01;
```

---

#### I2: Yield Conservation

| Property | Value |
|----------|-------|
| **ID** | I2 |
| **Name** | Yield Conservation Law |
| **Definition** | gross_yield = net_yield + total_fees + total_ib + dust |
| **Tolerance** | 0.01 (rounding) |
| **Severity** | CRITICAL |

**Verification Query:**
```sql
SELECT * FROM alert_on_yield_conservation_violation();
-- Expected: 0 rows returned
```

**Manual Query:**
```sql
SELECT
  id,
  fund_id,
  gross_yield_amount,
  total_net_amount,
  total_fee_amount,
  total_ib_amount,
  dust_amount,
  gross_yield_amount - (
    COALESCE(total_net_amount, 0) + 
    COALESCE(total_fee_amount, 0) + 
    COALESCE(total_ib_amount, 0) + 
    COALESCE(dust_amount, 0)
  ) AS conservation_error
FROM yield_distributions
WHERE is_voided = false
  AND gross_yield_amount IS NOT NULL
HAVING ABS(
  gross_yield_amount - (
    COALESCE(total_net_amount, 0) + 
    COALESCE(total_fee_amount, 0) + 
    COALESCE(total_ib_amount, 0) + 
    COALESCE(dust_amount, 0)
  )
) > 0.01;
```

---

#### I3: No Negative Positions

| Property | Value |
|----------|-------|
| **ID** | I3 |
| **Name** | Position Non-Negativity |
| **Definition** | investor_positions.current_value >= 0 for all rows |
| **Tolerance** | ZERO TOLERANCE |
| **Severity** | CRITICAL |

**Verification Query:**
```sql
SELECT investor_id, fund_id, current_value
FROM investor_positions
WHERE current_value < 0;
-- Expected: 0 rows
```

---

#### I4: No Duplicate Transactions

| Property | Value |
|----------|-------|
| **ID** | I4 |
| **Name** | Transaction Uniqueness |
| **Definition** | No duplicate reference_id in transactions_v2 |
| **Tolerance** | ZERO TOLERANCE |
| **Severity** | CRITICAL |

**Verification Query:**
```sql
SELECT reference_id, COUNT(*) as duplicate_count
FROM transactions_v2
WHERE reference_id IS NOT NULL
GROUP BY reference_id
HAVING COUNT(*) > 1;
-- Expected: 0 rows
```

---

### Secondary Invariants

#### I5: Void Cascade Integrity

| Property | Value |
|----------|-------|
| **ID** | I5 |
| **Name** | Void Cascade Completeness |
| **Definition** | When yield is voided, all derived transactions are also voided |
| **Severity** | HIGH |

**Verification Query:**
```sql
-- Check for yield transactions NOT voided when parent yield is voided
SELECT t.*
FROM transactions_v2 t
JOIN yield_distributions yd ON yd.id = t.distribution_id
WHERE yd.is_voided = true
  AND t.is_voided IS DISTINCT FROM true
  AND t.type = 'YIELD';
-- Expected: 0 rows
```

---

#### I6: AUM Monotonic (Daily Operations)

| Property | Value |
|----------|-------|
| **ID** | I6 |
| **Name** | AUM Daily Movement |
| **Definition** | fund_daily_aum entries exist for each active fund per day |
| **Severity** | MEDIUM |

**Verification Query:**
```sql
SELECT f.id, f.name
FROM funds f
WHERE f.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM fund_daily_aum fda
    WHERE fda.fund_id = f.id
      AND fda.aum_date = CURRENT_DATE
  );
-- Expected: 0 rows (all active funds have today's AUM)
```

---

#### I7: Position Sum Equals Transaction Sum

| Property | Value |
|----------|-------|
| **ID** | I7 |
| **Name** | Transaction-Position Correlation |
| **Definition** | SUM(transactions_v2.amount) per investor/fund = investor_positions.current_value |
| **Tolerance** | 0.01 |
| **Severity** | HIGH |

**Verification Query:**
```sql
SELECT
  ip.investor_id,
  ip.fund_id,
  ip.current_value,
  tx_sum,
  ip.current_value - tx_sum AS drift
FROM investor_positions ip
JOIN (
  SELECT investor_id, fund_id, SUM(amount) AS tx_sum
  FROM transactions_v2
  WHERE is_voided IS DISTINCT FROM true
  GROUP BY investor_id, fund_id
) tx ON tx.investor_id = ip.investor_id AND tx.fund_id = ip.fund_id
WHERE ip.is_active = true
  AND ABS(ip.current_value - tx_sum) > 0.01;
-- Expected: 0 rows
```

---

#### I8: Yield Idempotency

| Property | Value |
|----------|-------|
| **ID** | I8 |
| **Name** | Yield Idempotency |
| **Definition** | No duplicate yield applications for same fund/period/purpose |
| **Severity** | HIGH |

**Verification Query:**
```sql
SELECT fund_id, period_end, purpose, COUNT(*) AS apply_count
FROM yield_distributions
WHERE is_voided = false
  AND purpose = 'reporting'
GROUP BY fund_id, period_end, purpose
HAVING COUNT(*) > 1;
-- Expected: 0 rows
```

---

## B. Operation-to-Invariant Map

### After Deposit

| Invariant | Check Required | Method |
|----------|----------------|--------|
| I3: No negative positions | YES | Query I3 |
| I4: No duplicates | YES | Query I4 |
| I6: AUM daily | YES | Query I6 |
| I7: Position correlation | YES | Query I7 |

### After Withdrawal

| Invariant | Check Required | Method |
|----------|----------------|--------|
| I3: No negative positions | YES | Query I3 |
| I4: No duplicates | YES | Query I4 |
| I6: AUM daily | YES | Query I6 |
| I7: Position correlation | YES | Query I7 |

### After Yield Apply

| Invariant | Check Required | Method |
|----------|----------------|--------|
| I1: AUM reconciliation | **MANDATORY** | Query I1 |
| I2: Yield conservation | **MANDATORY** | Query I2 |
| I6: AUM daily | YES | Query I6 |
| I8: Yield idempotency | YES | Query I8 |

### After Void (Transaction)

| Invariant | Check Required | Method |
|----------|----------------|--------|
| I5: Void cascade | YES | Query I5 |
| I7: Position correlation | YES | Query I7 |
| I1: AUM reconciliation | YES | Query I1 |

### After Void (Yield)

| Invariant | Check Required | Method |
|----------|----------------|--------|
| I1: AUM reconciliation | **MANDATORY** | Query I1 |
| I5: Void cascade | **MANDATORY** | Query I5 |
| I6: AUM daily | YES | Query I6 |

### After Unvoid

| Invariant | Check Required | Method |
|----------|----------------|--------|
| I7: Position correlation | YES | Query I7 |
| I1: AUM reconciliation | YES | Query I1 |

### After Reporting Generation

| Invariant | Check Required | Method |
|----------|----------------|--------|
| I1: AUM reconciliation | **MANDATORY** | Query I1 |

---

## C. Blocker Criteria

### Critical Blockers (Must FAIL deployment)

| Invariant ID | Invariant Name | Trigger Condition | Action |
|-------------|---------------|-------------------|--------|
| I1 | AUM Reconciliation | is_valid = false OR drift > 0.01 | **BLOCK - CRITICAL** |
| I2 | Yield Conservation | Any violation > 0.01 | **BLOCK - CRITICAL** |
| I3 | Negative Positions | Any row returned | **BLOCK - CRITICAL** |
| I4 | Duplicate Transactions | Any row returned | **BLOCK - CRITICAL** |

### Non-Blocker Issues (Investigate + Fix)

| Invariant ID | Invariant Name | Issue | Action |
|-------------|---------------|-------|--------|
| I5 | Void Cascade | Partial cascade | INVESTIGATE |
| I6 | AUM Daily | Missing entries | FIX |
| I7 | Position Correlation | Drift > 0.01 | INVESTIGATE |
| I8 | Yield Idempotency | Duplicates found | FIX |

---

## D. Immediate Verification Commands

### Pre-Deployment Check (ALL MANDATORY)

```sql
-- I1: AUM Reconciliation
SELECT * FROM check_aum_reconciliation();

-- I2: Yield Conservation  
SELECT * FROM alert_on_yield_conservation_violation();

-- I3: No Negative Positions
SELECT investor_id, fund_id, current_value FROM investor_positions WHERE current_value < 0;

-- I4: No Duplicates
SELECT reference_id, COUNT(*) as dup FROM transactions_v2 WHERE reference_id IS NOT NULL GROUP BY reference_id HAVING COUNT(*) > 1;
```

---

## E. Invariant Monitoring Schedule

| Frequency | Invariants | Method |
|------------|-----------|--------|
| Hourly | I1, I2, I3 | Automated query |
| After every yield | I1, I2, I8 | Service calls |
| After every void | I1, I5 | Service calls |
| Daily (EOD) | I1, I2, I6, I7 | Full audit |
| Weekly | ALL | Comprehensive |

---

## F. Alert Response Matrix

| Invariant | Alert | On-Call Response |
|-----------|-------|------------------|
| I1 | is_valid=false | CRITICAL: Page immediately |
| I2 | Any violation | HIGH: Investigate within 30 min |
| I3 | Any negative | CRITICAL: Page immediately |
| I4 | Any duplicate | HIGH: Investigate within 1 hour |
| I5 | Partial cascade | MEDIUM: Investigate EOD |
| I6 | Missing entries | LOW: Fix within 24h |
| I7 | Drift > 0.01 | MEDIUM: Investigate EOD |
| I8 | Duplicates | LOW: Fix within 24h |

---

## G. Summary

| Priority | Invariant Count | Blockers |
|----------|----------------|----------|
| CRITICAL | 4 (I1-I4) | 4 |
| HIGH | 3 (I5, I7, I8) | 0 |
| MEDIUM | 1 (I6) | 0 |

**Absolute Blockers if violated:**
1. I1: AUM drift > 0.01
2. I2: Yield conservation error > 0.01
3. I3: Any negative position
4. I4: Any duplicate transaction

**Release Criteria:** All 4 critical invariants must pass before deployment.