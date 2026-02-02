/**
 * Miscellaneous admin hooks - Re-exports from features/admin
 */

// Shared hooks
export * from "@/features/admin/shared/hooks/useAdminStats";
export * from "@/features/admin/shared/hooks/useActionBar";
export * from "@/features/admin/shared/hooks/useCommandPalette";

// Reports hooks
export * from "@/features/admin/reports/hooks/useDeliveryData";
export * from "@/features/admin/reports/hooks/useDeliveryMutations";
export * from "@/features/admin/reports/hooks/useReportData";
export * from "@/features/admin/reports/hooks/useReportRecipients";

// Operations hooks
export * from "@/features/admin/operations/hooks/useEmailTracking";
export * from "@/features/admin/operations/hooks/useOperationsHub";

// System hooks
export * from "@/features/admin/system/hooks/useIntegrityData";
export * from "@/features/admin/system/hooks/useIntegrityOperations";
export * from "@/features/admin/system/hooks/useAuditLogs";
export * from "@/features/admin/system/hooks/useRealtimeAlerts";

// Investor hooks
export * from "@/features/admin/investors/hooks/useMonthlyReports";
export * from "@/features/admin/investors/hooks/useInternalRoute";

// IB hooks
export * from "@/features/admin/ib/hooks/useIBUsers";
export * from "@/features/admin/ib/hooks/useIBManagementPage";
export * from "@/features/admin/ib/hooks/useIBPayoutMutations";

// Deposits hooks
export * from "@/features/admin/deposits/hooks/useDeposits";

// Fund/Asset hooks
export * from "@/features/admin/funds/hooks/useAssets";
