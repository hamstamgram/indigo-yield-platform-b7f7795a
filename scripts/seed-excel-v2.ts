#!/usr/bin/env npx tsx
/**
 * seed-excel-v2.ts
 * Seed the Indigo Yield Platform from the parsed Excel event file.
 *
 * Source: scripts/seed-data/excel-events-v2.json
 * RPCs:
 *   - apply_investor_transaction (deposits/withdrawals)
 *   - apply_backfill_yield (yield events — one per Excel yield event)
 *
 * PRE-REQUISITE: apply_backfill_yield function must exist in the DB.
 * Apply supabase/migrations/20260225_apply_backfill_yield.sql first.
 *
 * Processing order: strict chronological order.
 * For same-date same-fund events: YIELD before FLOW.
 *
 * apply_backfill_yield formula:
 *   recorded_aum = live_positions_sum * (1 + gross_pct)
 *   Delegates fee/IB allocation to calculate_yield_allocations (same as V5).
 *   Uses distribution_type='transaction' to avoid blocking same-date flows.
 */

import { createClient } from "@supabase/supabase-js";
import Decimal from "decimal.js";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

// ---- Config ----

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const EVENTS_FILE = path.join(__dirname, "seed-data", "excel-events-v3.json");
const REPORT_FILE = "/tmp/seed-plan-v2-report.md";
const DRY_RUN = process.env.DRY_RUN === "1";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("ERROR: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ---- Types ----

interface FlowTransaction {
  type: "DEPOSIT" | "WITHDRAWAL" | "DUST_SWEEP";
  investor_name: string;
  investor_uuid: string;
  amount: string | "FULL";
  fee_pct: number | null;
  ib_pct: number | null;
}

interface FlowEvent {
  fund: string;
  fund_id: string;
  event_type: "FLOW";
  date: string;
  aum_after?: string;
  comment?: string;
  description?: string;
  transactions: FlowTransaction[];
}

interface YieldEvent {
  fund: string;
  fund_id: string;
  event_type: "YIELD";
  date: string;
  period_end: string;
  aum_after: string;
  gross_pct: number;
  comment: string;
}

type SeedEvent = FlowEvent | YieldEvent;

interface SeedData {
  admin_id: string;
  fund_ids: Record<string, string>;
  investor_metadata: Record<string, { fee_pct: number | null; ib_pct: number | null }>;
  events: SeedEvent[];
  final_balances: Record<string, Record<string, { name: string; balance: number; as_of: string }>>;
}

// ---- Report ----

interface EventResult {
  date: string;
  fund: string;
  type: string;
  description: string;
  status: "ok" | "error" | "skipped";
  error?: string;
  duration_ms?: number;
}

const reportLines: EventResult[] = [];
let successCount = 0;
let errorCount = 0;
let skipCount = 0;

function log(msg: string): void {
  process.stdout.write(msg + "\n");
}

function logResult(result: EventResult): void {
  reportLines.push(result);
  const icon = result.status === "ok" ? "✓" : result.status === "error" ? "✗" : "-";
  const durationStr = result.duration_ms !== undefined ? ` (${result.duration_ms}ms)` : "";
  log(
    `  ${icon} [${result.fund}] ${result.date} ${result.type}: ${result.description}${durationStr}`
  );
  if (result.error) {
    log(`    ERROR: ${result.error}`);
  }
}

// ---- System mode ----

async function setSystemMode(mode: "backfill" | "live"): Promise<void> {
  if (DRY_RUN) {
    log(`[DRY RUN] Would set system_mode = '${mode}'`);
    return;
  }
  const { error } = await supabase
    .from("system_config")
    .update({ value: JSON.stringify(mode) })
    .eq("key", "system_mode");

  if (error) {
    throw new Error(`Failed to set system_mode='${mode}': ${error.message}`);
  }
  log(`System mode set to '${mode}'`);
}

async function getSystemMode(): Promise<string> {
  const { data, error } = await supabase
    .from("system_config")
    .select("value")
    .eq("key", "system_mode")
    .single();

  if (error || !data) {
    return "unknown";
  }
  // Supabase client already parses JSONB columns; value is already a JS string
  const val = data.value;
  if (typeof val === "string") return val;
  try {
    return JSON.parse(String(val));
  } catch {
    return String(val);
  }
}

// ---- Position lookup ----

async function getInvestorPosition(investorId: string, fundId: string): Promise<Decimal> {
  const { data, error } = await supabase
    .from("investor_positions")
    .select("current_value")
    .eq("investor_id", investorId)
    .eq("fund_id", fundId)
    .eq("is_active", true)
    .single();

  if (error || !data) {
    return new Decimal(0);
  }
  return new Decimal(String(data.current_value));
}

// ---- Position recompute ----

// Recompute investor position after a transaction.
// fn_ledger_drives_position trigger only does UPDATE (not UPSERT),
// so first deposits for new investors need recompute_investor_position
// to create the position row from the ledger.
async function recomputePosition(investorId: string, fundId: string): Promise<void> {
  if (DRY_RUN) return;
  await supabase.rpc("recompute_investor_position", {
    p_investor_id: investorId,
    p_fund_id: fundId,
  });
}

// These accounts never deposit — they only receive FEE_CREDIT / IB_CREDIT transactions.
// fn_ledger_drives_position does UPDATE (not UPSERT), so the first credit doesn't create
// a position row. We call recomputePosition for each after every yield event so they
// compound correctly in subsequent yield calculations.
const YIELD_ONLY_INVESTORS = [
  "b464a3f7-60d5-4bc0-9833-7b413bcc6cae", // Indigo Fees (fees_account)
  "5fc170e2-7a07-4f32-991f-d8b6deec277c", // Alec Beckman (IB)
  "3d606d2e-28cf-41e7-96f2-aeb52551c053", // Alex Jacobs (IB)
  "99e56523-32a6-43e5-b9b3-789992cc347c", // Joel Barbeau (IB)
  "9405071c-0b52-4399-85da-9f1ba9b289c1", // Lars Ahlgreen (IB)
  "f462d9e5-7363-4c82-a144-4e694d2b55da", // Ryan Van Der Wall (IB)
];

// ---- RPC wrappers ----

async function applyDeposit(params: {
  fund_id: string;
  investor_id: string;
  amount: string;
  tx_date: string;
  reference_id: string;
  admin_id: string;
  notes: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (DRY_RUN) {
    return { ok: true };
  }

  const { error } = await supabase.rpc("apply_investor_transaction", {
    p_fund_id: params.fund_id,
    p_investor_id: params.investor_id,
    p_tx_type: "DEPOSIT",
    p_amount: params.amount,
    p_tx_date: params.tx_date,
    p_reference_id: params.reference_id,
    p_admin_id: params.admin_id,
    p_notes: params.notes || null,
    p_purpose: "transaction",
    p_distribution_id: null,
  });

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

async function applyWithdrawal(params: {
  fund_id: string;
  investor_id: string;
  amount: string;
  tx_date: string;
  reference_id: string;
  admin_id: string;
  notes: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (DRY_RUN) {
    return { ok: true };
  }

  const { error } = await supabase.rpc("apply_investor_transaction", {
    p_fund_id: params.fund_id,
    p_investor_id: params.investor_id,
    p_tx_type: "WITHDRAWAL",
    p_amount: params.amount,
    p_tx_date: params.tx_date,
    p_reference_id: params.reference_id,
    p_admin_id: params.admin_id,
    p_notes: params.notes || null,
    p_purpose: "transaction",
    p_distribution_id: null,
  });

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

async function applyBackfillYield(params: {
  fund_id: string;
  event_date: string;
  gross_pct: number;
  admin_id: string;
}): Promise<{ ok: boolean; error?: string; distribution_id?: string }> {
  if (DRY_RUN) {
    return { ok: true };
  }

  // apply_backfill_yield signature: (p_fund_id, p_event_date, p_gross_pct, p_admin_id)
  // Returns uuid (distribution_id)
  const { data, error } = await supabase.rpc("apply_backfill_yield", {
    p_fund_id: params.fund_id,
    p_event_date: params.event_date,
    p_gross_pct: params.gross_pct,
    p_admin_id: params.admin_id,
  });

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true, distribution_id: data as string };
}

// Events are processed in strict chronological order.
// Each YIELD event gets its own apply_backfill_yield call.
// No monthly consolidation — per-event allocation matches Excel per-event yield rows.

// ---- Event processors ----

// Global registry to ensure unique reference_ids across the entire seed run.
// Key: base reference_id without sequence, Value: next sequence number to use.
const globalRefIdCounts = new Map<string, number>();

function buildRefId(type: string, date: string, investorId: string, fundId: string): string {
  const base = `${type.toLowerCase()}-${date}-${investorId.slice(0, 8)}-${fundId.slice(0, 8)}`;
  const seq = (globalRefIdCounts.get(base) ?? 0) + 1;
  globalRefIdCounts.set(base, seq);
  return seq === 1 ? base : `${base}-${seq}`;
}

async function processFlowEvent(ev: FlowEvent, adminId: string): Promise<void> {
  const txCount = ev.transactions.length;
  const desc = ev.description || ev.comment || "";
  log(`\n  [${ev.fund}] ${ev.date} FLOW: ${txCount} transaction(s) | ${desc.slice(0, 80)}`);

  // Track last FULL withdrawal amount so RESIDUAL_FROM_PREV can reference it
  let lastFullWithdrawalAmount: string | null = null;

  const INDIGO_FEES_UUID = "b464a3f7-60d5-4bc0-9833-7b413bcc6cae";

  for (const tx of ev.transactions) {
    const start = Date.now();
    const investorLabel = `${tx.investor_name} (${tx.investor_uuid.slice(0, 8)})`;

    // DUST_SWEEP: Investor exits with a round-number withdrawal.
    // Dust (actual balance minus round amount) transfers to/from Indigo Fees.
    if (tx.type === "DUST_SWEEP") {
      const pos = await getInvestorPosition(tx.investor_uuid, ev.fund_id);
      if (pos.isZero()) {
        logResult({
          date: ev.date,
          fund: ev.fund,
          type: "DUST_SWEEP",
          description: `${investorLabel} position=0, skipped`,
          status: "skipped",
        });
        skipCount++;
        continue;
      }

      const roundAmount = new Decimal(tx.amount);
      const dust = pos.minus(roundAmount);

      // Step 1: Withdraw FULL from investor
      const fullRefId = buildRefId("withdrawal", ev.date, tx.investor_uuid, ev.fund_id);
      const fullOutcome = await applyWithdrawal({
        fund_id: ev.fund_id,
        investor_id: tx.investor_uuid,
        amount: pos.toFixed(18),
        tx_date: ev.date,
        reference_id: fullRefId,
        admin_id: adminId,
        notes: `[SEED] Dust sweep exit, round=${tx.amount}`,
      });

      if (!fullOutcome.ok) {
        logResult({
          date: ev.date,
          fund: ev.fund,
          type: "DUST_SWEEP",
          description: `${investorLabel} FULL withdrawal failed`,
          status: "error",
          error: fullOutcome.error,
          duration_ms: Date.now() - start,
        });
        errorCount++;
        continue;
      }

      // Step 2: Transfer dust to/from Indigo Fees
      if (!dust.isZero()) {
        if (dust.isPositive()) {
          // Normal dust: investor had more than round amount, excess to Indigo Fees
          const dustRefId = buildRefId("deposit", ev.date, INDIGO_FEES_UUID, ev.fund_id);
          const dustResult = await applyDeposit({
            fund_id: ev.fund_id,
            investor_id: INDIGO_FEES_UUID,
            amount: dust.toFixed(18),
            tx_date: ev.date,
            reference_id: dustRefId,
            admin_id: adminId,
            notes: `[SEED] Dust from ${tx.investor_name} exit (round=${tx.amount})`,
          });
          if (dustResult.ok) {
            await recomputePosition(INDIGO_FEES_UUID, ev.fund_id);
          }
          log(
            `    DUST: +${dust.toFixed(10)} to Indigo Fees (${dustResult.ok ? "ok" : dustResult.error})`
          );
        } else {
          // Anti-dust: investor had less than round amount, shortfall from Indigo Fees
          const dustRefId = buildRefId("withdrawal", ev.date, INDIGO_FEES_UUID, ev.fund_id);
          const dustResult = await applyWithdrawal({
            fund_id: ev.fund_id,
            investor_id: INDIGO_FEES_UUID,
            amount: dust.abs().toFixed(18),
            tx_date: ev.date,
            reference_id: dustRefId,
            admin_id: adminId,
            notes: `[SEED] Anti-dust for ${tx.investor_name} exit (round=${tx.amount})`,
          });
          log(
            `    ANTI-DUST: -${dust.abs().toFixed(10)} from Indigo Fees (${dustResult.ok ? "ok" : dustResult.error})`
          );
        }
      }

      logResult({
        date: ev.date,
        fund: ev.fund,
        type: "DUST_SWEEP",
        description: `${investorLabel} round=${tx.amount} dust=${dust.toFixed(10)}`,
        status: "ok",
        duration_ms: Date.now() - start,
      });
      successCount++;
      continue;
    }

    let amount: string;
    if (tx.amount === "FULL") {
      const pos = await getInvestorPosition(tx.investor_uuid, ev.fund_id);
      if (pos.isZero()) {
        logResult({
          date: ev.date,
          fund: ev.fund,
          type: "WITHDRAWAL",
          description: `${investorLabel} FULL (position=0, skipped)`,
          status: "skipped",
        });
        skipCount++;
        continue;
      }
      amount = pos.toFixed(18);
      lastFullWithdrawalAmount = amount;
    } else if (tx.amount === "RESIDUAL_FROM_PREV") {
      if (!lastFullWithdrawalAmount) {
        logResult({
          date: ev.date,
          fund: ev.fund,
          type: tx.type,
          description: `${investorLabel} RESIDUAL_FROM_PREV (no prior FULL, skipped)`,
          status: "skipped",
        });
        skipCount++;
        continue;
      }
      amount = lastFullWithdrawalAmount;
    } else {
      amount = tx.amount;
    }

    // Build unique reference_id. Uses global counter to handle the case where
    // the same investor has multiple transactions of the same type on the same date.
    const refId = buildRefId(tx.type, ev.date, tx.investor_uuid, ev.fund_id);

    let result: EventResult;

    if (tx.type === "DEPOSIT") {
      const outcome = await applyDeposit({
        fund_id: ev.fund_id,
        investor_id: tx.investor_uuid,
        amount,
        tx_date: ev.date,
        reference_id: refId,
        admin_id: adminId,
        notes: `[SEED] ${desc.slice(0, 200)}`,
      });

      if (outcome.ok) {
        await recomputePosition(tx.investor_uuid, ev.fund_id);
      }

      result = {
        date: ev.date,
        fund: ev.fund,
        type: "DEPOSIT",
        description: `${investorLabel} ${amount}`,
        status: outcome.ok ? "ok" : "error",
        error: outcome.error,
        duration_ms: Date.now() - start,
      };
    } else {
      let outcome = await applyWithdrawal({
        fund_id: ev.fund_id,
        investor_id: tx.investor_uuid,
        amount,
        tx_date: ev.date,
        reference_id: refId,
        admin_id: adminId,
        notes: `[SEED] ${desc.slice(0, 200)}`,
      });

      // If withdrawal fails with "Insufficient balance", the Excel amount may include
      // yield that was recorded mid-month but we deferred to month-end.
      // Retry using the actual current position (effectively a full withdrawal).
      if (!outcome.ok && outcome.error?.includes("Insufficient balance")) {
        const actualPos = await getInvestorPosition(tx.investor_uuid, ev.fund_id);
        if (!actualPos.isZero()) {
          const adjustedAmount = actualPos.toFixed(18);
          log(
            `    RETRY: balance mismatch (tried ${amount}, actual ${adjustedAmount}), using actual position`
          );
          outcome = await applyWithdrawal({
            fund_id: ev.fund_id,
            investor_id: tx.investor_uuid,
            amount: adjustedAmount,
            tx_date: ev.date,
            reference_id: refId,
            admin_id: adminId,
            notes: `[SEED adjusted] ${desc.slice(0, 180)}`,
          });
          if (outcome.ok) {
            amount = adjustedAmount;
          }
        }
      }

      result = {
        date: ev.date,
        fund: ev.fund,
        type: "WITHDRAWAL",
        description: `${investorLabel} ${amount}`,
        status: outcome.ok ? "ok" : "error",
        error: outcome.error,
        duration_ms: Date.now() - start,
      };
    }

    logResult(result);
    if (result.status === "ok") {
      successCount++;
    } else {
      errorCount++;
    }
  }
}

async function processIndividualYield(ev: YieldEvent, adminId: string): Promise<void> {
  const start = Date.now();
  log(
    `\n  [${ev.fund}] ${ev.date} YIELD: gross_pct=${ev.gross_pct} aum_after=${ev.aum_after} period_end=${ev.period_end}`
  );

  const outcome = await applyBackfillYield({
    fund_id: ev.fund_id,
    event_date: ev.date,
    gross_pct: ev.gross_pct,
    admin_id: adminId,
  });

  const result: EventResult = {
    date: ev.date,
    fund: ev.fund,
    type: "YIELD",
    description: `gross_pct=${ev.gross_pct} aum_after=${ev.aum_after} period_end=${ev.period_end}`,
    status: outcome.ok ? "ok" : "error",
    error: outcome.error,
    duration_ms: Date.now() - start,
  };

  logResult(result);
  if (result.status === "ok") {
    successCount++;
    // Recompute positions for fee/IB accounts so they compound on subsequent yields.
    // fn_ledger_drives_position does UPDATE (not UPSERT), so without this the first
    // FEE_CREDIT/IB_CREDIT for these accounts would not create a position row.
    for (const investorId of YIELD_ONLY_INVESTORS) {
      await recomputePosition(investorId, ev.fund_id);
    }
  } else {
    errorCount++;
  }
}

// ---- Report writer ----

function writeReport(seedData: SeedData, totalDuration: number): void {
  const lines: string[] = [];
  const now = new Date().toISOString();

  lines.push("# Excel Seed V2 Report");
  lines.push(`Generated: ${now}`);
  lines.push(`DRY RUN: ${DRY_RUN}`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");

  const flowEvents = seedData.events.filter((e) => e.event_type === "FLOW").length;
  const yieldEvents = seedData.events.filter((e) => e.event_type === "YIELD").length;
  const totalTxs = seedData.events
    .filter((e) => e.event_type === "FLOW")
    .reduce((acc, e) => acc + (e as FlowEvent).transactions.length, 0);

  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Total events parsed | ${seedData.events.length} |`);
  lines.push(`| Flow events | ${flowEvents} (${totalTxs} transactions) |`);
  lines.push(`| Yield events | ${yieldEvents} (one apply_backfill_yield call each) |`);
  lines.push(`| Successful | ${successCount} |`);
  lines.push(`| Errors | ${errorCount} |`);
  lines.push(`| Skipped | ${skipCount} |`);
  lines.push(`| Total duration | ${(totalDuration / 1000).toFixed(1)}s |`);
  lines.push("");

  lines.push("## Per-Fund Summary");
  lines.push("");
  lines.push("| Fund | Flow Events | Yield Events | Transactions |");
  lines.push("|------|-------------|--------------|--------------|");

  for (const fund of ["BTC", "ETH", "USDT", "SOL", "XRP"]) {
    const fundEvents = seedData.events.filter((e) => e.fund === fund);
    const fe = fundEvents.filter((e) => e.event_type === "FLOW").length;
    const ye = fundEvents.filter((e) => e.event_type === "YIELD").length;
    const txs = fundEvents
      .filter((e) => e.event_type === "FLOW")
      .reduce((acc, e) => acc + (e as FlowEvent).transactions.length, 0);
    lines.push(`| ${fund} | ${fe} | ${ye} | ${txs} |`);
  }

  lines.push("");
  lines.push("## Event Results");
  lines.push("");
  lines.push("| Date | Fund | Type | Description | Status | Duration |");
  lines.push("|------|------|------|-------------|--------|----------|");

  for (const r of reportLines) {
    const status =
      r.status === "ok" ? "OK" : r.status === "error" ? `ERROR: ${r.error}` : "SKIPPED";
    const dur = r.duration_ms !== undefined ? `${r.duration_ms}ms` : "-";
    const desc = r.description.slice(0, 80).replace(/\|/g, "/");
    lines.push(`| ${r.date} | ${r.fund} | ${r.type} | ${desc} | ${status} | ${dur} |`);
  }

  lines.push("");
  lines.push("## Final Balance Verification (Excel)");
  lines.push("");
  lines.push("Expected final balances from Excel (for manual DB comparison):");
  lines.push("");

  for (const fund of ["BTC", "ETH", "USDT", "SOL", "XRP"]) {
    const balances = seedData.final_balances[fund] || {};
    const entries = Object.entries(balances).filter(([, v]) => v.balance > 0);
    if (entries.length === 0) continue;

    lines.push(`### ${fund} Final Balances (as of ${entries[0]?.[1].as_of})`);
    lines.push("");
    lines.push("| Investor | UUID | Balance |");
    lines.push("|----------|------|---------|");
    for (const [uuid, info] of entries) {
      lines.push(`| ${info.name} | ${uuid.slice(0, 8)} | ${info.balance.toFixed(6)} |`);
    }
    lines.push("");
  }

  if (errorCount > 0) {
    lines.push("## Errors");
    lines.push("");
    for (const r of reportLines.filter((r) => r.status === "error")) {
      lines.push(`- **${r.date} [${r.fund}] ${r.type}**: ${r.error}`);
    }
    lines.push("");
  }

  fs.writeFileSync(REPORT_FILE, lines.join("\n"));
  log(`\nReport written to: ${REPORT_FILE}`);
}

// ---- Main ----

async function main(): Promise<void> {
  const startTime = Date.now();

  log("=== Indigo Excel Seed V2 ===");
  log(`Source: ${EVENTS_FILE}`);
  log(`DRY_RUN: ${DRY_RUN}`);
  log("");

  // Load event data
  const raw = fs.readFileSync(EVENTS_FILE, "utf-8");
  const seedData: SeedData = JSON.parse(raw);
  const { admin_id, events } = seedData;

  log(`Loaded ${events.length} events`);
  log(`Admin ID: ${admin_id}`);
  log("");

  // Verify DB is accessible
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, first_name")
    .eq("id", admin_id)
    .single();

  if (profileError || !profile) {
    log(`ERROR: Cannot verify admin profile ${admin_id}: ${profileError?.message}`);
    process.exit(1);
  }
  log(`Admin verified: ${profile.first_name}`);

  // Check current system mode
  const currentMode = await getSystemMode();
  log(`Current system_mode: ${currentMode}`);

  // apply_backfill_yield uses distribution_type='transaction' so same-date flows are not blocked.
  // No need to disable check_historical_lock.
  log("");

  // Set backfill mode
  await setSystemMode("backfill");

  // Sort all events strictly chronologically.
  // For same-date same-fund events: YIELD before FLOW (yield applied first, then deposit/withdrawal).
  const sortedEvents = [...events].sort((a, b) => {
    const dateCmp = a.date.localeCompare(b.date);
    if (dateCmp !== 0) return dateCmp;
    const fundCmp = a.fund.localeCompare(b.fund);
    if (fundCmp !== 0) return fundCmp;
    // Same date + fund: YIELD before FLOW
    if (a.event_type === "YIELD" && b.event_type === "FLOW") return -1;
    if (a.event_type === "FLOW" && b.event_type === "YIELD") return 1;
    return 0;
  });

  const flowCount = sortedEvents.filter((e) => e.event_type === "FLOW").length;
  const yieldCount = sortedEvents.filter((e) => e.event_type === "YIELD").length;
  log(
    `Events to process: ${sortedEvents.length} (${flowCount} flow, ${yieldCount} yield — one apply_backfill_yield call per yield event)`
  );
  log("");

  let fatalError = false;

  try {
    log(`Processing ${sortedEvents.length} events in chronological order...\n`);

    for (const ev of sortedEvents) {
      if (ev.event_type === "FLOW") {
        await processFlowEvent(ev as FlowEvent, admin_id);
      } else if (ev.event_type === "YIELD") {
        await processIndividualYield(ev as YieldEvent, admin_id);
      }

      if (errorCount > 20) {
        log("\nERROR: Too many errors (>20), stopping seed process");
        fatalError = true;
        break;
      }
    }
  } finally {
    await setSystemMode("live");
  }

  const totalDuration = Date.now() - startTime;

  log("\n=== Seed Complete ===");
  log(`Success: ${successCount}`);
  log(`Errors: ${errorCount}`);
  log(`Skipped: ${skipCount}`);
  log(`Duration: ${(totalDuration / 1000).toFixed(1)}s`);

  if (fatalError) {
    log("\nWARNING: Seed aborted due to too many errors");
  }

  writeReport(seedData, totalDuration);

  if (errorCount > 0) {
    log(`\nSome events failed. Check report at ${REPORT_FILE}`);
    process.exit(1);
  }
}

main().catch((err: Error) => {
  console.error("Fatal error:", err);
  setSystemMode("live").catch(() => {});
  process.exit(1);
});
