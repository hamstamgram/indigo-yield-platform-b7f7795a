#!/usr/bin/env ts-node
/**
 * Contract Generator
 * ===================
 * Generates TypeScript contracts from:
 * 1. Schema Truth Pack (artifacts/schema-truth-pack.json) - preferred
 * 2. Supabase types file (src/integrations/supabase/types.ts) - fallback
 *
 * Outputs:
 * - src/contracts/dbEnums.ts (all enums)
 * - src/contracts/dbSchema.ts (tables/columns metadata)
 * - src/contracts/rpcSignatures.ts (RPC function signatures)
 *
 * Usage:
 *   npx ts-node scripts/generate-contracts.ts
 *   npm run contracts:generate
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.resolve(__dirname, "..");
const TRUTH_PACK_PATH = path.join(PROJECT_ROOT, "artifacts/schema-truth-pack.json");
const SUPABASE_TYPES_PATH = path.join(PROJECT_ROOT, "src/integrations/supabase/types.ts");
const CONTRACTS_DIR = path.join(PROJECT_ROOT, "src/contracts");

// Colors
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const RESET = "\x1b[0m";

interface SchemaColumn {
  name: string;
  type: string;
  data_type: string;
  is_nullable: boolean;
  column_default: string | null;
}

interface SchemaTable {
  name: string;
  schema: string;
  columns: SchemaColumn[];
  primary_key: string[] | null;
  rls_enabled: boolean;
}

interface SchemaEnum {
  name: string;
  schema: string;
  values: string[];
}

interface FunctionParam {
  name: string;
  type: string;
  mode: string;
  has_default: boolean;
}

interface SchemaFunction {
  name: string;
  schema: string;
  return_type: string;
  returns_set: boolean;
  volatility: string;
  security_definer: boolean;
  parameters: FunctionParam[] | null;
}

interface SchemaTruthPack {
  generated_at: string;
  enums: SchemaEnum[];
  tables: SchemaTable[];
  functions: SchemaFunction[];
}

/**
 * Parse enums from Supabase types file
 */
function parseEnumsFromSupabaseTypes(content: string): SchemaEnum[] {
  const enums: SchemaEnum[] = [];

  // Find the public section by looking for its start
  const publicParts = content.split("\n  public: {");
  if (publicParts.length < 2) return enums;

  const publicSection = publicParts[1];

  // Use robust extraction
  const enumsContent = extractSection(publicSection, "Enums: {");
  if (!enumsContent) return enums;

  // Extract each enum
  // Values can be multi-line (union types with |)
  const enumPattern = /(\w+):\s*([\s\S]+?)(?=\s*\w+:\s*|$)/g;
  let match;

  while ((match = enumPattern.exec(enumsContent)) !== null) {
    const name = match[1];
    const valuesStr = match[2];

    // Extract quoted values
    const values: string[] = [];
    const valuePattern = /"([^"]+)"/g;
    let valueMatch;
    while ((valueMatch = valuePattern.exec(valuesStr)) !== null) {
      values.push(valueMatch[1]);
    }

    if (values.length > 0) {
      enums.push({ name, schema: "public", values });
    }
  }

  return enums;
}

/**
 * Parse tables from Supabase types file
 */
