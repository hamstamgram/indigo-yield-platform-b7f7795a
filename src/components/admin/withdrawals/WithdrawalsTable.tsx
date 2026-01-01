import { useMemo } from "react";
import { Withdrawal, WithdrawalFilters, WithdrawalFullStatus } from "@/types/domains";
import { getAssetLogo, formatAssetAmount } from "@/utils/assets";
import {
  Table, TableBody, TableCell, TableHeader, TableRow,
  SortableTableHead, Input, Button, Badge, TruncatedText,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui";
import { useSortableColumns } from "@/hooks";
import { 
  Search, CheckCircle, XCircle, Play, CheckCircle2, Loader2, Eye, 
  ChevronLeft, ChevronRight, MoreHorizontal, Pencil, Trash2, ArrowRightLeft 
} from "lucide-react";
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
  onStartProcessing?: (withdrawal: Withdrawal) => void;
  onComplete?: (withdrawal: Withdrawal) => void;
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
  cancelled: "bg-gray-500/10 text-gray-600 border-gray-500/20",
};

export function WithdrawalsTable({
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
  onStartProcessing,
  onComplete,
  onEdit,
  onDelete,
  onRouteToFees,
}: WithdrawalsTableProps) {
  const canEdit = (status: WithdrawalFullStatus) => status === "pending" || status === "approved";
  const canDelete = (status: WithdrawalFullStatus) => status !== "completed";
  const canRouteToFees = (status: WithdrawalFullStatus) => 
    status === "approved" || status === "processing";

  // Add sorting capability
  const { sortConfig, requestSort, sortedData } = useSortableColumns(withdrawals, {
    column: 'request_date',
    direction: 'desc'
  });

  const displayedWithdrawals = useMemo(() => sortedData, [sortedData]);

  return (
    <div className="space-y-4">
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
                  {fund.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableTableHead
                column="investor_name"
                currentSort={sortConfig}
                onSort={requestSort}
              >
                Investor
              </SortableTableHead>
              <SortableTableHead
                column="requested_amount"
                currentSort={sortConfig}
                onSort={requestSort}
              >
                Amount
              </SortableTableHead>
              <SortableTableHead
                column="withdrawal_type"
                currentSort={sortConfig}
                onSort={requestSort}
              >
                Type
              </SortableTableHead>
              <SortableTableHead
                column="status"
                currentSort={sortConfig}
                onSort={requestSort}
              >
                Status
              </SortableTableHead>
              <SortableTableHead
                column="request_date"
                currentSort={sortConfig}
                onSort={requestSort}
              >
                Request Date
              </SortableTableHead>
              <SortableTableHead
                column="notes"
                currentSort={sortConfig}
                onSort={requestSort}
              >
                Notes
              </SortableTableHead>
              <SortableTableHead
                column=""
                currentSort={{ column: '', direction: null }}
                onSort={() => {}}
                className="text-right"
              >
                Actions
              </SortableTableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : displayedWithdrawals.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  No withdrawals found
                </TableCell>
              </TableRow>
            ) : (
              displayedWithdrawals.map((withdrawal) => (
                <TableRow key={withdrawal.id}>
                  <TableCell>
                    <div className="flex flex-col max-w-[200px]">
                      <TruncatedText 
                        text={withdrawal.investor_name} 
                        className="font-medium"
                      />
                      <TruncatedText 
                        text={withdrawal.investor_email} 
                        className="text-sm text-muted-foreground"
                      />
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <img
                        src={getAssetLogo((withdrawal.fund_class || "ASSET").toUpperCase())}
                        alt={withdrawal.fund_class || "ASSET"}
                        className="h-5 w-5 rounded-full border"
                        onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
                      />
                      <span>
                        {formatAssetAmount(withdrawal.requested_amount, withdrawal.fund_class || "UNITS")}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{withdrawal.withdrawal_type}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusColors[withdrawal.status]}>
                      {withdrawal.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{format(new Date(withdrawal.request_date), "MMM dd, yyyy")}</TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {withdrawal.notes || "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
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
                        
                        {withdrawal.status === "approved" && onStartProcessing && (
                          <DropdownMenuItem onClick={() => onStartProcessing(withdrawal)}>
                            <Play className="h-4 w-4 mr-2 text-blue-600" />
                            Start Processing
                          </DropdownMenuItem>
                        )}
                        
                        {withdrawal.status === "processing" && onComplete && (
                          <DropdownMenuItem onClick={() => onComplete(withdrawal)}>
                            <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
                            Complete
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
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <p className="text-sm text-muted-foreground">
            Showing {((pagination.page - 1) * pagination.pageSize) + 1} to{" "}
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
}
