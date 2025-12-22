/**
 * Investor Services - Re-exports all investor-related services
 */

// Unified investor data service
export { investorDataService, InvestorDataService } from "./investorDataService";
export type {
  InvestorPositionDetail,
  InvestorSummary,
  PortfolioPerformance,
  InvestorPortfolio,
  YieldHistoryEntry,
  WithdrawalRequest,
} from "./investorDataService";

// Investor position service
export { fetchInvestorPositions, fetchInvestorsForSelector } from "./investorPositionService";
export type { InvestorPositionRow } from "./investorPositionService";

// Legacy investor service
export { checkAdminStatus, fetchInvestors, fetchPendingInvites } from "./investorService";

// Deposit service
export { depositService, DepositService } from "./depositService";

// Withdrawal service
export { withdrawalService } from "./withdrawalService";

// Investment service
export { investmentService } from "./investmentService";
