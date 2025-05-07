
import React from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserCircle, Mail, Briefcase, TestTube } from "lucide-react";

interface AdminToolsTabsProps {
  defaultTab?: string;
  children: React.ReactNode;
}

const AdminToolsTabs: React.FC<AdminToolsTabsProps> = ({ 
  defaultTab = "portfolios", 
  children 
}) => {
  return (
    <Tabs defaultValue={defaultTab}>
      <TabsList className="mb-6">
        <TabsTrigger value="portfolios">
          <Briefcase className="h-4 w-4 mr-2" />
          Portfolio Management
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
