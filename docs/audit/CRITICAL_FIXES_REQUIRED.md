# Critical Fixes Required - SQL Function Audit

**Date**: 2026-02-02
**Priority**: HIGH
**Impact**: Medium - No production breakage, but missing functionality

---

## 1. Missing Parameter: `p_distribution_id` in `apply_transaction_with_crystallization`

### Issue
The database function `apply_transaction_with_crystallization` accepts an optional parameter `p_distribution_id` to link transactions to yield distributions, but the frontend contract does NOT include this parameter.

### Database Signature (Line 11 of function definition)
```sql
CREATE OR REPLACE FUNCTION public.apply_transaction_with_crystallization(
  p_investor_id uuid,
  p_fund_id uuid,
  p_tx_type text,
  p_amount numeric,
  p_tx_date date,
  p_reference_id text,
  p_notes text DEFAULT NULL::text,
  p_admin_id uuid DEFAULT NULL::uuid,
  p_new_total_aum numeric DEFAULT NULL::numeric,
  p_purpose aum_purpose DEFAULT 'transaction'::aum_purpose,
  p_distribution_id uuid DEFAULT NULL::uuid  -- ❌ MISSING IN FRONTEND
)
```

### Frontend Contract (src/contracts/rpcSignatures.ts:411-425)
```typescript
apply_transaction_with_crystallization: {
  name: "apply_transaction_with_crystallization" as const,
  returnType: "Json",
  returnsSet: false,
  securityDefiner: false,  // ❌ Also wrong - should be true
  requiredParams: [
    "p_amount",
    "p_fund_id",
    "p_investor_id",
    "p_reference_id",
    "p_tx_date",
    "p_tx_type",
  ] as const,
  optionalParams: ["p_admin_id", "p_new_total_aum", "p_notes", "p_purpose"] as const,
  // ❌ MISSING: "p_distribution_id"
},
```

### Fix Required
```typescript
optionalParams: [
  "p_admin_id",
  "p_new_total_aum",
  "p_notes",
  "p_purpose",
  "p_distribution_id"  // ✅ ADD THIS
] as const,
```

### Impact
- **Current State**: Frontend cannot link transactions to yield distributions
- **After Fix**: Transactions created via frontend can be properly linked to `yield_distributions.id`
- **Workaround**: The parameter defaults to NULL, so existing frontend calls still work, but transactions are orphaned

### File to Edit
`src/contracts/rpcSignatures.ts` (line 424)

---

## 2. Security Definer Flag Mismatches

### Issue
Multiple critical financial functions are marked `SECURITY DEFINER` in the database but have `securityDefiner: false` in the frontend contract. This is misleading documentation.

### Functions with Mismatch

| Function | Database | Frontend | Line in rpcSignatures.ts |
|----------|----------|----------|--------------------------|
| `apply_adb_yield_distribution_v3` | ✅ SECURITY DEFINER | ❌ false | 363 |
| `apply_transaction_with_crystallization` | ✅ SECURITY DEFINER | ❌ false | 415 |
| `preview_adb_yield_distribution_v3` | ✅ SECURITY DEFINER | ❌ false | 1664 |
| `apply_daily_yield_to_fund_v2` | ✅ SECURITY DEFINER | ✅ true | 376 |

### Fix Required
Update all `securityDefiner` flags to match database reality:

```typescript
// Line 363
apply_adb_yield_distribution_v3: {
  name: "apply_adb_yield_distribution_v3" as const,
  returnType: "Json",
  returnsSet: false,
  securityDefiner: true,  // ✅ CHANGE FROM false TO true
  // ...
},

// Line 415
apply_transaction_with_crystallization: {
  name: "apply_transaction_with_crystallization" as const,
  returnType: "Json",
  returnsSet: false,
  securityDefiner: true,  // ✅ CHANGE FROM false TO true
  // ...
},

// Line 1664
preview_adb_yield_distribution_v3: {
  name: "preview_adb_yield_distribution_v3" as const,
  returnType: "Json",
  returnsSet: false,
  securityDefiner: true,  // ✅ CHANGE FROM false TO true
  // ...
},
```

