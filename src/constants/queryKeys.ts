/**
 * Centralized Query Keys
 * Single source of truth for all React Query cache keys
 * Ensures consistent cache invalidation across the application
 * 
 * ## Naming Conventions
 * 
 * 1. Use kebab-case for base keys: "investor-positions"
 * 2. Group related keys under namespaces where beneficial
 * 3. Use factory functions for parameterized keys
 * 4. Always return `as const` for type safety
 * 5. Prefer singular base with modifiers: investors.all, investors.detail(id)
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

  // ============ Investors (Unified Namespace) ============
  /**
   * Investor query keys - consolidated namespace
   */
  investorsList: ["investors", "list"] as const,
  investorsSelector: (includeSystem?: boolean) => includeSystem !== undefined
    ? ["investors", "selector", includeSystem] as const
    : ["investors", "selector"] as const,
  investor: (id: string) => ["investors", "detail", id] as const,
  investorPositions: (investorId?: string) => investorId 
    ? ["investors", "positions", investorId] as const 
    : ["investors", "positions"] as const,
  investorDetail: (id: string) => ["investors", "detail", id] as const,
  investorQuickView: (id: string) => ["investors", "quick-view", id] as const,
  investorLedger: (id?: string) => id
    ? ["investors", "ledger", id] as const
    : ["investors", "ledger"] as const,
  investorRecentActivity: (id: string, limit?: number) => limit
    ? ["investors", "recent-activity", id, limit] as const
    : ["investors", "recent-activity", id] as const,
  investorOverview: (id: string) => ["investors", "overview", id] as const,
  investorDefaultFund: (id: string) => ["investors", "default-fund", id] as const,
  investorBalance: (investorId: string, fundId: string) => 
    ["investors", "balance", investorId, fundId] as const,
  investorPerformance: (assetCode?: string) => assetCode 
    ? ["investors", "performance", assetCode] as const 
    : ["investors", "performance"] as const,
  investorAssetStats: (investorId?: string) => investorId 
    ? ["investors", "asset-stats", investorId] as const 
    : ["investors", "asset-stats"] as const,
  investorFundPerformance: (searchTerm?: string) => searchTerm 
    ? ["investors", "fund-performance", searchTerm] as const 
    : ["investors", "fund-performance"] as const,
  investorFundPerformanceDetail: (id: string) => ["investors", "fund-performance", id] as const,
  investorPositionsForRoute: (investorId: string) => ["investors", "positions-for-route", investorId] as const,
  investorDocuments: ["investors", "documents"] as const,
  perAssetStats: ["investors", "per-asset-stats"] as const,
  unifiedInvestors: ["investors", "unified"] as const,
  adminInvestors: ["investors", "admin"] as const,

  // ============ Transactions (Unified Namespace) ============
  /**
   * Transaction query keys - consolidated
   * Base key ["transactions"] is the root for all transaction queries
   */
  transactions: (filters?: unknown) => filters 
    ? ["transactions", "list", filters] as const 
    : ["transactions"] as const,
  adminTransactionsHistory: (filters?: Record<string, unknown>) => 
    filters ? ["transactions", "admin-history", filters] as const : ["transactions", "admin-history"] as const,
  investorTransactions: (investorId: string, limit?: number) => limit 
    ? ["transactions", "investor", investorId, limit] as const 
    : ["transactions", "investor", investorId] as const,
  pendingTransactions: (searchTerm?: string) => searchTerm 
    ? ["transactions", "pending", searchTerm] as const 
    : ["transactions", "pending"] as const,
  recentTransactions: ["transactions", "recent"] as const,
  transactionAssets: (userId?: string) => userId 
    ? ["transactions", "assets", userId] as const 
    : ["transactions", "assets"] as const,
  transactionsV2: (searchTerm?: string) => searchTerm 
    ? ["transactions", "v2", searchTerm] as const 
    : ["transactions", "v2"] as const,
  pendingTransactionDetails: (type: string, id: string) => 
    ["transactions", "pending-details", type, id] as const,

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

  // ============ Withdrawals (Unified) ============
  withdrawals: ["withdrawals"] as const,
  /** Fixed: using kebab-case consistently */
  withdrawalRequests: (searchTerm?: string) => searchTerm 
    ? ["withdrawals", "requests", searchTerm] as const 
    : ["withdrawals", "requests"] as const,
  withdrawalRequestsAdmin: ["withdrawals", "requests-admin"] as const,
  pendingWithdrawals: ["withdrawals", "pending"] as const,
  pendingWithdrawalsCount: ["withdrawals", "pending-count"] as const,
  withdrawalDetails: (id: string) => ["withdrawals", "details", id] as const,
  withdrawalStats: ["withdrawals", "stats"] as const,
  withdrawalAuditLogs: (id: string) => ["withdrawals", "audit-logs", id] as const,
  withdrawalHistory: (userId?: string) => userId 
    ? ["withdrawals", "history", userId] as const 
    : ["withdrawals", "history"] as const,

  // ============ Deposits ============
  deposits: ["deposits"] as const,
  depositsAdmin: ["deposits", "admin"] as const,
  depositStats: ["deposits", "stats"] as const,
  usersForDeposits: ["deposits", "users"] as const,

  // ============ Dashboard ============
  dashboardStats: ["dashboard", "stats"] as const,
  adminDashboard: ["dashboard", "admin"] as const,

  // ============ IB (Introducing Broker) ============
  ibSettings: ["ib", "settings"] as const,
  ibSettingsInvestor: (investorId: string) => ["ib", "settings", investorId] as const,
  ibProfile: (userId?: string) => userId
    ? ["ib", "profile", userId] as const
    : ["ib", "profile"] as const,
  ibReferrals: (ibId?: string, page?: number) => {
    if (ibId && page !== undefined) return ["ib", "referrals", ibId, page] as const;
    if (ibId) return ["ib", "referrals", ibId] as const;
    return ["ib", "referrals"] as const;
  },
  ibReferralDetail: (id: string, userId: string) => ["ib", "referral-detail", id, userId] as const,
  ibReferralPositions: (id: string) => ["ib", "referral-positions", id] as const,
  ibReferralCommissions: (id: string, userId: string) => 
    ["ib", "referral-commissions", id, userId] as const,
  ibReferralCount: (userId: string) => ["ib", "referral-count", userId] as const,
  ibCommissions: (userId?: string, page?: number, dateRange?: string) => {
    if (userId && page !== undefined) return ["ib", "commissions", userId, page, dateRange] as const;
    if (userId) return ["ib", "commissions", userId] as const;
    return ["ib", "commissions"] as const;
  },
  ibCommissionSummary: ["ib", "commission-summary"] as const,
  ibTopReferrals: (userId: string, period?: string) => period 
    ? ["ib", "top-referrals", userId, period] as const 
    : ["ib", "top-referrals", userId] as const,
  ibPositions: (userId: string) => ["ib", "positions", userId] as const,
  ibPayoutHistory: (userId: string, page?: number) => page !== undefined 
    ? ["ib", "payout-history", userId, page] as const 
    : ["ib", "payout-history", userId] as const,
  adminIbPayouts: (statusFilter?: string) => statusFilter 
    ? ["ib", "admin-payouts", statusFilter] as const 
    : ["ib", "admin-payouts"] as const,
  investorsSummary: ["investors", "summary"] as const,

  // ============ Reports & Statements ============
  reports: ["reports"] as const,
  statements: ["statements"] as const,
  statementsAdmin: ["statements", "admin"] as const,
  statementsMonth: (month: string) => ["statements", "month", month] as const,
  statementPeriods: ["statements", "periods"] as const,
  statementPeriodsWithCounts: ["statements", "periods-with-counts"] as const,
  generatedStatements: (filters?: Record<string, unknown>) => 
    filters ? ["statements", "generated", filters] as const : ["statements", "generated"] as const,
  investorStatements: (investorId: string, limit?: number) => 
    limit ? ["statements", "investor", investorId, limit] as const : ["statements", "investor", investorId] as const,
  periodStatementCount: (periodId: string) => ["statements", "period-count", periodId] as const,
  monthlyStatements: (year?: number, asset?: string) => 
    ["statements", "monthly", year, asset] as const,
  statementYears: ["statements", "years"] as const,
  statementAssets: ["statements", "assets"] as const,
  statementDeliveryStatus: (statementId?: string, investorId?: string, periodId?: string) => 
    ["statements", "delivery-status", statementId, investorId, periodId] as const,
  lastStatementPeriod: ["statements", "last-period"] as const,

  // ============ Deliveries ============
  deliveries: (periodId?: string, filters?: Record<string, unknown>) => 
    periodId ? ["deliveries", periodId, filters] as const : ["deliveries"] as const,
  deliveryStats: (periodId: string) => ["deliveries", "stats", periodId] as const,
  deliveryExclusionBreakdown: (periodId: string) => ["deliveries", "exclusion-breakdown", periodId] as const,
  deliveryDiagnostics: (periodId: string) => ["deliveries", "diagnostics", periodId] as const,

  // ============ Month Closure ============
  monthClosure: (fundId: string, month: string) => ["month-closure", fundId, month] as const,

  // ============ Assets ============
  assets: (filters?: Record<string, unknown>) => filters 
    ? ["assets", filters] as const 
    : ["assets"] as const,
  assetsActive: ["assets", "active"] as const,
  assetStats: ["assets", "stats"] as const,
  assetPrices: (assetId: string) => ["assets", "prices", assetId] as const,
  latestPrice: (assetId: string) => ["assets", "latest-price", assetId] as const,
  userAssets: ["assets", "user"] as const,
  assetMeta: (assetCode: string) => ["assets", "meta", assetCode] as const,


  // ============ Admin Invites ============
  adminInvites: ["admin", "invites"] as const,

  // ============ Admin Settings ============
  platformSettings: ["admin", "platform-settings"] as const,
  ibs: ["admin", "ibs"] as const,

  // ============ User & Auth ============
  userRoles: (userId?: string) => userId 
    ? ["user", "roles", userId] as const 
    : ["user", "roles"] as const,
  userIbRole: (userId?: string) => userId 
    ? ["user", "ib-role", userId] as const 
    : ["user", "ib-role"] as const,

  // ============ Integrity & System ============
  integrityDashboard: ["integrity", "dashboard"] as const,
  integrityAuditEvents: ["integrity", "audit-events"] as const,
  dataIntegrity: ["integrity", "data"] as const,
  auditLog: ["audit-log"] as const,
  pendingActions: ["system", "pending-actions"] as const,
  systemHealth: ["system", "health"] as const,
  deliveryQueueMetrics: ["system", "delivery-queue-metrics"] as const,

  // ============ Portfolio ============
  portfolioPositions: ["portfolio", "positions"] as const,
  finalizedPortfolio: ["portfolio", "finalized"] as const,
  availableWithdrawalPositions: ["portfolio", "available-withdrawal-positions"] as const,

  // ============ Reports Generation ============
  activeInvestors: ["reports", "active-investors"] as const,

  // ============ Email ============
  emailStats: ["email", "stats"] as const,
  emailDeliveries: (filters?: Record<string, unknown>) => filters 
    ? ["email", "deliveries", filters] as const 
    : ["email", "deliveries"] as const,

  // ============ Profiles ============
  profiles: ["profiles"] as const,
  profile: (id: string) => ["profiles", id] as const,

  // ============ Admin Fees ============
  adminFeesOverview: ["admin", "fees-overview"] as const,

  // ============ Positions ============
  positions: (investorId?: string) => investorId 
    ? ["positions", investorId] as const 
    : ["positions"] as const,

  // ============ Yield Crystallization ============
  fundYieldEvents: (fundId?: string, options?: unknown) => options
    ? ["fund-yield-events", fundId, options] as const
    : fundId 
      ? ["fund-yield-events", fundId] as const 
      : ["fund-yield-events"] as const,
  investorYieldEventsAdmin: (investorId?: string, options?: unknown) => options
    ? ["investor-yield-events-admin", investorId, options] as const
    : investorId
      ? ["investor-yield-events-admin", investorId] as const
      : ["investor-yield-events-admin"] as const,
  fundYieldSnapshots: (fundId?: string, limit?: number) => limit
    ? ["fund-yield-snapshots", fundId, limit] as const
    : fundId
      ? ["fund-yield-snapshots", fundId] as const
      : ["fund-yield-snapshots"] as const,
  pendingYieldEvents: (fundId?: string, year?: number, month?: number) => 
    ["pending-yield-events", fundId, year, month] as const,
  aggregatedYield: (fundId?: string, periodStart?: string, periodEnd?: string, filter?: string) =>
    ["aggregated-yield", fundId, periodStart, periodEnd, filter] as const,
  investorYieldEvents: ["investor-yield-events"] as const,

  // ============ Admin Investor Detail ============
  adminInvestorOpsIndicators: (investorId: string) => 
    ["admin", "investor", "opsIndicators", investorId] as const,
  adminInvestorPositions: (investorId: string) => 
    ["admin", "investor", "positions", investorId] as const,
  adminInvestorActivePositions: (investorId: string) => 
    ["admin", "investor", "activePositions", investorId] as const,
  adminInvestorPerformance: ["admin", "investor-performance"] as const,
  adminPendingWithdrawalsCount: (investorId: string) => 
    ["admin", "pending-withdrawals-count", investorId] as const,

  // ============ Command Palette ============
  adminInvestorSearch: ["admin", "investorSearch"] as const,

  // ============ Report Data ============
  historicalDataSummary: ["historical-data-summary"] as const,
  statementPeriodByDate: (year: number, month: number) => 
    ["statement-period", year, month] as const,
  investorReportData: (investorId: string, periodId: string) => 
    ["investor-report-data", investorId, periodId] as const,
  reportPositions: (investorId: string) => ["report-positions", investorId] as const,
  reportTransactions: (investorId: string, start?: string, end?: string) => 
    ["report-transactions", investorId, start, end] as const,
  reportStatements: (investorId: string, start?: string, end?: string) => 
    ["report-statements", investorId, start, end] as const,

  // ============ Portfolio (Investor) ============
  withdrawalFormPositions: ["withdrawalFormPositions"] as const,
  myWithdrawalsWithFunds: ["myWithdrawalsWithFunds"] as const,

  // ============ System Admin ============
  resetHistory: ["resetHistory"] as const,
  positionResetPreview: ["positionResetPreview"] as const,
  adminUsers: ["adminUsers"] as const,
  adminUsersWithRoles: ["adminUsersWithRoles"] as const,
  adminUsersAll: ["admin", "users", "all"] as const,
  adminSuperAdmin: (userId: string) => ["admin", "superAdmin", userId] as const,
  adminPendingCounts: ["admin", "pendingCounts"] as const,
  adminFundsActive: ["admin", "funds", "active"] as const,

  // ============ Operations Hub ============
  recentAuditLogs: (limit?: number) => limit !== undefined
    ? ["audit-logs", "recent", limit] as const
    : ["audit-logs", "recent"] as const,

  // ============ Dashboard Metrics ============
  financialMetrics: ["financial-metrics"] as const,
  historicalFlowData: (dateIso?: string) => dateIso
    ? ["historical-flow-data", dateIso] as const
    : ["historical-flow-data"] as const,
  fundComposition: (fundId?: string) => fundId
    ? ["fund-composition", fundId] as const
    : ["fund-composition"] as const,
  statementDelivery: ["statement-delivery"] as const,

  // ============ Reports ============
  adminInvestorReports: (month?: string) => month
    ? ["admin-investor-reports", month] as const
    : ["admin-investor-reports"] as const,
  latestPerformance: (investorId: string, assetCode: string) =>
    ["latest-performance", investorId, assetCode] as const,
  activeInvestorsStatements: ["active-investors-statements"] as const,
  investorMonthlyReports: (investorId: string) =>
    ["investorMonthlyReports", investorId] as const,

  // ============ Withdrawal Form ============
  investorOptions: ["investor-options"] as const,
  investorPositionsForWithdrawal: (investorId: string) =>
    ["investor-positions", investorId] as const,

  // ============ AUM Reconciliation ============
  aumReconciliation: (fundId?: string, tolerancePct?: number) => fundId
    ? ["aumReconciliation", fundId, tolerancePct] as const
    : ["aumReconciliation"] as const,

  // ============ Yield Operations ============
  activeFundsWithAUM: ["active-funds-with-aum"] as const,
  fundInvestorComposition: (fundId?: string) => fundId
    ? ["fundInvestorComposition", fundId] as const
    : ["fundInvestorComposition"] as const,

  // ============ Investor Yield (Investor-facing) ============
  investorYieldEventsInvestor: (investorId?: string, year?: number, month?: number, fundId?: string, limit?: number) =>
    ["investorYieldEvents", investorId, year, month, fundId, limit] as const,
  investorYieldSummary: (investorId?: string, year?: number, month?: number) =>
    ["investorYieldSummary", investorId, year, month] as const,
  investorCumulativeYield: (investorId?: string) =>
    ["investorCumulativeYield", investorId] as const,

  // ============ Investor Yield Data ============
  statementPeriodId: (year: number, month: number) =>
    ["statementPeriodId", year, month] as const,
  investorPositionsWithFunds: (investorId: string) =>
    ["investorPositionsWithFunds", investorId] as const,
  investorPerformanceForPeriod: (investorId: string, periodId?: string) =>
    ["investorPerformanceForPeriod", investorId, periodId] as const,
  investorFeeSchedule: (investorId: string) =>
    ["investorFeeSchedule", investorId] as const,

  // ============ Investor Portal ============
  investorProfile: (userId?: string) => userId
    ? ["investorProfile", userId] as const
    : ["investorProfile"] as const,
  userPreferences: (userId?: string) => userId
    ? ["userPreferences", userId] as const
    : ["userPreferences"] as const,
  activeSessions: (userId?: string) => userId
    ? ["activeSessions", userId] as const
    : ["activeSessions"] as const,
  accessLogs: (userId?: string, limit?: number) => limit !== undefined
    ? ["accessLogs", userId, limit] as const
    : ["accessLogs", userId] as const,

  // ============ Profile Settings ============
  personalInfo: (userId: string) => ["profile", "personalInfo", userId] as const,
  notificationPrefs: (userId: string) => ["profile", "notificationPrefs", userId] as const,
  userEmail: ["profile", "userEmail"] as const,
  localPreferences: ["profile", "localPreferences"] as const,

  // ============ Transaction History ============
  transactionHistory: (investorId?: string, fundId?: string) =>
    investorId && fundId
      ? ["transaction-history", investorId, fundId] as const
      : ["transaction-history"] as const,
} as const;

/**
 * Helper function to invalidate all yield-related queries
 * Use after any yield distribution operation
 */
export const YIELD_RELATED_KEYS = [
  QUERY_KEYS.yieldRecords,
  QUERY_KEYS.investorPositions(),
  QUERY_KEYS.transactions(),
  QUERY_KEYS.adminTransactionsHistory(),
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
  QUERY_KEYS.investorsList,
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
