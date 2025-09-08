import {
  calculateSimpleInterest,
  calculateCompoundInterest,
  generateYield,
  samplePositions,
} from '../fixtures/test-data.js';

describe('Interest Calculations', () => {
  describe('Simple Interest', () => {
    test('should calculate simple interest correctly', () => {
      const principal = 10000;
      const rate = 0.085; // 8.5%
      const time = 1; // 1 year
      
      const interest = principal * rate * time;
      expect(interest).toBe(850);
    });

    test('should calculate daily simple interest', () => {
      const principal = 10000;
      const rate = 0.085;
      const days = 1;
      
      const interest = calculateSimpleInterest(principal, rate, days);
      expect(interest).toBeCloseTo(2.33, 2);
    });

    test('should calculate monthly simple interest', () => {
      const principal = 10000;
      const rate = 0.085;
      const days = 30;
      
      const interest = calculateSimpleInterest(principal, rate, days);
      expect(interest).toBeCloseTo(69.86, 2);
    });

    test('should calculate quarterly simple interest', () => {
      const principal = 10000;
      const rate = 0.085;
      const days = 90;
      
      const interest = calculateSimpleInterest(principal, rate, days);
      expect(interest).toBeCloseTo(209.59, 2);
    });

    test('should handle zero principal', () => {
      const interest = calculateSimpleInterest(0, 0.085, 365);
      expect(interest).toBe(0);
    });

    test('should handle zero rate', () => {
      const interest = calculateSimpleInterest(10000, 0, 365);
      expect(interest).toBe(0);
    });

    test('should handle zero time', () => {
      const interest = calculateSimpleInterest(10000, 0.085, 0);
      expect(interest).toBe(0);
    });
  });

  describe('Compound Interest', () => {
    test('should calculate annual compound interest', () => {
      const principal = 10000;
      const rate = 0.085;
      const time = 1;
      const n = 365; // Daily compounding
      
      const amount = calculateCompoundInterest(principal, rate, time, n);
      const interest = amount - principal;
      
      expect(amount).toBeCloseTo(10887.06, 2);
      expect(interest).toBeCloseTo(887.06, 2);
    });

    test('should calculate multi-year compound interest', () => {
      const principal = 10000;
      const rate = 0.085;
      const time = 5;
      const n = 365;
      
      const amount = calculateCompoundInterest(principal, rate, time, n);
      const interest = amount - principal;
      
      expect(amount).toBeCloseTo(15317.42, 2);
      expect(interest).toBeCloseTo(5317.42, 2);
    });

    test('should show effect of compounding frequency', () => {
      const principal = 10000;
      const rate = 0.10;
      const time = 1;
      
      const annual = calculateCompoundInterest(principal, rate, time, 1);
      const monthly = calculateCompoundInterest(principal, rate, time, 12);
      const daily = calculateCompoundInterest(principal, rate, time, 365);
      const continuous = principal * Math.exp(rate * time);
      
      expect(annual).toBeCloseTo(11000, 2);      // 10% exactly
      expect(monthly).toBeCloseTo(11047.13, 2);  // 10.47% APY
      expect(daily).toBeCloseTo(11051.71, 2);    // 10.52% APY
      expect(continuous).toBeCloseTo(11051.71, 2); // Theoretical maximum
    });

    test('should handle fractional years', () => {
      const principal = 10000;
      const rate = 0.085;
      const time = 0.5; // 6 months
      const n = 365;
      
      const amount = calculateCompoundInterest(principal, rate, time, n);
      const interest = amount - principal;
      
      expect(interest).toBeCloseTo(433.26, 2);
    });

    test('should match daily accumulation over a year', () => {
      const principal = 10000;
      const rate = 0.085;
      let balance = principal;
      
      // Manually compound for 365 days
      for (let day = 0; day < 365; day++) {
        const dailyInterest = balance * (rate / 365);
        balance += dailyInterest;
      }
      
      const formulaResult = calculateCompoundInterest(principal, rate, 1, 365);
      expect(balance).toBeCloseTo(formulaResult, 2);
    });
  });

  describe('Interest Accrual', () => {
    test('should accrue interest daily', () => {
      const position = {
        quantity: 10000,
        apr: 8.5,
      };
      
      const accruals = [];
      let balance = position.quantity;
      
      for (let day = 1; day <= 30; day++) {
        const dailyRate = position.apr / 365 / 100;
        const interest = balance * dailyRate;
        balance += interest;
        
        accruals.push({
          day,
          interest: Number(interest.toFixed(2)),
          balance: Number(balance.toFixed(2)),
        });
      }
      
      expect(accruals[0].interest).toBeCloseTo(2.33, 2);
      expect(accruals[29].balance).toBeCloseTo(10070.14, 2);
    });

    test('should handle mid-month deposits', () => {
      let balance = 10000;
      const apr = 0.085;
      const dailyRate = apr / 365;
      
      // First 15 days
      for (let day = 1; day <= 15; day++) {
        balance += balance * dailyRate;
      }
      
      // Deposit on day 16
      const deposit = 5000;
      balance += deposit;
      
      // Next 15 days with new balance
      for (let day = 16; day <= 30; day++) {
        balance += balance * dailyRate;
      }
      
      expect(balance).toBeCloseTo(15087.59, 2);
    });

    test('should handle mid-month withdrawals', () => {
      let balance = 10000;
      const apr = 0.085;
      const dailyRate = apr / 365;
      
      // First 15 days
      for (let day = 1; day <= 15; day++) {
        balance += balance * dailyRate;
      }
      
      // Withdrawal on day 16
      const withdrawal = 3000;
      balance -= withdrawal;
      
      // Next 15 days with reduced balance
      for (let day = 16; day <= 30; day++) {
        balance += balance * dailyRate;
      }
      
      expect(balance).toBeCloseTo(7049.10, 2);
    });

    test('should track cumulative interest earned', () => {
      const principal = 10000;
      const apr = 0.085;
      const dailyRate = apr / 365;
      let balance = principal;
      let totalInterest = 0;
      
      for (let day = 1; day <= 365; day++) {
        const interest = balance * dailyRate;
        balance += interest;
        totalInterest += interest;
      }
      
      expect(totalInterest).toBeCloseTo(887.06, 2);
      expect(balance - principal).toBeCloseTo(totalInterest, 2);
    });
  });

  describe('Fee Calculations', () => {
    test('should calculate annual management fee', () => {
      const balance = 100000;
      const annualFeeRate = 0.015; // 1.5%
      const annualFee = balance * annualFeeRate;
      
      expect(annualFee).toBe(1500);
    });

    test('should calculate monthly management fee', () => {
      const balance = 100000;
      const annualFeeRate = 0.015;
      const monthlyFee = (balance * annualFeeRate) / 12;
      
      expect(monthlyFee).toBeCloseTo(125, 2);
    });

    test('should calculate daily management fee', () => {
      const balance = 100000;
      const annualFeeRate = 0.015;
      const dailyFee = (balance * annualFeeRate) / 365;
      
      expect(dailyFee).toBeCloseTo(4.11, 2);
    });

    test('should deduct fees from interest earned', () => {
      const balance = 100000;
      const apr = 0.085;
      const managementFeeRate = 0.015;
      
      // Calculate gross interest for a year
      const grossInterest = balance * apr;
      
      // Calculate management fee
      const managementFee = balance * managementFeeRate;
      
      // Net interest after fees
      const netInterest = grossInterest - managementFee;
      
      expect(grossInterest).toBe(8500);
      expect(managementFee).toBe(1500);
      expect(netInterest).toBe(7000);
    });

    test('should calculate net APY after fees', () => {
      const grossAPR = 8.5;
      const feeRate = 1.5;
      const netAPR = grossAPR - feeRate;
      
      expect(netAPR).toBe(7.0);
    });

    test('should handle fee-free accounts', () => {
      const balance = 100000;
      const feeRate = 0; // VIP account with no fees
      const fee = balance * feeRate;
      
      expect(fee).toBe(0);
    });
  });

  describe('Interest Payment Scenarios', () => {
    test('should calculate interest for different payment frequencies', () => {
      const principal = 10000;
      const apr = 0.085;
      
      // Monthly payment
      const monthlyInterest = calculateSimpleInterest(principal, apr, 30);
      
      // Quarterly payment
      const quarterlyInterest = calculateSimpleInterest(principal, apr, 90);
      
      // Semi-annual payment
      const semiAnnualInterest = calculateSimpleInterest(principal, apr, 182);
      
      // Annual payment
      const annualInterest = calculateSimpleInterest(principal, apr, 365);
      
      expect(monthlyInterest).toBeCloseTo(69.86, 2);
      expect(quarterlyInterest).toBeCloseTo(209.59, 2);
      expect(semiAnnualInterest).toBeCloseTo(424.11, 2);
      expect(annualInterest).toBeCloseTo(850, 2);
    });

    test('should handle interest rate changes', () => {
      const principal = 10000;
      let balance = principal;
      
      // Q1: 8.5% APR
      const q1Days = 90;
      const q1Rate = 0.085;
      balance += calculateSimpleInterest(balance, q1Rate, q1Days);
      
      // Q2: Rate increases to 9.0%
      const q2Days = 91;
      const q2Rate = 0.090;
      balance += calculateSimpleInterest(balance, q2Rate, q2Days);
      
      // Q3: Rate decreases to 8.0%
      const q3Days = 92;
      const q3Rate = 0.080;
      balance += calculateSimpleInterest(balance, q3Rate, q3Days);
      
      // Q4: Rate back to 8.5%
      const q4Days = 92;
      const q4Rate = 0.085;
      balance += calculateSimpleInterest(balance, q4Rate, q4Days);
      
      expect(balance).toBeCloseTo(10875.27, 2);
    });

    test('should calculate pro-rated interest for partial periods', () => {
      const principal = 10000;
      const apr = 0.085;
      
      // Investment starts mid-month (15 days)
      const partialMonthInterest = calculateSimpleInterest(principal, apr, 15);
      
      expect(partialMonthInterest).toBeCloseTo(34.93, 2);
    });

    test('should handle interest capitalization', () => {
      const principal = 10000;
      const apr = 0.085;
      const monthlyRate = apr / 12;
      let balance = principal;
      
      // Monthly capitalization for a year
      for (let month = 1; month <= 12; month++) {
        const interest = balance * monthlyRate;
        balance += interest; // Capitalize interest
      }
      
      const totalReturn = balance - principal;
      expect(totalReturn).toBeCloseTo(883.37, 2);
    });
  });

  describe('Precision and Rounding', () => {
    test('should maintain precision for large balances', () => {
      const principal = 10000000; // $10 million
      const apr = 0.085;
      const dailyInterest = calculateSimpleInterest(principal, apr, 1);
      
      expect(dailyInterest).toBeCloseTo(2328.77, 2);
    });

    test('should handle very small interest amounts', () => {
      const principal = 1; // $1
      const apr = 0.085;
      const dailyInterest = calculateSimpleInterest(principal, apr, 1);
      
      expect(dailyInterest).toBeCloseTo(0.0002329, 7);
    });

    test('should round interest payments correctly', () => {
      const principal = 9999;
      const apr = 0.085;
      const dailyInterest = calculateSimpleInterest(principal, apr, 1);
      
      // Round to 2 decimal places for payment
      const payment = Math.round(dailyInterest * 100) / 100;
      
      expect(payment).toBe(2.33);
    });

    test('should handle floating point precision issues', () => {
      const principal = 0.1 + 0.2; // Classic JS floating point issue
      const apr = 0.085;
      const interest = calculateSimpleInterest(principal * 10000, apr, 365);
      
      expect(interest).toBeCloseTo(255, 2);
    });
  });
});
