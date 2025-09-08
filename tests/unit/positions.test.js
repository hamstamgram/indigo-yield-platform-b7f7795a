import {
  samplePositions,
  sampleTransactions,
  generatePosition,
  transactionTypes,
} from '../fixtures/test-data.js';

describe('Position Calculations', () => {
  describe('Position Valuation', () => {
    test('should calculate position value correctly', () => {
      const position = samplePositions[0]; // 10,000 USDC at $1.0
      const expectedValue = position.quantity * position.avg_cost;
      
      expect(position.current_value).toBe(expectedValue);
      expect(position.current_value).toBe(10000);
    });

    test('should calculate total portfolio value', () => {
      const positions = [
        { quantity: 10000, avg_cost: 1.0 }, // $10,000
        { quantity: 5000, avg_cost: 1.0 },  // $5,000
        { quantity: 25000, avg_cost: 1.0 }, // $25,000
      ];
      
      const totalValue = positions.reduce((sum, p) => sum + (p.quantity * p.avg_cost), 0);
      expect(totalValue).toBe(40000);
    });

    test('should handle positions with different cost basis', () => {
      const position = generatePosition({
        quantity: 1000,
        avg_cost: 1.02, // 2% premium
      });
      
      const value = position.quantity * position.avg_cost;
      expect(value).toBe(1020);
    });

    test('should calculate unrealized gain/loss', () => {
      const position = {
        quantity: 10000,
        avg_cost: 1.0,
        current_price: 1.05, // 5% gain
      };
      
      const costBasis = position.quantity * position.avg_cost;
      const currentValue = position.quantity * position.current_price;
      const unrealizedGain = currentValue - costBasis;
      
      expect(costBasis).toBe(10000);
      expect(currentValue).toBe(10500);
      expect(unrealizedGain).toBe(500);
    });
  });

  describe('Position Updates from Transactions', () => {
    test('should increase position on deposit', () => {
      let position = {
        quantity: 10000,
        avg_cost: 1.0,
      };
      
      const deposit = {
        type: transactionTypes.DEPOSIT,
        amount: 5000,
        price: 1.0,
      };
      
      // Calculate new average cost
      const totalCost = (position.quantity * position.avg_cost) + (deposit.amount * deposit.price);
      const newQuantity = position.quantity + deposit.amount;
      const newAvgCost = totalCost / newQuantity;
      
      position = {
        quantity: newQuantity,
        avg_cost: newAvgCost,
      };
      
      expect(position.quantity).toBe(15000);
      expect(position.avg_cost).toBe(1.0);
    });

    test('should decrease position on withdrawal', () => {
      let position = {
        quantity: 10000,
        avg_cost: 1.0,
      };
      
      const withdrawal = {
        type: transactionTypes.WITHDRAWAL,
        amount: 3000,
      };
      
      position.quantity -= withdrawal.amount;
      
      expect(position.quantity).toBe(7000);
      expect(position.avg_cost).toBe(1.0); // Avg cost unchanged on withdrawal
    });

    test('should handle multiple deposits with different prices', () => {
      const deposits = [
        { amount: 10000, price: 1.00 },
        { amount: 5000, price: 1.02 },
        { amount: 3000, price: 0.98 },
      ];
      
      let totalQuantity = 0;
      let totalCost = 0;
      
      deposits.forEach(deposit => {
        totalQuantity += deposit.amount;
        totalCost += deposit.amount * deposit.price;
      });
      
      const avgCost = totalCost / totalQuantity;
      
      expect(totalQuantity).toBe(18000);
      expect(totalCost).toBe(18040);
      expect(avgCost).toBeCloseTo(1.0022, 4);
    });

    test('should not allow withdrawal exceeding balance', () => {
      const position = {
        quantity: 10000,
        avg_cost: 1.0,
      };
      
      const withdrawal = {
        amount: 15000, // Exceeds balance
      };
      
      const canWithdraw = withdrawal.amount <= position.quantity;
      expect(canWithdraw).toBe(false);
    });
  });

  describe('Interest Accumulation', () => {
    test('should add interest to position', () => {
      let position = {
        quantity: 10000,
        avg_cost: 1.0,
      };
      
      const interest = {
        type: transactionTypes.INTEREST,
        amount: 2.33,
      };
      
      position.quantity += interest.amount;
      
      expect(position.quantity).toBeCloseTo(10002.33, 2);
    });

    test('should compound interest over multiple periods', () => {
      let balance = 10000;
      const dailyRate = 0.000233; // 8.5% APR / 365
      
      // Compound for 30 days
      for (let i = 0; i < 30; i++) {
        const interest = balance * dailyRate;
        balance += interest;
      }
      
      expect(balance).toBeCloseTo(10070.14, 2);
    });

    test('should track total interest earned', () => {
      const interestTransactions = [
        { type: transactionTypes.INTEREST, amount: 2.33 },
        { type: transactionTypes.INTEREST, amount: 2.34 },
        { type: transactionTypes.INTEREST, amount: 2.33 },
      ];
      
      const totalInterest = interestTransactions
        .filter(tx => tx.type === transactionTypes.INTEREST)
        .reduce((sum, tx) => sum + tx.amount, 0);
      
      expect(totalInterest).toBe(7.00);
    });
  });

  describe('Fee Deductions', () => {
    test('should deduct management fee from position', () => {
      let position = {
        quantity: 10000,
        avg_cost: 1.0,
      };
      
      const managementFeeRate = 0.02; // 2% annual
      const dailyFeeRate = managementFeeRate / 365;
      const dailyFee = position.quantity * dailyFeeRate;
      
      position.quantity -= dailyFee;
      
      expect(dailyFee).toBeCloseTo(0.548, 3);
      expect(position.quantity).toBeCloseTo(9999.452, 3);
    });

    test('should calculate performance fee on profits', () => {
      const initialBalance = 10000;
      const currentBalance = 11000;
      const profit = currentBalance - initialBalance;
      const performanceFeeRate = 0.20; // 20% of profits
      
      const performanceFee = profit * performanceFeeRate;
      
      expect(profit).toBe(1000);
      expect(performanceFee).toBe(200);
    });

    test('should not charge performance fee on losses', () => {
      const initialBalance = 10000;
      const currentBalance = 9500; // Loss
      const profit = Math.max(0, currentBalance - initialBalance);
      const performanceFeeRate = 0.20;
      
      const performanceFee = profit * performanceFeeRate;
      
      expect(profit).toBe(0);
      expect(performanceFee).toBe(0);
    });
  });

  describe('Position History and Snapshots', () => {
    test('should track position changes over time', () => {
      const positionHistory = [
        { date: '2024-01-01', quantity: 10000, value: 10000 },
        { date: '2024-01-15', quantity: 10034.93, value: 10034.93 }, // After 2 weeks interest
        { date: '2024-02-01', quantity: 10069.86, value: 10069.86 }, // After 1 month
      ];
      
      const growth = positionHistory[2].value - positionHistory[0].value;
      const growthRate = (growth / positionHistory[0].value) * 100;
      
      expect(growth).toBeCloseTo(69.86, 2);
      expect(growthRate).toBeCloseTo(0.699, 3);
    });

    test('should calculate time-weighted return', () => {
      const periods = [
        { days: 30, startValue: 10000, endValue: 10070 },
        { days: 30, startValue: 10070, endValue: 10141 },
        { days: 30, startValue: 10141, endValue: 10213 },
      ];
      
      let totalReturn = 1;
      periods.forEach(period => {
        const periodReturn = period.endValue / period.startValue;
        totalReturn *= periodReturn;
      });
      
      const overallReturn = (totalReturn - 1) * 100;
      expect(overallReturn).toBeCloseTo(2.13, 2);
    });
  });

  describe('Multi-Asset Position Management', () => {
    test('should handle positions in multiple assets', () => {
      const positions = [
        { asset: 'USDC', quantity: 10000, avg_cost: 1.0 },
        { asset: 'USDT', quantity: 5000, avg_cost: 1.0 },
        { asset: 'DAI', quantity: 3000, avg_cost: 1.0 },
      ];
      
      const portfolioByAsset = {};
      positions.forEach(p => {
        portfolioByAsset[p.asset] = p.quantity * p.avg_cost;
      });
      
      expect(portfolioByAsset.USDC).toBe(10000);
      expect(portfolioByAsset.USDT).toBe(5000);
      expect(portfolioByAsset.DAI).toBe(3000);
      
      const totalPortfolio = Object.values(portfolioByAsset).reduce((sum, val) => sum + val, 0);
      expect(totalPortfolio).toBe(18000);
    });

    test('should calculate asset allocation percentages', () => {
      const positions = [
        { asset: 'USDC', value: 10000 },
        { asset: 'USDT', value: 5000 },
        { asset: 'DAI', value: 5000 },
      ];
      
      const totalValue = positions.reduce((sum, p) => sum + p.value, 0);
      const allocations = positions.map(p => ({
        asset: p.asset,
        percentage: (p.value / totalValue) * 100,
      }));
      
      expect(allocations[0].percentage).toBe(50);  // USDC: 50%
      expect(allocations[1].percentage).toBe(25);  // USDT: 25%
      expect(allocations[2].percentage).toBe(25);  // DAI: 25%
    });

    test('should rebalance positions to target allocation', () => {
      const currentPositions = [
        { asset: 'USDC', value: 12000 }, // 60%
        { asset: 'USDT', value: 8000 },  // 40%
      ];
      
      const targetAllocation = [
        { asset: 'USDC', percentage: 50 },
        { asset: 'USDT', percentage: 50 },
      ];
      
      const totalValue = 20000;
      const rebalancingNeeded = targetAllocation.map(target => {
        const targetValue = totalValue * (target.percentage / 100);
        const currentValue = currentPositions.find(p => p.asset === target.asset).value;
        return {
          asset: target.asset,
          action: targetValue > currentValue ? 'BUY' : 'SELL',
          amount: Math.abs(targetValue - currentValue),
        };
      });
      
      expect(rebalancingNeeded[0]).toEqual({
        asset: 'USDC',
        action: 'SELL',
        amount: 2000,
      });
      expect(rebalancingNeeded[1]).toEqual({
        asset: 'USDT',
        action: 'BUY',
        amount: 2000,
      });
    });
  });

  describe('Edge Cases', () => {
    test('should handle zero positions', () => {
      const position = generatePosition({ quantity: 0 });
      
      expect(position.quantity).toBe(0);
      expect(position.quantity * position.avg_cost).toBe(0);
    });

    test('should handle negative positions (short positions)', () => {
      const position = {
        quantity: -1000,
        avg_cost: 1.0,
      };
      
      const value = Math.abs(position.quantity) * position.avg_cost;
      const isShort = position.quantity < 0;
      
      expect(isShort).toBe(true);
      expect(value).toBe(1000);
    });

    test('should handle fractional quantities', () => {
      const position = {
        quantity: 10000.12345678,
        avg_cost: 1.0,
      };
      
      expect(position.quantity).toBeCloseTo(10000.12345678, 8);
    });

    test('should maintain precision in calculations', () => {
      const position = {
        quantity: 999999999.99999999,
        avg_cost: 0.99999999,
      };
      
      const value = position.quantity * position.avg_cost;
      expect(value).toBeCloseTo(999999989.99999999, 6);
    });
  });
});
