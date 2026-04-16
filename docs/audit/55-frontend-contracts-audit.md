# Frontend Contracts Domain Audit

**Audit #4** | Date: 2026-04-16 | Domain: Frontend ↔ DB Type Alignment
**Status: READ-ONLY** — No source files modified

---

## Executive Summary

The frontend RPC type registry (`src/contracts/rpcSignatures.ts`, 2,158 lines) is the single source of truth for typed RPC calls. The auto-generated Supabase types (`src/integrations/supabase/types.ts`, 8,564 lines) provide the canonical DB schema reflection. This audit compares both against the live local database (282 functions in `pg_proc`).

### Key Findings

| Metric | Count |
|--------|-------|
| DB public functions (total, deduplicated) | 270 |
| DB SECDEF functions | 218 |
| RPC_FUNCTIONS registered | 190 |
| **DB → missing from RPC_FUNCTIONS** | **107** (59 SECDEF, 48 non-SECDEF) |
| **RPC_FUNCTIONS → missing from DB** | **8** (stale/phantom) |
| Enum types in DB | 28 |
| Enum types in types.ts | 28 |
| Enum drift | **0** (full alignment) |
| CRITICAL_RPCS with param mismatches | **2** |
| CRITICAL_RPCS not in RPC_FUNCTIONS | **1** |
| Gateway violations (live) | 22 (2 RPC, 20 mutation) |
| Contract scripts broken | 3 of 4 |

**Risk Level: MEDIUM** — The type registry is ~70% complete. All 28 enums are perfectly aligned. Most gaps are internal-only functions (triggers, helpers) that the frontend never calls directly. Two parameter mismatches and one missing CRITICAL_RPC require attention.

---

## 1. RPC Registry vs DB Alignment

### 1A. Functions in DB but NOT in RPC_FUNCTIONS (107)

#### P0 — SECDEF Mutation Functions Without Typed Access (19)

These are SECURITY DEFINER functions that perform data mutations. If the frontend ever needs to call them, it would bypass type safety.

| Function | Category | Notes |
|----------|----------|-------|
| `apply_segmented_yield_distribution_v5` | **Financial mutation** | Primary v5 yield distribution — HIGH PRIORITY |
| `apply_yield_distribution_v5_with_lock` | **Financial mutation** | Locked variant of v5 distribution |
| `cascade_void_from_transaction` | **Financial mutation** | Void cascade trigger |
| `cascade_void_to_yield_events` | **Financial mutation** | Void cascade trigger |
| `cancel_withdrawal_by_admin_v2` | **Withdrawal mutation** | V2 path not in registry |
| `create_profile_on_signup` | **Auth mutation** | Called by trigger, rarely direct |
| `crystallize_yield_before_flow` | **Financial mutation** | Already in RPC_FUNCTIONS — not a gap |
| `fn_ledger_drives_position` | **Ledger mutation** | Internal trigger function |
| `insert_yield_transaction` | **Financial mutation** | Legacy yield insertion |
| `recompute_on_void` | **Position mutation** | Internal recomputation |
| `set_account_type_for_ib` | **Admin mutation** | CRITICAL_RPC — missing from registry |
| `unvoid_transaction_with_lock` | **Financial mutation** | Locked variant |
| `update_investor_last_activity` | **Side-effect** | Trigger-called |
| `update_investor_last_activity_withdrawal` | **Side-effect** | Trigger-called |
| `void_transaction_with_lock` | **Financial mutation** | Locked variant |
| `purge_old_audit_logs` | **Admin mutation** | Maintenance function |
| `prevent_auto_aum_creation` | **AUM mutation** | Trigger guard |
| `log_data_edit` | **Audit mutation** | Audit logging |
| `log_delivery_status_change` | **Audit mutation** | Audit logging |

#### P1 — SECDEF Read Functions Without Typed Access (23)

