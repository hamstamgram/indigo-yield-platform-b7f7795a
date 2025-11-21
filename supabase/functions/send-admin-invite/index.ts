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

    // Normally here we would send an actual email, but we'll just log it for now
    // In a real implementation, you'd use a service like SendGrid, Resend, or Amazon SES
    console.log(`
      TO: ${invite.email}
      SUBJECT: You have been invited to join as an administrator
      BODY:
      
      You have been invited to join as an administrator on our platform.
      
      Click the following link to accept the invitation:
      ${inviteUrl}
      
      This invite will expire on ${new Date(invite.expires_at).toLocaleDateString()}.
    `);

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
