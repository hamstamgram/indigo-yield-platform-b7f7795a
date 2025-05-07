
import React from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserCircle, Mail, Briefcase, TestTube } from "lucide-react";

interface AdminToolsTabsProps {
  defaultTab?: string;
  children: React.ReactNode;
}

const AdminToolsTabs: React.FC<AdminToolsTabsProps> = ({ 
  defaultTab = "users", 
  children 
}) => {
  return (
    <Tabs defaultValue={defaultTab}>
      <TabsList className="mb-6">
        <TabsTrigger value="users">
          <UserCircle className="h-4 w-4 mr-2" />
          Users
        </TabsTrigger>
        <TabsTrigger value="invites">
          <Mail className="h-4 w-4 mr-2" />
          Invites
        </TabsTrigger>
        <TabsTrigger value="portfolios">
          <Briefcase className="h-4 w-4 mr-2" />
          Portfolios
        </TabsTrigger>
        <TabsTrigger value="test-users">
          <TestTube className="h-4 w-4 mr-2" />
          Test Users
        </TabsTrigger>
      </TabsList>
      {children}
    </Tabs>
  );
};

export default AdminToolsTabs;
