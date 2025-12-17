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
      // V2 Architecture: investor_id = profiles.id directly (One ID)
      const { data, error } = await supabase
        .from("transactions_v2")
        .select(
          `
          *,
        profiles!fk_transactions_v2_profile (
          email,
          first_name,
          last_name
        )
        `
        )
        .order("tx_date", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    },
  });

  const columns = [
    {
      header: "Date",
      cell: (item: any) => new Date(item.tx_date).toLocaleDateString(),
    },
    {
      header: "Type",
      cell: (item: any) => <Badge variant="outline">{item.type}</Badge>,
    },
    {
      header: "Investor",
      cell: (item: any) => {
        // V2: profiles directly linked via investor_id
        const profile = item.profiles;
        return profile
          ? `${profile.first_name || ""} ${profile.last_name || ""} (${profile.email})`
          : "Unknown";
      },
    },
    {
      header: "Amount",
      cell: (item: any) => (
        <span className="font-mono font-medium">
          {item.amount} {item.asset}
        </span>
      ),
    },
    {
      header: "Status",
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
