import { useState, useEffect } from "react";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Download, Plus } from "lucide-react";
import { FeeStats } from "@/components/admin/fees/FeeStats";
import { FeeCalculationsTable } from "@/components/admin/fees/FeeCalculationsTable";
import { FeeStructuresTable } from "@/components/admin/fees/FeeStructuresTable";
import { MonthlyFeeSummaryChart } from "@/components/admin/fees/MonthlyFeeSummaryChart";
import { feeService } from "@/services/feeService";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type {
  FeeCalculation,
  FundFeeStructure,
  MonthlyFeeSummary,
  FeeStats as FeeStatsType,
  FeeFilters,
} from "@/types/fee";

function AdminFeesContent() {
  const [calculations, setCalculations] = useState<FeeCalculation[]>([]);
  const [filteredCalculations, setFilteredCalculations] = useState<FeeCalculation[]>([]);
  const [feeStructures, setFeeStructures] = useState<FundFeeStructure[]>([]);
  const [monthlySummaries, setMonthlySummaries] = useState<MonthlyFeeSummary[]>([]);
  const [stats, setStats] = useState<FeeStatsType>({
    totalFeesThisMonth: 0,
    totalFeesThisYear: 0,
    pendingCalculations: 0,
    averageFeeRate: 0,
  });
  const [funds, setFunds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FeeFilters>({});

  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [calculations, filters]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [
        calculationsData,
        structuresData,
        summariesData,
        statsData,
        fundsData,
      ] = await Promise.all([
        feeService.getFeeCalculations(),
        feeService.getFundFeeHistory(),
        feeService.getFeeSummaries(),
        feeService.getFeeStats(),
        supabase.from("funds").select("id, name, code"),
      ]);

      setCalculations(calculationsData);
      setFilteredCalculations(calculationsData);
      setFeeStructures(structuresData);
      setMonthlySummaries(summariesData);
      setStats(statsData);
      if (fundsData.data) setFunds(fundsData.data);
    } catch (error: any) {
      console.error("Error loading fee data:", error);
      toast.error("Failed to load fee data");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...calculations];

    if (filters.status) {
      filtered = filtered.filter((c) => c.status === filters.status);
    }

    if (filters.fund_id) {
      filtered = filtered.filter((c) => c.fund_id === filters.fund_id);
    }

    if (filters.fee_type) {
      filtered = filtered.filter((c) => c.fee_type === filters.fee_type);
    }

    setFilteredCalculations(filtered);
  };

  const handleExport = () => {
    toast.info("Export functionality coming soon");
  };

  return (
    <div className="container max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Fee Management</h1>
          <p className="text-muted-foreground mt-1">
            Track fee calculations, structures, and platform fee collection
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => toast.info("Create fee calculation coming soon")}>
            <Plus className="h-4 w-4 mr-2" />
            New Calculation
          </Button>
        </div>
      </div>

      {/* Stats */}
      <FeeStats stats={stats} />

      {/* Main Content */}
      <Tabs defaultValue="calculations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="calculations">Fee Calculations</TabsTrigger>
          <TabsTrigger value="structures">Fee Structures</TabsTrigger>
          <TabsTrigger value="summary">Monthly Summary</TabsTrigger>
        </TabsList>

        {/* Fee Calculations Tab */}
        <TabsContent value="calculations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Fee Calculations</CardTitle>
              <CardDescription>
                View and manage fee calculations for investors
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by investor..."
                    className="pl-9"
                    disabled
                  />
                </div>

                <Select
                  value={filters.status || "all"}
                  onValueChange={(value) =>
                    setFilters({
                      ...filters,
                      status: value === "all" ? undefined : (value as any),
                    })
                  }
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="posted">Posted</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={filters.fund_id || "all"}
                  onValueChange={(value) =>
                    setFilters({
                      ...filters,
                      fund_id: value === "all" ? undefined : value,
                    })
                  }
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="All Funds" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Funds</SelectItem>
                    {funds.map((fund) => (
                      <SelectItem key={fund.id} value={fund.id}>
                        {fund.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={filters.fee_type || "all"}
                  onValueChange={(value) =>
                    setFilters({
                      ...filters,
                      fee_type: value === "all" ? undefined : value,
                    })
                  }
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="management">Management</SelectItem>
                    <SelectItem value="performance">Performance</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : (
                <FeeCalculationsTable
                  calculations={filteredCalculations}
                  onRefresh={loadAllData}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fee Structures Tab */}
        <TabsContent value="structures" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Fee Structures</CardTitle>
              <CardDescription>
                Historical and scheduled fee structures for all funds
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : (
                <FeeStructuresTable structures={feeStructures} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Monthly Summary Tab */}
        <TabsContent value="summary" className="space-y-4">
          <MonthlyFeeSummaryChart summaries={monthlySummaries} />

          <Card>
            <CardHeader>
              <CardTitle>Monthly Fee Summary</CardTitle>
              <CardDescription>
                Aggregated fee collection by month
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {monthlySummaries.map((summary) => (
                  <div
                    key={summary.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="font-medium">
                        {new Date(summary.summary_month).toLocaleDateString("en-US", {
                          month: "long",
                          year: "numeric",
                        })}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {summary.investor_count} investors • {summary.asset_code}
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <div className="text-sm text-muted-foreground">
                        Gross: ${Number(summary.total_gross_yield).toLocaleString()}
                      </div>
                      <div className="text-sm font-medium text-destructive">
                        Fees: ${Number(summary.total_fees_collected).toLocaleString()}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Net: ${Number(summary.total_net_yield).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function AdminFeesPage() {
  return (
    <AdminGuard>
      <AdminFeesContent />
    </AdminGuard>
  );
}
