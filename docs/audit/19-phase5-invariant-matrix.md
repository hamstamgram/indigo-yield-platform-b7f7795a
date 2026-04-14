# Phase 5A: Invariant Test Layer

**Phase:** 5A  
**Status:** Active  
**Last Updated:** 2026-04-14

---

## Overview

This document formalizes the core financial invariants into executable test artifacts. The goal is continuous proof of correctness, not redesign.

---

## Core Invariants Matrix

| # | Invariant | Definition | Tables Involved | Test Query | Edge Cases |
|---|----------|------------|---------------|-------------|-----------|
| 1 | **AUM = SUM(positions)** | fund_daily_aum.total_aum must equal SUM(investor_positions.current_value) for same fund/date | fund_daily_aum, investor_positions | `test_aum_positions_invariant()` | Stale dates, voided AUM |
| 2 | **Void Reversibility** | void + unvoid restores exact pre-void state | transactions_v2, investor_positions, fund_daily_aum | `test_void_reversibility()` | Partial cascade, yield cascade |
| 3 | **Position ≥ 0 (or allowed)** | current_value ≥ 0 for non-negative positions (some funds allow negative) | investor_positions | `test_position_non_negative()` | IB accounts, fees accounts |
| 4 | **One Position per (investor, fund)** | Exactly one row per composite key | investor_positions | `test_position_uniqueness()` | Deleted duplicates |
| 5 | **No Orphan References** | All positions reference valid funds/investors | investor_positions, funds, profiles | `test_no_orphan_positions()` | Deleted funds |
| 6 | **Reporting = Non-voided** | Reporting views exclude voided transactions | transactions_v2, all reporting views | `test_reporting_consistency()` | Historical dates |
| 7 | **Yield v5 is sole path** | Only yield_distribution_v5 triggers yield writes | yield_distributions triggers | `test_yield_v5_only()` | Legacy yield paths |
| 8 | **Ledger-driven Positions** | Positions derived only from transactions_v2 | investor_positions, transactions_v2 | `test_ledger_driven_positions()` | Direct position edits |

---

## Invariant 1: AUM = SUM(positions)

### Definition
```sql
fund_daily_aum.total_aum = SUM(investor_positions.current_value)
  WHERE fund_daily_aum.fund_id = investor_positions.fund_id
  AND fund_daily_aum.aum_date = CURRENT_DATE
  AND fund_daily_aum.purpose = 'transaction'
  AND fund_daily_aum.is_voided = false
```

### Canonical Query
```sql
SELECT fda.fund_id, fda.total_aum AS recorded_aum, 
       pos.position_sum AS calculated_aum,
       fda.total_aum - pos.position_sum AS drift
FROM fund_daily_aum fda
JOIN (
  SELECT fund_id, SUM(current_value) AS position_sum
  FROM investor_positions
  GROUP BY fund_id
) pos ON fda.fund_id = pos.fund_id
WHERE fda.aum_date = CURRENT_DATE 
  AND fda.purpose = 'transaction'
  AND fda.is_voided = false
  AND ABS(fda.total_aum - pos.position_sum) > 0.01;
```

### Pass/Fail Criteria
- **PASS:** 0 rows returned
- **FAIL:** Any drift > 0.01

---

## Invariant 2: Void Reversibility

### Definition
For any transaction (tx) that is voided then unvoided:
- investor_positions.current_value returns to pre-void value
- fund_daily_aum reflects the restoration
- audit_log shows the cascade events

### Canonical Query
```sql
-- Find transactions that were voided then unvoided
SELECT tx.id, tx.investor_id, tx.fund_id, tx.amount,
       ip_before.current_value AS position_before_void,
       ip_after.current_value AS position_after_unvoid
FROM transactions_v2 tx
JOIN investor_positions ip_before ON tx.investor_id = ip_before.investor_id AND tx.fund_id = ip_before.fund_id
JOIN LATERAL (
  SELECT current_value FROM investor_positions 
  WHERE investor_id = tx.investor_id AND fund_id = tx.fund_id
) ip_after ON true
WHERE tx.is_voided = false
  AND EXISTS (SELECT 1 FROM audit_log WHERE entity = 'transactions_v2' AND entity_id = tx.id AND action LIKE '%void%');
```

### Pass/Fail Criteria
- **PASS:** position_after_unvoid = position_before_void (within 0.01)
- **FAIL:** Any drift detected

---

## Invariant 3: Position Non-Negativity

### Definition
For most accounts: current_value ≥ 0
Exceptions: Some funds may allow negative (verify fund_class)

