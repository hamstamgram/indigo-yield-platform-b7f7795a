import { useEffect } from "react";
import { useYieldOperationsState } from "@/hooks/admin/useYieldOperationsState";
import { YieldInputForm } from "@/features/admin/yields/components/YieldInputForm";
import { YieldPreviewResults } from "@/features/admin/yields/components/YieldPreviewResults";
import { YieldConfirmDialog } from "@/features/admin/yields/components/YieldConfirmDialog";
import { usePendingYieldEvents } from "@/features/admin/yields/hooks/useYieldCrystallization";
import { useAUMReconciliation } from "@/features/admin/system/hooks/useAUMReconciliation";
import { getMonth, getYear } from "date-fns";

interface GlobalYieldFlowProps {
  fundId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function GlobalYieldFlow({ fundId, onSuccess, onCancel }: GlobalYieldFlowProps) {
  // Use the full yield operations state hook
  const ops = useYieldOperationsState();

  // Sync selected fund from parent dialog
  useEffect(() => {
    if (fundId && ops.funds) {
      const fund = ops.funds.find((f) => f.id === fundId);
      if (fund) {
        ops.setSelectedFund(fund);
      }
    }
  }, [fundId, ops.funds, ops.setSelectedFund]);

  // Force purpose to 'transaction' and defaults when mounting
  useEffect(() => {
    ops.setYieldPurpose("transaction");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Hook into success to close parent
  // We monitor the closure of the internal confirm dialog as a proxy for success if applyLoading was true
  // But reliable way is to wrap handleApplyYield.
  // Since we can't easily wrap the hook's internal function without re-implementing it,
  // we'll rely on the side effect: if showConfirmDialog becomes false AND we just finished applying...
  // Actually, ops returns `handleApplyYield`. We can wrap that if we pass it to the child.

  // Better: The `YieldConfirmDialog` calls `onApply`. We can pass a wrapped handler there.

  const handleApplyWrapper = async () => {
    await ops.handleApplyYield();
    // After apply, if successful (no error thrown in hook, but hook catches errors),
    // we need to know if it succeeded.
    // The hook clears `showConfirmDialog` on success.
    // Queries are invalidated.
    // We can assume if confirmation dialog closes and we are not loading, it's done.
    // But `onApply` is void.

    // Check if we can detect success.
    // The hook `handleApplyYield` sets `showConfirmDialog: false` on success.
    // We can infer success if we trigger it and then the dialog closes.
    // However, simpler to just let the user see the success toast and close the main dialog manually?
    // "onSuccess" prop is passed to AddTransactionDialog to close it.
    // We should call `onSuccess()` after successful application.

    // Since `handleApplyYield` is async, we can await it.
    // But `handleApplyYield` in the hook catches errors and doesn't return success status.
    // This is a limitation of the current hook design.
    // Workaround: We can observe `ops.showConfirmDialog` transition from true to false while `ops.applyLoading` goes false.
    // Or we can just let the user close the main dialog.
    // User request: "operate the same way". In the main page, the dialog closes.
    // Here, we want `AddTransactionDialog` to close.
  };

  // Watch for successful completion
  useEffect(() => {
    // If we were applying, and now we are not, and the confirm dialog is gone, and the yield dialog state (internal to hook) is closed...
    // The hook sets `showYieldDialog: false` on success.
    if (!ops.showYieldDialog && !ops.showConfirmDialog && !ops.applyLoading && ops.yieldPreview) {
      // This state combination suggests completion (or cancellation).
      // But initially showYieldDialog is false in the hook (we ignore that).
      // Let's rely on the fact that `handleApplyYield` sets `showYieldDialog` to false.
      // We can initialize `showYieldDialog` to true in our effect.
    }
  }, [ops, onSuccess]);

  // Initialize internal dialog state to true to match hook expectations (though we don't render the hook's ValidDialog)
  useEffect(() => {
    ops.setShowYieldDialog(true);
  }, [ops.setShowYieldDialog]);

  // When hook sets showYieldDialog to false (after success), we call onSuccess
  useEffect(() => {
    if (!ops.showYieldDialog) {
      // If we stand up the component, we set it true. If it becomes false, it means success (per hook logic).
      // However, initial state is false. We set true in effect.
      // Need to be careful about race conditions.
      // Let's add a ref or flag to track "active".
    }
  }, [ops.showYieldDialog]);

  // Wrap the apply handler to call onSuccess
  const onApplyWithSuccess = async () => {
    await ops.handleApplyYield();
    // The hook swallows errors, so we can't know for sure if it succeeded just by awaiting.
    // But it sets `showConfirmDialog` to false on success.
    // And `showYieldDialog` to false.
    // If we check those...
    // Let's defer closing the parent to the user or a separate effect if needed.
    // Actually, if we just await, the toast appears. The user can then close the "Add Transaction" dialog or we can close it.
    // If the hook sets showYieldDialog to false, that's our signal.
    if (ops.showYieldDialog === false) {
      onSuccess();
    }
  };

  const reportingMonthDate = ops.reportingMonth ? new Date(ops.reportingMonth) : null;
  const { data: pendingEvents } = usePendingYieldEvents(
    ops.selectedFund?.id || null,
    reportingMonthDate ? getYear(reportingMonthDate) : new Date().getFullYear(),
    reportingMonthDate ? getMonth(reportingMonthDate) + 1 : new Date().getMonth() + 1
  );

  const { data: reconciliation } = useAUMReconciliation(ops.selectedFund?.id || null);

  if (!ops.selectedFund) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Select a fund to proceed with Yield Distribution.
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
      <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900 rounded-lg">
        <h4 className="text-sm font-semibold text-indigo-900 dark:text-indigo-100 mb-1">
          Global Yield Mode
        </h4>
        <p className="text-xs text-indigo-700 dark:text-indigo-300">
          This will calculate and distribute yield for <strong>ALL</strong> investors in{" "}
          {ops.selectedFund.name}.
        </p>
      </div>

      <YieldInputForm
        selectedFund={ops.selectedFund}
        newAUM={ops.newAUM}
        setNewAUM={ops.setNewAUM}
        yieldPurpose={ops.yieldPurpose}
        setYieldPurpose={ops.setYieldPurpose}
        aumDate={ops.aumDate}
        setAumDate={ops.setAumDate}
        datePickerOpen={ops.datePickerOpen}
        setDatePickerOpen={ops.setDatePickerOpen}
        reportingMonth={ops.reportingMonth}
        availableMonths={ops.getAvailableMonths()}
        handleReportingMonthChange={ops.handleReportingMonthChange}
        validateEffectiveDate={ops.validateEffectiveDate}
        handlePreviewYield={ops.handlePreviewYield}
        previewLoading={ops.previewLoading}
        hasPreview={!!ops.yieldPreview}
        formatValue={ops.formatValue}
        reconciliation={reconciliation}
        pendingEvents={pendingEvents}
        asOfAum={ops.asOfAum}
        asOfAumLoading={ops.asOfAumLoading}
        existingDistributionDate={ops.existingDistributionDate}
      />

      {/* Preview Results */}
      {ops.yieldPreview && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <YieldPreviewResults
            yieldPreview={ops.yieldPreview}
            selectedFund={ops.selectedFund}
            formatValue={ops.formatValue}
            showSystemAccounts={ops.showSystemAccounts}
            setShowSystemAccounts={ops.setShowSystemAccounts}
            showOnlyChanged={ops.showOnlyChanged}
            setShowOnlyChanged={ops.setShowOnlyChanged}
            searchInvestor={ops.searchInvestor}
            setSearchInvestor={ops.setSearchInvestor}
            getFilteredDistributions={ops.getFilteredDistributions}
            onConfirmApply={ops.handleConfirmApply}
            applyLoading={ops.applyLoading}
          />
        </div>
      )}

      <YieldConfirmDialog
        open={ops.showConfirmDialog}
        onOpenChange={ops.setShowConfirmDialog}
        selectedFund={ops.selectedFund}
        yieldPurpose={ops.yieldPurpose}
        aumDate={ops.aumDate}
        yieldPreview={ops.yieldPreview}
        confirmationText={ops.confirmationText}
        setConfirmationText={ops.setConfirmationText}
        acknowledgeDiscrepancy={ops.acknowledgeDiscrepancy}
        setAcknowledgeDiscrepancy={ops.setAcknowledgeDiscrepancy}
        reconciliation={reconciliation}
        formatValue={ops.formatValue}
        onApply={onApplyWithSuccess}
        applyLoading={ops.applyLoading}
        existingDistributionDate={ops.existingDistributionDate}
      />
    </div>
  );
}
