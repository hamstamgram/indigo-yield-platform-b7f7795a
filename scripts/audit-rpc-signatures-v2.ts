#!/usr/bin/env tsx
/**
 * RPC Signature Audit Script v2
 * Compares database RPC signatures against frontend contract
 */

import fs from "fs";
import path from "path";

// Read DB functions
const dbFunctionsPath = path.join(__dirname, "db-functions.json");

interface DBFunction {
  function_name: string;
  arguments: string;
  return_type: string;
  security_definer: boolean;
  returns_set: boolean;
  param_names: string;
  param_modes: string;
}

const dbFunctions: DBFunction[] = JSON.parse(fs.readFileSync(dbFunctionsPath, "utf-8"));

// Parse DB arguments
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
    // Extract just the parameter name (first token before space)
    const name = names[idx] || param.split(" ")[0];

    if (hasDefault) {
      optional.push(name);
    } else {
      required.push(name);
    }
  });

  return { required, optional };
}

// Import the frontend contract dynamically
const contractPath = path.join(__dirname, "../src/contracts/rpcSignatures.ts");
const contractSource = fs.readFileSync(contractPath, "utf-8");

// Extract RPC_SIGNATURES object
const signaturesStart = contractSource.indexOf("export const RPC_SIGNATURES = {");
const signaturesEnd = contractSource.indexOf("} as const;", signaturesStart);
const signaturesText = contractSource.substring(signaturesStart, signaturesEnd + 11);

// Parse RPC entries using regex
interface FrontendRPC {
  requiredParams: string[];
  optionalParams: string[];
  securityDefiner: boolean;
  returnsSet: boolean;
}

const rpcSignatures: Record<string, FrontendRPC> = {};

// Match each RPC entry (rpc_name: { ... })
// The pattern needs to handle multiline and varying order
const rpcEntryPattern = /(\w+):\s*\{[^}]*\}/gs;

let match;
while ((match = rpcEntryPattern.exec(signaturesText)) !== null) {
  const rpcName = match[1];
  const entryBody = match[0];

  // Extract fields from the body
  const requiredMatch = entryBody.match(/requiredParams:\s*\[([^\]]*)\]/);
  const optionalMatch = entryBody.match(/optionalParams:\s*\[([^\]]*)\]/);
  const securityMatch = entryBody.match(/securityDefiner:\s*(true|false)/);
  const returnsSetMatch = entryBody.match(/returnsSet:\s*(true|false)/);

  if (!requiredMatch || !optionalMatch || !securityMatch || !returnsSetMatch) {
    continue; // Skip incomplete entries
  }

  const requiredRaw = requiredMatch[1];
  const optionalRaw = optionalMatch[1];
  const securityDefiner = securityMatch[1] === "true";
  const returnsSet = returnsSetMatch[1] === "true";

  // Parse parameter arrays
  const requiredParams = requiredRaw
    .split(",")
    .map((p) => p.trim().replace(/['"]/g, ""))
    .filter(Boolean);

  const optionalParams = optionalRaw
    .split(",")
    .map((p) => p.trim().replace(/['"]/g, ""))
    .filter(Boolean);

  rpcSignatures[rpcName] = {
    requiredParams,
    optionalParams,
    securityDefiner,
    returnsSet,
  };
}

console.log(`Loaded ${Object.keys(rpcSignatures).length} frontend RPC signatures`);
console.log(`Loaded ${dbFunctions.length} database functions`);

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
const dbFunctionMap = new Map(dbFunctions.map((f) => [f.function_name, f]));

// Check each frontend RPC against DB
for (const [rpcName, frontendRPC] of Object.entries(rpcSignatures)) {
  const dbFunc = dbFunctionMap.get(rpcName);

  if (!dbFunc) {
    mismatches.push({
      rpcName,
      type: "MISSING_IN_DB",
      details: `RPC exists in frontend contract but not in database`,
      frontendSignature: `required: ${frontendRPC.requiredParams.join(", ")} | optional: ${frontendRPC.optionalParams.join(", ")}`,
    });
    continue;
  }

  totalChecked++;

  // Parse DB params
  const dbParams = parseDBArguments(dbFunc.arguments, dbFunc.param_names);

  // Check required params
  if (dbParams.required.length !== frontendRPC.requiredParams.length) {
    mismatches.push({
      rpcName,
      type: "REQUIRED_PARAM_COUNT_MISMATCH",
      details: `DB has ${dbParams.required.length} required params, frontend has ${frontendRPC.requiredParams.length}`,
      dbSignature: dbParams.required.join(", "),
      frontendSignature: frontendRPC.requiredParams.join(", "),
    });
  } else {
    // Check param names match (in order)
    for (let i = 0; i < dbParams.required.length; i++) {
      if (dbParams.required[i] !== frontendRPC.requiredParams[i]) {
        mismatches.push({
          rpcName,
          type: "REQUIRED_PARAM_NAME_MISMATCH",
          details: `Required param #${i + 1}: DB has "${dbParams.required[i]}", frontend has "${frontendRPC.requiredParams[i]}"`,
        });
      }
    }
  }

  // Check optional params
  if (dbParams.optional.length !== frontendRPC.optionalParams.length) {
    mismatches.push({
      rpcName,
      type: "OPTIONAL_PARAM_COUNT_MISMATCH",
      details: `DB has ${dbParams.optional.length} optional params, frontend has ${frontendRPC.optionalParams.length}`,
      dbSignature: dbParams.optional.join(", "),
      frontendSignature: frontendRPC.optionalParams.join(", "),
    });
  } else {
    // Check param names (order matters for optional too)
    for (let i = 0; i < dbParams.optional.length; i++) {
      if (dbParams.optional[i] !== frontendRPC.optionalParams[i]) {
        mismatches.push({
          rpcName,
          type: "OPTIONAL_PARAM_NAME_MISMATCH",
          details: `Optional param #${i + 1}: DB has "${dbParams.optional[i]}", frontend has "${frontendRPC.optionalParams[i]}"`,
        });
      }
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

// Check for DB functions not in frontend (excluding private functions)
for (const dbFunc of dbFunctions) {
  if (dbFunc.function_name.startsWith("_")) continue; // Skip private functions
  if (!rpcSignatures[dbFunc.function_name]) {
    mismatches.push({
      rpcName: dbFunc.function_name,
      type: "MISSING_IN_FRONTEND",
      details: `RPC exists in DB but not in frontend contract`,
      dbSignature: `${dbFunc.arguments} -> ${dbFunc.return_type}`,
    });
  }
}

// Output report
console.log("\n═══════════════════════════════════════════════════════════════");
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

  for (const mismatch of matches.slice(0, 20)) {
    // Show first 20 of each type
    console.log(`\n🔴 ${mismatch.rpcName}`);
    console.log(`   ${mismatch.details}`);
    if (mismatch.dbSignature) {
      console.log(`   DB:       ${mismatch.dbSignature}`);
    }
    if (mismatch.frontendSignature) {
      console.log(`   Frontend: ${mismatch.frontendSignature}`);
    }
  }

  if (matches.length > 20) {
    console.log(`\n   ... and ${matches.length - 20} more`);
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
