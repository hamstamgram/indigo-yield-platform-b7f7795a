/**
 * Investor Services - Unified exports
 * All investor data operations go through investorDataService or specific sub-services
 */

// Canonical investor lookup service (P1-04)
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

// Unified investor data service (canonical source - facade pattern)
export { investorDataService } from "./investorDataService";

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

// Portfolio summary service exports
export {
  getInvestorSummary,
  getInvestorPortfolio,
  getAllInvestorsWithSummary,
} from "@/features/investor/portfolio/services/investorPortfolioSummaryService";

// Withdrawal service exports
export {
  getWithdrawalRequests,
  cancelWithdrawalRequest,
  getAvailableFunds,
} from "@/features/investor/withdrawals/services/investorWithdrawalService";

// Yield history service exports
export {
  getYieldHistory,
  getInvestorDocuments,
  downloadDocument,
  getPendingTransactions,
} from "@/features/investor/yields/services/investorYieldHistoryService";

// Types from sub-services
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

// Deposit service
export { depositService } from "./depositService";
export type { DepositService } from "./depositService";

// Withdrawal service (admin operations)
export { withdrawalService } from "@/features/shared/services/withdrawalService";

// Investment service
export { investmentService } from "./investmentService";

// Transactions V2 service (named after transactions_v2 table)
export { transactionsV2Service } from "@/features/shared/services/transactionsV2Service";
export type {
  TransactionRecord,
  TransactionFilters as TransactionRecordFilters,
} from "@/features/shared/services/transactionsV2Service";

// Investor Portfolio service (for investor-facing pages)
export { investorPortfolioService } from "@/features/investor/portfolio/services/investorPortfolioService";
export type {
  PortfolioPosition,
  WithdrawalFormPosition,
} from "@/features/investor/portfolio/services/investorPortfolioService";

// Investor Portal service types (for investor portal pages)
export type {
  Session,
  AccessLog,
  UserSettings,
  InvestorProfile,
  MonthlyStatement,
} from "./investorPortalService";

// Investor Portal service functions
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

// Note: Fund should be imported from @/types/domains/fund
// Note: InvestorPosition should be imported from @/types/domains/investor
