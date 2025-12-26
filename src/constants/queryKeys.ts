/**
 * Centralized Query Keys
 * Single source of truth for all React Query cache keys
 * Ensures consistent cache invalidation across the application
 */

export const QUERY_KEYS = {
  // ============ Funds ============
  funds: ["funds"] as const,
  activeFunds: ["active-funds"] as const,
  fund: (id: string) => ["funds", id] as const,
  fundAum: (fundId?: string) => fundId 
    ? ["fund-aum", fundId] as const 
    : ["fund-aum"] as const,
  fundAumAll: ["fund-aum"] as const,
  fundAumUnified: ["fund-aum-unified"] as const,
  fundAumCheck: (fundId: string, date: string) => ["fund-aum-check", fundId, date] as const,
  fundDailyAum: (fundId?: string) => fundId 
    ? ["fund-daily-aum", fundId] as const 
    : ["fund-daily-aum"] as const,
  fundsForDeposits: ["funds-for-deposits"] as const,
  fundsWithAum: (fundIds?: string[]) => fundIds 
    ? ["funds-with-aum", fundIds] as const 
    : ["funds-with-aum"] as const,
  aumExists: (fundId: string, txDate: string) => ["aum-exists", fundId, txDate] as const,

  // ============ Investors ============
  investors: ["investors"] as const,
  investorList: ["investor-list"] as const,
  investorsAll: ["investors-all"] as const,
  investorsSelector: (includeSystem?: boolean) => includeSystem !== undefined
    ? ["investors-selector", includeSystem] as const
    : ["investors-selector"] as const,
  investor: (id: string) => ["investor", id] as const,
  investorPositions: (investorId?: string) => investorId 
    ? ["investor-positions", investorId] as const 
    : ["investor-positions"] as const,
  investorDetail: (id: string) => ["investor-detail", id] as const,
  investorQuickView: (id: string) => ["investor-quick-view", id] as const,
  investorLedger: (id?: string) => id
    ? ["investor-ledger", id] as const
    : ["investor-ledger"] as const,
  investorRecentActivity: (id: string, limit?: number) => limit
    ? ["investor-recent-activity", id, limit] as const
    : ["investor-recent-activity", id] as const,
  investorOverview: (id: string) => ["investor-overview", id] as const,
  investorDefaultFund: (id: string) => ["investor-default-fund", id] as const,
  investorBalance: (investorId: string, fundId: string) => 
    ["investor-balance", investorId, fundId] as const,
  investorPerformance: (assetCode?: string) => assetCode 
    ? ["investor-performance", assetCode] as const 
    : ["investor-performance"] as const,
  investorAssetStats: (investorId?: string) => investorId 
    ? ["investor-asset-stats", investorId] as const 
    : ["investor-asset-stats"] as const,
  investorFundPerformance: (searchTerm?: string) => searchTerm 
    ? ["investor_fund_performance", searchTerm] as const 
    : ["investor_fund_performance"] as const,
  investorFundPerformanceDetail: (id: string) => ["investor_fund_performance", id] as const,
  investorPositionsForRoute: (investorId: string) => ["investor-positions-for-route", investorId] as const,
  investorDocuments: ["investor-documents"] as const,
  perAssetStats: ["per-asset-stats"] as const,

  // ============ Transactions ============
  transactions: (filters?: unknown) => filters 
    ? ["transactions", filters] as const 
    : ["transactions"] as const,
  adminTransactions: ["admin-transactions-history"] as const,
  adminTransactionsHistory: (filters?: Record<string, unknown>) => 
    filters ? ["admin-transactions-history", filters] as const : ["admin-transactions-history"] as const,
  investorTransactions: (investorId: string, limit?: number) => limit 
    ? ["investor-transactions", investorId, limit] as const 
    : ["investor-transactions", investorId] as const,
  pendingTransactions: (searchTerm?: string) => searchTerm 
    ? ["pending-transactions", searchTerm] as const 
    : ["pending-transactions"] as const,
  recentTransactions: ["recent-transactions"] as const,
  transactionAssets: (userId?: string) => userId 
    ? ["transaction-assets", userId] as const 
    : ["transaction-assets"] as const,
  transactionsV2: (searchTerm?: string) => searchTerm 
    ? ["transactions-v2", searchTerm] as const 
    : ["transactions-v2"] as const,
  pendingTransactionDetails: (type: string, id: string) => 
    ["pending-transaction-details", type, id] as const,

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
  withdrawalRequests: (searchTerm?: string) => searchTerm 
    ? ["withdrawal_requests", searchTerm] as const 
    : ["withdrawal_requests"] as const,
  withdrawalRequestsAdmin: ["withdrawal-requests-admin"] as const,
  pendingWithdrawals: ["pending-withdrawals"] as const,
  pendingWithdrawalsCount: ["pending-withdrawals-count"] as const,
  withdrawalDetails: (id: string) => ["withdrawal-details", id] as const,
  withdrawalStats: ["withdrawal-stats"] as const,
  withdrawalAuditLogs: (id: string) => ["withdrawal-audit-logs", id] as const,
  withdrawalHistory: (userId?: string) => userId 
    ? ["withdrawal-history", userId] as const 
    : ["withdrawal-history"] as const,

  // ============ Deposits ============
  deposits: ["deposits"] as const,
  depositsAdmin: ["deposits-admin"] as const,
  depositStats: ["deposit-stats"] as const,
  usersForDeposits: ["users-for-deposits"] as const,

  // ============ Dashboard ============
  dashboardStats: ["dashboard-stats"] as const,
  adminDashboard: ["admin-dashboard"] as const,

  // ============ IB (Introducing Broker) ============
  ibSettings: ["ib-settings"] as const,
  ibSettingsInvestor: (investorId: string) => ["ib-settings", investorId] as const,
  ibProfile: (userId?: string) => userId
    ? ["ib-profile", userId] as const
    : ["ib-profile"] as const,
  ibReferrals: (ibId?: string, page?: number) => {
    if (ibId && page !== undefined) return ["ib-referrals", ibId, page] as const;
    if (ibId) return ["ib-referrals", ibId] as const;
    return ["ib-referrals"] as const;
  },
  ibReferralDetail: (id: string, userId: string) => ["ib-referral-detail", id, userId] as const,
  ibReferralPositions: (id: string) => ["ib-referral-positions", id] as const,
  ibReferralCommissions: (id: string, userId: string) => 
    ["ib-referral-commissions", id, userId] as const,
  ibReferralCount: (userId: string) => ["ib-referral-count", userId] as const,
  ibCommissions: (userId?: string, page?: number, dateRange?: string) => {
    if (userId && page !== undefined) return ["ib-commissions", userId, page, dateRange] as const;
    if (userId) return ["ib-commissions", userId] as const;
    return ["ib-commissions"] as const;
  },
  ibCommissionSummary: ["ib-commission-summary"] as const,
  ibTopReferrals: (userId: string, period?: string) => period 
    ? ["ib-top-referrals", userId, period] as const 
    : ["ib-top-referrals", userId] as const,
  ibPositions: (userId: string) => ["ib-positions", userId] as const,
  ibPayoutHistory: (userId: string, page?: number) => page !== undefined 
    ? ["ib-payout-history", userId, page] as const 
    : ["ib-payout-history", userId] as const,
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
  monthlyStatements: (year?: number, asset?: string) => 
    ["monthly-statements", year, asset] as const,
  statementYears: ["statement-years"] as const,
  statementAssets: ["statement-assets"] as const,
  statementDeliveryStatus: (statementId?: string, investorId?: string, periodId?: string) => 
    ["statement-delivery-status", statementId, investorId, periodId] as const,
  lastStatementPeriod: ["last-statement-period"] as const,

  // ============ Deliveries ============
  deliveries: (periodId?: string, filters?: Record<string, unknown>) => 
    periodId ? ["deliveries", periodId, filters] as const : ["deliveries"] as const,
  deliveryStats: (periodId: string) => ["delivery-stats", periodId] as const,
  deliveryExclusionBreakdown: (periodId: string) => ["delivery-exclusion-breakdown", periodId] as const,
  deliveryDiagnostics: (periodId: string) => ["delivery-diagnostics", periodId] as const,

  // ============ Month Closure ============
  monthClosure: (fundId: string, month: string) => ["month-closure", fundId, month] as const,

  // ============ Assets ============
  assets: (filters?: Record<string, unknown>) => filters 
    ? ["assets", filters] as const 
    : ["assets"] as const,
  assetsActive: ["assets-active"] as const,
  assetStats: ["asset-stats"] as const,
  assetPrices: (assetId: string) => ["asset-prices", assetId] as const,
  latestPrice: (assetId: string) => ["latest-price", assetId] as const,
  userAssets: ["user-assets"] as const,
  assetMeta: (assetCode: string) => ["asset-meta", assetCode] as const,

  // ============ Daily Rates ============
  dailyRate: (date?: string) => date 
    ? ["daily-rate", date] as const 
    : ["daily-rate"] as const,
  recentDailyRates: ["recent-daily-rates"] as const,

  // ============ Admin Invites ============
  adminInvites: ["admin-invites"] as const,

  // ============ Admin Settings ============
  platformSettings: ["platform-settings"] as const,
  adminInvestors: ["admin-investors"] as const,
  ibs: ["ibs"] as const,

  // ============ User & Auth ============
  userRoles: (userId?: string) => userId 
    ? ["user-roles", userId] as const 
    : ["user-roles"] as const,
  userIbRole: (userId?: string) => userId 
    ? ["user-ib-role", userId] as const 
    : ["user-ib-role"] as const,

  // ============ Integrity & System ============
  integrityDashboard: ["integrity-dashboard"] as const,
  integrityAuditEvents: ["integrity-audit-events"] as const,
  dataIntegrity: ["data-integrity"] as const,
  auditLog: ["audit-log"] as const,
  pendingActions: ["pending-actions"] as const,
  systemHealth: ["system-health"] as const,
  deliveryQueueMetrics: ["delivery-queue-metrics"] as const,

  // ============ Portfolio ============
  portfolioPositions: ["portfolio-positions"] as const,
  finalizedPortfolio: ["finalized-portfolio"] as const,
  availableWithdrawalPositions: ["available-withdrawal-positions"] as const,

  // ============ Reports Generation ============
  activeInvestors: ["active-investors"] as const,

  // ============ Email ============
  emailStats: ["email-stats"] as const,
  emailDeliveries: (filters?: Record<string, unknown>) => filters 
    ? ["email-deliveries", filters] as const 
    : ["email-deliveries"] as const,

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
  QUERY_KEYS.transactions(),
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
  QUERY_KEYS.transactions(),
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
  QUERY_KEYS.assets(),
  QUERY_KEYS.assetStats,
];

/**
 * Helper for withdrawal-related queries
 */
export const WITHDRAWAL_RELATED_KEYS = [
  QUERY_KEYS.withdrawals,
  QUERY_KEYS.withdrawalRequests(),
  QUERY_KEYS.withdrawalRequestsAdmin,
  QUERY_KEYS.pendingWithdrawals,
  QUERY_KEYS.withdrawalStats,
];
