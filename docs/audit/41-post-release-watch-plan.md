# Post-Release Watch Plan - Financial Platform

**Purpose:** Monitoring and rollback plan for production release  
**Date:** 2026-04-14  
**Scope:** First 72 hours critical, then ongoing

---

## A. Watch Signal Matrix

### Category 1: Core Financial Mutations

| Signal | Source | Healthy State | Anomaly Symptom | Severity |
|--------|--------|---------------|-----------------|----------|
| **Void Transaction Success** | RPC logs, audit_log | success=true, all cascade counts > 0 | success=false OR any cascade count = 0 without reason | CRITICAL |
| **Yield Apply Success** | RPC logs, yield_distributions | distribution created, allocation_count > 0 | Error OR allocation_count = 0 | CRITICAL |
| **Deposit/Withdrawal Flow** | transactions_v2 | Transaction created, position updated | Transaction created but position unchanged | CRITICAL |
| **AUM Position Reconciliation** | check_aum_reconciliation RPC | is_valid=true, drift=0 | is_valid=false OR drift > 0.01 | CRITICAL |

### Category 2: Data Integrity

| Signal | Source | Healthy State | Anomaly Symptom | Severity |
|--------|--------|---------------|-----------------|----------|
| **Duplicate Transactions** | transactions_v2.reference_id | 0 duplicates | Any duplicate reference_id | CRITICAL |
| **Position-AUM Drift** | fund_daily_aum vs SUM(investor_positions) | Within 0.01 | Drift > 0.01 | HIGH |
| **Orphaned Positions** | v_orphaned_positions view | 0 rows | Any orphaned position | HIGH |
| **Negative Balances** | investor_positions.current_value | All >= 0 | Any negative value | CRITICAL |

### Category 3: User-Facing Flows

| Signal | Source | Healthy State | Anomaly Symptom | Severity |
|--------|--------|---------------|-----------------|----------|
| **Investor Dashboard Load** | Page load metrics | < 3s response | > 5s or 500 error | HIGH |
| **Statement Generation** | statement_periods.status | All finalized | Missing periods | MEDIUM |
| **Statement Delivery** | statement_email_delivery.status | > 95% success | < 90% success | MEDIUM |
| **Withdrawal Completion** | withdrawal_requests | PENDING → COMPLETED within 48h | Stuck in PENDING > 24h | HIGH |

### Category 4: Backend Health

| Signal | Source | Healthy State | Anomaly Symptom | Severity |
|--------|--------|---------------|-----------------|----------|
| **RPC Error Rate** | Supabase function logs | < 1% of calls | > 5% errors | HIGH |
| **RLS Policy Failures** | Supabase logs | 0 auth failures | Any RLS denial | HIGH |
| **Trigger Failures** | PostgreSQL logs | 0 errors | Any trigger error | HIGH |
| **Database Connection Pool** | PostgreSQL metrics | < 80% utilized | > 90% utilized | MEDIUM |

---

## B. Rollback Triggers

### Immediate Rollback (Stop Everything)

| Trigger | Condition | Action |
|---------|------------|--------|
| **T1: Financial Data Corruption** | Any transaction amount wrong, position value incorrect | Rollback DB to pre-release snapshot |
| **T2: AUM Drift > 1%** | Σ positions differs from fund_daily_aum by > 1% | Halt yield apply, investigate |
| **T3: Duplicate Transaction Accepted** | Same reference_id appears twice | Review all recent transactions |
| **T4: Negative Balance Created** | Any investor has negative current_value | Rollback positions |

### Gradual Rollback (Throttle First)

| Trigger | Condition | Action |
|---------|------------|--------|
| **T5: Void Transaction 100% Failed** | void_transaction error rate = 100% | Disable void UI, investigate |
| **T6: Yield Apply Creates 0 Allocations** | allocation_count = 0 for 3+ attempts | Disable yield UI, investigate |
| **T7: Withdrawal Stuck** | > 10 withdrawals stuck PENDING > 24h | Pause withdrawals, investigate |
| **T8: Statement Generation Fails** | > 50% of periods fail to generate | Pause statements, investigate |

