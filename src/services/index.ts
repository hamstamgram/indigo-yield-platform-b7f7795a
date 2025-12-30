/**
 * Services - Unified barrel export for all service modules
 * 
 * Import services by domain:
 * import { adminServiceV2 } from '@/services/admin';
 * import { depositService } from '@/services/investor';
 * import { operationsService } from '@/services/operations';
 * import { auditLogService } from '@/services/shared';
 * 
 * Or import everything from here:
 * import { adminServiceV2, depositService } from '@/services';
 */

// ============================================================================
// INVESTOR SERVICES
// ============================================================================
export {
  // Data service
  investorDataService,
  InvestorDataService,
  fetchInvestorPositions,
  fetchInvestorsForSelector,
  getAllInvestorsExpertSummary,
  getInvestorExpertView,
  updatePositionValue,
  checkAdminStatus,
  fetchInvestors,
  fetchPendingInvites,
  expertInvestorService,
  // Deposit/Withdrawal/Investment
  depositService,
  DepositService,
  withdrawalService,
  investmentService,
  // Transactions
  transactionsV2Service,
  // Portfolio
  investorPortfolioService,
  // Portal functions
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
  // Investor data functions
  getInvestorDocuments,
  downloadDocument,
  getPendingTransactions,
  // Fund view
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
} from "./investor";

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
  TransactionV2,
  TransactionFilters,
  PortfolioPosition,
  WithdrawalFormPosition,
  Session,
  AccessLog,
  UserSettings,
  InvestorProfile,
  MonthlyStatement,
  InvestorPosition,
  InvestorFund,
} from "./investor";

// ============================================================================
// ADMIN SERVICES
// ============================================================================
export * from "./admin";

// ============================================================================
// OPERATIONS SERVICES
// ============================================================================
export { operationsService } from "./operations";
export type { OperationsMetrics, PendingBreakdown } from "./operations";

// ============================================================================
// SHARED SERVICES
// ============================================================================
export * from "./shared";

// ============================================================================
// CORE SERVICES
// ============================================================================
export * from "./core";

// ============================================================================
// IB SERVICES
// ============================================================================
export * from "./ib";

// ============================================================================
// API SERVICES
// ============================================================================
export * from "./api/reportsApi";
export * from "./api/statementsApi";
