/**
 * Admin Components - Main Barrel Export
 * Organized by functional category
 */

// ============================================
// GUARDS
// ============================================
export { AdminGuard } from "./AdminGuard";
export { SuperAdminGuard } from "./SuperAdminGuard";

// ============================================
// ROOT-LEVEL COMPONENTS
// ============================================
export { default as AddTransactionDialog } from "./AddTransactionDialog";
export { default as AdminInvites } from "./AdminInvites";
export { default as AdminPageHeader } from "./AdminPageHeader";
export { default as AdminUsersList } from "./AdminUsersList";
export { DataIntegrityPanel } from "./DataIntegrityPanel";
export { FinancialSnapshot } from "./FinancialSnapshot";
export { default as FundAUMBar } from "./FundAUMBar";
export { default as QuickLinks } from "./QuickLinks";
export { RealtimeNotifications } from "./RealtimeNotifications";
export { RoleChangeConfirmDialog } from "./RoleChangeConfirmDialog";
export { TwoFactorWarningBanner } from "./TwoFactorWarningBanner";

// ============================================
// SUBDIRECTORY RE-EXPORTS
// ============================================
export * from "./dashboard";
export * from "./investors";
export * from "./withdrawals";
export * from "./deposits";
export * from "./yields";
export * from "./funds";
// Note: operations/RecentActivityFeed conflicts with dashboard/RecentActivityFeed
// Use explicit imports if you need the operations version
export { OperationsStats, PendingItemsBreakdown, QuickLinksGrid, SystemStatus } from "./operations";
export * from "./reports";
export * from "./transactions";
export * from "./statements";
export * from "./assets";
export * from "./investments";
export * from "./maintenance";
