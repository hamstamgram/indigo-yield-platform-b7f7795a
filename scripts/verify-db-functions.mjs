#!/usr/bin/env node
/**
 * verify-db-functions: Checks that critical Supabase RPCs match expected signatures.
 * Usage: npm run db:verify
 */

const PROJECT_REF = "nkfimvovosdehmyyjubn";

// Read token from Claude settings
import { readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

let SB_TOKEN;
try {
  const settings = JSON.parse(
    readFileSync(join(homedir(), ".claude", "settings.json"), "utf-8")
  );
  const supabase = settings?.mcpServers?.supabase;
  const authHeader = supabase?.headers?.Authorization || "";
  SB_TOKEN = authHeader.replace("Bearer ", "");
} catch {
  console.error("Could not read Supabase token from ~/.claude/settings.json");
  process.exit(1);
}

if (!SB_TOKEN) {
  console.error("No Supabase access token found");
  process.exit(1);
}

const CRITICAL_RPCS = [
  {
    name: "apply_segmented_yield_distribution_v5",
    markers: ["v_opening_aum", "ip.current_value", "flat_position_proportional_v6"],
    antiMarkers: ["v_opening_balance_sum"], // Old version marker
  },
  {
    name: "preview_segmented_yield_distribution_v5",
    markers: ["ip.current_value", "calculate_yield_allocations", "canonical_position_proportional"],
    antiMarkers: ["_v5p_bal", "v_opening_balance_sum"], // Old version markers
  },
  {
    name: "calculate_yield_allocations",
    markers: ["ip_base.current_value", "all_relevant_investors", "r_net_final"],
  },
  {
    name: "approve_and_complete_withdrawal",
    markers: ["v_request.settlement_date", "COALESCE"],
    antiMarkers: [], // No anti-markers
  },
  {
    name: "check_historical_lock",
    markers: ["yield_distributions", "effective_date"],
  },
  {
    name: "void_transaction",
    markers: ["check_historical_lock"],
  },
];

async function query(sql) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SB_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: sql }),
    }
  );
  return res.json();
}

async function main() {
  console.log("Verifying critical Supabase RPCs...\n");

  let allOk = true;

  for (const rpc of CRITICAL_RPCS) {
    const result = await query(
      `SELECT prosrc FROM pg_proc WHERE proname = '${rpc.name}' LIMIT 1`
    );

    if (!result?.[0]?.prosrc) {
      console.log(`  MISSING  ${rpc.name}`);
      allOk = false;
      continue;
    }

    const src = result[0].prosrc;
    const missingMarkers = (rpc.markers || []).filter((m) => !src.includes(m));
    const foundAntiMarkers = (rpc.antiMarkers || []).filter((m) => src.includes(m));

    if (missingMarkers.length === 0 && foundAntiMarkers.length === 0) {
      console.log(`  OK       ${rpc.name}`);
    } else {
      allOk = false;
      console.log(`  DRIFT    ${rpc.name}`);
      if (missingMarkers.length > 0) {
        console.log(`           Missing: ${missingMarkers.join(", ")}`);
      }
      if (foundAntiMarkers.length > 0) {
        console.log(`           Stale markers found: ${foundAntiMarkers.join(", ")}`);
      }
    }
  }

  console.log(allOk ? "\nAll RPCs verified." : "\nDRIFT DETECTED — re-deploy affected RPCs.");
  process.exit(allOk ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
