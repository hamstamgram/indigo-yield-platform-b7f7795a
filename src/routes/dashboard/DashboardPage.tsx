import { useInvestorPerformance, usePortfolioStats } from "@/hooks/useInvestorPerformance";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Calendar, Coins } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { PerformanceReportTable } from "@/components/investor/reports/PerformanceReportTable";
import { format } from "date-fns";
import { useState } from "react";
import { ReportsApi } from "@/services/api/reportsApi";
import { useToast } from "@/hooks/use-toast";

export default function DashboardPage() {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch new data sources
  const { data: performanceHistory, isLoading: isLoadingPerf } = useInvestorPerformance();
  const { data: stats, isLoading: isLoadingStats } = usePortfolioStats();

  // Filter for "Latest Month" for the dashboard view
  // We assume the API returns data sorted by date descending
  // We want to show the top record for EACH unique fund in the latest period
  
  const latestPeriodId = performanceHistory?.[0]?.period_id;
  const latestMonthData = performanceHistory?.filter(
    (r) => r.period_id === latestPeriodId
  ) || [];

  const periodName = latestMonthData[0]?.period?.period_name || "Current Period";

  const handleDownload = async (record: any) => {
    try {
      setDownloadingId(record.id);

      const dateStr = record.period?.period_end_date;
      if (!dateStr) throw new Error("Missing period date");

      const date = new Date(dateStr);
      const year = date.getFullYear();
      const month = date.getMonth();

      const startDate = new Date(year, month, 1).toISOString();
      const endDate = new Date(year, month + 1, 0).toISOString();

      const result = await ReportsApi.generateReportNow({
        reportType: "monthly_statement",
        format: "pdf",
        filters: {
          dateFrom: startDate,
          dateTo: endDate,
          asset: record.fund_name,
        },
        parameters: {
          includeCharts: true,
          confidential: true,
        },
      });

      if (!result.success || !result.data) {
        throw new Error(result.error || "Failed to generate PDF");
      }

      const blob = new Blob([result.data as any], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename || `Statement_${record.fund_name}_${year}_${month + 1}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success",
        description: "Statement downloaded successfully",
      });
    } catch (error) {
      console.error("Download failed:", error);
      toast({
        title: "Error",
        description: "Failed to download statement",
        variant: "destructive",
      });
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-20 p-4 md:p-0">
      <section className="space-y-2">
        <h1 className="text-2xl font-display font-bold tracking-tight text-foreground">
          Performance
        </h1>
        <p className="text-muted-foreground">Capital Account Summary</p>
      </section>

      {/* Stats Cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="dashboard-card border-l-4 border-l-primary bg-card shadow-sm">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                  Total Yield (YTD)
                </p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-4xl font-mono font-bold text-primary">
                    {isLoadingStats ? "..." : stats?.totalYtdYield.toFixed(4)}
                  </span>
                  <span className="text-sm font-bold text-muted-foreground">
                    AGGREGATED
                  </span>
                </div>
              </div>
              <div className="p-2 bg-primary/10 rounded-full">
                <Clock className="h-6 w-6 text-primary" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Total accumulated earnings across all active funds this year.
            </p>
          </CardContent>
        </Card>

        <Card className="dashboard-card border-l-4 border-l-green-500 bg-card shadow-sm">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                  Funds Active
                </p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-4xl font-mono font-bold text-green-600">
                    {isLoadingStats ? "..." : stats?.activeFunds}
                  </span>
                  <span className="text-sm font-bold text-muted-foreground">
                    ASSETS
                  </span>
                </div>
              </div>
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-full">
                <Coins className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Number of active fund positions in your portfolio.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Main Performance Table */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-display font-bold tracking-tight">
            Latest Report: {periodName}
          </h2>
        </div>

        {isLoadingPerf ? (
          <div className="p-12 text-center text-muted-foreground border rounded-lg bg-muted/5">
            Loading performance data...
          </div>
        ) : latestMonthData.length > 0 ? (
          <PerformanceReportTable 
            data={latestMonthData} 
            onDownload={handleDownload}
            downloadingId={downloadingId}
          />
        ) : (
          <EmptyState
            icon={Calendar}
            title="No Reports Yet"
            description="Your first performance report will appear here at the end of the month."
          />
        )}
      </section>
    </div>
  );
}