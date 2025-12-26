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
  fundDailyAum: (fundId?: string) => fundId 
    ? ["fund-daily-aum", fundId] as const 
    : ["fund-daily-aum"] as const,

  // ============ Investors ============
  investors: ["investors"] as const,
  investor: (id: string) => ["investor", id] as const,
  investorPositions: (fundId?: string) => fundId 
    ? ["investor-positions", fundId] as const 
    : ["investor-positions"] as const,
  investorDetail: (id: string) => ["investor-detail", id] as const,

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
  pendingWithdrawals: ["pending-withdrawals"] as const,

  // ============ Dashboard ============
  dashboardStats: ["dashboard-stats"] as const,
  adminDashboard: ["admin-dashboard"] as const,

  // ============ IB (Introducing Broker) ============
  ibSettings: ["ib-settings"] as const,
  ibReferrals: (ibId?: string) => ibId 
    ? ["ib-referrals", ibId] as const 
    : ["ib-referrals"] as const,
  ibCommissions: (ibId?: string) => ibId 
    ? ["ib-commissions", ibId] as const 
    : ["ib-commissions"] as const,

  // ============ Reports & Statements ============
  reports: ["reports"] as const,
  statements: ["statements"] as const,
  statementPeriods: ["statement-periods"] as const,

  // ============ Month Closure ============
  monthClosure: (fundId: string, month: string) => ["month-closure", fundId, month] as const,

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
  QUERY_KEYS.investorPositions(),
  QUERY_KEYS.transactions,
  QUERY_KEYS.dashboardStats,
];
