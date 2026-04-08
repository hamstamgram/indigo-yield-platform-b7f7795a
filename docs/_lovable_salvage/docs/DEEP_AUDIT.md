# Deep Backend and Codebase Audit -- Indigo Yield Platform

**Audit Date:** 2026-02-19
**Auditors:** Elliot (Security), Tesla (Architecture), Guilfoyle (Code Quality)
**Scope:** Full platform -- 735 source files, 39 tables, 30+ edge functions, 48 migrations
**Methodology:** Static analysis of all migrations, services, hooks, edge functions, RLS policies, and routing

---

## Summary

| Severity | Count | Key Areas |
|----------|-------|-----------|
| CRITICAL (P0) | 6 | RPC authorization gaps, floating-point in financial edge functions, missing RLS on void_yield_distribution, admin check inconsistency |
| HIGH (P1) | 9 | Four admin-check function variants, yield domain types use `number`, orphan auth users, preview admin bypass, edge function performance calc uses JS Number |
| MEDIUM (P2) | 11 | Dead code, `as any` casts, useUnifiedInvestors scalability, 4 test files total, missing error handling patterns |
| LOW (P3) | 7 | Console.log remnants, redirect routes without guards, dependency audit, migration consolidation |

---

## CRITICAL (P0) -- Must Fix Before Production

### P0-1: `void_yield_distribution` Has No Admin Authorization Check

**File:** `supabase/migrations/20260219111201_integrity_sprint_fixes.sql` (line ~16)
and `supabase/migrations/00000000000000_baseline_from_prod.sql` (line ~3512)

**What:** The `void_yield_distribution` RPC is `SECURITY DEFINER` and is granted `EXECUTE` to the `authenticated` role. The function body contains no `is_admin()` check. Any authenticated user (including investors) can call this function to void yield distributions.

**Why it matters:** An investor could void yield distributions, causing cascading voiding of transactions, allocations, and AUM events. This would corrupt the entire financial ledger.

**Evidence:** The function immediately does `PERFORM set_config('indigo.canonical_rpc', 'true', true)` and starts modifying records without any authorization gate. Compare with `apply_transaction_with_crystallization` which has `IF NOT is_admin() THEN RAISE EXCEPTION`.

**Recommended fix:**
```sql
-- Add at the top of void_yield_distribution body, after PERFORM set_config:
IF NOT public.is_admin() THEN
  RAISE EXCEPTION 'Access denied: Only administrators can void yield distributions'
    USING ERRCODE = 'insufficient_privilege';
END IF;
```

---

### P0-2: `apply_adb_yield_distribution_v3` Admin Check Only Validates Non-NULL UID

**File:** `supabase/migrations/00000000000000_baseline_from_prod.sql` (line ~870)

**What:** The function checks `v_admin := COALESCE(p_admin_id, auth.uid()); IF v_admin IS NULL THEN RAISE EXCEPTION 'Admin authentication required'`. This only validates that a user is logged in, NOT that they are an admin. Any authenticated user can invoke this RPC to distribute yield.

**Why it matters:** An investor could trigger yield distributions with arbitrary gross yield amounts, fabricating returns and inflating their positions.

**Evidence:** GRANT line: `GRANT ALL ON FUNCTION "public"."apply_adb_yield_distribution_v3"(...) TO "authenticated"`. The function is callable by any logged-in user and only checks for non-null UID.

**Recommended fix:**
```sql
-- Replace the null check with proper admin authorization:
v_admin := COALESCE(p_admin_id, auth.uid());
IF NOT public.is_admin() THEN
  RAISE EXCEPTION 'Access denied: Only administrators can distribute yield'
    USING ERRCODE = 'insufficient_privilege';
END IF;
```

---

### P0-3: `apply_daily_yield_with_validation` Has No Admin Check

**File:** `supabase/migrations/00000000000000_baseline_from_prod.sql` (line ~2078)

