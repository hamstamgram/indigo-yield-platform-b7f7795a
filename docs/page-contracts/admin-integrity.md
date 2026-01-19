# Page Contract: Admin Integrity Dashboard

## Route
- **Path**: `/admin/integrity`
- **Component**: `src/pages/admin/IntegrityDashboard.tsx`
- **Guard**: `AdminGuard`

## Purpose
Monitor data integrity across the platform using integrity views. All views should return 0 rows when healthy.

---

## Data Sources

### Integrity Views
| View | Purpose | Expected Rows |
|------|---------|---------------|
| `fund_aum_mismatch` | Fund AUM vs sum of positions | 0 |
| `investor_position_ledger_mismatch` | Position vs ledger sum | 0 |
| `yield_distribution_conservation_check` | Yield in = yield out | 0 (or all balanced) |
| `v_period_orphans` | Orphan period references | 0 |
| `v_transaction_distribution_orphans` | Orphan transaction refs | 0 |
| `v_ib_allocation_orphans` | Orphan IB allocations | 0 |
| `v_fee_allocation_orphans` | Orphan fee allocations | 0 |

### View Queries
```sql
-- Fund AUM mismatch
SELECT 
  fund_id,
  fund_code,
  fund_name,
  recorded_aum,
  calculated_aum,
  discrepancy,
  aum_date
FROM fund_aum_mismatch
WHERE ABS(discrepancy) > 0.01;

-- Investor position mismatch
SELECT 
  investor_id,
  investor_name,
  fund_id,
  fund_code,
  position_value,
  ledger_balance,
  discrepancy
FROM investor_position_ledger_mismatch
WHERE ABS(discrepancy) > 0.01;

-- Yield conservation
SELECT 
  distribution_id,
  fund_id,
  gross_yield,
  total_distributed,
  variance,
  is_balanced
FROM yield_distribution_conservation_check
WHERE NOT is_balanced;
```

---

## Aggregations
```sql
-- Summary counts
SELECT 
  (SELECT COUNT(*) FROM fund_aum_mismatch WHERE ABS(discrepancy) > 0.01) AS fund_aum_issues,
  (SELECT COUNT(*) FROM investor_position_ledger_mismatch WHERE ABS(discrepancy) > 0.01) AS position_issues,
  (SELECT COUNT(*) FROM yield_distribution_conservation_check WHERE NOT is_balanced) AS yield_issues,
  (SELECT COUNT(*) FROM v_period_orphans) AS period_orphans,
  (SELECT COUNT(*) FROM v_transaction_distribution_orphans) AS transaction_orphans,
  (SELECT COUNT(*) FROM v_ib_allocation_orphans) AS ib_orphans,
  (SELECT COUNT(*) FROM v_fee_allocation_orphans) AS fee_orphans;
```

---

## No Filters
This page shows all integrity issues without filtering.

---

## Precision Rules
| Field | Decimals | Format |
|-------|----------|--------|
| Discrepancy | 8 | Currency |
| Counts | 0 | Integer |
| Variance | 8 | Currency |

---

## Cache Invalidation

### React Query Keys
```typescript
['integrity-summary']
['admin-integrity-runs']
```

### Invalidate After
| Operation | Keys to Invalidate |
|-----------|-------------------|
| Run integrity check | All integrity keys |
| Any financial mutation | All integrity keys |

---

## Canonical Implementation

### Edge Function
- **Name**: `integrity-monitor`
- **Storage**: `admin_integrity_runs` table
- **Checks**: 14 comprehensive integrity checks

### RPC Functions
| Function | Purpose |
|----------|---------|
| `run_integrity_check(uuid, uuid)` | Scoped integrity check with fund/investor filter |
| `assert_integrity_or_raise(uuid, uuid, text)` | Gating function for write operations |

### Deprecated (Removed)
- `check_system_integrity()` - merged into integrity-monitor
- `run_data_integrity_check()` - merged into integrity-monitor
- `run_integrity_monitoring()` - merged into integrity-monitor
- `scheduled-integrity-check` edge function - replaced by integrity-monitor
- `system_health_snapshots` table - replaced by admin_integrity_runs

---

## Actions
| Action | RLS Check | Audit |
|--------|-----------|-------|
| View integrity | `is_admin()` | No |
| Run checks | `is_admin()` | No |
| Export issues | `is_admin()` | Yes |

---

## Important Notes

### Composite Keys
**CRITICAL**: `investor_positions` uses composite key `(investor_id, fund_id)`.
- Never query `investor_positions.id` - it does not exist
- Always join using both `investor_id` AND `fund_id`

### Tolerance Thresholds
- Monetary discrepancies < 0.01 are ignored (floating point tolerance)
- Percentage variances < 0.001% are ignored

### Health Indicators
| Status | Condition |
|--------|-----------|
| ✅ Healthy | All checks pass |
| ⚠️ Warning | Any non-critical failures |
| ❌ Critical | Any critical failures |
