/**
 * CI Check: Contract Drift Detection
 *
 * Wraps Phase 0 and Phase 1 scanners to fail CI if:
 * - Enum drift detected between DB and frontend
 * - High-confidence raw enum usages found
 * - RPC signatures missing from frontend contracts
 *
 * Usage:
 *   npx tsx tests/qa/ci/contract-drift-check.ts
 *
 * Exit codes:
 *   0 = clean
 *   1 = drift detected
 */

import * as fs from "fs";
import * as path from "path";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const ENUM_REGISTRY: Record<string, readonly string[]> = {
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

const HIGH_CONFIDENCE_ENUMS = new Set([
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
  "super_admin",
  "draft",
  "applied",
  "voided",
  "previewed",
  "corrected",
  "rolled_back",
]);

const SCAN_DIRS = ["pages", "components", "hooks", "features", "services"];

const EXCLUDE_PATTERNS = [
  /contracts\//,
  /types\/domains\//,
  /\.test\./,
  /\.spec\./,
  /node_modules/,
  /\.d\.ts$/,
];

// ---------------------------------------------------------------------------
// Check 1: Enum values in dbEnums.ts match ENUM_REGISTRY
// ---------------------------------------------------------------------------

function checkEnumFileSync(): { passed: boolean; issues: string[] } {
  const issues: string[] = [];
  const enumFilePath = path.resolve(__dirname, "../../../src/contracts/dbEnums.ts");

  if (!fs.existsSync(enumFilePath)) {
    return { passed: false, issues: ["dbEnums.ts not found"] };
  }

  const content = fs.readFileSync(enumFilePath, "utf-8");

  for (const [enumName, values] of Object.entries(ENUM_REGISTRY)) {
    for (const value of values) {
      if (!content.includes(`"${value}"`)) {
        issues.push(`${enumName}: "${value}" not found in dbEnums.ts`);
      }
    }
  }

  return { passed: issues.length === 0, issues };
}

// ---------------------------------------------------------------------------
// Check 2: No high-confidence raw enum usages
// ---------------------------------------------------------------------------

function checkRawEnumUsages(): { passed: boolean; count: number; files: string[] } {
  const srcRoot = path.resolve(__dirname, "../../../src");
  const allEnumValues = new Set<string>();
  for (const values of Object.values(ENUM_REGISTRY)) {
    for (const v of values) allEnumValues.add(v);
  }

  const violatingFiles: string[] = [];
  let totalCount = 0;

  for (const dir of SCAN_DIRS) {
    const fullDir = path.join(srcRoot, dir);
    if (!fs.existsSync(fullDir)) continue;
    const results = scanDirForRawEnums(fullDir, allEnumValues);
    totalCount += results.count;
    violatingFiles.push(...results.files);
  }

  return {
    passed: totalCount === 0,
    count: totalCount,
    files: [...new Set(violatingFiles)],
  };
}

function scanDirForRawEnums(
  dir: string,
  enumValues: Set<string>
): { count: number; files: string[] } {
  let count = 0;
  const files: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (EXCLUDE_PATTERNS.some((p) => p.test(fullPath))) continue;

    if (entry.isDirectory()) {
      const sub = scanDirForRawEnums(fullPath, enumValues);
      count += sub.count;
      files.push(...sub.files);
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      const result = scanFileForRawEnums(fullPath, enumValues);
      if (result > 0) {
        count += result;
        files.push(path.relative(path.resolve(__dirname, "../../.."), fullPath));
      }
    }
  }

  return { count, files };
}

