/**
 * Fee Calculations Unit Tests
 * Verifies fee deduction logic, IB commission splits, and INDIGO FEES credits
 */

import { describe, it, expect } from "vitest";
import Decimal from "decimal.js";

// ============================================================================
// Types
// ============================================================================

interface InvestorFeeInput {
  investorId: string;
  grossYield: number;
  feePercentage: number; // e.g., 20 for 20%
  ibParentId?: string;
  ibCommissionPct: number; // e.g., 10 for 10% of fees
}

interface FeeCalculationResult {
  investorId: string;
  grossYield: number;
  feeAmount: number;
  netYield: number;
  ibCredit: number;
  indigoCredit: number;
}

interface FundFeesSummary {
  totalGross: number;
  totalFees: number;
  totalNet: number;
  totalIbCredits: number;
  totalIndigoCredits: number;
}

// ============================================================================
// Fee Calculation Functions (Pure functions matching backend logic)
// ============================================================================

/**
 * Calculate fee for a single investor
 * Uses Decimal.js for precision (matches backend numeric type)
 */
function calculateInvestorFee(input: InvestorFeeInput): FeeCalculationResult {
  const gross = new Decimal(input.grossYield);
  const feePct = new Decimal(input.feePercentage).dividedBy(100);
  const ibPct = new Decimal(input.ibCommissionPct).dividedBy(100);

  // Fee is deducted from gross yield
  const feeAmount = gross.times(feePct);
  const netYield = gross.minus(feeAmount);

  // IB commission is taken from the fee amount (not from gross)
  const ibCredit = feeAmount.times(ibPct);
  const indigoCredit = feeAmount.minus(ibCredit);

  return {
    investorId: input.investorId,
    grossYield: gross.toNumber(),
    feeAmount: feeAmount.toNumber(),
    netYield: netYield.toNumber(),
    ibCredit: ibCredit.toNumber(),
    indigoCredit: indigoCredit.toNumber(),
  };
}

/**
 * Calculate fees for multiple investors and aggregate
 */
function calculateFundFees(inputs: InvestorFeeInput[]): {
  results: FeeCalculationResult[];
  summary: FundFeesSummary;
} {
  const results = inputs.map(calculateInvestorFee);

  const summary: FundFeesSummary = {
    totalGross: results.reduce((sum, r) => sum + r.grossYield, 0),
    totalFees: results.reduce((sum, r) => sum + r.feeAmount, 0),
    totalNet: results.reduce((sum, r) => sum + r.netYield, 0),
    totalIbCredits: results.reduce((sum, r) => sum + r.ibCredit, 0),
    totalIndigoCredits: results.reduce((sum, r) => sum + r.indigoCredit, 0),
  };

  return { results, summary };
}

/**
 * Verify fee reconciliation equation:
 * gross = net + fees
 * fees = ibCredit + indigoCredit
 */
