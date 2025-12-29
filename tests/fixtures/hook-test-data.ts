/**
 * Hook Test Fixtures
 * Type-safe mock data for hook integration tests
 */

// ============ User Fixtures ============
export const mockAuthenticatedUser = {
  id: "user-123",
  email: "test@example.com",
};

export const mockAdminUser = {
  id: "admin-456",
  email: "admin@example.com",
  role: "admin",
};

// ============ Transaction Fixtures (useRecentInvestorTransactions) ============
export const mockRecentTransactions = [
  { id: "tx-1", type: "deposit", amount: 10000, asset: "USDC", tx_date: "2024-01-15" },
  { id: "tx-2", type: "interest", amount: 85.5, asset: "USDC", tx_date: "2024-01-31" },
  { id: "tx-3", type: "withdrawal", amount: -5000, asset: "USDC", tx_date: "2024-02-01" },
  { id: "tx-4", type: "deposit", amount: 25000, asset: "USDC", tx_date: "2024-02-15" },
  { id: "tx-5", type: "interest", amount: 120.75, asset: "USDC", tx_date: "2024-02-28" },
];

// ============ Withdrawal Fixtures (usePendingWithdrawalsCount) ============
export const mockWithdrawalRequests = [
  { id: "wd-1", investor_id: "user-123", status: "pending" },
  { id: "wd-2", investor_id: "user-123", status: "processing" },
  { id: "wd-3", investor_id: "user-123", status: "completed" },
];

// ============ Statement Period Fixtures (useLastStatementPeriod) ============
export const mockPerformanceWithPeriod = {
  period: { period_name: "January 2024" },
};

export const mockStatementPeriods = [
  { id: "period-2024-01", period_name: "January 2024", start_date: "2024-01-01", end_date: "2024-01-31" },
  { id: "period-2023-12", period_name: "December 2023", start_date: "2023-12-01", end_date: "2023-12-31" },
];

// ============ Investor Summary Fixtures (useUnifiedInvestors) ============
export const mockInvestorSummaries = [
  { 
    id: "inv-1", 
    first_name: "John", 
    last_name: "Doe", 
    email: "john@test.com", 
    status: "active",
    account_type: "individual",
    ib_parent_id: "ib-parent-1",
  },
  { 
    id: "inv-2", 
    first_name: "Jane", 
    last_name: "Smith", 
    email: "jane@test.com", 
    status: "active",
    account_type: "corporate",
    ib_parent_id: null,
  },
];

// ============ Asset Fixtures ============
export const mockAssets = [
  { id: 1, symbol: "USDC", name: "USD Coin", is_active: true, decimal_places: 2 },
  { id: 2, symbol: "BTC", name: "Bitcoin", is_active: true, decimal_places: 8 },
  { id: 3, symbol: "ETH", name: "Ethereum", is_active: true, decimal_places: 8 },
];

// ============ Fund Fixtures ============
export const mockFunds = [
  { id: "fund-1", code: "ALPHA", name: "Alpha Fund", asset: "USDC", status: "active" },
  { id: "fund-2", code: "BETA", name: "Beta Fund", asset: "USDC", status: "active" },
  { id: "fund-3", code: "GAMMA", name: "Gamma Fund", asset: "BTC", status: "active" },
];

// ============ Position Fixtures ============
export const mockInvestorPositions = [
  { investor_id: "inv-1", fund_id: "fund-1", shares: 1000, current_value: 10000 },
  { investor_id: "inv-1", fund_id: "fund-2", shares: 500, current_value: 5000 },
  { investor_id: "inv-2", fund_id: "fund-1", shares: 2500, current_value: 25000 },
];

// ============ Enrichment Data Fixtures (useUnifiedInvestors) ============
export const mockEnrichmentData = {
  withdrawals: [
    { investor_id: "inv-1" },
    { investor_id: "inv-1" },
  ],
  activities: [
    { id: "inv-1", last_activity_at: "2024-01-15T10:30:00Z" },
    { id: "inv-2", last_activity_at: "2024-01-10T08:00:00Z" },
  ],
  reports: [
    { investor_id: "inv-1", period_id: "period-2024-01", created_at: "2024-01-31T12:00:00Z" },
  ],
  ibParents: [
    { id: "inv-1", ib_parent_id: "ib-parent-1" },
  ],
  parentProfiles: [
    { id: "ib-parent-1", first_name: "Parent", last_name: "IB" },
  ],
};

// ============ Report Fixtures (useAdminInvestorReports) ============
export const mockInvestorReportSummary = {
  reports: [
    { 
      investor_id: "inv-1", 
      investor_name: "John Doe", 
      total_value: 100000, 
      mtd_yield: 0.85,
      fund_name: "Alpha Fund",
    },
    { 
      investor_id: "inv-2", 
      investor_name: "Jane Smith", 
      total_value: 250000, 
      mtd_yield: 0.92,
      fund_name: "Beta Fund",
    },
  ],
  periodId: "period-2024-01",
};

export const mockEmptyReportSummary = {
  reports: [],
  periodId: "",
};

// ============ Fund Performance Response (useGenerateFundPerformance) ============
export const mockFundPerformanceResponse = {
  success: true,
  recordsCreated: 15,
  message: "Generated 15 performance records",
};

export const mockFundPerformanceError403 = {
  success: false,
  error: "403 Forbidden - ADMIN_REQUIRED",
};

export const mockFundPerformanceError401 = {
  success: false,
  error: "401 Unauthorized - token expired",
};

// ============ Investor List Fixtures (useInvestorList) ============
export const mockInvestorListItems = [
  { 
    id: "inv-1", 
    email: "john@test.com", 
    first_name: "John", 
    last_name: "Doe",
    status: "active", 
    is_admin: false, 
    account_type: "individual", 
    created_at: "2024-01-01T00:00:00Z",
  },
  { 
    id: "inv-2", 
    email: "jane@test.com", 
    first_name: "Jane", 
    last_name: "Smith",
    status: "active", 
    is_admin: false, 
    account_type: "corporate", 
    created_at: "2024-01-15T00:00:00Z",
  },
  { 
    id: "inv-3", 
    email: "bob@test.com", 
    first_name: "Bob", 
    last_name: "Wilson",
    status: "inactive", 
    is_admin: false, 
    account_type: "individual", 
    created_at: "2024-02-01T00:00:00Z",
  },
];

// ============ Quick View Fixtures ============
export const mockQuickViewData = {
  positions: [
    { fund_id: "fund-1", fund_name: "Alpha Fund", fund_code: "ALPHA", shares: 1000, current_value: 10000 },
  ],
  totalAum: 10000,
  activeFundsCount: 1,
  pendingWithdrawalsCount: 2,
  hasIbLinked: true,
  hasFeeSchedule: true,
  lastReportPeriod: "Jan 2024",
};

// ============ Recent Activity Fixtures ============
export const mockRecentActivity = [
  { id: "act-1", type: "transaction", amount: 5000, date: "2024-01-15", description: "deposit" },
  { id: "act-2", type: "withdrawal", amount: 1000, date: "2024-01-10", description: "Withdrawal Request", status: "pending" },
];
