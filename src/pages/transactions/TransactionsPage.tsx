import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Card, CardContent, CardHeader,
  Button, Input, Badge,
  ResponsiveTable, EmptyState,
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
            className={item.amount > 0 ? "text-green-600 font-mono" : "text-foreground font-mono"}
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
    <div className="space-y-6 p-4 md:p-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Transaction History</h1>
          <p className="text-muted-foreground">View your transaction history</p>
        </div>
      </div>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search transactions..."
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
            <ResponsiveTable data={items} columns={columns} keyExtractor={(item) => item.id} />
          ) : (
            <EmptyState
              icon={Receipt}
              title="No transactions found"
              description="You haven't made any transactions yet, or no transactions match your search."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
