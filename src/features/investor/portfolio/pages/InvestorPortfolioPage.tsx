import { usePerAssetStats, useSortableColumns } from "@/hooks";
import { ResponsiveTable, EmptyState, Button, SortableTableHead } from "@/components/ui";
import { getAssetName, formatInvestorAmount, formatSignedInvestorAmount } from "@/utils/assets";
import { CryptoIcon } from "@/components/CryptoIcons";
import { Wallet, Loader2, Download } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { PageShell } from "@/components/layout/PageShell";

export default function InvestorPortfolioPage() {
  const { data: assetStats, isLoading, dataUpdatedAt } = usePerAssetStats();

  const positions =
    assetStats?.assets?.map((asset) => ({
      fundName: asset.fundName,
      assetSymbol: asset.assetSymbol,
      tokenAmount: asset.mtd.endingBalance || 0,
      mtdChange: asset.mtd.netIncome || 0,
      itdEarned: asset.itd?.netIncome || 0,
      itdReturn: asset.itd?.rateOfReturn || 0,
      lastUpdated: asset.mtd.endingBalance > 0 ? new Date().toISOString() : null,
    })) || [];

  const { sortConfig, requestSort, sortedData } = useSortableColumns(positions, {
    column: "assetSymbol",
    direction: "asc",
  });

  const columns = [
    {
      header: (
        <SortableTableHead column="assetSymbol" currentSort={sortConfig} onSort={requestSort}>
          Asset
        </SortableTableHead>
      ),
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
      header: (
        <SortableTableHead column="tokenAmount" currentSort={sortConfig} onSort={requestSort}>
          Token Amount
        </SortableTableHead>
      ),
      cell: (item: (typeof positions)[0]) => (
        <span className="font-mono font-bold text-lg text-white tracking-tight">
          {formatInvestorAmount(item.tokenAmount, item.assetSymbol)}
        </span>
      ),
    },
    {
      header: (
        <SortableTableHead column="mtdChange" currentSort={sortConfig} onSort={requestSort}>
          MTD Change
        </SortableTableHead>
      ),
      cell: (item: (typeof positions)[0]) => (
        <span
          className={cn(
            "font-mono font-bold px-2 py-1 rounded-md text-sm",
            item.mtdChange > 0.00001
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              : item.mtdChange < -0.00001
                ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                : "text-slate-500"
          )}
        >
          {formatSignedInvestorAmount(item.mtdChange, item.assetSymbol)}
        </span>
      ),
    },
    {
      header: (
        <SortableTableHead column="itdEarned" currentSort={sortConfig} onSort={requestSort}>
          ITD Earned
        </SortableTableHead>
      ),
      cell: (item: (typeof positions)[0]) => (
        <span
          className={cn(
            "font-mono font-bold px-2 py-1 rounded-md text-sm",
            item.itdEarned > 0
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              : item.itdEarned < 0
                ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                : "text-slate-500"
          )}
        >
          {formatSignedInvestorAmount(item.itdEarned, item.assetSymbol)}
        </span>
      ),
    },
    {
      header: (
        <SortableTableHead column="itdReturn" currentSort={sortConfig} onSort={requestSort}>
          ITD Return
        </SortableTableHead>
      ),
      cell: (item: (typeof positions)[0]) => (
        <span
          className={cn(
            "font-mono font-bold text-sm",
            item.itdReturn > 0
              ? "text-emerald-400"
              : item.itdReturn < 0
                ? "text-rose-400"
                : "text-slate-500"
          )}
        >
          {item.itdReturn > 0 ? "+" : ""}
          {item.itdReturn.toFixed(3)}%
        </span>
      ),
    },
    {
      header: "Last Updated",
      cell: () => (
        <span className="text-slate-500 text-xs font-mono uppercase">
          {dataUpdatedAt ? format(new Date(dataUpdatedAt), "MMM d, yyyy") : "-"}
        </span>
      ),
    },
  ];

  return (
    <PageShell>
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 px-1">
        <div>
          <h1 className="text-2xl font-display font-bold tracking-tight text-white flex items-center gap-3">
            Portfolio
          </h1>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="glass-panel border-white/10 hover:bg-white/5 text-slate-300"
            onClick={() => {
              if (!sortedData?.length) return;
              const headers = [
                "Asset",
                "Token Amount",
                "MTD Change",
                "ITD Earned",
                "ITD Return (%)",
              ];
              const rows = sortedData.map((item) => [
                item.assetSymbol,
                String(item.tokenAmount),
                String(item.mtdChange),
                String(item.itdEarned),
                String(item.itdReturn.toFixed(3)),
              ]);
              const csv = [headers, ...rows]
                .map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(","))
                .join("\n");
              const blob = new Blob([csv], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `portfolio-${format(new Date(), "yyyy-MM-dd")}.csv`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            disabled={!sortedData?.length}
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
          <h2 className="font-bold text-white flex items-center gap-2">
            <Wallet className="h-5 w-5 text-indigo-400" />
            All Positions
          </h2>
          <span className="text-xs font-mono text-slate-500 bg-black/20 px-2 py-1 rounded-md border border-white/5">
            {positions.length} ASSETS
            {assetStats?.periodEndDate && (
              <>
                {" "}
                &middot; as of{" "}
                {new Date(assetStats.periodEndDate).toLocaleDateString("en-US", {
                  month: "short",
                  year: "numeric",
                })}
              </>
            )}
          </span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
          </div>
        ) : sortedData.length > 0 ? (
          <div className="p-2">
            <ResponsiveTable
              data={sortedData}
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
    </PageShell>
  );
}
