import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Layers } from "lucide-react";
import { getAssetLogo } from "@/utils/assets";

export default function PortfolioPage() {
  const { data: positions, isLoading } = useQuery({
    queryKey: ["portfolio-positions"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No user");

      // Resolve investor_id from profile_id
      const { data: investor } = await supabase
        .from("investors")
        .select("id")
        .eq("profile_id", user.id)
        .maybeSingle();

      if (!investor) return [];

      const { data, error } = await (supabase as any)
        .from("investor_positions")
        .select(
          `
          investor_id,
          fund_id,
          shares,
          funds (
            id,
            name,
            asset,
            asset_symbol,
            code
          )
        `
        )
        .eq("investor_id", investor.id);

      if (error) {
        // Fallback if 'investor_positions' view/table issue, try 'positions' table if it was legacy
        // But for now we assume the previous dashboard query worked.
        throw error;
      }
      return data;
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Portfolio</h1>
          <p className="text-muted-foreground">Your active investment positions</p>
        </div>
        {/* Deposit button removed as deposits are disabled */}
      </div>

      {/* Positions Table */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">All Positions</TabsTrigger>
          {/* Removed specific category tabs if we don't have logic to filter them yet */}
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {isLoading ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Loading positions...</p>
              </CardContent>
            </Card>
          ) : positions && positions.length > 0 ? (
            <div className="space-y-4">
              {positions.map((position: any) => {
                // Use funds relation if available, otherwise fallback
                const fundName = position.funds?.name || "Fund";
                const assetCode = (
                  position.funds?.asset_symbol ||
                  position.funds?.asset ||
                  "UNITS"
                ).toUpperCase();
                const fundCode = position.funds?.code || "";
                const logo = getAssetLogo(assetCode);
                const quantity = position.shares || position.quantity || 0;

                return (
                  <Card key={position.fund_id || position.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold overflow-hidden">
                              <img
                                src={logo}
                                alt={assetCode}
                                className="h-8 w-8 object-contain"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = "none";
                                }}
                              />
                              <Layers className="h-5 w-5" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-lg">{fundName}</h3>
                              <p className="text-sm text-muted-foreground">{fundCode}</p>
                            </div>
                          </div>
                        </div>
                        <Badge variant="default">active</Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-1">Balance</p>
                          <p className="text-2xl font-bold">
                            {Number(quantity).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 8,
                            })}{" "}
                            {assetCode}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/transactions?fund=${position.fund_id}`}>
                            View Transactions
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center space-y-4">
                <div className="flex justify-center">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                    <Layers className="h-8 w-8 text-muted-foreground" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">No positions found</h3>
                  <p className="text-muted-foreground">
                    You don't have any active positions at the moment.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
