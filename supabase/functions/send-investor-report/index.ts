import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

interface EmailRequest {
  to: string;
  investorName: string;
  reportMonth: string; // YYYY-MM
  htmlContent: string;
}

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized - No authorization header" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Verify admin access
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized - Invalid token" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.is_admin) {
      return new Response(JSON.stringify({ error: "Forbidden - Admin access required" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Parse request body
    const body: EmailRequest = await req.json();
    const { to, investorName, reportMonth, htmlContent } = body;

    if (!to || !investorName || !reportMonth || !htmlContent) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: to, investorName, reportMonth, htmlContent",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Format report month for subject
    const reportDate = new Date(reportMonth + "-01").toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
    });

    // Send email via Resend
    const emailPayload = {
      from: "Indigo Yield <reports@indigoyield.com>",
      to: [to],
      subject: `Your Investment Report - ${reportDate}`,
      html: htmlContent,
      text: `Dear ${investorName},\n\nPlease view this email in an HTML-compatible email client to see your investment report for ${reportDate}.\n\nThank you for trusting us with your investments.\n\nBest regards,\nIndigo Yield Team`,
    };

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify(emailPayload),
    });

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text();
      console.error("Resend API error:", errorText);
      throw new Error(`Resend API error: ${resendResponse.status} - ${errorText}`);
    }

    const resendResult = await resendResponse.json();

    // Log email send to database
    // Ensure table exists or this might fail silently if not caught
    const { error: logError } = await supabaseClient.from("email_logs").insert({
      recipient_email: to,
      recipient_name: investorName,
      subject: `Your Investment Report - ${reportDate}`,
      email_type: "investor_report",
      report_month: reportMonth + "-01",
      sent_by: user.id,
      sent_at: new Date().toISOString(),
      status: "sent",
      external_id: resendResult.id || null,
    });

    if (logError) {
      console.error("Failed to log email:", logError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Email sent successfully via Resend",
        recipient: to,
        reportMonth,
        id: resendResult.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in send-investor-report:", error);

    return new Response(
      JSON.stringify({
        error: "Failed to send email",
        message: error.message || "Unknown error occurred",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
