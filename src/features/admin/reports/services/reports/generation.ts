import { supabase } from "@/integrations/supabase/client";

/**
 * Generate fund performance reports for a period
 */
export async function generateFundPerformanceReports(
  periodYear: number,
  periodMonth: number,
  investorId?: string
): Promise<{ message: string; recordsCreated: number; statementsGenerated: number }> {
  const { data, error } = await supabase.functions.invoke("generate-fund-performance", {
    body: {
      periodYear,
      periodMonth,
      investorId,
    },
  });

  if (error) throw error;
  return data;
}
