# Canonical Frontend/Backend Contract

**Status:** AUTHORITATIVE  
**Date:** 2026-04-15  
**Reconciliation Status:** COMPLETE (2026-04-15)
- 8 missing RPCs created (cancel_withdrawal_by_admin_v2, void_completed_withdrawal, get_paged_audit_logs, get_paged_notifications, get_investor_cumulative_yield, get_investor_yield_summary, get_fund_positions_sum, get_drift_summary)
- Enum values aligned (DUST added to tx_type, closed/available added to fund_status)
- Stabilization migrations applied (Phases 1-5)
- Frontend types regenerated
- All `as any` casts removed from RPC calls via typedRPC helper
**Based on:** Phase 4A/4B/4C hardening complete; Phase 6A archive classification complete  
**Source of truth for:** All frontend service calls, RPC invocations, and table reads  

---

## A. Canonical Contract Registry

### A.1 Mutation RPCs (State-Changing Operations)

All mutation RPCs flow through `src/lib/rpc/client.ts` → `call()`, which enforces:
- Parameter validation
- Rate limiting (where configured)
- Retry logic (network errors only, max 3 attempts)
- Audit logging on mutations

#### A.1.1 Transaction Lifecycle

**`apply_transaction_with_crystallization`**
- **Purpose:** Create a deposit or withdrawal, with automatic yield crystallization
- **Required params:** `p_admin_id uuid`, `p_amount numeric`, `p_fund_id uuid`, `p_investor_id uuid`, `p_reference_id text`, `p_tx_date date`, `p_tx_type text`
- **Optional params:** `p_notes text`, `p_purpose aum_purpose`
- **Returns:** `Json` — `{ success, transaction_id, position_after }`
- **Rate limit:** 10 req/min per actor
- **Invariants:** Crystallizes any open yield before applying; position updated atomically; AUM updated
- **Code path:** `src/features/admin/...` → `rpc.call("apply_transaction_with_crystallization", ...)`

**`edit_transaction`**
- **Purpose:** Edit metadata on an existing transaction (notes, hash, date within edit window)
- **Required params:** varies — see `RPC_SIGNATURES.edit_transaction`
- **Returns:** `Json`
- **Rate limit:** 20 req/min per actor
- **Invariants:** Cannot edit voided transactions; `is_within_edit_window()` enforced server-side

#### A.1.2 Void/Unvoid Lifecycle (Phase 4A Hardened)

All void/unvoid operations:
- Use **SERIALIZABLE isolation** — position and AUM update atomically
- Acquire **fund-level advisory locks** via wrapper functions (prevents yield+void race)
- Are **all-or-nothing** — partial void states cannot exist

**`void_transaction`** *(preferred: use `void_transaction_with_lock` wrapper)*
- **Purpose:** Permanently void a transaction
- **Required params:** `p_transaction_id uuid`, `p_admin_id uuid`, `p_reason text`
- **Returns:** `void`
- **Rate limit:** 10 req/min per actor
- **Cascade:** Auto-voids linked allocations, yield events, fees via trigger
- **Errors:** `INVALID_TRANSACTION_ID`, `ALREADY_VOIDED`, `PERMISSION_DENIED`, `CONSTRAINT_VIOLATION`

**`void_and_reissue_transaction`**
- **Purpose:** Void + correct a transaction (new amount, date, notes, hash)
- **Required params:** `p_original_tx_id uuid`, `p_new_amount numeric`, `p_new_date text (YYYY-MM-DD)`, `p_reason text`, `p_admin_id uuid`
- **Optional params:** `p_new_notes text`, `p_new_tx_hash text`
- **Returns:** `Table(voided_tx_id uuid, new_tx_id uuid)`
- **Invariants:** New TX inherits investor_id, fund_id, type, visibility_scope

**`void_and_reissue_full_exit`**
- **Purpose:** Correct a full-exit withdrawal (voids withdrawal + all dust sweeps)
- **Required params:** `p_transaction_id uuid`, `p_new_amount numeric`, `p_admin_id uuid`, `p_reason text`
- **Optional params:** `p_new_date text`
- **Returns:** `Table(voided_tx_id uuid, new_tx_id uuid)`
- **Special:** Also resets `withdrawal_request.status → PENDING`; re-enables approval flow

**`void_transactions_bulk`**
- **Purpose:** Void multiple transactions atomically (super_admin only)
- **Required params:** `p_transaction_ids uuid[]`, `p_admin_id uuid`, `p_reason text`
- **Returns:** `Table(success boolean, count int, transaction_ids uuid[])`
- **Invariants:** All-or-nothing; one failure rolls back all

