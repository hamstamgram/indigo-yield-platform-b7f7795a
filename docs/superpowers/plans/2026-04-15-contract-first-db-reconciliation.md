# Contract-First Database Reconciliation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reconcile the live Supabase database with the frontend's expectations so every RPC call, enum reference, and table query works end-to-end without runtime errors.

**Architecture:** The canonical contract (`docs/release/00-canonical-contract.md`) is the spec. We write SQL migrations to make the DB match the contract, then regenerate frontend types from the corrected DB. TypeScript compilation catches any remaining drift. E2E tests validate critical flows.

**Tech Stack:** PostgreSQL (Supabase), TypeScript, Zod, Supabase CLI, Playwright

---

## Current State Summary

**What works:** 250+ functions exist, 43 tables present, core RPCs (`apply_segmented_yield_distribution_v5`, `void_transaction`, `void_yield_distribution`) return correct response shapes. Table columns for void state (`is_voided`, `voided_at`, etc.) are present on all required tables. `withdrawal_requests.updated_at` exists. Zero TypeScript errors currently.

**What's broken:** 8 RPCs called by the frontend do not exist in the database. 1 enum value (`DUST`) exists in DB but not in frontend types. The `fund_status` enum in the DB doesn't match the canonical contract. 5 stabilization migrations have not been applied. The `cancel_withdrawal_by_admin_v2` RPC the frontend calls doesn't exist (only v1 does).

---

## Gap Registry (Verified Against Live DB on 2026-04-15)

### A. Missing RPCs (Frontend calls them, DB doesn't have them)

| # | RPC Name | Called From | Severity |
|---|----------|-------------|----------|
| M1 | `cancel_withdrawal_by_admin_v2` | `withdrawalService.ts:371,504` | **P0** — withdrawal cancel/delete is broken |
| M2 | `void_completed_withdrawal` | `withdrawalService.ts:351` | **P0** — voiding completed withdrawals is broken |
| M3 | `get_paged_audit_logs` | `auditLogService.ts:129` | **P0** — admin audit log page is broken |
| M4 | `get_paged_notifications` | `notificationService.ts:18` | **P0** — notification bell is broken |
| M5 | `get_investor_cumulative_yield` | `rpcSignatures.ts` (registered) | **P1** — investor yield summary missing |
| M6 | `get_investor_yield_summary` | `rpcSignatures.ts` (registered) | **P1** — investor yield history missing |
| M7 | `get_fund_positions_sum` | `rpcSignatures.ts` (registered) | **P2** — fund summary data |
| M8 | `get_drift_summary` | `rpcSignatures.ts:97` (registered, in types.ts) | **P2** — admin drift monitoring |

### B. Enum Mismatches

| # | Enum | Gap | Severity |
|---|------|-----|----------|
| E1 | `tx_type` | DB has `DUST`, frontend `dbEnums.ts` only has `DUST_SWEEP` | **P1** — yield v5 creates `DUST` transactions, frontend switch cases will miss them |
| E2 | `fund_status` | DB: `active,inactive,suspended,deprecated,pending`. Contract says: `active,inactive,closed,available` | **P1** — frontend may filter on values that don't exist |

### C. Pending Migrations (In repo but not applied to DB)

| # | Migration | Purpose |
|---|-----------|---------|
| C1 | `20260601000000_stabilization_phase1_schema_contract.sql` | Schema contract verification |
| C2 | `20260601020000_stabilization_phase3_yield_constraint.sql` | Yield constraint hardening |
| C3 | `20260601030000_stabilization_phase4_notifications.sql` | Notification system |
| C4 | `20260601040000_stabilization_phase5_reporting.sql` | Reporting views |
| C5 | `20260414000000_fix_void_yield_distribution_voided_count_response.sql` | Already fixed in live DB — skip |

### D. Already Fixed (No action needed)

| Item | Status |
|------|--------|
| `void_yield_distribution` returns `voided_count` | FIXED in live DB |
| `apply_segmented_yield_distribution_v5` returns `period_start`, `period_end` | FIXED in live DB |
| `apply_investor_transaction` exists (2 overloads) | EXISTS in live DB |
| `withdrawal_requests.updated_at` column | EXISTS |
| `investor_positions.updated_at` column | EXISTS |

---

## File Map

