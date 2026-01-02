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

const generateInviteEmailHtml = (inviteLink: string, role: string, expiresAt: string) => {
  const roleDisplay = role === 'super_admin' ? 'Super Administrator' : 'Administrator';
  const expiryDate = new Date(expiresAt).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin Invitation - Indigo Yield</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f7;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Indigo Yield</h1>
              <p style="margin: 10px 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px;">Investment Management Platform</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #1a1a2e; font-size: 22px; font-weight: 600;">You've Been Invited!</h2>
              
              <p style="margin: 0 0 20px; color: #4a4a68; font-size: 16px; line-height: 1.6;">
                You have been invited to join <strong>Indigo Yield</strong> as a <strong style="color: #4F46E5;">${roleDisplay}</strong>.
              </p>
              
              <p style="margin: 0 0 30px; color: #4a4a68; font-size: 16px; line-height: 1.6;">
                Click the button below to set up your account and access the admin dashboard.
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center">
                    <a href="${inviteLink}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px; box-shadow: 0 4px 14px rgba(79, 70, 229, 0.4);">
                      Accept Invitation
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Expiry Notice -->
              <div style="margin: 30px 0; padding: 16px 20px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
                <p style="margin: 0; color: #92400e; font-size: 14px;">
                  <strong>⏰ This invitation expires on ${expiryDate}</strong>
                </p>
              </div>
              
              <!-- Link fallback -->
              <p style="margin: 20px 0 0; color: #6b7280; font-size: 13px; line-height: 1.5;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin: 8px 0 0; word-break: break-all;">
                <a href="${inviteLink}" style="color: #4F46E5; font-size: 13px;">${inviteLink}</a>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px; color: #6b7280; font-size: 13px; text-align: center;">
                This is an automated message from Indigo Yield.
              </p>
              <p style="margin: 0; color: #6b7280; font-size: 13px; text-align: center;">
                If you didn't expect this invitation, please ignore this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("=== send-admin-invite function started ===");

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("Missing authorization header");
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { invite }: RequestBody = await req.json();
    console.log("Received invite request for:", invite?.email, "role:", invite?.intended_role);

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

    // User doesn't exist - create user and send invite email via Resend
    console.log("User doesn't exist, creating user and sending invite email via Resend");
    
    const siteUrl = Deno.env.get("PUBLIC_SITE_URL") || Deno.env.get("SITE_URL") || "https://indigo.fund";
    
    // Generate a magic link for the new user
    const { data: magicLinkData, error: magicLinkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: invite.email,
      options: {
        redirectTo: `${siteUrl}/admin-invite-callback`,
        data: {
          invite_code: invite.invite_code,
          intended_role: invite.intended_role || "admin",
        }
      }
    });

    if (magicLinkError) {
      console.error("Error generating magic link:", magicLinkError);
      return new Response(
        JSON.stringify({ error: "Failed to generate invite link", details: magicLinkError.message }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const inviteLink = magicLinkData.properties?.action_link;
    if (!inviteLink) {
      console.error("No action_link in magic link response");
      return new Response(
        JSON.stringify({ error: "Failed to generate invite link" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
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
        // Using Resend test domain - for production, verify your domain at https://resend.com/domains
        from: "Indigo Yield <onboarding@resend.dev>",
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
        message: "Invite email sent via Resend"
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
