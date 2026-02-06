/**
 * Admin Components - Main Barrel Export
 * Re-exports from features/admin structure
 */

// ============================================
// GUARDS & SHARED
// ============================================
export { AdminGuard } from "@/features/admin/shared/AdminGuard";
export { SuperAdminGuard, useSuperAdmin } from "@/features/admin/shared/SuperAdminGuard";
export { default as AdminPageHeader } from "@/features/admin/shared/AdminPageHeader";
export { default as QuickLinks } from "@/features/admin/shared/QuickLinks";
export { RealtimeNotifications } from "@/features/admin/shared/RealtimeNotifications";

// ============================================
// SETTINGS COMPONENTS
// ============================================
export { default as AdminInvites } from "@/features/admin/settings/components/AdminInvites";
export { default as AdminUsersList } from "@/features/admin/settings/components/AdminUsersList";
export { RoleChangeConfirmDialog } from "@/features/admin/settings/components/RoleChangeConfirmDialog";

// ============================================
// SYSTEM COMPONENTS
// ============================================
export { DataIntegrityPanel } from "@/features/admin/system/components/DataIntegrityPanel";
export { FinancialSnapshot } from "@/features/admin/system/components/FinancialSnapshot";
export { default as FundAUMBar } from "@/features/admin/system/components/FundAUMBar";

// ============================================
// DOMAIN RE-EXPORTS
// ============================================
export * from "@/features/admin/dashboard";
export * from "@/features/admin/investors/components";
export * from "@/features/admin/withdrawals/components";
export * from "@/features/admin/deposits/components";
export * from "@/features/admin/yields/components";
export * from "@/features/admin/funds/components";
export * from "@/features/admin/operations/components";
export * from "@/features/admin/reports/components";
export * from "@/features/admin/transactions";
export { default as AddTransactionDialog } from "@/features/admin/transactions/AddTransactionDialog";
export * from "@/features/admin/system/components";
