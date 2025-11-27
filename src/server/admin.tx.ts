/**
 * Simplified Admin Transaction Management
 */

import { supabase } from "@/integrations/supabase/client";

export interface TransactionSummary {
  total_transactions: number;
  total_volume: number;
  pending_count: number;
  completed_count: number;
  failed_count: number;
}

/**
 * Get transaction summary without complex functions
 */
export async function getTransactionSummary(): Promise<TransactionSummary> {
  try {
    const { data, error } = await supabase.from("transactions_v2").select("*");

    if (error) throw error;

    const summary = {
      total_transactions: data?.length || 0,
      total_volume: data?.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0) || 0,
      pending_count: data?.filter((tx) => tx.status === "pending").length || 0,
      completed_count:
        data?.filter((tx) => tx.status === "completed" || tx.status === "approved").length || 0,
      failed_count:
        data?.filter((tx) => tx.status === "failed" || tx.status === "rejected").length || 0,
    };

    return summary;
  } catch (error) {
    console.error("Error getting transaction summary:", error);
    return {
      total_transactions: 0,
      total_volume: 0,
      pending_count: 0,
      completed_count: 0,
      failed_count: 0,
    };
  }
}
