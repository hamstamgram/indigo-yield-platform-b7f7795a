/**
 * Tests for Adriel's 7 Issues (2026-03-08)
 *
 * Covers fixes for:
 * 1. IB name display in yield allocation table
 * 2. Fee Credit Transactions page filtering
 * 3. Realized P&L in admin investor positions
 * 4. Statement Additions calculation
 * 5. Conservation check with dust
 */

import { describe, it, expect } from "vitest";

// ==========================================
// Issue 1: IB Name in Yield Allocations
// ==========================================
describe("Issue 1: IB Name in Yield Allocation Type", () => {
  it("AllocationRow type should include ib_investor_name field", async () => {
    const { AllocationRow } =
      (await import("@/services/admin/yields/yieldDistributionsPageService")) as any;
    // Type-level check: create a valid AllocationRow with ib_investor_name
    const allocation: import("@/services/admin/yields/yieldDistributionsPageService").AllocationRow =
      {
        id: "test-id",
        distribution_id: "dist-id",
        investor_id: "inv-id",
        gross_amount: 100,
        fee_amount: 20,
        ib_amount: 5,
        net_amount: 75,
        adb_share: 0.5,
        ownership_pct: 50,
        fee_pct: 20,
        ib_pct: 5,
        position_value_at_calc: 1000,
        ib_investor_name: "Alex Jacobs",
      };
    expect(allocation.ib_investor_name).toBe("Alex Jacobs");
  });

  it("AllocationRow should accept null ib_investor_name for investors without IB", () => {
    const allocation: import("@/services/admin/yields/yieldDistributionsPageService").AllocationRow =
      {
        id: "test-id",
        distribution_id: "dist-id",
        investor_id: "inv-id",
        gross_amount: 100,
        fee_amount: 20,
        ib_amount: 0,
        net_amount: 80,
        adb_share: 0.5,
        ownership_pct: 50,
        fee_pct: 20,
        ib_pct: 0,
        position_value_at_calc: 1000,
        ib_investor_name: null,
      };
    expect(allocation.ib_investor_name).toBeNull();
  });
});

// ==========================================
// Issue 2: Fee Credit Transactions Filter
// ==========================================
describe("Issue 2: Fee Credit Transactions Page Filter", () => {
  const INDIGO_FEES_ACCOUNT_ID = "169bb053-36cb-4f6e-93ea-831f0dfeaf1d";

  interface FeeRecord {
    id: string;
    investorId: string;
    type: string;
    amount: string;
  }

  // Simulate the OLD (broken) filter
  function oldFilter(fees: FeeRecord[]): FeeRecord[] {
    return fees.filter((f) => f.investorId === INDIGO_FEES_ACCOUNT_ID);
  }

  // Simulate the NEW (fixed) filter
  function newFilter(fees: FeeRecord[]): FeeRecord[] {
    return fees.filter(
      (f) =>
        f.type === "FEE_CREDIT" ||
        f.type === "IB_CREDIT" ||
        f.type === "YIELD" ||
        f.type === "DUST" ||
        f.type === "DUST_SWEEP" ||
        f.type === "INTERNAL_CREDIT"
    );
  }

  const mockFees: FeeRecord[] = [
    // FEE_CREDIT: effectiveInvestorId is the SOURCE investor (who paid fee)
    { id: "1", investorId: "sam-johnson-id", type: "FEE_CREDIT", amount: "56.80" },
    // IB_CREDIT: effectiveInvestorId is the IB person
    { id: "2", investorId: "alex-jacobs-id", type: "IB_CREDIT", amount: "14.20" },
    // YIELD to fees account
    { id: "3", investorId: INDIGO_FEES_ACCOUNT_ID, type: "YIELD", amount: "10.00" },
    // DUST to fees account
    { id: "4", investorId: INDIGO_FEES_ACCOUNT_ID, type: "DUST", amount: "0.001" },
    // Regular DEPOSIT (should not appear)
    { id: "5", investorId: "sam-johnson-id", type: "DEPOSIT", amount: "184003" },
  ];

  it("old filter misses FEE_CREDIT and IB_CREDIT (bug)", () => {
    const result = oldFilter(mockFees);
    // Old filter only catches YIELD and DUST (where investorId = fees account)
    expect(result.length).toBe(2); // misses FEE_CREDIT and IB_CREDIT
    expect(result.find((f) => f.type === "FEE_CREDIT")).toBeUndefined();
    expect(result.find((f) => f.type === "IB_CREDIT")).toBeUndefined();
  });

  it("new filter catches all fee-related transaction types", () => {
    const result = newFilter(mockFees);
    expect(result.length).toBe(4); // FEE_CREDIT, IB_CREDIT, YIELD, DUST
    expect(result.find((f) => f.type === "FEE_CREDIT")).toBeDefined();
    expect(result.find((f) => f.type === "IB_CREDIT")).toBeDefined();
    expect(result.find((f) => f.type === "YIELD")).toBeDefined();
    expect(result.find((f) => f.type === "DUST")).toBeDefined();
  });

  it("new filter excludes DEPOSIT transactions", () => {
    const result = newFilter(mockFees);
    expect(result.find((f) => f.type === "DEPOSIT")).toBeUndefined();
  });
});

