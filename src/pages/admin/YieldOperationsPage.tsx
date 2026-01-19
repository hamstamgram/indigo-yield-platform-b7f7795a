/**
 * Yield Operations Page
 * Consolidated fund management and yield distribution
 * With confirmation dialog for safety
 * 
 * Refactored to use extracted components and hooks for maintainability
 */

import {
  Card, CardContent, CardFooter, CardHeader, CardTitle,
  Button, Badge, Skeleton,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui";
import {
  TrendingUp,
  Users,
  Plus,
  Coins,
  CalendarIcon,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { AdminGuard } from "@/components/admin";
import { 
  FundAUMEventsTable, 
  OpenPeriodDialog, 
  YieldInputForm, 
  YieldPreviewResults, 
  YieldConfirmDialog 
} from "@/components/admin/yields";
import { CryptoIcon } from "@/components/CryptoIcons";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { usePendingYieldEvents } from "@/hooks/data/admin/useYieldCrystallization";
import { useAUMReconciliation } from "@/hooks/data/admin/useAUMReconciliation";
import { getMonth, getYear } from "date-fns";
import { useYieldOperationsState, type Fund } from "@/hooks/admin/useYieldOperationsState";

function YieldOperationsContent() {
  const ops = useYieldOperationsState();
  
  // Calculate pending yield events for selected fund/month
  const reportingMonthDate = ops.reportingMonth ? new Date(ops.reportingMonth) : null;
  const { data: pendingEvents } = usePendingYieldEvents(
    ops.selectedFund?.id || null,
    reportingMonthDate ? getYear(reportingMonthDate) : new Date().getFullYear(),
    reportingMonthDate ? getMonth(reportingMonthDate) + 1 : new Date().getMonth() + 1
  );
  
  // AUM Reconciliation check
  const { data: reconciliation } = useAUMReconciliation(ops.selectedFund?.id || null);

  if (ops.loading) {
    return (
      <div className="container max-w-6xl mx-auto px-4 py-6">
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-4 w-96 mb-8" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-40 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight">Yield Operations</h1>
        <p className="text-muted-foreground mt-1">
          Manage fund AUM and distribute yield to investors
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Coins className="h-8 w-8 text-primary/30" />
              <div>
                <p className="text-xs text-muted-foreground uppercase">Active Funds</p>
                <p className="text-2xl font-mono font-bold">{ops.funds.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-primary/30" />
              <div>
                <p className="text-xs text-muted-foreground uppercase">Total Positions</p>
                <p className="text-2xl font-mono font-bold">
                  {ops.funds.reduce((sum, f) => sum + f.investor_count, 0)}
                </p>
                <p className="text-xs text-muted-foreground">Investor × fund combinations</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Funds Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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

      {/* AUM Checkpoints Section */}
      {ops.funds.length > 0 && (
        <AUMCheckpointsSection
          funds={ops.funds}
          selectedFund={ops.selectedFund}
          setSelectedFund={ops.setSelectedFund}
          formatValue={ops.formatValue}
        />
      )}

      {/* Yield Distribution Dialog */}
      <Dialog open={ops.showYieldDialog} onOpenChange={ops.setShowYieldDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {ops.selectedFund && <CryptoIcon symbol={ops.selectedFund.asset} className="h-8 w-8" />}
              Record Yield - {ops.selectedFund?.name}
            </DialogTitle>
            <DialogDescription>
              Enter the new total AUM to calculate and distribute yield.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
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
            />

            {/* Preview Results */}
            {ops.yieldPreview && (
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
    <Card className="group hover:shadow-md transition-shadow flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CryptoIcon symbol={fund.asset} className="h-10 w-10" />
            <div>
              <CardTitle className="text-lg">{fund.name}</CardTitle>
              <p className="text-sm text-muted-foreground">{fund.code}</p>
            </div>
          </div>
          <Badge variant="outline">{fund.asset}</Badge>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 space-y-3 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <span className="font-mono font-semibold">
              {formatValue(fund.total_aum, fund.asset)}
            </span>
            <span className="text-muted-foreground">{fund.asset}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{fund.investor_count}</span>
          </div>
        </div>

        {fund.aum_record_count === 0 && (
          <div className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            No AUM baseline - Open Period first
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-0">
        <div className="flex gap-2 w-full">
          {fund.aum_record_count === 0 && (
            <Button
              onClick={onOpenPeriodDialog}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              <CalendarIcon className="h-4 w-4 mr-2" />
              Open Period
            </Button>
          )}
          
          <Button
            onClick={onOpenYieldDialog}
            disabled={fund.investor_count === 0}
            size="sm"
            className={fund.aum_record_count === 0 ? "flex-1" : "w-full"}
            variant={fund.investor_count > 0 ? "primary" : "secondary"}
          >
            <Plus className="h-4 w-4 mr-2" />
            Record Yield
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

interface AUMCheckpointsSectionProps {
  funds: Fund[];
  selectedFund: Fund | null;
  setSelectedFund: (fund: Fund | null) => void;
  formatValue: (value: number, asset: string) => string;
}

function AUMCheckpointsSection({ 
  funds, 
  selectedFund, 
  setSelectedFund, 
  formatValue 
}: AUMCheckpointsSectionProps) {
  return (
    <Collapsible>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="h-5 w-5 text-muted-foreground" />
                AUM Checkpoints
              </CardTitle>
              <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">Select Fund</span>
              <Select
                value={selectedFund?.id || ""}
                onValueChange={(value) => {
                  const fund = funds.find((f) => f.id === value);
                  setSelectedFund(fund || null);
                }}
              >
                <SelectTrigger className="w-[250px]">
                  <SelectValue placeholder="Choose a fund..." />
                </SelectTrigger>
                <SelectContent>
                  {funds.map((fund) => (
                    <SelectItem key={fund.id} value={fund.id}>
                      <div className="flex items-center gap-2">
                        <CryptoIcon symbol={fund.asset} className="h-4 w-4" />
                        {fund.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedFund ? (
              <FundAUMEventsTable
                fundId={selectedFund.id}
                formatValue={formatValue}
                asset={selectedFund.asset || ""}
              />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Select a fund to view AUM checkpoints
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export default function YieldOperationsPage() {
  return (
    <AdminGuard>
      <YieldOperationsContent />
    </AdminGuard>
  );
}
