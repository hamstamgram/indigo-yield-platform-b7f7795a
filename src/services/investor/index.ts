/**
 * Investor Services - Unified exports
 * All investor data operations go through investorDataService or specific sub-services
 */

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

// Transactions V2 service
export { transactionsV2Service } from "./transactionsV2Service";
export type { TransactionV2, TransactionFilters } from "./transactionsV2Service";

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
  getInvestorPositions,
  updateInvestorPosition,
  getAvailableFundsForInvestor,
  removeFundFromInvestor,
  getFundPerformanceSummary,
  getActiveFundsForList,
  getActiveInvestorPositions,
} from "./fundViewService";
export type { InvestorPositionWithFund } from "./fundViewService";

// Re-export canonical types for convenience
export type { Fund } from "@/types/domains/fund";
export type { InvestorPosition } from "@/types/domains/investor";
