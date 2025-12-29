import { useState } from "react";
import {
  Card, CardContent, CardHeader, CardTitle,
  Button, Input, Badge,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  PageLoadingSpinner, ResponsiveTable, EmptyState,
} from "@/components/ui";
import { Search, Receipt } from "lucide-react";
import { Link } from "react-router-dom";
import { formatAssetAmount } from "@/utils/assets";
import { PageHeader } from "@/components/layout";
import { format } from "date-fns";
import {
  useInvestorTransactionAssets,
  useInvestorTransactionsList,
} from "@/hooks/data/useInvestorPortal";

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
        <Badge variant="outline" className="capitalize">
          {item.type?.replace(/_/g, " ") || "Transaction"}
        </Badge>
      ),
    },
    {
      header: "Date",
      cell: (item: any) => (
        <span className="text-sm">
          {format(new Date(item.tx_date || item.created_at), "MMM d, yyyy")}
        </span>
      ),
    },
    {
      header: "Asset",
      cell: (item: any) => (
        <span className="font-medium">{item.asset}</span>
      ),
    },
    {
      header: "Amount",
      cell: (item: any) => (
        <span
          className={`font-mono font-medium ${
            item.amount >= 0 ? "text-green-600" : "text-red-600"
          }`}
        >
          {item.amount >= 0 ? "+" : ""}
          {formatAssetAmount(item.amount, item.asset)}
        </span>
      ),
    },
    {
      header: "Status",
      cell: () => (
        <Badge className="bg-green-600 hover:bg-green-700">Completed</Badge>
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
    <div className="space-y-6 max-w-6xl mx-auto pb-20 px-4 md:px-6 lg:px-0">
      <PageHeader
        title="Transactions"
        subtitle="View your transaction history"
        icon={Receipt}
      />

      <Card>
        <CardHeader>
          <CardTitle>Transaction Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Asset Filter */}
            <Select value={assetFilter} onValueChange={setAssetFilter}>
              <SelectTrigger className="w-full sm:w-40">
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
              <SelectTrigger className="w-full sm:w-40">
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
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <PageLoadingSpinner />
          ) : items && items.length > 0 ? (
            <ResponsiveTable
              data={items}
              columns={columns}
              keyExtractor={(item) => item.id}
            />
          ) : (
            <EmptyState
              icon={Receipt}
              title="No transactions found"
              description="You haven't made any transactions yet, or no transactions match your filters."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
