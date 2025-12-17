import { useInvestorPerformance, usePerAssetStats } from "@/hooks/useInvestorPerformance";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Coins } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { PerformanceReportTable } from "@/components/investor/reports/PerformanceReportTable";
import { useState } from "react";
import { ReportsApi } from "@/services/api/reportsApi";
import { useToast } from "@/hooks/use-toast";
import { AssetPerformanceCard } from "@/components/shared/AssetPerformanceCard";
import { useNavigate } from "react-router-dom";

export default function DashboardPage() {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Fetch performance data
  const { data: performanceHistory, isLoading: isLoadingPerf } = useInvestorPerformance();
  const { data: assetStats, isLoading: isLoadingStats } = usePerAssetStats();

  // Filter for "Latest Month" for the dashboard view
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

      {/* Active Funds Count Card */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="dashboard-card border-l-4 border-l-green-500 bg-card shadow-sm">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                  Active Positions
                </p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-4xl font-mono font-bold text-green-600">
                    {isLoadingStats ? "..." : assetStats?.activeFunds || 0}
                  </span>
                  <span className="text-sm font-bold text-muted-foreground">
                    FUNDS
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

      {/* Per-Asset Position Cards */}
      {!isLoadingStats && assetStats?.assets && assetStats.assets.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-display font-bold tracking-tight">
            My Positions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assetStats.assets.map((asset) => (
              <AssetPerformanceCard
                key={asset.fundName}
                data={asset}
                compact
                onClick={() => navigate(`/funds/${asset.fundName}`)}
              />
            ))}
          </div>
        </section>
      )}

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
