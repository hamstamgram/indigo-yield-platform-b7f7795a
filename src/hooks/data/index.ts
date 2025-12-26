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