**`unvoid_transaction`**
- **Purpose:** Restore a voided transaction
- **Required params:** `p_transaction_id uuid`, `p_admin_id uuid`, `p_reason text`
- **Returns:** `void`
- **Critical invariant:** Restores position/AUM but does **NOT** auto-restore cascade-voided yields. Admin must manually reapply yields.
- **Errors:** `NOT_VOIDED`, `RESTORATION_VIOLATION`

**`unvoid_transactions_bulk`**
- **Purpose:** Restore multiple voided transactions atomically
- **Required params:** `p_transaction_ids uuid[]`, `p_admin_id uuid`, `p_reason text`
- **Returns:** `Table(success boolean, count int, transaction_ids uuid[])`

#### A.1.3 Yield Distribution (Phase 4B Hardened)

**`apply_segmented_yield_distribution_v5`** ← **sole canonical yield RPC**
- **Purpose:** Apply proportional yield distribution to all investors in a fund for a period
- **Required params:** `p_fund_id uuid`, `p_period_end date`, `p_recorded_aum numeric`, `p_purpose aum_purpose`
- **Optional params:** `p_opening_aum numeric`, `p_admin_id uuid`, `p_distribution_date date`
- **Returns:** `Json` — `{ success, distribution_id, allocation_count, total_gross, total_net }`
- **Rate limit:** 5 req/min per actor
- **Fund-level lock:** Must use wrapper `apply_yield_distribution_v5_with_lock()` for concurrent safety
- **Invariants:**
  - Idempotent per `(fund_id, period_end, purpose)` — duplicate call raises `distribution_already_exists`
  - Yield conservation: `gross_yield = recorded_aum - opening_aum`
  - Proportional allocation: each investor receives `(position / total_aum) * gross_yield`
  - Crystallizes per investor before applying
  - 9 database triggers enforce constraints (no negative yield, no duplicate period, etc.)
- **Code path:** `src/services/yieldApplyService.ts:59`

**`preview_segmented_yield_distribution_v5`**
- **Purpose:** Preview yield allocations without committing
- **Required params:** same as `apply_segmented_yield_distribution_v5`
- **Returns:** `Json` — `{ allocations: [{ investor_id, gross_amount, net_amount, fee_amount }] }`
- **Invariants:** Read-only; no state changes; no rate limit
- **Code path:** `src/services/yieldPreviewService.ts:71`

**`void_yield_distribution`**
- **Purpose:** Void an entire yield distribution record
- **Required params:** `p_distribution_id uuid` (inferred from context)
- **Returns:** `Json`
- **Rate limit:** 5 req/min per actor
- **Cascade:** Voids all `yield_allocations`, `investor_yield_events`, linked fee/IB entries

#### A.1.4 Withdrawal Lifecycle

**`create_withdrawal_request`**
- **Purpose:** Investor initiates a withdrawal
- **Required params:** `p_fund_id uuid`, `p_requested_amount numeric`, `p_withdrawal_type text`
- **Returns:** `Json` — `{ request_id }`

**`approve_withdrawal`**
- **Purpose:** Admin approves a pending withdrawal (does not complete it)
- **Required params:** `p_request_id uuid`
- **Optional params:** `p_admin_notes text`, `p_approved_amount numeric`
- **Returns:** `boolean`

**`approve_and_complete_withdrawal`**
- **Purpose:** Approve and immediately complete a withdrawal in one step
- **Required params:** `p_request_id uuid`
- **Optional params:** `p_admin_notes text`, `p_is_full_exit boolean`, `p_processed_amount numeric`, `p_send_precision int`, `p_tx_hash text`
- **Returns:** `Json`
- **Rate limit:** 10 req/min per actor

**`reject_withdrawal`**
- **Purpose:** Admin rejects a withdrawal request
- **Required params:** `p_request_id uuid`, `p_reason text`, `p_admin_notes text`
- **Returns:** `void`
- **Rate limit:** 20 req/min per actor
- **Code path:** `src/features/admin/operations/services/requestsQueueService.ts:36`

**`cancel_withdrawal_by_admin_v2`**
- **Purpose:** Admin cancels a withdrawal (newer cancel path)
- **Required params:** `p_request_id uuid`, (additional params per signature)
- **Returns:** `Json`

**`cancel_withdrawal_by_investor`**
- **Purpose:** Investor cancels their own pending withdrawal
- **Required params:** `p_request_id uuid`
- **Returns:** `Json`

