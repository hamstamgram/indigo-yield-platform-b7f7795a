import React, { useMemo, useCallback, memo } from "react";
import { Withdrawal, WithdrawalFilters, WithdrawalFullStatus } from "@/types/domains";
import { formatAssetAmount } from "@/utils/assets";
import { CryptoIcon } from "@/components/CryptoIcons";
import {
  Input,
  Button,
  Badge,
  TruncatedText,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui";
import { ResponsiveTable, ResponsiveTableColumn } from "@/components/ui/responsive-table";
import { FinancialValue } from "@/components/common/FinancialValue";
import { useSortableColumns } from "@/hooks";
import {
  Search,
  CheckCircle,
  XCircle,
  Eye,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Pencil,
  Trash2,
  ArrowRightLeft,
  Calendar,
  Coins,
  AlertTriangle,
} from "lucide-react";
import { differenceInDays } from "date-fns";
import { format } from "date-fns";

interface Fund {
  id: string;
  code: string;
  name: string;
  asset: string;
}

interface PaginationProps {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

interface WithdrawalsTableProps {
  withdrawals: Withdrawal[];
  isLoading: boolean;
  filters: WithdrawalFilters;
  onFiltersChange: (filters: WithdrawalFilters) => void;
  onRefresh: () => void;
  funds?: Fund[];
  pagination?: PaginationProps;
  onViewDetails?: (withdrawal: Withdrawal) => void;
  // Action callbacks - dialogs are handled by parent component
  onApprove?: (withdrawal: Withdrawal) => void;
  onReject?: (withdrawal: Withdrawal) => void;
  onEdit?: (withdrawal: Withdrawal) => void;
  onDelete?: (withdrawal: Withdrawal) => void;
  onRouteToFees?: (withdrawal: Withdrawal) => void;
}

const statusColors: Record<WithdrawalFullStatus, string> = {
  pending: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  approved: "bg-green-500/10 text-green-600 border-green-500/20",
  processing: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  completed: "bg-green-700/10 text-green-700 border-green-700/20",
  rejected: "bg-red-500/10 text-red-600 border-red-500/20",
  cancelled: "bg-gray-500/10 text-gray-400 border-gray-500/20",
};

// Memoized ActionsDropdown component to prevent re-renders
interface ActionsDropdownProps {
  withdrawal: Withdrawal;
  onViewDetails?: (withdrawal: Withdrawal) => void;
  onApprove?: (withdrawal: Withdrawal) => void;
  onReject?: (withdrawal: Withdrawal) => void;
  onEdit?: (withdrawal: Withdrawal) => void;
  onDelete?: (withdrawal: Withdrawal) => void;
  onRouteToFees?: (withdrawal: Withdrawal) => void;
}

const canEdit = (status: WithdrawalFullStatus) => status === "pending";
const canDelete = (status: WithdrawalFullStatus) => status !== "completed";
const canRouteToFees = (status: WithdrawalFullStatus) => status === "pending";

const ActionsDropdown = memo(function ActionsDropdown({
  withdrawal,
  onViewDetails,
  onApprove,
  onReject,
  onEdit,
  onDelete,
  onRouteToFees,
}: ActionsDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" aria-label="Open actions menu">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {onViewDetails && (
          <DropdownMenuItem onClick={() => onViewDetails(withdrawal)}>
            <Eye className="h-4 w-4 mr-2" />
            View Details
          </DropdownMenuItem>
        )}

        {canEdit(withdrawal.status) && onEdit && (
          <DropdownMenuItem onClick={() => onEdit(withdrawal)}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        {withdrawal.status === "pending" && onApprove && (
          <DropdownMenuItem onClick={() => onApprove(withdrawal)}>
            <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
            Approve
          </DropdownMenuItem>
        )}

        {withdrawal.status === "pending" && onReject && (
          <DropdownMenuItem onClick={() => onReject(withdrawal)}>
            <XCircle className="h-4 w-4 mr-2 text-red-600" />
            Reject
          </DropdownMenuItem>
        )}

        {canRouteToFees(withdrawal.status) && onRouteToFees && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onRouteToFees(withdrawal)}>
              <ArrowRightLeft className="h-4 w-4 mr-2 text-primary" />
              Route to INDIGO FEES
            </DropdownMenuItem>
          </>
        )}

        {canDelete(withdrawal.status) && onDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(withdrawal)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

export const WithdrawalsTable = memo(function WithdrawalsTable({
  withdrawals,
  isLoading,
  filters,
  onFiltersChange,
  onRefresh,
  funds = [],
  pagination,
  onViewDetails,
  onApprove,
  onReject,
  onEdit,
  onDelete,
  onRouteToFees,
}: WithdrawalsTableProps) {
  // Add sorting capability
  const { sortConfig, requestSort, sortedData } = useSortableColumns(withdrawals, {
    column: "request_date",
    direction: "desc",
  });

  const displayedWithdrawals = useMemo(() => sortedData, [sortedData]);

  // Memoize filter handlers
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onFiltersChange({ ...filters, search: e.target.value });
    },
    [filters, onFiltersChange]
  );

  const handleStatusChange = useCallback(
    (value: string) => {
      onFiltersChange({ ...filters, status: value as WithdrawalFullStatus | "all" });
    },
    [filters, onFiltersChange]
  );

  const handleFundChange = useCallback(
    (value: string) => {
      onFiltersChange({ ...filters, fund_id: value === "all" ? undefined : value });
    },
    [filters, onFiltersChange]
  );

  // Render the memoized ActionsDropdown with all callbacks
  const renderActionsDropdown = useCallback(
    (withdrawal: Withdrawal) => (
      <ActionsDropdown
        withdrawal={withdrawal}
        onViewDetails={onViewDetails}
        onApprove={onApprove}
        onReject={onReject}
        onEdit={onEdit}
        onDelete={onDelete}
        onRouteToFees={onRouteToFees}
      />
    ),
    [onViewDetails, onApprove, onReject, onEdit, onDelete, onRouteToFees]
  );

  // Define columns for ResponsiveTable
  const columns: ResponsiveTableColumn<Withdrawal>[] = [
    {
      header: "Investor",
      cell: (w) => (
        <div className="flex flex-col max-w-[200px]">
          <TruncatedText text={w.investor_name} className="font-medium" />
          <TruncatedText text={w.investor_email} className="text-sm text-muted-foreground" />
        </div>
      ),
    },
    {
      header: "Amount",
      cell: (w) => (
        <div className="flex items-center gap-2">
          <CryptoIcon symbol={w.fund_class ?? "ASSET"} className="h-5 w-5" />
          <FinancialValue value={w.requested_amount} asset={w.fund_class ?? "UNITS"} showAsset />
        </div>
      ),
    },
    {
      header: "Type",
      cell: (w) => <Badge variant="outline">{w.withdrawal_type}</Badge>,
    },
    {
      header: "Status",
      cell: (w) => {
        const ageDays =
          w.status === "pending" ? differenceInDays(new Date(), new Date(w.request_date)) : 0;
        return (
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className={statusColors[w.status]}>
              {w.status}
            </Badge>
            {ageDays > 7 && (
              <span className="relative flex h-2.5 w-2.5" title={`Pending ${ageDays} days`}>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
              </span>
            )}
            {ageDays >= 3 && ageDays <= 7 && (
              <span title={`Pending ${ageDays} days`}>
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              </span>
            )}
          </div>
        );
      },
    },
    {
      header: "Request Date",
      cell: (w) => {
        const ageDays = differenceInDays(new Date(), new Date(w.request_date));
        return (
          <div>
            <span>{format(new Date(w.request_date), "MMM dd, yyyy")}</span>
            {w.status === "pending" && ageDays > 0 && (
              <span
                className={`block text-xs ${ageDays > 7 ? "text-red-500 font-medium" : ageDays >= 3 ? "text-amber-500" : "text-muted-foreground"}`}
              >
                {ageDays}d ago
              </span>
            )}
          </div>
        );
      },
    },
    {
      header: "Notes",
      cell: (w) => <span className="max-w-[200px] truncate">{w.notes || "-"}</span>,
    },
    {
      header: "Actions",
      cell: (w) => (
        <div className="flex items-center justify-end gap-1">
          {w.status === "pending" && onApprove && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-green-400 hover:text-green-300 hover:bg-green-500/10"
              onClick={() => onApprove(w)}
            >
              <CheckCircle className="h-3.5 w-3.5 mr-1" />
              Approve
            </Button>
          )}
          {w.status === "pending" && onReject && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-red-400 hover:text-red-300 hover:bg-red-500/10"
              onClick={() => onReject(w)}
            >
              <XCircle className="h-3.5 w-3.5" />
            </Button>
          )}
          {renderActionsDropdown(w)}
        </div>
      ),
      className: "text-right",
    },
  ];

  // Mobile card renderer
  const mobileCardRenderer = (withdrawal: Withdrawal) => (
    <div className="p-4 space-y-3">
      {/* Header: Investor name + Status */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <TruncatedText text={withdrawal.investor_name} className="font-medium text-sm" />
          <TruncatedText
            text={withdrawal.investor_email}
            className="text-xs text-muted-foreground"
          />
        </div>
        <Badge variant="outline" className={`${statusColors[withdrawal.status]} shrink-0`}>
          {withdrawal.status}
        </Badge>
      </div>

      {/* Amount and Type */}
      <div className="flex items-center justify-between gap-2 py-2 border-y border-border/50">
        <div className="flex items-center gap-2">
          <Coins className="h-4 w-4 text-muted-foreground" />
          <div className="flex items-center gap-1.5">
            <CryptoIcon symbol={withdrawal.fund_class ?? "ASSET"} className="h-4 w-4" />
            <FinancialValue
              value={withdrawal.requested_amount}
              asset={withdrawal.fund_class ?? "UNITS"}
              showAsset
              className="text-sm"
            />
          </div>
        </div>
        <Badge variant="outline" className="text-xs">
          {withdrawal.withdrawal_type}
        </Badge>
      </div>

      {/* Date */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Calendar className="h-3.5 w-3.5" />
        <span>{format(new Date(withdrawal.request_date), "MMM dd, yyyy")}</span>
      </div>

      {/* Notes (if any) */}
      {withdrawal.notes && (
        <p className="text-xs text-muted-foreground truncate">{withdrawal.notes}</p>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end pt-2 border-t border-border/50">
        <ActionsDropdown withdrawal={withdrawal} />
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by investor name, email, or ID..."
            value={filters.search || ""}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            className="pl-9"
          />
        </div>
        <Select
          value={filters.status || "all"}
          onValueChange={(value) =>
            onFiltersChange({ ...filters, status: value as WithdrawalFullStatus | "all" })
          }
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        {/* Fund Filter */}
        {funds.length > 0 && (
          <Select
            value={filters.fund_id || "all"}
            onValueChange={(value) =>
              onFiltersChange({ ...filters, fund_id: value === "all" ? undefined : value })
            }
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by fund" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Funds</SelectItem>
              {funds.map((fund) => (
                <SelectItem key={fund.id} value={fund.id}>
                  <span className="flex items-center gap-2">
                    <CryptoIcon symbol={fund.asset} className="h-4 w-4" />
                    {fund.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Responsive Table */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading withdrawals...</div>
      ) : (
        <ResponsiveTable
          data={displayedWithdrawals}
          columns={columns}
          keyExtractor={(w) => w.id}
          mobileCardRenderer={mobileCardRenderer}
          emptyMessage="No withdrawals found"
        />
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <p className="text-sm text-muted-foreground">
            Showing {(pagination.page - 1) * pagination.pageSize + 1} to{" "}
            {Math.min(pagination.page * pagination.pageSize, pagination.totalCount)} of{" "}
            {pagination.totalCount} withdrawals
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground px-2">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
});