### Canonical Query
```sql
SELECT ip.investor_id, ip.fund_id, ip.current_value
FROM investor_positions ip
LEFT JOIN funds f ON ip.fund_id = f.id
WHERE ip.current_value < 0
  AND (f.fund_class IS NULL OR f.fund_class NOT LIKE '%allow_negative%');
```

### Pass/Fail Criteria
- **PASS:** 0 rows (or only allowed negative funds)
- **FAIL:** Any unauthorized negative positions

---

## Invariant 4: Position Uniqueness

### Definition
Exactly one position per (investor_id, fund_id)

### Canonical Query
```sql
SELECT investor_id, fund_id, COUNT(*) AS position_count
FROM investor_positions
GROUP BY investor_id, fund_id
HAVING COUNT(*) > 1;
```

### Pass/Fail Criteria
- **PASS:** 0 rows
- **FAIL:** Any duplicates

---

## Invariant 5: No Orphan References

### Definition
All investor_positions reference valid funds and profiles

### Canonical Query
```sql
SELECT 'orphans' AS issue_type, COUNT(*) AS count
FROM investor_positions ip
LEFT JOIN funds f ON ip.fund_id = f.id
WHERE f.id IS NULL
UNION ALL
SELECT 'orphan_investors', COUNT(*)
FROM investor_positions ip
LEFT JOIN profiles p ON ip.investor_id = p.id
WHERE p.id IS NULL;
```

### Pass/Fail Criteria
- **PASS:** 0 orphans
- **FAIL:** Any orphan references

---

## Invariant 6: Reporting Consistency

### Definition
All reporting views reflect non-voided state only

### Canonical Query
```sql
-- Check: reporting position calculation excludes voided transactions
SELECT ip.investor_id, ip.fund_id, ip.current_value AS position_value,
       (SELECT COALESCE(SUM(amount), 0) FROM transactions_v2 t 
        WHERE t.investor_id = ip.investor_id AND t.fund_id = ip.fund_id AND NOT t.is_voided) AS ledger_value
FROM investor_positions ip
WHERE ABS(ip.current_value - (
  SELECT COALESCE(SUM(amount), 0) FROM transactions_v2 t 
  WHERE t.investor_id = ip.investor_id AND t.fund_id = ip.fund_id AND NOT t.is_voided
)) > 0.01;
```

### Pass/Fail Criteria
- **PASS:** Position = ledger sum (non-voided only)
- **FAIL:** Any drift

---

## Invariant 7: Yield v5 is Sole Active Path

### Definition
Only yield_distribution_v5 should create yield-related records

### Canonical Query
```sql
SELECT DISTINCT td.source
FROM yield_distributions td
WHERE td.created_at > CURRENT_DATE - INTERVAL '7 days';
```

### Pass/Fail Criteria
- **PASS:** Only 'yield_distribution_v5' or expected sources
- **FAIL:** Any legacy yield paths active

---

## Invariant 8: Ledger-Driven Positions

### Definition
Position values are derived from transactions_v2, not direct edits

### Canonical Query
```sql
-- Check: latest position update has corresponding transaction
SELECT ip.investor_id, ip.fund_id, ip.updated_at AS position_updated,
       (SELECT MAX(tx_date) FROM transactions_v2 t 
        WHERE t.investor_id = ip.investor_id AND t.fund_id = ip.fund_id AND NOT t.is_voided) AS last_tx_date
FROM investor_positions ip
WHERE ip.updated_at > (SELECT MAX(tx_date) FROM transactions_v2 t 
                       WHERE t.investor_id = ip.investor_id AND t.fund_id = ip.fund_id AND NOT t.is_voided)
  AND NOT EXISTS (SELECT 1 FROM audit_log al 
                WHERE al.entity = 'investor_positions' AND al.meta->>'investor_id' = ip.investor_id::text 
                AND al.meta->>'fund_id' = ip.fund_id::text AND al.action = 'REPAIR_ALL_POSITIONS');
```

### Pass/Fail Criteria
- **PASS:** Positions updated after corresponding transactions
- **FAIL:** Position updated without recent transaction (unless repair)

---

## Test Execution Batches

### Batch 5A-1 (First)
- Invariant 1: AUM = SUM(positions)

### Batch 5A-2
- Invariant 2: Void reversibility

### Batch 5A-3  
- Invariant 3: Position non-negativity
- Invariant 4: Position uniqueness

### Batch 5A-4
- Invariant 5: No orphan references
- Invariant 6: Reporting consistency
- Invariant 7: Yield v5 sole path
- Invariant 8: Ledger-driven positions

---

## Document History

| Date | Change | Author |
|------|--------|--------|
| 2026-04-14 | Initial invariant matrix | Phase 5 Execution |