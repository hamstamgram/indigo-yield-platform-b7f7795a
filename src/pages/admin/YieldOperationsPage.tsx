/**
 * Yield Operations Page
 * Consolidated fund management and yield distribution
 * With confirmation dialog for safety and month closing functionality
 * 
 * Preview now uses backend RPC for exact parity with apply
 */

import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Card, CardContent, CardHeader, CardTitle,
  Button, Input, Label, Badge, Skeleton, Switch, Calendar,
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
  Popover, PopoverContent, PopoverTrigger,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Checkbox,
} from "@/components/ui";
import {
  TrendingUp,
  Users,
  Plus,
  Loader2,
  CheckCircle,
  ArrowRight,
  Coins,
  CalendarIcon,
  AlertTriangle,
  Info,
  Lock,
  LockOpen,
  Building2,
  UserCheck,
  ArrowRightLeft,
  Clock,
} from "lucide-react";
import { AdminGuard, SuperAdminGuard, useSuperAdmin } from "@/components/admin";
import { CryptoIcon } from "@/components/CryptoIcons";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth/context";
import {
  previewYieldDistribution,
  applyYieldDistribution,
  type YieldCalculationResult,
  type YieldDistribution,
  type IBCredit,
} from "@/services";
import { useMonthClosure, useActiveFundsWithAUM } from "@/hooks";
import { usePendingYieldEvents } from "@/hooks/data/admin/useYieldCrystallization";
import { useAUMReconciliation } from "@/hooks/data/admin/useAUMReconciliation";
import { cn } from "@/lib/utils";
import { format, startOfMonth, endOfMonth, isWithinInterval, getMonth, getYear } from "date-fns";
import { INDIGO_FEES_ACCOUNT_ID } from "@/constants/fees";
import { QUERY_KEYS, YIELD_RELATED_KEYS } from "@/constants/queryKeys";

// Fund type used in this component
type Fund = NonNullable<ReturnType<typeof useActiveFundsWithAUM>["data"]>[number];

