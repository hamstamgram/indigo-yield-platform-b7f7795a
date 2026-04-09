/**
 * Investor Withdrawals Tab
 * Shows withdrawal requests for a specific investor with inline approve/reject
 * URL-persisted status filter
 * Migrated to React Query for data fetching
 */

import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Card,
  CardContent,
  Button,
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import {
  ArrowDownToLine,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";
import { ApproveWithdrawalDialog } from "@/features/admin/withdrawals/components/ApproveWithdrawalDialog";
import { RejectWithdrawalDialog } from "@/features/admin/withdrawals/components/RejectWithdrawalDialog";
import { Withdrawal, WithdrawalFullStatus } from "@/types/domains";
import { formatAssetAmount } from "@/utils/assets";
import { CryptoIcon } from "@/components/CryptoIcons";
import { useAdminInvestorWithdrawals } from "@/features/admin/investors/hooks/useAdminInvestorWithdrawals";
interface InvestorWithdrawalsTabProps {
  investorId: string;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  approved: "bg-yield/10 text-yield border-yield/20",
  processing: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  completed: "bg-yield/10 text-yield border-yield/20",
  rejected: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  cancelled: "bg-gray-500/10 text-gray-400 border-gray-500/20",
};

const validStatuses: (WithdrawalFullStatus | "all")[] = ["all", "pending", "completed", "rejected"];

export function InvestorWithdrawalsTab({ investorId }: InvestorWithdrawalsTabProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(null);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);

  // URL-persisted status filter
  const statusParam = searchParams.get("wd_status") || "all";
  const statusFilter: WithdrawalFullStatus | "all" = validStatuses.includes(
    statusParam as WithdrawalFullStatus | "all"
  )
    ? (statusParam as WithdrawalFullStatus | "all")
    : "all";

  const setStatusFilter = (value: WithdrawalFullStatus | "all") => {
    setSearchParams(
      (prev) => {
        const newParams = new URLSearchParams(prev);
        if (value === "all") {
          newParams.delete("wd_status");
        } else {
          newParams.set("wd_status", value);
        }
        return newParams;
      },
      { replace: true }
    );
  };

  // React Query hook for withdrawals
  const {
    data: withdrawals = [],
    isLoading,
    refetch,
  } = useAdminInvestorWithdrawals(investorId, statusFilter);

  const pendingCount = withdrawals.filter((w) => w.status === "pending").length;

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with filter */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ArrowDownToLine className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold">Withdrawal Requests</h3>
          {pendingCount > 0 && <Badge variant="destructive">{pendingCount} pending</Badge>}
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as WithdrawalFullStatus | "all")}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Withdrawals list */}
      {withdrawals.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <ArrowDownToLine className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No withdrawal requests found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {withdrawals.map((withdrawal) => (
            <Card key={withdrawal.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-medium flex items-center gap-1.5">
                        <CryptoIcon symbol={withdrawal.fund_class || "UNITS"} className="h-4 w-4" />
                        {formatAssetAmount(
                          withdrawal.requested_amount,
                          withdrawal.fund_class || "UNITS"
                        )}
                      </span>
                      <Badge variant="outline">{withdrawal.withdrawal_type}</Badge>
                      {withdrawal.withdrawal_type === "full" && (
                        <AlertTriangle className="h-3 w-3 text-amber-500" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{format(new Date(withdrawal.request_date), "MMM dd, yyyy")}</span>
                      <Badge variant="outline" className={statusColors[withdrawal.status] || ""}>
                        {withdrawal.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {withdrawal.status === "pending" && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedWithdrawal(withdrawal);
                            setApproveDialogOpen(true);
                          }}
                        >
                          <CheckCircle className="h-4 w-4 text-yield" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedWithdrawal(withdrawal);
                            setRejectDialogOpen(true);
                          }}
                        >
                          <XCircle className="h-4 w-4 text-rose-400" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialogs */}
      {selectedWithdrawal && (
        <>
          <ApproveWithdrawalDialog
            open={approveDialogOpen}
            onOpenChange={setApproveDialogOpen}
            withdrawal={selectedWithdrawal}
            onSuccess={() => refetch()}
          />
          <RejectWithdrawalDialog
            open={rejectDialogOpen}
            onOpenChange={setRejectDialogOpen}
            withdrawal={selectedWithdrawal}
            onSuccess={() => refetch()}
          />
        </>
      )}
    </div>
  );
}

export default InvestorWithdrawalsTab;