### Impact
- **Current State**: Documentation is incorrect; functions run with elevated privileges despite `securityDefiner: false`
- **After Fix**: Documentation matches reality; developers understand security model
- **Workaround**: No functional impact - functions work correctly despite wrong flag

---

## 3. Function Overloads (Ambiguous Calls)

### Issue
PostgreSQL allows function overloading (same name, different signatures), but TypeScript/Supabase RPC cannot distinguish between overloads when calling via `supabase.rpc()`.

### Conflicting Functions

#### `apply_daily_yield_to_fund_v3` (2 overloads)

**Overload 1:**
```sql
p_fund_id uuid,
p_gross_yield_pct numeric,
p_yield_date date,
p_created_by uuid DEFAULT NULL,
p_purpose text DEFAULT 'transaction'
```

**Overload 2:**
```sql
p_fund_id uuid,
p_yield_date date,          -- ⚠️ POSITION CHANGED
p_gross_yield_pct numeric,  -- ⚠️ POSITION CHANGED
p_created_by uuid DEFAULT NULL,
p_purpose aum_purpose DEFAULT 'transaction'  -- ⚠️ TYPE CHANGED
```

**Problem**: Parameters 2 and 3 are swapped between overloads. If called with positional arguments, wrong overload may execute.

#### `upsert_fund_aum_after_yield` (2 overloads)

**Overload 1:**
```sql
p_fund_id uuid,
p_aum_date date,
p_total_aum numeric,
p_source text DEFAULT 'yield_distribution'
```

**Overload 2:**
```sql
p_fund_id uuid,
p_aum_date date,
p_yield_amount numeric,  -- ⚠️ DIFFERENT SEMANTIC MEANING
p_purpose aum_purpose,
p_actor_id uuid
```

**Problem**: Parameter 3 is `p_total_aum` in one overload, `p_yield_amount` in the other. Completely different semantics.

### Fix Required (Choose One Strategy)

**Option A: Rename Functions**
```sql
-- Keep overload 1 as-is
-- Rename overload 2
ALTER FUNCTION apply_daily_yield_to_fund_v3(uuid, date, numeric, uuid, aum_purpose)
  RENAME TO apply_daily_yield_to_fund_v3_alt;

ALTER FUNCTION upsert_fund_aum_after_yield(uuid, date, numeric, aum_purpose, uuid)
  RENAME TO upsert_fund_aum_after_yield_with_yield;
```

**Option B: Always Use Named Parameters in Frontend**
```typescript
// Instead of:
supabase.rpc('apply_daily_yield_to_fund_v3', [fund_id, pct, date])

// Always use:
supabase.rpc('apply_daily_yield_to_fund_v3', {
  p_fund_id: fund_id,
  p_gross_yield_pct: pct,
  p_yield_date: date
})
```

**Recommended**: Option A (rename functions) to eliminate ambiguity permanently.

---

## 4. Missing Functions in Frontend Contracts

### Issue
Critical admin functions exist in the database but are NOT in `src/contracts/rpcSignatures.ts`.

### Missing Functions

| Function Name | Purpose | Impact |
|---------------|---------|--------|
| `void_yield_distribution` | Void a yield distribution and cascade to all related transactions | Cannot void distributions via frontend |
| `force_delete_investor` | Admin hard-delete of investor and all related data | Cannot delete investors via frontend admin panel |
| `crystallize_yield_before_flow` | Crystallize accrued yield before deposit/withdrawal | Cannot manually trigger crystallization |

### Fix Required
Add these functions to `src/contracts/rpcSignatures.ts`:

```typescript
void_yield_distribution: {
  name: "void_yield_distribution" as const,
  returnType: "Json",
  returnsSet: false,
  securityDefiner: true,
  requiredParams: ["p_distribution_id", "p_admin_id"] as const,
  optionalParams: ["p_reason"] as const,
},

force_delete_investor: {
  name: "force_delete_investor" as const,
  returnType: "boolean",
  returnsSet: false,
  securityDefiner: true,
  requiredParams: ["p_investor_id", "p_admin_id"] as const,
  optionalParams: [] as const,
},

crystallize_yield_before_flow: {
  name: "crystallize_yield_before_flow" as const,
  returnType: "Json",
  returnsSet: false,
  securityDefiner: true,
  requiredParams: [
    "p_fund_id",
    "p_closing_aum",
    "p_trigger_type",
    "p_trigger_reference",
    "p_event_ts",
    "p_admin_id"
  ] as const,
  optionalParams: ["p_purpose"] as const,
},
```

