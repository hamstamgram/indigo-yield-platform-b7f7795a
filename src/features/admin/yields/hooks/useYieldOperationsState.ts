/**
 * useYieldOperationsState - State management hook for yield operations
 * Refactored to compose smaller, focused hooks for better maintainability.
 */

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { startOfMonth, endOfMonth, format, parseISO } from "date-fns";
import { useAuth } from "@/services/auth";
import { useActiveFundsWithAUM } from "@/hooks";
import { getTodayUTC } from "@/utils/dateUtils";

import { useAUMReconciliation } from "@/features/admin/system/hooks/useAUMReconciliation";
import { formatAUM } from "@/utils/formatters";
import { isSystemAccount as checkSystemAccount } from "@/utils/accountUtils";
import type { YieldDistribution } from "@/services/admin/yields";

// Import sub-hooks
import { useYieldSelection, type Fund } from "./yield/useYieldSelection";
import { useYieldPeriod, type YieldPurpose } from "./yield/useYieldPeriod";
import { useYieldCalculation } from "./yield/useYieldCalculation";
import { useYieldSubmission } from "./yield/useYieldSubmission";

export { type Fund, type YieldPurpose };

export function useYieldOperationsState() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isSystemAccount = checkSystemAccount(user?.email);

  // Compose sub-hooks
  const selection = useYieldSelection();
  const period = useYieldPeriod();
  const calculation = useYieldCalculation({
    selectedFunds: selection.selectedFunds,
    period: period.period,
    purpose: period.purpose,
  });
  const submission = useYieldSubmission({
    selectedFunds: selection.selectedFunds,
    period: period.period,
    purpose: period.purpose,
    calculations: calculation.calculations,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["yield-records"] });
      selection.clearSelection();
    },
  });

  const reconciliation = useAUMReconciliation(
    selection.selectedFunds.map((f) => f.id),
    period.period
  );

  const reset = useCallback(() => {
    selection.clearSelection();
    period.reset();
    calculation.reset();
  }, [selection, period, calculation]);

  return {
    // State
    ...selection,
    ...period,
    ...calculation,
    ...submission,
    reconciliation,
    isSystemAccount,
    
    // Actions
    reset,
    
    // Derived
    isReadyToSubmit: 
      selection.selectedFunds.length > 0 && 
      calculation.calculations.length > 0 && 
      !submission.isSubmitting,
  };
}
