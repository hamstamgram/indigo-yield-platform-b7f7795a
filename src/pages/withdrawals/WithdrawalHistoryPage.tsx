import { useInvestorWithdrawals } from "@/hooks/data/useInvestorWithdrawals";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Filter, Plus } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

export default function WithdrawalHistoryPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: items, isLoading } = useInvestorWithdrawals(searchTerm || undefined);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Withdrawals Request</h1>
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
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
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
                          <h3 className="font-semibold">
                            {(item as any).funds?.name || "Fund"} - {item.fund_class}
                          </h3>
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              item.status === "completed"
                                ? "bg-green-100 text-green-800"
                                : item.status === "approved"
                                  ? "bg-blue-100 text-blue-800"
                                  : item.status === "processing"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : item.status === "rejected"
                                      ? "bg-red-100 text-red-800"
                                      : item.status === "cancelled"
                                        ? "bg-gray-100 text-gray-800"
                                        : "bg-orange-100 text-orange-800"
                            }`}
                          >
                            {item.status.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {item.requested_amount} {item.fund_class} •{" "}
                          {new Date(item.request_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center space-y-4">
              <p className="text-muted-foreground">No withdrawal requests found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
