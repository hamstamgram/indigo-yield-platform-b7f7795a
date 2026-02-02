/**
 * Phase 4: Reference Model Comparison
 *
 * Compares the reference model (Phase 3) against actual DB state for test investors.
 * Validates that the reference model predictions match reality.
 *
 * Run: npx tsx tests/qa/invariants/reference-comparison.ts
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import Decimal from "decimal.js";

// Supabase client setup
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "";

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error(
    "Missing Supabase credentials. Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
  );
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Tolerance for decimal comparisons
const TOLERANCE = new Decimal("0.00000001");

interface TestWorldState {
  testInvestors: Array<{
    investorId: string;
    name: string;
    email: string;
    positions: Array<{
      fundId: string;
      fundName: string;
      currentValue: string;
      costBasis: string;
      totalYields: string;
    }>;
  }>;
}

interface ComparisonResult {
  investorId: string;
  investorName: string;
  fundId: string;
  field: string;
  expected: string;
  actual: string;
  difference: string;
  withinTolerance: boolean;
}

interface PositionComparison {
  investorId: string;
  investorName: string;
  fundId: string;
  matches: boolean;
  details: {
    currentValue: { expected: string; actual: string; diff: string; match: boolean };
    costBasis: { expected: string; actual: string; diff: string; match: boolean };
    totalYields: { expected: string; actual: string; diff: string; match: boolean };
  };
}

/**
 * Load test world state from Phase 3
 */
function loadTestWorldState(): TestWorldState | null {
  const fixturePath = join(process.cwd(), "tests", "qa", "fixtures", "test-world-state.json");

  if (!existsSync(fixturePath)) {
    console.warn(`Warning: test-world-state.json not found at ${fixturePath}`);
    return null;
  }

  try {
    const content = readFileSync(fixturePath, "utf-8");
    return JSON.parse(content) as TestWorldState;
  } catch (error) {
    console.error(`Error loading test-world-state.json: ${error}`);
    return null;
  }
}

/**
 * Fetch actual positions from database
 */
async function fetchActualPositions(investorIds: string[]) {
  const { data, error } = await supabase
    .from("investor_positions")
    .select("investor_id, fund_id, current_value, cost_basis, total_yield_earned")
    .in("investor_id", investorIds);

  if (error) throw error;

  return data || [];
}

/**
 * Compare expected vs actual position values
 */
function comparePositions(
  expected: TestWorldState["testInvestors"][0]["positions"][0],
  actual: {
    current_value: number;
    cost_basis: number;
    total_yield_earned: number;
  },
  investorId: string,
  investorName: string,
  fundId: string
): PositionComparison {
  const expCurrentValue = new Decimal(expected.currentValue);
  const actCurrentValue = new Decimal(actual.current_value || 0);
  const diffCurrentValue = expCurrentValue.minus(actCurrentValue).abs();
  const matchCurrentValue = diffCurrentValue.lessThanOrEqualTo(TOLERANCE);

  const expCostBasis = new Decimal(expected.costBasis);
  const actCostBasis = new Decimal(actual.cost_basis || 0);
  const diffCostBasis = expCostBasis.minus(actCostBasis).abs();
  const matchCostBasis = diffCostBasis.lessThanOrEqualTo(TOLERANCE);

  const expTotalYields = new Decimal(expected.totalYields);
  const actTotalYields = new Decimal(actual.total_yield_earned || 0);
  const diffTotalYields = expTotalYields.minus(actTotalYields).abs();
  const matchTotalYields = diffTotalYields.lessThanOrEqualTo(TOLERANCE);

  const matches = matchCurrentValue && matchCostBasis && matchTotalYields;

  return {
    investorId,
    investorName,
    fundId,
    matches,
    details: {
      currentValue: {
        expected: expCurrentValue.toFixed(8),
        actual: actCurrentValue.toFixed(8),
        diff: diffCurrentValue.toFixed(8),
        match: matchCurrentValue,
      },
      costBasis: {
        expected: expCostBasis.toFixed(8),
        actual: actCostBasis.toFixed(8),
        diff: diffCostBasis.toFixed(8),
        match: matchCostBasis,
      },
      totalYields: {
        expected: expTotalYields.toFixed(8),
        actual: actTotalYields.toFixed(8),
        diff: diffTotalYields.toFixed(8),
        match: matchTotalYields,
      },
    },
  };
}

/**
 * Main execution
 */
