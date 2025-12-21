import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { WithdrawalStatsComponent } from "@/components/admin/withdrawals/WithdrawalStats";
import { WithdrawalsTable } from "@/components/admin/withdrawals/WithdrawalsTable";
import { CreateWithdrawalDialog } from "@/components/admin/withdrawals/CreateWithdrawalDialog";
import { WithdrawalDetailsDrawer } from "@/components/admin/withdrawals/WithdrawalDetailsDrawer";
import { ApproveWithdrawalDialog } from "@/components/admin/withdrawals/ApproveWithdrawalDialog";
import { RejectWithdrawalDialog } from "@/components/admin/withdrawals/RejectWithdrawalDialog";
import { StartProcessingDialog } from "@/components/admin/withdrawals/StartProcessingDialog";
import { CompleteWithdrawalDialog } from "@/components/admin/withdrawals/CompleteWithdrawalDialog";
import { withdrawalService } from "@/services/investor/withdrawalService";
import { Withdrawal, WithdrawalFilters, WithdrawalStats, PaginatedWithdrawals } from "@/types/withdrawal";
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
  const [paginatedData, setPaginatedData] = useState<PaginatedWithdrawals>({
    data: [],
    totalCount: 0,
    page: 1,
    pageSize: 20,
    totalPages: 0,
  });
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
  
  // Drawer and action dialogs
  const [selectedWithdrawalId, setSelectedWithdrawalId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(null);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [processingDialogOpen, setProcessingDialogOpen] = useState(false);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);

  // URL-persisted filters including page
  const { filters: urlFilters, setFilter, setFilters: setUrlFilters } = useUrlFilters({
    keys: ["status", "fund", "page"],
    defaults: { status: "all", page: "1" },
  });

  const filters: WithdrawalFilters = useMemo(() => ({
    status: (urlFilters.status as WithdrawalFilters["status"]) || "all",
    fund_id: urlFilters.fund || undefined,
    page: parseInt(urlFilters.page || "1", 10),
    pageSize: 20,
  }), [urlFilters]);

  const setFilters = useCallback((newFilters: WithdrawalFilters) => {
    const updates: Record<string, string | null> = {};
    if (newFilters.status !== filters.status) {
      updates.status = newFilters.status || "all";
      updates.page = "1"; // Reset page on filter change
    }
    if (newFilters.fund_id !== filters.fund_id) {
      updates.fund = newFilters.fund_id || null;
      updates.page = "1"; // Reset page on filter change
    }
    if (Object.keys(updates).length > 0) {
      setUrlFilters(updates);
    }
  }, [filters, setUrlFilters]);

  const setPage = useCallback((page: number) => {
    setFilter("page", page.toString());
  }, [setFilter]);

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
    staleTime: 5 * 60 * 1000,
  });

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [withdrawalsData, statsData] = await Promise.all([
        withdrawalService.getWithdrawals(filters),
        withdrawalService.getStats(),
      ]);
      setPaginatedData(withdrawalsData);
      setStats(statsData);
    } catch (error) {
      console.error("Error loading withdrawals:", error);
      toast.error("Failed to load withdrawals");
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateSuccess = () => {
    setCreateDialogOpen(false);
    loadData();
  };

  const handleViewDetails = (withdrawal: Withdrawal) => {
    setSelectedWithdrawalId(withdrawal.id);
    setDrawerOpen(true);
  };

  const handleDrawerAction = (action: "approve" | "reject" | "process" | "complete", withdrawal: Withdrawal) => {
    setSelectedWithdrawal(withdrawal);
    setDrawerOpen(false);
    
    switch (action) {
      case "approve":
        setApproveDialogOpen(true);
        break;
      case "reject":
        setRejectDialogOpen(true);
        break;
      case "process":
        setProcessingDialogOpen(true);
        break;
      case "complete":
        setCompleteDialogOpen(true);
        break;
    }
  };

  const handleActionSuccess = () => {
    loadData();
    setSelectedWithdrawal(null);
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
            withdrawals={paginatedData.data}
            isLoading={isLoading}
            filters={filters}
            onFiltersChange={setFilters}
            onRefresh={loadData}
            funds={funds}
            pagination={{
              page: paginatedData.page,
              pageSize: paginatedData.pageSize,
              totalCount: paginatedData.totalCount,
              totalPages: paginatedData.totalPages,
              onPageChange: setPage,
            }}
            onViewDetails={handleViewDetails}
          />
        </CardContent>
      </Card>

      <CreateWithdrawalDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={handleCreateSuccess}
      />

      <WithdrawalDetailsDrawer
        withdrawalId={selectedWithdrawalId}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onAction={handleDrawerAction}
      />

      {selectedWithdrawal && (
        <>
          <ApproveWithdrawalDialog
            open={approveDialogOpen}
            onOpenChange={setApproveDialogOpen}
            withdrawal={selectedWithdrawal}
            onSuccess={handleActionSuccess}
          />
          <RejectWithdrawalDialog
            open={rejectDialogOpen}
            onOpenChange={setRejectDialogOpen}
            withdrawal={selectedWithdrawal}
            onSuccess={handleActionSuccess}
          />
          <StartProcessingDialog
            open={processingDialogOpen}
            onOpenChange={setProcessingDialogOpen}
            withdrawal={selectedWithdrawal}
            onSuccess={handleActionSuccess}
          />
          <CompleteWithdrawalDialog
            open={completeDialogOpen}
            onOpenChange={setCompleteDialogOpen}
            withdrawal={selectedWithdrawal}
            onSuccess={handleActionSuccess}
          />
        </>
      )}
    </div>
  );
}
