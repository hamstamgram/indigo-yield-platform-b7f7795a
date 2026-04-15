# Observability & Response Matrix

**Date:** 2026-04-14  
**Role:** Staff Reliability Engineer  
**Context:** Critical signal monitoring for financial backend

---

## A. Signal Matrix

### Core Financial Signals

| # | Signal | Source RPC | Type | Financial Impact |
|---|--------|-----------|------|------------------|
| S1 | AUM reconciliation | `check_aum_reconciliation()` | Position vs AUM drift |
| S2 | Yield conservation | `alert_on_yield_conservation_violation()` | Math error |
| S3 | Negative positions | Query: `investor_positions < 0` | CORRUPTION |
| S4 | Duplicate transactions | Query: duplicate reference_id | DUPLICATE |

### Yield Operation Signals

| # | Signal | Source | Type | Financial Impact |
|---|--------|--------|------|------------------|
| S5 | Yield apply failure | RPC error | Yield application |
| S6 | Yield void failure | RPC error | Void cascade |
| S7 | Zero allocations | allocation_count = 0 | Empty yield |
| S8 | Duplicate yield | yield_distributions dup | Idempotency |

### Concurrency Signals

| # | Signal | Source | Type | Impact |
|---|--------|--------|------|--------|
| S9 | Deadlock | "deadlock detected" in logs | Blocked operation |
| S10 | Long-running yield | duration > 60s | Performance |
| S11 | Concurrent yields | Multiple active | Conflict |

### Transaction Signals

| # | Signal | Source | Type | Financial Impact |
|---|--------|--------|------|------------------|
| S12 | Void cascade failure | cascade incomplete | Orphaned transactions |
| S13 | Failed transaction void | RPC error | Incorrect ledger |
| S14 | Unvoid failure | RPC error | Restore failure |

---

## B. Healthy Thresholds

| Signal | Healthy State | Query | Expected Result |
|--------|---------------|-------|----------------|
| S1 | drift = "0.0000", is_valid = true | `check_aum_reconciliation()` | is_valid = true |
| S2 | 0 violations | `alert_on_yield_conservation_violation()` | 0 rows |
| S3 | 0 rows | `SELECT * FROM investor_positions WHERE current_value < 0` | 0 rows |
| S4 | 0 duplicates | GROUP BY reference_id HAVING COUNT > 1 | 0 rows |
| S5 | Success | RPC returns success=true | No error |
| S6 | Success | RPC returns success=true | No error |
| S7 | allocations > 0 for non-zero yield | yield_distributions WHERE gross > 0 | allocations > 0 |
| S8 | 0 duplicates | yield_distributions GROUP BY | 0 rows |
| S9 | No deadlocks | pg_stat_activity | No "deadlock detected" |
| S10 | < 30 seconds | query_duration | < 30s |
| S11 | Single active yield | pg_stat_activity | 1 active |
| S12 | All cascaded | voided_count > 0 | Complete |
| S13 | Success | RPC | No error |
| S14 | Success | RPC | No error |

---

## C. Anomaly Thresholds

| Signal | Anomaly Condition | Severity | Indication |
|--------|-----------------|----------|-----------|
| S1 | is_valid = false | CRITICAL | AUM drift detected |
| S1 | drift > 0.01 | CRITICAL | Position drift exceeds tolerance |
| S2 | Any row returned | HIGH | Yield math violation |
| S3 | Any row returned | CRITICAL | Negative balance |
| S4 | Any row returned | CRITICAL | Duplicate transaction |
| S5 | error.message exists | HIGH | Yield apply failed |
| S6 | error.message exists | HIGH | Yield void failed |
| S7 | allocations = 0 AND gross > 0 | HIGH | Empty yield distribution |
| S8 | COUNT > 1 | HIGH | Duplicate yield |
| S9 | "deadlock detected" | HIGH | Deadlock |
| S10 | duration > 60s | MEDIUM | Timeout risk |
| S11 | COUNT > 1 | HIGH | Concurrent conflict |
| S12 | voided_count = 0 | HIGH | Incomplete cascade |
| S13 | error.message exists | HIGH | Void failed |
| S14 | error.message exists | HIGH | Unvoid failed |

---

## D. Operator Response

### Signal S1: AUM Reconciliation Failure

| Condition | is_valid = false OR drift > 0.01 |
|-----------|-----------------------------------|
| **Action** | PAGE ON-CALL IMMEDIATELY |
| **Response Time** | < 15 minutes |
| **Investigation** | 1. Run diagnostic: `check_aum_reconciliation(:fund_id)` |
| | 2. Identify last operation: deposit/withdrawal/yield/void |
| | 3. Fix source data or rollback |
| **Rollback** | If unfixable, rollback last operation |

### Signal S2: Yield Conservation Violation

| Condition | Any violation returned |
|-----------|----------------------|
| **Action** | ALERT (page if P1) |
| **Response Time** | < 30 minutes |
| **Investigation** | 1. Compare gross vs (net + fees + ib + dust) |
| | 2. Check allocation math |
| | 3. Document in incident |
| **Rollback** | May require manual correction |

### Signal S3: Negative Position

| Condition | current_value < 0 |
|-----------|------------------|
| **Action** | PAGE CRITICAL IMMEDIATELY |
| **Response Time** | < 5 minutes |
| **Investigation** | 1. Identify investor/fund |
| | 2. Check transaction history |
| | 3. Void incorrect transactions |
| **Rollback** | Restore to 0 or positive |

### Signal S4: Duplicate Transactions

| Condition | COUNT > 1 for same reference_id |
|-----------|--------------------------|
| **Action** | ALERT (page if >10) |
| **Response Time** | < 1 hour |
| **Investigation** | 1. Identify duplicate txs |
| | 2. Void duplicate |
| | 3. Verify idempotency |
| **Rollback** | Void duplicate, keep original |

