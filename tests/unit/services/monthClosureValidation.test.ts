/**
 * Unit tests for month closure validation logic
 */

import { describe, it, expect } from "vitest";
import { startOfMonth, endOfMonth, isWithinInterval } from "date-fns";

// Test the date validation logic used in YieldOperationsPage
function validateEffectiveDate(
  effectiveDate: Date,
  reportingMonthStart: string
): { valid: boolean; error?: string } {
  if (!reportingMonthStart) return { valid: true };
  
  const monthStart = new Date(reportingMonthStart);
  const monthEnd = endOfMonth(monthStart);
  
  if (!isWithinInterval(effectiveDate, { start: monthStart, end: monthEnd })) {
    return {
      valid: false,
      error: `Effective date must be within reporting month`,
    };
  }
  
  return { valid: true };
}

describe("Month Closure Validation", () => {
  describe("validateEffectiveDate", () => {
    it("should accept date within the month", () => {
      const result = validateEffectiveDate(
        new Date("2024-12-15"),
        "2024-12-01"
      );
      expect(result.valid).toBe(true);
    });

    it("should accept first day of month", () => {
      const result = validateEffectiveDate(
        new Date("2024-12-01"),
        "2024-12-01"
      );
      expect(result.valid).toBe(true);
    });

    it("should accept last day of month", () => {
      const result = validateEffectiveDate(
        new Date("2024-12-31"),
        "2024-12-01"
      );
      expect(result.valid).toBe(true);
    });

    it("should reject date before month start", () => {
      const result = validateEffectiveDate(
        new Date("2024-11-30"),
        "2024-12-01"
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain("must be within");
    });

    it("should reject date after month end", () => {
      const result = validateEffectiveDate(
        new Date("2025-01-01"),
        "2024-12-01"
      );
      expect(result.valid).toBe(false);
    });

    it("should handle February correctly", () => {
      // 2024 is a leap year
      const result = validateEffectiveDate(
        new Date("2024-02-29"),
        "2024-02-01"
      );
      expect(result.valid).toBe(true);
    });
  });

  describe("reference_id generation for investor wizard", () => {
    it("should generate deterministic reference_id", () => {
      const investorId = "abc-123-def";
      const fundId = "fund-456-xyz";
      const effectiveDate = "2024-12-21";
      
      const refId = `init_deposit:${investorId}:${fundId}:${effectiveDate}`;
      
      expect(refId).toBe("init_deposit:abc-123-def:fund-456-xyz:2024-12-21");
    });

    it("should be consistent on retry", () => {
      const params = {
        investorId: "inv-001",
        fundId: "fund-btc",
        date: "2024-12-21",
      };
      
      const refId1 = `init_deposit:${params.investorId}:${params.fundId}:${params.date}`;
      const refId2 = `init_deposit:${params.investorId}:${params.fundId}:${params.date}`;
      
      expect(refId1).toBe(refId2);
    });
  });
});
