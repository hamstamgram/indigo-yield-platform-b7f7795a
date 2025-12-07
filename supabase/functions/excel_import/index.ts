/// <reference lib="deno.unstable" />
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";
import { getCorsHeaders } from "../_shared/cors.ts";

// Initialize Supabase client with service role
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Load mapping configuration
async function getMapping() {
  try {
    const mappingJson = await Deno.readTextFile("./excel_to_db_mapping.json");
    return JSON.parse(mappingJson);
  } catch {
    // Fallback mapping if file not found
    return {
      investors: {
        sheet: "Investments",
        id_by: "Email",
        mappings: {
          name: "Investor Name",
          email: "Email",
          phone: "Phone",
        },
      },
      transactions: {
        sheet: "Investments",
        mappings: {
          tx_date: "Investment Date",
          investor_email: "Email",
          asset: "Currency",
          amount: "Amount",
          type: "DEPOSIT",
        },
      },
      daily_nav: {
        sheets: ["BTC Yield Fund", "ETH Yield Fund", "USDT Yield Fund"],
        columns: {
          nav_date: "Date",
          aum: "AUM",
          gross_return_pct: "Gross Performance (%)",
          net_return_pct: "Net Performance",
          fees_accrued: "Fees",
        },
        sheet_to_fund: {
          "BTC Yield Fund": "BTCYF",
          "ETH Yield Fund": "ETHYF",
          "USDT Yield Fund": "USDTYF",
        },
      },
    };
  }
}

