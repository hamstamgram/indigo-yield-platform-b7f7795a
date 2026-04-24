/**
 * Investor Services - Local services only
 *
 * For cross-feature services, import from canonical paths:
 * - withdrawalService → @/features/shared/services/withdrawalService
 * - transactionsV2Service → @/features/shared/services/transactionsV2Service
 * - investorPositionService → @/features/investor/portfolio/services/investorPositionService
 * - investorPortfolioSummaryService → @/features/investor/portfolio/services/investorPortfolioSummaryService
 * - investorWithdrawalService → @/features/investor/withdrawals/services/investorWithdrawalService
 * - investorYieldHistoryService → @/features/investor/yields/services/investorYieldHistoryService
 */

// Canonical investor lookup service
export {
  getInvestorById,
  getInvestorsForList,
  getInvestorRef,
  getInvestorRefs,
  investorExists,
  getActiveInvestorCount as getActiveInvestorCountFromLookup,
  type InvestorLookup,
  type InvestorRef,
  type InvestorListOptions,
} from "./investorLookupService";

// Unified investor data service (facade)
export { investorDataService } from "./investorDataService";

// Deposit service
export { depositService } from "./depositService";
export type { DepositService } from "./depositService";

// Investment service
export { investmentService } from "./investmentService";

// Fund view service (investor-focused fund operations)
export {
  getAllFunds,
  getFundById,
  addFundToInvestor,
  getInvestorPositionsWithFunds,
  updateInvestorPosition,
  getAvailableFundsForInvestor,
  removeFundFromInvestor,
  getFundPerformanceSummary,
  getActiveFundsForList,
  getActiveInvestorPositions,
} from "./fundViewService";
export type { InvestorPositionWithFund } from "./fundViewService";

// Investor Portal service
export type {
  Session,
  AccessLog,
  UserSettings,
  InvestorProfile,
  MonthlyStatement,
  InvestorTransactionsPage,
} from "./investorPortalService";

export {
  getInvestorTransactionAssets,
  getInvestorTransactionsList,
  getInvestorStatements,
  getStatementYears,
  getStatementAssets,
  getStatementHtmlContent,
  getInvestorProfile,
  getUserPreferences,
  saveUserPreferences,
  getActiveSessions,
  getAccessLogs,
} from "./investorPortalService";

// --- Legacy re-exports for backward compatibility ---
// TODO: Migrate consumers to import directly from canonical paths

export {
  fetchInvestorPositions,
  fetchInvestorsForSelector,
  getAllInvestorsExpertSummary,
  getInvestorExpertView,
  updatePositionValue,
  checkAdminStatus,
  fetchInvestors,
  getInvestorPositions as getInvestorPositionsList,
  getUserPositions,
  getTotalAUM,
  getActiveInvestorCount,
  getPlatformStats,
  getPositionsByFund,
  expertInvestorService,
} from "@/features/investor/portfolio/services/investorPositionService";

export {
  getInvestorSummary,
  getInvestorPortfolio,
} from "@/features/investor/portfolio/services/investorPortfolioSummaryService";

export {
  getWithdrawalRequests,
  cancelWithdrawalRequest,
  getAvailableFunds,
} from "@/features/investor/withdrawals/services/investorWithdrawalService";

export {
  getYieldHistory,
  getInvestorDocuments,
  downloadDocument,
  getPendingTransactions,
} from "@/features/investor/yields/services/investorYieldHistoryService";

export type {
  InvestorPositionDetail,
  InvestorPositionRow,
  ExpertPosition,
  ExpertInvestor,
  InvestorSelectorItem,
} from "@/features/investor/portfolio/services/investorPositionService";

export type {
  InvestorSummary,
  PortfolioPerformance,
  InvestorPortfolio,
} from "@/features/investor/portfolio/services/investorPortfolioSummaryService";

export type { WithdrawalRequest } from "@/features/investor/withdrawals/services/investorWithdrawalService";

export type {
  YieldHistoryEntry,
  InvestorDocument,
  PendingTransaction,
} from "@/features/investor/yields/services/investorYieldHistoryService";

// Shared services re-exports
export { withdrawalService } from "@/features/shared/services/withdrawalService";
export { transactionsV2Service } from "@/features/shared/services/transactionsV2Service";
export type {
  TransactionRecord,
  TransactionFilters as TransactionRecordFilters,
} from "@/features/shared/services/transactionsV2Service";

export { investorPortfolioService } from "@/features/investor/portfolio/services/investorPortfolioService";
export type {
  PortfolioPosition,
  WithdrawalFormPosition,
} from "@/features/investor/portfolio/services/investorPortfolioService";
