import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import AdminUsersList from "@/components/admin/AdminUsersList";
import AdminYieldRates from "@/components/admin/AdminYieldRates";
import AdminPortfolios from "@/components/admin/AdminPortfolios";
import AdminInvites from "@/components/admin/AdminInvites";

const AdminTools = () => {
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get("tab") || "assets";

  // Simplified initialization - DashboardLayout now handles the auth check and redirection
  useEffect(() => {
    // Just check if the component is ready to render
    setInitializing(false);
  }, []);

  const initializeAssets = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('init-crypto-assets');
      
      if (error) {
        throw error;
      }
      
      toast({
        title: "Assets initialized",
        description: "Cryptocurrency assets have been added to the database.",
      });
      
      console.log('Init assets response:', data);
    } catch (error) {
      console.error('Error initializing assets:', error);
      toast({
        title: "Initialization failed",
        description: "Could not initialize cryptocurrency assets.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Show loading state while initializing
  if (initializing) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin Tools</h1>
      </div>
      
      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="assets">Assets</TabsTrigger>
          <TabsTrigger value="users">Manage Users</TabsTrigger>
          <TabsTrigger value="portfolios">Portfolios</TabsTrigger>
          <TabsTrigger value="yields">Yield Rates</TabsTrigger>
          <TabsTrigger value="invites">Admin Invites</TabsTrigger>
        </TabsList>
        
        <TabsContent value="assets">
          <Card>
            <CardHeader>
              <CardTitle>Initialize Crypto Assets</CardTitle>
              <CardDescription>
                Add or update the cryptocurrency assets in the database.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={initializeAssets} 
                disabled={loading}
              >
                {loading ? "Initializing..." : "Initialize Assets"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="users">
          <AdminUsersList />
        </TabsContent>
        
        <TabsContent value="portfolios">
          <AdminPortfolios />
        </TabsContent>
        
        <TabsContent value="yields">
          <AdminYieldRates />
        </TabsContent>

        <TabsContent value="invites">
          <AdminInvites />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminTools;
