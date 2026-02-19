import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL as string;
const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY) as string;

const supabase = createClient(supabaseUrl, supabaseKey);

const closingAums = JSON.parse(
  fs.readFileSync(path.join(__dirname, "seed-data/closing-aums.json"), "utf8")
);

async function main() {
  // Sign in as admin for RLS access
  const { error: authErr } = await supabase.auth.signInWithPassword({
    email: "adriel@indigo.fund",
    password: "TestAdmin2026!",
  });
  if (authErr) {
    console.error("Auth failed:", authErr.message);
    return;
  }

  const { data: funds } = await supabase
    .from("funds")
    .select("id, asset")
    .in("asset", ["BTC", "ETH", "SOL", "USDT", "XRP"]);

  if (!funds) {
    console.error("No funds");
    return;
  }

  const assetByFundId = new Map<string, string>();
  for (const f of funds) {
    assetByFundId.set(f.id, f.asset);
  }

  const { data: dists, error: distErr } = await supabase
    .from("yield_distributions")
    .select(
      "id, fund_id, period_start, period_end, recorded_aum, previous_aum, gross_yield, net_yield, total_fees, total_ib, dust_amount, summary_json"
    )
    .eq("is_voided", false)
    .eq("calculation_method", "segmented_v5")
    .order("period_end", { ascending: true });

  if (distErr) {
    console.error("Query error:", distErr.message);
    return;
  }
  if (!dists || dists.length === 0) {
    console.error("No distributions found");
    return;
  }

  console.log(`Found ${dists.length} V5 distributions\n`);
  console.log("=== V5 Distributions vs Excel totalYield ===\n");

  const byFund: Record<string, { v5Total: number; excelTotal: number; months: string[] }> = {};

  for (const d of dists) {
    const asset = assetByFundId.get(d.fund_id);
    if (!asset) continue;
    const month = d.period_end.substring(0, 7);

    const excelMatch = closingAums.find((ca: any) => ca.fund === asset && ca.month === month);
    const excelYield = excelMatch ? excelMatch.totalYield : 0;
    const v5Gross = Number(d.gross_yield);
    const diff = v5Gross - excelYield;
    const pctOver = excelYield !== 0 ? ((diff / excelYield) * 100).toFixed(1) : "inf";

    const segments = d.summary_json?.segments || [];
    const segSummary = segments
      .map(
        (s: any) =>
          `S${s.seg_idx}(y=${Number(s.yield).toFixed(6)} ob=${Number(s.opening_balance_sum).toFixed(4)} fl=${Number(s.flows).toFixed(4)} ca=${Number(s.closing_aum).toFixed(4)}${s.skipped ? " SKIP" : ""})`
      )
      .join(" ");

    const matchLabel = Math.abs(diff) < 0.001 ? "OK" : diff > 0 ? "OVER" : "UNDER";

    console.log(
      `${asset}:${month} | V5=${v5Gross.toFixed(8)} | Excel=${excelYield.toFixed(8)} | diff=${diff.toFixed(8)} (${pctOver}%) ${matchLabel}`
    );
    console.log(
      `  opening=${Number(d.previous_aum).toFixed(4)} recorded=${Number(d.recorded_aum).toFixed(4)}`
    );
    if (segments.length <= 5) {
      console.log(`  ${segSummary}`);
    } else {
      console.log(
        `  ${segments.length} segments (first 3): ${segments
          .slice(0, 3)
          .map((s: any) => `S${s.seg_idx}(y=${Number(s.yield).toFixed(4)})`)
          .join(" ")}`
      );
    }

    if (!byFund[asset]) byFund[asset] = { v5Total: 0, excelTotal: 0, months: [] };
    byFund[asset].v5Total += v5Gross;
    byFund[asset].excelTotal += excelYield;
    byFund[asset].months.push(month);
  }

  console.log("\n=== FUND TOTALS ===");
  for (const [asset, data] of Object.entries(byFund).sort()) {
    const diff = data.v5Total - data.excelTotal;
    const pctOver = data.excelTotal !== 0 ? ((diff / data.excelTotal) * 100).toFixed(1) : "inf";
    console.log(
      `${asset}: V5=${data.v5Total.toFixed(6)} Excel=${data.excelTotal.toFixed(6)} diff=${diff.toFixed(6)} (${pctOver}%) months=${data.months.length}`
    );
  }
}

main().catch(console.error);