**What:** This SECURITY DEFINER function is granted to `authenticated` and contains zero admin authorization. It accepts a `p_created_by` UUID parameter (caller-supplied) and a `p_skip_validation` flag that can bypass yield validation entirely.

**Why it matters:** Any authenticated user can distribute daily yield to any fund, with arbitrary percentages, and skip validation. This is arguably the most dangerous unguarded function.

**Recommended fix:**
```sql
-- Add at the top of function body:
IF NOT public.is_admin() THEN
  RAISE EXCEPTION 'Access denied: Only administrators can apply daily yield'
    USING ERRCODE = 'insufficient_privilege';
END IF;
```

---

### P0-4: `crystallize_yield_before_flow` Has No Admin Check

**File:** `supabase/migrations/00000000000000_baseline_from_prod.sql` (line ~2620)

**What:** This SECURITY DEFINER function is granted to `authenticated` and performs crystallization (distributing accrued yield). No admin check present. While it is typically called as a subroutine from other RPCs, the direct GRANT means any user can invoke it.

**Why it matters:** Unauthorized crystallization could manipulate yield allocation timing, potentially allowing an investor to crystallize before depositing to capture unearned yield.

**Recommended fix:** Either add `require_admin()` at the top OR revoke direct authenticated access:
```sql
REVOKE EXECUTE ON FUNCTION public.crystallize_yield_before_flow(...) FROM authenticated;
```

---

### P0-5: `generate-fund-performance` Edge Function Uses JavaScript `Number` for Financial Calculations

**File:** `supabase/functions/generate-fund-performance/index.ts` (lines 68-69, 280, 318, 348, 360, 373, 380)

**What:** The performance report generation function performs all financial calculations using JavaScript native `Number` type with `Math.round()`, `Math.pow()`, and `Number()` casts. There is no Decimal.js usage despite the CLAUDE.md rule: "Never use JavaScript Number for money."

**Why it matters:** JavaScript floating-point arithmetic causes precision errors. For example, `0.1 + 0.2 = 0.30000000000000004`. With BTC values at 8 decimal places, rounding errors could compound across hundreds of investors, producing incorrect rate-of-return figures on investor statements. These statements could be used for tax reporting.

**Specific problematic lines:**
- Line 68-69: `Math.pow(10, decimals)` and `Math.round(value * factor) / factor` for rounding
- Line 280: `Number((snap as any).current_value) || 0` for balance parsing
- Line 348/360/380: `Math.abs(Number(tx.amount))` for transaction amounts
- Line 373: `.reduce((sum: number, tx: any) => sum + Math.abs(Number(tx.amount)), 0)` -- accumulating sums in native Number

**Recommended fix:** Import Decimal.js in the edge function (or a lightweight alternative for Deno) and perform all arithmetic with arbitrary-precision decimals. The frontend already has `Decimal.js` with `parseFinancial()` -- replicate this pattern in the edge function.

---

### P0-6: Four Different Admin Check Functions Create Authorization Inconsistency

**File:** `supabase/migrations/00000000000000_baseline_from_prod.sql` (lines 408, 457, 496, 532)

**What:** There are four distinct admin check functions with different logic:

| Function | Logic | Used In |
|----------|-------|---------|
| `is_admin()` | `user_roles` WHERE `auth.uid()` AND `role IN ('admin','super_admin')` AND `profiles.status = 'active'` | 67 RLS policies, RPCs |
| `check_is_admin(uuid)` | `user_roles` WHERE `user_id = arg` AND `role IN ('admin','super_admin')` | 9 RLS policies |
| `is_admin(uuid)` | `profiles` WHERE `id = arg` AND (`is_admin = true` OR `role IN ('admin','super_admin')`) | Edge functions via admin-check.ts fallback |
| `is_admin_safe()` | `user_roles` WHERE `auth.uid()` AND `role IN ('admin','super_admin')` (no status check) | 4 RLS policies |

