import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { InvestorYieldManager } from "@/components/admin/investors/InvestorYieldManager";
import InvestorPositionsTab from "@/components/admin/investors/InvestorPositionsTab";
import InvestorTransactionsTab from "@/components/admin/investors/InvestorTransactionsTab";
import { InvestorProfileEditor } from "@/components/admin/investors/InvestorProfileEditor";
import { ReportRecipientsEditor } from "@/components/admin/investors/ReportRecipientsEditor";
import { Loader2, ArrowLeft, Coins, TrendingUp } from "lucide-react";
import { useInvestorAssetStats } from "@/hooks/useInvestorPerformance";
import { AssetPerformanceCard } from "@/components/shared/AssetPerformanceCard";

interface InvestorDetail {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  created_at: string | null;
  profile_id: string;
  phone: string | null;
}

const InvestorManagement = () => {
  const { id } = useParams();
  const [investor, setInvestor] = useState<InvestorDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Fetch per-asset performance stats for this investor
  const { data: assetStats, isLoading: isLoadingStats } = useInvestorAssetStats(id);

  const fetchInvestorDetails = useCallback(async () => {
    if (!id) return;
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (!data) {
        console.error("Investor not found");
        setIsLoading(false);
        return;
      }

      if (error) throw error;
      
      const fullName = `${data.first_name || ""} ${data.last_name || ""}`.trim();
      
      setInvestor({
        id: data.id,
        name: fullName,
        firstName: data.first_name || "",
        lastName: data.last_name || "",
        email: data.email,
        status: data.status || "active",
        created_at: data.created_at,
        profile_id: data.id,
        phone: data.phone || null,
      });
    } catch (error) {
      console.error("Error fetching investor details:", error);
      toast({
        title: "Error",
        description: "Failed to fetch investor details",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    fetchInvestorDetails();
  }, [fetchInvestorDetails]);

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (!investor) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <h2 className="text-lg font-semibold">Investor Not Found</h2>
              <p className="text-muted-foreground">The requested investor could not be found.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{investor.name}</h1>
            <p className="text-muted-foreground">Investor Profile & Portfolio Management</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={investor.status === "active" ? "default" : "secondary"}>
            {investor.status}
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="yield" className="space-y-4">
        <TabsList>
          <TabsTrigger value="yield" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Yield Management
          </TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="positions">Positions</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
        </TabsList>

        {/* Yield Management Tab - NEW PRIMARY TAB */}
        <TabsContent value="yield" className="space-y-4">
          <InvestorYieldManager investorId={id!} investorName={investor.name} />
        </TabsContent>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          {/* Summary Stats Card */}
          <Card className="border-l-4 border-l-primary">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-full">
                  <Coins className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Fund Positions</p>
                  <p className="text-3xl font-bold">
                    {isLoadingStats ? "..." : assetStats?.activeFunds || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Per-Asset Performance Cards */}
          {!isLoadingStats && assetStats?.assets && assetStats.assets.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Fund Performance (Latest Period)</h3>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {assetStats.assets.map((asset) => (
                  <AssetPerformanceCard
                    key={asset.fundName}
                    data={asset}
                  />
                ))}
              </div>
            </div>
          )}

          {!isLoadingStats && (!assetStats?.assets || assetStats.assets.length === 0) && (
            <Card className="bg-muted/30">
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">No fund positions found for this investor.</p>
              </CardContent>
            </Card>
          )}

          {/* Personal Information - Editable by Admin */}
          <InvestorProfileEditor
            investor={investor}
            onUpdate={fetchInvestorDetails}
          />

          {/* Report Recipients - Editable by Admin */}
          <ReportRecipientsEditor
            investorId={investor.id}
            investorEmail={investor.email}
          />
        </TabsContent>

        {/* Positions Tab */}
        <TabsContent value="positions" className="space-y-4">
          <InvestorPositionsTab investorId={id!} />
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="space-y-4">
          <InvestorTransactionsTab investorId={id!} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InvestorManagement;
