import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, Wallet, PieChart, ArrowUpRight } from "lucide-react";

export default function ExpertInvestorDashboard() {
  const { id } = useParams();

  const { data: investor, isLoading } = useQuery({
    queryKey: ["expert-investor", id],
    enabled: !!id,
    queryFn: async () => {
      if (!id) throw new Error("No investor ID provided");
      const { data, error } = await supabase
        .from("investors")
        .select(
          `
          *,
          profiles ( full_name, email, phone ),
          investor_positions (
            shares,
            total_yield_earned,
            status,
            funds ( name, asset_symbol )
          )
        `
        )
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!investor) {
    return <div className="p-6">Investor not found</div>;
  }

  const totalPositions = investor.investor_positions?.length || 0;
  const activePositions =
    investor.investor_positions?.filter((p: any) => p.status === "active").length || 0;

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-display font-bold tracking-tight">
              {investor.profiles?.full_name || "Unknown Investor"}
            </h1>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
              Expert View
            </Badge>
          </div>
          <p className="text-muted-foreground flex items-center gap-2">
            {investor.profiles?.email} • ID:{" "}
            <span className="font-mono text-xs">{investor.id}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Badge
            variant={investor.status === "active" ? "default" : "secondary"}
            className="text-lg py-1 px-4"
          >
            {investor.status.toUpperCase()}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Positions
            </CardTitle>
            <Wallet className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPositions}</div>
            <p className="text-xs text-muted-foreground">{activePositions} Active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">KYC Status</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">{investor.kyc_status}</div>
            <p className="text-xs text-muted-foreground">
              Last updated:{" "}
              {investor.updated_at ? new Date(investor.updated_at).toLocaleDateString() : "N/A"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Risk Profile
            </CardTitle>
            <PieChart className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Balanced</div>
            <p className="text-xs text-muted-foreground">Standard Allocation</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold tracking-tight">Portfolio Holdings</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {investor.investor_positions?.map((position: any, idx: number) => (
            <Card key={idx} className="border-l-4 border-l-primary">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-lg">{position.funds?.name}</h3>
                    <Badge variant="outline" className="mt-1">
                      {position.status}
                    </Badge>
                  </div>
                  <ArrowUpRight className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Shares</span>
                    <span className="font-mono font-medium">
                      {Number(position.shares).toFixed(4)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Yield</span>
                    <span className="font-mono font-medium text-green-600">
                      +{Number(position.total_yield_earned).toFixed(4)}{" "}
                      {position.funds?.asset_symbol}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
