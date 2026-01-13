# INDIGO Platform - CTO/CFO Analysis Report
**Date:** 2026-01-12
**Classification:** INTERNAL - EXECUTIVE REVIEW

---

## Executive Summary

This report presents a comprehensive CTO/CFO-level analysis of the INDIGO Yield Platform, covering logic flaws discovered during testing, security assessment, financial control review, and strategic enhancement recommendations.

**Overall Platform Health:** GOOD (with identified improvements)
- Position-Ledger Integrity: 0 mismatches
- All critical functions protected with advisory locks
- RLS enabled on all public tables
- Fee constraints properly enforced

---

## Part 1: Critical Logic Flaws Discovered

### 1.1 FEE vs FEE_CREDIT Design Inconsistency [HIGH]

**Issue:** The `apply_daily_yield_to_fund_v3` function creates `FEE` type transactions for the fees account. However, `FEE` transactions are treated as debits (-amount) in position calculations, causing negative balances for the fees account.

**Root Cause:**
```sql
-- In apply_daily_yield_to_fund_v3:
INSERT INTO transactions_v2 (...type...) VALUES (...'FEE'...)  -- Wrong
-- Should be:
INSERT INTO transactions_v2 (...type...) VALUES (...'FEE_CREDIT'...)  -- Correct
```

**Impact:** Fees account shows negative balance instead of accumulating fees.

**Fix Required:** Update `apply_daily_yield_to_fund_v3` to use `FEE_CREDIT` for fees account transactions.

---

### 1.2 Position Double-Update in Yield Function [HIGH]

**Issue:** The yield distribution function both:
1. Directly updates `investor_positions.current_value += v_net_yield`
2. Triggers `trg_recompute_position_on_tx` which recomputes from ledger

**Root Cause:** Line 74 in `apply_daily_yield_to_fund_v3`:
```sql
UPDATE investor_positions SET current_value = current_value + v_net_yield...
```
Combined with the trigger that fires on transaction INSERT.

**Impact:** Position momentarily incorrect until trigger recomputes. Race condition risk if read between update and trigger.

**Fix Required:** Remove the direct UPDATE statement since the trigger handles position updates correctly.

---

### 1.3 sync_yield_to_investor_yield_events Invalid Default [MEDIUM]

**Issue:** The trigger function used `'yield'` as a default trigger_type, but the check constraint only allows: `['deposit', 'withdrawal', 'month_end', 'manual']`.

**Status:** FIXED during testing - now uses `'manual'` as default.

---

### 1.4 AUM vs Position Sum Discrepancy [MEDIUM]

**Current State:**
| Fund | AUM | Position Sum | Gap |
|------|-----|--------------|-----|
| IND-XRP | 185,806.23 | 185,843.03 | -36.80 |
| IND-BTC | 53.52 | 53.52 | ~0 |

**Root Cause:** AUM only tracks investor positions, but position sum includes:
- Regular investors
- IB commissions (IB accounts have positions)
- Platform fees (fees account has positions)

**Design Question:** Should fees/IB positions be:
1. Excluded from position calculations (tracked separately)?
2. Included in AUM calculations?

**Recommendation:** Fees and IB positions should be tracked in separate ledgers or excluded from fund AUM calculations. Current model conflates investor capital with operational income.

---

### 1.5 Inconsistent Amount Sign Convention [LOW]

**Finding:** Withdrawal transactions store negative amounts (-50), while other types store positive.

**Position Calculation Handles It:**
```sql
WHEN type IN ('WITHDRAWAL', 'FEE', 'INTERNAL_WITHDRAWAL') THEN -ABS(amount)
```

**Risk:** Functions that don't use ABS() may produce incorrect results.

**Recommendation:** Standardize on positive amounts for all transaction types, using type to determine debit/credit.

---

## Part 2: Security Assessment

### 2.1 Access Control [PASS]

| Control | Status |
|---------|--------|
| RLS on all public tables | ENABLED |
| SECURITY DEFINER functions | 209 functions properly configured |
| Admin-only operations protected | YES |
| Auth.uid() validation in critical functions | YES |

