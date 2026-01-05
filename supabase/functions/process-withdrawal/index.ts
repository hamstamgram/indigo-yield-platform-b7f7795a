/**
 * Supabase Edge Function: process-withdrawal
 *
 * Rules:
 * - Creates a row in public.withdrawal_requests only (no ledger writes).
 * - Uses public.can_withdraw(...) for availability checks.
 * - Any extra input fields are stored in withdrawal_requests.notes as JSON text.
 * - Monetary values are handled as numeric(28,10) strings (no float math).
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type JsonObject = Record<string, unknown>;

// Secure CORS configuration
const allowedOrigins = Deno.env.get("ALLOWED_ORIGINS")?.split(",") || [];
const corsHeaders = (origin: string | null) => ({
  "Access-Control-Allow-Origin":
    origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0] || "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-csrf-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
});

interface NormalizedWithdrawalRequest {
  investorId: string;
  fundId: string;
  withdrawalType: "full" | "partial";
  requestedAmount28_10: string;
  requestDateIso: string;
  notesJson: string | null;
  adminNotes: string | null;
}

const SCALE_28_10 = 10_000_000_000n;

function isRecord(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getStringField(
  obj: JsonObject,
  keys: string[],
  opts: { required?: boolean } = {}
): string | null {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  if (opts.required) {
    throw new Error(`Missing required field: ${keys[0]}`);
  }
  return null;
}

function pow10BigInt(exp: number): bigint {
  if (exp < 0) throw new Error("pow10BigInt exp must be >= 0");
  let result = 1n;
  for (let i = 0; i < exp; i += 1) {
    result *= 10n;
  }
  return result;
}

function parseNumeric28_10(input: string): bigint {
  const raw = input.trim();
  const match = raw.match(/^([+-]?)(\d+(?:\.\d+)?)(?:[eE]([+-]?\d+))?$/);
  if (!match) {
    throw new Error("Invalid amount format. Pass a decimal string.");
  }
  const sign = match[1] === "-" ? -1n : 1n;
  const mantissa = match[2];
  const exponent = match[3] ? Number(match[3]) : 0;

  const dotIndex = mantissa.indexOf(".");
  const decimalDigits = dotIndex >= 0 ? mantissa.length - dotIndex - 1 : 0;
  const digits = mantissa.replace(".", "");
  const digitsBig = BigInt(digits);

  const exponentOffset = exponent + 10 - decimalDigits;
  if (exponentOffset >= 0) {
    return sign * digitsBig * pow10BigInt(exponentOffset);
  }

  const divisor = pow10BigInt(-exponentOffset);
  const remainder = digitsBig % divisor;
  if (remainder !== 0n) {
    throw new Error("Amount has more than 10 decimal places.");
  }
  return sign * (digitsBig / divisor);
}

function formatNumeric28_10(value: bigint): string {
  const sign = value < 0n ? "-" : "";
  const abs = value < 0n ? -value : value;
  const integerPart = abs / SCALE_28_10;
  const fractionPart = abs % SCALE_28_10;
  return `${sign}${integerPart.toString()}.${fractionPart.toString().padStart(10, "0")}`;
}

function normalizeAmountTo28_10String(input: unknown): string {
  if (typeof input === "string") {
    return formatNumeric28_10(parseNumeric28_10(input));
  }
  if (typeof input === "number") {
    return formatNumeric28_10(parseNumeric28_10(String(input)));
  }
  throw new Error("requested_amount must be provided as a decimal string.");
}

function startOfUtcDayIso(now: Date): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0)).toISOString();
}

function startOfUtcMonthIso(now: Date): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0)).toISOString();
}

async function isAdmin(supabase: any, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to check admin role: ${error.message}`);
  }
  return Boolean(data);
}

async function getWithdrawalTotalsScaled28_10(
  supabase: any,
  investorId: string,
  fundId: string,
  now: Date
): Promise<{ todayTotal: bigint; monthTotal: bigint }> {
  const statuses = ["pending", "approved", "processing", "completed"];

  const { data: todayRows, error: todayError } = await supabase
    .from("withdrawal_requests")
    .select("requested_amount")
    .eq("investor_id", investorId)
    .eq("fund_id", fundId)
    .in("status", statuses)
    .gte("request_date", startOfUtcDayIso(now));

  if (todayError) {
    throw new Error(`Failed to load daily withdrawals: ${todayError.message}`);
  }

  const { data: monthRows, error: monthError } = await supabase
    .from("withdrawal_requests")
    .select("requested_amount")
    .eq("investor_id", investorId)
    .eq("fund_id", fundId)
    .in("status", statuses)
    .gte("request_date", startOfUtcMonthIso(now));

  if (monthError) {
    throw new Error(`Failed to load monthly withdrawals: ${monthError.message}`);
  }

  const sum = (rows: any[] | null): bigint => {
    let total = 0n;
    for (const row of rows ?? []) {
      const v = row?.requested_amount;
      if (typeof v === "string") total += parseNumeric28_10(v);
      else if (typeof v === "number") total += parseNumeric28_10(String(v));
    }
    return total;
  };

  return { todayTotal: sum(todayRows), monthTotal: sum(monthRows) };
}

async function normalizeRequestBody(body: unknown, now: Date): Promise<NormalizedWithdrawalRequest> {
  if (!isRecord(body)) {
    throw new Error("Request body must be a JSON object.");
  }

  const investorId =
    getStringField(body, ["investor_id", "investorId"], { required: true }) ?? "";
  const fundId = getStringField(body, ["fund_id", "fundId"], { required: true }) ?? "";

  const withdrawalTypeRaw =
    getStringField(body, ["withdrawal_type", "withdrawalType"]) ?? "partial";
  const withdrawalType: "full" | "partial" = withdrawalTypeRaw === "full" ? "full" : "partial";

  const amountRaw = body["requested_amount"] ?? body["requestedAmount"] ?? body["amount"];
  const requestedAmount28_10 = normalizeAmountTo28_10String(amountRaw);
  if (parseNumeric28_10(requestedAmount28_10) <= 0n) {
    throw new Error("requested_amount must be greater than 0.");
  }

  const requestDateIso = getStringField(body, ["request_date", "requestDate"]) ?? now.toISOString();
  const notes = getStringField(body, ["notes", "note", "reason"]);
  const adminNotes = getStringField(body, ["admin_notes", "adminNotes"]);

  const reservedKeys = new Set([
    "investor_id",
    "investorId",
    "fund_id",
    "fundId",
    "withdrawal_type",
    "withdrawalType",
    "requested_amount",
    "requestedAmount",
    "amount",
    "request_date",
    "requestDate",
    "notes",
    "note",
    "reason",
    "admin_notes",
    "adminNotes",
  ]);

  const extras: JsonObject = {};
  for (const [key, value] of Object.entries(body)) {
    if (!reservedKeys.has(key)) extras[key] = value;
  }

  const notesPayload: JsonObject = {};
  if (notes) notesPayload.user_note = notes;
  if (Object.keys(extras).length > 0) notesPayload.extra = extras;

  return {
    investorId,
    fundId,
    withdrawalType,
    requestedAmount28_10,
    requestDateIso,
    notesJson: Object.keys(notesPayload).length > 0 ? JSON.stringify(notesPayload) : null,
    adminNotes,
  };
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  const headers = corsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ success: false, error: "Method not allowed" }), {
      headers: { ...headers, "Content-Type": "application/json" },
      status: 405,
    });
  }

  try {
    const csrfToken = req.headers.get("x-csrf-token");
    if (!csrfToken || csrfToken.length < 32) {
      return new Response(JSON.stringify({ success: false, error: "Invalid CSRF token" }), {
        headers: { ...headers, "Content-Type": "application/json" },
        status: 403,
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !serviceKey) {
      throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    }

    const supabaseClient = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }
    const token = authHeader.replace(/^Bearer\\s+/i, "").trim();

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const now = new Date();
    const normalized = await normalizeRequestBody(await req.json(), now);

    if (normalized.investorId !== user.id) {
      const admin = await isAdmin(supabaseClient, user.id);
      if (!admin) {
        throw new Error("Unauthorized to create withdrawal request for this investor");
      }
    }

    const { data: investorProfile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("id, status")
      .eq("id", normalized.investorId)
      .single();

    if (profileError) {
      throw new Error(`Failed to load investor profile: ${profileError.message}`);
    }
    if (!investorProfile) {
      throw new Error("Investor account not found");
    }
    if (investorProfile.status !== "active") {
      throw new Error("Investor account is not active");
    }

    const { data: canWithdrawResult, error: canWithdrawError } = await supabaseClient.rpc("can_withdraw", {
      p_investor_id: normalized.investorId,
      p_fund_id: normalized.fundId,
      p_amount: normalized.requestedAmount28_10,
    });

    if (canWithdrawError) {
      throw new Error(`Withdrawal eligibility check failed: ${canWithdrawError.message}`);
    }
    if (!canWithdrawResult?.can_withdraw) {
      return new Response(
        JSON.stringify({
          success: false,
          error: canWithdrawResult?.reason ?? "Withdrawal not permitted",
          details: canWithdrawResult ?? null,
        }),
        { headers: { ...headers, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const { todayTotal, monthTotal } = await getWithdrawalTotalsScaled28_10(
      supabaseClient,
      normalized.investorId,
      normalized.fundId,
      now
    );

    const requestedScaled = parseNumeric28_10(normalized.requestedAmount28_10);
    const compliance = {
      today_total: formatNumeric28_10(todayTotal),
      month_total: formatNumeric28_10(monthTotal),
      today_total_after: formatNumeric28_10(todayTotal + requestedScaled),
      month_total_after: formatNumeric28_10(monthTotal + requestedScaled),
    };

    const notesPayload: JsonObject = {};
    if (normalized.notesJson) {
      try {
        const parsed = JSON.parse(normalized.notesJson);
        if (isRecord(parsed)) Object.assign(notesPayload, parsed);
        else notesPayload.user_note = normalized.notesJson;
      } catch {
        notesPayload.user_note = normalized.notesJson;
      }
    }
    notesPayload.compliance = compliance;

    const { data: created, error: insertError } = await supabaseClient
      .from("withdrawal_requests")
      .insert({
        investor_id: normalized.investorId,
        fund_id: normalized.fundId,
        requested_amount: normalized.requestedAmount28_10,
        withdrawal_type: normalized.withdrawalType,
        status: "pending",
        request_date: normalized.requestDateIso,
        notes: JSON.stringify(notesPayload),
        admin_notes: normalized.adminNotes,
        created_by: user.id,
      })
      .select("id, status, request_date")
      .single();

    if (insertError) {
      throw new Error(`Failed to create withdrawal request: ${insertError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        withdrawal_request_id: created?.id,
        status: created?.status ?? "pending",
        request_date: created?.request_date,
        requested_amount: normalized.requestedAmount28_10,
        compliance,
      }),
      { headers: { ...headers, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("process-withdrawal failed:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { headers: { ...headers, "Content-Type": "application/json" }, status: 400 }
    );
  }
});

