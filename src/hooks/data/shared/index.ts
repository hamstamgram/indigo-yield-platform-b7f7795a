/**
 * Shared Data Hooks - Barrel Export
 * Hooks used by both admin and investor contexts
 */



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
  formatFundLabel,
  formatFundLabelFull,
  type CreateFundInput,
} from "./useFunds";

// Notifications
export { useNotifications, useNotificationBell, usePriceAlerts } from "./useNotifications";

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

// Reports (re-exported from canonical feature location)
export {
  useInvestorPerformanceReports,
  usePerformanceReportDetail,
  useAdminInvestorReports,
  useGenerateFundPerformance,
  useLatestPerformance,
  useActiveInvestorsForStatements,
  useSendReportEmail,
  useHistoricalReports,
  useDeleteInvestorReport,
  useBulkDeleteReports,
  useDeleteSingleReport,
} from "@/features/admin/reports/hooks/useReports";

// Statements (re-exported from canonical feature location)
export { useStatements, usePublishStatements, type StatementDraft } from "@/features/admin/reports/hooks/useStatements";

// Transaction hooks (consolidated)
export {
  useTransactionById,
  useTransactionWithRelated,
  useTransactionFormData,
  useBalanceCheckForTransaction,
  useInvestorBalance as useInvestorBalanceCheck,
  useCreateAdminTransaction,
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
  type TransactionWithFund,
  type TransactionFilters,
} from "./useTransactionHooks";

// Investor hooks (re-exported from canonical feature location)
export { useInvestors, useUnifiedInvestors, type EnrichedInvestor } from "@/features/admin/investors/hooks/useInvestorHooks";

// User assets
export { useUserAssets, type UserAsset } from "./useUserAssets";

// Available balance for withdrawals
export { useAvailableBalance, type AvailableBalanceResult } from "./useAvailableBalance";

// Withdrawal form data
export { useInvestorOptions, usePositionsForWithdrawal } from "./useWithdrawalFormData";

// Storage
export { useUploadFundLogo } from "./useStorage";



// Live platform metrics
export {
  useLivePlatformMetrics,
  useLiveFundSummary,
  useAllLiveFundSummaries,
  type LivePlatformMetrics,
  type LiveFundSummary,
} from "./useLivePlatformMetrics";