function parseTablesFromSupabaseTypes(content: string): SchemaTable[] {
  const tables: SchemaTable[] = [];

  // Find the public section by looking for its start
  const publicParts = content.split("\n  public: {");
  if (publicParts.length < 2) return tables;

  const publicSection = publicParts[1];

  // Use robust extraction
  const tablesContent = extractSection(publicSection, "Tables: {");
  if (!tablesContent) return tables;

  // Extract each table from the public tables content
  const tablePattern = /(\w+):\s*\{\s*Row:\s*\{([^}]+)\}/g;
  let match;

  while ((match = tablePattern.exec(tablesContent)) !== null) {
    const name = match[1];
    const columnsStr = match[2];

    const columns: SchemaColumn[] = [];
    const colPattern = /(\w+):\s*([^;\n]+)/g;
    let colMatch;

    while ((colMatch = colPattern.exec(columnsStr)) !== null) {
      const colName = colMatch[1];
      let colType = colMatch[2].trim();

      // Clean up type
      colType = colType.replace(/\s*\|\s*null/g, "");
      const isNullable = colMatch[2].includes("| null");

      columns.push({
        name: colName,
        type: colType,
        data_type: colType,
        is_nullable: isNullable,
        column_default: null,
      });
    }

    if (columns.length > 0) {
      tables.push({
        name,
        schema: "public",
        columns,
        primary_key: columns.some((c) => c.name === "id") ? ["id"] : null,
        rls_enabled: true,
      });
    }
  }

  return tables;
}

/**
 * Parse RPC functions from Supabase types file
 */
function parseFunctionsFromSupabaseTypes(content: string): SchemaFunction[] {
  const functions: SchemaFunction[] = [];

  // Find the public section by looking for its start
  // Note: Use "\n  public: {" to avoid matching "graphql_public: {"
  const publicParts = content.split("\n  public: {");
  if (publicParts.length < 2) return functions;

  const publicSection = publicParts[1];

  // Find the Functions section by brace matching
  const lines = publicSection.split("\n");
  const startIndex = lines.findIndex((line) => line.includes("Functions: {"));
  if (startIndex === -1) return functions;

  let depth =
    (lines[startIndex].match(/\{/g) || []).length - (lines[startIndex].match(/\}/g) || []).length;
  const sectionLines: string[] = [];
  for (let i = startIndex + 1; i < lines.length && depth > 0; i += 1) {
    const line = lines[i];
    depth += (line.match(/\{/g) || []).length;
    depth -= (line.match(/\}/g) || []).length;
    if (depth > 0) {
      sectionLines.push(line);
    }
  }

  const functionsSection = sectionLines.join("\n");

  const functionBlocks: Array<{ name: string; block: string }> = [];
  let currentName: string | null = null;
  let currentLines: string[] = [];

  const flush = () => {
    if (!currentName) return;
    functionBlocks.push({ name: currentName, block: currentLines.join("\n") });
  };

  for (const line of functionsSection.split("\n")) {
    const match = line.match(/^\s{6}([A-Za-z0-9_]+):/);
    if (match) {
      flush();
      currentName = match[1];
      currentLines = [line];
      continue;
    }

    if (currentName) {
      currentLines.push(line);
    }
  }
  flush();

  for (const { name, block } of functionBlocks) {
    const argBlocks = Array.from(block.matchAll(/Args:\s*\{([\s\S]*?)\}/g)).map((m) => m[1]);
    const returnMatch = block.match(/Returns:\s*([^\n}]+)/);
    const returnType = returnMatch ? returnMatch[1].trim() : "unknown";

    const paramMap = new Map<string, { seenIn: number; optionalIn: number; type: string }>();

    for (const argsStr of argBlocks) {
      const argPattern = /(\w+)\??:\s*([^;\n,}]+)/g;
      let argMatch;
      while ((argMatch = argPattern.exec(argsStr)) !== null) {
        const paramName = argMatch[1];
        const paramType = argMatch[2].trim();
        const optional = argMatch[0].includes("?:");
        const existing = paramMap.get(paramName);
        if (existing) {
          existing.seenIn += 1;
          if (optional) existing.optionalIn += 1;
        } else {
          paramMap.set(paramName, {
            seenIn: 1,
            optionalIn: optional ? 1 : 0,
            type: paramType,
          });
        }
      }
    }

    const overloads = Math.max(argBlocks.length, 1);
    const parameters: FunctionParam[] = [];
    for (const [paramName, meta] of paramMap.entries()) {
      const requiredInAll = meta.seenIn === overloads && meta.optionalIn === 0;
      parameters.push({
        name: paramName,
        type: meta.type,
        mode: "IN",
        has_default: !requiredInAll,
      });
    }

    functions.push({
      name,
      schema: "public",
      return_type: returnType,
      returns_set: returnType.includes("[]"),
      volatility: "VOLATILE",
      security_definer: false,
      parameters: parameters.length > 0 ? parameters : null,
    });
  }

  return functions;
}

