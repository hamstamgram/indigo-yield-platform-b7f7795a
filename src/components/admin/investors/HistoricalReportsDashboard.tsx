import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Calendar, Database, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks";
import BulkDataGenerator from "./BulkDataGenerator";
import { getHistoricalDataSummary } from "@/services/shared/historicalDataService";

const HistoricalReportsDashboard: React.FC = () => {
  const [, setLoading] = useState(false);
  const [summary, setSummary] = useState({
    totalReports: 0,
    latestMonth: null as string | null,
    earliestMonth: null as string | null,
    investorCount: 0,
    assetCount: 0,
  });
  const { toast } = useToast();

  // Fetch summary data
  const fetchSummary = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getHistoricalDataSummary();
      setSummary(data);
    } catch (error) {
      console.error("Error fetching summary:", error);
      toast({
        title: "Error",
        description: "Failed to load historical data summary",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Historical Reports Dashboard</h1>
        <p className="text-muted-foreground">
          Manage historical investor reporting data and generate missing templates
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalReports.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Historical data points</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Data Range</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {summary.earliestMonth && summary.latestMonth ? (
                <>
                  {new Date(summary.earliestMonth).toLocaleDateString("en-US", {
                    month: "short",
                    year: "2-digit",
                  })}{" "}
                  -{" "}
                  {new Date(summary.latestMonth).toLocaleDateString("en-US", {
                    month: "short",
                    year: "2-digit",
                  })}
                </>
              ) : (
                "No data"
              )}
            </div>
            <p className="text-xs text-muted-foreground">Coverage period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Investors</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.investorCount}</div>
            <p className="text-xs text-muted-foreground">With historical data</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assets</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.assetCount}</div>
            <p className="text-xs text-muted-foreground">Tracked assets</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different views */}
      <Tabs defaultValue="generator" className="space-y-4">
        <TabsList>
          <TabsTrigger value="generator">Data Generator</TabsTrigger>
        </TabsList>

        <TabsContent value="generator">
          <BulkDataGenerator />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default HistoricalReportsDashboard;
