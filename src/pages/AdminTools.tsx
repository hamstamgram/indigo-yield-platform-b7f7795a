
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import AdminUsersList from "@/components/admin/AdminUsersList";
import AdminYieldRates from "@/components/admin/AdminYieldRates";
import AdminPortfolios from "@/components/admin/AdminPortfolios";
import AdminInvites from "@/components/admin/AdminInvites";

const AdminTools = () => {
  const [initializing, setInitializing] = useState(true);
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get("tab") || "portfolios";

  // Simplified initialization - DashboardLayout now handles the auth check and redirection
  useEffect(() => {
    // Just check if the component is ready to render
    setInitializing(false);
  }, []);

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
          <TabsTrigger value="portfolios">Portfolios</TabsTrigger>
          <TabsTrigger value="yields">Yield Rates</TabsTrigger>
          <TabsTrigger value="users">Manage Users</TabsTrigger>
          <TabsTrigger value="invites">Admin Invites</TabsTrigger>
        </TabsList>
        
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
