# Page Contract: Admin Deposits

## Route
- **Path**: `/admin/deposits`
- **Component**: `src/pages/admin/Deposits.tsx`
- **Guard**: `AdminGuard`

## Purpose
Create and manage investor deposits, view deposit history.

---

## Data Sources

### Primary Query
```sql
SELECT 
  t.id,
  t.investor_id,
  t.fund_id,
  t.amount,
  t.transaction_type,
  t.tx_date,
  t.reference_id,
  t.notes,
  t.created_at,
  p.name AS investor_name,
  p.email AS investor_email,
  f.name AS fund_name,
  f.code AS fund_code
FROM transactions_v2 t
JOIN profiles p ON t.investor_id = p.id
JOIN funds f ON t.fund_id = f.id
WHERE t.transaction_type = 'deposit'
  AND t.is_voided = false
ORDER BY t.created_at DESC;
```

### Tables
| Table | Join Key | Purpose |
|-------|----------|---------|
| `transactions_v2` | `id` (PK) | Deposit ledger entries |
| `profiles` | `id` → `investor_id` | Investor details |
| `funds` | `id` → `fund_id` | Fund details |
| `investor_positions` | `(investor_id, fund_id)` | Updated atomically |

---

## Write Operation

### Create Deposit
**RPC**: `admin_create_transaction`

**Writes**:
1. `transactions_v2` - Insert deposit record
2. `investor_positions` - UPSERT position (add to current_value)
3. `audit_log` - Record action

**Idempotency Key**: `reference_id` (UNIQUE constraint)

```sql
-- Atomic deposit creation
INSERT INTO transactions_v2 (
  investor_id, fund_id, amount, transaction_type, 
  tx_date, reference_id, purpose, created_by
) VALUES (...);

-- Position update (same transaction)
INSERT INTO investor_positions (investor_id, fund_id, current_value, cost_basis)
VALUES ($1, $2, $3, $3)
ON CONFLICT (investor_id, fund_id) 
DO UPDATE SET 
  current_value = investor_positions.current_value + $3,
  cost_basis = investor_positions.cost_basis + $3;
```

---

## Filters
| Filter | Column | Type |
|--------|--------|------|
| Date range | `tx_date` | DatePicker |
| Fund | `fund_id` | Select |
| Search | `investor_name`, `reference_id` | Text |

---

## Precision Rules
| Field | Decimals | Format |
|-------|----------|--------|
| Amount | 8 (crypto) / 2 (fiat) | Asset-specific |
| Date | - | YYYY-MM-DD |

---

## Cache Invalidation

### React Query Keys
```typescript
['transactions', { type: 'deposit' }]
['investor-positions']
['investor-detail', investorId]
['funds']
['fund-aum']
```

### Invalidate After Deposit
```typescript
queryClient.invalidateQueries({ queryKey: ['transactions'] });
queryClient.invalidateQueries({ queryKey: ['investor-positions'] });
queryClient.invalidateQueries({ queryKey: ['investor-detail', investorId] });
queryClient.invalidateQueries({ queryKey: ['funds'] });
queryClient.invalidateQueries({ queryKey: ['fund-aum'] });
```

---

## Invariants to Check Post-Write
1. `investor_position_ledger_mismatch` returns 0 rows for affected investor
2. `fund_aum_mismatch` returns 0 rows for affected fund

---

## Actions
| Action | RLS Check | Audit |
|--------|-----------|-------|
| View deposits | `is_admin()` | No |
| Create deposit | `is_admin()` | Yes |
| Void deposit | `is_admin()` | Yes |