### Files to Create (SQL Migrations)

| File | Responsibility |
|------|----------------|
| `supabase/migrations/20260610000000_reconciliation_missing_rpcs.sql` | Create all 8 missing RPCs |
| `supabase/migrations/20260610010000_reconciliation_enum_alignment.sql` | Add missing enum values |

### Files to Modify (Frontend)

| File | Change |
|------|--------|
| `src/contracts/dbEnums.ts` | Add `DUST` to `TX_TYPE_VALUES` (after regeneration) |
| `src/contracts/rpcSignatures.ts` | Will be regenerated |
| `src/contracts/dbSchema.ts` | Will be regenerated |
| `src/integrations/supabase/types.ts` | Will be regenerated |
| `src/features/shared/services/withdrawalService.ts` | Remove `as any` casts once types match |

### Files to Verify (No changes expected)

| File | Verify |
|------|--------|
| `src/services/shared/auditLogService.ts` | Compiles after type regen |
| `src/services/shared/notificationService.ts` | Compiles after type regen |
| `src/features/admin/withdrawals/components/WithdrawalsTable.tsx` | Renders with correct data |
| `src/features/admin/withdrawals/components/WithdrawalDetailsDrawer.tsx` | Drawer shows data |

---

## Task 1: Create Missing RPCs — Withdrawal Domain (P0)

**Files:**
- Create: `supabase/migrations/20260610000000_reconciliation_missing_rpcs.sql`

These two RPCs are **P0 blockers** — the withdrawal admin page calls them directly.

- [ ] **Step 1.1: Write `cancel_withdrawal_by_admin_v2` RPC**

This wraps the existing v1 cancel logic with proper audit trail and state machine validation. The frontend passes `p_request_id`, `p_reason`, `p_admin_notes`.

```sql
-- In: supabase/migrations/20260610000000_reconciliation_missing_rpcs.sql

-- =============================================================================
-- RECONCILIATION: Missing RPCs that the frontend calls but DB lacks
-- =============================================================================

-- M1: cancel_withdrawal_by_admin_v2
-- Called by: withdrawalService.ts:371, withdrawalService.ts:504
-- Frontend sends: { p_request_id, p_reason, p_admin_notes }
-- Frontend expects: no return value (checks for error only)
CREATE OR REPLACE FUNCTION public.cancel_withdrawal_by_admin_v2(
  p_request_id uuid,
  p_reason text DEFAULT 'Cancelled by admin',
  p_admin_notes text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_admin_id uuid;
  v_withdrawal RECORD;
BEGIN
  v_admin_id := auth.uid();
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Admin only';
  END IF;

  SELECT * INTO v_withdrawal
  FROM withdrawal_requests
  WHERE id = p_request_id;

  IF v_withdrawal IS NULL THEN
    RAISE EXCEPTION 'Withdrawal request not found: %', p_request_id;
  END IF;

  IF v_withdrawal.status NOT IN ('pending', 'approved') THEN
    RAISE EXCEPTION 'Cannot cancel withdrawal in status: %', v_withdrawal.status;
  END IF;

  UPDATE withdrawal_requests
  SET status = 'cancelled',
      cancellation_reason = p_reason,
      cancelled_by = v_admin_id,
      cancelled_at = NOW(),
      admin_notes = COALESCE(p_admin_notes, admin_notes),
      updated_at = NOW()
  WHERE id = p_request_id;

  INSERT INTO audit_log (actor_user, action, entity, entity_id, old_values, new_values)
  VALUES (
    v_admin_id,
    'WITHDRAWAL_CANCELLED_BY_ADMIN',
    'withdrawal_requests',
    p_request_id::text,
    jsonb_build_object('status', v_withdrawal.status),
    jsonb_build_object('status', 'cancelled', 'reason', p_reason, 'admin_notes', p_admin_notes)
  );

  RETURN json_build_object('success', true, 'withdrawal_id', p_request_id);
END;
$$;
```

- [ ] **Step 1.2: Write `void_completed_withdrawal` RPC**

Called when admin cancels a withdrawal that's already in `completed` status. Must void the associated transaction and recompute positions.