**Why it matters:**
1. `is_admin(uuid)` checks `profiles.is_admin` flag which is a legacy boolean -- if someone sets `profiles.is_admin = true` directly (bypassing `user_roles`), they gain admin access through this function but not through `is_admin()`.
2. `is_admin_safe()` skips the `profiles.status = 'active'` check, meaning a suspended admin could still pass this check.
3. An attacker who compromises the `profiles` table via any write vulnerability could escalate to admin via `is_admin(uuid)`.

**Recommended fix:**
1. Consolidate to a single canonical function that checks `user_roles` only.
2. Remove `profiles.is_admin` usage from `is_admin(uuid)`.
3. Add status check to `is_admin_safe()` or deprecate it.
4. Update the edge function `admin-check.ts` to stop using `profiles.is_admin` as fallback.

---

## HIGH (P1) -- Fix Within a Week

### P1-1: Yield Domain Types Use `number` Instead of `string` for Financial Values

**File:** `src/types/domains/yield.ts` (lines 293-337)

**What:** Multiple interfaces in the yield domain use `number` type for financial fields:
- `V5SegmentSummary`: `closing_aum: number`, `yield: number`
- `V5InvestorAllocation`: `balance: number`, `gross: number`, `fee: number`, `ib: number`, `net: number`
- `V5InvestorTotal`: `gross: number`, `fee: number`, `ib: number`, `net: number`
- `V5Summary`: `total_yield?: number`, `gross_yield?: number`, `net_yield?: number`, `total_fees?: number`

**Why it matters:** Per CLAUDE.md rule 1: "Never use JavaScript Number for money." When these types flow through React components and calculations, precision is lost. The database stores NUMERIC(28,10) but JavaScript `number` only has ~15 significant digits.

**Recommended fix:** Change all financial fields to `string` type and use `parseFinancial()` when calculations are needed.

---

### P1-2: `recompute_investor_position` Has No Admin Check

**File:** `supabase/migrations/00000000000000_baseline_from_prod.sql` (comment at ~line 3177)

**What:** The function explicitly comments "no admin check" and is granted to `authenticated`. It recalculates investor positions from the ledger.

**Why it matters:** While this function is read-from-ledger/write-to-positions (so it cannot fabricate money), an investor could trigger recomputation of ANY investor's position, potentially causing timing-related inconsistencies during concurrent operations.

**Recommended fix:** Add `require_admin()` or revoke authenticated access.

---

### P1-3: Edge Function `admin-check.ts` Falls Back to `profiles.is_admin` Boolean

**File:** `supabase/functions/_shared/admin-check.ts` (line 57)

**What:** The shared admin check used by ALL edge functions first checks `user_roles`, then falls back to `profiles.is_admin`. This legacy boolean field is directly queryable and updateable by any user who has UPDATE access to their own profile via RLS.

**Why it matters:** If the `profiles` UPDATE RLS policy does not specifically exclude `is_admin` from updateable columns, a user could set `profiles.is_admin = true` on their own row and gain admin access to all edge functions.

**Evidence:** The profile update policy is: `"profiles_update_own_or_admin" ... USING (id = auth.uid() OR is_admin())` -- this allows users to update their own profile row. If no column-level restriction exists, `is_admin` is writable.

**Recommended fix:**
1. Remove the `profiles.is_admin` fallback from `admin-check.ts`.
2. Add a trigger to `profiles` that prevents modification of `is_admin`, `role`, `account_type`, `is_system_account`, and `include_in_reporting` by non-admin users.
3. Consider removing `profiles.is_admin` entirely (use `user_roles` only).

---

### P1-4: 338 Orphan Auth Users in Supabase Auth

**What:** The integrity check flagged 338 auth users without corresponding `profiles` rows. These users can authenticate but have no profile data.

**Why it matters:**
1. Orphan users bypass the `profiles.status = 'active'` check in `is_admin()` since they have no profile to check.
2. The `is_admin_safe()` function only checks `user_roles`, so if any orphan has a `user_roles` entry, they are treated as admin despite having no profile.
3. Orphan users could potentially create withdrawal requests via RLS policies that check `investor_id = auth.uid()` without needing a profile.

