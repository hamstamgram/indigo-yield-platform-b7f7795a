/**
 * Phase 1: Comprehensive Enum & Contract Audit
 *
 * 1. Scans ALL source directories (including src/features/) for raw enum literals
 * 2. Maps every admin service function to its RPC call
 * 3. Identifies UI components using raw strings for types/statuses
 *
 * Usage:
 *   npx tsx tests/qa/phase1-enum-audit.ts
 */

import * as fs from "fs";
import * as path from "path";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

// All known enum values (from src/contracts/dbEnums.ts)
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

// High-confidence enum values (uppercase or multi-word) that are almost certainly enum refs
const HIGH_CONFIDENCE_VALUES = new Set([
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

// Directories to scan (including features/)
const SCAN_DIRS = ["pages", "components", "hooks", "features", "services"];

// Files/patterns to exclude
const EXCLUDE_PATTERNS = [
  /contracts\//,
  /types\/domains\//,
  /\.test\./,
  /\.spec\./,
  /node_modules/,
  /\.d\.ts$/,
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RawEnumUsage {
  file: string;
  line: number;
  match: string;
  enumValue: string;
  enumName: string;
  confidence: "high" | "medium" | "low";
  importsFromContracts: boolean;
}

interface ServiceRPCMapping {
  service: string;
  functionName: string;
  rpc: string;
  usesGateway: boolean;
  file: string;
  line: number;
}

interface Phase1Report {
  generatedAt: string;
  rawEnumUsages: RawEnumUsage[];
  serviceRPCMappings: ServiceRPCMapping[];
  summary: {
    filesScanned: number;
    rawUsagesFound: number;
    highConfidence: number;
    mediumConfidence: number;
    lowConfidence: number;
    servicesScanned: number;
    rpcMappingsFound: number;
    gatewayBypasses: number;
  };
}

// ---------------------------------------------------------------------------
// 1. Raw Enum Scanner (extended to include features/)
// ---------------------------------------------------------------------------

function buildEnumValueMap(): Map<string, string> {
  const valueToEnum = new Map<string, string>();
  for (const [enumName, values] of Object.entries(ENUM_REGISTRY)) {
    for (const v of values) {
      valueToEnum.set(v, enumName);
    }
  }
  return valueToEnum;
}

function scanForRawEnumUsages(): { usages: RawEnumUsage[]; filesScanned: number } {
  const usages: RawEnumUsage[] = [];
  const valueToEnum = buildEnumValueMap();
  const allEnumValues = new Set(valueToEnum.keys());
  const srcRoot = path.resolve(__dirname, "../../src");
  let filesScanned = 0;

  for (const dir of SCAN_DIRS) {
    const fullDir = path.join(srcRoot, dir);
    if (!fs.existsSync(fullDir)) continue;
    filesScanned += scanDirectory(fullDir, allEnumValues, valueToEnum, usages);
  }

  return { usages, filesScanned };
}

function scanDirectory(
  dir: string,
  enumValues: Set<string>,
  valueToEnum: Map<string, string>,
  usages: RawEnumUsage[]
): number {
  let count = 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (EXCLUDE_PATTERNS.some((p) => p.test(fullPath))) continue;

    if (entry.isDirectory()) {
      count += scanDirectory(fullPath, enumValues, valueToEnum, usages);
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      count++;
      scanFile(fullPath, enumValues, valueToEnum, usages);
    }
  }

  return count;
}

function scanFile(
  filePath: string,
  enumValues: Set<string>,
  valueToEnum: Map<string, string>,
  usages: RawEnumUsage[]
): void {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const relPath = path.relative(path.resolve(__dirname, "../.."), filePath);

  const importsContracts =
    content.includes("@/contracts/dbEnums") ||
    content.includes("contracts/dbEnums") ||
    content.includes("@/contracts");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip comments and imports
    if (line.trim().startsWith("//") || line.trim().startsWith("*")) continue;
    if (line.includes("import ")) continue;

    // Look for raw enum strings in quotes
    const matches = line.matchAll(/["'`]([\w_]+)["'`]/g);
    for (const match of matches) {
      const value = match[1];

      if (!enumValues.has(value)) continue;

      // Skip if this file imports from contracts
      if (importsContracts) continue;

      // Determine confidence
      let confidence: "high" | "medium" | "low" = "low";
      if (HIGH_CONFIDENCE_VALUES.has(value)) {
        confidence = "high";
      } else if (isEnumContext(line, value)) {
        confidence = "medium";
      }

      // Skip likely false positives for low-confidence matches
      if (confidence === "low" && isLikelyFalsePositive(line, value)) continue;

      usages.push({
        file: relPath,
        line: i + 1,
        match: line.trim().substring(0, 120),
        enumValue: value,
        enumName: valueToEnum.get(value) || "unknown",
        confidence,
        importsFromContracts: importsContracts,
      });
    }
  }
}

function isEnumContext(line: string, _value: string): boolean {
  // Check if the value appears in a type/status/role context
  const enumContextPatterns = [
    /type\s*[:=]/i,
    /status\s*[:=]/i,
    /role\s*[:=]/i,
    /source\s*[:=]/i,
    /purpose\s*[:=]/i,
    /===?\s*['"`]/,
    /!==?\s*['"`]/,
    /case\s+['"`]/,
    /\.filter\(/,
    /\.includes\(/,
  ];
  return enumContextPatterns.some((p) => p.test(line));
}

function isLikelyFalsePositive(line: string, value: string): boolean {
  // CSS class names, HTML attributes, route paths
  if (line.includes("className") || line.includes("class=")) return true;
  if (line.includes("href=") || line.includes("to=")) return true;
  if (line.includes("data-") || line.includes("aria-")) return true;

  // Query keys and cache keys
  if (line.includes("queryKey") || line.includes("QueryKey")) return true;

  // Tailwind CSS values
  if (line.includes("text-") || line.includes("bg-") || line.includes("border-")) return true;

  // Short common words that aren't likely enum references
  const commonWords = new Set([
    "active",
    "pending",
    "user",
    "admin",
    "email",
    "app",
    "other",
    "system",
    "notice",
    "tax",
    "sms",
  ]);
  if (commonWords.has(value.toLowerCase()) && !isEnumContext(line, value)) return true;

  return false;
}

// ---------------------------------------------------------------------------
// 2. Service-to-RPC Mapping
// ---------------------------------------------------------------------------

function mapServiceRPCs(): ServiceRPCMapping[] {
  const mappings: ServiceRPCMapping[] = [];
  const srcRoot = path.resolve(__dirname, "../../src");

  const serviceDirs = [path.join(srcRoot, "services"), path.join(srcRoot, "features")];

  for (const serviceDir of serviceDirs) {
    if (!fs.existsSync(serviceDir)) continue;
    scanServicesDir(serviceDir, mappings);
  }

  return mappings;
}

function scanServicesDir(dir: string, mappings: ServiceRPCMapping[]): void {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      scanServicesDir(fullPath, mappings);
    } else if (
      /\.(ts|tsx)$/.test(entry.name) &&
      !entry.name.includes(".test.") &&
      !entry.name.includes(".spec.")
    ) {
      scanServiceFile(fullPath, mappings);
    }
  }
}

function scanServiceFile(filePath: string, mappings: ServiceRPCMapping[]): void {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const relPath = path.relative(path.resolve(__dirname, "../.."), filePath);

  // Determine if this file uses the gateway
  const usesGateway =
    content.includes("@/lib/rpc/client") ||
    content.includes("lib/rpc/client") ||
    content.includes("rpcClient");

  // Find the service/module name from path
  const serviceName = relPath.replace(/^src\/(services|features)\//, "").replace(/\.(ts|tsx)$/, "");

  // Find function declarations that call RPCs
  let currentFunction = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Track current function
    const funcMatch = line.match(
      /(?:export\s+)?(?:async\s+)?function\s+(\w+)|(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s+)?(?:\([^)]*\)\s*(?:=>|:)|\(\s*\)\s*=>)/
    );
    if (funcMatch) {
      currentFunction = funcMatch[1] || funcMatch[2] || "";
    }

    // Find RPC calls
    const rpcPatterns = [
      /supabase\.rpc\s*\(\s*['"`](\w+)['"`]/,
      /rpcClient\.call\s*\(\s*['"`](\w+)['"`]/,
      /call\s*\(\s*['"`](\w+)['"`]/,
      /callNoArgs\s*\(\s*['"`](\w+)['"`]/,
    ];

    for (const pattern of rpcPatterns) {
      const match = line.match(pattern);
      if (match) {
        mappings.push({
          service: serviceName,
          functionName: currentFunction || "(top-level)",
          rpc: match[1],
          usesGateway,
          file: relPath,
          line: i + 1,
        });
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("Phase 1: Comprehensive Enum & Contract Audit");
  console.log("==============================================\n");

  // 1. Scan for raw enum usages
  console.log("1. Scanning for raw enum string literals...\n");
  const { usages, filesScanned } = scanForRawEnumUsages();

  const highConf = usages.filter((u) => u.confidence === "high");
  const medConf = usages.filter((u) => u.confidence === "medium");
  const lowConf = usages.filter((u) => u.confidence === "low");

  if (highConf.length > 0) {
    console.log(`  [X] ${highConf.length} HIGH confidence raw enum usages:`);
    const byFile = new Map<string, RawEnumUsage[]>();
    for (const u of highConf) {
      if (!byFile.has(u.file)) byFile.set(u.file, []);
      byFile.get(u.file)!.push(u);
    }
    for (const [file, fileUsages] of byFile) {
      console.log(`    ${file}:`);
      for (const u of fileUsages.slice(0, 3)) {
        console.log(`      L${u.line}: "${u.enumValue}" (${u.enumName})`);
      }
      if (fileUsages.length > 3) console.log(`      ... and ${fileUsages.length - 3} more`);
    }
  }

  if (medConf.length > 0) {
    console.log(`\n  [!] ${medConf.length} MEDIUM confidence raw enum usages`);
  }

  if (lowConf.length > 0) {
    console.log(`  [i] ${lowConf.length} LOW confidence (may be false positives)`);
  }

  if (usages.length === 0) {
    console.log("  No raw enum literals found!\n");
  }

  // 2. Map service RPCs
  console.log("\n2. Mapping service functions to RPC calls...\n");
  const rpcMappings = mapServiceRPCs();

  const gatewayBypasses = rpcMappings.filter((m) => !m.usesGateway);
  const gatewayUsers = rpcMappings.filter((m) => m.usesGateway);

  console.log(`  Total RPC mappings: ${rpcMappings.length}`);
  console.log(`  Using gateway: ${gatewayUsers.length}`);
  console.log(`  Bypassing gateway: ${gatewayBypasses.length}`);

  if (gatewayBypasses.length > 0) {
    console.log("\n  Gateway bypasses:");
    const byService = new Map<string, ServiceRPCMapping[]>();
    for (const m of gatewayBypasses) {
      if (!byService.has(m.service)) byService.set(m.service, []);
      byService.get(m.service)!.push(m);
    }
    for (const [service, serviceMappings] of byService) {
      console.log(`    ${service}:`);
      for (const m of serviceMappings.slice(0, 5)) {
        console.log(`      ${m.functionName} -> ${m.rpc} (${m.file}:${m.line})`);
      }
      if (serviceMappings.length > 5)
        console.log(`      ... and ${serviceMappings.length - 5} more`);
    }
  }

  // Build report
  const report: Phase1Report = {
    generatedAt: new Date().toISOString(),
    rawEnumUsages: usages,
    serviceRPCMappings: rpcMappings,
    summary: {
      filesScanned,
      rawUsagesFound: usages.length,
      highConfidence: highConf.length,
      mediumConfidence: medConf.length,
      lowConfidence: lowConf.length,
      servicesScanned: new Set(rpcMappings.map((m) => m.service)).size,
      rpcMappingsFound: rpcMappings.length,
      gatewayBypasses: gatewayBypasses.length,
    },
  };

  // Write report
  const reportsDir = path.resolve(__dirname, "reports");
  fs.mkdirSync(reportsDir, { recursive: true });
  const reportPath = path.join(reportsDir, "phase1-surface-audit.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log(`\nReport: ${reportPath}`);

  // Summary
  console.log("\n==============================================");
  console.log("Summary:");
  console.log(`  Files scanned: ${report.summary.filesScanned}`);
  console.log(`  Raw enum usages: ${report.summary.rawUsagesFound}`);
  console.log(`    High confidence: ${report.summary.highConfidence}`);
  console.log(`    Medium confidence: ${report.summary.mediumConfidence}`);
  console.log(`    Low confidence: ${report.summary.lowConfidence}`);
  console.log(`  Service RPC mappings: ${report.summary.rpcMappingsFound}`);
  console.log(`  Gateway bypasses: ${report.summary.gatewayBypasses}`);

  if (highConf.length > 0) {
    console.log("\nWARNING: High-confidence raw enum usages should use contract imports");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