---

## 5. Enum Type Validation

### Issue
The `aum_purpose` type is an enum in the database but treated as `text` in frontend contracts, allowing invalid values.

### Database Definition
```sql
CREATE TYPE aum_purpose AS ENUM ('transaction', 'reporting');
```

### Frontend (No Type Safety)
```typescript
// Current: accepts any string
p_purpose: string

// Should be:
type AUMPurpose = 'transaction' | 'reporting';
p_purpose: AUMPurpose
```

### Fix Required
1. Define TypeScript enum in `src/contracts/dbEnums.ts`:
```typescript
export const AUM_PURPOSE = {
  TRANSACTION: 'transaction',
  REPORTING: 'reporting',
} as const;

export type AUMPurpose = typeof AUM_PURPOSE[keyof typeof AUM_PURPOSE];
```

2. Use in service layer:
```typescript
import { AUMPurpose } from '@/contracts/dbEnums';

async function applyYield(purpose: AUMPurpose = 'transaction') {
  // TypeScript will enforce only 'transaction' or 'reporting'
}
```

---

## Testing Checklist

After applying fixes, run:

```bash
# 1. Type check
npx tsc --noEmit

# 2. Contract verification
npm run contracts:verify

# 3. Build
npm run build

# 4. Test RPC calls with new parameters
npm run test:rpc
```

---

## Verification Queries

Run these SQL queries to verify database state after fixes:

### 1. Check function exists with correct signature
```sql
SELECT
  p.proname,
  pg_get_function_arguments(p.oid) as args,
  p.prosecdef as security_definer
FROM pg_proc p
WHERE p.proname = 'apply_transaction_with_crystallization';
```

Expected: Should show `p_distribution_id uuid DEFAULT NULL` in args

### 2. Check for function overloads
```sql
SELECT
  p.proname,
  pg_get_function_arguments(p.oid) as args
FROM pg_proc p
WHERE p.proname IN (
  'apply_daily_yield_to_fund_v3',
  'upsert_fund_aum_after_yield',
  'is_admin',
  'is_super_admin'
)
ORDER BY p.proname, p.oid;
```

Expected: Should show 2 rows per function if overloads exist

### 3. Verify enum values
```sql
SELECT
  enumlabel
FROM pg_enum
WHERE enumtypid = 'aum_purpose'::regtype::oid;
```

Expected: `transaction`, `reporting`

---

## Priority Order

1. **CRITICAL (Do First)**
   - Fix #1: Add `p_distribution_id` parameter
   - Fix #2: Correct `securityDefiner` flags

2. **HIGH (Do Soon)**
   - Fix #3: Resolve function overloads
   - Fix #4: Add missing functions to contracts

3. **MEDIUM (Nice to Have)**
   - Fix #5: Add enum type validation

---

## Estimated Time
- Fix #1: 5 minutes (one-line change)
- Fix #2: 10 minutes (3 flag changes)
- Fix #3: 30 minutes (SQL schema changes + migration)
- Fix #4: 20 minutes (add 3 function contracts)
- Fix #5: 15 minutes (add enum types)

**Total**: ~80 minutes

---

## Related Files

- `src/contracts/rpcSignatures.ts` - Frontend RPC contracts
- `src/contracts/dbEnums.ts` - Database enum mappings
- `src/services/admin/transactionService.ts` - Uses `apply_transaction_with_crystallization`
- `src/services/admin/yieldService.ts` - Uses `apply_adb_yield_distribution_v3`
- `supabase/migrations/*.sql` - Database schema definitions

---

**Audit Completed**: 2026-02-02
**Next Action**: Apply Fix #1 and Fix #2 (15 minutes total)
