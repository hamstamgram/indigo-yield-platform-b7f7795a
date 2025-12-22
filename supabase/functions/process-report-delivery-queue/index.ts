import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_BATCH_SIZE = 25;

interface ProcessRequest {
  period_id: string;
  channel?: string;
  batch_size?: number;
  delivery_mode?: "email_html" | "pdf_attachment" | "link_only" | "hybrid";
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const MAILERSEND_API_TOKEN = Deno.env.get("MAILERSEND_API_TOKEN");
    const MAILERSEND_FROM_EMAIL = Deno.env.get("MAILERSEND_FROM_EMAIL") || "reports@indigoyield.com";
    const MAILERSEND_FROM_NAME = Deno.env.get("MAILERSEND_FROM_NAME") || "Indigo Yield";
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!MAILERSEND_API_TOKEN) {
      throw new Error("MAILERSEND_API_TOKEN not configured");
    }

    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create service client for database operations
    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify user token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await serviceClient.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized - Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin via user_roles table (more secure than profiles.is_admin)
    const { data: userRoles } = await serviceClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const isAdmin = userRoles?.some(r => r.role === "admin" || r.role === "super_admin");
    
    // Fallback to profiles.is_admin if no roles found
    if (!isAdmin) {
      const { data: profile } = await serviceClient
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();

      if (!profile?.is_admin) {
        return new Response(JSON.stringify({ error: "Forbidden - Admin access required" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Parse request
    const body: ProcessRequest = await req.json();
    const { period_id, channel = "email", batch_size = MAX_BATCH_SIZE, delivery_mode = "email_html" } = body;

    if (!period_id) {
      return new Response(JSON.stringify({ error: "period_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Processing delivery queue for period ${period_id}, batch_size=${batch_size}, mode=${delivery_mode}`);

    // Fetch queued deliveries with all required data
    const { data: deliveries, error: fetchError } = await serviceClient
      .from("statement_email_delivery")
      .select(`
        id,
        statement_id,
        investor_id,
        recipient_email,
        attempt_count,
        subject
      `)
      .eq("period_id", period_id)
      .eq("channel", channel)
      .or("status.eq.queued,status.eq.QUEUED")
      .order("created_at", { ascending: true })
      .limit(Math.min(batch_size, MAX_BATCH_SIZE));

    if (fetchError) {
      console.error("Failed to fetch deliveries:", fetchError);
      throw new Error(`Failed to fetch deliveries: ${fetchError.message}`);
    }

    if (!deliveries || deliveries.length === 0) {
      console.log("No queued deliveries found");
      return new Response(
        JSON.stringify({
          success: true,
          message: "No queued deliveries found",
          processed: 0,
          sent: 0,
          failed: 0,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${deliveries.length} queued deliveries to process`);

    // Mark all as SENDING
    const deliveryIds = deliveries.map(d => d.id);
    await serviceClient
      .from("statement_email_delivery")
      .update({ status: "SENDING", updated_at: new Date().toISOString() })
      .in("id", deliveryIds);

    // Process each delivery
    const results = {
      processed: 0,
      sent: 0,
      failed: 0,
      errors: [] as { delivery_id: string; error: string }[],
    };

    for (const delivery of deliveries) {
      results.processed++;
      
      try {
        console.log(`Processing delivery ${delivery.id} for ${delivery.recipient_email}`);

        // Fetch statement HTML
        const { data: statement, error: stmtError } = await serviceClient
          .from("generated_statements")
          .select("html_content, investor_id, period_id, fund_names")
          .eq("id", delivery.statement_id)
          .single();

        if (stmtError || !statement) {
          throw new Error(`Statement not found: ${stmtError?.message || "No data"}`);
        }

        if (!statement.html_content || statement.html_content.trim() === "") {
          throw new Error("Statement HTML is empty");
        }

        // Get investor info for the email
        const { data: investor, error: invError } = await serviceClient
          .from("profiles")
          .select("first_name, last_name, email")
          .eq("id", delivery.investor_id)
          .single();

        if (invError || !investor) {
          throw new Error(`Investor not found: ${invError?.message || "No data"}`);
        }

        // Get period info
        const { data: periodData, error: periodError } = await serviceClient
          .from("statement_periods")
          .select("period_name, month, year")
          .eq("id", period_id)
          .single();

        if (periodError || !periodData) {
          throw new Error(`Period not found: ${periodError?.message || "No data"}`);
        }

        const investorName = [investor.first_name, investor.last_name]
          .filter(Boolean)
          .join(" ") || investor.email;

        const emailSubject = delivery.subject || `INDIGO Monthly Report – ${periodData.period_name} – ${investorName}`;
        const plainText = `Dear ${investorName},\n\nYour investment report for ${periodData.period_name} is ready.\n\nPlease view this email in an HTML-compatible email client to see the full report.\n\nThank you for trusting us with your investments.\n\nBest regards,\nIndigo Yield Team`;

        // Build MailerSend payload
        const emailPayload: Record<string, unknown> = {
          from: {
            email: MAILERSEND_FROM_EMAIL,
            name: MAILERSEND_FROM_NAME,
          },
          to: [{
            email: delivery.recipient_email,
            name: investorName,
          }],
          subject: emailSubject,
          text: plainText,
          html: statement.html_content,
          settings: {
            track_opens: true,
            track_clicks: true,
          },
        };

        // Send via MailerSend API
        const mailersendResponse = await fetch("https://api.mailersend.com/v1/email", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${MAILERSEND_API_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(emailPayload),
        });

        const messageId = mailersendResponse.headers.get("X-Message-Id");
        const responseStatus = mailersendResponse.status;

        console.log(`MailerSend response for ${delivery.id}: status=${responseStatus}, messageId=${messageId}`);

        if (!mailersendResponse.ok) {
          const errorText = await mailersendResponse.text();
          throw new Error(`MailerSend API error: ${responseStatus} - ${errorText}`);
        }

        // Update delivery as SENT
        await serviceClient
          .from("statement_email_delivery")
          .update({
            status: "SENT",
            provider: "mailersend",
            provider_message_id: messageId,
            delivery_mode,
            sent_at: new Date().toISOString(),
            attempt_count: (delivery.attempt_count || 0) + 1,
            error_message: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", delivery.id);

        // Log send event
        await serviceClient
          .from("report_delivery_events")
          .insert({
            delivery_id: delivery.id,
            provider_message_id: messageId,
            event_type: "sent",
            event_data: {
              recipient: delivery.recipient_email,
              subject: emailSubject,
              delivery_mode,
              sent_by: user.id,
              provider: "mailersend",
            },
            occurred_at: new Date().toISOString(),
          });

        results.sent++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error(`Failed to process delivery ${delivery.id}:`, errorMessage);

        // Mark as FAILED
        await serviceClient
          .from("statement_email_delivery")
          .update({
            status: "FAILED",
            error_message: errorMessage,
            attempt_count: (delivery.attempt_count || 0) + 1,
            failed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", delivery.id);

        results.failed++;
        results.errors.push({ delivery_id: delivery.id, error: errorMessage });
      }
    }

    console.log(`Batch processing complete: ${results.sent} sent, ${results.failed} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        provider: "mailersend",
        ...results,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in process-report-delivery-queue:", errorMessage);

    return new Response(
      JSON.stringify({ error: "Failed to process delivery queue", message: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
