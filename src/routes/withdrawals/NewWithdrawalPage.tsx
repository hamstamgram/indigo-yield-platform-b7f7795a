import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  WithdrawalRequestForm,
  WithdrawalPosition,
} from "@/components/withdrawal/WithdrawalRequestForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

export default function NewWithdrawalPage() {
  const navigate = useNavigate();

  const { data: positions, isLoading } = useQuery({
    queryKey: ["available-withdrawal-positions"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No user");

      // Get investor_id (One ID: it's the user.id)
      const investorId = user.id;

      // Fetch positions with fund details
      const { data, error } = await supabase
        .from("investor_positions")
        .select(
          `
          fund_id,
          shares,
          current_value,
          funds ( asset )
        `
        )
        .eq("investor_id", investorId)
        .gt("shares", 0);

      if (error) throw error;

      // Token-denominated only - no USD values
      return data.map((pos: any) => ({
        fund_id: pos.fund_id,
        asset_symbol: pos.funds?.asset || "UNKNOWN",
        amount: Number(pos.shares),
      })) as WithdrawalPosition[];
    },
  });

  if (isLoading) {
    return <div className="p-8 text-center">Loading available balance...</div>;
  }

  if (!positions || positions.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center">
          <Button variant="ghost" asChild>
            <Link to="/withdrawals">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to History
            </Link>
          </Button>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              You don't have any active positions to withdraw from.
            </p>
            <Button variant="primary" asChild className="mt-4">
              <Link to="/dashboard">Go to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" asChild>
          <Link to="/withdrawals">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to History
          </Link>
        </Button>
      </div>

      <div className="max-w-3xl mx-auto">
        <WithdrawalRequestForm
          positions={positions}
          onSuccess={() => navigate("/withdrawals")}
          onCancel={() => navigate("/withdrawals")}
        />
      </div>
    </div>
  );
}
