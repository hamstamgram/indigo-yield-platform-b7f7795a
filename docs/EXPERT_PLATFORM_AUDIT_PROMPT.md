# INDIGO Platform — Expert System Audit & Hardening Protocol

> **Version:** 2.0
> **Last Updated:** 2026-01-11
> **Purpose:** Zero-defect production deployment

---

## Mission Statement

Execute a forensic-level audit of the INDIGO Digital Asset Yield Platform to identify and eliminate ALL potential runtime errors before they occur in production. This includes database triggers, RPC functions, TypeScript services, Zod schemas, and UI components.

---

## Part 1: Database Layer — Complete Function Audit

### 1.1 Trigger Function Validation

Every trigger function must:
1. Handle tables with different PK structures (single `id` vs composite keys)
2. Not reference non-existent columns
3. Not call functions that don't exist in the search_path
4. Have proper exception handling for undefined columns

```sql
-- AUDIT: Find all trigger functions and their dependencies
WITH trigger_functions AS (
  SELECT DISTINCT
    p.proname AS function_name,
    p.oid AS func_oid,
    array_agg(DISTINCT t.tgrelid::regclass::text) AS attached_tables
  FROM pg_trigger t
  JOIN pg_proc p ON t.tgfoid = p.oid
  WHERE NOT t.tgisinternal
    AND p.pronamespace = 'public'::regnamespace
  GROUP BY p.proname, p.oid
)
SELECT
  tf.function_name,
  tf.attached_tables,
  -- Check for problematic patterns
  CASE WHEN prosrc ILIKE '%uuid_nil()%' THEN 'USES uuid_nil() - WILL FAIL' ELSE 'OK' END AS uuid_nil_check,
  CASE WHEN prosrc ILIKE '%uuid_generate_v5%' AND prosrc NOT ILIKE '%extensions.uuid_generate_v5%'
       THEN 'uuid_generate_v5 needs schema prefix' ELSE 'OK' END AS uuid_v5_check,
  CASE WHEN prosrc ILIKE '%NEW.id%' OR prosrc ILIKE '%OLD.id%' THEN 'Uses .id column' ELSE 'No .id ref' END AS id_ref,
  CASE WHEN prosrc ILIKE '%EXCEPTION WHEN undefined_column%' THEN 'Has exception handler' ELSE 'NO HANDLER' END AS exception_handler
FROM trigger_functions tf
JOIN pg_proc p ON tf.func_oid = p.oid
ORDER BY tf.function_name;
```

### 1.2 Function Extension Dependencies

Functions using PostgreSQL extensions must qualify with schema:

```sql
-- AUDIT: Find functions using extension functions without schema qualification
SELECT
  proname,
  CASE
    WHEN prosrc ~* 'uuid_nil\s*\(' AND prosrc NOT ILIKE '%extensions.uuid_nil%' THEN 'uuid_nil needs extensions. prefix'
    WHEN prosrc ~* 'uuid_generate_v[0-9]\s*\(' AND prosrc NOT ILIKE '%extensions.uuid_generate%' THEN 'uuid_generate needs extensions. prefix'
    WHEN prosrc ~* 'pgcrypto\.' THEN 'Check pgcrypto usage'
    ELSE 'OK'
  END AS extension_issue
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND (
    prosrc ~* 'uuid_nil|uuid_generate_v|pgcrypto|crypt\(|gen_salt'
  );
```

**Safe alternatives:**
- `uuid_nil()` → Use `md5(composite_key)::uuid` or `'00000000-0000-0000-0000-000000000000'::uuid`
- `uuid_generate_v4()` → Use `gen_random_uuid()` (built into pg_catalog, always available)
- `uuid_generate_v5()` → Use `extensions.uuid_generate_v5()` with explicit schema

### 1.3 Column Reference Validation

