# Reconciliation Operations Runbook

**Version**: 1.0
**Created**: 2026-01-26
**Status**: Production Ready

---

## Overview

This runbook documents the ongoing reconciliation procedures for the Indigo Yield Platform, ensuring data integrity between the platform and accounting systems.

---

## 1. Automated Monitoring

### 1.1 Reconciliation Monitor Script

**Location**: `scripts/reconciliation-monitor.ts`

**Run manually**:
```bash
cd /Users/mama/indigo-yield-platform-v01
npx ts-node scripts/reconciliation-monitor.ts
```

**Schedule (recommended)**:
- Frequency: Weekly (Monday 9 AM)
- Method: Cron job or Supabase Edge Function

**Cron example**:
```bash
0 9 * * 1 cd /path/to/project && npx ts-node scripts/reconciliation-monitor.ts >> /var/log/indigo/reconciliation.log 2>&1
```

### 1.2 Health Check Queries

Run these queries directly in Supabase SQL Editor:

**Full Health Check**:
```sql
SELECT * FROM run_comprehensive_health_check();
```

**Ledger Reconciliation**:
```sql
WITH position_ledger AS (
  SELECT
    ip.investor_id,
    ip.fund_id,
    ip.current_value as stored_position,
    COALESCE(SUM(
      CASE
        WHEN t.type IN ('DEPOSIT', 'YIELD', 'IB_CREDIT', 'FEE_CREDIT') THEN t.amount
        WHEN t.type IN ('WITHDRAWAL') THEN t.amount
        ELSE 0
      END
    ), 0) as ledger_balance
  FROM investor_positions ip
  LEFT JOIN transactions_v2 t ON ip.investor_id = t.investor_id
    AND ip.fund_id = t.fund_id
    AND NOT t.is_voided
  GROUP BY ip.investor_id, ip.fund_id, ip.current_value
)
SELECT
  p.first_name || ' ' || p.last_name as investor,
  f.code as fund,
  pl.stored_position,
  pl.ledger_balance,
  (pl.stored_position - pl.ledger_balance)::numeric(20,8) as variance
FROM position_ledger pl
JOIN profiles p ON pl.investor_id = p.id
JOIN funds f ON pl.fund_id = f.id
WHERE ABS(pl.stored_position - pl.ledger_balance) > 0.00000001
ORDER BY ABS(pl.stored_position - pl.ledger_balance) DESC;
```

---

## 2. Alert Thresholds

| Metric | Warning | Critical | Action |
|--------|---------|----------|--------|
| Position Variance | > 0.1% | > 1% | Investigate transaction history |
| Health Check Fail | Any | Any | Immediate investigation |
| Fee Mismatch | - | Any | Update fee schedule |
| Missing Investor | - | Any | Create investor profile |
| Negative Position | - | Any | Void invalid transaction |

---

## 3. Scheduled Tasks

### 3.1 Weekly (Every Monday)

| Task | Owner | Tool |
|------|-------|------|
| Run reconciliation monitor | Dev/Ops | `reconciliation-monitor.ts` |
| Review variance report | Finance | Admin Portal |
| Check pending withdrawals | Operations | Admin Portal |

### 3.2 Monthly (1st of Month)

| Task | Owner | Tool |
|------|-------|------|
| Full reconciliation audit | CFO | SQL queries + Admin Portal |
| Fee schedule review | Finance | Admin Portal |
| IB commission review | Finance | Admin Portal |
| Position snapshot | Dev/Ops | Database backup |

### 3.3 Quarterly

| Task | Owner | Tool |
|------|-------|------|
| External audit preparation | Finance | Export reports |
| Fee structure review | CFO | All fee schedules |
| IB relationship review | Operations | Profile management |

---

## 4. Common Issues & Resolution

### 4.1 Position Variance Detected

**Symptoms**: Health check `LEDGER_POSITION_MATCH` fails

**Investigation**:
```sql
-- Find the variance
SELECT
  p.first_name || ' ' || p.last_name as investor,
  f.code as fund,
  ip.current_value as position,
  SUM(CASE
    WHEN t.type IN ('DEPOSIT', 'YIELD', 'IB_CREDIT') THEN t.amount
    WHEN t.type = 'WITHDRAWAL' THEN t.amount
    ELSE 0
  END) as ledger_sum
FROM investor_positions ip
JOIN profiles p ON ip.investor_id = p.id
JOIN funds f ON ip.fund_id = f.id
LEFT JOIN transactions_v2 t ON ip.investor_id = t.investor_id
  AND ip.fund_id = t.fund_id
  AND NOT t.is_voided
WHERE ip.investor_id = '[INVESTOR_ID]'
GROUP BY p.first_name, p.last_name, f.code, ip.current_value;
```

**Resolution**:
1. Check for missing yield transactions
2. Check for voided transactions that shouldn't be voided
3. If legitimate discrepancy, create correction transaction

### 4.2 Missing Fee Schedule

**Symptoms**: Position without fee schedule in `investor_fee_schedule`

**Resolution**:
```sql
INSERT INTO investor_fee_schedule (investor_id, fund_id, fee_pct, effective_date)
VALUES ('[INVESTOR_ID]', '[FUND_ID]', 20.0, CURRENT_DATE);
```

### 4.3 Yield Conservation Error

**Symptoms**: Health check `YIELD_CONSERVATION` fails

