import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { applyYieldDistribution } from "@/features/admin/yields/services/yields";
import { QUERY_KEYS, YIELD_RELATED_KEYS } from "@/constants/queryKeys";
import { formatAUM } from "@/utils/formatters";
import { parseFinancial } from "@/utils/financial";
import type { YieldPurpose } from "./useYieldPeriod";

export function useYieldSubmission() {
  const [applyLoading, setApplyLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");
  const queryClient = useQueryClient();

  const handleApplyYield = useCallback(
    async ({
      selectedFund,
      user,
      yieldPreview,
      yieldPurpose,
      aumDate,
      newAUM,
      asOfAum,
      aumTime,
      distributionDate,
      checkExistingDistribution,
      onSuccess,
      onApplyResult,
    }: {
      selectedFund: any;
      user: any;
      yieldPreview: any;
      yieldPurpose: YieldPurpose;
      aumDate: Date;
      newAUM: string;
      asOfAum: number | null;
      aumTime: string;
      distributionDate: Date;
      checkExistingDistribution: (
        fundId: string,
        aumDate: Date,
        purpose: YieldPurpose
      ) => Promise<{ exists: boolean; id: string | null; date: string | null }>;
      onSuccess: () => void;
      onApplyResult?: (result: any) => void;
    }) => {
      if (!selectedFund || !user || !yieldPreview) return;

      setApplyLoading(true);
      try {
        if (yieldPurpose === "reporting") {
          const existing = await checkExistingDistribution(selectedFund.id, aumDate, yieldPurpose);
          if (existing.exists) {
            setApplyLoading(false);
            toast.error(
              `Reporting yield already distributed for ${format(aumDate, "MMMM yyyy")}. Void the existing distribution before reapplying.`
            );
            return;
          }
        }

        const applyResult = await applyYieldDistribution(
          {
            fundId: selectedFund.id,
            targetDate: aumDate,
            newTotalAUM: newAUM,
            distributionDate: distributionDate,
          } as any,
          user.id,
          yieldPurpose
        );

        const asset = selectedFund.asset;
        const grossYieldNum =
          typeof applyResult.grossYield === "string"
            ? parseFinancial(applyResult.grossYield).toNumber()
            : applyResult.grossYield;
        const appliedInvestorCount = applyResult.investorCount ?? yieldPreview.investorCount;

        toast.success(
          `Distributed ${formatAUM(grossYieldNum, asset)} ${asset} to ${appliedInvestorCount} investors (${yieldPurpose === "reporting" ? "Reporting" : "Transaction"} purpose).`
        );

        // Update preview with actual result so the dialog success phase shows correct numbers
        onApplyResult?.(applyResult);

        // Allow the DistributeYieldDialog to handle its own success phase
        // setShowConfirmDialog(false); // Removed to prevent premature unmounting
        setApplyLoading(false);

        // Cache invalidation
        YIELD_RELATED_KEYS.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: key });
        });

        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.fundAumAsOf(
            selectedFund.id,
            format(aumDate, "yyyy-MM-dd"),
            "reporting"
          ),
        });

        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.funds });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.integrityDashboard });

        onSuccess();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to apply yield.");
        setApplyLoading(false);
      }
    },
    [confirmationText, queryClient]
  );

  return {
    applyLoading,
    setApplyLoading,
    showConfirmDialog,
    setShowConfirmDialog,
    confirmationText,
    setConfirmationText,
    handleApplyYield,
  };
}
