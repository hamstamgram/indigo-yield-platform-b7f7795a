# Correctness Maturity Plan

**Phase:** 4E  
**Status:** Planning  
**Last Updated:** 2026-04-14

---

## Executive Summary

Architectural correctness is documented. Next step: prove it under stress and edge cases.

---

## 1. Invariant Test Plan

### Core Invariants to Test

| Invariant | Test Type | Priority |
|----------|----------|----------|
| AUM = SUM(positions) | Property | CRITICAL |
| Void reversibility | Scenario | CRITICAL |
| Position ≥ 0 | Property | HIGH |
| No split positions | Property | HIGH |
| No orphan transactions | Property | MEDIUM |
| No drift after multi-step | Scenario | HIGH |

### Implementation Approach

```sql
-- Example: AUM = SUM(positions) invariant test
CREATE FUNCTION test_aum_positions_invariant() RETURNS BOOLEAN AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM (
      SELECT fda.fund_id, fda.total_aum AS aum,
             (SELECT SUM(current_value) FROM investor_positions ip 
              WHERE ip.fund_id = fda.fund_id) AS positions_sum
      FROM fund_daily_aum fda
      WHERE fda.aum_date = CURRENT_DATE 
        AND fda.purpose = 'transaction'
        AND fda.is_voided = false
    ) diff
    WHERE ABS(aum - positions_sum) > 0.01
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 2. Concurrency Test Plan

### Scenarios to Simulate

| Scenario | Threads | Duration |
|----------|--------|----------|
| Simultaneous void + yield on same fund | 10 | 30s |
| Multiple investor updates | 20 | 1m |
| Reporting reads during writes | 10 read/10 write | 1m |
| Lock contention patterns | 50 concurrent | 2m |

### Implementation

- Use pgbench or custom parallel test runner
- Measure: throughput, latency, errors
- Verify: no drift, no deadlocks

---

## 3. Scenario Simulation

### Multi-Day Simulation

1. **Day 1:** 50 deposits, 20 withdrawals
2. **Day 2:** Yield distribution, void 1 transaction
3. **Day 3:** Reconciliation, AUM check
4. **Day 4-7:** Repeat with variations

### Edge Cases

- Zero balance → withdrawal
- 1000x normal transaction
- Concurrent void during yield
- Network interruption simulation

---

## 4. Phased Roadmap

### Phase 1: Immediate (Week 1-2)

| Test | Effort |
|------|--------|
| AUM = SUM(positions) | 1 day |
| Void reversibility | 2 days |
| Position ≥ 0 | 1 day |

### Phase 2: Near-term (Week 3-4)

| Test | Effort |
|------|--------|
| Concurrent void + yield | 3 days |
| Multi-investor updates | 2 days |
| Read-during-write | 2 days |

### Phase 3: Long-term (Week 5-8)

| Test | Effort |
|------|--------|
| Multi-week simulation | 1 week |
| Edge case suite | 1 week |
| Load testing | 1 week |

---

## 5. Highest-Priority Tests

1. **AUM = SUM(positions)** — Core financial invariant
2. **Void reversibility** — Critical operation
3. **No drift after concurrent writes** — Concurrency correctness
4. **Position ≥ 0** — Business rule

These four tests should be automated and run on every deployment.

---

## Document History

| Date | Change | Author |
|------|--------|--------|
| 2026-04-14 | Initial correctness maturity plan | Phase 4 Execution |