**Recommended fix:**
1. Create a migration to delete orphan entries from `auth.users` that have no `profiles` row.
2. Add a trigger on `auth.users` that automatically creates a `profiles` row (or blocks signup without one).
3. Add `INNER JOIN profiles` to `is_admin_safe()` to require an active profile.

---

### P1-5: `VITE_PREVIEW_ADMIN` Environment Variable Can Bypass Admin Auth

**File:** `src/components/auth/RequireAdmin.tsx` (line 23)

**What:** The `RequireAdmin` component has: `if (!session && !import.meta.env.VITE_PREVIEW_ADMIN)`. If `VITE_PREVIEW_ADMIN` is set to any truthy value at build time, the session check is skipped entirely.

**Why it matters:** While this is intended for development preview mode, if accidentally set in a production build, ANY unauthenticated user could access admin routes. The env var is embedded in the client bundle at build time and is visible in the JavaScript source.

**Evidence:** This check was noted in `environment.ts` as `previewAdmin: getBoolEnv("VITE_PREVIEW_ADMIN", false)`.

**Recommended fix:**
1. Remove this bypass entirely. Use a separate development-only auth mock.
2. At minimum, guard with: `if (import.meta.env.MODE === 'development' && import.meta.env.VITE_PREVIEW_ADMIN)`.
3. Add a CI check that fails if `VITE_PREVIEW_ADMIN` is set in production/staging builds.

---

### P1-6: RLS Policies Use Three Different Patterns for Admin Check

**What:** Across 124 RLS policies in the baseline migration:
- 67 use `is_admin()` (checks `user_roles` + `profiles.status`)
- 9 use `check_is_admin(auth.uid())` (checks `user_roles` only)
- 4 use `is_admin_safe()` (checks `user_roles`, no status check)
- 4 use inline `profiles.is_admin = true` subquery (legacy)

**Why it matters:** The `profiles.is_admin` subquery pattern (used on `fund_aum_events`, `global_fee_settings`, `statement_periods`, `investor_fund_performance`) does not check `user_roles` at all. If `profiles.is_admin` is true but the user has no `user_roles` entry, they pass these 4 policies but fail the other 80.

**Tables affected:**
- `fund_aum_events` INSERT/UPDATE
- `global_fee_settings` full access
- `statement_periods` full access
- `investor_fund_performance` full access

**Recommended fix:** Migrate all 4 inline `profiles.is_admin` policies to use `is_admin()` function.

---

### P1-7: Revoked RPCs Migration Is Incomplete

**File:** `supabase/migrations/20260227_revoke_public_rpc_access.sql`

**What:** This migration revokes access from only 5 functions (`adjust_investor_position`, `process_yield_distribution`, `void_transaction`, `get_investor_reports_v2`, `generate_investor_report`). But many more critical RPCs remain accessible to `authenticated`:
- `apply_daily_yield_with_validation`
- `crystallize_yield_before_flow`
- `batch_crystallize_fund`
- `crystallize_month_end`

**Why it matters:** The intent was to lock down sensitive RPCs, but the implementation missed the most critical ones.

**Recommended fix:** Create a new migration that revokes `authenticated` access from all yield/crystallization/void RPCs that have internal `is_admin()` checks (belt-and-suspenders), and ADD internal checks to those that lack them (P0-1 through P0-4).

---

### P1-8: `fund_yield_snapshots` Table Created in Archived Migration, Not in Baseline

**File:** `supabase/migrations/_archive_pre_squash/20260102172036_*.sql` (line 73)

**What:** The `fund_yield_snapshots` table was created in an archived (pre-squash) migration with RLS enabled. The baseline migration does not contain a `CREATE TABLE fund_yield_snapshots`. The table is referenced in function bodies (line 5385, 5422 of baseline) but may or may not exist in the production schema depending on migration history.

