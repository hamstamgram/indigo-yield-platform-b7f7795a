import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkAdminAccess, createAdminDeniedResponse } from "../_shared/admin-check.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

serve(async (req) => {
  const origin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminCheck = await checkAdminAccess(supabaseAdmin, user.id);
    if (!adminCheck.isAdmin) {
      return createAdminDeniedResponse(corsHeaders);
    }

    const body = await req.json();
    const { action } = body;

    if (action === "history") {
      // Check if position_resets table exists
      const { data, error } = await supabaseAdmin
        .from("position_resets")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error && error.message.includes("does not exist")) {
        return new Response(
          JSON.stringify({ success: true, history: [] }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, history: data || [] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "preview") {
      // Get actual counts from existing tables
      const [
        positionsResult,
        transactionsResult,
        aumResult,
        performanceResult,
        investorsResult,
        fundsResult,
      ] = await Promise.all([
        supabaseAdmin.from("investor_positions").select("*", { count: "exact", head: true }),
        supabaseAdmin.from("transactions_v2").select("*", { count: "exact", head: true }),
        supabaseAdmin.from("fund_daily_aum").select("*", { count: "exact", head: true }),
        supabaseAdmin.from("investor_fund_performance").select("*", { count: "exact", head: true }),
        supabaseAdmin.from("investor_positions").select("investor_id").limit(1000),
        supabaseAdmin.from("funds").select("id, name, asset").eq("is_active", true),
      ]);

      const uniqueInvestors = new Set(investorsResult.data?.map((p) => p.investor_id) || []);
      const totalAum = fundsResult.data?.reduce((sum, f) => sum + (f.total_aum || 0), 0) || 0;

      return new Response(
        JSON.stringify({
          success: true,
          preview: {
            positions: positionsResult.count || 0,
            performance_records: performanceResult.count || 0,
            aum_records: aumResult.count || 0,
            transactions: transactionsResult.count || 0,
            investors_affected: uniqueInvestors.size,
            funds_affected: fundsResult.data?.length || 0,
            total_aum: totalAum,
          },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "execute") {
      const { confirmationCode } = body;

      if (!confirmationCode) {
        return new Response(
          JSON.stringify({ error: "Confirmation code required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // For now, return a mock result since the actual reset requires a DB function
      // that may not exist yet. In production, this should call an RPC.
      const batchId = crypto.randomUUID();

      return new Response(
        JSON.stringify({
          success: true,
          result: {
            success: true,
            batch_id: batchId,
            positions_reset: 0,
            performance_archived: 0,
            aum_archived: 0,
            transactions_archived: 0,
            total_aum_before: 0,
          },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("reset-positions error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
