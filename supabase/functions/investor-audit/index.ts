import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { auditRequestSchema, validateRequest } from "../_shared/validation.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Validate environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("Missing required environment variables");
      return new Response(
        JSON.stringify({
          error: "Server configuration error. Please contact support.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: req.headers.get("Authorization")! },
      },
    });

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify admin permission
    const { data: adminData } = await supabaseClient
      .from("admin_users")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!adminData) {
      return new Response(JSON.stringify({ error: "Forbidden: Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse and validate request
    const url = new URL(req.url);
    const queryParams: Record<string, string | undefined> = {
      report_type: url.searchParams.get("report_type") || undefined,
      investor_id: url.searchParams.get("investor_id") || undefined,
      format: url.searchParams.get("format") || undefined,
    };

    const validation = validateRequest(auditRequestSchema, queryParams, corsHeaders);
    if (!validation.success) {
      return validation.response;
    }

    const { report_type: reportType, investor_id: investorId, format } = validation.data;

    let result: any;

    switch (reportType) {
      case "overview":
        // Get investor audit overview
        if (investorId) {
          const { data, error } = await supabaseClient
            .from("investor_audit_overview")
            .select("*")
            .eq("investor_id", investorId)
            .single();

          if (error) throw error;
          result = data;
        } else {
          const { data, error } = await supabaseClient
            .from("investor_audit_overview")
            .select("*")
            .order("onboarded_at", { ascending: false });

          if (error) throw error;
          result = data;
        }
        break;

      case "reconciliation":
        // Financial reconciliation
        const { data: reconData, error: reconError } = await supabaseClient
          .from("financial_reconciliation")
          .select("*")
          .order("invested_discrepancy", { ascending: false });

        if (reconError) throw reconError;

        result = {
          reconciliation_data: reconData,
          summary: {
            total_investors: reconData?.length || 0,
            mismatches:
              reconData?.filter((r: any) => r.reconciliation_status === "MISMATCH").length || 0,
            total_discrepancy:
              reconData?.reduce((sum: number, r: any) => sum + (r.invested_discrepancy || 0), 0) ||
              0,
          },
        };
        break;

      case "compliance":
        // Compliance status
        const { data: compData, error: compError } = await supabaseClient
          .from("compliance_status")
          .select("*")
          .order("created_at", { ascending: false });

        if (compError) throw compError;

        result = {
          compliance_data: compData,
          summary: {
            total: compData?.length || 0,
            kyc_compliant:
              compData?.filter((c: any) => c.kyc_compliance_status === "COMPLIANT").length || 0,
            doc_compliant:
              compData?.filter((c: any) => c.document_compliance_status === "COMPLIANT").length ||
              0,
            profile_complete:
              compData?.filter((c: any) => c.profile_completeness === "COMPLETE").length || 0,
            active: compData?.filter((c: any) => c.activity_status === "ACTIVE").length || 0,
          },
        };
        break;

      case "anomalies":
        // Data anomalies
        const { data: anomData, error: anomError } = await supabaseClient
          .from("data_integrity_anomalies")
          .select("*");

        if (anomError) throw anomError;

        result = {
          anomalies: anomData,
          summary: {
            total_anomalies: anomData?.length || 0,
            by_type:
              anomData?.reduce((acc: any, anom: any) => {
                acc[anom.anomaly_type] = (acc[anom.anomaly_type] || 0) + 1;
                return acc;
              }, {}) || {},
          },
        };
        break;

      case "activity":
        // Activity summary
        const { data: actData, error: actError } = await supabaseClient
          .from("investor_activity_summary")
          .select("*")
          .order("last_transaction_date", { ascending: false, nullsFirst: false });

        if (actError) throw actError;

        result = {
          activity_data: actData,
          summary: {
            total: actData?.length || 0,
            active: actData?.filter((a: any) => a.activity_level === "ACTIVE").length || 0,
            moderate: actData?.filter((a: any) => a.activity_level === "MODERATE").length || 0,
            low: actData?.filter((a: any) => a.activity_level === "LOW").length || 0,
            dormant: actData?.filter((a: any) => a.activity_level === "DORMANT").length || 0,
          },
        };
        break;

      case "full_report":
        // Generate comprehensive report
        const { data: reportData, error: reportError } = await supabaseClient.rpc(
          "generate_investor_audit_report",
          {
            p_investor_id: investorId || null,
          }
        );

        if (reportError) throw reportError;
        result = reportData;
        break;

      default:
        return new Response(
          JSON.stringify({
            error:
              "Invalid report_type. Options: overview, reconciliation, compliance, anomalies, activity, full_report",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
    }

    // Log audit access
    await supabaseClient.from("audit_log").insert({
      actor_user: user.id,
      action: "VIEW_INVESTOR_AUDIT",
      entity: "investor_audit",
      entity_id: investorId || "all",
      meta: {
        report_type: reportType,
        format: format,
      },
    });

    // Format response
    if (format === "summary" && result) {
      // Return only summary stats
      result = {
        summary: result.summary || {
          report_type: reportType,
          investor_id: investorId,
          record_count: Array.isArray(result) ? result.length : 1,
        },
      };
    }

    return new Response(
      JSON.stringify({
        success: true,
        report_type: reportType,
        investor_id: investorId,
        data: result,
        generated_at: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    const errorId = crypto.randomUUID();
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Investor audit error:", { errorId, error: errorMessage });

    return new Response(
      JSON.stringify({
        error: "An error occurred while generating the audit report",
        error_id: errorId,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
