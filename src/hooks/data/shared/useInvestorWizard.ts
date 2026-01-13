/**
 * useInvestorWizard Hook
 * Wraps investorWizardService with toast notifications and React Query integration
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createInvestorWithWizard } from "@/services";
import type { WizardResult, WizardProgressCallback } from "@/services/admin/investorWizardService";
import { WizardFormData } from "@/components/admin/investors/wizard/types";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { logError } from "@/lib/logger";

/**
 * Hook for creating investors via the wizard with proper toast notifications
 */
export function useCreateInvestorWizard() {
  const queryClient = useQueryClient();

  return useMutation<WizardResult, Error, WizardFormData>({
    mutationFn: async (wizardData: WizardFormData) => {
      // Progress callback that shows toasts
      const onProgress: WizardProgressCallback = (message, status) => {
        if (status === "info") {
          toast.info(message);
        } else if (status === "success") {
          toast.success(message);
        } else if (status === "error") {
          toast.error(message);
        }
      };

      const result = await createInvestorWithWizard(wizardData, onProgress);
      
      if (!result.success) {
        throw new Error(result.error || "Failed to create investor");
      }
      
      return result;
    },
    onSuccess: () => {
      // Invalidate investor-related queries
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.investorsList });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.positions() });
    },
    onError: (error) => {
      // Error toast is already shown via onProgress callback
      logError("useCreateInvestorWizard", error);
    },
  });
}

// Re-export types for convenience
export type { WizardResult, WizardProgressCallback } from "@/services/admin/investorWizardService";