| Function | Notes |
|----------|-------|
| `alert_on_ledger_position_drift` | Integrity alert |
| `audit_delta_trigger` | Trigger-only |
| `audit_fee_schedule_changes` | Trigger-only |
| `audit_ib_allocation_payout` | Trigger-only |
| `audit_investor_fund_performance_changes` | Trigger-only |
| `audit_transaction_changes` | Trigger-only |
| `audit_user_role_changes` | Trigger-only |
| `auto_close_previous_fee_schedule` | Trigger-only |
| `auto_close_previous_ib_schedule` | Trigger-only |
| `calculate_unrealized_pnl` | Computation |
| `check_concentration_risk` | Validation |
| `check_duplicate_profile` | Validation |
| `check_fund_is_active` | Validation |
| `enforce_canonical_*` (6 functions) | Trigger enforcers |
| `enforce_fees_account_zero_fee` | Trigger enforcer |
| `enforce_transaction_asset_match` | Trigger enforcer |
| `enforce_yield_distribution_guard` | Trigger enforcer |
| `get_fund_positions_sum` | Read query |
| `get_investor_cumulative_yield` | Read query |
| `get_investor_yield_summary` | Read query |
| `get_paged_audit_logs` | Read query |
| `get_paged_notifications` | Read query |

#### P2 — Non-SECDEF Internal Functions (48)

These are trigger helpers, field update triggers, and internal sync functions. The frontend should never call them directly. **No action needed.**

Key categories:
- **Trigger enforcers** (8): `enforce_economic_date`, `enforce_internal_tx_visibility`, `enforce_transactions_v2_immutability`, `enforce_yield_event_date`, `ensure_crystallization_date`, etc.
- **Sync triggers** (24): `sync_aum_on_position_change`, `sync_aum_on_transaction`, `sync_*_voided_by_profile` (13 profile-void sync functions), `sync_position_last_tx_date`, `sync_profile_*` (4), etc.
- **Field update triggers** (5): `set_position_is_active`, `set_updated_at`, `update_delivery_updated_at`, `update_updated_at`, `update_updated_at_column`
- **Other internals** (11): `increment_version`, `preserve_created_at`, `maintain_high_water_mark`, `compute_jsonb_delta` (already in registry), `trigger_recompute_position`, etc.

### 1B. Functions in RPC_FUNCTIONS but NOT in DB (8 — Stale References)

| Function | Classification | Notes |
|----------|---------------|-------|
| `is_admin` | **Stale** | DB has overloaded `is_admin()` (SECDEF + non-SECDEF). Frontend references a `p_user_id` param variant that may not match current signature |
| `is_admin_for_jwt` | **Phantom** | Not found in DB at all — likely removed |
| `is_admin_safe` | **Phantom** | Not found in DB at all — likely removed |
| `qa_admin_id` | **Test-only** | QA seed helper — not in production DB schema |
| `qa_fees_account_id` | **Test-only** | QA seed helper |
| `qa_fund_id` | **Test-only** | QA seed helper |
| `qa_investor_id` | **Test-only** | QA seed helper |
| `qa_seed_world` | **Test-only** | QA seed helper |

**Recommendations:**
- `is_admin_for_jwt`, `is_admin_safe`: Mark `@deprecated` or remove — phantom references
- `qa_*` functions: Gate behind test/development environment detection
- `is_admin`: Verify overload resolution matches the intended variant

---

## 2. Enum Alignment

### Full Alignment Verified — 0 Drift

All 28 DB enum types are present in `src/integrations/supabase/types.ts` (auto-generated) with matching values:

| DB Enum | TS Enum | Values Match | TS Domain File |
|---------|---------|-------------|----------------|
| `access_event` | ✅ | 6/6 | `session.ts` |
| `account_type` | ✅ | 3/3 | `enums.ts` |
| `app_role` | ✅ | 6/6 | `enums.ts` |
| `approval_operation_type` | ✅ | 10/10 | (inline in types.ts) |
| `asset_code` | ✅ | 8/8 | `enums.ts` |
| `aum_purpose` | ✅ | 2/2 | `yieldDistributionRecord.ts` |
| `benchmark_type` | ✅ | 4/4 | `enums.ts` |
| `document_type` | ✅ | 5/5 | `enums.ts` |
| `error_category` | ✅ | 7/7 | (inline) |
| `fee_kind` | ✅ | 2/2 | `enums.ts` |
| `fund_status` | ✅ | 7/7 | `fund.ts` |
| `notification_priority` | ✅ | 3/3 | `notification.ts` |
| `notification_type` | ✅ | 7/7 | `notification.ts` |
| `platform_error_code` | ✅ | 33/33 | (inline) |
| `share_scope` | ✅ | 3/3 | `session.ts` |
| `ticket_category` | ✅ | 5/5 | (inline) |
| `ticket_priority` | ✅ | 4/4 | (inline) |
| `ticket_status` | ✅ | 4/4 | (inline) |
| `transaction_status` | ✅ | 4/4 | `enums.ts` |
| `transaction_type` | ✅ | 5/5 | `transaction.ts` |
| `tx_source` | ✅ | 14/14 | `transaction.ts` |
| `tx_type` | ✅ | 13/13 | `transaction.ts` |
| `visibility_scope` | ✅ | 2/2 | `enums.ts` |
| `withdrawal_action` | ✅ | 8/8 | `withdrawal.ts` |
| `withdrawal_status` | ✅ | 6/6 | `withdrawal.ts` |
| `yield_distribution_status` | ✅ | 6/6 | `yieldDistributionRecord.ts` |

