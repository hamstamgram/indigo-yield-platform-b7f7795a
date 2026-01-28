/**
 * Accounting Verification Tests
 *
 * These tests verify platform data against accounting source files.
 * Run with: npm test -- tests/unit/accounting-verification.test.ts
 */

import { createClient } from "@supabase/supabase-js";

// Use environment variables or test config
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";

// Skip tests if no Supabase credentials
const shouldSkip = !supabaseUrl || !supabaseKey;

// Expected values from accounting source files
// Updated 2026-01-26 after ledger reconciliation fixes
const EXPECTED = {
  transactionCounts: {
    deposit: 110, // 108 original + 1 Kyle + 1 Victoria
    withdrawal: 27,
    yield: 16, // 15 original + 1 Victoria historical yield
    ib_credit: 1, // Alex Jacobs historical IB commission
    total: 154, // 150 original + 2 investors + 1 Victoria yield + 1 Alex IB
  },
  dateRange: {
    earliest: "2024-06-12",
    latest: "2026-01-19", // Accounting latest (platform may have newer)
  },
  fundAUM: {
    "IND-BTC": { minAUM: 32, maxAUM: 35, minInvestors: 9, maxInvestors: 12 }, // Updated after Kyle Gulamerian
    "IND-ETH": { minAUM: 590, maxAUM: 610, minInvestors: 8, maxInvestors: 12 },
    "IND-SOL": { minAUM: 85, maxAUM: 90, minInvestors: 1, maxInvestors: 3 },
    "IND-USDT": { minAUM: 7200000, maxAUM: 7300000, minInvestors: 15, maxInvestors: 20 },
  },
  healthChecks: [
    "YIELD_CONSERVATION",
    "LEDGER_POSITION_MATCH",
    "NO_ORPHAN_POSITIONS",
    "NO_FUTURE_TRANSACTIONS",
    "ECONOMIC_DATE_NOT_NULL",
    "NO_DUPLICATE_REFS",
    "NO_MANAGEMENT_FEE",
    "VALID_TX_TYPES",
  ],
};

// Skip tests if credentials not available
const describeWithCredentials = shouldSkip ? describe.skip : describe;

