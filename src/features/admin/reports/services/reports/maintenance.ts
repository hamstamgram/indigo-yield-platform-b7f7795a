import { supabase } from "@/integrations/supabase/client";
import { db } from "@/lib/db";

/**
 * Delete a performance report record with audit trail
 */
export async function deletePerformanceReport(id: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: report } = await supabase
    .from("investor_fund_performance")
    .select("id, investor_id, fund_name, period_id")
    .eq("id", id)
    .maybeSingle();

  const { error } = await db.delete("investor_fund_performance", { column: "id", value: id });
  if (error) throw new Error(error.message);

  await db.insert("audit_log", {
    actor_user: user?.id ?? null,
    action: "PERFORMANCE_REPORT_DELETED",
    entity: "investor_fund_performance",
    entity_id: id,
    old_values: report
      ? {
          investor_id: report.investor_id,
          fund_name: report.fund_name,
          period_id: report.period_id,
        }
      : null,
    new_values: null,
  });
}

/**
 * Delete all report components for a specific investor and period
 */
export async function deleteInvestorReport(investorId: string, periodId: string): Promise<void> {
  if (!investorId || !periodId) throw new Error("Missing required parameters");

  // 1. Delete performance records (V2) — compound filter, direct supabase
  const { error: perfError } = await supabase
    .from("investor_fund_performance")
    .delete()
    .eq("investor_id", investorId)
    .eq("period_id", periodId);

  if (perfError) throw perfError;

  // 2. Delete generated statement record — compound filter, direct supabase
  const { error: stmtError } = await supabase
    .from("generated_statements")
    .delete()
    .eq("investor_id", investorId)
    .eq("period_id", periodId);

  if (stmtError) throw stmtError;

  // 3. Delete delivery logs — compound filter, direct supabase
  const { error: delError } = await supabase
    .from("statement_email_delivery")
    .delete()
    .eq("investor_id", investorId)
    .eq("period_id", periodId);

  if (delError) throw delError;

  // 4. Log the action
  const {
    data: { user },
  } = await supabase.auth.getUser();
  await db.insert("audit_log", {
    actor_user: user?.id ?? null,
    action: "INVESTOR_REPORT_DELETED",
    entity: "generated_statements",
    entity_id: `${investorId}:${periodId}`,
    old_values: { investor_id: investorId, period_id: periodId },
  });
}
