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
    // Verify JWT
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

    // Check admin access
    const adminCheck = await checkAdminAccess(supabaseAdmin, user.id);
    if (!adminCheck.isAdmin) {
      return createAdminDeniedResponse(corsHeaders);
    }

    const body = await req.json();
    const { action } = body;

    if (action === "history") {
      const { data, error } = await supabaseAdmin
        .from("position_resets")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, history: data || [] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "preview") {
      // Get count of positions that would be reset
      const { count: positionsCount, error: countError } = await supabaseAdmin
        .from("investor_positions")
        .select("*", { count: "exact", head: true });

      if (countError) throw countError;

      // Get active funds summary
      const { data: funds, error: fundsError } = await supabaseAdmin
        .from("funds")
        .select("id, name, asset")
        .eq("is_active", true);

      if (fundsError) throw fundsError;

      return new Response(
        JSON.stringify({
          success: true,
          preview: {
            positionsCount: positionsCount || 0,
            funds: funds || [],
            warning: "This will archive all current positions and create new baseline entries.",
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

      // Call the database function to execute reset
      const { data, error } = await supabaseAdmin.rpc("reset_all_positions", {
        p_admin_id: user.id,
        p_confirmation_code: confirmationCode,
      });

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, result: data }),
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
