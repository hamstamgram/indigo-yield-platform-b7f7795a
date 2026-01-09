/**
 * useFunds - Data hook for fund operations
 * Abstracts Supabase calls from components
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks";
import { useAuth } from "@/services/auth";
import { fundService, auditLogService } from "@/services";
import { QUERY_KEYS } from "@/constants/queryKeys";
import type { Fund, FundStatus } from "@/types/domains/fund";

// Re-export types from canonical source
export type { Fund, FundStatus } from "@/types/domains/fund";

export interface CreateFundInput {
  code: string;
  name: string;
  asset: string;
  inception_date: string;
  logo_url?: string | null;
}

const LOCAL_QUERY_KEYS = {
  funds: QUERY_KEYS.funds,
  activeFunds: ["funds", "active"] as const,
  fund: (id: string) => QUERY_KEYS.fund(id),
};

/**
 * Fetch all funds
 */
export function useFunds(activeOnly = false) {
  return useQuery<Fund[]>({
    queryKey: activeOnly ? LOCAL_QUERY_KEYS.activeFunds : LOCAL_QUERY_KEYS.funds,
    queryFn: async (): Promise<Fund[]> => {
      const funds = await fundService.getAllFunds();
      const result = activeOnly ? funds.filter((f) => f.status === "active") : funds;
      return result as Fund[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch a single fund by ID
 */
export function useFund(fundId: string | undefined) {
  return useQuery<Fund | null>({
    queryKey: LOCAL_QUERY_KEYS.fund(fundId || ""),
    queryFn: async (): Promise<Fund | null> => {
      if (!fundId) return null;
      const fund = await fundService.getFundById(fundId);
      return fund as unknown as Fund | null;
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
      const codeExists = await fundService.codeExists(input.code);
      if (codeExists) {
        throw new Error(`Fund code "${input.code}" already exists`);
      }

      // Create the fund
      const data = await fundService.createFund(input);

      // Audit log
      if (user?.id) {
        await auditLogService.logEvent({
          actorUserId: user.id,
          action: "CREATE_FUND",
          entity: "fund",
          entityId: data.id,
          newValues: {
            code: input.code,
            name: input.name,
            asset: input.asset,
            inception_date: input.inception_date,
            logo_url: input.logo_url,
          },
        });
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: LOCAL_QUERY_KEYS.funds });
      queryClient.invalidateQueries({ queryKey: LOCAL_QUERY_KEYS.activeFunds });
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
      const data = await fundService.updateFund(fundId, updates);

      // Audit log
      if (user?.id) {
        await auditLogService.logEvent({
          actorUserId: user.id,
          action: "UPDATE_FUND",
          entity: "fund",
          entityId: fundId,
          newValues: updates,
        });
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: LOCAL_QUERY_KEYS.funds });
      queryClient.invalidateQueries({ queryKey: LOCAL_QUERY_KEYS.activeFunds });
      queryClient.invalidateQueries({ queryKey: LOCAL_QUERY_KEYS.fund(data.id) });
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
      await fundService.deactivateFund(fundId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LOCAL_QUERY_KEYS.funds });
      queryClient.invalidateQueries({ queryKey: LOCAL_QUERY_KEYS.activeFunds });
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
