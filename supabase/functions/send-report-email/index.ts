import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkAdminAccess, createAdminDeniedResponse } from "../_shared/admin-check.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

interface SendReportRequest {
  delivery_id?: string;
  investor_id?: string;
  period_id?: string;
  delivery_mode?: "email_html" | "link_only";
  health_check?: boolean;
}

serve(async (req: Request): Promise<Response> => {
  const requestId = crypto.randomUUID().slice(0, 8);
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get environment variables
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const RESEND_FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") || "noreply@indigo.fund";
    const RESEND_FROM_NAME = Deno.env.get("RESEND_FROM_NAME") || "Indigo Yield";
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Enhanced logging - request received
    console.log(
      JSON.stringify({
        event: "request_received",
        request_id: requestId,
        timestamp: new Date().toISOString(),
        resend_configured: !!RESEND_API_KEY,
        from_email: RESEND_FROM_EMAIL,
      })
    );

    // Create Supabase client with service role
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Parse request body first to check for health_check
    const body: SendReportRequest = await req.json();

    console.log(
      JSON.stringify({
        event: "request_parsed",
        request_id: requestId,
        delivery_id: body.delivery_id,
        investor_id: body.investor_id,
        period_id: body.period_id,
        delivery_mode: body.delivery_mode,
        health_check: body.health_check,
      })
    );

    // Handle health check mode - admin auth still required but only pings Resend
    if (body.health_check) {
      // Verify admin access via JWT for health check too
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Authorization required" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const token = authHeader.replace("Bearer ", "");
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser(token);

      if (authError || !user) {
        return new Response(JSON.stringify({ error: "Invalid token" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Use canonical admin check (checks user_roles first, then profiles.is_admin)
      const adminCheck = await checkAdminAccess(supabase, user.id);
      if (!adminCheck.isAdmin) {
        return createAdminDeniedResponse(corsHeaders, "Health check requires admin access");
      }

      // Check if Resend API token is configured
      if (!RESEND_API_KEY) {
        return new Response(
          JSON.stringify({
            status: "error",
            message: "RESEND_API_KEY not configured",
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Ping Resend API to verify token is valid
      const healthCheckResponse = await fetch("https://api.resend.com/domains", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
      });

      if (healthCheckResponse.ok) {
        const quotaData = await healthCheckResponse.json();
        return new Response(
          JSON.stringify({
            status: "ok",
            message: "Resend API is reachable",
            from_email: RESEND_FROM_EMAIL,
            from_name: RESEND_FROM_NAME,
            domains: quotaData?.data?.length ?? null,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      } else {
        const errorText = await healthCheckResponse.text();
        return new Response(
          JSON.stringify({
            status: "error",
            message: `Resend API error: ${healthCheckResponse.status}`,
            details: errorText,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // Regular send flow - require API token
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY not configured");
    }

    // Verify admin access via JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authorization required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin status using canonical admin check
    const adminCheck = await checkAdminAccess(supabase, user.id);
    if (!adminCheck.isAdmin) {
      return createAdminDeniedResponse(corsHeaders, "Sending reports requires admin access");
    }
    const { delivery_id, investor_id, period_id, delivery_mode = "email_html" } = body;

    let deliveryRecord;
    let statementData;
    let investorData;
    let periodData;

    if (delivery_id) {
      // Fetch delivery record
      const { data: delivery, error: deliveryError } = await supabase
        .from("statement_email_delivery")
        .select(
          `
          *,
          statement:generated_statements!statement_email_delivery_statement_id_fkey(
            id, html_content, period_id, investor_id, fund_names
          ),
          investor:profiles!statement_email_delivery_investor_id_fkey(
            id, email, first_name, last_name
          ),
          period:statement_periods!statement_email_delivery_period_id_fkey(
            id, year, month, period_end_date
          )
        `
        )
        .eq("id", delivery_id)
        .single();

      if (deliveryError || !delivery) {
        throw new Error(`Delivery not found: ${deliveryError?.message}`);
      }

      deliveryRecord = delivery;
      statementData = delivery.statement;
      investorData = delivery.investor;
      periodData = delivery.period;
    } else if (investor_id && period_id) {
      // Find or create delivery record
      const { data: statement, error: stmtError } = await supabase
        .from("generated_statements")
        .select("id, html_content, fund_names")
        .eq("investor_id", investor_id)
        .eq("period_id", period_id)
        .single();

      if (stmtError || !statement) {
        throw new Error(`Statement not found for investor ${investor_id} period ${period_id}`);
      }

      const { data: investor } = await supabase
        .from("profiles")
        .select("id, email, first_name, last_name")
        .eq("id", investor_id)
        .single();

      const { data: period } = await supabase
        .from("statement_periods")
        .select("id, year, month, period_end_date")
        .eq("id", period_id)
        .single();

      if (!investor || !period) {
        throw new Error("Investor or period not found");
      }

      statementData = statement;
      investorData = investor;
      periodData = period;

      // Check for existing delivery record
      const { data: existingDelivery } = await supabase
        .from("statement_email_delivery")
        .select("id")
        .eq("investor_id", investor_id)
        .eq("period_id", period_id)
        .single();

      if (existingDelivery) {
        deliveryRecord = existingDelivery;
      } else {
        // Build subject and recipient info for the delivery record
        const monthNames = [
          "January",
          "February",
          "March",
          "April",
          "May",
          "June",
          "July",
          "August",
          "September",
          "October",
          "November",
          "December",
        ];
        const periodNameForRecord = `${monthNames[period.month - 1]} ${period.year}`;
        const investorNameForRecord =
          [investor.first_name, investor.last_name].filter(Boolean).join(" ") ||
          investor.email ||
          "Investor";
        const subjectForRecord = `${investorNameForRecord} – Your Account Statement – ${periodNameForRecord}`;

        // Create new delivery record BEFORE sending (required fields included)
        const { data: newDelivery, error: createError } = await supabase
          .from("statement_email_delivery")
          .insert({
            investor_id,
            period_id,
            statement_id: statement.id,
            user_id: investor_id,
            recipient_email: investor.email,
            subject: subjectForRecord,
            status: "QUEUED",
            provider: "resend",
            delivery_mode,
            channel: "email",
            created_by: user.id,
          })
          .select()
          .single();

        if (createError) {
          throw new Error(`Failed to create delivery record: ${createError.message}`);
        }
        deliveryRecord = newDelivery;
        console.log(`Created delivery record ${newDelivery.id} BEFORE sending`);
      }
    } else {
      throw new Error("Either delivery_id or (investor_id + period_id) required");
    }

    // Build recipient list: Primary + Secondary Verified Emails
    const { data: secondaryEmails } = await supabase
      .from("investor_emails")
      .select("email")
      .eq("investor_id", investor_id)
      .eq("verified", true);

    const recipientList = [
      investorData.email,
      ...(secondaryEmails?.map((e: any) => e.email) || [])
    ].filter(Boolean);

    if (recipientList.length === 0) {
      throw new Error("No verified recipients found for this investor");
    }

    // ... (rest of period/subject building)

    // Prepare Resend API payload for MULTIPLE recipients
    const emailPayload: Record<string, unknown> = {
      from: `${RESEND_FROM_NAME} <${RESEND_FROM_EMAIL}>`,
      to: recipientList, // Now an array of all authorized emails
      subject,
      text: plainText,
    };

    // Add HTML content based on delivery mode
    if (delivery_mode === "email_html") {
      emailPayload.html = statementData.html_content;
    }

    // For link_only mode, include a simple HTML with link
    if (delivery_mode === "link_only") {
      const reportUrl = `${Deno.env.get("PUBLIC_REPORT_BASE_URL") || "https://app.indigoyield.com/reports/view"}/${statementData.id}`;
      emailPayload.html = `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h1 style="color: #1e3a5f;">INDIGO Monthly Report</h1>
          <p>Dear ${investorName},</p>
          <p>Your monthly investment report for ${periodName} is ready.</p>
          <p><a href="${reportUrl}" style="background-color: #1e3a5f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Your Report</a></p>
          <p style="color: #666; font-size: 12px; margin-top: 30px;">This is an automated message from Indigo Yield.</p>
        </div>
      `;
    }

    console.log(
      JSON.stringify({
        event: "sending_email",
        request_id: requestId,
        recipient: recipientEmail,
        investor_name: investorName,
        subject,
        delivery_mode,
        delivery_id: deliveryRecord.id,
      })
    );

    // Call Resend API
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailPayload),
    });

    const responseStatus = resendResponse.status;
    const resendResult = await resendResponse.json().catch(() => ({}));
    const messageId = resendResult?.id ?? null;

    console.log(
      JSON.stringify({
        event: "resend_response",
        request_id: requestId,
        status: responseStatus,
        message_id: messageId,
        delivery_id: deliveryRecord.id,
      })
    );

    if (!resendResponse.ok) {
      const errorBody = JSON.stringify(resendResult) || (await resendResponse.text());
      console.error(
        JSON.stringify({
          event: "resend_error",
          request_id: requestId,
          status: responseStatus,
          error: errorBody,
          delivery_id: deliveryRecord.id,
        })
      );

      // Update delivery record with failure
      await supabase
        .from("statement_email_delivery")
        .update({
          status: "FAILED",
          error_message: `Resend error: ${responseStatus} - ${errorBody}`,
          attempt_count: (deliveryRecord.attempt_count || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", deliveryRecord.id);

      throw new Error(`Resend API error: ${responseStatus} - ${errorBody}`);
    }

    // Update delivery record with success
    const { error: updateError } = await supabase
      .from("statement_email_delivery")
      .update({
        status: "SENT",
        provider: "resend",
        provider_message_id: messageId,
        delivery_mode,
        sent_at: new Date().toISOString(),
        attempt_count: (deliveryRecord.attempt_count || 0) + 1,
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", deliveryRecord.id);

    if (updateError) {
      console.error("Failed to update delivery record:", updateError);
    }

    // Log initial send event
    await supabase.from("report_delivery_events").insert({
      delivery_id: deliveryRecord.id,
      provider_message_id: messageId,
      event_type: "sent",
      event_data: {
        recipient: recipientEmail,
        subject,
        delivery_mode,
        sent_by: user.id,
      },
      occurred_at: new Date().toISOString(),
    });

    // Log to audit
    await supabase.from("report_delivery_audit").insert({
      delivery_id: deliveryRecord.id,
      action: "SENT_VIA_RESEND",
      performed_by: user.id,
      details: {
        provider: "resend",
        message_id: messageId,
        recipient: recipientEmail,
        delivery_mode,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        delivery_id: deliveryRecord.id,
        message_id: messageId,
        recipient: recipientEmail,
        status: "SENT",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in send-report-email:", errorMessage);

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