#### A.1.5 Position & AUM Management

**`adjust_investor_position`**
- **Purpose:** Manual position adjustment (admin only)
- **Required params:** `p_amount numeric`, `p_fund_id uuid`, `p_investor_id uuid`, `p_reason text`, `p_tx_date date`
- **Optional params:** `p_admin_id uuid`
- **Returns:** `Json`
- **Rate limit:** 20 req/min per actor
- **Security:** `SECURITY DEFINER` — elevated privileges

**`set_fund_daily_aum`**
- **Purpose:** Set or update a fund's AUM for a specific date
- **Required params:** (fund_id, date, amount — see signature)
- **Returns:** `Json`
- **Rate limit:** 30 req/min per actor

**`rebuild_position_from_ledger`**
- **Purpose:** Recompute an investor's position by replaying the transaction ledger
- **Required params:** `p_fund_id uuid`, `p_investor_id uuid` (inferred from signature)
- **Returns:** `Json`
- **When to use:** Only when position is detected as corrupted; not routine

#### A.1.6 Reporting & Statement Delivery (Phase 4C Hardened)

**`dispatch_report_delivery_run`**
- **Purpose:** Trigger statement generation and email delivery for a period
- **Required params:** `p_period_id uuid` (inferred)
- **Returns:** `Json` — `{ queued_count, failed_count }`
- **Idempotent:** Safe to retry; skips already-delivered statements

**`finalize_statement_period`**
- **Purpose:** Lock a statement period (prevents future edits)
- **Required params:** `p_period_id uuid` (inferred)
- **Returns:** `Json`

**`get_investor_reports_v2`**
- **Purpose:** Fetch all investor statement summaries for a period (high-performance RPC)
- **Required params:** `p_period_id uuid`
- **Returns:** `Table` of `InvestorReportSummary`
- **Code path:** `src/features/admin/reports/services/reports/dataFetch.ts:158`

**`queue_statement_deliveries`**
- **Purpose:** Queue email deliveries for a batch of statements
- **Required params:** `p_period_id uuid`
- **Returns:** `Json`

#### A.1.7 Admin / Platform

**`update_user_profile_secure`**
- **Purpose:** Update profile fields (admin or self)
- **Required params:** per signature
- **Returns:** `Json`

**`add_fund_to_investor`**
- **Purpose:** Add an investor to a fund (create position record)
- **Required params:** `p_fund_id uuid`, `p_investor_id uuid`
- **Optional params:** `p_cost_basis numeric`, `p_initial_shares numeric`
- **Returns:** `string` (position id)

---

### A.2 Read RPCs

These RPCs are read-only (no state changes). Frontend may call without audit logging.

| RPC | Purpose | Key Params |
|-----|---------|-----------|
| `get_funds_with_aum` | Fund list with current AUM | none |
| `get_active_funds_summary` | Active funds summary for dashboard | none |
| `get_platform_stats` | Platform-wide metrics | none |
| `get_admin_stats` | Admin dashboard stats | none |
| `get_investor_reports_v2` | Statement summaries for a period | `p_period_id` |
| `get_investor_yield_summary` | Investor yield history | `p_investor_id` |
| `get_investor_cumulative_yield` | ITD cumulative yield | `p_investor_id`, `p_fund_id` |
| `get_fund_summary` | Fund performance + composition | `p_fund_id` |
| `get_fund_composition` | Fund asset breakdown | `p_fund_id` |
| `get_fund_net_flows` | Net flows for a period | `p_fund_id` |
| `get_fund_positions_sum` | Sum of investor positions | `p_fund_id` |
| `get_funds_aum_snapshot` | AUM snapshot across all funds | none |
| `get_void_transaction_impact` | Preview impact before voiding | `p_transaction_id` |
| `get_void_yield_impact` | Preview yield void impact | `p_distribution_id` |
| `get_void_aum_impact` | Preview AUM void impact | `p_aum_id` |
| `get_aum_position_reconciliation` | Reconciliation status | none |
| `get_position_reconciliation` | Per-fund position reconciliation | `p_fund_id` |
| `get_reporting_eligible_investors` | Investors eligible for statements | `p_period_id` |
| `get_statement_period_summary` | Period status and stats | `p_period_id` |
| `get_statement_signed_url` | Pre-signed PDF URL | `p_statement_id` |
| `get_paged_audit_logs` | Paginated audit log | `p_page`, `p_page_size` |
| `get_paged_notifications` | Paginated notifications | `p_page`, `p_page_size` |
| `get_paged_investor_summaries` | Paginated investor list | `p_page`, `p_page_size` |
| `get_all_investors_summary` | All investors summary | none |
| `get_ib_referrals` | IB referral list | `p_ib_id` |
| `get_ib_referral_detail` | IB referral detail | `p_ib_id`, `p_investor_id` |
| `get_available_balance` | Investor withdrawable balance | `p_investor_id`, `p_fund_id` |
| `get_monthly_platform_aum` | Monthly AUM series | none |
| `get_platform_flow_metrics` | Platform flow metrics | none |
| `run_integrity_check` | Ad-hoc integrity check | optional scoping params |
| `check_aum_position_health` | AUM/position health status | none |

