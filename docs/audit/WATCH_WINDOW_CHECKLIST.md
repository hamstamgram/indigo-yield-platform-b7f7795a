# Phase 4 Watch Window Monitoring Checklist

**Watch Period:** 2026-04-14 14:30—16:30 UTC (2 hours)  
**Checkpoint Interval:** Every 30 minutes

---

## 30-Minute Checkpoints

### Checkpoint 1 (14:30—15:00 UTC) — Initial Stability

**Run these queries against production:**

```sql
-- Q1: Check for void/unvoid errors
SELECT COUNT(*) as void_operations
FROM audit_log
WHERE action IN ('void_transaction', 'unvoid_transaction')
AND created_at > NOW() - INTERVAL '30 minutes';

-- Q2: Verify lock functions are being called
SELECT COUNT(*) as lock_calls
FROM audit_log
WHERE action LIKE '%_with_lock%'
AND created_at > NOW() - INTERVAL '30 minutes';

-- Q3: Check for any transaction rollbacks
SELECT COUNT(*) as rollbacks
FROM audit_log
WHERE action = 'transaction_rollback'
AND created_at > NOW() - INTERVAL '30 minutes';

-- Q4: Verify yield v5 is being applied (no v3 fallback)
SELECT COUNT(*) as yield_applications,
       COUNT(CASE WHEN action = 'apply_yield_distribution_v5_with_lock' THEN 1 END) as v5_lock_calls
FROM audit_log
WHERE action LIKE '%yield%distribution%'
AND created_at > NOW() - INTERVAL '30 minutes';
```

**Success Criteria:**
- [ ] void_operations < 10 (normal traffic)
- [ ] lock_calls > 0 (functions are in use)
- [ ] rollbacks = 0 (no cascade failures)
- [ ] yield_applications all use v5 (no v3 fallback)

---

### Checkpoint 2 (15:00—15:30 UTC) — Continued Operation

**Run same Q1-Q4 queries, verify:**
- [ ] No spike in void_operations (no cascade failures)
- [ ] No transaction_rollbacks
- [ ] lock_calls continue to increase
- [ ] yield_applications all v5

---

### Checkpoint 3 (15:30—16:00 UTC) — Extended Stability

**Run Q1-Q4 again, plus:**

```sql
-- Q5: Check PostgreSQL lock waits (advisory locks)
SELECT COUNT(*) as active_locks
FROM pg_locks
WHERE locktype = 'advisory';

-- Q6: Check for any long-running queries
SELECT COUNT(*) as long_queries
FROM pg_stat_statements
WHERE mean_exec_time > 5000 -- 5 seconds
AND query LIKE '%void%' OR query LIKE '%yield%';
```

**Success Criteria:**
- [ ] Checkpoints 1-2 metrics stable
- [ ] active_locks < 10 (no deadlock accumulation)
- [ ] long_queries = 0 (no lock contention issues)

---

### Checkpoint 4 (16:00—16:30 UTC) — Final Verification

**Run Q1-Q6 one more time:**
- [ ] All metrics from Checkpoints 1-3 stable
- [ ] No new errors in audit_log
- [ ] No spike in query execution times

---

## ROLLBACK TRIGGERS (Stop Immediately and Rollback)

| Trigger | Action | Command |
|---------|--------|---------|
| Any void operation fails | ROLLBACK NOW | `supabase migration down --linked --last 4` |
| Lock deadlock detected | ROLLBACK NOW | `supabase migration down --linked --last 4` |
| yield_distributions stuck (0 applications in 15 min) | ROLLBACK NOW | `supabase migration down --linked --last 4` |
| Advisory lock timeout (>10s) | ROLLBACK NOW | `supabase migration down --linked --last 4` |
| AUM/position mismatch > 5% of funds | INVESTIGATE first, escalate |  |

---

## Watch Window Status

- [ ] Checkpoint 1: PASS / FAIL
- [ ] Checkpoint 2: PASS / FAIL
- [ ] Checkpoint 3: PASS / FAIL
- [ ] Checkpoint 4: PASS / FAIL

**Final Assessment:**

```
✅ STABLE — No issues found, Phase 4 deployment is permanent
⚠️  ISSUES FOUND — Document and escalate (Level 1/2 OK, Level 3 requires rollback)
❌ CRITICAL FAILURE — Execute rollback immediately
```

---

## Post-Watch-Window (16:30 UTC)

If STABLE:
1. Update PHASE_4_DEPLOYMENT_COMPLETED.md with final sign-off
2. Schedule Phase 4D planning for 2+ weeks later
3. Commit monitoring results to git

If ISSUES or ROLLBACK:
1. Document root cause
2. Fix issue
3. Reschedule Phase 4 deployment after fix is verified

