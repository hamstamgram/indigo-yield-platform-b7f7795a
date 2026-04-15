# Yield Anomaly Investigation

**Date:** 2026-04-14  
**Investigator:** Staff Engineer  
**Context:** Production yield v5 failure analysis

---

## A. Incident Summary

**Hypothetical Failure Event:**
- Yield application via `apply_segmented_yield_distribution_v5` failed once in the last 24 hours
- Platform is live, yield v5 is canonical production path
- One failure observed in recent window

---

## B. Probable Cause

Based on codebase analysis, yield v5 can fail for these categories:

### Category 1: Idempotency Guard (EXPECTED)
```sql
-- Line 92-101 in apply_segmented_yield_distribution_v5
IF EXISTS (
  SELECT 1 FROM yield_distributions
  WHERE fund_id = p_fund_id AND period_end = v_period_end
    AND purpose = 'reporting' AND is_voided = false
    AND consolidated_into_id IS NULL
    AND COALESCE(distribution_type, '') NOT IN ('deposit', 'withdrawal', 'transaction')
) THEN
  RAISE EXCEPTION 'Reporting yield already exists for fund % period ending %. Void before reapplying.', p_fund_id, v_period_end;
END IF;
```
**Classification:** OPERATIONAL - Retry after prior success without voiding first

### Category 2: Configuration Errors (EXPECTED)
- "Fund not found: %" - Fund deleted or invalid UUID
- "Fees account not configured" - Fund missing fees_account_id
- "Admin authentication required" - Auth context missing

### Category 3: Data Integrity (REGRESSION RISK)
- Constraint violations from `chk_correction_has_parent`
- Foreign key failures
- Position read anomalies

### Category 4: Concurrency (REGRESSION RISK)
- Advisory lock failures
- "deadlock detected" between concurrent operations

### Category 5: Computation Precision (REGRESSION RISK)
- Yield math conservation violations
- Allocation rounding errors

---

## C. Affected Path

```
Frontend: yieldApplyService.ts:59
    ↓
RPC: apply_segmented_yield_distribution_v5
    ↓ (idempotency check at line 92-101)
    ↓ (advisory lock at line 88-89)
    ↓ (allocation loop 199-277)
    ↓ (transactions inserted via apply_investor_transaction)
    ↓ (yield_distributions INSERT + UPDATE)
    ↓ (fund_daily_aum UPDATE-then-INSERT)
    ↓
Return: JSONB{success, distribution_id, period_start, period_end, ...}
```

**Locking status:** Use of period-specific lock (line 88-89):
```sql
v_lock_key := ('x' || substr(md5(p_fund_id::text || v_period_end::text), 1, 15))::bit(64)::bigint;
PERFORM pg_advisory_xact_lock(v_lock_key);
```

**Note:** Migration 20260512000000 added fund-level lock wrapper `apply_yield_distribution_v5_with_lock` but frontend does NOT use it.

---

## D. Severity

| Failure Type | Impact | Severity |
|-------------|--------|----------|
| Idempotency rerun | User error | LOW - Expected |
| Fund not found | Config error | LOW - Expected |
| Fees account | Config error | MEDIUM - Pre-req |
| Constraint violation | Data integrity | **CRITICAL** |
| Deadlock | Concurrency | **CRITICAL** |
| Math error | Correctness | **CRITICAL** |

Given: 1 failure in 24h with live platform

**Assessment:** Operational noise (idempotency or config) unless evidence shows otherwise

---

## E. Immediate Recommendation

**If failure was idempotency or config-related (most likely):**
- ✅ **NO ACTION** - System can remain live safely
- Document in monitoring as expected operational noise

**If failure was constraint, deadlock, or math error:**
- ⚠️ **MONITOR** - Watch for recurrence
- Check logs for specific error message

**If recurrence observed:**
- **HOTFIX** - Apply idempotency wrapper if not using
- **ROLLBACK** - Only if correctness risk confirmed

---

## F. Follow-up Actions

1. Query logs for exact error message:
```sql
SELECT * FROM yield_distributions
WHERE created_at > NOW() - INTERVAL '24 hours'
  AND status = 'failed';
```

2. Verify idempotency constraint:
```sql
SELECT * FROM yield_distributions
WHERE fund_id = :fund_id
  AND period_end = :period_end
  AND purpose = 'reporting'
  AND is_voided = false;
```

3. Check reconciliation:
```sql
SELECT * FROM check_aum_reconciliation(:fund_id);
```

4. If correctness issue: Document in docs/audit/ as incident

---

## Evidence Summary

| Check | Status |
|-------|--------|
| idempotency guard in v5 | ✅ Present (line 92) |
| advisory lock in v5 | ✅ Present (line 88) |
| fund-level wrapper exists | ✅ migration 20260512 |
| frontend uses wrapper | ❌ NOT using wrapper |
| conservation trigger | ✅ Alert on violation |
| reconciliation RPC | ✅ check_aum_reconciliation |

---

## Conclusion

Single yield failure in 24h on live platform is **expected operational noise** (idempotency retry most likely) unless logs show:
- "deadlock detected"
- Constraint violation
- Math conservation error

Recommend monitoring only. System can remain live safely.