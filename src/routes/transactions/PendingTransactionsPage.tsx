import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Filter } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";

export default function PendingTransactionsPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: items, isLoading } = useQuery({
    queryKey: ["pending-transactions", searchTerm],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No user");

      // 1. Get Pending Deposits
      const { data: deposits, error: depositError } = await supabase
        .from("deposits")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "pending");

      if (depositError) throw depositError;

      // 2. Get Investor ID for Withdrawals (One ID: it's the user.id)
      const investorId = user.id;

      let withdrawals: any[] = [];
      if (investorId) {
        const { data: withdrawalData, error: withdrawalError } = await supabase
          .from("withdrawal_requests")
          .select(
            `
            *,
            funds ( name, code, asset )
          `
          )
          .eq("investor_id", investorId)
          .eq("status", "pending");

        if (withdrawalError) throw withdrawalError;
        withdrawals = withdrawalData || [];
      }

      // 3. Normalize and Merge
      const normalizedDeposits = (deposits || []).map((d) => ({
        id: d.id,
        type: "DEPOSIT",
        amount: d.amount,
        asset: d.asset_symbol,
        created_at: d.created_at,
        status: d.status,
        note: "Pending deposit",
      }));

      const normalizedWithdrawals = withdrawals.map((w) => ({
        id: w.id,
        type: "WITHDRAWAL",
        amount: w.requested_amount,
        asset: w.funds?.asset || "Unknown",
        created_at: w.created_at,
        status: w.status,
        note: `Withdrawal from ${w.funds?.name || "Fund"}`,
      }));

      let allItems = [...normalizedDeposits, ...normalizedWithdrawals];

      // 4. Filter
      if (searchTerm) {
        const lowerSearch = searchTerm.toLowerCase();
        allItems = allItems.filter(
          (item) =>
            item.asset.toLowerCase().includes(lowerSearch) ||
            item.note.toLowerCase().includes(lowerSearch) ||
            item.type.toLowerCase().includes(lowerSearch)
        );
      }

      // 5. Sort
      return allItems.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    },
  });

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
