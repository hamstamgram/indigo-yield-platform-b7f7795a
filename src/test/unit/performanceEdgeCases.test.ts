/**
 * Unit Tests for Performance Calculation Edge Cases
 * Tests the canonical formula: net_income = ending - beginning - additions + redemptions
 * rate_of_return = net_income / beginning_balance (0 if beginning <= 0)
 */

import { describe, it, expect } from "vitest";

// Canonical performance calculation function (mirrors edge function logic)
function calculatePerformanceMetrics(
  endingBalance: number,
  beginningBalance: number,
  additions: number,
  redemptions: number
): { netIncome: number; rateOfReturn: number } {
  // CORRECT formula per audit requirements:
  const netIncome = endingBalance - beginningBalance - additions + redemptions;
  
  // Avoid divide by zero - return 0% if no beginning balance
  if (beginningBalance <= 0) {
    return { netIncome, rateOfReturn: 0 };
  }
  
  const rateOfReturn = (netIncome / beginningBalance) * 100;
  return { netIncome, rateOfReturn };
}

// Reconciliation verification (formula: beginning + additions - redemptions + net_income = ending)
function verifyReconciliation(
  beginning: number,
  additions: number,
  redemptions: number,
  netIncome: number,
  ending: number
): boolean {
  const calculated = beginning + additions - redemptions + netIncome;
  return Math.abs(calculated - ending) < 0.00000001;
}

