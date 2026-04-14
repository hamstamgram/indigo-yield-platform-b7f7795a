# Phase 5C: Concurrency Test Matrix

**Phase:** 5C  
**Status:** Active  
**Last Updated:** 2026-04-14

---

## Concurrency Test Matrix

### High-Risk Concurrent Operations

| Scenario | Operations | Risk Level | Expected Behavior |
|----------|-----------|----------|---------------|
| **Simultaneous deposits** | Multiple DEPOSIT → same fund | MEDIUM | Last writer wins, total = sum |
| **Void + yield same fund** | VOID + YIELD | HIGH | Serialization required |
| **Multiple investors same fund** | N x DEPOSIT/WITHDRAWAL | LOW | Additive, no conflicts |
| **Reporting read during write** | SELECT + INSERT/UPDATE | LOW | Consistent reads |
| **Withdrawal + void** | WITHDRAWAL + VOID | HIGH | Proper order required |

---

## Test Priority Order

### Batch 5C-1: Design Matrix (Document)

### Batch 5C-2: Multi-writer Same Fund
- Test: Concurrent deposits to same fund
- Expected: All transactions recorded, positions recalculated

### Batch 5C-3: Void + Yield Contention
- Test: Void and yield distribution on same fund
- Expected: One waits or serialization error

### Batch 5C-4: Read-During-Write
- Test: Reporting query while transactions writing
- Expected: Consistent reads

---

## Implementation Approach

Use advisory locks already in place:
- `SELECT pg_advisory_xact_lock('fund_lock'::regclass::oid, fund_id)`
- Lock prevents concurrent writes at application level

---

## Document History

| Date | Change | Author |
|------|--------|--------|
| 2026-04-14 | Initial concurrency matrix | Phase 5 Execution |