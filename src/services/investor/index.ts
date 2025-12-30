/**
 * Investor Services - Unified exports
 * All investor data operations go through investorDataService
 */

// Unified investor data service (canonical source)
export { 
  investorDataService, 
  InvestorDataService,
  // Standalone functions
  fetchInvestorPositions,
  fetchInvestorsForSelector,
  getAllInvestorsExpertSummary,
  getInvestorExpertView,
  updatePositionValue,
  checkAdminStatus,
  fetchInvestors,
  fetchPendingInvites,
  // Legacy compatibility export
  expertInvestorService,
} from "./investorDataService";

// Types from investorDataService
export type {
  InvestorPositionDetail,
  InvestorPositionRow,
  InvestorSummary,
  PortfolioPerformance,
  InvestorPortfolio,
  YieldHistoryEntry,
  WithdrawalRequest,
  ExpertPosition,
  ExpertInvestor,
  InvestorSelectorItem,
  InvestorDocument,
  PendingTransaction,
} from "./investorDataService";

// Deposit service
export { depositService, DepositService } from "./depositService";

// Withdrawal service
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

// Investor data service functions
export {
  getInvestorDocuments,
  downloadDocument,
  getPendingTransactions,
} from "./investorDataService";

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
export type { InvestorPosition, Fund as InvestorFund } from "./fundViewService";
