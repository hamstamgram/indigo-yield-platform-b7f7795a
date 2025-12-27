# Page Contract: Admin Dashboard

## Route
- **Path**: `/admin`
- **Component**: `src/pages/admin/AdminDashboard.tsx`
- **Guard**: `AdminGuard` (requires `admin` or `super_admin` role)

## Purpose
Central admin overview showing platform health metrics, recent activity, and quick access to key operations.

---

## Data Sources

### Primary Tables/Views
| Source | Type | Purpose |
|--------|------|---------|
| `funds` | Table | Fund count and status |
| `profiles` | Table | Investor count |
| `investor_positions` | Table | Total AUM calculation |
| `transactions_v2` | Table | Recent transactions |
| `withdrawal_requests` | Table | Pending withdrawal count |
| `yield_distributions` | Table | Recent yield operations |

### Aggregations
```sql
-- Platform totals
SELECT 
  COUNT(DISTINCT f.id) AS fund_count,
  COUNT(DISTINCT p.id) FILTER (WHERE p.role = 'investor') AS investor_count,
  SUM(ip.current_value) AS total_aum
FROM funds f
LEFT JOIN investor_positions ip ON ip.fund_id = f.id
LEFT JOIN profiles p ON p.id = ip.investor_id
WHERE f.status = 'active';
```

---

## Filters
| Filter | Source | Default |
|--------|--------|---------|
| None | - | Shows all active data |

---

## Precision Rules
| Field | Decimals | Format |
|-------|----------|--------|
| AUM totals | 2 | Currency (USD) |
| Investor count | 0 | Integer |
| Fund count | 0 | Integer |

---

## Cache Invalidation

### React Query Keys
```typescript
['admin-dashboard-stats']
['recent-transactions']
['pending-withdrawals-count']
['funds']
```

### Invalidate After
| Operation | Keys to Invalidate |
|-----------|-------------------|
| Any deposit/withdrawal | `admin-dashboard-stats`, `recent-transactions` |
| Yield apply | `admin-dashboard-stats` |
| Fund status change | `admin-dashboard-stats`, `funds` |

---

## Actions
| Action | RLS Check | Audit |
|--------|-----------|-------|
| View dashboard | `is_admin()` | No |

---

## Error Handling
| Scenario | User Message |
|----------|--------------|
| Stats load fails | "Failed to load dashboard statistics" |
