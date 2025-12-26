# Master Redesign Plan: Indigo Yield Platform V2

## 1. Architectural Overview
The V2 redesign pivots the platform from a simple balance-checking tool to a professional-grade performance reporting suite. The core data source shifts from static monthly summaries to granular `investor_fund_performance` records that include MTD, QTD, YTD, and ITD metrics.

### Data Model Migration
- **V1 Source:** `investor_monthly_reports` (Legacy, flat)
- **V2 Source:** `investor_fund_performance` (New, granular)
  - **Joins:** `statement_periods` (for dates), `profiles` (for user context), `assets` (for icons/metadata).

---

## 2. Component Architecture

### 2.1 Core Components
We will introduce a new Design System for financial data display.

#### `PerformanceReportTable`
The centerpiece of the redesign. A responsive, dense data table that mirrors the PDF structure exactly.
- **Props:** `data: PerformanceRecord[]`, `isLoading: boolean`
- **Features:**
  - Grouped Columns: "Summary", "MTD", "QTD", "YTD", "ITD".
  - Conditional Styling: Positive yields in green, negative in red.
  - Asset Context: Row headers include the asset icon and name.
  - Download Action: "Download PDF" button integrated into the row or period header.

#### `AssetKPI`
Replaces generic number cards with asset-specific insights.
- **Props:** `asset: string`, `metric: 'yield' | 'aum' | 'allocation'`, `value: number`
- **Visuals:** Uses the asset's brand color (BTC Orange, ETH Blue/Purple) for borders/accents.

---

## 3. Page-by-Page Redesign

### 3.1 Investor Dashboard (`/dashboard`)
**Goal:** "At a glance" portfolio health + latest month's detailed report.

*   **Hero Section:**
    *   Total AUM (Aggregated across all funds)
    *   Total YTD Yield (The "headline" number)
*   **Performance Section:**
    *   Render `PerformanceReportTable` filtered for the **Current/Latest Month**.
    *   This allows investors to see "October's Report" immediately upon login without clicking anything.
*   **Allocation Section:**
    *   Donut chart showing AUM split by asset (BTC vs ETH vs SOL).

### 3.2 Statements & Reports (`/statements`)
**Goal:** Historical archive with instant visibility.

*   **Filter Bar:** Year Selector (2024, 2025), Asset Selector (All, BTC, ETH).
*   **Main View:**
    *   Instead of just downloading PDFs, the page will render a **list of `PerformanceReportTable` components**, one for each month.
    *   Investors can scroll down to see September, August, July... all expanded by default or collapsible.
    *   **PDF Download** button is sticky on each month's header.

### 3.3 Admin Investor Detail (`/admin/investors/:id`)
**Goal:** "God Mode" - See what the investor sees.

*   **Context Header:** User Profile info (Email, Name, Status).
*   **View:** Embed the exact **Investor Dashboard** view here.
    *   Admins can see the specific MTD/QTD numbers to answer support tickets like "Why is my QTD yield 1.2%?".
*   **Actions:**
    *   "Regenerate Report" button (triggers backend PDF generation).
    *   "Send Email" button (resends the notification).

---

## 4. Technical Implementation Steps

### Step 1: Backend Services
1.  Create `useInvestorPerformance` hook.
    *   Query `investor_fund_performance` joined with `statement_periods`.
    *   Sort by `period_end_date` descending.
2.  Create `useStatementGeneration` hook.
    *   Links the frontend "Download" button to the edge function that populates the HTML template.

### Step 2: Frontend Components
1.  Build `PerformanceReportTable` using `shadcn/ui` Table.
2.  Implement the specific CSS logic for "Report Style" (borders, font weights) matching the fixed HTML template.

### Step 3: Page Integration
1.  Refactor `DashboardPage.tsx` to use the new Table.
2.  Refactor `StatementsPage.tsx` to show the historical list of Tables.
3.  Update `AdminInvestorsPage.tsx` to link to the detailed view.

## 5. Future Considerations (180 IQ)
-   **Multi-Currency Toggle:** Allow viewing values in USD vs Native (BTC/ETH) dynamically.
-   **Benchmark Comparison:** Add a row to `PerformanceReportTable` comparing `Rate of Return` vs `Benchmark` (e.g., "BTC Price Change").
-   **Audit Trail:** Show investors exactly *when* a report was generated and *who* approved it (transparency).
