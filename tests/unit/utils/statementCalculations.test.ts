/**
 * Statement Calculations Unit Tests
 * 
 * Tests the core financial calculation functions including:
 * - Rate of Return calculation
 * - Net Income derivation
 * - Balance equation validation
 * 
 * @see docs/FINANCIAL_RULEBOOK.md for canonical formulas
 * @see tests/sql/performance_balance_e2e.sql for database-level validation
 */

import { describe, it, expect } from 'vitest';
import { calculateRateOfReturn, formatTokenAmount, formatPercent } from '@/utils/statementCalculations';

describe('calculateRateOfReturn', () => {
  /**
   * Canonical Formula:
   * net_income = ending_balance - beginning_balance - additions + redemptions
   * rate_of_return = (net_income / beginning_balance) * 100 (0 if beginning_balance <= 0)
   */

  describe('Net Income Calculation', () => {
    it('should calculate net income correctly for simple growth', () => {
      // Beginning: 10000, Ending: 10500, no flows
      // net_income = 10500 - 10000 - 0 + 0 = 500
      const result = calculateRateOfReturn(10000, 10500, 0, 0);
      expect(result.netIncome).toBe(500);
    });

    it('should calculate net income correctly with additions', () => {
      // Beginning: 10000, Ending: 11000, Additions: 1000
      // net_income = 11000 - 10000 - 1000 + 0 = 0
      const result = calculateRateOfReturn(10000, 11000, 1000, 0);
      expect(result.netIncome).toBe(0);
    });

    it('should calculate net income correctly with redemptions', () => {
      // Beginning: 10000, Ending: 9500, Redemptions: 500
      // net_income = 9500 - 10000 - 0 + 500 = 0
      const result = calculateRateOfReturn(10000, 9500, 0, 500);
      expect(result.netIncome).toBe(0);
    });

    it('should calculate net income correctly with both flows', () => {
      // Beginning: 10000, Ending: 10800, Additions: 1000, Redemptions: 500
      // net_income = 10800 - 10000 - 1000 + 500 = 300
      const result = calculateRateOfReturn(10000, 10800, 1000, 500);
      expect(result.netIncome).toBe(300);
    });

    it('should calculate negative net income (loss)', () => {
      // Beginning: 10000, Ending: 9000, no flows
      // net_income = 9000 - 10000 - 0 + 0 = -1000
      const result = calculateRateOfReturn(10000, 9000, 0, 0);
      expect(result.netIncome).toBe(-1000);
    });

    it('should calculate net income for full exit with profit', () => {
      // Beginning: 10000, Ending: 0, Redemptions: 10500
      // net_income = 0 - 10000 - 0 + 10500 = 500
      const result = calculateRateOfReturn(10000, 0, 0, 10500);
      expect(result.netIncome).toBe(500);
    });
  });

  describe('Rate of Return Calculation', () => {
    it('should calculate 5% return on simple growth', () => {
      const result = calculateRateOfReturn(10000, 10500, 0, 0);
      expect(result.rateOfReturn).toBeCloseTo(5, 2);
    });

    it('should calculate 0% return when additions match growth', () => {
      const result = calculateRateOfReturn(10000, 11000, 1000, 0);
      expect(result.rateOfReturn).toBe(0);
    });

    it('should calculate negative return on loss', () => {
      const result = calculateRateOfReturn(10000, 9000, 0, 0);
      expect(result.rateOfReturn).toBeCloseTo(-10, 2);
    });

    it('should calculate 3% return with mixed flows', () => {
      const result = calculateRateOfReturn(10000, 10800, 1000, 500);
      expect(result.rateOfReturn).toBeCloseTo(3, 2);
    });

    it('should calculate 40% return with large growth', () => {
      const result = calculateRateOfReturn(5000, 12000, 5000, 0);
      expect(result.rateOfReturn).toBeCloseTo(40, 2);
    });
  });

  describe('Edge Cases', () => {
    it('should return 0% RoR when beginning balance is 0 (new investor)', () => {
      const result = calculateRateOfReturn(0, 5000, 5000, 0);
      expect(result.netIncome).toBe(0);
      expect(result.rateOfReturn).toBe(0);
    });

    it('should return 0% RoR when beginning balance is negative', () => {
      const result = calculateRateOfReturn(-1000, 500, 0, 0);
      expect(result.netIncome).toBe(1500);
      expect(result.rateOfReturn).toBe(0);
    });

    it('should handle zero balance start and end', () => {
      const result = calculateRateOfReturn(0, 0, 1000, 1000);
      expect(result.netIncome).toBe(0);
      expect(result.rateOfReturn).toBe(0);
    });

    it('should handle small balances with precision', () => {
      const result = calculateRateOfReturn(0.01, 0.02, 0, 0);
      expect(result.netIncome).toBeCloseTo(0.01, 4);
      expect(result.rateOfReturn).toBeCloseTo(100, 2);
    });

    it('should handle large numbers correctly', () => {
      const result = calculateRateOfReturn(1000000000, 1050000000, 0, 0);
      expect(result.netIncome).toBe(50000000);
      expect(result.rateOfReturn).toBeCloseTo(5, 2);
    });
  });

  describe('Balance Equation Verification', () => {
    /**
     * The balance equation must always hold:
     * ending_balance = beginning_balance + additions - redemptions + net_income
     */
    it('should satisfy balance equation for all scenarios', () => {
      const scenarios = [
        { begin: 10000, end: 10500, add: 0, red: 0 },
        { begin: 10000, end: 11000, add: 1000, red: 0 },
        { begin: 10000, end: 9500, add: 0, red: 500 },
        { begin: 10000, end: 10800, add: 1000, red: 500 },
        { begin: 0, end: 5000, add: 5000, red: 0 },
        { begin: 10000, end: 0, add: 0, red: 10500 },
        { begin: 10000, end: 9000, add: 0, red: 0 },
        { begin: 5000, end: 12000, add: 5000, red: 0 },
      ];

      scenarios.forEach(({ begin, end, add, red }) => {
        const result = calculateRateOfReturn(begin, end, add, red);
        const calculatedEnding = begin + add - red + result.netIncome;
        expect(calculatedEnding).toBeCloseTo(end, 8);
      });
    });
  });
});

describe('formatTokenAmount', () => {
  it('should format amount with default settings', () => {
    const result = formatTokenAmount(1000);
    expect(result).toBe('1,000.00');
  });

  it('should format amount with asset symbol', () => {
    const result = formatTokenAmount(1000, 'BTC');
    expect(result).toBe('1,000.00 BTC');
  });

  it('should format amount with custom decimals', () => {
    const result = formatTokenAmount(1000.123456, 'USDC', 4);
    expect(result).toBe('1,000.1235 USDC');
  });

  it('should handle zero', () => {
    const result = formatTokenAmount(0);
    expect(result).toBe('0.00');
  });

  it('should handle negative values', () => {
    const result = formatTokenAmount(-500.50);
    expect(result).toBe('-500.50');
  });
});

describe('formatPercent', () => {
  it('should format percentage with default decimals', () => {
    const result = formatPercent(5);
    expect(result).toBe('5.00%');
  });

  it('should format percentage with custom decimals', () => {
    const result = formatPercent(5.5555, 1);
    expect(result).toBe('5.6%');
  });

  it('should handle zero', () => {
    const result = formatPercent(0);
    expect(result).toBe('0.00%');
  });

  it('should handle negative percentages', () => {
    const result = formatPercent(-10.5);
    expect(result).toBe('-10.50%');
  });
});
