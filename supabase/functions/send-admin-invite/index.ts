import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AdminInvite {
  id: string;
  email: string;
  invite_code: string;
  intended_role?: string;
  created_at: string;
  expires_at: string;
}

interface RequestBody {
  invite: AdminInvite;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("=== send-admin-invite function started ===");

    // Check authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("Missing authorization header");
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Parse request body
    const { invite }: RequestBody = await req.json();
    console.log("Received invite request for:", invite?.email);

    if (!invite?.email || !invite?.invite_code) {
      console.error("Missing required invite data:", { email: invite?.email, hasCode: !!invite?.invite_code });
      return new Response(
        JSON.stringify({ error: "Missing required invite data" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Generate redirect URL
    const siteUrl = Deno.env.get("PUBLIC_SITE_URL") || Deno.env.get("SITE_URL") || "https://indigo.fund";
    const redirectTo = `${siteUrl}/admin-invite-callback`;
    
    console.log("Using redirect URL:", redirectTo);
    console.log("Invite code:", invite.invite_code);
    console.log("Intended role:", invite.intended_role || "admin");

    // Use Supabase Auth to send invite email
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      invite.email,
      {
        redirectTo,
        data: {
          invite_code: invite.invite_code,
          intended_role: invite.intended_role || "admin",
        }
      }
    );

    if (error) {
      console.error("Supabase Auth invite error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to send invite", details: error.message }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Invite sent successfully! User ID:", data.user?.id);
    console.log("Email:", invite.email);
    console.log("Role:", invite.intended_role);

    return new Response(
      JSON.stringify({ 
        success: true, 
        userId: data.user?.id,
        email: invite.email
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error) {
    console.error("Error in send-admin-invite:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
