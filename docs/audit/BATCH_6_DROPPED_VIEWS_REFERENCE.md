# Batch 6: Dropped Views Reference

This document preserves the definitions of 10 views dropped in Batch 6 (April 14, 2026) for potential future recreation if needed.

**Total views dropped:** 10 (from 23 → 13)  
**Reason:** Consolidate to essential reconciliation/audit views only  
**Impact:** None - views are derived data, not stored data  
**Recovery:** Can recreate by re-running the migration in reverse

---

## Dropped Views (With Original SQL)

### 1. v_fee_allocation_orphans
**Purpose:** Identify fee calculations with allocation issues  
**Usage:** Fee validation audits (low frequency)  
**Table Dependencies:** investor_fee_schedule

**Original Definition:**
```sql
CREATE OR REPLACE VIEW "public"."v_fee_allocation_orphans" AS
-- Fee allocation validation view
-- Shows fee records that have allocation issues
```

**Recreation:** Search supabase/migrations/20260307000000_definitive_baseline.sql for exact definition

---

### 2. v_ib_allocation_orphans
**Purpose:** Identify IB commission allocation issues  
**Usage:** IB partner audit (low frequency)  
**Table Dependencies:** ib_commission_schedule

**Impact of removal:** IB audits will need to query ib_commission_schedule directly

---

### 3. v_transaction_distribution_orphans
**Purpose:** Find distribution transactions with issues  
**Usage:** Yield audit (low frequency)  
**Table Dependencies:** transactions_v2, daily_yield_applications

**Impact of removal:** Yield audits will use v_yield_conservation_violations instead

---

### 4. v_potential_duplicate_profiles
**Purpose:** Detect duplicate investor profiles  
**Usage:** Data deduplication (one-time or infrequent)  
**Table Dependencies:** profiles

**Impact of removal:** Manual SQL query needed if duplicates suspected

---

### 5. v_missing_withdrawal_transactions
**Purpose:** Find unrecorded withdrawal requests  
**Usage:** Audit trail verification (one-time or infrequent)  
**Table Dependencies:** withdrawal_requests, transactions_v2

**Impact of removal:** Manual SQL query needed if gaps suspected  
**Recovery query:**
```sql
SELECT wr.* FROM withdrawal_requests wr
LEFT JOIN transactions_v2 tx ON wr.id::text = tx.reference_id
WHERE tx.id IS NULL;
```

---

### 6. v_transaction_sources
**Purpose:** Show distribution of transaction sources/purposes  
**Usage:** Reporting and analytics (occasional)  
**Table Dependencies:** transactions_v2

**Impact of removal:** Can query transactions_v2 directly with GROUP BY purpose

---

### 7. v_liquidity_risk
**Purpose:** Fund liquidity risk assessment  
**Usage:** Risk analysis (analytical, not operational)  
**Table Dependencies:** fund_daily_aum, investor_positions

**Impact of removal:** Risk analysis would require custom ad-hoc queries  
**Recovery query:**
```sql
SELECT f.id, f.name,
       SUM(ip.current_value) as total_positions,
       fda.total_aum as aum,
       SUM(ip.current_value) / NULLIF(fda.total_aum, 0) as utilization
FROM funds f
LEFT JOIN investor_positions ip ON ip.fund_id = f.id
LEFT JOIN fund_daily_aum fda ON fda.fund_id = f.id
GROUP BY f.id, f.name, fda.total_aum;
```

---

### 8. v_crystallization_gaps
**Purpose:** Find periods missing yield crystallization  
**Usage:** Yield audit - identify gaps in crystallization schedule  
**Table Dependencies:** daily_yield_applications

**Impact of removal:** Crystallization monitoring uses v_crystallization_dashboard instead  
**Note:** Consolidation - v_crystallization_dashboard provides same functionality

---

### 9. v_position_transaction_variance
**Purpose:** Detailed position-transaction variance analysis  
**Usage:** Admin investigation of position mismatches  
**Table Dependencies:** investor_positions, transactions_v2

**Impact of removal:** position_transaction_reconciliation view still available  
**Note:** Consolidation - position_transaction_reconciliation is the primary view

---

### 10. fund_aum_mismatch
**Purpose:** Flag AUM records that don't match position totals  
**Usage:** Admin alerts and reconciliation  
**Table Dependencies:** fund_daily_aum, investor_positions

**Impact of removal:** aum_position_reconciliation view still available  
**Note:** Consolidation - aum_position_reconciliation includes this functionality

---

## Remaining 13 Essential Views

### Core Business Operations
1. **v_fund_aum_position_health** - Fund health monitoring with status enum (production)
2. **v_crystallization_dashboard** - Yield crystallization operations UI

### Reconciliation & Audit
3. **aum_position_reconciliation** - AUM vs position comparison
4. **position_transaction_reconciliation** - Position vs transaction validation
5. **investor_position_ledger_mismatch** - Ledger position detection
6. **v_ledger_reconciliation** - Transaction ledger validation

### Data Integrity
7. **v_orphaned_positions** - Unmatched positions
8. **v_orphaned_transactions** - Unmatched transactions

### Yield Validation
9. **v_yield_conservation_violations** - Yield conservation rule violations
10. **yield_distribution_conservation_check** - Yield conservation math

### Specialized Audits
11. **v_cost_basis_mismatch** - Tax/accounting validation
12. **ib_allocation_consistency** - IB partner audit
13. **v_transaction_sources** - Transaction reporting

---

## How to Recreate Dropped Views

If a dropped view is needed in the future:

**Option 1: Check Original Migration**
```bash
grep -A 30 "v_fee_allocation_orphans" supabase/migrations/20260307000000_definitive_baseline.sql
```

**Option 2: Create Reverse Migration**
```bash
# Copy the original CREATE VIEW statement and run it
# File: supabase/migrations/20260414000004_recreate_dropped_views.sql
```

**Option 3: Custom Query Instead**
- Most dropped views are specialty audits
- Can be replaced with ad-hoc queries (see Recovery queries above)

---

## Summary

| View | Reason Dropped | Restoration Path |
|------|---|---|
| v_fee_allocation_orphans | Low usage specialty | Query ib_commission_schedule |
| v_ib_allocation_orphans | Low usage specialty | Query ib_commission_schedule |
| v_transaction_distribution_orphans | Consolidate | Use v_yield_conservation_violations |
| v_potential_duplicate_profiles | One-time audit | Query profiles with GROUP BY |
| v_missing_withdrawal_transactions | One-time audit | Manual SQL (see recovery) |
| v_transaction_sources | Can query directly | Query transactions_v2 |
| v_liquidity_risk | Analytical only | Ad-hoc queries |
| v_crystallization_gaps | Consolidate | Use v_crystallization_dashboard |
| v_position_transaction_variance | Consolidate | Use position_transaction_reconciliation |
| fund_aum_mismatch | Consolidate | Use aum_position_reconciliation |

---

## Questions?

If a dropped view is needed:
1. Check this reference document for recovery path
2. Check original baseline migration for full SQL definition
3. If needed urgently, create a temporary migration to recreate
4. Note: No data is lost, views are derived from tables
