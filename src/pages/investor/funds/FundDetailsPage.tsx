import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, EmptyState } from "@/components/ui";
import { PerformanceReportTable } from "@/components/investor/reports/PerformanceReportTable";
import { useInvestorPerformance, useAssetMeta } from "@/hooks";
import { Loader2, TrendingUp, Info } from "lucide-react";
import { CryptoIcon } from "@/components/CryptoIcons";
import { toNum } from "@/utils/numeric";

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
  const mtdYield = toNum(latestRecord?.mtd_rate_of_return ?? 0);
  const ytdYield = toNum(latestRecord?.ytd_rate_of_return ?? 0);
  const balance = toNum(latestRecord?.mtd_ending_balance ?? 0);

  return (
    <div className="relative w-full p-4 lg:p-8 space-y-8 animate-fade-in-up">
      {/* Background Decoration */}
      <div className="fixed top-0 left-0 w-full h-[50vh] bg-gradient-to-b from-indigo-900/10 to-transparent pointer-events-none -z-10" />
      <div className="fixed top-[-10%] right-[-5%] w-[30%] h-[30%] rounded-full bg-indigo-brand/5 blur-[100px] pointer-events-none -z-10" />

      {/* Immersive Header */}
      <div className="glass-panel p-8 rounded-3xl border border-white/10 relative overflow-hidden flex flex-col md:flex-row items-center gap-8 shadow-2xl">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        <div className="relative group">
          <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full group-hover:bg-indigo-500/30 transition-all duration-500" />
          <div className="h-24 w-24 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center p-4 relative z-10 shadow-lg">
            <CryptoIcon
              symbol={assetCode}
              className="h-full w-full object-contain drop-shadow-md"
            />
          </div>
        </div>

        <div className="text-center md:text-left space-y-2">
          <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight text-white drop-shadow-sm">
            {assetMeta?.name}{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
              Yield Fund
            </span>
          </h1>
          <p className="text-lg text-indigo-200/60 font-light tracking-wide max-w-2xl flex items-center gap-2 justify-center md:justify-start">
            <CryptoIcon symbol={assetCode} className="h-5 w-5 opacity-50" />{" "}
            Strategy • Institutional Grade DeFi Yield
          </p>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <div className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-indigo-200/50 backdrop-blur-md">
            Active Strategy
          </div>
        </div>
      </div>

      {/* KPI Grid - Glass Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-6 rounded-2xl border border-white/10 bg-black/20 hover:bg-white/5 transition-colors group">
          <div className="flex items-start justify-between mb-4">
            <p className="text-xs font-bold text-indigo-200/50 uppercase tracking-widest">
              Current Balance
            </p>
            <div className="p-2 rounded-lg bg-white/5 text-white/40 group-hover:text-white transition-colors">
              <Info className="h-4 w-4" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-3xl font-mono font-bold text-white tracking-tighter">
              {balance.toFixed(4)}
            </p>
            <div className="flex items-center gap-2 text-sm text-indigo-200/40 font-medium">
              <CryptoIcon symbol={assetCode} className="h-4 w-4 opacity-50" />{" "}
              Tokens
            </div>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl border border-white/10 bg-black/20 hover:bg-white/5 transition-colors group relative overflow-hidden">
          {/* Subtle green glow for positive yield */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-yield-neon/5 blur-[50px] -translate-y-1/2 translate-x-1/2 rounded-full" />

          <div className="flex items-start justify-between mb-4 relative z-10">
            <p className="text-xs font-bold text-indigo-200/50 uppercase tracking-widest">
              MTD Yield
            </p>
            <div className="p-2 rounded-lg bg-yield-neon/10 text-yield-neon">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="space-y-1 relative z-10">
            <p className="text-3xl font-mono font-bold text-yield-neon tracking-tighter">
              +{(mtdYield * 100).toFixed(2)}%
            </p>
            <p className="text-sm text-yield-neon/50 font-medium">Month to Date</p>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl border border-white/10 bg-black/20 hover:bg-white/5 transition-colors group relative overflow-hidden">
          {/* Subtle indigo glow for YTD */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-[50px] -translate-y-1/2 translate-x-1/2 rounded-full" />

          <div className="flex items-start justify-between mb-4 relative z-10">
            <p className="text-xs font-bold text-indigo-200/50 uppercase tracking-widest">
              YTD Yield
            </p>
            <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="space-y-1 relative z-10">
            <p className="text-3xl font-mono font-bold text-indigo-400 tracking-tighter">
              +{(ytdYield * 100).toFixed(2)}%
            </p>
            <p className="text-sm text-indigo-400/50 font-medium">Year to Date</p>
          </div>
        </div>
      </div>

      {/* Detailed Breakdown Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xl font-bold text-white tracking-tight">Performance History</h2>
          {/* <Button variant="ghost" size="sm" className="text-indigo-200/50 hover:text-white">View Full Report</Button> */}
        </div>

        <div className="glass-panel rounded-2xl border border-white/10 bg-black/40 overflow-hidden shadow-2xl">
          <div className="p-1">
            {performance && performance.length > 0 ? (
              <PerformanceReportTable data={performance} />
            ) : (
              <div className="p-12 flex flex-col items-center justify-center text-center space-y-4 text-muted-foreground">
                <div className="p-4 rounded-full bg-white/5">
                  <Info className="h-8 w-8 opacity-50" />
                </div>
                <div>
                  <p className="font-medium text-white">No Data Available</p>
                  <p className="text-sm opacity-50">
                    Performance metrics will appear here once available.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
