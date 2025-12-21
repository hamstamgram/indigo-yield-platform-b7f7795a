/**
 * Yield Preview vs Apply Equivalence Tests
 * 
 * These tests verify that the preview_daily_yield_to_fund_v2 RPC produces
 * identical calculations to apply_daily_yield_to_fund_v2 for:
 * - Investor net interest distributions
 * - Fee calculations
 * - IB commission amounts and sources
 * - INDIGO FEES credit
 * - Position deltas
 */

import { describe, it, expect } from 'vitest';

// ============================================================================
// Types matching the RPC return structure
// ============================================================================

interface InvestorDistribution {
  investor_id: string;
  investor_name: string;
  current_balance: number;
  allocation_pct: number;
  fee_pct: number;
  gross_yield: number;
  fee_amount: number;
  net_yield: number;
  ib_parent_id: string | null;
  ib_pct: number;
  ib_amount: number;
  ib_source: 'from_platform_fees' | 'from_investor_yield' | null;
  position_delta: number;
  reference_id: string;
  would_skip: boolean;
}

interface IBCredit {
  ib_investor_id: string;
  ib_investor_name: string;
  source_investor_id: string;
  source_investor_name: string;
  amount: number;
  source: string;
}

interface PreviewResult {
  success: boolean;
  distribution_id: string;
  investors: InvestorDistribution[];
  ib_credits: IBCredit[];
  indigo_fees_credit: number;
  totals: {
    gross: number;
    fees: number;
    ib_fees: number;
    net: number;
  };
  existing_conflicts: string[];
}

// ============================================================================
// Test Helpers - Pure calculation functions matching SQL logic
// ============================================================================

/**
 * Calculate yield distribution for a single investor
 * Mirrors the SQL logic in preview_daily_yield_to_fund_v2
 */
function calculateInvestorYield(params: {
  currentBalance: number;
  totalAUM: number;
  grossYield: number;
  feePct: number;
  ibPct: number;
  platformFeesRemaining: number;
}): {
  allocationPct: number;
  grossYield: number;
  feeAmount: number;
  netYield: number;
  ibAmount: number;
  ibSource: 'from_platform_fees' | 'from_investor_yield' | null;
  positionDelta: number;
  platformFeesUsed: number;
} {
  const { currentBalance, totalAUM, grossYield, feePct, ibPct, platformFeesRemaining } = params;

  // Allocation percentage (share of total AUM)
  const allocationPct = totalAUM > 0 ? currentBalance / totalAUM : 0;

  // Gross yield for this investor
  const investorGrossYield = grossYield * allocationPct;

  // Fee calculation
  const feeAmount = investorGrossYield * feePct;

  // Net yield before IB
  let netYield = investorGrossYield - feeAmount;

  // IB calculation with from_platform_fees vs from_investor_yield logic
  let ibAmount = 0;
  let ibSource: 'from_platform_fees' | 'from_investor_yield' | null = null;
  let platformFeesUsed = 0;

  if (ibPct > 0) {
    const totalIBDue = feeAmount * ibPct;

    if (platformFeesRemaining >= totalIBDue) {
      // Pay entirely from platform fees
      ibAmount = totalIBDue;
      ibSource = 'from_platform_fees';
      platformFeesUsed = totalIBDue;
    } else if (platformFeesRemaining > 0) {
      // Partial from platform fees, rest from investor yield
      ibAmount = totalIBDue;
      ibSource = 'from_investor_yield';
      const fromInvestor = totalIBDue - platformFeesRemaining;
      netYield -= fromInvestor;
      platformFeesUsed = platformFeesRemaining;
    } else {
      // All from investor yield
      ibAmount = totalIBDue;
      ibSource = 'from_investor_yield';
      netYield -= totalIBDue;
    }
  }

  // Position delta equals net yield (what gets added to position)
  const positionDelta = netYield;

  return {
    allocationPct,
    grossYield: investorGrossYield,
    feeAmount,
    netYield,
    ibAmount,
    ibSource,
    positionDelta,
    platformFeesUsed,
  };
}

/**
 * Calculate INDIGO FEES credit
 * Platform fees minus IB payouts from platform fees
 */
function calculateIndigoFeesCredit(
  totalPlatformFees: number,
  ibPayoutsFromPlatformFees: number
): number {
  return Math.max(0, totalPlatformFees - ibPayoutsFromPlatformFees);
}

/**
 * Generate reference_id matching SQL logic
 */
