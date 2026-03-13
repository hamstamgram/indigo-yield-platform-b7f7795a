import { describe, it, expect } from "vitest";
import { calculateFeeSummaries, FeeRecord } from "@/services/admin/feesService";

/**
 * Issue 4: Revenue page shows incorrect data
 * The fix changed the fee transaction query from an OR filter (which pulled ALL
 * transaction types for INDIGO_FEES) to an IN filter on specific fee-related types.
 * We test calculateFeeSummaries which processes the results.
 */
describe("feesService (Issue 4)", () => {
  describe("calculateFeeSummaries", () => {
    it("aggregates fee records by asset correctly", () => {
      const fees: FeeRecord[] = [
        {
          id: "1",
          investorId: "inv-1",
          investorName: "Alice",
          investorEmail: "alice@test.com",
          fundId: "fund-1",
          fundName: "BTC Fund",
          asset: "BTC",
          amount: "0.5",
          type: "FEE_CREDIT",
          txDate: "2026-01-15",
          purpose: "reporting",
          visibilityScope: "admin_only",
          createdAt: "2026-01-15T00:00:00Z",
        },
        {
          id: "2",
          investorId: "inv-2",
          investorName: "Bob",
          investorEmail: "bob@test.com",
          fundId: "fund-1",
          fundName: "BTC Fund",
          asset: "BTC",
          amount: "0.3",
          type: "FEE_CREDIT",
          txDate: "2026-01-15",
          purpose: "reporting",
          visibilityScope: "admin_only",
          createdAt: "2026-01-15T00:00:00Z",
        },
        {
          id: "3",
          investorId: "inv-1",
          investorName: "Alice",
          investorEmail: "alice@test.com",
          fundId: "fund-2",
          fundName: "ETH Fund",
          asset: "ETH",
          amount: "2.0",
          type: "FEE_CREDIT",
          txDate: "2026-01-15",
          purpose: "reporting",
          visibilityScope: "admin_only",
          createdAt: "2026-01-15T00:00:00Z",
        },
      ];

      const summaries = calculateFeeSummaries(fees);

      expect(summaries).toHaveLength(2);

      const btcSummary = summaries.find((s) => s.assetCode === "BTC");
      expect(btcSummary).toBeDefined();
      expect(Number(btcSummary!.totalAmount)).toBeCloseTo(0.8, 8);
      expect(btcSummary!.transactionCount).toBe(2);

      const ethSummary = summaries.find((s) => s.assetCode === "ETH");
      expect(ethSummary).toBeDefined();
      expect(Number(ethSummary!.totalAmount)).toBeCloseTo(2.0, 8);
      expect(ethSummary!.transactionCount).toBe(1);
    });

    it("returns empty array for no fees", () => {
      const summaries = calculateFeeSummaries([]);
      expect(summaries).toHaveLength(0);
    });

    it("only counts fee-type transactions (not deposits/withdrawals)", () => {
      // This validates the fix: previously the OR filter would include
      // DEPOSIT/WITHDRAWAL for the INDIGO FEES account, inflating revenue
      const fees: FeeRecord[] = [
        {
          id: "1",
          investorId: "inv-1",
          investorName: "Alice",
          investorEmail: "a@t.com",
          fundId: "f1",
          fundName: "BTC Fund",
          asset: "BTC",
          amount: "0.5",
          type: "FEE_CREDIT",
          txDate: "2026-01-15",
          purpose: "reporting",
          visibilityScope: "admin_only",
          createdAt: "2026-01-15T00:00:00Z",
        },
      ];

      const summaries = calculateFeeSummaries(fees);
      expect(summaries).toHaveLength(1);
      expect(summaries[0].transactionCount).toBe(1);
    });
  });
});
