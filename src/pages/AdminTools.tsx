
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import AdminUsersList from "@/components/admin/AdminUsersList";
import AdminYieldRates from "@/components/admin/AdminYieldRates";
import AdminPortfolios from "@/components/admin/AdminPortfolios";
import AdminInvites from "@/components/admin/AdminInvites";

const AdminTools = () => {
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        // Check if user is logged in
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          navigate('/login');
          return;
        }
        
        // Check if user is an admin
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id)
          .single();
        
        if (error || !profile?.is_admin) {
          console.error("Not authorized as admin:", error);
          toast({
            title: "Access Denied",
            description: "You don't have permission to access this page.",
            variant: "destructive",
          });
          navigate('/dashboard');
          return;
        }
        
        setIsAdmin(true);
      } catch (error) {
        console.error("Error checking admin status:", error);
        navigate('/dashboard');
      } finally {
        setInitializing(false);
      }
    };
    
    checkAdminStatus();
  }, [navigate, toast]);

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

  // Show loading state while checking admin status
  if (initializing) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If not admin and not initializing, this means the redirect should happen
  // This is just an extra safety check in case the redirect fails
  if (!isAdmin && !initializing) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin Tools</h1>
      </div>
      
      <Tabs defaultValue="assets" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="assets">Assets</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
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
