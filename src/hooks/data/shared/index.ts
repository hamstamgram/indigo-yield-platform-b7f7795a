/**
 * Shared Data Hooks - Barrel Export
 * Hooks used by both admin and investor contexts
 */

// Active funds
export {
  useActiveFunds,
  formatFundLabel,
  formatFundLabelFull,
} from "./useActiveFunds";

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
export {
  useFundsWithAUM,
  useRecentActivities,
  usePendingItems,
} from "./useDashboardQueries";

// Documents
export { useDocuments } from "./useDocuments";

// Finalized portfolio
export { useFinalizedPortfolio } from "./useFinalizedPortfolio";

// Fund AUM
export {
  useFundAUM,
  FUND_AUM_QUERY_KEY,
  type FundAUMData,
} from "./useFundAUM";

// Funds
export {
  useFunds,
  useFund,
  useCreateFund,
  useUpdateFund,
  useDeactivateFund,
  type Fund,
  type CreateFundInput,
} from "./useFunds";

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
export { useInvestors } from "./useInvestors";

// Investor wizard
export {
  useCreateInvestorWizard,
  type WizardResult,
  type WizardProgressCallback,
} from "./useInvestorWizard";

// Notification bell
export { useNotificationBell } from "./useNotificationBell";

// Notifications
export {
  useNotifications,
  usePriceAlerts,
} from "./useNotifications";

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
  useIsSuperAdmin,
  useToggleAdminStatus,
  useUpdateProfile,
  type UserProfile,
} from "./useProfiles";

// Realtime notifications
export { useRealtimeNotifications } from "./useRealtimeNotifications";

// Realtime subscription
export {
  useRealtimeSubscription,
  useLedgerSubscription,
} from "./useRealtimeSubscription";

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
export {
  useStatements,
  usePublishStatements,
  type StatementDraft,
} from "./useStatements";

// Transaction details
export {
  useTransactionById,
  useTransactionWithRelated,
  useTransactionFormData,
  useInvestorBalance as useInvestorBalanceCheck,
  useAumCheck,
  useCreateAdminTransaction,
  useRecordAum,
  type TransactionDetail,
  type TransactionWithRelated,
  type InvestorForTransaction,
  type FundForTransaction,
  type BalanceCheckResult,
  type AumCheckResult,
} from "./useTransactionDetails";

// Transactions
export {
  useTransactions,
  useInvestorTransactions,
  useCreateTransaction,
  useVoidTransaction,
  type Transaction,
  type TransactionFilters,
} from "./useTransactions";

// Unified investors
export {
  useUnifiedInvestors,
  type EnrichedInvestor,
} from "./useUnifiedInvestors";

// User assets
export { useUserAssets, type UserAsset } from "./useUserAssets";

// Withdrawal form data
export {
  useInvestorOptions,
  useInvestorPositions as useWithdrawalFormPositionsData,
} from "./useWithdrawalFormData";

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
