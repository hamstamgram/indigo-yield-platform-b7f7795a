# Page Contract: Investor Withdrawals

## Route
- **Path**: `/investor/withdrawals`
- **Component**: `src/pages/investor/Withdrawals.tsx`
- **Guard**: `AuthGuard`

## Purpose
Create withdrawal requests and view withdrawal history.

---

## Data Sources

### Primary Tables
| Table | Purpose |
|-------|---------|
| `withdrawal_requests` | Withdrawal records |
| `investor_positions` | Available balance check |
| `funds` | Fund details |

### Withdrawals Query
```sql
SELECT 
  wr.id,
  wr.fund_id,
  wr.amount,
  wr.status,
  wr.wallet_address,
  wr.notes,
  wr.created_at,
  wr.approved_at,
  wr.processed_at,
  wr.completed_at,
  wr.rejected_at,
  wr.rejection_reason,
  f.name AS fund_name,
  f.code AS fund_code,
  f.asset
FROM withdrawal_requests wr
JOIN funds f ON wr.fund_id = f.id
WHERE wr.investor_id = auth.uid()
  AND wr.is_deleted = false
ORDER BY wr.created_at DESC;
```

### Available Balance Query
```sql
SELECT 
  ip.fund_id,
  ip.current_value AS available_balance,
  ip.lock_until_date,
  f.name AS fund_name,
  f.asset
FROM investor_positions ip
JOIN funds f ON ip.fund_id = f.id
WHERE ip.investor_id = auth.uid()
  AND ip.current_value > 0
  AND (ip.lock_until_date IS NULL OR ip.lock_until_date <= CURRENT_DATE);
```

---

## Write Operations

### Create Withdrawal Request
**Table**: Direct insert to `withdrawal_requests`

**Validations**:
1. `amount <= available_balance`
2. Position not locked (`lock_until_date <= CURRENT_DATE`)
3. Fund is active

**Writes**:
1. `withdrawal_requests` - Insert new request

**Idempotency**: No duplicate prevention (multiple requests allowed)

```sql
INSERT INTO withdrawal_requests (
  investor_id,
  fund_id,
  amount,
  wallet_address,
  notes,
  status
) VALUES (
  auth.uid(),
  $1,
  $2,
  $3,
  $4,
  'pending'
);
```

---

## Status Workflow
```
pending → approved → processing → completed
    ↓         ↓
 rejected   cancelled
```

---

## Filters
| Filter | Column | Type |
|--------|--------|------|
| Status | `status` | Select |
| Fund | `fund_id` | Select |
| Date range | `created_at` | DatePicker |

---

## Precision Rules
| Field | Decimals | Format |
|-------|----------|--------|
| Amount | 8 | Asset-specific |
| Available balance | 8 | Asset-specific |
| Dates | - | YYYY-MM-DD HH:mm |

---

## Cache Invalidation

### React Query Keys
```typescript
['investor-withdrawals', userId]
['investor-positions', userId]
['available-balance', userId]
```

### Invalidate After
| Event | Keys to Invalidate |
|-------|-------------------|
| Create request | `investor-withdrawals` |
| Status change (realtime) | `investor-withdrawals`, `investor-positions` |

---

## Actions
| Action | RLS Check | Audit |
|--------|-----------|-------|
| View withdrawals | `auth.uid()` | No |
| Create request | `auth.uid()` | Yes (via trigger) |
| Cancel request | `auth.uid()` + status = 'pending' | Yes |

---

## Notes

### Lock Period
Withdrawals blocked if `lock_until_date > CURRENT_DATE`

### Balance Validation
Client-side validation should prevent over-withdrawal, but server enforces via RPC or trigger.

### Wallet Address
Required field, validated for correct format per asset type.
