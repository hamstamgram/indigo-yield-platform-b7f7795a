import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

interface EmailRequest {
  to: string | string[]; // Support single email or array
  cc?: string[];
  bcc?: string[];
  investorId?: string;
  investorName: string;
  reportMonth: string; // YYYY-MM
  subject?: string; // Optional custom subject
  htmlContent: string;
}

// Simple in-memory rate limiting (resets on function cold start)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10; // max emails per minute per admin
const RATE_WINDOW_MS = 60000; // 1 minute

function checkRateLimit(adminId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(adminId);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(adminId, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT) {
    return false;
  }

  entry.count++;
  return true;
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
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user is admin via user_roles table (secure method)
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    const { checkAdminAccess, createAdminDeniedResponse } = await import("../_shared/admin-check.ts");
    const adminCheck = await checkAdminAccess(serviceClient, user.id);
    if (!adminCheck.isAdmin) {
      return createAdminDeniedResponse(corsHeaders);
    }

    // Check rate limit
    if (!checkRateLimit(user.id)) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Max 10 emails per minute." }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse request body
    const body: EmailRequest = await req.json();
    const { to, cc, bcc, investorId, investorName, reportMonth, subject, htmlContent } = body;

    // Normalize 'to' to array
    const toArray = Array.isArray(to) ? to : [to];

    if (toArray.length === 0 || !investorName || !reportMonth || !htmlContent) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: to, investorName, reportMonth, htmlContent",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate all emails
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const allEmails = [...toArray, ...(cc || []), ...(bcc || [])];
    for (const email of allEmails) {
      if (!emailRegex.test(email)) {
        return new Response(JSON.stringify({ error: `Invalid email format: ${email}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Check if RESEND_API_KEY is configured
    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY not configured");
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Format report month for subject
    const reportDate = new Date(reportMonth + "-01").toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
    });

    // Use custom subject or generate default
    const emailSubject = subject || `INDIGO Monthly Report – ${reportDate} – ${investorName}`;

    // Build plain text fallback
    const plainText = `Dear ${investorName},

Your investment report for ${reportDate} is attached.

Please view this email in an HTML-compatible email client to see the full report with all formatting and details.

Thank you for trusting us with your investments.

Best regards,
Indigo Yield Team`;

    // Send email via Resend
    const emailPayload: Record<string, unknown> = {
      from: "Indigo Yield <noreply@indigo.fund>",
      to: toArray,
      subject: emailSubject,
      html: htmlContent,
      text: plainText,
    };

    // Add CC and BCC if provided
    if (cc && cc.length > 0) {
      emailPayload.cc = cc;
    }
    if (bcc && bcc.length > 0) {
      emailPayload.bcc = bcc;
    }

    console.log(
      `Sending email to ${toArray.length} recipient(s) for ${investorName}, report month ${reportMonth}`
    );
    if (cc?.length) console.log(`CC: ${cc.join(", ")}`);
    if (bcc?.length) console.log(`BCC: ${bcc.join(", ")}`);

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
    console.log("Email sent successfully:", resendResult);

    // Log email send to database using correct column names
    const { error: logError } = await serviceClient.from("email_logs").insert({
      recipient: toArray[0], // Primary recipient
      subject: emailSubject,
      template: "investor_report",
      metadata: {
        investor_id: investorId || null,
        investor_name: investorName,
        report_month: reportMonth,
        sent_by: user.id,
        to: toArray,
        cc: cc || [],
        bcc: bcc || [],
        total_recipients: toArray.length + (cc?.length || 0) + (bcc?.length || 0),
      },
      sent_at: new Date().toISOString(),
      status: "sent",
      message_id: resendResult.id || null,
    });

    if (logError) {
      console.error("Failed to log email:", logError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Email sent successfully to ${toArray.length} recipient(s)`,
        recipients: {
          to: toArray,
          cc: cc || [],
          bcc: bcc || [],
        },
        reportMonth,
        id: resendResult.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Error in send-investor-report:", errorMessage);

    return new Response(
      JSON.stringify({
        error: "Failed to send email",
        message: errorMessage,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
