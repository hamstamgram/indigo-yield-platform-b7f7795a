/**
 * Position Recalculation Unit Tests
 * Verifies position recalculation logic after transactions and corrections
 */

import { describe, it, expect, beforeEach } from "vitest";
import Decimal from "decimal.js";

// ============================================================================
// Types
// ============================================================================

type TransactionType =
  | "DEPOSIT"
  | "WITHDRAWAL"
  | "INTEREST"
  | "FEE"
  | "FEE_CREDIT"
  | "IB_CREDIT"
  | "INTERNAL_CREDIT"
  | "INTERNAL_WITHDRAWAL";

interface Transaction {
  id: string;
  investor_id: string;
  fund_id: string;
  type: TransactionType;
  amount: number;
  tx_date: string;
  effective_date: string;
  is_voided: boolean;
  created_at: string;
}

interface Position {
  investor_id: string;
  fund_id: string;
  current_value: number;
  cost_basis: number;
  shares: number;
  unrealized_pnl: number;
  realized_pnl: number;
  last_transaction_date: string | null;
}

interface FundAUM {
  fund_id: string;
  total_aum: number;
  investor_count: number;
  positions: Position[];
}

// ============================================================================
// Position Calculation Functions (Pure, deterministic)
// ============================================================================

/**
 * Get transaction direction based on type
 */
function getDirection(type: TransactionType): 1 | -1 {
  const credits: TransactionType[] = [
    "DEPOSIT",
    "INTEREST",
    "FEE_CREDIT",
    "IB_CREDIT",
    "INTERNAL_CREDIT",
  ];
  return credits.includes(type) ? 1 : -1;
}

/**
 * Sort transactions deterministically
 * Critical: Same ordering as backend (effective_date ASC, id ASC)
 */
function sortTransactions(transactions: Transaction[]): Transaction[] {
  return [...transactions].sort((a, b) => {
    // First by effective_date
    const dateCompare = a.effective_date.localeCompare(b.effective_date);
    if (dateCompare !== 0) return dateCompare;
    // Then by id for deterministic ordering
    return a.id.localeCompare(b.id);
  });
}

/**
 * Calculate position from transactions with deterministic ordering
 */
function calculatePosition(
  transactions: Transaction[],
  investorId: string,
  fundId: string
): Position {
  const relevantTxs = sortTransactions(
    transactions.filter(
      (tx) =>
        tx.investor_id === investorId &&
        tx.fund_id === fundId &&
        !tx.is_voided
    )
  );

  let currentValue = new Decimal(0);
  let costBasis = new Decimal(0);
  let realizedPnl = new Decimal(0);
  let lastTxDate: string | null = null;

  for (const tx of relevantTxs) {
    const direction = getDirection(tx.type);
    const amount = new Decimal(tx.amount).times(direction);
    currentValue = currentValue.plus(amount);

    // Track cost basis
    if (tx.type === "DEPOSIT") {
      costBasis = costBasis.plus(tx.amount);
    } else if (tx.type === "WITHDRAWAL") {
      // Proportional cost basis reduction for withdrawals
      const costBasisRatio = costBasis.dividedBy(
        currentValue.plus(tx.amount)
      );
      const costReduction = new Decimal(tx.amount).times(costBasisRatio);
      const pnlRealized = new Decimal(tx.amount).minus(costReduction);
      realizedPnl = realizedPnl.plus(pnlRealized);
      costBasis = costBasis.minus(costReduction);
    }

    lastTxDate = tx.effective_date;
  }

  return {
    investor_id: investorId,
    fund_id: fundId,
    current_value: currentValue.toNumber(),
    cost_basis: Math.max(0, costBasis.toNumber()),
    shares: currentValue.toNumber(),
    unrealized_pnl: currentValue.minus(costBasis).toNumber(),
    realized_pnl: realizedPnl.toNumber(),
    last_transaction_date: lastTxDate,
  };
}

/**
 * Calculate fund AUM from all investor positions
 */