**Why it matters:** If the table exists but its RLS policies were lost during the squash, it operates without row-level security. If it does not exist, the functions referencing it will fail silently or error.

**Recommended fix:** Verify in production whether the table exists and has RLS enabled. If missing, add it to a new migration with proper RLS.

---

### P1-9: `is_admin(uuid)` Overload Checks Stale `profiles.role` Column

**File:** `supabase/migrations/00000000000000_baseline_from_prod.sql` (line ~457)

**What:** The overloaded `is_admin(p_user_id uuid)` function checks `profiles.role IN ('admin', 'super_admin')`. The `profiles` table does have a `role` text column, but the platform's canonical role system uses the `user_roles` table. The `profiles.role` field appears to be a legacy/manual field with no enforced enum.

**Why it matters:** This function could return true for users who have `profiles.role = 'admin'` set manually but have no `user_roles` entry. Since `is_admin(uuid)` is used in the edge function admin check fallback path, this creates a privilege escalation vector.

**Recommended fix:** Remove the `profiles.role` check from `is_admin(uuid)` and deprecate the `profiles.role` column.

---

## MEDIUM (P2) -- Fix Within a Month

### P2-1: `useUnifiedInvestors` Scalability Issue

**File:** `src/hooks/data/shared/useInvestorEnrichment.ts` (line ~83)

**What:** The hook fetches ALL investors with summaries, ALL assets, ALL active positions, then runs 4 parallel batch enrichment queries (withdrawal counts, activity dates, report periods, IB parents). All data is held in memory.

**Why it matters:** At 1000+ investors, this will:
1. Fetch potentially 4000+ database rows in parallel
2. Hold all enriched investor objects in React Query cache
3. Re-render the entire list on any cache invalidation

**Recommended fix:** Implement server-side pagination, filtering, and sorting. Use an RPC that returns paginated, pre-enriched data. Current `staleTime: 30000` (30s) means this heavy query runs frequently.

---

### P2-2: 60+ `as any` Casts in Service and Database Layers

**Files:** `src/lib/db/client.ts` (14 casts), `src/lib/db/query-builder.ts` (20 casts), `src/services/admin/adminTransactionHistoryService.ts` (3 casts), `src/hooks/data/admin/yield/useYieldCalculation.ts` (1 cast), `src/hooks/data/admin/yield/useYieldSubmission.ts` (1 cast), `src/lib/db/viewTypes.ts` (1 cast), `src/integrations/supabase/rpc-helpers.ts` (2 casts)

**What:** The generic database client (`db/client.ts` and `query-builder.ts`) uses `as any` extensively for dynamic query building. Some of these are documented as intentional (generic operations), but others mask type errors.

**Why it matters:** The documented `as any` casts in `db/client.ts` are relatively safe (generic CRUD), but the ones in `useYieldCalculation.ts` (line 67) and `useYieldSubmission.ts` (line 76) suppress type checking on financial RPC parameters.

**Recommended fix:** Priority targets for elimination:
1. `useYieldCalculation.ts:67` -- use `callRPC` typed wrapper instead
2. `useYieldSubmission.ts:76` -- use `callRPC` typed wrapper instead
3. `adminTransactionHistoryService.ts:341,364,393` -- add types for `unvoid_transaction`, `void_transactions_bulk`, `unvoid_transactions_bulk` RPCs

---

### P2-3: Only 4 Test Files for a 735-File Codebase

**Files:**
- `src/features/admin/system/components/__tests__/FinancialSnapshot.test.tsx`
- `src/features/admin/system/components/__tests__/FundAUMBar.test.tsx`
- `src/utils/__tests__/performanceCalculations.test.ts`
- `src/utils/__tests__/statementReconciliation.test.ts`

