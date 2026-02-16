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
  fetchPendingInvites,
  getAllInvestorsExpertSummary,
  getInvestorExpertView,
  updatePositionValue,
  checkAdminStatus,
  expertInvestorService,
} from "./investorPositionService";

export {
  getInvestorSummary,
  getInvestorPortfolio,
  getAllInvestorsWithSummary,
} from "./investorPortfolioSummaryService";

export {
  getWithdrawalRequests,
  createWithdrawalRequest,
  cancelWithdrawalRequest,
  getAvailableFunds,
} from "./investorWithdrawalService";

export {
  getYieldHistory,
  getInvestorDocumentsForUser,
  getInvestorDocuments,
  downloadDocument,
  getPendingTransactions,
} from "./investorYieldHistoryService";

// ============================================
// InvestorDataService Class (Legacy Wrapper)
// Delegates to the new sub-service functions
// ============================================

import * as positionService from "./investorPositionService";
import * as portfolioService from "./investorPortfolioSummaryService";
import * as withdrawalService from "./investorWithdrawalService";
import * as yieldHistoryService from "./investorYieldHistoryService";

export class InvestorDataService {
  // Position methods
  async getInvestorPositions(investorId: string) {
    return positionService.getInvestorPositions(investorId);
  }

  async getUserPositions(userId: string) {
    return positionService.getUserPositions(userId);
  }

  async getTotalAUM() {
    return positionService.getTotalAUM();
  }

  async getActiveInvestorCount() {
    return positionService.getActiveInvestorCount();
  }

  // Portfolio methods
  async getInvestorPortfolio(investorId?: string) {
    return portfolioService.getInvestorPortfolio(investorId);
  }

  async getInvestorSummary(investorId: string) {
    return portfolioService.getInvestorSummary(investorId);
  }

  async getAllInvestorsWithSummary() {
    return portfolioService.getAllInvestorsWithSummary();
  }

  // Withdrawal methods
  async getWithdrawalRequests() {
    return withdrawalService.getWithdrawalRequests();
  }

  async createWithdrawalRequest(
    fundId: string,
    amount: number,
    withdrawalType?: string,
    notes?: string
  ) {
    return withdrawalService.createWithdrawalRequest(fundId, amount, withdrawalType, notes);
  }

  async cancelWithdrawalRequest(requestId: string, reason?: string) {
    return withdrawalService.cancelWithdrawalRequest(requestId, reason);
  }

  async getAvailableFunds() {
    return withdrawalService.getAvailableFunds();
  }

  // Yield history methods
  async getYieldHistory(days?: number) {
    return yieldHistoryService.getYieldHistory(days);
  }

  async getInvestorDocuments() {
    return yieldHistoryService.getInvestorDocumentsForUser();
  }
}

// Export singleton instance
export const investorDataService = new InvestorDataService();
