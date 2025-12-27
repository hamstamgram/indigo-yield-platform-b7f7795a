# Page Contract: Admin Statements

## Route
- **Path**: `/admin/statements`
- **Component**: `src/pages/admin/Statements.tsx`
- **Guard**: `AdminGuard`

## Purpose
Generate, manage, and distribute investor monthly statements.

---

## Data Sources

### Primary Tables
| Table | Purpose |
|-------|---------|
| `statement_periods` | Period definitions (month boundaries) |
| `generated_statements` | Generated statement records |
| `profiles` | Investor details |
| `funds` | Fund names for statement content |

### Statement List Query
```sql
SELECT 
  gs.id,
  gs.investor_id,
  gs.period_id,
  gs.fund_names,
  gs.pdf_url,
  gs.created_at,
  p.name AS investor_name,
  p.email AS investor_email,
  sp.period_start,
  sp.period_end,
  sp.label AS period_label
FROM generated_statements gs
JOIN profiles p ON gs.investor_id = p.id
JOIN statement_periods sp ON gs.period_id = sp.id
ORDER BY sp.period_start DESC, p.name;
```

### Period List Query
```sql
SELECT 
  id,
  period_start,
  period_end,
  label,
  status,
  is_locked
FROM statement_periods
ORDER BY period_start DESC;
```

---

## Write Operations

### Generate Statement
**RPC**: `generate_investor_statement`

**Writes**:
1. `generated_statements` - Insert statement record
2. Storage bucket - Upload PDF

**Idempotency**: Unique constraint on `(investor_id, period_id)`

### Lock Period
**RPC**: `lock_statement_period`

**Writes**:
1. `statement_periods.is_locked = true`
2. `fund_period_snapshot` - Create snapshot

---

## Filters
| Filter | Column | Type |
|--------|--------|------|
| Period | `period_id` | Select |
| Fund | `fund_names` (array contains) | Multi-select |
| Search | `investor_name` | Text |
| Status | `generated` / `not_generated` | Select |

---

## Precision Rules
| Field | Decimals | Format |
|-------|----------|--------|
| Period dates | - | MMM YYYY |
| Statement values | 2-8 | Asset-specific |

---

## Cache Invalidation

### React Query Keys
```typescript
['statements']
['statement-periods']
['generated-statements', periodId]
['fund-period-snapshots']
```

### Invalidate After
| Operation | Keys to Invalidate |
|-----------|-------------------|
| Generate statement | `generated-statements`, `statements` |
| Lock period | `statement-periods`, `fund-period-snapshots` |

---

## Actions
| Action | RLS Check | Audit |
|--------|-----------|-------|
| View statements | `is_admin()` | No |
| Generate statement | `is_admin()` | Yes |
| Regenerate statement | `is_admin()` | Yes |
| Lock period | `is_admin()` | Yes |
| Download PDF | `is_admin()` | No |
