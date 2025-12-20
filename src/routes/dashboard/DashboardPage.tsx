import { useInvestorPerformance, usePerAssetStats } from "@/hooks/useInvestorPerformance";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { PerformanceReportTable } from "@/components/investor/reports/PerformanceReportTable";
import { useState } from "react";
import { ReportsApi } from "@/services/api/reportsApi";
import { useToast } from "@/hooks/use-toast";
import { AssetPerformanceCard } from "@/components/shared/AssetPerformanceCard";
import { useNavigate } from "react-router-dom";
import { QuickActionsBar } from "@/components/investor/QuickActionsBar";
import { PortfolioHero } from "@/components/investor/PortfolioHero";

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
  const periodEndDate = latestMonthData[0]?.period?.period_end_date;

  // Build per-asset balances for hero (token-denominated, no USD)
  const assetBalances = assetStats?.assets?.map((a) => ({
    symbol: a.fundName, // Fund name is the asset code (BTC, ETH, etc.)
    balance: a.mtd.endingBalance || 0,
    ytdReturn: a.ytd.rateOfReturn || 0,
  })) || [];

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
    <div className="space-y-6 max-w-6xl mx-auto pb-20 px-4 md:px-6 lg:px-0">
      {/* Header */}
      <section className="space-y-1 pt-2">
        <h1 className="text-2xl md:text-3xl font-display font-bold tracking-tight text-foreground">
          Dashboard
        </h1>
        <p className="text-muted-foreground text-sm md:text-base">
          Your portfolio performance at a glance
        </p>
      </section>

      {/* Portfolio Hero - Shows per-asset balances (token-denominated) */}
      <PortfolioHero
        assetBalances={assetBalances}
        activeFunds={assetStats?.activeFunds || 0}
        lastUpdated={periodEndDate ? new Date(periodEndDate).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric"
        }) : undefined}
        isLoading={isLoadingStats}
        isFinalizedData={true}
      />

      {/* Quick Actions - Mobile scrollable, Desktop grid */}
      <div className="block md:hidden">
        <QuickActionsBar compact />
      </div>
      <div className="hidden md:block">
        <QuickActionsBar />
      </div>

      {/* Per-Asset Position Cards */}
      {!isLoadingStats && assetStats?.assets && assetStats.assets.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-display font-bold tracking-tight">
            My Positions
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
          <Card>
            <CardContent className="p-12 text-center text-muted-foreground">
              Loading performance data...
            </CardContent>
          </Card>
        ) : latestMonthData.length > 0 ? (
          <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
            <PerformanceReportTable 
              data={latestMonthData} 
              onDownload={handleDownload}
              downloadingId={downloadingId}
            />
          </div>
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
