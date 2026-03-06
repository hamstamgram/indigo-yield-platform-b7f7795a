import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { checkAdminAccess, createAdminDeniedResponse } from "../_shared/admin-check.ts";

import { generateUnifiedEmailHtml } from "../_shared/email-layout.ts";

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

const generateInviteEmailHtml = (inviteLink: string, role: string, expiresAt: string) => {
  const roleDisplay = role === "super_admin" ? "Super Administrator" : "Administrator";
  const expiryDate = new Date(expiresAt).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const innerHtml = `
      <p style="color: #4F46E5; font-size: 22px; font-weight: 700; margin-top: 0; margin-bottom: 20px;">You've Been Invited!</p>
      
      <p style="margin: 0 0 20px; color: #334155; font-size: 16px; line-height: 1.6;">
        You have been invited to join <strong>Indigo Yield</strong> as a <strong style="color: #4F46E5;">${roleDisplay}</strong>.
      </p>
      
      <p style="margin: 0 0 30px; color: #334155; font-size: 16px; line-height: 1.6;">
        Click the button below to set up your account and access the admin dashboard.
      </p>
      
      <!-- CTA Button -->
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td align="center">
            <a href="${inviteLink}" style="display: inline-block; padding: 14px 32px; background-color: #4F46E5; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 6px;">
              Accept Invitation
            </a>
          </td>
        </tr>
      </table>
      
      <!-- Expiry Notice -->
      <div style="margin: 30px 0; padding: 16px 20px; background-color: #FEF3C7; border-left: 4px solid #F59E0B; border-radius: 4px;">
        <p style="margin: 0; color: #92400E; font-size: 14px; font-weight: 600;">
          ⏰ This invitation expires on ${expiryDate}
        </p>
      </div>
      
      <!-- Link fallback -->
      <p style="margin: 20px 0 0; color: #64748B; font-size: 13px; line-height: 1.5;">
        If the button doesn't work, copy and paste this link into your browser:
      </p>
      <p style="margin: 8px 0 0; word-break: break-all;">
        <a href="${inviteLink}" style="color: #4F46E5; font-size: 13px;">${inviteLink}</a>
      </p>
  `.trim();

  return generateUnifiedEmailHtml("Admin Invitation", innerHtml);
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("=== send-admin-invite function started ===");

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY not configured");
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("Missing authorization header");
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Verify JWT and check admin role
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid authorization token" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const adminCheck = await checkAdminAccess(supabaseAdmin, user.id);
    if (!adminCheck.isAdmin) {
      return createAdminDeniedResponse(corsHeaders, "Only admins can send admin invites");
    }

    const { invite }: RequestBody = await req.json();
    console.log("Received invite request for:", invite?.email, "role:", invite?.intended_role);

    if (!invite?.email || !invite?.invite_code) {
      console.error("Missing required invite data");
      return new Response(JSON.stringify({ error: "Missing required invite data" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

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
      console.log(
        "User already exists, assigning role directly:",
        existingProfile.id,
        "->",
        invite.intended_role
      );

      // Insert or update the role
      const { error: roleError } = await supabaseAdmin.from("user_roles").upsert(
        {
          user_id: existingProfile.id,
          role: invite.intended_role || "admin",
        },
        { onConflict: "user_id,role", ignoreDuplicates: false }
      );

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
      await supabaseAdmin.from("admin_invites").update({ used: true }).eq("id", invite.id);

      console.log("Role assigned successfully to existing user:", invite.intended_role);

      return new Response(
        JSON.stringify({
          success: true,
          userId: existingProfile.id,
          email: invite.email,
          role: invite.intended_role || "admin",
          message: "User already exists - role assigned directly",
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // User doesn't exist - create user and send invite email via Resend
    console.log("User doesn't exist, creating user and sending invite email via Resend");

    const siteUrl =
      Deno.env.get("PUBLIC_SITE_URL") || Deno.env.get("SITE_URL") || "https://indigo.fund";

    // Generate a magic link for the new user
    const { data: magicLinkData, error: magicLinkError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email: invite.email,
        options: {
          redirectTo: `${siteUrl}/admin-invite-callback`,
          data: {
            invite_code: invite.invite_code,
            intended_role: invite.intended_role || "admin",
          },
        },
      });

    if (magicLinkError) {
      console.error("Error generating magic link:", magicLinkError);
      return new Response(
        JSON.stringify({
          error: "Failed to generate invite link",
          details: magicLinkError.message,
        }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const inviteLink = magicLinkData.properties?.action_link;
    if (!inviteLink) {
      console.error("No action_link in magic link response");
      return new Response(JSON.stringify({ error: "Failed to generate invite link" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log("Generated magic link, sending email via Resend");

    // Send email via Resend
    const emailHtml = generateInviteEmailHtml(
      inviteLink,
      invite.intended_role || "admin",
      invite.expires_at
    );

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Indigo Yield <noreply@indigo.fund>",
        to: [invite.email],
        subject: "You've been invited to join Indigo Yield as an Administrator",
        html: emailHtml,
      }),
    });

    const resendResult = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error("Resend API error:", resendResult);
      return new Response(
        JSON.stringify({ error: "Failed to send invite email", details: resendResult }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Invite email sent successfully via Resend:", resendResult.id);

    return new Response(
      JSON.stringify({
        success: true,
        userId: magicLinkData.user?.id,
        email: invite.email,
        emailId: resendResult.id,
        message: "Invite email sent via Resend",
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    console.error("Error in send-admin-invite:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: "Internal server error", details: errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