describe("Performance Calculation Edge Cases", () => {
  describe("Standard Cases", () => {
    it("should calculate correctly for normal month with yield", () => {
      // Beginning: 10 BTC, +0.05 yield, -0.01 fee = 10.04 ending
      const result = calculatePerformanceMetrics(10.04, 10.0, 0, 0);
      
      expect(result.netIncome).toBeCloseTo(0.04, 8);
      expect(result.rateOfReturn).toBeCloseTo(0.4, 2); // 0.4%
      expect(verifyReconciliation(10.0, 0, 0, result.netIncome, 10.04)).toBe(true);
    });

    it("should calculate correctly with additions", () => {
      // Beginning: 10, +5 deposit, +0.075 yield = 15.075 ending
      const result = calculatePerformanceMetrics(15.075, 10.0, 5.0, 0);
      
      expect(result.netIncome).toBeCloseTo(0.075, 8);
      expect(result.rateOfReturn).toBeCloseTo(0.75, 2); // 0.75%
      expect(verifyReconciliation(10.0, 5.0, 0, result.netIncome, 15.075)).toBe(true);
    });

    it("should calculate correctly with redemptions", () => {
      // Beginning: 10, -2 redemption, +0.04 yield = 8.04 ending
      const result = calculatePerformanceMetrics(8.04, 10.0, 0, 2.0);
      
      expect(result.netIncome).toBeCloseTo(0.04, 8);
      expect(result.rateOfReturn).toBeCloseTo(0.4, 2); // 0.4%
      expect(verifyReconciliation(10.0, 0, 2.0, result.netIncome, 8.04)).toBe(true);
    });

    it("should calculate correctly with both additions and redemptions", () => {
      // Beginning: 10, +3 deposit, -5 redemption, +0.04 yield = 8.04 ending
      const result = calculatePerformanceMetrics(8.04, 10.0, 3.0, 5.0);
      
      expect(result.netIncome).toBeCloseTo(0.04, 8);
      expect(result.rateOfReturn).toBeCloseTo(0.4, 2);
      expect(verifyReconciliation(10.0, 3.0, 5.0, result.netIncome, 8.04)).toBe(true);
    });
  });

  describe("Edge Case: Beginning Balance = 0 (New Investor)", () => {
    it("should return 0% RoR when beginning balance is 0", () => {
      // New investor: 0 beginning, +10 deposit, +0.05 yield, -0.01 fee = 10.04 ending
      const result = calculatePerformanceMetrics(10.04, 0, 10.0, 0);
      
      expect(result.netIncome).toBeCloseTo(0.04, 8);
      expect(result.rateOfReturn).toBe(0); // Should be 0, not NaN or Infinity
      expect(verifyReconciliation(0, 10.0, 0, result.netIncome, 10.04)).toBe(true);
    });

    it("should handle first investment with no yield yet", () => {
      // New investor: 0 beginning, +10 deposit, no yield = 10.0 ending
      const result = calculatePerformanceMetrics(10.0, 0, 10.0, 0);
      
      expect(result.netIncome).toBe(0);
      expect(result.rateOfReturn).toBe(0);
      expect(verifyReconciliation(0, 10.0, 0, result.netIncome, 10.0)).toBe(true);
    });
  });

  describe("Edge Case: Full Redemption (Ending Balance = 0)", () => {
    it("should calculate correctly for full exit with positive yield", () => {
      // Beginning: 10, earned 0.05 yield, then fully redeemed 10.05
      const result = calculatePerformanceMetrics(0, 10.0, 0, 10.05);
      
      expect(result.netIncome).toBeCloseTo(0.05, 8); // Earned before exit
      expect(result.rateOfReturn).toBeCloseTo(0.5, 2); // 0.5%
      expect(verifyReconciliation(10.0, 0, 10.05, result.netIncome, 0)).toBe(true);
    });

    it("should calculate correctly for full exit at exact balance", () => {
      // Beginning: 10, no yield, fully redeemed 10
      const result = calculatePerformanceMetrics(0, 10.0, 0, 10.0);
      
      expect(result.netIncome).toBe(0);
      expect(result.rateOfReturn).toBe(0);
      expect(verifyReconciliation(10.0, 0, 10.0, result.netIncome, 0)).toBe(true);
    });

    it("should calculate correctly for full exit with loss", () => {
      // Beginning: 10, -0.5 loss, fully redeemed 9.5
      const result = calculatePerformanceMetrics(0, 10.0, 0, 9.5);
      
      expect(result.netIncome).toBeCloseTo(-0.5, 8);
      expect(result.rateOfReturn).toBeCloseTo(-5.0, 2); // -5%
      expect(verifyReconciliation(10.0, 0, 9.5, result.netIncome, 0)).toBe(true);
    });
  });

  describe("Edge Case: Negative Net Income (Loss)", () => {
    it("should correctly calculate negative returns", () => {
      // Beginning: 100, -5 loss = 95 ending
      const result = calculatePerformanceMetrics(95.0, 100.0, 0, 0);
      
      expect(result.netIncome).toBe(-5);
      expect(result.rateOfReturn).toBe(-5); // -5%
      expect(verifyReconciliation(100.0, 0, 0, result.netIncome, 95.0)).toBe(true);
    });

    it("should correctly calculate large losses", () => {
      // Beginning: 100, -50 loss = 50 ending
      const result = calculatePerformanceMetrics(50.0, 100.0, 0, 0);
      
      expect(result.netIncome).toBe(-50);
      expect(result.rateOfReturn).toBe(-50); // -50%
      expect(verifyReconciliation(100.0, 0, 0, result.netIncome, 50.0)).toBe(true);
    });

    it("should handle loss with additional deposits", () => {
      // Beginning: 100, +20 deposit, -10 loss = 110 ending
      const result = calculatePerformanceMetrics(110.0, 100.0, 20.0, 0);
      
      expect(result.netIncome).toBe(-10);
      expect(result.rateOfReturn).toBe(-10); // -10% on beginning balance
      expect(verifyReconciliation(100.0, 20.0, 0, result.netIncome, 110.0)).toBe(true);
    });
  });

  describe("Edge Case: Very Small Values (Precision)", () => {
    it("should handle very small balances", () => {
      // Micro balances: 0.00001 BTC
      const result = calculatePerformanceMetrics(0.00001004, 0.00001, 0, 0);
      
      expect(result.netIncome).toBeCloseTo(0.00000004, 10);
      expect(result.rateOfReturn).toBeCloseTo(0.4, 2);
      expect(verifyReconciliation(0.00001, 0, 0, result.netIncome, 0.00001004)).toBe(true);
    });

    it("should handle 8 decimal places (satoshi precision)", () => {
      // 1 satoshi = 0.00000001 BTC
      const result = calculatePerformanceMetrics(1.00000001, 1.0, 0, 0);
      
      expect(result.netIncome).toBeCloseTo(0.00000001, 10);
      expect(verifyReconciliation(1.0, 0, 0, result.netIncome, 1.00000001)).toBe(true);
    });
  });

  describe("Edge Case: Negative Beginning Balance (Error State)", () => {
    it("should return 0% RoR for negative beginning balance", () => {
      // This shouldn't happen in practice, but should handle gracefully
      const result = calculatePerformanceMetrics(10.0, -5.0, 15.0, 0);
      
      expect(result.rateOfReturn).toBe(0); // Don't divide by negative
    });
  });

  describe("ITD (Inception-to-Date) Special Case", () => {
    it("should calculate ITD RoR based on total principal, not beginning", () => {
      // ITD: beginning is always 0
      // Total principal = additions - redemptions
      // ITD RoR = net_income / total_principal
      
      const ending = 10.5;
      const beginning = 0; // ITD always starts at 0
      const additions = 10.0;
      const redemptions = 0;
      
      const result = calculatePerformanceMetrics(ending, beginning, additions, redemptions);
      
      // Net income calculation is still correct
      expect(result.netIncome).toBeCloseTo(0.5, 8);
      
      // But ITD RoR needs special handling (done in edge function)
      const totalPrincipal = additions - redemptions;
      const itdRoR = totalPrincipal > 0 ? (result.netIncome / totalPrincipal) * 100 : 0;
      
      expect(itdRoR).toBeCloseTo(5.0, 2); // 5% return on invested capital
    });
  });
});

describe("Reconciliation Formula Verification", () => {
  const testCases = [
    { name: "Normal yield", beginning: 10, additions: 0, redemptions: 0, netIncome: 0.04, ending: 10.04 },
    { name: "With deposit", beginning: 10, additions: 5, redemptions: 0, netIncome: 0.075, ending: 15.075 },
    { name: "With redemption", beginning: 10, additions: 0, redemptions: 2, netIncome: 0.04, ending: 8.04 },
    { name: "Both flows", beginning: 10, additions: 3, redemptions: 5, netIncome: 0.04, ending: 8.04 },
    { name: "New investor", beginning: 0, additions: 10, redemptions: 0, netIncome: 0.04, ending: 10.04 },
    { name: "Full exit", beginning: 10, additions: 0, redemptions: 10.05, netIncome: 0.05, ending: 0 },
    { name: "Loss", beginning: 100, additions: 0, redemptions: 0, netIncome: -5, ending: 95 },
  ];

  testCases.forEach(({ name, beginning, additions, redemptions, netIncome, ending }) => {
    it(`should reconcile: ${name}`, () => {
      const isValid = verifyReconciliation(beginning, additions, redemptions, netIncome, ending);
      expect(isValid).toBe(true);
    });
  });
});
