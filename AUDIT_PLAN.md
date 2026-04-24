# Indigo Yield — Comprehensive Audit & Fix Plan
> Generated from parallel audits: Security, Frontend/Hooks, Type Safety, Service Routing

## Executive Summary

Five specialized audits found **23 confirmed issues** across the stack, with **5 CRITICAL** security and data-integrity bugs. The root cause pattern behind the withdrawal→deposit bug (auto-overwriting user selections via cascading useEffects) appears in **6 additional locations**. Several security vulnerabilities from recent migrations suggest the system was in a vulnerable state until days ago.

---

## CRITICAL — Fix Before Any Deploy

### C1. Hardcoded Production Supabase Anon Key in Frontend Bundle
- **Files:** `src/integrations/supabase/client.ts:5-10`, `src/config/environment.ts:107-108`
- **Issue:** Real production anon key is baked into fallback constants. Extractable from built JS.
- **Fix:** Remove fallback constant; fail fast with clear error if env var missing.

### C2. `.env` File Committed to Git with Live Secrets
- **Files:** `.env` (working tree), git history `b125344c`
- **Issue:** Contains live Supabase anon keys, Sentry DSN, `VITE_INDIGO_FEES_ACCOUNT_ID`.
- **Fix:** `git rm --cached .env`, add to `.gitignore`, **rotate all keys immediately**.

### C3. `AdminManualTransaction.tsx` Bypasses Withdrawal Audit Trail
- **File:** `src/features/admin/transactions/pages/AdminManualTransaction.tsx:128`
- **Issue:** Admin can submit `WITHDRAWAL` directly via `createInvestorTransaction()`, skipping `withdrawal_requests` table and `can_withdraw` checks. Breaks audit trail.
- **Fix:** Route ALL `WITHDRAWAL` submissions through `withdrawalService.createRequest()` + `approveAndComplete()`, same as `AddTransactionDialog`.

### C4. `useTransactionForm.ts` Auto-Switches Transaction Type
- **File:** `src/features/admin/transactions/hooks/useTransactionForm.ts:90-105`
- **Issue:** `useEffect` auto-selects `DEPOSIT` when `currentBalance > 0`. Race conditions between balance fetch and user selection silently overwrite the intended type. This was the root cause of the reported bug.
- **Fix:** Add `isUserEdited` ref flag. Only auto-select when flag is false. Set to true on any type select `onChange`.

### C5. `AdminManualTransaction.tsx` Auto-Corrects User-Selected Type
- **File:** `src/features/admin/transactions/pages/AdminManualTransaction.tsx:100-105`
- **Issue:** Separate `useEffect` watches `currentBalance` and calls `form.setValue("type", "DEPOSIT")` whenever `currentBalance > 0 && txnType === "FIRST_INVESTMENT"`. Overwrites manual selection.
- **Fix:** Remove auto-correct effect. Validate at submit time instead.

---

## HIGH — Fix in Current Sprint

### H1. CORS Wildcard Exposed in OPTIONS Responses
- **Files:** `supabase/functions/_shared/cors.ts:23`, `integrity-monitor/index.ts:353`, `process-withdrawal/index.ts:19`
- **Issue:** `Access-Control-Allow-Origin: *` returned. Violates security policy.
- **Fix:** Use explicit origin whitelist; reject unmatched origins.

### H2. `process-withdrawal` Lacks Rate Limiting
- **File:** `supabase/functions/process-withdrawal/index.ts`
- **Issue:** No request throttling. Authenticated user could spam requests.
- **Fix:** Add per-user rate limit (e.g., 5 requests/min) using Redis or edge function KV.

### H3. `admin-user-management` Edge Function Has No Input Validation
- **File:** `supabase/functions/admin-user-management/index.ts:84`
- **Issue:** `action` string and `params` passed unchecked into switch. Malformed payload could hit unexpected paths.
- **Fix:** Add Zod schema validation at entry point.

### H4. PII Logged in Edge Function stdout
- **Files:** `admin-user-management/index.ts:146,233,305,499`, `process-report-delivery-queue/index.ts:202`
- **Issue:** Email addresses, user IDs logged. Supabase retains function logs. GDPR violation.
- **Fix:** Sanitize logs — log hashed IDs only, never raw emails.

