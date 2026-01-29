/**
 * Shared Data Hooks - Barrel Export
 * Hooks used by both admin and investor contexts
 */

// Active funds
export { useActiveFunds, formatFundLabel, formatFundLabelFull } from "./useActiveFunds";

// Asset data
export { useAssetData } from "./useAssetData";

// Auth flow
export {
  useSignIn,
  useSignOut,
  useRequestPasswordReset,
  useResetPassword,
  useVerifyInvestorInvite,
  useVerifyAdminInvite,
  useAcceptInvestorInvite,
  useAcceptAdminInvite,
  useCheckAuthSession,
  useSetSessionFromTokens,
  type InviteDetails,
  type UserMetadata,
  type SignInResult,
} from "./useAuthFlow";

// Dashboard metrics
export {
  useFinancialMetrics,
  useHistoricalFlowData,
  useFundComposition,
  useDeliveryStatus,
  useRetryDelivery,
  useDeliveryDiagnostics,
  useDeliveryExclusionBreakdown,
  type FinancialMetrics,
  type FlowData,
  type InvestorComposition,
  type DeliveryRecord,
  type DeliveryDiagnostics,
  type ExclusionBreakdown,
} from "./useDashboardMetrics";

// Dashboard queries
export { useFundsWithAUM, useRecentActivities, usePendingItems } from "./useDashboardQueries";

// Documents
export { useDocuments } from "./useDocuments";

// Finalized portfolio
export { useFinalizedPortfolio } from "./useFinalizedPortfolio";

// Fund AUM
export { useFundAUM, FUND_AUM_QUERY_KEY, type FundAUMData } from "./useFundAUM";

// Funds
export {
  useFunds,
  useFund,
  useCreateFund,
  useUpdateFund,
  useDeactivateFund,
  type CreateFundInput,
} from "./useFunds";
// Note: Fund should be imported from @/types/domains/fund

// IB Settings
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

// Investors list
// Investors list - moved to main imports below

// Investor wizard
export {
  useCreateInvestorWizard,
  type WizardResult,
  type WizardProgressCallback,
} from "./useInvestorWizard";

// Notification bell
export { useNotificationBell } from "./useNotificationBell";

// Notifications
export { useNotifications, usePriceAlerts } from "./useNotifications";

// Profile settings
export {
  usePersonalInfo,
  useUpdatePersonalInfo,
  useNotificationPreferences,
  useUpdateNotificationPreferences,
  useChangePassword,
  useUserEmail,
  useSaveLocalPreferences,
  useLocalPreferences,
  type PersonalInfo,
  type NotificationPreferences,
  DEFAULT_NOTIFICATION_PREFERENCES,
} from "./useProfileSettings";

// Profiles
export {
  useProfiles,
  useProfile,
  useCurrentProfile,
  useIsSuperAdmin as useIsSuperAdminProfile,
  useToggleAdminStatus,
  useUpdateProfile,
  useInvestorsForTransaction,
  useInvestorProfileWithFund,
  type UserProfile,
} from "./useProfiles";

// Realtime notifications
export { useRealtimeNotifications } from "./useRealtimeNotifications";

// Realtime subscription
export { useRealtimeSubscription, useLedgerSubscription } from "./useRealtimeSubscription";

// Reports
export {
  useInvestorPerformanceReports,
  usePerformanceReportDetail,
  useAdminInvestorReports,
  useGenerateFundPerformance,
  useLatestPerformance,
  useActiveInvestorsForStatements,
  useGenerateStatement,
} from "./useReports";

// Statements
export { useStatements, usePublishStatements, type StatementDraft } from "./useStatements";

// Transaction hooks (consolidated)
export {
  useTransactionById,
  useTransactionWithRelated,
  useTransactionFormData,
  useBalanceCheckForTransaction,
  useInvestorBalance as useInvestorBalanceCheck, // Backward compatibility
  useAumCheck,
  useCreateAdminTransaction,
  useRecordAum,
  useTransactions,
  useInvestorTransactions,
  useCreateTransaction,
  useVoidTransaction,
  useInvestorTransactionSummary,
  type TransactionDetail,
  type TransactionWithRelated,
  type InvestorForTransaction,
  type FundForTransaction,
  type BalanceCheckResult,
  type AumCheckResult,
  type TransactionWithFund,
  type TransactionFilters,
} from "./useTransactionHooks";

// Investor hooks (consolidated)
export { useInvestors, useUnifiedInvestors, type EnrichedInvestor } from "./useInvestorHooks";

// User assets
export { useUserAssets, type UserAsset } from "./useUserAssets";

// Available balance for withdrawals (security: accounts for pending withdrawals)
export { useAvailableBalance, type AvailableBalanceResult } from "./useAvailableBalance";

// Withdrawal form data
export { useInvestorOptions, usePositionsForWithdrawal } from "./useWithdrawalFormData";

// Withdrawal mutations
export { useWithdrawalMutations } from "./useWithdrawalMutations";

// Yield data
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

// Storage
export { useUploadFundLogo } from "./useStorage";

// IB Data (moved from hooks/ib/)
export {
  useIBCommissionSummary,
  useIBTopReferrals,
  useIBReferralCount,
  useIBAllocations,
  useIBPositions,
  useIBReferrals,
  useIBReferralsForDashboard,
  useIBReferralDetail,
  useIBReferralPositions,
  useIBReferralCommissions,
  useIBCommissions,
  useIBPayoutHistory,
  useIBProfile,
  useUpdateIBProfile,
  getPeriodStartDate,
  getDateRange,
  type PeriodType,
} from "./useIBData";

// Report history
export { useReportHistory, type ReportHistoryFilters } from "./useReportHistory";

// Available funds
export { useAvailableFunds } from "./useAvailableFunds";

// Live platform metrics (real-time, no MV refresh needed)
export {
  useLivePlatformMetrics,
  useLiveFundSummary,
  useAllLiveFundSummaries,
  type LivePlatformMetrics,
  type LiveFundSummary,
} from "./useLivePlatformMetrics";