**What:** The test infrastructure exists (Vitest, Playwright configured) but only 4 test files exist. No tests for:
- Yield distribution calculations (the most critical financial path)
- Crystallization logic
- Transaction creation flow
- Fee/IB allocation
- Withdrawal request validation
- RLS policy enforcement
- Admin authorization

**Why it matters:** For a platform handling real investor money, the CLAUDE.md itself flags this as "CRITICAL" risk. The `performanceCalculations.test.ts` only tests the statement rate-of-return formula, not the actual yield engine.

**Recommended fix:** Priority test creation order:
1. Yield distribution conservation identity: `gross = net + fees + ib + dust`
2. ADB allocation proportionality tests
3. Crystallization timing tests
4. RLS policy tests (investor cannot access other investor data)
5. Admin authorization tests (investor cannot call admin RPCs)

---

### P2-4: `feeSettingsService.ts` Uses `parseFloat` for Financial Value

**File:** `src/services/admin/feeSettingsService.ts` (line 26)

**What:** `return val ? parseFloat(val) : 0.2;` -- the global fee setting is parsed with `parseFloat` instead of `parseFinancial`.

**Why it matters:** Fee percentages drive the entire fee waterfall. While the value is typically a simple decimal (e.g., 0.30 for 30%), `parseFloat` introduces floating-point representation that could compound through calculations.

**Recommended fix:** Use `parseFinancial(val).toNumber()` or better, keep as string/Decimal throughout.

---

### P2-5: `feesService.ts` and `recordedYieldsService.ts` Use `Number()` Casts

**File:** `src/services/admin/feesService.ts` (lines 147, 209, 287-289, 324)
**File:** `src/services/admin/recordedYieldsService.ts` (lines 186-189)

**What:** Financial values from the database are cast to `Number()` for display and aggregation:
```typescript
amount: Number(tx.amount),
base_net_income: Number(a.gross_yield_amount || 0),
fee_amount: Number(a.fee_amount || 0),
```

**Why it matters:** These values come from `NUMERIC(28,10)` columns and lose precision when cast to JS `Number`. While primarily used for display, they flow into calculations and aggregations.

**Recommended fix:** Use `parseFinancial()` consistently and format for display at the component level only.

---

### P2-6: Webhook Endpoint Has No Rate Limiting

**File:** `supabase/functions/mailersend-webhook/index.ts`

**What:** The webhook endpoint validates HMAC signatures (good) but has no rate limiting. An attacker with the webhook signing secret could flood the endpoint with delivery status updates.

**Why it matters:** Each webhook processes a database lookup, update, and insert. Flooding could cause database connection pool exhaustion.

**Recommended fix:** Add rate limiting per `provider_message_id` (e.g., max 10 events per message per minute).

---

### P2-7: Missing Indexes on Frequently-Queried Columns

**What:** The baseline has 184 indexes, but several common query patterns lack covering indexes:
- `transactions_v2` is queried by `(investor_id, fund_id, tx_date)` but the composite index may not cover all patterns
- `yield_allocations` is queried by `distribution_id` + `investor_id` (has UNIQUE constraint, should be fine)
- `withdrawal_requests` is queried by `(investor_id, status)` -- verify composite index exists

**Recommended fix:** Run `EXPLAIN ANALYZE` on the 10 most common admin queries and add indexes where sequential scans appear.

---

### P2-8: Error Handling Silently Returns Empty Arrays

**File:** `src/services/shared/auditLogService.ts` (lines 172-173, 190-191)
**File:** `src/services/investor/fundViewService.ts` (line 115)

**What:** Multiple service functions catch errors, log them, and return empty arrays or null:
```typescript
catch (error) {
  logError("auditLogService.getUniqueEntities", error);
  return [];
}
```

**Why it matters:** The caller has no way to distinguish between "no data" and "error fetching data." In a financial platform, this could mask data integrity issues.

**Recommended fix:** Return a result object with `{ data, error }` pattern (consistent with Supabase client conventions) so callers can show appropriate error states.

---