### Conditional Rollback (Time-Boxed)

| Trigger | Condition | Action |
|---------|------------|--------|
| **T9: RPC Error Rate > 5%** | Sustained for 15 minutes | Throttle traffic, investigate |
| **T10: Dashboard Unavailable** | > 50% of requests fail for 5+ minutes | Rollback to previous version |

---

## C. Triage Playbook

### Scenario 1: Void Transaction Reports Zero Cascade

**Symptoms:** void_transaction returns success but all cascade counts = 0

**Diagnosis Steps:**
1. Query transactions_v2 - verify is_voided = true
2. Query fund_aum_events - should also be voided
3. Query fund_daily_aum - should reflect recalculated AUM
4. Check audit_log for the void record

**Root Causes:**
- No related records exist (legitimate - transaction had no cascade)
- Cascade SQL failed silently (check GET DIAGNOSTICS)
- Foreign key constraint prevented cascade (check errors)

**Resolution:**
- If legitimate: Document in audit trail, close ticket
- If SQL failed: Fix SQL in void_transaction function
- If constraint: Add FK or remove blocking data

**Owner:** Backend Engineer

---

### Scenario 2: Yield Apply Creates Zero Allocations

**Symptoms:** apply_yield_distribution returns success but allocation_count = 0

**Diagnosis Steps:**
1. Query yield_distributions - verify record created
2. Query investor_positions - verify is_active = true for fund
3. Query transactions_v2 - verify no YIELD transactions for period
4. Check fund_daily_aum - verify AUM > 0

**Root Causes:**
- No active investor positions in fund (legitimate - empty fund)
- Position query in RPC uses wrong filter (check WHERE clause)
- AUM = 0 causes division by zero in allocation (check RPC logic)

**Resolution:**
- If empty fund: Document, close ticket
- If query wrong: Fix WHERE clause in RPC
- If division by zero: Add guard in RPC

**Owner:** Backend Engineer

---

### Scenario 3: AUM Position Drift Detected

**Symptoms:** check_aum_reconciliation returns is_valid = false

**Diagnosis Steps:**
1. Get exact drift amount: SELECT total_aum - SUM(current_value)
2. Identify affected fund: GROUP BY fund_id
3. Find recent transactions: transactions_v2 after last reconciliation
4. Check for voided transactions: is_voided = true with amount

**Root Causes:**
- Transaction voided but AUM not recalculated (cascade failure)
- Manual position adjustment not reflected in AUM
- Race condition between transaction and AUM sync

**Resolution:**
- Run recalculate_fund_aum_for_date for affected dates
- Review void_transaction cascade logic
- Add locking to prevent race

**Owner:** Backend Engineer + DevOps

---

### Scenario 4: Investor Dashboard Empty

**Symptoms:** User logs in, sees $0 or no positions

**Diagnosis Steps:**
1. Verify user ID exists in profiles
2. Query investor_positions for user - check is_active
3. Verify RLS policies - try query as service_role
4. Check for date filter issues

**Root Causes:**
- RLS blocking read (auth context issue)
- Position is_active = false (should be true)
- Frontend filtering wrong dates

**Resolution:**
- Fix RLS policy or add service_role bypass
- Check position lifecycle - should be is_active for valid positions
- Review frontend filter logic

**Owner:** Frontend Engineer + Backend Engineer

---

### Scenario 5: Withdrawal Stuck in Pending

**Symptoms:** withdrawal_requests.status = 'PENDING' for > 24 hours

**Diagnosis Steps:**
1. Check withdrawal amount vs available balance
2. Verify KYC status in profiles
3. Check for admin approval queue
4. Review withdrawal_limits table

