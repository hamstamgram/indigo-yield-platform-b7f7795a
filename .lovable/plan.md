

## Fresh Full-Stack Audit — Remaining Bugs & Gaps

### Status of Previously Identified Issues
Issues already fixed in prior rounds (confirmed via code review):
- `fetchUserTransactions` visibility_scope filter — FIXED
- Admin prefetch for `/admin/transactions` — FIXED (removed)
- `investorPortfolioService` String precision — FIXED
- `rpc.applyYield` upgraded to V5 — FIXED
- V5 added to `RATE_LIMITED_RPCS` — FIXED
- `WithdrawalStats` voided/cancelled counters — FIXED

---

### Finding 1 — MEDIUM: `useTransactionSubmit` passes `Number(amountStr)` for withdrawal amount

**File**: `src/features/admin/transactions/hooks/useTransactionSubmit.ts` line 94

The admin "Add Transaction" withdrawal path converts amount via `Number(amountStr)`, losing NUMERIC precision. Every other withdrawal insert path uses `String()`. For BTC amounts with 8+ decimal places, this causes IEEE 754 floating-point drift.

**Fix**: Change `requested_amount: Number(amountStr)` to `requested_amount: amountStr` (it's already a string from line 86).

---

### Finding 2 — LOW: Dead RPC helpers `rpc.deposit`, `rpc.withdrawal`, `rpc.previewYield`

**File**: `src/lib/rpc/client.ts` lines 215-297

These three exported functions are never called anywhere in the codebase. `deposit` and `withdrawal` call the old `apply_transaction_with_crystallization` (not the canonical `apply_investor_transaction`). `previewYield` already correctly calls V5 but is unused. They are maintenance traps for future developers.

**Fix**: Remove all three dead helpers from `client.ts` and their re-exports from `src/lib/rpc/index.ts`.

---

### Finding 3 — LOW: `investorDataExportService` has no visibility or voided filter

**File**: `src/services/shared/investorDataExportService.ts` line 15

The export queries `transactions_v2` with `select("*")` and no `is_voided` or `visibility_scope` filter. If this service is ever used in investor context, it would leak admin-only and voided transactions into the export.

Currently unused by any UI component (only exported from barrel file), but a latent data leak.

**Fix**: Add `.eq("is_voided", false).eq("visibility_scope", "investor_visible")` to the transactions query.

---

### Finding 4 — LOW: `dbSchema.ts` contains stale `investor_daily_balance` table definition

**File**: `src/contracts/dbSchema.ts` lines 311-323

This table was dropped from the database but its schema definition remains in the frontend contract. Not a runtime issue (no code queries it), but misleading documentation.

**Fix**: Remove the `investor_daily_balance` entry from `DB_TABLES`.

---

### Finding 5 — INFO: `useInvestorOverview` missing `visibility_scope` on "last transaction date" query

**File**: `src/features/investor/overview/hooks/useInvestorOverview.ts` lines 63-70

The query fetches the last `tx_date` for an investor without filtering `visibility_scope`. If the last transaction is admin-only (e.g., DUST_SWEEP), the displayed "last activity" date could reference an internal event. Low impact since it only shows a date, not transaction details, and RLS limits to the investor's own rows.

**Fix**: Add `.eq("visibility_scope", "investor_visible")` to the query.

---

## Implementation Plan

### Change Set 1 — Precision fix (1 file)
1. `useTransactionSubmit.ts` line 94: Change `Number(amountStr)` to `amountStr`

### Change Set 2 — Dead code removal (2 files)
2. Remove `deposit`, `withdrawal`, `previewYield` from `src/lib/rpc/client.ts`
3. Remove their re-exports from `src/lib/rpc/index.ts`

### Change Set 3 — Defense-in-depth (3 files)
4. Add visibility + voided filters to `investorDataExportService.ts`
5. Remove `investor_daily_balance` from `dbSchema.ts`
6. Add `visibility_scope` filter to `useInvestorOverview.ts` last-transaction query

### Risk Assessment
- All changes are frontend-only, no migrations
- No business logic changes
- Dead code removal is safe (confirmed zero callers)
- The precision fix (Finding 1) is the highest-value item

