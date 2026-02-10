import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  Button,
  Input,
  Badge,
  ResponsiveTable,
  EmptyState,
} from "@/components/ui";
import { Search, Filter, Receipt } from "lucide-react";
import { CryptoIcon } from "@/components/CryptoIcons";
import { useInvestorTransactionsList } from "@/hooks/data";

export default function TransactionsPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: items, isLoading } = useInvestorTransactionsList(searchTerm || undefined);

  const columns = [
    {
      header: "Type",
      cell: (item: any) => (
        <span className="font-medium capitalize">
          {item.type?.replace(/_/g, " ") || "Transaction"}
        </span>
      ),
    },
    {
      header: "Date",
      cell: (item: any) => new Date(item.tx_date || item.created_at).toLocaleDateString(),
    },
    {
      header: "Amount",
      cell: (item: any) => (
        <div className="flex items-center gap-1.5">
          <span
            className={item.amount > 0 ? "text-emerald-400 font-mono" : "text-foreground font-mono"}
          >
            {item.amount}
          </span>
          <CryptoIcon symbol={item.asset} className="h-4 w-4" />
        </div>
      ),
    },
    {
      header: "Status",
      cell: (item: any) => (
        <Badge variant="default" className="bg-green-600">
          Completed
        </Badge>
      ),
    },
    {
      header: "Actions",
      cell: (item: any) => (
        <Button variant="outline" size="sm" asChild>
          <Link to={`/transactions/${item.id}`}>View</Link>
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-8 p-4 md:p-8 animate-fade-in-up">
      {/* Background Decoration */}
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 blur-[100px] pointer-events-none -z-10 rounded-full" />

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-display font-bold text-white tracking-tight">
            Transaction History
          </h1>
          <p className="text-indigo-200/60 font-light">View your complete transaction history</p>
        </div>
      </div>

      <div className="glass-panel p-1 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl">
        <div className="p-4 border-b border-white/10 flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-400" />
            <Input
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-indigo-200/40 focus:ring-indigo-500/50"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            className="border-white/10 bg-white/5 text-indigo-200 hover:bg-white/10 hover:text-white"
          >
            <Filter className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-0">
          {isLoading ? (
            <div className="py-24 text-center">
              <div className="inline-block p-4 rounded-full bg-indigo-500/10 mb-4 animate-pulse">
                <Receipt className="h-8 w-8 text-indigo-400 opacity-50" />
              </div>
              <p className="text-indigo-200/50">Loading transactions...</p>
            </div>
          ) : items && items.length > 0 ? (
            <ResponsiveTable data={items} columns={columns} keyExtractor={(item) => item.id} />
          ) : (
            <EmptyState
              icon={Receipt}
              title="No transactions found"
              description="You haven't made any transactions yet, or no transactions match your search."
              className="py-12"
            />
          )}
        </div>
      </div>
    </div>
  );
}