---

### A.3 Tables and Views Accessed via Frontend Services

All tables have RLS enabled. Frontend reads through Supabase client; writes only via RPCs.

#### A.3.1 Core Financial Tables (Read/Write via RPC only)

| Table | Primary Key | Frontend Access | Notes |
|-------|-------------|-----------------|-------|
| `transactions_v2` | `id` | Read (filtered) | Immutable after creation; mutations only via RPC |
| `investor_positions` | `(investor_id, fund_id)` | Read | Updated only by triggers/RPCs; never direct write |
| `fund_daily_aum` | `id` | Read | Updated only by RPCs; locked by fund-level advisory lock |
| `yield_distributions` | `id` | Read | Created by `apply_segmented_yield_distribution_v5` only |
| `yield_allocations` | `id` | Read | Created as part of yield distribution; void-cascaded |
| `fee_allocations` | `id` | Read | Created as part of yield distribution; void-cascaded |
| `ib_allocations` | `id` | Read | Created as part of yield distribution |
| `ib_commission_ledger` | `id` | Read | IB commission records |
| `platform_fee_ledger` | `id` | Read | Platform fee records |

#### A.3.2 Operational Tables (Read + Filtered Write)

| Table | Frontend Access | Write Pattern |
|-------|-----------------|---------------|
| `withdrawal_requests` | Read + RPC writes | Via `create_withdrawal_request`, approval RPCs |
| `profiles` | Read | Via `update_user_profile_secure` RPC |
| `funds` | Read | Admin-only write via direct insert (fund management) |
| `investor_fee_schedule` | Read | Admin write |
| `ib_commission_schedule` | Read | Admin write |
| `investor_emails` | Read | Via profile RPCs |
| `assets` | Read-only | System-managed |

#### A.3.3 Reporting / Statement Tables (Read + RPC writes)

| Table | Frontend Access | Write Pattern |
|-------|-----------------|---------------|
| `statement_periods` | Read | Via `finalize_statement_period` RPC |
| `generated_statements` | Read (paginated) | Created by `dispatch_report_delivery_run` |
| `statement_email_delivery` | Read (delivery status) | Updated by delivery RPCs |
| `documents` | Read | Created by admin upload |

#### A.3.4 Notification / Audit Tables (Read-only from frontend)

| Table | Frontend Access |
|-------|-----------------|
| `notifications` | Read (paginated via `get_paged_notifications`) |
| `audit_log` | Read (paginated via `get_paged_audit_logs`) |
| `admin_alerts` | Read (admin only) |
| `admin_integrity_runs` | Read (admin only) |

#### A.3.5 Config Tables (Read-only from frontend)

| Table | Frontend Access |
|-------|-----------------|
| `global_fee_settings` | Read |
| `system_config` | Read |
| `rate_limit_config` | Read |
| `error_code_metadata` | Read |
| `yield_rate_sanity_config` | Read |
| `risk_alerts` | Read |

---

### A.4 Key Enum Values (Frontend Must Use These Exactly)

**Transaction types** (`transactions_v2.type`):
```
DEPOSIT | WITHDRAWAL | YIELD | FEE | REBALANCE | DUST_SWEEP | ADJUSTMENT
```

**Withdrawal status** (`withdrawal_requests.status`):
```
pending | approved | processing | completed | rejected | cancelled
```

**Fund status** (`funds.status`):
```
active | inactive | closed | available
```

**Profile status** (`profiles.status`):
```
active | inactive | suspended | pending
```

**AUM purpose** (`fund_daily_aum.purpose`):
```
reporting | transaction
```

**Account type** (`profiles.account_type`):
```
investor | ib | fees_account
```

**App role** (`user_roles.role`):
```
super_admin | admin | moderator | ib | user | investor
```

