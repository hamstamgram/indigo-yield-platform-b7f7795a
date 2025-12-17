import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  getAllFundsWithAUM,
  updateInvestorAUMPercentages,
  processDailyAUMWithYield,
  previewDailyYieldCalculation,
  previewInvestorYieldDistribution,
  type YieldCalculationResult,
  type InvestorYieldPreview,
} from "@/services/aumService";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, TrendingUp, Users, RefreshCw, AlertTriangle } from "lucide-react";
import { formatAssetValue } from "@/utils/kpiCalculations";
import { getAssetLogo } from "@/utils/assets";

interface FundWithAUM {
  id: string;
  code: string;
  name: string;
  asset: string;
  fund_class: string;
  latest_aum: number;
  latest_aum_date?: string;
  investor_count: number;
}

export default function FundAUMManager() {
  const [funds, setFunds] = useState<FundWithAUM[]>([]);
  const [selectedFund, setSelectedFund] = useState<string>("");
  const [aumAmount, setAumAmount] = useState<string>("");
  const [aumDate, setAumDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdatingPercentages, setIsUpdatingPercentages] = useState(false);
  const [yieldPreview, setYieldPreview] = useState<YieldCalculationResult | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [investorPreview, setInvestorPreview] = useState<InvestorYieldPreview[]>([]);
  const [investorTotals, setInvestorTotals] = useState<{ gross: number; fees: number; net: number } | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const { toast } = useToast();

  const fetchFunds = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getAllFundsWithAUM();
      setFunds(data as FundWithAUM[]);
      if (data.length > 0 && !selectedFund) {
        setSelectedFund(data[0].id);
      }
    } catch (error) {
      console.error("Error fetching funds:", error);
      toast({
        title: "Error",
        description: "Failed to fetch funds data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [selectedFund, toast]);

  useEffect(() => {
    fetchFunds();
  }, [fetchFunds]);

  const handlePreviewYield = useCallback(async () => {
    if (!selectedFund || !aumAmount) return;

    try {
      setIsLoadingPreview(true);
      const result = await previewDailyYieldCalculation(
        selectedFund,
        parseFloat(aumAmount),
        aumDate
      );

      if (result.success && result.preview) {
        setYieldPreview(result.preview);
        
        // If there's positive yield, fetch investor breakdown
        if (result.preview.calculated_yield > 0) {
          const investorResult = await previewInvestorYieldDistribution(
            selectedFund,
            result.preview.calculated_yield
          );
          if (investorResult.success) {
            setInvestorPreview(investorResult.investors || []);
            setInvestorTotals(investorResult.totals || null);
          }
        } else {
          setInvestorPreview([]);
          setInvestorTotals(null);
        }
      } else {
        setYieldPreview(null);
        setInvestorPreview([]);
        setInvestorTotals(null);
        if (result.error) {
          console.error("Preview error:", result.error);
        }
      }
    } catch (error) {
      console.error("Error previewing yield:", error);
      setYieldPreview(null);
      setInvestorPreview([]);
      setInvestorTotals(null);
    } finally {
      setIsLoadingPreview(false);
    }
  }, [selectedFund, aumAmount, aumDate]);

  // Auto-preview when AUM amount or fund changes
  useEffect(() => {
    if (selectedFund && aumAmount && parseFloat(aumAmount) > 0) {
      const timeoutId = setTimeout(handlePreviewYield, 500); // Debounce
      return () => clearTimeout(timeoutId);
    } else {
      setYieldPreview(null);
      setInvestorPreview([]);
      setInvestorTotals(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFund, aumAmount, aumDate, handlePreviewYield]);

  const handleApplyConfirmed = async () => {
    setShowConfirmDialog(false);
    
    if (!selectedFund || !aumAmount) {
      toast({
        title: "Validation Error",
        description: "Please select a fund and enter an AUM amount",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);

      // Use enhanced processing with automatic yield calculation
      const result = await processDailyAUMWithYield(selectedFund, parseFloat(aumAmount), aumDate);

      if (!result.success) {
        throw new Error(result.error || "Failed to process daily AUM");
      }

      // Build success message with yield information
      let successMessage = `Successfully processed daily AUM for ${aumDate}`;

      if (result.yieldDistribution && result.yieldCalculation) {
        const yieldAmount = result.yieldCalculation.calculated_yield || 0;
        const yieldPercent = result.yieldCalculation.yield_percentage || 0;
        const investorsAffected = result.yieldDistribution.investors_affected;

        successMessage += `\n🚀 Yield Generated: ${yieldAmount.toFixed(6)} (${yieldPercent.toFixed(4)}%)`;
        successMessage += `\n👥 Successfully distributed to ${investorsAffected} investors`;
      } else if (result.yieldCalculation && (result.yieldCalculation.calculated_yield || 0) <= 0) {
        successMessage += `\n📊 No yield generated today (zero or negative yield)`;
      } else {
        successMessage += `\n📊 AUM updated successfully`;
      }

      toast({
        title: "✅ AUM & Yield Processed",
        description: successMessage,
        duration: 8000,
      });

      // Refresh funds data and reset form
      await fetchFunds();
      setAumAmount("");
      setYieldPreview(null);
      setInvestorPreview([]);
      setInvestorTotals(null);
    } catch (error) {
      console.error("Error processing daily AUM:", error);

      toast({
        title: "❌ Operation Failed",
        description:
          error instanceof Error ? error.message : "Failed to process daily AUM with yield",
        variant: "destructive",
        duration: 7000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetAUM = async () => {
    // If there's yield to distribute, show confirmation dialog
    if (yieldPreview && yieldPreview.calculated_yield > 0 && investorPreview.length > 0) {
      setShowConfirmDialog(true);
      return;
    }
    
    // Otherwise, apply directly
    await handleApplyConfirmed();
  };

  const handleRecalculatePercentages = async () => {
    if (!selectedFund) {
      toast({
        title: "Validation Error",
        description: "Please select a fund",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsUpdatingPercentages(true);

      const result = await updateInvestorAUMPercentages(selectedFund);

      if (!result.success) {
        throw new Error(result.error || "Failed to update percentages");
      }

      toast({
        title: "✅ Percentages Updated",
        description: "Successfully recalculated investor AUM percentages",
        duration: 5000,
      });
    } catch (error) {
      console.error("Error updating percentages:", error);

      toast({
        title: "❌ Operation Failed",
        description: error instanceof Error ? error.message : "Failed to update AUM percentages",
        variant: "destructive",
        duration: 7000,
      });
    } finally {
      setIsUpdatingPercentages(false);
    }
  };

  const selectedFundData = funds.find((f) => f.id === selectedFund);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
          Fund AUM Management
        </h2>
        <p className="text-muted-foreground">
          Set daily AUM values and manage investor allocations for each fund
        </p>
      </div>

      {/* Fund Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {funds.map((fund) => (
          <Card
            key={fund.id}
            className={`cursor-pointer transition-colors ${
              selectedFund === fund.id ? "ring-2 ring-primary" : ""
            }`}
            onClick={() => setSelectedFund(fund.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-muted border flex items-center justify-center">
                    <img
                      src={getAssetLogo(fund.asset)}
                      alt={fund.asset}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback if image fails
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                  <Badge variant="outline">{fund.code}</Badge>
                </div>
                <Badge>{fund.asset}</Badge>
              </div>
              <h3 className="font-semibold text-sm mb-3">{fund.name}</h3>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    Current AUM
                  </span>
                  <span className="font-medium">
                    {formatAssetValue(fund.latest_aum, fund.asset)} {fund.asset}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    Investors
                  </span>
                  <span className="font-medium">{fund.investor_count}</span>
                </div>

                {fund.latest_aum_date && (
                  <div className="text-xs text-muted-foreground">
                    Last updated: {fund.latest_aum_date}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* AUM Management Panel */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Set Daily AUM
              </CardTitle>
              <CardDescription>Update the daily AUM value for the selected fund</CardDescription>
            </div>

            {selectedFundData && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRecalculatePercentages}
                disabled={isUpdatingPercentages}
              >
                {isUpdatingPercentages && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <RefreshCw className="h-4 w-4 mr-2" />
                Recalculate %
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fund-select">Select Fund</Label>
              <Select value={selectedFund} onValueChange={setSelectedFund}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a fund..." />
                </SelectTrigger>
                <SelectContent>
                  {funds.map((fund) => (
                    <SelectItem key={fund.id} value={fund.id}>
                      {fund.code} - {fund.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="aum-date">AUM Date</Label>
              <Input
                id="aum-date"
                type="date"
                value={aumDate}
                onChange={(e) => setAumDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="aum-amount">
                AUM Amount {selectedFundData ? `(${selectedFundData.asset})` : ""}
              </Label>
              <Input
                id="aum-amount"
                type="number"
                step="0.01"
                placeholder="Enter AUM amount..."
                value={aumAmount}
                onChange={(e) => setAumAmount(e.target.value)}
              />
            </div>
          </div>

          {selectedFundData && (
            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="font-semibold mb-3">Selected Fund Overview</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Fund:</span>
                  <span className="ml-2 font-medium">
                    {selectedFundData.code} - {selectedFundData.name}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Asset:</span>
                  <span className="ml-2 font-medium">{selectedFundData.asset}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Current AUM:</span>
                  <span className="ml-2 font-medium">
                    {formatAssetValue(selectedFundData.latest_aum, selectedFundData.asset)}{" "}
                    {selectedFundData.asset}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Investors:</span>
                  <span className="ml-2 font-medium">{selectedFundData.investor_count}</span>
                </div>
              </div>
            </div>
          )}

          {/* Yield Calculation Preview */}
          {yieldPreview && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Yield Calculation Preview
                {isLoadingPreview && <Loader2 className="h-4 w-4 animate-spin" />}
              </h4>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-blue-700 dark:text-blue-300 block">Previous AUM</span>
                  <span className="font-mono font-medium">
                    {formatAssetValue(yieldPreview.previous_aum, selectedFundData?.asset || "")}{" "}
                    {selectedFundData?.asset}
                  </span>
                </div>

                <div>
                  <span className="text-blue-700 dark:text-blue-300 block">Deposits Today</span>
                  <span className="font-mono font-medium text-green-600">
                    +{formatAssetValue(yieldPreview.deposits, selectedFundData?.asset || "")}{" "}
                    {selectedFundData?.asset}
                  </span>
                </div>

                <div>
                  <span className="text-blue-700 dark:text-blue-300 block">Withdrawals Today</span>
                  <span className="font-mono font-medium text-red-600">
                    -{formatAssetValue(yieldPreview.withdrawals, selectedFundData?.asset || "")}{" "}
                    {selectedFundData?.asset}
                  </span>
                </div>

                <div>
                  <span className="text-blue-700 dark:text-blue-300 block">New AUM</span>
                  <span className="font-mono font-medium">
                    {formatAssetValue(yieldPreview.current_aum, selectedFundData?.asset || "")}{" "}
                    {selectedFundData?.asset}
                  </span>
                </div>
              </div>

              <div className="mt-4 p-3 bg-white/60 dark:bg-gray-900/60 rounded-md border">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-blue-700 dark:text-blue-300 text-sm">
                      Calculated Yield
                    </span>
                    <div
                      className={`font-mono text-lg font-bold ${
                        yieldPreview.calculated_yield >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {yieldPreview.calculated_yield >= 0 ? "+" : ""}
                      {formatAssetValue(
                        yieldPreview.calculated_yield,
                        selectedFundData?.asset || ""
                      )}{" "}
                      {selectedFundData?.asset}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-blue-700 dark:text-blue-300 text-sm">
                      Yield Percentage
                    </span>
                    <div
                      className={`font-mono text-lg font-bold ${
                        yieldPreview.yield_percentage >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {yieldPreview.yield_percentage >= 0 ? "+" : ""}
                      {yieldPreview.yield_percentage.toFixed(4)}%
                    </div>
                  </div>
                </div>

                {yieldPreview.calculated_yield > 0 && (
                  <div className="mt-2 text-sm text-blue-600 dark:text-blue-400">
                    ✨ This yield will be automatically distributed to all investors based on their
                    AUM percentage
                  </div>
                )}

                {yieldPreview.calculated_yield <= 0 && (
                  <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    📊 No yield will be distributed (zero or negative yield)
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Investor Yield Distribution Preview */}
          {investorPreview.length > 0 && yieldPreview && yieldPreview.calculated_yield > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted/50 px-4 py-3 border-b">
                <h4 className="font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Investor Yield Distribution Preview
                  <Badge variant="secondary">{investorPreview.length} investors</Badge>
                </h4>
              </div>
              <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-background">
                    <TableRow>
                      <TableHead>Investor</TableHead>
                      <TableHead className="text-right">Current Balance</TableHead>
                      <TableHead className="text-right">Ownership %</TableHead>
                      <TableHead className="text-right">Gross Yield</TableHead>
                      <TableHead className="text-right">Fee Rate</TableHead>
                      <TableHead className="text-right">Net Yield</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {investorPreview.map((inv) => (
                      <TableRow key={inv.investor_id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{inv.investor_name}</div>
                            <div className="text-xs text-muted-foreground">{inv.email}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatAssetValue(inv.current_balance, selectedFundData?.asset || "")}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {inv.ownership_pct.toFixed(2)}%
                        </TableCell>
                        <TableCell className="text-right font-mono text-green-600">
                          +{formatAssetValue(inv.gross_yield, selectedFundData?.asset || "")}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {inv.fee_rate.toFixed(2)}%
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold text-green-600">
                          +{formatAssetValue(inv.net_yield, selectedFundData?.asset || "")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {/* Totals row */}
              {investorTotals && (
                <div className="bg-muted/30 px-4 py-3 border-t">
                  <div className="flex justify-end gap-8 text-sm">
                    <div>
                      <span className="text-muted-foreground">Total Gross:</span>
                      <span className="ml-2 font-mono font-semibold text-green-600">
                        +{formatAssetValue(investorTotals.gross, selectedFundData?.asset || "")}{" "}
                        {selectedFundData?.asset}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total Fees:</span>
                      <span className="ml-2 font-mono font-semibold text-orange-600">
                        -{formatAssetValue(investorTotals.fees, selectedFundData?.asset || "")}{" "}
                        {selectedFundData?.asset}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total Net:</span>
                      <span className="ml-2 font-mono font-semibold text-green-600">
                        +{formatAssetValue(investorTotals.net, selectedFundData?.asset || "")}{" "}
                        {selectedFundData?.asset}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <Separator />

          <div className="flex justify-end">
            <Button
              onClick={handleSetAUM}
              disabled={isLoading || !selectedFund || !aumAmount}
              className="min-w-[200px]"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {yieldPreview && yieldPreview.calculated_yield > 0
                ? "Review & Apply Yield"
                : "Set Daily AUM"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Confirm Yield Distribution
            </DialogTitle>
            <DialogDescription>
              Please review the yield distribution details before applying. This action will update
              all investor balances.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Summary */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fund:</span>
                <span className="font-medium">{selectedFundData?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date:</span>
                <span className="font-medium">{aumDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">New AUM:</span>
                <span className="font-mono font-medium">
                  {formatAssetValue(parseFloat(aumAmount) || 0, selectedFundData?.asset || "")}{" "}
                  {selectedFundData?.asset}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Yield:</span>
                <span className="font-mono font-semibold text-green-600">
                  +{formatAssetValue(yieldPreview?.calculated_yield || 0, selectedFundData?.asset || "")}{" "}
                  {selectedFundData?.asset}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Investors Affected:</span>
                <span className="font-medium">{investorPreview.length}</span>
              </div>
            </div>

            {/* Investor breakdown in dialog */}
            {investorPreview.length > 0 && (
              <div className="border rounded-lg overflow-hidden max-h-[250px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-background">
                    <TableRow>
                      <TableHead>Investor</TableHead>
                      <TableHead className="text-right">Net Yield</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {investorPreview.map((inv) => (
                      <TableRow key={inv.investor_id}>
                        <TableCell>
                          <div className="font-medium text-sm">{inv.investor_name}</div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-green-600">
                          +{formatAssetValue(inv.net_yield, selectedFundData?.asset || "")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleApplyConfirmed} disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm & Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