/**
 * Load schema truth pack
 */
function loadSchemaTruthPack(): SchemaTruthPack | null {
  if (fs.existsSync(TRUTH_PACK_PATH)) {
    try {
      const content = fs.readFileSync(TRUTH_PACK_PATH, "utf-8");
      return JSON.parse(content);
    } catch (e) {
      console.warn(`${YELLOW}⚠ Could not parse truth pack: ${e}${RESET}`);
    }
  }
  return null;
}

/**
 * Load from Supabase types (fallback)
 */
function loadFromSupabaseTypes(): SchemaTruthPack | null {
  if (!fs.existsSync(SUPABASE_TYPES_PATH)) {
    return null;
  }

  const content = fs.readFileSync(SUPABASE_TYPES_PATH, "utf-8");

  return {
    generated_at: new Date().toISOString(),
    enums: parseEnumsFromSupabaseTypes(content),
    tables: parseTablesFromSupabaseTypes(content),
    functions: parseFunctionsFromSupabaseTypes(content),
  };
}

/**
 * Generate dbEnums.ts
 */
function generateDbEnums(enums: SchemaEnum[]): string {
  const lines: string[] = [
    "/**",
    " * Database Enum Contracts",
    " * AUTO-GENERATED - DO NOT EDIT",
    " *",
    " * Regenerate with: npm run contracts:generate",
    " */",
    "",
    'import { z } from "zod";',
    'import type { Database } from "@/integrations/supabase/types";',
    "",
  ];

  for (const e of enums) {
    const constName = `${e.name.toUpperCase()}_VALUES`;
    const schemaName = `${toPascalCase(e.name)}Schema`;
    const typeName = toPascalCase(e.name);

    lines.push(`// =============================================================================`);
    lines.push(`// ${e.name.toUpperCase()} ENUM`);
    lines.push(`// =============================================================================`);
    lines.push("");
    lines.push(`export const ${constName} = [`);
    for (const v of e.values) {
      lines.push(`  "${v}",`);
    }
    lines.push("] as const;");
    lines.push("");
    lines.push(`export const ${schemaName} = z.enum(${constName}, {`);
    lines.push("  errorMap: (issue, ctx) => {");
    lines.push('    if (issue.code === "invalid_enum_value") {');
    if (e.name === "tx_type") {
      lines.push('      if (ctx.data === "FIRST_INVESTMENT") {');
      lines.push(
        "        return { message: `Invalid tx_type: FIRST_INVESTMENT is UI-only. Use mapUITypeToDb() to convert to DEPOSIT.` };"
      );
      lines.push("      }");
    }
    lines.push(
      `      return { message: \`Invalid ${e.name}: "\${ctx.data}". Valid: \${${constName}.join(", ")}\` };`
    );
    lines.push("    }");
    lines.push("    return { message: ctx.defaultError };");
    lines.push("  },");
    lines.push("});");
    lines.push("");
    lines.push(`export type ${typeName} = z.infer<typeof ${schemaName}>;`);
    lines.push("");
    lines.push(`export const DB_${e.name.toUpperCase()} = {`);
    for (const v of e.values) {
      lines.push(`  ${v}: "${v}",`);
    }
    lines.push(`} as const satisfies Record<string, ${typeName}>;`);
    lines.push("");
    lines.push(`export function isValid${typeName}(value: string): value is ${typeName} {`);
    lines.push(`  return ${schemaName}.safeParse(value).success;`);
    lines.push("}");
    lines.push("");
  }

  // Add UI extension for tx_type
  if (enums.some((e) => e.name === "tx_type")) {
    lines.push("// =============================================================================");
    lines.push("// UI EXTENSIONS");
    lines.push("// =============================================================================");
    lines.push("");
    lines.push("/** UI-only transaction types that get mapped to DB types */");
    lines.push(
      'export const UI_TX_TYPE_VALUES = [...TX_TYPE_VALUES, "FIRST_INVESTMENT"] as const;'
    );
    lines.push("export const UITxTypeSchema = z.enum(UI_TX_TYPE_VALUES);");
    lines.push("export type UITxType = z.infer<typeof UITxTypeSchema>;");
    lines.push("");
    lines.push("/** Map UI transaction type to DB type */");
    lines.push("export function mapUITypeToDb(uiType: UITxType): TxType {");
    lines.push('  if (uiType === "FIRST_INVESTMENT") return "DEPOSIT";');
    lines.push("  return TxTypeSchema.parse(uiType);");
    lines.push("}");
    lines.push("");
    /** Safe map UI type to DB type, returns null if invalid */
    lines.push("export function safeMapUITypeToDb(uiType: string): TxType | null {");
    lines.push("  const result = UITxTypeSchema.safeParse(uiType);");
    lines.push("  if (!result.success) return null;");
    lines.push("  return mapUITypeToDb(result.data);");
    lines.push("}");
    lines.push("");
    /** Get default tx_subtype for a UI transaction type */
    lines.push("export function getDefaultSubtype(uiType: UITxType): string {");
    lines.push("  switch (uiType) {");
    lines.push('    case "FIRST_INVESTMENT": return "first_investment";');
    lines.push('    case "DEPOSIT": return "top_up";');
    lines.push('    case "WITHDRAWAL": return "redemption";');
    lines.push('    case "FEE": return "fee_charge";');
    lines.push('    case "YIELD":');
    lines.push('    case "INTEREST": return "yield_credit";');
    lines.push('    default: return "adjustment";');
    lines.push("  }");
    lines.push("}");
    lines.push("");
    lines.push("/** Check if value is a valid UI transaction type */");
    lines.push("export function isValidUITxType(value: unknown): value is UITxType {");
    lines.push("  return UITxTypeSchema.safeParse(value).success;");
    lines.push("}");
    lines.push("");
    /** Assertion for valid transaction type */
    lines.push(
      "export function assertValidTxType(type: string, context?: string): asserts type is TxType {"
    );
    lines.push('  if (type === "FIRST_INVESTMENT") {');
    lines.push(
      '    throw new Error(`FIRST_INVESTMENT must be mapped to DEPOSIT${context ? ` (in ${context})` : ""}`);'
    );
    lines.push("  }");
    lines.push("  if (!isValidTxType(type)) {");
    lines.push(
      '    throw new Error(`Invalid transaction type: ${type}${context ? ` (in ${context})` : ""}`);'
    );
    lines.push("  }");
    lines.push("}");
    lines.push("");
  }

  // Type alignment checks
  lines.push("// =============================================================================");
  lines.push("// TYPE ALIGNMENT VERIFICATION");
  lines.push("// =============================================================================");
  lines.push("// These compile-time checks ensure our contracts match Supabase types");
  lines.push("");

  for (const e of enums) {
    const typeName = toPascalCase(e.name);
    lines.push(`type Supabase${typeName} = Database["public"]["Enums"]["${e.name}"];`);
    lines.push(
      `const _${e.name}Check: ${typeName} extends Supabase${typeName} ? Supabase${typeName} extends ${typeName} ? true : false : false = true;`
    );
    lines.push(`void _${e.name}Check;`);
  }

  return lines.join("\n");
}

