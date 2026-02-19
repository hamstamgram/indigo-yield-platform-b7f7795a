/**
 * Admin Ledger Page
 * Consolidated view: Transactions + Withdrawals
 * URL-persisted tabs via ?tab= search param
 */

import { lazy, Suspense } from "react";
import { CreditCard, ArrowDownToLine } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui";
import { PageShell } from "@/components/layout/PageShell";
import { useTabFromUrl } from "@/hooks/ui/useTabFromUrl";
import { Skeleton } from "@/components/ui";

const AdminTransactionsPage = lazy(
  () => import("@/features/admin/transactions/pages/AdminTransactionsPage")
);
const AdminWithdrawalsPage = lazy(
  () => import("@/features/admin/withdrawals/pages/AdminWithdrawalsPage")
);

function TabFallback() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export default function LedgerPage() {
  const { activeTab, setActiveTab } = useTabFromUrl({ defaultTab: "transactions" });

  return (
    <PageShell>
      <div>
        <h1 className="text-2xl font-bold">Ledger</h1>
        <p className="text-muted-foreground mt-1">Transaction history and withdrawal management</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="transactions" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Transactions
          </TabsTrigger>
          <TabsTrigger value="withdrawals" className="flex items-center gap-2">
            <ArrowDownToLine className="h-4 w-4" />
            Withdrawals
          </TabsTrigger>
        </TabsList>

        <TabsContent value="transactions">
          <Suspense fallback={<TabFallback />}>
            <AdminTransactionsPage embedded />
          </Suspense>
        </TabsContent>

        <TabsContent value="withdrawals">
          <Suspense fallback={<TabFallback />}>
            <AdminWithdrawalsPage embedded />
          </Suspense>
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