```sql
-- M2: void_completed_withdrawal
-- Called by: withdrawalService.ts:351
-- Frontend sends: { p_withdrawal_id, p_reason }
-- Frontend expects: { success: boolean, error?: string }
CREATE OR REPLACE FUNCTION public.void_completed_withdrawal(
  p_withdrawal_id uuid,
  p_reason text DEFAULT 'Voided by admin'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_admin_id uuid;
  v_withdrawal RECORD;
  v_tx RECORD;
BEGIN
  v_admin_id := auth.uid();
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Admin only';
  END IF;

  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  SELECT * INTO v_withdrawal
  FROM withdrawal_requests
  WHERE id = p_withdrawal_id;

  IF v_withdrawal IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Withdrawal not found');
  END IF;

  IF v_withdrawal.status <> 'completed' THEN
    RETURN json_build_object('success', false, 'error',
      'Only completed withdrawals can be voided. Current status: ' || v_withdrawal.status);
  END IF;

  -- Find and void the associated withdrawal transaction
  FOR v_tx IN
    SELECT id FROM transactions_v2
    WHERE fund_id = v_withdrawal.fund_id
      AND investor_id = v_withdrawal.investor_id
      AND type = 'WITHDRAWAL'
      AND NOT is_voided
      AND tx_date >= (v_withdrawal.approved_at - interval '7 days')::date
    ORDER BY created_at DESC
    LIMIT 1
  LOOP
    PERFORM void_transaction(v_tx.id, v_admin_id, 'Void completed withdrawal: ' || p_reason);
  END LOOP;

  -- Reset withdrawal status to cancelled
  UPDATE withdrawal_requests
  SET status = 'cancelled',
      cancellation_reason = 'VOIDED: ' || p_reason,
      cancelled_by = v_admin_id,
      cancelled_at = NOW(),
      updated_at = NOW()
  WHERE id = p_withdrawal_id;

  INSERT INTO audit_log (actor_user, action, entity, entity_id, old_values, new_values)
  VALUES (
    v_admin_id,
    'COMPLETED_WITHDRAWAL_VOIDED',
    'withdrawal_requests',
    p_withdrawal_id::text,
    jsonb_build_object('status', 'completed'),
    jsonb_build_object('status', 'cancelled', 'reason', p_reason)
  );

  RETURN json_build_object('success', true, 'withdrawal_id', p_withdrawal_id);
END;
$$;
```

- [ ] **Step 1.3: Apply migration to live DB**

```bash
# Via Supabase MCP or dashboard — apply the migration
# Verify both functions exist:
SELECT proname FROM pg_proc
WHERE proname IN ('cancel_withdrawal_by_admin_v2', 'void_completed_withdrawal')
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
-- Expected: 2 rows
```

- [ ] **Step 1.4: Commit**

```bash
git add supabase/migrations/20260610000000_reconciliation_missing_rpcs.sql
git commit -m "feat(db): add cancel_withdrawal_by_admin_v2 and void_completed_withdrawal RPCs"
```

---

## Task 2: Create Missing RPCs — Audit & Notification (P0)

**Files:**
- Modify: `supabase/migrations/20260610000000_reconciliation_missing_rpcs.sql`

- [ ] **Step 2.1: Write `get_paged_audit_logs` RPC**

The frontend sends `{ p_limit, p_offset, p_entity, p_action, p_actor_id }` and expects rows with a `total_count` window column.

```sql
-- M3: get_paged_audit_logs
-- Called by: auditLogService.ts:129
-- Frontend expects: array of audit_log rows with total_count window column
CREATE OR REPLACE FUNCTION public.get_paged_audit_logs(
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0,
  p_entity text DEFAULT NULL,
  p_action text DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  actor_user uuid,
  action text,
  entity text,
  entity_id text,
  old_values jsonb,
  new_values jsonb,
  meta jsonb,
  created_at timestamptz,
  total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Admin only';
  END IF;

  RETURN QUERY
  SELECT
    al.id,
    al.actor_user,
    al.action,
    al.entity,
    al.entity_id,
    al.old_values,
    al.new_values,
    al.meta,
    al.created_at,
    COUNT(*) OVER()::bigint AS total_count
  FROM audit_log al
  WHERE (p_entity IS NULL OR al.entity = p_entity)
    AND (p_action IS NULL OR al.action = p_action)
    AND (p_actor_id IS NULL OR al.actor_user = p_actor_id)
  ORDER BY al.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;
```

