/**
 * Performance Calculation Tests
 * 
 * Canonical Formula:
 * - net_income = ending_balance - beginning_balance - additions + redemptions
 * - rate_of_return = net_income / beginning_balance (0 if beginning_balance <= 0)
 * 
 * Edge Cases:
 * - First investment mid-month: beginning_balance = 0, rate_of_return = 0
 * - Full exit mid-month: ending_balance = 0
 * - Top-ups and redemptions in same period
 * - Negative net income
 */

import { describe, it, expect } from 'vitest';
import { calculateRateOfReturn } from '../statementCalculations';

describe('Performance Calculations - Canonical Formula', () => {
  /**
   * Test Vector Table (10 scenarios)
   * 
   * | # | Beginning | Ending | Additions | Redemptions | Expected Net Income | Expected RoR |
   * |---|-----------|--------|-----------|-------------|---------------------|--------------|
   * | 1 | 10,000    | 10,500 | 0         | 0           | 500                 | 5%           |
   * | 2 | 10,000    | 11,000 | 1,000     | 0           | 0                   | 0%           |
   * | 3 | 10,000    | 9,500  | 0         | 500         | 0                   | 0%           |
   * | 4 | 10,000    | 10,800 | 1,000     | 500         | 300                 | 3%           |
   * | 5 | 0         | 5,000  | 5,000     | 0           | 0                   | 0%           |
   * | 6 | 10,000    | 0      | 0         | 10,500      | 500                 | 5%           |
   * | 7 | 10,000    | 9,000  | 0         | 0           | -1,000              | -10%         |
   * | 8 | 10,000    | 8,500  | 500       | 1,000       | -1,000              | -10%         |
   * | 9 | 5,000     | 12,000 | 5,000     | 0           | 2,000               | 40%          |
   * |10 | 0         | 0      | 1,000     | 1,000       | 0                   | 0%           |
   */

  // Scenario 1: Simple growth, no cash flows
  it('should calculate 5% return on simple growth with no cash flows', () => {
    const result = calculateRateOfReturn(10000, 10500, 0, 0);
    expect(result.netIncome).toBe(500);
    expect(result.rateOfReturn).toBeCloseTo(5, 2);
  });

  // Scenario 2: Addition exactly matches growth (zero net income)
  it('should calculate 0% return when addition matches apparent growth', () => {
    const result = calculateRateOfReturn(10000, 11000, 1000, 0);
    expect(result.netIncome).toBe(0);
    expect(result.rateOfReturn).toBe(0);
  });

  // Scenario 3: Redemption exactly matches apparent loss (zero net income)
  it('should calculate 0% return when redemption matches apparent loss', () => {
    const result = calculateRateOfReturn(10000, 9500, 0, 500);
    expect(result.netIncome).toBe(0);
    expect(result.rateOfReturn).toBe(0);
  });

  // Scenario 4: Both additions and redemptions in same period
  it('should handle both additions and redemptions correctly', () => {
    const result = calculateRateOfReturn(10000, 10800, 1000, 500);
    // net_income = 10800 - 10000 - 1000 + 500 = 300
    expect(result.netIncome).toBe(300);
    expect(result.rateOfReturn).toBeCloseTo(3, 2);
  });

  // Scenario 5: First investment mid-month (beginning = 0)
  it('should handle first investment mid-month with 0% return', () => {
    const result = calculateRateOfReturn(0, 5000, 5000, 0);
    // net_income = 5000 - 0 - 5000 + 0 = 0
    expect(result.netIncome).toBe(0);
    expect(result.rateOfReturn).toBe(0); // Avoid divide by zero
  });

  // Scenario 6: Full exit mid-month with profit
  it('should calculate positive return on full exit with profit', () => {
    const result = calculateRateOfReturn(10000, 0, 0, 10500);
    // net_income = 0 - 10000 - 0 + 10500 = 500
    expect(result.netIncome).toBe(500);
    expect(result.rateOfReturn).toBeCloseTo(5, 2);
  });

  // Scenario 7: Simple loss, no cash flows
  it('should calculate negative return on simple loss', () => {
    const result = calculateRateOfReturn(10000, 9000, 0, 0);
    // net_income = 9000 - 10000 - 0 + 0 = -1000
    expect(result.netIncome).toBe(-1000);
    expect(result.rateOfReturn).toBeCloseTo(-10, 2);
  });

  // Scenario 8: Loss with mixed cash flows
  it('should calculate negative return with mixed cash flows', () => {
    const result = calculateRateOfReturn(10000, 8500, 500, 1000);
    // net_income = 8500 - 10000 - 500 + 1000 = -1000
    expect(result.netIncome).toBe(-1000);
    expect(result.rateOfReturn).toBeCloseTo(-10, 2);
  });

  // Scenario 9: Large growth with additions
  it('should calculate high return with significant growth', () => {
    const result = calculateRateOfReturn(5000, 12000, 5000, 0);
    // net_income = 12000 - 5000 - 5000 + 0 = 2000
    expect(result.netIncome).toBe(2000);
    expect(result.rateOfReturn).toBeCloseTo(40, 2);
  });

  // Scenario 10: Equal additions and redemptions with zero balance
  it('should handle zero beginning and ending with equal flows', () => {
    const result = calculateRateOfReturn(0, 0, 1000, 1000);
    // net_income = 0 - 0 - 1000 + 1000 = 0
    expect(result.netIncome).toBe(0);
    expect(result.rateOfReturn).toBe(0); // Avoid divide by zero
  });

  // Additional edge cases

  // Scenario 11: Very small beginning balance (precision test)
  it('should handle small balances with precision', () => {
    const result = calculateRateOfReturn(0.01, 0.02, 0, 0);
    expect(result.netIncome).toBeCloseTo(0.01, 4);
    expect(result.rateOfReturn).toBeCloseTo(100, 2);
  });

  // Scenario 12: Negative beginning balance (should not happen, but handle gracefully)
  it('should return 0% RoR for negative beginning balance', () => {
    const result = calculateRateOfReturn(-1000, 500, 0, 0);
    expect(result.netIncome).toBe(1500);
    expect(result.rateOfReturn).toBe(0); // Avoid negative denominator issues
  });

  // Scenario 13: Large numbers (precision test)
  it('should handle large numbers correctly', () => {
    const result = calculateRateOfReturn(1000000000, 1050000000, 0, 0);
    expect(result.netIncome).toBe(50000000);
    expect(result.rateOfReturn).toBeCloseTo(5, 2);
  });
});

describe('Formula Consistency Verification', () => {
  it('should verify net_income = ending - beginning - additions + redemptions', () => {
    // Exhaustive check of the formula
    const testCases = [
      { begin: 100, end: 150, add: 20, red: 10, expected: 40 },
      { begin: 1000, end: 1100, add: 100, red: 50, expected: 50 },
      { begin: 500, end: 400, add: 0, red: 50, expected: -50 },
    ];

    testCases.forEach(({ begin, end, add, red, expected }) => {
      const result = calculateRateOfReturn(begin, end, add, red);
      expect(result.netIncome).toBe(expected);
    });
  });

  it('should verify rate_of_return = net_income / beginning_balance * 100', () => {
    const testCases = [
      { begin: 1000, netIncome: 100, expectedRoR: 10 },
      { begin: 500, netIncome: 50, expectedRoR: 10 },
      { begin: 2000, netIncome: -200, expectedRoR: -10 },
    ];

    testCases.forEach(({ begin, netIncome, expectedRoR }) => {
      // Construct inputs that produce the desired netIncome
      const end = begin + netIncome;
      const result = calculateRateOfReturn(begin, end, 0, 0);
      expect(result.rateOfReturn).toBeCloseTo(expectedRoR, 2);
    });
  });
});
