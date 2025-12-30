import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Card, CardContent, CardHeader, CardTitle,
  Button,
} from "@/components/ui";
import { 
  WithdrawalStats as WithdrawalStatsComponent, 
  WithdrawalsTable, 
  CreateWithdrawalDialog,
  WithdrawalDetailsDrawer,
  ApproveWithdrawalDialog,
  RejectWithdrawalDialog,
  StartProcessingDialog,
  CompleteWithdrawalDialog,
  EditWithdrawalDialog,
  DeleteWithdrawalDialog,
  RouteToFeesDialog
} from "@/components/admin";
import { withdrawalService } from "@/services";
import { Withdrawal, WithdrawalFilters, WithdrawalStats, PaginatedWithdrawals } from "@/types/domains";
import { toast } from "sonner";
import { ArrowDownToLine, Plus } from "lucide-react";
import { useFunds, useUrlFilters } from "@/hooks";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout";

interface Fund {
  id: string;
  code: string;
  name: string;
  asset: string;
}

// Stable reference for URL filter options - MUST be outside component to prevent infinite re-renders
const URL_FILTER_OPTIONS = {
  keys: ["status", "fund", "page"] as string[],
  defaults: { status: "all", page: "1" },
};

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
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [routeToFeesDialogOpen, setRouteToFeesDialogOpen] = useState(false);

  // URL-persisted filters including page - using stable reference from outside component
  const { filters: urlFilters, setFilter, setFilters: setUrlFilters } = useUrlFilters(URL_FILTER_OPTIONS);

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

  // Use the data hook for active funds
  const { data: fundsData = [] } = useFunds(true); // activeOnly
  const funds: Fund[] = fundsData.map(f => ({ id: f.id, code: f.code, name: f.name, asset: f.asset }));

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [withdrawalsData, statsData] = await Promise.all([
        withdrawalService.getWithdrawals(filters),
        withdrawalService.getStats(filters), // Pass same filters for consistent stats
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

  // Table row action handlers
  const handleTableApprove = (withdrawal: Withdrawal) => {
    setSelectedWithdrawal(withdrawal);
    setApproveDialogOpen(true);
  };

  const handleTableReject = (withdrawal: Withdrawal) => {
    setSelectedWithdrawal(withdrawal);
    setRejectDialogOpen(true);
  };

  const handleTableStartProcessing = (withdrawal: Withdrawal) => {
    setSelectedWithdrawal(withdrawal);
    setProcessingDialogOpen(true);
  };

  const handleTableComplete = (withdrawal: Withdrawal) => {
    setSelectedWithdrawal(withdrawal);
    setCompleteDialogOpen(true);
  };

  const handleTableEdit = (withdrawal: Withdrawal) => {
    setSelectedWithdrawal(withdrawal);
    setEditDialogOpen(true);
  };

  const handleTableDelete = (withdrawal: Withdrawal) => {
    setSelectedWithdrawal(withdrawal);
    setDeleteDialogOpen(true);
  };

  const handleTableRouteToFees = (withdrawal: Withdrawal) => {
    setSelectedWithdrawal(withdrawal);
    setRouteToFeesDialogOpen(true);
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
            onApprove={handleTableApprove}
            onReject={handleTableReject}
            onStartProcessing={handleTableStartProcessing}
            onComplete={handleTableComplete}
            onEdit={handleTableEdit}
            onDelete={handleTableDelete}
            onRouteToFees={handleTableRouteToFees}
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
          <EditWithdrawalDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            withdrawal={selectedWithdrawal}
            onSuccess={handleActionSuccess}
          />
          <DeleteWithdrawalDialog
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
            withdrawal={selectedWithdrawal}
            onSuccess={handleActionSuccess}
          />
          <RouteToFeesDialog
            open={routeToFeesDialogOpen}
            onOpenChange={setRouteToFeesDialogOpen}
            withdrawal={selectedWithdrawal}
            onSuccess={handleActionSuccess}
          />
        </>
      )}
    </div>
  );
}
