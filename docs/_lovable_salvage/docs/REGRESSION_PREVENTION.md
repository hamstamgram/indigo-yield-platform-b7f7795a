# Regression Prevention Guide

## Overview

This document describes the guardrails in place to prevent common regressions in the Indigo Yield Platform.

## Migration Guardrails

### Script: `scripts/check-migrations.sh`

**Purpose**: Prevent forbidden patterns from being introduced in migrations.

**Usage**:
```bash
./scripts/check-migrations.sh
```

**Checked Patterns**:

| Pattern | Reason |
|---------|--------|
| `withdrawal_audit_log[^s]` | Must use plural `withdrawal_audit_logs` |

**Exit Codes**:
- `0`: All checks passed
- `1`: Forbidden pattern found

### Adding to CI

```yaml
# .github/workflows/ci.yml
jobs:
  migration-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Check migrations
        run: ./scripts/check-migrations.sh
```

## Database Smoke Tests

### Script: `scripts/db-smoke-test.sh`

**Purpose**: Verify database integrity after migrations.

**Usage**:
```bash
# Local Supabase
./scripts/db-smoke-test.sh

# CI mode (stricter, fails on any issue)
./scripts/db-smoke-test.sh --ci

# Custom database
DATABASE_URL=postgresql://... ./scripts/db-smoke-test.sh
```

**Checks Performed**:

| Check | Expected | Purpose |
|-------|----------|---------|
| Fund AUM mismatches | 0 | Verify fund totals match positions |
| Investor position mismatches | 0 | Verify positions match ledger |
| Period orphans | 0 | No orphan statement periods |
| Transaction distribution orphans | 0 | All transactions linked to distributions |
| Yield distribution conservation | 0 | Fees + net = gross |
| withdrawal_audit_logs table | exists | Schema validation |
| withdrawal_audit_log view | exists | Compatibility layer |
| Withdrawal RPC functions | exist | Function availability |

## Integrity Views

These views return rows ONLY when there's a mismatch:

### `fund_aum_mismatch`

Compares fund AUM records against sum of investor positions.

```sql
SELECT * FROM fund_aum_mismatch WHERE mismatch_abs > 0.01;
```

### `investor_position_ledger_mismatch`

Compares investor positions against sum of transactions.

```sql
SELECT * FROM investor_position_ledger_mismatch WHERE abs_diff > 0.01;
```

### `yield_distribution_conservation_check`

Verifies: gross_yield = net_to_investors + total_fees

```sql
SELECT * FROM yield_distribution_conservation_check WHERE NOT is_balanced;
```

### `v_period_orphans`

Finds statement periods without matching fund data.

```sql
SELECT * FROM v_period_orphans;
```

### `v_transaction_distribution_orphans`

Finds transactions not linked to any distribution.

```sql
SELECT * FROM v_transaction_distribution_orphans;
```

## Pre-Operation Integrity Checks

Before performing critical operations, the system should verify integrity:

```typescript
// Example: Before applying yield distribution
const mismatches = await supabase
  .from('fund_aum_mismatch')
  .select('*')
  .gt('mismatch_abs', 0.01);

if (mismatches.data?.length > 0) {
  throw new Error('Cannot apply yield: fund AUM mismatch detected');
}
```

## Known Regressions and Fixes

### 1. withdrawal_audit_log Table Name Bug

**Symptom**: `relation "withdrawal_audit_log" does not exist`

**Root Cause**: Migrations used singular table name instead of plural.

**Fix Applied**:
1. Canonical table is `withdrawal_audit_logs` (plural)
2. Compatibility view `withdrawal_audit_log` created
3. All RPCs updated to use plural form
4. Migration check script prevents reintroduction

**Prevention**:
- `scripts/check-migrations.sh` blocks singular form
- Documentation in `docs/flows/WITHDRAWAL_FLOW.md`

### 2. CSRF Token Validation for Edge Functions

**Symptom**: `403 Invalid CSRF token` on admin operations

**Root Cause**: CSRF tokens weren't being forwarded by `supabase.functions.invoke`

**Fix Applied**: Removed CSRF validation from edge functions using Bearer token auth (inherently CSRF-resistant).

**Prevention**: Edge functions using Bearer tokens don't need CSRF protection.

## Development Workflow

### Before Committing

1. Run migration checks:
   ```bash
   ./scripts/check-migrations.sh
   ```

2. If adding new migrations, run smoke test:
   ```bash
   ./scripts/db-smoke-test.sh
   ```

### Before Deploying

1. Run full smoke test in CI mode:
   ```bash
   ./scripts/db-smoke-test.sh --ci
   ```

2. Verify integrity views in production:
   ```sql
   SELECT 'fund_aum' as check, COUNT(*) as issues FROM fund_aum_mismatch WHERE mismatch_abs > 0.01
   UNION ALL
   SELECT 'positions', COUNT(*) FROM investor_position_ledger_mismatch WHERE abs_diff > 0.01
    UNION ALL
    SELECT 'yield_conservation', COUNT(*) FROM yield_distribution_conservation_check WHERE NOT is_balanced;
    ```

## Proactive Guardrails (Triggers)

The following triggers prevent data integrity issues before they occur:

### Position Crystallization Date

**Trigger**: `trg_ensure_crystallization_date`

Ensures every new investor position has `last_yield_crystallization_date` set to prevent "Never Crystallized" warnings.

### Duplicate Profile Detection

**Trigger**: `trg_check_duplicate_profile`

- Blocks exact email duplicates (raises exception)
- Logs name-based potential duplicates to `audit_log`

### Test Profile Blocking

**Trigger**: `trg_block_test_profiles`

Blocks test account patterns (`verify-inv-*`, `test-investor-*`, etc.) in production. Override with:
```sql
SET app.allow_test_profiles = 'true';
```

### Nightly AUM Reconciliation

**Function**: `nightly_aum_reconciliation()`

Auto-fixes any fund AUM mismatches nightly. Can be scheduled via pg_cron.

See `docs/patterns/DATA_INTEGRITY_GUARDRAILS.md` for full documentation.

## Adding New Guardrails

### Adding a New Forbidden Pattern

Edit `scripts/check-migrations.sh`:

```bash
declare -A FORBIDDEN_PATTERNS=(
  ["existing_pattern"]="Explanation"
  ["new_forbidden_pattern"]="Why this is forbidden"
)
```

### Adding a New Integrity View

1. Create migration with the view
2. Add check to `scripts/db-smoke-test.sh`:
   ```bash
   run_check "New integrity check" \
     "SELECT COUNT(*) FROM new_integrity_view WHERE has_issue" \
     "0" || ((FAILURES++))
   ```
3. Document in this file

### Adding a New Trigger Guardrail

1. Create the trigger function in a migration
2. Document in `docs/patterns/DATA_INTEGRITY_GUARDRAILS.md`
3. Add reference to this file

### Adding a New RPC Function Check

Add to `scripts/db-smoke-test.sh`:

```bash
run_check "new_function_name function" \
  "SELECT COUNT(*) FROM pg_proc WHERE proname = 'new_function_name'" \
  "1" || ((FAILURES++))
```
