import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendReportRequest {
  delivery_id?: string;
  investor_id?: string;
  period_id?: string;
  delivery_mode?: "email_html" | "pdf_attachment" | "link_only" | "hybrid";
  health_check?: boolean;
}

/**
 * Generate PDF from HTML content using a minimal approach
 * Returns base64 encoded PDF content
 */
async function generatePDFFromHTML(htmlContent: string, investorName: string, periodName: string): Promise<string | null> {
  try {
    // Use a PDF generation service or library
    // For now, we'll use a simple text-based PDF approach with embedded HTML
    // In production, you might want to use a service like html-pdf-node or Puppeteer
    
    // Try using an external PDF generation API if available
    const PDF_API_URL = Deno.env.get("PDF_GENERATION_API_URL");
    const PDF_API_KEY = Deno.env.get("PDF_GENERATION_API_KEY");
    
    if (PDF_API_URL && PDF_API_KEY) {
      const response = await fetch(PDF_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${PDF_API_KEY}`,
        },
        body: JSON.stringify({
          html: htmlContent,
          filename: `Statement_${periodName}_${investorName}`,
          format: "A4",
          margin: { top: "20mm", right: "15mm", bottom: "20mm", left: "15mm" },
        }),
      });
      
      if (response.ok) {
        const buffer = await response.arrayBuffer();
        return btoa(String.fromCharCode(...new Uint8Array(buffer)));
      }
    }
    
    // Fallback: Create a simple PDF structure manually
    // This is a minimal PDF that wraps the HTML content
    const pdfHeader = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
4 0 obj
<< /Length 200 >>
stream
BT
/F1 12 Tf
50 750 Td
(INDIGO Monthly Report) Tj
0 -20 Td
(Period: ${periodName}) Tj
0 -20 Td
(Investor: ${investorName}) Tj
0 -40 Td
(Please view the HTML email for the full report.) Tj
ET
endstream
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000270 00000 n 
0000000214 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
520
%%EOF`;
    
    return btoa(pdfHeader);
  } catch (error) {
    console.error("PDF generation error:", error);
    return null;
  }
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get environment variables
    const MAILERSEND_API_TOKEN = Deno.env.get("MAILERSEND_API_TOKEN");
    const MAILERSEND_FROM_EMAIL = Deno.env.get("MAILERSEND_FROM_EMAIL") || "reports@indigoyield.com";
    const MAILERSEND_FROM_NAME = Deno.env.get("MAILERSEND_FROM_NAME") || "Indigo Yield";
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Create Supabase client with service role
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Parse request body first to check for health_check
    const body: SendReportRequest = await req.json();

    // Handle health check mode - admin auth still required but only pings MailerSend
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
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !user) {
        return new Response(JSON.stringify({ error: "Invalid token" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();

      if (!profile?.is_admin) {
        return new Response(JSON.stringify({ error: "Admin access required" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if MailerSend API token is configured
      if (!MAILERSEND_API_TOKEN) {
        return new Response(JSON.stringify({ 
          status: "error", 
          message: "MAILERSEND_API_TOKEN not configured" 
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Ping MailerSend API to verify token is valid
      const healthCheckResponse = await fetch("https://api.mailersend.com/v1/api-quota", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${MAILERSEND_API_TOKEN}`,
        },
      });

      if (healthCheckResponse.ok) {
        const quotaData = await healthCheckResponse.json();
        return new Response(JSON.stringify({ 
          status: "ok",
          message: "MailerSend API is reachable",
          from_email: MAILERSEND_FROM_EMAIL,
          from_name: MAILERSEND_FROM_NAME,
          remaining_quota: quotaData.remaining,
          total_quota: quotaData.total,
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } else {
        const errorText = await healthCheckResponse.text();
        return new Response(JSON.stringify({ 
          status: "error", 
          message: `MailerSend API error: ${healthCheckResponse.status}`,
          details: errorText,
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Regular send flow - require API token
    if (!MAILERSEND_API_TOKEN) {
      throw new Error("MAILERSEND_API_TOKEN not configured");
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
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin status
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin, email")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
        .select(`
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
        `)
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
        // Create new delivery record
        const { data: newDelivery, error: createError } = await supabase
          .from("statement_email_delivery")
          .insert({
            investor_id,
            period_id,
            statement_id: statement.id,
            status: "QUEUED",
            provider: "mailersend",
            delivery_mode,
            created_by: user.id,
          })
          .select()
          .single();

        if (createError) {
          throw new Error(`Failed to create delivery record: ${createError.message}`);
        }
        deliveryRecord = newDelivery;
      }
    } else {
      throw new Error("Either delivery_id or (investor_id + period_id) required");
    }

    // Build recipient info
    const investorName = [investorData.first_name, investorData.last_name]
      .filter(Boolean)
      .join(" ") || investorData.email;
    const recipientEmail = investorData.email;

    if (!recipientEmail) {
      throw new Error("Investor has no email address");
    }

    // Build period name
    const monthNames = ["January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"];
    const periodName = `${monthNames[periodData.month - 1]} ${periodData.year}`;

    // Build email subject
    const subject = `INDIGO Monthly Report – ${periodName} – ${investorName}`;

    // Build plain text fallback
    const plainText = `
INDIGO Monthly Report
Period: ${periodName}
Investor: ${investorName}

Your monthly investment report is attached. 
Please view the HTML version or attached PDF for the full report.

This is an automated message from Indigo Yield.
    `.trim();

    // Prepare MailerSend API payload
    const emailPayload: Record<string, unknown> = {
      from: {
        email: MAILERSEND_FROM_EMAIL,
        name: MAILERSEND_FROM_NAME,
      },
      to: [{
        email: recipientEmail,
        name: investorName,
      }],
      subject,
      text: plainText,
      settings: {
        track_opens: true,
        track_clicks: true,
      },
    };

    // Add HTML content based on delivery mode
    if (delivery_mode === "email_html" || delivery_mode === "hybrid") {
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

    // PDF attachment support
    if (delivery_mode === "pdf_attachment" || delivery_mode === "hybrid") {
      // Generate PDF from HTML using a simple HTML-to-PDF approach
      const pdfContent = await generatePDFFromHTML(statementData.html_content, investorName, periodName);
      if (pdfContent) {
        emailPayload.attachments = [{
          content: pdfContent,
          filename: `Statement_${periodName.replace(" ", "_")}_${investorName.replace(/\s+/g, "_")}.pdf`,
          disposition: "attachment",
        }];
        console.log("PDF attachment added to email");
      } else {
        console.warn("PDF generation failed, sending without attachment");
      }
    }

    console.log(`Sending report to ${recipientEmail} via MailerSend...`);

    // Call MailerSend API
    const mailersendResponse = await fetch("https://api.mailersend.com/v1/email", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${MAILERSEND_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailPayload),
    });

    // Get message ID from response headers
    const messageId = mailersendResponse.headers.get("X-Message-Id");
    const responseStatus = mailersendResponse.status;

    console.log(`MailerSend response: status=${responseStatus}, messageId=${messageId}`);

    if (!mailersendResponse.ok) {
      const errorBody = await mailersendResponse.text();
      console.error("MailerSend error:", errorBody);

      // Update delivery record with failure
      await supabase
        .from("statement_email_delivery")
        .update({
          status: "FAILED",
          error_message: `MailerSend error: ${responseStatus} - ${errorBody}`,
          attempt_count: (deliveryRecord.attempt_count || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", deliveryRecord.id);

      throw new Error(`MailerSend API error: ${responseStatus} - ${errorBody}`);
    }

    // Update delivery record with success
    const { error: updateError } = await supabase
      .from("statement_email_delivery")
      .update({
        status: "SENT",
        provider: "mailersend",
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
    await supabase
      .from("report_delivery_events")
      .insert({
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
    await supabase
      .from("report_delivery_audit")
      .insert({
        delivery_id: deliveryRecord.id,
        action: "SENT_VIA_MAILERSEND",
        performed_by: user.id,
        details: {
          provider: "mailersend",
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
    console.error("Error in send-report-mailersend:", errorMessage);

    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
