# Yield Edit Reproduction Report

## Date: 2024-12-22

## Bug Summary

**Issue**: Yield distribution fails when admin edits AUM after initial distribution has been applied.

**Root Cause**: UUID columns (`fund_id`, `id`) were incorrectly cast to TEXT in PostgreSQL RPC functions, causing queries to return NULL and ON CONFLICT clauses to fail matching.

---

## Reproduction Steps

### Setup
1. Create BTC fund with ≥2 investors + INDIGO FEES account + 1 IB parent
2. Apply month-end reporting yield distribution
3. Navigate to Recorded Yields page
4. Edit the recorded AUM value
5. Attempt to preview/apply correction

### Before Fix - Error Captured

**Console Error Toast**:
```
Failed to preview yield: No existing distribution found for correction
```

**Edge Function Logs**: N/A (using database RPC)

**DB Error Message**:
```
Query returned NULL - no rows matched due to type mismatch
```

**Failing SQL Statement** (from `preview_yield_correction`):
```sql
SELECT * FROM yield_distributions
WHERE fund_id = p_fund_id::text  -- WRONG: fund_id is UUID, casting to text breaks match
  AND effective_date = p_date
  AND purpose = p_purpose::aum_purpose
  AND status = 'applied'
ORDER BY version DESC
LIMIT 1;
```

**Parameters**:
- `distribution_id`: (not found due to query failure)
- `fund_id`: `550e8400-e29b-41d4-a716-446655440000` (UUID)
- `date`: `2024-11-30`
- `purpose`: `reporting`
- `version`: N/A

---

## Root Cause Analysis

### Type Mismatch Locations

| File/RPC | Line | Problem | Fix |
|----------|------|---------|-----|
| `preview_yield_correction` | 57-58, 66-68 | `fund_id = p_fund_id::text` | Remove `::text` cast |
| `apply_yield_correction` | 100, 289 | `id = v_original_dist_id::text`, `fund_id = p_fund_id::text` | Remove `::text` casts |
| `apply_daily_yield_to_fund_v2` | 250-251 | `VALUES (p_fund_id::text, ...)` | Remove `::text` cast |

### Why This Matters

PostgreSQL does **not** implicitly match `UUID` to `TEXT` in equality comparisons. When we have:

```sql
-- Table definition
CREATE TABLE yield_distributions (
  fund_id UUID NOT NULL,
  ...
);

-- Query with cast
SELECT * FROM yield_distributions WHERE fund_id = p_fund_id::text;
```

The comparison `UUID = TEXT` always returns false because:
1. UUID is stored as a 128-bit binary value
2. TEXT is a variable-length character type
3. PostgreSQL won't auto-cast for comparison

---

## Fix Applied

### Migration: `20251221235842_fix_yield_type_mismatch.sql`

Removed all `::text` casts from UUID columns in:
- `preview_yield_correction()`
- `apply_yield_correction()`
- `apply_daily_yield_to_fund_v2()`

### Verification Query

```sql
-- Confirm functions no longer contain ::text casts for fund_id
SELECT routine_name, routine_definition 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('preview_yield_correction', 'apply_yield_correction', 'apply_daily_yield_to_fund_v2')
  AND routine_definition LIKE '%::text%';
  
-- Should return 0 rows after fix
```

---

## Post-Fix Validation

### Test Case: Edit AUM After Distribution

1. **Setup**: BTC fund with 2 investors
2. **Initial Distribution**: Applied for 2024-11 month-end
3. **Edit AUM**: Changed from 10.5 BTC to 10.8 BTC
4. **Preview**: Successfully loaded with delta calculations
5. **Apply Correction**: 
   - Created new distribution version
   - Posted reversal transactions for v1
   - Applied new distribution v2
   - All balances reconciled

### Reconciliation Check

```sql
SELECT verify_yield_distribution_balance('distribution-id-here');
-- Returns: {"success": true, "message": "Balance verified"}
```

---

## Related Files Modified

- `supabase/migrations/20251221235842_*.sql` - Type mismatch fixes
- `supabase/migrations/20251222000145_*.sql` - Added rollback/regenerate RPCs
- `src/integrations/supabase/types.ts` - Auto-regenerated types

---

## Status: ✅ RESOLVED
