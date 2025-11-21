/**
 * Supabase Edge Function: Generate Report
 * Handles asynchronous report generation and storage
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Secure CORS configuration
const allowedOrigins = Deno.env.get("ALLOWED_ORIGINS")?.split(",") || [];
const corsHeaders = (origin: string | null) => ({
  "Access-Control-Allow-Origin":
    origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0] || "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-csrf-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
});

interface GenerateReportRequest {
  reportId: string;
  reportType: string;
  format: string;
  filters?: Record<string, any>;
  parameters?: Record<string, any>;
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  const headers = corsHeaders(origin);

  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers });
  }

  try {
    // CSRF validation for state-changing operations
    const csrfToken = req.headers.get("x-csrf-token");
    if (!csrfToken || csrfToken.length < 32) {
      return new Response(JSON.stringify({ success: false, error: "Invalid CSRF token" }), {
        headers: { ...headers, "Content-Type": "application/json" },
        status: 403,
      });
    }
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Parse request
    const { reportId, reportType, format, filters, parameters }: GenerateReportRequest =
      await req.json();

    console.log("Generating report:", { reportId, reportType, format });

    // Update status to processing
    await supabaseClient
      .from("generated_reports")
      .update({
        status: "processing",
        processing_started_at: new Date().toISOString(),
      })
      .eq("id", reportId);

    // Fetch report data
    const startTime = Date.now();

    // Get user ID from report record
    const { data: reportRecord } = await supabaseClient
      .from("generated_reports")
      .select("generated_for_user_id")
      .eq("id", reportId)
      .single();

    if (!reportRecord) {
      throw new Error("Report record not found");
    }

    const userId = reportRecord.generated_for_user_id;

    // Fetch data based on report type
    // Note: In production, this would call the actual data fetching functions
    // For now, we'll create a placeholder
    const reportData = await fetchReportData(
      supabaseClient,
      userId,
      reportType,
      filters || {},
      parameters || {}
    );

    // Generate report based on format
    let fileBuffer: Uint8Array;
    let filename: string;
    let contentType: string;

    if (format === "pdf") {
      // In production, this would use the PDF generator
      // For now, create placeholder
      fileBuffer = new TextEncoder().encode("PDF Report Placeholder");
      filename = `report_${Date.now()}.pdf`;
      contentType = "application/pdf";
    } else if (format === "excel") {
      fileBuffer = new TextEncoder().encode("Excel Report Placeholder");
      filename = `report_${Date.now()}.xlsx`;
      contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    } else if (format === "csv") {
      fileBuffer = new TextEncoder().encode("CSV Report Placeholder");
      filename = `report_${Date.now()}.csv`;
      contentType = "text/csv";
    } else if (format === "json") {
      fileBuffer = new TextEncoder().encode(JSON.stringify(reportData, null, 2));
      filename = `report_${Date.now()}.json`;
      contentType = "application/json";
    } else {
      throw new Error(`Unsupported format: ${format}`);
    }

    // Upload to storage
    const storagePath = `${userId}/${reportId}/${filename}`;

    const { error: uploadError } = await supabaseClient.storage
      .from("reports")
      .upload(storagePath, fileBuffer, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    // Generate signed URL (valid for 7 days)
    const { data: signedUrlData } = await supabaseClient.storage
      .from("reports")
      .createSignedUrl(storagePath, 604800); // 7 days

    const processingDuration = Date.now() - startTime;

    // Update report record with success
    await supabaseClient
      .from("generated_reports")
      .update({
        status: "completed",
        storage_path: storagePath,
        file_size_bytes: fileBuffer.length,
        download_url: signedUrlData?.signedUrl || null,
        download_url_expires_at: new Date(Date.now() + 604800 * 1000).toISOString(),
        processing_completed_at: new Date().toISOString(),
        processing_duration_ms: processingDuration,
      })
      .eq("id", reportId);

    console.log("Report generated successfully:", {
      reportId,
      duration: processingDuration,
      size: fileBuffer.length,
    });

    return new Response(
      JSON.stringify({
        success: true,
        reportId,
        storagePath,
        downloadUrl: signedUrlData?.signedUrl,
        fileSize: fileBuffer.length,
        processingDuration,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Report generation failed:", error);

    // Update report with error status
    const { reportId } = await req
      .clone()
      .json()
      .catch(() => ({}));

    if (reportId) {
      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      await supabaseClient
        .from("generated_reports")
        .update({
          status: "failed",
          error_message: error instanceof Error ? error.message : "Unknown error",
          error_details: {
            error: error instanceof Error ? error.toString() : error,
            stack: error instanceof Error ? error.stack : undefined,
          },
          processing_completed_at: new Date().toISOString(),
        })
        .eq("id", reportId);
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

/**
 * Fetch report data from database
 * Note: In production, this would be more sophisticated
 */
async function fetchReportData(
  supabase: any,
  userId: string,
  reportType: string,
  filters: Record<string, any>,
  parameters: Record<string, any>
): Promise<any> {
  const endDate = filters.dateRangeEnd ? new Date(filters.dateRangeEnd) : new Date();
  const startDate = filters.dateRangeStart
    ? new Date(filters.dateRangeStart)
    : new Date(endDate.getFullYear(), endDate.getMonth(), 1);

  // Fetch basic data
  const { data: positions } = await supabase
    .from("positions")
    .select("*")
    .eq("investor_id", userId);

  const { data: transactions } = await supabase
    .from("transactions")
    .select("*")
    .eq("investor_id", userId)
    .gte("created_at", startDate.toISOString())
    .lte("created_at", endDate.toISOString())
    .order("created_at", { ascending: false });

  const { data: statements } = await supabase
    .from("statements")
    .select("*")
    .eq("investor_id", userId)
    .order("period_year", { ascending: false })
    .order("period_month", { ascending: false })
    .limit(12);

  // Build report data structure
  return {
    title: reportType
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" "),
    generatedDate: new Date().toISOString(),
    reportPeriod: `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`,
    summary: {
      totalValue: positions?.reduce((sum, p) => sum + Number(p.current_balance), 0) || 0,
      positionCount: positions?.length || 0,
      transactionCount: transactions?.length || 0,
    },
    holdings: positions || [],
    transactions: transactions || [],
    statements: statements || [],
  };
}