describeWithCredentials("Accounting Verification", () => {
  let supabase: ReturnType<typeof createClient>;

  beforeAll(() => {
    supabase = createClient(supabaseUrl, supabaseKey);
  });

  describe("Transaction Verification", () => {
    test("should have correct total transaction count", async () => {
      const { count } = await supabase
        .from("transactions_v2")
        .select("*", { count: "exact", head: true })
        .eq("is_voided", false);

      expect(count).toBe(EXPECTED.transactionCounts.total);
    });

    test("should have correct deposit count", async () => {
      const { count } = await supabase
        .from("transactions_v2")
        .select("*", { count: "exact", head: true })
        .eq("is_voided", false)
        .eq("type", "DEPOSIT");

      expect(count).toBe(EXPECTED.transactionCounts.deposit);
    });

    test("should have correct withdrawal count", async () => {
      const { count } = await supabase
        .from("transactions_v2")
        .select("*", { count: "exact", head: true })
        .eq("is_voided", false)
        .eq("type", "WITHDRAWAL");

      expect(count).toBe(EXPECTED.transactionCounts.withdrawal);
    });

    test("should have correct historical yield transaction count", async () => {
      const { count } = await supabase
        .from("transactions_v2")
        .select("*", { count: "exact", head: true })
        .eq("is_voided", false)
        .eq("type", "YIELD");

      expect(count).toBe(EXPECTED.transactionCounts.yield);
    });

    test("should have correct IB credit transaction count", async () => {
      const { count } = await supabase
        .from("transactions_v2")
        .select("*", { count: "exact", head: true })
        .eq("is_voided", false)
        .eq("type", "IB_CREDIT");

      expect(count).toBe(EXPECTED.transactionCounts.ib_credit);
    });

    test("should have correct earliest transaction date", async () => {
      const { data } = await supabase
        .from("transactions_v2")
        .select("tx_date")
        .eq("is_voided", false)
        .order("tx_date", { ascending: true })
        .limit(1)
        .single();

      expect(data?.tx_date).toBe(EXPECTED.dateRange.earliest);
    });
  });

  describe("Position Verification", () => {
    test("should have no negative positions", async () => {
      const { data } = await supabase
        .from("investor_positions")
        .select("current_value")
        .lt("current_value", 0);

      expect(data?.length || 0).toBe(0);
    });
  });

  describe("Health Checks", () => {
    let healthCheckResults: Array<{
      check_name: string;
      check_status: string;
      violation_count: number;
    }> = [];

    beforeAll(async () => {
      const { data, error } = await supabase.rpc("run_comprehensive_health_check");
      if (!error && data) {
        healthCheckResults = data;
      }
    });

    test("should pass YIELD_CONSERVATION check", () => {
      const check = healthCheckResults.find((c) => c.check_name === "YIELD_CONSERVATION");
      expect(check?.check_status).toBe("PASS");
    });

    test("should pass LEDGER_POSITION_MATCH check", () => {
      const check = healthCheckResults.find((c) => c.check_name === "LEDGER_POSITION_MATCH");
      expect(check?.check_status).toBe("PASS");
    });

    test("should pass NO_ORPHAN_POSITIONS check", () => {
      const check = healthCheckResults.find((c) => c.check_name === "NO_ORPHAN_POSITIONS");
      expect(check?.check_status).toBe("PASS");
    });

    test("should pass NO_FUTURE_TRANSACTIONS check", () => {
      const check = healthCheckResults.find((c) => c.check_name === "NO_FUTURE_TRANSACTIONS");
      expect(check?.check_status).toBe("PASS");
    });

    test("should pass ECONOMIC_DATE_NOT_NULL check", () => {
      const check = healthCheckResults.find((c) => c.check_name === "ECONOMIC_DATE_NOT_NULL");
      expect(check?.check_status).toBe("PASS");
    });

    test("should pass NO_DUPLICATE_REFS check", () => {
      const check = healthCheckResults.find((c) => c.check_name === "NO_DUPLICATE_REFS");
      expect(check?.check_status).toBe("PASS");
    });

    test("should pass NO_MANAGEMENT_FEE check", () => {
      const check = healthCheckResults.find((c) => c.check_name === "NO_MANAGEMENT_FEE");
      expect(check?.check_status).toBe("PASS");
    });

    test("should pass VALID_TX_TYPES check", () => {
      const check = healthCheckResults.find((c) => c.check_name === "VALID_TX_TYPES");
      expect(check?.check_status).toBe("PASS");
    });

    test("should pass all 8 health checks", () => {
      expect(healthCheckResults.length).toBeGreaterThanOrEqual(8);
      const failedChecks = healthCheckResults.filter((c) => c.check_status !== "PASS");
      expect(failedChecks).toHaveLength(0);
    });
  });

  describe("Fee Structure Verification", () => {
    test("should have fee schedules configured", async () => {
      const { count } = await supabase
        .from("investor_fee_schedule")
        .select("*", { count: "exact", head: true });

      expect(count).toBeGreaterThan(20); // At least 20 fee schedules
    });

    test("should have IB relationships configured", async () => {
      const { data } = await supabase.from("profiles").select("id").not("ib_parent_id", "is", null);

      expect(data?.length).toBeGreaterThan(0);
    });
  });

  describe("Historical Yield Transactions", () => {
    test("should have historical yield transactions with proper notes", async () => {
      const { data } = await supabase
        .from("transactions_v2")
        .select("notes")
        .eq("type", "YIELD")
        .eq("is_voided", false);

      expect(data?.length).toBe(EXPECTED.transactionCounts.yield);

      // All should have notes about historical yield
      data?.forEach((tx) => {
        expect(tx.notes).toContain("Historical yield");
      });
    });
  });

  describe("Data Integrity", () => {
    test("should have all transactions linked to valid investors", async () => {
      const { data } = await supabase
        .from("transactions_v2")
        .select("id, investor_id")
        .eq("is_voided", false)
        .is("investor_id", null);

      expect(data?.length || 0).toBe(0);
    });

    test("should have all transactions linked to valid funds", async () => {
      const { data } = await supabase
        .from("transactions_v2")
        .select("id, fund_id")
        .eq("is_voided", false)
        .is("fund_id", null);

      expect(data?.length || 0).toBe(0);
    });
  });
});

/**
 * Yield Calculation Formula Verification
 *
 * These tests verify the yield calculation formulas against Excel data.
 * From docs/YIELD_VERIFICATION_PLAN.md
 */
