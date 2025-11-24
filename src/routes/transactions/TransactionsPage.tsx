import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Filter, Receipt } from "lucide-react"; // Added Receipt icon
import { Link } from "react-router-dom";
import { useState } from "react";
import { ResponsiveTable } from "@/components/ui/responsive-table"; // Import
import { EmptyState } from "@/components/ui/empty-state"; // Import
import { Badge } from "@/components/ui/badge"; // Import Badge for status

export default function TransactionsPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: items, isLoading } = useQuery({
    queryKey: ["transactions", searchTerm],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No user");

      let query = supabase.from("transactions").select("*").eq("user_id", user.id);

      if (searchTerm) {
        query = query.ilike("note", `%${searchTerm}%`);
      }

      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

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
      cell: (item: any) => new Date(item.created_at).toLocaleDateString(),
    },
    {
      header: "Amount",
      cell: (item: any) => (
        <span
          className={item.amount > 0 ? "text-green-600 font-mono" : "text-foreground font-mono"}
        >
          {item.amount} {item.asset_code}
        </span>
      ),
    },
    {
      header: "Status",
      cell: (item: any) => (
        <Badge
          variant={item.status === "completed" ? "default" : "secondary"}
          className={item.status === "completed" ? "bg-green-600" : ""}
        >
          {item.status}
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
      {" "}
      {/* Added padding */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Transactions</h1>
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
