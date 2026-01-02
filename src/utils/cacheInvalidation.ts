/**
 * Cache Invalidation Helpers
 * Centralized invalidation functions for consistent cache management
 * 
 * ## Architecture
 * 
 * This module uses a dependency graph approach to ensure consistent invalidation.
 * Each operation type has a defined set of query keys that must be invalidated.
 * 
 * ```
 * Transaction Change
 *   -> positions (direct)
 *   -> fundAum (derived)
 *   -> dashboardStats (aggregated)
 * 
 * Yield Distribution
 *   -> positions (direct)
 *   -> transactions (direct)
 *   -> feeAllocations (derived)
 *   -> ibAllocations (derived)
 * ```
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

// ============ Dependency Graph ============

/**
 * Invalidation dependency graph
 * Defines which query keys are affected by each operation type
 */
const INVALIDATION_GRAPH = {
  transaction: [
    QUERY_KEYS.transactions(),
    QUERY_KEYS.adminTransactions,
    QUERY_KEYS.investorPositions(),
    QUERY_KEYS.fundAumAll,
    QUERY_KEYS.fundAumUnified,
    QUERY_KEYS.dashboardStats,
    QUERY_KEYS.integrityDashboard,
    QUERY_KEYS.investorLedger(),
    QUERY_KEYS.fundDailyAum(),
    QUERY_KEYS.recordedYields(),
    QUERY_KEYS.yieldDistributions(),
  ],
  withdrawal: [
    ...WITHDRAWAL_RELATED_KEYS,
  ],
  deposit: [
    QUERY_KEYS.deposits,
    QUERY_KEYS.depositsAdmin,
    QUERY_KEYS.depositStats,
  ],
  yield: [
    ...YIELD_RELATED_KEYS,
    QUERY_KEYS.funds,
    QUERY_KEYS.integrityDashboard,
    QUERY_KEYS.recordedYields(),
    QUERY_KEYS.yieldDistributions(),
  ],
  investor: [
    ...INVESTOR_RELATED_KEYS,
    QUERY_KEYS.profiles,
  ],
  statement: [
    ...STATEMENT_RELATED_KEYS,
    QUERY_KEYS.generatedStatements(),
    QUERY_KEYS.statementPeriodsWithCounts,
  ],
  delivery: [
    ...DELIVERY_RELATED_KEYS,
  ],
  asset: [
    ...ASSET_RELATED_KEYS,
  ],
  ib: [
    QUERY_KEYS.ibSettings,
    QUERY_KEYS.ibReferrals(),
    QUERY_KEYS.ibCommissions(),
    QUERY_KEYS.adminIbPayouts(),
    QUERY_KEYS.ibCommissionSummary,
    QUERY_KEYS.ibProfile(),
    QUERY_KEYS.ibAllocations(),
    QUERY_KEYS.integrityDashboard,
  ],
} as const;

type InvalidationOperation = keyof typeof INVALIDATION_GRAPH;

interface InvalidationContext {
  investorId?: string;
  fundId?: string;
  periodId?: string;
  withdrawalId?: string;
  ibId?: string;
  assetId?: string;
}

/**
 * Core invalidation function using the dependency graph
 * Deduplicates keys and logs in development mode
 */
function invalidateByGraph(
  queryClient: QueryClient,
  operation: InvalidationOperation,
  context?: InvalidationContext
): void {
  const baseKeys = INVALIDATION_GRAPH[operation];
  
  // Use Set for deduplication of serialized keys
  const keysToInvalidate = new Set<string>();
  baseKeys.forEach(key => keysToInvalidate.add(JSON.stringify(key)));
  
  // Log in development
  if (import.meta.env.DEV) {
    console.log(`[CacheInvalidation] ${operation}:`, {
      keyCount: keysToInvalidate.size,
      context,
    });
  }
  
  // Invalidate base keys
  keysToInvalidate.forEach(keyStr => {
    const key = JSON.parse(keyStr);
    queryClient.invalidateQueries({ queryKey: key });
  });
  
  // Context-specific invalidations
  if (context?.investorId) {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.investorPositions(context.investorId) });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.investorDetail(context.investorId) });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.investor(context.investorId) });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.investorLedger(context.investorId) });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.investorQuickView(context.investorId) });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.investorTransactions(context.investorId) });
  }
  
  if (context?.fundId) {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.fundAum(context.fundId) });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.fundDailyAum(context.fundId) });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.fund(context.fundId) });
  }
  
  if (context?.periodId) {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.periodStatementCount(context.periodId) });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.deliveries(context.periodId) });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.deliveryStats(context.periodId) });
  }
  
  if (context?.withdrawalId) {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.withdrawalDetails(context.withdrawalId) });
  }
  
  if (context?.ibId) {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ibReferrals(context.ibId) });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ibCommissions(context.ibId) });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ibProfile(context.ibId) });
  }
  
  if (context?.assetId) {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.assetPrices(context.assetId) });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.latestPrice(context.assetId) });
  }
}

// ============ Public API ============

/**
 * Invalidate all yield-related queries after yield distribution operations
 * Use after: applyYieldDistribution, voidYieldDistribution, editYieldDistribution
 */
export function invalidateAfterYieldOp(queryClient: QueryClient): void {
  invalidateByGraph(queryClient, 'yield');
}

/**
 * Invalidate queries after transaction operations (deposit, withdrawal, manual tx, void)
 * Use after: createTransaction, voidTransaction, editTransaction, deleteTransaction
 * 
 * CRITICAL: Always invalidates position data since transactions affect balances
 */
export function invalidateAfterTransaction(
  queryClient: QueryClient, 
  investorId?: string,
  fundId?: string
): void {
  invalidateByGraph(queryClient, 'transaction', { investorId, fundId });
  
  // Additional position key patterns for thorough invalidation
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.investorPositions() });
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.positions() });
  
  if (investorId) {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.investor(investorId) });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.investorPositions(investorId) });
  }
  
  if (fundId) {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.fund(fundId) });
  }
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
  invalidateByGraph(queryClient, 'withdrawal', { investorId, fundId, withdrawalId });
  // Withdrawals also affect transactions and positions
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
  invalidateByGraph(queryClient, 'deposit', { investorId, fundId });
  // Deposits also affect transactions and positions
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
  invalidateByGraph(queryClient, 'ib', { ibId, investorId });
  
  if (investorId) {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ibSettingsInvestor(investorId) });
  }
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
  invalidateByGraph(queryClient, 'investor', { investorId });
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
  invalidateByGraph(queryClient, 'statement', { periodId, investorId });
  
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
  invalidateByGraph(queryClient, 'delivery', { periodId });
}

/**
 * Invalidate queries after asset operations
 * Use after: createAsset, updateAsset, addAssetPrice
 */
export function invalidateAfterAssetOp(
  queryClient: QueryClient,
  assetId?: string
): void {
  invalidateByGraph(queryClient, 'asset', { assetId });
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
