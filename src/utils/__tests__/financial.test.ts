/**
 * Financial Utilities Test Suite
 *
 * CRITICAL: 100% test coverage required for financial calculations
 * All monetary calculations MUST be tested with edge cases
 *
 * Run: npm run test -- financial.test.ts
 * Watch: npm run test:watch -- financial.test.ts
 */

import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import {
  toDecimal,
  formatMoney,
  formatCrypto,
  formatPercentage,
  calculateYield,
  calculateCompoundInterest,
  calculateFee,
  calculateNetAmount,
  calculatePortfolioValue,
  calculatePercentageChange,
  calculateProfitLoss,
  calculateAverage,
  calculateWeightedAverage,
  isInRange,
  clamp,
  toDbFormat,
  fromDbFormat,
  validatePositiveAmount,
  validateNonNegativeAmount,
  validatePercentage,
} from '../financial';

describe('Financial Utilities', () => {

  // ==========================================
  // CORE CONVERSION FUNCTIONS
  // ==========================================

  describe('toDecimal', () => {
    it('converts string to Decimal', () => {
      const result = toDecimal('1000.12345678');
      expect(result).toBeInstanceOf(Decimal);
      expect(result.toString()).toBe('1000.12345678');
    });

    it('converts number to Decimal', () => {
      const result = toDecimal(1000.50);
      expect(result).toBeInstanceOf(Decimal);
      expect(result.toString()).toBe('1000.5');
    });

    it('returns Decimal if already Decimal', () => {
      const decimal = new Decimal('1000');
      const result = toDecimal(decimal);
      expect(result).toBe(decimal);
    });

    it('handles very small numbers', () => {
      const result = toDecimal('0.00000001');
      expect(result.toString()).toBe('0.00000001');
    });

    it('handles very large numbers', () => {
      const result = toDecimal('999999999999.99999999');
      expect(result.toString()).toBe('999999999999.99999999');
    });

    it('handles scientific notation', () => {
      const result = toDecimal('1e10');
      expect(result.toString()).toBe('10000000000');
    });
  });

  // ==========================================
  // FORMATTING FUNCTIONS
  // ==========================================

  describe('formatMoney', () => {
    it('formats with default settings (2 decimals, with $)', () => {
      expect(formatMoney('1000.50')).toBe('$1000.50');
    });

    it('formats without dollar sign', () => {
      expect(formatMoney('1000.50', 2, false)).toBe('1000.50');
    });

    it('formats with custom decimal places', () => {
      expect(formatMoney('1000.123456', 8)).toBe('$1000.12345600');
    });

    it('rounds correctly', () => {
      expect(formatMoney('1000.125', 2)).toBe('$1000.13'); // Rounds up
      expect(formatMoney('1000.124', 2)).toBe('$1000.12'); // Rounds down
    });

    it('handles zero', () => {
      expect(formatMoney('0')).toBe('$0.00');
    });

    it('handles negative numbers', () => {
      expect(formatMoney('-1000.50')).toBe('$-1000.50');
    });
  });

  describe('formatCrypto', () => {
    it('formats with default settings (8 decimals)', () => {
      expect(formatCrypto('1.5')).toBe('1.50000000');
    });

    it('formats with symbol', () => {
      expect(formatCrypto('1.5', 8, 'BTC')).toBe('1.50000000 BTC');
    });

    it('formats with custom decimal places', () => {
      expect(formatCrypto('1000.123', 2, 'USDC')).toBe('1000.12 USDC');
    });

    it('handles very small amounts', () => {
      expect(formatCrypto('0.00000001', 8, 'BTC')).toBe('0.00000001 BTC');
    });
  });

  describe('formatPercentage', () => {
    it('formats decimal to percentage', () => {
      expect(formatPercentage('0.05')).toBe('5.00%');
    });

    it('formats with custom decimals', () => {
      expect(formatPercentage('0.05123', 4)).toBe('5.1230%');
    });

    it('handles zero', () => {
      expect(formatPercentage('0')).toBe('0.00%');
    });

    it('handles negative percentages', () => {
      expect(formatPercentage('-0.025')).toBe('-2.50%');
    });

    it('handles percentages over 100%', () => {
      expect(formatPercentage('1.5')).toBe('150.00%');
    });
  });

  // ==========================================
  // CRITICAL: YIELD CALCULATIONS
  // ==========================================

  describe('calculateYield', () => {
    it('calculates simple yield for 365 days', () => {
      const principal = '10000';
      const rate = '0.05'; // 5%
      const days = 365;

      const result = calculateYield(principal, rate, days);
      expect(result.toString()).toBe('500');
    });

    it('calculates yield for 30 days', () => {
      const principal = '10000';
      const rate = '0.05'; // 5% annual
      const days = 30;

      const result = calculateYield(principal, rate, days);
      // 10000 * 0.05 * (30/365) = 41.0958904109589...
      expect(result.toFixed(2)).toBe('41.10');
    });

    it('calculates yield for 1 day', () => {
      const principal = '10000';
      const rate = '0.05';
      const days = 1;

      const result = calculateYield(principal, rate, days);
      // 10000 * 0.05 * (1/365) = 1.36986301369863...
      expect(result.toFixed(8)).toBe('1.36986301');
    });

    it('handles zero principal', () => {
      const result = calculateYield('0', '0.05', 365);
      expect(result.toString()).toBe('0');
    });

    it('handles zero rate', () => {
      const result = calculateYield('10000', '0', 365);
      expect(result.toString()).toBe('0');
    });

    it('handles zero days', () => {
      const result = calculateYield('10000', '0.05', 0);
      expect(result.toString()).toBe('0');
    });

    it('handles high principal', () => {
      const principal = '1000000'; // $1M
      const rate = '0.08'; // 8%
      const days = 365;

      const result = calculateYield(principal, rate, days);
      expect(result.toString()).toBe('80000');
    });

    it('maintains precision for small amounts', () => {
      const principal = '0.00000001'; // 1 satoshi worth
      const rate = '0.05';
      const days = 365;

      const result = calculateYield(principal, rate, days);
      expect(result.toString()).toBe('0.0000000005');
    });
  });

  describe('calculateCompoundInterest', () => {
    it('calculates annual compounding', () => {
      const principal = '10000';
      const rate = '0.05'; // 5%
      const years = 1;
      const frequency = 1; // Annual

      const interest = calculateCompoundInterest(principal, rate, years, frequency);
      // 10000 * (1 + 0.05)^1 - 10000 = 500
      expect(interest.toString()).toBe('500');
    });

    it('calculates daily compounding', () => {
      const principal = '10000';
      const rate = '0.05';
      const years = 1;
      const frequency = 365; // Daily

      const interest = calculateCompoundInterest(principal, rate, years, frequency);
      // More than simple interest due to compounding
      expect(interest.toFixed(2)).toBe('512.67');
    });

    it('calculates multi-year compounding', () => {
      const principal = '10000';
      const rate = '0.05';
      const years = 5;
      const frequency = 365;

      const interest = calculateCompoundInterest(principal, rate, years, frequency);
      // 10000 * (1 + 0.05/365)^(365*5) - 10000
      expect(interest.toFixed(2)).toBe('2840.25');
    });

    it('handles zero rate', () => {
      const interest = calculateCompoundInterest('10000', '0', 1, 365);
      expect(interest.toString()).toBe('0');
    });
  });

  // ==========================================
  // CRITICAL: FEE CALCULATIONS
  // ==========================================

  describe('calculateFee', () => {
    it('calculates 0.25% fee correctly', () => {
      const amount = '1000';
      const feePercentage = '0.25';

      const fee = calculateFee(amount, feePercentage);
      // 1000 * 0.25 / 100 = 2.50
      expect(fee.toString()).toBe('2.5');
    });

    it('calculates 2% fee correctly', () => {
      const amount = '10000';
      const feePercentage = '2';

      const fee = calculateFee(amount, feePercentage);
      expect(fee.toString()).toBe('200');
    });

    it('handles zero fee', () => {
      const fee = calculateFee('1000', '0');
      expect(fee.toString()).toBe('0');
    });

    it('handles fractional fee percentage', () => {
      const amount = '1000';
      const feePercentage = '0.125'; // 0.125%

      const fee = calculateFee(amount, feePercentage);
      expect(fee.toString()).toBe('1.25');
    });

    it('maintains precision for small fees', () => {
      const amount = '10';
      const feePercentage = '0.01'; // 0.01%

      const fee = calculateFee(amount, feePercentage);
      expect(fee.toString()).toBe('0.001');
    });
  });

  describe('calculateNetAmount', () => {
    it('calculates net after fee deduction', () => {
      const amount = '1000';
      const feePercentage = '2'; // 2%

      const net = calculateNetAmount(amount, feePercentage);
      // 1000 - (1000 * 2 / 100) = 980
      expect(net.toString()).toBe('980');
    });

    it('handles zero fee (no deduction)', () => {
      const net = calculateNetAmount('1000', '0');
      expect(net.toString()).toBe('1000');
    });

    it('calculates net for 0.25% Indigo fee', () => {
      const amount = '10000';
      const feePercentage = '0.25';

      const net = calculateNetAmount(amount, feePercentage);
      // 10000 - 25 = 9975
      expect(net.toString()).toBe('9975');
    });
  });

  // ==========================================
  // PORTFOLIO CALCULATIONS
  // ==========================================

  describe('calculatePortfolioValue', () => {
    it('calculates total value of multiple positions', () => {
      const positions = [
        { amount: '1.5', priceUsd: '35000' },    // 1.5 BTC @ $35,000
        { amount: '10', priceUsd: '1800' },      // 10 ETH @ $1,800
        { amount: '1000', priceUsd: '1' },       // 1000 USDC @ $1
      ];

      const total = calculatePortfolioValue(positions);
      // (1.5 * 35000) + (10 * 1800) + (1000 * 1) = 52500 + 18000 + 1000 = 71500
      expect(total.toString()).toBe('71500');
    });

    it('handles empty portfolio', () => {
      const total = calculatePortfolioValue([]);
      expect(total.toString()).toBe('0');
    });

    it('handles single position', () => {
      const positions = [
        { amount: '2.5', priceUsd: '35000' }
      ];

      const total = calculatePortfolioValue(positions);
      expect(total.toString()).toBe('87500');
    });

    it('maintains precision for small amounts', () => {
      const positions = [
        { amount: '0.00001', priceUsd: '35000' }
      ];

      const total = calculatePortfolioValue(positions);
      expect(total.toString()).toBe('0.35');
    });

    it('handles mixed precision amounts', () => {
      const positions = [
        { amount: '1.123456', priceUsd: '35000.12' },
        { amount: '10.9876', priceUsd: '1800.5' }
      ];

      const total = calculatePortfolioValue(positions);
      // (1.123456 * 35000.12) + (10.9876 * 1800.5)
      expect(total.toFixed(2)).toBe('59103.34');
    });
  });

  // ==========================================
  // PROFIT/LOSS CALCULATIONS
  // ==========================================

  describe('calculatePercentageChange', () => {
    it('calculates positive change', () => {
      const change = calculatePercentageChange('1000', '1100');
      // ((1100 - 1000) / 1000) * 100 = 10%
      expect(change.toString()).toBe('10');
    });

    it('calculates negative change', () => {
      const change = calculatePercentageChange('1000', '900');
      // ((900 - 1000) / 1000) * 100 = -10%
      expect(change.toString()).toBe('-10');
    });

    it('calculates zero change', () => {
      const change = calculatePercentageChange('1000', '1000');
      expect(change.toString()).toBe('0');
    });

    it('handles zero old value', () => {
      const change = calculatePercentageChange('0', '1000');
      expect(change.toString()).toBe('0'); // Avoids division by zero
    });

    it('calculates large positive change', () => {
      const change = calculatePercentageChange('1000', '5000');
      expect(change.toString()).toBe('400'); // 400% increase
    });
  });

  describe('calculateProfitLoss', () => {
    it('calculates profit correctly', () => {
      const result = calculateProfitLoss('1000', '1500');

      expect(result.amount.toString()).toBe('500');
      expect(result.percentage.toString()).toBe('50');
      expect(result.isProfit).toBe(true);
    });

    it('calculates loss correctly', () => {
      const result = calculateProfitLoss('1000', '800');

      expect(result.amount.toString()).toBe('-200');
      expect(result.percentage.toString()).toBe('-20');
      expect(result.isProfit).toBe(false);
    });

    it('handles break-even', () => {
      const result = calculateProfitLoss('1000', '1000');

      expect(result.amount.toString()).toBe('0');
      expect(result.percentage.toString()).toBe('0');
      expect(result.isProfit).toBe(true); // Zero is considered non-negative
    });
  });

  // ==========================================
  // STATISTICAL FUNCTIONS
  // ==========================================

  describe('calculateAverage', () => {
    it('calculates simple average', () => {
      const values = ['100', '200', '300'];
      const avg = calculateAverage(values);
      expect(avg.toString()).toBe('200');
    });

    it('handles empty array', () => {
      const avg = calculateAverage([]);
      expect(avg.toString()).toBe('0');
    });

    it('handles single value', () => {
      const avg = calculateAverage(['100']);
      expect(avg.toString()).toBe('100');
    });

    it('maintains precision', () => {
      const values = ['100.123', '200.456', '300.789'];
      const avg = calculateAverage(values);
      expect(avg.toFixed(3)).toBe('200.456');
    });
  });

  describe('calculateWeightedAverage', () => {
    it('calculates weighted average correctly', () => {
      const values = [
        { value: '100', weight: '1' },
        { value: '200', weight: '2' },
        { value: '300', weight: '1' },
      ];

      const avg = calculateWeightedAverage(values);
      // (100*1 + 200*2 + 300*1) / (1+2+1) = 800 / 4 = 200
      expect(avg.toString()).toBe('200');
    });

    it('handles equal weights', () => {
      const values = [
        { value: '100', weight: '1' },
        { value: '200', weight: '1' },
        { value: '300', weight: '1' },
      ];

      const avg = calculateWeightedAverage(values);
      expect(avg.toString()).toBe('200');
    });

    it('handles zero total weight', () => {
      const values = [
        { value: '100', weight: '0' },
        { value: '200', weight: '0' },
      ];

      const avg = calculateWeightedAverage(values);
      expect(avg.toString()).toBe('0');
    });

    it('handles empty array', () => {
      const avg = calculateWeightedAverage([]);
      expect(avg.toString()).toBe('0');
    });
  });

  // ==========================================
  // RANGE VALIDATION
  // ==========================================

  describe('isInRange', () => {
    it('returns true for value within range', () => {
      expect(isInRange('50', '0', '100')).toBe(true);
    });

    it('returns true for value at lower bound', () => {
      expect(isInRange('0', '0', '100')).toBe(true);
    });

    it('returns true for value at upper bound', () => {
      expect(isInRange('100', '0', '100')).toBe(true);
    });

    it('returns false for value below range', () => {
      expect(isInRange('-1', '0', '100')).toBe(false);
    });

    it('returns false for value above range', () => {
      expect(isInRange('101', '0', '100')).toBe(false);
    });
  });

  describe('clamp', () => {
    it('returns value within range unchanged', () => {
      const result = clamp('50', '0', '100');
      expect(result.toString()).toBe('50');
    });

    it('clamps to minimum', () => {
      const result = clamp('-10', '0', '100');
      expect(result.toString()).toBe('0');
    });

    it('clamps to maximum', () => {
      const result = clamp('150', '0', '100');
      expect(result.toString()).toBe('100');
    });

    it('handles value at bounds', () => {
      expect(clamp('0', '0', '100').toString()).toBe('0');
      expect(clamp('100', '0', '100').toString()).toBe('100');
    });
  });

  // ==========================================
  // DATABASE CONVERSION
  // ==========================================

  describe('toDbFormat', () => {
    it('formats to 8 decimal places', () => {
      expect(toDbFormat('1000.5')).toBe('1000.50000000');
    });

    it('truncates extra decimals', () => {
      expect(toDbFormat('1000.123456789')).toBe('1000.12345679'); // Rounded
    });

    it('handles integers', () => {
      expect(toDbFormat('1000')).toBe('1000.00000000');
    });

    it('handles very small numbers', () => {
      expect(toDbFormat('0.00000001')).toBe('0.00000001');
    });
  });

  describe('fromDbFormat', () => {
    it('parses valid string', () => {
      const result = fromDbFormat('1000.50000000');
      expect(result.toString()).toBe('1000.5');
    });

    it('handles null', () => {
      const result = fromDbFormat(null);
      expect(result.toString()).toBe('0');
    });

    it('handles undefined', () => {
      const result = fromDbFormat(undefined);
      expect(result.toString()).toBe('0');
    });

    it('parses empty string as zero', () => {
      const result = fromDbFormat('');
      expect(result.toString()).toBe('0');
    });
  });

  // ==========================================
  // VALIDATION FUNCTIONS
  // ==========================================

  describe('validatePositiveAmount', () => {
    it('accepts positive amounts', () => {
      const result = validatePositiveAmount('100');
      expect(result.toString()).toBe('100');
    });

    it('rejects zero', () => {
      expect(() => validatePositiveAmount('0')).toThrow('Amount must be positive');
    });

    it('rejects negative amounts', () => {
      expect(() => validatePositiveAmount('-100')).toThrow('Amount must be positive');
    });

    it('uses custom field name in error', () => {
      expect(() => validatePositiveAmount('0', 'Deposit')).toThrow('Deposit must be positive');
    });
  });

  describe('validateNonNegativeAmount', () => {
    it('accepts positive amounts', () => {
      const result = validateNonNegativeAmount('100');
      expect(result.toString()).toBe('100');
    });

    it('accepts zero', () => {
      const result = validateNonNegativeAmount('0');
      expect(result.toString()).toBe('0');
    });

    it('rejects negative amounts', () => {
      expect(() => validateNonNegativeAmount('-100')).toThrow('Amount cannot be negative');
    });

    it('uses custom field name in error', () => {
      expect(() => validateNonNegativeAmount('-100', 'Balance')).toThrow('Balance cannot be negative');
    });
  });

  describe('validatePercentage', () => {
    it('accepts valid percentages', () => {
      expect(validatePercentage('50').toString()).toBe('50');
      expect(validatePercentage('0').toString()).toBe('0');
      expect(validatePercentage('100').toString()).toBe('100');
    });

    it('accepts decimal percentages', () => {
      expect(validatePercentage('50.5').toString()).toBe('50.5');
    });

    it('rejects negative percentages', () => {
      expect(() => validatePercentage('-1')).toThrow('Percentage must be between 0 and 100');
    });

    it('rejects percentages over 100', () => {
      expect(() => validatePercentage('101')).toThrow('Percentage must be between 0 and 100');
    });

    it('uses custom field name in error', () => {
      expect(() => validatePercentage('101', 'Fee')).toThrow('Fee must be between 0 and 100');
    });
  });

  // ==========================================
  // EDGE CASES & REGRESSION TESTS
  // ==========================================

  describe('Edge Cases', () => {
    it('prevents JavaScript float precision errors', () => {
      // JavaScript: 0.1 + 0.2 = 0.30000000000000004
      const a = toDecimal('0.1');
      const b = toDecimal('0.2');
      const sum = a.plus(b);

      expect(sum.toString()).toBe('0.3'); // Exact!
    });

    it('handles maximum precision', () => {
      const a = toDecimal('123456789012.12345678');
      const b = toDecimal('0.00000001');
      const sum = a.plus(b);

      expect(sum.toString()).toBe('123456789012.12345679');
    });

    it('handles very large portfolio values', () => {
      const positions = [
        { amount: '100', priceUsd: '100000000' } // $10B position
      ];

      const total = calculatePortfolioValue(positions);
      expect(total.toString()).toBe('10000000000');
    });

    it('handles micro-transactions', () => {
      const amount = '0.00000001'; // 1 satoshi
      const fee = calculateFee(amount, '0.25');

      expect(fee.toString()).toBe('0.000000000025');
    });
  });

  // ==========================================
  // REAL-WORLD SCENARIOS
  // ==========================================

  describe('Real-World Scenarios', () => {
    it('calculates Indigo platform fee correctly', () => {
      const portfolioValue = '1000000'; // $1M
      const feePercentage = '0.25'; // 0.25%

      const annualFee = calculateFee(portfolioValue, feePercentage);
      expect(annualFee.toString()).toBe('2500'); // $2,500/year
    });

    it('calculates investor yield correctly', () => {
      const principal = '500000'; // $500K investment
      const rate = '0.065'; // 6.5% annual yield
      const days = 30; // 1 month

      const monthlyYield = calculateYield(principal, rate, days);
      expect(monthlyYield.toFixed(2)).toBe('2671.23');
    });

    it('handles withdrawal with fee', () => {
      const withdrawalAmount = '50000'; // $50K withdrawal
      const feePercentage = '0'; // No withdrawal fee

      const netAmount = calculateNetAmount(withdrawalAmount, feePercentage);
      expect(netAmount.toString()).toBe('50000');
    });

    it('calculates multi-asset portfolio', () => {
      // Real investor portfolio
      const positions = [
        { amount: '1.25', priceUsd: '35000' },    // BTC
        { amount: '15.5', priceUsd: '1800' },     // ETH
        { amount: '250000', priceUsd: '1.00' },   // USDC
        { amount: '100', priceUsd: '25.50' },     // SOL
      ];

      const total = calculatePortfolioValue(positions);
      // 43750 + 27900 + 250000 + 2550 = 324200
      expect(total.toString()).toBe('324200');
    });
  });
});
