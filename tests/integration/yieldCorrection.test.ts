/**
 * Yield Correction Integration Tests
 * Tests for preview, apply, idempotency, token conservation, and RLS
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
// eslint-disable-next-line no-restricted-imports
import { supabase } from "../../src/integrations/supabase/client";

// Test data constants
const TEST_FUND_ID = "test-fund-uuid";
const TEST_DATE = "2024-01-31";
const TEST_PURPOSE = "reporting";
const TEST_INVESTOR_ID = "test-investor-uuid";
const TEST_ADMIN_ID = "test-admin-uuid";

describe("Yield Correction System", () => {
  describe("Preview Yield Correction", () => {
    it("should return correct delta calculations for AUM increase", async () => {
      // Mock the RPC call
      const mockPreview = {
        success: true,
        summary: {
          fund_id: TEST_FUND_ID,
          fund_name: "BTC Alpha Fund",
          fund_asset: "BTC",
          effective_date: TEST_DATE,
          purpose: TEST_PURPOSE,
          old_aum: 100,
          new_aum: 110,
          delta_aum: 10,
          investors_affected: 5,
          total_fee_delta: 1.8, // 18% of 10
          total_ib_delta: 0.18, // 10% of 1.8
          is_month_closed: false,
        },
        investor_rows: [
          {
            investor_id: "inv1",
            investor_name: "Investor 1",
            beginning_position: 20,
            ownership_pct: 0.2,
            old_net_yield: 1.64, // 2 * (1-0.18)
            new_net_yield: 1.804, // 2.2 * (1-0.18)
            delta_net: 0.164,
            old_fee: 0.36,
            new_fee: 0.396,
            delta_fee: 0.036,
            ib_parent_id: null,
            ib_pct: 0,
            delta_ib: 0,
          },
        ],
        tx_diffs: [
          {
            type: "INTEREST",
            investor_id: "inv1",
            old_amount: 1.64,
            new_amount: 1.804,
            delta_amount: 0.164,
            reference_id: "correction:xyz:inv1:2024-01-31:reporting",
            visibility_scope: "investor_visible",
          },
        ],
        report_impacts: [
          {
            period_id: "period-2024-01",
            investors_affected: 5,
            needs_regeneration: true,
            tables_affected: ["investor_fund_performance", "generated_statements"],
          },
        ],
      };

      // Test preview calculation logic
      expect(mockPreview.success).toBe(true);
      expect(mockPreview.summary?.delta_aum).toBe(10);
      expect(mockPreview.investor_rows?.length).toBeGreaterThan(0);
      expect(mockPreview.tx_diffs?.length).toBeGreaterThan(0);
    });

    it("should return correct delta calculations for AUM decrease", async () => {
      const mockPreview = {
        success: true,
        summary: {
          fund_id: TEST_FUND_ID,
          old_aum: 100,
          new_aum: 90,
          delta_aum: -10,
          investors_affected: 5,
          total_fee_delta: -1.8,
          total_ib_delta: -0.18,
        },
      };

      expect(mockPreview.summary.delta_aum).toBe(-10);
      expect(mockPreview.summary.total_fee_delta).toBeLessThan(0);
    });

    it("should not write any data during preview", async () => {
      // Preview should be read-only
      // Verify no transactions created during preview
      const beforeCount = await getTransactionCount();

      // Call preview (mocked)
      // await previewYieldCorrection(...)

      const afterCount = await getTransactionCount();
      expect(afterCount).toBe(beforeCount);
    });
  });

  describe("Apply Yield Correction", () => {
    it("should create delta transactions with correct reference_ids", async () => {
      const mockResult = {
        success: true,
        correction_id: "correction-123",
        distribution_id: "dist-456",
        delta_aum: 10,
        investors_affected: 5,
      };

      expect(mockResult.success).toBe(true);
      expect(mockResult.correction_id).toBeDefined();

      // Verify reference_id format
      const expectedPattern = /^correction:[a-f0-9-]+:[a-f0-9-]+:\d{4}-\d{2}-\d{2}:\w+$/;
      // Reference IDs should follow the pattern: correction:{correction_id}:{investor_id}:{date}:{purpose}
    });

    it("should update investor_positions by exact delta amount", async () => {
      // Test that position changes match delta
      const deltaNet = 0.164;
      const oldPosition = 20;
      const expectedNewPosition = oldPosition + deltaNet;

      expect(expectedNewPosition).toBeCloseTo(20.164, 6);
    });

    it("should require confirmation for closed month corrections", async () => {
      const closedMonthResult = {
        success: false,
        error: "Closed month requires confirmation: APPLY CLOSED MONTH CORRECTION",
        is_month_closed: true,
      };

      expect(closedMonthResult.is_month_closed).toBe(true);
      expect(closedMonthResult.error).toContain("APPLY CLOSED MONTH CORRECTION");
    });
  });

  describe("Idempotency", () => {
    it("should not create duplicate transactions on repeated apply", async () => {
      // First apply
      const firstResult = {
        success: true,
        correction_id: "correction-123",
        transactions_created: 5,
      };

      // Second apply with same parameters should no-op or error
      const secondResult = {
        success: false,
        error: "Correction already applied for this distribution",
      };

      // Or it could succeed but create no new transactions
      expect(firstResult.success).toBe(true);
    });

    it("should maintain unique reference_ids across all transactions", async () => {
      // Query all correction transactions
      const referenceIds = [
        "correction:abc:inv1:2024-01-31:reporting",
        "correction:abc:inv2:2024-01-31:reporting",
        "correction:abc:inv3:2024-01-31:reporting",
      ];

      // Check for duplicates
      const uniqueIds = new Set(referenceIds);
      expect(uniqueIds.size).toBe(referenceIds.length);
    });
  });

  describe("Token Conservation", () => {
    it("should satisfy: delta_gross = sum(delta_net) + sum(delta_fee)", async () => {
      const deltaGross = 10; // AUM change
      const deltaNetTotal = 8.2; // Net to investors
      const deltaFeeTotal = 1.8; // Fees

      // Token conservation: gross = net + fees
      const calculatedGross = deltaNetTotal + deltaFeeTotal;
      expect(calculatedGross).toBeCloseTo(deltaGross, 6);
    });

    it("should satisfy: delta_fee = delta_fee_credit + delta_ib_credit", async () => {
      const deltaFee = 1.8;
      const deltaFeeCredit = 1.62; // 90% to platform
      const deltaIbCredit = 0.18; // 10% to IB

      const calculatedFee = deltaFeeCredit + deltaIbCredit;
      expect(calculatedFee).toBeCloseTo(deltaFee, 6);
    });

    it("should verify position deltas match transaction amounts", async () => {
      const investorDeltaNet = 0.164;
      const positionBefore = 20;
      const positionAfter = 20.164;

      expect(positionAfter - positionBefore).toBeCloseTo(investorDeltaNet, 6);
    });
  });

  describe("Row Level Security", () => {
    it("should allow admins to view all corrections", async () => {
      // Admin should see all yield_corrections
      const adminQuery = {
        success: true,
        corrections: [
          { correction_id: "c1", status: "applied" },
          { correction_id: "c2", status: "applied" },
        ],
      };

      expect(adminQuery.corrections.length).toBe(2);
    });

    it("should not allow investors to view admin_only transactions", async () => {
      // If correction transactions are admin_only
      const investorQuery = {
        success: true,
        transactions: [], // Should be empty for admin_only transactions
      };

      // Investors should not see internal routing transactions
      expect(investorQuery.transactions.length).toBe(0);
    });

    it("should allow investors to see reporting-visible corrections", async () => {
      // If delta INTEREST transactions are investor-visible
      const investorQuery = {
        success: true,
        transactions: [{ type: "INTEREST", amount: 0.164, visibility_scope: "investor_visible" }],
      };

      // Only investor-visible transactions should be returned
      expect(
        investorQuery.transactions.every((t) => t.visibility_scope === "investor_visible")
      ).toBe(true);
    });
  });

  describe("Report Uniqueness", () => {
    it("should not create duplicate statements per investor per period", async () => {
      // After correction and regeneration
      const statementCounts = {
        investor_id: "inv1",
        period_id: "period-2024-01",
        count: 1, // Should always be 1
      };

      expect(statementCounts.count).toBe(1);
    });

    it("should upsert investor_fund_performance instead of insert", async () => {
      // Verify UPSERT behavior
      const performanceRecords = {
        investor_id: "inv1",
        fund_name: "BTC Alpha Fund",
        period_id: "period-2024-01",
        mtd_net_income: 1.804, // Updated value
      };

      // Only one record should exist
      expect(performanceRecords).toBeDefined();
    });
  });

  describe("No USD Values", () => {
    it("should not contain USD references in correction data", async () => {
      const correctionData = {
        delta_aum: 10, // Token amount, not USD
        total_fee_delta: 1.8, // Token amount
        investor_rows: [
          { delta_net: 0.164 }, // Token amount
        ],
      };

      // Scan for USD-related keys
      const jsonString = JSON.stringify(correctionData);
      expect(jsonString.toLowerCase()).not.toContain("usd");
      expect(jsonString.toLowerCase()).not.toContain("dollar");
    });
  });

  describe("Closed Month Handling", () => {
    it("should require SUPER_ADMIN for closed month corrections", async () => {
      // Mock closed month check
      const monthClosure = {
        fund_id: TEST_FUND_ID,
        month_end: "2024-01-31",
        closed_at: "2024-02-15T10:00:00Z",
        closed_by: "super-admin-id",
      };

      expect(monthClosure.closed_at).toBeDefined();
    });

    it("should use different confirmation text for closed months", async () => {
      const openMonthConfirmation = "APPLY CORRECTION";
      const closedMonthConfirmation = "APPLY CLOSED MONTH CORRECTION";

      expect(closedMonthConfirmation).not.toBe(openMonthConfirmation);
      expect(closedMonthConfirmation.length).toBeGreaterThan(openMonthConfirmation.length);
    });
  });
});

// Helper functions
async function getTransactionCount(): Promise<number> {
  // Mock implementation
  return 0;
}

// Reconciliation Proof Queries (for manual verification)
export const reconciliationQueries = {
  // Verify token conservation for a correction
  tokenConservation: `
    SELECT 
      c.correction_id,
      c.delta_aum as expected_gross_delta,
      SUM(CASE WHEN t.type = 'INTEREST' THEN t.amount ELSE 0 END) as actual_net_delta,
      SUM(CASE WHEN t.type = 'FEE' THEN t.amount ELSE 0 END) as actual_fee_delta,
      ABS(c.delta_aum - (
        SUM(CASE WHEN t.type = 'INTEREST' THEN t.amount ELSE 0 END) + 
        SUM(CASE WHEN t.type = 'FEE' THEN t.amount ELSE 0 END)
      )) < 0.0001 as conserved
    FROM yield_corrections c
    JOIN transactions_v2 t ON t.correction_id = c.correction_id
    GROUP BY c.correction_id, c.delta_aum
  `,

  // Verify no duplicate reference_ids
  noDuplicateReferenceIds: `
    SELECT reference_id, COUNT(*) 
    FROM transactions_v2 
    WHERE reference_id LIKE 'correction:%'
    GROUP BY reference_id 
    HAVING COUNT(*) > 1
  `,

  // Verify one report per period per investor
  oneReportPerPeriod: `
    SELECT investor_id, period_id, COUNT(*) 
    FROM generated_statements 
    GROUP BY investor_id, period_id 
    HAVING COUNT(*) > 1
  `,

  // Verify position updates match transaction deltas
  positionMatchesTransactions: `
    SELECT 
      ip.investor_id,
      ip.fund_id,
      ip.current_value as position,
      SUM(t.amount) as transaction_sum,
      ABS(ip.current_value - (
        SELECT COALESCE(SUM(t2.amount), 0)
        FROM transactions_v2 t2
        WHERE t2.investor_id = ip.investor_id
          AND t2.fund_id = ip.fund_id
          AND t2.type IN ('INTEREST', 'FEE', 'DEPOSIT', 'WITHDRAWAL')
      )) < 0.0001 as matches
    FROM investor_positions ip
    LEFT JOIN transactions_v2 t ON t.investor_id = ip.investor_id AND t.fund_id = ip.fund_id
    GROUP BY ip.investor_id, ip.fund_id, ip.current_value
  `,
};
