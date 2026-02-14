/**
 * IB (Introducing Broker) Settings Hooks
 * Abstracts IB configuration operations from components
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getInvestorIBConfig,
  updateInvestorIBConfig,
  getIBReferrals,
  getAvailableIBParents,
  ibManagementService,
} from "@/services/ib";
import { auditLogService } from "@/services/shared";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { invalidateAfterIBOperation } from "@/utils/cacheInvalidation";

export interface IBParentOption {
  id: string;
  emailMasked: string | null;
  name: string;
}

export interface Referral {
  id: string;
  emailMasked: string | null;
  firstName: string | null;
  lastName: string | null;
  ibPercentage: number;
}

export interface UserSearchResult {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  hasIBRole: boolean;
}

export interface IBConfig {
  ibParentId: string | null;
  ibPercentage: number;
  ibCommissionSource: "manual" | "investor_fee";
  hasIBRole: boolean;
  availableParents: IBParentOption[];
  referrals: Referral[];
}

/**
 * Fetch complete IB settings for an investor
 */
async function fetchIBSettings(investorId: string): Promise<IBConfig> {
  const [config, parents, refs, hasRole] = await Promise.all([
    getInvestorIBConfig(investorId),
    getAvailableIBParents(investorId),
    getIBReferrals(investorId),
    ibManagementService.hasIBRole(investorId),
  ]);

  return {
    ibParentId: config?.ibParentId || null,
    ibPercentage: config?.ibPercentage || 0,
    ibCommissionSource: config?.ibCommissionSource || "manual",
    hasIBRole: hasRole,
    availableParents: parents,
    referrals: refs,
  };
}

/**
 * Hook to fetch IB settings for an investor
 */
export function useIBSettings(investorId: string) {
  return useQuery<IBConfig, Error>({
    queryKey: QUERY_KEYS.ibSettingsInvestor(investorId),
    queryFn: () => fetchIBSettings(investorId),
    enabled: !!investorId,
  });
}

/**
 * Hook to search users for IB assignment
 */
export function useSearchUsersForIB(investorId: string) {
  const searchUsers = async (searchEmail: string): Promise<UserSearchResult[]> => {
    if (!searchEmail.trim()) return [];

    // Search profiles using supabase directly (profileService doesn't have this method yet)
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id, email, first_name, last_name")
      .ilike("email", `%${searchEmail.trim()}%`)
      .neq("id", investorId)
      .limit(10);

    if (error) throw error;

    // Check IB roles
    const userIds = (profiles || []).map((u) => u.id);
    const ibRoles = await ibManagementService.getIBRoles();
    const ibUserIds = new Set(ibRoles.map((r) => r.user_id));

    return (profiles || []).map((u) => ({
      id: u.id,
      email: u.email,
      first_name: u.first_name,
      last_name: u.last_name,
      hasIBRole: ibUserIds.has(u.id),
    }));
  };

  return { searchUsers };
}

/**
 * Hook to update IB configuration
 */
export function useUpdateIBConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      investorId,
      ibParentId,
      ibPercentage,
      ibCommissionSource,
    }: {
      investorId: string;
      ibParentId: string | null;
      ibPercentage: number;
      ibCommissionSource?: "manual" | "investor_fee";
    }) => {
      const result = await updateInvestorIBConfig(
        investorId,
        ibParentId,
        ibPercentage,
        ibCommissionSource
      );
      if (!result.success) {
        throw new Error(result.error || "Failed to update IB settings");
      }
      return result;
    },
    onSuccess: (_, variables) => {
      invalidateAfterIBOperation(queryClient, undefined, variables.investorId);
      toast.success(
        variables.ibParentId
          ? `Assigned IB parent with ${variables.ibPercentage}% commission`
          : "IB parent removed successfully"
      );
    },
    onError: (error: Error) => {
      if (error.message.includes("IB parent does not have the IB role")) {
        toast.error("The selected user does not have the IB role. Use 'Assign IB Role' first.");
      } else {
        toast.error(`Failed to save IB settings: ${error.message}`);
      }
    },
  });
}

/**
 * Hook to assign IB role to a user
 */
export function useAssignIBRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, investorId }: { userId: string; investorId: string }) => {
      return ibManagementService.assignIBRoleToUser(userId);
    },
    onSuccess: (result, variables) => {
      invalidateAfterIBOperation(queryClient, undefined, variables.investorId);
      if (result.alreadyExists) {
        toast.info("User already has the IB role");
      } else {
        toast.success("IB role assigned successfully");
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to assign IB role: ${error.message}`);
    },
  });
}

/**
 * Hook to promote an investor to IB
 */
export function usePromoteToIB() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (investorId: string) => {
      const result = await ibManagementService.assignIBRoleToUser(investorId);

      if (!result.alreadyExists) {
        // Log audit entry
        const { data: userData } = await supabase.auth.getUser();
        if (userData.user?.id) {
          await auditLogService.logEvent({
            actorUserId: userData.user.id,
            action: "PROMOTE_TO_IB",
            entity: "user_roles",
            entityId: investorId,
            newValues: { role: "ib" },
          });
        }
      }

      return result;
    },
    onSuccess: (result, investorId) => {
      invalidateAfterIBOperation(queryClient, undefined, investorId);
      if (result.alreadyExists) {
        toast.info("Investor already has the IB role");
      } else {
        toast.success("Investor promoted to IB successfully");
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to promote to IB: ${error.message}`);
    },
  });
}

/**
 * Hook to remove IB role from an investor
 */
export function useRemoveIBRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      investorId,
      hasReferrals,
    }: {
      investorId: string;
      hasReferrals: boolean;
    }) => {
      if (hasReferrals) {
        throw new Error("Cannot remove IB role from investor with active referrals");
      }

      await ibManagementService.removeIBRole(investorId);

      // Log audit entry
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user?.id) {
        await auditLogService.logEvent({
          actorUserId: userData.user.id,
          action: "REMOVE_IB_ROLE",
          entity: "user_roles",
          entityId: investorId,
          oldValues: { role: "ib" },
        });
      }
    },
    onSuccess: (_, variables) => {
      invalidateAfterIBOperation(queryClient, undefined, variables.investorId);
      toast.success("IB role removed successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to remove IB role: ${error.message}`);
    },
  });
}

export interface CreateIBCallbacks {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Hook to create a new IB
 */
export function useCreateIB(callbacks?: CreateIBCallbacks) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { email: string; firstName: string; lastName: string }) => {
      return ibManagementService.createIB(data.email);
    },
    onSuccess: () => {
      toast.success("IB Created", {
        description: "The Introducing Broker has been set up.",
      });
      invalidateAfterIBOperation(queryClient);
      callbacks?.onSuccess?.();
    },
    onError: (error) => {
      toast.error("Error", {
        description: error instanceof Error ? error.message : "Failed to create IB",
      });
      callbacks?.onError?.(error instanceof Error ? error : new Error("Failed to create IB"));
    },
  });
}
