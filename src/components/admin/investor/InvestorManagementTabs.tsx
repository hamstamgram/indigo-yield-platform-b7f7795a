import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Users, FileSpreadsheet, Calendar, Settings } from "lucide-react";
import { InvestorManagementPanel } from "./InvestorManagementPanel";
import BulkOperationsPanel from "../investors/BulkOperationsPanel";
import InvestorLifecyclePanel from "../investors/InvestorLifecyclePanel";

interface InvestorManagementTabsProps {
  investors: any[];
  onDataChange: () => void;
}

const InvestorManagementTabs: React.FC<InvestorManagementTabsProps> = ({
  investors,
  onDataChange,
}) => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Investor Management</h1>
        <p className="text-muted-foreground">
          Comprehensive investor portfolio and lifecycle management
        </p>
      </div>

      <Tabs defaultValue="investors" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="investors" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Investors
          </TabsTrigger>
          <TabsTrigger value="bulk" className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Bulk Operations
          </TabsTrigger>
          <TabsTrigger value="lifecycle" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Lifecycle
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="investors" className="mt-6">
          <InvestorManagementPanel investors={investors} onDataChange={onDataChange} />
        </TabsContent>

        <TabsContent value="bulk" className="mt-6">
          <BulkOperationsPanel />
        </TabsContent>

        <TabsContent value="lifecycle" className="mt-6">
          <InvestorLifecyclePanel />
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">System Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium">Default Fee Percentage</h4>
                    <p className="text-sm text-muted-foreground">
                      Set the default management fee percentage for new investors
                    </p>
                    <p className="mt-2 font-mono">Current: 20.0%</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium">Position Lock Defaults</h4>
                    <p className="text-sm text-muted-foreground">
                      Configure default lock periods for new positions
                    </p>
                    <p className="mt-2 font-mono">Current: 0 days</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium">Cleanup Settings</h4>
                    <p className="text-sm text-muted-foreground">
                      Automated cleanup thresholds and schedules
                    </p>
                    <p className="mt-2 font-mono">Inactive: 90 days</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium">Import Validation</h4>
                    <p className="text-sm text-muted-foreground">
                      CSV import validation rules and limits
                    </p>
                    <p className="mt-2 font-mono">Max rows: 1000</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InvestorManagementTabs;
