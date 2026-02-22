import { useInvestorWithdrawals } from "@/hooks/data";
import { Card, CardContent, CardHeader, Button, Input } from "@/components/ui";
import { Search, Plus, ArrowLeftRight } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { CryptoIcon } from "@/components/CryptoIcons";
import { formatInvestorAmount } from "@/utils/assets";
import type { FundRelation } from "@/types/domains/relations";

export default function WithdrawalHistoryPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: items, isLoading } = useInvestorWithdrawals(searchTerm || undefined);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Withdrawal Requests</h1>
        <Button asChild>
          <Link to="/withdrawals/new">
            <Plus className="mr-2 h-4 w-4" />
            Request Withdrawal
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground">Loading...</div>
          ) : items && items.length > 0 ? (
            <div className="space-y-4">
              {items.map((item) => (
                <Card key={item.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <CryptoIcon symbol={item.fund_class || "ASSET"} className="h-6 w-6" />
                          <h3 className="font-semibold">
                            {((item as { funds?: unknown }).funds as FundRelation | undefined)
                              ?.name || "Fund"}
                          </h3>
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              item.status === "completed"
                                ? "bg-emerald-500/10 text-emerald-400"
                                : item.status === "approved"
                                  ? "bg-blue-500/10 text-blue-400"
                                  : item.status === "processing"
                                    ? "bg-yellow-500/10 text-yellow-400"
                                    : item.status === "rejected"
                                      ? "bg-red-500/10 text-red-400"
                                      : item.status === "cancelled"
                                        ? "bg-slate-500/10 text-slate-400"
                                        : "bg-orange-500/10 text-orange-400"
                            }`}
                          >
                            {item.status.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                          {formatInvestorAmount(item.requested_amount, item.fund_class || "ASSET")}{" "}
                          • {new Date(item.request_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center space-y-4">
              <ArrowLeftRight className="h-10 w-10 text-muted-foreground/40 mx-auto" />
              <div>
                <p className="text-lg font-medium">No withdrawal requests yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  When you submit a withdrawal request, it will appear here with its status.
                </p>
              </div>
              <Button asChild variant="outline" className="mt-2">
                <Link to="/withdrawals/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Request Withdrawal
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