### P2-9: `preflowAumService.ts` Uses `Number()` for AUM Values

**File:** `src/services/admin/preflowAumService.ts` (lines 49, 85, 135)

**What:** AUM values are converted with `Number()`:
```typescript
closingAum: Number(row.closing_aum || 0),
const aumValue = Number(row.aum_value ?? 0);
```

**Why it matters:** AUM values are the foundation of yield distribution calculations. Loss of precision in the preflow AUM lookup could cause the yield calculation to use slightly incorrect base values.

**Recommended fix:** Use `parseFinancial()` and keep as string/Decimal until the calculation boundary.

---

### P2-10: Real-Time Subscriptions Create 3 Channels per Investor Session

**File:** `src/features/investor/shared/hooks/useInvestorRealtimeInvalidation.ts`

**What:** Each investor session creates 3 Supabase Realtime channels: `transactions_v2`, `withdrawal_requests`, `investor_positions`. Cleanup is in the useEffect return.

**Why it matters:** At scale (100+ concurrent investor sessions), this creates 300+ Realtime channels. Supabase has connection limits. If a component unmounts and remounts rapidly, channels could leak if the cleanup race condition is not handled.

**Evidence:** Cleanup looks correct (uses `supabase.removeChannel`), but the effect depends on `userId` and `queryClient` -- if `queryClient` reference changes, channels are recreated.

**Recommended fix:** Consider consolidating to a single multiplexed channel per investor, or implementing a connection manager singleton.

---

### P2-11: `dashboardMetricsService.ts` Converts Financial Values via `.toNumber()`

**File:** `src/services/admin/dashboardMetricsService.ts` (lines 141, 147, 205)

**What:** Uses `parseFinancial(...).toNumber()` which converts from Decimal.js back to JavaScript Number, losing the precision benefits.

**Recommended fix:** Keep as Decimal until the final display formatting step.

---

## LOW (P3) -- Nice to Have

### P3-1: Two `console.log` Statements in Production Code

**File:** `src/utils/security-logger.ts` (line 162): `console.log(`[SECURITY] ${event.event_type}:`, event);`
**File:** `src/lib/supabase/typedRPC.ts` (line 89): In a JSDoc comment example (not actual code)

**Why it matters:** CLAUDE.md rule 8: "No console.log in production code." The security logger one is intentional but should use the structured `logInfo` utility.

**Recommended fix:** Replace with `logInfo("security.event", event)`.

---

### P3-2: Dead Redirect Route Files

**Files:**
- `src/routing/routes/admin/deposits.tsx` -- Redirects to `/admin/ledger`
- `src/routing/routes/admin/fees.tsx` -- Empty, no routes
- `src/routing/routes/admin/ib.tsx` -- Empty, no routes
- `src/routing/routes/admin/transactions.tsx` -- Empty, no routes
- `src/routing/routes/admin/withdrawals.tsx` -- Empty, no routes
- `src/routing/routes/admin/reports.tsx` -- Single redirect to `/admin/reports?tab=historical`

**Why it matters:** These files add no functionality. The redirect in `deposits.tsx` is not wrapped in `AdminRoute`, meaning the redirect itself is unprotected (though the target `/admin/ledger` IS protected).

**Recommended fix:** Remove empty files. For `deposits.tsx` and `reports.tsx`, either remove or wrap in `AdminRoute` for consistency.

---

### P3-3: Migration History Should Be Consolidated

**What:** There are 48 migration files including archives. The naming is inconsistent:
- Some use timestamps: `20260212173559_placeholder.sql`
- Some use descriptive names: `20260228_fix_v5_replay_bugs.sql`
- Several have `placeholder` names
- Three archive directories exist: `_archive`, `_archive_pre_squash`, `_archived_deprecated`

**Why it matters:** Cognitive overhead for new developers. The `placeholder` migrations could confuse about their purpose.

**Recommended fix:** Document what each placeholder migration does or consolidate into the baseline.

---

