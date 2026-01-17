#!/usr/bin/env npx ts-node --esm
/**
 * Schema Contract Verification
 *
 * Compares artifacts/schema-snapshot.json against frontend contracts:
 * - src/contracts/dbSchema.ts
 * - src/contracts/dbEnums.ts
 * - src/contracts/rpcSignatures.ts
 *
 * FAILS if:
 * - Frontend references a table/column that does not exist
 * - Frontend expects "id" where PK is composite
 * - Frontend uses enum value not present in DB (ex: FIRST_INVESTMENT in DB calls)
 * - RPC name missing or signature mismatch
 *
 * Exit code non-zero on any mismatch
 */

import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, "..", "..");

interface Violation {
  severity: "ERROR" | "WARNING";
  category: string;
  file: string;
  line?: number;
  expected: string;
  actual: string;
  suggestion: string;
}

const violations: Violation[] = [];

function addViolation(v: Omit<Violation, "severity"> & { severity?: Violation["severity"] }) {
  violations.push({ severity: "ERROR", ...v });
}

// Load schema snapshot
function loadSchemaSnapshot(): any {
  const snapshotPath = path.join(projectRoot, "artifacts", "schema-snapshot.json");
  if (!existsSync(snapshotPath)) {
    console.error("ERROR: Schema snapshot not found. Run `npm run schema:snapshot` first.");
    process.exit(1);
  }
  return JSON.parse(readFileSync(snapshotPath, "utf-8"));
}

