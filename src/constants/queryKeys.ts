/**
 * Centralized Query Keys
 * Single source of truth for all React Query cache keys
 * Ensures consistent cache invalidation across the application
 */

export const QUERY_KEYS = {
  // ============ Funds ============
  funds: ["funds"] as const,
  activeFunds: ["funds", "active"] as const,
  fund: (id: string) => ["funds", id] as const,
  fundAum: (fundId: string) => ["fund-aum", fundId] as const,
  fundAumAll: ["fund-aum"] as const,
  fundAumUnified: ["fund-aum-unified"] as const,
  fundDailyAum: (fundId?: string) => fundId 
    ? ["fund-daily-aum", fundId] as const 
    : ["fund-daily-aum"] as const,

  // ============ Investors ============
  investors: ["investors"] as const,
  investorList: ["investor-list"] as const,
  investorsAll: ["investors-all"] as const,
  investorsSelector: (includeSystem?: boolean) => includeSystem !== undefined
    ? ["investors-selector", includeSystem] as const
    : ["investors-selector"] as const,
  investor: (id: string) => ["investor", id] as const,
  investorPositions: (fundId?: string) => fundId 
    ? ["investor-positions", fundId] as const 
    : ["investor-positions"] as const,
  investorDetail: (id: string) => ["investor-detail", id] as const,
  investorQuickView: (id: string) => ["investor-quick-view", id] as const,
  investorLedger: (id?: string) => id
    ? ["investor-ledger", id] as const
    : ["investor-ledger"] as const,
  investorRecentActivity: (id: string, limit?: number) => limit
    ? ["investor-recent-activity", id, limit] as const
    : ["investor-recent-activity", id] as const,

  // ============ Transactions ============
  transactions: ["transactions"] as const,
  adminTransactions: ["admin-transactions-history"] as const,
  investorTransactions: (investorId: string) => ["investor-transactions", investorId] as const,

  // ============ Yield ============
  yieldDistributions: (fundId?: string) => fundId 
    ? ["yield-distributions", fundId] as const 
    : ["yield-distributions"] as const,
  yieldRecords: ["yield-records"] as const,
  recordedYields: (filters?: Record<string, unknown>) => 
    filters ? ["recorded-yields", filters] as const : ["recorded-yields"] as const,
  yieldDetails: (recordId: string) => ["yield-details", recordId] as const,
  canEditYields: ["can-edit-yields"] as const,
  canVoidYield: (recordId: string) => ["can-void-yield", recordId] as const,
  yieldCorrections: (fundId?: string) => fundId 
    ? ["yield-corrections", fundId] as const 
    : ["yield-corrections"] as const,
  yieldCorrectionHistory: (fundId?: string, startDate?: string, endDate?: string) => 
    ["yield-correction-history", fundId, startDate, endDate] as const,

  // ============ Allocations ============
  feeAllocations: (fundId?: string) => fundId 
    ? ["fee-allocations", fundId] as const 
    : ["fee-allocations"] as const,
  ibAllocations: (fundId?: string) => fundId 
    ? ["ib-allocations", fundId] as const 
    : ["ib-allocations"] as const,

  // ============ Withdrawals ============
  withdrawals: ["withdrawals"] as const,
  withdrawalRequests: ["withdrawal-requests"] as const,
  withdrawalRequestsAdmin: ["withdrawal-requests-admin"] as const,
  pendingWithdrawals: ["pending-withdrawals"] as const,
  withdrawalDetails: (id: string) => ["withdrawal-details", id] as const,
  withdrawalStats: ["withdrawal-stats"] as const,

  // ============ Deposits ============
  deposits: ["deposits"] as const,
  depositsAdmin: ["deposits-admin"] as const,
  depositStats: ["deposit-stats"] as const,

  // ============ Dashboard ============
  dashboardStats: ["dashboard-stats"] as const,
  adminDashboard: ["admin-dashboard"] as const,

  // ============ IB (Introducing Broker) ============
  ibSettings: ["ib-settings"] as const,
  ibSettingsInvestor: (investorId: string) => ["ib-settings", investorId] as const,
  ibProfile: (userId?: string) => userId
    ? ["ib-profile", userId] as const
    : ["ib-profile"] as const,
  ibReferrals: (ibId?: string) => ibId 
    ? ["ib-referrals", ibId] as const 
    : ["ib-referrals"] as const,
  ibCommissions: (ibId?: string) => ibId 
    ? ["ib-commissions", ibId] as const 
    : ["ib-commissions"] as const,
  ibCommissionSummary: ["ib-commission-summary"] as const,
  adminIbPayouts: ["admin-ib-payouts"] as const,

  // ============ Reports & Statements ============
  reports: ["reports"] as const,
  statements: ["statements"] as const,
  statementsAdmin: ["statements-admin"] as const,
  statementsMonth: (month: string) => ["statements", month] as const,
  statementPeriods: ["statement-periods"] as const,
  statementPeriodsWithCounts: ["statement-periods-with-counts"] as const,
  generatedStatements: (filters?: Record<string, unknown>) => 
    filters ? ["generated-statements", filters] as const : ["generated-statements"] as const,
  investorStatements: (investorId: string, limit?: number) => 
    limit ? ["investor-statements", investorId, limit] as const : ["investor-statements", investorId] as const,
  periodStatementCount: (periodId: string) => ["period-statement-count", periodId] as const,

  // ============ Deliveries ============
  deliveries: (periodId?: string, filters?: Record<string, unknown>) => 
    periodId ? ["deliveries", periodId, filters] as const : ["deliveries"] as const,
  deliveryStats: (periodId: string) => ["delivery-stats", periodId] as const,

  // ============ Month Closure ============
  monthClosure: (fundId: string, month: string) => ["month-closure", fundId, month] as const,

  // ============ Assets ============
  assets: ["assets"] as const,
  assetStats: ["asset-stats"] as const,
  assetPrices: (assetId: string) => ["asset-prices", assetId] as const,
  latestPrice: (assetId: string) => ["latest-price", assetId] as const,

  // ============ Daily Rates ============
  dailyRate: (date?: string) => date 
    ? ["daily-rate", date] as const 
    : ["daily-rate"] as const,
  recentDailyRates: ["recent-daily-rates"] as const,

  // ============ Admin Invites ============
  adminInvites: ["admin-invites"] as const,

  // ============ Integrity & System ============
  integrityDashboard: ["integrity-dashboard"] as const,
  auditLog: ["audit-log"] as const,

  // ============ Profiles ============
  profiles: ["profiles"] as const,
  profile: (id: string) => ["profile", id] as const,
} as const;