function calculateFundAUM(
  transactions: Transaction[],
  fundId: string
): FundAUM {
  // Get unique investors in this fund
  const investorIds = [
    ...new Set(
      transactions
        .filter((tx) => tx.fund_id === fundId && !tx.is_voided)
        .map((tx) => tx.investor_id)
    ),
  ];

  const positions = investorIds.map((investorId) =>
    calculatePosition(transactions, investorId, fundId)
  );

  const totalAum = positions.reduce(
    (sum, pos) => sum + Math.max(0, pos.current_value),
    0
  );

  const investorCount = positions.filter(
    (pos) => pos.current_value > 0
  ).length;

  return {
    fund_id: fundId,
    total_aum: totalAum,
    investor_count: investorCount,
    positions,
  };
}

/**
 * Calculate allocation percentages
 */
function calculateAllocations(fundAum: FundAUM): Map<string, number> {
  const allocations = new Map<string, number>();
  
  if (fundAum.total_aum <= 0) {
    return allocations;
  }

  for (const pos of fundAum.positions) {
    if (pos.current_value > 0) {
      const percentage = (pos.current_value / fundAum.total_aum) * 100;
      allocations.set(pos.investor_id, percentage);
    }
  }

  return allocations;
}

// ============================================================================
// Tests
// ============================================================================

