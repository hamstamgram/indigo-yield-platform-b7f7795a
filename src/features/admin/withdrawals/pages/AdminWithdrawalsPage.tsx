import { useState, useMemo, useCallback } from "react";
import { Button, QueryErrorBoundary } from "@/components/ui";
import {
  WithdrawalsTable,
  CreateWithdrawalDialog,
  WithdrawalDetailsDrawer,
  ApproveWithdrawalDialog,
  RejectWithdrawalDialog,
  EditWithdrawalDialog,
  DeleteWithdrawalDialog,
  RouteToFeesDialog,
  BulkDeleteWithdrawalsDialog,
  WithdrawalBulkActionToolbar,
} from "@/components/admin";
import { Withdrawal, WithdrawalFilters, WithdrawalStats } from "@/types/domains";
import { ArrowDownToLine, Plus, Clock, CheckCircle2, XCircle } from "lucide-react";
import { ExportButton } from "@/components/common";
import { MetricStrip, type MetricItem } from "@/components/common/MetricStrip";
import type { ExportColumn } from "@/lib/export/csv-export";
import { useFunds, useUrlFilters } from "@/hooks";
import { useWithdrawalsWithStats } from "@/features/admin/withdrawals/hooks/useAdminWithdrawals";
import { useWithdrawalSelection } from "@/features/admin/withdrawals/hooks/useWithdrawalSelection";
import { useWithdrawalMutations } from "@/hooks/data";
import { useSuperAdmin } from "@/components/admin";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateAfterWithdrawal } from "@/utils/cacheInvalidation";
import { PageHeader } from "@/components/layout";
import { PageShell } from "@/components/layout/PageShell";

interface Fund {
  id: string;
  code: string;
  name: string;
  asset: string;
}

const withdrawalExportColumns: ExportColumn[] = [
  { key: "investor_name", label: "Investor" },
  { key: "investor_email", label: "Email" },
  { key: "requested_amount", label: "Amount" },
  { key: "fund_class", label: "Asset" },
  { key: "withdrawal_type", label: "Type" },
  { key: "status", label: "Status" },
  { key: "request_date", label: "Request Date" },
  { key: "notes", label: "Notes" },
];

// Stable reference for URL filter options - MUST be outside component to prevent infinite re-renders
const URL_FILTER_OPTIONS = {
  keys: ["status", "fund", "page"] as string[],
  defaults: { status: "all", page: "1" },
};

