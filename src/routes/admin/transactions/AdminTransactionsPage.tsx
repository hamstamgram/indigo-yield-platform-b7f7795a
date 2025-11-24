import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

export default function AdminTransactionsPage() {
  const { data: transactions, isLoading } = useQuery({
    queryKey: ["admin-all-transactions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions_v2")
        .select(
          `
          *,
          investors (
            profiles (
              email,
              first_name,
              last_name
            )
          )
        `
        )
        .order("occurred_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    },
  });

  const columns = [
    {
      header: "Date",
      accessorKey: "occurred_at" as const,
      cell: (item: any) => new Date(item.occurred_at).toLocaleDateString(),
    },
    {
      header: "Type",
      accessorKey: "type" as const,
      cell: (item: any) => <Badge variant="outline">{item.type}</Badge>,
    },
    {
      header: "Investor",
      accessorKey: "investor_id" as const,
      cell: (item: any) => {
        const profile = item.investors?.profiles;
        return profile
          ? `${profile.first_name || ""} ${profile.last_name || ""} (${profile.email})`
          : "Unknown";
      },
    },
    {
      header: "Amount",
      accessorKey: "amount" as const,
      cell: (item: any) => (
        <span className="font-mono font-medium">
          {item.amount} {item.asset}
        </span>
      ),
    },
    {
      header: "Status",
      accessorKey: "status" as const,
      cell: (item: any) => (
        <Badge variant={item.status === "completed" ? "default" : "secondary"}>{item.status}</Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Transactions</h1>
        <p className="text-muted-foreground">
          View and manage all investor transactions (V2 Ledger).
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Global Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ResponsiveTable
              data={transactions || []}
              columns={columns}
              keyExtractor={(item) => item.id}
              emptyMessage="No transactions found in V2 Ledger."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