**Root Causes:**
- Amount exceeds available balance (expected - needs deposit)
- KYC not completed (expected - needs verification)
- Admin hasn't approved (process issue)
- Limit exceeded (business rule)

**Resolution:**
- If amount: Contact investor, suggest deposit
- If KYC: Trigger notification to complete
- If approval: Escalate to ops team
- If limit: Adjust limits or process manually

**Owner:** Operations + Backend

---

## D. Watch-Window Decision Rule

### 72-Hour Watch Window

| Hour | Milestone | Decision |
|------|-----------|----------|
| **H0** | Deploy | Start monitoring |
| **H1** | First transactions | Verify deposit/withdrawal flows |
| **H4** | First yield (if any) | Verify yield apply |
| **H12** | End of business day | Check AUM reconciliation |
| **H24** | Day 1 complete | All critical signals green? |
| **H48** | Day 2 complete | No drift, no stuck items |
| **H72** | End of window | Full validation pass |

### Decision Rules

| Condition | Action |
|-----------|--------|
| All critical signals green at H24 | ✅ Continue monitoring |
| Any T1-T4 trigger hit | 🔴 Immediate rollback |
| T5-T8 triggers hit | ⚠️ Throttle + investigate (1 hour max) |
| Unresolved at H72 | 🔴 Hold deployment, investigate |

### Escalation Path

| Level | Trigger | Response Time |
|-------|---------|---------------|
| **L1**: On-call Engineer | Any CRITICAL signal | 15 minutes |
| **L2**: Backend Lead | T1-T4 trigger | 30 minutes |
| **L3**: Engineering Manager | Rollback decision | 1 hour |
| **L4**: CTO | Data corruption confirmed | 2 hours |

---

## E. Owner/Action Mapping

| Action | Owner | Escalation |
|--------|-------|------------|
| Monitor void_transaction | Backend Engineer | L2 |
| Monitor yield_apply | Backend Engineer | L2 |
| Monitor AUM reconciliation | DevOps | L2 |
| Investigate stuck withdrawal | Operations | L1 |
| Review duplicate transactions | Backend Engineer | L2 |
| Execute rollback | DevOps + L3 | L3 |
| Communicate to stakeholders | L4 | N/A |

---

## F. Quick Reference Commands

```bash
# Check void transaction cascade
psql -c "SELECT action, entity, entity_id, new_values->>'fee_allocations_voided' as fee_voided FROM audit_log WHERE action = 'VOID' ORDER BY created_at DESC LIMIT 10"

# Check AUM drift
psql -c "SELECT check_aum_reconciliation()"

# Check duplicate transactions
psql -c "SELECT reference_id, COUNT(*) FROM transactions_v2 GROUP BY reference_id HAVING COUNT(*) > 1"

# Check stuck withdrawals
psql -c "SELECT id, status, created_at FROM withdrawal_requests WHERE status = 'PENDING' AND created_at < NOW() - INTERVAL '24 hours'"

# Check yield allocations
psql -c "SELECT yd.id, yd.period_end, COUNT(fa.id) as allocation_count FROM yield_distributions yd LEFT JOIN fee_allocations fa ON fa.distribution_id = yd.id WHERE yd.created_at > NOW() - INTERVAL '24 hours' GROUP BY yd.id"

# Check negative positions
psql -c "SELECT investor_id, fund_id, current_value FROM investor_positions WHERE current_value < 0"
```

---

## G. Summary

| Category | Count | Actions |
|----------|-------|---------|
| Critical Signals | 4 | Monitor continuously |
| Data Integrity | 4 | Hourly check |
| User-Facing | 4 | Daily check |
| Backend Health | 4 | Continuous |
| Rollback Triggers | 10 | 4 immediate, 6 gradual |
| Triage Scenarios | 5 | Documented playbook |

**Watch Window:** 72 hours  
**Decision:** Proceed to steady-state monitoring at H72 if no T1-T4 triggers hit