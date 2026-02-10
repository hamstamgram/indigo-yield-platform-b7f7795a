/**
 * Yield Operations Page
 * Consolidated fund management and yield distribution
 * REDESIGNED: Yield Spectrum aesthetic
 */

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Skeleton,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  QueryErrorBoundary,
} from "@/components/ui";
import {
  TrendingUp,
  Users,
  Plus,
  Coins,
  CalendarIcon,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { AdminGuard } from "@/components/admin";
import {
  OpenPeriodDialog,
  YieldInputForm,
  YieldPreviewResults,
  YieldConfirmDialog,
} from "@/features/admin/yields/components";
import { CryptoIcon } from "@/components/CryptoIcons";
import {
  usePendingYieldEvents,
  useInvestorCrystallizationEvents,
} from "@/features/admin/yields/hooks/useYieldCrystallization";
import { useAUMReconciliation } from "@/features/admin/system/hooks/useAUMReconciliation";
import { getMonth, getYear } from "date-fns";
import { useYieldOperationsState, type Fund } from "@/hooks/admin/useYieldOperationsState";
import { cn } from "@/lib/utils";

function YieldOperationsContent() {
  const ops = useYieldOperationsState();

  // Calculate pending yield events for selected fund/month
  const reportingMonthDate = ops.reportingMonth ? new Date(ops.reportingMonth) : null;
  const { data: pendingEvents } = usePendingYieldEvents(
    ops.selectedFund?.id || null,
    reportingMonthDate ? getYear(reportingMonthDate) : new Date().getFullYear(),
    reportingMonthDate ? getMonth(reportingMonthDate) + 1 : new Date().getMonth() + 1
  );

  // Per-investor crystallization events for preview breakdown
  const crystalEnabled =
    (ops.yieldPreview?.crystalsInPeriod ?? 0) > 0 && ops.yieldPurpose === "reporting";
  const { data: crystallizationMap } = useInvestorCrystallizationEvents(
    ops.selectedFund?.id || null,
    ops.yieldPreview?.periodStart || null,
    ops.yieldPreview?.periodEnd || null,
    crystalEnabled
  );

  // AUM Reconciliation check
  const { data: reconciliation } = useAUMReconciliation(ops.selectedFund?.id || null);

  if (ops.loading) {
    return (
      <div className="container max-w-7xl mx-auto px-4 py-8 space-y-8">
        <Skeleton className="h-10 w-64 mb-2" />
        <Skeleton className="h-5 w-96 mb-8" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl mx-auto px-4 py-8 space-y-10 animate-fade-in pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight text-white flex items-center gap-3">
            Yield Operations
            <Badge
              variant="outline"
              className="border-emerald-500/30 text-emerald-400 bg-emerald-500/5"
            >
              Live Systems
            </Badge>
          </h1>
          <p className="text-slate-400 mt-2 max-w-2xl text-lg">
            Manage fund AUM checkpoints and distribute algorithmic yields to investors.
          </p>
        </div>

        <div className="flex gap-3">{/* Future actions can go here */}</div>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        <div className="glass-panel rounded-2xl p-6 border border-indigo-500/20 bg-indigo-500/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Coins className="h-24 w-24 text-indigo-400 transform rotate-12" />
          </div>
          <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-1">
            Active Funds
          </p>
          <p className="text-4xl font-display font-medium text-white">{ops.funds.length}</p>
        </div>

        <div className="glass-panel rounded-2xl p-6 border border-emerald-500/20 bg-emerald-500/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Users className="h-24 w-24 text-emerald-400 transform -rotate-12" />
          </div>
          <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-1">
            Total Positions
          </p>
          <p className="text-4xl font-display font-medium text-white">
            {ops.funds.reduce((sum, f) => sum + f.investor_count, 0)}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-indigo-400" />
          Fund Portfolio
        </h2>

        {/* Funds Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {ops.funds.map((fund) => (
            <FundCard
              key={fund.id}
              fund={fund}
              formatValue={ops.formatValue}
              onOpenYieldDialog={() => ops.openYieldDialog(fund)}
              onOpenPeriodDialog={() => {
                ops.setSelectedFund(fund);
                ops.setShowOpenPeriodDialog(true);
              }}
            />
          ))}
        </div>
      </div>

      {/* Yield Distribution Dialog */}
      <Dialog open={ops.showYieldDialog} onOpenChange={ops.setShowYieldDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto glass-panel border-white/10 p-0">
          <DialogHeader className="p-6 bg-black/20 border-b border-white/5">
            <DialogTitle className="flex items-center gap-3 text-2xl">
              {ops.selectedFund && (
                <div className="h-10 w-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                  <CryptoIcon symbol={ops.selectedFund.asset} className="h-6 w-6 text-white" />
                </div>
              )}
              <span className="text-white">Record Yield Event</span>
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-base">
              Enter the yield amount or new AUM to calculate distribution for{" "}
              <span className="text-indigo-400 font-medium">{ops.selectedFund?.name}</span>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 p-6">
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
                  crystallizationMap={crystallizationMap}
                  yieldPurpose={ops.yieldPurpose}
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
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
        onApply={ops.handleApplyYield}
        applyLoading={ops.applyLoading}
        existingDistributionDate={ops.existingDistributionDate}
      />

      {/* Open Period Dialog */}
      <OpenPeriodDialog
        open={ops.showOpenPeriodDialog}
        onOpenChange={ops.setShowOpenPeriodDialog}
        fund={ops.selectedFund}
        onSuccess={() => ops.refetchFunds()}
      />
    </div>
  );
}

// Sub-components for cleaner main component

interface FundCardProps {
  fund: Fund;
  formatValue: (value: number, asset: string) => string;
  onOpenYieldDialog: () => void;
  onOpenPeriodDialog: () => void;
}

function FundCard({ fund, formatValue, onOpenYieldDialog, onOpenPeriodDialog }: FundCardProps) {
  return (
    <div className="glass-card bg-card/40 hover:bg-card/60 border-white/5 hover:border-indigo-500/30 rounded-2xl overflow-hidden transition-all duration-300 group hover:shadow-[0_0_20px_-5px_rgba(99,102,241,0.2)] flex flex-col h-full">
      <div className="p-6 flex-1">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
              <CryptoIcon symbol={fund.asset} className="h-7 w-7 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white group-hover:text-indigo-300 transition-colors">
                {fund.name}
              </h3>
              <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                <span>{fund.code}</span>
                <span className="w-1 h-1 rounded-full bg-slate-600" />
                <span>{fund.asset}</span>
              </div>
            </div>
          </div>
          <div className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase tracking-wider border border-emerald-500/20">
            Active
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="p-3 rounded-lg bg-black/20 border border-white/5">
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">
              Total AUM
            </p>
            <p className="text-white font-mono font-medium">
              {formatValue(fund.total_aum, fund.asset)}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-black/20 border border-white/5">
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">
              Investors
            </p>
            <div className="flex items-center gap-1.5 text-white font-mono font-medium">
              <Users className="h-3.5 w-3.5 text-indigo-400" />
              {fund.investor_count}
            </div>
          </div>
        </div>

        {fund.aum_record_count === 0 && (
          <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <span className="text-xs text-amber-200">
              No baseline AUM found. You must open a period before recording yield.
            </span>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-white/5 bg-white/[0.02]">
        <div className="flex gap-3">
          {fund.aum_record_count === 0 && (
            <Button
              onClick={onOpenPeriodDialog}
              variant="outline"
              size="sm"
              className="flex-1 border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/10 hover:text-white"
            >
              <CalendarIcon className="h-4 w-4 mr-2" />
              Open Period
            </Button>
          )}

          <Button
            onClick={onOpenYieldDialog}
            disabled={fund.investor_count === 0}
            size="sm"
            className={cn(
              "w-full shadow-lg transition-all active:scale-95",
              fund.aum_record_count === 0 ? "flex-1" : "w-full",
              fund.investor_count > 0
                ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20"
                : "bg-slate-800 text-slate-500 border border-white/5"
            )}
            variant={fund.investor_count > 0 ? "default" : "secondary"}
          >
            <Plus className="h-4 w-4 mr-2" />
            Record Yield
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function YieldOperationsPage() {
  return (
    <AdminGuard>
      <QueryErrorBoundary>
        <YieldOperationsContent />
      </QueryErrorBoundary>
    </AdminGuard>
  );
}
