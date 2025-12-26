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

// Types
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
} from "./investorDataService";

// Deposit service
export { depositService, DepositService } from "./depositService";

// Withdrawal service
export { withdrawalService } from "./withdrawalService";

// Investment service
export { investmentService } from "./investmentService";
