import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { Search, CheckCircle, XCircle } from "lucide-react";
import { depositService } from "@/services/investor/depositService";
import { ApproveDepositDialog } from "./ApproveDepositDialog";
import { RejectDepositDialog } from "./RejectDepositDialog";
import type { Deposit, DepositStatus } from "@/types/deposit";
import { format } from "date-fns";

export function DepositsTable() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<DepositStatus | "all">("all");
  const [selectedDeposit, setSelectedDeposit] = useState<Deposit | null>(null);
  const [action, setAction] = useState<"approve" | "reject" | null>(null);

  const { data: deposits, isLoading } = useQuery({
    queryKey: ["deposits", { search, status: statusFilter }],
    queryFn: () =>
      depositService.getDeposits({
        search,
        status: statusFilter === "all" ? undefined : statusFilter,
      }),
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

  if (isLoading) {
    return <div className="text-center py-8">Loading deposits...</div>;
  }

  return (
    <>
      <div className="space-y-4">
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
                      {deposit.amount.toLocaleString()}
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
                      {deposit.status === "pending" && (
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedDeposit(deposit);
                              setAction("approve");
                            }}
                          >
                            <CheckCircle className="h-4 w-4 text-success" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedDeposit(deposit);
                              setAction("reject");
                            }}
                          >
                            <XCircle className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {selectedDeposit && action === "approve" && (
        <ApproveDepositDialog
          deposit={selectedDeposit}
          open={action === "approve"}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedDeposit(null);
              setAction(null);
            }
          }}
        />
      )}

      {selectedDeposit && action === "reject" && (
        <RejectDepositDialog
          deposit={selectedDeposit}
          open={action === "reject"}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedDeposit(null);
              setAction(null);
            }
          }}
        />
      )}
    </>
  );
}
