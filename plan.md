# CTO Audit: System Functions, Relations, Flows & UI

**Date:** Feb 21, 2026
**Author:** CTO
**Status:** COMPLETE (Post Yield Engine V5 Migration)

---

## 1. Relational Mismatches & Data Model Flaws

### 1.1 `fund_aum_events` vs `fund_daily_aum`
* **Issue:** Legacy code still conceptually relies on `fund_aum_events` (a dropped table) for intra-day AUM tracking and "crystallization." 
* **Mismatch:** The new single-source-of-truth is `fund_daily_aum`, which is a strictly *daily* snapshot. However, RPCs like `apply_transaction_with_crystallization` try to insert or update AUM for *the exact timestamp* of a transaction, which clashes with a daily resolution model.
* **Resolution:** We have fully eliminated `fund_aum_events`. The system now correctly relies entirely on `fund_daily_aum` and infers proportional yield computationally (`v_yield_period_days`).

### 1.2 `transactions_v2.is_voided` vs Immutable Ledger
* **Issue:** An immutable ledger should technically never update records. However, `is_voided = true` is currently used to reverse transactions instead of issuing a compensating opposite transaction (e.g., `-100` to cancel `+100`).
* **Risk:** This breaks strict append-only financial accounting constraints, though it is simpler for the UI. The UI hides voided transactions, which means the running balance in the database might not visually match a linear sum of *all* historical events if an auditor looks at raw tables.

---

## 2. Function Overloads & Ambiguity

### 2.1 `apply_transaction_with_crystallization`
* **Issue:** This function attempts to do too much. It acts as the gateway for Deposits and Withdrawals but also attempts to mutate AUM (`p_new_total_aum`).
* **Mismatch:** The parameters demand `p_new_total_aum`, but as of today, we disabled auto-crystallization. We now explicitly pass `p_new_total_aum = NULL` from the frontend.
* **Overload Impact:** The function still contains vestigial logic handling what happens *if* AUM is passed. It should be refactored into a pure `insert_transaction` function, completely decoupling AUM snapshotting from standard ledger entries.

### 2.2 Reconcile vs. Apply vs. Preview Yield
* **Issue:** `apply_segmented_yield_distribution_v5` and `preview_segmented_yield_distribution_v5` are massively complex 400-line SQL scripts. 
* **Overlap:** They duplicate 95% of their logic (calculating the distribution). The only difference is that `apply` executes inserts at the end. 
* **Risk:** If a bug in yield mathematics is fixed in `preview`, it is extremely easy to forget to mirror the fix in `apply`. They should share a single underlying `calculate_yield_distribution` read-only function, and `apply` should just call that function and persist the results.

---

## 3. Flow Constraints & Guardrails Disabled

### 3.1 The "Crystallize Before Flow" Paradigm
* **Original Design:** The system demanded that every time money moved in or out of a fund (Deposit/Withdrawal), an admin had to provide the exact net AUM of the fund *at that isolated nanosecond* so that previous investors could be credited their exact micro-yield before the pie was resized.
* **Current State:** **DISABLED.** We are now relying on:
  1. Admins recording a "transaction" yield distribution *manually* right before processing a deposit/withdrawal.
  2. Submitting the deposit/withdrawal with `p_new_total_aum = NULL`.
* **Risk:** This moves critical financial ordering from strict systemic database constraints to *human operational policy*. If an admin forgets to run the manual yield drop before a massive deposit, the new depositor will steal yield generated over the previous week.

---

## 4. UI Implications & UX Gaps

### 4.1 Missing Operational Guardrails in UI
* **Gap:** Since we moved the "Crystallize Before Flow" burden to the human admin, the UI *does not enforce this*. 
* **Fix needed:** The **Deposit** and **Withdrawal** UI forms should query `fund_daily_aum` and `transactions_v2`. If the last yield distribution date is significantly older than the Deposit Date, the UI should throw a hard warning: *"Warning: You are about to process a transaction without crystallizing prior yield. Please run a Yield Distribution first."*

