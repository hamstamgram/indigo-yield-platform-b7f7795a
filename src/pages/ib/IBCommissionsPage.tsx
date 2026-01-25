import { useState, useMemo } from "react";
import {
  Button,
  Input,
  Badge,
  PageLoadingSpinner,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import { formatAssetAmount } from "@/utils/assets";
import { format } from "date-fns";
import { Coins, Download, ChevronLeft, ChevronRight, Search, Filter } from "lucide-react";
import { useIBCommissions } from "@/hooks/data/shared";
import { CryptoIcon } from "@/components/CryptoIcons";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

export default function IBCommissionsPage() {
  const [page, setPage] = useState(0);
  const [assetFilter, setAssetFilter] = useState<string>("all");
  const [investorSearch, setInvestorSearch] = useState("");
  const [dateRange, setDateRange] = useState<string>("all");

  const { data, isLoading } = useIBCommissions(page, dateRange, PAGE_SIZE);

  // Client-side filtering
  const filteredCommissions = useMemo(() => {
    if (!data?.commissions) return [];

    return data.commissions.filter((c) => {
      if (assetFilter !== "all" && c.asset !== assetFilter) return false;
      if (investorSearch) {
        const search = investorSearch.toLowerCase();
        if (!c.investorName.toLowerCase().includes(search)) return false;
      }
      return true;
    });
  }, [data?.commissions, assetFilter, investorSearch]);

  // Export to CSV
  const exportCSV = () => {
    if (!filteredCommissions.length) return;

    const headers = [
      "Date",
      "Period Start",
      "Period End",
      "Fund",
      "Asset",
      "Investor",
      "Source Net Income",
      "IB Rate (%)",
      "Commission",
    ];

    const rows = filteredCommissions.map((c) => [
      c.effectiveDate,
      c.periodStart || "",
      c.periodEnd || "",
      c.fundName,
      c.asset,
      c.investorName,
      c.sourceNetIncome.toString(),
      c.ibPercentage.toString(),
      c.ibFeeAmount.toString(),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((r) => r.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `ib-commissions-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
  };

  const totalPages = Math.ceil((data?.total || 0) / PAGE_SIZE);

  // Calculate totals by asset
  const totalsByAsset = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const c of filteredCommissions) {
      if (!totals[c.asset]) totals[c.asset] = 0;
      totals[c.asset] += c.ibFeeAmount;
    }
    return totals;
  }, [filteredCommissions]);

  if (isLoading) {
    return <PageLoadingSpinner />;
  }

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight text-white flex items-center gap-3">
            Commission Ledger
            <Badge
              variant="outline"
              className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
            >
              {data?.total || 0} Records
            </Badge>
          </h1>
          <p className="text-slate-400 text-lg mt-1">
            Detailed view of all your earned commissions
          </p>
        </div>
        <Button
          onClick={exportCSV}
          disabled={!filteredCommissions.length}
          className="glass-panel border-white/10 hover:bg-white/5 text-slate-300"
          variant="outline"
        >
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="glass-panel rounded-2xl p-4 border border-white/5 bg-white/[0.02]">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2 text-slate-500 text-sm font-bold uppercase tracking-wider mr-2">
            <Filter className="h-4 w-4" />
            Filters
          </div>

          <div className="w-48">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="bg-black/20 border-white/10 text-white focus:ring-0 rounded-xl h-10">
                <SelectValue placeholder="Time period" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10 text-white">
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="1m">Last Month</SelectItem>
                <SelectItem value="3m">Last 3 Months</SelectItem>
                <SelectItem value="6m">Last 6 Months</SelectItem>
                <SelectItem value="1y">Last Year</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="w-40">
            <Select value={assetFilter} onValueChange={setAssetFilter}>
              <SelectTrigger className="bg-black/20 border-white/10 text-white focus:ring-0 rounded-xl h-10">
                <SelectValue placeholder="Asset" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10 text-white">
                <SelectItem value="all">All Assets</SelectItem>
                {data?.assets.map((asset) => (
                  <SelectItem key={asset} value={asset}>
                    {asset}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              placeholder="Search by investor name..."
              value={investorSearch}
              onChange={(e) => setInvestorSearch(e.target.value)}
              className="pl-9 bg-black/20 border-white/10 text-white placeholder:text-slate-500 focus:border-indigo-500/50 focus:ring-0 rounded-xl h-10"
            />
          </div>
        </div>
      </div>

      {/* Totals Summary */}
      {Object.keys(totalsByAsset).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(totalsByAsset).map(([asset, total]) => (
            <div
              key={asset}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20"
            >
              <span className="text-xs font-bold text-emerald-400 uppercase">Total {asset}</span>
              <span className="text-sm font-mono font-bold text-emerald-300">
                {formatAssetAmount(total, asset)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Commissions Table */}
      <div className="glass-panel rounded-3xl border border-white/5 bg-white/[0.02] overflow-hidden min-h-[400px]">
        {filteredCommissions.length > 0 ? (
          <div className="overflow-x-auto">
            {/* Header */}
            <div className="grid grid-cols-12 gap-4 p-4 text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-white/5 bg-black/20 min-w-[800px]">
              <div className="col-span-2 pl-2">Date</div>
              <div className="col-span-3">Details</div>
              <div className="col-span-2">Investor</div>
              <div className="col-span-2 text-right">Source Income</div>
              <div className="col-span-1 text-right">Rate</div>
              <div className="col-span-2 text-right pr-4">Commission</div>
            </div>

            <div className="divide-y divide-white/5 min-w-[800px]">
              {filteredCommissions.map((comm) => (
                <div
                  key={comm.id}
                  className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-white/5 transition-colors"
                >
                  <div className="col-span-2 pl-2">
                    <div className="font-bold text-slate-300">
                      {format(new Date(comm.effectiveDate), "MMM d, yyyy")}
                    </div>
                    {comm.periodStart && (
                      <div className="text-xs text-slate-500 mt-0.5">
                        {format(new Date(comm.periodStart), "MMM d")} -{" "}
                        {format(new Date(comm.periodEnd!), "MMM d")}
                      </div>
                    )}
                  </div>

                  <div className="col-span-3">
                    <div className="flex items-center gap-2">
                      {/* Assuming CryptoIcon handles icon logic, wrapping for styling */}
                      <div className="h-6 w-6 rounded-full bg-black/40 flex items-center justify-center">
                        <CryptoIcon symbol={comm.asset} className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-medium text-slate-300">{comm.fundName}</span>
                    </div>
                  </div>

                  <div className="col-span-2 text-sm text-slate-400 font-medium">
                    {comm.investorName}
                  </div>

                  <div className="col-span-2 text-right font-mono text-slate-500 text-sm">
                    {formatAssetAmount(comm.sourceNetIncome, comm.asset)}
                  </div>

                  <div className="col-span-1 text-right">
                    <Badge
                      variant="outline"
                      className="bg-slate-500/10 text-slate-400 border-slate-500/20 font-mono text-xs"
                    >
                      {comm.ibPercentage.toFixed(2)}%
                    </Badge>
                  </div>

                  <div className="col-span-2 text-right pr-4">
                    <div className="font-mono font-bold text-emerald-400">
                      {formatAssetAmount(comm.ibFeeAmount, comm.asset)}
                    </div>
                    <div className="text-[10px] text-slate-600 uppercase mt-0.5 font-bold tracking-wider">
                      {comm.payoutStatus === "paid" ? "Paid" : "Pending"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-20 text-center">
            <Search className="h-10 w-10 text-slate-700 mb-4" />
            <p className="text-slate-400 text-lg">No commissions found</p>
            <p className="text-slate-600">Try adjusting your filters</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-white/5 pt-4">
          <p className="text-sm text-slate-500">
            Page {page + 1} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="glass-panel border-white/10 hover:bg-white/5 text-slate-400"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages - 1}
              className="glass-panel border-white/10 hover:bg-white/5 text-slate-400"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
