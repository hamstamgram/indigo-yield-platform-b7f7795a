#!/usr/bin/env tsx
/**
 * RPC Signature Audit Script
 * Compares database RPC signatures against frontend contract
 */

import fs from "fs";
import path from "path";

// Read DB results
const dbResultPath = process.argv[2] || path.join(__dirname, "db-functions.json");

interface DBFunction {
  function_name: string;
  arguments: string;
  return_type: string;
  security_definer: boolean;
  returns_set: boolean;
  param_names: string;
  param_modes: string;
}

const dbFunctions: DBFunction[] = JSON.parse(fs.readFileSync(dbResultPath, "utf-8"));

// Read frontend contract
const contractPath = path.join(__dirname, "../src/contracts/rpcSignatures.ts");
const contractSource = fs.readFileSync(contractPath, "utf-8");

// Parse RPC_SIGNATURES object
const signaturesMatch = contractSource.match(
  /export const RPC_SIGNATURES = {([\s\S]+?)^} as const;/m
);
if (!signaturesMatch) {
  console.error("Could not find RPC_SIGNATURES in contract file");
  process.exit(1);
}

interface FrontendRPC {
  requiredParams: string[];
  optionalParams: string[];
  securityDefiner: boolean;
  returnsSet: boolean;
}

// Parse each RPC entry
const rpcSignatures: Record<string, FrontendRPC> = {};
const rpcEntryRegex = /['"]([^'"]+)['"]:\s*{([^}]+)}/g;
let match;

