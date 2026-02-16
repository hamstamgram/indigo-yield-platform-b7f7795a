/**
 * Investor Hooks - Barrel Export (Re-export shim)
 *
 * All investor hooks now live under src/features/investor/.
 * This file re-exports them for backward compatibility.
 */

// Overview hooks
export {
  useInvestorOverview,
  useInvestorDefaultFund,
  type InvestorOverviewData,
} from "@/features/investor/overview/hooks/useInvestorOverview";

export {
  useRecentInvestorTransactions,
  usePendingWithdrawalsCount,
  useLastStatementPeriod,
  useLatestStatementSummary,
  type RecentTransaction,
  type LatestStatementSummary,
} from "@/features/investor/overview/hooks/useInvestorOverviewQueries";

// Portfolio hooks
export {
  usePortfolioPositions,
  useWithdrawalFormPositions,
  useMyWithdrawalsWithFunds,
  useCreateWithdrawalRequest,
  type PortfolioPosition,
  type WithdrawalFormPosition,
} from "@/features/investor/portfolio/hooks/usePortfolio";

export { useInvestorPositions } from "@/features/investor/portfolio/hooks/useInvestorPositions";
export { useInvestorPositions as useInvestorPositionsDetail } from "@/features/investor/portfolio/hooks/useInvestorPositions";

export { useInvestorBalance, useTransactionHistory, useAUMExists } from "@/features/investor/portfolio/hooks/useInvestorBalance";

// Performance hooks
export {
  useInvestorPerformance,
  usePerAssetStats,
  useInvestorAssetStats,
  useAvailableStatementPeriods,
} from "@/features/investor/performance/hooks/useInvestorPerformance";

export {
  useStatementPeriodId,
  useInvestorPositionsWithFunds,
  useInvestorPerformanceForPeriod,
} from "@/features/investor/performance/hooks/useInvestorYieldData";

// Transaction hooks
export {
  useInvestorTransactionAssets,
  useInvestorTransactionsList,
  useMonthlyStatements,
  useStatementYears,
  useStatementAssets,
  useDownloadStatement,
  useInvestorProfileData,
  useUserPreferences,
  useSaveUserPreferences,
  useActiveSessions,
  useAccessLogs,
  type Session,
  type AccessLog,
  type UserSettings,
  type InvestorProfile,
  type MonthlyStatement,
} from "@/features/investor/transactions/hooks/useInvestorPortal";

// Document hooks
export {
  useInvestorDocuments,
  useDocumentDownload,
  usePerformanceHistory,
  usePendingTransactions,
} from "@/features/investor/documents/hooks/useInvestorPortfolioQueries";

// Settings hooks
export {
  useInvestorProfileSettings,
  useDeleteInvestorProfile,
  useInvestorReportPeriods,
  type InvestorProfileData,
  type ReportPeriod,
} from "@/features/investor/settings/hooks/useInvestorSettings";

// Fund details hooks
export { useAssetMeta, type AssetMeta } from "@/features/investor/funds/hooks/useFundDetailsPage";

// Shared hooks
export { useInvestorSearch } from "@/features/investor/shared/hooks/useInvestorSearch";
export { useInvestorRealtimeInvalidation } from "@/features/investor/shared/hooks/useInvestorRealtimeInvalidation";

export {
  useInvestorNotifications,
  useMarkNotificationAsRead,
  useDeleteNotification,
  type InvestorNotification,
} from "@/features/investor/shared/hooks/useInvestorNotifications";

export {
  useInvestorList,
  useInvestorsForSelector,
  useInvestorQuickView,
  useInvestorRecentActivity,
  useUpdateInvestorStatus,
  type InvestorListItem,
  type InvestorQuickViewData,
  type InvestorPosition,
  type InvestorSelectorItem,
  type InvestorPositionRow,
} from "@/features/investor/shared/hooks/useInvestorData";

export { useInvestorInvite } from "@/features/investor/shared/hooks/useInvestorInvite";
export { useInvestorLedger, type LedgerTransaction } from "@/features/investor/shared/hooks/useInvestorLedger";

export {
  useInvestorWithdrawals,
  useWithdrawalPositions,
  useSubmitWithdrawal,
  type WithdrawalPosition,
} from "@/features/investor/shared/hooks/useInvestorWithdrawals";

export {
  useFeeSchedule,
  useAddFeeScheduleEntry,
  useDeleteFeeScheduleEntry,
  type FeeScheduleEntry,
} from "@/features/investor/shared/hooks/useFeeSchedule";

export { useIBSchedule, useAddIBScheduleEntry, useDeleteIBScheduleEntry } from "@/features/investor/shared/hooks/useIBSchedule";