describe("Position Recalculation", () => {
  let baseTransactions: Transaction[];

  beforeEach(() => {
    baseTransactions = [
      {
        id: "tx-001",
        investor_id: "inv-1",
        fund_id: "fund-btc",
        type: "DEPOSIT",
        amount: 10.0,
        tx_date: "2024-01-01",
        effective_date: "2024-01-01",
        is_voided: false,
        created_at: "2024-01-01T00:00:00Z",
      },
      {
        id: "tx-002",
        investor_id: "inv-2",
        fund_id: "fund-btc",
        type: "DEPOSIT",
        amount: 5.0,
        tx_date: "2024-01-01",
        effective_date: "2024-01-01",
        is_voided: false,
        created_at: "2024-01-01T00:00:01Z",
      },
      {
        id: "tx-003",
        investor_id: "inv-1",
        fund_id: "fund-btc",
        type: "INTEREST",
        amount: 0.5,
        tx_date: "2024-01-15",
        effective_date: "2024-01-15",
        is_voided: false,
        created_at: "2024-01-15T00:00:00Z",
      },
      {
        id: "tx-004",
        investor_id: "inv-2",
        fund_id: "fund-btc",
        type: "INTEREST",
        amount: 0.25,
        tx_date: "2024-01-15",
        effective_date: "2024-01-15",
        is_voided: false,
        created_at: "2024-01-15T00:00:01Z",
      },
    ];
  });

  describe("Single Investor Position", () => {
    it("calculates position from deposits", () => {
      const pos = calculatePosition(baseTransactions, "inv-1", "fund-btc");

      expect(pos.current_value).toBeCloseTo(10.5, 10); // 10 + 0.5 interest
      expect(pos.cost_basis).toBeCloseTo(10.0, 10); // Only deposits
      expect(pos.unrealized_pnl).toBeCloseTo(0.5, 10); // Interest earned
    });

    it("handles withdrawals correctly", () => {
      const txs = [
        ...baseTransactions,
        {
          id: "tx-005",
          investor_id: "inv-1",
          fund_id: "fund-btc",
          type: "WITHDRAWAL" as TransactionType,
          amount: 2.0,
          tx_date: "2024-01-20",
          effective_date: "2024-01-20",
          is_voided: false,
          created_at: "2024-01-20T00:00:00Z",
        },
      ];

      const pos = calculatePosition(txs, "inv-1", "fund-btc");

      // Current: 10 + 0.5 - 2 = 8.5
      expect(pos.current_value).toBeCloseTo(8.5, 10);
    });

    it("handles fees correctly", () => {
      const txs = [
        ...baseTransactions,
        {
          id: "tx-005",
          investor_id: "inv-1",
          fund_id: "fund-btc",
          type: "FEE" as TransactionType,
          amount: 0.1,
          tx_date: "2024-01-15",
          effective_date: "2024-01-15",
          is_voided: false,
          created_at: "2024-01-15T00:00:02Z",
        },
      ];

      const pos = calculatePosition(txs, "inv-1", "fund-btc");

      // Current: 10 + 0.5 - 0.1 = 10.4
      expect(pos.current_value).toBeCloseTo(10.4, 10);
    });

    it("excludes voided transactions", () => {
      const txs = baseTransactions.map((tx) =>
        tx.id === "tx-003" ? { ...tx, is_voided: true } : tx
      );

      const pos = calculatePosition(txs, "inv-1", "fund-btc");

      // Without interest: just deposit of 10
      expect(pos.current_value).toBeCloseTo(10.0, 10);
    });
  });

  describe("Fund AUM Calculation", () => {
    it("calculates total AUM correctly", () => {
      const aum = calculateFundAUM(baseTransactions, "fund-btc");

      // inv-1: 10 + 0.5 = 10.5
      // inv-2: 5 + 0.25 = 5.25
      // Total: 15.75
      expect(aum.total_aum).toBeCloseTo(15.75, 10);
      expect(aum.investor_count).toBe(2);
    });

    it("excludes zero-balance investors from count", () => {
      const txs = [
        ...baseTransactions,
        {
          id: "tx-005",
          investor_id: "inv-3",
          fund_id: "fund-btc",
          type: "DEPOSIT" as TransactionType,
          amount: 1.0,
          tx_date: "2024-01-01",
          effective_date: "2024-01-01",
          is_voided: false,
          created_at: "2024-01-01T00:00:02Z",
        },
        {
          id: "tx-006",
          investor_id: "inv-3",
          fund_id: "fund-btc",
          type: "WITHDRAWAL" as TransactionType,
          amount: 1.0,
          tx_date: "2024-01-02",
          effective_date: "2024-01-02",
          is_voided: false,
          created_at: "2024-01-02T00:00:00Z",
        },
      ];

      const aum = calculateFundAUM(txs, "fund-btc");

      // inv-3 has zero balance
      expect(aum.investor_count).toBe(2);
    });

    it("handles empty transaction list", () => {
      const aum = calculateFundAUM([], "fund-btc");

      expect(aum.total_aum).toBe(0);
      expect(aum.investor_count).toBe(0);
    });
  });

  describe("Allocation Percentages", () => {
    it("calculates allocation percentages correctly", () => {
      const aum = calculateFundAUM(baseTransactions, "fund-btc");
      const allocations = calculateAllocations(aum);

      // inv-1: 10.5 / 15.75 = 66.67%
      // inv-2: 5.25 / 15.75 = 33.33%
      expect(allocations.get("inv-1")).toBeCloseTo(66.6666, 2);
      expect(allocations.get("inv-2")).toBeCloseTo(33.3333, 2);
    });

    it("allocations sum to 100%", () => {
      const aum = calculateFundAUM(baseTransactions, "fund-btc");
      const allocations = calculateAllocations(aum);

      let total = 0;
      allocations.forEach((pct) => {
        total += pct;
      });

      expect(total).toBeCloseTo(100, 10);
    });

    it("handles single investor (100%)", () => {
      const txs = baseTransactions.filter((tx) => tx.investor_id === "inv-1");
      const aum = calculateFundAUM(txs, "fund-btc");
      const allocations = calculateAllocations(aum);

      expect(allocations.get("inv-1")).toBeCloseTo(100, 10);
    });

    it("handles zero AUM gracefully", () => {
      const aum: FundAUM = {
        fund_id: "fund-btc",
        total_aum: 0,
        investor_count: 0,
        positions: [],
      };

      const allocations = calculateAllocations(aum);
      expect(allocations.size).toBe(0);
    });
  });

  describe("Deterministic Ordering", () => {
    it("produces same result regardless of input order", () => {
      // Shuffle transactions
      const shuffled = [...baseTransactions].sort(() => Math.random() - 0.5);

      const pos1 = calculatePosition(baseTransactions, "inv-1", "fund-btc");
      const pos2 = calculatePosition(shuffled, "inv-1", "fund-btc");

      expect(pos1.current_value).toBe(pos2.current_value);
      expect(pos1.cost_basis).toBe(pos2.cost_basis);
    });

    it("sorts by effective_date then by id", () => {
      const txs: Transaction[] = [
        {
          id: "tx-b",
          investor_id: "inv-1",
          fund_id: "fund-btc",
          type: "DEPOSIT",
          amount: 1.0,
          tx_date: "2024-01-01",
          effective_date: "2024-01-01",
          is_voided: false,
          created_at: "2024-01-01T00:00:01Z",
        },
        {
          id: "tx-a",
          investor_id: "inv-1",
          fund_id: "fund-btc",
          type: "DEPOSIT",
          amount: 2.0,
          tx_date: "2024-01-01",
          effective_date: "2024-01-01",
          is_voided: false,
          created_at: "2024-01-01T00:00:00Z",
        },
      ];

      const sorted = sortTransactions(txs);

      // tx-a should come first (same date, but id 'a' < 'b')
      expect(sorted[0].id).toBe("tx-a");
      expect(sorted[1].id).toBe("tx-b");
    });
  });

  describe("Position After Yield Distribution", () => {
    it("correctly updates positions after yield", () => {
      // Starting positions
      const initialAum = calculateFundAUM(baseTransactions, "fund-btc");
      expect(initialAum.total_aum).toBeCloseTo(15.75, 10);

      // Simulate yield distribution of 1.0 BTC
      const yieldAmount = 1.0;
      const allocations = calculateAllocations(initialAum);

      // Calculate expected interest per investor
      const inv1Allocation = allocations.get("inv-1")! / 100;
      const inv2Allocation = allocations.get("inv-2")! / 100;

      const inv1Interest = yieldAmount * inv1Allocation;
      const inv2Interest = yieldAmount * inv2Allocation;

      // Add yield transactions
      const txsWithYield = [
        ...baseTransactions,
        {
          id: "tx-yield-1",
          investor_id: "inv-1",
          fund_id: "fund-btc",
          type: "INTEREST" as TransactionType,
          amount: inv1Interest,
          tx_date: "2024-01-31",
          effective_date: "2024-01-31",
          is_voided: false,
          created_at: "2024-01-31T00:00:00Z",
        },
        {
          id: "tx-yield-2",
          investor_id: "inv-2",
          fund_id: "fund-btc",
          type: "INTEREST" as TransactionType,
          amount: inv2Interest,
          tx_date: "2024-01-31",
          effective_date: "2024-01-31",
          is_voided: false,
          created_at: "2024-01-31T00:00:01Z",
        },
      ];

      const newAum = calculateFundAUM(txsWithYield, "fund-btc");

      // New AUM should be initial + yield
      expect(newAum.total_aum).toBeCloseTo(15.75 + 1.0, 10);
    });

    it("maintains allocation ratios after proportional yield", () => {
      const initialAum = calculateFundAUM(baseTransactions, "fund-btc");
      const initialAllocations = calculateAllocations(initialAum);

      // Proportional yield (each investor gets yield proportional to their balance)
      const yieldAmount = 1.0;

      const txsWithYield = [
        ...baseTransactions,
        {
          id: "tx-yield-1",
          investor_id: "inv-1",
          fund_id: "fund-btc",
          type: "INTEREST" as TransactionType,
          amount: yieldAmount * (initialAllocations.get("inv-1")! / 100),
          tx_date: "2024-01-31",
          effective_date: "2024-01-31",
          is_voided: false,
          created_at: "2024-01-31T00:00:00Z",
        },
        {
          id: "tx-yield-2",
          investor_id: "inv-2",
          fund_id: "fund-btc",
          type: "INTEREST" as TransactionType,
          amount: yieldAmount * (initialAllocations.get("inv-2")! / 100),
          tx_date: "2024-01-31",
          effective_date: "2024-01-31",
          is_voided: false,
          created_at: "2024-01-31T00:00:01Z",
        },
      ];

      const newAum = calculateFundAUM(txsWithYield, "fund-btc");
      const newAllocations = calculateAllocations(newAum);

      // Allocations should remain the same after proportional yield
      expect(newAllocations.get("inv-1")).toBeCloseTo(
        initialAllocations.get("inv-1")!,
        5
      );
      expect(newAllocations.get("inv-2")).toBeCloseTo(
        initialAllocations.get("inv-2")!,
        5
      );
    });
  });

  describe("Edge Cases", () => {
    it("handles very small amounts (satoshi-level)", () => {
      const txs: Transaction[] = [
        {
          id: "tx-1",
          investor_id: "inv-1",
          fund_id: "fund-btc",
          type: "DEPOSIT",
          amount: 0.00000001, // 1 satoshi
          tx_date: "2024-01-01",
          effective_date: "2024-01-01",
          is_voided: false,
          created_at: "2024-01-01T00:00:00Z",
        },
      ];

      const pos = calculatePosition(txs, "inv-1", "fund-btc");
      expect(pos.current_value).toBe(0.00000001);
    });

    it("handles large amounts with precision", () => {
      const txs: Transaction[] = [
        {
          id: "tx-1",
          investor_id: "inv-1",
          fund_id: "fund-btc",
          type: "DEPOSIT",
          amount: 1234567890.12345678,
          tx_date: "2024-01-01",
          effective_date: "2024-01-01",
          is_voided: false,
          created_at: "2024-01-01T00:00:00Z",
        },
      ];

      const pos = calculatePosition(txs, "inv-1", "fund-btc");
      expect(pos.current_value).toBeCloseTo(1234567890.12345678, 8);
    });

    it("handles multiple funds correctly", () => {
      const txs: Transaction[] = [
        {
          id: "tx-1",
          investor_id: "inv-1",
          fund_id: "fund-btc",
          type: "DEPOSIT",
          amount: 10.0,
          tx_date: "2024-01-01",
          effective_date: "2024-01-01",
          is_voided: false,
          created_at: "2024-01-01T00:00:00Z",
        },
        {
          id: "tx-2",
          investor_id: "inv-1",
          fund_id: "fund-eth",
          type: "DEPOSIT",
          amount: 100.0,
          tx_date: "2024-01-01",
          effective_date: "2024-01-01",
          is_voided: false,
          created_at: "2024-01-01T00:00:01Z",
        },
      ];

      const posBtc = calculatePosition(txs, "inv-1", "fund-btc");
      const posEth = calculatePosition(txs, "inv-1", "fund-eth");

      expect(posBtc.current_value).toBe(10.0);
      expect(posEth.current_value).toBe(100.0);
    });
  });
});

