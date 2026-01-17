#!/usr/bin/env ts-node
/**
 * CI Gate Script: Verify Database Enum Contracts
 *
 * This script validates that the enum contracts in src/contracts/dbEnums.ts
 * match the generated Supabase types in src/integrations/supabase/types.ts.
 *
 * Run: npx ts-node scripts/verify-enum-contracts.ts
 * CI:  Add to your CI pipeline to catch enum drift early
 *
 * Exit codes:
 *   0 - All enums match
 *   1 - Enum mismatch detected (drift)
 *   2 - Script error (couldn't read files, etc.)
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

// ES Module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ANSI colors for terminal output
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RESET = "\x1b[0m";

interface EnumValidation {
  name: string;
  contractValues: string[];
  supabaseValues: string[];
  matches: boolean;
  missing: string[];
  extra: string[];
}

function extractEnumFromSupabase(content: string, enumName: string): string[] {
  // Match pattern: EnumName: "value1" | "value2" | ...
  // or EnumName: value1 | value2 | ...
  const patterns = [
    // Pattern for inline enum like: tx_type: "DEPOSIT" | "WITHDRAWAL" | ...
    new RegExp(`${enumName}:\\s*([\\s\\S]*?)(?:;|\\n\\s*\\w+:)`, "i"),
    // Pattern for Enums section like: tx_type: "DEPOSIT" | "WITHDRAWAL" | ...
    new RegExp(`["']?${enumName}["']?:\\s*([^;]+);`, "i"),
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) {
      const enumString = match[1];
      // Extract quoted values
      const values = enumString.match(/"([^"]+)"/g);
      if (values) {
        return values.map((v) => v.replace(/"/g, ""));
      }
    }
  }

  return [];
}

function extractContractValues(content: string, arrayName: string): string[] {
  // Match: const ARRAY_NAME = ["value1", "value2", ...] as const
  const pattern = new RegExp(
    `const\\s+${arrayName}\\s*=\\s*\\[([\\s\\S]*?)\\]\\s*as\\s+const`,
    "i"
  );

  const match = content.match(pattern);
  if (match) {
    const arrayContent = match[1];
    const values = arrayContent.match(/"([^"]+)"/g);
    if (values) {
      return values.map((v) => v.replace(/"/g, ""));
    }
  }

  return [];
}

function validateEnum(
  name: string,
  contractValues: string[],
  supabaseValues: string[]
): EnumValidation {
  const contractSet = new Set(contractValues);
  const supabaseSet = new Set(supabaseValues);

  const missing = supabaseValues.filter((v) => !contractSet.has(v));
  const extra = contractValues.filter((v) => !supabaseSet.has(v));

  return {
    name,
    contractValues,
    supabaseValues,
    matches: missing.length === 0 && extra.length === 0,
    missing,
    extra,
  };
}

function main(): number {
  const projectRoot = path.resolve(__dirname, "..");
  const supabaseTypesPath = path.join(projectRoot, "src/integrations/supabase/types.ts");
  const contractsPath = path.join(projectRoot, "src/contracts/dbEnums.ts");

  console.log("🔍 Verifying Database Enum Contracts\n");

  // Read files
  let supabaseContent: string;
  let contractsContent: string;

  try {
    supabaseContent = fs.readFileSync(supabaseTypesPath, "utf-8");
    console.log(`✓ Read ${supabaseTypesPath}`);
  } catch (error) {
    console.error(`${RED}✗ Failed to read Supabase types: ${error}${RESET}`);
    return 2;
  }

  try {
    contractsContent = fs.readFileSync(contractsPath, "utf-8");
    console.log(`✓ Read ${contractsPath}`);
  } catch (error) {
    console.error(`${RED}✗ Failed to read contracts: ${error}${RESET}`);
    return 2;
  }

  console.log("");

  // Validate tx_type enum
  const txTypeSupabase = extractEnumFromSupabase(supabaseContent, "tx_type");
  const txTypeContract = extractContractValues(contractsContent, "TX_TYPE_VALUES");

  const validations: EnumValidation[] = [validateEnum("tx_type", txTypeContract, txTypeSupabase)];

  // Validate aum_purpose enum
  const aumPurposeSupabase = extractEnumFromSupabase(supabaseContent, "aum_purpose");
  const aumPurposeContract = extractContractValues(contractsContent, "AUM_PURPOSE_VALUES");

  if (aumPurposeSupabase.length > 0) {
    validations.push(validateEnum("aum_purpose", aumPurposeContract, aumPurposeSupabase));
  }

  // Report results
  let hasErrors = false;

  for (const v of validations) {
    if (v.matches) {
      console.log(`${GREEN}✓${RESET} ${v.name}: ${v.contractValues.length} values match`);
    } else {
      hasErrors = true;
      console.log(`${RED}✗${RESET} ${v.name}: MISMATCH DETECTED`);

      if (v.missing.length > 0) {
        console.log(`  ${YELLOW}Missing in contracts:${RESET} ${v.missing.join(", ")}`);
        console.log(`  → Add these values to ${v.name.toUpperCase()}_VALUES in dbEnums.ts`);
      }

      if (v.extra.length > 0) {
        console.log(`  ${YELLOW}Extra in contracts:${RESET} ${v.extra.join(", ")}`);
        console.log(`  → These values may have been removed from the database`);
      }
    }
  }

  console.log("");

  if (hasErrors) {
    console.log(
      `${RED}⚠ Enum contract drift detected!${RESET} Update src/contracts/dbEnums.ts to match database.`
    );
    console.log(
      "Run: npx supabase gen types typescript --local > src/integrations/supabase/types.ts"
    );
    return 1;
  }

  console.log(`${GREEN}✓ All enum contracts are in sync${RESET}`);
  return 0;
}

process.exit(main());