### H5. `send-email` Accepts Arbitrary HTML Without Sanitization
- **File:** `supabase/functions/send-email/index.ts:71-106`
- **Issue:** Compromised admin account can send arbitrary HTML/phishing via Resend.
- **Fix:** Sanitize `html` field with DOMPurify or restrict to pre-approved templates.

### H6. `excel_import` Bypasses Canonical Crystallization Flow
- **File:** `supabase/functions/excel_import/index.ts:301-303`
- **Issue:** Direct `transactions_v2` insert with `WARNING: Direct insert bypasses crystallization flow`. Missing audit trail.
- **Fix:** Route imports through `apply_transaction_with_crystallization` RPC or add explicit audit logging.

### H7. Error Messages Leak Internal Details
- **Files:** `process-withdrawal/index.ts:396-403`, `excel_import/index.ts:428-433`
- **Issue:** Raw `error.message` / `String(error)` returned to client. Can expose table names, SQL syntax.
- **Fix:** Return generic error messages to client; log full details server-side only.

### H8. No Frontend Validation Before `createInvestorTransaction`
- **File:** `src/services/shared/transactionService.ts:182-280`
- **Issue:** Frontend doesn't verify caller is admin before invoking RPC. Relies solely on server-side check.
- **Fix:** Add explicit admin check on frontend before RPC call (defense in depth).

### H9. Form Resets Mid-Edit on Parent Re-render
- **File:** `src/features/admin/transactions/VoidAndReissueDialog.tsx:156-175`
- **Issue:** Reset effect depends on `transaction` object. New object reference on re-render wipes user input.
- **Fix:** Depend on `transaction?.id` and gate with ref: `if (lastResetId.current === transaction?.id) return`.

### H10. Same Reset Bug in Fund Editor
- **File:** `src/features/admin/funds/components/EditFundDialog.tsx:98-109`
- **Fix:** Same as H9 — depend on `fund?.id` instead of `fund`.

### H11. Loading State Stuck Forever on Validation Failure
- **File:** `src/features/admin/yields/hooks/yield/useYieldCalculation.ts:46-104`
- **Issue:** `setPreviewLoading(true)` before validation, but early return at line 63 never calls `setPreviewLoading(false)`.
- **Fix:** Move `setPreviewLoading(true)` after validation, or add `setPreviewLoading(false)` before every early return.

### H12. Dialog Open Effect Re-runs on Prop Changes
- **File:** `src/features/admin/transactions/AddTransactionDialog.tsx:95-107`
- **Issue:** Resets `selectedInvestorId` whenever `investorId` prop changes. Two competing effects for fund/asset sync cause unnecessary re-runs when `funds` array reference changes on TanStack Query background updates.
- **Fix:** Gate reset on `open` transitioning false→true using ref. Memoize `funds` mapping or depend on `selectedFundId` only.

### H13. IB Commission Auto-Sync Overrides Manual Edits
- **File:** `src/features/admin/investors/components/wizard/steps/FeesStep.tsx:42-46`
- **Issue:** Effect unconditionally copies `investorFeePct` into `ib_commission_pct`. Manual IB edits lost.
- **Fix:** Track `hasUserEditedIbCommission` ref. Only sync when flag is false.

### H14. Fragile Success Detection by Dialog State Transition
- **File:** `src/features/admin/yields/components/GlobalYieldFlow.tsx:29-47`
- **Issue:** `hasInitialized` ref never reset on unmount. In React 18 Strict Mode (double mount) or rapid reopen, `onSuccess` fires prematurely or multiple times.
- **Fix:** Reset `hasInitialized` in cleanup. Better: return Promise from apply handler and call `onSuccess` in `.then()`.

### H15. `hasTransactionHistory` Query Too Narrow
- **File:** `src/features/shared/hooks/useInvestorBalance.ts:25-45`
- **Issue:** Queries only `type === "DEPOSIT"`. Positions created by yield crystallization or transfer return false, incorrectly allowing "First Investment".
- **Fix:** Remove `type` filter or check for any non-voided transaction.

### H16. `useMutation` State Resets Because `mutationFn` Prop Is Unstable
- **File:** `src/hooks/useCorrelatedMutation.ts:44-71`
- **Issue:** Inline arrow function for `mutationFn` breaks `useCallback`; `useMutation` receives new function every render, resetting `isLoading`/`error`/`data`.
- **Fix:** Wrap `mutationFn` with `useRef` or `useLatestRef` inside hook; omit from `useCallback` deps.

