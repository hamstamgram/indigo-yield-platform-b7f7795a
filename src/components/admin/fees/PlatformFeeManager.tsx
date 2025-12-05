import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DollarSign, Percent, TrendingUp, Users } from "lucide-react";

interface InvestorFee {
  investor_id: string;
  investor_name: string;
  investor_email: string;
  current_fee_rate: number;
  total_fees_collected: number;
  last_updated: string;
}

interface FeeStats {
  total_fees_collected: number;
  total_gross_yield: number;
  total_net_yield: number;
  investor_count: number;
  asset_code: string;
  month: string;
}

const PlatformFeeManager = () => {
  const [investorFees, setInvestorFees] = useState<InvestorFee[]>([]);
  const [feeStats, setFeeStats] = useState<FeeStats[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<string>("USDT");
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [editingInvestor, setEditingInvestor] = useState<string | null>(null);
  const [newFeeRate, setNewFeeRate] = useState<string>("");
  const [loading, setLoading] = useState(false);

  // Declare callback functions before useEffect
  const fetchInvestorFees = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("investors")
        .select(
          `
          id,
          name,
          email,
          profiles!inner(fee_percentage)
        `
        )
        .eq("status", "active");

      if (error) throw error;

      // Get fee collection data from fee_calculations table
      const startDate = `${selectedMonth}-01`;
      const endDate = new Date(
        new Date(selectedMonth).getFullYear(),
        new Date(selectedMonth).getMonth() + 1,
        0
      )
        .toISOString()
        .slice(0, 10);

      const { data: feeData, error: feeError } = await supabase
        .from("fee_calculations")
        .select("investor_id, fee_amount")
        .gte("calculation_date", startDate)
        .lte("calculation_date", endDate);

      if (feeError) throw feeError;

      const feesMap =
        feeData?.reduce(
          (acc, fee) => {
            acc[fee.investor_id] =
              (acc[fee.investor_id] || 0) + parseFloat(fee.fee_amount.toString());
            return acc;
          },
          {} as Record<string, number>
        ) || {};

      const formattedData: InvestorFee[] =
        data?.map((investor: any) => ({
          investor_id: investor.id,
          investor_name: investor.name,
          investor_email: investor.email,
          current_fee_rate: investor.profiles?.fee_percentage || 0.02,
          total_fees_collected: feesMap[investor.id] || 0,
          last_updated: new Date().toISOString(),
        })) || [];

      setInvestorFees(formattedData);
    } catch (error) {
      console.error("Error fetching investor fees:", error);
      toast.error("Failed to load investor fee data");
    }
  }, [selectedAsset, selectedMonth]);

  const fetchFeeStats = useCallback(async () => {
    try {
      const startDate = `${selectedMonth}-01`;
      const endDate = new Date(
        new Date(selectedMonth).getFullYear(),
        new Date(selectedMonth).getMonth() + 1,
        0
      )
        .toISOString()
        .slice(0, 10);

      // Query fee_calculations table for stats
      const { data, error } = await supabase
        .from("fee_calculations")
        .select("fee_amount, calculation_basis, investor_id")
        .gte("calculation_date", startDate)
        .lte("calculation_date", endDate);

      if (error) throw error;

      // Calculate stats from fee_calculations
      const totalFeesCollected = data?.reduce((sum, f) => sum + Number(f.fee_amount || 0), 0) || 0;
      const totalBasis = data?.reduce((sum, f) => sum + Number(f.calculation_basis || 0), 0) || 0;
      const uniqueInvestors = new Set(data?.map((f) => f.investor_id) || []).size;

      const formattedStats: FeeStats[] = [
        {
          total_fees_collected: totalFeesCollected,
          total_gross_yield: totalBasis,
          total_net_yield: totalBasis - totalFeesCollected,
          investor_count: uniqueInvestors,
          asset_code: selectedAsset,
          month: selectedMonth,
        },
      ];

      setFeeStats(formattedStats);
    } catch (error) {
      console.error("Error fetching fee stats:", error);
      toast.error("Failed to load fee statistics");
    }
  }, [selectedAsset, selectedMonth]);

  useEffect(() => {
    fetchInvestorFees();
    fetchFeeStats();
  }, [selectedAsset, selectedMonth, fetchInvestorFees, fetchFeeStats]);

  const updateInvestorFeeRate = async (investorId: string, newRate: number) => {
    if (newRate < 0 || newRate > 1) {
      toast.error("Fee rate must be between 0% and 100%");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ fee_percentage: newRate })
        .eq("id", investorId);

      if (error) throw error;

      toast.success("Fee rate updated successfully");
      setEditingInvestor(null);
      setNewFeeRate("");
      fetchInvestorFees();
    } catch (error) {
      console.error("Error updating fee rate:", error);
      toast.error("Failed to update fee rate");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    }).format(amount);
  };

  const formatPercentage = (rate: number) => {
    return `${(rate * 100).toFixed(2)}%`;
  };

  const totalStats = feeStats.reduce(
    (acc, stat) => ({
      totalFeesCollected: acc.totalFeesCollected + stat.total_fees_collected,
      totalGrossYield: acc.totalGrossYield + stat.total_gross_yield,
      totalNetYield: acc.totalNetYield + stat.total_net_yield,
    }),
    { totalFeesCollected: 0, totalGrossYield: 0, totalNetYield: 0 }
  );

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Platform Fee Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Asset</label>
              <Select value={selectedAsset} onValueChange={setSelectedAsset}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USDT">USDT</SelectItem>
                  <SelectItem value="BTC">BTC</SelectItem>
                  <SelectItem value="ETH">ETH</SelectItem>
                  <SelectItem value="SOL">SOL</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Month</label>
              <Input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fee Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Fees Collected</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(totalStats.totalFeesCollected)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Gross Yield</p>
                <p className="text-2xl font-bold">{formatCurrency(totalStats.totalGrossYield)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Percent className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Net Yield</p>
                <p className="text-2xl font-bold">{formatCurrency(totalStats.totalNetYield)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Investors</p>
                <p className="text-2xl font-bold">{investorFees.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Investor Fee Management Table */}
      <Card>
        <CardHeader>
          <CardTitle>Individual Investor Fee Rates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4 font-semibold">Investor</th>
                  <th className="text-left p-4 font-semibold">Email</th>
                  <th className="text-right p-4 font-semibold">Current Fee Rate</th>
                  <th className="text-right p-4 font-semibold">Fees Collected ({selectedMonth})</th>
                  <th className="text-center p-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {investorFees.map((investor) => (
                  <tr key={investor.investor_id} className="border-b hover:bg-muted/50">
                    <td className="p-4 font-medium">{investor.investor_name}</td>
                    <td className="p-4 text-muted-foreground">{investor.investor_email}</td>
                    <td className="p-4 text-right">
                      {editingInvestor === investor.investor_id ? (
                        <div className="flex items-center gap-2 justify-end">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            value={newFeeRate}
                            onChange={(e) => setNewFeeRate(e.target.value)}
                            className="w-20"
                            placeholder="2.00"
                          />
                          <span className="text-sm">%</span>
                        </div>
                      ) : (
                        <Badge variant="outline">
                          {formatPercentage(investor.current_fee_rate)}
                        </Badge>
                      )}
                    </td>
                    <td className="p-4 text-right font-mono">
                      {formatCurrency(investor.total_fees_collected)}
                    </td>
                    <td className="p-4 text-center">
                      {editingInvestor === investor.investor_id ? (
                        <div className="flex items-center gap-2 justify-center">
                          <Button
                            size="sm"
                            onClick={() =>
                              updateInvestorFeeRate(
                                investor.investor_id,
                                parseFloat(newFeeRate) / 100
                              )
                            }
                            disabled={loading || !newFeeRate}
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingInvestor(null);
                              setNewFeeRate("");
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingInvestor(investor.investor_id);
                            setNewFeeRate((investor.current_fee_rate * 100).toString());
                          }}
                        >
                          Edit
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PlatformFeeManager;