### P3-4: `.env` File Tracked in Git with Supabase Anon Key

**File:** `.env` (tracked per `git ls-files`)

**What:** The `.env` file is tracked in git and contains the Supabase URL, anon key, and Sentry DSN. The commit message explains this is intentional for Lovable Cloud builds. The file contains only publishable keys.

**Why it matters:** While these keys are publishable (anon key is safe to expose), tracking `.env` in git creates a pattern where developers might accidentally add secrets to this file. The `.env.local`, `.env.production`, and `.env.staging` files are correctly gitignored.

**Recommended fix:** Consider using a non-env mechanism for build-time config (e.g., `src/config/public-keys.ts` with publishable values only).

---

### P3-5: `feeScheduleService.ts` Uses `Number()` for Fee Percentage

**File:** `src/services/admin/feeScheduleService.ts` (line 33)

**What:** `fee_pct: Number(row.fee_pct || 0)` -- fee schedule percentages converted to Number.

**Recommended fix:** Use `parseFinancial()`.

---

### P3-6: `adminTransactionHistoryService.ts` Uses `parseFinancial().toNumber()` for RPC Params

**File:** `src/services/admin/adminTransactionHistoryService.ts` (lines 267, 270)

**What:** Transaction amounts are converted through `parseFinancial(params.newValues.amount).toNumber()` before being passed to an RPC. This loses precision at the RPC call boundary.

**Recommended fix:** Pass as string and let PostgreSQL handle the NUMERIC conversion: `p_new_amount: parseFinancial(params.newValues.amount).toString()`.

---

### P3-7: Dependency Audit Needed

**What:** `pnpm audit` did not complete within timeout. The `package.json` shows standard dependencies but no evidence of recent vulnerability scanning.

**Recommended fix:** Run `pnpm audit` manually and address any high/critical vulnerabilities. Set up automated dependency scanning in CI.

---

## Architecture Observations (Tesla)

### Structural Strengths
1. **Ledger-as-source-of-truth** with trigger-driven position updates is fundamentally sound.
2. **Advisory locks** on investor+fund prevent race conditions in concurrent operations.
3. **Idempotency via `reference_id` UNIQUE constraints** prevents double-processing.
4. **Conservation identity** (`gross = net + fees + ib + dust`) with integrity views is well-designed.
5. **Canonical RPC guard** on `yield_distributions` prevents direct DML bypass.
6. **Delta audit triggers** on all financial tables provide change tracking.

### Structural Risks
1. **Dual-track AUM** (`transaction` vs `reporting` purpose) is critical business logic understood only by the founder. A new developer could accidentally use `transaction` purpose for reports or vice versa, producing incorrect statements.
2. **V4/V5 engine coexistence** -- the V5 engine uses `transaction` purpose with checkpoint-only semantics. If V4 logic is run against V5 data, it would create duplicate fee/IB rows. No guard exists to prevent this.
3. **No rollback mechanism** for partial yield distribution failure. The RPCs run in a single transaction (PostgreSQL), so a failure mid-distribution rolls back the entire SQL transaction. However, if the edge function calling the RPC succeeds but the subsequent cache invalidation or UI update fails, the user may not see the result and retry, hitting the idempotency guard.
4. **Single admin path** -- there is no approval workflow for high-risk operations (large withdrawals, yield distributions). Any admin can unilaterally execute any financial operation.

---

## Audit Methodology Notes

- All 39 tables in the baseline migration have RLS enabled (verified).
- The `fund_yield_snapshots` and `investor_daily_balance` tables referenced in the integrity check appear to not exist in the baseline -- they may be from archived migrations or exist only in production.
- Edge function auth was verified by checking for `Authorization` header handling and `checkAdminAccess` usage.
- RPC authorization was verified by reading function bodies for `is_admin()`, `require_admin()`, or equivalent checks.
- Financial precision was verified by searching for `Number(`, `parseFloat`, `Math.` in service and edge function code.