while ((match = rpcEntryRegex.exec(signaturesMatch[1])) !== null) {
  const rpcName = match[1];
  const rpcBody = match[2];

  const requiredMatch = rpcBody.match(/requiredParams:\s*\[([^\]]*)\]/);
  const optionalMatch = rpcBody.match(/optionalParams:\s*\[([^\]]*)\]/);
  const securityMatch = rpcBody.match(/securityDefiner:\s*(true|false)/);
  const returnsSetMatch = rpcBody.match(/returnsSet:\s*(true|false)/);

  rpcSignatures[rpcName] = {
    requiredParams: requiredMatch
      ? requiredMatch[1]
          .split(",")
          .map((p) => p.trim().replace(/['"]/g, ""))
          .filter(Boolean)
      : [],
    optionalParams: optionalMatch
      ? optionalMatch[1]
          .split(",")
          .map((p) => p.trim().replace(/['"]/g, ""))
          .filter(Boolean)
      : [],
    securityDefiner: securityMatch ? securityMatch[1] === "true" : false,
    returnsSet: returnsSetMatch ? returnsSetMatch[1] === "true" : false,
  };
}

// Helper to parse DB arguments
function parseDBArguments(
  args: string,
  paramNames: string
): {
  required: string[];
  optional: string[];
} {
  if (!args) return { required: [], optional: [] };

  const params = args.split(",").map((p) => p.trim());
  const names = paramNames
    .split(",")
    .map((n) => n.trim())
    .filter(Boolean);

  const required: string[] = [];
  const optional: string[] = [];

  params.forEach((param, idx) => {
    const hasDefault = param.includes("DEFAULT");
    const name = names[idx] || param.split(" ")[0];

    if (hasDefault) {
      optional.push(name);
    } else {
      required.push(name);
    }
  });

  return { required, optional };
}

// Convert snake_case to camelCase
function toCamelCase(str: string): string {
  return str.replace(/^p_/, "").replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

// Audit results
interface Mismatch {
  rpcName: string;
  type: string;
  details: string;
  dbSignature?: string;
  frontendSignature?: string;
}

const mismatches: Mismatch[] = [];
let totalChecked = 0;

// Check each DB function
for (const dbFunc of dbFunctions) {
  const rpcName = dbFunc.function_name;

  // Skip private functions
  if (rpcName.startsWith("_")) continue;

  const frontendRPC = rpcSignatures[rpcName];

  if (!frontendRPC) {
    mismatches.push({
      rpcName,
      type: "MISSING_IN_FRONTEND",
      details: `RPC exists in DB but not in frontend contract`,
      dbSignature: `${dbFunc.arguments} -> ${dbFunc.return_type}`,
    });
    continue;
  }

  totalChecked++;

  // Parse DB params
  const dbParams = parseDBArguments(dbFunc.arguments, dbFunc.param_names);

  // Convert to camelCase for comparison
  const dbRequiredCamel = dbParams.required.map(toCamelCase);
  const dbOptionalCamel = dbParams.optional.map(toCamelCase);

  // Check required params count
  if (dbRequiredCamel.length !== frontendRPC.requiredParams.length) {
    mismatches.push({
      rpcName,
      type: "REQUIRED_PARAM_COUNT_MISMATCH",
      details: `DB has ${dbRequiredCamel.length} required params, frontend has ${frontendRPC.requiredParams.length}`,
      dbSignature: dbRequiredCamel.join(", "),
      frontendSignature: frontendRPC.requiredParams.join(", "),
    });
  }

  // Check optional params count
  if (dbOptionalCamel.length !== frontendRPC.optionalParams.length) {
    mismatches.push({
      rpcName,
      type: "OPTIONAL_PARAM_COUNT_MISMATCH",
      details: `DB has ${dbOptionalCamel.length} optional params, frontend has ${frontendRPC.optionalParams.length}`,
      dbSignature: dbOptionalCamel.join(", "),
      frontendSignature: frontendRPC.optionalParams.join(", "),
    });
  }

  // Check required param names
  for (let i = 0; i < Math.min(dbRequiredCamel.length, frontendRPC.requiredParams.length); i++) {
    if (dbRequiredCamel[i] !== frontendRPC.requiredParams[i]) {
      mismatches.push({
        rpcName,
        type: "REQUIRED_PARAM_NAME_MISMATCH",
        details: `Required param #${i + 1}: DB has "${dbRequiredCamel[i]}", frontend has "${frontendRPC.requiredParams[i]}"`,
      });
    }
  }

  // Check optional param names
  for (let i = 0; i < Math.min(dbOptionalCamel.length, frontendRPC.optionalParams.length); i++) {
    if (dbOptionalCamel[i] !== frontendRPC.optionalParams[i]) {
      mismatches.push({
        rpcName,
        type: "OPTIONAL_PARAM_NAME_MISMATCH",
        details: `Optional param #${i + 1}: DB has "${dbOptionalCamel[i]}", frontend has "${frontendRPC.optionalParams[i]}"`,
      });
    }
  }

  // Check securityDefiner
  if (dbFunc.security_definer !== frontendRPC.securityDefiner) {
    mismatches.push({
      rpcName,
      type: "SECURITY_DEFINER_MISMATCH",
      details: `DB has securityDefiner=${dbFunc.security_definer}, frontend has ${frontendRPC.securityDefiner}`,
    });
  }

  // Check returnsSet
  if (dbFunc.returns_set !== frontendRPC.returnsSet) {
    mismatches.push({
      rpcName,
      type: "RETURNS_SET_MISMATCH",
      details: `DB has returnsSet=${dbFunc.returns_set}, frontend has ${frontendRPC.returnsSet}`,
    });
  }
}

// Check for RPCs in frontend but not in DB
for (const rpcName in rpcSignatures) {
  const dbFunc = dbFunctions.find((f) => f.function_name === rpcName);
  if (!dbFunc) {
    mismatches.push({
      rpcName,
      type: "MISSING_IN_DB",
      details: `RPC exists in frontend contract but not in database`,
      frontendSignature: `${rpcSignatures[rpcName].requiredParams.join(", ")} [${rpcSignatures[rpcName].optionalParams.join(", ")}]`,
    });
  }
}

// Output report
console.log("═══════════════════════════════════════════════════════════════");
console.log("  RPC SIGNATURE AUDIT REPORT");
console.log("═══════════════════════════════════════════════════════════════\n");

console.log(`Total RPCs checked: ${totalChecked}`);
console.log(`Total mismatches found: ${mismatches.length}\n`);

if (mismatches.length === 0) {
  console.log("✅ All RPC signatures match!\n");
  process.exit(0);
}

// Group by type
const byType = mismatches.reduce(
  (acc, m) => {
    if (!acc[m.type]) acc[m.type] = [];
    acc[m.type].push(m);
    return acc;
  },
  {} as Record<string, Mismatch[]>
);

// Priority order for output
const typeOrder = [
  "MISSING_IN_DB",
  "MISSING_IN_FRONTEND",
  "REQUIRED_PARAM_COUNT_MISMATCH",
  "REQUIRED_PARAM_NAME_MISMATCH",
  "OPTIONAL_PARAM_COUNT_MISMATCH",
  "OPTIONAL_PARAM_NAME_MISMATCH",
  "SECURITY_DEFINER_MISMATCH",
  "RETURNS_SET_MISMATCH",
];

for (const type of typeOrder) {
  const matches = byType[type];
  if (!matches || matches.length === 0) continue;

  console.log(`\n${"─".repeat(63)}`);
  console.log(`${type} (${matches.length})`);
  console.log("─".repeat(63));

  for (const mismatch of matches) {
    console.log(`\n🔴 ${mismatch.rpcName}`);
    console.log(`   ${mismatch.details}`);
    if (mismatch.dbSignature) {
      console.log(`   DB:       ${mismatch.dbSignature}`);
    }
    if (mismatch.frontendSignature) {
      console.log(`   Frontend: ${mismatch.frontendSignature}`);
    }
  }
}

console.log("\n═══════════════════════════════════════════════════════════════\n");

// Exit with error if critical mismatches found
const criticalTypes = [
  "MISSING_IN_DB",
  "REQUIRED_PARAM_COUNT_MISMATCH",
  "REQUIRED_PARAM_NAME_MISMATCH",
];

const criticalMismatches = mismatches.filter((m) => criticalTypes.includes(m.type));
if (criticalMismatches.length > 0) {
  console.log(
    `❌ ${criticalMismatches.length} CRITICAL mismatches found that could cause runtime errors\n`
  );
  process.exit(1);
} else {
  console.log(`⚠️  ${mismatches.length} non-critical mismatches found\n`);
  process.exit(0);
}
