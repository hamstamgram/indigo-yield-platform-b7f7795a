import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Calendar, Calculator, ArrowRight, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Fund {
  id: string;
  name: string;
  code: string;
  asset_symbol: string;
  total_aum: number;
}

interface DistributionPreview {
  investorName: string;
  currentBalance: number;
  ownershipPct: number;
  estimatedYield: number;
  newBalance: number;
}

export default function FundManager() {
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [selectedFundId, setSelectedFundId] = useState<string>("");
  const [newAumInput, setNewAumInput] = useState<string>("");
  const [netFlows, setNetFlows] = useState({ deposits: 0, withdrawals: 0 });
  const [isBaselineMode, setIsBaselineMode] = useState<boolean>(false);

  // 1. Fetch Funds
  const { data: funds } = useQuery({
    queryKey: ["admin-funds"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("funds") // Ensure this table exists via migration
        .select("*")
        .eq("status", "active");
      if (error) throw error;

      // Map DB fields to Fund interface
      return (data as any[]).map((item) => ({
        id: item.id,
        name: item.name,
        code: item.code,
        asset_symbol: (item.asset || item.asset_symbol || "UNITS").toUpperCase(),
        total_aum: item.total_aum || 0,
      })) as Fund[];
    },
  });

  // Derived selected fund
  const selectedFund = funds?.find((f) => f.id === selectedFundId);

  // 1.5 Fetch Net Flows (Direct Query)
  const { data: flowData } = useQuery({
    queryKey: ["fund-flows", selectedFundId, selectedMonth],
    enabled: !!selectedFundId && !!selectedMonth,
    queryFn: async () => {
      const start = `${selectedMonth}-01`;
      const date = new Date(selectedMonth + "-01");
      const end = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString();

      const { data, error } = await supabase
        .from("transactions_v2")
        .select("type, amount")
        .eq("fund_id", selectedFundId)
        .gte("tx_date", start)
        .lte("tx_date", end);

      if (error) throw error;

      const deposits = data?.filter(t => t.type === 'DEPOSIT').reduce((sum, t) => sum + Number(t.amount), 0) || 0;
      const withdrawals = data?.filter(t => t.type === 'WITHDRAWAL').reduce((sum, t) => sum + Number(t.amount), 0) || 0;

      return { total_deposits: deposits, total_withdrawals: withdrawals };
    },
  });

  useEffect(() => {
    if (flowData) {
      setNetFlows({
        deposits: Number(flowData.total_deposits) || 0,
        withdrawals: Number(flowData.total_withdrawals) || 0,
      });
    }
  }, [flowData]);

  // 2. Simulation / Preview Calculation
  const calculatePreview = (): { yieldPot: number; roi: number } => {
    if (!selectedFund || !newAumInput) return { yieldPot: 0, roi: 0 };

    const newAum = parseFloat(newAumInput);
    const oldAum = selectedFund.total_aum;
    const flows = netFlows.deposits - netFlows.withdrawals;

    // Formula: Yield = New - (Old + Flows)
    const yieldPot = newAum - (oldAum + flows);
    const roi = oldAum > 0 ? (yieldPot / oldAum) * 100 : 0;

    return { yieldPot, roi };
  };

  const preview = calculatePreview();

  // 3. Fetch Investors for Preview Table
  const { data: investorPreviews } = useQuery({
    queryKey: ["fund-investors-preview", selectedFundId, preview.yieldPot],
    enabled: !!selectedFundId && !!preview.yieldPot && !isBaselineMode,
    queryFn: async () => {
      // In a real app, this would be an RPC call to get exact math
      // Here we simulate the frontend projection based on the logic
      const { data: positions } = await (supabase as any)
        .from("investor_positions")
        .select(
          `
          shares,
          investors (
            profiles ( full_name, email )
          )
        `
        )
        .eq("fund_id", selectedFundId);

      if (!positions || !selectedFund) return [];

      const totalShares = positions.reduce((acc: number, p: any) => acc + Number(p.shares), 0);

      return positions.map((pos: any) => {
        const balance = Number(pos.shares);
        const ownership = totalShares > 0 ? balance / totalShares : 0;
        const estYield = preview.yieldPot * ownership;

        return {
          investorName:
            pos.investors?.profiles?.full_name || pos.investors?.profiles?.email || "Unknown",
          currentBalance: balance,
          ownershipPct: ownership * 100,
          estimatedYield: estYield,
          newBalance: balance + estYield,
        } as DistributionPreview;
      });
    },
  });

  // 4. Commit Mutation
  const distributeMutation = useMutation({
    mutationFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Unauthorized");

      if (isBaselineMode) {
        // Direct update to funds table
        const { data, error } = await supabase
          .from("funds")
          .update({ 
            total_aum: parseFloat(newAumInput),
            updated_at: new Date().toISOString() 
          })
          .eq("id", selectedFundId)
          .select();
          
        if (error) throw error;
        return data;
      } else {
        // 1. Get or Create Period ID
        const [year, month] = selectedMonth.split("-").map(Number);
        let periodId;
        
        const { data: period } = await supabase
          .from("statement_periods")
          .select("id")
          .eq("year", year)
          .eq("month", month)
          .maybeSingle();
          
        if (period) {
          periodId = period.id;
        } else {
          // Create period
          const date = new Date(year, month - 1);
          const periodName = date.toLocaleString('default', { month: 'long', year: 'numeric' });
          const endDate = new Date(year, month, 0).toISOString().split('T')[0]; // Last day
          
          const { data: newPeriod, error: periodError } = await supabase
            .from("statement_periods")
            .insert({
              year,
              month,
              period_name: periodName,
              period_end_date: endDate,
              created_by: user.id,
              status: 'FINALIZED'
            })
            .select("id")
            .single();
            
          if (periodError) throw periodError;
          periodId = newPeriod.id;
        }

        // 2. Call V2 Yield Distribution RPC
        const { data, error } = await supabase.rpc("distribute_yield_v2", {
          p_period_id: periodId,
          p_fund_name: selectedFund?.asset_symbol,
          p_gross_yield_amount: preview.yieldPot,
          p_admin_id: user.id,
        });

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      if (isBaselineMode) {
        toast.success("Baseline Updated", {
          description: `Fund AUM set to ${parseFloat(newAumInput).toLocaleString()} ${selectedFund?.asset_symbol}`,
        });
      } else {
        toast.success("Yield Distributed Successfully", {
          description: `Allocated ${preview.yieldPot.toFixed(4)} ${selectedFund?.asset_symbol} across investors.`,
        });
      }
      setNewAumInput("");
      queryClient.invalidateQueries({ queryKey: ["admin-funds"] });
    },
    onError: (err: any) => {
      toast.error("Distribution Failed", { description: err.message });
    },
  });

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold flex items-center gap-2 text-foreground">
            <Calculator className="h-8 w-8 text-primary" />
            Fund Manager Cockpit
          </h1>
          <p className="text-muted-foreground mt-1">Monthly revaluation and yield distribution</p>
        </div>
      </div>

      {/* 1. SELECTION PANEL */}
      <Card className="border-l-4 border-l-primary bg-muted/10">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label>Select Fund</Label>
              <Select value={selectedFundId} onValueChange={setSelectedFundId}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Choose a fund..." />
                </SelectTrigger>
                <SelectContent>
                  {funds?.map((fund) => (
                    <SelectItem key={fund.id} value={fund.id}>
                      {fund.name} ({fund.asset_symbol})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Reporting Month</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="pl-9 bg-background"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Current AUM (System)</Label>
              <div className="p-2 bg-background border rounded-md font-mono text-right">
                {selectedFund ? selectedFund.total_aum.toLocaleString() : "0.00"}{" "}
                {selectedFund?.asset_symbol}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedFund && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 2. INPUT PANEL */}
          <Card className="lg:col-span-1 shadow-lg border-primary/20">
            <CardHeader className="bg-primary/5 pb-4">
              <CardTitle className="text-lg">Revaluation</CardTitle>
              <CardDescription>Enter the new total value of the fund</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="flex items-center space-x-2 pb-4 border-b">
                <Switch
                  id="baseline-mode"
                  checked={isBaselineMode}
                  onCheckedChange={setIsBaselineMode}
                />
                <Label htmlFor="baseline-mode">Set Baseline Only (No Yield)</Label>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-foreground">
                  New Closing Balance (AUM)
                </Label>
                <div className="relative">
                  <Input
                    type="number"
                    placeholder="0.00000000"
                    value={newAumInput}
                    onChange={(e) => setNewAumInput(e.target.value)}
                    className="text-2xl h-14 font-mono font-bold text-right pr-16"
                  />
                  <span className="absolute right-4 top-4 font-bold text-muted-foreground">
                    {selectedFund.asset_symbol}
                  </span>
                </div>
              </div>

              <div className="space-y-2 p-4 bg-muted rounded-lg text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Previous AUM</span>
                  <span className="font-mono">{selectedFund.total_aum.toFixed(4)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Net Flows (Est.)</span>
                  <span className="font-mono text-blue-600">
                    {netFlows.deposits - netFlows.withdrawals > 0 ? "+" : ""}
                    {(netFlows.deposits - netFlows.withdrawals).toFixed(4)}
                  </span>
                </div>
                {!isBaselineMode && (
                  <>
                    <div className="border-t my-2"></div>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-foreground">Implied Yield</span>
                      <span
                        className={`font-mono font-bold text-lg ${preview.yieldPot >= 0 ? "text-green-600" : "text-red-600"}`}
                      >
                        {preview.yieldPot > 0 ? "+" : ""}
                        {preview.yieldPot.toFixed(4)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-muted-foreground text-xs">Return on Investment</span>
                      <Badge
                        variant={preview.roi >= 0 ? "default" : "destructive"}
                        className="bg-green-600"
                      >
                        {preview.roi.toFixed(2)}%
                      </Badge>
                    </div>
                  </>
                )}
              </div>

              <Button
                className="w-full h-12 text-lg font-bold"
                disabled={!newAumInput || distributeMutation.isPending}
                onClick={() => distributeMutation.mutate()}
                variant={isBaselineMode ? "secondary" : "primary"}
              >
                {distributeMutation.isPending
                  ? "Processing..."
                  : isBaselineMode
                    ? "Update Baseline AUM"
                    : "Confirm & Distribute"}
                {!distributeMutation.isPending && <ArrowRight className="ml-2 h-5 w-5" />}
              </Button>
            </CardContent>
          </Card>

          {/* 3. PREVIEW PANEL */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Distribution Preview</CardTitle>
              <CardDescription>
                {isBaselineMode
                  ? "Distribution preview disabled in Baseline Mode"
                  : "How this yield will be allocated to investors (Pro-Rata)"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {investorPreviews && !isBaselineMode ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Investor</TableHead>
                        <TableHead className="text-right">Ownership</TableHead>
                        <TableHead className="text-right">Current Bal</TableHead>
                        <TableHead className="text-right text-green-600 font-bold">
                          Yield Allocation
                        </TableHead>
                        <TableHead className="text-right">New Bal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {investorPreviews.map((_row: any, _idx: any) => (
                        <TableRow key={_idx}>
                          <TableCell className="font-medium">{_row.investorName}</TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {_row.ownershipPct.toFixed(2)}%
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {_row.currentBalance.toFixed(4)}
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-green-600 bg-green-50/50 dark:bg-green-900/10">
                            +{_row.estimatedYield.toFixed(4)}
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold">
                            {_row.newBalance.toFixed(4)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                  <Wallet className="h-12 w-12 mb-4 opacity-20" />
                  <p>
                    {isBaselineMode
                      ? "Baseline update only - no yield distribution."
                      : "Enter a new AUM value to see distribution preview."}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
