/// <reference lib="deno.unstable" />
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";
import { getCorsHeaders } from "../_shared/cors.ts";
import { checkAdminAccess, createAdminDeniedResponse } from "../_shared/admin-check.ts";
import Decimal from "https://esm.sh/decimal.js@10.4.3";

// Initialize Supabase client with service role
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Safely parse a date value from Excel.
 * Returns null if the value is invalid instead of throwing.
 */
function safeParseDate(val: unknown): Date | null {
  if (val == null) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  const d = new Date(String(val));
  return isNaN(d.getTime()) ? null : d;
}

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

  // Check if user is admin via user_roles table (secure method)
  const adminCheck = await checkAdminAccess(supabase as any, user.id);
  if (!adminCheck.isAdmin) {
    return createAdminDeniedResponse(corsHeaders);
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
                  error: "Database operation failed",
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
            const amountVal = row[mapping.transactions.mappings.amount];
            const amountStr = (amountVal === null || amountVal === undefined) ? "0" : amountVal.toString();

            if (!email || !asset || new Decimal(amountStr).lte(0)) continue;

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

            // Generate deterministic reference_id for idempotency
            const parsedTxDate = safeParseDate(row[mapping.transactions.mappings.tx_date]);
            if (!parsedTxDate) {
              results.errors.push({
                type: "transaction",
                email,
                error: `Invalid date value: ${row[mapping.transactions.mappings.tx_date]}`,
              });
              continue;
            }
            const txDateStr = parsedTxDate.toISOString().split("T")[0];
            const referenceId = `import:${txDateStr}:${investor.id}:${fund.id}:${amountStr}`;

            const txNotes = row["Notes"] || `Excel import - ${new Date().toISOString()}`;

            if (!validateOnly) {
              // Route through canonical RPC to ensure crystallization,
              // position updates, and AUM consistency.
              const { data: rpcResult, error: rpcError } = await supabase.rpc(
                "apply_transaction_with_crystallization",
                {
                  p_fund_id: fund.id,
                  p_investor_id: investor.id,
                  p_tx_type: "DEPOSIT",
                  p_amount: new Decimal(amountStr).toNumber(),
                  p_tx_date: txDateStr,
                  p_reference_id: referenceId,
                  p_admin_id: user.id,
                  p_notes: txNotes,
                  p_purpose: "transaction",
                },
              );

              if (rpcError) {
                results.errors.push({
                  type: "transaction",
                  email,
                  error: rpcError.message || "Canonical RPC failed",
                });
                continue;
              }

              const txId = rpcResult?.tx_id;

              // Update visibility_scope which the canonical RPC does not set.
              // visibility_scope is explicitly excluded from immutability checks.
              if (txId) {
                const { error: updateError } = await supabase
                  .from("transactions_v2")
                  .update({ visibility_scope: "admin_only" })
                  .eq("id", txId);

                if (updateError) {
                  console.warn(
                    `[excel_import] Failed to update visibility_scope for tx ${txId}:`
,
                    updateError.message,
                  );
                }

                // Audit log each imported transaction
                await supabase.from("audit_log").insert({
                  actor_user: user.id,
                  action: "excel_import_transaction",
                  entity: "transactions_v2",
                  entity_id: txId,
                  meta: {
                    reference_id: referenceId,
                    investor_email: email,
                    fund_id: fund.id,
                    amount: amountStr,
                    tx_date: txDateStr,
                  },
                });
              }

              results.inserted.transactions++;
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
            const navDateRaw = row[mapping.daily_nav.columns.nav_date];
            if (!navDateRaw) continue;

            const navDate = safeParseDate(navDateRaw);
            if (!navDate) {
              results.errors.push({
                type: "daily_nav",
                sheet: sheetName,
                error: `Invalid nav_date value: ${navDateRaw}`,
              });
              continue;
            }

            const aumVal = row[mapping.daily_nav.columns.aum];
            const grossVal = row[mapping.daily_nav.columns.gross_return_pct];
            const netVal = row[mapping.daily_nav.columns.net_return_pct];
            const feesVal = row[mapping.daily_nav.columns.fees_accrued];

            const navData = {
              fund_id: fund.id,
              nav_date: navDate,
              aum: (aumVal === null || aumVal === undefined) ? "0" : aumVal.toString(),
              gross_return_pct: grossVal == null ? null : grossVal.toString(),
              net_return_pct: netVal == null ? null : netVal.toString(),
              fees_accrued: (feesVal === null || feesVal === undefined) ? "0" : feesVal.toString(),
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
                  error: "Database operation failed",
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

    // Batch audit log for the overall import operation
    await supabase.from("audit_log").insert({
      actor_user: user.id,
      action: "excel_import_complete",
      entity: "excel_import_log",
      entity_id: importLog.id,
      meta: {
        validate_only: validateOnly,
        investors: results.inserted.investors,
        transactions: results.inserted.transactions,
        daily_nav: results.inserted.daily_nav,
        errors: results.errors.length,
      },
    });

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
        error: "Import processing failed",
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
