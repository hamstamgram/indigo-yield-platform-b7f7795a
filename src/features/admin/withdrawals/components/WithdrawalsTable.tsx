import React, { useMemo, useCallback, memo } from "react";
import { Withdrawal, WithdrawalFilters, WithdrawalFullStatus } from "@/types/domains";
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
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  SortableTableHead,
} from "@/components/ui";
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
  Ban,
  Undo2,
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

interface SelectionProps {
  selectedIds: Set<string>;
  toggleOne: (id: string) => void;
  toggleAll: () => void;
  isSelected: (id: string) => boolean;
  isAllSelected: boolean;
  isIndeterminate: boolean;
}

interface WithdrawalsTableProps {
  withdrawals: Withdrawal[];
  isLoading: boolean;
  filters: WithdrawalFilters;
  onFiltersChange: (filters: WithdrawalFilters) => void;
  onRefresh: () => void;
  funds?: Fund[];
  pagination?: PaginationProps;
  selection?: SelectionProps;
  onViewDetails?: (withdrawal: Withdrawal) => void;
  // Action callbacks - dialogs are handled by parent component
  onApprove?: (withdrawal: Withdrawal) => void;
  onReject?: (withdrawal: Withdrawal) => void;
  onEdit?: (withdrawal: Withdrawal) => void;
  onDelete?: (withdrawal: Withdrawal) => void;
  onVoid?: (withdrawal: Withdrawal) => void;
  onRestore?: (withdrawal: Withdrawal) => void;
  onRouteToFees?: (withdrawal: Withdrawal) => void;
}

const statusColors: Record<WithdrawalFullStatus, string> = {
  pending:
    "bg-amber-500/10 text-amber-500 border-amber-500/20 uppercase tracking-wider text-[10px] font-mono",
  approved: "bg-yield/10 text-yield border-yield/20 uppercase tracking-wider text-[10px] font-mono",
  processing:
    "bg-indigo-500/10 text-indigo-400 border-indigo-500/20 uppercase tracking-wider text-[10px] font-mono",
  completed:
    "bg-yield/10 text-yield border-yield/20 uppercase tracking-wider text-[10px] font-mono",
  rejected:
    "bg-rose-500/10 text-rose-400 border-rose-500/20 uppercase tracking-wider text-[10px] font-mono",
  cancelled:
    "bg-gray-500/10 text-gray-400 border-gray-500/20 uppercase tracking-wider text-[10px] font-mono",
};

// Memoized ActionsDropdown component to prevent re-renders
interface ActionsDropdownProps {
  withdrawal: Withdrawal;
  onViewDetails?: (withdrawal: Withdrawal) => void;
  onApprove?: (withdrawal: Withdrawal) => void;
  onReject?: (withdrawal: Withdrawal) => void;
  onEdit?: (withdrawal: Withdrawal) => void;
  onDelete?: (withdrawal: Withdrawal) => void;
  onVoid?: (withdrawal: Withdrawal) => void;
  onRestore?: (withdrawal: Withdrawal) => void;
  onRouteToFees?: (withdrawal: Withdrawal) => void;
}

const canEdit = (status: WithdrawalFullStatus) => status === "pending";
const canDelete = (_status: WithdrawalFullStatus) => true;
const canVoid = (status: WithdrawalFullStatus) =>
  status === "pending" ||
  status === "approved" ||
  status === "processing" ||
  status === "completed";
const canRestore = (status: WithdrawalFullStatus) =>
  status === "cancelled" || status === "rejected";
const canRouteToFees = (status: WithdrawalFullStatus) => status === "pending";

