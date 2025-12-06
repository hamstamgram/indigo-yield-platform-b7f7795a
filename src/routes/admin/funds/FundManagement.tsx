import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, Percent, BarChart3, Settings } from "lucide-react";
import FundAUMManager from "@/components/admin/funds/FundAUMManager";
import FundYieldManagerV2 from "@/components/admin/funds/FundYieldManagerV2";
import FundConfiguration from "@/components/admin/funds/FundConfiguration";
import ProfessionalStatementGenerator from "@/components/admin/statements/ProfessionalStatementGenerator";

const FundManagement = () => {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Fund Management</h1>
        <p className="text-muted-foreground">
          Comprehensive fund AUM and yield distribution management
        </p>
      </div>

      <Tabs defaultValue="aum-management" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 h-11">
          <TabsTrigger value="aum-management" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            <span className="hidden sm:inline">AUM Management</span>
            <span className="sm:hidden">AUM</span>
          </TabsTrigger>
          <TabsTrigger value="yield-distribution" className="flex items-center gap-2">
            <Percent className="h-4 w-4" />
            <span className="hidden sm:inline">Yield Distribution</span>
            <span className="sm:hidden">Yield</span>
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Performance</span>
            <span className="sm:hidden">Stats</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Settings</span>
            <span className="sm:hidden">Config</span>
          </TabsTrigger>
          <TabsTrigger value="statements" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Statements</span>
            <span className="sm:hidden">Reports</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="aum-management" className="space-y-6">
          <FundAUMManager />
        </TabsContent>

        <TabsContent value="yield-distribution" className="space-y-6">
          <FundYieldManagerV2 />
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Performance Analytics Removed</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Charts and graphs have been removed. Performance data is now displayed in native
                  currency per asset. Use the AUM and Yield tabs to manage fund data.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <FundConfiguration />
        </TabsContent>

        <TabsContent value="statements" className="space-y-6">
          <ProfessionalStatementGenerator />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FundManagement;
