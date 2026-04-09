

## Deep DB Specialist Audit — Findings & Fix Plan

### Previously Fixed (Confirmed in DB)
- `crystallize_yield_before_flow`: No longer references `fund_aum_events` or `get_existing_preflow_aum` — FIXED
- `run_integrity_pack`: Check 2 uses inline query (no `fund_aum_mismatch` view) — FIXED
- `run_integrity_pack`: Check 3 uses `residual` column — FIXED
- `purge_fund_hard`, `force_delete_investor`, `reset_platform_data`: IF EXISTS guards for dropped tables — FIXED

---

### Finding 1 — HIGH: `apply_investor_transaction` has a dangerous overload pair

**9-param version**: `p_admin_id` is REQUIRED (no default)
**10-param version**: `p_admin_id DEFAULT NULL`, plus `p_distribution_id DEFAULT NULL`

When called with named params excluding both `p_admin_id` and `p_distribution_id` (6 required params), **both overloads match** — PostgreSQL raises "could not choose the best candidate function". Currently all DB callers use named params and always pass `p_admin_id`, so it resolves. But:

- `complete_withdrawal` passes 8 named params (including `p_admin_id`, excluding `p_purpose` and `p_distribution_id`) — both overloads match with 8 params since both have `p_purpose` with a default. PostgreSQL resolves this because the 9-param version matches exactly (8 explicit + 1 default), while the 10-param version needs 2 defaults. **This works but is fragile.**
- The 9-param overload is strictly a subset of the 10-param version and adds no value — it should be dropped.

**Fix**: Drop the 9-param overload. The 10-param version with `p_admin_id DEFAULT NULL` and `p_distribution_id DEFAULT NULL` handles all use cases.

---

### Finding 2 — HIGH: `route_withdrawal_to_fees` has ambiguous overloads

**2-param**: `(p_request_id uuid, p_reason text DEFAULT ...)`
**3-param**: `(p_request_id uuid, p_actor_id uuid, p_reason text DEFAULT NULL)`

Frontend calls with `{ p_request_id, p_reason }` — this matches the 2-param version. The 3-param version is never called (zero callers in DB or frontend). No internal DB callers either.

**Fix**: Drop the 3-param overload. It's dead code with ambiguity risk.

---

### Finding 3 — MEDIUM: `user_sessions` table still exists (was supposed to be dropped)

The dead weight cleanup migration `20260210100000_dead_weight_cleanup_phase0_4.sql` includes `DROP TABLE IF EXISTS user_sessions CASCADE`, but the table still exists in the live DB. Either the migration was never applied to production, or the table was re-created afterward.

**Fix**: Add a migration to drop it again.

---

### Finding 4 — MEDIUM: `_temp_function_dump` table with 288 rows — debug artifact

This table has no RLS, no foreign keys, and contains function definitions (likely from a one-time debug dump). It's publicly visible to any authenticated user who guesses the table name.

**Fix**: Drop this table.

---

### Finding 5 — MEDIUM: V4 yield function `apply_segmented_yield_distribution` is dead weight

The V4 function exists and is only referenced by:
- `enforce_canonical_yield_mutation` trigger error message (text reference only)
- The dead V4 `rpc.applyYield` frontend helper (already updated to V5)
- `rpcSignatures.ts` contract

No actual callers use V4 for yield distribution. V5 is the canonical engine.

**Fix**: Drop `apply_segmented_yield_distribution` and `preview_segmented_yield_distribution` from the DB. Remove from `rpcSignatures.ts` and `RATE_LIMITED_RPCS`. Update the trigger error message to reference V5.

---

### Finding 6 — LOW: 4 simulation functions are dead test weight

`run_v6_e2e_simulation`, `run_v6_user_simulation`, `run_v6_user_simulation_isolated`, `run_v6_void_simulation` — these are dev-only test harnesses with hardcoded test dates (3025-09-02). They consume DB space and reference production RPCs.

**Fix**: Drop all 4 simulation functions.

---

### Finding 7 — LOW: `enforce_canonical_yield_mutation` trigger message references V4

The trigger error message says "Use canonical RPC: apply_segmented_yield_distribution" — should reference V5.

**Fix**: Update the function to reference `apply_segmented_yield_distribution_v5`.

---

## Implementation Plan

### Migration 1 — Drop dangerous overloads (2 items)
1. Drop 9-param `apply_investor_transaction` overload (keep 10-param with all defaults)
2. Drop 3-param `route_withdrawal_to_fees` overload (keep 2-param)

### Migration 2 — Drop dead functions and tables (7 items)
3. Drop `apply_segmented_yield_distribution` (V4)
4. Drop `preview_segmented_yield_distribution` (V4 preview)
5. Drop 4 simulation functions (`run_v6_*`)
6. Drop `_temp_function_dump` table
7. Drop `user_sessions` table

### Migration 3 — Fix trigger message
8. Update `enforce_canonical_yield_mutation` to reference V5

### Frontend sync
9. Remove `apply_segmented_yield_distribution` from `rpcSignatures.ts` and `RATE_LIMITED_RPCS`
10. Remove `preview_segmented_yield_distribution` from `rpcSignatures.ts`
11. Update `CANONICAL_MUTATION_RPCS.YIELD` to reference V5

### Risk Assessment
- Dropping the 9-param overload is safe: all callers use named params and the 10-param version covers all cases (confirmed by reviewing every caller in the DB)
- Dropping V4 yield is safe: zero active callers, V5 is canonical
- Dropping simulation functions is safe: dev-only, never called from production code
- `_temp_function_dump` is a debug artifact with no dependents
- `user_sessions` has zero rows and zero FK references