// Main handler
serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Check authentication
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response("Unauthorized", { status: 401, headers: corsHeaders });
  }

  // Verify user is admin
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

    if (!contentType.includes("multipart/form-data")) {
      return new Response("multipart/form-data required", {
        status: 400,
        headers: corsHeaders,
      });
    }

    const formData = await req.formData();
    const file = formData.get("file");
    const importType = formData.get("importType") || "full";
    const validateOnly = formData.get("validateOnly") === "true";

    if (!(file instanceof File)) {
      return new Response("File required", {
        status: 400,
        headers: corsHeaders,
      });
    }

    // Create import log entry
    const { data: importLog, error: logError } = await supabase
      .from("excel_import_log")
      .insert({
        filename: file.name,
        import_type: importType as string,
        status: "processing",
        started_at: new Date().toISOString(),
        imported_by: user.id,
      })
      .select()
      .single();

    if (logError) {
      throw new Error(`Failed to create import log: ${logError.message}`);
    }

    // Read Excel file
    const buffer = new Uint8Array(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
    const mapping = await getMapping();

    const results = {
      inserted: { investors: 0, transactions: 0, daily_nav: 0 },
      updated: { investors: 0, transactions: 0, daily_nav: 0 },
      errors: [] as any[],
      warnings: [] as any[],
    };

    // Process investors
    if (importType === "investors" || importType === "full") {
      try {
        const sheet = workbook.Sheets[mapping.investors.sheet];
        if (sheet) {
          const rows = XLSX.utils.sheet_to_json<any>(sheet, { defval: null });

          for (const row of rows) {
            const email = (row[mapping.investors.mappings.email] || "")
              .toString()
              .trim()
              .toLowerCase();
            if (!email) continue;

            const investorData = {
              email,
              name: row[mapping.investors.mappings.name] || email,
              phone: row[mapping.investors.mappings.phone] || null,
              status: "active",
              kyc_status: "pending",
            };

            if (!validateOnly) {
              const { error } = await supabase
                .from("investors")
                .upsert(investorData, { onConflict: "email" });

              if (error) {
                results.errors.push({
                  type: "investor",
                  email,
                  error: error.message,
                });
              } else {
                results.inserted.investors++;
              }
            }
          }
        }
      } catch (e) {
        results.errors.push({
          stage: "investors",
          error: String(e),
        });
      }
    }

    // Process transactions
    if (importType === "transactions" || importType === "full") {
      try {
        const sheet = workbook.Sheets[mapping.transactions.sheet];
        if (sheet) {
          const rows = XLSX.utils.sheet_to_json<any>(sheet, { defval: null });

          for (const row of rows) {
            const email = (row[mapping.transactions.mappings.investor_email] || "")
              .toString()
              .trim()
              .toLowerCase();
            const asset = (row[mapping.transactions.mappings.asset] || "").toString().toUpperCase();
            const amount = Number(row[mapping.transactions.mappings.amount] || 0);

            if (!email || !asset || amount <= 0) continue;

            // Get investor ID
            const { data: investor } = await supabase
              .from("investors")
              .select("id")
              .eq("email", email)
              .single();

            if (!investor) {
              results.warnings.push({
                type: "transaction",
                email,
                warning: "Investor not found",
              });
              continue;
            }

            // Determine fund based on asset
            const fundCode =
              asset === "BTC"
                ? "BTCYF"
                : asset === "ETH"
                  ? "ETHYF"
                  : asset.startsWith("USD")
                    ? "USDTYF"
                    : null;

            if (!fundCode) {
              results.warnings.push({
                type: "transaction",
                asset,
                warning: "Unknown asset type",
              });
              continue;
            }

            const { data: fund } = await supabase
              .from("funds")
              .select("id")
              .eq("code", fundCode)
              .single();

            if (!fund) {
              results.errors.push({
                type: "transaction",
                fundCode,
                error: "Fund not found",
              });
              continue;
            }

            const transactionData = {
              investor_id: investor.id,
              fund_id: fund.id,
              tx_date: new Date(row[mapping.transactions.mappings.tx_date]),
              asset,
              amount,
              type: "DEPOSIT",
              tx_hash: row["Transaction Hash"] || null,
              notes: row["Notes"] || null,
              created_by: user.id,
            };

            if (!validateOnly) {
              const { error } = await supabase.from("transactions_v2").insert(transactionData);

              if (error) {
                results.errors.push({
                  type: "transaction",
                  email,
                  error: error.message,
                });
              } else {
                results.inserted.transactions++;
              }
            }
          }
        }
      } catch (e) {
        results.errors.push({
          stage: "transactions",
          error: String(e),
        });
      }
    }

    // Process daily NAV
    if (importType === "daily_nav" || importType === "full") {
      try {
        for (const sheetName of mapping.daily_nav.sheets) {
          const sheet = workbook.Sheets[sheetName];
          if (!sheet) continue;

          const fundCode = mapping.daily_nav.sheet_to_fund[sheetName];
          const { data: fund } = await supabase
            .from("funds")
            .select("id")
            .eq("code", fundCode)
            .single();

          if (!fund) continue;

          const rows = XLSX.utils.sheet_to_json<any>(sheet, { defval: null });

          for (const row of rows) {
            const navDate = row[mapping.daily_nav.columns.nav_date];
            if (!navDate) continue;

            const navData = {
              fund_id: fund.id,
              nav_date: new Date(navDate),
              aum: Number(row[mapping.daily_nav.columns.aum] || 0),
              gross_return_pct:
                row[mapping.daily_nav.columns.gross_return_pct] == null
                  ? null
                  : Number(row[mapping.daily_nav.columns.gross_return_pct]),
              net_return_pct:
                row[mapping.daily_nav.columns.net_return_pct] == null
                  ? null
                  : Number(row[mapping.daily_nav.columns.net_return_pct]),
              fees_accrued: Number(row[mapping.daily_nav.columns.fees_accrued] || 0),
              created_by: user.id,
            };

            if (!validateOnly) {
              const { error } = await supabase
                .from("daily_nav")
                .upsert(navData, { onConflict: "fund_id,nav_date" });

              if (error) {
                results.errors.push({
                  type: "daily_nav",
                  fund: fundCode,
                  date: navDate,
                  error: error.message,
                });
              } else {
                results.inserted.daily_nav++;
              }
            }
          }
        }
      } catch (e) {
        results.errors.push({
          stage: "daily_nav",
          error: String(e),
        });
      }
    }

    // Update import log
    await supabase
      .from("excel_import_log")
      .update({
        status: results.errors.length > 0 ? "completed_with_errors" : "completed",
        completed_at: new Date().toISOString(),
        rows_processed:
          results.inserted.investors + results.inserted.transactions + results.inserted.daily_nav,
        rows_succeeded:
          results.inserted.investors + results.inserted.transactions + results.inserted.daily_nav,
        rows_failed: results.errors.length,
        errors: results.errors.length > 0 ? results.errors : null,
      })
      .eq("id", importLog.id);

    return new Response(
      JSON.stringify({
        success: true,
        importLogId: importLog.id,
        results,
        validateOnly,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Import error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: String(error),
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
