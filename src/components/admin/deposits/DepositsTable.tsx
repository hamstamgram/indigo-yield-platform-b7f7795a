import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, CheckCircle, XCircle, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useDeposits } from "@/hooks/data/admin";
import { ApproveDepositDialog } from "./ApproveDepositDialog";
import { RejectDepositDialog } from "./RejectDepositDialog";
import { EditTransactionDialog } from "@/components/admin/transactions/EditTransactionDialog";
import { VoidTransactionDialog } from "@/components/admin/transactions/VoidTransactionDialog";
import type { Deposit, DepositStatus } from "@/types/deposit";
import { format } from "date-fns";

export function DepositsTable() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<DepositStatus | "all">("all");
  const [selectedDeposit, setSelectedDeposit] = useState<Deposit | null>(null);
  const [action, setAction] = useState<"approve" | "reject" | "edit" | "void" | null>(null);

  const { data: deposits, isLoading, refetch } = useDeposits({
    search,
    status: statusFilter === "all" ? undefined : statusFilter,
  });

  // Map deposit to transaction format for edit/void dialogs
  const mapDepositToTransaction = (deposit: Deposit) => ({
    id: deposit.id,
    type: "DEPOSIT",
    amount: deposit.amount,
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
    refetch();
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
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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
                              setAction("edit");
                            }}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
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

      {/* Edit Dialog - uses transaction dialog */}
      <EditTransactionDialog
        open={action === "edit" && !!selectedDeposit}
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
