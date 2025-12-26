/**
 * Cache Invalidation Helpers
 * Centralized invalidation functions for consistent cache management
 */

import { QueryClient } from "@tanstack/react-query";
import { 
  QUERY_KEYS, 
  YIELD_RELATED_KEYS, 
  INVESTOR_RELATED_KEYS, 
  STATEMENT_RELATED_KEYS, 
  DELIVERY_RELATED_KEYS,
  ASSET_RELATED_KEYS,
  WITHDRAWAL_RELATED_KEYS,
} from "@/constants/queryKeys";

/**
 * Invalidate all yield-related queries after yield distribution operations
 * Use after: applyYieldDistribution, voidYieldDistribution, editYieldDistribution
 */
export function invalidateAfterYieldOp(queryClient: QueryClient): void {
  YIELD_RELATED_KEYS.forEach(key => 
    queryClient.invalidateQueries({ queryKey: key })
  );
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.funds });
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.integrityDashboard });
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.recordedYields() });
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.yieldDistributions() });
}

/**
 * Invalidate queries after transaction operations (deposit, withdrawal, manual tx)
 * Use after: createTransaction, voidTransaction, editTransaction
 */
export function invalidateAfterTransaction(
  queryClient: QueryClient, 
  investorId?: string,
  fundId?: string
): void {
  // Core transaction queries
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.transactions() });
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminTransactions });
  
  // Investor-specific
  if (investorId) {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.investorTransactions(investorId) });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.investorPositions(investorId) });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.investorDetail(investorId) });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.investor(investorId) });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.investorLedger(investorId) });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.investorQuickView(investorId) });
  }
  
  // Fund-specific
  if (fundId) {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.fundAum(fundId) });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.fundDailyAum(fundId) });
  }
  
  // General position and fund queries
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.investorPositions() });
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.investorLedger() });
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.fundDailyAum() });
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.fundAumAll });
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.fundAumUnified });
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dashboardStats });
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.integrityDashboard });
}

/**
 * Invalidate queries after withdrawal operations
 * Use after: createWithdrawal, approveWithdrawal, rejectWithdrawal, deleteWithdrawal
 */
export function invalidateAfterWithdrawal(
  queryClient: QueryClient, 
  investorId?: string,
  fundId?: string,
  withdrawalId?: string
): void {
  // Withdrawal-specific queries
  WITHDRAWAL_RELATED_KEYS.forEach(key =>
    queryClient.invalidateQueries({ queryKey: key })
  );
  
  if (withdrawalId) {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.withdrawalDetails(withdrawalId) });
  }
  
  // Also invalidate transaction and position queries since withdrawals affect balances
  invalidateAfterTransaction(queryClient, investorId, fundId);
}

/**
 * Invalidate queries after deposit operations
 * Use after: approveDeposit, rejectDeposit
 */
export function invalidateAfterDeposit(
  queryClient: QueryClient,
  investorId?: string,
  fundId?: string
): void {
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.deposits });
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.depositsAdmin });
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.depositStats });
  
  // Also invalidate transaction and position queries
  invalidateAfterTransaction(queryClient, investorId, fundId);
}

/**
 * Invalidate queries after IB-related operations
 * Use after: assignIB, reassignIB, markCommissionsPaid
 */
export function invalidateAfterIBOperation(
  queryClient: QueryClient,
  ibId?: string,
  investorId?: string
): void {
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ibSettings });
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ibReferrals() });
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ibCommissions() });
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminIbPayouts() });
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ibCommissionSummary });
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ibProfile() });
  
  if (ibId) {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ibReferrals(ibId) });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ibCommissions(ibId) });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ibProfile(ibId) });
  }
  
  if (investorId) {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.investor(investorId) });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.investorDetail(investorId) });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ibSettingsInvestor(investorId) });
  }
  
  // IB allocations affect integrity
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ibAllocations() });
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.integrityDashboard });
}

/**
 * Invalidate queries after month closure operations
 * Use after: closeMonth, reopenMonth
 */
export function invalidateAfterMonthClosure(
  queryClient: QueryClient,
  fundId: string,
  month: string
): void {
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.monthClosure(fundId, month) });
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.statementPeriods });
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.statements });
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.reports });
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.canEditYields });
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.integrityDashboard });
}

/**
 * Invalidate all investor-related queries
 * Use after bulk investor operations
 */
export function invalidateInvestorData(queryClient: QueryClient, investorId?: string): void {
  INVESTOR_RELATED_KEYS.forEach(key =>
    queryClient.invalidateQueries({ queryKey: key })
  );
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.profiles });
  
  if (investorId) {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.investor(investorId) });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.investorQuickView(investorId) });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.investorDetail(investorId) });
  }
}

/**
 * Invalidate queries after statement operations
 * Use after: generateStatement, deleteStatement, publishStatement
 */
export function invalidateAfterStatementOp(
  queryClient: QueryClient,
  periodId?: string,
  investorId?: string
): void {
  STATEMENT_RELATED_KEYS.forEach(key =>
    queryClient.invalidateQueries({ queryKey: key })
  );
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.generatedStatements() });
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.statementPeriodsWithCounts });
  
  if (periodId) {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.periodStatementCount(periodId) });
  }
  
  if (investorId) {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.investorStatements(investorId) });
  }
}

/**
 * Invalidate queries after delivery operations
 * Use after: queueDelivery, sendDelivery, retryDelivery, cancelDelivery
 */
export function invalidateAfterDeliveryOp(
  queryClient: QueryClient,
  periodId?: string
): void {
  DELIVERY_RELATED_KEYS.forEach(key =>
    queryClient.invalidateQueries({ queryKey: key })
  );
  
  if (periodId) {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.deliveries(periodId) });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.deliveryStats(periodId) });
  }
}

/**
 * Invalidate queries after asset operations
 * Use after: createAsset, updateAsset, addAssetPrice
 */
export function invalidateAfterAssetOp(
  queryClient: QueryClient,
  assetId?: string
): void {
  ASSET_RELATED_KEYS.forEach(key =>
    queryClient.invalidateQueries({ queryKey: key })
  );
  
  if (assetId) {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.assetPrices(assetId) });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.latestPrice(assetId) });
  }
}

/**
 * Invalidate queries after daily rate operations
 * Use after: saveDailyRate
 */
export function invalidateAfterDailyRateOp(
  queryClient: QueryClient,
  date?: string
): void {
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.recentDailyRates });
  if (date) {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dailyRate(date) });
  }
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dailyRate() });
}

/**
 * Invalidate queries after admin invite operations
 */
export function invalidateAfterAdminInviteOp(queryClient: QueryClient): void {
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminInvites });
}

/**
 * Full cache reset - use sparingly, only for major data resets
 */
export function invalidateAllFinancialData(queryClient: QueryClient): void {
  // All yield-related
  invalidateAfterYieldOp(queryClient);
  
  // All investor-related  
  invalidateInvestorData(queryClient);
  
  // All fund data
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.funds });
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.activeFunds });
  
  // Withdrawals and deposits
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.withdrawals });
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.deposits });
  
  // Integrity
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.integrityDashboard });
}
