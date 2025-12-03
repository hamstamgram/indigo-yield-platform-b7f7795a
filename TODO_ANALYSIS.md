# Codebase Analysis & Remaining TODOs
**Date:** December 3, 2025
**Status:** Post-AUM Enhancement

## ✅ Completed Tasks
- **AUM Sync:** Implemented `trg_sync_fund_aum` to keep `funds.total_aum` in sync with `investor_positions` in real-time.
- **Smart Withdrawals:** Implemented `handle_ledger_transaction` to realize PnL and reduce Cost Basis proportionally during withdrawals.
- **Reporting:** Created `SingleReportGenerator` for on-demand PDF/Email reports.
- **Email:** Integrated Resend API for reliable delivery.
- **Data Import:** Successfully imported verified November 2025 investor data.

## 🔍 Detected TODOs & Technical Debt

### 1. Multi-Currency Valuation (High Priority)
- **File:** `src/utils/statementCalculations.ts`
- **TODO:** `// TODO: Multiply by asset price for accurate USD summary`
- **Context:** The current summary often sums up raw units or assumes 1:1 for USD. To show a true "Total Portfolio Value in USD", we need to integrate the `asset_prices` table into the frontend dashboard aggregation logic.

### 2. User Preferences Persistence (Medium Priority)
- **File:** `src/components/profile/PreferencesTab.tsx`
- **TODO:** `// TODO: Implement local storage for preferences when backend is ready`
- **Context:** The `notification_settings` table was recently created. The frontend is likely still using local state or mock data. It should be updated to read/write to Supabase.

### 3. PDF Generation Library (Cleanup)
- **File:** `src/lib/statements/generator.ts`
- **TODO:** `// TODO: Install pdfkit when Phase 2 is activated`
- **Context:** We successfully implemented `pdfGenerator.ts` using `jspdf`. The old `generator.ts` file appears to be a legacy artifact and should likely be deprecated or removed to avoid confusion.

### 4. Transaction Typing (Low Priority)
- **File:** `src/services/api/transactionApi.ts`
- **TODO:** `// TODO: Enhance with proper typing in Phase 2`
- **Context:** Typing is functional but could be stricter for `transactions_v2` payloads.

## 🚀 Next Recommended Actions
1.  **Connect Asset Prices:** Fetch live prices from Supabase to calculating accurate USD totals in the Dashboard.
2.  **Wire up Preferences:** Connect the User Profile settings to the database.
3.  **Cleanup:** Remove unused legacy files like `src/lib/statements/generator.ts`.