async function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  Phase 4: Reference Model Comparison");
  console.log("═══════════════════════════════════════════════════════════\n");

  // Load test world state
  const testWorldState = loadTestWorldState();

  if (!testWorldState) {
    console.log("No test-world-state.json found. Skipping reference comparison.");
    console.log("Run Phase 3 (build-test-world.ts) first to generate fixtures.\n");

    // Write empty report
    const report = {
      timestamp: new Date().toISOString(),
      phase: "Phase 4: Reference Model Comparison",
      status: "skipped",
      reason: "No test-world-state.json fixture found",
      summary: {
        totalPositions: 0,
        matched: 0,
        mismatched: 0,
      },
      comparisons: [],
    };

    const reportsDir = join(process.cwd(), "tests", "qa", "reports");
    mkdirSync(reportsDir, { recursive: true });
    const reportPath = join(reportsDir, "phase4-reference-comparison.json");
    writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`Empty report written to: ${reportPath}\n`);
    return;
  }

  console.log(
    `Loaded test world state with ${testWorldState.testInvestors.length} test investor(s)\n`
  );

  // Extract all investor IDs
  const investorIds = testWorldState.testInvestors.map((inv) => inv.investorId);

  // Fetch actual positions from DB
  console.log("Fetching actual positions from database...");
  const actualPositions = await fetchActualPositions(investorIds);
  console.log(`Found ${actualPositions.length} actual position(s)\n`);

  // Build map of actual positions
  const actualPositionsMap = new Map<string, (typeof actualPositions)[0]>();
  actualPositions.forEach((pos) => {
    const key = `${pos.investor_id}:${pos.fund_id}`;
    actualPositionsMap.set(key, pos);
  });

  // Compare each expected position with actual
  const comparisons: PositionComparison[] = [];
  const mismatches: ComparisonResult[] = [];

  for (const investor of testWorldState.testInvestors) {
    console.log(`Comparing positions for ${investor.name} (${investor.investorId})...`);

    for (const expectedPos of investor.positions) {
      const key = `${investor.investorId}:${expectedPos.fundId}`;
      const actualPos = actualPositionsMap.get(key);

      if (!actualPos) {
        console.log(`  ✗ ${expectedPos.fundName} - Position not found in DB`);

        comparisons.push({
          investorId: investor.investorId,
          investorName: investor.name,
          fundId: expectedPos.fundId,
          matches: false,
          details: {
            currentValue: {
              expected: expectedPos.currentValue,
              actual: "0",
              diff: expectedPos.currentValue,
              match: false,
            },
            costBasis: {
              expected: expectedPos.costBasis,
              actual: "0",
              diff: expectedPos.costBasis,
              match: false,
            },
            totalYields: {
              expected: expectedPos.totalYields,
              actual: "0",
              diff: expectedPos.totalYields,
              match: false,
            },
          },
        });

        mismatches.push({
          investorId: investor.investorId,
          investorName: investor.name,
          fundId: expectedPos.fundId,
          field: "position_exists",
          expected: "true",
          actual: "false",
          difference: "N/A",
          withinTolerance: false,
        });

        continue;
      }

      const comparison = comparePositions(
        expectedPos,
        actualPos,
        investor.investorId,
        investor.name,
        expectedPos.fundId
      );

      comparisons.push(comparison);

      if (comparison.matches) {
        console.log(`  ✓ ${expectedPos.fundName} - All fields match`);
      } else {
        console.log(`  ✗ ${expectedPos.fundName} - Mismatch detected`);

        if (!comparison.details.currentValue.match) {
          console.log(
            `      current_value: expected ${comparison.details.currentValue.expected}, got ${comparison.details.currentValue.actual}, diff ${comparison.details.currentValue.diff}`
          );

          mismatches.push({
            investorId: investor.investorId,
            investorName: investor.name,
            fundId: expectedPos.fundId,
            field: "current_value",
            expected: comparison.details.currentValue.expected,
            actual: comparison.details.currentValue.actual,
            difference: comparison.details.currentValue.diff,
            withinTolerance: false,
          });
        }

        if (!comparison.details.costBasis.match) {
          console.log(
            `      cost_basis: expected ${comparison.details.costBasis.expected}, got ${comparison.details.costBasis.actual}, diff ${comparison.details.costBasis.diff}`
          );

          mismatches.push({
            investorId: investor.investorId,
            investorName: investor.name,
            fundId: expectedPos.fundId,
            field: "cost_basis",
            expected: comparison.details.costBasis.expected,
            actual: comparison.details.costBasis.actual,
            difference: comparison.details.costBasis.diff,
            withinTolerance: false,
          });
        }

        if (!comparison.details.totalYields.match) {
          console.log(
            `      total_yields: expected ${comparison.details.totalYields.expected}, got ${comparison.details.totalYields.actual}, diff ${comparison.details.totalYields.diff}`
          );

          mismatches.push({
            investorId: investor.investorId,
            investorName: investor.name,
            fundId: expectedPos.fundId,
            field: "total_yield_earned",
            expected: comparison.details.totalYields.expected,
            actual: comparison.details.totalYields.actual,
            difference: comparison.details.totalYields.diff,
            withinTolerance: false,
          });
        }
      }
    }

    console.log("");
  }

  // Summary
  const totalPositions = comparisons.length;
  const matched = comparisons.filter((c) => c.matches).length;
  const mismatched = comparisons.filter((c) => !c.matches).length;

  console.log("═══════════════════════════════════════════════════════════");
  console.log(`  Summary: ${matched}/${totalPositions} positions matched`);
  if (mismatched > 0) {
    console.log(`  Mismatches: ${mismatched} positions`);
    console.log(`  Total field mismatches: ${mismatches.length}`);
  }
  console.log("═══════════════════════════════════════════════════════════\n");

  // Write JSON report
  const report = {
    timestamp: new Date().toISOString(),
    phase: "Phase 4: Reference Model Comparison",
    status: mismatched === 0 ? "pass" : "fail",
    summary: {
      totalPositions,
      matched,
      mismatched,
      tolerance: TOLERANCE.toString(),
    },
    comparisons,
    mismatches,
  };

  const reportsDir = join(process.cwd(), "tests", "qa", "reports");
  mkdirSync(reportsDir, { recursive: true });
  const reportPath = join(reportsDir, "phase4-reference-comparison.json");
  writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log(`Report written to: ${reportPath}\n`);

  // Exit with error code if any mismatches
  if (mismatched > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