```sql
-- AUDIT: ALL column references in trigger functions vs actual table columns
WITH trigger_refs AS (
  SELECT
    p.proname AS function_name,
    t.tgrelid::regclass::text AS target_table,
    (regexp_matches(p.prosrc, '(NEW|OLD)\.([a-zA-Z_][a-zA-Z0-9_]*)', 'gi'))[2] AS column_ref
  FROM pg_trigger t
  JOIN pg_proc p ON t.tgfoid = p.oid
  WHERE NOT t.tgisinternal
    AND t.tgrelid::regclass::text NOT LIKE 'auth.%'
    AND t.tgrelid::regclass::text NOT LIKE 'storage.%'
    AND t.tgrelid::regclass::text NOT LIKE 'realtime.%'
),
actual_columns AS (
  SELECT table_name, column_name
  FROM information_schema.columns
  WHERE table_schema = 'public'
)
SELECT DISTINCT
  tr.function_name,
  tr.target_table,
  tr.column_ref,
  CASE WHEN ac.column_name IS NULL THEN '❌ MISSING' ELSE '✓' END AS status
FROM trigger_refs tr
LEFT JOIN actual_columns ac
  ON tr.target_table = ac.table_name
  AND lower(tr.column_ref) = lower(ac.column_name)
WHERE ac.column_name IS NULL
ORDER BY tr.target_table, tr.function_name;
```

### 1.4 RPC Function Parameter Validation

```sql
-- AUDIT: Verify RPC function parameters match TypeScript service calls
SELECT
  p.proname AS function_name,
  pg_get_function_arguments(p.oid) AS parameters,
  p.prorettype::regtype AS return_type
FROM pg_proc p
WHERE p.pronamespace = 'public'::regnamespace
  AND p.proname IN (
    'admin_create_transaction',
    'void_transaction',
    'approve_withdrawal',
    'complete_withdrawal',
    'create_withdrawal_request',
    'apply_daily_yield_to_fund_v3',
    'crystallize_yield_before_flow',
    'preview_yield_distribution',
    'recompute_investor_position'
  )
ORDER BY p.proname;
```

---

## Part 2: Security Layer Validation

### 2.1 SECURITY DEFINER Compliance

```sql
-- AUDIT: ALL SECURITY DEFINER functions must have search_path
SELECT
  proname,
  CASE
    WHEN proconfig IS NOT NULL AND 'search_path=public' = ANY(proconfig) THEN '✓ COMPLIANT'
    ELSE '❌ MISSING search_path'
  END AS status
FROM pg_proc
WHERE prosecdef = true
  AND pronamespace = 'public'::regnamespace
ORDER BY status DESC, proname;
```

### 2.2 Advisory Lock Coverage

```sql
-- AUDIT: Critical mutation functions must have advisory locks
SELECT
  proname,
  CASE WHEN pg_get_functiondef(oid) ILIKE '%pg_advisory%' THEN '✓ HAS LOCK' ELSE '❌ NO LOCK' END AS status
FROM pg_proc
WHERE proname IN (
  'admin_create_transaction',
  'void_transaction',
  'approve_withdrawal',
  'complete_withdrawal',
  'create_withdrawal_request',
  'apply_daily_yield_to_fund_v3'
)
AND pronamespace = 'public'::regnamespace
ORDER BY status, proname;
```

### 2.3 RLS Policy Validation

```sql
-- AUDIT: Critical tables must have RLS policies
SELECT
  t.tablename,
  CASE WHEN COUNT(p.policyname) > 0 THEN '✓ ' || COUNT(p.policyname) || ' policies' ELSE '❌ NO RLS' END AS status
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename AND p.schemaname = 'public'
WHERE t.schemaname = 'public'
  AND t.tablename IN (
    'profiles', 'funds', 'transactions_v2', 'investor_positions',
    'yield_distributions', 'withdrawal_requests', 'audit_log'
  )
GROUP BY t.tablename
ORDER BY status, t.tablename;
```

---

## Part 3: Data Integrity Validation

### 3.1 Integrity Views Health

```sql
-- AUDIT: Run all integrity views
SELECT 'Orphaned Positions' AS check, COUNT(*) AS issues FROM v_orphaned_positions
UNION ALL
SELECT 'Duplicate Transactions', COUNT(*) FROM v_duplicate_transactions
UNION ALL
SELECT 'Conservation Violations', COUNT(*) FROM v_yield_conservation_check WHERE NOT is_conserved
UNION ALL
SELECT 'Fee Allocation Orphans', COUNT(*) FROM v_fee_allocation_orphans
UNION ALL
SELECT 'IB Allocation Orphans', COUNT(*) FROM v_ib_allocation_orphans
UNION ALL
SELECT 'AUM Mismatches', COUNT(*) FROM fund_aum_mismatch;
```

### 3.2 Financial Precision Check