- [ ] **Step 2.2: Write `get_paged_notifications` RPC**

The frontend sends `{ p_page, p_page_size }` and expects notification rows.

```sql
-- M4: get_paged_notifications
-- Called by: notificationService.ts:18
CREATE OR REPLACE FUNCTION public.get_paged_notifications(
  p_page int DEFAULT 1,
  p_page_size int DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  title text,
  message text,
  type notification_type,
  priority notification_priority,
  is_read boolean,
  metadata jsonb,
  created_at timestamptz,
  total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_offset int;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Authentication required';
  END IF;

  v_offset := (p_page - 1) * p_page_size;

  RETURN QUERY
  SELECT
    n.id,
    n.user_id,
    n.title,
    n.message,
    n.type,
    n.priority,
    n.is_read,
    n.metadata,
    n.created_at,
    COUNT(*) OVER()::bigint AS total_count
  FROM notifications n
  WHERE n.user_id = v_user_id
  ORDER BY n.created_at DESC
  LIMIT p_page_size
  OFFSET v_offset;
END;
$$;
```

- [ ] **Step 2.3: Apply and verify**

```bash
# Apply migration, then verify:
SELECT proname FROM pg_proc
WHERE proname IN ('get_paged_audit_logs', 'get_paged_notifications')
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
-- Expected: 2 rows
```

- [ ] **Step 2.4: Commit**

```bash
git add supabase/migrations/20260610000000_reconciliation_missing_rpcs.sql
git commit -m "feat(db): add get_paged_audit_logs and get_paged_notifications RPCs"
```

---

## Task 3: Create Missing RPCs — Investor Data (P1)

**Files:**
- Modify: `supabase/migrations/20260610000000_reconciliation_missing_rpcs.sql`

- [ ] **Step 3.1: Write `get_investor_cumulative_yield` RPC**

```sql
-- M5: get_investor_cumulative_yield
-- Returns ITD cumulative yield for an investor in a fund
CREATE OR REPLACE FUNCTION public.get_investor_cumulative_yield(
  p_investor_id uuid,
  p_fund_id uuid
)
RETURNS TABLE (
  total_gross numeric,
  total_net numeric,
  total_fees numeric,
  total_ib numeric,
  distribution_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(ya.gross_amount), 0) AS total_gross,
    COALESCE(SUM(ya.net_amount), 0) AS total_net,
    COALESCE(SUM(ya.fee_amount), 0) AS total_fees,
    COALESCE(SUM(ya.ib_amount), 0) AS total_ib,
    COUNT(DISTINCT ya.distribution_id) AS distribution_count
  FROM yield_allocations ya
  JOIN yield_distributions yd ON yd.id = ya.distribution_id
  WHERE ya.investor_id = p_investor_id
    AND ya.fund_id = p_fund_id
    AND NOT COALESCE(ya.is_voided, false)
    AND NOT COALESCE(yd.is_voided, false);
END;
$$;
```

- [ ] **Step 3.2: Write `get_investor_yield_summary` RPC**

```sql
-- M6: get_investor_yield_summary
-- Returns yield history for an investor across all funds
CREATE OR REPLACE FUNCTION public.get_investor_yield_summary(
  p_investor_id uuid
)
RETURNS TABLE (
  distribution_id uuid,
  fund_id uuid,
  fund_name text,
  period_start date,
  period_end date,
  gross_amount numeric,
  net_amount numeric,
  fee_amount numeric,
  ib_amount numeric,
  effective_date date,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ya.distribution_id,
    ya.fund_id,
    f.name AS fund_name,
    yd.period_start,
    yd.period_end,
    ya.gross_amount,
    ya.net_amount,
    ya.fee_amount,
    ya.ib_amount,
    yd.effective_date,
    ya.created_at
  FROM yield_allocations ya
  JOIN yield_distributions yd ON yd.id = ya.distribution_id
  JOIN funds f ON f.id = ya.fund_id
  WHERE ya.investor_id = p_investor_id
    AND NOT COALESCE(ya.is_voided, false)
    AND NOT COALESCE(yd.is_voided, false)
  ORDER BY yd.effective_date DESC;
END;
$$;
```

- [ ] **Step 3.3: Write `get_fund_positions_sum` and `get_drift_summary` RPCs**

