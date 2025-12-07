import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import InvestorMonthlyTracking from "@/components/admin/investors/InvestorMonthlyTracking";
import InvestorPositionsTab from "@/components/admin/investors/InvestorPositionsTab";
import InvestorTransactionsTab from "@/components/admin/investors/InvestorTransactionsTab";
import { User, Mail, Calendar, Activity, Loader2, ArrowLeft } from "lucide-react";

interface InvestorDetail {
  id: string;
  name: string;
  email: string;
  status: string;
  created_at: string | null;
  profile_id: string;
  phone?: string | null;
}

const InvestorManagement = () => {
  const { id } = useParams();
  const [investor, setInvestor] = useState<InvestorDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (id) {
      fetchInvestorDetails();
    }
  }, [id]);

  const fetchInvestorDetails = async () => {
    try {
      const { data, error } = await supabase
        .from("investors")
        .select("*")
        .eq("id", id || "")
        .maybeSingle();

      if (!data) {
        console.error("Investor not found");
        setIsLoading(false);
        return;
      }

      if (error) throw error;
      setInvestor(data as InvestorDetail);
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
  };

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

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="positions">Positions</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="activity">Monthly Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Investor profile and contact details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Full Name</p>
                    <p className="text-sm text-muted-foreground">{investor.name}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Email Address</p>
                    <p className="text-sm text-muted-foreground">{investor.email}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Joined</p>
                    <p className="text-sm text-muted-foreground">
                      {investor.created_at
                        ? new Date(investor.created_at).toLocaleDateString()
                        : "N/A"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Status</p>
                    <Badge variant={investor.status === "active" ? "default" : "secondary"}>
                      {investor.status}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="positions" className="space-y-4">
          <InvestorPositionsTab investorId={id!} />
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <InvestorTransactionsTab investorId={id!} />
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <InvestorMonthlyTracking investorId={id!} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InvestorManagement;
