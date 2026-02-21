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