```sql
-- M7: get_fund_positions_sum
CREATE OR REPLACE FUNCTION public.get_fund_positions_sum(
  p_fund_id uuid
)
RETURNS TABLE (
  total_value numeric,
  active_count bigint,
  total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Admin only';
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(SUM(CASE WHEN ip.is_active THEN ip.current_value ELSE 0 END), 0) AS total_value,
    COUNT(*) FILTER (WHERE ip.is_active) AS active_count,
    COUNT(*) AS total_count
  FROM investor_positions ip
  WHERE ip.fund_id = p_fund_id;
END;
$$;

-- M8: get_drift_summary
CREATE OR REPLACE FUNCTION public.get_drift_summary()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result json;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Admin only';
  END IF;

  SELECT json_build_object(
    'aum_position_mismatches', (
      SELECT COUNT(*) FROM v_fund_aum_position_health
      WHERE health_status <> 'OK'
    ),
    'orphaned_positions', (
      SELECT COUNT(*) FROM v_orphaned_positions
    ),
    'orphaned_transactions', (
      SELECT COUNT(*) FROM v_orphaned_transactions
    ),
    'yield_conservation_violations', (
      SELECT COUNT(*) FROM v_yield_conservation_violations
    ),
    'checked_at', NOW()
  ) INTO v_result;

  RETURN v_result;
END;
$$;
```

- [ ] **Step 3.4: Apply and verify**

```bash
SELECT proname FROM pg_proc
WHERE proname IN ('get_investor_cumulative_yield', 'get_investor_yield_summary', 'get_fund_positions_sum', 'get_drift_summary')
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
-- Expected: 4 rows
```

- [ ] **Step 3.5: Commit**

```bash
git add supabase/migrations/20260610000000_reconciliation_missing_rpcs.sql
git commit -m "feat(db): add investor yield, fund positions, and drift summary RPCs"
```

---

## Task 4: Enum Alignment Migration

**Files:**
- Create: `supabase/migrations/20260610010000_reconciliation_enum_alignment.sql`

- [ ] **Step 4.1: Add `DUST` to `tx_type` frontend awareness**

The DB already has `DUST` in the `tx_type` enum. The frontend `dbEnums.ts` is auto-generated, so the fix is to ensure it gets included during regeneration. But first we need to verify the canonical contract decision:

The v5 yield RPC creates `DUST` type transactions for residual allocation amounts. The frontend must recognize this type. No DB migration needed — `DUST` already exists in the enum. The fix is in the frontend type regeneration (Task 6).

- [ ] **Step 4.2: Reconcile `fund_status` enum**

The canonical contract says `active | inactive | closed | available` but the DB has `active | inactive | suspended | deprecated | pending`. We need to add the missing values the contract specifies AND keep the existing ones.

```sql
-- In: supabase/migrations/20260610010000_reconciliation_enum_alignment.sql

-- =============================================================================
-- RECONCILIATION: Enum alignment between frontend contract and DB
-- =============================================================================

-- E2: fund_status — add 'closed' and 'available' values
-- The DB has: active, inactive, suspended, deprecated, pending
-- The contract needs: active, inactive, closed, available (plus existing)
-- Strategy: ADD the missing values, keep all existing ones

-- Check if 'closed' already exists before adding
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'fund_status'::regtype
      AND enumlabel = 'closed'
  ) THEN
    ALTER TYPE fund_status ADD VALUE 'closed';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'fund_status'::regtype
      AND enumlabel = 'available'
  ) THEN
    ALTER TYPE fund_status ADD VALUE 'available';
  END IF;
END $$;
```

- [ ] **Step 4.3: Apply and verify**

```sql
SELECT enumlabel FROM pg_enum
WHERE enumtypid = 'fund_status'::regtype
ORDER BY enumsortorder;
-- Expected: active, inactive, suspended, deprecated, pending, closed, available
```

- [ ] **Step 4.4: Commit**

```bash
git add supabase/migrations/20260610010000_reconciliation_enum_alignment.sql
git commit -m "feat(db): add closed and available to fund_status enum"
```

---

## Task 5: Apply Pending Stabilization Migrations

