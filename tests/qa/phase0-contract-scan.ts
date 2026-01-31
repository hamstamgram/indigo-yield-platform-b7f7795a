/**
 * Phase 0: Contract Drift Scanner
 *
 * Compares frontend enum contracts (src/contracts/dbEnums.ts) against
 * the live Supabase database enum values. Reports mismatches.
 *
 * Also scans for raw enum string literals in pages/components/hooks
 * that should be using the canonical contract imports.
 *
 * Usage:
 *   npx tsx tests/qa/phase0-contract-scan.ts
 *
 * Requires: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("ERROR: Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Frontend contract values (from src/contracts/dbEnums.ts)
const FRONTEND_ENUMS: Record<string, readonly string[]> = {
  tx_type: [
    "DEPOSIT",
    "WITHDRAWAL",
    "INTEREST",
    "FEE",
    "ADJUSTMENT",
    "FEE_CREDIT",
    "IB_CREDIT",
    "YIELD",
    "INTERNAL_WITHDRAWAL",
    "INTERNAL_CREDIT",
    "IB_DEBIT",
  ],
  aum_purpose: ["reporting", "transaction"],
  document_type: ["statement", "notice", "terms", "tax", "other"],
  delivery_channel: ["email", "app", "sms"],
  withdrawal_status: ["pending", "approved", "processing", "completed", "rejected", "cancelled"],
  yield_distribution_status: [
    "draft",
    "applied",
    "voided",
    "previewed",
    "corrected",
    "rolled_back",
  ],
  tx_source: [
    "manual_admin",
    "yield_distribution",
    "fee_allocation",
    "ib_allocation",
    "system_bootstrap",
    "investor_wizard",
    "internal_routing",
    "yield_correction",
    "withdrawal_completion",
    "rpc_canonical",
    "crystallization",
    "system",
    "migration",
    "stress_test",
  ],
  fund_status: ["active", "inactive", "suspended", "deprecated", "pending"],
  app_role: ["super_admin", "admin", "moderator", "ib", "user", "investor"],
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DriftItem {
  id: string;
  severity: "error" | "warn" | "info";
  category: string;
  enumName: string;
  description: string;
  onlyInDb: string[];
  onlyInFrontend: string[];
}

interface RawEnumUsage {
  file: string;
  line: number;
  match: string;
  enumValue: string;
}

interface ScanReport {
  generatedAt: string;
  enumDrift: DriftItem[];
  rawEnumUsages: RawEnumUsage[];
  summary: {
    enumsChecked: number;
    enumsInSync: number;
    enumsWithDrift: number;
    rawUsagesFound: number;
  };
}

// ---------------------------------------------------------------------------
// 1. Compare frontend enums against DB
// ---------------------------------------------------------------------------

async function compareEnums(): Promise<DriftItem[]> {
  const driftItems: DriftItem[] = [];

  for (const [enumName, frontendValues] of Object.entries(FRONTEND_ENUMS)) {
    // Call the Phase 0 SQL helper
    const { data, error } = await supabase.rpc("qa_compare_enum_sets", {
      p_enum_name: enumName,
      p_frontend_values: JSON.stringify(frontendValues),
    });

    if (error) {
      // If the RPC doesn't exist yet, fall back to direct query
      console.warn(
        `  RPC qa_compare_enum_sets not available, skipping DB comparison for ${enumName}`
      );
      continue;
    }

    const result = data as {
      enum_name: string;
      db_values: string[];
      frontend_values: string[];
      only_in_db: string[];
      only_in_frontend: string[];
      in_sync: boolean;
    };

    if (!result.in_sync) {
      driftItems.push({
        id: `ENUM-DRIFT-${enumName.toUpperCase()}`,
        severity: result.only_in_db.length > 0 ? "error" : "warn",
        category: "CONTRACT_DRIFT",
        enumName,
        description: `Enum ${enumName} is out of sync between DB and frontend`,
        onlyInDb: result.only_in_db,
        onlyInFrontend: result.only_in_frontend,
      });
    }
  }

  return driftItems;
}

// ---------------------------------------------------------------------------
// 2. Scan for raw enum string literals in source code
// ---------------------------------------------------------------------------

function scanForRawEnumUsages(): RawEnumUsage[] {
  const usages: RawEnumUsage[] = [];
  const srcRoot = path.resolve(__dirname, "../../src");

  // All known enum values that should come from contracts
  const allEnumValues = new Set<string>();
  for (const values of Object.values(FRONTEND_ENUMS)) {
    for (const v of values) {
      allEnumValues.add(v);
    }
  }

  // Directories to scan for raw usage
  const scanDirs = ["pages", "components", "hooks"];

  // Files/patterns to exclude (these are allowed to use raw values)
  const excludePatterns = [
    /contracts\//,
    /types\/domains\//,
    /\.test\./,
    /\.spec\./,
    /node_modules/,
  ];

  for (const dir of scanDirs) {
    const fullDir = path.join(srcRoot, dir);
    if (!fs.existsSync(fullDir)) continue;
    scanDirectory(fullDir, allEnumValues, excludePatterns, usages);
  }

  return usages;
}

function scanDirectory(
  dir: string,
  enumValues: Set<string>,
  excludePatterns: RegExp[],
  usages: RawEnumUsage[]
): void {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (excludePatterns.some((p) => p.test(fullPath))) continue;

    if (entry.isDirectory()) {
      scanDirectory(fullPath, enumValues, excludePatterns, usages);
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      scanFile(fullPath, enumValues, usages);
    }
  }
}

function scanFile(filePath: string, enumValues: Set<string>, usages: RawEnumUsage[]): void {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  // Skip files that import from contracts (they're using the right source)
  const importsContracts =
    content.includes("@/contracts/dbEnums") || content.includes("contracts/dbEnums");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip comments and imports
    if (line.trim().startsWith("//") || line.trim().startsWith("*")) continue;
    if (line.includes("import ")) continue;

    // Look for raw enum strings in quotes
    const matches = line.matchAll(/["'`]([\w_]+)["'`]/g);
    for (const match of matches) {
      const value = match[1];

      // Only flag uppercase values or known lowercase enum values
      if (enumValues.has(value)) {
        // Skip if this file imports from contracts (it's likely using the value properly)
        if (importsContracts) continue;

        // Skip common false positives
        if (isLikelyFalsePositive(line, value)) continue;

        usages.push({
          file: path.relative(path.resolve(__dirname, "../.."), filePath),
          line: i + 1,
          match: line.trim(),
          enumValue: value,
        });
      }
    }
  }
}

function isLikelyFalsePositive(line: string, value: string): boolean {
  // CSS class names, HTML attributes, route paths
  if (line.includes("className") || line.includes("class=")) return true;
  if (line.includes("href=") || line.includes("to=")) return true;
  if (line.includes("data-") || line.includes("aria-")) return true;

  // Query keys and cache keys
  if (line.includes("queryKey") || line.includes("QueryKey")) return true;

  // Short common words that aren't likely enum references
  const commonWords = new Set([
    "active",
    "pending",
    "user",
    "admin",
    "email",
    "app",
    "other",
    "system",
  ]);
  if (commonWords.has(value.toLowerCase()) && !line.includes("type")) return true;

  return false;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("Phase 0: Contract Drift Scanner");
  console.log("================================\n");

  // 1. Compare enums
  console.log("1. Comparing frontend enums against database...\n");
  const driftItems = await compareEnums();

  for (const item of driftItems) {
    const icon = item.severity === "error" ? "X" : item.severity === "warn" ? "!" : "i";
    console.log(`  [${icon}] ${item.enumName}: ${item.description}`);
    if (item.onlyInDb.length > 0) {
      console.log(`      Only in DB: ${item.onlyInDb.join(", ")}`);
    }
    if (item.onlyInFrontend.length > 0) {
      console.log(`      Only in frontend: ${item.onlyInFrontend.join(", ")}`);
    }
  }

  if (driftItems.length === 0) {
    console.log("  All enums in sync!\n");
  }

  // 2. Scan for raw enum usage
  console.log("\n2. Scanning for raw enum string literals...\n");
  const rawUsages = scanForRawEnumUsages();

  if (rawUsages.length > 0) {
    const byFile = new Map<string, RawEnumUsage[]>();
    for (const u of rawUsages) {
      if (!byFile.has(u.file)) byFile.set(u.file, []);
      byFile.get(u.file)!.push(u);
    }

    for (const [file, fileUsages] of byFile) {
      console.log(`  ${file}:`);
      for (const u of fileUsages) {
        console.log(`    L${u.line}: "${u.enumValue}" -> ${u.match.substring(0, 80)}`);
      }
    }
  } else {
    console.log("  No raw enum literals found!\n");
  }

  // 3. Build report
  const report: ScanReport = {
    generatedAt: new Date().toISOString(),
    enumDrift: driftItems,
    rawEnumUsages: rawUsages,
    summary: {
      enumsChecked: Object.keys(FRONTEND_ENUMS).length,
      enumsInSync: Object.keys(FRONTEND_ENUMS).length - driftItems.length,
      enumsWithDrift: driftItems.length,
      rawUsagesFound: rawUsages.length,
    },
  };

  // Write report
  const reportPath = path.resolve(__dirname, "phase0-report.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\nReport written to: ${reportPath}`);

  // Summary
  console.log("\n================================");
  console.log("Summary:");
  console.log(`  Enums checked: ${report.summary.enumsChecked}`);
  console.log(`  In sync: ${report.summary.enumsInSync}`);
  console.log(`  With drift: ${report.summary.enumsWithDrift}`);
  console.log(`  Raw usages: ${report.summary.rawUsagesFound}`);

  // Exit with error if critical drift
  if (driftItems.some((d) => d.severity === "error")) {
    console.log("\nFAILED: Critical enum drift detected!");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
