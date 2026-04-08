# Incident Playbook: Indigo Yield Platform

**Version:** 1.0.0
**Date:** 2026-01-14
**Classification:** Internal - Operations Team

---

## 1. Overview

This playbook provides step-by-step procedures for handling common operational incidents on the Indigo Yield Platform. All actions should be logged and follow the audit trail requirements.

---

## 2. Health Check Failures

### 2.1 YIELD_CONSERVATION Failure

**Severity:** CRITICAL

**Symptoms:**
- `gross_yield != net_yield + fee_amount` for a distribution

**Immediate Actions:**
1. Stop any pending yield distributions
2. Identify the affected distribution:
   ```sql
   SELECT * FROM run_comprehensive_health_check()
   WHERE check_name = 'YIELD_CONSERVATION';
   ```
3. Find specific violations:
   ```sql
   SELECT id, fund_id, gross_yield, net_yield, total_fees
   FROM yield_distributions
   WHERE ABS(gross_yield - net_yield - total_fees) > 0.0001
     AND NOT voided;
   ```

**Resolution:**
1. Void the affected distribution
2. Recalculate and reapply yield with correct amounts
3. Verify fix: `SELECT * FROM run_comprehensive_health_check() WHERE check_name = 'YIELD_CONSERVATION'`

**Escalation:** Engineering team if systematic

---

### 2.2 LEDGER_POSITION_MATCH Failure

**Severity:** CRITICAL

**Symptoms:**
- Investor position doesn't equal sum of ledger transactions

**Immediate Actions:**
1. Block affected investor's transactions
2. Identify mismatch:
   ```sql
   SELECT * FROM v_position_ledger_reconciliation
   WHERE status = 'MISMATCH';
   ```

**Resolution:**
1. Investigate root cause (missing transaction, double-posting, etc.)
2. Use admin reconciliation function:
   ```sql
   SELECT admin_reconcile_position('<fund_id>', '<investor_id>', '<admin_id>');
   ```
3. Document the discrepancy in audit log

**Escalation:** Finance team for amounts > $1,000

---

### 2.3 NATIVE_CURRENCY Failure

**Severity:** CRITICAL

**Symptoms:**
- Transaction asset doesn't match fund's base asset

**Immediate Actions:**
1. Identify the mismatched transaction:
   ```sql
   SELECT t.id, t.asset, f.asset as fund_asset, t.amount
   FROM transactions_v2 t
   JOIN funds f ON t.fund_id = f.id
   WHERE t.asset != f.asset AND NOT t.voided;
   ```

**Resolution:**
1. Void the incorrect transaction:
   ```sql
   SELECT void_transaction('<transaction_id>', '<admin_id>', 'Currency mismatch - correcting to fund base asset');
   ```
2. Reissue with correct asset using UI (Void & Reissue workflow)
3. Verify fix

**Escalation:** Engineering if trigger failed to prevent

---

### 2.4 PERIOD_LOCKED Failure

**Severity:** NON_CRITICAL

**Symptoms:**
- Attempt to insert into a locked accounting period

**Immediate Actions:**
1. Determine if the lock was intentional
2. Check period status:
   ```sql
   SELECT * FROM accounting_periods
   WHERE fund_id = '<fund_id>'
   ORDER BY period_start DESC;
   ```

**Resolution Options:**
- **If legitimate late entry needed:**
  1. Request unlock via approval workflow
  2. Create admin_approvals record for two-person rule
  3. After approval, unlock period temporarily
- **If error:** Use correct date in open period

---

### 2.5 DUPLICATE_PREFLOW_AUM Failure

**Severity:** NON_CRITICAL

**Symptoms:**
- Multiple preflow AUM records for same fund/date

**Immediate Actions:**
1. Run cleanup function:
   ```sql
   SELECT * FROM cleanup_duplicate_preflow_aum();
   ```

**Resolution:**
- Cleanup function automatically voids duplicates
- Keeps the most recent record

---

### 2.6 RECON_PACK_COVERAGE Failure

**Severity:** NON_CRITICAL

**Symptoms:**
- Locked period missing reconciliation pack
- Period finalization blocked

**Immediate Actions:**
1. Identify missing packs:
   ```sql
   SELECT ap.fund_id, ap.period_start, ap.period_end
   FROM accounting_periods ap
   WHERE ap.is_locked = true
     AND NOT EXISTS (
       SELECT 1 FROM reconciliation_packs rp
       WHERE rp.fund_id = ap.fund_id
         AND rp.period_start = ap.period_start
     );
   ```

**Resolution:**
1. Generate the missing pack:
   ```sql
   SELECT generate_reconciliation_pack('<fund_id>', '<period_start>', '<period_end>', '<admin_id>');
   ```
2. If pack generation fails, investigate missing data
3. Contact engineering if reconciliation cannot be completed

**Escalation:** Finance team for review before finalizing

---

## 3. Transaction Correction Incidents

### 3.1 Wrong Amount on Deposit/Withdrawal

