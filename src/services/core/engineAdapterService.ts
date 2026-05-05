/**
 * Engine Adapter Service
 *
 * Bridges the pure indigo-engine to Supabase.
 * - Writes events to the database
 * - Replays events to compute state
 * - Updates materialized state after writes
 */

import { supabase } from "@/integrations/supabase/client";
import { parseFinancial, toFinancialString } from "@/utils/financial";
import type {
  EngineEvent,
  FundState,
  DistributionResult,
} from "../../../packages/indigo-engine/src/types";
import {
  createFundState,
  replayEvents as engineReplay,
  applyEvent as engineApply,
  previewDistribution as enginePreview,
} from "../../../packages/indigo-engine/src/engine";

// ─── Read Operations ──────────────────────────────────────────

/**
 * Load all events for a fund from the database, ordered by sequence.
 */
export async function loadEvents(fundId: string): Promise<EngineEvent[]> {
  const { data, error } = await supabase
    .from("engine_events")
    .select("*")
    .eq("fund_id", fundId)
    .order("sequence", { ascending: true });

  if (error) throw new Error(`Failed to load events: ${error.message}`);

  return (data || []).map(rowToEvent);
}

function rowToEvent(row: Record<string, unknown>): EngineEvent {
  const base = {
    id: row.id as string,
    fundId: row.fund_id as string,
    eventType: row.event_type as EngineEvent["eventType"],
    date: row.event_date as string,
    sequence: row.sequence as number,
  };

  const payload = row.payload as Record<string, unknown>;

  return {
    ...base,
    ...payload,
  } as EngineEvent;
}

/**
 * Get the current fund state (from materialized view or computed).
 */
export async function getFundState(fundId: string): Promise<FundState | null> {
  const { data: fund } = await supabase
    .from("funds")
    .select("id, code, asset")
    .eq("id", fundId)
    .maybeSingle();

  if (!fund) return null;

  const { data: state } = await supabase
    .from("engine_state")
    .select("*")
    .eq("fund_id", fundId)
    .maybeSingle();

  if (!state) {
    return createFundState(fundId, fund.code, fund.asset);
  }

  const { data: balances } = await supabase
    .from("engine_investor_balances")
    .select("*")
    .eq("fund_id", fundId);

  const investors = new Map();
  for (const b of balances || []) {
    investors.set(b.investor_id, {
      investorId: b.investor_id,
      investorName: b.investor_name,
      balance: b.balance.toString(),
      feePct: b.fee_pct.toString(),
      ibPct: b.ib_pct.toString(),
      ibId: b.ib_id,
      ibName: b.ib_name,
      accountType: b.account_type,
    });
  }

  return {
    fundId,
    fundCode: fund.code,
    fundAsset: fund.asset,
    totalAUM: state.total_aum.toString(),
    investors,
    lastSequence: state.last_sequence,
    lastDate: state.last_event_date,
  };
}

/**
 * Compute state from events (full replay).
 * Used for reconciliation checks.
 */
export async function computeStateFromEvents(fundId: string): Promise<FundState> {
  const events = await loadEvents(fundId);

  const { data: fund } = await supabase
    .from("funds")
    .select("code, asset")
    .eq("id", fundId)
    .maybeSingle();

  return engineReplay(fundId, fund?.code || "", fund?.asset || "", events);
}

// ─── Write Operations ─────────────────────────────────────────

/**
 * Append a deposit event and update materialized state.
 */
export async function recordDeposit(params: {
  fundId: string;
  investorId: string;
  investorName: string;
  amount: string;
  feePct: string;
  ibPct: string;
  ibId?: string;
  ibName?: string;
  date: string;
}): Promise<FundState> {
  const state = await getFundState(params.fundId);
  if (!state) throw new Error(`Fund ${params.fundId} not found`);

  const sequence = state.lastSequence + 1;

  const event: EngineEvent = {
    id: crypto.randomUUID(),
    fundId: params.fundId,
    eventType: "DEPOSIT",
    date: params.date,
    sequence,
    investorId: params.investorId,
    investorName: params.investorName,
    amount: params.amount,
    feePct: params.feePct,
    ibPct: params.ibPct,
    ibId: params.ibId,
    ibName: params.ibName,
  } as EngineEvent;

  await persistEvent(event);
  const newState = engineApply(state, event);
  await updateMaterializedState(newState);

  return newState;
}

/**
 * Record a yield record event and compute distributions.
 */