function verifyFeeReconciliation(result: FeeCalculationResult): {
  grossEqualsNetPlusFees: boolean;
  feesEqualsCredits: boolean;
  grossDiff: number;
  feesDiff: number;
} {
  const grossCheck = new Decimal(result.netYield).plus(result.feeAmount);
  const feesCheck = new Decimal(result.ibCredit).plus(result.indigoCredit);

  const grossDiff = Math.abs(grossCheck.minus(result.grossYield).toNumber());
  const feesDiff = Math.abs(feesCheck.minus(result.feeAmount).toNumber());

  return {
    grossEqualsNetPlusFees: grossDiff < 1e-10,
    feesEqualsCredits: feesDiff < 1e-10,
    grossDiff,
    feesDiff,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe("Fee Calculations", () => {
  describe("Single Investor Fee Calculation", () => {
    it("calculates standard 20% fee correctly", () => {
      const result = calculateInvestorFee({
        investorId: "inv-1",
        grossYield: 1.0,
        feePercentage: 20,
        ibCommissionPct: 0,
      });

      expect(result.grossYield).toBe(1.0);
      expect(result.feeAmount).toBeCloseTo(0.2, 10);
      expect(result.netYield).toBeCloseTo(0.8, 10);
      expect(result.ibCredit).toBe(0);
      expect(result.indigoCredit).toBeCloseTo(0.2, 10);
    });

    it("calculates fee with IB commission correctly", () => {
      const result = calculateInvestorFee({
        investorId: "inv-1",
        grossYield: 1.0,
        feePercentage: 20,
        ibParentId: "ib-1",
        ibCommissionPct: 10,
      });

      expect(result.feeAmount).toBeCloseTo(0.2, 10);
      expect(result.ibCredit).toBeCloseTo(0.02, 10); // 10% of 0.2
      expect(result.indigoCredit).toBeCloseTo(0.18, 10); // 0.2 - 0.02
    });

    it("handles 100% IB commission", () => {
      const result = calculateInvestorFee({
        investorId: "inv-1",
        grossYield: 5.0,
        feePercentage: 20,
        ibParentId: "ib-1",
        ibCommissionPct: 100,
      });

      expect(result.feeAmount).toBeCloseTo(1.0, 10);
      expect(result.ibCredit).toBeCloseTo(1.0, 10);
      expect(result.indigoCredit).toBe(0);
    });

    it("handles zero fee percentage", () => {
      const result = calculateInvestorFee({
        investorId: "inv-1",
        grossYield: 10.0,
        feePercentage: 0,
        ibCommissionPct: 50,
      });

      expect(result.netYield).toBeCloseTo(10.0, 10);
      expect(result.feeAmount).toBe(0);
      expect(result.ibCredit).toBe(0);
      expect(result.indigoCredit).toBe(0);
    });

    it("handles very small amounts (satoshi-level)", () => {
      const result = calculateInvestorFee({
        investorId: "inv-1",
        grossYield: 0.00000001, // 1 satoshi
        feePercentage: 20,
        ibCommissionPct: 10,
      });

      const reconciliation = verifyFeeReconciliation(result);
      expect(reconciliation.grossEqualsNetPlusFees).toBe(true);
      expect(reconciliation.feesEqualsCredits).toBe(true);
    });

    it("handles large amounts with precision", () => {
      const result = calculateInvestorFee({
        investorId: "inv-1",
        grossYield: 1234567.89012345,
        feePercentage: 20,
        ibCommissionPct: 15,
      });

      const reconciliation = verifyFeeReconciliation(result);
      expect(reconciliation.grossEqualsNetPlusFees).toBe(true);
      expect(reconciliation.feesEqualsCredits).toBe(true);
    });
  });

  describe("Fee Reconciliation", () => {
    it("verifies gross = net + fees for all scenarios", () => {
      const scenarios = [
        { gross: 1.0, fee: 20, ib: 10 },
        { gross: 0.5, fee: 15, ib: 25 },
        { gross: 100.0, fee: 25, ib: 0 },
        { gross: 0.00001234, fee: 20, ib: 50 },
        { gross: 9999999.99, fee: 20, ib: 100 },
      ];

      for (const scenario of scenarios) {
        const result = calculateInvestorFee({
          investorId: "test",
          grossYield: scenario.gross,
          feePercentage: scenario.fee,
          ibCommissionPct: scenario.ib,
        });

        const reconciliation = verifyFeeReconciliation(result);
        expect(reconciliation.grossEqualsNetPlusFees).toBe(true);
        expect(reconciliation.feesEqualsCredits).toBe(true);
      }
    });

    it("verifies fees = ibCredit + indigoCredit", () => {
      const result = calculateInvestorFee({
        investorId: "inv-1",
        grossYield: 1.0,
        feePercentage: 20,
        ibParentId: "ib-1",
        ibCommissionPct: 10,
      });

      const sumOfCredits = result.ibCredit + result.indigoCredit;
      expect(sumOfCredits).toBeCloseTo(result.feeAmount, 10);
    });
  });

  describe("Fund-Level Fee Aggregation", () => {
    it("aggregates fees across multiple investors", () => {
      const inputs: InvestorFeeInput[] = [
        { investorId: "inv-1", grossYield: 1.0, feePercentage: 20, ibCommissionPct: 10 },
        { investorId: "inv-2", grossYield: 2.0, feePercentage: 20, ibCommissionPct: 0 },
        { investorId: "inv-3", grossYield: 0.5, feePercentage: 15, ibCommissionPct: 25 },
      ];

      const { summary } = calculateFundFees(inputs);

      // Manual calculation:
      // inv-1: gross=1.0, fee=0.2, net=0.8, ib=0.02, indigo=0.18
      // inv-2: gross=2.0, fee=0.4, net=1.6, ib=0, indigo=0.4
      // inv-3: gross=0.5, fee=0.075, net=0.425, ib=0.01875, indigo=0.05625
      
      expect(summary.totalGross).toBeCloseTo(3.5, 10);
      expect(summary.totalFees).toBeCloseTo(0.675, 10);
      expect(summary.totalNet).toBeCloseTo(2.825, 10);
      expect(summary.totalIbCredits).toBeCloseTo(0.03875, 10);
      expect(summary.totalIndigoCredits).toBeCloseTo(0.63625, 10);
    });

    it("verifies fund-level reconciliation", () => {
      const inputs: InvestorFeeInput[] = [
        { investorId: "inv-1", grossYield: 5.0, feePercentage: 20, ibCommissionPct: 10 },
        { investorId: "inv-2", grossYield: 3.0, feePercentage: 18, ibCommissionPct: 15 },
        { investorId: "inv-3", grossYield: 2.0, feePercentage: 22, ibCommissionPct: 5 },
      ];

      const { summary } = calculateFundFees(inputs);

      // Verify fund-level reconciliation
      expect(summary.totalGross).toBeCloseTo(
        summary.totalNet + summary.totalFees,
        10
      );
      expect(summary.totalFees).toBeCloseTo(
        summary.totalIbCredits + summary.totalIndigoCredits,
        10
      );
    });

    it("handles empty investor list", () => {
      const { summary } = calculateFundFees([]);

      expect(summary.totalGross).toBe(0);
      expect(summary.totalFees).toBe(0);
      expect(summary.totalNet).toBe(0);
      expect(summary.totalIbCredits).toBe(0);
      expect(summary.totalIndigoCredits).toBe(0);
    });
  });

  describe("Different Fee Tiers", () => {
    it("calculates correctly for VIP investor (lower fee)", () => {
      const vip = calculateInvestorFee({
        investorId: "vip-1",
        grossYield: 10.0,
        feePercentage: 10, // VIP rate
        ibCommissionPct: 0,
      });

      const standard = calculateInvestorFee({
        investorId: "std-1",
        grossYield: 10.0,
        feePercentage: 20, // Standard rate
        ibCommissionPct: 0,
      });

      expect(vip.netYield).toBeCloseTo(9.0, 10);
      expect(standard.netYield).toBeCloseTo(8.0, 10);
      expect(vip.netYield).toBeGreaterThan(standard.netYield);
    });

    it("calculates correctly for different IB commission tiers", () => {
      const baseInput = {
        investorId: "inv-1",
        grossYield: 1.0,
        feePercentage: 20,
      };

      const tier1 = calculateInvestorFee({ ...baseInput, ibCommissionPct: 5 });
      const tier2 = calculateInvestorFee({ ...baseInput, ibCommissionPct: 10 });
      const tier3 = calculateInvestorFee({ ...baseInput, ibCommissionPct: 15 });

      expect(tier1.ibCredit).toBeCloseTo(0.01, 10);
      expect(tier2.ibCredit).toBeCloseTo(0.02, 10);
      expect(tier3.ibCredit).toBeCloseTo(0.03, 10);

      // INDIGO credit decreases as IB commission increases
      expect(tier1.indigoCredit).toBeGreaterThan(tier2.indigoCredit);
      expect(tier2.indigoCredit).toBeGreaterThan(tier3.indigoCredit);
    });
  });

  describe("Edge Cases", () => {
    it("handles zero gross yield", () => {
      const result = calculateInvestorFee({
        investorId: "inv-1",
        grossYield: 0,
        feePercentage: 20,
        ibCommissionPct: 10,
      });

      expect(result.feeAmount).toBe(0);
      expect(result.netYield).toBe(0);
      expect(result.ibCredit).toBe(0);
      expect(result.indigoCredit).toBe(0);
    });

    it("handles fractional percentages", () => {
      const result = calculateInvestorFee({
        investorId: "inv-1",
        grossYield: 100.0,
        feePercentage: 17.5, // 17.5% fee
        ibCommissionPct: 12.5, // 12.5% IB commission
      });

      expect(result.feeAmount).toBeCloseTo(17.5, 10);
      expect(result.netYield).toBeCloseTo(82.5, 10);
      expect(result.ibCredit).toBeCloseTo(2.1875, 10); // 17.5 * 0.125
      expect(result.indigoCredit).toBeCloseTo(15.3125, 10); // 17.5 - 2.1875
    });

    it("maintains precision with repeating decimals", () => {
      const result = calculateInvestorFee({
        investorId: "inv-1",
        grossYield: 1.0,
        feePercentage: 33.333333, // ~33.33%
        ibCommissionPct: 33.333333,
      });

      const reconciliation = verifyFeeReconciliation(result);
      expect(reconciliation.grossEqualsNetPlusFees).toBe(true);
      expect(reconciliation.feesEqualsCredits).toBe(true);
    });
  });
});

describe("INDIGO FEES Credit Verification", () => {
  it("verifies INDIGO receives remaining fee after IB", () => {
    const result = calculateInvestorFee({
      investorId: "inv-1",
      grossYield: 1.0,
      feePercentage: 20,
      ibParentId: "ib-1",
      ibCommissionPct: 10,
    });

    // INDIGO should receive 90% of fees (100% - 10% IB)
    const expectedIndigo = result.feeAmount * 0.9;
    expect(result.indigoCredit).toBeCloseTo(expectedIndigo, 10);
    expect(result.indigoCredit).toBeCloseTo(0.18, 10);
  });

  it("verifies INDIGO receives 100% when no IB", () => {
    const result = calculateInvestorFee({
      investorId: "inv-1",
      grossYield: 1.0,
      feePercentage: 20,
      ibCommissionPct: 0, // No IB
    });

    expect(result.indigoCredit).toBeCloseTo(result.feeAmount, 10);
    expect(result.ibCredit).toBe(0);
  });

  it("verifies INDIGO receives nothing when 100% IB", () => {
    const result = calculateInvestorFee({
      investorId: "inv-1",
      grossYield: 1.0,
      feePercentage: 20,
      ibParentId: "ib-1",
      ibCommissionPct: 100,
    });

    expect(result.indigoCredit).toBe(0);
    expect(result.ibCredit).toBeCloseTo(result.feeAmount, 10);
  });
});