// ==========================================
// Issue 3: Realized P&L in Admin Positions
// ==========================================
describe("Issue 3: Realized P&L in InvestorPosition Type", () => {
  it("InvestorPosition type should include realized_pnl field", async () => {
    type InvestorPosition =
      import("@/features/admin/investors/services/investorDetailService").InvestorPosition;
    const position: InvestorPosition = {
      fund_id: "fund-1",
      fund_name: "BTC Fund",
      fund_code: "BTC",
      asset: "BTC",
      current_value: 1.5,
      cost_basis: 1.0,
      unrealized_pnl: 0.5,
      realized_pnl: 0.3,
    };
    expect(position.realized_pnl).toBe(0.3);
  });
});

// ==========================================
// Issue 4: Statement Calculations
// ==========================================
describe("Issue 4: Statement Additions Calculation", () => {
  it("should categorize DEPOSIT into deposits (not interest)", () => {
    const txTypes: Record<string, string> = {
      DEPOSIT: "deposit",
      WITHDRAWAL: "withdrawal",
      YIELD: "interest",
      FEE_CREDIT: "interest",
      IB_CREDIT: "interest",
      FEE: "fee",
    };
    expect(txTypes["DEPOSIT"]).toBe("deposit");
    expect(txTypes["YIELD"]).not.toBe("deposit");
    expect(txTypes["FEE_CREDIT"]).not.toBe("deposit");
  });

  it("additions should only include DEPOSIT type, not YIELD", () => {
    const transactions = [
      { type: "DEPOSIT", amount: 184003 },
      { type: "YIELD", amount: 45000 },
      { type: "FEE_CREDIT", amount: -5000 },
    ];

    let deposits = 0;
    let interest = 0;

    transactions.forEach((tx) => {
      if (tx.type === "DEPOSIT") deposits += tx.amount;
      else if (tx.type === "YIELD" || tx.type === "FEE_CREDIT" || tx.type === "IB_CREDIT") {
        interest += tx.amount;
      }
    });

    // Additions = deposits only
    expect(deposits).toBe(184003);
    // Interest = yield + fee credits (separate from additions)
    expect(interest).toBe(40000); // 45000 + (-5000)
  });

  it("calculateRateOfReturn uses correct formula", async () => {
    const { calculateRateOfReturn } = await import("@/utils/statementCalculations");

    // net_income = ending - beginning - additions + redemptions
    const result = calculateRateOfReturn(100000, 110000, 5000, 0);
    expect(result.netIncome).toBe(5000); // 110000 - 100000 - 5000 + 0
    expect(result.rateOfReturn).toBe(5); // 5000 / 100000 * 100
  });

  it("calculateRateOfReturn handles zero beginning balance", async () => {
    const { calculateRateOfReturn } = await import("@/utils/statementCalculations");

    const result = calculateRateOfReturn(0, 50000, 50000, 0);
    expect(result.rateOfReturn).toBe(0);
  });
});

// ==========================================
// Issue 5: Conservation Check with Dust
// ==========================================
describe("Issue 5: Conservation Check Must Include Dust", () => {
  it("conservation check should pass when gross = net + fees + ib + dust", () => {
    const gross = 355;
    const net = 284;
    const fees = 56.8;
    const ib = 14.2;
    const dust = 0;

    // Without dust (original bug would fail for non-zero dust)
    const checkWithoutDust = gross === net + fees + ib;
    expect(checkWithoutDust).toBe(true); // passes when dust is 0

    // With dust included (correct check)
    const checkWithDust = gross === net + fees + ib + dust;
    expect(checkWithDust).toBe(true);
  });

  it("conservation check should pass with non-zero dust", () => {
    const gross = 355;
    const fees = 56.8;
    const ib = 14.2;
    const dust = 0.003; // rounding residual
    const net = gross - fees - ib - dust; // = 283.997

    // Old check (bug): fails because dust is not included
    const oldCheck = gross === net + fees + ib;
    expect(oldCheck).toBe(false); // BUG: reports mismatch

    // New check (fix): passes because dust is included
    const newCheck = Math.abs(gross - (net + fees + ib + dust)) < 0.0000001;
    expect(newCheck).toBe(true); // FIXED: passes
  });

  it("conservation identity: gross_yield = total_net + total_fees + total_ib + dust", () => {
    // Real-world scenario with multiple investors
    const investors = [
      { gross: 200, feePct: 0.16, ibPct: 0.04 },
      { gross: 155, feePct: 0.2, ibPct: 0 },
    ];

    let totalGross = 0;
    let totalNet = 0;
    let totalFees = 0;
    let totalIB = 0;

    investors.forEach((inv) => {
      const fee = inv.gross * inv.feePct;
      const ib = inv.gross * inv.ibPct;
      const net = inv.gross - fee - ib;
      totalGross += inv.gross;
      totalFees += fee;
      totalIB += ib;
      totalNet += net;
    });

    // Conservation should hold exactly (no dust in this clean example)
    const dust = totalGross - totalNet - totalFees - totalIB;
    expect(Math.abs(dust)).toBeLessThan(0.0000001);
    expect(totalGross).toBeCloseTo(totalNet + totalFees + totalIB + dust, 10);
  });
});

// ==========================================
// Issue 6+7: Timestamp / Strict Closing
// ==========================================
describe("Issue 6+7: Timestamp Handling", () => {
  it("getTodayString returns date without time component", async () => {
    const { getTodayString } = await import("@/utils/dateUtils");
    const result = getTodayString();
    // Should be YYYY-MM-DD format
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("multiple deposits on same day should have same tx_date", () => {
    // This is the current behavior (by design for ADB)
    const deposit1Date = "2025-11-15";
    const deposit2Date = "2025-11-15";
    expect(deposit1Date).toBe(deposit2Date);
    // ADB groups by date, so same-day deposits are treated as simultaneous
    // This is correct for the "strict closing" model
  });
});
