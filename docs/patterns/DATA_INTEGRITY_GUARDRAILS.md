# Data Integrity Guardrails

## Overview

This document describes the proactive guardrails implemented to prevent data integrity issues before they occur.

## Database Triggers

### 1. `trg_ensure_crystallization_date`

**Table**: `investor_positions`  
**Event**: `BEFORE INSERT`

**Purpose**: Ensures every new investor position has a `last_yield_crystallization_date` set.

**Behavior**:
- If `last_yield_crystallization_date` is NULL on insert, sets it to the position's `created_at` date
- Prevents "Never Crystallized Positions" integrity warnings

```sql
-- Example: This position will automatically get crystallization date
INSERT INTO investor_positions (fund_id, investor_id, current_value)
VALUES ('fund-123', 'inv-456', 10000);
-- last_yield_crystallization_date will be set to CURRENT_DATE
```

---

### 2. `trg_check_duplicate_profile`

**Table**: `profiles`  
**Event**: `BEFORE INSERT OR UPDATE`

**Purpose**: Prevents duplicate profiles and logs potential duplicates.

**Behavior**:
- **Blocks** exact email duplicates (case-insensitive) with an exception
- **Logs** potential name-based duplicates to `audit_log` but allows the insert
- Checks on both INSERT and UPDATE of email, first_name, last_name

```sql
-- This will raise an exception if email already exists
INSERT INTO profiles (id, email, first_name, last_name)
VALUES (gen_random_uuid(), 'existing@example.com', 'John', 'Doe');
-- ERROR: Profile with email existing@example.com already exists

-- This will succeed but log a warning if name matches
INSERT INTO profiles (id, email, first_name, last_name)
VALUES (gen_random_uuid(), 'john.doe.new@example.com', 'John', 'Doe');
-- SUCCESS but audit_log entry created for potential_duplicate_detected
```

---

### 3. `trg_block_test_profiles`

**Table**: `profiles`  
**Event**: `BEFORE INSERT`

**Purpose**: Prevents test account patterns from polluting production data.

**Blocked Patterns**:
- `verify-inv-*`
- `test-investor-*`
- `test-user-*`
- `demo-user-*`

**Override for Testing**:
```sql
-- Allow test profiles in development/testing
SET app.allow_test_profiles = 'true';
INSERT INTO profiles (id, email) VALUES (gen_random_uuid(), 'test-investor-123@example.com');
-- SUCCESS (due to override)
```

---

## Scheduled Functions

### `nightly_aum_reconciliation()`

**Schedule**: Nightly at 1:00 AM (via pg_cron)  
**Purpose**: Auto-reconcile fund AUM with actual position totals

**Behavior**:
1. Queries `fund_aum_mismatch` view for discrepancies
2. If mismatches found, calls `reconcile_fund_aum_with_positions()`
3. Logs results to `audit_log`

**Manual Invocation**:
```sql
SELECT nightly_aum_reconciliation();
-- Returns: {"mismatches_found": 0, "result": {...}, "run_at": "..."}
```

---

## Transaction Source Whitelist

The integrity monitor validates that all transactions come from approved sources:

| Source | Description |
|--------|-------------|
| `rpc_canonical` | Standard RPC calls (canonical flow) |
| `crystallization` | Yield crystallization process |
| `manual_admin` | Manual admin corrections |
| `yield_distribution` | Yield distribution process |
| `system` | System-generated transactions |
| `migration` | Data migration scripts |
| `reconciliation_fix` | Reconciliation corrections |
| `position_sync` | Position sync operations |
| `import` | Data import operations |
| `correction` | Manual corrections |

Transactions with sources not in this list trigger a warning in the integrity monitor.

---

## Prevention Matrix

| Issue Type | Prevention Mechanism | Severity |
|------------|---------------------|----------|
| Fund AUM Mismatch | `nightly_aum_reconciliation()` | Auto-fix |
| Never Crystallized | `trg_ensure_crystallization_date` | Prevented |
| Duplicate Profiles | `trg_check_duplicate_profile` | Blocked/Logged |
| Test Data Pollution | `trg_block_test_profiles` | Blocked |
| Unknown Transaction Source | Whitelist check in integrity-monitor | Warning |

---

## Monitoring

All guardrails log their actions to `audit_log` with the following actions:
- `potential_duplicate_detected` - Name-based duplicate warning
- `nightly_aum_reconciliation` - AUM reconciliation results

View recent guardrail activity:
```sql
SELECT * FROM audit_log 
WHERE action IN ('potential_duplicate_detected', 'nightly_aum_reconciliation')
ORDER BY created_at DESC 
LIMIT 20;
```

---

## Real-Time Integrity Triggers (2026-01 Upgrade)

The platform has been upgraded to a **real-time-first** integrity architecture. Database triggers now detect issues at write-time and either auto-heal or alert immediately.

### Alert Triggers

| Trigger | Table | Action |
|---------|-------|--------|
| `trg_alert_aum_position_mismatch` | `investor_positions` | Creates admin_alert when position changes cause AUM drift |
| `trg_alert_yield_conservation` | `yield_distributions` | Creates admin_alert if gross ≠ net + fees |
| `trg_alert_ledger_drift` | `transactions_v2` | Creates admin_alert if ledger sum drifts from positions |

### Auto-Healing Triggers

| Trigger | Table | Action |
|---------|-------|--------|
| `trg_auto_heal_aum` | `investor_positions` | Calls `sync_aum_to_positions()` to fix drift automatically |
| `trg_auto_heal_position` | `transactions_v2` | Calls `recompute_investor_position()` if ledger mismatch detected |

### Live Views (No MV Refresh Needed)

| View | Replaces |
|------|----------|
| `v_fund_summary_live` | `mv_fund_summary` |
| `v_daily_platform_metrics_live` | `mv_daily_platform_metrics` |

These live views compute on-read, eliminating the need for MV refresh calls after yield operations.

### Real-Time Alert Subscription

The `useRealtimeAlerts` hook subscribes to the `admin_alerts` table via Supabase Realtime:
- Toast notifications appear instantly on new alerts
- Integrity dashboard auto-updates
- No polling required

---

## Adding New Guardrails

1. Create the trigger function in a migration
2. Document in this file
3. Add to `docs/REGRESSION_PREVENTION.md` if it prevents a known regression
4. Test with override settings where applicable
