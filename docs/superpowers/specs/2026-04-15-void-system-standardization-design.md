# Void System Standardization — Design Spec

**Date:** 2026-04-15
**Trigger:** `column "voided_by_profile_id" of relation "fund_aum_events" does not exist` at runtime
**Root cause:** Migration `20260615000000` added column as `TEXT` (should be `UUID`), no FK, no sync trigger

---

## 1. Problem Statement

The void system spans 9 tables and 8 RPCs. Column presence, types, constraints, and RPC coverage are inconsistent, causing runtime errors and incomplete audit trails.

## 2. Current State Audit

### 2.1 Table-Level Gaps

| Table | `voided_by_profile_id` | Type | FK to profiles | Sync Trigger | `void_reason` | `updated_at` |
|---|---|---|---|---|---|---|
| `transactions_v2` | YES | uuid | YES | YES | YES | N/A (append-only) |
| `fund_aum_events` | YES | **TEXT** | **NO** | **NO** | YES | YES |
| `fund_daily_aum` | YES | uuid | YES | YES | YES | YES |
| `fee_allocations` | YES | uuid | YES | YES | **NO** | N/A |
| `ib_allocations` | YES | uuid | YES | YES | **NO** | N/A |
| `ib_commission_ledger` | **NO** | — | — | — | YES | N/A |
| `platform_fee_ledger` | **NO** | — | — | — | YES | N/A |
| `investor_yield_events` | **NO** | — | — | — | **NO** | N/A |
| `yield_distributions` | **NO** | — | — | — | YES | N/A |

### 2.2 RPC-Level Gaps

**`void_transaction`** (main cascade RPC):
- Sets `voided_by_profile_id` on: `transactions_v2`, `fund_aum_events`, `fund_daily_aum`, `fee_allocations`
- MISSING on: `ib_commission_ledger`, `platform_fee_ledger`, `investor_yield_events`

**`void_yield_distribution`** — worst offender:
- `platform_fee_ledger`: only sets `is_voided = true` (missing `voided_at`, `voided_by`, `void_reason`, `voided_by_profile_id`)
- `ib_commission_ledger`: only sets `is_voided = true` (same)
- `ib_allocations`: only sets `is_voided = true` (same)
- `investor_yield_events`: only sets `is_voided = true` (same)
- `transactions_v2`: sets `voided_by` but NOT `voided_by_profile_id` or `void_reason`
- `yield_distributions`: missing `voided_by_profile_id`

**`void_fund_daily_aum`** — inconsistent:
- None of its cascade UPDATEs set `voided_by_profile_id`
- `fee_allocations`, `ib_allocations`: missing `voided_by_profile_id`
- `fund_daily_aum` itself: missing `voided_by_profile_id`

**`void_investor_yield_events_for_distribution`**:
- Missing `voided_by_profile_id`

**`unvoid_transaction`**: Correctly clears `voided_by_profile_id` on `transactions_v2`. Does not cascade unvoid (by design).

**`void_transactions_bulk`**, **`void_completed_withdrawal`**: Delegate to `void_transaction` — inherit its behavior.

## 3. Target State

### 3.1 Canonical Void Columns

Every void-capable table MUST have these columns:

| Column | Type | Nullable | Default | FK |
|---|---|---|---|---|
| `is_voided` | boolean | NO | false | — |
| `voided_at` | timestamptz | YES | NULL | — |
| `voided_by` | uuid | YES | NULL | — |
| `voided_by_profile_id` | uuid | YES | NULL | profiles(id) |
| `void_reason` | text | YES | NULL | — |

`updated_at` is per-table design (append-only tables don't have it).

### 3.2 Canonical Trigger

Every void-capable table gets a BEFORE INSERT OR UPDATE trigger:
```sql
IF NEW.voided_by_profile_id IS NULL AND NEW.voided_by IS NOT NULL THEN
  NEW.voided_by_profile_id := NEW.voided_by;
END IF;
```

### 3.3 RPC Contract

Every void RPC that UPDATEs a table MUST explicitly set:
`is_voided = TRUE, voided_at = NOW(), voided_by = p_admin_id, voided_by_profile_id = p_admin_id, void_reason = <reason>`

Triggers act as safety net only.

## 4. Changes Required

### Phase 1: Fix `fund_aum_events` (the broken table)
1. ALTER `voided_by_profile_id` from TEXT to UUID (with USING cast)
2. ADD FK constraint to `profiles(id)`
3. CREATE missing sync trigger

### Phase 2: Add `voided_by_profile_id` to 4 tables
1. `ib_commission_ledger` — ADD column + FK + trigger
2. `platform_fee_ledger` — ADD column + FK + trigger
3. `investor_yield_events` — ADD column + FK + trigger
4. `yield_distributions` — ADD column + FK + trigger

### Phase 3: Add `void_reason` to 3 tables
1. `fee_allocations` — ADD column
2. `ib_allocations` — ADD column
3. `investor_yield_events` — ADD column

### Phase 4: Update RPCs
1. `void_transaction` — add `voided_by_profile_id` to `ib_commission_ledger`, `platform_fee_ledger`, `investor_yield_events` cascades; add `void_reason` to `fee_allocations`, `investor_yield_events` cascades
2. `void_yield_distribution` — fix ALL cascade UPDATEs to set full void columns
3. `void_fund_daily_aum` — fix ALL cascade UPDATEs to set full void columns
4. `void_investor_yield_events_for_distribution` — add `voided_by_profile_id`

### Phase 5: Regenerate TypeScript types
1. Run `supabase gen types typescript`
2. Update `src/integrations/supabase/types.ts`

## 5. Risk Assessment

- **Phase 1**: Zero risk — fixing type mismatch, adding constraint (column is currently empty or holds valid UUIDs as text)
- **Phase 2-3**: Low risk — additive columns, nullable, no existing code references them
- **Phase 4**: Medium risk — modifying production RPCs. Mitigated by: (a) only adding SET clauses, not changing logic, (b) sync triggers as fallback
- **Phase 5**: Zero risk — type regeneration only

## 6. Rollback Strategy

Each phase is a separate migration. Rollback = drop added columns/triggers. RPCs can be reverted by removing the added SET clauses (they were absent before).
