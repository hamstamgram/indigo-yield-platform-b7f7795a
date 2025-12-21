import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const MAX_ATTEMPTS = 5;

interface DeliveryItem {
  id: string;
  statement_id: string;
  investor_id: string;
  recipient_email: string;
  attempt_count: number;
}

interface ProcessRequest {
  period_id: string;
  channel?: string;
  batch_size?: number;
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
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create client with user auth for admin check
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized - Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request
    const body: ProcessRequest = await req.json();
    const { period_id, channel = "email", batch_size = 25 } = body;

    if (!period_id) {
      return new Response(JSON.stringify({ error: "period_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role for database operations
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Acquire batch using RPC
    const { data: batch, error: batchError } = await serviceClient.rpc(
      "acquire_delivery_batch",
      {
        p_period_id: period_id,
        p_channel: channel,
        p_batch_size: batch_size,
        p_worker_id: user.id,
      }
    );

    if (batchError) {
      console.error("Failed to acquire batch:", batchError);
      return new Response(JSON.stringify({ error: "Failed to acquire batch", details: batchError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const deliveries = batch as DeliveryItem[];
    console.log(`Acquired ${deliveries.length} deliveries to process`);

    if (deliveries.length === 0) {
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
          .eq("id", statement.period_id)
          .single();

        if (periodError || !periodData) {
          throw new Error(`Period not found: ${periodError?.message || "No data"}`);
        }

        const investorName = [investor.first_name, investor.last_name]
          .filter(Boolean)
          .join(" ") || investor.email;

        const reportMonth = `${periodData.year}-${String(periodData.month).padStart(2, "0")}`;

        // Send email via Resend
        if (!RESEND_API_KEY) {
          throw new Error("RESEND_API_KEY not configured");
        }

        const emailSubject = `INDIGO Monthly Report – ${periodData.period_name} – ${investorName}`;
        const plainText = `Dear ${investorName},\n\nYour investment report for ${periodData.period_name} is ready.\n\nPlease view this email in an HTML-compatible email client to see the full report.\n\nThank you for trusting us with your investments.\n\nBest regards,\nIndigo Yield Team`;

        const resendResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "Indigo Yield <reports@indigoyield.com>",
            to: [delivery.recipient_email],
            subject: emailSubject,
            html: statement.html_content,
            text: plainText,
          }),
        });

        if (!resendResponse.ok) {
          const errorText = await resendResponse.text();
          throw new Error(`Resend API error: ${resendResponse.status} - ${errorText}`);
        }

        const resendResult = await resendResponse.json();
        console.log(`Email sent for delivery ${delivery.id}:`, resendResult.id);

        // Mark as sent
        await serviceClient.rpc("mark_delivery_result", {
          p_delivery_id: delivery.id,
          p_success: true,
          p_provider_message_id: resendResult.id,
        });

        // Log to email_logs
        await serviceClient.from("email_logs").insert({
          recipient: delivery.recipient_email,
          subject: emailSubject,
          template: "investor_report",
          metadata: {
            delivery_id: delivery.id,
            investor_id: delivery.investor_id,
            statement_id: delivery.statement_id,
            report_month: reportMonth,
            sent_by_worker: user.id,
          },
          sent_at: new Date().toISOString(),
          status: "sent",
          message_id: resendResult.id,
        });

        results.sent++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error(`Failed to process delivery ${delivery.id}:`, errorMessage);

        // Mark as failed
        await serviceClient.rpc("mark_delivery_result", {
          p_delivery_id: delivery.id,
          p_success: false,
          p_error_code: "SEND_FAILED",
          p_error_message: errorMessage,
        });

        results.failed++;
        results.errors.push({ delivery_id: delivery.id, error: errorMessage });
      }
    }

    console.log(`Batch processing complete: ${results.sent} sent, ${results.failed} failed`);

    return new Response(
      JSON.stringify({
        success: true,
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
