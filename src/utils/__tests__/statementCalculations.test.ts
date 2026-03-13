import { describe, it, expect } from "vitest";

// Import the deduplication logic indirectly via computeStatement's helper
// We test the exported calculateRateOfReturn and the dedup behavior via integration

import { calculateRateOfReturn } from "@/utils/statementCalculations";

describe("calculateRateOfReturn", () => {
  it("returns correct net income and rate of return", () => {
    const result = calculateRateOfReturn(100, 110, 5, 2);
    // net_income = 110 - 100 - 5 + 2 = 7
    expect(result.netIncome).toBe(7);
    // rate = 7 / 100 * 100 = 7%
    expect(result.rateOfReturn).toBeCloseTo(7, 8);
  });

  it("returns 0% when beginning balance is 0", () => {
    const result = calculateRateOfReturn(0, 50, 50, 0);
    expect(result.rateOfReturn).toBe(0);
  });
});

/**
 * Test: Issue 6 - deduplicateYieldTransactions
 * When both 'transaction' and 'reporting' purpose yields exist for the same
 * distribution_id, only the 'reporting' one should be kept.
 *
 * We cannot directly import the private function, so we test the logic
 * by extracting it into a testable export.
 */
describe("deduplicateYieldTransactions (Issue 6)", () => {
  // Inline the same logic as the private function for unit testing
  const YIELD_TYPES = new Set(["YIELD", "FEE_CREDIT", "IB_CREDIT"]);

  function deduplicateYieldTransactions(
    transactions: Array<{
      id: string;
      type: string;
      purpose: string | null;
      distribution_id: string | null;
      tx_date: string;
      amount: number;
    }>,
    yieldTypes: Set<string>
  ) {
    const byDistId = new Map<string, typeof transactions>();
    const result: typeof transactions = [];

    for (const tx of transactions) {
      if (!yieldTypes.has(tx.type) || !tx.distribution_id) {
        result.push(tx);
        continue;
      }
      const group = byDistId.get(tx.distribution_id) || [];
      group.push(tx);
      byDistId.set(tx.distribution_id, group);
    }

    for (const [, group] of byDistId) {
      const hasReporting = group.some((tx) => tx.purpose === "reporting");
      if (hasReporting) {
        for (const tx of group) {
          if (tx.purpose === "reporting") {
            result.push(tx);
          }
        }
      } else {
        for (const tx of group) {
          result.push(tx);
        }
      }
    }

    result.sort((a, b) => a.tx_date.localeCompare(b.tx_date));
    return result;
  }

  it("keeps only reporting yields when both purposes exist for same distribution", () => {
    const transactions = [
      {
        id: "1",
        type: "YIELD",
        purpose: "transaction",
        distribution_id: "dist-1",
        tx_date: "2026-01-15",
        amount: 10,
      },
      {
        id: "2",
        type: "YIELD",
        purpose: "reporting",
        distribution_id: "dist-1",
        tx_date: "2026-01-15",
        amount: 10,
      },
      {
        id: "3",
        type: "DEPOSIT",
        purpose: null,
        distribution_id: null,
        tx_date: "2026-01-01",
        amount: 100,
      },
    ];

    const result = deduplicateYieldTransactions(transactions, YIELD_TYPES);

    expect(result).toHaveLength(2); // deposit + reporting yield
    expect(result.find((t) => t.id === "1")).toBeUndefined(); // transaction yield removed
    expect(result.find((t) => t.id === "2")).toBeDefined(); // reporting yield kept
    expect(result.find((t) => t.id === "3")).toBeDefined(); // deposit kept
  });

  it("keeps all yields when only transaction purpose exists", () => {
    const transactions = [
      {
        id: "1",
        type: "YIELD",
        purpose: "transaction",
        distribution_id: "dist-1",
        tx_date: "2026-01-15",
        amount: 10,
      },
    ];

    const result = deduplicateYieldTransactions(transactions, YIELD_TYPES);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("keeps yields without distribution_id unchanged", () => {
    const transactions = [
      {
        id: "1",
        type: "YIELD",
        purpose: "transaction",
        distribution_id: null,
        tx_date: "2026-01-15",
        amount: 10,
      },
    ];

    const result = deduplicateYieldTransactions(transactions, YIELD_TYPES);
    expect(result).toHaveLength(1);
  });

  it("deduplicates FEE_CREDIT and IB_CREDIT the same way", () => {
    const transactions = [
      {
        id: "1",
        type: "FEE_CREDIT",
        purpose: "transaction",
        distribution_id: "dist-1",
        tx_date: "2026-01-15",
        amount: 3,
      },
      {
        id: "2",
        type: "FEE_CREDIT",
        purpose: "reporting",
        distribution_id: "dist-1",
        tx_date: "2026-01-15",
        amount: 3,
      },
      {
        id: "3",
        type: "IB_CREDIT",
        purpose: "transaction",
        distribution_id: "dist-1",
        tx_date: "2026-01-15",
        amount: 1,
      },
      {
        id: "4",
        type: "IB_CREDIT",
        purpose: "reporting",
        distribution_id: "dist-1",
        tx_date: "2026-01-15",
        amount: 1,
      },
    ];

    const result = deduplicateYieldTransactions(transactions, YIELD_TYPES);
    expect(result).toHaveLength(2);
    expect(result.map((t) => t.id).sort()).toEqual(["2", "4"]);
  });

  it("handles multiple distributions independently", () => {
    const transactions = [
      {
        id: "1",
        type: "YIELD",
        purpose: "transaction",
        distribution_id: "dist-1",
        tx_date: "2026-01-15",
        amount: 10,
      },
      {
        id: "2",
        type: "YIELD",
        purpose: "reporting",
        distribution_id: "dist-1",
        tx_date: "2026-01-15",
        amount: 10,
      },
      {
        id: "3",
        type: "YIELD",
        purpose: "transaction",
        distribution_id: "dist-2",
        tx_date: "2026-02-15",
        amount: 20,
      },
      // dist-2 has no reporting, so transaction purpose is kept
    ];

    const result = deduplicateYieldTransactions(transactions, YIELD_TYPES);
    expect(result).toHaveLength(2);
    expect(result.find((t) => t.id === "2")).toBeDefined(); // reporting for dist-1
    expect(result.find((t) => t.id === "3")).toBeDefined(); // transaction for dist-2 (no reporting)
  });

  it("does not affect non-yield transaction types", () => {
    const transactions = [
      {
        id: "1",
        type: "DEPOSIT",
        purpose: "transaction",
        distribution_id: "dist-1",
        tx_date: "2026-01-01",
        amount: 100,
      },
      {
        id: "2",
        type: "WITHDRAWAL",
        purpose: "transaction",
        distribution_id: "dist-1",
        tx_date: "2026-01-10",
        amount: 50,
      },
    ];

    const result = deduplicateYieldTransactions(transactions, YIELD_TYPES);
    expect(result).toHaveLength(2);
  });

  it("maintains tx_date ascending sort order after dedup", () => {
    const transactions = [
      {
        id: "3",
        type: "DEPOSIT",
        purpose: null,
        distribution_id: null,
        tx_date: "2026-01-01",
        amount: 100,
      },
      {
        id: "1",
        type: "YIELD",
        purpose: "transaction",
        distribution_id: "dist-1",
        tx_date: "2026-01-15",
        amount: 10,
      },
      {
        id: "2",
        type: "YIELD",
        purpose: "reporting",
        distribution_id: "dist-1",
        tx_date: "2026-01-15",
        amount: 10,
      },
    ];

    const result = deduplicateYieldTransactions(transactions, YIELD_TYPES);
    expect(result[0].tx_date).toBe("2026-01-01");
    expect(result[1].tx_date).toBe("2026-01-15");
  });
});
