/**
 * Investor Hooks - Barrel Export
 *
 * Domain-specific hooks for investor operations
 */

// Balance hooks
export { useInvestorBalance, useTransactionHistory, useAUMExists } from "./useInvestorBalance";

// Investor data hooks
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
} from "./useInvestorData";

// Position hooks (canonical export)
export { useInvestorPositions } from "./useInvestorPositions";

// Invite hooks
export { useInvestorInvite } from "./useInvestorInvite";

// Ledger hooks
export { useInvestorLedger, type LedgerTransaction } from "./useInvestorLedger";

// Overview hooks
export {
  useInvestorOverview,
  useInvestorDefaultFund,
  type InvestorOverviewData,
} from "./useInvestorOverview";

// Overview query hooks
export {
  useRecentInvestorTransactions,
  usePendingWithdrawalsCount,
  useLastStatementPeriod,
  useLatestStatementSummary,
  type RecentTransaction,
  type LatestStatementSummary,
} from "./useInvestorOverviewQueries";

// Performance hooks
export {
  useInvestorPerformance,
  usePerAssetStats,
  useInvestorAssetStats,
  useAvailableStatementPeriods,
} from "./useInvestorPerformance";

// Portal hooks
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
  useRevokeSession,
  type Session,
  type AccessLog,
  type UserSettings,
  type InvestorProfile,
  type MonthlyStatement,
} from "./useInvestorPortal";

// Position detail hooks (alias for backwards compatibility)
export { useInvestorPositions as useInvestorPositionsDetail } from "./useInvestorPositions";

// Search hooks
export { useInvestorSearch } from "./useInvestorSearch";

// Settings hooks
export {
  useInvestorProfileSettings,
  useDeleteInvestorProfile,
  useInvestorReportPeriods,
  type InvestorProfileData,
  type ReportPeriod,
} from "./useInvestorSettings";

// Withdrawal hooks
export {
  useInvestorWithdrawals,
  useWithdrawalPositions,
  useSubmitWithdrawal,
  type WithdrawalPosition,
} from "./useInvestorWithdrawals";

// Yield data hooks
export {
  useStatementPeriodId,
  useInvestorPositionsWithFunds,
  useInvestorPerformanceForPeriod,
} from "./useInvestorYieldData";

// Portfolio hooks
export {
  usePortfolioPositions,
  useWithdrawalFormPositions,
  useMyWithdrawalsWithFunds,
  useCreateWithdrawalRequest,
  type PortfolioPosition,
  type WithdrawalFormPosition,
} from "./usePortfolio";

// useFundDetailsPage (new - for FundDetailsPage)
export { useAssetMeta, type AssetMeta } from "./useFundDetailsPage";

// useInvestorPortfolioQueries (moved from hooks/investor/)
export {
  useInvestorDocuments,
  useDocumentDownload,
  usePerformanceHistory,
  usePendingTransactions,
} from "./useInvestorPortfolioQueries";

// useInvestorNotifications (for NotificationsPage)
export {
  useInvestorNotifications,
  useMarkNotificationAsRead,
  useDeleteNotification,
  type InvestorNotification,
} from "./useInvestorNotifications";

// Fee schedule hooks
export {
  useFeeSchedule,
  useAddFeeScheduleEntry,
  useDeleteFeeScheduleEntry,
  type FeeScheduleEntry,
} from "./useFeeSchedule";

// Realtime invalidation
export { useInvestorRealtimeInvalidation } from "./useInvestorRealtimeInvalidation";
