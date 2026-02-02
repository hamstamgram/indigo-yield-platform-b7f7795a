/**
 * Test World Fixture Definitions
 *
 * Defines constants and types for the QA test world:
 * - 8 test investors with various scenarios
 * - 2 test IBs (Introducing Brokers)
 * - 6 funds (IND-BTC, IND-ETH, IND-SOL, IND-USDT, IND-EURC, IND-XRP)
 */

// Type aliases for clarity
export type UUID = string;
export type ProfileId = UUID;
export type FundId = UUID;
export type TransactionType =
  | "deposit"
  | "withdrawal"
  | "yield_credit"
  | "fee_deduction"
  | "commission_payout"
  | "internal_route_in"
  | "internal_route_out";
export type FundSlug = "IND-BTC" | "IND-ETH" | "IND-SOL" | "IND-USDT" | "IND-EURC" | "IND-XRP";

/**
 * Fund configuration for test world
 */
export interface FundConfig {
  slug: FundSlug;
  name: string;
  currency: string;
  fundId?: FundId; // Populated at runtime
}

/**
 * Test investor configuration
 */
export interface TestInvestor {
  email: string;
  displayName: string;
  firstName: string;
  lastName: string;
  scenario: string;
  profileId?: ProfileId; // Populated after creation
  ibReferrerId?: ProfileId; // If referred by an IB
  deposits?: TestDeposit[];
  withdrawals?: TestWithdrawal[];
}

/**
 * Test IB (Introducing Broker) configuration
 */
export interface TestIB {
  email: string;
  displayName: string;
  firstName: string;
  lastName: string;
  commissionRate: number; // Percentage (e.g., 5 for 5%)
  profileId?: ProfileId; // Populated after creation
}

/**
 * Test deposit configuration
 */
export interface TestDeposit {
  fundSlug: FundSlug;
  amount: string; // Decimal string for precision
  effectiveDate: string; // ISO date
  notes?: string;
}

/**
 * Test withdrawal configuration
 */
export interface TestWithdrawal {
  fundSlug: FundSlug;
  amount: string; // Decimal string for precision
  effectiveDate: string; // ISO date
  notes?: string;
}

/**
 * Test world state (persisted to JSON)
 */
export interface TestWorldState {
  runTag: string;
  timestamp: string;
  funds: Record<FundSlug, FundId>;
  investors: Record<string, ProfileId>;
  ibs: Record<string, ProfileId>;
  transactionIds: UUID[];
}

// ============================================================================
// FUND DEFINITIONS
// ============================================================================

export const TEST_FUNDS: FundConfig[] = [
  { slug: "IND-BTC", name: "Indigo Bitcoin Fund", currency: "BTC" },
  { slug: "IND-ETH", name: "Indigo Ethereum Fund", currency: "ETH" },
  { slug: "IND-SOL", name: "Indigo Solana Fund", currency: "SOL" },
  { slug: "IND-USDT", name: "Indigo USDT Fund", currency: "USDT" },
  { slug: "IND-EURC", name: "Indigo EURC Fund", currency: "EURC" },
  { slug: "IND-XRP", name: "Indigo XRP Fund", currency: "XRP" },
];

// ============================================================================
// IB DEFINITIONS
// ============================================================================

export const TEST_IBS: TestIB[] = [
  {
    email: "qa-ib-primary@test.indigo.fund",
    displayName: "QA IB Primary",
    firstName: "Primary",
    lastName: "Broker",
    commissionRate: 5.0,
  },
  {
    email: "qa-ib-secondary@test.indigo.fund",
    displayName: "QA IB Secondary",
    firstName: "Secondary",
    lastName: "Broker",
    commissionRate: 3.0,
  },
];

// ============================================================================
// INVESTOR DEFINITIONS
// ============================================================================

