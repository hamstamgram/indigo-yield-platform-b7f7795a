import Decimal from "decimal.js";

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

interface DepositRecord {
  investorId: string;
  fundId: string;
  amount: Decimal;
  date: Date;
}

interface WithdrawalRecord {
  investorId: string;
  fundId: string;
  amount: Decimal;
  date: Date;
}

interface YieldRecord {
  fundId: string;
  grossYield: Decimal;
  date: Date;
  feesPct: Decimal;
  ibPct: Decimal;
}

interface InvestorPosition {
  investorId: string;
  fundId: string;
  deposits: DepositRecord[];
  withdrawals: WithdrawalRecord[];
  yields: Decimal;
  fees: Decimal;
  ibFees: Decimal;
}

interface FundState {
  fundId: string;
  positions: Map<string, InvestorPosition>; // key: investorId
  totalAUM: Decimal;
  yields: YieldRecord[];
}

interface ExpectedPosition {
  currentValue: Decimal;
  costBasis: Decimal;
  totalYields: Decimal;
  totalFees: Decimal;
  totalIBFees: Decimal;
}

interface ConservationResult {
  passed: boolean;
  violations: string[];
}

/**
 * Reference ledger for computing expected balances using Decimal.js
 * Tracks deposits, withdrawals, yields, fees per investor/fund
 */
export class ReferenceModel {
  private funds: Map<string, FundState> = new Map();

  /**
   * Record a deposit transaction
   */
  recordDeposit(investorId: string, fundId: string, amount: number | string, date: Date): void {
    const decimalAmount = new Decimal(amount);

    if (!this.funds.has(fundId)) {
      this.funds.set(fundId, {
        fundId,
        positions: new Map(),
        totalAUM: new Decimal(0),
        yields: [],
      });
    }

    const fund = this.funds.get(fundId)!;

    if (!fund.positions.has(investorId)) {
      fund.positions.set(investorId, {
        investorId,
        fundId,
        deposits: [],
        withdrawals: [],
        yields: new Decimal(0),
        fees: new Decimal(0),
        ibFees: new Decimal(0),
      });
    }

    const position = fund.positions.get(investorId)!;
    position.deposits.push({
      investorId,
      fundId,
      amount: decimalAmount,
      date,
    });

    fund.totalAUM = fund.totalAUM.plus(decimalAmount);
  }

  /**
   * Record a withdrawal transaction
   */
  recordWithdrawal(investorId: string, fundId: string, amount: number | string, date: Date): void {
    const decimalAmount = new Decimal(amount);

    const fund = this.funds.get(fundId);
    if (!fund) {
      throw new Error(`Fund ${fundId} not found in reference model`);
    }

    const position = fund.positions.get(investorId);
    if (!position) {
      throw new Error(`Position for investor ${investorId} in fund ${fundId} not found`);
    }

    position.withdrawals.push({
      investorId,
      fundId,
      amount: decimalAmount,
      date,
    });

    fund.totalAUM = fund.totalAUM.minus(decimalAmount);
  }

  /**
   * Record a yield distribution
   * Allocates yield to investors based on ADB-weighting
   */
  recordYield(
    fundId: string,
    grossYield: number | string,
    date: Date,
    feesPct: number | string,
    ibPct: number | string
  ): void {
    const decimalGrossYield = new Decimal(grossYield);
    const decimalFeesPct = new Decimal(feesPct);
    const decimalIbPct = new Decimal(ibPct);

    const fund = this.funds.get(fundId);
    if (!fund) {
      throw new Error(`Fund ${fundId} not found in reference model`);
    }

    // Record yield for conservation check
    fund.yields.push({
      fundId,
      grossYield: decimalGrossYield,
      date,
      feesPct: decimalFeesPct,
      ibPct: decimalIbPct,
    });

    // Calculate ADB for each investor
    const investorADBs = this.calculateADBs(fundId, date);
    const totalADB = Array.from(investorADBs.values()).reduce(
      (sum, adb) => sum.plus(adb),
      new Decimal(0)
    );

    if (totalADB.isZero()) {
      return; // No positions to allocate to
    }

    // Allocate gross yield proportionally by ADB
    for (const [investorId, adb] of Array.from(investorADBs.entries())) {
      const position = fund.positions.get(investorId)!;
      const proportion = adb.div(totalADB);
      const investorGrossYield = decimalGrossYield.times(proportion);

      // Calculate fees
      const platformFee = investorGrossYield.times(decimalFeesPct).div(100);
      const ibFee = investorGrossYield.times(decimalIbPct).div(100);
      const netYield = investorGrossYield.minus(platformFee).minus(ibFee);

      position.yields = position.yields.plus(netYield);
      position.fees = position.fees.plus(platformFee);
      position.ibFees = position.ibFees.plus(ibFee);

      // Update AUM with net yield
      fund.totalAUM = fund.totalAUM.plus(netYield);
    }
  }