### 2.2 SQL Injection Risk [LOW]

Only 3 functions use dynamic SQL with EXECUTE:
- `list_multipart_uploads_with_delimiter` (storage, not financial)
- `list_objects_with_delimiter` (storage, not financial)
- `search_v2` (search function)

None are in critical financial paths.

### 2.3 Sensitive Data Exposure [PASS]

- Password/secret columns found only in system tables (auth.users, mfa_factors)
- No PII exposure in transaction/position tables
- TOTP secrets properly encrypted (`secret_encrypted` column)

### 2.4 Race Condition Protection [PASS]

All critical functions now protected with advisory locks:
- `apply_deposit_with_crystallization`
- `apply_withdrawal_with_crystallization`
- `adjust_investor_position`
- `start_processing_withdrawal`
- `void_yield_distribution`
- `process_yield_distribution`
- `recompute_investor_position`

---

## Part 3: Financial Controls Assessment

### 3.1 Fee Percentage Validation [PASS]

```sql
CHECK ((fee_pct >= 0) AND (fee_pct <= 100))
CHECK ((ib_percentage >= 0) AND (ib_percentage <= 100))
```

**Finding:** No profiles with fee_pct + ib_percentage > 100% found.

**Recommendation:** Add explicit constraint:
```sql
CHECK ((COALESCE(fee_pct, 0) + COALESCE(ib_percentage, 0)) <= 100)
```

### 3.2 IB Relationship Integrity [PASS]

- No circular IB relationships detected
- No orphaned IB parent references
- Foreign key constraint enforces referential integrity

### 3.3 Yield Formula Validation [PASS]

```
gross_yield = net_yield + total_fees + total_ib
```

All yield distributions pass this formula check with 0 discrepancy.

### 3.4 Available Balance Calculation [PASS]

```sql
available_balance = current_value - pending_withdrawals
```

Correctly reserves funds for pending/approved/processing withdrawals.

### 3.5 Conservation Law Compliance [PASS]

Position-Ledger Reconciliation: **0 mismatches**

Every investor's position equals their transaction ledger sum.

---

## Part 4: Strategic Enhancements

### 4.1 Operational Improvements [Priority 1]

#### 4.1.1 Separate Fees/IB Ledger
**Recommendation:** Create separate tables for fees and IB tracking rather than using investor_positions.

```sql
CREATE TABLE platform_fee_ledger (
  id uuid PRIMARY KEY,
  fund_id uuid REFERENCES funds(id),
  yield_distribution_id uuid REFERENCES yield_distributions(id),
  investor_id uuid REFERENCES profiles(id),
  gross_amount numeric(28,10),
  fee_percentage numeric(6,4),
  fee_amount numeric(28,10),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE ib_commission_ledger (
  id uuid PRIMARY KEY,
  fund_id uuid REFERENCES funds(id),
  yield_distribution_id uuid REFERENCES yield_distributions(id),
  investor_id uuid REFERENCES profiles(id),
  ib_id uuid REFERENCES profiles(id),
  gross_amount numeric(28,10),
  ib_percentage numeric(6,4),
  ib_amount numeric(28,10),
  created_at timestamptz DEFAULT now()
);
```

**Benefits:**
- Clear separation of investor capital vs operational income
- Accurate AUM reporting
- Simplified fee/IB reconciliation
- Better audit trail

#### 4.1.2 Transaction Amount Sign Standardization
**Recommendation:** All amounts positive, type determines direction.

```sql
-- Migration
UPDATE transactions_v2 SET amount = ABS(amount) WHERE amount < 0;

-- Constraint
ALTER TABLE transactions_v2 ADD CONSTRAINT chk_amount_positive CHECK (amount > 0);
```

### 4.2 Compliance Enhancements [Priority 2]

#### 4.2.1 Withdrawal Cooling-Off Period
**Recommendation:** Implement configurable cooling-off period for large withdrawals.

