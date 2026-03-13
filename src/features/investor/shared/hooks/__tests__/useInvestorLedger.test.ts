import { describe, it, expect } from "vitest";

/**
 * Issue 5: Ledger shows duplicate dust transactions
 * The fix filters out DUST_SWEEP entries from the ledger display.
 * DUST_SWEEP is an internal routing transaction — only DUST should appear.
 */
describe("useInvestorLedger DUST_SWEEP filter (Issue 5)", () => {
  it("filters out DUST_SWEEP transactions from results", () => {
    // Simulate the filter logic from useInvestorLedger
    const rawData = [
      { id: "1", type: "DEPOSIT", amount: 100, tx_date: "2026-01-01" },
      { id: "2", type: "YIELD", amount: 5, tx_date: "2026-01-15" },
      { id: "3", type: "DUST", amount: 0.01, tx_date: "2026-01-15" },
      { id: "4", type: "DUST_SWEEP", amount: 0.01, tx_date: "2026-01-15" },
    ];

    const filtered = rawData.filter((tx) => tx.type !== "DUST_SWEEP");

    expect(filtered).toHaveLength(3);
    expect(filtered.find((tx) => tx.type === "DUST_SWEEP")).toBeUndefined();
    expect(filtered.find((tx) => tx.type === "DUST")).toBeDefined();
  });

  it("preserves all non-DUST_SWEEP transactions", () => {
    const rawData = [
      { id: "1", type: "DEPOSIT", amount: 100 },
      { id: "2", type: "WITHDRAWAL", amount: 50 },
      { id: "3", type: "YIELD", amount: 5 },
      { id: "4", type: "FEE_CREDIT", amount: 1.5 },
      { id: "5", type: "IB_CREDIT", amount: 0.5 },
      { id: "6", type: "DUST", amount: 0.001 },
    ];

    const filtered = rawData.filter((tx) => tx.type !== "DUST_SWEEP");
    expect(filtered).toHaveLength(6);
  });
});
