# Report Pipeline Proof

## 1. Purpose Filtering in Code

### StatementsPage.tsx (Investor-Facing)
**File:** `src/routes/investor/statements/StatementsPage.tsx:57-59`

```typescript
.eq("investor_id", user.id)
.eq("period.year", parseInt(selectedYear))
.eq("purpose", "reporting")  // STRICT - no NULL fallback
```

**PROOF:** Investors ONLY see `purpose='reporting'` data.

---

## 2. One Report Per Period Enforcement

### Database Constraint
```sql
CREATE UNIQUE INDEX unique_investor_period 
ON public.generated_statements (investor_id, period_id);
```

### Code Enforcement (strictInsertStatement)
**File:** `src/services/core/reportUpsertService.ts`

The `strictInsertStatement()` function:
1. Checks if statement already exists for (investor_id, period_id)
2. If exists: **THROWS ERROR** (does not update)
3. If not exists: Inserts new statement

This ensures one report per investor per period.

---

## 3. Generate Fund Performance Edge Function

**File:** `supabase/functions/generate-fund-performance/index.ts`

The edge function:
1. Filters source data by `purpose='reporting'`
2. Inserts into `investor_fund_performance` with `purpose='reporting'`
3. Uses unique constraint to prevent duplicates

---

## 4. Email Logging

All sent reports are logged to `email_logs` table with:
- `recipient`: Investor email
- `subject`: Report subject
- `status`: sent/delivered/failed
- `sent_at`: Timestamp
- `metadata`: Period info, fund info

---

## 5. Verification Queries

### Check no duplicate reports:
```sql
SELECT investor_id, period_id, COUNT(*) 
FROM generated_statements 
GROUP BY investor_id, period_id 
HAVING COUNT(*) > 1;
-- Expected: 0 rows
```

### Check purpose segregation:
```sql
SELECT purpose, COUNT(*) 
FROM investor_fund_performance 
GROUP BY purpose;
-- Expected: 'reporting' and 'transaction' counts
```
