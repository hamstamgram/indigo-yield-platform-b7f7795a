# Expert Reconciliation Strategy: Indigo Fund Migration

**Status**: Draft
**Date**: 2025-12-08
**Author**: Financial Data Reconciliation Team (AI)

## Executive Summary

This document defines the "Net Yield" reconciliation strategy for migrating Indigo Fund investor records. The core principle is to align the platform's ledger with the historical "Net Performance" reported to investors, treating the fee extraction as an upstream event. This ensures that the platform's displayed balances match the historical PDF reports exactly, down to the last decimal (precision allowing).

## 1. The "Net Yield" Principle

Analysis of the accounting files (`BTC Yield Fund` sheet) reveals a significant delta between `Gross Performance` and `Net Performance`.
*   *Example (2024-08-01)*: Gross: 0.022000 BTC | Net: 0.005075 BTC.
*   *Conclusion*: The "Yield" distributed to investors is the **Net** amount.

**Strategy**:
*   We will **not** import Gross Yield and then apply a Fee transaction for historical data.
*   We **will** import the **Net Yield** directly as the yield transaction.
*   **Rationale**: This eliminates rounding errors associated with re-calculating fees on historical data and guarantees matching the "Ending Balance" on investor statements.

## 2. Transaction Reconstruction Logic

Since explicit transaction logs (e.g., "Deposit on 2024-06-15") are partially unstructured, we will reconstruct the transaction history using a **Balance-Forward Method**:

1.  **Initial State (T0)**:
    *   Source: `Investments` sheet.
    *   Action: Create `Deposit` transactions for initial capital.

2.  **Period Increments (T1...Tn)**:
    *   Source: Monthly Columns in Excel Sheets (e.g., `2024-07-01`, `2024-08-01`).
    *   Logic:
        *   Let $B_{t}$ be the balance at time $t$.
        *   Let $B_{t-1}$ be the balance at time $t-1$.
        *   $\Delta = B_{t} - B_{t-1}$.
        *   If $\Delta \approx NetYield_{fund} \times B_{t-1}$:
            *   Record **Yield Transaction** of amount $\Delta$.
        *   If $\Delta$ is significantly different (indicating deposit/withdrawal):
            *   Calculate `Expected_Yield` = $NetYield_{fund} \times B_{t-1}$.
            *   `Remainder` = $\Delta - Expected\_Yield$.
            *   Record **Yield Transaction** of amount `Expected_Yield`.
            *   Record **Adjustment Transaction** (Deposit/Withdrawal) of amount `Remainder`.

## 3. Data Normalization & Integrity

*   **USD Values**: Ignored. All reconciliation is strictly in-kind (BTC, ETH, etc.).
*   **Entity Resolution**: The mapping table (Blondish -> Vivie-Ann Bakos) is applied strictly.
*   **Precision**: 10 decimal places (Satoshi/Wei level accuracy) where available.

## 4. Output Artifacts

The migration script will produce a `migration_payload.json` containing:
1.  **`fund_definitions`**: Verified list of funds.
2.  **`investor_profiles`**: Normalized investor entities.
3.  **`ledger_entries`**: Chronological sequence of credit/debit operations.

---
**Verification Check**:
*   $\sum (Deposits) - \sum (Withdrawals) + \sum (Net Yields) == Final Excel Balance$