### 4.2 Ambiguous "Transaction Date" vs "Effective Date"
* **Gap:** The system allows backdating transactions (`tx_date`), but the yield engine uses highly sensitive daily bounds. If an admin backdates a deposit into a period where yield has *already been distributed*, the system lacks a robust "Yield Correction" or "Clawback" mechanism.
* **Fix needed:** The frontend date pickers (which we just fixed to use native `<input>`) should ideally restrict backdating across yield boundaries, or the backend should explicitly block it via constraint triggers.

---

## 5. CTO Recommendations for Next Sprints

1. **Decouple AUM from Transactions completely:** Strip `p_new_total_aum` from the `apply_transaction_with_crystallization` RPC signatures entirely. Rename the RPC to plain `apply_investor_transaction`.
2. **Implement UI Sequence Locks:** Add frontend validation that disables the "Approve Deposit" button if a manual Yield Distribution hasn't been logged for the intervening time gap.
3. **Consolidate Yield Math:** Merge the 400 lines of duplicated SQL logic in `preview` and `apply` yield into returning a custom Postgres `TABLE` type, and have both RPCs query from it.
4. **Transition from `is_voided` to Compensating Transactions:** To achieve true SOC2/Institutional grade ledger compliance, remove the ability to UPDATE rows. Reversals must insert offsetting records.

---
---

# Phase 4 Execution Plan: Remediation & UI Guardrails

**Goal:** Execute the recommendations from the CTO Audit to stabilize the transaction and yield flows, decouple flawed logic, and introduce strict UI safety rails to prevent admin sequencing errors.

## Step 4.1: Decouple AUM from Transactions completely
The `apply_transaction_with_crystallization` RPC currently handles both ledger transactions and (vestigial) AUM snapshots. We need to split this into a pure transaction function.

* **Task:** Create a new migration `20260303000000_decouple_aum_from_tx.sql`.
* **Action:** 
  1. Define a new RPC `apply_investor_transaction` that takes *only* transaction data (fund_id, investor_id, tx_type, amount, tx_date, reference_id, notes, purpose, admin_id).
  2. Implement the pure transaction insert logic into `transactions_v2`.
  3. Ensure it DOES NOT touch or expect `p_new_total_aum`.
  4. (Optional) Soft-deprecate the old `with_crystallization` RPC or replace it with a wrapper that just ignores the AUM parameter entirely to allow gradual frontend migration without breaking staging.

## Step 4.2: Frontend Migration & Contracts Update
* **Task:** Migrate the frontend entirely off the old `with_crystallization` signature.
* **Action:**
  1. Re-run `npm run contracts:generate`.
  2. Update `src/lib/rpc/client.ts` helper functions (`deposit`, `withdrawal`) to call `apply_investor_transaction` instead.
  3. Remove the now-dead `closingAum` / `newTotalAum` parameters from the UI components entirely (`DepositModal.tsx`, `WithdrawalModal.tsx`).

## Step 4.3: Implement UI Sequence Locks
Since auto-crystallization is dead, humans must log Yield before Deposits/Withdrawals. The UI must enforce this.

* **Task:** Update `DepositModal.tsx` and `WithdrawalModal.tsx` (or related context).
* **Action:**
  1. Query `fund_daily_aum` to find the LAST yield distribution date for the selected fund.
  2. If the admin tries to execute a Deposit/Withdrawal with a `tx_date` *after* a significant gap (e.g., >1 day difference without a yield drop), show a blocking warning: *"Warning: No Yield Distribution found for the period leading up to this transaction. You must execute a Yield Distribution first to ensure fair accounting."*
  3. Block the submission button unless an override flag is explicitly checked by the admin.

## Step 4.4: Consolidation of Yield Math (Prep)
* **Task:** Prepare a draft SQL migration to merge `preview` and `apply` yield logic.
* **Action:**
  1. Create a `calculate_yield_distribution` function that returns a `TABLE` of the math results.
  2. Refactor `preview_` to just `SELECT * FROM calculate_yield_distribution(...)`.
  3. Refactor `apply_` to `INSERT INTO ... SELECT * FROM calculate_yield_distribution(...)`.
  4. Test extensively before deploying.

## Verification
* **Build Check:** Ensure `tsc --noEmit` and `npm run build` pass after swapping the RPCs in step 4.2.
* **Manual Testing:** Confirm the frontend correctly blocks deposits if a yield drop hasn't occurred recently, and allows them if the date constraint is met.