const ActionsDropdown = memo(function ActionsDropdown({
  withdrawal,
  onViewDetails,
  onApprove,
  onReject,
  onEdit,
  onDelete,
  onVoid,
  onRestore,
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
            <CheckCircle className="h-4 w-4 mr-2 text-yield" />
            Approve
          </DropdownMenuItem>
        )}

        {withdrawal.status === "pending" && onReject && (
          <DropdownMenuItem onClick={() => onReject(withdrawal)}>
            <XCircle className="h-4 w-4 mr-2 text-rose-400" />
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

        {canVoid(withdrawal.status) && onVoid && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onVoid(withdrawal)}
              className="text-destructive focus:text-destructive"
            >
              <Ban className="h-4 w-4 mr-2" />
              Void
            </DropdownMenuItem>
          </>
        )}

        {canRestore(withdrawal.status) && onRestore && (
          <DropdownMenuItem onClick={() => onRestore(withdrawal)}>
            <Undo2 className="h-4 w-4 mr-2" />
            Restore
          </DropdownMenuItem>
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
  selection,
  onViewDetails,
  onApprove,
  onReject,
  onEdit,
  onDelete,
  onVoid,
  onRestore,
  onRouteToFees,
}: WithdrawalsTableProps) {
  // Add sorting capability
  const { sortConfig, requestSort, sortedData } = useSortableColumns(withdrawals, {
    column: "request_date",
    direction: "desc",
  });

  const displayedWithdrawals = useMemo(() => sortedData, [sortedData]);

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
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
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

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading withdrawals...</div>
      ) : displayedWithdrawals.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground bg-muted/10 rounded-lg border border-dashed">
          No withdrawals found
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-auto rounded-md border">
            <Table className="text-xs">
              <TableHeader>
                <TableRow>
                  {selection && (
                    <TableHead className="w-[40px] px-2">
                      <Checkbox
                        checked={
                          selection.isAllSelected
                            ? true
                            : selection.isIndeterminate
                              ? "indeterminate"
                              : false
                        }
                        onCheckedChange={selection.toggleAll}
                        aria-label="Select all"
                      />
                    </TableHead>
                  )}
                  <SortableTableHead
                    column="investor_name"
                    currentSort={sortConfig}
                    onSort={requestSort}
                    className="whitespace-nowrap"
                  >
                    Investor
                  </SortableTableHead>
                  <SortableTableHead
                    column="requested_amount"
                    currentSort={sortConfig}
                    onSort={requestSort}
                    className="whitespace-nowrap"
                  >
                    Amount
                  </SortableTableHead>
                  <SortableTableHead
                    column="withdrawal_type"
                    currentSort={sortConfig}
                    onSort={requestSort}
                    className="whitespace-nowrap"
                  >
                    Type
                  </SortableTableHead>
                  <SortableTableHead
                    column="status"
                    currentSort={sortConfig}
                    onSort={requestSort}
                    className="whitespace-nowrap"
                  >
                    Status
                  </SortableTableHead>
                  <SortableTableHead
                    column="request_date"
                    currentSort={sortConfig}
                    onSort={requestSort}
                    className="whitespace-nowrap"
                  >
                    Request Date
                  </SortableTableHead>
                  <SortableTableHead
                    column="settlement_date"
                    currentSort={sortConfig}
                    onSort={requestSort}
                    className="whitespace-nowrap"
                  >
                    Settlement Date
                  </SortableTableHead>
                  <TableHead className="whitespace-nowrap">Notes</TableHead>
                  <TableHead className="w-[50px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedWithdrawals.map((w) => {
                  const isSelectable = true;
                  const isCancelledOrRejected = w.status === "cancelled" || w.status === "rejected";
                  const ageDays =
                    w.status === "pending"
                      ? differenceInDays(new Date(), new Date(w.request_date))
                      : 0;
                  const dateAgeDays = differenceInDays(new Date(), new Date(w.request_date));

                  return (
                    <TableRow
                      key={w.id}
                      className={isCancelledOrRejected ? "opacity-50 bg-muted/30" : ""}
                    >
                      {selection && (
                        <TableCell className="px-2 py-1.5">
                          {isSelectable ? (
                            <Checkbox
                              checked={selection.isSelected(w.id)}
                              onCheckedChange={() => selection.toggleOne(w.id)}
                              aria-label={`Select withdrawal ${w.id}`}
                            />
                          ) : null}
                        </TableCell>
                      )}
                      <TableCell className="py-1.5">
                        <div className="flex flex-col max-w-[200px]">
                          <TruncatedText text={w.investor_name} className="font-medium" />
                          <TruncatedText
                            text={w.investor_email}
                            className="text-sm text-muted-foreground"
                          />
                        </div>
                      </TableCell>
                      <TableCell className="py-1.5">
                        <div className="flex items-center gap-2">
                          <CryptoIcon
                            symbol={w.asset || w.fund_class || "ASSET"}
                            className="h-5 w-5"
                          />
                          <FinancialValue
                            value={w.processed_amount || w.requested_amount}
                            asset={w.asset || w.fund_class || "UNITS"}
                            showAsset
                          />
                        </div>
                      </TableCell>
                      <TableCell className="py-1.5">
                        <Badge
                          variant="outline"
                          className="font-mono tracking-wider text-[10px] uppercase text-muted-foreground"
                        >
                          {w.withdrawal_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-1.5">
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className={statusColors[w.status]}>
                            {w.status}
                          </Badge>
                          {ageDays > 7 && (
                            <span
                              className="relative flex h-2.5 w-2.5"
                              title={`Pending ${ageDays} days`}
                            >
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
                      </TableCell>
                      <TableCell className="py-1.5">
                        <div>
                          <span>{format(new Date(w.request_date), "MMM dd, yyyy")}</span>
                          {w.status === "pending" && dateAgeDays > 0 && (
                            <span
                              className={`block text-xs ${dateAgeDays > 7 ? "text-red-500 font-medium" : dateAgeDays >= 3 ? "text-amber-500" : "text-muted-foreground"}`}
                            >
                              {dateAgeDays}d ago
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-1.5">
                        <span className="max-w-[200px] truncate">{w.notes || "-"}</span>
                      </TableCell>
                      <TableCell className="py-1.5">
                        <div className="flex items-center justify-end gap-1">
                          {w.status === "pending" && onApprove && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-yield hover:text-green-300 hover:bg-yield/10"
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
                          <ActionsDropdown
                            withdrawal={w}
                            onViewDetails={onViewDetails}
                            onApprove={onApprove}
                            onReject={onReject}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            onVoid={onVoid}
                            onRestore={onRestore}
                            onRouteToFees={onRouteToFees}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile View */}
          <div className="md:hidden space-y-4">
            {displayedWithdrawals.map((withdrawal) => (
              <div key={withdrawal.id} className="rounded-md border p-4 space-y-3">
                {/* Header: Investor name + Status + Checkbox */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 min-w-0 flex-1">
                    {selection && (
                      <Checkbox
                        checked={selection.isSelected(withdrawal.id)}
                        onCheckedChange={() => selection.toggleOne(withdrawal.id)}
                        aria-label={`Select withdrawal ${withdrawal.id}`}
                        className="mt-0.5"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <TruncatedText
                        text={withdrawal.investor_name}
                        className="font-medium text-sm"
                      />
                      <TruncatedText
                        text={withdrawal.investor_email}
                        className="text-xs text-muted-foreground"
                      />
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={`${statusColors[withdrawal.status]} shrink-0`}
                  >
                    {withdrawal.status}
                  </Badge>
                </div>

                {/* Amount and Type */}
                <div className="flex items-center justify-between gap-2 py-2 border-y border-border/50">
                  <div className="flex items-center gap-2">
                    <Coins className="h-4 w-4 text-muted-foreground" />
                    <div className="flex items-center gap-1.5">
                      <CryptoIcon
                        symbol={withdrawal.asset || withdrawal.fund_class || "ASSET"}
                        className="h-4 w-4"
                      />
                      <FinancialValue
                        value={withdrawal.processed_amount || withdrawal.requested_amount}
                        asset={withdrawal.asset || withdrawal.fund_class || "UNITS"}
                        showAsset
                        className="text-sm"
                      />
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className="font-mono tracking-wider text-[10px] uppercase text-muted-foreground"
                  >
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
                  <ActionsDropdown
                    withdrawal={withdrawal}
                    onViewDetails={onViewDetails}
                    onApprove={onApprove}
                    onReject={onReject}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onVoid={onVoid}
                    onRestore={onRestore}
                    onRouteToFees={onRouteToFees}
                  />
                </div>
              </div>
            ))}
          </div>
        </>
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
