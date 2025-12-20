import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WithdrawalStatsComponent } from "@/components/admin/withdrawals/WithdrawalStats";
import { WithdrawalsTable } from "@/components/admin/withdrawals/WithdrawalsTable";
import { withdrawalService } from "@/services/investor/withdrawalService";
import { Withdrawal, WithdrawalFilters, WithdrawalStats } from "@/types/withdrawal";
import { toast } from "sonner";
import { ArrowDownToLine } from "lucide-react";

export default function AdminWithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [stats, setStats] = useState<WithdrawalStats>({
    pending: 0,
    approved: 0,
    processing: 0,
    completed: 0,
    rejected: 0,
    pending_by_asset: [],
  });
  const [filters, setFilters] = useState<WithdrawalFilters>({
    status: "all",
  });
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [withdrawalsData, statsData] = await Promise.all([
        withdrawalService.getWithdrawals(filters),
        withdrawalService.getStats(),
      ]);
      setWithdrawals(withdrawalsData);
      setStats(statsData);
    } catch (error) {
      console.error("Error loading withdrawals:", error);
      toast.error("Failed to load withdrawals");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filters]);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <ArrowDownToLine className="h-8 w-8" />
            Withdrawal Management
          </h1>
          <p className="text-muted-foreground">Review and process investor withdrawal requests</p>
        </div>
      </div>

      <WithdrawalStatsComponent stats={stats} isLoading={isLoading} />

      <Card>
        <CardHeader>
          <CardTitle>Withdrawal Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <WithdrawalsTable
            withdrawals={withdrawals}
            isLoading={isLoading}
            filters={filters}
            onFiltersChange={setFilters}
            onRefresh={loadData}
          />
        </CardContent>
      </Card>
    </div>
  );
}