```sql
-- AUDIT: Financial columns must be NUMERIC(28,10)
SELECT
  table_name,
  column_name,
  CASE
    WHEN numeric_precision = 28 AND numeric_scale = 10 THEN '✓ CORRECT'
    WHEN numeric_precision IS NULL THEN '⚠ UNSPECIFIED (safe but inconsistent)'
    ELSE '❌ WRONG: (' || numeric_precision || ',' || numeric_scale || ')'
  END AS status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND data_type = 'numeric'
  AND table_name IN ('transactions_v2', 'investor_positions', 'yield_distributions')
  AND column_name IN ('amount', 'balance_before', 'balance_after', 'current_value',
                      'principal', 'gross_yield', 'net_yield', 'total_fees', 'total_ib')
ORDER BY table_name, column_name;
```

---

## Part 4: TypeScript/Frontend Validation

### 4.1 Service Layer Audit

Check every `.rpc()` call matches database function signature:

```bash
# Extract all RPC calls
grep -rn "\.rpc(" src/services --include="*.ts" | while read line; do
  # Extract function name and parameters
  echo "$line" | grep -oP "\.rpc\(['\"]([^'\"]+)['\"]"
done

# Compare with database function signatures
```

### 4.2 Zod Schema Validation

Every Zod schema with `.transform()` must:
1. Map camelCase (TypeScript) → snake_case (PostgreSQL)
2. Not drop required fields
3. Handle nullable fields correctly

```typescript
// CORRECT Pattern
const schema = z.object({
  investorId: z.string().uuid(),
  fundId: z.string().uuid(),
  txDate: z.string()
}).transform((data) => ({
  investor_id: data.investorId,  // camelCase → snake_case
  fund_id: data.fundId,
  tx_date: data.txDate
}));

// WRONG Pattern (will fail)
const schema = z.object({
  investorId: z.string().uuid()
}).transform((data) => ({
  investorId: data.investorId  // Still camelCase - WRONG
}));
```

### 4.3 Supabase Query Validation

All `.select()`, `.eq()`, `.insert()`, `.update()` must use snake_case column names:

```bash
# Find potential camelCase in database calls
grep -rn "\.eq\|\.select\|\.insert\|\.update" src --include="*.ts" --include="*.tsx" | \
  grep -E "'[a-z]+[A-Z]" | head -20
```

---

## Part 5: Runtime Error Prevention

### 5.1 Common PostgreSQL Function Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `function uuid_nil() does not exist` | uuid-ossp functions need schema prefix when search_path is restricted | Use `extensions.uuid_nil()` or `'00000000-0000-0000-0000-000000000000'::uuid` |
| `record "new" has no field "X"` | Trigger references column that doesn't exist on table | Add EXCEPTION WHEN undefined_column handler |
| `column "X" does not exist` | Wrong column name in query | Check actual column names with `\d table_name` |
| `function X(unknown) does not exist` | Type mismatch in function call | Add explicit type casts |
| `permission denied` | RLS policy blocking access | Check RLS policies and auth context |

### 5.2 Safe Function Patterns

```sql
-- PATTERN: Handle tables with or without 'id' column
CREATE OR REPLACE FUNCTION safe_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
  v_entity_id text;
BEGIN
  -- Try to get id, handle composite keys gracefully
  BEGIN
    v_entity_id := COALESCE(NEW.id, OLD.id)::text;
  EXCEPTION WHEN undefined_column THEN
    -- Build ID from composite key
    IF TG_TABLE_NAME = 'investor_positions' THEN
      v_entity_id := COALESCE(NEW.investor_id, OLD.investor_id)::text || ':' ||
                     COALESCE(NEW.fund_id, OLD.fund_id)::text;
    ELSE
      v_entity_id := TG_TABLE_NAME || ':' || extract(epoch from now())::text;
    END IF;
  END;

  -- Rest of function...
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

```sql
-- PATTERN: Safe UUID generation (no extension dependencies)
-- Instead of: uuid_generate_v5(uuid_nil(), key)
-- Use: md5(key)::uuid
SELECT md5('investor_id:fund_id')::uuid;

-- Instead of: uuid_generate_v4()
-- Use: gen_random_uuid() (always available in pg_catalog)
SELECT gen_random_uuid();
```

---

## Part 6: Automated Health Check Script

```sql
-- Run this before ANY deployment
DO $$
DECLARE
  v_errors text[] := ARRAY[]::text[];
  v_count int;
