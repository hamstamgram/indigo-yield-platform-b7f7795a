# Page Contract: IB Referrals

## Route
- **Path**: `/ib/referrals`
- **Component**: `src/pages/ib/Referrals.tsx`
- **Guard**: `AuthGuard` + IB role check

## Purpose
View referred investors and their activity.

---

## Data Sources

### Primary Tables
| Table | Purpose |
|-------|---------|
| `profiles` | Referred investor list |
| `investor_positions` | Referral portfolio values |
| `ib_allocations` | Commission source |

### Referrals Query
```sql
SELECT 
  p.id,
  p.name,
  p.email,
  p.status,
  p.created_at AS referred_date,
  COALESCE(SUM(ip.current_value), 0) AS total_aum,
  COUNT(DISTINCT ip.fund_id) AS fund_count
FROM profiles p
LEFT JOIN investor_positions ip ON ip.investor_id = p.id
WHERE p.ib_parent_id = auth.uid()
GROUP BY p.id
ORDER BY p.created_at DESC;
```

### Commission Summary Query
```sql
SELECT 
  iba.source_investor_id,
  p.name AS investor_name,
  SUM(iba.ib_fee_amount) FILTER (WHERE iba.payout_status = 'paid') AS total_paid,
  SUM(iba.ib_fee_amount) FILTER (WHERE iba.payout_status = 'pending') AS total_pending,
  SUM(iba.ib_fee_amount) AS total_earned
FROM ib_allocations iba
JOIN profiles p ON iba.source_investor_id = p.id
WHERE iba.ib_investor_id = auth.uid()
  AND iba.is_voided = false
GROUP BY iba.source_investor_id, p.name
ORDER BY total_earned DESC;
```

---

## RLS Policies
- `profiles` (referrals): `ib_parent_id = auth.uid()`
- `ib_allocations`: `ib_investor_id = auth.uid()`

---

## Aggregations
```sql
-- IB Summary
SELECT 
  COUNT(DISTINCT p.id) AS referral_count,
  COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'active') AS active_referrals,
  COALESCE(SUM(ip.current_value), 0) AS total_referral_aum
FROM profiles p
LEFT JOIN investor_positions ip ON ip.investor_id = p.id
WHERE p.ib_parent_id = auth.uid();
```

---

## Filters
| Filter | Column | Type |
|--------|--------|------|
| Status | `profiles.status` | Select |
| Search | `name`, `email` | Text |
| Has positions | `total_aum > 0` | Boolean |

---

## Precision Rules
| Field | Decimals | Format |
|-------|----------|--------|
| AUM | 2 | Currency (USD) |
| Commission | 2 | Currency (USD) |
| Counts | 0 | Integer |

---

## Cache Invalidation

### React Query Keys
```typescript
['ib-referrals', ibId]
['ib-commission-by-investor', ibId]
['ib-referral-stats', ibId]
```

### Invalidate After
| Event | Keys to Invalidate |
|-------|-------------------|
| New referral | `ib-referrals`, `ib-referral-stats` |
| Yield distribution | `ib-commission-by-investor` |
| Position change | `ib-referrals` |

---

## Actions
| Action | RLS Check | Audit |
|--------|-----------|-------|
| View referrals | `auth.uid()` | No |
| View referral detail | `auth.uid()` | No |
| Export list | `auth.uid()` | No |

---

## Important Notes

### Monetary Display
**CRITICAL**: Always show monetary totals (SUM of amounts), NOT counts.
- ✅ "Total Earned: $1,234.56"
- ❌ "Total Earned: 15" (wrong - this is count)

### Privacy
IBs can see:
- Referral names and emails
- Total AUM per referral
- Commission earned per referral

IBs cannot see:
- Individual position details
- Transaction history
- Wallet addresses

### Historical Referrals
If a referral is reassigned to another IB, historical allocations remain visible but marked as "historical".