### Signal S5: Yield Apply Failure

| Condition | RPC returns error |
|-----------|------------------|
| **Action** | OBSERVE + LOG |
| **Response Time** | Next business day review |
| **Investigation** | 1. Parse error message |
| | 2. Check idempotency |
| | 3. Retry if benign |
| **Rollback** | Not applicable (didn't apply) |

### Signal S6: Yield Void Failure

| Condition | RPC returns error |
|-----------|------------------|
| **Action** | ALERT |
| **Response Time** | < 1 hour |
| **Investigation** | 1. Parse error |
| | 2. Check cascade status |
| | 3. Retry or manual void |
| **Rollback** | Manual cascade if needed |

### Signal S7: Zero Allocations

| Condition | allocations = 0 AND gross > 0 |
|-----------|------------------------|
| **Action** | OBSERVE |
| **Response Time** | EOD review |
| **Investigation** | 1. Check investor_positions |
| | 2. Verify pre_day_aum calculation |
| | 3. Accept if legitimate (new fund) |
| **Rollback** | Not applicable |

### Signal S8: Duplicate Yield

| Condition | COUNT > 1 for fund/period |
|-----------|-------------------------|
| **Action** | OBSERVE (was this intentional?) |
| **Response Time** | EOD review |
| **Investigation** | 1. Check idempotency |
| | 2. Void if unintended |
| **Rollback** | void_yield_distribution |

### Signal S9: Deadlock

| Condition | "deadlock detected" |
|-----------|--------------------|
| **Action** | ALERT |
| **Response Time** | < 30 minutes |
| **Investigation** | 1. Check pg_stat_activity |
| | 2. Identify conflicting ops |
| | 3. Add retry with backoff |
| **Rollback** | Retry after wait |

### Signal S10: Long-Running Yield

| Condition | duration > 60s |
|-----------|-----------------|
| **Action** | OBSERVE + MONITOR |
| **Response Time** | N/A |
| **Investigation** | 1. Check fund size |
| | 2. Add to performance backlog |
| | 3. Optimize if critical |
| **Rollback** | Not applicable |

### Signal S11: Concurrent Yields

| Condition | Multiple active |
|-----------|--------------|
| **Action** | OBSERVE (should serialize) |
| **Response Time** | N/A |
| **Investigation** | 1. Verify idempotency |
| | 2. Ensure only one runs |
| **Rollback** | Second should fail |

### Signal S12: Void Cascade Failure

| Condition | voided_count = 0 on void |
|-----------|------------------------|
| **Action** | ALERT |
| **Response Time** | < 1 hour |
| **Investigation** | 1. Check allocations |
| | 2. Manual cascade if needed |
| | 3. Verify fee/ib allocations |
| **Rollback** | Manual cascade |

### Signal S13: Transaction Void Failure

| Condition | RPC error |
|-----------|----------|
| **Action** | OBSERVE |
| **Response Time** | EOD review |
| **Investigation** | Parse error, retry |
| **Rollback** | N/A |

### Signal S14: Unvoid Failure

| Condition | RPC error |
|-----------|----------|
| **Action** | OBSERVE |
| **Response Time** | EOD review |
| **Investigate** | Parse error, retry |
| **Rollback** | N/A |

---

## E. Rollback-Trigger Conditions

### CRITICAL: Immediate Rollback Required

| Condition | Trigger Action |
|-----------|--------------|
| is_valid = false in AUM check | **ROLLBACK** - Last operation |
| Any negative position | **ROLLBACK** - Void transactions |
| Any duplicate transaction with different amounts | **ROLLBACK** - Void duplicate |
| Duplicate yield applied (not idempotency) | **ROLLBACK** - void_yield_distribution |

### HIGH: Investigate Then Act

| Condition | Action |
|-----------|--------|
| Conservation violation > 1.00 | INVESTIGATE, may rollback |
| >10 duplicates | INVESTIGATE + rollback duplicates |
| Incomplete void cascade | Rollback + manual cascade |

### MEDIUM: Monitor and Fix

| Condition | Action |
|-----------|--------|
| Deadlock (once) | Observe + retry |
| Long-running yield | Document + optimize |
| Concurrent yields | Verify idempotency |

---

## F. Monitoring Schedule

### Real-Time (Continuous)

| Signal | Method |
|--------|--------|
| S1: AUM | `check_aum_reconciliation()` every hour |
| S2: Conservation | Alert on any violation |
| S3: Negative positions | Daily query |
| S9: Deadlock | Log monitoring |

### Per-Operation Checks

| Operation | Check |
|-----------|-------|
| After yield apply | S1, S2, S5, S7 |
| After yield void | S1, S2, S6, S12 |
| After transaction void | S1, S13 |
| After deposit/withdrawal | S1, S3, S4 |

### Daily (EOD)

All signals S1-S14 reviewed

---

## G. Summary

### Classification Distribution

| Classification | Count | Signals |
|-----------------|-------|---------|
| **PAGE** (critical) | 3 | S1, S3, S3-anomaly |
| **ALERT** | 6 | S2, S4, S6, S9, S11, S12 |
| **OBSERVE** | 5 | S5, S7, S8, S10, S13, S14 |
| **ROLLBACK TRIGGER** | 4 | S1-fail, S3, S4, S8-fail |

### Response Matrix

| Severity | Response Time | Examples |
|----------|--------------|----------|
| CRITICAL | < 15 min | S1 drift, S3 negative |
| HIGH | < 30 min | S2 conservation, S9 deadlock |
| MEDIUM | < 1 hour | S12 cascade failure |
| LOW | EOD | S5, S10, S13 |

**Monitoring Status:** ✅ **ADEQUATE** - All critical signals have defined thresholds and response paths.