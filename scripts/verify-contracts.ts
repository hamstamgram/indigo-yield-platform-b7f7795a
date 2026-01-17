#!/usr/bin/env npx ts-node
/**
 * Contract Verification Script
 * ============================
 * Regenerates contracts and fails if there's any drift from committed files.
 *
 * This script:
 * 1. Regenerates contracts from schema truth pack
 * 2. Compares with committed contract files
 * 3. Fails CI if any drift is detected
 *
 * Usage:
 *   npm run contracts:verify
 *   npx ts-node scripts/verify-contracts.ts
 *
 * Exit codes:
 *   0 - Contracts are in sync
 *   1 - Drift detected (contracts need regeneration)
 */

import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =============================================================================
// CONFIGURATION
// =============================================================================

const PROJECT_ROOT = path.resolve(__dirname, "..");
const CONTRACTS_DIR = path.join(PROJECT_ROOT, "src", "contracts");
const TEMP_DIR = path.join(PROJECT_ROOT, ".contract-verify-temp");

const CONTRACT_FILES = ["dbEnums.ts", "dbSchema.ts", "rpcSignatures.ts"];

// Files that affect contract generation
const DEPENDENCY_FILES = ["artifacts/schema-truth-pack.json", "src/integrations/supabase/types.ts"];

// =============================================================================
// UTILITIES
// =============================================================================

function hashFile(filePath: string): string {
  if (!fs.existsSync(filePath)) {
    return "MISSING";
  }
  const content = fs.readFileSync(filePath, "utf-8");
  // Normalize line endings and remove timestamp comments for comparison
  const normalized = content
    .replace(/\r\n/g, "\n")
    .replace(/\/\/ Generated at:.*\n/g, "")
    .replace(/\* Generated:.*\n/g, "")
    .trim();
  return crypto.createHash("sha256").update(normalized).digest("hex").substring(0, 16);
}

function compareFiles(file1: string, file2: string): { same: boolean; diff?: string } {
  if (!fs.existsSync(file1)) {
    return { same: false, diff: `File missing: ${file1}` };
  }
  if (!fs.existsSync(file2)) {
    return { same: false, diff: `File missing: ${file2}` };
  }

  const content1 = fs
    .readFileSync(file1, "utf-8")
    .replace(/\r\n/g, "\n")
    .replace(/\/\/ Generated at:.*\n/g, "")
    .replace(/\* Generated:.*\n/g, "")
    .trim();

  const content2 = fs
    .readFileSync(file2, "utf-8")
    .replace(/\r\n/g, "\n")
    .replace(/\/\/ Generated at:.*\n/g, "")
    .replace(/\* Generated:.*\n/g, "")
    .trim();

  if (content1 === content2) {
    return { same: true };
  }

  // Generate a simple diff summary
  const lines1 = content1.split("\n");
  const lines2 = content2.split("\n");

  const diffLines: string[] = [];
  const maxDiff = 10;
  let diffCount = 0;

  for (let i = 0; i < Math.max(lines1.length, lines2.length); i++) {
    if (lines1[i] !== lines2[i]) {
      diffCount++;
      if (diffLines.length < maxDiff) {
        diffLines.push(`Line ${i + 1}:`);
        if (lines1[i]) diffLines.push(`  - ${lines1[i].substring(0, 80)}`);
        if (lines2[i]) diffLines.push(`  + ${lines2[i].substring(0, 80)}`);
      }
    }
  }

  if (diffCount > maxDiff) {
    diffLines.push(`... and ${diffCount - maxDiff} more differences`);
  }

  return { same: false, diff: diffLines.join("\n") };
}

// =============================================================================
// MAIN VERIFICATION
// =============================================================================