**Procedure:**
1. **DO NOT** use Edit function (deprecated)
2. Use **Void & Reissue** workflow in UI:
   - Navigate to transaction
   - Click "Void & Reissue" from dropdown
   - Enter corrected values
   - Provide reason (minimum 10 characters)
   - Type "REISSUE" to confirm
3. Both original (voided) and new transaction will be linked in audit trail

**CLI Alternative:**
```sql
SELECT void_and_reissue_transaction(
  '<original_transaction_id>',
  '<admin_id>',
  <new_amount>,
  '<new_tx_date>',
  'Reason for correction'
);
```

---

### 3.2 Wrong Date on Transaction

**Procedure:**
1. Same as 3.1 - use Void & Reissue
2. Ensure new date is in an open period
3. If date is in locked period, request unlock first

---

### 3.3 Transaction to Wrong Investor

**Procedure:**
1. Void the original transaction
2. Create new transaction for correct investor
3. Document the correction in notes

---

## 4. Yield Distribution Incidents

### 4.1 Incorrect Yield Calculation

**Symptoms:**
- Yield amount doesn't match expected based on AUM change

**Procedure:**
1. Identify the distribution:
   ```sql
   SELECT * FROM yield_distributions
   WHERE fund_id = '<fund_id>'
   AND distribution_date = '<date>';
   ```
2. Void the distribution and related investor_yield_events
3. Recalculate with correct AUM values
4. Apply corrected yield

---

### 4.2 Negative Yield Month

**This is NOT an error** - the system now supports negative yield months.

**Expected Behavior:**
- No yield is distributed (gross_yield = 0)
- No fees are charged on losses
- Message: "Negative yield month: X loss recorded. No fees charged."

---

## 5. AUM Incidents

### 5.1 Missing Preflow AUM

**Symptoms:**
- Error: "PREFLOW_AUM_MISSING"
- Cannot create deposit/withdrawal

**Resolution:**
1. UI will prompt to create preflow AUM
2. Or use CLI:
   ```sql
   SELECT ensure_preflow_aum(
     '<fund_id>',
     '<date>',
     'transaction',
     <total_aum>,
     '<admin_id>'
   );
   ```
3. Retry the transaction

---

### 5.2 AUM Mismatch with Position Sum

**Procedure:**
1. Calculate expected AUM:
   ```sql
   SELECT SUM(current_value) as position_sum
   FROM investor_positions
   WHERE fund_id = '<fund_id>';
   ```
2. Compare with fund_aum record
3. Investigate any discrepancy
4. Update AUM record if needed (void old, create new)

---

## 6. Approval Workflow Incidents

### 6.1 Pending Approval Stuck

**Symptoms:**
- Action blocked due to pending approval

**Resolution:**
1. Check pending approvals:
   ```sql
   SELECT * FROM admin_approvals
   WHERE approval_status = 'pending'
   ORDER BY requested_at DESC;
   ```
2. Follow up with designated approver
3. If approver unavailable, escalate to super admin

---

### 6.2 Self-Approval Attempt

**Symptoms:**
- Error: "SELF_APPROVAL_NOT_ALLOWED"

**Resolution:**
- Another administrator must approve the action
- This is by design (two-person rule)

---

## 7. System Mode Incidents

### 7.1 Backfill Mode Blocking Live Operations

**Symptoms:**
- Operations failing due to system in "backfill" mode

**Resolution:**
1. Check current mode:
   ```sql
   SELECT get_system_mode();
   ```
2. If backfill complete, switch to live:
   ```sql
   UPDATE system_config
   SET value = '"live"'
   WHERE key = 'system_mode';
   ```

---

### 7.2 Future Date Rejection in Live Mode

**Symptoms:**
- Error: "FUTURE_DATE_NOT_ALLOWED"

**Resolution:**
- Use today's date or earlier
- If backdating needed for testing, temporarily switch to backfill mode (with approval)

---

## 8. Escalation Matrix

| Issue Type | First Contact | Escalation |
|------------|---------------|------------|
| Health Check CRITICAL | Engineering On-Call | CTO |
| Health Check NON_CRITICAL | Operations Lead | Engineering |
| Transaction Errors | Operations Team | Finance Team |
| Yield Calculation | Finance Team | Engineering |
| System Outage | Engineering On-Call | CTO + CEO |
| Security Incident | Security Team | CTO + Legal |

---

## 9. Post-Incident Actions

After resolving any incident:

1. **Run full health check:**
   ```sql
   SELECT * FROM run_comprehensive_health_check();
   ```
   All checks must PASS.

2. **Document in audit log:**
   - What happened
   - When it was discovered
   - What actions were taken
   - Who was involved

3. **Update this playbook** if new resolution procedures were discovered

4. **Schedule post-mortem** for CRITICAL incidents

---

## 10. Contact Information

- **Engineering On-Call:** [Internal Contact]
- **Finance Team:** [Internal Contact]
- **Operations Lead:** [Internal Contact]
- **Security Team:** [Internal Contact]

---

*Document maintained by Indigo Platform Operations Team*