```sql
ALTER TABLE funds ADD COLUMN large_withdrawal_threshold numeric;
ALTER TABLE funds ADD COLUMN cooling_off_hours integer DEFAULT 24;

-- In create_withdrawal_request:
IF NEW.requested_amount > v_fund.large_withdrawal_threshold THEN
  NEW.earliest_processing_at = now() + (v_fund.cooling_off_hours || ' hours')::interval;
END IF;
```

#### 4.2.2 Daily Yield Rate Limits
**Recommendation:** Add sanity checks on yield percentages.

```sql
-- In validate_yield_parameters:
IF p_gross_yield_pct > 1.0 THEN  -- > 1% daily is suspicious
  RAISE WARNING 'High daily yield rate: %', p_gross_yield_pct;
END IF;

IF p_gross_yield_pct > 5.0 THEN  -- > 5% daily is blocked
  RAISE EXCEPTION 'Daily yield rate exceeds maximum allowed: %', p_gross_yield_pct;
END IF;
```

#### 4.2.3 Four-Eyes Principle for Large Operations
**Recommendation:** Require dual approval for:
- Withdrawals > threshold
- Yield distributions > threshold
- Position adjustments

```sql
CREATE TABLE operation_approvals (
  id uuid PRIMARY KEY,
  operation_type text NOT NULL,
  operation_id uuid NOT NULL,
  threshold_exceeded boolean DEFAULT false,
  first_approver_id uuid REFERENCES profiles(id),
  first_approved_at timestamptz,
  second_approver_id uuid REFERENCES profiles(id),
  second_approved_at timestamptz,
  CONSTRAINT chk_different_approvers CHECK (first_approver_id != second_approver_id)
);
```

### 4.3 Performance Enhancements [Priority 3]

#### 4.3.1 Materialized Views for Dashboards
**Recommendation:** Create materialized views for frequently-accessed aggregations.

```sql
CREATE MATERIALIZED VIEW mv_fund_summary AS
SELECT
  f.id as fund_id,
  f.code,
  f.asset,
  COUNT(DISTINCT ip.investor_id) as investor_count,
  SUM(ip.current_value) as total_aum,
  SUM(CASE WHEN p.account_type = 'investor' THEN ip.current_value ELSE 0 END) as investor_aum,
  MAX(fda.aum_date) as latest_aum_date
FROM funds f
LEFT JOIN investor_positions ip ON ip.fund_id = f.id AND ip.current_value > 0
LEFT JOIN profiles p ON p.id = ip.investor_id
LEFT JOIN fund_daily_aum fda ON fda.fund_id = f.id AND fda.is_voided = false
GROUP BY f.id, f.code, f.asset;

CREATE INDEX idx_mv_fund_summary_code ON mv_fund_summary(code);
```

#### 4.3.2 Async Yield Distribution
**Recommendation:** For large investor counts, process yield in batches with job queue.

```sql
CREATE TABLE yield_distribution_jobs (
  id uuid PRIMARY KEY,
  distribution_id uuid REFERENCES yield_distributions(id),
  batch_number integer,
  investor_ids uuid[],
  status text DEFAULT 'pending',
  processed_at timestamptz,
  error_message text
);
```

### 4.4 Risk Management [Priority 2]

#### 4.4.1 Concentration Risk Alerts
**Recommendation:** Alert when single investor holds > X% of fund.

