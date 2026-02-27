/**
 * notify-yield-applied
 * Called by the apply-yield flow after a yield distribution is committed.
 * Fetches Expo push tokens for affected investors and fires push notifications.
 *
 * POST body: { investor_ids?: string[], period_label?: string, yield_pct?: string }
 *   - investor_ids: optional subset; if omitted, notifies ALL investors with tokens
 *   - period_label: e.g. "March 2026"
 *   - yield_pct: e.g. "1.42%"
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Require service-role auth — this must only be called server-side
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const body = await req.json().catch(() => ({}));
    const {
      investor_ids,
      period_label = "this period",
      yield_pct,
    } = body as {
      investor_ids?: string[];
      period_label?: string;
      yield_pct?: string;
    };

    // Fetch tokens
    let query = supabase.from("investor_device_tokens").select("investor_id, expo_token");
    if (investor_ids?.length) {
      query = query.in("investor_id", investor_ids);
    }
    const { data: tokens, error: fetchError } = await query;

    if (fetchError) throw fetchError;
    if (!tokens?.length) {
      return new Response(JSON.stringify({ ok: true, sent: 0, message: "No tokens registered" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build Expo push messages
    const yieldLine = yield_pct ? ` — ${yield_pct} distributed` : "";
    const messages = tokens.map(({ expo_token }) => ({
      to: expo_token,
      sound: "default",
      title: "Yield Applied",
      body: `Your return for ${period_label} has been credited${yieldLine}. Tap to view your portfolio.`,
      data: { screen: "Portfolio" },
      channelId: "yield-alerts",
      priority: "high",
    }));

    // Expo Push API accepts up to 100 per request — chunk if needed
    const CHUNK = 100;
    let sent = 0;
    for (let i = 0; i < messages.length; i += CHUNK) {
      const chunk = messages.slice(i, i + CHUNK);
      const res = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(chunk),
      });
      if (res.ok) sent += chunk.length;
      else {
        const errText = await res.text();
        console.error(`[notify-yield-applied] Expo push chunk error: ${errText}`);
      }
    }

    return new Response(JSON.stringify({ ok: true, sent, total_tokens: tokens.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[notify-yield-applied]", err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