BEGIN
  -- Check 1: SECURITY DEFINER compliance
  SELECT COUNT(*) INTO v_count
  FROM pg_proc
  WHERE prosecdef = true AND pronamespace = 'public'::regnamespace
    AND (proconfig IS NULL OR NOT 'search_path=public' = ANY(proconfig));
  IF v_count > 0 THEN
    v_errors := array_append(v_errors, v_count || ' SECURITY DEFINER functions missing search_path');
  END IF;

  -- Check 2: Advisory locks on critical functions
  SELECT COUNT(*) INTO v_count
  FROM pg_proc
  WHERE proname IN ('admin_create_transaction', 'void_transaction', 'approve_withdrawal',
                    'complete_withdrawal', 'create_withdrawal_request', 'apply_daily_yield_to_fund_v3')
    AND pronamespace = 'public'::regnamespace
    AND pg_get_functiondef(oid) NOT ILIKE '%pg_advisory%';
  IF v_count > 0 THEN
    v_errors := array_append(v_errors, v_count || ' critical functions missing advisory locks');
  END IF;

  -- Check 3: Integrity view data
  SELECT COUNT(*) INTO v_count FROM v_orphaned_positions;
  IF v_count > 0 THEN
    v_errors := array_append(v_errors, v_count || ' orphaned positions found');
  END IF;

  SELECT COUNT(*) INTO v_count FROM v_duplicate_transactions;
  IF v_count > 0 THEN
    v_errors := array_append(v_errors, v_count || ' duplicate transactions found');
  END IF;

  SELECT COUNT(*) INTO v_count FROM v_yield_conservation_check WHERE NOT is_conserved;
  IF v_count > 0 THEN
    v_errors := array_append(v_errors, v_count || ' conservation law violations');
  END IF;

  -- Check 4: Extension function usage
  SELECT COUNT(*) INTO v_count
  FROM pg_proc
  WHERE pronamespace = 'public'::regnamespace
    AND (prosrc ILIKE '%uuid_nil()%' OR
         (prosrc ILIKE '%uuid_generate_v%' AND prosrc NOT ILIKE '%extensions.uuid_generate%'));
  IF v_count > 0 THEN
    v_errors := array_append(v_errors, v_count || ' functions with unsafe extension calls');
  END IF;

  -- Report
  IF array_length(v_errors, 1) > 0 THEN
    RAISE EXCEPTION 'HEALTH CHECK FAILED: %', array_to_string(v_errors, '; ');
  ELSE
    RAISE NOTICE '✓ ALL HEALTH CHECKS PASSED';
  END IF;
END $$;
```

---

## Part 7: Deployment Checklist

Before every deployment:

```markdown
## Pre-Deployment Checklist

### Database
- [ ] Run automated health check script (Part 6)
- [ ] Verify all migrations applied: `supabase migration list`
- [ ] Check for pending schema changes
- [ ] Verify RLS policies active on critical tables

### Functions
- [ ] All SECURITY DEFINER have search_path
- [ ] All critical mutations have advisory locks
- [ ] No uuid_nil() or unqualified extension calls
- [ ] All trigger functions have exception handlers

### Data Integrity
- [ ] 0 orphaned positions
- [ ] 0 duplicate transactions
- [ ] 0 conservation violations
- [ ] 0 AUM mismatches

### Frontend
- [ ] All RPC calls match function signatures
- [ ] Zod transforms use snake_case for DB
- [ ] No camelCase in Supabase query column names

### Testing
- [ ] Create transaction works
- [ ] Void transaction works
- [ ] Create withdrawal works
- [ ] Approve/complete withdrawal works
- [ ] Yield distribution preview works
- [ ] Yield distribution apply works
```

---

## Quick Reference: Error → Fix

| Error Message | Root Cause | Immediate Fix |
|--------------|------------|---------------|
| `function uuid_nil() does not exist` | Extension function without schema | Use `md5(key)::uuid` instead |
| `record "new" has no field "id"` | Table has composite PK | Add exception handler in trigger |
| `column "X" does not exist` | Wrong column name | Check `\d tablename` for actual columns |
| `SECURITY DEFINER function missing search_path` | SQL injection risk | Add `SET search_path = public` |
| `could not serialize access` | Concurrent modification | Add advisory lock |
| `permission denied for table X` | RLS blocking | Check auth.uid() and policy conditions |

---

**Document Author:** Claude Code (CTO/DBA Role)
**Last Validated:** 2026-01-11
**Platform Status:** Production Ready
