import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function PendingTransactionDetailsPage() {
  const { type, id } = useParams<{ type: string; id: string }>();

  const { data: item, isLoading } = useQuery({
    queryKey: ["pending-transaction-details", type, id],
    queryFn: async () => {
      if (!id || !type) throw new Error("Missing parameters");

      if (type === "deposit") {
        const { data, error } = await supabase.from("deposits").select("*").eq("id", id).single();
        if (error) throw error;
        const d = data as any;
        return { ...d, asset: d.asset_symbol, type: "DEPOSIT", created_at: d.created_at };
      } else if (type === "withdrawal") {
        const { data, error } = await supabase
          .from("withdrawal_requests")
          .select(
            `
            *,
            funds ( asset )
          `
          )
          .eq("id", id)
          .single();
        if (error) throw error;
        const d = data as any;
        return {
          ...d,
          asset: d.funds?.asset || "Unknown",
          amount: d.requested_amount,
          type: "WITHDRAWAL",
          created_at: d.created_at,
        };
      }
      throw new Error("Invalid transaction type");
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Item not found</p>
          <Button asChild>
            <Link to="/transactions/pending">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Pending
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" asChild>
          <Link to="/transactions/pending">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">{item.type}</CardTitle>
              <CardDescription>
                Created {new Date(item.created_at).toLocaleDateString()}
              </CardDescription>
            </div>
            <Badge variant="outline">{item.status}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground mb-1">ID</p>
              <p className="font-mono text-sm">{item.id}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Amount</p>
              <p className="font-semibold text-lg">
                {item.amount} {item.asset}
              </p>
            </div>
            {item.transaction_hash && (
              <div className="col-span-2">
                <p className="text-sm text-muted-foreground mb-1">Transaction Hash</p>
                <p className="font-mono text-xs break-all">{item.transaction_hash}</p>
              </div>
            )}
            {item.rejection_reason && (
              <div className="col-span-2">
                <p className="text-sm text-muted-foreground mb-1 text-destructive">
                  Rejection Reason
                </p>
                <p className="text-destructive">{item.rejection_reason}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