**Files:**
- Existing: `supabase/migrations/20260601000000_stabilization_phase1_schema_contract.sql`
- Existing: `supabase/migrations/20260601020000_stabilization_phase3_yield_constraint.sql`
- Existing: `supabase/migrations/20260601030000_stabilization_phase4_notifications.sql`
- Existing: `supabase/migrations/20260601040000_stabilization_phase5_reporting.sql`

- [ ] **Step 5.1: Review each pending migration for safety**

Read each migration file. Check that:
1. It won't fail against the current DB state (e.g., columns already exist, constraints already present)
2. It doesn't conflict with the reconciliation migrations from Tasks 1-4
3. It uses `IF NOT EXISTS` / `DO $$ ... $$` guards for idempotency

```bash
# Check each migration for potential conflicts
grep -n "CREATE\|ALTER\|DROP" supabase/migrations/20260601000000_stabilization_phase1_schema_contract.sql
grep -n "CREATE\|ALTER\|DROP" supabase/migrations/20260601020000_stabilization_phase3_yield_constraint.sql
grep -n "CREATE\|ALTER\|DROP" supabase/migrations/20260601030000_stabilization_phase4_notifications.sql
grep -n "CREATE\|ALTER\|DROP" supabase/migrations/20260601040000_stabilization_phase5_reporting.sql
```

- [ ] **Step 5.2: Apply each migration in order**

Apply via Supabase MCP `apply_migration` tool or dashboard, one at a time:

1. `20260601000000_stabilization_phase1_schema_contract.sql`
2. `20260601020000_stabilization_phase3_yield_constraint.sql`
3. `20260601030000_stabilization_phase4_notifications.sql`
4. `20260601040000_stabilization_phase5_reporting.sql`

After each, verify no errors. If a migration fails, diagnose and fix before proceeding.

- [ ] **Step 5.3: Verify migration state**

```sql
SELECT version FROM supabase_migrations.schema_migrations
WHERE version >= '20260601'
ORDER BY version;
-- Expected: 4 new rows (the stabilization migrations)
```

- [ ] **Step 5.4: Commit any migration fixes**

If any migration needed modification to apply cleanly, commit those changes:

```bash
git add supabase/migrations/
git commit -m "fix(db): apply stabilization phase 1-5 migrations"
```

---

## Task 6: Regenerate Frontend Types

**Files:**
- Regenerated: `src/integrations/supabase/types.ts`
- Regenerated: `src/contracts/rpcSignatures.ts`
- Regenerated: `src/contracts/dbSchema.ts`
- Regenerated: `src/contracts/dbEnums.ts`

- [ ] **Step 6.1: Run the contract generator**

```bash
npm run contracts:generate
```

This regenerates all 4 contract files from the now-reconciled database. The new types will include:
- All 8 newly created RPCs in `rpcSignatures.ts`
- `DUST` in `TX_TYPE_VALUES` in `dbEnums.ts`
- `closed` and `available` in `FUND_STATUS_VALUES` in `dbEnums.ts`
- Updated function signatures in `types.ts`

- [ ] **Step 6.2: Verify regeneration captured changes**

```bash
# Check that new RPCs appear
grep -c "cancel_withdrawal_by_admin_v2\|void_completed_withdrawal\|get_paged_audit_logs\|get_paged_notifications" src/contracts/rpcSignatures.ts
# Expected: 4+ matches

# Check that DUST is now in tx_type
grep "DUST" src/contracts/dbEnums.ts
# Expected: Both DUST and DUST_SWEEP appear

# Check fund_status includes new values
grep -A10 "FUND_STATUS_VALUES" src/contracts/dbEnums.ts
# Expected: includes closed, available
```

- [ ] **Step 6.3: Run TypeScript compilation**

```bash
npx tsc --noEmit 2>&1 | head -40
```

If there are TypeScript errors, they will be in files that reference the newly-typed RPCs without matching the regenerated signatures. Proceed to Task 7 to fix them.

- [ ] **Step 6.4: Commit**

```bash
git add src/integrations/supabase/types.ts src/contracts/rpcSignatures.ts src/contracts/dbSchema.ts src/contracts/dbEnums.ts
git commit -m "chore: regenerate frontend contracts from reconciled database"
```

---

## Task 7: Fix Frontend Compilation Errors

