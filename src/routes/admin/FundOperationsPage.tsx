/**
 * Fund Operations Center
 * Admin dashboard for daily AUM entry, yield distribution, and position adjustments
 *
 * All values are in NATIVE TOKENS (BTC, ETH, USDT, etc.) - never fiat
 */

import { useEffect, useState } from "react";
import {
  Loader2,
  TrendingUp,
  Users,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Calculator,
  History,
  ArrowRightLeft,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/context";
import { getAllFunds, type Fund } from "@/services/fundService";
import {
  previewYieldDistribution,
  applyYieldDistribution,
  getCurrentFundAUM,
  getFundAUMHistory,
  type YieldCalculationResult,
  type FundDailyAUM,
} from "@/services/yieldDistributionService";
import {
  getPositionForAdjustment,
  adjustPosition,
  getFundAdjustmentHistory,
} from "@/services/positionAdjustmentService";
import { toast } from "sonner";

// ============================================================================
// Fund Operations Page Content
// ============================================================================

function FundOperationsContent() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [funds, setFunds] = useState<Fund[]>([]);
  const [selectedFundId, setSelectedFundId] = useState<string>("");
  const [targetDate, setTargetDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );

  // Fund state
  const [currentAUM, setCurrentAUM] = useState<number>(0);
  const [investorCount, setInvestorCount] = useState<number>(0);
  const [newAUM, setNewAUM] = useState<string>("");
  const [aumHistory, setAumHistory] = useState<FundDailyAUM[]>([]);

  // Yield preview
  const [yieldPreview, setYieldPreview] = useState<YieldCalculationResult | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Position adjustment
  const [showAdjustmentDialog, setShowAdjustmentDialog] = useState(false);
  const [adjustmentLoading, setAdjustmentLoading] = useState(false);
  const [adjustmentHistory, setAdjustmentHistory] = useState<any[]>([]);
  const [selectedInvestorId, setSelectedInvestorId] = useState<string>("");
  const [investors, setInvestors] = useState<{ id: string; name: string }[]>([]);
  const [adjustmentForm, setAdjustmentForm] = useState({
    newBalance: "",
    adjustmentType: "increase" as "increase" | "decrease",
    reason: "",
  });
  const [positionDetails, setPositionDetails] = useState<{
    currentBalance: number;
    fundAsset: string;
    investorName: string;
  } | null>(null);

  // ============================================================================
  // Load Data
  // ============================================================================

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedFundId) {
      loadFundData();
    }
  }, [selectedFundId]);

  const loadInitialData = async () => {
    try {
      const fundsData = await getAllFunds();
      setFunds(fundsData);
      if (fundsData.length > 0) {
        setSelectedFundId(fundsData[0].id);
      }
    } catch (error) {
      console.error("Error loading funds:", error);
      toast.error("Failed to load funds");
    } finally {
      setLoading(false);
    }
  };

  const loadFundData = async () => {
    if (!selectedFundId) return;

    try {
      // Load current AUM
      const aumData = await getCurrentFundAUM(selectedFundId);
      setCurrentAUM(aumData.totalAUM);
      setInvestorCount(aumData.investorCount);

      // Load AUM history
      const history = await getFundAUMHistory(selectedFundId);
      setAumHistory(history);

      // Load investors with positions in this fund
      const { data: positions } = await supabase
        .from("investor_positions")
        .select(
          `
          investor_id,
          profiles:investor_id (
            id,
            first_name,
            last_name
          )
        `
        )
        .eq("fund_id", selectedFundId)
        .gt("current_value", 0);

      const investorList =
        positions?.map((p) => {
          const profile = p.profiles as { id: string; first_name: string; last_name: string };
          return {
            id: profile.id,
            name: `${profile.first_name || ""} ${profile.last_name || ""}`.trim(),
          };
        }) || [];
      setInvestors(investorList);

      // Load adjustment history
      const adjustments = await getFundAdjustmentHistory(selectedFundId);
      setAdjustmentHistory(adjustments);

      // Reset preview
      setYieldPreview(null);
      setNewAUM("");
    } catch (error) {
      console.error("Error loading fund data:", error);
      toast.error("Failed to load fund data");
    }
  };

  // ============================================================================
  // Yield Distribution Handlers
  // ============================================================================

  const handlePreviewYield = async () => {
    if (!selectedFundId || !newAUM) {
      toast.error("Please enter new AUM value");
      return;
    }

    const newAUMValue = parseFloat(newAUM);
    if (isNaN(newAUMValue) || newAUMValue <= 0) {
      toast.error("Please enter a valid AUM value");
      return;
    }

    if (newAUMValue <= currentAUM) {
      toast.error("New AUM must be greater than current AUM for positive yield");
      return;
    }

    setPreviewLoading(true);
    try {
      const preview = await previewYieldDistribution({
        fundId: selectedFundId,
        targetDate: new Date(targetDate),
        newTotalAUM: newAUMValue,
      });

      if (!preview.success) {
        toast.error(preview.error || "Failed to preview yield distribution");
        return;
      }

      setYieldPreview(preview);
    } catch (error) {
      console.error("Error previewing yield:", error);
      toast.error("Failed to preview yield distribution");
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleApplyYield = async () => {
    if (!selectedFundId || !yieldPreview || !user?.id) {
      return;
    }

    setApplyLoading(true);
    try {
      const result = await applyYieldDistribution(
        {
          fundId: selectedFundId,
          targetDate: new Date(targetDate),
          newTotalAUM: parseFloat(newAUM),
        },
        user.id
      );

      if (!result.success) {
        toast.error(result.error || "Failed to apply yield distribution");
        return;
      }

      toast.success(
        `Yield distributed: ${result.netYield.toFixed(8)} ${selectedFundAsset} to ${result.investorCount} investors`
      );

      // Refresh data
      setShowConfirmDialog(false);
      setYieldPreview(null);
      setNewAUM("");
      await loadFundData();
    } catch (error) {
      console.error("Error applying yield:", error);
      toast.error("Failed to apply yield distribution");
    } finally {
      setApplyLoading(false);
    }
  };

  // ============================================================================
  // Position Adjustment Handlers
  // ============================================================================

  const handleOpenAdjustmentDialog = async (investorId?: string) => {
    if (investorId) {
      setSelectedInvestorId(investorId);
      await loadPositionDetails(investorId);
    }
    setShowAdjustmentDialog(true);
  };

  const loadPositionDetails = async (investorId: string) => {
    if (!selectedFundId) return;

    try {
      const details = await getPositionForAdjustment(investorId, selectedFundId);
      if (details) {
        setPositionDetails({
          currentBalance: Number(details.current_value || 0),
          fundAsset: selectedFundAsset,
          investorName:
            investors.find((i) => i.id === investorId)?.name ||
            `${details.fund_class || ""} investor`,
        });
        setAdjustmentForm((prev) => ({
          ...prev,
          newBalance: Number(details.current_value || 0).toString(),
        }));
      }
    } catch (error) {
      console.error("Error loading position details:", error);
    }
  };

  const handleInvestorChange = async (investorId: string) => {
    setSelectedInvestorId(investorId);
    await loadPositionDetails(investorId);
  };

  const handleApplyAdjustment = async () => {
    if (!selectedInvestorId || !selectedFundId || !user?.id || !adjustmentForm.reason) {
      toast.error("Please fill in all required fields");
      return;
    }

    const newBalanceValue = parseFloat(adjustmentForm.newBalance);
    if (isNaN(newBalanceValue) || newBalanceValue < 0) {
      toast.error("Please enter a valid balance");
      return;
    }

    setAdjustmentLoading(true);
    try {
      const delta =
        newBalanceValue - (positionDetails ? positionDetails.currentBalance : 0);
      const result = await adjustPosition(
        {
          investor_id: selectedInvestorId,
          fund_id: selectedFundId,
          delta,
          note: adjustmentForm.reason,
        },
        user.id
      );

      if (!result.success) {
        toast.error(result.error || "Failed to apply adjustment");
        return;
      }

      toast.success(`Position adjusted successfully`);

      // Refresh data
      setShowAdjustmentDialog(false);
      setAdjustmentForm({ newBalance: "", adjustmentType: "increase", reason: "" });
      setSelectedInvestorId("");
      setPositionDetails(null);
      await loadFundData();
    } catch (error) {
      console.error("Error applying adjustment:", error);
      toast.error("Failed to apply adjustment");
    } finally {
      setAdjustmentLoading(false);
    }
  };

  // ============================================================================
  // Computed Values
  // ============================================================================

  const selectedFund = funds.find((f) => f.id === selectedFundId);
  const selectedFundAsset = selectedFund?.asset || "";
  const calculatedYield = newAUM ? parseFloat(newAUM) - currentAUM : 0;
  const yieldPercentage = currentAUM > 0 ? (calculatedYield / currentAUM) * 100 : 0;

  // ============================================================================
  // Render
  // ============================================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-display font-bold tracking-tight">
            Fund Operations Center
          </h1>
          <p className="text-muted-foreground mt-2">
            Daily AUM entry, yield distribution, and position adjustments
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </div>
      </div>

      {/* Fund Selector */}
      <Card className="border-0 shadow-lg bg-card">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <Label htmlFor="fund-select">Select Fund</Label>
                <Select value={selectedFundId} onValueChange={setSelectedFundId}>
                  <SelectTrigger id="fund-select" className="w-64 mt-1">
                    <SelectValue placeholder="Select a fund" />
                  </SelectTrigger>
                  <SelectContent>
                    {funds.map((fund) => (
                      <SelectItem key={fund.id} value={fund.id}>
                        {fund.name} ({fund.asset})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="target-date">Date</Label>
                <Input
                  id="target-date"
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-40 mt-1"
                />
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="yield-entry" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-96">
          <TabsTrigger value="yield-entry" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Yield Entry
          </TabsTrigger>
          <TabsTrigger value="adjustments" className="flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4" />
            Adjustments
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>

        {/* Yield Entry Tab */}
        <TabsContent value="yield-entry" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Current State Card */}
            <Card className="border-0 shadow-lg bg-card">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-primary" />
                  Current State
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">System AUM</p>
                    <p className="text-2xl font-mono font-bold">
                      {currentAUM.toFixed(8)} {selectedFundAsset}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Active Investors</p>
                    <p className="text-2xl font-mono font-bold">{investorCount}</p>
                  </div>
                </div>
                <div className="border-t pt-4">
                  <p className="text-sm text-muted-foreground mb-2">
                    Last AUM Entry:{" "}
                    {aumHistory[0]?.aum_date
                      ? new Date(aumHistory[0].aum_date).toLocaleDateString()
                      : aumHistory[0]?.as_of_date
                        ? new Date(aumHistory[0].as_of_date).toLocaleDateString()
                        : "None"}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Daily Entry Card */}
            <Card className="border-0 shadow-lg bg-card">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  Daily Entry
                </CardTitle>
                <CardDescription>
                  Enter the new total AUM to calculate and distribute yield
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="new-aum">New Total AUM ({selectedFundAsset})</Label>
                  <Input
                    id="new-aum"
                    type="number"
                    step="0.00000001"
                    placeholder={`Enter new AUM in ${selectedFundAsset}`}
                    value={newAUM}
                    onChange={(e) => setNewAUM(e.target.value)}
                    className="mt-1 font-mono"
                  />
                </div>

                {newAUM && parseFloat(newAUM) > currentAUM && (
                  <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                    <p className="text-sm text-muted-foreground">Calculated Yield</p>
                    <p className="text-xl font-mono font-bold text-green-600">
                      +{calculatedYield.toFixed(8)} {selectedFundAsset}
                    </p>
                    <p className="text-sm text-green-600">+{yieldPercentage.toFixed(4)}%</p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={handlePreviewYield}
                    disabled={!newAUM || previewLoading}
                    className="flex-1"
                    variant="outline"
                  >
                    {previewLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Preview Distribution
                  </Button>
                  <Button
                    onClick={() => setShowConfirmDialog(true)}
                    disabled={!yieldPreview}
                    className="flex-1"
                  >
                    Apply Yield
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Distribution Preview Table */}
          {yieldPreview && yieldPreview.success && (
            <Card className="border-0 shadow-lg bg-card">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Distribution Preview
                </CardTitle>
                <CardDescription>
                  {yieldPreview.investorCount} investors will receive yield
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Investor</TableHead>
                        <TableHead className="text-right">Current Balance</TableHead>
                        <TableHead className="text-right">Allocation</TableHead>
                        <TableHead className="text-right">Fee %</TableHead>
                        <TableHead className="text-right">Gross Yield</TableHead>
                        <TableHead className="text-right">Fee</TableHead>
                        <TableHead className="text-right">Net Yield</TableHead>
                        <TableHead className="text-right">New Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {yieldPreview.distributions.map((dist) => (
                        <TableRow key={dist.investorId}>
                          <TableCell className="font-medium">{dist.investorName}</TableCell>
                          <TableCell className="text-right font-mono">
                            {dist.currentBalance.toFixed(8)}
                          </TableCell>
                          <TableCell className="text-right">
                            {dist.allocationPercentage.toFixed(2)}%
                          </TableCell>
                          <TableCell className="text-right">{dist.feePercentage}%</TableCell>
                          <TableCell className="text-right font-mono text-green-600">
                            +{dist.grossYield.toFixed(8)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-orange-600">
                            -{dist.feeAmount.toFixed(8)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-green-600 font-bold">
                            +{dist.netYield.toFixed(8)}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {dist.newBalance.toFixed(8)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Summary */}
                <div className="mt-6 grid grid-cols-4 gap-4 p-4 rounded-lg bg-muted/50">
                  <div>
                    <p className="text-sm text-muted-foreground">Gross Yield</p>
                    <p className="font-mono font-bold text-green-600">
                      +{yieldPreview.grossYield.toFixed(8)} {selectedFundAsset}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Fees</p>
                    <p className="font-mono font-bold text-orange-600">
                      -{yieldPreview.totalFees.toFixed(8)} {selectedFundAsset}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Net to Investors</p>
                    <p className="font-mono font-bold text-green-600">
                      +{yieldPreview.netYield.toFixed(8)} {selectedFundAsset}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Yield %</p>
                    <p className="font-mono font-bold">+{yieldPreview.yieldPercentage.toFixed(4)}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Adjustments Tab */}
        <TabsContent value="adjustments" className="space-y-6">
          <Card className="border-0 shadow-lg bg-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ArrowRightLeft className="h-5 w-5 text-primary" />
                  Position Adjustments
                </CardTitle>
                <CardDescription>
                  Make manual corrections to investor positions with full audit trail
                </CardDescription>
              </div>
              <Button onClick={() => handleOpenAdjustmentDialog()}>
                + New Adjustment
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Investor</TableHead>
                    <TableHead className="text-right">Current Balance</TableHead>
                    <TableHead className="text-center">Fee %</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {investors.map((investor) => (
                    <TableRow key={investor.id}>
                      <TableCell className="font-medium">{investor.name}</TableCell>
                      <TableCell className="text-right font-mono">-</TableCell>
                      <TableCell className="text-center">-</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenAdjustmentDialog(investor.id)}
                        >
                          Adjust
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card className="border-0 shadow-lg bg-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                AUM History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Total AUM</TableHead>
                    <TableHead className="text-right">Δ vs Prev</TableHead>
                    <TableHead className="text-right">NAV/Share</TableHead>
                    <TableHead className="text-right">Source</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {aumHistory.map((entry, idx) => {
                    const prev = aumHistory[idx + 1];
                    const delta =
                      Number(entry.total_aum || 0) -
                      Number(prev?.total_aum || 0);
                    return (
                      <TableRow key={entry.id}>
                        <TableCell>
                          {new Date(entry.aum_date || entry.as_of_date || new Date()).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {Number(entry.total_aum || 0).toFixed(8)}
                        </TableCell>
                        <TableCell
                          className={`text-right font-mono ${
                            delta >= 0 ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {delta >= 0 ? "+" : ""}
                          {delta.toFixed(8)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {entry.nav_per_share !== null && entry.nav_per_share !== undefined
                            ? Number(entry.nav_per_share).toFixed(8)
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right">{entry.source || "manual"}</TableCell>
                      </TableRow>
                    );
                  })}
                  {aumHistory.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No AUM entries yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Confirm Yield Distribution Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Confirm Yield Distribution
            </DialogTitle>
            <DialogDescription>
              This action will permanently update {yieldPreview?.investorCount} investor positions
              and create transaction records.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-muted/50">
              <div>
                <p className="text-sm text-muted-foreground">Net Yield</p>
                <p className="font-mono font-bold text-green-600">
                  +{yieldPreview?.netYield.toFixed(8)} {selectedFundAsset}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Platform Fees</p>
                <p className="font-mono font-bold text-orange-600">
                  {yieldPreview?.totalFees.toFixed(8)} {selectedFundAsset}
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleApplyYield} disabled={applyLoading}>
              {applyLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Apply Distribution
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Position Adjustment Dialog */}
      <Dialog open={showAdjustmentDialog} onOpenChange={setShowAdjustmentDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Position Adjustment</DialogTitle>
            <DialogDescription>
              Make a manual correction to an investor&apos;s position
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="investor-select">Investor</Label>
              <Select value={selectedInvestorId} onValueChange={handleInvestorChange}>
                <SelectTrigger id="investor-select" className="mt-1">
                  <SelectValue placeholder="Select investor" />
                </SelectTrigger>
                <SelectContent>
                  {investors.map((inv) => (
                    <SelectItem key={inv.id} value={inv.id}>
                      {inv.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {positionDetails && (
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Current Balance</p>
                <p className="font-mono font-bold">
                  {positionDetails.currentBalance.toFixed(8)} {positionDetails.fundAsset}
                </p>
              </div>
            )}

            <div>
              <Label htmlFor="adjustment-type">Adjustment Type</Label>
              <Select
                value={adjustmentForm.adjustmentType}
                onValueChange={(v) =>
                  setAdjustmentForm((prev) => ({ ...prev, adjustmentType: v as "increase" | "decrease" }))
                }
              >
                <SelectTrigger id="adjustment-type" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="increase">Increase</SelectItem>
                  <SelectItem value="decrease">Decrease</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="new-balance">New Balance ({selectedFundAsset})</Label>
              <Input
                id="new-balance"
                type="number"
                step="0.00000001"
                value={adjustmentForm.newBalance}
                onChange={(e) =>
                  setAdjustmentForm((prev) => ({ ...prev, newBalance: e.target.value }))
                }
                className="mt-1 font-mono"
              />
              {positionDetails && adjustmentForm.newBalance && (
                <p className="text-sm mt-1 text-muted-foreground">
                  Adjustment:{" "}
                  <span
                    className={
                      parseFloat(adjustmentForm.newBalance) - positionDetails.currentBalance >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }
                  >
                    {parseFloat(adjustmentForm.newBalance) - positionDetails.currentBalance >= 0
                      ? "+"
                      : ""}
                    {(
                      parseFloat(adjustmentForm.newBalance) - positionDetails.currentBalance
                    ).toFixed(8)}{" "}
                    {selectedFundAsset}
                  </span>
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="reason">Reason (required)</Label>
              <Textarea
                id="reason"
                placeholder="Explain the reason for this adjustment..."
                value={adjustmentForm.reason}
                onChange={(e) =>
                  setAdjustmentForm((prev) => ({ ...prev, reason: e.target.value }))
                }
                className="mt-1"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdjustmentDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleApplyAdjustment}
              disabled={adjustmentLoading || !adjustmentForm.reason || !selectedInvestorId}
            >
              {adjustmentLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Apply Adjustment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================================
// Export
// ============================================================================

export default function FundOperationsPage() {
  return (
    <AdminGuard>
      <FundOperationsContent />
    </AdminGuard>
  );
}
// @ts-nocheck