/**
 * Generate dbSchema.ts
 */
function generateDbSchema(tables: SchemaTable[]): string {
  const lines: string[] = [
    "/**",
    " * Database Schema Contracts",
    " * AUTO-GENERATED - DO NOT EDIT",
    " *",
    " * Provides table metadata for runtime validation and IDE support.",
    " * Regenerate with: npm run contracts:generate",
    " */",
    "",
    'import type { Database } from "@/integrations/supabase/types";',
    "",
    "// =============================================================================",
    "// TABLE METADATA",
    "// =============================================================================",
    "",
  ];

  // Generate table metadata
  lines.push("export const DB_TABLES = {");
  for (const t of tables) {
    const pk = t.primary_key ? `["${t.primary_key.join('", "')}"]` : "null";
    const cols = t.columns.map((c) => `"${c.name}"`).join(", ");
    lines.push(`  ${t.name}: {`);
    lines.push(`    name: "${t.name}" as const,`);
    lines.push(`    primaryKey: ${pk} as const,`);
    lines.push(`    columns: [${cols}] as const,`);
    lines.push(`    rlsEnabled: ${t.rls_enabled},`);
    lines.push("  },");
  }
  lines.push("} as const;");
  lines.push("");

  // Generate table names type
  lines.push("export type TableName = keyof typeof DB_TABLES;");
  lines.push("");

  // Generate column names type per table
  lines.push(
    'export type TableColumns<T extends TableName> = typeof DB_TABLES[T]["columns"][number];'
  );
  lines.push("");

  // Generate primary key type per table
  lines.push(
    'export type TablePrimaryKey<T extends TableName> = typeof DB_TABLES[T]["primaryKey"];'
  );
  lines.push("");

  // Composite PK detection
  lines.push("// =============================================================================");
  lines.push("// COMPOSITE PRIMARY KEY DETECTION");
  lines.push("// =============================================================================");
  lines.push("");
  lines.push('/** Tables with composite primary keys (no single "id" column) */');
  lines.push("export const COMPOSITE_PK_TABLES = [");
  for (const t of tables) {
    if (t.primary_key && t.primary_key.length > 1) {
      lines.push(`  "${t.name}",`);
    } else if (!t.primary_key || !t.primary_key.includes("id")) {
      // Also include tables without 'id' in PK
      if (t.columns.some((c) => c.name === "id")) continue;
      lines.push(`  "${t.name}",`);
    }
  }
  lines.push("] as const;");
  lines.push("");
  lines.push("export type CompositePKTable = typeof COMPOSITE_PK_TABLES[number];");
  lines.push("");
  lines.push('/** Check if a table has a composite PK (cannot use .select("id")) */');
  lines.push("export function hasCompositePK(table: TableName): table is CompositePKTable {");
  lines.push("  return (COMPOSITE_PK_TABLES as readonly string[]).includes(table);");
  lines.push("}");
  lines.push("");

  // Helper to get primary key columns
  lines.push("/** Get primary key column names for a table */");
  lines.push("export function getPrimaryKeyColumns(table: TableName): string[] {");
  lines.push("  const meta = DB_TABLES[table];");
  lines.push("  return meta.primaryKey ? [...meta.primaryKey] : [];");
  lines.push("}");
  lines.push("");

  return lines.join("\n");
}

