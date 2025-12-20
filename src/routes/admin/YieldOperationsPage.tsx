/**
 * Yield Operations Page
 * Consolidated fund management and yield distribution
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  TrendingUp,
  Users,
  Plus,
  Loader2,
  CheckCircle,
  ArrowRight,
  Coins,
} from "lucide-react";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { CryptoIcon } from "@/components/CryptoIcons";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth/context";
import {
  previewYieldDistribution,
  applyYieldDistribution,
  YieldCalculationResult,
} from "@/services/yieldDistributionService";
import { cn } from "@/lib/utils";

interface Fund {
  id: string;
  code: string;
  name: string;
  asset: string;
  total_aum: number;
  investor_count: number;
}

function YieldOperationsContent() {
  const [funds, setFunds] = useState<Fund[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFund, setSelectedFund] = useState<Fund | null>(null);
  const [showYieldDialog, setShowYieldDialog] = useState(false);
  const [newAUM, setNewAUM] = useState("");
  const [yieldPreview, setYieldPreview] = useState<YieldCalculationResult | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);

  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    loadFunds();
  }, []);

  const loadFunds = async () => {
    setLoading(true);
    try {
      const { data: fundsData, error } = await supabase
        .from("funds")
        .select("id, code, name, asset")
        .eq("status", "active")
        .order("code");

      if (error) throw error;

      // Get AUM and investor count for each fund
      const fundsWithAUM = await Promise.all(
        (fundsData || []).map(async (fund) => {
          const { data: positions } = await supabase
            .from("investor_positions")
            .select("current_value, investor_id")
            .eq("fund_id", fund.id);

          const total_aum = positions?.reduce((sum, p) => sum + (p.current_value || 0), 0) || 0;
          const uniqueInvestors = new Set(positions?.map((p) => p.investor_id) || []);

          return {
            ...fund,
            total_aum,
            investor_count: uniqueInvestors.size,
          };
        })
      );

      fundsWithAUM.sort((a, b) => b.total_aum - a.total_aum);
      setFunds(fundsWithAUM);
    } catch (error) {
      console.error("Error loading funds:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatValue = (value: number, asset: string) => {
    if (asset === "BTC") {
      return value.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
    } else if (asset === "ETH" || asset === "SOL") {
      return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
    }
    return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const openYieldDialog = (fund: Fund) => {
    setSelectedFund(fund);
    setNewAUM("");
    setYieldPreview(null);
    setShowYieldDialog(true);
  };

  const handlePreviewYield = async () => {
    if (!selectedFund || !newAUM) return;

    const newAUMValue = parseFloat(newAUM);
    if (isNaN(newAUMValue) || newAUMValue <= 0) {
      toast({
        title: "Invalid AUM",
        description: "Please enter a valid positive number.",
        variant: "destructive",
      });
      return;
    }

    if (newAUMValue <= selectedFund.total_aum) {
      toast({
        title: "Invalid AUM",
        description: "New AUM must be greater than current AUM to distribute yield.",
        variant: "destructive",
      });
      return;
    }

    setPreviewLoading(true);
    try {
      const result = await previewYieldDistribution({
        fundId: selectedFund.id,
        targetDate: new Date(),
        newTotalAUM: newAUMValue,
      });
      setYieldPreview(result);
    } catch (error) {
      toast({
        title: "Preview Failed",
        description: error instanceof Error ? error.message : "Failed to preview yield.",
        variant: "destructive",
      });
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleApplyYield = async () => {
    if (!selectedFund || !newAUM || !user || !yieldPreview) return;

    setApplyLoading(true);
    try {
      await applyYieldDistribution(
        {
          fundId: selectedFund.id,
          targetDate: new Date(),
          newTotalAUM: parseFloat(newAUM),
        },
        user.id
      );

      toast({
        title: "Yield Distributed",
        description: `Distributed ${formatValue(yieldPreview.grossYield, selectedFund.asset)} ${selectedFund.asset} to ${yieldPreview.investorCount} investors.`,
      });

      setShowYieldDialog(false);
      loadFunds();
    } catch (error) {
      toast({
        title: "Apply Failed",
        description: error instanceof Error ? error.message : "Failed to apply yield.",
        variant: "destructive",
      });
    } finally {
      setApplyLoading(false);
    }
  };

  const totalAUM = funds.reduce((sum, f) => {
    // Group by asset type for display
    return sum + f.total_aum;
  }, 0);

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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
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
            {/* AUM Input */}
            <div className="grid grid-cols-2 gap-6">
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
                />
              </div>
            </div>

            {/* Purpose Selector - NEW */}
            <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
              <Label className="text-sm font-medium">Purpose</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-start gap-3 p-3 border rounded-md bg-background cursor-pointer hover:border-green-500 transition-colors border-green-500">
                  <div className="mt-0.5 h-4 w-4 rounded-full bg-green-500" />
                  <div>
                    <p className="font-medium text-sm">Reporting</p>
                    <p className="text-xs text-muted-foreground">Month-end official yield for statements</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 border rounded-md bg-background cursor-pointer hover:border-orange-500 transition-colors opacity-50">
                  <div className="mt-0.5 h-4 w-4 rounded-full bg-orange-500" />
                  <div>
                    <p className="font-medium text-sm">Transaction</p>
                    <p className="text-xs text-muted-foreground">Mid-month operational (withdrawals/top-ups)</p>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                💡 Reporting yields are shown to investors. Transaction yields are internal only.
              </p>
            </div>

            {/* Preview Button */}
            <Button
              onClick={handlePreviewYield}
              disabled={!newAUM || previewLoading}
              variant="secondary"
              className="w-full"
            >
              {previewLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4 mr-2" />
              )}
              Preview Yield Distribution
            </Button>

            {/* Preview Results */}
            {yieldPreview && (
              <div className="space-y-4 border-t pt-4">
                <div className="grid grid-cols-3 gap-4">
                  <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
                    <CardContent className="p-4 text-center">
                      <p className="text-xs text-muted-foreground">Gross Yield</p>
                      <p className="text-xl font-mono font-bold text-green-600">
                        +{formatValue(yieldPreview.grossYield, selectedFund?.asset || "")}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-xs text-muted-foreground">Total Fees</p>
                      <p className="text-xl font-mono font-semibold">
                        {formatValue(yieldPreview.totalFees, selectedFund?.asset || "")}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="border-primary/30 bg-primary/5">
                    <CardContent className="p-4 text-center">
                      <p className="text-xs text-muted-foreground">Net Yield</p>
                      <p className="text-xl font-mono font-bold text-primary">
                        +{formatValue(yieldPreview.netYield, selectedFund?.asset || "")}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Investor Breakdown */}
                <div className="rounded-md border max-h-64 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Investor</TableHead>
                        <TableHead className="text-right">Ownership</TableHead>
                        <TableHead className="text-right">Gross</TableHead>
                        <TableHead className="text-right">Fee</TableHead>
                        <TableHead className="text-right">Net</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {yieldPreview.distributions.map((inv) => (
                        <TableRow key={inv.investorId}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{inv.investorName}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {inv.allocationPercentage.toFixed(2)}%
                          </TableCell>
                          <TableCell className="text-right font-mono text-green-600">
                            +{formatValue(inv.grossYield, selectedFund?.asset || "")}
                          </TableCell>
                          <TableCell className="text-right font-mono text-muted-foreground">
                            -{formatValue(inv.feeAmount, selectedFund?.asset || "")}
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold">
                            +{formatValue(inv.netYield, selectedFund?.asset || "")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Apply Button */}
                <Button
                  onClick={handleApplyYield}
                  disabled={applyLoading}
                  className="w-full"
                  size="lg"
                >
                  {applyLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Apply Yield to {yieldPreview.investorCount} Investors
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
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
