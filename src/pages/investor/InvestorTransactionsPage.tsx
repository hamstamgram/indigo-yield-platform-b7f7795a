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
} from "@/components/ui";
import { Search, Receipt, Filter, Download } from "lucide-react";
import { Link } from "react-router-dom";
import { formatAssetAmount } from "@/utils/assets";
import { format } from "date-fns";
import { useInvestorTransactionAssets, useInvestorTransactionsList } from "@/hooks/data";
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

  const columns = [
    {
      header: "Type",
      cell: (item: any) => (
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
          {item.type?.replace(/_/g, " ").toLowerCase() || "transaction"}
        </Badge>
      ),
    },
    {
      header: "Date",
      cell: (item: any) => (
        <span className="text-sm text-slate-400 font-mono">
          {format(new Date(item.tx_date || item.created_at), "MMM d, yyyy")}
        </span>
      ),
    },
    {
      header: "Asset",
      cell: (item: any) => (
        <div className="flex items-center gap-2">
          <CryptoIcon symbol={item.asset} className="h-5 w-5" />
          <span className="font-bold text-white">{item.asset}</span>
        </div>
      ),
    },
    {
      header: "Amount",
      cell: (item: any) => (
        <span
          className={cn(
            "font-mono font-bold text-lg",
            item.amount >= 0 ? "text-emerald-400" : "text-rose-400"
          )}
        >
          {item.amount >= 0 ? "+" : ""}
          {formatAssetAmount(item.amount, item.asset)}
        </span>
      ),
    },
    {
      header: "Status",
      cell: (item: any) => {
        const status = (item.status || "completed").toLowerCase();
        const isPending = status === "pending" || status === "processing";
        const color = isPending ? "amber" : "emerald";
        return (
          <span
            className={cn(
              "flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider",
              `text-${color}-500`
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                `bg-${color}-500`,
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
      cell: (item: any) => (
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="text-indigo-400 hover:text-white hover:bg-white/5"
        >
          <Link to={`/transactions/${item.id}`}>View Details</Link>
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
          ) : items && items.length > 0 ? (
            <ResponsiveTable data={items} columns={columns} keyExtractor={(item) => item.id} />
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