### H17. Full-Withdrawal Amount Stale When Switching Funds
- **File:** `src/features/admin/withdrawals/components/CreateWithdrawalDialog.tsx:148-164`
- **Issue:** `prevWithdrawalTypeRef` guards re-fill but isn't reset when `selectedFundId` changes.
- **Fix:** Reset `prevWithdrawalTypeRef.current` when `selectedFundId` changes.

---

## MEDIUM — Fix Next Sprint

### M1. Selection Cleared on Filter Toggle
- **File:** `src/features/admin/transactions/hooks/useTransactionSelection.ts:32-35`
- **Issue:** `selectedIds` cleared whenever `showVoided` toggles.
- **Fix:** Intersect `selectedIds` with new selectable set instead of clearing.

### M2. Realtime Subscription on All Positions Causes Excessive Invalidation
- **File:** `src/hooks/data/shared/useFundAUM.ts:59-79`
- **Issue:** Channel listens to `investor_positions` with no filter. Any position change anywhere triggers fund AUM invalidation.
- **Fix:** Add filter for specific fund, or debounce invalidation.

### M3. CSRF Token Stored in sessionStorage
- **File:** `src/lib/security/headers.ts:76,84`
- **Issue:** Readable by XSS. Consider `httpOnly` cookie + double-submit pattern.
- **Fix:** Move to `httpOnly` cookie; pass double-submit token in header.

### M4. CSP `connect-src` Allows localhost in Production
- **File:** `src/lib/security/headers.ts:33-38`
- **Issue:** Dynamic check on `supabaseHost` allows localhost, not runtime environment.
- **Fix:** Check `import.meta.env.PROD` explicitly.

### M5. `fetchUserTransactions` Missing Pagination
- **File:** `src/services/shared/transactionService.ts:79`
- **Issue:** Hard `.limit(100)` with no pagination.
- **Fix:** Add cursor-based pagination.

### M6. `integrity-monitor` References Non-Existent `exec_sql` RPC
- **File:** `supabase/functions/integrity-monitor/index.ts:131`
- **Issue:** If `exec_sql` existed, it would enable arbitrary SQL execution. If not, monitor silently fails over to direct view queries.
- **Fix:** Audit whether `exec_sql` exists. If yes, restrict to read-only. If no, remove fallback.

---

## TYPE SAFETY & VALIDATION (from earlier audit)

### T1. Competing Transaction Schemas
- **Files:** `useTransactionForm.ts` vs `AdminManualTransaction.tsx` vs `transactionService.ts`
- **Issue:** Three different Zod schemas for the same concept. `AdminManualTransaction.tsx` missing `ADJUSTMENT` type.
- **Fix:** Single shared schema in `@/features/admin/transactions/schemas/transactionSchema.ts`.

### T2. `as` Assertions Suppress Errors
- **Files:** `useTransactionSubmit.ts:82-118`, `transactionService.ts`
- **Issue:** `as any` casts on RPC params bypass TypeScript safety.
- **Fix:** Remove `as any`; define proper RPC parameter types.

### T3. `any` Types in Application Code
- **Files:** `useTransactionSubmit.ts`, `transactionService.ts`
- **Fix:** Replace with `unknown` + safe narrowing or proper interfaces.

### T4. `mapTypeForDb()` Incomplete
- **File:** `src/services/shared/transactionService.ts:173-176`
- **Issue:** Only maps `FIRST_INVESTMENT` → `DEPOSIT`. `ADJUSTMENT` passes through unchanged, but no validation that DB enum supports it.
- **Fix:** Explicit mapping for all frontend types; add runtime enum check.

### T5. `Number()` Coercion Loses Precision
- **Files:** `useTransactionForm.ts:20-25`, `AdminManualTransaction.tsx`
- **Issue:** `Number(val)` on amount strings loses decimal precision for financial values.
- **Fix:** Use `Decimal.js` for all amount parsing and validation.

---

## ROOT CAUSE PATTERNS

The withdrawal→deposit bug was not isolated. It is one instance of a systemic pattern:

