/**
 * CI Check: Gateway Bypass Detection
 *
 * Scans the codebase for direct supabase.rpc() calls that bypass
 * the canonical RPC gateway (src/lib/rpc/client.ts).
 *
 * Known bypasses are documented and allowed (IB services, etc.).
 * NEW bypasses fail CI to enforce the gateway pattern.
 *
 * Usage:
 *   npx tsx tests/qa/ci/gateway-bypass-check.ts
 *
 * Exit codes:
 *   0 = clean (only known bypasses)
 *   1 = new bypass detected
 */

import * as fs from "fs";
import * as path from "path";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

// Known bypass files (documented tech debt — do NOT add new ones)
const KNOWN_BYPASS_FILES = new Set([
  // IB services use direct RPC for commission calculations
  "src/services/ib/ibService.ts",
  "src/services/ib/ibCommissionService.ts",
  "src/services/ib/ibPayoutService.ts",
  "src/services/ib/ibReferralService.ts",
  "src/services/ib/ibReportService.ts",
  "src/services/ib/ibDashboardService.ts",
  "src/services/ib/allocations.ts",
  "src/services/ib/referrals.ts",
  // Integrity service needs direct access for health checks
  "src/services/admin/integrityService.ts",
  // Platform error hook
  "src/hooks/usePlatformError.ts",
  // The gateway itself and its internals
  "src/lib/rpc/client.ts",
  "src/lib/rpc/types.ts",
  "src/lib/rpc/normalization.ts",
  "src/lib/rpc/validation.ts",
  // Supabase integration internals
  "src/integrations/supabase/client.ts",
]);

const SCAN_DIRS = ["services", "hooks", "features", "pages", "components", "lib"];

const EXCLUDE_PATTERNS = [/node_modules/, /\.test\./, /\.spec\./, /\.d\.ts$/];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BypassInstance {
  file: string;
  line: number;
  rpcName: string;
  match: string;
  isKnown: boolean;
}

// ---------------------------------------------------------------------------
// Scanner
// ---------------------------------------------------------------------------

function scanForBypasses(): BypassInstance[] {
  const instances: BypassInstance[] = [];
  const srcRoot = path.resolve(__dirname, "../../../src");

  for (const dir of SCAN_DIRS) {
    const fullDir = path.join(srcRoot, dir);
    if (!fs.existsSync(fullDir)) continue;
    scanDirectory(fullDir, instances);
  }

  return instances;
}

function scanDirectory(dir: string, instances: BypassInstance[]): void {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (EXCLUDE_PATTERNS.some((p) => p.test(fullPath))) continue;

    if (entry.isDirectory()) {
      scanDirectory(fullPath, instances);
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      scanFile(fullPath, instances);
    }
  }
}

function scanFile(filePath: string, instances: BypassInstance[]): void {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const relPath = path.relative(path.resolve(__dirname, "../../.."), filePath);

  // Check if this is a known bypass file
  const isKnown = KNOWN_BYPASS_FILES.has(relPath);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip comments and imports
    if (line.trim().startsWith("//") || line.trim().startsWith("*")) continue;
    if (line.includes("import ")) continue;

    // Look for direct supabase.rpc() calls
    const rpcPattern = /supabase\.rpc\s*\(\s*['"`](\w+)['"`]/;
    const match = line.match(rpcPattern);
    if (match) {
      instances.push({
        file: relPath,
        line: i + 1,
        rpcName: match[1],
        match: line.trim().substring(0, 100),
        isKnown,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  console.log("CI: Gateway Bypass Check");
  console.log("========================\n");

  const instances = scanForBypasses();
  const known = instances.filter((i) => i.isKnown);
  const unknown = instances.filter((i) => !i.isKnown);

  // Report known bypasses (informational)
  if (known.length > 0) {
    console.log(`[i] ${known.length} known/documented gateway bypasses (tech debt):`);
    const byFile = new Map<string, BypassInstance[]>();
    for (const i of known) {
      if (!byFile.has(i.file)) byFile.set(i.file, []);
      byFile.get(i.file)!.push(i);
    }
    for (const [file, fileInstances] of byFile) {
      const rpcs = [...new Set(fileInstances.map((i) => i.rpcName))];
      console.log(`    ${file}: ${rpcs.join(", ")}`);
    }
    console.log();
  }

  // Report unknown bypasses (failures)
  if (unknown.length > 0) {
    console.log(`[X] ${unknown.length} NEW gateway bypasses detected:\n`);
    for (const i of unknown) {
      console.log(`    ${i.file}:${i.line}`);
      console.log(`      RPC: ${i.rpcName}`);
      console.log(`      Code: ${i.match}`);
      console.log();
    }

    console.log(
      "To fix: Use the RPC gateway (src/lib/rpc/client.ts) instead of direct supabase.rpc()"
    );
    console.log(
      "If this bypass is intentional, add the file to KNOWN_BYPASS_FILES in this check.\n"
    );
  } else {
    console.log("[PASS] No new gateway bypasses detected\n");
  }

  // Summary
  console.log("========================");
  console.log(`Known bypasses: ${known.length}`);
  console.log(`New bypasses: ${unknown.length}`);

  if (unknown.length > 0) {
    console.log("\nFAILED: New gateway bypasses must use the RPC gateway");
    process.exit(1);
  } else {
    console.log("\nPASSED");
  }
}

main();
