# Migration Hygiene

> Generated: 2025-12-26
> Total Migrations: 219

## Overview

This document describes the migration management strategy, identifies potential conflicts, and establishes guardrails to prevent regressions.

---

## Migration File Structure

```
supabase/migrations/
├── 001_initial_schema.sql          # Legacy numbered migrations
├── 002_rls_policies.sql
├── ...
├── 015_storage_buckets_setup.sql
├── 20250109000000_fix_*.sql        # Timestamped migrations (2025+)
├── ...
├── 20251226*.sql                   # Latest migrations
└── _archived_deprecated/           # Archived old migrations
```

---

## Known Issues Resolved

### 1. withdrawal_audit_log vs withdrawal_audit_logs

**Issue**: Some migrations referenced `withdrawal_audit_log` (singular) while the canonical table is `withdrawal_audit_logs` (plural).

**Resolution**:
- Canonical table: `withdrawal_audit_logs` (PLURAL)
- Compatibility view: `withdrawal_audit_log` (singular) - SELECT only
- CI guardrail: `scripts/check-migrations.sh` blocks singular references

**Affected Migrations**: Fixed in consolidation migrations

### 2. Duplicate Function Definitions

**Issue**: Multiple migrations defined the same function with different signatures.

**Resolution**: Latest migration wins. Guardrails prevent reintroducing old signatures.

### 3. RLS Policy Conflicts

**Issue**: Some policies were defined multiple times with different conditions.

**Resolution**: Use `DROP POLICY IF EXISTS` before `CREATE POLICY` in all migrations.

---

## Baseline Strategy

### Current State

- 219 migration files from various development phases
- No squashing performed yet
- All migrations apply cleanly on fresh database

### Recommended Approach

**Phase 1: Freeze Point (Current)**
- Mark current state as baseline
- All new migrations must be additive only
- No modifications to existing objects without explicit DROP/CREATE

**Phase 2: Future Baseline (Post-Launch)**
1. Create a single `000_baseline.sql` that represents current schema
2. Move existing migrations to `_archived_deprecated/`
3. Apply baseline + new migrations for fresh installs
4. Keep full history for production migration chain

### Migration Naming Convention

```
YYYYMMDDHHMMSS_<uuid-or-description>.sql
```

Example:
- `20251226232524_814cf432-1155-4eb4-b5bd-231dbb01ccb4.sql` (UUID)
- `20251227100000_add_new_table.sql` (Descriptive)

---

## CI Guardrails

### 1. scripts/check-migrations.sh

Prevents forbidden patterns in migrations:

```bash
# Forbidden patterns
"withdrawal_audit_log[^s]"  # Must use plural
"FROM withdrawal_audit_log[^s]"  # Must use plural table
"INTO withdrawal_audit_log[^s]"  # Must use plural table
```

**Usage**:
```bash
./scripts/check-migrations.sh
# Exit 0 = pass, Exit 1 = fail
```

### 2. scripts/db-smoke-test.sh

Verifies schema integrity after migrations:

```bash
./scripts/db-smoke-test.sh
# Checks:
# - All critical tables exist
# - All critical views exist
# - All critical RPC functions exist
# - Integrity views return 0 violations
```

### 3. Future: scripts/run-full-audit.sh

Combines all checks:

```bash
./scripts/run-full-audit.sh
# Runs:
# 1. check-migrations.sh
# 2. db-smoke-test.sh
# 3. Integrity view checks
# 4. RPC function validation
```

---

## Safe Migration Patterns

### Adding a New Table

```sql
-- Always use IF NOT EXISTS
CREATE TABLE IF NOT EXISTS public.new_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ...
);

-- Always enable RLS
ALTER TABLE public.new_table ENABLE ROW LEVEL SECURITY;

-- Always create policies
CREATE POLICY "new_table_select_policy" ON public.new_table
  FOR SELECT USING (...);
```

### Modifying an Existing Function

```sql
-- Use CREATE OR REPLACE
CREATE OR REPLACE FUNCTION public.my_function(...)
RETURNS ... AS $$
BEGIN
  ...
END;
$$ LANGUAGE plpgsql;
```

