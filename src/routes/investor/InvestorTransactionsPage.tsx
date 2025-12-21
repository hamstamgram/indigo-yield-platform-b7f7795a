import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Receipt } from "lucide-react";
import { PageLoadingSpinner } from "@/components/ui/loading-spinner";
import { Link } from "react-router-dom";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { formatAssetAmount } from "@/utils/assets";
import PageHeader from "@/components/layout/PageHeader";
import { format } from "date-fns";

const TRANSACTION_TYPES = [
  { value: "all", label: "All Types" },
  { value: "DEPOSIT", label: "Deposit" },
  { value: "INTEREST", label: "Interest" },
  { value: "REDEMPTION", label: "Redemption" },
  { value: "FEE", label: "Fee" },
  { value: "WITHDRAWAL", label: "Withdrawal" },
];

export default function InvestorTransactionsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [assetFilter, setAssetFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  // Fetch available assets for filter
  const { data: assets } = useQuery({
    queryKey: ["transaction-assets"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data } = await supabase
        .from("transactions_v2")
        .select("asset")
        .eq("investor_id", user.id)
        .eq("visibility_scope", "investor_visible");

      const uniqueAssets = new Set<string>();
      data?.forEach((d) => {
        if (d.asset) uniqueAssets.add(d.asset);
      });
      return Array.from(uniqueAssets).sort();
    },
  });

  // Fetch transactions with filters
  const { data: items, isLoading } = useQuery({
    queryKey: ["investor-transactions", searchTerm, assetFilter, typeFilter],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user");

      let query = supabase
        .from("transactions_v2")
        .select("*")
        .eq("investor_id", user.id)
        .eq("visibility_scope", "investor_visible");

      if (searchTerm) {
        query = query.or(`asset.ilike.%${searchTerm}%,notes.ilike.%${searchTerm}%`);
      }

      if (assetFilter !== "all") {
        query = query.eq("asset", assetFilter);
      }

      if (typeFilter !== "all") {
        query = query.eq("type", typeFilter as any);
      }

      const { data, error } = await query
        .order("tx_date", { ascending: false })
        .order("id", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

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
