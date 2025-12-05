import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

interface AdminInvite {
  id: string;
  email: string;
  invite_code: string;
  created_at: string;
  expires_at: string;
}

interface RequestBody {
  invite: AdminInvite;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Make sure the request is authorized
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ message: "Missing authorization header" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get the invite data from the request body
    const data: RequestBody = await req.json();
    const { invite } = data;

    if (!invite || !invite.email || !invite.invite_code) {
      return new Response(JSON.stringify({ message: "Missing required invite data" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Generate the invite URL
    const baseUrl = Deno.env.get("PUBLIC_SITE_URL") || "http://localhost:3000";
    const inviteUrl = `${baseUrl}/admin-invite?code=${invite.invite_code}`;

    // Send email using Resend if configured
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    if (RESEND_API_KEY) {
      console.log(`Sending email to ${invite.email} via Resend...`);
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "onboarding@resend.dev", // Update this to your verified sender in production
          to: invite.email,
          subject: "You have been invited to join as an administrator",
          html: `
            <p>You have been invited to join as an administrator on our platform.</p>
            <p><a href="${inviteUrl}">Click here to accept the invitation</a></p>
            <p>This invite will expire on ${new Date(invite.expires_at).toLocaleDateString()}.</p>
          `,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error("Resend API Error:", errorText);
        // We continue even if email fails to at least return the invite code in logs for now
      } else {
        console.log("Email sent successfully via Resend.");
      }
    } else {
      // Mock email sending for local dev or if no key configured
      console.log(`
        TO: ${invite.email}
        SUBJECT: You have been invited to join as an administrator
        BODY:
        
        You have been invited to join as an administrator on our platform.
        
        Click the following link to accept the invitation:
        ${inviteUrl}
        
        This invite will expire on ${new Date(invite.expires_at).toLocaleDateString()}.
      `);
    }

    // Return success
    return new Response(
      JSON.stringify({
        success: true,
        message: "Invitation email would be sent in production",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error) {
    console.error("Error in send-admin-invite function:", error.message);
    return new Response(
      JSON.stringify({ message: "Internal server error", error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
