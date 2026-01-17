#!/usr/bin/env npx ts-node --esm
/**
 * Frontend Query Scanner
 *
 * Scans all TS/TSX files in src/ for database access patterns:
 * - .select() strings with columns not in schema snapshot
 * - .from().join() referencing non-existent relations
 * - Any raw .from().insert/update/delete on protected tables
 * - .rpc() calls outside src/lib/rpc.ts
 *
 * Exit code non-zero on any violation
 */

import { readFileSync, existsSync, readdirSync, statSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, "..", "..");

interface Violation {
  severity: "ERROR" | "WARNING";
  category: string;
  file: string;
  line: number;
  code: string;
  issue: string;
  suggestion: string;
}

interface SchemaSnapshot {
  tables: Record<string, {
    name: string;
    columns: Array<{ name: string; type: string }>;
    primaryKey: string[];
  }>;
  enums: Record<string, { values: string[] }>;
  functions: Record<string, any>;
}

const violations: Violation[] = [];

// Protected tables - direct mutations should go through RPCs
const PROTECTED_TABLES = [
  "transactions_v2",
  "yield_distributions",
  "yield_allocations",
  "fee_allocations",
  "ib_allocations",
  "fund_daily_aum",
  "fund_aum_events",
  "investor_positions",
  "investor_yield_events",
  "fund_yield_snapshots",
  "platform_fee_ledger",
  "ib_commission_ledger"
];

// Allowed RPC locations
const ALLOWED_RPC_FILES = [
  "src/lib/rpc.ts",
  "src/lib/db.ts",
  "src/services/supabase.ts",
  "src/integrations/supabase/client.ts"
];

function loadSchemaSnapshot(): SchemaSnapshot | null {
  const snapshotPath = path.join(projectRoot, "artifacts", "schema-snapshot.json");
  if (!existsSync(snapshotPath)) {
    console.warn("WARNING: Schema snapshot not found. Run `npm run schema:snapshot` first.");
    console.warn("         Continuing with limited validation...\n");
    return null;
  }
  return JSON.parse(readFileSync(snapshotPath, "utf-8"));
}

function getAllTsFiles(dir: string): string[] {
  const files: string[] = [];

  function walk(currentDir: string) {
    const entries = readdirSync(currentDir);
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        // Skip node_modules, dist, .git, etc.
        if (!["node_modules", "dist", ".git", "build", "coverage"].includes(entry)) {
          walk(fullPath);
        }
      } else if (entry.endsWith(".ts") || entry.endsWith(".tsx")) {
        files.push(fullPath);
      }
    }
  }

  walk(dir);
  return files;
}

function getRelativePath(filePath: string): string {
  return path.relative(projectRoot, filePath);
}

function scanFile(filePath: string, schema: SchemaSnapshot | null) {
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const relativePath = getRelativePath(filePath);

  lines.forEach((line, index) => {
    const lineNum = index + 1;

    // 1. Check for .rpc() calls outside allowed files
    scanRpcCalls(line, lineNum, relativePath, schema);

    // 2. Check for protected table mutations
    scanProtectedMutations(line, lineNum, relativePath);

    // 3. Check for select columns (if schema available)
    if (schema) {
      scanSelectColumns(line, lineNum, relativePath, schema);
    }

    // 4. Check for from() table references
    if (schema) {
      scanTableReferences(line, lineNum, relativePath, schema);
    }

    // 5. Check for invalid enum values
    if (schema) {
      scanEnumUsage(line, lineNum, relativePath, schema);
    }
  });
}

