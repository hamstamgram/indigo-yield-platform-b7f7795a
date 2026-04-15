# Void System Reference

> Single source of truth for the Indigo Yield void/unvoid system.
> Last updated: 2026-04-15

---

## 1. Void-Capable Tables (10 total)

Every void-capable table has this standardized column set:

| Column | Type | Nullable | FK | Purpose |
|---|---|---|---|---|
| `is_voided` | boolean | NO (default false) | -- | Soft-delete flag |
| `voided_at` | timestamptz | YES | -- | When voided |
| `voided_by` | uuid | YES | -- | Auth user ID who voided |
| `voided_by_profile_id` | uuid | YES | profiles(id) | Profile ID who voided |
| `void_reason` | text | YES | -- | Why voided |

### Table Matrix

| Table | Void Columns | Sync Trigger | FK | Notes |
|---|---|---|---|---|
| `transactions_v2` | All 5 | YES | YES | Append-only ledger, no `updated_at` |
| `fund_aum_events` | All 5 + `updated_at` | YES | YES | Fixed TEXT->UUID on 2026-04-15 |
| `fund_daily_aum` | All 5 + `updated_at` | YES | YES | |
| `fee_allocations` | All 5 | YES | YES | `void_reason` added 2026-04-15 |
| `ib_allocations` | All 5 | YES | YES | `void_reason` added 2026-04-15 |
| `ib_commission_ledger` | All 5 | YES | YES | `voided_by_profile_id` added 2026-04-15 |
| `platform_fee_ledger` | All 5 | YES | YES | `voided_by_profile_id` added 2026-04-15 |
| `investor_yield_events` | All 5 | YES | YES | All void columns added 2026-04-15 |
| `yield_allocations` | All 5 | YES | YES | All void columns added 2026-04-15 |
| `yield_distributions` | All 5 | YES | YES | `voided_by_profile_id` added 2026-04-15 |

### Tables WITHOUT Void Support (by design)

- `fund_yield_snapshots` — read-only snapshots, no void needed
- All other tables — no void semantics

---

## 2. Sync Triggers

Every void-capable table has a `BEFORE INSERT OR UPDATE` trigger that auto-populates `voided_by_profile_id` from `voided_by` when the former is NULL. This is a safety net — RPCs should set both explicitly.

| Table | Trigger Name | Function Name |
|---|---|---|
| `transactions_v2` | `trg_transactions_v2_sync_voided_by` | `sync_transactions_v2_voided_by_profile` |
| `fund_aum_events` | `trg_fund_aum_events_sync_voided_by` | `sync_fund_aum_events_voided_by_profile` |
| `fund_daily_aum` | `trg_fund_daily_aum_sync_voided_by` | `sync_fund_daily_aum_voided_by_profile` |
| `fee_allocations` | `trg_fee_allocations_sync_voided_by` | `sync_fee_allocations_voided_by_profile` |
| `ib_allocations` | `trg_ib_allocations_sync_voided_by` | `sync_ib_allocations_voided_by_profile` |
| `ib_commission_ledger` | `trg_ib_commission_ledger_sync_voided_by` | `sync_ib_commission_ledger_voided_by_profile` |
| `platform_fee_ledger` | `trg_platform_fee_ledger_sync_voided_by` | `sync_platform_fee_ledger_voided_by_profile` |
| `investor_yield_events` | `trg_investor_yield_events_sync_voided_by` | `sync_investor_yield_events_voided_by_profile` |
| `yield_allocations` | `trg_yield_allocations_sync_voided_by` | `sync_yield_allocations_voided_by_profile` |
| `yield_distributions` | `trg_yield_distributions_sync_voided_by` | `sync_yield_distributions_voided_by_profile` |

### Cascade Trigger

`cascade_void_to_allocations` fires on `yield_distributions` when `is_voided` transitions to TRUE. It propagates full void metadata (voided_by, voided_by_profile_id, void_reason) to:
- `yield_allocations`
- `fee_allocations`
- `ib_allocations`
- `fund_daily_aum` (where source = 'yield_distribution_v5')

---

## 3. Void RPCs

### Primary Void Operations

| RPC | Signature | Cascade Targets | Rate Limit |
|---|---|---|---|
| `void_transaction` | `(p_transaction_id, p_admin_id, p_reason)` | fund_aum_events, fund_daily_aum, fee_allocations, ib_commission_ledger, platform_fee_ledger, investor_yield_events + AUM recalculation | 10/60s |
| `void_yield_distribution` | `(p_distribution_id, p_admin_id, p_reason?, p_void_crystals?)` | transactions_v2, platform_fee_ledger, ib_commission_ledger, ib_allocations, investor_yield_events, yield_distributions (crystals) + position recompute | 5/60s |
| `void_fund_daily_aum` | `(p_record_id, p_reason, p_admin_id)` | yield_distributions, yield_allocations, transactions_v2, investor_yield_events, fee_allocations, ib_allocations, ib_commission_ledger, platform_fee_ledger + position recompute | -- |
| `void_completed_withdrawal` | `(p_withdrawal_id, p_reason)` | Delegates to `void_transaction` + updates withdrawal_requests status | -- |
| `void_investor_yield_events_for_distribution` | `(p_distribution_id, p_admin_id, p_reason?)` | investor_yield_events only | -- |

### Bulk Operations

