import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { DollarSign, Percent, BarChart3, Settings } from 'lucide-react';
import FundAUMManager from '@/components/admin/funds/FundAUMManager';
import FundYieldManager from '@/components/admin/funds/FundYieldManager';
import FundPerformanceAnalytics from '@/components/admin/funds/FundPerformanceAnalytics';
import FundConfiguration from '@/components/admin/funds/FundConfiguration';

const FundManagement = () => {
  return (
    <div className="font-['Space_Grotesk']">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Fund Management</h1>
        <p className="text-muted-foreground">
          Comprehensive fund AUM and yield distribution management
        </p>
      </div>

      <Tabs defaultValue="aum-management" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 h-11">
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
        </TabsList>

        <TabsContent value="aum-management" className="space-y-6">
          <FundAUMManager />
        </TabsContent>

        <TabsContent value="yield-distribution" className="space-y-6">
          <FundYieldManager />
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <FundPerformanceAnalytics />
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <FundConfiguration />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FundManagement;