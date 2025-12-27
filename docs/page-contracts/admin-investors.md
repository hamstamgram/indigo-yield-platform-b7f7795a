# Page Contract: Admin Investors List

## Route
- **Path**: `/admin/investors`
- **Component**: `src/pages/admin/Investors.tsx`
- **Guard**: `AdminGuard`

## Purpose
List all investors with search, filtering, and bulk operations.

---

## Data Sources

### Primary Query
```sql
SELECT 
  p.id,
  p.email,
  p.name,
  p.status,
  p.kyc_status,
  p.ib_parent_id,
  p.created_at,
  ib.name AS ib_name,
  COALESCE(SUM(ip.current_value), 0) AS total_value,
  COUNT(DISTINCT ip.fund_id) AS fund_count
FROM profiles p
LEFT JOIN profiles ib ON p.ib_parent_id = ib.id
LEFT JOIN investor_positions ip ON ip.investor_id = p.id
WHERE p.role = 'investor'
GROUP BY p.id, ib.name
ORDER BY p.created_at DESC;
```

### Tables
| Table | Join Key | Purpose |
|-------|----------|---------|
| `profiles` | `id` (PK) | Investor data |
| `investor_positions` | `investor_id` | Portfolio value |
| `user_roles` | `user_id` | Role filtering |

---

## Filters
| Filter | Column | Type |
|--------|--------|------|
| Status | `profiles.status` | Select |
| KYC Status | `profiles.kyc_status` | Select |
| Search | `profiles.name`, `profiles.email` | Text |
| Has IB | `profiles.ib_parent_id IS NOT NULL` | Boolean |

---

## Precision Rules
| Field | Decimals | Format |
|-------|----------|--------|
| Total Value | 2 | Currency |
| Fund Count | 0 | Integer |

---

## Cache Invalidation

### React Query Keys
```typescript
['investors']
['investor-list']
```

### Invalidate After
| Operation | Keys to Invalidate |
|-----------|-------------------|
| Investor status change | `investors` |
| IB assignment | `investors`, `investor-detail` |
| Position update | `investors` |

---

## Actions
| Action | RLS Check | Audit |
|--------|-----------|-------|
| View list | `is_admin()` | No |
| Export CSV | `is_admin()` | Yes |
| Bulk status update | `is_admin()` | Yes |

---

## Notes
- **CRITICAL**: Never query `investor_positions.id` - it's a composite key `(investor_id, fund_id)`
- Always use `SUM(current_value)` for portfolio totals
