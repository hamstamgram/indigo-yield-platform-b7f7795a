/**
 * Data Hooks - Barrel Export
 * 
 * These hooks abstract Supabase operations from components,
 * providing a clean data access layer.
 */

// Profile/User hooks
export {
  useProfiles,
  useProfile,
  useCurrentProfile,
  useIsSuperAdmin,
  useToggleAdminStatus,
  useUpdateProfile,
  type UserProfile,
} from "./useProfiles";

// Fund hooks
export {
  useFunds,
  useFund,
  useCreateFund,
  useUpdateFund,
  useDeactivateFund,
  type Fund,
  type CreateFundInput,
} from "./useFunds";

// Notification hooks
export { useNotificationBell } from "./useNotificationBell";

// Admin invite hooks
export {
  useAdminInvites,
  useCreateAdminInvite,
  useSendAdminInvite,
  useDeleteAdminInvite,
  useCopyInviteLink,
  type AdminInvite,
} from "./useAdminInvites";

// Investor overview hooks
export {
  useInvestorOverview,
  useInvestorDefaultFund,
  type InvestorOverviewData,
} from "./useInvestorOverview";

// Real-time subscription hooks
export {
  useRealtimeSubscription,
  useLedgerSubscription,
} from "./useRealtimeSubscription";

// Transaction hooks
export {
  useTransactions,
  useInvestorTransactions,
  useCreateTransaction,
  useVoidTransaction,
  type Transaction,
  type TransactionFilters,
} from "./useTransactions";

// Yield data hooks
export {
  useYieldRecords,
  useYieldDetails,
  useCanEditYields,
  useCanVoidYield,
  useUpdateYieldRecord,
  useVoidYieldRecord,
  type YieldRecord,
  type YieldFilters,
  type YieldDetails,
} from "./useYieldData";

// Investor data hooks
export {
  useInvestorList,
  useInvestorsForSelector,
  useInvestorPositions,
  useInvestorQuickView,
  useInvestorRecentActivity,
  useUpdateInvestorStatus,
  type InvestorListItem,
  type InvestorQuickViewData,
  type InvestorPosition,
  type InvestorSelectorItem,
  type InvestorPositionRow,
} from "./useInvestorData";

// Statement hooks
export {
  useStatementPeriods,
  useGeneratedStatements,
  useInvestorStatements,
  useDeleteStatement,
  usePeriodStatementCount,
  type GeneratedStatement,
  type StatementPeriod,
  type StatementFilters,
} from "./useStatementData";

// Statement manager hooks
export {
  useStatements,
  usePublishStatements,
  type StatementDraft,
} from "./useStatements";

// IB Settings hooks
export {
  useIBSettings,
  useSearchUsersForIB,
  useUpdateIBConfig,
  useAssignIBRole,
  usePromoteToIB,
  useRemoveIBRole,
  type IBConfig,
  type IBParentOption,
  type Referral,
  type UserSearchResult,
} from "./useIBSettings";

// Investor balance hooks
export {
  useInvestorBalance,
  useAUMExists,
  useTransactionHistory,
} from "./useInvestorBalance";

// Active funds hooks
export {
  useActiveFunds,
  formatFundLabel,
  formatFundLabelFull,
} from "./useActiveFunds";

// Admin stats hooks
export {
  useAdminStats,
  type AdminStats,
} from "./useAdminStats";

// Fund AUM hooks
export {
  useFundAUM,
  FUND_AUM_QUERY_KEY,
  type FundAUMData,
} from "./useFundAUM";

// Investor performance hooks
export {
  useInvestorPerformance,
  usePerAssetStats,
  useInvestorAssetStats,
} from "./useInvestorPerformance";

// Investor ledger hooks
export {
  useInvestorLedger,
  type Transaction as LedgerTransaction,
} from "./useInvestorLedger";

// Investor positions hooks (re-exported, original is in useInvestorData)
export { useInvestorPositions as useInvestorPositionsDetail } from "./useInvestorPositions";

// Month closure hooks
export {
  useMonthClosure,
  type MonthClosureStatus,
  type CloseMonthResult,
  type ReopenMonthResult,
} from "./useMonthClosure";

// Notification hooks
export {
  useNotifications,
  usePriceAlerts,
} from "./useNotifications";

// Investor invite hooks
export { useInvestorInvite } from "./useInvestorInvite";

// Realtime notifications hooks
export { useRealtimeNotifications } from "./useRealtimeNotifications";

// Additional data hooks (moved from root)
export { useAssetData } from "./useAssetData";
export { useDocuments } from "./useDocuments";
export { useFinalizedPortfolio } from "./useFinalizedPortfolio";
export { useInvestorSearch } from "./useInvestorSearch";
export { useInvestors } from "./useInvestors";
export { useUserAssets, type UserAsset } from "./useUserAssets";

// Dashboard query hooks
export {
  useFundsWithAUM,
  useRecentActivities,
  usePendingItems,
} from "./useDashboardQueries";

// Investor withdrawal hooks
export {
  useInvestorWithdrawals,
  useWithdrawalPositions,
  useSubmitWithdrawal,
  type WithdrawalPosition,
} from "./useInvestorWithdrawals";
