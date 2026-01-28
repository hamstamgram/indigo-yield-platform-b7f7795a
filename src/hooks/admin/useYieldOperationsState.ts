/**
 * useYieldOperationsState - State management hook for yield operations
 * Extracted from YieldOperationsPage for maintainability
 */

import { useState, useCallback, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { startOfMonth, endOfMonth, isWithinInterval, format } from "date-fns";
import { useAuth } from "@/services/auth";
import { useActiveFundsWithAUM } from "@/hooks";
import { useFundAumAsOf } from "@/hooks/data/admin/useFundAumAsOf";
import {
  previewYieldDistribution,
  applyYieldDistribution,
  type YieldCalculationResult,
  type YieldDistribution,
} from "@/services/admin";
import { QUERY_KEYS, YIELD_RELATED_KEYS } from "@/constants/queryKeys";
import { formatAUM } from "@/utils/formatters";
import { isSystemAccount as checkSystemAccount } from "@/utils/accountUtils";

// Fund type used in this component
export type Fund = NonNullable<ReturnType<typeof useActiveFundsWithAUM>["data"]>[number];

export type YieldPurpose = "reporting" | "transaction";

export interface YieldOperationsState {
  selectedFund: Fund | null;
  showYieldDialog: boolean;
  showOpenPeriodDialog: boolean;
  newAUM: string;
  yieldPreview: YieldCalculationResult | null;
  previewLoading: boolean;
  applyLoading: boolean;
  yieldPurpose: YieldPurpose;
  aumDate: Date;
  datePickerOpen: boolean;
  reportingMonth: string;
  showConfirmDialog: boolean;
  confirmationText: string;
  showSystemAccounts: boolean;
  showOnlyChanged: boolean;
  searchInvestor: string;
  acknowledgeDiscrepancy: boolean;
  asOfDateIso: string | null; // ISO string for as-of AUM query
}

const initialState: YieldOperationsState = {
  selectedFund: null,
  showYieldDialog: false,
  showOpenPeriodDialog: false,
  newAUM: "",
  yieldPreview: null,
  previewLoading: false,
  applyLoading: false,
  yieldPurpose: "reporting",
  aumDate: new Date(),
  datePickerOpen: false,
  reportingMonth: "",
  showConfirmDialog: false,
  confirmationText: "",
  showSystemAccounts: true,
  showOnlyChanged: false,
  searchInvestor: "",
  acknowledgeDiscrepancy: false,
  asOfDateIso: null,
};

export function useYieldOperationsState() {
  const [state, setState] = useState<YieldOperationsState>(initialState);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: funds = [], isLoading: loading, refetch: refetchFunds } = useActiveFundsWithAUM();

  // FIX: Always use "reporting" purpose for AUM reads regardless of yieldPurpose
  // The yieldPurpose only controls the output distribution visibility
  const AUM_READ_PURPOSE = "reporting" as const;

  // Fetch as-of AUM when fund and date are selected
  const {
    data: asOfAum,
    isLoading: asOfAumLoading,
    error: asOfAumError,
  } = useFundAumAsOf(
    state.selectedFund?.id ?? null,
    state.asOfDateIso,
    AUM_READ_PURPOSE // Always "reporting" for reads
  );

  // Log when as-of AUM changes for debugging (dev only)
  useEffect(() => {}, [
    state.selectedFund,
    state.asOfDateIso,
    asOfAum,
    asOfAumLoading,
    asOfAumError,
  ]);

  // Setters
  const setSelectedFund = useCallback((fund: Fund | null) => {
    setState((prev) => ({ ...prev, selectedFund: fund }));
  }, []);

  const setShowYieldDialog = useCallback((show: boolean) => {
    setState((prev) => ({ ...prev, showYieldDialog: show }));
  }, []);

  const setShowOpenPeriodDialog = useCallback((show: boolean) => {
    setState((prev) => ({ ...prev, showOpenPeriodDialog: show }));
  }, []);

  const setNewAUM = useCallback((value: string) => {
    setState((prev) => ({ ...prev, newAUM: value }));
  }, []);

  const setYieldPurpose = useCallback((purpose: YieldPurpose) => {
    setState((prev) => ({ ...prev, yieldPurpose: purpose }));
  }, []);

  // FIX: setAumDate must sync asOfDateIso and clear preview to avoid stale data
  const setAumDate = useCallback((date: Date) => {
    const newAsOfDateIso = format(date, "yyyy-MM-dd");

    setState((prev) => ({
      ...prev,
      aumDate: date,
      asOfDateIso: newAsOfDateIso,
      // Clear preview when date changes to force re-calculation
      yieldPreview: null,
      newAUM: "",
    }));
  }, []);

  const setDatePickerOpen = useCallback((open: boolean) => {
    setState((prev) => ({ ...prev, datePickerOpen: open }));
  }, []);

  const setReportingMonth = useCallback((month: string) => {
    setState((prev) => ({ ...prev, reportingMonth: month }));
  }, []);

  const setShowConfirmDialog = useCallback((show: boolean) => {
    setState((prev) => ({ ...prev, showConfirmDialog: show }));
  }, []);

  const setConfirmationText = useCallback((text: string) => {
    setState((prev) => ({ ...prev, confirmationText: text }));
  }, []);

  const setShowSystemAccounts = useCallback((show: boolean) => {
    setState((prev) => ({ ...prev, showSystemAccounts: show }));
  }, []);

  const setShowOnlyChanged = useCallback((show: boolean) => {
    setState((prev) => ({ ...prev, showOnlyChanged: show }));
  }, []);

  const setSearchInvestor = useCallback((search: string) => {
    setState((prev) => ({ ...prev, searchInvestor: search }));
  }, []);

  const setAcknowledgeDiscrepancy = useCallback((acknowledge: boolean) => {
    setState((prev) => ({ ...prev, acknowledgeDiscrepancy: acknowledge }));
  }, []);

  // Generate available months for selection
  // FIX: Use date-fns format instead of toISOString to avoid timezone bugs
  const getAvailableMonths = useCallback((): { value: string; label: string }[] => {
    const months: { value: string; label: string }[] = [];
    const now = new Date();
    const startDate = new Date(2024, 0, 1);
    let current = new Date(now.getFullYear(), now.getMonth(), 1);

    while (current >= startDate) {
      // FIX: Use format() for local date canonicalization (no timezone shift)
      const value = format(current, "yyyy-MM-dd");
      const label = format(current, "MMMM yyyy");
      months.push({ value, label });
      current = new Date(current.getFullYear(), current.getMonth() - 1, 1);
    }
    return months;
  }, []);

  // Open yield dialog with defaults
  // FIX: Use date-fns format for all date canonicalization
  const openYieldDialog = useCallback((fund: Fund) => {
    const currentMonthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");
    const lastDayOfMonth = endOfMonth(new Date());
    const asOfDateIso = format(lastDayOfMonth, "yyyy-MM-dd");

    setState((prev) => ({
      ...prev,
      selectedFund: fund,
      newAUM: "",
      yieldPreview: null,
      yieldPurpose: "reporting",
      aumDate: lastDayOfMonth,
      showYieldDialog: true,
      confirmationText: "",
      showSystemAccounts: true,
      showOnlyChanged: false,
      searchInvestor: "",
      acknowledgeDiscrepancy: false,
      reportingMonth: currentMonthStart,
      asOfDateIso: asOfDateIso,
    }));
  }, []);

  // Handle reporting month change - updates as-of date for AUM fetch
  const handleReportingMonthChange = useCallback((monthStart: string) => {
    const selectedDate = new Date(monthStart + "T12:00:00");
    const lastDayOfMonth = endOfMonth(selectedDate);
    const asOfDateIso = format(lastDayOfMonth, "yyyy-MM-dd");

    setState((prev) => ({
      ...prev,
      reportingMonth: monthStart,
      aumDate: lastDayOfMonth,
      asOfDateIso: asOfDateIso,
      // Clear preview when month changes
      yieldPreview: null,
      newAUM: "",
    }));
  }, []);

  // Validate effective date is within reporting month
  const validateEffectiveDate = useCallback((): { valid: boolean; error?: string } => {
    if (state.yieldPurpose !== "reporting" || !state.reportingMonth) {
      return { valid: true };
    }

    const monthStart = startOfMonth(new Date(state.reportingMonth + "T12:00:00"));
    const monthEnd = endOfMonth(monthStart);

    const normalizedAumDate = new Date(state.aumDate);
    normalizedAumDate.setHours(12, 0, 0, 0);

    if (!isWithinInterval(normalizedAumDate, { start: monthStart, end: monthEnd })) {
      return {
        valid: false,
        error: `Effective date must be within ${format(monthStart, "MMMM yyyy")} (${format(monthStart, "MMM d")} - ${format(monthEnd, "MMM d")})`,
      };
    }

    return { valid: true };
  }, [state.yieldPurpose, state.reportingMonth, state.aumDate]);

  // Handle preview yield - uses as-of AUM for comparison
  const handlePreviewYield = useCallback(async () => {
    if (!state.selectedFund || !state.newAUM) return;

    const newAUMValue = parseFloat(state.newAUM);
    if (isNaN(newAUMValue) || newAUMValue < 0) {
      toast.error("Please enter a valid non-negative number.");
      return;
    }

    // Use as-of AUM for comparison instead of current positions
    const baseAum = asOfAum ?? state.selectedFund.total_aum;

    // Allow zero or lower AUM (negative yield months are valid - no fees on losses)
    // Show a warning but proceed with preview
    if (newAUMValue < baseAum) {
      toast.warning("New AUM is lower than period AUM. This represents a negative yield month.");
    } else if (newAUMValue === baseAum) {
      toast.info("New AUM equals period AUM. No yield to distribute.");
    }

    setState((prev) => ({ ...prev, previewLoading: true }));
    try {
      const result = await previewYieldDistribution({
        fundId: state.selectedFund.id,
        targetDate: state.aumDate,
        newTotalAUM: String(newAUMValue),
        purpose: state.yieldPurpose,
      });
      setState((prev) => ({ ...prev, yieldPreview: result, previewLoading: false }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to preview yield.");
      setState((prev) => ({ ...prev, previewLoading: false }));
    }
  }, [state.selectedFund, state.newAUM, state.aumDate, state.yieldPurpose, asOfAum]);

  // Handle confirm apply
  const handleConfirmApply = useCallback(() => {
    setState((prev) => ({ ...prev, showConfirmDialog: true, confirmationText: "" }));
  }, []);

  // Handle apply yield
  const handleApplyYield = useCallback(async () => {
    if (!state.selectedFund || !state.newAUM || !user || !state.yieldPreview) return;

    if (state.confirmationText !== "APPLY") {
      toast.error("Please type APPLY to confirm.");
      return;
    }

    setState((prev) => ({ ...prev, applyLoading: true }));
    try {
      await applyYieldDistribution(
        {
          fundId: state.selectedFund.id,
          targetDate: state.aumDate,
          newTotalAUM: state.newAUM,
        },
        user.id,
        state.yieldPurpose
      );

      const asset = state.selectedFund.asset;
      const grossYieldNum =
        typeof state.yieldPreview.grossYield === "string"
          ? parseFloat(state.yieldPreview.grossYield)
          : state.yieldPreview.grossYield;
      toast.success(
        `Distributed ${formatAUM(grossYieldNum, asset)} ${asset} to ${state.yieldPreview.investorCount} investors (${state.yieldPurpose === "reporting" ? "Reporting" : "Transaction"} purpose).`
      );

      setState((prev) => ({
        ...prev,
        showConfirmDialog: false,
        showYieldDialog: false,
        applyLoading: false,
      }));

      // Comprehensive cache invalidation
      YIELD_RELATED_KEYS.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });

      // FIX: Explicitly invalidate the specific fundAumAsOf query for this fund
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.fundAumAsOf(state.selectedFund.id, state.asOfDateIso, "reporting"),
      });

      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.funds });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.integrityDashboard });

      refetchFunds();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to apply yield.");
      setState((prev) => ({ ...prev, applyLoading: false }));
    }
  }, [state, user, queryClient, refetchFunds]);

  // Filter distributions for display
  const getFilteredDistributions = useCallback(
    (distributions: YieldDistribution[]) => {
      return distributions.filter((d) => {
        if (!state.showSystemAccounts && checkSystemAccount(d)) {
          return false;
        }
        if (state.showOnlyChanged && d.wouldSkip) return false;
        if (state.searchInvestor) {
          const search = state.searchInvestor.toLowerCase();
          return (
            d.investorName?.toLowerCase().includes(search) ||
            d.investorId.toLowerCase().includes(search)
          );
        }
        return true;
      });
    },
    [state.showSystemAccounts, state.showOnlyChanged, state.searchInvestor]
  );

  // Format value helper
  const formatValue = useCallback((value: number, asset: string) => formatAUM(value, asset), []);

  return {
    // State
    ...state,
    funds,
    loading,
    user,

    // As-of AUM data
    asOfAum: asOfAum ?? null,
    asOfAumLoading,
    asOfAumError: asOfAumError ?? null,

    // Setters
    setSelectedFund,
    setShowYieldDialog,
    setShowOpenPeriodDialog,
    setNewAUM,
    setYieldPurpose,
    setAumDate,
    setDatePickerOpen,
    setReportingMonth,
    setShowConfirmDialog,
    setConfirmationText,
    setShowSystemAccounts,
    setShowOnlyChanged,
    setSearchInvestor,
    setAcknowledgeDiscrepancy,

    // Helpers
    getAvailableMonths,
    openYieldDialog,
    handleReportingMonthChange,
    validateEffectiveDate,
    handlePreviewYield,
    handleConfirmApply,
    handleApplyYield,
    getFilteredDistributions,
    formatValue,
    refetchFunds,
  };
}
