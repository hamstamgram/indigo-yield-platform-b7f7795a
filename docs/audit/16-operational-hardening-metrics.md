# Operational Hardening Plan

**Phase:** 4B  
**Status:** Planning  
**Last Updated:** 2026-04-14

---

## Executive Summary

Backend architecture is now hardened. Next weakness is operations — we need automated visibility before issues become user reports.

---

## 1. Metric & Alert Matrix

| Metric | Signal | Threshold | Severity | Action |
|--------|-------|----------|----------|---------|
| **Void Latency** | Time from void_transaction call to position update | > 5 seconds | HIGH | Alert on-c |
| **Yield Apply Latency** | Time from yield distribution to position update | > 30 seconds | HIGH | Alert on-c |
| **Advisory Lock Contention** | Queue length waiting for fund-level locks | > 3 waiting | MEDIUM | Observe |
| **Serialization Failures** | Serializable isolation failures | Any | CRITICAL | Page on-c |
| **Reconciliation Drift** | Position ≠ SUM(transactions) | Any | CRITICAL | Alert on-c |
| **AUM Drift** | fund_daily_aum ≠ SUM(positions) | > 0.01 | HIGH | Alert on-c |
| **Statement Generation Failures** | Failed statement generation attempts | > 0 | MEDIUM | Investigate |
| **Admin Repair Function Usage** | Spikes in repair function calls | > 5/day per function | MEDIUM | Alert on-c |

---

## 2. Incident Playbook Outline

### Playbook 1: Yield Apply Failure

**Symptoms:**
- Yield distribution status stuck in 'pending'
- Investor yield events not created
- Positions not updated

**Steps:**
1. Check yield_distributions for error messages
2. Verify fund still has sufficient AUM
3. Check serializable isolation errors in logs
4. Retry yield application if transient
5. Escalate if AUM discrepancy

**Severity:** HIGH | SLA: 15 minutes

---

### Playbook 2: Void/Unvoid Inconsistency

**Symptoms:**
- Position value unexpected after void
- Voided transaction still affecting totals
- AUM drift detected

**Steps:**
1. Identify transaction voided
2. Verify fn_ledger_drives_position fired
3. Check trg_ledger_sync in triggers list
4. Run repair: recompute_investor_position()
5. Verify reconciliation fix

**Severity:** CRITICAL | SLA: 5 minutes

---

### Playbook 3: Reconciliation Drift

**Symptoms:**
- Position current_value ≠ SUM(transactions)
- AUM ≠ sum of positions

**Steps:**
1. Run drift detection query
2. Identify affected positions/funds
3. Run reconcile_all_positions(dry_run=true)
4. Review variance (acceptable?)
5. If not, run reconcile_all_positions(dry_run=false)
6. Document root cause

**Severity:** HIGH | SLA: 30 minutes

---

### Playbook 4: Lock Contention

**Symptoms:**
- Queries timing out
- Advisory lock queue building
- Concurrent operation delays

**Steps:**
1. Identify blocking operations
2. Check for long-running transactions
3. Consider kill to unblock if critical
4. Implement retry with backoff
5. Plan schema changes to reduce contention

**Severity:** MEDIUM | SLA: 1 hour

---

### Playbook 5: Reporting Mismatch

**Symptoms:**
- Statement shows different values than portal
- PDF vs digital discrepancy

**Steps:**
1. Identify reporting period
2. Check fund_daily_aum records
3. Verify positions at statement date
4. Compare to portal calculations
5. Generate corrected statement if needed

**Severity:** MEDIUM | SLA: 1 hour

---

## 3. Severity Classification

| Severity | SLA | Response | Examples |
|----------|-----|----------|----------|
| CRITICAL | 5 min | Page on-call, immediate action | Serialization failure, reconciliation drift |
| HIGH | 15 min | Alert, investigate | Yield apply failure, AUM drift |
| MEDIUM | 1 hour | Alert, schedule fix | Lock contention, statement failure |
| LOW | 24 hours | Observe, plan | Minor drift, repair spike |

---

## 4. Operational Ownership

| Area | Owner | Escalation |
|------|-------|----------|
| Void/Unvoid | Ops Team | Eng Lead |
| Yield Application | Ops Team | Eng Lead |
| Reconciliation | Data Team | Eng Lead |
| Admin Repairs | Senior Ops | Engineering Manager |
| Reporting | Product Team | Eng Lead |

---

## 5. Minimum Monitoring Stack

### For V4 (Immediate)

| Signal | Source | Alert |
|--------|--------|-------|
| Position drift | Nightly cron | Any drift → Slack |
| AUM drift | Nightly cron | Any drift → Slack |
| Serialization failures | Database logs | Any → PagerDuty |

### For V5 (Near-term)

| Signal | Source | Alert |
|--------|--------|-------|
| Void latency | Application logs | > 5s → Slack |
| Yield latency | Application logs | > 30s → Slack |
| Lock contention | Database metrics | > 3 → Slack |
| Repair function calls | Audit log | > daily threshold → Slack |

---

## Document History

| Date | Change | Author |
|------|--------|--------|
| 2026-04-14 | Initial operational hardening plan | Phase 4 Execution |