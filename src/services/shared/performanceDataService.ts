/**
 * Performance Data Service
 * CRUD operations for investor_fund_performance table
 */

import { supabase } from "@/integrations/supabase/client";
import { logError } from "@/lib/logger";
import { db } from "@/lib/db/index";

export interface PerformanceData {
  id: string;
  investor_id: string;
  period_id: string;
  fund_name: string;
  // MTD
  mtd_beginning_balance: number;
  mtd_additions: number;
  mtd_redemptions: number;
  mtd_net_income: number;
  mtd_ending_balance: number;
  mtd_rate_of_return: number;
  // QTD
  qtd_beginning_balance: number;
  qtd_additions: number;
  qtd_redemptions: number;
  qtd_net_income: number;
  qtd_ending_balance: number;
  qtd_rate_of_return: number;
  // YTD
  ytd_beginning_balance: number;
  ytd_additions: number;
  ytd_redemptions: number;
  ytd_net_income: number;
  ytd_ending_balance: number;
  ytd_rate_of_return: number;
  // ITD
  itd_beginning_balance: number;
  itd_additions: number;
  itd_redemptions: number;
  itd_net_income: number;
  itd_ending_balance: number;
  itd_rate_of_return: number;
}

export type PerformanceUpdateData = Partial<
  Omit<PerformanceData, "id" | "investor_id" | "period_id" | "fund_name">
>;

/**
 * Update performance data for a specific record with audit trail
 */
export async function updatePerformanceData(
  recordId: string,
  data: PerformanceUpdateData
): Promise<{ success: boolean; error?: string }> {
  try {
    // Fetch old data for audit trail
    const { data: oldRecord, error: fetchError } = await supabase
      .from("investor_fund_performance")
      .select("*")
      .eq("id", recordId)
      .maybeSingle();

    if (!oldRecord) {
      return { success: false, error: "Record not found" };
    }

    if (fetchError) throw fetchError;

    // Perform the update
    const { error } = await supabase
      .from("investor_fund_performance")
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq("id", recordId);

    if (error) throw error;

    // Calculate changed fields for audit
    const changedFields: string[] = [];
    for (const key of Object.keys(data) as Array<keyof PerformanceUpdateData>) {
      if (oldRecord[key] !== data[key]) {
        changedFields.push(key);
      }
    }

    // Log to audit trail
    const { data: userData } = await supabase.auth.getUser();
    if (changedFields.length > 0) {
      const { error: auditError } = await db.insert("data_edit_audit", {
        table_name: "investor_fund_performance",
        record_id: recordId,
        operation: "UPDATE",
        old_data: oldRecord,
        new_data: { ...oldRecord, ...data },
        changed_fields: changedFields,
        edited_by: userData?.user?.id || null,
        edit_source: "admin_editor",
      } as any);

      if (auditError) {
        logError(
          "performanceData.auditLog",
          new Error(auditError.userMessage || auditError.message),
          { recordId }
        );
      }
    }

    return { success: true };
  } catch (error: any) {
    logError("performanceData.update", error, { recordId });
    return { success: false, error: error.message };
  }
}

/**
 * Get performance data for an investor in a specific period
 */
export async function getInvestorPerformanceByPeriod(
  investorId: string,
  periodId: string
): Promise<PerformanceData[]> {
  const { data, error } = await supabase
    .from("investor_fund_performance")
    .select("*")
    .eq("investor_id", investorId)
    .eq("period_id", periodId)
    .order("fund_name");

  if (error) {
    logError("performanceData.getByPeriod", error, { investorId, periodId });
    return [];
  }

  return data as PerformanceData[];
}

/**
 * Create a new performance record
 */
export async function createPerformanceRecord(
  investorId: string,
  periodId: string,
  fundName: string,
  data: PerformanceUpdateData
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const { data: result, error } = await supabase
      .from("investor_fund_performance")
      .insert({
        investor_id: investorId,
        period_id: periodId,
        fund_name: fundName,
        ...data,
      })
      .select("id")
      .maybeSingle();

    if (error) throw error;
    if (!result) throw new Error("Failed to create record");

    return { success: true, id: result.id };
  } catch (error: any) {
    logError("performanceData.create", error, { investorId, periodId, fundName });
    return { success: false, error: error.message };
  }
}

/**
 * Delete a performance record
 */
export async function deletePerformanceRecord(
  recordId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from("investor_fund_performance").delete().eq("id", recordId);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    logError("performanceData.delete", error, { recordId });
    return { success: false, error: error.message };
  }
}

/**
 * Get all statement periods
 */
export async function getStatementPeriods(): Promise<
  Array<{
    id: string;
    period_name: string;
    year: number;
    month: number;
  }>
> {
  const { data, error } = await supabase
    .from("statement_periods")
    .select("id, period_name, year, month")
    .order("year", { ascending: false })
    .order("month", { ascending: false });

  if (error) {
    logError("performanceData.getStatementPeriods", error);
    return [];
  }

  return data || [];
}

/**
 * Get available fund names from existing records
 */
export async function getAvailableFunds(): Promise<string[]> {
  const { data, error } = await supabase
    .from("investor_fund_performance")
    .select("fund_name")
    .limit(100);

  if (error) {
    logError("performanceData.getAvailableFunds", error);
    return ["BTC", "ETH", "SOL", "USDC", "USDT", "EURC"];
  }

  const uniqueFunds = [...new Set(data?.map((d) => d.fund_name) || [])];
  return uniqueFunds.length > 0 ? uniqueFunds : ["BTC", "ETH", "SOL", "USDC", "USDT", "EURC"];
}
