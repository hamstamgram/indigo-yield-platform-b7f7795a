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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("=== send-admin-invite function started ===");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("Missing authorization header");
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { invite }: RequestBody = await req.json();
    console.log("Received invite request for:", invite?.email);

    if (!invite?.email || !invite?.invite_code) {
      console.error("Missing required invite data");
      return new Response(
        JSON.stringify({ error: "Missing required invite data" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Check if user already exists via profiles table (more reliable than listUsers)
    console.log("Checking if user exists in profiles table:", invite.email);
    const { data: existingProfile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, email, is_admin")
      .ilike("email", invite.email)
      .maybeSingle();

    if (profileError) {
      console.error("Error checking profile:", profileError);
      // Don't fail - continue to try invite
    }

    if (existingProfile) {
      console.log("User already exists, assigning role directly:", existingProfile.id, "->", invite.intended_role);
      
      // Insert or update the role
      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .upsert({
          user_id: existingProfile.id,
          role: invite.intended_role || "admin"
        }, { onConflict: "user_id,role", ignoreDuplicates: false });

      if (roleError) {
        console.error("Error assigning role:", roleError);
        return new Response(
          JSON.stringify({ error: "Failed to assign role", details: roleError.message }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Update profile is_admin flag if not already set
      if (!existingProfile.is_admin) {
        console.log("Updating is_admin flag for user");
        await supabaseAdmin
          .from("profiles")
          .update({ is_admin: true })
          .eq("id", existingProfile.id);
      }

      // Mark invite as used
      await supabaseAdmin
        .from("admin_invites")
        .update({ used: true })
        .eq("id", invite.id);

      console.log("Role assigned successfully to existing user:", invite.intended_role);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          userId: existingProfile.id,
          email: invite.email,
          role: invite.intended_role || "admin",
          message: "User already exists - role assigned directly"
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // User doesn't exist - send invite email
    console.log("User doesn't exist, sending invite email");
    
    const siteUrl = Deno.env.get("PUBLIC_SITE_URL") || Deno.env.get("SITE_URL") || "https://indigo.fund";
    const redirectTo = `${siteUrl}/admin-invite-callback`;
    
    console.log("Using redirect URL:", redirectTo);

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