**Files:**
- Modify: `src/features/shared/services/withdrawalService.ts`
- Modify: `src/services/shared/auditLogService.ts`
- Modify: `src/services/shared/notificationService.ts`
- Potentially: any file with `as any` casts on RPC calls

- [ ] **Step 7.1: Remove `as any` casts from withdrawal service**

After type regeneration, the RPC names will be in the type registry, so `as any` casts are no longer needed.

```typescript
// In src/features/shared/services/withdrawalService.ts

// BEFORE (line ~351):
const { data, error } = await rpc.call("void_completed_withdrawal" as any, {
  p_withdrawal_id: withdrawalId,
  p_reason: reason,
} as any);

// AFTER:
const { data, error } = await rpc.call("void_completed_withdrawal", {
  p_withdrawal_id: withdrawalId,
  p_reason: reason,
});

// BEFORE (line ~371):
const { error } = await rpc.call("cancel_withdrawal_by_admin_v2" as any, {
  p_request_id: withdrawalId,
  p_reason: reason,
  p_admin_notes: adminNotes ? `${adminNotes} [${corrId}]` : `[${corrId}]`,
} as any);

// AFTER:
const { error } = await rpc.call("cancel_withdrawal_by_admin_v2", {
  p_request_id: withdrawalId,
  p_reason: reason,
  p_admin_notes: adminNotes ? `${adminNotes} [${corrId}]` : `[${corrId}]`,
});

// Same for line ~504
```

- [ ] **Step 7.2: Remove `as any` casts from audit log service**

```typescript
// In src/services/shared/auditLogService.ts (line ~129):

// BEFORE:
const { data, error } = await callRPC("get_paged_audit_logs" as any, { ... });

// AFTER:
const { data, error } = await callRPC("get_paged_audit_logs", { ... });
```

- [ ] **Step 7.3: Remove `as any` casts from notification service**

```typescript
// In src/services/shared/notificationService.ts (line ~18):

// BEFORE:
const { data, error } = await callRPC("get_paged_notifications" as any, { ... });

// AFTER:
const { data, error } = await callRPC("get_paged_notifications", { ... });
```

- [ ] **Step 7.4: Handle DUST enum in any switch statements**

Search for any switch/case on `tx_type` or `TxType` that handles `DUST_SWEEP` but not `DUST`:

```bash
grep -rn "DUST_SWEEP\|DUST" src/ --include="*.ts" --include="*.tsx" | grep -v "node_modules\|contracts\|types.ts"
```

For each switch statement found, add `case "DUST":` alongside `case "DUST_SWEEP":` with the same handling.

- [ ] **Step 7.5: Verify clean compilation**

```bash
npx tsc --noEmit
# Expected: 0 errors
```

- [ ] **Step 7.6: Commit**

```bash
git add src/features/shared/services/withdrawalService.ts src/services/shared/auditLogService.ts src/services/shared/notificationService.ts
# Add any other files modified for DUST handling
git commit -m "fix: remove as-any casts now that RPCs exist in type registry"
```

---

## Task 8: E2E Smoke Test — Critical Flows

**Files:**
- Test: `tests/e2e/smoke-critical-flows.spec.ts` (verify existing or create minimal)

- [ ] **Step 8.1: Start dev server**

```bash
npm run dev &
# Wait for server to be ready
```

- [ ] **Step 8.2: Test withdrawal cancel flow**

Open the admin withdrawals page. Verify:
1. Page loads without console errors
2. If there are any pending withdrawals, the cancel button works
3. No `function does not exist` errors in the browser console

- [ ] **Step 8.3: Test audit log page**

Open the admin audit log page. Verify:
1. Audit entries load (should show 276 existing rows)
2. Pagination works
3. No `function does not exist` errors

- [ ] **Step 8.4: Test notification bell**

Click the notification bell. Verify:
1. Notifications load
2. No `function does not exist` errors

- [ ] **Step 8.5: Test yield distribution page**

Open the admin yield distribution page. Verify:
1. Fund list loads
2. Preview calculates without errors
3. The `DUST` transaction type renders correctly in any transaction lists

- [ ] **Step 8.6: Verify void transaction flow**

If test data exists, void a test transaction and verify:
1. Cascade counts display correctly
2. Position and AUM update
3. No errors in console

- [ ] **Step 8.7: Commit any test fixes**