/**
 * Generate rpcSignatures.ts
 */
function generateRpcSignatures(functions: SchemaFunction[]): string {
  const lines: string[] = [
    "/**",
    " * RPC Function Signatures",
    " * AUTO-GENERATED - DO NOT EDIT",
    " *",
    " * Provides compile-time and runtime verification of RPC calls.",
    " * Regenerate with: npm run contracts:generate",
    " */",
    "",
    'import { z } from "zod";',
    'import type { Database } from "@/integrations/supabase/types";',
    "",
    "// =============================================================================",
    "// RPC FUNCTION REGISTRY",
    "// =============================================================================",
    "",
    'type RPCFunctions = Database["public"]["Functions"];',
    "export type RPCFunctionName = keyof RPCFunctions;",
    "",
    "/** All registered RPC function names */",
    "export const RPC_FUNCTIONS = [",
  ];

  for (const f of functions.sort((a, b) => a.name.localeCompare(b.name))) {
    lines.push(`  "${f.name}",`);
  }
  lines.push("] as const;");
  lines.push("");

  // Generate signature metadata
  lines.push("// =============================================================================");
  lines.push("// RPC SIGNATURES METADATA");
  lines.push("// =============================================================================");
  lines.push("");
  lines.push("export const RPC_SIGNATURES = {");

  for (const f of functions.sort((a, b) => a.name.localeCompare(b.name))) {
    const params = f.parameters || [];
    const requiredParams = params.filter((p) => !p.has_default && p.mode === "IN");
    const optionalParams = params.filter((p) => p.has_default && p.mode === "IN");

    lines.push(`  ${f.name}: {`);
    lines.push(`    name: "${f.name}" as const,`);
    lines.push(`    returnType: "${f.return_type}",`);
    lines.push(`    returnsSet: ${f.returns_set},`);
    lines.push(`    securityDefiner: ${f.security_definer},`);
    lines.push(
      `    requiredParams: [${requiredParams.map((p) => `"${p.name}"`).join(", ")}] as const,`
    );
    lines.push(
      `    optionalParams: [${optionalParams.map((p) => `"${p.name}"`).join(", ")}] as const,`
    );
    lines.push("  },");
  }

  lines.push("} as const;");
  lines.push("");

  // Generate param type helpers
  lines.push("// =============================================================================");
  lines.push("// TYPE HELPERS");
  lines.push("// =============================================================================");
  lines.push("");
  lines.push("/** Get required parameters for an RPC function */");
  lines.push("export type RPCRequiredParams<T extends RPCFunctionName> = ");
  lines.push("  T extends keyof typeof RPC_SIGNATURES");
  lines.push('    ? typeof RPC_SIGNATURES[T]["requiredParams"][number]');
  lines.push("    : never;");
  lines.push("");
  lines.push("/** Get optional parameters for an RPC function */");
  lines.push("export type RPCOptionalParams<T extends RPCFunctionName> = ");
  lines.push("  T extends keyof typeof RPC_SIGNATURES");
  lines.push('    ? typeof RPC_SIGNATURES[T]["optionalParams"][number]');
  lines.push("    : never;");
  lines.push("");
  lines.push("/** Validate that an RPC function exists */");
  lines.push("export function isValidRPCFunction(name: string): name is RPCFunctionName {");
  lines.push("  return (RPC_FUNCTIONS as readonly string[]).includes(name);");
  lines.push("}");
  lines.push("");
  lines.push("/** Get signature metadata for an RPC function */");
  lines.push("export function getRPCSignature<T extends RPCFunctionName>(name: T) {");
  lines.push("  if (!isValidRPCFunction(name)) {");
  lines.push("    throw new Error(`Unknown RPC function: ${name}`);");
  lines.push("  }");
  lines.push("  return RPC_SIGNATURES[name as keyof typeof RPC_SIGNATURES];");
  lines.push("}");
  lines.push("");

  // Canonical mutation RPCs
  lines.push("// =============================================================================");
  lines.push("// CANONICAL MUTATION RPCS");
  lines.push("// =============================================================================");
  lines.push("// These are the ONLY RPCs that should be used for mutations");
  lines.push("");
  lines.push("export const CANONICAL_MUTATION_RPCS = {");
  lines.push("  /** Canonical RPC for deposits (with crystallization) */");
  lines.push('  DEPOSIT: "apply_deposit_with_crystallization",');
  lines.push("  /** Canonical RPC for withdrawals (with crystallization) */");
  lines.push('  WITHDRAWAL: "apply_withdrawal_with_crystallization",');
  lines.push("  /** Canonical RPC for yield distribution */");
  lines.push('  YIELD: "apply_daily_yield_to_fund_v3",');
  lines.push("  /** Canonical RPC for voiding transactions */");
  lines.push('  VOID: "void_transaction",');
  lines.push("  /** Canonical RPC for admin transaction creation */");
  lines.push('  ADMIN_TX: "admin_create_transaction",');
  lines.push("} as const;");
  lines.push("");

  return lines.join("\n");
}

