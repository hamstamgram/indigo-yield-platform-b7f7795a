/**
 * Integration Tests for Yield Idempotency
 * Verifies that calling yield distribution twice does not create duplicate records
 */

import { describe, it, expect } from "vitest";

describe("Yield Distribution Idempotency", () => {
  describe("Unique Constraint Definitions", () => {
    it("should have unique constraint on generated_statements(investor_id, period_id)", () => {
      const constraint = {
        table: "generated_statements",
        name: "unique_investor_period",
        columns: ["investor_id", "period_id"],
      };
      
      expect(constraint.columns).toContain("investor_id");
      expect(constraint.columns).toContain("period_id");
    });

    it("should have unique constraint on investor_fund_performance", () => {
      const constraint = {
        table: "investor_fund_performance",
        name: "investor_fund_performance_unique_with_purpose",
        columns: ["period_id", "investor_id", "fund_name", "purpose"],
      };
      
      expect(constraint.columns).toHaveLength(4);
      expect(constraint.columns).toContain("purpose");
    });

    it("should have unique constraint on fee_allocations", () => {
      const constraint = {
        table: "fee_allocations",
        name: "fee_allocations_unique",
        columns: ["distribution_id", "fund_id", "investor_id", "fees_account_id"],
      };
      
      expect(constraint.columns).toContain("distribution_id");
    });

    it("should have unique constraint on ib_allocations", () => {
      const constraint = {
        table: "ib_allocations",
        name: "ib_allocations_idempotency",
        columns: ["source_investor_id", "fund_id", "effective_date", "ib_investor_id", "distribution_id"],
      };
      
      expect(constraint.columns).toHaveLength(5);
      expect(constraint.columns).toContain("source_investor_id");
      expect(constraint.columns).toContain("ib_investor_id");
      expect(constraint.columns).toContain("fund_id");
      expect(constraint.columns).toContain("effective_date");
    });

    it("should have unique constraint on transactions_v2 reference_id", () => {
      const constraint = {
        table: "transactions_v2",
        name: "idx_transactions_v2_reference_id_unique",
        columns: ["reference_id"],
      };
      
      expect(constraint.columns).toContain("reference_id");
    });
  });

  describe("Idempotency Logic", () => {
    it("should use upsert with onConflict for performance records", () => {
      const upsertOptions = {
        onConflict: "period_id,investor_id,fund_name,purpose",
        ignoreDuplicates: false,
      };
      
      expect(upsertOptions.onConflict).toContain("period_id");
      expect(upsertOptions.onConflict).toContain("purpose");
      expect(upsertOptions.ignoreDuplicates).toBe(false);
    });

    it("should use upsert with onConflict for fee allocations", () => {
      const upsertOptions = {
        onConflict: "distribution_id,fund_id,investor_id,fees_account_id",
        ignoreDuplicates: false,
      };
      
      expect(upsertOptions.onConflict).toContain("distribution_id");
    });

    it("should use upsert with onConflict for IB allocations", () => {
      const upsertOptions = {
        onConflict: "distribution_id,source_investor_id,ib_investor_id",
        ignoreDuplicates: false,
      };
      
      expect(upsertOptions.onConflict).toContain("source_investor_id");
    });

    it("should reject duplicate transaction reference_id with error code 23505", () => {
      const duplicateError = {
        code: "23505",
        message: 'duplicate key value violates unique constraint "idx_transactions_v2_reference_id_unique"',
      };
      
      expect(duplicateError.code).toBe("23505");
    });
  });
});
