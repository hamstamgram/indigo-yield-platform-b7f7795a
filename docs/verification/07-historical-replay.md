# Historical Replay & Data Recovery Strategy

**Date:** 2026-04-14  
**Status:** DOCUMENTED  
**Context:** Production financial platform verification

---

## A. Historical Replay Strategy

### A.1 Position Rebuild

The canonical path to rebuild investor positions from the transaction ledger:

```sql
-- Rebuild individual position
SELECT * FROM rebuild_position_from_ledger(
  p_investor_id => 'uuid',
  p_fund_id => 'uuid'
);
```

**When to use:**
- Position detected as corrupted
- AUM/position drift > tolerance
- Manual correction required

**Evidence:** Function exists in DB schema

---

### A.2 Yield Recomputation

For yield distributions where conservation may be in doubt:

```sql
-- Recompute via yield reapplication (after voiding)
-- 1. Void existing: void_yield_distribution(p_distribution_id => 'uuid', ...)
-- 2. Reapply: apply_segmented_yield_distribution_v5(...)
```

**Caution:** Always void before reapplying - idempotency guard prevents duplicate yield in same period.

---

### A.3 Full Ledger Replay (Emergency)

For catastrophic recovery only:

```
NOT AVAILABLE IN PRODUCTION - Would cause data corruption
Use only in consultation with senior engineer
```

---

## B. Data Recovery Procedures

### B.1 Transaction-Level Recovery

| Scenario | Recovery RPC | Evidence |
|----------|-------------|----------|
| Wrong amount | `edit_transaction()` | Within edit window |
| Full reversal | `void_transaction()` | Full cascade |
| Restore | `unvoid_transaction()` | Manual yields needed |

### B.2 Yield-Level Recovery

| Scenario | Recovery RPC | Evidence |
|----------|-------------|----------|
| Wrong allocation | `void_yield_distribution()` | Cascades all |
| Reapply | `apply_segmented_yield_distribution_v5()` | Idempotency check |

### B.3 Position Drift

| Check | RPC | Threshold |
|-------|-----|----------|
| AUM drift | `check_aum_reconciliation()` | > 0.01% |
| Position variance | `get_position_reconciliation()` | Any |

---

## C. Rollback Commands Reference

### Yield Void
```sql
SELECT * FROM void_yield_distribution(
  p_distribution_id => 'uuid',
  p_admin_id => 'uuid',
  p_reason => 'Recovery: description',
  p_void_crystals => false
);
```

### Transaction Void
```sql
SELECT * FROM void_transaction(
  p_transaction_id => 'uuid',
  p_admin_id => 'uuid',
  p_reason => 'Recovery: description'
);
```

---

## D. Verification Queries

### Post-Recovery Verification
```sql
-- AUM reconciliation
SELECT * FROM check_aum_reconciliation(CURRENT_DATE, NULL, 0.01);

-- Position health
SELECT * FROM v_fund_aum_position_health;

-- Yield conservation
-- (Manual check: gross_yield = net + fees + ib + dust)
```

---

## E. Emergency Contacts

| Role | Contact |
|------|--------|
| On-Call | Page via Supabase |
| Incident Channel | #incidents (Slack) |
| Documentation | docs/audit/ |

---

## F. Assessment

| Category | Status |
|----------|--------|
| Position rebuild RPC | ✅ Available |
| Yield recompute path | ✅ Available |
| Recovery procedures | ✅ Documented |
| Emergency contacts | ✅ Documented |

**Status:** ✅ HISTORICAL REPLAY STRATEGY DOCUMENTED

(End of file)