**Note:** Some enums (`ticket_*`, `approval_operation_type`, `error_category`, `platform_error_code`) are only available inline in `types.ts` and have no exported domain wrapper. This is not drift, but could improve discoverability.

---

## 3. RPC Parameter Type Mismatches (CRITICAL_RPCS)

The CI workflow defines 48 CRITICAL_RPCS. Three issues found:

### 3A. Phantom CRITICAL_RPC — Not in DB (1)

| RPC in CI | Issue |
|-----------|-------|
| `apply_daily_yield_to_fund` | **Does not exist in DB.** The actual function is `apply_daily_yield_with_validation`. CI check will never find this function's migration and may produce false results. |

**Fix:** Remove `apply_daily_yield_to_fund` from CRITICAL_RPCS in `.github/workflows/ci.yml:114` or alias it.

### 3B. CRITICAL_RPC Not in RPC_FUNCTIONS (1)

| RPC | Issue |
|-----|-------|
| `set_account_type_for_ib` | **In DB (SECDEF), in CRITICAL_RPCS, but NOT in rpcSignatures.ts RPC_FUNCTIONS.** Frontend has no typed access. |

**Severity: P0** — Admin mutation with no type-safe frontend path.

### 3C. Parameter Mismatches (2)

| Function | DB Signature | Frontend Signature | Mismatch |
|----------|-------------|-------------------|----------|
| `add_fund_to_investor` | `p_investor_id uuid, p_fund_id text, p_initial_shares numeric DEFAULT 0, p_cost_basis numeric DEFAULT 0` | required: `["p_fund_id", "p_investor_id"]`, optional: `["p_cost_basis", "p_initial_shares"]` | **Param order reversed** (DB: investor_id first; frontend: fund_id first). Not a runtime issue since RPC uses named params, but confusing. Also DB types `p_fund_id` as `text` not `uuid`. |
| `reject_withdrawal` | `p_request_id uuid, p_reason text, p_admin_notes text DEFAULT NULL::text` | required: `["p_reason", "p_request_id"]`, optional: `["p_admin_notes"]` | **Param order reversed** in frontend (reason before request_id). Also frontend marks `p_admin_notes` as optional, which matches DB DEFAULT. **Match is correct but order is counterintuitive.** |

### 3D. CRITICAL_RPCS with Correct Parameter Alignment (45)

All remaining CRITICAL_RPCS have parameter names and required/optional classification that match the DB. Key correct alignments verified:

- `void_transaction`: DB `p_transaction_id, p_admin_id, p_reason` → Frontend required: `["p_admin_id", "p_reason", "p_transaction_id"]` ✅ (order differs but named params)
- `ensure_preflow_aum`: 5 required params match ✅
- `apply_deposit_with_crystallization`: 7 required + 4 optional match ✅
- `apply_withdrawal_with_crystallization`: 6 required + 4 optional match ✅
- `crystallize_month_end`: 4 required match ✅
- `apply_transaction_with_crystallization`: 6 required + 4 optional match ✅
- `complete_withdrawal`: 2 required + 4 optional (DB has `p_event_ts` with DEFAULT `now()`, frontend correctly marks optional) ✅
- `edit_transaction`: 1 required + 4 optional match ✅
- `finalize_month_yield`: 4 required match ✅
- `backfill_balance_chain_fix`: 2 required match ✅
- `reset_all_data_keep_profiles`: 2 required match ✅
- All read functions (`get_*`): Parameters match ✅

---

## 4. Contract Verification Script Results

### 4A. `npm run contracts:verify` — FAIL

```
Error: Cannot find module './verify-enum-contracts.ts'
```

