import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

// Secure CORS configuration - Read-only export, CSRF not required but CORS restricted
const allowedOrigins = Deno.env.get("ALLOWED_ORIGINS")?.split(",") || [];
const corsHeaders = (origin: string | null) => ({
  "Access-Control-Allow-Origin":
    origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0] || "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
});

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  const origin = req.headers.get("origin");
  const headers = corsHeaders(origin);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers });
  }

  // Check authentication
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response("Unauthorized", { status: 401, headers });
  }

  const token = authHeader.replace("Bearer ", "");
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return new Response("Invalid token", { status: 401, headers });
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return new Response("Admin access required", { status: 403, headers });
  }

  try {
    // Parse query parameters
    const url = new URL(req.url);
    const exportType = url.searchParams.get("type") || "full";
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");

    // Create workbook
    const workbook = XLSX.utils.book_new();

    // Export Investors and Transactions (Investments sheet)
    if (exportType === "investors" || exportType === "transactions" || exportType === "full") {
      const { data: transactions } = await supabase
        .from("transactions_v2")
        .select(
          `
          tx_date,
          amount,
          type,
          asset,
          tx_hash,
          notes,
          investors!inner(
            email,
            name,
            phone,
            entity_type,
            tax_id,
            kyc_status,
            aml_status,
            accredited,
            status,
            onboarding_date
          ),
          funds!inner(code)
        `
        )
        .order("tx_date", { ascending: false });

      if (transactions && transactions.length > 0) {
        const investmentRows = transactions.map((t: any) => ({
          "Investment Date": t.tx_date,
          "Investor Name": t.investors?.name,
          Email: t.investors?.email,
          Phone: t.investors?.phone || "",
          "Entity Type": t.investors?.entity_type || "",
          "Tax ID": t.investors?.tax_id || "",
          "KYC Status": t.investors?.kyc_status,
          "AML Status": t.investors?.aml_status,
          Accredited: t.investors?.accredited ? "Yes" : "No",
          Status: t.investors?.status,
          "Onboarding Date": t.investors?.onboarding_date,
          Currency: t.asset,
          Amount: t.amount,
          Type: t.type,
          Fund: t.funds?.code,
          "Transaction Hash": t.tx_hash || "",
          Notes: t.notes || "",
        }));

        const worksheet = XLSX.utils.json_to_sheet(investmentRows);
        XLSX.utils.book_append_sheet(workbook, worksheet, "Investments");
      }
    }

    // Export Daily NAV data for each fund
    if (exportType === "daily_nav" || exportType === "full") {
      const { data: funds } = await supabase
        .from("funds")
        .select("id, code, name")
        .eq("status", "active");

      for (const fund of funds || []) {
        let query = supabase
          .from("daily_nav")
          .select("*")
          .eq("fund_id", fund.id)
          .order("nav_date", { ascending: true });

        // Apply date filters if provided
        if (startDate) {
          query = query.gte("nav_date", startDate);
        }
        if (endDate) {
          query = query.lte("nav_date", endDate);
        }

        const { data: navData } = await query;

        if (navData && navData.length > 0) {
          const navRows = navData.map((d: any) => ({
            Date: d.nav_date,
            AUM: d.aum,
            "NAV per Share": d.nav_per_share || "",
            "Shares Outstanding": d.shares_outstanding || "",
            "Gross Performance (%)": d.gross_return_pct,
            "Net Performance": d.net_return_pct,
            Fees: d.fees_accrued,
            Inflows: d.total_inflows || 0,
            Outflows: d.total_outflows || 0,
            "Investor Count": d.investor_count || 0,
          }));

          const worksheet = XLSX.utils.json_to_sheet(navRows);

          // Map fund code to sheet name
          const sheetName =
            fund.code === "BTCYF"
              ? "BTC Yield Fund"
              : fund.code === "ETHYF"
                ? "ETH Yield Fund"
                : fund.code === "USDTYF"
                  ? "USDT Yield Fund"
                  : fund.name;

          XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
        }
      }
    }

    // Export Performance Summary
    if (exportType === "performance" || exportType === "full") {
      const { data: kpis } = await supabase.from("v_fund_kpis").select("*");

      if (kpis && kpis.length > 0) {
        const performanceRows = kpis.map((k: any) => ({
          Fund: k.code,
          Name: k.name,
          Asset: k.asset,
          "Day Return %": k.day_return_pct,
          "MTD Return %": k.mtd_return,
          "QTD Return %": k.qtd_return,
          "YTD Return %": k.ytd_return,
          "ITD Return %": k.itd_return,
          "Current AUM": k.current_aum,
          "Active Investors": k.active_investors,
        }));

        const worksheet = XLSX.utils.json_to_sheet(performanceRows);
        XLSX.utils.book_append_sheet(workbook, worksheet, "Performance Summary");
      }
    }

    // Export Fee Calculations
    if (exportType === "fees" || exportType === "full") {
      const { data: fees } = await supabase
        .from("fee_calculations")
        .select(
          `
          calculation_date,
          fee_type,
          calculation_basis,
          rate_bps,
          fee_amount,
          status,
          notes,
          investors!inner(email, name),
          funds!inner(code)
        `
        )
        .order("calculation_date", { ascending: false });

      if (fees && fees.length > 0) {
        const feeRows = fees.map((f: any) => ({
          Date: f.calculation_date,
          "Investor Email": f.investors?.email,
          "Investor Name": f.investors?.name,
          Fund: f.funds?.code,
          Type: f.fee_type,
          "Basis Amount": f.calculation_basis,
          "Rate (bps)": f.rate_bps,
          "Fee Amount": f.fee_amount,
          Status: f.status,
          Notes: f.notes || "",
        }));

        const worksheet = XLSX.utils.json_to_sheet(feeRows);
        XLSX.utils.book_append_sheet(workbook, worksheet, "Fees");
      }
    }

    // Export Reconciliation
    if (exportType === "reconciliation" || exportType === "full") {
      const { data: recon } = await supabase
        .from("reconciliation")
        .select(
          `
          reconciliation_date,
          beginning_nav,
          net_flows,
          gross_pnl,
          fees,
          ending_nav,
          calculated_nav,
          variance,
          variance_pct,
          status,
          notes,
          funds!inner(code, name)
        `
        )
        .order("reconciliation_date", { ascending: false });

      if (recon && recon.length > 0) {
        const reconRows = recon.map((r: any) => ({
          Date: r.reconciliation_date,
          Fund: r.funds?.code,
          "Fund Name": r.funds?.name,
          "Beginning NAV": r.beginning_nav,
          "Net Flows": r.net_flows,
          "Gross P&L": r.gross_pnl,
          Fees: r.fees,
          "Ending NAV": r.ending_nav,
          "Calculated NAV": r.calculated_nav,
          Variance: r.variance,
          "Variance %": r.variance_pct,
          Status: r.status,
          Notes: r.notes || "",
        }));

        const worksheet = XLSX.utils.json_to_sheet(reconRows);
        XLSX.utils.book_append_sheet(workbook, worksheet, "Reconciliation");
      }
    }

    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, {
      type: "array",
      bookType: "xlsx",
      compression: true,
    });

    // Generate filename with timestamp
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];
    const timeStr = now.toTimeString().split(" ")[0].replace(/:/g, "");
    const filename = `indigo_export_${dateStr}_${timeStr}.xlsx`;

    // Audit log: data export
    await supabase.from("audit_log").insert({
      action: "DATA_EXPORT",
      entity: "excel_workbook",
      entity_id: filename,
      actor_user: user.id,
      meta: { export_type: exportType, start_date: startDate, end_date: endDate },
    });

    return new Response(new Uint8Array(excelBuffer), {
      headers: {
        ...headers,
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: String(error),
      }),
      {
        status: 500,
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
