/**
 * useFunds - Data hook for fund operations
 * Abstracts Supabase calls from components
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks";
import { useAuth } from "@/lib/auth/context";

type FundStatus = "active" | "deprecated" | "inactive" | "suspended";

export interface Fund {
  id: string;
  code: string;
  name: string;
  asset: string;
  fund_class: string;
  inception_date: string;
  status: FundStatus | null;
  logo_url: string | null;
  mgmt_fee_bps: number | null;
  perf_fee_bps: number | null;
  min_investment: number | null;
  lock_period_days: number | null;
  high_water_mark: number | null;
  strategy: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface CreateFundInput {
  code: string;
  name: string;
  asset: string;
  inception_date: string;
  logo_url?: string | null;
}

const QUERY_KEYS = {
  funds: ["funds"] as const,
  activeFunds: ["funds", "active"] as const,
  fund: (id: string) => ["funds", id] as const,
};

/**
 * Fetch all funds
 */
export function useFunds(activeOnly = false) {
  return useQuery<Fund[]>({
    queryKey: activeOnly ? QUERY_KEYS.activeFunds : QUERY_KEYS.funds,
    queryFn: async () => {
      let query = supabase.from("funds").select("*").order("name");

      if (activeOnly) {
        query = query.eq("status", "active");
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - funds don't change often
  });
}

/**
 * Fetch a single fund by ID
 */
export function useFund(fundId: string | undefined) {
  return useQuery<Fund | null>({
    queryKey: QUERY_KEYS.fund(fundId || ""),
    queryFn: async () => {
      if (!fundId) return null;

      const { data, error } = await supabase
        .from("funds")
        .select("*")
        .eq("id", fundId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!fundId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Create a new fund
 */
export function useCreateFund() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateFundInput) => {
      // Check if code already exists
      const { data: existingCode } = await supabase
        .from("funds")
        .select("id")
        .eq("code", input.code)
        .single();

      if (existingCode) {
        throw new Error(`Fund code "${input.code}" already exists`);
      }

      // Create the fund
      const { data, error } = await supabase
        .from("funds")
        .insert({
          code: input.code,
          name: input.name,
          asset: input.asset,
          fund_class: input.asset,
          inception_date: input.inception_date,
          status: "active",
          logo_url: input.logo_url || null,
          mgmt_fee_bps: 200,
          perf_fee_bps: 2000,
          min_investment: 0,
          lock_period_days: 0,
        })
        .select()
        .single();

      if (error) throw error;

      // Audit log
      await supabase.from("audit_log").insert([{
        actor_user: user?.id,
        action: "CREATE_FUND",
        entity: "fund",
        entity_id: data.id,
        new_values: {
          code: input.code,
          name: input.name,
          asset: input.asset,
          inception_date: input.inception_date,
          logo_url: input.logo_url,
        },
      }]);

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.funds });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.activeFunds });
      toast({
        title: "Fund created",
        description: `Fund "${data.name}" created successfully`,
      });
    },
    onError: (error: Error) => {
      console.error("Error creating fund:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create fund",
        variant: "destructive",
      });
    },
  });
}

/**
 * Update a fund
 */
interface FundUpdateInput {
  name?: string;
  asset?: string;
  inception_date?: string;
  status?: FundStatus;
  logo_url?: string | null;
  mgmt_fee_bps?: number;
  perf_fee_bps?: number;
  min_investment?: number;
  lock_period_days?: number;
  strategy?: string;
}

export function useUpdateFund() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      fundId,
      updates,
    }: {
      fundId: string;
      updates: FundUpdateInput;
    }) => {
      const { data, error } = await supabase
        .from("funds")
        .update(updates)
        .eq("id", fundId)
        .select()
        .single();

      if (error) throw error;

      // Audit log
      await supabase.from("audit_log").insert([{
        actor_user: user?.id,
        action: "UPDATE_FUND",
        entity: "fund",
        entity_id: fundId,
        new_values: updates as any,
      }]);

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.funds });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.activeFunds });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.fund(data.id) });
      toast({
        title: "Fund updated",
        description: `Fund "${data.name}" updated successfully`,
      });
    },
    onError: (error) => {
      console.error("Error updating fund:", error);
      toast({
        title: "Error",
        description: "Failed to update fund",
        variant: "destructive",
      });
    },
  });
}

/**
 * Delete/deactivate a fund
 */
export function useDeactivateFund() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (fundId: string) => {
      const { error } = await supabase
        .from("funds")
        .update({ status: "inactive" })
        .eq("id", fundId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.funds });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.activeFunds });
      toast({
        title: "Fund deactivated",
        description: "Fund has been deactivated",
      });
    },
    onError: (error) => {
      console.error("Error deactivating fund:", error);
      toast({
        title: "Error",
        description: "Failed to deactivate fund",
        variant: "destructive",
      });
    },
  });
}
