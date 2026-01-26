/**
 * Admin Investor Components
 * Investor management, tables, forms, and detail views
 * 
 * Components are organized into subdirectories by function:
 * - detail/   - Single investor views and panels
 * - list/     - Investor tables and filtering
 * - tabs/     - Tab content components
 * - forms/    - Forms and dialogs
 * - yields/   - Yield and fee management
 * - reports/  - Report components
 * - bulk/     - Bulk operations
 * - shared/   - Miscellaneous shared components
 * - ledger/   - Ledger tab components
 * - wizard/   - Onboarding wizard
 */

// Detail views
export * from "./detail";

// List/table views
export * from "./list";

// Tab components
export * from "./tabs";

// Forms & dialogs
export * from "./forms";

// Yield management
export * from "./yields";

// Reports
export * from "./reports";

// Bulk operations
export * from "./bulk";

// Shared components
export * from "./shared";

// Existing subdirectories
export { InvestorLedgerTab } from "./ledger";
export * from "./wizard";
export { default as MobileInvestorCard } from "./MobileInvestorCard";
