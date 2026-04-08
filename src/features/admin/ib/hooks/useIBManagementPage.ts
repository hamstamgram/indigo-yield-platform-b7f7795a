/**
 * IB Management Page Hooks
 * React Query hooks for Introducing Broker management
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Decimal from "decimal.js";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { ibManagementService } from "@/services/ib";
import { fundService } from "@/features/admin/funds/services/fundService";
import { invalidateAfterIBOperation } from "@/utils/cacheInvalidation";
import { toast } from "sonner";

export interface EarningsByAsset {
  [assetSymbol: string]: number;
}

export interface IBProfile {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  createdAt: string;
  referralCount: number;
  earningsByAsset: EarningsByAsset;
  /** Asset symbols (e.g., "BTC", "ETH") for active funds - used for CryptoIcon display */
  activeAssets: string[];
}

/**
 * Hook to fetch all IBs with per-asset earnings
 */
export function useIBProfiles() {
  return useQuery<IBProfile[]>({
    queryKey: QUERY_KEYS.ibs,
    queryFn: async (): Promise<IBProfile[]> => {
      const ibRoles = await ibManagementService.getIBRoles();

      if (!ibRoles || ibRoles.length === 0) {
        return [];
      }

      const ibUserIds = ibRoles.map((r) => r.user_id);

      const profiles = await ibManagementService.getProfilesByIds(ibUserIds);
      const referrals = await ibManagementService.getReferralsByParentIds(ibUserIds);
      const ibCredits = await ibManagementService.getIBCredits(ibUserIds);
      const allocations = await ibManagementService.getIBAllocations(ibUserIds);

      const allFundIds = [
        ...new Set([
          ...(ibCredits || []).map((t) => t.fund_id).filter(Boolean),
          ...(allocations || []).map((a) => a.fund_id).filter(Boolean),
        ]),
      ] as string[];

      const funds = allFundIds.length > 0 ? await fundService.getFundsByIds(allFundIds) : [];

      const fundToAsset = new Map<string, string>();
      funds?.forEach((f) => fundToAsset.set(f.id, f.asset));

      const ibProfiles: IBProfile[] = (profiles || []).map((p) => {
        const refs = (referrals || []).filter((r) => r.ib_parent_id === p.id);

        const txEarnings = (ibCredits || []).filter((t) => t.investor_id === p.id);
        const activeFundIds = new Set<string>(
          txEarnings.map((t) => t.fund_id).filter(Boolean) as string[]
        );

        const earningsByAsset: EarningsByAsset = {};
        txEarnings.forEach((t) => {
          const asset = t.asset || (t.fund_id ? fundToAsset.get(t.fund_id) : null) || "UNKNOWN";
          earningsByAsset[asset] = new Decimal(earningsByAsset[asset] || 0)
            .plus(new Decimal(String(t.amount || 0)))
            .toNumber();
        });

        if (Object.keys(earningsByAsset).length === 0) {
          const allocs = (allocations || []).filter((a) => a.ib_investor_id === p.id);
          allocs.forEach((a) => {
            if (a.fund_id) {
              const asset = fundToAsset.get(a.fund_id) || "UNKNOWN";
              earningsByAsset[asset] = new Decimal(earningsByAsset[asset] || 0)
                .plus(new Decimal(String(a.ib_fee_amount || 0)))
                .toNumber();
              activeFundIds.add(a.fund_id);
            }
          });
        }

        // Convert fund IDs to asset symbols for CryptoIcon display
        const activeAssets = [...activeFundIds]
          .map((fundId) => fundToAsset.get(fundId))
          .filter((asset): asset is string => !!asset && asset !== "UNKNOWN");

        return {
          id: p.id,
          email: p.email,
          firstName: p.first_name,
          lastName: p.last_name,
          createdAt: p.created_at,
          referralCount: refs.length,
          earningsByAsset,
          activeAssets,
        };
      });

      return ibProfiles;
    },
  });
}

interface CreateIBCallbacks {
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
      return ibManagementService.createIBRole(data.email, data.firstName, data.lastName);
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
