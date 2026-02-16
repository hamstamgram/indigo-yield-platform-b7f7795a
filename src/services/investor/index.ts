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
export { 
  investorDataService, 
  InvestorDataService,
} from "./investorDataService";

// Position service exports
export {
  fetchInvestorPositions,
  fetchInvestorsForSelector,
  getAllInvestorsExpertSummary,
  getInvestorExpertView,
  updatePositionValue,
  checkAdminStatus,
  fetchInvestors,
  fetchPendingInvites,
  getInvestorPositions as getInvestorPositionsList,
  getUserPositions,
  getTotalAUM,
  getActiveInvestorCount,
  getPlatformStats,
  getPositionsByFund,
  expertInvestorService,
} from "./investorPositionService";

// Portfolio summary service exports
export {
  getInvestorSummary,
  getInvestorPortfolio,
  getAllInvestorsWithSummary,
} from "./investorPortfolioSummaryService";

// Withdrawal service exports
export {
  getWithdrawalRequests,
  createWithdrawalRequest,
  cancelWithdrawalRequest,
  getAvailableFunds,
} from "./investorWithdrawalService";

// Yield history service exports
export {
  getYieldHistory,
  getInvestorDocuments,
  downloadDocument,
  getPendingTransactions,
} from "./investorYieldHistoryService";

// Types from sub-services
export type {
  InvestorPositionDetail,
  InvestorPositionRow,
  ExpertPosition,
  ExpertInvestor,
  InvestorSelectorItem,
} from "./investorPositionService";

export type {
  InvestorSummary,
  PortfolioPerformance,
  InvestorPortfolio,
} from "./investorPortfolioSummaryService";

export type {
  WithdrawalRequest,
} from "./investorWithdrawalService";

export type {
  YieldHistoryEntry,
  InvestorDocument,
  PendingTransaction,
} from "./investorYieldHistoryService";

// Deposit service
export { depositService, DepositService } from "./depositService";

// Withdrawal service (admin operations)
export { withdrawalService } from "./withdrawalService";

// Investment service
export { investmentService } from "./investmentService";

// Transactions V2 service (named after transactions_v2 table)
export { transactionsV2Service } from "./transactionsV2Service";
export type { TransactionRecord, TransactionFilters as TransactionRecordFilters } from "./transactionsV2Service";

// Investor Portfolio service (for investor-facing pages)
export { investorPortfolioService } from "./investorPortfolioService";
export type { PortfolioPosition, WithdrawalFormPosition } from "./investorPortfolioService";

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
  revokeSession,
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