export const TEST_INVESTORS: TestInvestor[] = [
  // 1. Early depositor - full month exposure
  {
    email: "qa-early-depositor@test.indigo.fund",
    displayName: "QA Early Depositor",
    firstName: "Early",
    lastName: "Depositor",
    scenario: "Deposits Jan 1, full month exposure for ADB weighting",
    deposits: [
      {
        fundSlug: "IND-USDT",
        amount: "10000.00000000",
        effectiveDate: "2026-01-01",
        notes: "Full month exposure test",
      },
    ],
  },

  // 2. Mid-month depositor - half month exposure
  {
    email: "qa-mid-month-dep@test.indigo.fund",
    displayName: "QA Mid Month Depositor",
    firstName: "MidMonth",
    lastName: "Depositor",
    scenario: "Deposits Jan 15, half-month ADB weight",
    deposits: [
      {
        fundSlug: "IND-USDT",
        amount: "5000.00000000",
        effectiveDate: "2026-01-15",
        notes: "Half month exposure test",
      },
    ],
  },

  // 3. Withdrawer - full lifecycle (deposit then withdraw)
  {
    email: "qa-withdrawer@test.indigo.fund",
    displayName: "QA Withdrawer",
    firstName: "Full",
    lastName: "Withdrawer",
    scenario: "Deposits then withdraws (full lifecycle test)",
    deposits: [
      {
        fundSlug: "IND-BTC",
        amount: "0.50000000",
        effectiveDate: "2026-01-05",
        notes: "Initial deposit for withdrawal test",
      },
    ],
    withdrawals: [
      {
        fundSlug: "IND-BTC",
        amount: "0.25000000",
        effectiveDate: "2026-01-20",
        notes: "Partial withdrawal test",
      },
    ],
  },

  // 4. Multi-fund investor
  {
    email: "qa-multi-fund@test.indigo.fund",
    displayName: "QA Multi Fund",
    firstName: "Multi",
    lastName: "Fund",
    scenario: "Positions in IND-USDT + IND-BTC (diversified portfolio)",
    deposits: [
      {
        fundSlug: "IND-USDT",
        amount: "8000.00000000",
        effectiveDate: "2026-01-03",
        notes: "USDT allocation",
      },
      {
        fundSlug: "IND-BTC",
        amount: "0.30000000",
        effectiveDate: "2026-01-03",
        notes: "BTC allocation",
      },
    ],
  },

  // 5. IB-referred investor
  {
    email: "qa-ib-referred@test.indigo.fund",
    displayName: "QA IB Referred",
    firstName: "Referred",
    lastName: "Investor",
    scenario: "Referred by qa-ib-primary (5% commission)",
    // ibReferrerId will be set at runtime
    deposits: [
      {
        fundSlug: "IND-USDT",
        amount: "12000.00000000",
        effectiveDate: "2026-01-10",
        notes: "IB commission test deposit",
      },
    ],
  },

  // 6. Zero balance investor (for guard testing)
  {
    email: "qa-zero-balance@test.indigo.fund",
    displayName: "QA Zero Balance",
    firstName: "Zero",
    lastName: "Balance",
    scenario: "Will be fully withdrawn (test zero/negative guards)",
    deposits: [
      {
        fundSlug: "IND-ETH",
        amount: "2.00000000",
        effectiveDate: "2026-01-07",
        notes: "Will be fully withdrawn",
      },
    ],
    withdrawals: [
      {
        fundSlug: "IND-ETH",
        amount: "2.00000000",
        effectiveDate: "2026-01-25",
        notes: "Full withdrawal to zero",
      },
    ],
  },

  // 7. Dust test investor (precision/rounding torture)
  {
    email: "qa-dust-test@test.indigo.fund",
    displayName: "QA Dust Test",
    firstName: "Dust",
    lastName: "Test",
    scenario: "0.00000001 BTC (dust/rounding torture test)",
    deposits: [
      {
        fundSlug: "IND-BTC",
        amount: "0.00000001",
        effectiveDate: "2026-01-12",
        notes: "Dust amount precision test",
      },
    ],
  },

  // 8. Correction target investor (void/reissue scenarios)
  {
    email: "qa-correction-target@test.indigo.fund",
    displayName: "QA Correction Target",
    firstName: "Correction",
    lastName: "Target",
    scenario: "For void + reissue scenarios",
    deposits: [
      {
        fundSlug: "IND-SOL",
        amount: "500.00000000",
        effectiveDate: "2026-01-08",
        notes: "Correction scenario test",
      },
    ],
  },
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate a QA run tag with timestamp
 * Format: qa-run-{timestamp}
 */
export function generateQARunTag(): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
  return `qa-run-${timestamp}`;
}

/**
 * Get fund by slug
 */
export function getFundBySlug(slug: FundSlug): FundConfig | undefined {
  return TEST_FUNDS.find((f) => f.slug === slug);
}

/**
 * Get investor by email prefix (e.g., "qa-early-depositor")
 */
export function getInvestorByPrefix(prefix: string): TestInvestor | undefined {
  return TEST_INVESTORS.find((inv) => inv.email.startsWith(prefix));
}

/**
 * Get IB by email prefix (e.g., "qa-ib-primary")
 */
export function getIBByPrefix(prefix: string): TestIB | undefined {
  return TEST_IBS.find((ib) => ib.email.startsWith(prefix));
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const QA_PASSWORD = "QaTest2026!";
export const QA_ADMIN_EMAIL = "qa.admin@indigo.fund";
export const DEFAULT_CLOSING_AUM = "1000000.00000000"; // Default AUM for deposit RPCs
export const RATE_LIMIT_DELAY_MS = 1000; // Delay between mutations to avoid rate limiting

/**
 * Transaction purposes for test operations
 */
export const TEST_PURPOSES = {
  DEPOSIT: "qa_fixture_deposit",
  WITHDRAWAL: "qa_fixture_withdrawal",
  YIELD: "qa_fixture_yield",
  FEE: "qa_fixture_fee",
  COMMISSION: "qa_fixture_commission",
} as const;
