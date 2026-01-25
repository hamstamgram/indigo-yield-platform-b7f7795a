import { usePerAssetStats } from "@/hooks";
import { ResponsiveTable, EmptyState, Button } from "@/components/ui";
import { getAssetName, formatAssetAmount, formatSignedAssetAmount } from "@/utils/assets";
import { CryptoIcon } from "@/components/CryptoIcons";
import { Wallet, Loader2, Download, Filter } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function InvestorPortfolioPage() {
  const { data: assetStats, isLoading } = usePerAssetStats();

  const positions =
    assetStats?.assets?.map((asset) => ({
      fundName: asset.fundName,
      assetSymbol: asset.assetSymbol,
      tokenAmount: asset.mtd.endingBalance || 0,
      costBasis: (asset as any).itd?.endingBalance || asset.mtd.endingBalance || 0,
      netChanges: asset.mtd.netIncome || 0,
      lastUpdated: new Date().toISOString(),
    })) || [];

  const columns = [
    {
      header: "Asset",
      cell: (item: (typeof positions)[0]) => (
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center p-2 shadow-inner">
            <CryptoIcon symbol={item.assetSymbol} className="w-full h-full text-white" />
          </div>
          <div>
            <p className="font-bold text-white tracking-tight">{getAssetName(item.assetSymbol)}</p>
            <p className="text-xs text-indigo-300 font-mono tracking-wider">{item.assetSymbol}</p>
          </div>
        </div>
      ),
    },
    {
      header: "Token Amount",
      cell: (item: (typeof positions)[0]) => (
        <span className="font-mono font-bold text-lg text-white tracking-tight">
          {formatAssetAmount(item.tokenAmount, item.assetSymbol)}
        </span>
      ),
    },
    {
      header: "Cost Basis",
      cell: (item: (typeof positions)[0]) => (
        <span className="font-mono text-slate-400 font-medium">
          {formatAssetAmount(item.costBasis, item.assetSymbol)}
        </span>
      ),
    },
    {
      header: "Net Changes (MTD)",
      cell: (item: (typeof positions)[0]) => (
        <span
          className={cn(
            "font-mono font-bold px-2 py-1 rounded-md text-sm",
            item.netChanges >= 0
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
          )}
        >
          {formatSignedAssetAmount(item.netChanges, item.assetSymbol)}
        </span>
      ),
    },
    {
      header: "Last Updated",
      cell: (item: (typeof positions)[0]) => (
        <span className="text-slate-500 text-xs font-mono uppercase">
          {format(new Date(item.lastUpdated), "MMM d, yyyy")}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto pb-20 animate-fade-in">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 px-1">
        <div>
          <h1 className="text-4xl font-display font-bold tracking-tight text-white flex items-center gap-3">
            Portfolio
          </h1>
          <p className="text-slate-400 mt-2 text-lg">Detailed breakdown of your asset positions</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="glass-panel border-white/10 hover:bg-white/5 text-slate-300"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button
            variant="outline"
            className="glass-panel border-white/10 hover:bg-white/5 text-slate-300"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="glass-panel rounded-3xl border border-white/5 overflow-hidden">
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
          <h2 className="font-bold text-white flex items-center gap-2">
            <Wallet className="h-5 w-5 text-indigo-400" />
            All Positions
          </h2>
          <span className="text-xs font-mono text-slate-500 bg-black/20 px-2 py-1 rounded-md border border-white/5">
            {positions.length} ASSETS
          </span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
          </div>
        ) : positions.length > 0 ? (
          <div className="p-2">
            <ResponsiveTable
              data={positions}
              columns={columns}
              keyExtractor={(item) => item.fundName}
            />
          </div>
        ) : (
          <div className="py-20">
            <EmptyState
              icon={Wallet}
              title="No Positions Found"
              description="Your fund positions will appear here once you have active investments."
            />
          </div>
        )}
      </div>
    </div>
  );
}
