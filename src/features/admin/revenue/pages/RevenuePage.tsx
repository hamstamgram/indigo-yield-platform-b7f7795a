/**
 * Admin Revenue Page
 * Consolidated view: Platform Fees (INDIGO FEES) + IB Commissions
 * URL-persisted tabs via ?tab= search param
 */

import { lazy, Suspense } from "react";
import { Coins, Briefcase } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui";
import { PageShell } from "@/components/layout/PageShell";
import { useTabFromUrl } from "@/hooks/ui/useTabFromUrl";
import { Skeleton } from "@/components/ui";

const FeesOverviewPage = lazy(() => import("@/features/admin/fees/pages/FeesOverviewPage"));
const IBManagementPage = lazy(() => import("@/features/admin/ib/pages/IBManagementPage"));

function TabFallback() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export default function RevenuePage() {
  const { activeTab, setActiveTab } = useTabFromUrl({ defaultTab: "fees" });

  return (
    <PageShell>
      <div>
        <h1 className="text-2xl font-bold">Revenue</h1>
        <p className="text-muted-foreground mt-1">Platform fees and IB commission management</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="fees" className="flex items-center gap-2">
            <Coins className="h-4 w-4" />
            Platform Fees
          </TabsTrigger>
          <TabsTrigger value="ib" className="flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            IB Commissions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="fees">
          <Suspense fallback={<TabFallback />}>
            <FeesOverviewPage embedded />
          </Suspense>
        </TabsContent>

        <TabsContent value="ib">
          <Suspense fallback={<TabFallback />}>
            <IBManagementPage embedded />
          </Suspense>
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