| RPC | Signature | Behavior |
|---|---|---|
| `void_transactions_bulk` | `(p_transaction_ids[], p_admin_id, p_reason)` | Loops `void_transaction` for each ID (max 50) |
| `unvoid_transactions_bulk` | `(p_transaction_ids[], p_admin_id, p_reason)` | Loops `unvoid_transaction` for each ID |

### Correction Operations

| RPC | Signature | Behavior |
|---|---|---|
| `void_and_reissue_transaction` | `(p_original_tx_id, p_admin_id, p_new_amount, p_new_date, ...)` | Voids original + creates corrected transaction atomically |
| `void_and_reissue_full_exit` | `(p_transaction_id, p_new_amount, p_admin_id, p_reason, ...)` | Same but handles full-exit withdrawal + dust sweeps |
| `unvoid_transaction` | `(p_transaction_id, p_admin_id, p_reason)` | Clears all void columns on transactions_v2 only. Does NOT cascade unvoid. |

### Impact Preview (read-only)

| RPC | Returns |
|---|---|
| `get_void_transaction_impact` | Position impact, AUM records affected, yield dependencies |
| `get_void_aum_impact` | AUM record details for void preview |
| `get_void_yield_impact` | Affected investors, transaction count, yield/fee totals |

---

## 4. Frontend Architecture

### Dialog Components

| Component | RPC | Confirmation |
|---|---|---|
| `VoidTransactionDialog` | `void_transaction` via impact preview | Type "VOID" + reason (3 char min) |
| `VoidAndReissueDialog` | `void_and_reissue_transaction` / `void_and_reissue_full_exit` | Tab workflow |
| `UnvoidTransactionDialog` | `unvoid_transaction` | Reason (3 char min) |
| `BulkVoidDialog` | `void_transactions_bulk` | Type "VOID" + reason |
| `BulkUnvoidDialog` | `unvoid_transactions_bulk` | Reason (3 char min) |
| `VoidYieldDialog` | -- (parent handles) | Reason (5 char min) + checkbox |
| `VoidDistributionDialog` | `void_yield_distribution` via impact preview | Reason + optional void crystals |

### Service Layer

| Service | Void RPCs Used |
|---|---|
| `adminTransactionHistoryService.ts` | void_transaction, unvoid_transaction, void_and_reissue_transaction, void_and_reissue_full_exit, bulk void/unvoid, get_void_transaction_impact |
| `yieldManagementService.ts` | void_yield_distribution |
| `withdrawalService.ts` | void_completed_withdrawal |
| `transactionsV2Service.ts` | void_transaction, get_void_transaction_impact |
| `reconciliationService.ts` | get_void_yield_impact |

### Cache Invalidation

All void operations invalidate via `invalidateAfterTransaction(queryClient, investorId, fundId)`:
- Transaction keys, position keys, AUM keys, yield keys, dashboard keys, reconciliation keys

Yield voids additionally force-refetch `fundAumAll`, `fundAumUnified`, `activeFundsWithAUM`.

---

## 5. Contract Files

| File | Purpose |
|---|---|
| `src/integrations/supabase/types.ts` | Auto-generated from DB. Regen with `supabase gen types typescript` |
| `src/contracts/dbSchema.ts` | Column lists per table. Must match DB. |
| `src/contracts/rpcSignatures.ts` | RPC parameter metadata. Must match DB function signatures. |
| `src/lib/rpc/types.ts` | Custom RPC type extensions (bulk/unvoid operations). |

---

## 6. Migrations Applied (2026-04-15)

### Session 1 (initial fix)
1. `fix_fund_aum_events_void_columns` — TEXT->UUID, FK, trigger
2. `add_voided_by_profile_id_standardize` — 4 tables: ib_commission_ledger, platform_fee_ledger, investor_yield_events, yield_distributions
3. `add_void_reason_standardize` — 3 tables: fee_allocations, ib_allocations, investor_yield_events
4. `update_void_transaction_rpc`
5. `update_void_yield_distribution_rpc`
6. `update_void_fund_daily_aum_rpc`
7. `update_void_yield_events_rpc`

### Session 2 (pass 2)
8. `standardize_yield_allocations_void_columns` — full void columns on yield_allocations
9. `update_rpcs_yield_allocations_void_columns` — void_fund_daily_aum Step 3 fix
10. `fix_cascade_void_to_allocations_trigger` — trigger now propagates full void metadata

---

## 7. Manual Test Plan

Test each flow on production:

1. **Void single transaction** (DEPOSIT) — verify cascade to fund_aum_events, fund_daily_aum, check audit_log
2. **Unvoid transaction** — verify voided_by_profile_id is cleared, warning about yields shown
3. **Bulk void** (2-3 transactions) — verify all cascaded atomically
4. **Bulk unvoid** — restore bulk-voided transactions
5. **Void and reissue** — change amount, verify old voided + new created
6. **Void yield distribution** — verify cascade to investor_yield_events, fee_allocations, ib_commission_ledger, platform_fee_ledger, transactions_v2
7. **Void yield distribution with crystals** — verify p_void_crystals=true cascades to child distributions
8. **Void fund daily AUM** — verify full cascade including yield_allocations
9. **Void completed withdrawal** ��� verify tx voided + withdrawal status set to 'cancelled'

For each test, verify in DB:
- `audit_log` entry exists with correct actor and metadata
- All cascade targets have `voided_by_profile_id` populated (not null)
- All cascade targets have `void_reason` populated
- Cache refreshes in UI after void completes