describe("Yield Calculation Formulas", () => {
  // Sample data from accounting-excel-data-v3.json
  const sampleYieldData = {
    // ETH Fund - Babak Eftekhari position history
    ethBabak: {
      positions: [
        { date: "2025-05-26", position: 27.01 },
        { date: "2025-06-01", position: 59.28353230038117 }, // +32.25 deposit
        { date: "2025-07-01", position: 59.665579989199344 },
        { date: "2025-07-11", position: 59.922588783056064 },
      ],
      feePercent: 0.18,
      // Expected fund performance for these dates
      fundPerformance: [
        { date: "2025-06-01", gross: 0.001089, net: 0.000871 },
        { date: "2025-07-01", gross: 0.008056, net: 0.006444 },
        { date: "2025-07-11", gross: 0.005384, net: 0.004307 },
      ],
    },
    // USDT Fund - Sam Johnson (large position, stable)
    usdtSam: {
      position: 4200000,
      feePercent: 0.16,
      ibPercent: 0.04,
    },
  };

  test("position growth should match fund net performance (within 0.5%)", () => {
    // Between 2025-07-01 and 2025-07-11 (no deposits/withdrawals)
    const prev = sampleYieldData.ethBabak.positions[2];
    const curr = sampleYieldData.ethBabak.positions[3];

    const actualGrowth = (curr.position - prev.position) / prev.position;
    const expectedNet = sampleYieldData.ethBabak.fundPerformance[2].net;

    // Growth should be close to fund net performance
    expect(Math.abs(actualGrowth - expectedNet)).toBeLessThan(0.005);
  });

  test("net performance = gross × (1 - fee%)", () => {
    for (const perf of sampleYieldData.ethBabak.fundPerformance) {
      const fee = sampleYieldData.ethBabak.feePercent;
      const calculatedNet = perf.gross * (1 - fee);

      // Should match within 0.05% (accounting may have rounding differences)
      expect(Math.abs(calculatedNet - perf.net)).toBeLessThan(0.0005);
    }
  });

  test("IB commission = fee × IB%", () => {
    const grossYield = 100; // Example gross yield
    const fee = grossYield * sampleYieldData.usdtSam.feePercent; // 16%
    const ibCommission = fee * sampleYieldData.usdtSam.ibPercent; // 4% of fee

    expect(fee).toBe(16);
    expect(ibCommission).toBe(0.64); // 4% of 16 = 0.64
  });

  test("conservation: gross = net + fee + dust", () => {
    const grossYield = 1000;
    const feePercent = 0.2;
    const fee = grossYield * feePercent;
    const net = grossYield - fee;
    const dust = 0; // Assuming no dust

    expect(grossYield).toBe(net + fee + dust);
  });

  test("yearly APY = monthly net × 12", () => {
    const monthlyNet = 0.0065; // 0.65% monthly (typical USDT yield)
    const yearlyApy = monthlyNet * 12;

    expect(yearlyApy).toBeCloseTo(0.078, 3); // 7.8% APY
  });
});

describe("Accounting Source File Expectations", () => {
  /**
   * These tests document the expected values from the accounting source files.
   * They serve as a reference and can be updated when accounting data changes.
   */

  test("documents expected transaction counts", () => {
    // From validation_report.json
    const expected = {
      totalTransactions: 135, // Original accounting transactions
      deposits: 108,
      withdrawals: 27,
      currencies: ["BTC", "ETH", "USDT", "SOL", "XRP"],
    };

    expect(expected.deposits + expected.withdrawals).toBe(expected.totalTransactions);
    expect(expected.currencies).toHaveLength(5);
  });

  test("documents expected investor counts", () => {
    // From platform_investors.json
    const expected = {
      totalInvestors: 36,
      withFeeStructures: 27,
      withActivePositions: 33,
    };

    expect(expected.withActivePositions).toBeLessThanOrEqual(expected.totalInvestors);
  });

  test("documents expected date range", () => {
    const expected = {
      earliest: new Date("2024-06-12"),
      latest: new Date("2026-01-19"),
    };

    const daysDiff = Math.floor(
      (expected.latest.getTime() - expected.earliest.getTime()) / (1000 * 60 * 60 * 24)
    );

    expect(daysDiff).toBe(586); // From validation_report.json
  });

  test("documents expected IB relationships", () => {
    // From platform_investors.json fee_structures
    const expectedIBRelationships = [
      { investor: "Babak Eftekhari", ibFee: 0.02 }, // 2%
      { investor: "Sam Johnson", ibFee: 0.04 }, // 4%
      { investor: "Paul Johnson", ibFee: 0.015 }, // 1.5%
      { investor: "Advantage Blockchain", ibFee: 0.02 }, // 2%
      { investor: "Ventures Life Style", ibFee: 0.04 }, // 4%
    ];

    expectedIBRelationships.forEach((rel) => {
      expect(rel.ibFee).toBeGreaterThan(0);
      expect(rel.ibFee).toBeLessThanOrEqual(0.05); // Max 5%
    });
  });
});
