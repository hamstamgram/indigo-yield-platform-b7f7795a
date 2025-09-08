import {
  samplePositions,
  yieldRates,
  generatePosition,
  generateYield,
  calculateCompoundInterest,
  calculateSimpleInterest,
} from '../fixtures/test-data.js';

describe('Yield Calculations', () => {
  describe('Daily Yield Calculations', () => {
    test('should calculate daily yield correctly for USDC at 8.5% APR', () => {
      const position = samplePositions[0]; // 10,000 USDC
      const apr = 8.5;
      const expectedDailyRate = apr / 365 / 100;
      const expectedDailyYield = position.quantity * expectedDailyRate;

      expect(expectedDailyRate).toBeCloseTo(0.000233, 6);
      expect(expectedDailyYield).toBeCloseTo(2.33, 2);
    });

    test('should calculate daily yield correctly for USDT at 7.2% APR', () => {
      const position = samplePositions[1]; // 5,000 USDT
      const apr = 7.2;
      const expectedDailyRate = apr / 365 / 100;
      const expectedDailyYield = position.quantity * expectedDailyRate;

      expect(expectedDailyRate).toBeCloseTo(0.000197, 6);
      expect(expectedDailyYield).toBeCloseTo(0.99, 2);
    });

    test('should handle leap year calculations correctly', () => {
      const position = generatePosition({ quantity: 10000 });
      const apr = 10;
      const daysInLeapYear = 366;
      const expectedDailyRate = apr / daysInLeapYear / 100;
      const expectedDailyYield = position.quantity * expectedDailyRate;

      expect(expectedDailyRate).toBeCloseTo(0.000273, 6);
      expect(expectedDailyYield).toBeCloseTo(2.73, 2);
    });

    test('should handle zero balance positions', () => {
      const position = generatePosition({ quantity: 0 });
      const apr = 8.5;
      const yieldData = generateYield(position, apr);

      expect(yieldData.interest_earned).toBe(0);
    });

    test('should handle negative APR gracefully', () => {
      const position = generatePosition({ quantity: 10000 });
      const apr = -5; // Negative rate scenario
      const dailyRate = apr / 365 / 100;
      const interestEarned = position.quantity * dailyRate;

      expect(dailyRate).toBeLessThan(0);
      expect(interestEarned).toBeCloseTo(-1.37, 2);
    });
  });

  describe('Monthly Yield Calculations', () => {
    test('should calculate monthly yield for 30-day month', () => {
      const principal = 10000;
      const apr = 8.5;
      const days = 30;
      const monthlyYield = calculateSimpleInterest(principal, apr / 100, days);

      expect(monthlyYield).toBeCloseTo(69.86, 2);
    });

    test('should calculate monthly yield for 31-day month', () => {
      const principal = 10000;
      const apr = 8.5;
      const days = 31;
      const monthlyYield = calculateSimpleInterest(principal, apr / 100, days);

      expect(monthlyYield).toBeCloseTo(72.19, 2);
    });

    test('should calculate monthly yield for February (28 days)', () => {
      const principal = 10000;
      const apr = 8.5;
      const days = 28;
      const monthlyYield = calculateSimpleInterest(principal, apr / 100, days);

      expect(monthlyYield).toBeCloseTo(65.21, 2);
    });

    test('should calculate monthly yield for February in leap year (29 days)', () => {
      const principal = 10000;
      const apr = 8.5;
      const days = 29;
      const monthlyYield = calculateSimpleInterest(principal, apr / 100, days);

      expect(monthlyYield).toBeCloseTo(67.53, 2);
    });

    test('should accumulate daily yields to match monthly total', () => {
      const principal = 10000;
      const apr = 8.5;
      const days = 30;
      
      let totalDaily = 0;
      for (let i = 0; i < days; i++) {
        totalDaily += calculateSimpleInterest(principal, apr / 100, 1);
      }

      const monthlyYield = calculateSimpleInterest(principal, apr / 100, days);
      expect(totalDaily).toBeCloseTo(monthlyYield, 2);
    });
  });

  describe('Annual Yield Calculations', () => {
    test('should calculate simple annual yield correctly', () => {
      const principal = 10000;
      const apr = 8.5;
      const annualYield = calculateSimpleInterest(principal, apr / 100, 365);

      expect(annualYield).toBeCloseTo(850, 2);
    });

    test('should calculate compound annual yield correctly', () => {
      const principal = 10000;
      const apr = 8.5;
      const compoundedAmount = calculateCompoundInterest(principal, apr / 100, 1);
      const compoundYield = compoundedAmount - principal;

      expect(compoundYield).toBeCloseTo(886.49, 2);
    });

    test('should show difference between simple and compound interest', () => {
      const principal = 10000;
      const apr = 8.5;
      
      const simpleYield = calculateSimpleInterest(principal, apr / 100, 365);
      const compoundedAmount = calculateCompoundInterest(principal, apr / 100, 1);
      const compoundYield = compoundedAmount - principal;
      
      const difference = compoundYield - simpleYield;
      expect(difference).toBeCloseTo(36.49, 2); // Compound interest advantage
    });

    test('should calculate multi-year compound interest correctly', () => {
      const principal = 10000;
      const apr = 8.5;
      const years = 3;
      
      const compoundedAmount = calculateCompoundInterest(principal, apr / 100, years);
      const totalYield = compoundedAmount - principal;

      expect(compoundedAmount).toBeCloseTo(12772.28, 2);
      expect(totalYield).toBeCloseTo(2772.28, 2);
    });
  });

  describe('APR to APY Conversion', () => {
    test('should convert 8.5% APR to APY with daily compounding', () => {
      const apr = 8.5;
      const n = 365; // Daily compounding
      const apy = (Math.pow(1 + apr / 100 / n, n) - 1) * 100;

      expect(apy).toBeCloseTo(8.865, 3);
    });

    test('should convert 7.2% APR to APY with daily compounding', () => {
      const apr = 7.2;
      const n = 365;
      const apy = (Math.pow(1 + apr / 100 / n, n) - 1) * 100;

      expect(apy).toBeCloseTo(7.461, 3);
    });

    test('should show APY increases with more frequent compounding', () => {
      const apr = 10;
      
      const apyAnnual = (Math.pow(1 + apr / 100 / 1, 1) - 1) * 100;
      const apyMonthly = (Math.pow(1 + apr / 100 / 12, 12) - 1) * 100;
      const apyDaily = (Math.pow(1 + apr / 100 / 365, 365) - 1) * 100;

      expect(apyAnnual).toBeCloseTo(10.0, 3);
      expect(apyMonthly).toBeCloseTo(10.471, 3);
      expect(apyDaily).toBeCloseTo(10.516, 3);
      
      expect(apyDaily).toBeGreaterThan(apyMonthly);
      expect(apyMonthly).toBeGreaterThan(apyAnnual);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle very large balances', () => {
      const principal = 1000000000; // 1 billion
      const apr = 8.5;
      const dailyYield = calculateSimpleInterest(principal, apr / 100, 1);

      expect(dailyYield).toBeCloseTo(232876.71, 2);
    });

    test('should handle very small balances with precision', () => {
      const principal = 0.01; // 1 cent
      const apr = 8.5;
      const dailyYield = calculateSimpleInterest(principal, apr / 100, 1);

      expect(dailyYield).toBeCloseTo(0.00002329, 8);
    });

    test('should handle zero APR', () => {
      const principal = 10000;
      const apr = 0;
      const yieldData = calculateSimpleInterest(principal, apr / 100, 365);

      expect(yieldData).toBe(0);
    });

    test('should handle maximum APR boundary', () => {
      const principal = 10000;
      const maxApr = 100; // 100% APR
      const dailyYield = calculateSimpleInterest(principal, maxApr / 100, 1);

      expect(dailyYield).toBeCloseTo(27.40, 2);
    });

    test('should maintain precision for long calculation chains', () => {
      const principal = 10000;
      const apr = 8.5;
      let balance = principal;

      // Simulate 365 days of daily compounding
      for (let i = 0; i < 365; i++) {
        const dailyInterest = balance * (apr / 100 / 365);
        balance += dailyInterest;
      }

      const expectedFinal = calculateCompoundInterest(principal, apr / 100, 1);
      expect(balance).toBeCloseTo(expectedFinal, 2);
    });
  });

  describe('Rate Changes Over Time', () => {
    test('should handle mid-month rate changes', () => {
      const principal = 10000;
      const days1 = 15;
      const apr1 = 8.5;
      const days2 = 15;
      const apr2 = 9.0;

      const yield1 = calculateSimpleInterest(principal, apr1 / 100, days1);
      const yield2 = calculateSimpleInterest(principal, apr2 / 100, days2);
      const totalYield = yield1 + yield2;

      expect(yieldData1).toBeCloseTo(34.93, 2);
      expect(yieldData2).toBeCloseTo(36.99, 2);
      expect(totalYield).toBeCloseTo(71.92, 2);
    });

    test('should calculate blended rate correctly', () => {
      const yields = [
        { days: 10, apr: 8.0 },
        { days: 10, apr: 8.5 },
        { days: 10, apr: 9.0 },
      ];

      const totalDays = yields.reduce((sum, y) => sum + y.days, 0);
      const weightedApr = yields.reduce((sum, y) => sum + (y.apr * y.days), 0) / totalDays;

      expect(weightedApr).toBeCloseTo(8.5, 2);
    });
  });

  describe('Yield Validation', () => {
    test('should validate yield is within acceptable range', () => {
      const yield1 = generateYield(samplePositions[0], 8.5);
      const yield2 = generateYield(samplePositions[0], 150); // Unrealistic APR

      expect(yieldData1.apr).toBeWithinRange(0, 20); // Reasonable range
      expect(yieldData2.apr).not.toBeWithinRange(0, 20);
    });

    test('should validate daily rate matches APR', () => {
      const apr = 8.5;
      const yieldData = generateYield(samplePositions[0], apr);
      const expectedDailyRate = apr / 365 / 100;

      expect(yieldDataData.daily_rate).toBeCloseTo(expectedDailyRate, 6);
    });

    test('should ensure interest earned is non-negative for positive APR', () => {
      const position = generatePosition({ quantity: 10000 });
      const yieldData = generateYield(position, 8.5);

      expect(yieldData.interest_earned).toBeGreaterThanOrEqual(0);
    });
  });
});
