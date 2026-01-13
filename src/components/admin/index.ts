/**
 * Admin Components - Main Barrel Export
 * Organized by functional category
 */

// ============================================
// GUARDS
// ============================================
export { AdminGuard } from "./AdminGuard";
export { SuperAdminGuard, useSuperAdmin } from "./SuperAdminGuard";

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
// Operations components (OperationsActivityFeed renamed from RecentActivityFeed to avoid conflict with dashboard version)
export { OperationsStats, PendingItemsBreakdown, QuickLinksGrid, SystemStatus, OperationsActivityFeed, type ActivityItem } from "./operations";
export * from "./reports";
export * from "./transactions";
export * from "./statements";
export * from "./assets";
export * from "./investments";
export * from "./maintenance";