/**
 * Convert snake_case to PascalCase
 */
function toPascalCase(str: string): string {
  return str
    .split("_")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())
    .join("");
}

/**
 * Main
 */
async function main() {
  console.log(`${GREEN}📦 Contract Generator${RESET}`);
  console.log("=======================\n");

  // Load schema
  let schema = loadSchemaTruthPack();
  let source = "Schema Truth Pack";

  if (!schema) {
    console.log(`${YELLOW}⚠ No truth pack found, falling back to Supabase types${RESET}`);
    schema = loadFromSupabaseTypes();
    source = "Supabase Types";
  }

  if (!schema) {
    console.error(`${RED}❌ No schema source found!${RESET}`);
    console.error("Run one of:");
    console.error("  1. ./scripts/schema-truth-pack.sh (requires database)");
    console.error("  2. npx supabase gen types typescript > src/integrations/supabase/types.ts");
    process.exit(1);
  }

  console.log(`📄 Source: ${source}`);
  console.log(`   Enums: ${schema.enums.length}`);
  console.log(`   Tables: ${schema.tables.length}`);
  console.log(`   Functions: ${schema.functions.length}`);
  console.log("");

  // Ensure contracts directory exists
  if (!fs.existsSync(CONTRACTS_DIR)) {
    fs.mkdirSync(CONTRACTS_DIR, { recursive: true });
  }

  // Generate contracts
  console.log("📝 Generating contracts...");

  // dbEnums.ts
  const enumsContent = generateDbEnums(schema.enums);
  const enumsPath = path.join(CONTRACTS_DIR, "dbEnums.ts");
  fs.writeFileSync(enumsPath, enumsContent);
  console.log(`   ✓ ${enumsPath}`);

  // dbSchema.ts
  const schemaContent = generateDbSchema(schema.tables);
  const schemaPath = path.join(CONTRACTS_DIR, "dbSchema.ts");
  fs.writeFileSync(schemaPath, schemaContent);
  console.log(`   ✓ ${schemaPath}`);

  // rpcSignatures.ts
  const rpcContent = generateRpcSignatures(schema.functions);
  const rpcPath = path.join(CONTRACTS_DIR, "rpcSignatures.ts");
  fs.writeFileSync(rpcPath, rpcContent);
  console.log(`   ✓ ${rpcPath}`);

  // Update index.ts
  const indexContent = `/**
 * Contracts Index
 * AUTO-GENERATED - DO NOT EDIT EXPORTS
 *
 * Type-safe contracts for database operations.
 */

export * from "./dbEnums";
export * from "./dbSchema";
export * from "./rpcSignatures";
`;
  fs.writeFileSync(path.join(CONTRACTS_DIR, "index.ts"), indexContent);
  console.log(`   ✓ ${path.join(CONTRACTS_DIR, "index.ts")}`);

  console.log("");
  console.log(`${GREEN}✅ Contracts generated successfully!${RESET}`);
  console.log("");
  console.log("Next steps:");
  console.log("  1. Run: npm run type-check");
  console.log("  2. Run: npm run contracts:verify");
}

/**
 * Robustly extract a section between braces
 */
function extractSection(content: string, startMarker: string): string | null {
  const startIndex = content.indexOf(startMarker);
  if (startIndex === -1) return null;

  const blockStart = startIndex + startMarker.length - 1; // Position of the opening {
  let depth = 0;
  let endPos = -1;

  for (let i = blockStart; i < content.length; i++) {
    if (content[i] === "{") depth++;
    else if (content[i] === "}") depth--;

    if (depth === 0) {
      endPos = i;
      break;
    }
  }

  if (endPos === -1) return null;
  return content.substring(blockStart + 1, endPos);
}

main().catch((error) => {
  console.error(`${RED}Error: ${error}${RESET}`);
  process.exit(1);
});
