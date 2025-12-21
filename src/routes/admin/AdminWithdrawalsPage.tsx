import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { WithdrawalStatsComponent } from "@/components/admin/withdrawals/WithdrawalStats";
import { WithdrawalsTable } from "@/components/admin/withdrawals/WithdrawalsTable";
import { CreateWithdrawalDialog } from "@/components/admin/withdrawals/CreateWithdrawalDialog";
import { withdrawalService } from "@/services/investor/withdrawalService";
import { Withdrawal, WithdrawalFilters, WithdrawalStats } from "@/types/withdrawal";
import { toast } from "sonner";
import { ArrowDownToLine, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import PageHeader from "@/components/layout/PageHeader";
import { useUrlFilters } from "@/hooks/useUrlFilters";

interface Fund {
  id: string;
  code: string;
  name: string;
  asset: string;
}

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
  const [isLoading, setIsLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // URL-persisted filters
  const { filters: urlFilters, setFilter } = useUrlFilters({
    keys: ["status", "fund"],
    defaults: { status: "all" },
  });

  const filters: WithdrawalFilters = useMemo(() => ({
    status: (urlFilters.status as WithdrawalFilters["status"]) || "all",
    fund_id: urlFilters.fund || undefined,
  }), [urlFilters]);

  const setFilters = (newFilters: WithdrawalFilters) => {
    if (newFilters.status !== filters.status) {
      setFilter("status", newFilters.status || "all");
    }
    if (newFilters.fund_id !== filters.fund_id) {
      setFilter("fund", newFilters.fund_id || null);
    }
  };

  // Fetch active funds for the filter dropdown
  const { data: funds = [] } = useQuery<Fund[]>({
    queryKey: ["funds-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("funds")
        .select("id, code, name, asset")
        .eq("status", "active")
        .order("name");
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

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

  const handleCreateSuccess = () => {
    setCreateDialogOpen(false);
    loadData();
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Withdrawal Management"
        subtitle="Review and process investor withdrawal requests"
        icon={ArrowDownToLine}
        actions={
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Withdrawal
          </Button>
        }
      />

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
            funds={funds}
          />
        </CardContent>
      </Card>

      <CreateWithdrawalDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
}
