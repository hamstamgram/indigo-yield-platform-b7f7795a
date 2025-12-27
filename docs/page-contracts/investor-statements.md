# Page Contract: Investor Statements

## Route
- **Path**: `/investor/statements`
- **Component**: `src/pages/investor/Statements.tsx`
- **Guard**: `AuthGuard`

## Purpose
View and download investor's monthly statements.

---

## Data Sources

### Primary Tables
| Table | Purpose |
|-------|---------|
| `generated_statements` | Statement records |
| `statement_periods` | Period definitions |

### Statements Query
```sql
SELECT 
  gs.id,
  gs.period_id,
  gs.fund_names,
  gs.pdf_url,
  gs.html_content,
  gs.created_at,
  sp.period_start,
  sp.period_end,
  sp.label AS period_label
FROM generated_statements gs
JOIN statement_periods sp ON gs.period_id = sp.id
WHERE gs.investor_id = auth.uid()
ORDER BY sp.period_start DESC;
```

---

## RLS Policies
- `generated_statements`: `investor_id = auth.uid()`
- `statement_periods`: Read access for all authenticated users

---

## Filters
| Filter | Column | Type |
|--------|--------|------|
| Year | `EXTRACT(YEAR FROM period_start)` | Select |
| Fund | `fund_names` (array contains) | Multi-select |

---

## Precision Rules
| Field | Decimals | Format |
|-------|----------|--------|
| Period | - | MMM YYYY |
| Statement values | 2-8 | Asset-specific |

---

## Cache Invalidation

### React Query Keys
```typescript
['investor-statements', userId]
['statement-periods']
```

### Invalidate After
| Event | Keys to Invalidate |
|-------|-------------------|
| New statement generated | `investor-statements` |

---

## Actions
| Action | RLS Check | Audit |
|--------|-----------|-------|
| View statements | `auth.uid()` | No |
| Download PDF | `auth.uid()` | No |
| View HTML | `auth.uid()` | No |

---

## Notes
- Statements are read-only for investors
- PDFs stored in Supabase Storage with signed URLs
- Only shows statements for periods where investor had positions
