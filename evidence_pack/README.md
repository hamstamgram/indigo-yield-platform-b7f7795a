# Evidence Pack - Reproduction Instructions

## Prerequisites

- Supabase CLI installed (`npm install -g supabase`)
- Access to Supabase project: `nkfimvovosdehmyyjubn`
- PostgreSQL client for query execution

## Reproducing Evidence

### 1. Database Evidence

Execute these queries against the Supabase database:

```bash
# Connect to database
supabase db connect --project-ref nkfimvovosdehmyyjubn

# Or use psql directly:
psql "postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres"
```

**Schema Snapshot:**
```sql
\i DATABASE/schema_snapshot.sql
```

**Constraints and Indexes:**
```sql
\i DATABASE/constraints_and_indexes.sql
```
Save output to `DATABASE/constraints_and_indexes_output.txt`

**RLS Policies:**
```sql
\i DATABASE/rls_policies_full.sql
```
Save output to `DATABASE/rls_policies_output.txt`

**RLS Matrix:**
```sql
\i DATABASE/rls_matrix.sql
```
Save output to `DATABASE/rls_matrix_output.txt`

### 2. Calculation Proofs

**Seed Test Data (CAUTION: Only on test environment):**
```sql
\i CALCULATIONS/seed_minimal_dataset.sql
```

**Run Distribution Test:**
```sql
\i CALCULATIONS/run_distribution.sql
```

**Verify Reconciliation:**
```sql
\i CALCULATIONS/reconciliation.sql
```
Export to `CALCULATIONS/reconciliation_output.csv`:
```sql
\copy (SELECT * FROM reconciliation_results) TO 'reconciliation_output.csv' CSV HEADER
```

### 3. No USD Scan

Run from project root:
```bash
# Scan for USD patterns
rg -i '\$|USD|eur|€|fiat|currency' \
  --type-add 'code:*.tsx' \
  --type-add 'code:*.ts' \
  --type code \
  src/routes/investor \
  src/routes/dashboard \
  src/components/investor \
  > evidence_pack/NO_USD/no_usd_scan.txt 2>&1

# Check for currency formatters
rg 'formatCurrency|toLocaleString.*currency' \
  --type-add 'code:*.tsx' \
  --type code \
  src/ \
  >> evidence_pack/NO_USD/no_usd_scan.txt 2>&1
```

### 4. Frontend Route Extraction

The routes_full.json was extracted by parsing:
- `src/routing/routes/admin/*.tsx`
- `src/routing/routes/investor/*.tsx`
- `src/routing/routes/ib.tsx`
- `src/routing/routes/public.tsx`

### 5. Visual Verification

Follow the checklist in `FRONTEND/screenshots_checklist.md` to manually verify UI states.

## Validation Checks

After reproduction, verify:

1. **Unique Constraints**: `unique_investor_period` exists on `generated_statements`
2. **Purpose Filtering**: StatementsPage.tsx uses `.eq("purpose", "reporting")` (no NULL fallback)
3. **RLS Enabled**: All 72+ public tables have `rowsecurity = true`
4. **No USD**: No matches for `$`, `USD`, `formatCurrency` in investor-facing code
5. **Idempotency**: All distribution functions use `ON CONFLICT` clauses

## Expected Results

| Check | Expected |
|-------|----------|
| Tables with RLS | 72+ |
| unique_investor_period constraint | EXISTS |
| NULL purpose rows in investor_fund_performance | 0 (after migration) |
| USD patterns in investor routes | 0 matches |
| Currency formatters in investor routes | 0 matches |
