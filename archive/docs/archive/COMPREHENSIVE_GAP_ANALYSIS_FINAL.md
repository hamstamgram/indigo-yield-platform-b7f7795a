# Comprehensive Platform Gap Analysis & Remediation Plan
**Date:** December 05, 2025
**Status:** CRITICAL ACTION REQUIRED

This document outlines the specific gaps identified during the "180 IQ" expert audit of the platform. It combines data integrity findings, code analysis, and feature verification.

## 🚨 Level 1: Critical Blockers (Must Fix to Launch)

### 1.1. Missing Historical Data ("The Blind Spot")
*   **Issue:** The platform has current balances (recently fixed) and raw transactions, but **zero historical performance data**. The `daily_nav` table is empty.
*   **Impact:** Admins cannot see "Historical Total AUM" or "Performance over Time". Charts will be flat or empty.
*   **Root Cause:** Data import captured the *now*, but did not replay history to populate the *past*.
*   **Fix:** Execute a `backfill_history.sql` script to replay all 116 transactions day-by-day and populate `daily_nav` for every past date.

### 1.2. Authentication Dead End
*   **Issue:** The `send-admin-invite` Edge Function has email sending logic **commented out**.
*   **Impact:** No one can log in. New admins cannot be invited. Investors cannot reset passwords.
*   **Fix:** Integrate a transactional email provider (Resend/SendGrid) and uncomment the dispatch logic.

### 1.3. Ambiguous Data Model (`positions` vs `investor_positions`)
*   **Issue:** The codebase contains references to both `positions` (legacy) and `investor_positions` (new). We populated `positions`, but some newer components might query `investor_positions`.
*   **Impact:** Potential for data mismatch where the Admin Dashboard shows one number and the Investor Portal shows another (or zero).
*   **Fix:** Standardize on one table (likely `investor_positions` if it's the new standard) and migrate data/code to match.

## ⚠️ Level 2: Admin Management Gaps

### 2.1. The "Fake" Performance Dashboard
*   **Issue:** The current `PerformanceDashboard.tsx` tracks **technical metrics** (Lighthouse scores, API latency), not **financial metrics**.
*   **Requirement:** "See historical total AUM for each fund, deposits, and withdrawals."
*   **Fix:** Build a `FinancialDashboard.tsx` component that queries `daily_nav` and `transactions` to show:
    *   Line Chart: AUM over Time (per Token/Fund).
    *   Bar Chart: Net Flows (Deposits vs Withdrawals).
    *   Table: Live Fund Balances.

### 2.2. Missing "Fund" Definitions
*   **Issue:** Transactions are linked to "Assets" (BTC, ETH), but not explicitly to "Funds" (e.g., "Yield Fund I").
*   **Impact:** Cannot report on "Fund Performance" as an aggregate.
*   **Fix:** Populate the `funds` table and link Assets to Funds.

## 📉 Level 3: Investor Experience Gaps

### 3.1. Manual Statement Generation
*   **Issue:** The "Template" (`statementGenerator.ts`) exists in code but is not automated.
*   **Impact:** Investors will only see old PDFs unless a developer manually triggers the generator script every month.
*   **Fix:** Implement a Scheduled Job (Cron) to:
    1.  Trigger on the 1st of the month.
    2.  Generate PDF for every investor using `statementGenerator.ts`.
    3.  Upload to Storage.
    4.  Insert record into `statements` table.

### 3.2. Hardcoded Templates
*   **Issue:** The Statement Template is hardcoded in TypeScript.
*   **Impact:** Marketing/Admin cannot tweak the design without a code deployment.
*   **Fix:** Move template configuration (logos, colors, disclaimer text) to a database table (`system_config`) so it can be edited via Admin UI.

## 🛠 Level 4: Technical Debt

### 4.1. "Mock Data" in Production Code
*   **Location:** `src/utils/kpiCalculations.ts`
*   **Issue:** Explicit comments saying `// For now, return mock data`.
*   **Fix:** Replace all mock returns with real Supabase RPC calls or DB queries.

## ✅ Completed / Verified Items
*   **Transactions Import:** 116 verified transactions imported.
*   **Identity Management:** 35 Investors created with deterministic IDs.
*   **Current Balances:** `positions` table populated with accurate Token-Native sums.
*   **Admin Upload:** `BulkOperationsPanel.tsx` exists for CSV imports.

---

## 📝 Implementation Roadmap

1.  **Backfill History:** Run SQL to populate `daily_nav`.
2.  **Fix Dashboard:** Build the Financial Dashboard to visualize that history.
3.  **Automate Statements:** Set up the monthly generator.
4.  **Unlock Auth:** Fix the email sending.