**Asset codes** (`assets.symbol`, `transactions_v2.asset`):
```
BTC | ETH | SOL | USDT | EURC | xAUT | XRP | ADA
```

---

### A.5 Release-Critical Invariants

The frontend may rely unconditionally on all of the following:

#### Invariant 1: Position-Ledger Consistency
```
investor_positions.current_value 
  == SUM(transactions_v2.amount WHERE investor_id AND fund_id AND is_voided=false)
   + SUM(investor_yield_events.amount WHERE investor_id AND fund_id AND is_voided=false)
```
- Enforced by: triggers + SERIALIZABLE isolation on void/unvoid
- Verified by: `v_fund_aum_position_health` view
- Hardened in: Phase 4A

#### Invariant 2: AUM-Position Consistency
```
fund_daily_aum.total_aum == SUM(investor_positions.current_value WHERE fund_id AND is_active=true)
```
- Enforced by: fund-level advisory locks + atomic position+AUM updates
- Verified by: `get_aum_position_reconciliation()` RPC, `v_aum_position_reconciliation` view
- Hardened in: Phase 4A

#### Invariant 3: Void Cascade Completeness
When `transactions_v2.is_voided = true`:
- All `yield_allocations` linked to that transaction are also voided
- All `fee_allocations` linked to that transaction are also voided
- Position and AUM are zeroed/adjusted
- All-or-nothing: no partial cascade state is observable
- Hardened in: Phase 4A

#### Invariant 4: Unvoid Does NOT Auto-Restore Yields
When `unvoid_transaction` is called:
- Position and AUM are restored
- Cascade-voided yield events remain voided
- Admin must manually reapply yields if desired
- This is intentional and by design

#### Invariant 5: Yield v5 is the Only Production Path
- `apply_segmented_yield_distribution_v5` is the sole yield entry point
- v3 functions are removed from the database (raise `undefined_function`)
- v4 functions are removed from the database
- No fallback paths, no feature flags, no try-catch between versions
- Hardened in: Phase 4B

#### Invariant 6: Yield Conservation
```
yield_distributions.gross_yield_amount 
  == yield_distributions.recorded_aum - yield_distributions.opening_aum
```
- Enforced by: v5 RPC math + 9 database triggers
- Hardened in: Phase 4B

#### Invariant 7: Reporting Data Sources
All 3 active reporting paths read exclusively from Phase 4A/4B hardened sources:
- `investor_positions` ← Phase 4A locked
- `fund_daily_aum` ← Phase 4A locked
- `yield_distributions` ← Phase 4B v5 canonical
- `transactions_v2.is_voided` ← Phase 4A SERIALIZABLE atomic
- Hardened in: Phase 4C

#### Invariant 8: Fund-Level Locking Serialization
Concurrent void + yield operations on the same fund are serialized:
- `void_transaction_with_lock()` acquires `pg_advisory_lock(HASHTEXT(fund_id::TEXT))`
- `apply_yield_distribution_v5_with_lock()` acquires the same lock key
- Race condition between void and yield apply is impossible
- Hardened in: Phase 4A

---

## B. Deprecated Contract Registry

These surfaces exist in the database or code registry but are no longer the canonical path for new usage. They may still function.

| Surface | Type | Deprecated By | Status |
|---------|------|---------------|--------|
| `preview_daily_yield_to_fund_v3` | RPC | v5 canonical | In RPC registry; DB function status unclear |
| `apply_daily_yield_with_validation` | RPC | v5 canonical | Legacy path; do not use for new features |
| `process_yield_distribution` / `process_yield_distribution_v2` | RPC | v5 canonical | Legacy; not called in production code |
| `approve_withdrawal` (standalone) | RPC | `approve_and_complete_withdrawal` | Use combined RPC unless two-step approval is required |
| `cancel_withdrawal_by_admin` (v1) | RPC | `cancel_withdrawal_by_admin_v2` | v2 is canonical |
| `investor_fund_performance` | Table | Not actively generated | Historical data exists; generation source unclear; do not rely on for live data |
| `update_fund_aum_baseline` | RPC | One-time migration utility | Should not be called from frontend |
| `useActiveFunds` hook | Frontend hook | `useFunds({ status: 'active' })` | File deleted; use parametrized `useFunds` |
| `useAvailableFunds` hook | Frontend hook | `useFunds({ status: 'available' })` | File deleted; use parametrized `useFunds` |
| `useNotificationBell` (standalone) | Frontend hook | `useNotifications` | Consolidated; still exported for backward compat |
| `backfill_balance_chain_fix` | RPC | One-time repair utility | Admin-only; not for routine use |
| `repair_all_positions` | RPC | One-time repair utility | Admin-only; not for routine use |
| `initialize_all_hwm_values` | RPC | One-time migration | Do not call |
| `initialize_null_crystallization_dates` | RPC | One-time migration | Do not call |

