import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface ParityResult {
  ok: boolean;
  diffs: {
    aum: Array<{
      sheet: string;
      date: string;
      excelAum: number;
      dbAum: number;
      difference: number;
      percentDiff: number;
    }>;
    transactions: Array<{
      investor: string;
      date: string;
      excelAmount: number;
      dbAmount: number;
      difference: number;
    }>;
    investors: Array<{
      email: string;
      field: string;
      excelValue: any;
      dbValue: any;
    }>;
  };
  summary: {
    totalAumDiffs: number;
    totalTransactionDiffs: number;
    totalInvestorDiffs: number;
    maxAumVariance: number;
    maxTransactionVariance: number;
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Check authentication
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response("Unauthorized", { status: 401, headers: corsHeaders });
  }

  const token = authHeader.replace("Bearer ", "");
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return new Response("Invalid token", { status: 401, headers: corsHeaders });
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return new Response("Admin access required", { status: 403, headers: corsHeaders });
  }

  try {
    // Parse request
    const contentType = req.headers.get("content-type") || "";
    let workbook: any;

    if (contentType.includes("multipart/form-data")) {
      // File upload
      const formData = await req.formData();
      const file = formData.get("file");

      if (!(file instanceof File)) {
        return new Response("File required", {
          status: 400,
          headers: corsHeaders,
        });
      }

      const buffer = new Uint8Array(await file.arrayBuffer());
      workbook = XLSX.read(buffer, { type: "array", cellDates: true });
    } else {
      // Base64 encoded file (for testing)
      const url = new URL(req.url);
      const base64File = url.searchParams.get("file");

      if (!base64File) {
        return new Response("File parameter required", {
          status: 400,
          headers: corsHeaders,
        });
      }

      const bytes = Uint8Array.from(atob(base64File), (c) => c.charCodeAt(0));
      workbook = XLSX.read(bytes, { type: "array", cellDates: true });
    }

    const result: ParityResult = {
      ok: true,
      diffs: {
        aum: [],
        transactions: [],
        investors: [],
      },
      summary: {
        totalAumDiffs: 0,
        totalTransactionDiffs: 0,
        totalInvestorDiffs: 0,
        maxAumVariance: 0,
        maxTransactionVariance: 0,
      },
    };

    // Get funds from database
    const { data: funds } = await supabase.from("funds").select("id, code");

    // Check AUM parity for each fund
    for (const sheetName of ["BTC Yield Fund", "ETH Yield Fund", "USDT Yield Fund"]) {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) continue;

      const rows = XLSX.utils.sheet_to_json<any>(sheet, { defval: null });
      const fundCode = sheetName.startsWith("BTC")
        ? "BTCYF"
        : sheetName.startsWith("ETH")
          ? "ETHYF"
          : "USDTYF";

      const fund = funds?.find((f: any) => f.code === fundCode);
      if (!fund) continue;

      // Get NAV data from database
      const { data: navData } = await supabase
        .from("daily_nav")
        .select("nav_date, aum")
        .eq("fund_id", fund.id);

      const navMap = new Map(
        navData?.map((d: any) => [
          new Date(d.nav_date).toISOString().slice(0, 10),
          Number(d.aum),
        ]) || []
      );

      // Compare with Excel data
      for (const row of rows) {
        if (!row["Date"]) continue;

        const dateKey = new Date(row["Date"]).toISOString().slice(0, 10);
        const excelAum = Number(row["AUM"] || 0);
        const dbAum = navMap.get(dateKey);

        if (dbAum !== undefined) {
          const diff = Math.abs(dbAum - excelAum);
          const percentDiff = dbAum !== 0 ? (diff / dbAum) * 100 : 0;

          // Only report differences greater than 0.01%
          if (diff > 0.0001 && percentDiff > 0.01) {
            result.diffs.aum.push({
              sheet: sheetName,
              date: dateKey,
              excelAum,
              dbAum,
              difference: diff,
              percentDiff,
            });

            result.summary.totalAumDiffs++;
            result.summary.maxAumVariance = Math.max(result.summary.maxAumVariance, percentDiff);
          }
        }
      }
    }

    // Check Transactions parity
    const investmentsSheet = workbook.Sheets["Investments"];
    if (investmentsSheet) {
      const rows = XLSX.utils.sheet_to_json<any>(investmentsSheet, { defval: null });

      // Get all transactions from database
      const { data: dbTransactions } = await supabase.from("transactions_v2").select(`
          tx_date,
          amount,
          asset,
          investors!inner(email)
        `);

      // Create a map for database transactions
      const txMap = new Map<string, number>();
      for (const tx of dbTransactions || []) {
        const key = `${tx.investors.email}_${new Date(tx.tx_date).toISOString().slice(0, 10)}_${tx.asset}`;
        txMap.set(key, Number(tx.amount));
      }

      // Compare with Excel data
      for (const row of rows) {
        const email = (row["Email"] || "").toString().trim().toLowerCase();
        const date = row["Investment Date"]
          ? new Date(row["Investment Date"]).toISOString().slice(0, 10)
          : "";
        const asset = (row["Currency"] || "").toString().toUpperCase();
        const amount = Number(row["Amount"] || 0);

        if (email && date && asset && amount > 0) {
          const key = `${email}_${date}_${asset}`;
          const dbAmount = txMap.get(key);

          if (dbAmount !== undefined) {
            const diff = Math.abs(dbAmount - amount);

            // Only report differences greater than 0.01
            if (diff > 0.01) {
              result.diffs.transactions.push({
                investor: email,
                date,
                excelAmount: amount,
                dbAmount,
                difference: diff,
              });

              result.summary.totalTransactionDiffs++;
              result.summary.maxTransactionVariance = Math.max(
                result.summary.maxTransactionVariance,
                diff
              );
            }
          }
        }
      }

      // Check Investor data parity
      const { data: dbInvestors } = await supabase
        .from("investors")
        .select("email, name, phone, kyc_status, aml_status, status");

      const investorMap = new Map(dbInvestors?.map((i: any) => [i.email, i]) || []);

      // Get unique investors from Excel
      const excelInvestors = new Map<string, any>();
      for (const row of rows) {
        const email = (row["Email"] || "").toString().trim().toLowerCase();
        if (email && !excelInvestors.has(email)) {
          excelInvestors.set(email, {
            name: row["Investor Name"],
            phone: row["Phone"],
            kyc_status: row["KYC Status"],
            aml_status: row["AML Status"],
            status: row["Status"],
          });
        }
      }

      // Compare investor data
      for (const [email, excelData] of excelInvestors) {
        const dbData = investorMap.get(email);

        if (dbData) {
          // Check each field for differences
          const fieldsToCheck = ["name", "phone", "kyc_status", "aml_status", "status"];

          for (const field of fieldsToCheck) {
            const excelValue = excelData[field];
            const dbValue = dbData[field];

            if (excelValue && dbValue && excelValue !== dbValue) {
              result.diffs.investors.push({
                email,
                field,
                excelValue,
                dbValue,
              });
              result.summary.totalInvestorDiffs++;
            }
          }
        }
      }
    }

    // Determine if parity check passed
    result.ok =
      result.summary.totalAumDiffs === 0 &&
      result.summary.totalTransactionDiffs === 0 &&
      result.summary.totalInvestorDiffs === 0;

    // Log parity check result
    await supabase.from("audit_log").insert({
      action: "PARITY_CHECK",
      entity: "excel_data",
      actor_user: user.id,
      meta: {
        ok: result.ok,
        summary: result.summary,
        timestamp: new Date().toISOString(),
      },
    });

    return new Response(JSON.stringify(result), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Parity check error:", error);
    return new Response(
      JSON.stringify({
        ok: false,
        error: String(error),
        diffs: { aum: [], transactions: [], investors: [] },
        summary: {
          totalAumDiffs: 0,
          totalTransactionDiffs: 0,
          totalInvestorDiffs: 0,
          maxAumVariance: 0,
          maxTransactionVariance: 0,
        },
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