export async function recordYield(params: {
  fundId: string;
  recordedAUM: string;
  purpose: "transaction" | "reporting";
  date: string;
}): Promise<{ state: FundState; distribution: DistributionResult }> {
  const state = await getFundState(params.fundId);
  if (!state) throw new Error(`Fund ${params.fundId} not found`);

  const sequence = state.lastSequence + 1;

  const event: EngineEvent = {
    id: crypto.randomUUID(),
    fundId: params.fundId,
    eventType: "YIELD_RECORD",
    date: params.date,
    sequence,
    recordedAUM: params.recordedAUM,
    purpose: params.purpose,
  } as EngineEvent;

  const distribution = enginePreview(state, event);

  await persistEvent(event);
  const newState = engineApply(state, event);
  await updateMaterializedState(newState);

  return { state: newState, distribution };
}

/**
 * Preview a yield distribution without persisting.
 */
export async function previewYield(params: {
  fundId: string;
  recordedAUM: string;
  purpose: "transaction" | "reporting";
  date: string;
}): Promise<DistributionResult> {
  const state = await getFundState(params.fundId);
  if (!state) throw new Error(`Fund ${params.fundId} not found`);

  const event: EngineEvent = {
    id: "preview",
    fundId: params.fundId,
    eventType: "YIELD_RECORD",
    date: params.date,
    sequence: state.lastSequence + 1,
    recordedAUM: params.recordedAUM,
    purpose: params.purpose,
  } as EngineEvent;

  return enginePreview(state, event);
}

/**
 * Reverse an event (void).
 */
export async function reverseEvent(params: {
  fundId: string;
  originalEventId: string;
  reason: string;
  date: string;
}): Promise<FundState> {
  const state = await getFundState(params.fundId);
  if (!state) throw new Error(`Fund ${params.fundId} not found`);

  const sequence = state.lastSequence + 1;

  const event: EngineEvent = {
    id: crypto.randomUUID(),
    fundId: params.fundId,
    eventType: "REVERSE",
    date: params.date,
    sequence,
    originalEventId: params.originalEventId,
    reason: params.reason,
  } as EngineEvent;

  await persistEvent(event);

  // Recompute full state from all events (the REVERSE excludes the original)
  const newState = await computeStateFromEvents(params.fundId);
  await updateMaterializedState(newState);

  return newState;
}

/**
 * Reconcile: compare materialized state against event replay.
 * Returns true if states match.
 */
export async function reconcileState(fundId: string): Promise<{
  matches: boolean;
  materialized: FundState | null;
  computed: FundState;
}> {
  const materialized = await getFundState(fundId);
  const computed = await computeStateFromEvents(fundId);

  const matches =
    materialized?.totalAUM === computed.totalAUM &&
    materialized?.lastSequence === computed.lastSequence &&
    materialized?.investors.size === computed.investors.size;

  return { matches, materialized, computed };
}

// ─── Internal ─────────────────────────────────────────────────

async function persistEvent(event: EngineEvent): Promise<void> {
  const { error } = await supabase.from("engine_events").insert({
    id: event.id,
    fund_id: event.fundId,
    event_type: event.eventType,
    sequence: event.sequence,
    event_date: event.date,
    payload: extractPayload(event),
  });

  if (error) throw new Error(`Failed to persist event: ${error.message}`);
}

function extractPayload(event: EngineEvent): Record<string, unknown> {
  const { id, fundId, eventType, date, sequence, ...rest } = event as Record<string, unknown>;
  return rest;
}

async function updateMaterializedState(state: FundState): Promise<void> {
  // Upsert engine state
  const { error: stateError } = await supabase.from("engine_state").upsert({
    fund_id: state.fundId,
    total_aum: parseFinancial(state.totalAUM).toNumber(),
    last_sequence: state.lastSequence,
    last_event_date: state.lastDate,
    updated_at: new Date().toISOString(),
  });

  if (stateError) throw new Error(`Failed to update state: ${stateError.message}`);

  // Upsert investor balances
  const balanceRows = Array.from(state.investors.values()).map((inv) => ({
    fund_id: state.fundId,
    investor_id: inv.investorId,
    investor_name: inv.investorName,
    balance: parseFinancial(inv.balance).toNumber(),
    fee_pct: parseFinancial(inv.feePct).toNumber(),
    ib_pct: parseFinancial(inv.ibPct).toNumber(),
    ib_id: inv.ibId,
    ib_name: inv.ibName,
    account_type: inv.accountType,
    updated_at: new Date().toISOString(),
  }));

  if (balanceRows.length > 0) {
    const { error: balanceError } = await supabase
      .from("engine_investor_balances")
      .upsert(balanceRows);

    if (balanceError) throw new Error(`Failed to update balances: ${balanceError.message}`);
  }
}
