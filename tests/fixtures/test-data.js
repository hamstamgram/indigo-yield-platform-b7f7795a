// Test fixtures for financial calculations
// Provides consistent sample data for all tests

export const sampleInvestors = [
  {
    id: "inv-001",
    first_name: "John",
    last_name: "Doe",
    email: "john.doe@example.com",
    is_admin: false,
    created_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "inv-002",
    first_name: "Jane",
    last_name: "Smith",
    email: "jane.smith@example.com",
    is_admin: false,
    created_at: "2024-01-15T00:00:00Z",
  },
  {
    id: "inv-003",
    first_name: "Admin",
    last_name: "User",
    email: "admin@indigo.fund",
    is_admin: true,
    created_at: "2024-01-01T00:00:00Z",
  },
];

export const samplePositions = [
  {
    id: "pos-001",
    investor_id: "inv-001",
    asset: "USDC",
    quantity: 10000,
    avg_cost: 1.0,
    current_value: 10000,
    date: "2024-01-01",
    created_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "pos-002",
    investor_id: "inv-001",
    asset: "USDT",
    quantity: 5000,
    avg_cost: 1.0,
    current_value: 5000,
    date: "2024-01-01",
    created_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "pos-003",
    investor_id: "inv-002",
    asset: "USDC",
    quantity: 25000,
    avg_cost: 1.0,
    current_value: 25000,
    date: "2024-01-01",
    created_at: "2024-01-15T00:00:00Z",
  },
];

export const sampleYields = [
  {
    id: "yield-001",
    investor_id: "inv-001",
    position_id: "pos-001",
    date: "2024-01-01",
    apr: 8.5,
    daily_rate: 0.0233, // 8.5% / 365
    interest_earned: 2.33,
    created_at: "2024-01-02T00:00:00Z",
  },
  {
    id: "yield-002",
    investor_id: "inv-001",
    position_id: "pos-002",
    date: "2024-01-01",
    apr: 7.2,
    daily_rate: 0.0197, // 7.2% / 365
    interest_earned: 0.99,
    created_at: "2024-01-02T00:00:00Z",
  },
];

export const yieldRates = {
  USDC: {
    current: 8.5,
    min: 6.0,
    max: 12.0,
    history: [
      { date: "2024-01-01", rate: 8.5 },
      { date: "2023-12-01", rate: 8.2 },
      { date: "2023-11-01", rate: 7.8 },
    ],
  },
  USDT: {
    current: 7.2,
    min: 5.5,
    max: 10.0,
    history: [
      { date: "2024-01-01", rate: 7.2 },
      { date: "2023-12-01", rate: 7.0 },
      { date: "2023-11-01", rate: 6.8 },
    ],
  },
};

export const transactionTypes = {
  DEPOSIT: "deposit",
  WITHDRAWAL: "withdrawal",
  INTEREST: "interest",
  FEE: "fee",
  ADJUSTMENT: "adjustment",
};

export const sampleTransactions = [
  {
    id: "tx-001",
    investor_id: "inv-001",
    type: transactionTypes.DEPOSIT,
    amount: 10000,
    asset: "USDC",
    date: "2024-01-01",
    status: "completed",
    created_at: "2024-01-01T10:00:00Z",
  },
  {
    id: "tx-002",
    investor_id: "inv-001",
    type: transactionTypes.DEPOSIT,
    amount: 5000,
    asset: "USDT",
    date: "2024-01-01",
    status: "completed",
    created_at: "2024-01-01T11:00:00Z",
  },
  {
    id: "tx-003",
    investor_id: "inv-001",
    type: transactionTypes.INTEREST,
    amount: 2.33,
    asset: "USDC",
    date: "2024-01-02",
    status: "completed",
    created_at: "2024-01-02T00:00:00Z",
  },
];

// Helper functions for test data generation
export function generatePosition(overrides = {}) {
  return {
    id: `pos-${Date.now()}`,
    investor_id: "inv-001",
    asset: "USDC",
    quantity: 10000,
    avg_cost: 1.0,
    current_value: 10000,
    date: new Date().toISOString().split("T")[0],
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

export function generateYield(position, apr, date = new Date()) {
  const dailyRate = apr / 365 / 100;
  const interestEarned = position.quantity * dailyRate;

  return {
    id: `yield-${Date.now()}`,
    investor_id: position.investor_id,
    position_id: position.id,
    date: date.toISOString().split("T")[0],
    apr,
    daily_rate: dailyRate,
    interest_earned: Number(interestEarned.toFixed(2)),
    created_at: new Date().toISOString(),
  };
}

export function calculateCompoundInterest(principal, rate, time, n = 365) {
  // A = P(1 + r/n)^(nt)
  // principal: initial amount
  // rate: annual rate as decimal (8.5% = 0.085)
  // time: time in years
  // n: number of times interest is compounded per year
  return principal * Math.pow(1 + rate / n, n * time);
}

export function calculateSimpleInterest(principal, rate, days) {
  // Simple interest = P * r * t
  // principal: initial amount
  // rate: annual rate as decimal
  // days: number of days
  return principal * rate * (days / 365);
}

export default {
  sampleInvestors,
  samplePositions,
  sampleYields,
  sampleTransactions,
  yieldRates,
  transactionTypes,
  generatePosition,
  generateYield,
  calculateCompoundInterest,
  calculateSimpleInterest,
};
