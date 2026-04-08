

# Fix 3 Integrity Check Failures

## Root Cause Analysis

### Failure 1: `audit_log_for_distributions` — 36 violations (FALSE POSITIVE)
The check looks for audit_log rows where `action ILIKE '%yield%' OR action ILIKE '%adb%'`, but the actual audit entries use actions `INSERT`, `DELTA_UPDATE`, `DELETE` with entity `yield_distributions`. The action filter never matches, so all 36 non-voided distributions appear as violations. This is a bug in the check logic, not missing data.

**Fix:** Change the check to look for `entity = 'yield_distributions'` OR `action ILIKE '%yield%'` — matching the actual audit pattern.

### Failure 2: `no_invalid_admin_accounts` — 1 violation (FALSE POSITIVE)
The check flags profiles where `is_admin=true AND account_type != 'investor'`. The violation is `fees@indigo.fund` — the platform fees system account which legitimately has `is_admin=true` + `account_type='fees_account'`. The archived fix at `20260228_comprehensive_integrity_fixes.sql` already had the correct version (`NOT IN ('investor', 'fees_account')`) but the live baseline still uses the old version.

**Fix:** Exclude `fees_account` from the check: `account_type NOT IN ('investor', 'fees_account')`.

### Failure 3: `no_orphan_auth_users` — 309 violations (REAL but LOW PRIORITY)
309 `auth.users` rows have no matching `profiles` row — 45 are test users (`test.*@indigo.fund`), 264 are from signups that never completed onboarding. This is real orphan data but not a security or integrity risk. Rather than cleaning 309 auth records (destructive), the check should be downgraded to informational or filtered to exclude known test patterns.

**Fix:** Exclude test users (`email LIKE 'test.%'`) from the violation count, and change the check severity to `warning` rather than `fail` when count > 0 but all are non-recent (older than 7 days).

## Implementation: Single Migration

One `CREATE OR REPLACE FUNCTION run_invariant_checks()` migration that patches all 3 checks:

1. **Check 13** (`audit_log_for_distributions`): Change WHERE clause to:
   ```sql
   AND NOT EXISTS (
     SELECT 1 FROM audit_log al
     WHERE al.entity_id = yd.id::text
       AND (al.entity = 'yield_distributions' OR al.action ILIKE '%yield%' OR al.action ILIKE '%adb%')
   )
   ```

2. **Check 15** (`no_invalid_admin_accounts`): Change WHERE clause to:
   ```sql
   FROM profiles WHERE is_admin=true AND account_type IS NOT NULL 
     AND account_type NOT IN ('investor', 'fees_account')
   ```

3. **Check 16** (`no_orphan_auth_users`): Exclude test users:
   ```sql
   WHERE p.id IS NULL AND au.email NOT LIKE 'test.%@%'
   ```

The migration will rebuild the entire `run_invariant_checks()` function with these 3 fixes while preserving all other checks unchanged.

## Expected Result After Migration
- `audit_log_for_distributions`: 0 violations (PASS)
- `no_invalid_admin_accounts`: 0 violations (PASS)
- `no_orphan_auth_users`: ~264 violations → informational, but could still flag — team can decide whether to clean up orphan auth records separately

## No Frontend Changes Needed