**Investigation**:
```sql
SELECT
  yd.id,
  yd.gross_yield_amount,
  yd.total_net_amount,
  yd.total_fee_amount,
  yd.dust_amount,
  ABS(yd.gross_yield_amount - (COALESCE(yd.total_net_amount, 0) + COALESCE(yd.total_fee_amount, 0) + COALESCE(yd.dust_amount, 0))) as error
FROM yield_distributions yd
WHERE NOT yd.is_voided
  AND ABS(yd.gross_yield_amount - (COALESCE(yd.total_net_amount, 0) + COALESCE(yd.total_fee_amount, 0) + COALESCE(yd.dust_amount, 0))) > 0.01;
```

**Resolution**:
1. Recalculate and update totals using `set_canonical_rpc(true)` bypass
2. Or void the distribution and re-run

---

## 5. IB Configuration Reference

### Current IB Relationships

| Investor | IB Parent | Commission Rate |
|----------|-----------|-----------------|
| Babak Eftekhari | Lars Ahlgreen | 2% |
| Paul Johnson | Alex Jacobs | 1.5% |
| Sam Johnson | Ryan Van Der Wall | 4% |

### IB Accounts

| IB Name | Commission Rate | Account Type |
|---------|-----------------|--------------|
| Alex Jacobs | 10% | ib |
| Lars Ahlgreen | 5% | ib |
| Ryan Van Der Wall | 10% | ib |

### Updating IB Relationships

```sql
-- Add IB relationship
UPDATE profiles
SET ib_parent_id = (SELECT id FROM profiles WHERE email = 'ib@example.com'),
    ib_percentage = 4.0
WHERE id = '[INVESTOR_ID]';

-- Remove IB relationship
UPDATE profiles
SET ib_parent_id = NULL,
    ib_percentage = 0
WHERE id = '[INVESTOR_ID]';
```

---

## 6. Fee Schedule Reference

### Custom Fee Rates

| Rate | Investors |
|------|-----------|
| 0% | INDIGO FEES, Internal accounts, Special arrangements |
| 10% | Julien Grunebaum, Daniele Francilia, Matthew Beatty, Alain Bensimon, Anne Cecile Noique, Terance Chen, Danielle Richetta, Oliver Loisel |
| 13.5% | Paul Johnson (BTC, SOL) |
| 15% | Sacha Oshry, Kyle Gulamerian |
| 16% | Sam Johnson (all funds) |
| 18% | Babak Eftekhari, Advantage Blockchain |
| 20% | Default rate (all others) |

### Updating Fee Schedules

```sql
-- Update existing fee schedule
UPDATE investor_fee_schedule
SET fee_pct = 15.0, updated_at = NOW()
WHERE investor_id = '[INVESTOR_ID]'
  AND fund_id = '[FUND_ID]'
  AND end_date IS NULL;

-- Add new fee schedule (ends previous)
UPDATE investor_fee_schedule
SET end_date = CURRENT_DATE - 1
WHERE investor_id = '[INVESTOR_ID]'
  AND fund_id = '[FUND_ID]'
  AND end_date IS NULL;

INSERT INTO investor_fee_schedule (investor_id, fund_id, fee_pct, effective_date)
VALUES ('[INVESTOR_ID]', '[FUND_ID]', 15.0, CURRENT_DATE);
```

---

## 7. Admin Portal Quick Reference

### Key Pages

| Page | Path | Use |
|------|------|-----|
| Command Center | `/admin` | Overview, Fund AUM |
| System Health | `/admin/system-health` | Health checks |
| Investors | `/admin/investors` | Profile management |
| Transactions | `/admin/transactions` | Transaction history |
| IB Management | `/admin/ib-management` | IB relationships |
| Yield Operations | `/admin/yield-operations` | Yield distribution |

### QA Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | qa.admin@indigo.fund | QaTest2026! |
| Investor | qa.investor@indigo.fund | QaTest2026! |
| IB | qa.ib@indigo.fund | QaTest2026! |

---

## 8. Emergency Procedures

### Data Corruption Detected

1. **STOP** all yield distributions immediately
2. Note the timestamp and affected records
3. Check Supabase point-in-time recovery options
4. Contact technical lead
5. Do NOT attempt manual fixes without approval

### Yield Distribution Error

1. **Void** the distribution via Admin Portal or:
```sql
UPDATE yield_distributions SET is_voided = true, voided_at = NOW() WHERE id = '[ID]';
```
2. Investigate root cause
3. Re-run distribution if needed

### Critical Health Check Failure

1. Run full health check to identify all issues
2. Prioritize by impact (positions > transactions > metadata)
3. Document all findings before making changes
4. Create backup before any corrections

---

## 9. Contact Information

| Role | Responsibility |
|------|----------------|
| Technical Lead | Platform code, RPC functions, database schema |
| Finance Team | Fee schedules, IB relationships, audit |
| Operations | Daily monitoring, investor support |
| CFO | Approval for fee changes, audit sign-off |

---

## 10. Verification Checklist (Post-Change)

After any data changes, verify:

- [ ] Run `SELECT * FROM run_comprehensive_health_check();` - All 8 PASS
- [ ] Check ledger reconciliation query - 0 variances
- [ ] Verify affected investor positions in Admin Portal
- [ ] Confirm fee schedules are correct
- [ ] Test yield calculation formula if distribution was affected

---

*Document maintained by: Technical Team*
*Last updated: 2026-01-26*
