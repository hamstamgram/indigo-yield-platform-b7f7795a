#!/usr/bin/env npx ts-node
/**
 * SQL Hygiene Check Script
 * =========================
 * Scans the codebase for SQL hygiene issues:
 *
 * 1. Ambiguous column references (columns that exist in multiple joined tables)
 * 2. Composite PK misuse (using .select("id") on tables with composite PKs)
 * 3. Deprecated patterns (direct table mutations instead of RPC calls)
 * 4. Missing table prefixes in JOINs
 *
 * Usage:
 *   npm run sql:hygiene
 *   npx ts-node scripts/sql-hygiene-check.ts
 *
 * Exit codes:
 *   0 - All checks passed
 *   1 - Issues found
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =============================================================================
// CONFIGURATION
// =============================================================================

/** Tables with composite primary keys - cannot use .select("id") */
const COMPOSITE_PK_TABLES = ["investor_positions"];

/** Protected tables - should use RPC, not direct mutations */
const PROTECTED_TABLES = [
  "transactions_v2",
  "yield_distributions",
  "fund_aum_events",
  "fund_daily_aum",
];

/** Columns that commonly appear in multiple tables (ambiguous in JOINs) */
const AMBIGUOUS_COLUMNS = [
  "id",
  "created_at",
  "updated_at",
  "fund_id",
  "investor_id",
  "amount",
  "status",
  "notes",
  "type",
];

/** Directories to scan */
const SCAN_DIRS = ["src", "supabase/functions"];

/** File extensions to scan */
const SCAN_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".sql"];

/** Patterns to ignore */
const IGNORE_PATTERNS = ["node_modules", ".git", "dist", "build", ".next", "coverage"];

// =============================================================================
// TYPES
// =============================================================================

interface Issue {
  file: string;
  line: number;
  column: number;
  severity: "error" | "warning" | "info";
  code: string;
  message: string;
  context: string;
}

interface ScanResult {
  totalFiles: number;
  filesWithIssues: number;
  issues: Issue[];
  byCode: Record<string, number>;
}

// =============================================================================
// SCANNING LOGIC
// =============================================================================

function getAllFiles(dir: string, files: string[] = []): string[] {
  const fullPath = path.resolve(__dirname, "..", dir);

  if (!fs.existsSync(fullPath)) {
    return files;
  }

  const entries = fs.readdirSync(fullPath, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(fullPath, entry.name);
    const relativePath = path.relative(path.resolve(__dirname, ".."), entryPath);

    // Skip ignored patterns
    if (IGNORE_PATTERNS.some((p) => relativePath.includes(p))) {
      continue;
    }

    if (entry.isDirectory()) {
      getAllFiles(relativePath, files);
    } else if (SCAN_EXTENSIONS.some((ext) => entry.name.endsWith(ext))) {
      files.push(relativePath);
    }
  }

  return files;
}

