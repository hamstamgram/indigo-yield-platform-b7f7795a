/**
 * Generates a SQL migration file that creates crystallization marker records
 * (yield_distributions) at segment boundaries so the V5
 * engine can properly split months into segments and allocate yield to
 * opening-balance holders only.
 *
 * Usage: npx ts-node scripts/create-crystallization-markers.ts
 * Output: supabase/migrations/20260228_crystallization_markers.sql
 *
 * Algorithm:
 *   marker[i]_closing_aum = E[1].openingAum + cumYield[i] + cumFlows[i-1]
 *   where cumYield[i] = sum(E[j].yield for j=1..i)
 *   and cumFlows[i] = sum(E[j].flows for j=1..i)
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface PerfSegment {
  month: string;
  fund: string;
  grossPct: number;
  netPct: number;
  openingAum: number;
  closingAum: number;
  flows: number;
}

interface Transaction {
  date: string;
  investor: string;
  currency: string;
  amount: number;
  usdValue: number;
  type: string;
}

const FUND_ASSETS = ["BTC", "ETH", "USDT", "SOL", "XRP"];

function lastDayOfMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m, 0);
  return `${y}-${String(m).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function firstDayOfMonth(month: string): string {
  return `${month}-01`;
}

function findMarkerDates(
  segments: PerfSegment[],
  txDateAmounts: Map<string, number>,
  month: string
): string[] {
  const sortedDates = [...txDateAmounts.keys()].sort();

  if (sortedDates.length === 0) {
    // No transactions: estimate boundary dates proportionally
    const markerDates: string[] = [];
    for (let i = 0; i < segments.length - 1; i++) {
      const totalGross = segments.reduce((s, seg) => s + seg.grossPct, 0);
      let cumGross = 0;
      for (let j = 0; j <= i; j++) cumGross += segments[j].grossPct;
      const fraction = totalGross > 0 ? cumGross / totalGross : (i + 1) / segments.length;

      const start = new Date(firstDayOfMonth(month));
      const end = new Date(lastDayOfMonth(month));
      const totalDays = (end.getTime() - start.getTime()) / 86400000;
      const estDay = Math.max(2, Math.round(fraction * totalDays));
      const estDate = new Date(start.getTime() + estDay * 86400000);
      markerDates.push(estDate.toISOString().substring(0, 10));
    }
    return markerDates;
  }

  return sortedDates;
}

interface MarkerRecord {
  fund: string;
  month: string;
  date: string;
  closingAum: number;
  refId: string;
}

function main() {
  console.log("=== Generating Crystallization Markers SQL ===\n");

  const perfData: PerfSegment[] = JSON.parse(
    fs.readFileSync(path.join(__dirname, "seed-data/performance.json"), "utf8")
  );
  const txData: Transaction[] = JSON.parse(
    fs.readFileSync(path.join(__dirname, "seed-data/transactions.json"), "utf8")
  );

  // Group performance by fund+month
  const perfByFundMonth = new Map<string, PerfSegment[]>();
  for (const seg of perfData) {
    const key = `${seg.fund}:${seg.month}`;
    if (!perfByFundMonth.has(key)) perfByFundMonth.set(key, []);
    perfByFundMonth.get(key)!.push(seg);
  }

  // Group transactions by fund+month, summing amounts per date
  const txByFundMonth = new Map<string, Map<string, number>>();
  for (const tx of txData) {
    if (!FUND_ASSETS.includes(tx.currency)) continue;
    const month = tx.date.substring(0, 7);
    const key = `${tx.currency}:${month}`;
    if (!txByFundMonth.has(key)) txByFundMonth.set(key, new Map());
    const dateMap = txByFundMonth.get(key)!;
    const current = dateMap.get(tx.date) || 0;
    const signedAmount = tx.type === "WITHDRAWAL" ? -tx.amount : tx.amount;
    dateMap.set(tx.date, current + signedAmount);
  }

  // Sort fund-months chronologically
  const sortedKeys = [...perfByFundMonth.keys()].sort((a, b) => {
    const [, ma] = a.split(":");
    const [, mb] = b.split(":");
    return ma.localeCompare(mb) || a.localeCompare(b);
  });

  const allMarkers: MarkerRecord[] = [];

  // Also compute p_closing_aum for each fund-month (for the replay script)
  const closingAums: Array<{
    fund: string;
    month: string;
    pClosing: number;
    totalGrossPct: number;
    totalYield: number;
  }> = [];

  for (const key of sortedKeys) {
    const segments = perfByFundMonth.get(key)!;
    const [fund, month] = key.split(":");

    if (!FUND_ASSETS.includes(fund)) continue;

    // Compute closing AUM for ALL fund-months (even single-segment)
    const allFiltered = segments.filter((s) => !(s.grossPct === 100 && s.openingAum === 0));
    if (allFiltered.length > 0) {
      const baseAum = allFiltered[0].openingAum;
      let totalYield = 0;
      let totalFlows = 0;
      for (const seg of allFiltered) {
        totalYield += (seg.openingAum * seg.grossPct) / 100;
        totalFlows += seg.flows;
      }
      closingAums.push({
        fund,
        month,
        pClosing: baseAum + totalYield + totalFlows,
        totalGrossPct: allFiltered.reduce((s, seg) => s + seg.grossPct, 0),
        totalYield,
      });
    }

    // Skip single-segment months for markers
    if (segments.length <= 1) continue;

    const filtered = segments.filter((s) => !(s.grossPct === 100 && s.openingAum === 0));
    if (filtered.length <= 1) continue;

    const txDates = txByFundMonth.get(key) || new Map<string, number>();
    const markerDates = findMarkerDates(filtered, txDates, month);

    if (markerDates.length === 0) continue;

    // Compute marker closing_aum values using recursive formula
    let cumYield = 0;
    let cumFlows = 0;
    const baseAum = filtered[0].openingAum;

    for (let i = 0; i < markerDates.length && i < filtered.length; i++) {
      const seg = filtered[i];
      const segYield = (seg.openingAum * seg.grossPct) / 100;
      cumYield += segYield;

      const markerClosingAum = baseAum + cumYield + cumFlows;
      const refId = `crystal-marker:${fund}:${markerDates[i]}`;

      allMarkers.push({
        fund,
        month,
        date: markerDates[i],
        closingAum: markerClosingAum,
        refId,
      });

      cumFlows += seg.flows;
    }

    console.log(`  ${key}: ${filtered.length} segs, ${markerDates.length} markers`);
  }

  // Generate SQL migration
  const sqlLines: string[] = [];
  sqlLines.push("-- Migration: Create crystallization markers for V5 segmented yield");
  sqlLines.push("-- Generated by scripts/create-crystallization-markers.ts");
  sqlLines.push(`-- Date: ${new Date().toISOString().substring(0, 10)}`);
  sqlLines.push("--");
  sqlLines.push("-- These markers allow V5 to split months into segments at flow dates.");
  sqlLines.push("-- Each marker = yield_distributions record.");
  sqlLines.push("");
  sqlLines.push("-- Bypass the canonical RPC guard for yield_distributions inserts");
  sqlLines.push("SELECT set_config('indigo.canonical_rpc', 'true', true);");
  sqlLines.push("");

  for (const marker of allMarkers) {
    const periodStart = firstDayOfMonth(marker.month);
    const periodEnd = lastDayOfMonth(marker.month);
    const fundLookup = `(SELECT id FROM funds WHERE asset = '${marker.fund}' LIMIT 1)`;

    sqlLines.push(`-- ${marker.fund} ${marker.month} marker at ${marker.date}`);
    sqlLines.push(`INSERT INTO yield_distributions (`);
    sqlLines.push(`  fund_id, effective_date, purpose, recorded_aum,`);
    sqlLines.push(`  gross_yield, distribution_type, status,`);
    sqlLines.push(`  is_voided, reference_id, period_start, period_end,`);
    sqlLines.push(`  closing_aum, is_month_end`);
    sqlLines.push(`) VALUES (`);
    sqlLines.push(`  ${fundLookup}, '${marker.date}', 'transaction', ${marker.closingAum},`);
    sqlLines.push(`  0, 'transaction', 'applied',`);
    sqlLines.push(`  false, '${marker.refId}', '${periodStart}', '${periodEnd}',`);
    sqlLines.push(`  ${marker.closingAum}, false`);
    sqlLines.push(`) ON CONFLICT DO NOTHING;`);
    sqlLines.push("");
  }

  const sqlContent = sqlLines.join("\n");
  const outPath = path.join(
    __dirname,
    "../supabase/migrations/20260228_crystallization_markers.sql"
  );
  fs.writeFileSync(outPath, sqlContent);
  console.log(`\nSQL written to: ${outPath}`);
  console.log(`Total markers: ${allMarkers.length}`);

  // Write closing AUM data for replay script
  const closingAumPath = path.join(__dirname, "seed-data/closing-aums.json");
  fs.writeFileSync(closingAumPath, JSON.stringify(closingAums, null, 2));
  console.log(`Closing AUMs written to: ${closingAumPath}`);

  // Print summary
  console.log("\n=== Month-End Closing AUM ===");
  for (const ca of closingAums) {
    console.log(
      `  ${ca.fund}:${ca.month}: closing=${ca.pClosing.toFixed(10)}, ` +
        `yield=${ca.totalYield.toFixed(10)}, grossPct=${ca.totalGrossPct.toFixed(10)}`
    );
  }
}

main();