async function main(): Promise<void> {
  console.log("🔍 Contract Verification");
  console.log("========================\n");

  let hasError = false;

  // Step 1: Check if schema truth pack exists
  const truthPackPath = path.join(PROJECT_ROOT, "artifacts", "schema-truth-pack.json");
  if (!fs.existsSync(truthPackPath)) {
    console.log("⚠️  Schema truth pack not found. Running schema extraction...");
    try {
      execSync("bash scripts/schema-truth-pack.sh", {
        cwd: PROJECT_ROOT,
        stdio: "inherit",
      });
    } catch (error) {
      console.error("❌ Failed to generate schema truth pack");
      console.log("   Please ensure DATABASE_URL is set or Supabase is running.");
      process.exit(1);
    }
  }

  // Step 2: Check if contract files exist
  console.log("📋 Checking existing contracts...\n");
  const existingHashes: Record<string, string> = {};

  for (const file of CONTRACT_FILES) {
    const filePath = path.join(CONTRACTS_DIR, file);
    const hash = hashFile(filePath);
    existingHashes[file] = hash;

    const status = fs.existsSync(filePath) ? "✓" : "✗";
    console.log(`   ${status} ${file}: ${hash}`);
  }

  // Step 3: Create temp directory and backup existing contracts
  console.log("\n🔄 Regenerating contracts...\n");

  if (fs.existsSync(TEMP_DIR)) {
    fs.rmSync(TEMP_DIR, { recursive: true });
  }
  fs.mkdirSync(TEMP_DIR, { recursive: true });

  // Copy existing contracts to temp
  for (const file of CONTRACT_FILES) {
    const srcPath = path.join(CONTRACTS_DIR, file);
    const destPath = path.join(TEMP_DIR, file);
    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, destPath);
    }
  }

  // Step 4: Run contract generation
  try {
    execSync("npx ts-node scripts/generate-contracts.ts", {
      cwd: PROJECT_ROOT,
      stdio: "pipe",
    });
    console.log("   ✓ Contracts regenerated\n");
  } catch (error) {
    console.error("❌ Failed to regenerate contracts");
    console.error((error as Error).message);
    process.exit(1);
  }

  // Step 5: Compare regenerated contracts with original
  console.log("🔍 Comparing contracts...\n");

  const results: Array<{ file: string; status: "match" | "drift" | "new"; diff?: string }> = [];

  for (const file of CONTRACT_FILES) {
    const originalPath = path.join(TEMP_DIR, file);
    const newPath = path.join(CONTRACTS_DIR, file);

    if (!fs.existsSync(originalPath)) {
      results.push({ file, status: "new" });
      console.log(`   🆕 ${file}: NEW (not previously committed)`);
    } else {
      const comparison = compareFiles(originalPath, newPath);
      if (comparison.same) {
        results.push({ file, status: "match" });
        console.log(`   ✅ ${file}: MATCH`);
      } else {
        results.push({ file, status: "drift", diff: comparison.diff });
        console.log(`   ❌ ${file}: DRIFT DETECTED`);
        if (comparison.diff) {
          console.log(`\n${comparison.diff}\n`);
        }
        hasError = true;
      }
    }
  }

  // Step 6: Restore original contracts if verification only
  if (process.argv.includes("--check-only")) {
    console.log("\n♻️  Restoring original contracts (check-only mode)...");
    for (const file of CONTRACT_FILES) {
      const backupPath = path.join(TEMP_DIR, file);
      const targetPath = path.join(CONTRACTS_DIR, file);
      if (fs.existsSync(backupPath)) {
        fs.copyFileSync(backupPath, targetPath);
      }
    }
  }

  // Cleanup temp directory
  fs.rmSync(TEMP_DIR, { recursive: true });

  // Step 7: Summary
  console.log("\n" + "=".repeat(60));
  console.log("SUMMARY");
  console.log("=".repeat(60));

  const matches = results.filter((r) => r.status === "match").length;
  const drifts = results.filter((r) => r.status === "drift").length;
  const newFiles = results.filter((r) => r.status === "new").length;

  console.log(`   Matching: ${matches}`);
  console.log(`   Drifted:  ${drifts}`);
  console.log(`   New:      ${newFiles}`);

  if (hasError) {
    console.log("\n❌ CONTRACT DRIFT DETECTED!");
    console.log("\nThe contract files are out of sync with the database schema.");
    console.log("This can happen when:");
    console.log("  1. A migration changed the schema");
    console.log("  2. Supabase types were regenerated");
    console.log("  3. Contracts were manually edited\n");
    console.log("To fix:");
    console.log("  1. Review the differences above");
    console.log("  2. Run: npm run contracts:generate");
    console.log("  3. Commit the updated contracts\n");
    process.exit(1);
  }

  // Step 8: Verify enum contracts match Supabase types
  console.log("\n📋 Verifying enum alignment with Supabase types...");

  try {
    execSync("npx ts-node scripts/verify-enum-contracts.ts", {
      cwd: PROJECT_ROOT,
      stdio: "pipe",
    });
    console.log("   ✅ Enum contracts aligned with Supabase types\n");
  } catch (error) {
    console.error("   ❌ Enum contract verification failed");
    console.error((error as Error).message);
    hasError = true;
  }

  if (hasError) {
    process.exit(1);
  }

  console.log("\n✅ ALL CONTRACTS VERIFIED - NO DRIFT DETECTED\n");
  process.exit(0);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
