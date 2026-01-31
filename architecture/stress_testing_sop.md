# Stress Testing Standard Operating Procedure (SOP)

## 1. Objective
Systematically validate the Indigo Yield Platform's financial integrity under 1,000+ end-to-end scenarios, covering multi-year operations, edge cases, and adversarial sequences.

## 2. Technical Stack
- **Engine:** Python 3 (Virtual Environment in `.venv/`)
- **Database Access:** Supabase Python Client (via `SUPABASE_SERVICE_ROLE_KEY`)
- **Calculations:** Python `decimal` module for arbitrary precision.
- **Reporting:** Structured JSON as defined in `gemini.md`.

## 3. Core Testing Flows

### A. Lifecycle Simulation
1.  **Onboarding:** Create deterministic investors and IBs.
2.  **Deposit Phase:** Randomly timed deposits into multiple funds.
3.  **Operation Phase:** 
    - Daily yield application.
    - Periodic fee calculations.
    - Withdrawal requests and approvals.
    - Voiding and reprocessing of transactions.
4.  **Crystallization:** Month-end and Year-end closing.
5.  **Termination:** Full redemption and closing of positions.

### B. Reconciliation Checks (Mandatory for every scenario)
- **Conservation of Value:** `sum(investor_net_yield) + sum(fees) == total_gross_yield`.
- **Ledger Alignment:** `sum(transactions_v2.amount) == investor_positions.current_value`.
- **Fund AUM Integrity:** `fund_daily_aum.aum == sum(investor_positions.current_value)`.
- **IB Commission:** Verify IB gets correct share of fees as defined in `fee_schedule`.
- **No Orphan Records:** Check for transactions without associated positions or users.

## 4. Scenario Generation (Deterministic)
Use a seed-based random generator to create:
- **Normal Paths:** Linear deposits/withdrawals over 12-24 months.
- **Backdated Ops:** Transactions dated in the past requiring reprocessing.
- **High-Volume Bursts:** Many operations on a single fund/date.
- **Dust/Rounding Cases:** Very small amounts (0.00000001) to test precision limits.
- **Chain of Voids:** Voiding a transaction, then voiding the void, etc.

## 5. Execution Strategy
1.  **Isolation:** Use a dedicated `stress_test_fund` if possible to avoid polluting production data (though this is a stress test, it should run in a safe environment).
2.  **Atomic Tools:** Build small python functions in `tools/` for each operation (deposit, withdraw, yield).
3.  **Parallelization:** Batch tests by fund or period to optimize execution time.

## 6. Repair Loop (Self-Annealing)
If a test fails:
1.  Log the exact SQL state and parameters.
2.  Identify if it's a code bug (Python tool) or a platform bug (Supabase RPC/Trigger).
3.  Patch and update this SOP if new constraints are discovered (e.g., "Yield cannot be applied to zero-balance funds").
