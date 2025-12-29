import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PerformanceReportTable } from "@/components/investor/reports/PerformanceReportTable";
import { useInvestorPerformance, useAssetMeta } from "@/hooks";
import { Loader2, TrendingUp, Info } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

export default function FundDetailsPage() {
  const { assetId } = useParams();
  const assetCode = assetId?.toUpperCase() || "";

  const { data: performance, isLoading } = useInvestorPerformance(assetCode);
  const { data: assetMeta } = useAssetMeta(assetCode);

  if (isLoading) {
    return (
      <div className="container mx-auto p-8 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const latestRecord = performance?.[0];
  const mtdYield = latestRecord?.mtd_rate_of_return || 0;
  const ytdYield = latestRecord?.ytd_rate_of_return || 0;
  const balance = latestRecord?.mtd_ending_balance || 0;

  return (
    <div className="container mx-auto px-4 py-8 space-y-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 rounded-2xl bg-white border shadow-sm flex items-center justify-center p-2">
          <img 
            src={assetMeta?.logo} 
            alt={assetCode} 
            className="h-full w-full object-contain"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} 
          />
        </div>
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">{assetMeta?.name} Yield Fund</h1>
          <p className="text-muted-foreground">{assetCode} Strategy</p>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Current Balance</p>
            <p className="text-2xl font-mono font-bold mt-1">
              {balance.toFixed(4)} <span className="text-sm text-muted-foreground">{assetCode}</span>
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-6">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">MTD Yield</p>
            <div className="flex items-center gap-2 mt-1">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <p className="text-2xl font-mono font-bold text-green-600">{(mtdYield * 100).toFixed(2)}%</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-6">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">YTD Yield</p>
            <div className="flex items-center gap-2 mt-1">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <p className="text-2xl font-mono font-bold text-blue-600">{(ytdYield * 100).toFixed(2)}%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Breakdown Table */}
      <Card>
        <CardHeader>
          <CardTitle>Composition Breakdown & History</CardTitle>
        </CardHeader>
        <CardContent>
          {performance && performance.length > 0 ? (
            <PerformanceReportTable data={performance} />
          ) : (
            <EmptyState
              icon={Info}
              title="No Data Available"
              description={`You don't have any performance history for ${assetCode} yet.`}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
