# Expert Design Audit & Redesign Proposal
**Indigo Yield Platform** | Date: November 23, 2025

## Executive Summary
The Indigo Yield Platform is currently navigating a pivot from a "Crypto Trading App" to a "Passive Investment Reporting Portal." This audit evaluates the current state against the high-fidelity investor reports and proposes a unified design strategy.

### The Core Discrepancy
*   **The Report:** A highly detailed, institutional-grade financial document. It focuses on the *Capital Account* lifecycle: Beginning Balance -> Additions -> Redemptions -> Net Income -> Ending Balance. It is denominated in native assets (BTC, ETH, etc.) and is very "text-heavy" and precise.
*   **The Dashboard:** Currently a "Robinhood-lite" interface. It focuses on *Yield Velocity* and *Movement*. It is visual, "card-heavy," and abstract.

**Verdict:** The current dashboard is too abstract compared to the concrete financial data provided in the reports. Investors receiving such detailed PDFs will find the "Yield Pulse" dashboard lacking in context. They need to see the *Capital Account* journey in the app, not just the "Yield" destination.

---

## 1. The "No Fiat" Reality check
The platform correctly handles "No Fiat" by denominating everything in native units. However, the **User Experience (UX)** suffers because "Total Portfolio Value" is impossible to calculate without fiat.
*   **Current Solution:** "Yield (Inception)" + "Active Positions".
*   **Problem:** This feels like a "broken" portfolio view. A user with 10 BTC and 100 ETH sees "2 Active Positions" but has no sense of *magnitude*.
*   **Recommendation:** Introduce **"The Asset Stack"** as the primary view. Instead of a single aggregate number, the dashboard should be a vertical stack of "Digital Wallets," each showing its own Capital Account Summary.

---

## 2. Redesign Proposal: "The Ledger Interface"

### A. Investor Dashboard Redesign
**Goal:** Mirror the PDF Report's clarity within a modern web app.

**New Layout Strategy:**
1.  **Hero Section: "Monthly Snapshot"**
    *   Instead of "Yield (Inception)," show **"Last Month's Performance"** card.
    *   "In October 2025, your portfolio generated **+0.45 BTC** and **+12.50 ETH**."
    *   Action: [Download Statement] button prominent in the hero.

2.  **Primary Content: "Asset Ledgers" (The Stack)**
    *   Replace the grid of small cards with **Full-Width Asset Rows**.
    *   Each row expands (accordion style) to reveal the MTD/QTD/YTD metrics found in the report.
    *   **Visuals:** Use the Fund Icons (from the CDN) as the anchors.

**Mockup Concept (Asset Row):**
```text
[ ICON ] BTC YIELD FUND  |  Balance: 10.5000 BTC  |  Yield (MTD): +0.0500 BTC (↑)
         [-------------------------------------------------------]
         |  Begin: 10.0000  |  Add: 0.4500  |  Fee: -0.0000      |  <- "Report Data"
         [-------------------------------------------------------]
```

### B. Admin "Cockpit" Redesign
The current "Monthly Data Entry" is functional but disconnected from the "Output."

**Recommendation:**
1.  **Split View Data Entry:**
    *   Left Panel: Data Grid (Entry).
    *   Right Panel: **Live Preview** of the Report Card for that investor.
    *   *Why?* Admins can spot typos immediately ("Did I just give him 100 BTC instead of 1.00 BTC?") by seeing the generated HTML preview in real-time.

2.  **Validation Gates:**
    *   Implement the "Capital Account Equation" validation: `End = Begin + Add - W/D + Yield`.
    *   If the numbers don't balance to 8 decimal places, the row turns red and cannot be saved.

### C. Mobile App Adaptation
The iOS app currently has "Deposit" flows. These must be replaced with **"Request Flows"**.
*   **Withdrawals:** Keep, but frame as a "Request" (Ticket), not a transaction.
*   **Deposits:** Replace with "Wiring Instructions" (Static info) or "Intention to Deposit" form.
*   **Navigation:** Mirror the Web "Documents" tab prominently. Mobile users primarily check: 1. "Did I get paid?" (Push Notification) -> 2. "Show me the PDF" (Documents).

---

## 3. Asset & CDN Strategy
*   **Icons:** The CDN icons (`storage.mlcdn.com`) are high quality. We should cache these or proxy them to prevent "broken image" icons if the CDN changes.
*   **Reports:** The HTML generator is a great start.
    *   **Next Step:** Use a headless browser (Puppeteer/Playwright) on a Supabase Edge Function to convert that HTML to PDF automatically upon "Publish". This closes the loop.

## 4. Implementation Roadmap (Post-Audit)

1.  **Frontend:** Refactor `DashboardPage.tsx` to use the "Asset Ledger" layout instead of "Yield Cards".
2.  **Backend:** Create the `validate_capital_account` trigger in Postgres to enforce the math.
3.  **Edge Function:** Deploy `generate-pdf-report` using the HTML template logic we built.

This aligns the *Digital Experience* with the *Financial Reality* of the fund.
