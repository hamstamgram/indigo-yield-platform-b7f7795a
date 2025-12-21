/**
 * Yield Distribution Reconciliation Tests
 * Verifies fee calculations match expected values
 */

import { describe, it, expect } from "vitest";

interface YieldDistribution {
  grossYield: number;
  investorFeePct: number; // e.g., 20 for 20%
  ibCommissionPct: number; // e.g., 10 for 10% of investor's fee
}

interface DistributionResult {
  netToInvestor: number;
  totalFees: number;
  ibCredit: number;
  indigoCredit: number;
}

/**
 * Calculate yield distribution following the platform's fee model
 * 
 * Flow:
 * 1. Gross yield is the total income before any fees
 * 2. Investor fee (performance fee) is taken from gross yield
 * 3. Net to investor is gross minus investor fee
 * 4. IB commission is calculated on the investor fee (not gross)
 * 5. INDIGO receives the remaining fee after IB commission
 */
function calculateYieldDistribution(
  distribution: YieldDistribution
): DistributionResult {
  const { grossYield, investorFeePct, ibCommissionPct } = distribution;

  // Calculate investor fee (performance fee)
  const totalFees = grossYield * (investorFeePct / 100);

  // Net to investor is gross minus fees
  const netToInvestor = grossYield - totalFees;

  // IB commission is calculated on the fee amount
  const ibCredit = totalFees * (ibCommissionPct / 100);

  // INDIGO receives the remaining fee
  const indigoCredit = totalFees - ibCredit;

  return {
    netToInvestor,
    totalFees,
    ibCredit,
    indigoCredit,
  };
}

describe("Yield Distribution Reconciliation", () => {
  it("verifies gross = net_to_investors + fees", () => {
    const distribution: YieldDistribution = {
      grossYield: 1.0, // 1 BTC gross yield
      investorFeePct: 20, // 20% performance fee
      ibCommissionPct: 10, // 10% IB commission on fees
    };

    const result = calculateYieldDistribution(distribution);

    // Gross must equal net + fees
    const reconstructedGross = result.netToInvestor + result.totalFees;
    expect(reconstructedGross).toBeCloseTo(distribution.grossYield, 10);

    // Explicit values check
    expect(result.netToInvestor).toBeCloseTo(0.8, 10); // 1.0 - 0.2 = 0.8
    expect(result.totalFees).toBeCloseTo(0.2, 10); // 1.0 * 0.2 = 0.2
  });

  it("verifies fee_credit = ib_credit + indigo_credit", () => {
    const distribution: YieldDistribution = {
      grossYield: 1.0, // 1 BTC gross yield
      investorFeePct: 20, // 20% performance fee
      ibCommissionPct: 10, // 10% IB commission on fees
    };

    const result = calculateYieldDistribution(distribution);

    // Total fees must equal IB credit + INDIGO credit
    const reconstructedFees = result.ibCredit + result.indigoCredit;
    expect(reconstructedFees).toBeCloseTo(result.totalFees, 10);

    // Explicit values check
    expect(result.ibCredit).toBeCloseTo(0.02, 10); // 0.2 * 0.1 = 0.02
    expect(result.indigoCredit).toBeCloseTo(0.18, 10); // 0.2 - 0.02 = 0.18
  });

  it("handles zero IB commission", () => {
    const distribution: YieldDistribution = {
      grossYield: 5.0,
      investorFeePct: 20,
      ibCommissionPct: 0, // No IB
    };

    const result = calculateYieldDistribution(distribution);

    expect(result.netToInvestor).toBeCloseTo(4.0, 10);
    expect(result.totalFees).toBeCloseTo(1.0, 10);
    expect(result.ibCredit).toBe(0);
    expect(result.indigoCredit).toBeCloseTo(1.0, 10);
  });

  it("handles 100% IB commission", () => {
    const distribution: YieldDistribution = {
      grossYield: 10.0,
      investorFeePct: 20,
      ibCommissionPct: 100, // IB gets all fees
    };

    const result = calculateYieldDistribution(distribution);

    expect(result.netToInvestor).toBeCloseTo(8.0, 10);
    expect(result.totalFees).toBeCloseTo(2.0, 10);
    expect(result.ibCredit).toBeCloseTo(2.0, 10);
    expect(result.indigoCredit).toBe(0);
  });

  it("handles zero fee percentage", () => {
    const distribution: YieldDistribution = {
      grossYield: 10.0,
      investorFeePct: 0, // No performance fee
      ibCommissionPct: 50,
    };

    const result = calculateYieldDistribution(distribution);

    expect(result.netToInvestor).toBeCloseTo(10.0, 10);
    expect(result.totalFees).toBe(0);
    expect(result.ibCredit).toBe(0);
    expect(result.indigoCredit).toBe(0);
  });

  it("handles large numbers with precision", () => {
    const distribution: YieldDistribution = {
      grossYield: 1234567.89012345,
      investorFeePct: 20,
      ibCommissionPct: 15,
    };

    const result = calculateYieldDistribution(distribution);

    // Verify reconciliation holds
    const grossCheck = result.netToInvestor + result.totalFees;
    expect(grossCheck).toBeCloseTo(distribution.grossYield, 8);

    const feeCheck = result.ibCredit + result.indigoCredit;
    expect(feeCheck).toBeCloseTo(result.totalFees, 8);
  });

  it("handles small decimal yields", () => {
    const distribution: YieldDistribution = {
      grossYield: 0.00001234, // Very small BTC amount
      investorFeePct: 20,
      ibCommissionPct: 10,
    };

    const result = calculateYieldDistribution(distribution);

    // Verify reconciliation holds even for small amounts
    const grossCheck = result.netToInvestor + result.totalFees;
    expect(grossCheck).toBeCloseTo(distribution.grossYield, 15);

    const feeCheck = result.ibCredit + result.indigoCredit;
    expect(feeCheck).toBeCloseTo(result.totalFees, 15);
  });

  it("provides complete example scenario documentation", () => {
    /**
     * Complete example scenario:
     * - Investor receives 1.0 BTC gross yield
     * - Platform charges 20% performance fee
     * - IB gets 10% commission on the fee
     *
     * Calculation:
     * 1. Gross yield: 1.0 BTC
     * 2. Performance fee: 1.0 * 0.20 = 0.2 BTC
     * 3. Net to investor: 1.0 - 0.2 = 0.8 BTC
     * 4. IB commission: 0.2 * 0.10 = 0.02 BTC
     * 5. INDIGO receives: 0.2 - 0.02 = 0.18 BTC
     *
     * Reconciliation checks:
     * - gross = net + fees: 1.0 = 0.8 + 0.2 ✅
     * - fees = ib + indigo: 0.2 = 0.02 + 0.18 ✅
     */

    const distribution: YieldDistribution = {
      grossYield: 1.0,
      investorFeePct: 20,
      ibCommissionPct: 10,
    };

    const result = calculateYieldDistribution(distribution);

    expect(result).toEqual({
      netToInvestor: 0.8,
      totalFees: 0.2,
      ibCredit: 0.02,
      indigoCredit: 0.18,
    });
  });
});