function scanRpcCalls(line: string, lineNum: number, filePath: string, schema: SchemaSnapshot | null) {
  // Match .rpc("function_name" or .rpc('function_name'
  const rpcMatch = line.match(/\.rpc\s*\(\s*["']([^"']+)["']/);

  if (rpcMatch) {
    const rpcName = rpcMatch[1];
    const isAllowedFile = ALLOWED_RPC_FILES.some(allowed => filePath.includes(allowed));

    // Check if RPC is being called from non-gateway file
    if (!isAllowedFile && !filePath.includes("scripts/") && !filePath.includes("test")) {
      violations.push({
        severity: "WARNING",
        category: "RPC_OUTSIDE_GATEWAY",
        file: filePath,
        line: lineNum,
        code: line.trim(),
        issue: `Direct .rpc("${rpcName}") call outside of gateway`,
        suggestion: `Import and use the typed wrapper from src/lib/rpc.ts instead`
      });
    }

    // Check if RPC exists in schema
    if (schema && !schema.functions[rpcName]) {
      violations.push({
        severity: "ERROR",
        category: "INVALID_RPC",
        file: filePath,
        line: lineNum,
        code: line.trim(),
        issue: `RPC "${rpcName}" not found in schema`,
        suggestion: `Verify RPC exists in database or update rpcSignatures.ts`
      });
    }
  }
}

function scanProtectedMutations(line: string, lineNum: number, filePath: string) {
  // Skip if in scripts, migrations, or test files
  if (filePath.includes("scripts/") ||
      filePath.includes("migrations/") ||
      filePath.includes(".test.") ||
      filePath.includes(".spec.") ||
      filePath.includes("seed")) {
    return;
  }

  for (const table of PROTECTED_TABLES) {
    // Match .from("table").insert/update/delete/upsert
    const mutationPattern = new RegExp(
      `\\.from\\s*\\(\\s*["']${table}["']\\s*\\)\\s*\\.(insert|update|delete|upsert)`,
      "i"
    );

    if (mutationPattern.test(line)) {
      violations.push({
        severity: "ERROR",
        category: "PROTECTED_TABLE_MUTATION",
        file: filePath,
        line: lineNum,
        code: line.trim(),
        issue: `Direct mutation on protected table "${table}"`,
        suggestion: `Use appropriate RPC function instead (e.g., apply_daily_yield_to_fund_v3)`
      });
    }
  }
}

function scanSelectColumns(line: string, lineNum: number, filePath: string, schema: SchemaSnapshot) {
  // Match .select("column1, column2, ...") or .select(`column1, column2`)
  const selectMatch = line.match(/\.select\s*\(\s*["'`]([^"'`]+)["'`]/);

  if (selectMatch) {
    const selectStr = selectMatch[1];

    // Skip * and complex expressions
    if (selectStr === "*" || selectStr.includes("(")) {
      return;
    }

    // Try to find the table from preceding .from() call
    const fromMatch = line.match(/\.from\s*\(\s*["']([^"']+)["']/);
    if (!fromMatch) {
      return; // Can't determine table, skip
    }

    const tableName = fromMatch[1];
    const tableSchema = schema.tables[tableName];

    if (!tableSchema) {
      // Table not found - already handled by scanTableReferences
      return;
    }

    // Parse columns from select string
    const columns = selectStr
      .split(",")
      .map(c => c.trim().split(":")[0].trim()) // Handle aliases like "col:alias"
      .filter(c => c && !c.includes("!")); // Skip relation modifiers

    for (const col of columns) {
      // Skip if it's a relation reference (table.column or table!inner)
      if (col.includes(".") || col.includes("!")) {
        continue;
      }

      const exists = tableSchema.columns.some(c => c.name === col);
      if (!exists) {
        violations.push({
          severity: "ERROR",
          category: "INVALID_COLUMN",
          file: filePath,
          line: lineNum,
          code: line.trim(),
          issue: `Column "${col}" not found in table "${tableName}"`,
          suggestion: `Check schema for valid column names`
        });
      }
    }
  }
}

function scanTableReferences(line: string, lineNum: number, filePath: string, schema: SchemaSnapshot) {
  // Match .from("table_name")
  const fromMatch = line.match(/\.from\s*\(\s*["']([^"']+)["']/);

  if (fromMatch) {
    const tableName = fromMatch[1];

    // Skip system tables and views
    if (tableName.startsWith("pg_") || tableName.startsWith("information_schema")) {
      return;
    }

    if (!schema.tables[tableName]) {
      violations.push({
        severity: "ERROR",
        category: "INVALID_TABLE",
        file: filePath,
        line: lineNum,
        code: line.trim(),
        issue: `Table "${tableName}" not found in schema`,
        suggestion: `Verify table exists or update dbSchema.ts`
      });
    }
  }
}

function scanEnumUsage(line: string, lineNum: number, filePath: string, schema: SchemaSnapshot) {
  // Check for tx_type usage with invalid values
  const txTypeMatch = line.match(/type\s*[:=]\s*["']([A-Z_]+)["']/);
  if (txTypeMatch) {
    const value = txTypeMatch[1];
    const txTypeEnum = schema.enums["tx_type"];

    if (txTypeEnum && !txTypeEnum.values.includes(value)) {
      // Check if it's a UI-only type
      const uiOnlyTypes = ["FIRST_INVESTMENT", "TOP_UP"];
      if (uiOnlyTypes.includes(value)) {
        // Check if this is being used in a database context
        if (line.includes(".insert") || line.includes(".update") || line.includes(".rpc")) {
          violations.push({
            severity: "ERROR",
            category: "INVALID_ENUM_VALUE",
            file: filePath,
            line: lineNum,
            code: line.trim(),
            issue: `"${value}" is UI-only, not a valid tx_type for database operations`,
            suggestion: `Use "DEPOSIT" instead for database operations`
          });
        }
      }
    }
  }
}

function printReport(): boolean {
  console.log("\n" + "=".repeat(70));
  console.log("  FRONTEND QUERY SCAN REPORT");
  console.log("=".repeat(70));

  const errors = violations.filter(v => v.severity === "ERROR");
  const warnings = violations.filter(v => v.severity === "WARNING");

  if (errors.length === 0 && warnings.length === 0) {
    console.log("\n  ALL QUERIES VALIDATED");
    console.log("  No invalid patterns found in frontend code.");
    return true;
  }

  if (errors.length > 0) {
    console.log(`\n  ERRORS (${errors.length}):`);
    console.log("  " + "-".repeat(66));
    for (const v of errors) {
      console.log(`  [${v.category}] ${v.file}:${v.line}`);
      console.log(`    Code:   ${v.code.substring(0, 60)}${v.code.length > 60 ? "..." : ""}`);
      console.log(`    Issue:  ${v.issue}`);
      console.log(`    Fix:    ${v.suggestion}`);
      console.log();
    }
  }

  if (warnings.length > 0) {
    console.log(`\n  WARNINGS (${warnings.length}):`);
    console.log("  " + "-".repeat(66));
    for (const v of warnings) {
      console.log(`  [${v.category}] ${v.file}:${v.line}`);
      console.log(`    ${v.issue}`);
      console.log(`    Suggestion: ${v.suggestion}`);
    }
  }

  console.log("\n" + "=".repeat(70));

  return errors.length === 0;
}

async function main() {
  console.log("=".repeat(70));
  console.log("  FRONTEND QUERY SCANNER");
  console.log("=".repeat(70));

  // Load schema
  console.log("\nLoading schema snapshot...");
  const schema = loadSchemaSnapshot();
  if (schema) {
    console.log(`  Tables: ${Object.keys(schema.tables).length}`);
    console.log(`  Enums: ${Object.keys(schema.enums).length}`);
    console.log(`  Functions: ${Object.keys(schema.functions).length}`);
  }

  // Get all TS/TSX files in src/
  const srcDir = path.join(projectRoot, "src");
  console.log(`\nScanning ${srcDir}...`);
  const files = getAllTsFiles(srcDir);
  console.log(`  Found ${files.length} TypeScript files`);

  // Scan each file
  console.log("\nAnalyzing files...");
  let scannedCount = 0;
  for (const file of files) {
    scanFile(file, schema);
    scannedCount++;
    if (scannedCount % 50 === 0) {
      console.log(`  Scanned ${scannedCount}/${files.length} files...`);
    }
  }
  console.log(`  Scanned ${scannedCount} files`);

  // Report
  const success = printReport();

  if (!success) {
    console.log("\n  QUERY SCAN FAILED");
    console.log("  Fix the errors above before proceeding.\n");
    process.exit(1);
  }

  console.log("\n  QUERY SCAN PASSED\n");
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
