import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Input,
  Button,
  Badge,
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
import { Search, CheckCircle, XCircle, MoreHorizontal, RefreshCw, Trash2 } from "lucide-react";
import { useDeposits } from "@/hooks/data/admin";
import { ApproveDepositDialog } from "./ApproveDepositDialog";
import { RejectDepositDialog } from "./RejectDepositDialog";
import { VoidAndReissueDialog } from "@/components/admin/transactions/VoidAndReissueDialog";
import { VoidTransactionDialog } from "@/components/admin/transactions/VoidTransactionDialog";
import type { Deposit, DepositStatus, DepositFilters } from "@/types/domains";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateAfterDeposit } from "@/utils/cacheInvalidation";

interface DepositsTableProps {
  filters?: DepositFilters;
  onFiltersChange?: (filters: DepositFilters) => void;
}

export function DepositsTable({ filters, onFiltersChange }: DepositsTableProps) {
  const queryClient = useQueryClient();

  // Local UI state for inputs (debounced before propagating)
  const [searchInput, setSearchInput] = useState(filters?.search || "");
  const [statusFilter, setStatusFilter] = useState<DepositStatus | "all">("all");
  const [selectedDeposit, setSelectedDeposit] = useState<Deposit | null>(null);
  const [action, setAction] = useState<"approve" | "reject" | "reissue" | "void" | null>(null);

  // Sync filters to parent when they change
  useEffect(() => {
    const handler = setTimeout(() => {
      onFiltersChange?.({
        ...filters,
        search: searchInput || undefined,
        status: statusFilter === "all" ? undefined : statusFilter,
      });
    }, 300); // Debounce search input

    return () => clearTimeout(handler);
  }, [searchInput, statusFilter]);

  const { data: deposits, isLoading } = useDeposits({
    search: searchInput || undefined,
    status: statusFilter === "all" ? undefined : statusFilter,
  });

  // Map deposit to transaction format for edit/void dialogs
  const mapDepositToTransaction = (deposit: Deposit) => ({
    id: deposit.id,
    type: "DEPOSIT",
    amount: String(deposit.amount), // Convert to string for NUMERIC precision preservation
    asset: deposit.asset_symbol,
    investorName: deposit.user_name || "Unknown",
    txDate: deposit.created_at.split("T")[0],
    notes: null,
    txHash: deposit.transaction_hash,
    isSystemGenerated: false,
  });

  const getStatusBadge = (status: DepositStatus) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "verified":
        return <Badge variant="default">Verified</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleDialogClose = () => {
    setSelectedDeposit(null);
    setAction(null);
  };

  const handleSuccess = () => {
    // Use centralized cache invalidation for consistent UI updates
    invalidateAfterDeposit(queryClient);
    handleDialogClose();
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading deposits...</div>;
  }

  return (
    <>
      <div className="space-y-4" data-testid="depositstable" role="region">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by transaction hash or asset..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as DepositStatus | "all")}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="verified">Verified</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Asset</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Transaction Hash</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deposits?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No deposits found
                  </TableCell>
                </TableRow>
              ) : (
                deposits?.map((deposit: Deposit) => (
                  <TableRow key={deposit.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{deposit.user_name || "—"}</div>
                        <div className="text-sm text-muted-foreground">
                          {deposit.user_email || "—"}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{deposit.asset_symbol}</Badge>
                    </TableCell>
                    <TableCell className="font-semibold">
                      {deposit.amount.toLocaleString()} {deposit.asset_symbol}
                    </TableCell>
                    <TableCell>{getStatusBadge(deposit.status)}</TableCell>
                    <TableCell>
                      {deposit.transaction_hash ? (
                        <span className="font-mono text-xs">
                          {deposit.transaction_hash.substring(0, 16)}...
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>{format(new Date(deposit.created_at), "MMM d, yyyy")}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedDeposit(deposit);
                              setAction("reissue");
                            }}
                          >
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Void & Reissue
                          </DropdownMenuItem>

                          {deposit.status === "pending" && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedDeposit(deposit);
                                  setAction("approve");
                                }}
                              >
                                <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                                Approve
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedDeposit(deposit);
                                  setAction("reject");
                                }}
                              >
                                <XCircle className="mr-2 h-4 w-4 text-destructive" />
                                Reject
                              </DropdownMenuItem>
                            </>
                          )}

                          {deposit.status !== "rejected" && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedDeposit(deposit);
                                  setAction("void");
                                }}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Void
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
      </div>

      {/* Approve Dialog */}
      {selectedDeposit && action === "approve" && (
        <ApproveDepositDialog
          deposit={selectedDeposit}
          open={action === "approve"}
          onOpenChange={(open) => {
            if (!open) handleDialogClose();
          }}
        />
      )}

      {/* Reject Dialog */}
      {selectedDeposit && action === "reject" && (
        <RejectDepositDialog
          deposit={selectedDeposit}
          open={action === "reject"}
          onOpenChange={(open) => {
            if (!open) handleDialogClose();
          }}
        />
      )}

      {/* Void & Reissue Dialog */}
      <VoidAndReissueDialog
        open={action === "reissue" && !!selectedDeposit}
        onOpenChange={(open) => {
          if (!open) handleDialogClose();
        }}
        transaction={selectedDeposit ? mapDepositToTransaction(selectedDeposit) : null}
        onSuccess={handleSuccess}
      />

      {/* Void Dialog - uses transaction dialog */}
      <VoidTransactionDialog
        open={action === "void" && !!selectedDeposit}
        onOpenChange={(open) => {
          if (!open) handleDialogClose();
        }}
        transaction={selectedDeposit ? mapDepositToTransaction(selectedDeposit) : null}
        onSuccess={handleSuccess}
      />
    </>
  );
}
