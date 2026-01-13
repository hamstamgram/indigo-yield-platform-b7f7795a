import { useState } from "react";
import {
  Card, CardContent, CardHeader, CardTitle,
  Skeleton, Button, Input, Label,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui";
import { CryptoIcon } from "@/components/CryptoIcons";
import { ChevronDown, ChevronUp, ArrowUpDown, Users, TrendingUp, Plus, CheckCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks";
import { useAuth } from "@/services/auth";
import {
  previewYieldDistribution,
  type YieldCalculationResult,
} from "@/services";
import {
  useActiveFundsWithAUM,
  useFundInvestorComposition,
  useApplyYieldDistribution,
} from "@/hooks/data";
import { logError } from "@/lib/logger";

type SortField = "investor_name" | "current_value" | "ownership_pct" | "mtd_yield";
type SortDirection = "asc" | "desc";

export default function MonthlyDataEntry() {
  const [selectedFundId, setSelectedFundId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>("current_value");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // AUM Dialog state
  const [showAUMDialog, setShowAUMDialog] = useState(false);
  const [newAUM, setNewAUM] = useState<string>("");
  const [yieldPreview, setYieldPreview] = useState<YieldCalculationResult | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const { toast } = useToast();
  const { user } = useAuth();

  // React Query hooks
  const { data: funds = [], isLoading: loading, refetch: refetchFunds } = useActiveFundsWithAUM();
  const { data: investors = [], isLoading: loadingInvestors } = useFundInvestorComposition(selectedFundId);
  const applyYieldMutation = useApplyYieldDistribution();

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const sortedInvestors = [...investors].sort((a, b) => {
    const multiplier = sortDirection === "asc" ? 1 : -1;
    if (sortField === "investor_name") {
      return multiplier * a.investor_name.localeCompare(b.investor_name);
    }
    return multiplier * ((a[sortField] || 0) - (b[sortField] || 0));
  });

  const formatValue = (value: number, asset: string) => {
    if (asset === "BTC") {
      return value.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
    } else if (asset === "ETH" || asset === "SOL") {
      return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
    }
    return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const selectedFund = funds.find((f) => f.id === selectedFundId);

  // AUM Dialog handlers
  const handleOpenAUMDialog = () => {
    setNewAUM("");
    setYieldPreview(null);
    setShowAUMDialog(true);
  };

  const handlePreviewYield = async () => {
    if (!selectedFundId || !newAUM || !selectedFund) return;

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
        fundId: selectedFundId,
        targetDate: new Date(),
        newTotalAUM: newAUMValue,
      });
      setYieldPreview(result);
    } catch (error) {
      logError("MonthlyDataEntry.handlePreviewYield", error, { fundId: selectedFundId });
      toast({
        title: "Preview Failed",
        description: error instanceof Error ? error.message : "Failed to preview yield distribution.",
        variant: "destructive",
      });
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleApplyYield = async () => {
    if (!selectedFundId || !newAUM || !user || !yieldPreview) return;

    applyYieldMutation.mutate(
      {
        input: {
          fundId: selectedFundId,
          targetDate: new Date(),
          newTotalAUM: parseFloat(newAUM),
        },
      },
      {
        onSuccess: () => {
          toast({
            title: "Yield Distributed",
            description: `Successfully distributed ${formatValue(yieldPreview.grossYield, selectedFund?.asset || "")} ${selectedFund?.asset} yield to ${yieldPreview.investorCount} investors.`,
          });
          setShowAUMDialog(false);
          setYieldPreview(null);
          setNewAUM("");
          refetchFunds();
        },
      }
    );
  };

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 px-2 hover:bg-muted"
      onClick={() => handleSort(field)}
    >
      {children}
      <ArrowUpDown className={cn("ml-1 h-3 w-3", sortField === field && "text-primary")} />
    </Button>
  );

  if (loading) {
    return (
      <div className="container max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold">Monthly Data Entry</h1>
        <p className="text-muted-foreground mt-2">
          Click on a fund card to view investor composition and manage AUM data.
        </p>
      </div>

      {/* Fund Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
        {funds.map((fund) => (
          <Card
            key={fund.id}
            className={cn(
              "cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary/50",
              selectedFundId === fund.id && "border-primary ring-2 ring-primary/20"
            )}
            onClick={() => setSelectedFundId(selectedFundId === fund.id ? null : fund.id)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CryptoIcon symbol={fund.asset} className="h-8 w-8" />
                  <div>
                    <CardTitle className="text-lg">{fund.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{fund.code}</p>
                  </div>
                </div>
                {selectedFundId === fund.id ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold">
                    {formatValue(fund.total_aum, fund.asset)} {fund.asset}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{fund.investor_count} investors</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Investor Composition Table */}
      {selectedFundId && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                {selectedFund && <CryptoIcon symbol={selectedFund.asset} className="h-6 w-6" />}
                Investor Composition - {selectedFund?.name}
              </CardTitle>
              {selectedFund && selectedFund.investor_count > 0 && (
                <Button onClick={handleOpenAUMDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add AUM Entry
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loadingInvestors ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : investors.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No investors in this fund.
              </p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <SortButton field="investor_name">Investor</SortButton>
                      </TableHead>
                      <TableHead className="hidden md:table-cell">Email</TableHead>
                      <TableHead className="text-right">
                        <SortButton field="current_value">
                          Balance ({selectedFund?.asset})
                        </SortButton>
                      </TableHead>
                      <TableHead className="text-right">
                        <SortButton field="ownership_pct">Ownership %</SortButton>
                      </TableHead>
                      <TableHead className="text-right">
                        <SortButton field="mtd_yield">MTD Yield</SortButton>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedInvestors.map((investor) => (
                      <TableRow key={investor.investor_id}>
                        <TableCell className="font-medium">{investor.investor_name}</TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">
                          {investor.investor_email}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatValue(investor.current_value, selectedFund?.asset || "")}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {investor.ownership_pct.toFixed(2)}%
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatValue(investor.mtd_yield, selectedFund?.asset || "")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* AUM Entry Dialog */}
      <Dialog open={showAUMDialog} onOpenChange={setShowAUMDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedFund && <CryptoIcon symbol={selectedFund.asset} className="h-6 w-6" />}
              Add AUM Entry - {selectedFund?.name}
            </DialogTitle>
            <DialogDescription>
              Enter the new total AUM to calculate and distribute yield to all investors.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* AUM Input Section */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Current AUM</Label>
                <div className="text-2xl font-mono font-semibold">
                  {formatValue(selectedFund?.total_aum || 0, selectedFund?.asset || "")} {selectedFund?.asset}
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
                  placeholder={`Enter new total AUM in ${selectedFund?.asset}`}
                  className="font-mono"
                />
              </div>
            </div>

            {/* Preview Button */}
            <Button
              onClick={handlePreviewYield}
              disabled={!newAUM || previewLoading}
              variant="secondary"
              className="w-full"
            >
              {previewLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Calculating...
                </>
              ) : (
                "Preview Distribution"
              )}
            </Button>

            {/* Preview Results */}
            {yieldPreview && (
              <div className="space-y-4 border-t pt-4">
                {/* Summary Cards */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="rounded-lg bg-muted/50 p-3 text-center">
                    <div className="text-xs text-muted-foreground">Current AUM</div>
                    <div className="font-mono font-semibold">
                      {formatValue(yieldPreview.currentAUM, selectedFund?.asset || "")}
                    </div>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3 text-center">
                    <div className="text-xs text-muted-foreground">New AUM</div>
                    <div className="font-mono font-semibold">
                      {formatValue(yieldPreview.newAUM, selectedFund?.asset || "")}
                    </div>
                  </div>
                  <div className="rounded-lg bg-green-500/10 p-3 text-center">
                    <div className="text-xs text-muted-foreground">Gross Yield</div>
                    <div className="font-mono font-semibold text-green-600">
                      +{formatValue(yieldPreview.grossYield, selectedFund?.asset || "")}
                    </div>
                  </div>
                  <div className="rounded-lg bg-green-500/10 p-3 text-center">
                    <div className="text-xs text-muted-foreground">Yield %</div>
                    <div className="font-mono font-semibold text-green-600">
                      +{yieldPreview.yieldPercentage.toFixed(4)}%
                    </div>
                  </div>
                </div>

                {/* Per-Investor Distribution Table */}
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Investor</TableHead>
                        <TableHead className="text-right">Current Balance</TableHead>
                        <TableHead className="text-right">Ownership %</TableHead>
                        <TableHead className="text-right">Gross Yield</TableHead>
                        <TableHead className="text-right">Fee %</TableHead>
                        <TableHead className="text-right">Net Yield</TableHead>
                        <TableHead className="text-right">New Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {yieldPreview.distributions.map((d) => (
                        <TableRow key={d.investorId}>
                          <TableCell className="font-medium">{d.investorName}</TableCell>
                          <TableCell className="text-right font-mono">
                            {formatValue(d.currentBalance, selectedFund?.asset || "")}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {d.allocationPercentage.toFixed(2)}%
                          </TableCell>
                          <TableCell className="text-right font-mono text-green-600">
                            +{formatValue(d.grossYield, selectedFund?.asset || "")}
                          </TableCell>
                          <TableCell className="text-right font-mono text-muted-foreground">
                            {d.feePercentage.toFixed(2)}%
                          </TableCell>
                          <TableCell className="text-right font-mono text-green-600">
                            +{formatValue(d.netYield, selectedFund?.asset || "")}
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold">
                            {formatValue(d.newBalance, selectedFund?.asset || "")}
                          </TableCell>
                        </TableRow>
                      ))}
                      {/* Totals Row */}
                      <TableRow className="bg-muted/50 font-semibold">
                        <TableCell>TOTAL ({yieldPreview.investorCount} investors)</TableCell>
                        <TableCell className="text-right font-mono">
                          {formatValue(yieldPreview.currentAUM, selectedFund?.asset || "")}
                        </TableCell>
                        <TableCell className="text-right">100%</TableCell>
                        <TableCell className="text-right font-mono text-green-600">
                          +{formatValue(yieldPreview.grossYield, selectedFund?.asset || "")}
                        </TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground">
                          {formatValue(yieldPreview.totalFees, selectedFund?.asset || "")}
                        </TableCell>
                        <TableCell className="text-right font-mono text-green-600">
                          +{formatValue(yieldPreview.netYield, selectedFund?.asset || "")}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatValue(yieldPreview.newAUM, selectedFund?.asset || "")}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-2">
                  <Button variant="outline" onClick={() => setShowAUMDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleApplyYield} disabled={applyYieldMutation.isPending}>
                    {applyYieldMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Applying...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Apply Distribution
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
