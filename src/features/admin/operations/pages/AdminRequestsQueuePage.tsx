import { useState } from "react";
import {
  Button,
  Badge,
  Input,
  Label,
  Textarea,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui";
import { toast } from "sonner";
import { useWithdrawalRequests, useDepositsQueue, useRequestsQueueMutations } from "@/hooks/data";
import type { WithdrawalRequest } from "@/types/domains/requests";
import {
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  ArrowUpCircle,
  ArrowDownCircle,
  AlertCircle,
} from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";

export default function AdminRequestsQueuePage() {
  const [selectedRequest, setSelectedRequest] = useState<WithdrawalRequest | null>(null);
  const [approvalAmount, setApprovalAmount] = useState<string>("");
  const [adminNotes, setAdminNotes] = useState<string>("");
  const [rejectionReason, setRejectionReason] = useState<string>("");

  // Data hooks
  const {
    requests: withdrawalRequests,
    pendingCount: pendingWithdrawals,
    isLoading: withdrawalsLoading,
  } = useWithdrawalRequests();
  const {
    deposits,
    pendingCount: pendingDeposits,
    isLoading: depositsLoading,
  } = useDepositsQueue();

  // Mutation hooks
  const { approveMutation, rejectMutation } = useRequestsQueueMutations({
    withdrawalRequests,
    onSuccess: () => {
      setSelectedRequest(null);
      setApprovalAmount("");
      setAdminNotes("");
      setRejectionReason("");
    },
  });

  const getInvestorName = (profile?: {
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
  }) => {
    if (!profile) return "Unknown";
    const name = `${profile.first_name || ""} ${profile.last_name || ""}`.trim();
    return name || profile.email || "Unknown";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge
            variant="outline"
            className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
          >
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case "approved":
      case "verified":
        return (
          <Badge
            variant="outline"
            className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
          >
            <CheckCircle className="h-3 w-3 mr-1" />
            Approved
          </Badge>
        );
      case "rejected":
      case "failed":
        return (
          <Badge variant="destructive" className="bg-rose-500/10 text-rose-400 border-rose-500/20">
            <XCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        );
      case "completed":
        return (
          <Badge variant="default" className="bg-emerald-500 text-white hover:bg-emerald-400">
            <CheckCircle className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      case "processing":
        return (
          <Badge
            variant="outline"
            className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
          >
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Processing
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="bg-white/10 text-zinc-300">
            {status}
          </Badge>
        );
    }
  };

  const handleApproveWithdrawal = () => {
    if (!selectedRequest) return;
    const amount = approvalAmount ? approvalAmount : undefined;
    approveMutation.mutate({
      requestId: selectedRequest.id,
      amount,
      notes: adminNotes,
    });
  };

  const handleRejectWithdrawal = () => {
    if (!selectedRequest || !rejectionReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }
    rejectMutation.mutate({
      requestId: selectedRequest.id,
      reason: rejectionReason,
      notes: adminNotes,
    });
  };

  if (withdrawalsLoading || depositsLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
        </div>
      </div>
    );
  }

  return (
    <PageShell>
      <div>
        <h1 className="text-2xl font-display font-bold text-white tracking-tight">
          Requests Queue
        </h1>
        <p className="text-zinc-400 font-light mt-1">
          Manage deposit and withdrawal requests needing attention.
        </p>
      </div>

      <Tabs defaultValue="withdrawals" className="space-y-6">
        <TabsList className="bg-white/5 border border-white/10 p-1 rounded-full">
          <TabsTrigger
            value="withdrawals"
            className="rounded-full flex items-center gap-2 data-[state=active]:bg-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 px-6"
          >
            <ArrowDownCircle className="h-4 w-4" />
            Withdrawals ({pendingWithdrawals})
          </TabsTrigger>
          <TabsTrigger
            value="deposits"
            className="rounded-full flex items-center gap-2 data-[state=active]:bg-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 px-6"
          >
            <ArrowUpCircle className="h-4 w-4" />
            Deposits ({pendingDeposits})
          </TabsTrigger>
        </TabsList>

        {/* Withdrawal Requests */}
        <TabsContent value="withdrawals">
          <div className="glass-panel p-6 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-white">Withdrawal Requests</h2>
                <p className="text-zinc-400 text-sm">
                  Review and process investor withdrawal requests
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {withdrawalRequests?.length === 0 ? (
                <div className="text-center py-16 text-zinc-500 flex flex-col items-center gap-3">
                  <div className="p-4 rounded-full bg-white/5">
                    <CheckCircle className="h-8 w-8 text-zinc-600" />
                  </div>
                  <p>No withdrawal requests found</p>
                </div>
              ) : (
                withdrawalRequests?.map((request) => (
                  <div
                    key={request.id}
                    className="glass-card p-5 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-all duration-300 group"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-300 font-bold border border-indigo-500/30">
                          {getInvestorName(request.profile).charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-white flex items-center gap-2">
                            {getInvestorName(request.profile)}
                            {getStatusBadge(request.status)}
                          </div>
                          <div className="text-sm text-zinc-400">
                            {request.profile?.email || "unknown"}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-xl font-bold text-white tracking-tight">
                          ${parseFloat(String(request.requested_amount || 0)).toLocaleString()}
                        </div>
                        <div className="text-sm text-indigo-300 font-medium">
                          {request.funds.name}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4 border-t border-dashed border-white/10 pt-4">
                      <div>
                        <span className="text-zinc-500 block text-xs uppercase tracking-wider mb-1">
                          Fund Class
                        </span>
                        <span className="text-zinc-300 font-medium">{request.fund_class}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block text-xs uppercase tracking-wider mb-1">
                          Type
                        </span>
                        <span className="capitalize text-zinc-300 font-medium">
                          {request.withdrawal_type}
                        </span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block text-xs uppercase tracking-wider mb-1">
                          Requested
                        </span>
                        <span className="text-zinc-300 font-medium">
                          {new Date(request.request_date || new Date()).toLocaleDateString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block text-xs uppercase tracking-wider mb-1">
                          Status
                        </span>
                        <span className="capitalize text-zinc-300 font-medium">
                          {request.status}
                        </span>
                      </div>
                    </div>

                    {request.notes && (
                      <div className="text-sm mb-4 bg-yellow-500/5 border border-yellow-500/10 p-3 rounded-lg flex gap-2">
                        <AlertCircle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
                        <span className="text-yellow-200/80 italic">"{request.notes}"</span>
                      </div>
                    )}

                    {request.status === "pending" && (
                      <div className="flex gap-3 justify-end pt-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              className="border-rose-500/20 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 hover:border-rose-500/40 bg-transparent"
                              onClick={() => {
                                setSelectedRequest(request);
                                setRejectionReason("");
                                setAdminNotes("");
                              }}
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Reject
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="glass-dialog border-white/10 bg-black/90 backdrop-blur-2xl">
                            <DialogHeader>
                              <DialogTitle className="text-white">
                                Reject Withdrawal Request
                              </DialogTitle>
                              <DialogDescription className="text-zinc-400">
                                Provide a reason for rejecting {getInvestorName(request.profile)}'s
                                withdrawal request
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 pt-4">
                              <div>
                                <Label className="text-zinc-300">Rejection Reason *</Label>
                                <Textarea
                                  value={rejectionReason}
                                  onChange={(e) => setRejectionReason(e.target.value)}
                                  placeholder="Please provide a clear reason for rejection..."
                                  required
                                  className="glass-input bg-white/5 border-white/10 text-white placeholder:text-zinc-600 focus:border-rose-500/50 focus:ring-rose-500/20 min-h-[100px]"
                                />
                              </div>
                              <div>
                                <Label className="text-zinc-300">Admin Notes</Label>
                                <Textarea
                                  value={adminNotes}
                                  onChange={(e) => setAdminNotes(e.target.value)}
                                  placeholder="Additional internal notes..."
                                  className="glass-input bg-white/5 border-white/10 text-white placeholder:text-zinc-600 focus:border-indigo-500/50 focus:ring-indigo-500/20"
                                />
                              </div>
                            </div>
                            <DialogFooter>
                              <Button
                                className="bg-rose-600 text-white hover:bg-rose-700 hover:shadow-lg hover:shadow-rose-900/20 border-0"
                                onClick={handleRejectWithdrawal}
                                disabled={rejectMutation.isPending}
                              >
                                {rejectMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                  <XCircle className="h-4 w-4 mr-2" />
                                )}
                                Reject Request
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>

                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 border-0"
                              onClick={() => {
                                setSelectedRequest(request);
                                setApprovalAmount(String(request.requested_amount));
                              }}
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Approve
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="glass-dialog border-white/10 bg-black/90 backdrop-blur-2xl">
                            <DialogHeader>
                              <DialogTitle className="text-white">
                                Approve & Complete Withdrawal
                              </DialogTitle>
                              <DialogDescription className="text-zinc-400">
                                Approve and complete the withdrawal request for{" "}
                                {getInvestorName(request.profile)}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 pt-4">
                              <div>
                                <Label className="text-zinc-300">Approved Amount ($)</Label>
                                <Input
                                  type="number"
                                  value={approvalAmount}
                                  onChange={(e) => setApprovalAmount(e.target.value)}
                                  placeholder={String(request.requested_amount)}
                                  className="glass-input bg-white/5 border-white/10 text-white placeholder:text-zinc-600 focus:border-emerald-500/50 focus:ring-emerald-500/20 text-lg font-mono"
                                />
                              </div>
                              <div>
                                <Label className="text-zinc-300">Admin Notes</Label>
                                <Textarea
                                  value={adminNotes}
                                  onChange={(e) => setAdminNotes(e.target.value)}
                                  placeholder="Optional notes..."
                                  className="glass-input bg-white/5 border-white/10 text-white placeholder:text-zinc-600 focus:border-indigo-500/50 focus:ring-indigo-500/20"
                                />
                              </div>
                            </div>
                            <DialogFooter>
                              <Button
                                onClick={handleApproveWithdrawal}
                                disabled={approveMutation.isPending}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white border-0"
                              >
                                {approveMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                )}
                                Approve & Complete
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </TabsContent>

        {/* Deposit Requests */}
        <TabsContent value="deposits">
          <div className="glass-panel p-6 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-white">Deposit Requests</h2>
                <p className="text-zinc-400 text-sm">Recorded deposits (auto-completed)</p>
              </div>
            </div>

            <div className="space-y-4">
              {deposits?.length === 0 ? (
                <div className="text-center py-16 text-zinc-500 flex flex-col items-center gap-3">
                  <div className="p-4 rounded-full bg-white/5">
                    <DollarSign className="h-8 w-8 text-zinc-600" />
                  </div>
                  <p>No deposits found</p>
                </div>
              ) : (
                deposits?.map((deposit) => (
                  <div
                    key={deposit.id}
                    className="glass-card p-5 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-all duration-300"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-300 font-bold border border-emerald-500/30">
                          <DollarSign className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="font-semibold text-white flex items-center gap-2">
                            {getInvestorName(deposit.profile)}
                            {getStatusBadge(deposit.status || "completed")}
                          </div>
                          <div className="text-sm text-zinc-400">
                            {deposit.profile?.email || "unknown"}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-xl font-bold text-emerald-400 tracking-tight flex items-center gap-1 justify-end">
                          +${parseFloat(String(deposit.amount || 0)).toLocaleString()}
                        </div>
                        <div className="text-sm text-zinc-400">{deposit.funds?.name || "N/A"}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mt-4 border-t border-white/5 pt-4">
                      <div>
                        <span className="text-zinc-500 block text-xs uppercase tracking-wider mb-1">
                          Fund Class
                        </span>
                        <span className="text-zinc-300">{deposit.funds?.fund_class || "N/A"}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block text-xs uppercase tracking-wider mb-1">
                          Date
                        </span>
                        <span className="text-zinc-300">
                          {new Date(deposit.created_at || new Date()).toLocaleDateString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block text-xs uppercase tracking-wider mb-1">
                          Status
                        </span>
                        <span className="capitalize text-zinc-300">
                          {deposit.status || "completed"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
