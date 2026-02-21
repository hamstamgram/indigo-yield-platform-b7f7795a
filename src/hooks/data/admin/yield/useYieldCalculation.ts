import { useState, useCallback } from "react";
import { toast } from "sonner";
import { format } from "date-fns";

import {
  previewYieldDistribution,
  checkExistingDistribution,
  type YieldCalculationResult,
} from "@/services/admin/yields";
import type { YieldPurpose } from "./useYieldPeriod";

export function useYieldCalculation() {
  const [newAUM, setNewAUM] = useState("");
  const [yieldPreview, setYieldPreview] = useState<YieldCalculationResult | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [existingDistributionDate, setExistingDistributionDate] = useState<string | null>(null);
  const [existingDistributionId, setExistingDistributionId] = useState<string | null>(null);
  const [acknowledgeDiscrepancy, setAcknowledgeDiscrepancy] = useState(false);

  const handlePreviewYield = useCallback(
    async ({
      selectedFund,
      aumDate,
      yieldPurpose,
      distributionDate,
      asOfAum,
    }: {
      selectedFund: any;
      aumDate: Date;
      yieldPurpose: YieldPurpose;
      distributionDate: Date;
      asOfAum: number | null;
    }) => {
      if (!selectedFund) return;
      const isReporting = yieldPurpose === "reporting";
      const trimmedAUM = newAUM.trim();
      if (!trimmedAUM || isNaN(Number(trimmedAUM)) || Number(trimmedAUM) < 0) {
        toast.error("Please enter a valid non-negative AUM value.");
        return;
      }

      const baseAum = selectedFund.total_aum;

      setPreviewLoading(true);
      try {
        if (isReporting) {
          const existing = await checkExistingDistribution(selectedFund.id, aumDate, yieldPurpose);
          if (existing.exists) {
            setPreviewLoading(false);
            setExistingDistributionDate(existing.date);
            setExistingDistributionId(existing.id);
            setYieldPreview(null);
            toast.error(
              `Reporting yield already distributed for ${format(aumDate, "MMMM yyyy")}. Void the existing distribution before reapplying.`
            );
            return;
          }
        }

        const result = await previewYieldDistribution({
          fundId: selectedFund.id,
          targetDate: aumDate,
          newTotalAUM: trimmedAUM,
          baseAUM: baseAum != null ? String(baseAum) : undefined,
          purpose: yieldPurpose,
          distributionDate: distributionDate,
        } as any);
        setYieldPreview(result);
        setPreviewLoading(false);
        setExistingDistributionDate(null);
        setExistingDistributionId(null);
        setAcknowledgeDiscrepancy(false);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to preview yield.");
        setPreviewLoading(false);
      }
    },
    [newAUM]
  );

  return {
    newAUM,
    setNewAUM,
    yieldPreview,
    setYieldPreview,
    previewLoading,
    setPreviewLoading,
    existingDistributionDate,
    setExistingDistributionDate,
    existingDistributionId,
    setExistingDistributionId,
    handlePreviewYield,
    checkExistingDistribution,
    acknowledgeDiscrepancy,
    setAcknowledgeDiscrepancy,
  };
}
