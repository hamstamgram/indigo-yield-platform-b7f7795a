import { createClient, SupabaseClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import { ReferenceModel } from "./reference-model";
import { allScenarioFamilies, ScenarioContext, ScenarioResult } from "./families";

interface TestWorldState {
  adminId: string;
  investorId: string;
  ibUserId: string;
  fundId: string;
  btcFundId: string;
  assetId: string;
}

interface FamilyReport {
  familyName: string;
  totalScenarios: number;
  passedScenarios: number;
  failedScenarios: number;
  scenarios: Array<{
    description: string;
    passed: boolean;
    details?: string;
    rpcCalls?: string[];
  }>;
}

interface Phase3Report {
  timestamp: string;
  totalFamilies: number;
  totalScenarios: number;
  passedScenarios: number;
  failedScenarios: number;
  families: FamilyReport[];
  summary: {
    passRate: string;
    duration: string;
  };
}

/**
 * Phase 3 Scenario Runner
 * Executes all 12 scenario families and generates a comprehensive report
 */
class ScenarioRunner {
  private supabase: SupabaseClient;
  private referenceModel: ReferenceModel;
  private testWorld: TestWorldState;
  private startTime: number = 0;

  constructor(supabaseUrl: string, supabaseKey: string, testWorld: TestWorldState) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.referenceModel = new ReferenceModel();
    this.testWorld = testWorld;
  }

  /**
   * Run all scenario families
   */
  async runAll(): Promise<Phase3Report> {
    console.log("=".repeat(80));
    console.log("Phase 3: Scenario Execution");
    console.log("=".repeat(80));
    console.log("");

    this.startTime = Date.now();

    const familyReports: FamilyReport[] = [];
    let totalScenarios = 0;
    let passedScenarios = 0;
    let failedScenarios = 0;

    for (let i = 0; i < allScenarioFamilies.length; i++) {
      const family = allScenarioFamilies[i];
      console.log(`\n[Family ${i + 1}/${allScenarioFamilies.length}] ${family.name}`);
      console.log("-".repeat(80));

      const familyReport = await this.runFamily(family.name, family.scenarios, i + 1);
      familyReports.push(familyReport);

      totalScenarios += familyReport.totalScenarios;
      passedScenarios += familyReport.passedScenarios;
      failedScenarios += familyReport.failedScenarios;

      // Wait 1 second between families
      if (i < allScenarioFamilies.length - 1) {
        await this.delay(1000);
      }
    }

    const duration = Date.now() - this.startTime;
    const passRate =
      totalScenarios > 0 ? ((passedScenarios / totalScenarios) * 100).toFixed(2) : "0.00";

    const report: Phase3Report = {
      timestamp: new Date().toISOString(),
      totalFamilies: allScenarioFamilies.length,
      totalScenarios,
      passedScenarios,
      failedScenarios,
      families: familyReports,
      summary: {
        passRate: `${passRate}%`,
        duration: this.formatDuration(duration),
      },
    };

    this.printSummary(report);
    this.saveReport(report);

    return report;
  }

  /**
   * Run a single family of scenarios
   */
  private async runFamily(
    familyName: string,
    scenarios: Array<(ctx: ScenarioContext) => Promise<ScenarioResult>>,
    familyNumber: number
  ): Promise<FamilyReport> {
    const scenarioResults: Array<{
      description: string;
      passed: boolean;
      details?: string;
      rpcCalls?: string[];
    }> = [];

    let passed = 0;
    let failed = 0;

    for (let i = 0; i < scenarios.length; i++) {
      const scenario = scenarios[i];

      try {
        const ctx: ScenarioContext = {
          supabase: this.supabase,
          referenceModel: this.referenceModel,
          testWorld: this.testWorld,
        };

        const result = await scenario(ctx);

        if (result.passed) {
          console.log(`  [PASS] Scenario ${i + 1}/${scenarios.length}: ${result.description}`);
          passed++;
        } else {
          console.log(`  [FAIL] Scenario ${i + 1}/${scenarios.length}: ${result.description}`);
          if (result.details) {
            console.log(`         Details: ${result.details}`);
          }
          failed++;
        }

        scenarioResults.push({
          description: result.description,
          passed: result.passed,
          details: result.details,
          rpcCalls: result.rpcCalls,
        });

        // Wait 1 second between mutations
        if (i < scenarios.length - 1) {
          await this.delay(1000);
        }
      } catch (err) {
        console.log(`  [ERROR] Scenario ${i + 1}/${scenarios.length}: Exception thrown`);
        console.log(`          ${err}`);
        failed++;

        scenarioResults.push({
          description: `Scenario ${i + 1}`,
          passed: false,
          details: `Unhandled exception: ${err}`,
        });
      }
    }

    return {
      familyName,
      totalScenarios: scenarios.length,
      passedScenarios: passed,
      failedScenarios: failed,
      scenarios: scenarioResults,
    };
  }

  /**
   * Print summary to console
   */
  private printSummary(report: Phase3Report): void {
    console.log("\n");
    console.log("=".repeat(80));
    console.log("Summary");
    console.log("=".repeat(80));
    console.log(`Total Families:   ${report.totalFamilies}`);
    console.log(`Total Scenarios:  ${report.totalScenarios}`);
    console.log(`Passed:           ${report.passedScenarios} (${report.summary.passRate})`);
    console.log(`Failed:           ${report.failedScenarios}`);
    console.log(`Duration:         ${report.summary.duration}`);
    console.log("=".repeat(80));
    console.log("");

    // Print family-level summary
    console.log("Family-Level Results:");
    console.log("-".repeat(80));
    for (const family of report.families) {
      const passRate =
        family.totalScenarios > 0
          ? ((family.passedScenarios / family.totalScenarios) * 100).toFixed(0)
          : "0";
      console.log(
        `${family.familyName}: ${family.passedScenarios}/${family.totalScenarios} (${passRate}%)`
      );
    }
    console.log("=".repeat(80));
  }

  /**
   * Save report to JSON file
   */
  private saveReport(report: Phase3Report): void {
    const reportsDir = path.join(process.cwd(), "tests", "qa", "reports");

    // Create reports directory if it doesn't exist
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const reportPath = path.join(reportsDir, "phase3-scenarios.json");
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`\nReport saved to: ${reportPath}`);
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Format duration in ms to human-readable string
   */
  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${seconds}s`;
  }
}

/**
 * Main entry point
 */
async function main() {
  // Load test world state
  const testWorldPath = path.join(process.cwd(), "tests", "qa", "test-world-state.json");

  if (!fs.existsSync(testWorldPath)) {
    console.error(`Error: test-world-state.json not found at ${testWorldPath}`);
    console.error("Please run Phase 1 setup first.");
    process.exit(1);
  }

  const testWorld: TestWorldState = JSON.parse(fs.readFileSync(testWorldPath, "utf-8"));

  // Load Supabase credentials from environment
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("Error: VITE_SUPABASE_URL and a Supabase key must be set");
    console.error(
      "Set SUPABASE_SERVICE_ROLE_KEY, VITE_SUPABASE_ANON_KEY, or VITE_SUPABASE_PUBLISHABLE_KEY"
    );
    process.exit(1);
  }

  console.log("Loaded test world:");
  console.log(`  Admin ID:     ${testWorld.adminId}`);
  console.log(`  Investor ID:  ${testWorld.investorId}`);
  console.log(`  IB User ID:   ${testWorld.ibUserId}`);
  console.log(`  Fund ID:      ${testWorld.fundId}`);
  console.log(`  BTC Fund ID:  ${testWorld.btcFundId}`);
  console.log(`  Asset ID:     ${testWorld.assetId}`);
  console.log("");

  // Create runner and execute
  const runner = new ScenarioRunner(supabaseUrl, supabaseKey, testWorld);
  await runner.runAll();

  console.log("\nPhase 3 execution complete.");
}

// Execute if run directly
if (require.main === module) {
  main().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
}

export { ScenarioRunner, Phase3Report };