1. **Dual state sources**: Async query data (`currentBalance`, `hasTransactionHistory`) competes with user input. `useEffect` overwrites user selection when queries resolve.
2. **Unstable effect dependencies**: Object/array references from TanStack Query cause effects to re-fire on every background update.
3. **No guard flags**: Effects lack `hasUserEdited` refs, so they cannot distinguish initial auto-populate from later overwrites.
4. **Silent overwrites**: `setValue` changes form state without user knowledge, creating invisible mis-routing.

**Fix pattern:** For every effect that auto-populates form state, add a `hasUserEdited` ref. Set it on first manual change. Gate the effect on `!hasUserEdited.current`. For reset effects, depend on stable IDs, not object references.

---

## Implementation Phases

### Phase 1: Security & Data Integrity (Week 1)
- C1, C2: Rotate secrets, remove hardcoded keys
- C3: Fix `AdminManualTransaction.tsx` withdrawal routing
- C4, C5: Add `isUserEdited` guards to auto-select effects
- H1: Lock down CORS
- H3: Add Zod validation to `admin-user-management`
- H4: Sanitize edge function logs
- H7: Sanitize client-facing error messages

### Phase 2: Frontend Reliability (Week 2)
- H9, H10: Fix form reset dependency bugs
- H11: Fix stuck loading state
- H12: Fix competing dialog effects
- H13: Fix IB commission auto-sync
- H14: Fix success detection
- H15: Broaden `hasTransactionHistory` query
- H16: Stabilize `useCorrelatedMutation.ts`
- H17: Fix stale full-withdrawal amount
- M1: Preserve selection on filter toggle
- M2: Scope realtime subscription

### Phase 3: Type Safety & Architecture (Week 3)
- T1: Unify transaction schemas
- T2, T3: Remove `as any` and `any` types
- T4: Complete `mapTypeForDb()`
- T5: Replace `Number()` with `Decimal.js`
- H5: Sanitize `send-email` HTML
- H6: Audit `excel_import` crystallization bypass
- M3, M4, M5, M6: Security hardening

---

## DATABASE / RPC FINDINGS

### D-CRIT. `apply_transaction_with_crystallization` Accepts `WITHDRAWAL` Directly
- **File:** `supabase/migrations/20260415000000_squash_canonical_baseline.sql:2060-2200`
- **Issue:** RPC accepts `p_tx_type = 'WITHDRAWAL'` and inserts into `transactions_v2` with no `withdrawal_requests` check. This is the backend enabler for the `AdminManualTransaction` bypass.
- **Fix:** Remove `WITHDRAWAL` from valid type list. Withdrawals must only flow through `approve_and_complete_withdrawal`.

### D-CRIT. `apply_investor_transaction` Also Accepts `WITHDRAWAL`
- **File:** `supabase/migrations/20260415000000_squash_canonical_baseline.sql:1484-1588`
- **Issue:** Same flaw — creates ledger row directly without `withdrawal_requests` validation.
- **Fix:** Same as D-CRIT.1 — reject `WITHDRAWAL` at entry.

### D-CRIT. `apply_withdrawal_with_crystallization` Bypasses `withdrawal_requests` Entirely
- **File:** `supabase/migrations/20260415000000_squash_canonical_baseline.sql:2300-2360`
- **Issue:** Creates `WITHDRAWAL` transaction directly without verifying/updating any `withdrawal_requests` record.
- **Fix:** Deprecate or restrict. Should only be callable by `approve_and_complete_withdrawal`.

### D-HIGH. Sign Logic Inconsistency for `ADJUSTMENT`
- **Files:** `apply_transaction_with_crystallization` vs `apply_investor_transaction`
- **Issue:** `apply_transaction_with_crystallization` forces `ABS(p_amount)` for ADJUSTMENT (silently flips negative to positive). `apply_investor_transaction` preserves raw sign.
- **Fix:** Standardize sign handling. Document why they differ, or make them consistent.

### D-HIGH. Stale `transaction_type` Enum
- **File:** `supabase/migrations/20260415000000_squash_canonical_baseline.sql:350-359`
- **Issue:** Old enum with 5 values (`DEPOSIT`, `WITHDRAWAL`, `INTEREST`, `FEE`, `DUST_ALLOCATION`) still exists but `transactions_v2` uses `tx_type` (13 values). Risk of accidental reuse.
- **Fix:** `DROP TYPE transaction_type` if truly unused, or rename to `legacy_transaction_type`.