describe("Position Reset and Rebuild", () => {
  it("rebuilds position from transaction history", () => {
    const txs: Transaction[] = [
      {
        id: "tx-1",
        investor_id: "inv-1",
        fund_id: "fund-btc",
        type: "DEPOSIT",
        amount: 10.0,
        tx_date: "2024-01-01",
        effective_date: "2024-01-01",
        is_voided: false,
        created_at: "2024-01-01T00:00:00Z",
      },
      {
        id: "tx-2",
        investor_id: "inv-1",
        fund_id: "fund-btc",
        type: "INTEREST",
        amount: 1.0,
        tx_date: "2024-02-01",
        effective_date: "2024-02-01",
        is_voided: false,
        created_at: "2024-02-01T00:00:00Z",
      },
      {
        id: "tx-3",
        investor_id: "inv-1",
        fund_id: "fund-btc",
        type: "WITHDRAWAL",
        amount: 3.0,
        tx_date: "2024-03-01",
        effective_date: "2024-03-01",
        is_voided: false,
        created_at: "2024-03-01T00:00:00Z",
      },
      {
        id: "tx-4",
        investor_id: "inv-1",
        fund_id: "fund-btc",
        type: "INTEREST",
        amount: 0.5,
        tx_date: "2024-04-01",
        effective_date: "2024-04-01",
        is_voided: false,
        created_at: "2024-04-01T00:00:00Z",
      },
    ];

    const pos = calculatePosition(txs, "inv-1", "fund-btc");

    // 10 + 1 - 3 + 0.5 = 8.5
    expect(pos.current_value).toBeCloseTo(8.5, 10);
    expect(pos.last_transaction_date).toBe("2024-04-01");
  });

  it("idempotent: same result on repeated calculation", () => {
    const txs: Transaction[] = [
      {
        id: "tx-1",
        investor_id: "inv-1",
        fund_id: "fund-btc",
        type: "DEPOSIT",
        amount: 10.0,
        tx_date: "2024-01-01",
        effective_date: "2024-01-01",
        is_voided: false,
        created_at: "2024-01-01T00:00:00Z",
      },
    ];

    const pos1 = calculatePosition(txs, "inv-1", "fund-btc");
    const pos2 = calculatePosition(txs, "inv-1", "fund-btc");
    const pos3 = calculatePosition(txs, "inv-1", "fund-btc");

    expect(pos1.current_value).toBe(pos2.current_value);
    expect(pos2.current_value).toBe(pos3.current_value);
  });
});
