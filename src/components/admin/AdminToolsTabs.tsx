
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminUsersList from "@/components/admin/AdminUsersList";
import YieldSourcesManagement from "@/pages/YieldSourcesManagement";
import AdminPortfolios from "@/components/admin/AdminPortfolios";
import AdminInvites from "@/components/admin/AdminInvites";

interface AdminToolsTabsProps {
  defaultTab: string;
}

const AdminToolsTabs = ({ defaultTab }: AdminToolsTabsProps) => {
  return (
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
        <YieldSourcesManagement />
      </TabsContent>

      <TabsContent value="invites">
        <AdminInvites />
      </TabsContent>
    </Tabs>
  );
};

export default AdminToolsTabs;