  /**
   * Calculate average daily balance (ADB) for each investor
   * Simplified: uses current position value as proxy
   */
  private calculateADBs(fundId: string, asOfDate: Date): Map<string, Decimal> {
    const fund = this.funds.get(fundId);
    if (!fund) {
      return new Map();
    }

    const adbs = new Map<string, Decimal>();

    for (const [investorId, position] of Array.from(fund.positions.entries())) {
      const currentValue = this.calculateCurrentValue(position, asOfDate);
      if (currentValue.greaterThan(0)) {
        adbs.set(investorId, currentValue);
      }
    }

    return adbs;
  }

  /**
   * Calculate current value for a position
   */
  private calculateCurrentValue(position: InvestorPosition, asOfDate: Date): Decimal {
    const deposits = position.deposits
      .filter((d) => d.date <= asOfDate)
      .reduce((sum, d) => sum.plus(d.amount), new Decimal(0));

    const withdrawals = position.withdrawals
      .filter((w) => w.date <= asOfDate)
      .reduce((sum, w) => sum.plus(w.amount), new Decimal(0));

    return deposits.plus(position.yields).minus(withdrawals);
  }

  /**
   * Get expected position for an investor/fund
   */
  getExpectedPosition(investorId: string, fundId: string): ExpectedPosition | null {
    const fund = this.funds.get(fundId);
    if (!fund) {
      return null;
    }

    const position = fund.positions.get(investorId);
    if (!position) {
      return null;
    }

    const totalDeposits = position.deposits.reduce((sum, d) => sum.plus(d.amount), new Decimal(0));

    const totalWithdrawals = position.withdrawals.reduce(
      (sum, w) => sum.plus(w.amount),
      new Decimal(0)
    );

    const costBasis = totalDeposits.minus(totalWithdrawals);
    const currentValue = costBasis.plus(position.yields);

    return {
      currentValue,
      costBasis,
      totalYields: position.yields,
      totalFees: position.fees,
      totalIBFees: position.ibFees,
    };
  }

  /**
   * Check yield conservation identity:
   * gross_yield = platform_fees + ib_fees + net_yield + dust
   */
  checkConservation(): ConservationResult {
    const violations: string[] = [];

    for (const [fundId, fund] of Array.from(this.funds.entries())) {
      for (const yieldRecord of fund.yields) {
        const grossYield = yieldRecord.grossYield;

        // Sum allocated yields across all investors for this distribution
        let totalPlatformFees = new Decimal(0);
        let totalIBFees = new Decimal(0);
        let totalNetYield = new Decimal(0);

        // Calculate what was allocated (simplified - should track per-distribution)
        const investorADBs = this.calculateADBs(fundId, yieldRecord.date);
        const totalADB = Array.from(investorADBs.values()).reduce(
          (sum, adb) => sum.plus(adb),
          new Decimal(0)
        );

        if (!totalADB.isZero()) {
          for (const [investorId, adb] of Array.from(investorADBs.entries())) {
            const proportion = adb.div(totalADB);
            const investorGrossYield = grossYield.times(proportion);

            const platformFee = investorGrossYield.times(yieldRecord.feesPct).div(100);
            const ibFee = investorGrossYield.times(yieldRecord.ibPct).div(100);
            const netYield = investorGrossYield.minus(platformFee).minus(ibFee);

            totalPlatformFees = totalPlatformFees.plus(platformFee);
            totalIBFees = totalIBFees.plus(ibFee);
            totalNetYield = totalNetYield.plus(netYield);
          }
        }

        const reconstructed = totalPlatformFees.plus(totalIBFees).plus(totalNetYield);
        const dust = grossYield.minus(reconstructed);

        // Allow dust up to 0.00000001 (8 decimal places)
        const maxDust = new Decimal(0.00000001);
        if (dust.abs().greaterThan(maxDust)) {
          violations.push(
            `Fund ${fundId} yield ${yieldRecord.date.toISOString()}: ` +
              `gross=${grossYield.toString()}, ` +
              `fees=${totalPlatformFees.toString()}, ` +
              `ib=${totalIBFees.toString()}, ` +
              `net=${totalNetYield.toString()}, ` +
              `dust=${dust.toString()} (exceeds ${maxDust.toString()})`
          );
        }
      }
    }

    return {
      passed: violations.length === 0,
      violations,
    };
  }

  /**
   * Get total AUM for a fund
   */
  getFundAUM(fundId: string): Decimal | null {
    const fund = this.funds.get(fundId);
    return fund ? fund.totalAUM : null;
  }

  /**
   * Reset the model
   */
  reset(): void {
    this.funds.clear();
  }

  /**
   * Get all positions for debugging
   */
  getAllPositions(): Array<{
    investorId: string;
    fundId: string;
    expected: ExpectedPosition;
  }> {
    const positions: Array<{
      investorId: string;
      fundId: string;
      expected: ExpectedPosition;
    }> = [];

    for (const [fundId, fund] of Array.from(this.funds.entries())) {
      for (const investorId of Array.from(fund.positions.keys())) {
        const expected = this.getExpectedPosition(investorId, fundId);
        if (expected) {
          positions.push({ investorId, fundId, expected });
        }
      }
    }

    return positions;
  }
}
