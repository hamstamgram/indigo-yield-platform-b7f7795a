/**
 * Admin Investor Components
 * Investor management, tables, forms, and detail views
 */

// Dialogs
export { default as AddInvestorDialog } from "./AddInvestorDialog";
export { default as InviteInvestorDialog } from "./InviteInvestorDialog";
export { InternalRouteDialog } from "./InternalRouteDialog";

// Panels & Drawers
export { default as InvestorDetailPanel } from "./InvestorDetailPanel";
export { InvestorManagementDrawer } from "./InvestorManagementDrawer";
export { InvestorDrawerQuickView } from "./InvestorDrawerQuickView";
export { default as InvestorLifecyclePanel } from "./InvestorLifecyclePanel";

// Tabs
export { InvestorTabs } from "./InvestorTabs";
export { default as InvestorOverviewTab } from "./InvestorOverviewTab";
export { InvestorPortfolioTab } from "./InvestorPortfolioTab";
export { default as InvestorPositionsTab } from "./InvestorPositionsTab";
export { default as InvestorTransactionsTab } from "./InvestorTransactionsTab";
export { default as InvestorWithdrawalsTab } from "./InvestorWithdrawalsTab";
export { InvestorActivityTab } from "./InvestorActivityTab";
export { InvestorLedgerTab } from "./ledger";
export { default as InvestorReportsTab } from "./InvestorReportsTab";
export { default as InvestorSettingsTab } from "./InvestorSettingsTab";

// Tables
export { default as InvestorsTable } from "./InvestorsTable";
export { default as InvestorsTableHeader } from "./InvestorsTableHeader";
export { default as InvestorTableContainer } from "./InvestorTableContainer";
export { default as InvestorTableRow } from "./InvestorTableRow";
export { UnifiedInvestorsTable } from "./UnifiedInvestorsTable";

// Forms & Editors
export { default as InvestorForm } from "./InvestorForm";
export { InvestorProfileEditor } from "./InvestorProfileEditor";
export { InvestorFeeManager } from "./InvestorFeeManager";
export { InvestorYieldHistory } from "./InvestorYieldHistory";
export { InvestorYieldManager } from "./InvestorYieldManager";
export { default as EditableInvestorRow } from "./EditableInvestorRow";

// UI Components
export { InvestorHeader } from "./InvestorHeader";
export { default as InvestorsHeader } from "./InvestorsHeader";
export { InvestorKpiChips } from "./InvestorKpiChips";
export { InvestorFiltersBar } from "./InvestorFiltersBar";
export { default as SearchBar } from "./SearchBar";
export { FundPositionCard } from "./FundPositionCard";
export { default as FundAssetDropdown } from "./FundAssetDropdown";
export { IBSettingsSection } from "./IBSettingsSection";

// Reports
export { default as HistoricalReportsDashboard } from "./HistoricalReportsDashboard";
export { default as MonthlyReportsTable } from "./MonthlyReportsTable";
export { ReportRecipientsEditor } from "./ReportRecipientsEditor";

// Bulk Operations
export { default as BulkOperationsPanel } from "./BulkOperationsPanel";
export { default as BulkDataGenerator } from "./BulkDataGenerator";

// Mobile
export { default as MobileInvestorCard } from "./MobileInvestorCard";