### D-HIGH. Non-Existent `admin_create_transaction` Referenced in Error Messages
- **File:** `supabase/migrations/20260415000000_squash_canonical_baseline.sql:6122,6206,21097`
- **Issue:** `enforce_canonical_transaction_mutation` trigger error messages point callers to `admin_create_transaction`, which does **not** exist.
- **Fix:** Update error messages to reference the actual canonical RPCs (`apply_transaction_with_crystallization`, `apply_investor_transaction`).

### D-HIGH. `manual_admin` Source Bypass in `enforce_transaction_via_rpc`
- **File:** `supabase/migrations/20260415000000_squash_canonical_baseline.sql:6314-6350`
- **Issue:** Trigger allows any authenticated admin to insert directly if `source = 'manual_admin'`. Secondary bypass around canonical RPC pattern.
- **Fix:** Remove or restrict `manual_admin` bypass. All admin mutations should go through canonical RPCs with audit logging.

### D-MED. Double Canonical Flag Inconsistency
- **Issue:** Some RPCs set only `indigo.canonical_rpc`; others set both `indigo.canonical_rpc` and `app.canonical_rpc`. The `enforce_canonical_position_write` trigger checks **both**.
- **Fix:** Standardize — all financial RPCs should set both flags, or the trigger should check only `indigo.canonical_rpc`.

### D-MED. `validate_transaction_type` Trigger Missing `INTERNAL_WITHDRAWAL`
- **File:** `supabase/migrations/20260415000000_squash_canonical_baseline.sql:16549-16583`
- **Issue:** Trigger forces negative amounts only for `WITHDRAWAL` and `FEE`. `INTERNAL_WITHDRAWAL` not covered (though CHECK constraint catches it).
- **Fix:** Add `INTERNAL_WITHDRAWAL` to trigger sign enforcement for defense-in-depth.

---

## Updated Implementation Phases

### Phase 1: Security & Data Integrity (Week 1)
- C1, C2: Rotate secrets, remove hardcoded keys
- C3, D-CRIT.1-3: Fix withdrawal bypass in frontend AND backend RPCs
- C4, C5: Add `isUserEdited` guards to auto-select effects
- H1: Lock down CORS
- H3: Add Zod validation to `admin-user-management`
- H4: Sanitize edge function logs
- H7: Sanitize client-facing error messages
- D-HIGH.4: Remove or restrict `manual_admin` source bypass

### Phase 2: Frontend Reliability (Week 2)
- H9, H10: Fix form reset dependency bugs
- H11: Fix stuck loading state
- H12: Fix competing dialog effects
- H13: Fix IB commission auto-sync
- H14: Fix success detection
- H15: Broaden `hasTransactionHistory` query
- H16: Stabilize `useCorrelatedMutation.ts`
- H17: Fix stale full-withdrawal amount
- M1: Preserve selection on filter toggle
- M2: Scope realtime subscription

### Phase 3: Database Consistency & Type Safety (Week 3)
- D-HIGH.1: Standardize ADJUSTMENT sign handling
- D-HIGH.2: Drop stale `transaction_type` enum
- D-HIGH.3: Fix non-existent function references in error messages
- D-MED.1: Standardize canonical flag setting
- D-MED.2: Add `INTERNAL_WITHDRAWAL` to trigger
- T1: Unify transaction schemas
- T2, T3: Remove `as any` and `any` types
- T4: Complete `mapTypeForDb()`
- T5: Replace `Number()` with `Decimal.js`
- H5: Sanitize `send-email` HTML
- H6: Audit `excel_import` crystallization bypass
- M3, M4, M5, M6: Security hardening

---

## Verification Checklist

- [ ] All CRITICAL fixes deployed to staging
- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] `vitest run` passes
- [ ] Playwright E2E: admin creates deposit, withdrawal, adjustment
- [ ] Playwright E2E: user cannot trigger withdrawal→deposit swap
- [ ] Secrets rotated; `.env` removed from git history
- [ ] CORS preflight returns explicit origin, not `*`
- [ ] Edge function logs contain no raw emails or PII
- [ ] `apply_transaction_with_crystallization` and `apply_investor_transaction` reject `WITHDRAWAL`
- [ ] `manual_admin` source bypass removed or restricted
- [ ] All canonical RPCs set both `indigo.canonical_rpc` and `app.canonical_rpc`
- [ ] ADJUSTMENT sign handling consistent across all RPCs