function scanFileForRawEnums(filePath: string, enumValues: Set<string>): number {
  const content = fs.readFileSync(filePath, "utf-8");

  // Skip files that import from contracts
  if (content.includes("@/contracts/dbEnums") || content.includes("contracts/dbEnums")) {
    return 0;
  }

  const lines = content.split("\n");
  let count = 0;

  for (const line of lines) {
    if (line.trim().startsWith("//") || line.trim().startsWith("*")) continue;
    if (line.includes("import ")) continue;
    if (line.includes("className") || line.includes("queryKey")) continue;

    const matches = line.matchAll(/["'`]([\w_]+)["'`]/g);
    for (const match of matches) {
      if (HIGH_CONFIDENCE_ENUMS.has(match[1])) {
        count++;
      }
    }
  }

  return count;
}

// ---------------------------------------------------------------------------
// Check 3: RPC signatures file exists and has expected count
// ---------------------------------------------------------------------------

function checkRPCSignatures(): { passed: boolean; count: number; issues: string[] } {
  const issues: string[] = [];
  const rpcFilePath = path.resolve(__dirname, "../../../src/contracts/rpcSignatures.ts");

  if (!fs.existsSync(rpcFilePath)) {
    return { passed: false, count: 0, issues: ["rpcSignatures.ts not found"] };
  }

  const content = fs.readFileSync(rpcFilePath, "utf-8");

  // Count RPC function entries
  const rpcMatches = content.match(/RPC_FUNCTIONS\s*=\s*\[([^]*?)\]\s*as\s*const/);
  let count = 0;

  if (rpcMatches) {
    const rpcList = rpcMatches[1];
    count = (rpcList.match(/"/g) || []).length / 2; // Each entry has opening and closing quote
  }

  if (count < 200) {
    issues.push(`RPC count (${count}) seems low — expected 250+`);
  }

  // Check canonical mutation RPCs exist
  const canonicalRPCs = [
    "apply_deposit_with_crystallization",
    "apply_withdrawal_with_crystallization",
    "apply_daily_yield_to_fund_v3",
    "void_transaction",
    "admin_create_transaction",
  ];

  for (const rpc of canonicalRPCs) {
    if (!content.includes(`"${rpc}"`)) {
      issues.push(`Canonical mutation RPC "${rpc}" missing from rpcSignatures.ts`);
    }
  }

  return { passed: issues.length === 0, count, issues };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  console.log("CI: Contract Drift Check");
  console.log("========================\n");

  let hasFailures = false;

  // Check 1: Enum file sync
  console.log("1. Checking enum file consistency...");
  const enumCheck = checkEnumFileSync();
  if (enumCheck.passed) {
    console.log("   [PASS] All enum values present in dbEnums.ts\n");
  } else {
    console.log("   [FAIL] Enum drift detected:");
    for (const issue of enumCheck.issues) {
      console.log(`     - ${issue}`);
    }
    console.log();
    hasFailures = true;
  }

  // Check 2: Raw enum usage
  console.log("2. Checking for raw enum string literals...");
  const rawCheck = checkRawEnumUsages();
  if (rawCheck.passed) {
    console.log("   [PASS] No high-confidence raw enum usages\n");
  } else {
    console.log(`   [FAIL] ${rawCheck.count} raw enum usages in ${rawCheck.files.length} files:`);
    for (const file of rawCheck.files.slice(0, 10)) {
      console.log(`     - ${file}`);
    }
    if (rawCheck.files.length > 10) {
      console.log(`     ... and ${rawCheck.files.length - 10} more`);
    }
    console.log();
    hasFailures = true;
  }

  // Check 3: RPC signatures
  console.log("3. Checking RPC signatures file...");
  const rpcCheck = checkRPCSignatures();
  if (rpcCheck.passed) {
    console.log(`   [PASS] rpcSignatures.ts has ${rpcCheck.count} RPCs\n`);
  } else {
    console.log("   [FAIL] RPC signature issues:");
    for (const issue of rpcCheck.issues) {
      console.log(`     - ${issue}`);
    }
    console.log();
    hasFailures = true;
  }

  // Summary
  console.log("========================");
  console.log(hasFailures ? "FAILED: Contract drift detected" : "PASSED: No contract drift");

  process.exit(hasFailures ? 1 : 0);
}

main();
