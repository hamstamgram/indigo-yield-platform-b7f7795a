import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { BarChart3, TrendingUp, DollarSign, Target } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FundConfiguration } from "@/types/common";

export default function PortfolioAnalyticsPage() {
  const [fundConfigs, setFundConfigs] = useState<FundConfiguration[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAnalytics = async () => {
    try {
      const { data } = await supabase
        .from("funds")
        .select("*")
        .order("created_at", { ascending: false });

      if (data) {
        const mappedData = data.map((item: any) => ({
          id: item.id,
          name: item.name,
          code: item.code,
          currency: (item.asset_symbol || item.asset || "USD").toUpperCase(),
          status: item.status === "suspended" ? "inactive" : item.status,
          mgmt_fee_bps: item.mgmt_fee_bps || 0,
          perf_fee_bps: item.perf_fee_bps || 0,
          benchmark: item.strategy || "Standard", // Map strategy to benchmark for display
          created_at: item.created_at,
          updated_at: item.updated_at,
        })) as FundConfiguration[];
        setFundConfigs(mappedData);
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
      toast({
        title: "Error",
        description: "Failed to load analytics data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading analytics...</div>;
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Portfolio Analytics</h1>
          <p className="text-muted-foreground">Performance insights and metrics</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Funds</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fundConfigs.length}</div>
            <p className="text-xs text-muted-foreground">Active investment funds</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Management Fee</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {fundConfigs.length > 0
                ? (
                    fundConfigs.reduce((acc, f) => acc + f.mgmt_fee_bps, 0) /
                    fundConfigs.length /
                    100
                  ).toFixed(2)
                : 0}
              %
            </div>
            <p className="text-xs text-muted-foreground">Management fee rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Performance Fee</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {fundConfigs.length > 0
                ? (
                    fundConfigs.reduce((acc, f) => acc + f.perf_fee_bps, 0) /
                    fundConfigs.length /
                    100
                  ).toFixed(2)
                : 0}
              %
            </div>
            <p className="text-xs text-muted-foreground">Average performance fee</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Status</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {fundConfigs.filter((f) => f.status === "active").length}
            </div>
            <p className="text-xs text-muted-foreground">Of {fundConfigs.length} total funds</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Fund Configurations
          </CardTitle>
          <CardDescription>Overview of all configured investment funds</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {fundConfigs.map((fund) => (
              <div
                key={fund.id}
                className="flex items-center justify-between p-4 border rounded-lg bg-card"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{fund.name}</h3>
                    <Badge variant={fund.status === "active" ? "default" : "secondary"}>
                      {fund.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Code: {fund.code} | Currency: {fund.currency} | Strategy: {fund.benchmark}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">
                    Mgmt: {(fund.mgmt_fee_bps / 100).toFixed(2)}%
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Perf: {(fund.perf_fee_bps / 100).toFixed(2)}%
                  </div>
                </div>
              </div>
            ))}
          </div>

          {fundConfigs.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No fund configurations found
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
