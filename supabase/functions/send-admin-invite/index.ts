import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

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

    // Generate invite URL - use the site URL from env or fallback
    const siteUrl = Deno.env.get("PUBLIC_SITE_URL") || Deno.env.get("SITE_URL") || "https://indigo.fund";
    const inviteUrl = `${siteUrl}/admin-invite?code=${invite.invite_code}`;
    console.log("Generated invite URL:", inviteUrl);

    // Determine role text
    const roleText = invite.intended_role === "super_admin" 
      ? "Super Administrator (full access)" 
      : "Administrator";

    // Check for Resend API key
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    
    if (!RESEND_API_KEY) {
      console.log("RESEND_API_KEY not configured - logging invite details instead");
      console.log("=== EMAIL WOULD BE SENT ===");
      console.log(`TO: ${invite.email}`);
      console.log(`ROLE: ${roleText}`);
      console.log(`LINK: ${inviteUrl}`);
      console.log(`EXPIRES: ${new Date(invite.expires_at).toLocaleDateString()}`);
      console.log("=== END EMAIL ===");
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Email logged (RESEND_API_KEY not configured)",
          inviteUrl 
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Send email via Resend
    console.log("Sending email via Resend...");
    const resend = new Resend(RESEND_API_KEY);

    const { data, error: resendError } = await resend.emails.send({
      from: "Indigo Fund <onboarding@resend.dev>", // Use verified domain in production
      to: [invite.email],
      subject: `You've been invited as ${invite.intended_role === "super_admin" ? "a Super Administrator" : "an Administrator"}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1a1a1a;">Administrator Invitation</h2>
          <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
            You have been invited to join Indigo Fund as a <strong>${roleText}</strong>.
          </p>
          <div style="margin: 30px 0;">
            <a href="${inviteUrl}" 
               style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">
              Accept Invitation
            </a>
          </div>
          <p style="color: #6b7280; font-size: 14px;">
            This invitation will expire on ${new Date(invite.expires_at).toLocaleDateString()}.
          </p>
          <p style="color: #6b7280; font-size: 14px;">
            If you didn't expect this invitation, you can safely ignore this email.
          </p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
          <p style="color: #9ca3af; font-size: 12px;">
            Indigo Fund
          </p>
        </div>
      `,
    });

    if (resendError) {
      console.error("Resend API error:", resendError);
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: resendError.message }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Email sent successfully! ID:", data?.id);
    return new Response(
      JSON.stringify({ success: true, emailId: data?.id }),
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
