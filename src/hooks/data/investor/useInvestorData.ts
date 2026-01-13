/**
 * Investor Data Hooks
 * Abstracts investor operations from components
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchInvestorPositions, fetchInvestorsForSelector, InvestorPositionRow } from "@/services/investor";
import { toast } from "sonner";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { invalidateInvestorData } from "@/utils/cacheInvalidation";

export interface InvestorListItem {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  status: string | null;
  is_admin: boolean;
  account_type: string | null;
  created_at: string;
}

export interface InvestorQuickViewData {
  positions: InvestorPosition[];
  totalAum: number;
  activeFundsCount: number;
  pendingWithdrawalsCount: number;
  hasIbLinked: boolean;
  hasFeeSchedule: boolean;
  lastReportPeriod: string | null;
}

export interface InvestorPosition {
  fund_id: string;
  fund_name: string;
  fund_code: string;
  shares: number;
  current_value: number;
}

export interface InvestorSelectorItem {
  id: string;
  email: string;
  displayName: string;
  isSystemAccount?: boolean;
}

/**
 * Hook to fetch all investors for admin list
 */
export function useInvestorList() {
  return useQuery<InvestorListItem[], Error>({
    queryKey: QUERY_KEYS.investorsList,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("profiles")
        .select("id, email, first_name, last_name, status, is_admin, account_type, created_at")
        .eq("is_admin", false)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });
}

/**
 * Hook to fetch investors for dropdown selectors
 */
export function useInvestorsForSelector(includeSystemAccounts = true) {
  return useQuery<InvestorSelectorItem[], Error>({
    queryKey: QUERY_KEYS.investorsSelector(includeSystemAccounts),
    queryFn: () => fetchInvestorsForSelector(includeSystemAccounts),
  });
}

/**
 * Hook to fetch investor positions (re-export from existing hook for consistency)
 */
export function useInvestorPositions(investorId: string) {
  return useQuery<InvestorPositionRow[], Error>({
    queryKey: QUERY_KEYS.investorPositions(investorId),
    queryFn: () => fetchInvestorPositions(investorId),
    enabled: !!investorId,
  });
}

/**
 * Hook to fetch investor quick view data (for drawer)
 */
export function useInvestorQuickView(investorId: string) {
  return useQuery<InvestorQuickViewData, Error>({
    queryKey: QUERY_KEYS.investorQuickView(investorId),
    queryFn: async () => {
      // Load positions from v_live_investor_balances view
      const { data: positionsData } = await (supabase as any)
        .from("v_live_investor_balances")
        .select("fund_id, fund_name, fund_code, shares, current_value")
        .eq("investor_id", investorId)
        .gt("current_value", 0)
        .order("current_value", { ascending: false })
        .limit(5);

      // Load pending withdrawals count
      const { count: pendingCount } = await supabase
        .from("withdrawal_requests")
        .select("id", { count: "exact", head: true })
        .eq("investor_id", investorId)
        .eq("status", "pending");

      // Load IB status
      const { data: ibData } = await (supabase as any)
        .from("profiles")
        .select("ib_parent_id")
        .eq("id", investorId)
        .maybeSingle();

      // Load fee schedule status
      const { count: feeCount } = await supabase
        .from("investor_fee_schedule")
        .select("id", { count: "exact", head: true })
        .eq("investor_id", investorId);

      // Load last report period
      let lastReportPeriod: string | null = null;
      const { data: reportData } = await supabase
        .from("generated_statements")
        .select("created_at")
        .eq("investor_id", investorId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (reportData?.created_at) {
        lastReportPeriod = new Date(reportData.created_at).toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        });
      }

      // Map positions
      const positions: InvestorPosition[] = (positionsData || []).map((p: any) => ({
        fund_id: p.fund_id,
        fund_name: p.fund_name || "Unknown",
        fund_code: p.fund_code || "N/A",
        shares: p.shares || 0,
        current_value: p.current_value || 0,
      }));

      const totalAum = positions.reduce((sum, p) => sum + p.current_value, 0);

      return {
        positions,
        totalAum,
        activeFundsCount: positions.length,
        pendingWithdrawalsCount: pendingCount || 0,
        hasIbLinked: !!ibData?.ib_parent_id,
        hasFeeSchedule: (feeCount || 0) > 0,
        lastReportPeriod,
      };
    },
    enabled: !!investorId,
  });
}

/**
 * Hook to fetch investor recent activity
 */
export function useInvestorRecentActivity(investorId: string, limit = 5) {
  return useQuery({
    queryKey: QUERY_KEYS.investorRecentActivity(investorId, limit),
    queryFn: async () => {
      // Load recent transactions - use tx_date (actual column name)
      const { data: txData } = await supabase
        .from("transactions_v2")
        .select("id, amount, tx_date, type, fund_id")
        .eq("investor_id", investorId)
        .eq("is_voided", false) // Exclude voided transactions
        .order("tx_date", { ascending: false })
        .limit(limit);

      // Load recent withdrawals - use request_date (actual column name)
      const { data: wdData } = await supabase
        .from("withdrawal_requests")
        .select("id, requested_amount, request_date, status")
        .eq("investor_id", investorId)
        .order("request_date", { ascending: false })
        .limit(limit);

      type ActivityItem = {
        id: string;
        type: "transaction" | "withdrawal";
        amount: number;
        date: string;
        description: string;
        status?: string;
      };

      // Combine and sort
      const activities: ActivityItem[] = [
        ...(txData || []).map((tx: any) => ({
          id: tx.id,
          type: "transaction" as const,
          amount: tx.amount,
          date: tx.tx_date,
          description: tx.type,
        })),
        ...(wdData || []).map((wd: any) => ({
          id: wd.id,
          type: "withdrawal" as const,
          amount: wd.requested_amount,
          date: wd.request_date,
          description: "Withdrawal Request",
          status: wd.status,
        })),
      ]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, limit);

      return activities;
    },
    enabled: !!investorId,
  });
}

/**
 * Hook to update investor status or other profile fields
 */
export function useUpdateInvestorStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      investorId, 
      status,
      updates 
    }: { 
      investorId: string; 
      status?: string;
      updates?: Record<string, any>;
    }) => {
      const updateData = updates || (status ? { status } : {});
      updateData.updated_at = new Date().toISOString();
      
      const { error } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", investorId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      invalidateInvestorData(queryClient, variables.investorId);
      toast.success("Investor updated");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update investor: ${error.message}`);
    },
  });
}

// Re-export types
export type { InvestorPositionRow };
