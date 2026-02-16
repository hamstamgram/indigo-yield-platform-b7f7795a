/**
 * useYieldOperationsState - State management hook for yield operations
 * Refactored to compose smaller, focused hooks for better maintainability.
 */

import { useCallback, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { useAuth } from "@/services/auth";
import { useActiveFundsWithAUM } from "@/hooks";
import { useFundAumAsOf } from "@/features/admin/funds/hooks/useFundAumAsOf";
import { formatAUM } from "@/utils/formatters";
import { isSystemAccount as checkSystemAccount } from "@/utils/accountUtils";
import type { YieldDistribution } from "@/services/admin";

// Import sub-hooks
import { useYieldSelection, type Fund } from "./yield/useYieldSelection";
import { useYieldPeriod, type YieldPurpose } from "./yield/useYieldPeriod";
import { useYieldCalculation } from "./yield/useYieldCalculation";
import { useYieldSubmission } from "./yield/useYieldSubmission";

export { type Fund, type YieldPurpose };

export function useYieldOperationsState() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: funds = [], isLoading: loading, refetch: refetchFunds } = useActiveFundsWithAUM();

  // Initialize sub-hooks
  const selection = useYieldSelection();
  const period = useYieldPeriod();
  const calculation = useYieldCalculation();
  const submission = useYieldSubmission();

  // FIX: Always use "reporting" purpose for AUM reads
  const AUM_READ_PURPOSE = "reporting" as const;

  // Fetch as-of AUM when fund and date are selected
  const {
    data: asOfAum,
    isLoading: asOfAumLoading,
    error: asOfAumError,
  } = useFundAumAsOf(selection.selectedFund?.id ?? null, period.asOfDateIso, AUM_READ_PURPOSE);

  // Sync helpers
  const openYieldDialog = useCallback(
    (fund: Fund) => {
      const currentMonthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");
      const lastDayOfMonth = endOfMonth(new Date());
      const asOfDateIso = format(lastDayOfMonth, "yyyy-MM-dd");

      selection.setSelection({
        ...selection,
        selectedFund: fund,
        showYieldDialog: true,
        showOnlyChanged: false,
        searchInvestor: "",
      });

      period.setPeriod({
        ...period,
        yieldPurpose: "reporting",
        aumDate: lastDayOfMonth,
        asOfDateIso: asOfDateIso,
        reportingMonth: currentMonthStart,
        aumTime: format(new Date(), "HH:mm"),
        distributionDate: new Date(),
      });

      calculation.setNewAUM("");
      calculation.setYieldPreview(null);
      calculation.setExistingDistributionDate(null);
      calculation.setExistingDistributionId(null);
    },
    [selection, period, calculation]
  );

  const handleReportingMonthChange = useCallback(
    (monthStart: string) => {
      const selectedDate = new Date(monthStart + "T12:00:00");
      const lastDayOfMonth = endOfMonth(selectedDate);
      const asOfDateIso = format(lastDayOfMonth, "yyyy-MM-dd");

      period.setPeriod((prev) => ({
        ...prev,
        reportingMonth: monthStart,
        aumDate: lastDayOfMonth,
        asOfDateIso: asOfDateIso,
      }));

      // Clear preview when month changes
      calculation.setYieldPreview(null);
      calculation.setNewAUM("");
      calculation.setExistingDistributionDate(null);
      calculation.setExistingDistributionId(null);
    },
    [period, calculation]
  );

  const setAumDate = useCallback(
    (date: Date) => {
      period.setAumDate(date);
      // Clear preview when date changes
      calculation.setYieldPreview(null);
      calculation.setNewAUM("");
      calculation.setExistingDistributionDate(null);
      calculation.setExistingDistributionId(null);
    },
    [period, calculation]
  );

  // Wrap calculation and submission handlers to include shared states
  const onPreview = useCallback(() => {
    calculation.handlePreviewYield({
      selectedFund: selection.selectedFund,
      aumDate: period.aumDate,
      yieldPurpose: period.yieldPurpose,
      distributionDate: period.distributionDate,
      asOfAum: asOfAum ?? null,
    });
  }, [calculation, selection.selectedFund, period, asOfAum]);

  const onApply = useCallback(() => {
    submission.handleApplyYield({
      selectedFund: selection.selectedFund,
      user,
      yieldPreview: calculation.yieldPreview,
      yieldPurpose: period.yieldPurpose,
      aumDate: period.aumDate,
      newAUM: calculation.newAUM,
      asOfAum: asOfAum ?? null,
      aumTime: period.aumTime,
      distributionDate: period.distributionDate,
      checkExistingDistribution: calculation.checkExistingDistribution,
      onSuccess: () => {
        selection.setShowYieldDialog(false);
        refetchFunds();
      },
    });
  }, [submission, selection, user, calculation, period, asOfAum, refetchFunds]);

  // Filter distributions for display
  const getFilteredDistributions = useCallback(
    (distributions: YieldDistribution[]) => {
      return distributions.filter((d) => {
        if (!selection.showSystemAccounts && checkSystemAccount(d)) {
          return false;
        }
        if (selection.showOnlyChanged && d.wouldSkip) return false;
        if (selection.searchInvestor) {
          const search = selection.searchInvestor.toLowerCase();
          return (
            d.investorName?.toLowerCase().includes(search) ||
            d.investorId.toLowerCase().includes(search)
          );
        }
        return true;
      });
    },
    [selection.showSystemAccounts, selection.showOnlyChanged, selection.searchInvestor]
  );

  return {
    // Selection state
    selectedFund: selection.selectedFund,
    showYieldDialog: selection.showYieldDialog,
    showOpenPeriodDialog: selection.showOpenPeriodDialog,
    showSystemAccounts: selection.showSystemAccounts,
    showOnlyChanged: selection.showOnlyChanged,
    searchInvestor: selection.searchInvestor,
    setSelectedFund: selection.setSelectedFund,
    setShowYieldDialog: selection.setShowYieldDialog,
    setShowOpenPeriodDialog: selection.setShowOpenPeriodDialog,
    setShowSystemAccounts: selection.setShowSystemAccounts,
    setShowOnlyChanged: selection.setShowOnlyChanged,
    setSearchInvestor: selection.setSearchInvestor,

    // Period state
    yieldPurpose: period.yieldPurpose,
    aumDate: period.aumDate,
    datePickerOpen: period.datePickerOpen,
    reportingMonth: period.reportingMonth,
    asOfDateIso: period.asOfDateIso,
    aumTime: period.aumTime,
    distributionDate: period.distributionDate,
    setYieldPurpose: period.setYieldPurpose,
    setAumDate,
    setDatePickerOpen: period.setDatePickerOpen,
    setReportingMonth: period.setReportingMonth,
    setAumTime: period.setAumTime,
    setDistributionDate: period.setDistributionDate,
    getAvailableMonths: period.getAvailableMonths,
    validateEffectiveDate: () =>
      period.validateEffectiveDate(period.aumDate, period.yieldPurpose, period.reportingMonth),

    // Calculation state
    newAUM: calculation.newAUM,
    yieldPreview: calculation.yieldPreview,
    previewLoading: calculation.previewLoading,
    existingDistributionDate: calculation.existingDistributionDate,
    existingDistributionId: calculation.existingDistributionId,
    setNewAUM: calculation.setNewAUM,
    handlePreviewYield: onPreview,

    // Submission state
    applyLoading: submission.applyLoading,
    showConfirmDialog: submission.showConfirmDialog,
    confirmationText: submission.confirmationText,
    setShowConfirmDialog: submission.setShowConfirmDialog,
    setConfirmationText: submission.setConfirmationText,
    handleApplyYield: onApply,
    handleConfirmApply: () => submission.setShowConfirmDialog(true),

    // Global
    funds,
    loading,
    user,
    asOfAum: asOfAum ?? null,
    asOfAumLoading,
    asOfAumError: asOfAumError ?? null,
    getFilteredDistributions,
    formatValue: (value: number, asset: string) => formatAUM(value, asset),
    refetchFunds,

    // Exposed actions
    openYieldDialog,
    handleReportingMonthChange,

    // Reconciliation
    acknowledgeDiscrepancy: calculation.acknowledgeDiscrepancy,
    setAcknowledgeDiscrepancy: calculation.setAcknowledgeDiscrepancy,
  };
}