/**
 * Helper function to invalidate all yield-related queries
 * Use after any yield distribution operation
 */
export const YIELD_RELATED_KEYS = [
  QUERY_KEYS.yieldRecords,
  QUERY_KEYS.investorPositions(),
  QUERY_KEYS.transactions,
  QUERY_KEYS.adminTransactions,
  QUERY_KEYS.dashboardStats,
  QUERY_KEYS.feeAllocations(),
  QUERY_KEYS.ibAllocations(),
  QUERY_KEYS.fundDailyAum(),
];

/**
 * Helper function to invalidate all investor-related queries
 * Use after any investor balance change
 */
export const INVESTOR_RELATED_KEYS = [
  QUERY_KEYS.investors,
  QUERY_KEYS.investorList,
  QUERY_KEYS.investorPositions(),
  QUERY_KEYS.transactions,
  QUERY_KEYS.dashboardStats,
];

/**
 * Helper for statement-related queries
 */
export const STATEMENT_RELATED_KEYS = [
  QUERY_KEYS.statements,
  QUERY_KEYS.statementsAdmin,
  QUERY_KEYS.statementPeriods,
  QUERY_KEYS.reports,
];

/**
 * Helper for delivery-related queries
 */
export const DELIVERY_RELATED_KEYS = [
  QUERY_KEYS.deliveries(),
];

/**
 * Helper for asset-related queries
 */
export const ASSET_RELATED_KEYS = [
  QUERY_KEYS.assets,
  QUERY_KEYS.assetStats,
];

/**
 * Helper for withdrawal-related queries
 */
export const WITHDRAWAL_RELATED_KEYS = [
  QUERY_KEYS.withdrawals,
  QUERY_KEYS.withdrawalRequests,
  QUERY_KEYS.withdrawalRequestsAdmin,
  QUERY_KEYS.pendingWithdrawals,
  QUERY_KEYS.withdrawalStats,
];
