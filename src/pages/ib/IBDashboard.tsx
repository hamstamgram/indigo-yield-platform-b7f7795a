import { Button } from "@/components/ui";
import { Loader2, Coins, Users, TrendingUp, Download, ArrowRight } from "lucide-react";
import { getAssetLogo } from "@/utils/assets";
import { useIBAllocations, useIBReferralsForDashboard, useIBPositions } from "@/hooks/data/shared";
import type { Allocation, FundPosition, ReferralForDashboard } from "@/services/ib/ibService";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

// Format token amount with appropriate decimals
const formatTokenAmount = (val: number, symbol: string) => {
  const decimals =
    symbol.toUpperCase() === "BTC"
      ? 8
      : ["ETH", "SOL", "XRP"].includes(symbol.toUpperCase())
        ? 6
        : 2;

  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: decimals,
  }).format(val);
};

export default function IBDashboard() {
  const navigate = useNavigate();
  const { data: allocations, isLoading: allocationsLoading } = useIBAllocations();
  const { data: referrals, isLoading: referralsLoading } = useIBReferralsForDashboard();
  const { data: positions, isLoading: positionsLoading } = useIBPositions();

  // Calculate totals by asset
  const earningsByAsset: Record<string, number> = {};
  allocations?.forEach((a: Allocation) => {
    const asset = a.fundAsset;
    earningsByAsset[asset] = (earningsByAsset[asset] || 0) + a.ibFeeAmount;
  });

  const totalReferrals = referrals?.length || 0;

  // Position totals by asset
  const positionsByAsset: Record<string, number> = {};
  positions?.forEach((p: FundPosition) => {
    positionsByAsset[p.asset] = (positionsByAsset[p.asset] || 0) + p.currentValue;
  });

  const isLoading = allocationsLoading || referralsLoading || positionsLoading;

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 px-1">
        <div>
          <h1 className="text-4xl font-display font-bold tracking-tight text-white flex items-center gap-3">
            Partner Command
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
            </span>
          </h1>
          <p className="text-slate-400 mt-2 text-lg">
            Monitor your network performance and commission streams
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="glass-panel border-white/10 hover:bg-white/5 text-slate-300"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
        </div>
      ) : (
        <>
          {/* Stats Cards - Glass Blocks */}
          <div className="grid gap-6 md:grid-cols-3">
            {/* Total Earnings */}
            <div className="glass-card rounded-3xl p-6 border border-white/5 bg-gradient-to-br from-indigo-500/10 to-transparent relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-6 opacity-30 group-hover:opacity-50 transition-opacity">
                <div className="p-3 rounded-2xl bg-indigo-500/20 text-indigo-400 blur-sm">
                  <Coins className="h-10 w-10" />
                </div>
              </div>

              <div className="relative z-10">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Coins className="h-4 w-4 text-indigo-400" />
                  Total Earnings
                </h3>

                <div className="space-y-4">
                  {Object.keys(earningsByAsset).length === 0 ? (
                    <p className="text-slate-500 text-sm italic">No earnings yet</p>
                  ) : (
                    <div className="space-y-3">
                      {Object.entries(earningsByAsset).map(([asset, amount]) => (
                        <div key={asset} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-black/40 border border-white/10 flex items-center justify-center p-1">
                              <img
                                src={getAssetLogo(asset)}
                                alt={asset}
                                className="w-full h-full"
                              />
                            </div>
                            <span className="text-sm font-bold text-slate-300">{asset}</span>
                          </div>
                          <span className="text-xl font-mono font-bold text-white tracking-tight">
                            {formatTokenAmount(amount, asset)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Active Referrals */}
            <div
              className="glass-card rounded-3xl p-6 border border-white/5 hover:bg-white/5 transition-all cursor-pointer group"
              onClick={() => navigate("/ib/referrals")}
            >
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Users className="h-4 w-4 text-emerald-400" />
                  Referrals
                </h3>
                <div className="p-2 rounded-full bg-white/5 group-hover:bg-white/10 transition-colors">
                  <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-white" />
                </div>
              </div>

              <div className="text-5xl font-mono font-bold text-white mb-2 group-hover:scale-105 transition-transform origin-left">
                {totalReferrals}
              </div>
              <p className="text-sm text-slate-400">Active investors in your network</p>
            </div>

            {/* Fund Positions */}
            <div className="glass-card rounded-3xl p-6 border border-white/5 bg-emerald-500/5">
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                  Fund Positions
                </h3>
              </div>

              {Object.keys(positionsByAsset).length === 0 ? (
                <p className="text-slate-500 text-sm italic">No active positions</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(positionsByAsset).map(([asset, amount]) => (
                    <div
                      key={asset}
                      className="flex items-center justify-between py-2 border-b border-white/5 last:border-0 last:pb-0"
                    >
                      <div className="flex items-center gap-2">
                        <div className="h-5 w-5 rounded-full bg-black/40 border border-white/10 flex items-center justify-center p-0.5">
                          <img src={getAssetLogo(asset)} alt={asset} className="w-full h-full" />
                        </div>
                        <span className="text-sm font-bold text-slate-300">{asset}</span>
                      </div>
                      <span className="text-lg font-mono font-bold text-white tracking-tight">
                        {formatTokenAmount(amount, asset)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Live Allocations Feed */}
            <div className="glass-panel rounded-3xl border border-white/5 overflow-hidden col-span-2">
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                <h3 className="font-bold text-white text-lg flex items-center gap-2">
                  Recent Allocations
                </h3>
                <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20 animate-pulse">
                  LIVE FEED
                </span>
              </div>

              {!allocations || allocations.length === 0 ? (
                <div className="p-12 text-center text-slate-500 italic">
                  No allocations recorded yet
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {(allocations as Allocation[]).slice(0, 5).map((alloc) => (
                    <div
                      key={alloc.id}
                      className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-xs">
                          {alloc.ibPercentage}%
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-white font-bold">{alloc.fundAsset}</span>
                            <span className="text-xs text-slate-500">•</span>
                            <span className="text-xs text-slate-400">
                              {alloc.source === "from_platform_fees"
                                ? "Platform Fee"
                                : "Yield Share"}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 font-mono mt-0.5">
                            {formatTokenAmount(alloc.sourceNetIncome, alloc.fundAsset)} Base Income
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-bold text-emerald-400 text-lg">
                          +{formatTokenAmount(alloc.ibFeeAmount, alloc.fundAsset)}
                        </p>
                        <p className="text-xs text-slate-500">Commission</p>
                      </div>
                    </div>
                  ))}
                  <div className="p-3 bg-white/[0.02] text-center">
                    <Button
                      variant="link"
                      className="text-xs text-indigo-400 hover:text-indigo-300"
                      onClick={() => navigate("/ib/commissions")}
                    >
                      View Full Ledger
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