function scanFile(filePath: string): Issue[] {
  const issues: Issue[] = [];
  const fullPath = path.resolve(__dirname, "..", filePath);
  const content = fs.readFileSync(fullPath, "utf-8");
  const lines = content.split("\n");

  lines.forEach((line, lineIndex) => {
    const lineNum = lineIndex + 1;

    // Check 1: Composite PK tables with .select("id")
    for (const table of COMPOSITE_PK_TABLES) {
      // Pattern: .from("investor_positions")...select("id")
      // or from('investor_positions')...select('id')
      const fromPattern = new RegExp(`from\\(["'\`]${table}["'\`]\\)`, "i");
      const selectIdPattern = /\.select\(["'`]\*?id["'`]\)/i;

      if (fromPattern.test(line) && selectIdPattern.test(line)) {
        issues.push({
          file: filePath,
          line: lineNum,
          column: line.indexOf(".select"),
          severity: "error",
          code: "COMPOSITE_PK_ID",
          message: `Table "${table}" has composite PK. Cannot use .select("id"). Use .select("investor_id, fund_id") instead.`,
          context: line.trim(),
        });
      }

      // Also check for patterns spread across multiple lines (look ahead)
      if (fromPattern.test(line)) {
        // Look at next 5 lines for .select("id")
        for (let i = 1; i <= 5 && lineIndex + i < lines.length; i++) {
          const nextLine = lines[lineIndex + i];
          if (selectIdPattern.test(nextLine)) {
            issues.push({
              file: filePath,
              line: lineNum + i,
              column: nextLine.indexOf(".select"),
              severity: "error",
              code: "COMPOSITE_PK_ID",
              message: `Table "${table}" has composite PK. Cannot use .select("id").`,
              context: nextLine.trim(),
            });
            break;
          }
        }
      }
    }

    // Check 2: Direct mutations to protected tables (not through RPC)
    for (const table of PROTECTED_TABLES) {
      // Pattern: .from("table").insert(...) or .update(...) or .delete(...)
      const directMutationPattern = new RegExp(
        `from\\(["'\`]${table}["'\`]\\)[^)]*\\.(insert|update|delete|upsert)\\(`,
        "i"
      );

      if (directMutationPattern.test(line)) {
        issues.push({
          file: filePath,
          line: lineNum,
          column: line.indexOf(table),
          severity: "error",
          code: "PROTECTED_TABLE_MUTATION",
          message: `Direct mutation to protected table "${table}". Use canonical RPC functions instead.`,
          context: line.trim(),
        });
      }
    }

    // Check 3: Ambiguous column in JOIN without table prefix
    // Pattern: JOIN ... ON column = column (without table prefix)
    if (/join/i.test(line)) {
      for (const col of AMBIGUOUS_COLUMNS) {
        // Pattern: ON id = or ON created_at = (without table prefix)
        const ambiguousPattern = new RegExp(`\\bON\\s+${col}\\s*=|=\\s*${col}\\b`, "i");
        if (ambiguousPattern.test(line)) {
          // Check if it has a table prefix (t.id or table.id)
          const prefixedPattern = new RegExp(`\\w+\\.${col}`, "i");
          if (!prefixedPattern.test(line)) {
            issues.push({
              file: filePath,
              line: lineNum,
              column: line.indexOf(col),
              severity: "warning",
              code: "AMBIGUOUS_COLUMN",
              message: `Column "${col}" may be ambiguous in JOIN. Use table prefix (e.g., t.${col}).`,
              context: line.trim(),
            });
          }
        }
      }
    }

    // Check 4: SELECT * with JOIN (potential ambiguous columns)
    if (/select\s*\*/i.test(line) && /join/i.test(line)) {
      issues.push({
        file: filePath,
        line: lineNum,
        column: line.indexOf("*"),
        severity: "warning",
        code: "SELECT_STAR_JOIN",
        message:
          "SELECT * with JOIN may cause ambiguous column issues. Consider selecting specific columns.",
        context: line.trim(),
      });
    }

    // Check 5: Direct supabase.from() usage outside of db.ts
    if (
      !filePath.includes("lib/db") &&
      !filePath.includes("lib/rpc") &&
      !filePath.includes("integrations")
    ) {
      const directSupabasePattern = /supabase\s*\.\s*from\s*\(["'`]\w+["'`]\)/;
      if (directSupabasePattern.test(line)) {
        issues.push({
          file: filePath,
          line: lineNum,
          column: line.indexOf("supabase"),
          severity: "info",
          code: "DIRECT_SUPABASE_FROM",
          message:
            "Direct supabase.from() usage. Consider using db.from() from @/lib/db for type-safe queries.",
          context: line.trim(),
        });
      }
    }

    // Check 6: Direct supabase.rpc() usage outside of rpc.ts
    if (!filePath.includes("lib/rpc") && !filePath.includes("integrations")) {
      const directRpcPattern = /supabase\s*\.\s*rpc\s*\(/;
      if (directRpcPattern.test(line)) {
        issues.push({
          file: filePath,
          line: lineNum,
          column: line.indexOf("supabase"),
          severity: "info",
          code: "DIRECT_SUPABASE_RPC",
          message:
            "Direct supabase.rpc() usage. Consider using rpc.call() from @/lib/rpc for type-safe, validated RPC calls.",
          context: line.trim(),
        });
      }
    }

    // Check 7: FIRST_INVESTMENT tx_type (should be DEPOSIT with subtype)
    if (/["'`]FIRST_INVESTMENT["'`]/i.test(line)) {
      issues.push({
        file: filePath,
        line: lineNum,
        column: line.indexOf("FIRST_INVESTMENT"),
        severity: "error",
        code: "INVALID_TX_TYPE",
        message:
          'FIRST_INVESTMENT is not a valid DB tx_type. Use mapUITypeToDb() to convert to DEPOSIT with tx_subtype="first_investment".',
        context: line.trim(),
      });
    }
  });

  return issues;
}

// =============================================================================
// MAIN
// =============================================================================

function main(): void {
  console.log("🔍 SQL Hygiene Check\n");
  console.log("=".repeat(60));

  // Collect all files
  const files: string[] = [];
  for (const dir of SCAN_DIRS) {
    getAllFiles(dir, files);
  }

  console.log(`\nScanning ${files.length} files...\n`);

  // Scan all files
  const result: ScanResult = {
    totalFiles: files.length,
    filesWithIssues: 0,
    issues: [],
    byCode: {},
  };

  const filesWithIssues = new Set<string>();

  for (const file of files) {
    const issues = scanFile(file);
    if (issues.length > 0) {
      filesWithIssues.add(file);
      result.issues.push(...issues);

      for (const issue of issues) {
        result.byCode[issue.code] = (result.byCode[issue.code] || 0) + 1;
      }
    }
  }

  result.filesWithIssues = filesWithIssues.size;

  // Output results
  console.log("Results:");
  console.log("-".repeat(60));

  if (result.issues.length === 0) {
    console.log("✅ No SQL hygiene issues found!\n");
    process.exit(0);
  }

  // Group issues by file
  const issuesByFile = result.issues.reduce(
    (acc, issue) => {
      if (!acc[issue.file]) acc[issue.file] = [];
      acc[issue.file].push(issue);
      return acc;
    },
    {} as Record<string, Issue[]>
  );

  // Print issues
  for (const [file, issues] of Object.entries(issuesByFile)) {
    console.log(`\n📄 ${file}`);

    for (const issue of issues) {
      const icon = issue.severity === "error" ? "❌" : issue.severity === "warning" ? "⚠️" : "ℹ️";
      console.log(`  ${icon} Line ${issue.line}: [${issue.code}] ${issue.message}`);
      console.log(`     ${issue.context.substring(0, 80)}`);
    }
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("Summary:");
  console.log(`  Total files scanned: ${result.totalFiles}`);
  console.log(`  Files with issues: ${result.filesWithIssues}`);
  console.log(`  Total issues: ${result.issues.length}`);
  console.log("\nIssues by code:");
  for (const [code, count] of Object.entries(result.byCode)) {
    console.log(`  ${code}: ${count}`);
  }

  // Exit with error if there are errors
  const hasErrors = result.issues.some((i) => i.severity === "error");
  if (hasErrors) {
    console.log("\n❌ SQL hygiene check FAILED - errors found\n");
    process.exit(1);
  } else {
    console.log("\n⚠️ SQL hygiene check passed with warnings - review recommended\n");
    process.exit(0);
  }
}

main();