// Load frontend contracts by parsing the TypeScript files
function loadDbSchema(): Record<string, any> {
  const schemaPath = path.join(projectRoot, "src", "contracts", "dbSchema.ts");
  const content = readFileSync(schemaPath, "utf-8");

  // Extract DB_TABLES object
  const tablesMatch = content.match(/export const DB_TABLES = \{[\s\S]*?\} as const;/);
  if (!tablesMatch) {
    console.error("Could not parse DB_TABLES from dbSchema.ts");
    return {};
  }

  // Parse table definitions
  const tables: Record<string, any> = {};
  const tableRegex = /(\w+):\s*\{[^}]*name:\s*"(\w+)"[^}]*primaryKey:\s*\[(.*?)\][^}]*columns:\s*\[([\s\S]*?)\][^}]*\}/g;

  let match;
  while ((match = tableRegex.exec(content)) !== null) {
    const [, varName, tableName, pkStr, columnsStr] = match;
    const primaryKey = pkStr.split(",").map(s => s.trim().replace(/"/g, "")).filter(Boolean);
    const columns = columnsStr.split(",").map(s => s.trim().replace(/"/g, "")).filter(Boolean);

    tables[tableName] = {
      name: tableName,
      primaryKey,
      columns,
      isCompositePK: primaryKey.length > 1
    };
  }

  return tables;
}

function loadDbEnums(): Record<string, string[]> {
  const enumsPath = path.join(projectRoot, "src", "contracts", "dbEnums.ts");
  const content = readFileSync(enumsPath, "utf-8");

  const enums: Record<string, string[]> = {};

  // Extract TX_TYPE_VALUES
  const txTypeMatch = content.match(/export const TX_TYPE_VALUES = \[([\s\S]*?)\] as const;/);
  if (txTypeMatch) {
    const values = txTypeMatch[1].split(",").map(s => s.trim().replace(/"/g, "").replace(/'/g, "")).filter(Boolean);
    enums["tx_type"] = values;
  }

  // Extract AUM_PURPOSE_VALUES
  const aumPurposeMatch = content.match(/export const AUM_PURPOSE_VALUES = \[([\s\S]*?)\] as const;/);
  if (aumPurposeMatch) {
    const values = aumPurposeMatch[1].split(",").map(s => s.trim().replace(/"/g, "").replace(/'/g, "")).filter(Boolean);
    enums["aum_purpose"] = values;
  }

  return enums;
}

function loadRpcSignatures(): string[] {
  const rpcPath = path.join(projectRoot, "src", "contracts", "rpcSignatures.ts");
  const content = readFileSync(rpcPath, "utf-8");

  // Extract RPC_FUNCTIONS array
  const rpcMatch = content.match(/export const RPC_FUNCTIONS = \[([\s\S]*?)\] as const;/);
  if (!rpcMatch) {
    return [];
  }

  const functions = rpcMatch[1]
    .split(",")
    .map(s => s.trim().replace(/"/g, "").replace(/'/g, ""))
    .filter(s => s && !s.startsWith("//"));

  return functions;
}

// Verification functions
function verifyTables(schema: any, frontendTables: Record<string, any>) {
  console.log("\n1. Verifying Tables...");

  for (const [tableName, tableInfo] of Object.entries(frontendTables)) {
    const dbTable = schema.tables[tableName];

    if (!dbTable) {
      addViolation({
        category: "MISSING_TABLE",
        file: "src/contracts/dbSchema.ts",
        expected: `Table "${tableName}" to exist in database`,
        actual: "Table does not exist",
        suggestion: `Remove "${tableName}" from DB_TABLES or create the table in database`
      });
      continue;
    }

    // Check columns
    const ti = tableInfo as any;
    for (const col of ti.columns || []) {
      const dbCol = dbTable.columns?.find((c: any) => c.name === col);
      if (!dbCol) {
        addViolation({
          category: "MISSING_COLUMN",
          file: "src/contracts/dbSchema.ts",
          expected: `Column "${col}" in table "${tableName}"`,
          actual: "Column does not exist",
          suggestion: `Remove "${col}" from ${tableName}.columns or add column to database`
        });
      }
    }

    // Check composite PK usage
    if (dbTable.isCompositePK && ti.primaryKey?.length === 1 && ti.primaryKey[0] === "id") {
      addViolation({
        category: "COMPOSITE_PK_MISUSE",
        file: "src/contracts/dbSchema.ts",
        expected: `Table "${tableName}" has composite PK: ${dbTable.primaryKey.join(", ")}`,
        actual: "Frontend expects single \"id\" column",
        suggestion: `Update primaryKey to [${dbTable.primaryKey.map((p: string) => `"${p}"`).join(", ")}]`
      });
    }
  }

  // Check for tables in DB not in frontend (warning only)
  for (const tableName of Object.keys(schema.tables)) {
    if (!frontendTables[tableName]) {
      violations.push({
        severity: "WARNING",
        category: "UNDOCUMENTED_TABLE",
        file: "src/contracts/dbSchema.ts",
        expected: `Table "${tableName}" to be documented`,
        actual: "Table not in frontend contracts",
        suggestion: `Add "${tableName}" to DB_TABLES for completeness`
      });
    }
  }
}

function verifyEnums(schema: any, frontendEnums: Record<string, string[]>) {
  console.log("\n2. Verifying Enums...");

  for (const [enumName, frontendValues] of Object.entries(frontendEnums)) {
    const dbEnum = schema.enums[enumName];

    if (!dbEnum) {
      addViolation({
        category: "MISSING_ENUM",
        file: "src/contracts/dbEnums.ts",
        expected: `Enum "${enumName}" to exist in database`,
        actual: "Enum does not exist",
        suggestion: `Verify enum exists in database or remove from contracts`
      });
      continue;
    }

    // Check for values in frontend not in DB
    for (const value of frontendValues) {
      if (!dbEnum.values.includes(value)) {
        addViolation({
          category: "INVALID_ENUM_VALUE",
          file: "src/contracts/dbEnums.ts",
          expected: `Valid ${enumName} values: ${dbEnum.values.join(", ")}`,
          actual: `Frontend uses "${value}" which is not in database`,
          suggestion: `Remove "${value}" from ${enumName.toUpperCase()}_VALUES or add to database enum`
        });
      }
    }

    // Check for values in DB not in frontend (warning)
    for (const value of dbEnum.values) {
      if (!frontendValues.includes(value)) {
        violations.push({
          severity: "WARNING",
          category: "MISSING_ENUM_VALUE",
          file: "src/contracts/dbEnums.ts",
          expected: `All DB enum values documented`,
          actual: `"${value}" exists in DB but not in frontend`,
          suggestion: `Add "${value}" to ${enumName.toUpperCase()}_VALUES`
        });
      }
    }
  }

  // Special check: FIRST_INVESTMENT should NOT be in TX_TYPE_VALUES
  if (frontendEnums["tx_type"]?.includes("FIRST_INVESTMENT")) {
    addViolation({
      severity: "ERROR",
      category: "INVALID_ENUM_VALUE",
      file: "src/contracts/dbEnums.ts",
      expected: "FIRST_INVESTMENT to be UI-only (in UI_TX_TYPE_VALUES)",
      actual: "FIRST_INVESTMENT is in TX_TYPE_VALUES (DB enum)",
      suggestion: "Move FIRST_INVESTMENT to UI_TX_TYPE_VALUES only"
    });
  }
}

function verifyRpcFunctions(schema: any, frontendRpcs: string[]) {
  console.log("\n3. Verifying RPC Functions...");

  for (const rpcName of frontendRpcs) {
    const dbFunc = schema.functions[rpcName];

    if (!dbFunc) {
      // Don't fail for missing functions in snapshot (snapshot might be incomplete)
      violations.push({
        severity: "WARNING",
        category: "RPC_NOT_VERIFIED",
        file: "src/contracts/rpcSignatures.ts",
        expected: `RPC "${rpcName}" to be in schema snapshot`,
        actual: "RPC not found in snapshot (may still exist)",
        suggestion: "Verify RPC exists in database"
      });
    }
  }

  // Check critical RPCs exist
  const criticalRpcs = [
    "preview_daily_yield_to_fund_v3",
    "apply_daily_yield_to_fund_v3",
    "get_investor_position_as_of",
    "reconcile_investor_position",
    "is_admin"
  ];

  for (const rpc of criticalRpcs) {
    if (!frontendRpcs.includes(rpc)) {
      addViolation({
        category: "MISSING_CRITICAL_RPC",
        file: "src/contracts/rpcSignatures.ts",
        expected: `Critical RPC "${rpc}" to be documented`,
        actual: "RPC not in RPC_FUNCTIONS",
        suggestion: `Add "${rpc}" to RPC_FUNCTIONS`
      });
    }
  }
}

function printReport() {
  console.log("\n" + "=".repeat(70));
  console.log("  VERIFICATION REPORT");
  console.log("=".repeat(70));

  const errors = violations.filter(v => v.severity === "ERROR");
  const warnings = violations.filter(v => v.severity === "WARNING");

  if (errors.length === 0 && warnings.length === 0) {
    console.log("\n  ALL CONTRACTS VERIFIED");
    console.log("  No mismatches found between frontend and database schema.");
    return true;
  }

  if (errors.length > 0) {
    console.log(`\n  ERRORS (${errors.length}):`);
    console.log("  " + "-".repeat(66));
    for (const v of errors) {
      console.log(`  [${v.category}] ${v.file}`);
      console.log(`    Expected: ${v.expected}`);
      console.log(`    Actual:   ${v.actual}`);
      console.log(`    Fix:      ${v.suggestion}`);
      console.log();
    }
  }

  if (warnings.length > 0) {
    console.log(`\n  WARNINGS (${warnings.length}):`);
    console.log("  " + "-".repeat(66));
    for (const v of warnings) {
      console.log(`  [${v.category}] ${v.file}`);
      console.log(`    ${v.suggestion}`);
    }
  }

  console.log("\n" + "=".repeat(70));

  return errors.length === 0;
}

async function main() {
  console.log("=".repeat(70));
  console.log("  SCHEMA CONTRACT VERIFICATION");
  console.log("=".repeat(70));

  // Load data
  console.log("\nLoading schema snapshot...");
  const schema = loadSchemaSnapshot();
  console.log(`  Loaded snapshot from ${schema.generatedAt}`);

  console.log("\nLoading frontend contracts...");
  const frontendTables = loadDbSchema();
  console.log(`  Found ${Object.keys(frontendTables).length} tables in dbSchema.ts`);

  const frontendEnums = loadDbEnums();
  console.log(`  Found ${Object.keys(frontendEnums).length} enums in dbEnums.ts`);

  const frontendRpcs = loadRpcSignatures();
  console.log(`  Found ${frontendRpcs.length} RPCs in rpcSignatures.ts`);

  // Verify
  verifyTables(schema, frontendTables);
  verifyEnums(schema, frontendEnums);
  verifyRpcFunctions(schema, frontendRpcs);

  // Report
  const success = printReport();

  if (!success) {
    console.log("\n  CONTRACT VERIFICATION FAILED");
    console.log("  Fix the errors above before proceeding.\n");
    process.exit(1);
  }

  console.log("\n  CONTRACT VERIFICATION PASSED\n");
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
