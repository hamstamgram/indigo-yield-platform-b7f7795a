import { useState } from "react";
import {
  Button,
  Input,
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  PageLoadingSpinner,
  ResponsiveTable,
  EmptyState,
  SortableTableHead,
} from "@/components/ui";
import { Search, Receipt, Filter, Download } from "lucide-react";
import { Link } from "react-router-dom";
import { formatAssetAmount } from "@/utils/assets";
import { format } from "date-fns";
import { useInvestorTransactionAssets, useInvestorTransactionsList } from "@/hooks/data";
import { useSortableColumns } from "@/hooks";
import { cn } from "@/lib/utils";
import { CryptoIcon } from "@/components/CryptoIcons";

const TRANSACTION_TYPES = [
  { value: "all", label: "All Types" },
  { value: "DEPOSIT", label: "Deposit" },
  { value: "WITHDRAWAL", label: "Withdrawal" },
  { value: "INTEREST", label: "Interest" },
  { value: "YIELD", label: "Yield" },
  { value: "FEE", label: "Fee" },
  { value: "ADJUSTMENT", label: "Adjustment" },
];

export default function InvestorTransactionsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [assetFilter, setAssetFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const { data: assets } = useInvestorTransactionAssets();
  const { data: items, isLoading } = useInvestorTransactionsList(
    searchTerm,
    assetFilter,
    typeFilter
  );

  const { sortConfig, requestSort, sortedData } = useSortableColumns(items || [], {
    column: "tx_date",
    direction: "desc",
  });

  const columns = [
    {
      header: (
        <SortableTableHead column="type" currentSort={sortConfig} onSort={requestSort}>
          Type
        </SortableTableHead>
      ),
      cell: (item: Record<string, unknown>) => (
        <Badge
          variant="outline"
          className={cn(
            "capitalize font-mono tracking-wider",
            item.type === "DEPOSIT" || item.type === "YIELD"
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              : item.type === "WITHDRAWAL"
                ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
          )}
        >
          {String(item.type || "transaction")
            .replace(/_/g, " ")
            .toLowerCase()}
        </Badge>
      ),
    },
    {
      header: (
        <SortableTableHead column="tx_date" currentSort={sortConfig} onSort={requestSort}>
          Date
        </SortableTableHead>
      ),
      cell: (item: Record<string, unknown>) => (
        <span className="text-sm text-slate-400 font-mono">
          {format(new Date(String(item.tx_date || item.created_at)), "MMM d, yyyy")}
        </span>
      ),
    },
    {
      header: "Asset",
      cell: (item: Record<string, unknown>) => (
        <div className="flex items-center gap-2">
          <CryptoIcon symbol={String(item.asset)} className="h-5 w-5" />
          <span className="font-bold text-white">{String(item.asset)}</span>
        </div>
      ),
    },
    {
      header: (
        <SortableTableHead column="amount" currentSort={sortConfig} onSort={requestSort}>
          Amount
        </SortableTableHead>
      ),
      cell: (item: Record<string, unknown>) => {
        const amount = Number(item.amount);
        return (
          <span
            className={cn(
              "font-mono font-bold text-lg",
              amount >= 0 ? "text-emerald-400" : "text-rose-400"
            )}
          >
            {amount >= 0 ? "+" : ""}
            {formatAssetAmount(amount, String(item.asset))}
          </span>
        );
      },
    },
    {
      header: "Status",
      cell: (item: Record<string, unknown>) => {
        const status = String(item.status || "completed").toLowerCase();
        const isPending = status === "pending" || status === "processing";
        return (
          <span
            className={cn(
              "flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider",
              isPending ? "text-amber-500" : "text-emerald-500"
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                isPending ? "bg-amber-500" : "bg-emerald-500",
                !isPending && "shadow-[0_0_8px_rgba(16,185,129,0.5)]",
                isPending && "shadow-[0_0_8px_rgba(245,158,11,0.5)]"
              )}
            />
            {status === "completed"
              ? "Completed"
              : status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
        );
      },
    },
    {
      header: "Actions",
      cell: (item: Record<string, unknown>) => (
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="text-indigo-400 hover:text-white hover:bg-white/5"
        >
          <Link to={`/investor/transactions/${item.id}`}>View Details</Link>
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto pb-20 animate-fade-in px-1">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-display font-bold tracking-tight text-white flex items-center gap-3">
            Transactions
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
            </span>
          </h1>
          <p className="text-slate-400 mt-2 text-lg">
            Search and filter your complete yield history
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="glass-panel border-white/10 hover:bg-white/5 text-slate-300"
            onClick={() => {
              if (!sortedData?.length) return;
              const headers = ["Type", "Date", "Asset", "Amount", "Status"];
              const rows = sortedData.map((item) => [
                String(item.type || ""),
                String(item.tx_date || item.created_at || ""),
                String(item.asset || ""),
                String(item.amount ?? ""),
                "completed",
              ]);
              const csv = [headers, ...rows]
                .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
                .join("\n");
              const blob = new Blob([csv], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `transactions-${format(new Date(), "yyyy-MM-dd")}.csv`;
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

      <div className="glass-panel rounded-3xl border border-white/5 p-6 space-y-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Search by ID, amount check..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-10 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-indigo-500/50 focus:ring-indigo-500/20 transition-all rounded-xl"
            />
          </div>

          <div className="flex gap-3">
            {/* Asset Filter */}
            <Select value={assetFilter} onValueChange={setAssetFilter}>
              <SelectTrigger className="w-full sm:w-40 h-10 bg-white/5 border-white/10 text-white rounded-xl focus:ring-indigo-500/20">
                <SelectValue placeholder="Asset" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Assets</SelectItem>
                {assets?.map((asset) => (
                  <SelectItem key={asset} value={asset}>
                    {asset}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Type Filter */}
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-40 h-10 bg-white/5 border-white/10 text-white rounded-xl focus:ring-indigo-500/20">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                {TRANSACTION_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="rounded-2xl border border-white/5 overflow-hidden bg-black/20">
          {isLoading ? (
            <div className="py-12">
              <PageLoadingSpinner />
            </div>
          ) : sortedData && sortedData.length > 0 ? (
            <ResponsiveTable
              data={sortedData}
              columns={columns}
              keyExtractor={(item) => String(item.id)}
            />
          ) : (
            <div className="py-12">
              <EmptyState
                icon={Receipt}
                title="No transactions found"
                description="Try adjusting your filters to find what you're looking for."
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
