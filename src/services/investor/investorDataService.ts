/**
 * Investor Data Service (Main Entry Point)
 *
 * This file re-exports from focused sub-services for backwards compatibility.
 * New code should import directly from the specific sub-service files:
 * - investorPositionService.ts - Position queries and investor listings
 * - investorPortfolioSummaryService.ts - Portfolio summaries and aggregations
 * - investorWithdrawalService.ts - Withdrawal requests
 * - investorYieldHistoryService.ts - Yield history and documents
 */

// Re-export types from sub-services
export type {
  InvestorPositionRow,
  ExpertPosition,
  ExpertInvestor,
  InvestorSelectorItem,
  InvestorPositionDetail,
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

// Re-export functions from sub-services
export {
  getInvestorPositions,
  getUserPositions,
  fetchInvestorPositions,
  getTotalAUM,
  getActiveInvestorCount,
  getPlatformStats,
  fetchInvestorsForSelector,
  fetchInvestors,
  getAllInvestorsExpertSummary,
  getInvestorExpertView,
  updatePositionValue,
  checkAdminStatus,
  expertInvestorService,
} from "@/features/investor/portfolio/services/investorPositionService";

export {
  getInvestorSummary,
  getInvestorPortfolio,
  getAllInvestorsWithSummary,
} from "@/features/investor/portfolio/services/investorPortfolioSummaryService";

export {
  getWithdrawalRequests,
  createWithdrawalRequest,
  cancelWithdrawalRequest,
  getAvailableFunds,
} from "@/features/investor/withdrawals/services/investorWithdrawalService";

export {
  getYieldHistory,
  getInvestorDocumentsForUser,
  getInvestorDocuments,
  downloadDocument,
  getPendingTransactions,
} from "@/features/investor/yields/services/investorYieldHistoryService";

// ============================================
// Plain object facade (replaces legacy class)
// ============================================

import * as positionService from "@/features/investor/portfolio/services/investorPositionService";
import * as portfolioService from "@/features/investor/portfolio/services/investorPortfolioSummaryService";
import * as withdrawalService from "@/features/investor/withdrawals/services/investorWithdrawalService";
import * as yieldHistoryService from "@/features/investor/yields/services/investorYieldHistoryService";

export const investorDataService = {
  getInvestorPositions: positionService.getInvestorPositions,
  getUserPositions: positionService.getUserPositions,
  getTotalAUM: positionService.getTotalAUM,
  getActiveInvestorCount: positionService.getActiveInvestorCount,
  getInvestorPortfolio: portfolioService.getInvestorPortfolio,
  getInvestorSummary: portfolioService.getInvestorSummary,
  getAllInvestorsWithSummary: portfolioService.getAllInvestorsWithSummary,
  getWithdrawalRequests: withdrawalService.getWithdrawalRequests,
  createWithdrawalRequest: withdrawalService.createWithdrawalRequest,
  cancelWithdrawalRequest: withdrawalService.cancelWithdrawalRequest,
  getAvailableFunds: withdrawalService.getAvailableFunds,
  getYieldHistory: yieldHistoryService.getYieldHistory,
  getInvestorDocuments: yieldHistoryService.getInvestorDocumentsForUser,
};