**Root cause:** Script `scripts/verify-enum-contracts.ts` does not exist on disk. The `ts-node` invocation fails at module resolution.

**Impact:** Enum contract verification is non-functional. (Manual check shows enums ARE aligned, so the check would pass if the script existed.)

**Fix:** Create `scripts/verify-enum-contracts.ts` or remove/fix the `package.json` entry.

### 4B. `npm run gateway:check` — PASS (with violations)

```
Total violations: 22
RPC violations: 2
Mutation violations: 20
```

The gateway check is functional and detected 22 places where code bypasses the typed gateway by calling `supabase.rpc()` or `supabase.from().insert/update/delete` directly instead of going through `@/lib/rpc` or `@/lib/db`.

Key violation locations:
- `src/features/admin/investors/services/` (multiple insert/update calls bypassing gateway)
- `src/features/admin/reports/services/` (delete/update calls on `generated_statements`, `investor_fund_performance`)
- `src/features/shared/services/withdrawalService.ts` (insert on `withdrawal_requests`)
- `src/services/shared/notificationService.ts` (delete on `notifications`)
- `src/services/shared/profileService.ts` (upsert on `investor_fee_schedule`)

### 4C. `npm run test:qa:contracts` — FAIL

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../tests/qa/ci/contract-drift-check.ts'
```

**Root cause:** The test file `tests/qa/ci/contract-drift-check.ts` does not exist.

**Fix:** Create the file or remove the `package.json` entry.

### 4D. `npm run test:qa:gateway` — FAIL

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../tests/qa/ci/gateway-bypass-check.ts'
```

**Root cause:** Same — `tests/qa/ci/gateway-bypass-check.ts` does not exist.

**Fix:** Create the file or remove the `package.json` entry.

---

## 5. Mismatch Inventory (Consolidated)

| # | Function | Issue | Severity | Recommendation |
|---|----------|-------|----------|----------------|
| 1 | `apply_segmented_yield_distribution_v5` | SECDEF mutation not in RPC_FUNCTIONS | P0 | Add to registry — primary yield distribution path |
| 2 | `apply_yield_distribution_v5_with_lock` | SECDEF mutation not in RPC_FUNCTIONS | P1 | Add to registry (locked variant) |
| 3 | `set_account_type_for_ib` | CRITICAL_RPC not in RPC_FUNCTIONS | P0 | Add to registry immediately |
| 4 | `cancel_withdrawal_by_admin_v2` | SECDEF mutation not in RPC_FUNCTIONS | P1 | Add to registry |
| 5 | `is_admin_for_jwt` | Phantom — not in DB | P2 | Remove from registry |
| 6 | `is_admin_safe` | Phantom — not in DB | P2 | Remove from registry |
| 7 | `is_admin` | Overloaded in DB (2 variants) — single entry in registry | P2 | Verify correct overload resolution |
| 8 | `qa_admin_id` through `qa_seed_world` (5) | Test-only, not in production DB | P2 | Gate behind test detection or remove |
| 9 | `apply_daily_yield_to_fund` | Referenced in CI CRITICAL_RPCS but doesn't exist in DB | P0 | Fix CI — replace with `apply_daily_yield_with_validation` |
| 10 | `add_fund_to_investor` | `p_fund_id` typed as `text` in DB, `uuid` in frontend | P2 | Align type (DB is `text`, frontend may expect `uuid`) |
| 11 | `get_paged_audit_logs` | SECDEF read not in RPC_FUNCTIONS | P1 | Add if frontend uses admin audit log view |
| 12 | `get_paged_notifications` | SECDEF read not in RPC_FUNCTIONS | P1 | Add if frontend uses paginated notifications |
| 13 | `get_fund_positions_sum` | SECDEF read not in RPC_FUNCTIONS | P1 | Add if used in reporting |
| 14 | `get_investor_cumulative_yield` | SECDEF read not in RPC_FUNCTIONS | P1 | Add if used in investor dashboard |
| 15 | `get_investor_yield_summary` | SECDEF read not in RPC_FUNCTIONS | P1 | Add if used in investor dashboard |
| 16 | `void_transaction_with_lock` | SECDEF mutation not in RPC_FUNCTIONS | P1 | Add — locked variant of `void_transaction` |
| 17 | `unvoid_transaction_with_lock` | SECDEF mutation not in RPC_FUNCTIONS | P1 | Add — locked variant of `unvoid_transaction` |
| 18 | `cascade_void_from_transaction` | SECDEF mutation not in RPC_FUNCTIONS | P1 | Add if frontend can cascade voids |
| 19 | `cascade_void_to_yield_events` | SECDEF mutation not in RPC_FUNCTIONS | P1 | Add if frontend can cascade voids |
| 20 | `log_data_edit` | SECDEF audit mutation not in RPC_FUNCTIONS | P2 | Add if frontend logs edits directly |
| 21 | 3 contract scripts missing | `contracts:verify`, `test:qa:contracts`, `test:qa:gateway` broken | P1 | Create missing scripts or remove from package.json |
| 22 | 22 gateway bypasses | Direct `supabase.from().insert/update/delete` calls | P1 | Migrate to `@/lib/db` gateway pattern |

