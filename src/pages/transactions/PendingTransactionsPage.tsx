import { Card, CardContent, CardHeader, Button, Input } from "@/components/ui";
import { Search, Filter } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { usePendingTransactions } from "@/hooks/data/investor";
import { CryptoIcon } from "@/components/CryptoIcons";

export default function PendingTransactionsPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: items, isLoading } = usePendingTransactions(searchTerm || undefined);

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-white tracking-tight">
            Pending Transactions
          </h1>
          <p className="text-indigo-200/60 font-light">View pending deposits and withdrawals</p>
        </div>
        <Button
          asChild
          variant="default"
          className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 rounded-xl"
        >
          <Link to="/withdrawals/new">Request Withdrawal</Link>
        </Button>
      </div>

      <div className="glass-panel p-1 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl">
        <div className="p-4 border-b border-white/10 flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-400" />
            <Input
              placeholder="Search pending..."
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

        <div className="p-4">
          {isLoading ? (
            <div className="py-12 text-center text-indigo-200/50">Loading...</div>
          ) : items && items.length > 0 ? (
            <div className="space-y-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="p-6 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-white flex items-center gap-2">
                        {item.type} <span className="text-indigo-400">•</span>{" "}
                        <CryptoIcon symbol={item.asset} className="h-4 w-4" />
                      </h3>
                      <p className="text-sm text-indigo-200/60 mt-1">
                        {new Date(item.created_at).toLocaleDateString()}
                      </p>
                      {item.note && (
                        <p className="text-xs text-indigo-200/40 mt-1 italic">{item.note}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="flex items-center justify-end gap-2 font-mono font-medium text-lg text-white">
                        {item.amount} <CryptoIcon symbol={item.asset} className="h-4 w-4" />
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="mt-2 border-white/10 text-indigo-200 hover:text-white hover:bg-white/10 rounded-lg"
                      >
                        <Link to={`/transactions/pending/${item.type.toLowerCase()}/${item.id}`}>
                          View Details
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center space-y-4">
              <p className="text-indigo-200/50">No pending transactions found</p>
              <Button
                asChild
                variant="outline"
                className="border-white/10 text-indigo-200 hover:text-white hover:bg-white/10"
              >
                <Link to="/withdrawals/new">Request Withdrawal</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