```bash
git add tests/
git commit -m "test: verify critical flows after database reconciliation"
```

---

## Task 9: Update Canonical Contract Document

**Files:**
- Modify: `docs/release/00-canonical-contract.md`

- [ ] **Step 9.1: Update the contract to reflect reconciled state**

Add the 8 new RPCs to the appropriate sections of the canonical contract. Update enum values to reflect the full set (DB values + newly added values).

Key updates:
1. Section A.1.4 Withdrawal Lifecycle: add `cancel_withdrawal_by_admin_v2` and `void_completed_withdrawal`
2. Section A.2 Read RPCs: add `get_paged_audit_logs`, `get_paged_notifications`, `get_investor_cumulative_yield`, `get_investor_yield_summary`, `get_fund_positions_sum`, `get_drift_summary`
3. Section A.4 Key Enum Values: update `fund_status` to include all 7 values, update `tx_type` to include `DUST`
4. Section B Deprecated: remove `cancel_withdrawal_by_admin` (v1) note since v2 now exists

- [ ] **Step 9.2: Mark reconciliation as complete**

Add a section at the top:

```markdown
**Reconciliation Status:** COMPLETE (2026-04-15)
- 8 missing RPCs created
- Enum values aligned
- Stabilization migrations applied
- Frontend types regenerated
- All `as any` casts removed from RPC calls
```

- [ ] **Step 9.3: Commit**

```bash
git add docs/release/00-canonical-contract.md
git commit -m "docs: update canonical contract after database reconciliation"
```

---

## Task 10: Final Verification Checklist

- [ ] **Step 10.1: Run full verification suite**

```bash
# 1. TypeScript compiles clean
npx tsc --noEmit

# 2. All 8 new RPCs exist in DB
# Run via Supabase MCP:
# SELECT proname FROM pg_proc WHERE proname IN (
#   'cancel_withdrawal_by_admin_v2', 'void_completed_withdrawal',
#   'get_paged_audit_logs', 'get_paged_notifications',
#   'get_investor_cumulative_yield', 'get_investor_yield_summary',
#   'get_fund_positions_sum', 'get_drift_summary'
# ) AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
# Expected: 8 rows

# 3. Fund status enum has all values
# SELECT enumlabel FROM pg_enum WHERE enumtypid = 'fund_status'::regtype;
# Expected: active, inactive, suspended, deprecated, pending, closed, available

# 4. Frontend knows about DUST tx_type
grep "DUST" src/contracts/dbEnums.ts | grep -v DUST_TOLERANCE
# Expected: DUST and DUST_SWEEP both present

# 5. No more `as any` on known RPC calls
grep -rn "as any" src/features/shared/services/withdrawalService.ts | grep -c "rpc.call"
# Expected: 0

# 6. Stabilization migrations applied
# SELECT COUNT(*) FROM supabase_migrations.schema_migrations WHERE version >= '20260601';
# Expected: 4+
```

- [ ] **Step 10.2: Final commit with reconciliation tag**

```bash
git add -A
git status  # verify only expected files
git commit -m "chore: complete contract-first database reconciliation

Reconciled live Supabase DB with frontend contract:
- Created 8 missing RPCs (withdrawal, audit, notification, investor, admin)
- Added closed/available to fund_status enum
- Applied 4 stabilization migrations
- Regenerated all frontend type contracts
- Removed as-any casts from RPC calls
- Updated canonical contract document"
```

---

## Dependency Graph

```
Task 1 (Withdrawal RPCs) ──┐
Task 2 (Audit/Notif RPCs) ─┤
Task 3 (Investor RPCs) ────┤── All independent, can run in parallel
Task 4 (Enum alignment) ───┘
         │
         ▼
Task 5 (Apply stabilization migrations) ── depends on Tasks 1-4 being committed
         │
         ▼
Task 6 (Regenerate types) ── depends on all DB changes being live
         │
         ▼
Task 7 (Fix frontend) ── depends on regenerated types
         │
         ▼
Task 8 (E2E smoke test) ── depends on frontend fixes
         │
         ▼
Task 9 (Update docs) ── depends on everything passing
         │
         ▼
Task 10 (Final verification) ── depends on everything
```

**Tasks 1-4 are independent and can be dispatched to parallel subagents.**
**Tasks 5-10 are sequential.**