function YieldOperationsContent() {
  const [selectedFund, setSelectedFund] = useState<Fund | null>(null);
  const [showYieldDialog, setShowYieldDialog] = useState(false);
  const [newAUM, setNewAUM] = useState("");
  const [yieldPreview, setYieldPreview] = useState<YieldCalculationResult | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);
  
  // Purpose selector state
  const [yieldPurpose, setYieldPurpose] = useState<"reporting" | "transaction">("reporting");
  const [aumDate, setAumDate] = useState<Date>(new Date());
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  // Month closure state
  const [reportingMonth, setReportingMonth] = useState<string>("");
  const [closeMonthLoading, setCloseMonthLoading] = useState(false);
  const [reopenMonthLoading, setReopenMonthLoading] = useState(false);
  const [showReopenConfirm, setShowReopenConfirm] = useState(false);
  const [reopenReason, setReopenReason] = useState("");
  const { 
    closureStatus, 
    checkMonthClosed, 
    closeReportingMonth,
    reopenReportingMonth,
    getAvailableMonths,
    setClosureStatus 
  } = useMonthClosure();
  
  // Super admin check for reopen functionality
  const { isSuperAdmin } = useSuperAdmin();

  // Confirmation dialog state
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");
  
  // Preview filter state
  const [showSystemAccounts, setShowSystemAccounts] = useState(true);
  const [showOnlyChanged, setShowOnlyChanged] = useState(false);
  const [searchInvestor, setSearchInvestor] = useState("");
  
  // AUM Reconciliation acknowledgment
  const [acknowledgeDiscrepancy, setAcknowledgeDiscrepancy] = useState(false);

  const { user } = useAuth();
  const queryClient = useQueryClient();
  const availableMonths = getAvailableMonths();

  // Use the hook for funds data
  const { data: funds = [], isLoading: loading, refetch: refetchFunds } = useActiveFundsWithAUM();
  
  // Calculate pending yield events for selected fund/month
  const reportingMonthDate = reportingMonth ? new Date(reportingMonth) : null;
  const { data: pendingEvents } = usePendingYieldEvents(
    selectedFund?.id || null,
    reportingMonthDate ? getYear(reportingMonthDate) : new Date().getFullYear(),
    reportingMonthDate ? getMonth(reportingMonthDate) + 1 : new Date().getMonth() + 1
  );
  
  // AUM Reconciliation check
  const { data: reconciliation } = useAUMReconciliation(selectedFund?.id || null);

  const formatValue = (value: number, asset: string) => {
    if (asset === "BTC") {
      return value.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 8 });
    } else if (asset === "ETH" || asset === "SOL") {
      return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 6 });
    }
    return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  };

  const openYieldDialog = async (fund: Fund) => {
    setSelectedFund(fund);
    setNewAUM("");
    setYieldPreview(null);
    setYieldPurpose("reporting");
    setAumDate(new Date());
    setShowYieldDialog(true);
    setConfirmationText("");
    setClosureStatus(null);
    setShowSystemAccounts(true);
    setShowOnlyChanged(false);
    setSearchInvestor("");
    setAcknowledgeDiscrepancy(false);
    
    // Default to current month
    const currentMonthStart = startOfMonth(new Date()).toISOString().split("T")[0];
    setReportingMonth(currentMonthStart);
    
    // Check closure status for current month
    await checkMonthClosed(fund.id, new Date(currentMonthStart));
  };

  // Check closure status when reporting month changes
  const handleReportingMonthChange = async (monthStart: string) => {
    setReportingMonth(monthStart);
    if (selectedFund && monthStart) {
      await checkMonthClosed(selectedFund.id, new Date(monthStart));
    }
  };

  // Validate effective date is within reporting month
  // Use startOfDay for consistent timezone handling to avoid edge cases
  const validateEffectiveDate = (): { valid: boolean; error?: string } => {
    if (yieldPurpose !== "reporting" || !reportingMonth) {
      return { valid: true };
    }
    
    // Parse dates consistently - normalize to start of day to avoid timezone edge cases
    const monthStart = startOfMonth(new Date(reportingMonth + "T12:00:00")); // Noon to avoid DST issues
    const monthEnd = endOfMonth(monthStart);
    
    // Normalize aumDate to noon to avoid timezone boundary issues
    const normalizedAumDate = new Date(aumDate);
    normalizedAumDate.setHours(12, 0, 0, 0);
    
    if (!isWithinInterval(normalizedAumDate, { start: monthStart, end: monthEnd })) {
      return {
        valid: false,
        error: `Effective date must be within ${format(monthStart, "MMMM yyyy")} (${format(monthStart, "MMM d")} - ${format(monthEnd, "MMM d")})`,
      };
    }
    
    return { valid: true };
  };

  // Handle closing the reporting month
  const handleCloseMonth = async () => {
    if (!selectedFund || !reportingMonth || !user) return;
    
    const validation = validateEffectiveDate();
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }
    
    setCloseMonthLoading(true);
    try {
      const result = await closeReportingMonth(
        selectedFund.id,
        new Date(reportingMonth),
        aumDate,
        user.id,
        `Closed via Yield Operations UI`
      );
      
      if (!result.success) {
        toast.error(result.error || "Failed to close month");
      }
    } finally {
      setCloseMonthLoading(false);
    }
  };

  // Handle reopening the reporting month (superadmin only)
  const handleReopenMonth = async () => {
    if (!selectedFund || !reportingMonth || !user || !isSuperAdmin) return;
    
    setReopenMonthLoading(true);
    try {
      const result = await reopenReportingMonth(
        selectedFund.id,
        new Date(reportingMonth),
        user.id,
        reopenReason || "Reopened via Yield Operations UI"
      );
      
      if (result.success) {
        setShowReopenConfirm(false);
        setReopenReason("");
      }
    } finally {
      setReopenMonthLoading(false);
    }
  };

  const handlePreviewYield = async () => {
    if (!selectedFund || !newAUM) return;

    const newAUMValue = parseFloat(newAUM);
    if (isNaN(newAUMValue) || newAUMValue <= 0) {
      toast.error("Please enter a valid positive number.");
      return;
    }

    if (newAUMValue <= selectedFund.total_aum) {
      toast.error("New AUM must be greater than current AUM to distribute yield.");
      return;
    }

    setPreviewLoading(true);
    try {
      const result = await previewYieldDistribution({
        fundId: selectedFund.id,
        targetDate: aumDate,
        newTotalAUM: newAUMValue,
        purpose: yieldPurpose,
      });
      setYieldPreview(result);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to preview yield.");
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleConfirmApply = () => {
    // Open confirmation dialog
    setShowConfirmDialog(true);
    setConfirmationText("");
  };

  const handleApplyYield = async () => {
    if (!selectedFund || !newAUM || !user || !yieldPreview) return;

    // Validate confirmation text
    if (confirmationText !== "APPLY") {
      toast.error("Please type APPLY to confirm.");
      return;
    }

    setApplyLoading(true);
    try {
      await applyYieldDistribution(
        {
          fundId: selectedFund.id,
          targetDate: aumDate,
          newTotalAUM: parseFloat(newAUM),
        },
        user.id,
        yieldPurpose
      );

      toast.success(
        `Distributed ${formatValue(yieldPreview.grossYield, selectedFund.asset)} ${selectedFund.asset} to ${yieldPreview.investorCount} investors (${yieldPurpose === "reporting" ? "Reporting" : "Transaction"} purpose).`
      );

      setShowConfirmDialog(false);
      setShowYieldDialog(false);
      
      // Comprehensive cache invalidation for all yield-related data
      YIELD_RELATED_KEYS.forEach(key => {
        queryClient.invalidateQueries({ queryKey: key });
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.funds });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.integrityDashboard });
      
      refetchFunds();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to apply yield.");
    } finally {
      setApplyLoading(false);
    }
  };
  
  // Filter distributions for display
  const getFilteredDistributions = (distributions: YieldDistribution[]) => {
    return distributions.filter((d) => {
      // Filter by system accounts
      if (!showSystemAccounts) {
        const isSystemAccount = d.investorId === INDIGO_FEES_ACCOUNT_ID || 
          d.accountType === "fees_account" ||
          d.investorName?.toLowerCase().includes("indigo fees");
        if (isSystemAccount) return false;
      }
      
      // Filter by changed only
      if (showOnlyChanged && d.wouldSkip) return false;
      
      // Filter by search
      if (searchInvestor) {
        const search = searchInvestor.toLowerCase();
        return d.investorName?.toLowerCase().includes(search) || 
               d.investorId.toLowerCase().includes(search);
      }
      
      return true;
    });
  };
  
  // Check if investor is a system/IB account
  const isSystemAccount = (d: YieldDistribution) => {
    return d.investorId === INDIGO_FEES_ACCOUNT_ID || 
      d.accountType === "fees_account" ||
      d.investorName?.toLowerCase().includes("indigo fees");
  };

  if (loading) {
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
                <p className="text-2xl font-mono font-bold">{funds.length}</p>
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
                  {funds.reduce((sum, f) => sum + f.investor_count, 0)}
                </p>
                <p className="text-xs text-muted-foreground">Investor × fund combinations</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Funds Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {funds.map((fund) => (
          <Card key={fund.id} className="group hover:shadow-md transition-shadow">
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
            <CardContent className="space-y-4">
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

              <Button
                onClick={() => openYieldDialog(fund)}
                disabled={fund.investor_count === 0}
                className="w-full"
                variant={fund.investor_count > 0 ? "primary" : "secondary"}
              >
                <Plus className="h-4 w-4 mr-2" />
                Record Yield
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Yield Distribution Dialog */}
      <Dialog open={showYieldDialog} onOpenChange={setShowYieldDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selectedFund && <CryptoIcon symbol={selectedFund.asset} className="h-8 w-8" />}
              Record Yield - {selectedFund?.name}
            </DialogTitle>
            <DialogDescription>
              Enter the new total AUM to calculate and distribute yield.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Warning: No AUM History */}
            {selectedFund && selectedFund.aum_record_count === 0 && (
              <div className="flex items-start gap-3 p-4 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-medium text-amber-800 dark:text-amber-200">
                    No AUM History for {selectedFund.name}
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    This fund has no historical AUM records. Before distributing yield, you should record AUM data
                    via the <span className="font-medium">Daily Rates Management</span> page or by completing this form.
                    The first yield distribution will establish the baseline.
                  </p>
                </div>
              </div>
            )}

            {/* Step 1: Period & Purpose */}
            <div className="p-4 border rounded-lg bg-muted/20">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                    1
                  </div>
                  <h3 className="font-semibold">Choose Period & Purpose</h3>
                </div>
                
                {/* Month Closure Status Badge */}
                {yieldPurpose === "reporting" && reportingMonth && (
                  <Badge 
                    variant={closureStatus?.is_closed ? "destructive" : "outline"}
                    className={cn(
                      "flex items-center gap-1",
                      closureStatus?.is_closed 
                        ? "bg-red-100 text-red-700 border-red-300" 
                        : "bg-green-100 text-green-700 border-green-300"
                    )}
                  >
                    {closureStatus?.is_closed ? (
                      <>
                        <Lock className="h-3 w-3" />
                        Closed {closureStatus.closed_at && format(new Date(closureStatus.closed_at), "MMM d")}
                      </>
                    ) : (
                      <>
                        <LockOpen className="h-3 w-3" />
                        Open
                      </>
                    )}
                  </Badge>
                )}
              </div>

              {/* Reporting Month Selector - Only for reporting purpose */}
              {yieldPurpose === "reporting" && (
                <div className="space-y-2 mb-4">
                  <Label>Reporting Month</Label>
                  <Select value={reportingMonth} onValueChange={handleReportingMonthChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select month to close" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableMonths.map((month) => (
                        <SelectItem key={month.value} value={month.value}>
                          {month.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Select the reporting month this yield applies to
                  </p>
                </div>
              )}

              {/* AUM Input */}
              <div className="grid grid-cols-2 gap-6 mb-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Current AUM</Label>
                  <div className="text-2xl font-mono font-semibold">
                    {selectedFund && formatValue(selectedFund.total_aum, selectedFund.asset)}{" "}
                    <span className="text-base text-muted-foreground">{selectedFund?.asset}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-aum">New AUM ({selectedFund?.asset})</Label>
                  <Input
                    id="new-aum"
                    type="number"
                    step="any"
                    value={newAUM}
                    onChange={(e) => setNewAUM(e.target.value)}
                    placeholder={`Enter new total AUM`}
                    className="font-mono"
                    disabled={closureStatus?.is_closed && yieldPurpose === "reporting"}
                  />
                  {closureStatus?.is_closed && yieldPurpose === "reporting" && (
                    <p className="text-xs text-red-500">
                      Month is closed. Edits blocked.
                    </p>
                  )}
                </div>
              </div>

              {/* Date Picker - Using Shadcn Calendar */}
              <div className="space-y-2 mb-4">
                <Label>Effective Date</Label>
                <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !aumDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {aumDate ? format(aumDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={aumDate}
                      onSelect={(date) => {
                        if (date) {
                          setAumDate(date);
                          setDatePickerOpen(false);
                        }
                      }}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Purpose Selector with Explainer */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Purpose</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div 
                    className={cn(
                      "flex items-start gap-3 p-3 border rounded-md bg-background cursor-pointer transition-colors",
                      yieldPurpose === "reporting" 
                        ? "border-green-500 ring-1 ring-green-500/20" 
                        : "hover:border-green-500/50"
                    )}
                    onClick={() => setYieldPurpose("reporting")}
                  >
                    <div className={cn(
                      "mt-0.5 h-4 w-4 rounded-full flex-shrink-0",
                      yieldPurpose === "reporting" ? "bg-green-500" : "bg-muted-foreground/30"
                    )} />
                    <div>
                      <p className="font-medium text-sm">Reporting</p>
                      <p className="text-xs text-muted-foreground">Month-end official yield</p>
                    </div>
                  </div>
                  <div 
                    className={cn(
                      "flex items-start gap-3 p-3 border rounded-md bg-background cursor-pointer transition-colors",
                      yieldPurpose === "transaction" 
                        ? "border-orange-500 ring-1 ring-orange-500/20" 
                        : "hover:border-orange-500/50"
                    )}
                    onClick={() => setYieldPurpose("transaction")}
                  >
                    <div className={cn(
                      "mt-0.5 h-4 w-4 rounded-full flex-shrink-0",
                      yieldPurpose === "transaction" ? "bg-orange-500" : "bg-muted-foreground/30"
                    )} />
                    <div>
                      <p className="font-medium text-sm">Transaction</p>
                      <p className="text-xs text-muted-foreground">Operational (withdrawals/top-ups)</p>
                    </div>
                  </div>
                </div>
                
                {/* Purpose Explainer */}
                <div className={cn(
                  "flex items-start gap-2 p-3 rounded-md text-sm",
                  yieldPurpose === "reporting" 
                    ? "bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400" 
                    : "bg-orange-50 dark:bg-orange-950/20 text-orange-700 dark:text-orange-400"
                )}>
                  <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <div>
                    {yieldPurpose === "reporting" ? (
                      <>
                        <strong>Visible to investors.</strong> Official month-end yield that appears on investor statements and dashboards.
                      </>
                    ) : (
                      <>
                        <strong>Internal only.</strong> Operational yield for processing withdrawals or top-ups. Not visible to investors.
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Effective Date Validation Warning */}
            {yieldPurpose === "reporting" && reportingMonth && !validateEffectiveDate().valid && (
              <div className="flex items-start gap-2 p-3 rounded-md bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 text-sm">
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{validateEffectiveDate().error}</span>
              </div>
            )}

            {/* Pending Crystallization Events Info */}
            {yieldPurpose === "reporting" && pendingEvents && pendingEvents.count > 0 && (
              <div className="flex items-start gap-3 p-4 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700">
                <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-medium text-amber-800 dark:text-amber-200">
                    {pendingEvents.count} pending yield event{pendingEvents.count !== 1 ? 's' : ''} from mid-month flows
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    These events were crystallized from deposits/withdrawals during this period. 
                    They will become visible to investors after you apply this month-end yield.
                  </p>
                </div>
              </div>
            )}
            
            {/* AUM Reconciliation Warning */}
            {reconciliation?.has_warning && (
              <div className="flex items-start gap-3 p-4 rounded-lg border border-destructive/50 bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-medium text-destructive">
                    AUM Discrepancy Detected
                  </p>
                  <p className="text-sm text-destructive/80">
                    Positions sum: {formatValue(reconciliation.positions_sum, selectedFund?.asset || "USD")} {selectedFund?.asset}
                    <br />
                    Recorded AUM: {formatValue(reconciliation.recorded_aum, selectedFund?.asset || "USD")} {selectedFund?.asset}
                    <br />
                    Difference: {reconciliation.discrepancy_pct.toFixed(2)}% (threshold: {reconciliation.tolerance_pct}%)
                  </p>
                  <p className="text-sm text-destructive font-medium">
                    Review before applying yield to ensure accuracy.
                  </p>
                </div>
              </div>
            )}

            {/* Step 2: Preview Button */}
            <div className="p-4 border rounded-lg bg-muted/20">
              <div className="flex items-center gap-2 mb-4">
                <div className={cn(
                  "h-6 w-6 rounded-full flex items-center justify-center text-sm font-bold",
                  yieldPreview ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}>
                  2
                </div>
                <h3 className="font-semibold">Preview Distribution</h3>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handlePreviewYield}
                  disabled={
                    !newAUM || 
                    previewLoading || 
                    (yieldPurpose === "reporting" && closureStatus?.is_closed) ||
                    (yieldPurpose === "reporting" && !validateEffectiveDate().valid)
                  }
                  variant="secondary"
                  className="flex-1"
                >
                  {previewLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <ArrowRight className="h-4 w-4 mr-2" />
                  )}
                  Preview Yield Distribution
                </Button>
                
                {/* Close Month Button - Only for reporting purpose */}
                {yieldPurpose === "reporting" && reportingMonth && !closureStatus?.is_closed && (
                  <Button
                    onClick={handleCloseMonth}
                    disabled={closeMonthLoading || !validateEffectiveDate().valid}
                    variant="outline"
                    className="border-amber-500 text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                  >
                    {closeMonthLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Lock className="h-4 w-4 mr-2" />
                    )}
                    Close Month
                  </Button>
                )}
                
                {/* Reopen Month Button - Only for superadmin when month is closed */}
                {yieldPurpose === "reporting" && reportingMonth && closureStatus?.is_closed && isSuperAdmin && (
                  <Button
                    onClick={() => setShowReopenConfirm(true)}
                    disabled={reopenMonthLoading}
                    variant="outline"
                    className="border-red-500 text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                  >
                    {reopenMonthLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <LockOpen className="h-4 w-4 mr-2" />
                    )}
                    Reopen Month
                  </Button>
                )}
              </div>
            </div>

            {/* Preview Results */}
            {yieldPreview && (
              <div className="p-4 border rounded-lg bg-muted/20 space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                    3
                  </div>
                  <h3 className="font-semibold">Confirm & Apply</h3>
                </div>
                
                {/* Idempotency Warnings */}
                {yieldPreview.hasConflicts && (
                  <div className="flex items-start gap-2 p-3 rounded-md bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 text-sm">
                    <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <strong>Some transactions already exist.</strong> {yieldPreview.existingConflicts.length} existing reference(s) will be skipped.
                    </div>
                  </div>
                )}

                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
                    <CardContent className="p-3 text-center">
                      <p className="text-xs text-muted-foreground">Gross Yield</p>
                      <p className="text-lg font-mono font-bold text-green-600">
                        +{formatValue(yieldPreview.grossYield, selectedFund?.asset || "")}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3 text-center">
                      <p className="text-xs text-muted-foreground">Total Fees</p>
                      <p className="text-lg font-mono font-semibold">
                        {formatValue(yieldPreview.totalFees, selectedFund?.asset || "")}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3 text-center">
                      <p className="text-xs text-muted-foreground">IB Fees</p>
                      <p className="text-lg font-mono font-semibold text-purple-600">
                        {formatValue(yieldPreview.totalIbFees || 0, selectedFund?.asset || "")}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="border-primary/30 bg-primary/5">
                    <CardContent className="p-3 text-center">
                      <p className="text-xs text-muted-foreground">Net Yield</p>
                      <p className="text-lg font-mono font-bold text-primary">
                        +{formatValue(yieldPreview.netYield, selectedFund?.asset || "")}
                      </p>
                    </CardContent>
                  </Card>
                </div>
                
                {/* INDIGO FEES Credit Card */}
                {yieldPreview.indigoFeesCredit > 0 && (
                  <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-medium">INDIGO FEES Credit</span>
                        </div>
                        <span className="font-mono font-bold text-blue-600">
                          +{formatValue(yieldPreview.indigoFeesCredit, selectedFund?.asset || "")} {selectedFund?.asset}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Platform fees collected after IB commissions
                      </p>
                    </CardContent>
                  </Card>
                )}
                
                {/* IB Credits Summary */}
                {yieldPreview.ibCredits && yieldPreview.ibCredits.length > 0 && (
                  <Card className="border-purple-200 bg-purple-50 dark:bg-purple-950/20">
                    <CardHeader className="pb-2 pt-3 px-3">
                      <div className="flex items-center gap-2">
                        <UserCheck className="h-4 w-4 text-purple-600" />
                        <span className="text-sm font-medium">IB Credits ({yieldPreview.ibCredits.length})</span>
                      </div>
                    </CardHeader>
                    <CardContent className="px-3 pb-3">
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {yieldPreview.ibCredits.map((ib, idx) => (
                          <div key={idx} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <ArrowRightLeft className="h-3 w-3 text-muted-foreground" />
                              <span className="truncate max-w-[150px]">{ib.ibInvestorName}</span>
                              <span className="text-xs text-muted-foreground">({ib.ibPercentage}%)</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-purple-600">
                                +{formatValue(ib.amount, selectedFund?.asset || "")}
                              </span>
                              {ib.wouldSkip && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <Badge variant="outline" className="text-xs">Skip</Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>Already exists</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Filter Controls */}
                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <Input
                    placeholder="Search investor..."
                    value={searchInvestor}
                    onChange={(e) => setSearchInvestor(e.target.value)}
                    className="w-48"
                  />
                  <div className="flex items-center gap-2">
                    <Switch
                      id="show-system"
                      checked={showSystemAccounts}
                      onCheckedChange={setShowSystemAccounts}
                    />
                    <Label htmlFor="show-system" className="text-sm">Show system accounts</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="show-changed"
                      checked={showOnlyChanged}
                      onCheckedChange={setShowOnlyChanged}
                    />
                    <Label htmlFor="show-changed" className="text-sm">Only new entries</Label>
                  </div>
                </div>

                {/* Investor Breakdown */}
                <div className="rounded-md border max-h-72 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Investor</TableHead>
                        <TableHead className="text-right">Current</TableHead>
                        <TableHead className="text-right">Gross</TableHead>
                        <TableHead className="text-right">Fee %</TableHead>
                        <TableHead className="text-right">Fee</TableHead>
                        <TableHead className="text-right">Net</TableHead>
                        <TableHead className="text-right">IB</TableHead>
                        <TableHead className="text-right">Delta</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getFilteredDistributions(yieldPreview.distributions).map((inv) => (
                        <TableRow 
                          key={inv.investorId}
                          className={cn(
                            inv.wouldSkip && "opacity-50",
                            isSystemAccount(inv) && "bg-blue-50/50 dark:bg-blue-950/20"
                          )}
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {isSystemAccount(inv) && (
                                <Building2 className="h-3 w-3 text-blue-600" />
                              )}
                              <div>
                                <p className="font-medium text-sm truncate max-w-[120px]">{inv.investorName}</p>
                                {inv.ibParentName && (
                                  <p className="text-xs text-purple-600">IB: {inv.ibParentName}</p>
                                )}
                              </div>
                              {inv.wouldSkip && (
                                <Badge variant="outline" className="text-xs">Skip</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs">
                            {formatValue(inv.currentBalance, selectedFund?.asset || "")}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs text-green-600">
                            +{formatValue(inv.grossYield, selectedFund?.asset || "")}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs">
                            {inv.feePercentage}%
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs text-muted-foreground">
                            {inv.feeAmount > 0 ? `-${formatValue(inv.feeAmount, selectedFund?.asset || "")}` : "—"}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-semibold">
                            +{formatValue(inv.netYield, selectedFund?.asset || "")}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs text-purple-600">
                            {inv.ibAmount > 0 ? `-${formatValue(inv.ibAmount, selectedFund?.asset || "")}` : "—"}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-bold text-primary">
                            +{formatValue(inv.positionDelta, selectedFund?.asset || "")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                
                <p className="text-xs text-muted-foreground text-center">
                  Showing {getFilteredDistributions(yieldPreview.distributions).length} of {yieldPreview.distributions.length} investors
                </p>

                {/* Apply Button - Opens Confirmation */}
                <Button
                  onClick={handleConfirmApply}
                  disabled={applyLoading}
                  className="w-full"
                  size="lg"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Apply Yield to {yieldPreview.investorCount} Investors
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog - Typed Confirmation */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Confirm Yield Distribution
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>You are about to distribute yield with the following details:</p>
                
                <div className="p-3 rounded-md bg-muted space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fund:</span>
                    <span className="font-medium">{selectedFund?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Purpose:</span>
                    <Badge 
                      variant="outline"
                      className={yieldPurpose === "reporting" 
                        ? "border-green-500 text-green-700" 
                        : "border-orange-500 text-orange-700"
                      }
                    >
                      {yieldPurpose === "reporting" ? "Reporting" : "Transaction"}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Effective Date:</span>
                    <span className="font-medium">{format(aumDate, "PPP")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Gross Yield:</span>
                    <span className="font-mono font-medium text-green-600">
                      +{formatValue(yieldPreview?.grossYield || 0, selectedFund?.asset || "")} {selectedFund?.asset}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Fees:</span>
                    <span className="font-mono">{formatValue(yieldPreview?.totalFees || 0, selectedFund?.asset || "")} {selectedFund?.asset}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">IB Fees:</span>
                    <span className="font-mono text-purple-600">{formatValue(yieldPreview?.totalIbFees || 0, selectedFund?.asset || "")} {selectedFund?.asset}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">INDIGO FEES Credit:</span>
                    <span className="font-mono text-blue-600">{formatValue(yieldPreview?.indigoFeesCredit || 0, selectedFund?.asset || "")} {selectedFund?.asset}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Investors:</span>
                    <span className="font-medium">{yieldPreview?.investorCount}</span>
                  </div>
                </div>

                {yieldPurpose === "reporting" && (
                  <div className="flex items-start gap-2 p-3 rounded-md bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 text-sm">
                    <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>
                      <strong>This yield will be visible to investors</strong> on their statements and dashboards.
                    </span>
                  </div>
                )}

                {/* AUM Discrepancy Acknowledgment */}
                {reconciliation?.has_warning && (
                  <div className="space-y-2 p-3 rounded-md border border-destructive/50 bg-destructive/10">
                    <Label className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox 
                        checked={acknowledgeDiscrepancy} 
                        onCheckedChange={(checked) => setAcknowledgeDiscrepancy(checked === true)} 
                      />
                      <span className="text-destructive">
                        I acknowledge the {reconciliation.discrepancy_pct.toFixed(2)}% AUM discrepancy and want to proceed
                      </span>
                    </Label>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="confirm-text">
                    Type <span className="font-mono font-bold">APPLY</span> to confirm:
                  </Label>
                  <Input
                    id="confirm-text"
                    value={confirmationText}
                    onChange={(e) => setConfirmationText(e.target.value.toUpperCase())}
                    placeholder="APPLY"
                    className="font-mono"
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              onClick={handleApplyYield}
              disabled={
                confirmationText !== "APPLY" || 
                applyLoading || 
                (reconciliation?.has_warning && !acknowledgeDiscrepancy)
              }
            >
              {applyLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Confirm & Apply
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reopen Month Confirmation Dialog */}
      <AlertDialog open={showReopenConfirm} onOpenChange={setShowReopenConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <LockOpen className="h-5 w-5" />
              Reopen Closed Month
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4 pt-2">
                <div className="flex items-start gap-2 p-3 rounded-md bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 text-sm">
                  <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>Warning:</strong> Reopening this month will allow new yield distributions and edits. 
                    This action is logged and should only be done for corrections.
                  </span>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reopen-reason">Reason for reopening:</Label>
                  <Input
                    id="reopen-reason"
                    value={reopenReason}
                    onChange={(e) => setReopenReason(e.target.value)}
                    placeholder="e.g., Correcting yield calculation error"
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              onClick={handleReopenMonth}
              disabled={reopenMonthLoading}
              variant="destructive"
            >
              {reopenMonthLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <LockOpen className="h-4 w-4 mr-2" />
              )}
              Reopen Month
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function YieldOperationsPage() {
  return (
    <AdminGuard>
      <YieldOperationsContent />
    </AdminGuard>
  );
}
