/**
 * Admin Reports Page (Consolidated)
 * Monthly Statements + Historical Archive
 * URL-persisted tabs via ?tab= search param
 */

import { lazy, Suspense } from "react";
import { FileSpreadsheet, Database } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui";
import { PageShell } from "@/components/layout/PageShell";
import { useTabFromUrl } from "@/hooks/ui/useTabFromUrl";
import { Skeleton } from "@/components/ui";

const InvestorReports = lazy(() => import("@/features/admin/reports/pages/InvestorReports"));
const HistoricalReportsDashboard = lazy(
  () => import("@/features/admin/investors/components/reports/HistoricalReportsDashboard")
);

function TabFallback() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export default function ReportsConsolidatedPage() {
  const { activeTab, setActiveTab } = useTabFromUrl({ defaultTab: "statements" });

  return (
    <PageShell>
      <div>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-muted-foreground mt-1">
          Generate, deliver, and review investor statements
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="statements" className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Monthly Statements
          </TabsTrigger>
          <TabsTrigger value="historical" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Historical Archive
          </TabsTrigger>
        </TabsList>

        <TabsContent value="statements">
          <Suspense fallback={<TabFallback />}>
            <InvestorReports embedded />
          </Suspense>
        </TabsContent>

        <TabsContent value="historical">
          <Suspense fallback={<TabFallback />}>
            <HistoricalReportsDashboard embedded />
          </Suspense>
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