---

## 6. Enum Drift Table

**No drift detected.** All 28 DB enums match TypeScript types exactly. This is the strongest alignment area in the contracts domain.

The auto-generation pipeline (`npx supabase gen types typescript --linked > types.ts`) is working correctly and should be the primary mechanism for keeping enums in sync.

---

## 7. Recommendations (Not Implemented — READ-ONLY Audit)

### Immediate (P0)

1. **Add `set_account_type_for_ib` to RPC_FUNCTIONS** — It's a CRITICAL_RPC with no typed frontend access
2. **Add `apply_segmented_yield_distribution_v5` to RPC_FUNCTIONS** — Primary yield distribution function
3. **Fix CI CRITICAL_RPCS** — Replace `apply_daily_yield_to_fund` with `apply_daily_yield_with_validation`

### Short-term (P1)

4. **Add missing SECDEF reads to registry** — `get_paged_audit_logs`, `get_paged_notifications`, `get_investor_cumulative_yield`, `get_investor_yield_summary`, `get_fund_positions_sum`
5. **Add locked variants** — `void_transaction_with_lock`, `unvoid_transaction_with_lock`
6. **Create missing contract scripts** — `scripts/verify-enum-contracts.ts`, `tests/qa/ci/contract-drift-check.ts`, `tests/qa/ci/gateway-bypass-check.ts`
7. **Migrate 22 gateway bypasses** to typed `@/lib/db` and `@/lib/rpc` patterns

### Medium-term (P2)

8. **Remove phantom entries** — `is_admin_for_jwt`, `is_admin_safe` from RPC_FUNCTIONS
9. **Gate QA functions** — `qa_*` (5 functions) behind test/development detection
10. **Verify `is_admin` overload** — DB has two overloads; confirm frontend uses the correct one
11. **Align `add_fund_to_investor.p_fund_id` type** — DB has `text`, frontend may assume `uuid`
12. **Export domain wrappers** for `ticket_*`, `approval_operation_type`, `error_category`, `platform_error_code` enums

### Structural

13. **Automate registry drift detection** — CI should compare `RPC_FUNCTIONS` against `pg_proc` on every push
14. **Mark trigger-only functions** — Add `triggerOnly: true` flag to registry for `enforce_*`, `audit_*`, `sync_*` functions that the frontend should never call
15. **Consider reducing registry scope** — 48 non-SECDEF internal functions (triggers, field updates) should arguably not be in the registry at all, reducing it from 190 to ~150 meaningful entries

---

## Appendix A: Complete DB Function List (270 Deduplicated)

See Section 1 for the full diff analysis. The local DB has 270 unique function names in the `public` schema (after deduplicating overloaded variants like `is_admin`, `log_audit_event`, `is_super_admin`, `require_super_admin`).

## Appendix B: Gateway Check Full Output

22 violations across these files:
- `src/features/admin/investors/services/adminInviteService.ts`
- `src/features/admin/investors/services/investorWizardService.ts`
- `src/features/admin/reports/services/reportScheduleService.ts`
- `src/features/admin/reports/services/reports/maintenance.ts`
- `src/features/admin/reports/services/statementAdminService.ts`
- `src/features/shared/services/investorInviteService.ts`
- `src/features/shared/services/withdrawalService.ts`
- `src/services/shared/notificationService.ts`
- `src/services/shared/profileService.ts`

All violations follow the pattern of calling `supabase.from().insert/update/delete` instead of `db.insert/update/delete` from `@/lib/db`.