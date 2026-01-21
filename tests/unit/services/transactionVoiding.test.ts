/**
 * Transaction Voiding Unit Tests
 * Verifies transaction voiding logic and position recalculation
 */

import { describe, it, expect, beforeEach } from "vitest";
import Decimal from "decimal.js";

// ============================================================================
// Types (Matching database schema)
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
  is_voided: boolean;
  voided_at?: string;
  voided_by?: string;
  void_reason?: string;
  reference_id?: string;
  created_at: string;
}

interface InvestorPosition {
  investor_id: string;
  fund_id: string;
  current_value: number;
  cost_basis: number;
  shares: number;
  unrealized_pnl: number;
}

// ============================================================================
// Position Calculation Logic (Pure functions)
// ============================================================================

/**
 * Get amount direction based on transaction type
 * Credits (+): DEPOSIT, INTEREST, FEE_CREDIT, IB_CREDIT, INTERNAL_CREDIT
 * Debits (-): WITHDRAWAL, FEE, INTERNAL_WITHDRAWAL
 */
function getAmountDirection(type: TransactionType): 1 | -1 {
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
 * Calculate position from non-voided transactions
 */
function calculatePositionFromTransactions(
  transactions: Transaction[]
): number {
  return transactions
    .filter((tx) => !tx.is_voided)
    .reduce((sum, tx) => {
      const direction = getAmountDirection(tx.type);
      return new Decimal(sum).plus(new Decimal(tx.amount).times(direction)).toNumber();
    }, 0);
}

/**
 * Void a transaction and recalculate position
 */
function voidTransaction(
  transaction: Transaction,
  voidedBy: string,
  reason: string
): Transaction {
  if (transaction.is_voided) {
    throw new Error(`Transaction ${transaction.id} is already voided`);
  }

  return {
    ...transaction,
    is_voided: true,
    voided_at: new Date().toISOString(),
    voided_by: voidedBy,
    void_reason: reason,
  };
}

/**
 * Calculate position delta from voiding a transaction
 */
function calculateVoidImpact(transaction: Transaction): number {
  if (transaction.is_voided) {
    return 0; // Already voided, no impact
  }
  
  const direction = getAmountDirection(transaction.type);
  // Voiding reverses the effect, so negate the original impact
  return -1 * direction * transaction.amount;
}

/**
 * Recalculate all positions for an investor
 */
function recalculateInvestorPosition(
  transactions: Transaction[],
  investorId: string,
  fundId: string
): InvestorPosition {
  const relevantTxs = transactions.filter(
    (tx) => tx.investor_id === investorId && tx.fund_id === fundId && !tx.is_voided
  );

  let currentValue = new Decimal(0);
  let costBasis = new Decimal(0);

  for (const tx of relevantTxs) {
    const direction = getAmountDirection(tx.type);
    const amount = new Decimal(tx.amount).times(direction);
    currentValue = currentValue.plus(amount);

    // Cost basis only changes with deposits/withdrawals
    if (tx.type === "DEPOSIT") {
      costBasis = costBasis.plus(tx.amount);
    } else if (tx.type === "WITHDRAWAL") {
      costBasis = costBasis.minus(tx.amount);
    }
  }

  return {
    investor_id: investorId,
    fund_id: fundId,
    current_value: currentValue.toNumber(),
    cost_basis: Math.max(0, costBasis.toNumber()),
    shares: currentValue.toNumber(), // Simplified: shares = value
    unrealized_pnl: currentValue.minus(costBasis).toNumber(),
  };
}

// ============================================================================
// Tests
// ============================================================================

describe("Transaction Voiding", () => {
  let mockTransactions: Transaction[];

  beforeEach(() => {
    mockTransactions = [
      {
        id: "tx-1",
        investor_id: "inv-1",
        fund_id: "fund-1",
        type: "DEPOSIT",
        amount: 10.0,
        tx_date: "2024-01-01",
        is_voided: false,
        created_at: "2024-01-01T00:00:00Z",
      },
      {
        id: "tx-2",
        investor_id: "inv-1",
        fund_id: "fund-1",
        type: "INTEREST",
        amount: 0.5,
        tx_date: "2024-01-15",
        is_voided: false,
        created_at: "2024-01-15T00:00:00Z",
      },
      {
        id: "tx-3",
        investor_id: "inv-1",
        fund_id: "fund-1",
        type: "FEE",
        amount: 0.1,
        tx_date: "2024-01-15",
        is_voided: false,
        created_at: "2024-01-15T00:00:01Z",
      },
    ];
  });

  describe("voidTransaction", () => {
    it("marks transaction as voided with metadata", () => {
      const tx = mockTransactions[0];
      const voided = voidTransaction(tx, "admin-1", "Duplicate entry");

      expect(voided.is_voided).toBe(true);
      expect(voided.voided_by).toBe("admin-1");
      expect(voided.void_reason).toBe("Duplicate entry");
      expect(voided.voided_at).toBeDefined();
    });

    it("throws error when voiding already voided transaction", () => {
      const tx = { ...mockTransactions[0], is_voided: true };

      expect(() => voidTransaction(tx, "admin-1", "Test")).toThrow(
        "already voided"
      );
    });

    it("preserves original transaction data", () => {
      const tx = mockTransactions[0];
      const voided = voidTransaction(tx, "admin-1", "Test");

      expect(voided.id).toBe(tx.id);
      expect(voided.amount).toBe(tx.amount);
      expect(voided.type).toBe(tx.type);
      expect(voided.investor_id).toBe(tx.investor_id);
    });
  });

  describe("calculateVoidImpact", () => {
    it("returns negative impact for voided deposit", () => {
      const deposit: Transaction = {
        ...mockTransactions[0],
        type: "DEPOSIT",
        amount: 10.0,
      };

      const impact = calculateVoidImpact(deposit);
      expect(impact).toBe(-10.0); // Removes +10 from position
    });

    it("returns positive impact for voided withdrawal", () => {
      const withdrawal: Transaction = {
        ...mockTransactions[0],
        type: "WITHDRAWAL",
        amount: 5.0,
      };

      const impact = calculateVoidImpact(withdrawal);
      expect(impact).toBe(5.0); // Removes -5 from position (adds back)
    });

    it("returns negative impact for voided interest", () => {
      const interest: Transaction = {
        ...mockTransactions[0],
        type: "INTEREST",
        amount: 0.5,
      };

      const impact = calculateVoidImpact(interest);
      expect(impact).toBe(-0.5);
    });

    it("returns positive impact for voided fee", () => {
      const fee: Transaction = {
        ...mockTransactions[0],
        type: "FEE",
        amount: 0.1,
      };

      const impact = calculateVoidImpact(fee);
      expect(impact).toBe(0.1); // Removes -0.1 from position (adds back)
    });

    it("returns zero for already voided transaction", () => {
      const voided: Transaction = {
        ...mockTransactions[0],
        is_voided: true,
      };

      const impact = calculateVoidImpact(voided);
      expect(impact).toBe(0);
    });
  });

  describe("calculatePositionFromTransactions", () => {
    it("calculates correct position from transactions", () => {
      // Deposit 10 + Interest 0.5 - Fee 0.1 = 10.4
      const position = calculatePositionFromTransactions(mockTransactions);
      expect(position).toBeCloseTo(10.4, 10);
    });

    it("excludes voided transactions", () => {
      const txsWithVoided = [
        ...mockTransactions,
        {
          id: "tx-voided",
          investor_id: "inv-1",
          fund_id: "fund-1",
          type: "DEPOSIT" as TransactionType,
          amount: 100.0, // This would significantly change the balance
          tx_date: "2024-01-02",
          is_voided: true,
          created_at: "2024-01-02T00:00:00Z",
        },
      ];

      const position = calculatePositionFromTransactions(txsWithVoided);
      expect(position).toBeCloseTo(10.4, 10); // Should still be 10.4
    });

    it("handles empty transaction list", () => {
      const position = calculatePositionFromTransactions([]);
      expect(position).toBe(0);
    });

    it("handles all voided transactions", () => {
      const allVoided = mockTransactions.map((tx) => ({
        ...tx,
        is_voided: true,
      }));

      const position = calculatePositionFromTransactions(allVoided);
      expect(position).toBe(0);
    });
  });

  describe("recalculateInvestorPosition", () => {
    it("calculates position correctly after voiding", () => {
      // Initial position
      const initialPosition = recalculateInvestorPosition(
        mockTransactions,
        "inv-1",
        "fund-1"
      );
      expect(initialPosition.current_value).toBeCloseTo(10.4, 10);

      // Void the interest transaction
      const txsAfterVoid = mockTransactions.map((tx) =>
        tx.id === "tx-2" ? { ...tx, is_voided: true } : tx
      );

      const newPosition = recalculateInvestorPosition(
        txsAfterVoid,
        "inv-1",
        "fund-1"
      );

      // 10.0 - 0.1 = 9.9 (deposit minus fee, no interest)
      expect(newPosition.current_value).toBeCloseTo(9.9, 10);
    });

    it("calculates cost basis correctly", () => {
      const transactions: Transaction[] = [
        {
          id: "tx-1",
          investor_id: "inv-1",
          fund_id: "fund-1",
          type: "DEPOSIT",
          amount: 10.0,
          tx_date: "2024-01-01",
          is_voided: false,
          created_at: "2024-01-01T00:00:00Z",
        },
        {
          id: "tx-2",
          investor_id: "inv-1",
          fund_id: "fund-1",
          type: "INTEREST",
          amount: 2.0,
          tx_date: "2024-01-15",
          is_voided: false,
          created_at: "2024-01-15T00:00:00Z",
        },
        {
          id: "tx-3",
          investor_id: "inv-1",
          fund_id: "fund-1",
          type: "WITHDRAWAL",
          amount: 3.0,
          tx_date: "2024-01-20",
          is_voided: false,
          created_at: "2024-01-20T00:00:00Z",
        },
      ];

      const position = recalculateInvestorPosition(
        transactions,
        "inv-1",
        "fund-1"
      );

      // Current value: 10 + 2 - 3 = 9
      expect(position.current_value).toBeCloseTo(9.0, 10);
      
      // Cost basis: 10 - 3 = 7 (only deposits and withdrawals)
      expect(position.cost_basis).toBeCloseTo(7.0, 10);
      
      // Unrealized PnL: 9 - 7 = 2 (the interest earned)
      expect(position.unrealized_pnl).toBeCloseTo(2.0, 10);
    });

    it("handles negative cost basis gracefully", () => {
      const transactions: Transaction[] = [
        {
          id: "tx-1",
          investor_id: "inv-1",
          fund_id: "fund-1",
          type: "DEPOSIT",
          amount: 5.0,
          tx_date: "2024-01-01",
          is_voided: false,
          created_at: "2024-01-01T00:00:00Z",
        },
        {
          id: "tx-2",
          investor_id: "inv-1",
          fund_id: "fund-1",
          type: "INTEREST",
          amount: 10.0,
          tx_date: "2024-01-15",
          is_voided: false,
          created_at: "2024-01-15T00:00:00Z",
        },
        {
          id: "tx-3",
          investor_id: "inv-1",
          fund_id: "fund-1",
          type: "WITHDRAWAL",
          amount: 12.0,
          tx_date: "2024-01-20",
          is_voided: false,
          created_at: "2024-01-20T00:00:00Z",
        },
      ];

      const position = recalculateInvestorPosition(
        transactions,
        "inv-1",
        "fund-1"
      );

      // Current value: 5 + 10 - 12 = 3
      expect(position.current_value).toBeCloseTo(3.0, 10);
      
      // Cost basis would be: 5 - 12 = -7, but clamped to 0
      expect(position.cost_basis).toBe(0);
    });
  });

  describe("Transaction Type Directions", () => {
    it("correctly categorizes credit transactions", () => {
      const creditTypes: TransactionType[] = [
        "DEPOSIT",
        "INTEREST",
        "FEE_CREDIT",
        "IB_CREDIT",
        "INTERNAL_CREDIT",
      ];

      for (const type of creditTypes) {
        expect(getAmountDirection(type)).toBe(1);
      }
    });

    it("correctly categorizes debit transactions", () => {
      const debitTypes: TransactionType[] = [
        "WITHDRAWAL",
        "FEE",
        "INTERNAL_WITHDRAWAL",
      ];

      for (const type of debitTypes) {
        expect(getAmountDirection(type)).toBe(-1);
      }
    });
  });
});

describe("Voided Transaction Filtering", () => {
  it("filters out voided transactions from fee calculations", () => {
    const transactions: Transaction[] = [
      {
        id: "fee-1",
        investor_id: "indigo-fees",
        fund_id: "fund-1",
        type: "FEE_CREDIT",
        amount: 0.1,
        tx_date: "2024-01-15",
        is_voided: false,
        created_at: "2024-01-15T00:00:00Z",
      },
      {
        id: "fee-2",
        investor_id: "indigo-fees",
        fund_id: "fund-1",
        type: "FEE_CREDIT",
        amount: 0.2,
        tx_date: "2024-01-16",
        is_voided: true,
        voided_at: "2024-01-17T00:00:00Z",
        created_at: "2024-01-16T00:00:00Z",
      },
      {
        id: "fee-3",
        investor_id: "indigo-fees",
        fund_id: "fund-1",
        type: "FEE_CREDIT",
        amount: 0.15,
        tx_date: "2024-01-17",
        is_voided: false,
        created_at: "2024-01-17T00:00:00Z",
      },
    ];

    const totalFees = transactions
      .filter((tx) => !tx.is_voided && tx.type === "FEE_CREDIT")
      .reduce((sum, tx) => sum + tx.amount, 0);

    // Only fee-1 (0.1) and fee-3 (0.15) should be counted
    expect(totalFees).toBeCloseTo(0.25, 10);
  });

  it("maintains referential integrity after voiding", () => {
    const originalTx: Transaction = {
      id: "tx-original",
      investor_id: "inv-1",
      fund_id: "fund-1",
      type: "DEPOSIT",
      amount: 10.0,
      tx_date: "2024-01-01",
      is_voided: false,
      reference_id: "ref-123",
      created_at: "2024-01-01T00:00:00Z",
    };

    const voidedTx = voidTransaction(originalTx, "admin-1", "Error correction");

    // Reference ID should be preserved
    expect(voidedTx.reference_id).toBe("ref-123");
    expect(voidedTx.id).toBe("tx-original");
  });
});
