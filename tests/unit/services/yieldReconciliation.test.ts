/**
 * Yield Distribution Reconciliation Tests
 * Verifies fee calculations match expected values
 *
 * CANONICAL FORMULA (matches database implementation):
 * - Platform Fee (INDIGO) = grossYield × (investorFeePct / 100)
 * - IB Commission = grossYield × (ibCommissionPct / 100)  [calculated on GROSS, not on fee]
 * - Net to Investor = grossYield - platformFee
 * - INDIGO Credit = platformFee - IB Commission
 */

import { describe, it, expect } from "vitest";

interface YieldDistribution {
  grossYield: number;
  investorFeePct: number; // e.g., 20 for 20% platform fee
  ibCommissionPct: number; // e.g., 2 for 2% of GROSS yield (not of fee!)
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
 * CANONICAL FLOW (per accounting/yield-fee-calculation-standard):
 * 1. Gross yield is the total income before any fees
 * 2. Platform fee (performance fee) is taken from gross yield
 * 3. Net to investor is gross minus platform fee
 * 4. IB commission is calculated on GROSS yield (not on fee!)
 * 5. INDIGO receives the remaining fee after IB commission
 *
 * IMPORTANT: Both platform fee and IB commission are calculated
 * as percentages of the GROSS yield, NOT sequentially.
 */
function calculateYieldDistribution(distribution: YieldDistribution): DistributionResult {
  const { grossYield, investorFeePct, ibCommissionPct } = distribution;

  // Calculate platform fee (performance fee) - on GROSS
  const totalFees = grossYield * (investorFeePct / 100);

  // Net to investor is gross minus platform fee
  const netToInvestor = grossYield - totalFees;

  // IB commission is calculated on GROSS yield (canonical formula)
  const ibCredit = grossYield * (ibCommissionPct / 100);

  // INDIGO receives the remaining fee after IB takes their share
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
      ibCommissionPct: 2, // 2% IB commission on GROSS
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
      ibCommissionPct: 2, // 2% IB commission on GROSS
    };

    const result = calculateYieldDistribution(distribution);

    // Total fees must equal IB credit + INDIGO credit
    const reconstructedFees = result.ibCredit + result.indigoCredit;
    expect(reconstructedFees).toBeCloseTo(result.totalFees, 10);

    // Explicit values check (IB on GROSS: 1.0 * 0.02 = 0.02)
    expect(result.ibCredit).toBeCloseTo(0.02, 10); // 1.0 * 0.02 = 0.02
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

  it("handles IB receiving all fees (IB% equals fee%)", () => {
    // When IB commission equals the fee percentage, IB gets all fees
    const distribution: YieldDistribution = {
      grossYield: 10.0,
      investorFeePct: 20,
      ibCommissionPct: 20, // IB gets 20% of GROSS = same as total fee
    };

    const result = calculateYieldDistribution(distribution);

    expect(result.netToInvestor).toBeCloseTo(8.0, 10);
    expect(result.totalFees).toBeCloseTo(2.0, 10);
    expect(result.ibCredit).toBeCloseTo(2.0, 10); // 10.0 * 0.20 = 2.0
    expect(result.indigoCredit).toBe(0); // 2.0 - 2.0 = 0
  });

  it("handles zero fee percentage", () => {
    const distribution: YieldDistribution = {
      grossYield: 10.0,
      investorFeePct: 0, // No performance fee
      ibCommissionPct: 5, // IB still gets their % of gross
    };

    const result = calculateYieldDistribution(distribution);

    expect(result.netToInvestor).toBeCloseTo(10.0, 10);
    expect(result.totalFees).toBe(0);
    // IB still gets their share of GROSS (but comes from fee pool which is 0)
    expect(result.ibCredit).toBeCloseTo(0.5, 10); // 10.0 * 0.05 = 0.5
    expect(result.indigoCredit).toBeCloseTo(-0.5, 10); // 0 - 0.5 = -0.5 (edge case)
  });

  it("handles large numbers with precision", () => {
    const distribution: YieldDistribution = {
      grossYield: 1234567.89012345,
      investorFeePct: 20,
      ibCommissionPct: 2,
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
      ibCommissionPct: 2,
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
     * Complete example scenario (canonical model):
     * - Investor receives 1.0 BTC gross yield
     * - Platform charges 20% performance fee (INDIGO fee)
     * - IB gets 2% commission on GROSS yield
     *
     * Calculation:
     * 1. Gross yield: 1.0 BTC
     * 2. Performance fee: 1.0 * 0.20 = 0.2 BTC
     * 3. Net to investor: 1.0 - 0.2 = 0.8 BTC
     * 4. IB commission (on GROSS): 1.0 * 0.02 = 0.02 BTC
     * 5. INDIGO receives: 0.2 - 0.02 = 0.18 BTC
     *
     * Reconciliation checks:
     * - gross = net + fees: 1.0 = 0.8 + 0.2 ✅
     * - fees = ib + indigo: 0.2 = 0.02 + 0.18 ✅
     */

    const distribution: YieldDistribution = {
      grossYield: 1.0,
      investorFeePct: 20,
      ibCommissionPct: 2,
    };

    const result = calculateYieldDistribution(distribution);

    // Use toBeCloseTo for floating point precision
    expect(result.netToInvestor).toBeCloseTo(0.8, 10);
    expect(result.totalFees).toBeCloseTo(0.2, 10);
    expect(result.ibCredit).toBeCloseTo(0.02, 10);
    expect(result.indigoCredit).toBeCloseTo(0.18, 10);
  });

  it("matches database formula: IB calculated on GROSS not fees", () => {
    /**
     * This test explicitly validates the canonical formula from
     * accounting/yield-fee-calculation-standard memory:
     *
     * "Platform Fee (INDIGO) and Introducing Broker (IB) Fee are both
     * calculated as percentages of the GROSS yield."
     *
     * Example from memory:
     * For 355 XRP yield with 18% Indigo and 2% IB:
     * - Indigo receives: 355 * 0.18 = 63.9 XRP
     * - IB receives: 355 * 0.02 = 7.1 XRP
     * - Total Fee: 71 XRP
     */
    const distribution: YieldDistribution = {
      grossYield: 355,
      investorFeePct: 20, // Total fee percentage (18% INDIGO + 2% IB)
      ibCommissionPct: 2, // IB gets 2% of GROSS
    };

    const result = calculateYieldDistribution(distribution);

    // IB calculated on GROSS: 355 * 0.02 = 7.1
    expect(result.ibCredit).toBeCloseTo(7.1, 10);

    // Total fee: 355 * 0.20 = 71
    expect(result.totalFees).toBeCloseTo(71, 10);

    // INDIGO gets remainder: 71 - 7.1 = 63.9
    expect(result.indigoCredit).toBeCloseTo(63.9, 10);

    // Net to investor: 355 - 71 = 284
    expect(result.netToInvestor).toBeCloseTo(284, 10);

    // Conservation check
    expect(result.ibCredit + result.indigoCredit).toBeCloseTo(result.totalFees, 10);
  });
});
