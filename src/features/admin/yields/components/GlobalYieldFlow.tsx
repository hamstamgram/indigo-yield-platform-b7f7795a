import { useEffect, useRef } from "react";
import { useYieldOperationsState } from "@/features/admin/yields/hooks/useYieldOperationsState";
import { YieldInputForm } from "@/features/admin/yields/components/YieldInputForm";
import { YieldPreviewResults } from "@/features/admin/yields/components/YieldPreviewResults";
import { DistributeYieldDialog } from "@/features/admin/yields/components/DistributeYieldDialog";
import { usePendingYieldEvents } from "@/features/admin/yields/hooks/useYieldCrystallization";
import { getMonth, getYear } from "date-fns";

interface GlobalYieldFlowProps {
  fundId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function GlobalYieldFlow({ fundId, onSuccess, onCancel }: GlobalYieldFlowProps) {
  const ops = useYieldOperationsState();
  const hasInitialized = useRef(false);

  // Sync selected fund from parent dialog
  useEffect(() => {
    if (fundId && ops.funds) {
      const fund = ops.funds.find((f) => f.id === fundId);
      if (fund) {
        ops.setSelectedFund(fund);
      }
    }
  }, [fundId, ops.funds, ops.setSelectedFund]);

  // Force purpose to 'transaction' and initialize dialog state
  useEffect(() => {
    ops.setYieldPurpose("transaction");
    ops.setShowYieldDialog(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Track when the component is initialized (dialog set to true)
  useEffect(() => {
    if (ops.showYieldDialog) {
      hasInitialized.current = true;
    }
  }, [ops.showYieldDialog]);

  // Detect success: showYieldDialog transitions from true to false after initialization
  useEffect(() => {
    if (hasInitialized.current && !ops.showYieldDialog && !ops.applyLoading) {
      onSuccess();
    }
  }, [ops.showYieldDialog, ops.applyLoading, onSuccess]);

  const reportingMonthDate = ops.reportingMonth ? new Date(ops.reportingMonth) : null;
  const { data: pendingEvents } = usePendingYieldEvents(
    ops.selectedFund?.id || null,
    reportingMonthDate ? getYear(reportingMonthDate) : new Date().getFullYear(),
    reportingMonthDate ? getMonth(reportingMonthDate) + 1 : new Date().getMonth() + 1
  );

  const reconciliation = ops.reconResult;

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
        aumTime={ops.aumTime}
        setAumTime={ops.setAumTime}
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

      <DistributeYieldDialog
        open={ops.showConfirmDialog}
        onOpenChange={ops.setShowConfirmDialog}
        grossYield={ops.yieldPreview?.grossYield ?? "0"}
        asset={ops.selectedFund?.asset ?? ""}
        fundName={ops.selectedFund?.name ?? "Selected Fund"}
        investorCount={ops.yieldPreview?.investorCount ?? 0}
        onConfirm={ops.handleApplyYield}
        isLoading={ops.applyLoading}
        yieldPurpose={ops.yieldPurpose}
        aumDate={ops.aumDate}
        distributionDate={ops.distributionDate}
        totalFees={ops.yieldPreview?.totalFees}
        totalIbFees={ops.yieldPreview?.totalIbFees}
        indigoFeesCredit={ops.yieldPreview?.indigoFeesCredit}
        netYield={ops.yieldPreview?.netYield}
        reconciliation={reconciliation}
        existingDistributionDate={ops.existingDistributionDate}
        asOfAum={ops.asOfAum}
        formatValue={ops.formatValue}
      />
    </div>
  );
}