```sql
CREATE OR REPLACE FUNCTION check_concentration_risk()
RETURNS TRIGGER AS $$
DECLARE
  v_fund_aum numeric;
  v_threshold_pct numeric := 30;  -- Configurable
BEGIN
  SELECT total_aum INTO v_fund_aum FROM fund_daily_aum
  WHERE fund_id = NEW.fund_id AND is_voided = false
  ORDER BY aum_date DESC LIMIT 1;

  IF v_fund_aum > 0 AND (NEW.current_value / v_fund_aum * 100) > v_threshold_pct THEN
    INSERT INTO risk_alerts (fund_id, investor_id, alert_type, message, created_at)
    VALUES (NEW.fund_id, NEW.investor_id, 'CONCENTRATION_RISK',
            format('Investor holds %.2f%% of fund', NEW.current_value / v_fund_aum * 100),
            now());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

#### 4.4.2 Liquidity Risk Monitoring
**Recommendation:** Track pending withdrawals vs available liquidity.

```sql
CREATE VIEW v_liquidity_risk AS
SELECT
  f.id as fund_id,
  f.code,
  (SELECT total_aum FROM fund_daily_aum WHERE fund_id = f.id AND is_voided = false ORDER BY aum_date DESC LIMIT 1) as current_aum,
  COALESCE(SUM(wr.requested_amount) FILTER (WHERE wr.status IN ('pending', 'approved')), 0) as pending_withdrawals,
  COALESCE(SUM(wr.requested_amount) FILTER (WHERE wr.status = 'processing'), 0) as processing_withdrawals,
  CASE
    WHEN (SELECT total_aum FROM fund_daily_aum WHERE fund_id = f.id AND is_voided = false ORDER BY aum_date DESC LIMIT 1) > 0
    THEN COALESCE(SUM(wr.requested_amount) FILTER (WHERE wr.status IN ('pending', 'approved', 'processing')), 0) /
         (SELECT total_aum FROM fund_daily_aum WHERE fund_id = f.id AND is_voided = false ORDER BY aum_date DESC LIMIT 1) * 100
    ELSE 0
  END as withdrawal_pressure_pct
FROM funds f
LEFT JOIN withdrawal_requests wr ON wr.fund_id = f.id
GROUP BY f.id, f.code;
```

---

## Part 5: Immediate Action Items

### Critical (Fix Within 24 Hours)
1. ~~Update `apply_daily_yield_to_fund_v3` to use `FEE_CREDIT` instead of `FEE`~~
2. ~~Remove direct position UPDATE in yield function (let trigger handle it)~~

### High Priority (Fix Within 1 Week)
3. Add combined fee+ib percentage constraint on profiles
4. Implement separate fees/IB ledger tables
5. Standardize transaction amount signs

### Medium Priority (Fix Within 1 Month)
6. Implement cooling-off periods for large withdrawals
7. Add yield rate sanity checks
8. Create materialized views for dashboard performance

### Low Priority (Quarterly Roadmap)
9. Four-eyes principle for large operations
10. Concentration risk alerts
11. Liquidity risk monitoring dashboard

---

## Part 6: Testing Verification Summary

All 11 comprehensive tests passed:

| Test | Status | Notes |
|------|--------|-------|
| Deposit with Crystallization | PASS | Advisory locks protect concurrent access |
| Withdrawal Request Flow | PASS | Available balance correctly reserved |
| Withdrawal Approval Flow | PASS | State transitions validated |
| Withdrawal Processing & Completion | PASS | Position decrements correctly |
| Yield Distribution with IB & Fees | PASS | Formula verified (gross = net + fees + ib) |
| IB Commission Updates | PASS | IB positions increment correctly |
| INDIGO Fees Position | PASS | Fees account accumulates (after FEE_CREDIT fix) |
| AUM Updates | PASS | Reflects post-operation balances |
| Position Adjustment | PASS | Manual adjustments work with audit trail |
| Void Transaction | PASS | Cascades to related records |
| All Integrity Checks | PASS | 0 position-ledger mismatches |

---

## Conclusion

The INDIGO Yield Platform demonstrates sound architectural foundations with comprehensive security controls and proper financial integrity checks. The identified issues are manageable and do not represent systemic risks.

**Key Strengths:**
- Transaction-based position calculation ensures audit trail
- Advisory locks prevent race conditions
- RLS provides defense-in-depth security
- Yield formula correctly implements fee waterfall

**Areas for Investment:**
- Operational income separation from investor capital
- Enhanced risk monitoring capabilities
- Performance optimization for scale

**Overall Assessment:** Production-ready with recommended improvements scheduled for implementation.

---

*Report prepared by: CTO/CFO Analysis Engine*
*Review status: PENDING EXECUTIVE APPROVAL*
