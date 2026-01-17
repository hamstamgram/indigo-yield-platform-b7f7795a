#!/usr/bin/env npx ts-node
/**
 * Gateway Usage Enforcement Script
 * =================================
 * Ensures all Supabase calls go through the canonical gateways:
 * - RPC calls: Must go through src/lib/rpc.ts
 * - Database mutations: Must go through src/lib/db.ts
 *
 * This script:
 * 1. Scans all .ts/.tsx files in src/
 * 2. Detects direct supabase.rpc() calls outside lib/rpc.ts
 * 3. Detects direct supabase.from().insert/update/delete/upsert calls outside lib/db.ts
 * 4. Fails CI if violations are found
 *
 * Usage:
 *   npm run gateway:check
 *   npx ts-node scripts/check-gateway-usage.ts
 *
 * Exit codes:
 *   0 - All calls go through gateways
 *   1 - Violations detected
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =============================================================================
// CONFIGURATION
// =============================================================================

const PROJECT_ROOT = path.resolve(__dirname, "..");
const SRC_DIR = path.join(PROJECT_ROOT, "src");

// Files that ARE ALLOWED to use direct Supabase calls
const ALLOWED_RPC_FILES = [
  "src/lib/rpc.ts",
  "src/lib/rpc/index.ts",
  "src/integrations/supabase/client.ts",
];

const ALLOWED_MUTATION_FILES = [
  "src/lib/db.ts",
  "src/lib/db/index.ts",
  "src/integrations/supabase/client.ts",
];

// Files/patterns to completely ignore
const IGNORE_PATTERNS = [
  /\.test\.ts$/,
  /\.spec\.ts$/,
  /\.stories\.tsx?$/,
  /node_modules/,
  /\.d\.ts$/,
  /contracts\//,
];

// =============================================================================
// TYPES
// =============================================================================

interface Violation {
  file: string;
  line: number;
  code: string;
  type: "rpc" | "mutation";
  reason: string;
}

// =============================================================================
// PATTERN DETECTION
// =============================================================================

// Patterns that indicate direct RPC usage
const RPC_PATTERNS = [
  /supabase\s*\.\s*rpc\s*\(/g,
  /\.rpc\s*\(\s*['"`]/g,
  /client\s*\.\s*rpc\s*\(/g,
];

// Patterns that indicate direct database mutations
const MUTATION_PATTERNS = [
  /\.from\s*\(\s*['"`][^'"`]+['"`]\s*\)\s*\.\s*insert\s*\(/g,
  /\.from\s*\(\s*['"`][^'"`]+['"`]\s*\)\s*\.\s*update\s*\(/g,
  /\.from\s*\(\s*['"`][^'"`]+['"`]\s*\)\s*\.\s*delete\s*\(/g,
  /\.from\s*\(\s*['"`][^'"`]+['"`]\s*\)\s*\.\s*upsert\s*\(/g,
];

// =============================================================================
// FILE UTILITIES
// =============================================================================

function getAllTsFiles(dir: string): string[] {
  const files: string[] = [];

  function walk(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        if (entry.name !== "node_modules" && entry.name !== ".git") {
          walk(fullPath);
        }
      } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
        files.push(fullPath);
      }
    }
  }

  walk(dir);
  return files;
}

function shouldIgnoreFile(filePath: string): boolean {
  const relativePath = path.relative(PROJECT_ROOT, filePath);
  return IGNORE_PATTERNS.some((pattern) => pattern.test(relativePath));
}

function isAllowedRpcFile(filePath: string): boolean {
  const relativePath = path.relative(PROJECT_ROOT, filePath).replace(/\\/g, "/");
  return ALLOWED_RPC_FILES.some(
    (allowed) => relativePath === allowed || relativePath.endsWith(allowed)
  );
}

function isAllowedMutationFile(filePath: string): boolean {
  const relativePath = path.relative(PROJECT_ROOT, filePath).replace(/\\/g, "/");
  return ALLOWED_MUTATION_FILES.some(
    (allowed) => relativePath === allowed || relativePath.endsWith(allowed)
  );
}

// =============================================================================
// VIOLATION DETECTION
// =============================================================================

function findViolationsInFile(filePath: string): Violation[] {
  const violations: Violation[] = [];
  const relativePath = path.relative(PROJECT_ROOT, filePath).replace(/\\/g, "/");

  if (shouldIgnoreFile(filePath)) {
    return violations;
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  // Check for RPC violations
  if (!isAllowedRpcFile(filePath)) {
    lines.forEach((line, index) => {
      for (const pattern of RPC_PATTERNS) {
        pattern.lastIndex = 0; // Reset regex state
        if (pattern.test(line)) {
          // Skip if it's a comment
          const trimmed = line.trim();
          if (trimmed.startsWith("//") || trimmed.startsWith("*")) {
            continue;
          }

          violations.push({
            file: relativePath,
            line: index + 1,
            code: line.trim().substring(0, 100),
            type: "rpc",
            reason: "Direct supabase.rpc() call outside lib/rpc.ts gateway",
          });
        }
      }
    });
  }

  // Check for mutation violations
  if (!isAllowedMutationFile(filePath)) {
    lines.forEach((line, index) => {
      for (const pattern of MUTATION_PATTERNS) {
        pattern.lastIndex = 0; // Reset regex state
        if (pattern.test(line)) {
          // Skip if it's a comment
          const trimmed = line.trim();
          if (trimmed.startsWith("//") || trimmed.startsWith("*")) {
            continue;
          }

          violations.push({
            file: relativePath,
            line: index + 1,
            code: line.trim().substring(0, 100),
            type: "mutation",
            reason: "Direct database mutation outside lib/db.ts gateway",
          });
        }
      }
    });
  }

  return violations;
}

// =============================================================================
// MAIN
// =============================================================================

async function main(): Promise<void> {
  console.log("🔍 Gateway Usage Enforcement Check");
  console.log("===================================\n");

  console.log("📋 Allowed RPC gateway files:");
  ALLOWED_RPC_FILES.forEach((f) => console.log(`   ✓ ${f}`));

  console.log("\n📋 Allowed mutation gateway files:");
  ALLOWED_MUTATION_FILES.forEach((f) => console.log(`   ✓ ${f}`));

  console.log("\n🔎 Scanning source files...\n");

  // Get all TypeScript files
  const files = getAllTsFiles(SRC_DIR);
  const allViolations: Violation[] = [];

  for (const file of files) {
    const violations = findViolationsInFile(file);
    allViolations.push(...violations);
  }

  // Report results
  if (allViolations.length === 0) {
    console.log("✅ No gateway violations detected!\n");
    console.log("All Supabase calls properly go through the canonical gateways:");
    console.log("   - RPC calls → src/lib/rpc.ts");
    console.log("   - Database mutations → src/lib/db.ts\n");
    process.exit(0);
  }

  // Group violations by type
  const rpcViolations = allViolations.filter((v) => v.type === "rpc");
  const mutationViolations = allViolations.filter((v) => v.type === "mutation");

  console.log("❌ GATEWAY VIOLATIONS DETECTED!\n");

  if (rpcViolations.length > 0) {
    console.log("═══════════════════════════════════════════════════════════════");
    console.log(`🔴 RPC VIOLATIONS (${rpcViolations.length})`);
    console.log("═══════════════════════════════════════════════════════════════\n");
    console.log("These files use supabase.rpc() directly instead of lib/rpc.ts:\n");

    rpcViolations.forEach((v) => {
      console.log(`   📁 ${v.file}:${v.line}`);
      console.log(`      ${v.code}`);
      console.log("");
    });

    console.log("FIX: Use rpc.<method>() from '@/lib/rpc' instead.");
    console.log(
      "     Example: rpc.deposit({ ... }) instead of supabase.rpc('apply_deposit_with_crystallization', ...)\n"
    );
  }

  if (mutationViolations.length > 0) {
    console.log("═══════════════════════════════════════════════════════════════");
    console.log(`🔴 MUTATION VIOLATIONS (${mutationViolations.length})`);
    console.log("═══════════════════════════════════════════════════════════════\n");
    console.log("These files use direct .insert()/.update()/.delete() instead of lib/db.ts:\n");

    mutationViolations.forEach((v) => {
      console.log(`   📁 ${v.file}:${v.line}`);
      console.log(`      ${v.code}`);
      console.log("");
    });

    console.log("FIX: Use db.insert/update/delete from '@/lib/db' instead.");
    console.log(
      "     Example: db.insert('table_name', data) instead of supabase.from('table_name').insert(data)\n"
    );
  }

  // Summary
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("SUMMARY");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log(`   Total violations: ${allViolations.length}`);
  console.log(`   RPC violations: ${rpcViolations.length}`);
  console.log(`   Mutation violations: ${mutationViolations.length}`);
  console.log("");
  console.log("WHY THIS MATTERS:");
  console.log("   - Gateway files provide type-safe, validated access to the database");
  console.log("   - They prevent enum mismatches (e.g., sending FIRST_INVESTMENT to DB)");
  console.log("   - They ensure proper error handling and logging");
  console.log("   - They enable contract verification and drift detection");
  console.log("");
  console.log("To fix these violations:");
  console.log("   1. Import from '@/lib/rpc' for RPC calls");
  console.log("   2. Import from '@/lib/db' for database mutations");
  console.log("   3. If a new RPC/mutation is needed, add it to the gateway first");
  console.log("");

  process.exit(1);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
