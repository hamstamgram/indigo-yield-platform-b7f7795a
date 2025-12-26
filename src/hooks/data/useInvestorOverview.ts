/**
 * useInvestorOverview - Data hook for investor overview tab
 * Abstracts Supabase calls from InvestorOverviewTab component
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface InvestorOverviewData {
  totalFunds: number;
  tokenBalances: { asset: string; amount: number; fundName: string }[];
  lastActivityDate: string | null;
  pendingWithdrawals: number;
  lastReportPeriod: string | null;
  ibParentName: string | null;
  feeScheduleStatus: "active" | "default";
  hasPositions: boolean;
}

const QUERY_KEYS = {
  overview: (investorId: string) => ["investor-overview", investorId] as const,
};

/**
 * Fetch investor overview data
 */
export function useInvestorOverview(investorId: string) {
  return useQuery<InvestorOverviewData>({
    queryKey: QUERY_KEYS.overview(investorId),
    queryFn: async () => {
      // Fetch positions with fund info
      const { data: positions, error: posError } = await supabase
        .from("investor_positions")
        .select(
          `
          fund_id,
          current_value,
          shares,
          funds!inner(name, asset, status)
        `
        )
        .eq("investor_id", investorId);

      if (posError) throw posError;

      const activePositions = (positions || []).filter(
        (p: any) => p.funds?.status === "active" && p.current_value > 0
      );

      // Fetch pending withdrawals count
      const { count: pendingCount } = await supabase
        .from("withdrawal_requests")
        .select("id", { count: "exact", head: true })
        .eq("investor_id", investorId)
        .eq("status", "pending");

      // Fetch last transaction date
      const { data: lastTx } = await supabase
        .from("transactions_v2")
        .select("tx_date")
        .eq("investor_id", investorId)
        .order("tx_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Fetch last generated report
      const { data: lastReport } = await supabase
        .from("generated_statements")
        .select("period_id")
        .eq("investor_id", investorId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Fetch IB parent info
      const { data: profile } = await supabase
        .from("profiles")
        .select("ib_parent_id")
        .eq("id", investorId)
        .maybeSingle();

      let ibParentName: string | null = null;
      if (profile?.ib_parent_id) {
        const { data: parentProfile } = await supabase
          .from("profiles")
          .select("first_name, last_name")
          .eq("id", profile.ib_parent_id)
          .maybeSingle();
        if (parentProfile) {
          ibParentName =
            [parentProfile.first_name, parentProfile.last_name]
              .filter(Boolean)
              .join(" ") || null;
        }
      }

      // Fetch fee schedule status
      const { data: feeSchedule } = await supabase
        .from("investor_fee_schedule")
        .select("id")
        .eq("investor_id", investorId)
        .limit(1);

      // Build token balances
      const tokenBalances = activePositions.map((p: any) => ({
        asset: p.funds?.asset || "Unknown",
        amount: p.current_value || 0,
        fundName: p.funds?.name || "Unknown",
      }));

      return {
        totalFunds: activePositions.length,
        tokenBalances,
        lastActivityDate: lastTx?.tx_date || null,
        pendingWithdrawals: pendingCount || 0,
        lastReportPeriod: lastReport?.period_id || null,
        ibParentName,
        feeScheduleStatus:
          (feeSchedule?.length || 0) > 0 ? "active" : "default",
        hasPositions: activePositions.length > 0,
      };
    },
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Get default fund for an investor
 */
export function useInvestorDefaultFund(investorId: string) {
  return useQuery<string | null>({
    queryKey: ["investor-default-fund", investorId],
    queryFn: async () => {
      const { data } = await supabase
        .from("investor_positions")
        .select("fund_id")
        .eq("investor_id", investorId)
        .limit(1)
        .maybeSingle();

      return data?.fund_id || null;
    },
    staleTime: 5 * 60 * 1000,
  });
}
