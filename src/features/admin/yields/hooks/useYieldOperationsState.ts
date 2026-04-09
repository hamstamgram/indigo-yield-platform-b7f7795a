/**
 * useYieldOperationsState - State management hook for yield operations
 * Refactored to compose smaller, focused hooks for better maintainability.
 */

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { startOfMonth, endOfMonth, format, parseISO } from "date-fns";
import { useAuth } from "@/services/auth";
import { useActiveFundsWithAUM } from "@/features/admin/yields/hooks/useYieldOperations";
import { getTodayUTC } from "@/utils/dateUtils";

import { useAUMReconciliation } from "@/features/admin/system/hooks/useAUMReconciliation";
import { formatAUM } from "@/utils/formatters";
import { isSystemAccount as checkSystemAccount } from "@/utils/accountUtils";
import type { YieldDistribution } from "@/features/admin/yields/services/yields";

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

  // Fetch authoritative AUM from the live funds array (which refetches every 5s)
  const fundId = selection.selectedFund?.id ?? null;
  const liveFund = funds.find((f) => f.id === fundId);

  const asOfAum = liveFund?.total_aum ?? selection.selectedFund?.total_aum ?? null;
  const asOfAumLoading = loading;
  const asOfAumError = null;

  const { data: reconResult, isLoading: reconLoading } = useAUMReconciliation(
    fundId,
    0.01,
    period.asOfDateIso
  );

  // Sync helpers
  const openYieldDialog = useCallback(
    (fund: Fund) => {
      const todayUTC = getTodayUTC();
      const todayDate = parseISO(todayUTC);
      const currentMonthStart = format(startOfMonth(todayDate), "yyyy-MM-dd");
      const asOfDateIso = format(todayDate, "yyyy-MM-dd");

      // Force refetch of fund AUM data before displaying
      refetchFunds();

      selection.setSelection({
        ...selection,
        selectedFund: fund,
        showYieldDialog: true,
        showOnlyChanged: false,
        searchInvestor: "",
      });

      period.setPeriod({
        ...period,
        yieldPurpose: "transaction",
        aumDate: asOfDateIso,
        asOfDateIso: asOfDateIso,
        reportingMonth: currentMonthStart,
        aumTime: "12:00",
        distributionDate: todayDate,
      });

      calculation.setNewAUM("");
      calculation.setYieldPreview(null);
      calculation.setExistingDistributionDate(null);
      calculation.setExistingDistributionId(null);
    },
    [selection, period, calculation, refetchFunds]
  );

  const handleReportingMonthChange = useCallback(
    (monthStart: string) => {
      const selectedDate = new Date(monthStart + "T12:00:00");
      const lastDayOfMonth = endOfMonth(selectedDate);
      const asOfDateIso = format(lastDayOfMonth, "yyyy-MM-dd");

      period.setPeriod((prev) => ({
        ...prev,
        reportingMonth: monthStart,
        aumDate: asOfDateIso,
        asOfDateIso: asOfDateIso,
        distributionDate: lastDayOfMonth,
      }));

      // Clear preview when month changes (AUM input preserved)
      calculation.setYieldPreview(null);
      calculation.setExistingDistributionDate(null);
      calculation.setExistingDistributionId(null);
    },
    [period, calculation]
  );

  // Wrap purpose changes to keep distributionDate in sync
  const handleSetYieldPurpose = useCallback(
    (purpose: YieldPurpose) => {
      period.setPeriod((prev) => ({
        ...prev,
        yieldPurpose: purpose,
        // For both purposes, distributionDate should match the user-selected aumDate
        distributionDate: prev.aumDate ? new Date(prev.aumDate + "T12:00:00") : new Date(),
      }));
      // Clear preview when purpose changes (AUM input preserved)
      calculation.setYieldPreview(null);
      calculation.setExistingDistributionDate(null);
      calculation.setExistingDistributionId(null);
    },
    [period, calculation]
  );

  const setAumDate = useCallback(
    (dateStr: string) => {
      period.setAumDate(dateStr);
      // Keep distributionDate in sync with aumDate for transaction purpose
      period.setPeriod((prev) => ({
        ...prev,
        distributionDate: dateStr ? new Date(dateStr + "T12:00:00") : new Date(),
      }));
      // Clear preview when date changes (AUM input preserved)
      calculation.setYieldPreview(null);
      calculation.setExistingDistributionDate(null);
      calculation.setExistingDistributionId(null);
    },
    [period, calculation]
  );

  // Wrap calculation and submission handlers to include shared states
  const onPreview = useCallback(() => {
    calculation.handlePreviewYield({
      selectedFund: selection.selectedFund,
      aumDate: period.aumDate ? new Date(period.aumDate + "T12:00:00") : new Date(),
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
      aumDate: period.aumDate ? new Date(period.aumDate + "T12:00:00") : new Date(),
      newAUM: calculation.newAUM,
      asOfAum: asOfAum ?? null,
      aumTime: period.aumTime,
      distributionDate: period.distributionDate,
      checkExistingDistribution: calculation.checkExistingDistribution,
      onSuccess: () => {
        selection.setShowYieldDialog(false);
        refetchFunds();
      },
      onApplyResult: (result) => {
        calculation.setYieldPreview(result);
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
    setYieldPurpose: handleSetYieldPurpose,
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
    reconResult,
    reconLoading,
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