---

## C. Forbidden Surfaces

Do not call these from frontend code under any circumstances. Do not add new usage.

| Surface | Reason |
|---------|--------|
| `force_delete_investor` | Destructive hard delete; no audit trail |
| `purge_fund_hard` | Destructive irreversible purge |
| `delete_transaction` | Bypasses void/audit workflow; use `void_transaction` instead |
| `delete_withdrawal` | Bypasses audit trail |
| `apply_adb_yield_distribution_v3` | Removed from DB; will raise `undefined_function` |
| `apply_adb_yield_distribution_v4` | Removed from DB; will raise `undefined_function` |
| `qa_fees_account_id` | QA/test function; not for production |
| `qa_entity_manifest` table | QA table; not for production reads |
| `get_schema_dump` | Exposes internal schema; admin debugging only |
| `_resolve_investor_fee_pct` | Internal helper (prefixed `_`); called by v5 internally |
| `_resolve_investor_ib_pct` | Internal helper (prefixed `_`); called by v5 internally |
| `_v5_check_distribution_uniqueness` | Internal helper (prefixed `_`); called by v5 internally |
| `acquire_position_lock` | Internal concurrency primitive; called by RPCs internally |
| `acquire_yield_lock` | Internal concurrency primitive; called by RPCs internally |
| `acquire_withdrawal_lock` | Internal concurrency primitive; called by RPCs internally |
| `build_error_response` | Internal utility; not user-facing |
| `build_success_response` | Internal utility; not user-facing |
| `raise_platform_error` | Internal error builder; not user-facing |

---

## D. Release-Critical Validation Checklist

Before go-live, verify these properties hold against production data:

- [ ] `SELECT COUNT(*) FROM v_fund_aum_position_health WHERE health_status != 'OK'` = 0
- [ ] `SELECT COUNT(*) FROM (SELECT * FROM get_aum_position_reconciliation())` where mismatch = 0
- [ ] `apply_segmented_yield_distribution_v5` callable; v3 raises `undefined_function`
- [ ] Void a test transaction → position + AUM both update atomically
- [ ] Unvoid the test transaction → position restored, yield events still voided
- [ ] `get_investor_reports_v2` returns correct allocations for the last finalized period
- [ ] `dispatch_report_delivery_run` completes without error for the last period
- [ ] No `is_voided = false` rows in `yield_allocations` linked to voided transactions
- [ ] Rate limiters active: verify `apply_segmented_yield_distribution_v5` is blocked at 6th req/min

---

## E. Architecture Notes

### RPC Gateway
All RPC calls from the frontend **must** flow through `src/lib/rpc/client.ts:call()` or `callNoArgs()`.
- Direct `supabase.rpc(...)` calls without the gateway bypass rate limiting and validation.
- Legacy wrapper `callRPC` in `src/lib/supabase/typedRPC.ts` is acceptable; it delegates to the gateway.

### Canonical Entry Points (CANONICAL_MUTATION_RPCS in `src/contracts/rpcSignatures.ts`)
```typescript
DEPOSIT  → apply_transaction_with_crystallization   // note: rpcSignatures lists "apply_investor_transaction" as V6 intent
YIELD    → apply_segmented_yield_distribution_v5
VOID     → void_transaction  (prefer void_transaction_with_lock wrapper)
VOID_YIELD → void_yield_distribution
```

### Fund-Level Lock Wrappers (Phase 4A)
For concurrent-safe operations, prefer the lock wrappers over base functions:
```typescript
void_transaction_with_lock(tx_id, admin_id, reason)          // safe concurrent void
unvoid_transaction_with_lock(tx_id, admin_id, reason)        // safe concurrent unvoid
apply_yield_distribution_v5_with_lock(fund_id, ...)          // safe concurrent yield
```

### Void Decision Matrix
| Scenario | RPC |
|----------|-----|
| Permanent void | `void_transaction` |
| Correct amount/date | `void_and_reissue_transaction` |
| Correct full-exit withdrawal | `void_and_reissue_full_exit` |
| Void 10+ transactions | `void_transactions_bulk` |
| Restore voided transaction | `unvoid_transaction` |
| Restore 10+ voided | `unvoid_transactions_bulk` |
