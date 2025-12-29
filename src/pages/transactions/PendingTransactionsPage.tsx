import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Filter } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { usePendingTransactions } from "@/hooks/data/investor";

export default function PendingTransactionsPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: items, isLoading } = usePendingTransactions(searchTerm || undefined);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pending Transactions</h1>
          <p className="text-muted-foreground">View pending deposits and withdrawals</p>
        </div>
        <Button asChild variant="outline">
          <Link to="/withdrawals/new">Request Withdrawal</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search pending..."
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
                      <div>
                        <h3 className="font-semibold">
                          {item.type} - {item.asset}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {new Date(item.created_at).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">{item.note}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-medium">
                          {item.amount} {item.asset}
                        </p>
                        <Button variant="outline" size="sm" asChild className="mt-2">
                          <Link to={`/transactions/pending/${item.type.toLowerCase()}/${item.id}`}>
                            View Details
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center space-y-4">
              <p className="text-muted-foreground">No pending transactions found</p>
              <Button asChild variant="outline">
                <Link to="/withdrawals/new">Request Withdrawal</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
