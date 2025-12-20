/**
 * Statement Reconciliation Tests
 * Validates the accounting formula: Beginning + Additions - Redemptions + Net Income = Ending
 */

import { describe, it, expect } from 'vitest';

interface PerformanceRecord {
  beginningBalance: number;
  additions: number;
  redemptions: number;
  netIncome: number;
  endingBalance: number;
  rateOfReturn: number;
}

/**
 * Reconciliation formula validation
 * Beginning Balance + Additions - Redemptions + Net Income = Ending Balance
 */
function validateReconciliation(record: PerformanceRecord): {
  isValid: boolean;
  calculated: number;
  difference: number;
} {
  const calculated = 
    record.beginningBalance + 
    record.additions - 
    record.redemptions + 
    record.netIncome;
  
  const difference = Math.abs(calculated - record.endingBalance);
  // Allow for floating point tolerance (8 decimal places)
  const isValid = difference < 0.00000001;
  
  return { isValid, calculated, difference };
}

/**
 * Rate of Return calculation
 * Rate = Net Income / Beginning Balance (with zero handling)
 */
function calculateRateOfReturn(beginningBalance: number, netIncome: number): number {
  if (beginningBalance === 0) {
    return 0;
  }
  return netIncome / beginningBalance;
}

describe('Statement Reconciliation Formula', () => {
  it('should reconcile standard positive case', () => {
    const record: PerformanceRecord = {
      beginningBalance: 1000,
      additions: 100,
      redemptions: 50,
      netIncome: 25,
      endingBalance: 1075,
      rateOfReturn: 0.025,
    };
    
    const result = validateReconciliation(record);
    expect(result.isValid).toBe(true);
    expect(result.calculated).toBe(1075);
  });

  it('should reconcile with zero beginning balance (new investor)', () => {
    const record: PerformanceRecord = {
      beginningBalance: 0,
      additions: 500,
      redemptions: 0,
      netIncome: 10,
      endingBalance: 510,
      rateOfReturn: 0,
    };
    
    const result = validateReconciliation(record);
    expect(result.isValid).toBe(true);
  });

  it('should reconcile with negative net income (loss)', () => {
    const record: PerformanceRecord = {
      beginningBalance: 1000,
      additions: 0,
      redemptions: 0,
      netIncome: -50,
      endingBalance: 950,
      rateOfReturn: -0.05,
    };
    
    const result = validateReconciliation(record);
    expect(result.isValid).toBe(true);
    expect(result.calculated).toBe(950);
  });

  it('should reconcile full exit (ending = 0)', () => {
    const record: PerformanceRecord = {
      beginningBalance: 1000,
      additions: 0,
      redemptions: 1050,
      netIncome: 50,
      endingBalance: 0,
      rateOfReturn: 0.05,
    };
    
    const result = validateReconciliation(record);
    expect(result.isValid).toBe(true);
  });

  it('should detect mismatch in reconciliation', () => {
    const record: PerformanceRecord = {
      beginningBalance: 1000,
      additions: 100,
      redemptions: 50,
      netIncome: 25,
      endingBalance: 1100, // Wrong! Should be 1075
      rateOfReturn: 0.025,
    };
    
    const result = validateReconciliation(record);
    expect(result.isValid).toBe(false);
    expect(result.difference).toBe(25);
  });

  it('should handle decimal precision correctly', () => {
    const record: PerformanceRecord = {
      beginningBalance: 1.23456789,
      additions: 0.00000001,
      redemptions: 0,
      netIncome: 0.00000001,
      endingBalance: 1.23456791,
      rateOfReturn: 0,
    };
    
    const result = validateReconciliation(record);
    expect(result.isValid).toBe(true);
  });
});

describe('Rate of Return Calculation', () => {
  it('should calculate positive return correctly', () => {
    const ror = calculateRateOfReturn(1000, 50);
    expect(ror).toBe(0.05);
  });

  it('should calculate negative return correctly', () => {
    const ror = calculateRateOfReturn(1000, -30);
    expect(ror).toBe(-0.03);
  });

  it('should return 0 when beginning balance is 0', () => {
    const ror = calculateRateOfReturn(0, 100);
    expect(ror).toBe(0);
  });

  it('should handle small decimal values', () => {
    const ror = calculateRateOfReturn(0.001, 0.00005);
    expect(ror).toBeCloseTo(0.05, 5);
  });
});

describe('Token Conservation', () => {
  it('should verify no token creation or destruction', () => {
    // In a closed system: sum of all ending balances should equal 
    // sum of all beginning balances + net new deposits - net withdrawals + total net income
    const investors = [
      { beginningBalance: 1000, additions: 100, redemptions: 0, netIncome: 50, endingBalance: 1150 },
      { beginningBalance: 500, additions: 0, redemptions: 100, netIncome: 20, endingBalance: 420 },
      { beginningBalance: 200, additions: 50, redemptions: 0, netIncome: 10, endingBalance: 260 },
    ];
    
    const totalBeginning = investors.reduce((sum, i) => sum + i.beginningBalance, 0);
    const totalAdditions = investors.reduce((sum, i) => sum + i.additions, 0);
    const totalRedemptions = investors.reduce((sum, i) => sum + i.redemptions, 0);
    const totalNetIncome = investors.reduce((sum, i) => sum + i.netIncome, 0);
    const totalEnding = investors.reduce((sum, i) => sum + i.endingBalance, 0);
    
    const expectedEnding = totalBeginning + totalAdditions - totalRedemptions + totalNetIncome;
    
    expect(totalEnding).toBe(expectedEnding);
    expect(totalEnding).toBe(1830);
  });
});