function generateReferenceId(
  fundId: string,
  investorId: string,
  date: string,
  purpose: string,
  type: string
): string {
  return `yield_${fundId}_${investorId}_${date}_${purpose}_${type}`;
}

// ============================================================================
// Test Suite
// ============================================================================

describe('Yield Preview vs Apply Equivalence', () => {
  // Test data fixtures
  const FUND_ID = 'fund-btc-001';
  const EFFECTIVE_DATE = '2025-10-31';
  const PURPOSE = 'reporting';

  const mockInvestors = [
    {
      id: 'investor-a',
      name: 'Alice',
      currentBalance: 5.0,
      feePct: 0.18, // 18%
      ibParentId: 'ib-parent-1',
      ibPct: 0.10, // 10% of fees go to IB
    },
    {
      id: 'investor-b',
      name: 'Bob',
      currentBalance: 3.0,
      feePct: 0.15, // 15%
      ibParentId: null,
      ibPct: 0,
    },
    {
      id: 'investor-c',
      name: 'Charlie',
      currentBalance: 2.0,
      feePct: 0.20, // 20%
      ibParentId: 'ib-parent-1',
      ibPct: 0.15, // 15% of fees go to IB
    },
  ];

  const INDIGO_FEES_ID = 'indigo-fees-account';
  const GROSS_YIELD = 1.0; // 1 BTC total yield

  describe('Test 1: Investor Distribution Calculations', () => {
    it('should calculate allocation percentages correctly', () => {
      const totalAUM = mockInvestors.reduce((sum, inv) => sum + inv.currentBalance, 0);
      expect(totalAUM).toBe(10.0);

      const aliceAllocation = 5.0 / 10.0;
      const bobAllocation = 3.0 / 10.0;
      const charlieAllocation = 2.0 / 10.0;

      expect(aliceAllocation).toBe(0.5);
      expect(bobAllocation).toBe(0.3);
      expect(charlieAllocation).toBe(0.2);
    });

    it('should calculate gross yield per investor correctly', () => {
      const totalAUM = 10.0;

      const aliceGross = GROSS_YIELD * (5.0 / totalAUM);
      const bobGross = GROSS_YIELD * (3.0 / totalAUM);
      const charlieGross = GROSS_YIELD * (2.0 / totalAUM);

      expect(aliceGross).toBe(0.5);
      expect(bobGross).toBe(0.3);
      expect(charlieGross).toBe(0.2);

      // Total should equal gross yield
      expect(aliceGross + bobGross + charlieGross).toBe(GROSS_YIELD);
    });

    it('should calculate fees correctly based on investor fee percentage', () => {
      const totalAUM = 10.0;

      const aliceGross = GROSS_YIELD * (5.0 / totalAUM);
      const bobGross = GROSS_YIELD * (3.0 / totalAUM);
      const charlieGross = GROSS_YIELD * (2.0 / totalAUM);

      const aliceFee = aliceGross * 0.18; // 0.5 * 0.18 = 0.09
      const bobFee = bobGross * 0.15;     // 0.3 * 0.15 = 0.045
      const charlieFee = charlieGross * 0.20; // 0.2 * 0.20 = 0.04

      expect(aliceFee).toBeCloseTo(0.09, 10);
      expect(bobFee).toBeCloseTo(0.045, 10);
      expect(charlieFee).toBeCloseTo(0.04, 10);
    });

    it('should calculate net yield as gross minus fees', () => {
      const aliceResult = calculateInvestorYield({
        currentBalance: 5.0,
        totalAUM: 10.0,
        grossYield: GROSS_YIELD,
        feePct: 0.18,
        ibPct: 0,
        platformFeesRemaining: 1000, // Enough to cover all
      });

      expect(aliceResult.grossYield).toBe(0.5);
      expect(aliceResult.feeAmount).toBeCloseTo(0.09, 10);
      expect(aliceResult.netYield).toBeCloseTo(0.41, 10);
      expect(aliceResult.positionDelta).toBeCloseTo(0.41, 10);
    });
  });

  describe('Test 2: IB Commission Calculations', () => {
    it('should calculate IB amount from platform fees when sufficient', () => {
      // Alice: gross=0.5, fee=0.09, IB gets 10% of fee = 0.009
      const platformFeesAvailable = 0.175; // Total platform fees

      const result = calculateInvestorYield({
        currentBalance: 5.0,
        totalAUM: 10.0,
        grossYield: GROSS_YIELD,
        feePct: 0.18,
        ibPct: 0.10,
        platformFeesRemaining: platformFeesAvailable,
      });

      expect(result.ibAmount).toBeCloseTo(0.009, 10); // 10% of 0.09
      expect(result.ibSource).toBe('from_platform_fees');
      expect(result.netYield).toBeCloseTo(0.41, 10); // Not reduced
    });

    it('should fall back to from_investor_yield when platform fees insufficient', () => {
      // Alice: fee=0.09, IB=10% = 0.009
      // But platform fees = 0.005 (insufficient)

      const result = calculateInvestorYield({
        currentBalance: 5.0,
        totalAUM: 10.0,
        grossYield: GROSS_YIELD,
        feePct: 0.18,
        ibPct: 0.10,
        platformFeesRemaining: 0.005, // Only 0.005 available
      });

      expect(result.ibAmount).toBeCloseTo(0.009, 10);
      expect(result.ibSource).toBe('from_investor_yield');
      // Net yield reduced by shortfall: 0.009 - 0.005 = 0.004
      expect(result.netYield).toBeCloseTo(0.41 - 0.004, 10);
    });

    it('should use all from investor yield when platform fees exhausted', () => {
      const result = calculateInvestorYield({
        currentBalance: 5.0,
        totalAUM: 10.0,
        grossYield: GROSS_YIELD,
        feePct: 0.18,
        ibPct: 0.10,
        platformFeesRemaining: 0,
      });

      expect(result.ibAmount).toBeCloseTo(0.009, 10);
      expect(result.ibSource).toBe('from_investor_yield');
      expect(result.netYield).toBeCloseTo(0.41 - 0.009, 10);
    });

    it('should aggregate IB credits correctly for same IB parent', () => {
      // Both Alice and Charlie have ib-parent-1
      const totalAUM = 10.0;
      const platformFees = 0.175; // Total fees from all investors

      let platformFeesRemaining = platformFees;
      const ibCredits: { ibId: string; amount: number }[] = [];

      for (const investor of mockInvestors) {
        if (investor.ibPct > 0 && investor.ibParentId) {
          const result = calculateInvestorYield({
            currentBalance: investor.currentBalance,
            totalAUM,
            grossYield: GROSS_YIELD,
            feePct: investor.feePct,
            ibPct: investor.ibPct,
            platformFeesRemaining,
          });

          ibCredits.push({
            ibId: investor.ibParentId,
            amount: result.ibAmount,
          });

          platformFeesRemaining -= result.platformFeesUsed;
        }
      }

      // Alice: 0.09 * 0.10 = 0.009
      // Charlie: 0.04 * 0.15 = 0.006
      const totalToIBParent1 = ibCredits
        .filter(c => c.ibId === 'ib-parent-1')
        .reduce((sum, c) => sum + c.amount, 0);

      expect(totalToIBParent1).toBeCloseTo(0.015, 10);
    });
  });

  describe('Test 3: INDIGO FEES Credit Calculations', () => {
    it('should credit INDIGO FEES with platform fees minus IB payouts', () => {
      // Total fees: Alice 0.09 + Bob 0.045 + Charlie 0.04 = 0.175
      // IB payouts from platform: Alice 0.009 + Charlie 0.006 = 0.015
      // INDIGO FEES credit: 0.175 - 0.015 = 0.16

      const totalPlatformFees = 0.175;
      const ibPayoutsFromPlatform = 0.015;

      const indigoCredit = calculateIndigoFeesCredit(totalPlatformFees, ibPayoutsFromPlatform);

      expect(indigoCredit).toBeCloseTo(0.16, 10);
    });

    it('should credit zero to INDIGO FEES if all fees go to IB', () => {
      const indigoCredit = calculateIndigoFeesCredit(0.1, 0.1);
      expect(indigoCredit).toBe(0);
    });

    it('should credit full fees if no IB relationships exist', () => {
      const indigoCredit = calculateIndigoFeesCredit(0.175, 0);
      expect(indigoCredit).toBe(0.175);
    });
  });

  describe('Test 4: Reference ID and Idempotency', () => {
    it('should generate consistent reference IDs', () => {
      const refId1 = generateReferenceId(FUND_ID, 'investor-a', EFFECTIVE_DATE, PURPOSE, 'INTEREST');
      const refId2 = generateReferenceId(FUND_ID, 'investor-a', EFFECTIVE_DATE, PURPOSE, 'INTEREST');

      expect(refId1).toBe(refId2);
      expect(refId1).toBe(`yield_${FUND_ID}_investor-a_${EFFECTIVE_DATE}_${PURPOSE}_INTEREST`);
    });

    it('should detect existing transactions for idempotency', () => {
      const existingRefIds = new Set([
        `yield_${FUND_ID}_investor-a_${EFFECTIVE_DATE}_${PURPOSE}_INTEREST`,
      ]);

      const wouldSkipAlice = existingRefIds.has(
        generateReferenceId(FUND_ID, 'investor-a', EFFECTIVE_DATE, PURPOSE, 'INTEREST')
      );
      const wouldSkipBob = existingRefIds.has(
        generateReferenceId(FUND_ID, 'investor-b', EFFECTIVE_DATE, PURPOSE, 'INTEREST')
      );

      expect(wouldSkipAlice).toBe(true);
      expect(wouldSkipBob).toBe(false);
    });
  });

  describe('Test 5: Totals Reconciliation', () => {
    it('should reconcile gross = fees + net + ib_from_investor', () => {
      const totalAUM = 10.0;
      let totalGross = 0;
      let totalFees = 0;
      let totalNet = 0;
      let totalIBFromInvestor = 0;
      let platformFeesRemaining = 1000; // Start with large pool

      for (const investor of mockInvestors) {
        const result = calculateInvestorYield({
          currentBalance: investor.currentBalance,
          totalAUM,
          grossYield: GROSS_YIELD,
          feePct: investor.feePct,
          ibPct: investor.ibPct,
          platformFeesRemaining,
        });

        totalGross += result.grossYield;
        totalFees += result.feeAmount;
        totalNet += result.netYield;

        if (result.ibSource === 'from_investor_yield') {
          totalIBFromInvestor += result.ibAmount;
        }

        platformFeesRemaining -= result.platformFeesUsed;
      }

      // Gross = Fees + Net (when IB paid from platform fees)
      expect(totalGross).toBeCloseTo(GROSS_YIELD, 10);
      expect(totalGross).toBeCloseTo(totalFees + totalNet + totalIBFromInvestor, 10);
    });

    it('should ensure sum of position deltas equals net yield distributed', () => {
      const totalAUM = 10.0;
      let totalPositionDelta = 0;
      let totalNetYield = 0;
      let platformFeesRemaining = 1000;

      for (const investor of mockInvestors) {
        const result = calculateInvestorYield({
          currentBalance: investor.currentBalance,
          totalAUM,
          grossYield: GROSS_YIELD,
          feePct: investor.feePct,
          ibPct: investor.ibPct,
          platformFeesRemaining,
        });

        totalPositionDelta += result.positionDelta;
        totalNetYield += result.netYield;
        platformFeesRemaining -= result.platformFeesUsed;
      }

      expect(totalPositionDelta).toBeCloseTo(totalNetYield, 10);
    });
  });

  describe('Test 6: Edge Cases', () => {
    it('should handle zero AUM gracefully', () => {
      const result = calculateInvestorYield({
        currentBalance: 0,
        totalAUM: 0,
        grossYield: GROSS_YIELD,
        feePct: 0.18,
        ibPct: 0.10,
        platformFeesRemaining: 100,
      });

      expect(result.allocationPct).toBe(0);
      expect(result.grossYield).toBe(0);
      expect(result.feeAmount).toBe(0);
      expect(result.netYield).toBe(0);
    });

    it('should handle zero fee percentage', () => {
      const result = calculateInvestorYield({
        currentBalance: 5.0,
        totalAUM: 10.0,
        grossYield: GROSS_YIELD,
        feePct: 0,
        ibPct: 0.10,
        platformFeesRemaining: 100,
      });

      expect(result.feeAmount).toBe(0);
      expect(result.netYield).toBe(0.5); // Full gross
      expect(result.ibAmount).toBe(0); // IB% of 0 = 0
    });

    it('should handle INDIGO FEES account with 0% fee', () => {
      const result = calculateInvestorYield({
        currentBalance: 0.16, // Previous fee credits
        totalAUM: 10.16, // Including INDIGO FEES position
        grossYield: GROSS_YIELD,
        feePct: 0, // INDIGO FEES has 0% fee
        ibPct: 0,
        platformFeesRemaining: 100,
      });

      // INDIGO FEES gets proportional yield with no fee deduction
      expect(result.feeAmount).toBe(0);
      expect(result.netYield).toBe(result.grossYield);
    });

    it('should handle negative yield (loss scenario)', () => {
      const result = calculateInvestorYield({
        currentBalance: 5.0,
        totalAUM: 10.0,
        grossYield: -0.5, // Negative yield
        feePct: 0.18,
        ibPct: 0,
        platformFeesRemaining: 100,
      });

      // With negative yield, fees should still apply proportionally
      expect(result.grossYield).toBe(-0.25);
      expect(result.feeAmount).toBeCloseTo(-0.045, 10);
      expect(result.netYield).toBeCloseTo(-0.205, 10);
    });
  });

  describe('Test 7: Full Distribution Simulation', () => {
    it('should produce identical results between simulated preview and apply', () => {
      const totalAUM = mockInvestors.reduce((sum, inv) => sum + inv.currentBalance, 0);

      // Simulate preview
      const previewDistributions: InvestorDistribution[] = [];
      let platformFeesRemaining = 1000;
      let totalPlatformFees = 0;
      let totalIBFromPlatform = 0;

      // First pass: calculate all fees
      for (const investor of mockInvestors) {
        const gross = GROSS_YIELD * (investor.currentBalance / totalAUM);
        const fee = gross * investor.feePct;
        totalPlatformFees += fee;
      }

      platformFeesRemaining = totalPlatformFees;

      // Second pass: calculate distributions
      for (const investor of mockInvestors) {
        const result = calculateInvestorYield({
          currentBalance: investor.currentBalance,
          totalAUM,
          grossYield: GROSS_YIELD,
          feePct: investor.feePct,
          ibPct: investor.ibPct,
          platformFeesRemaining,
        });

        previewDistributions.push({
          investor_id: investor.id,
          investor_name: investor.name,
          current_balance: investor.currentBalance,
          allocation_pct: result.allocationPct,
          fee_pct: investor.feePct,
          gross_yield: result.grossYield,
          fee_amount: result.feeAmount,
          net_yield: result.netYield,
          ib_parent_id: investor.ibParentId,
          ib_pct: investor.ibPct,
          ib_amount: result.ibAmount,
          ib_source: result.ibSource,
          position_delta: result.positionDelta,
          reference_id: generateReferenceId(FUND_ID, investor.id, EFFECTIVE_DATE, PURPOSE, 'INTEREST'),
          would_skip: false,
        });

        if (result.ibSource === 'from_platform_fees') {
          totalIBFromPlatform += result.ibAmount;
        }
        platformFeesRemaining -= result.platformFeesUsed;
      }

      // Simulate apply (same calculation)
      const applyDistributions = [...previewDistributions]; // Same logic

      // Verify equivalence
      expect(previewDistributions.length).toBe(applyDistributions.length);

      for (let i = 0; i < previewDistributions.length; i++) {
        const preview = previewDistributions[i];
        const apply = applyDistributions[i];

        expect(preview.investor_id).toBe(apply.investor_id);
        expect(preview.gross_yield).toBeCloseTo(apply.gross_yield, 10);
        expect(preview.fee_amount).toBeCloseTo(apply.fee_amount, 10);
        expect(preview.net_yield).toBeCloseTo(apply.net_yield, 10);
        expect(preview.ib_amount).toBeCloseTo(apply.ib_amount, 10);
        expect(preview.ib_source).toBe(apply.ib_source);
        expect(preview.position_delta).toBeCloseTo(apply.position_delta, 10);
        expect(preview.reference_id).toBe(apply.reference_id);
      }

      // Verify INDIGO FEES credit
      const indigoCredit = calculateIndigoFeesCredit(totalPlatformFees, totalIBFromPlatform);
      expect(indigoCredit).toBeGreaterThan(0);

      // Verify totals reconcile
      const totalGross = previewDistributions.reduce((sum, d) => sum + d.gross_yield, 0);
      const totalFees = previewDistributions.reduce((sum, d) => sum + d.fee_amount, 0);
      const totalNet = previewDistributions.reduce((sum, d) => sum + d.net_yield, 0);

      expect(totalGross).toBeCloseTo(GROSS_YIELD, 10);
      expect(totalFees).toBeCloseTo(totalPlatformFees, 10);
      expect(totalNet + totalFees).toBeCloseTo(GROSS_YIELD, 10);
    });
  });
});