function WithdrawalsPageContent({ embedded = false }: { embedded?: boolean }) {
  const queryClient = useQueryClient();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Drawer and action dialogs
  const [selectedWithdrawalId, setSelectedWithdrawalId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(null);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [routeToFeesDialogOpen, setRouteToFeesDialogOpen] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);

  // Super admin check for bulk operations
  const { isSuperAdmin } = useSuperAdmin();
  const { bulkDeleteMutation } = useWithdrawalMutations();

  // URL-persisted filters including page - using stable reference from outside component
  const {
    filters: urlFilters,
    setFilter,
    setFilters: setUrlFilters,
  } = useUrlFilters(URL_FILTER_OPTIONS);

  const filters: WithdrawalFilters = useMemo(
    () => ({
      status: (urlFilters.status as WithdrawalFilters["status"]) || "all",
      fund_id: urlFilters.fund || undefined,
      page: parseInt(urlFilters.page || "1", 10),
      pageSize: 20,
    }),
    [urlFilters]
  );

  // Use React Query hook for data fetching with centralized cache
  const { withdrawals: paginatedData, stats, isLoading } = useWithdrawalsWithStats(filters);

  // Provide default values when data is loading
  const safeStats: WithdrawalStats = stats ?? {
    pending: 0,
    approved: 0,
    processing: 0,
    completed: 0,
    rejected: 0,
    pending_by_asset: [],
  };

  const safePaginatedData = paginatedData ?? {
    data: [],
    totalCount: 0,
    page: 1,
    pageSize: 20,
    totalPages: 0,
  };

  // Selection for bulk operations
  const selection = useWithdrawalSelection(safePaginatedData.data, safePaginatedData.page);

  const selectedWithdrawals = useMemo(
    () => safePaginatedData.data.filter((w) => selection.selectedIds.has(w.id)),
    [safePaginatedData.data, selection.selectedIds]
  );

  const setFilters = useCallback(
    (newFilters: WithdrawalFilters) => {
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
    },
    [filters, setUrlFilters]
  );

  const setPage = useCallback(
    (page: number) => {
      setFilter("page", page.toString());
    },
    [setFilter]
  );

  // Use the data hook for active funds
  const { data: fundsData = [] } = useFunds(true); // activeOnly
  const funds: Fund[] = fundsData.map((f) => ({
    id: f.id,
    code: f.code,
    name: f.name,
    asset: f.asset,
  }));

  // Centralized cache invalidation for withdrawal operations
  const handleInvalidateCache = useCallback(() => {
    invalidateAfterWithdrawal(queryClient);
  }, [queryClient]);

  const handleCreateSuccess = () => {
    setCreateDialogOpen(false);
    handleInvalidateCache();
  };

  const handleViewDetails = (withdrawal: Withdrawal) => {
    setSelectedWithdrawalId(withdrawal.id);
    setDrawerOpen(true);
  };

  const handleDrawerAction = (action: "approve" | "reject", withdrawal: Withdrawal) => {
    setSelectedWithdrawal(withdrawal);
    setDrawerOpen(false);

    switch (action) {
      case "approve":
        setApproveDialogOpen(true);
        break;
      case "reject":
        setRejectDialogOpen(true);
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
    handleInvalidateCache();
    setSelectedWithdrawal(null);
  };

  const content = (
    <>
      {!embedded && (
        <PageHeader
          title="Withdrawal Management"
          subtitle="Review and process investor withdrawal requests"
          icon={ArrowDownToLine}
          actions={
            <div className="flex items-center gap-2">
              <ExportButton
                data={safePaginatedData.data}
                columns={withdrawalExportColumns}
                filename="withdrawals"
                disabled={safePaginatedData.data.length === 0}
              />
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Withdrawal
              </Button>
            </div>
          }
        />
      )}

      {embedded && (
        <div className="flex items-center justify-end gap-2">
          <ExportButton
            data={safePaginatedData.data}
            columns={withdrawalExportColumns}
            filename="withdrawals"
            disabled={safePaginatedData.data.length === 0}
          />
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Withdrawal
          </Button>
        </div>
      )}

      <MetricStrip
        isLoading={isLoading}
        metrics={
          [
            {
              label: "Pending",
              value: safeStats.pending,
              icon: Clock,
              color: safeStats.pending > 0 ? "warning" : "success",
            },
            {
              label: "Completed",
              value: safeStats.completed,
              icon: CheckCircle2,
              color: "success",
            },
            {
              label: "Rejected",
              value: safeStats.rejected,
              icon: XCircle,
              color: safeStats.rejected > 0 ? "danger" : "default",
            },
          ] satisfies MetricItem[]
        }
      />

      {/* Bulk Action Toolbar */}
      <WithdrawalBulkActionToolbar
        summary={selection.summary}
        isSuperAdmin={isSuperAdmin}
        onDelete={() => setBulkDeleteDialogOpen(true)}
        onClear={selection.clearSelection}
      />

      <div className="rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10">
          <span className="text-sm font-medium text-white">Withdrawal Requests</span>
        </div>
        <div className="p-4">
          <WithdrawalsTable
            withdrawals={safePaginatedData.data}
            isLoading={isLoading}
            filters={filters}
            onFiltersChange={setFilters}
            onRefresh={handleInvalidateCache}
            funds={funds}
            pagination={{
              page: safePaginatedData.page,
              pageSize: safePaginatedData.pageSize,
              totalCount: safePaginatedData.totalCount,
              totalPages: safePaginatedData.totalPages,
              onPageChange: setPage,
            }}
            selection={{
              selectedIds: selection.selectedIds,
              toggleOne: selection.toggleOne,
              toggleAll: selection.toggleAll,
              isSelected: selection.isSelected,
              isAllSelected: selection.isAllSelected,
              isIndeterminate: selection.isIndeterminate,
            }}
            onViewDetails={handleViewDetails}
            onApprove={handleTableApprove}
            onReject={handleTableReject}
            onEdit={handleTableEdit}
            onDelete={handleTableDelete}
            onRouteToFees={handleTableRouteToFees}
          />
        </div>
      </div>

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

      {/* Bulk Delete Dialog */}
      <BulkDeleteWithdrawalsDialog
        open={bulkDeleteDialogOpen}
        onOpenChange={setBulkDeleteDialogOpen}
        withdrawals={selectedWithdrawals}
        summary={selection.summary}
        isPending={bulkDeleteMutation.isPending}
        onConfirm={(reason, hardDelete) => {
          bulkDeleteMutation.mutate(
            {
              withdrawalIds: Array.from(selection.selectedIds),
              reason,
              hardDelete,
            },
            {
              onSuccess: () => {
                setBulkDeleteDialogOpen(false);
                selection.clearSelection();
              },
            }
          );
        }}
      />
    </>
  );

  if (embedded) return content;
  return <PageShell>{content}</PageShell>;
}

export default function AdminWithdrawalsPage({ embedded = false }: { embedded?: boolean }) {
  return (
    <QueryErrorBoundary>
      <WithdrawalsPageContent embedded={embedded} />
    </QueryErrorBoundary>
  );
}