### Adding a Column

```sql
-- Use IF NOT EXISTS where available, or handle errors
ALTER TABLE public.existing_table
  ADD COLUMN IF NOT EXISTS new_column TYPE DEFAULT value;
```

### Modifying RLS Policies

```sql
-- Always drop before create
DROP POLICY IF EXISTS "old_policy_name" ON public.table_name;
CREATE POLICY "new_policy_name" ON public.table_name
  FOR SELECT USING (...);
```

### Creating Views

```sql
-- Always use CREATE OR REPLACE
-- Always use SECURITY INVOKER
CREATE OR REPLACE VIEW public.my_view
WITH (security_invoker = true)
AS
SELECT ...
WHERE is_admin() OR auth.uid() = user_id;
```

---

## Dangerous Patterns to Avoid

### ❌ Never Do

```sql
-- Don't reference singular table name
INSERT INTO withdrawal_audit_log ...  -- WRONG!

-- Don't create SECURITY DEFINER views
CREATE VIEW my_view WITH (security_definer = true) AS ...  -- WRONG!

-- Don't drop tables in migration
DROP TABLE existing_table;  -- DANGEROUS!

-- Don't assume column exists
SELECT nonexistent_column FROM table;  -- WRONG!
```

### ⚠️ Use Caution

```sql
-- Renaming columns requires migration path
ALTER TABLE t RENAME COLUMN old TO new;

-- Changing column types may fail
ALTER TABLE t ALTER COLUMN c TYPE new_type;

-- Dropping constraints may break references
ALTER TABLE t DROP CONSTRAINT c;
```

---

## Conflict Detection

### How to Identify Conflicts

1. **Duplicate function names with different signatures**:
   ```bash
   grep -r "CREATE.*FUNCTION.*my_function" supabase/migrations/
   ```

2. **Duplicate policy names**:
   ```bash
   grep -r "CREATE POLICY.*my_policy" supabase/migrations/
   ```

3. **References to renamed objects**:
   ```bash
   grep -r "old_table_name" supabase/migrations/
   ```

### Automated Conflict Check

Add to CI:
```bash
# Check for duplicate function definitions
./scripts/check-migrations.sh --check-duplicates
```

---

## Rollback Strategy

### For Non-Destructive Changes

Most migrations are additive and don't require rollback. If needed:

1. Create a new migration that undoes the change
2. Apply using `npx supabase db push`

### For Destructive Changes

1. Restore from backup
2. Re-apply migrations up to the safe point
3. Fix the problematic migration
4. Re-apply remaining migrations

### Production Rollback Procedure

1. **Stop**: Halt all writes to affected tables
2. **Backup**: Ensure current backup exists
3. **Restore**: Use Supabase dashboard to restore
4. **Verify**: Run integrity checks
5. **Resume**: Re-enable writes

---

## Pre-Deployment Checklist

Before deploying new migrations:

- [ ] Run `./scripts/check-migrations.sh` locally
- [ ] Run `./scripts/db-smoke-test.sh` locally
- [ ] Test on fresh local database (`npx supabase db reset --local`)
- [ ] Verify all integrity views return 0 rows
- [ ] Check that RLS policies work as expected
- [ ] Verify SECURITY DEFINER functions include auth checks
- [ ] Test affected UI flows manually

---

## Migration Inventory by Category

### Schema Migrations (Tables/Columns)
- 001-015: Initial schema setup
- 20251205*: Missing tables, schema gaps
- 20251217*: Final consolidation

### RLS Policy Migrations
- 002_rls_policies.sql
- 013_phase3_rls_policies.sql
- 20251207133000_emergency_rls_fix.sql
- 20251226*: Security fixes

### RPC Function Migrations
- 20251210*: Yield and AUM RPCs
- 20251213*: Position adjustments
- 20251220-20251223*: Various function updates

### View Migrations
- 007_audit_events_view.sql
- 20251226232827*: SECURITY INVOKER conversion

### Storage/Bucket Migrations
- 015_storage_buckets_setup.sql
- 202501090007_statements_storage_bucket.sql
