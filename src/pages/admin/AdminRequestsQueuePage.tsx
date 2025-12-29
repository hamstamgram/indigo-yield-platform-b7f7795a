import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useWithdrawalRequests, useDepositsQueue } from "@/hooks/data/useRequestsQueueData";
import { useRequestsQueueMutations } from "@/hooks/data/useRequestsQueueMutations";
import type { WithdrawalRequest } from "@/types/domains/requests";
import {
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  ArrowUpCircle,
  ArrowDownCircle,
} from "lucide-react";

export default function AdminRequestsQueuePage() {
  const [selectedRequest, setSelectedRequest] = useState<WithdrawalRequest | null>(null);
  const [approvalAmount, setApprovalAmount] = useState<string>("");
  const [adminNotes, setAdminNotes] = useState<string>("");
  const [rejectionReason, setRejectionReason] = useState<string>("");

  // Data hooks
  const { requests: withdrawalRequests, pendingCount: pendingWithdrawals, isLoading: withdrawalsLoading } = useWithdrawalRequests();
  const { deposits, pendingCount: pendingDeposits, isLoading: depositsLoading } = useDepositsQueue();

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

  const getInvestorName = (profile?: { first_name?: string | null; last_name?: string | null; email?: string | null }) => {
    if (!profile) return "Unknown";
    const name = `${profile.first_name || ""} ${profile.last_name || ""}`.trim();
    return name || profile.email || "Unknown";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="text-yellow-600">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case "approved":
      case "verified":
        return (
          <Badge variant="outline" className="text-blue-600">
            <CheckCircle className="h-3 w-3 mr-1" />
            Approved
          </Badge>
        );
      case "rejected":
      case "failed":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        );
      case "completed":
        return (
          <Badge variant="default" className="text-green-600">
            <CheckCircle className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      case "processing":
        return (
          <Badge variant="outline" className="text-purple-600">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Processing
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleApproveWithdrawal = () => {
    if (!selectedRequest) return;
    const amount = approvalAmount ? parseFloat(approvalAmount) : undefined;
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
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Requests Queue</h1>
        <p className="text-muted-foreground">Manage deposit and withdrawal requests</p>
      </div>

      <Tabs defaultValue="withdrawals" className="space-y-4">
        <TabsList>
          <TabsTrigger value="withdrawals" className="flex items-center gap-2">
            <ArrowDownCircle className="h-4 w-4" />
            Withdrawals ({pendingWithdrawals})
          </TabsTrigger>
          <TabsTrigger value="deposits" className="flex items-center gap-2">
            <ArrowUpCircle className="h-4 w-4" />
            Deposits ({pendingDeposits})
          </TabsTrigger>
        </TabsList>

        {/* Withdrawal Requests */}
        <TabsContent value="withdrawals">
          <Card>
            <CardHeader>
              <CardTitle>Withdrawal Requests</CardTitle>
              <CardDescription>Review and process investor withdrawal requests</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {withdrawalRequests?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No withdrawal requests found
                  </div>
                ) : (
                  withdrawalRequests?.map((request) => (
                    <div key={request.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{getInvestorName(request.profile)}</span>
                          <span className="text-sm text-muted-foreground">
                            ({request.profile?.email || "unknown"})
                          </span>
                          {getStatusBadge(request.status)}
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">
                            ${typeof request.requested_amount === "number"
                              ? request.requested_amount.toLocaleString()
                              : parseFloat(String(request.requested_amount)).toLocaleString()}
                          </div>
                          <div className="text-sm text-muted-foreground">{request.funds.name}</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                        <div>
                          <span className="text-muted-foreground">Fund Class: </span>
                          <span>{request.fund_class}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Type: </span>
                          <span className="capitalize">{request.withdrawal_type}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Requested: </span>
                          <span>
                            {new Date(request.request_date || request.created_at || new Date()).toLocaleDateString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Status: </span>
                          <span className="capitalize">{request.status}</span>
                        </div>
                      </div>

                      {request.notes && (
                        <div className="text-sm mb-3">
                          <span className="text-muted-foreground">Notes: </span>
                          <span>{request.notes}</span>
                        </div>
                      )}

                      {request.status === "pending" && (
                        <div className="flex gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedRequest(request);
                                  setApprovalAmount(String(request.requested_amount));
                                }}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Approve Withdrawal Request</DialogTitle>
                                <DialogDescription>
                                  Review and approve the withdrawal request for{" "}
                                  {getInvestorName(request.profile)}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label>Approved Amount ($)</Label>
                                  <Input
                                    type="number"
                                    value={approvalAmount}
                                    onChange={(e) => setApprovalAmount(e.target.value)}
                                    placeholder={String(request.requested_amount)}
                                  />
                                </div>
                                <div>
                                  <Label>Admin Notes</Label>
                                  <Textarea
                                    value={adminNotes}
                                    onChange={(e) => setAdminNotes(e.target.value)}
                                    placeholder="Optional notes..."
                                  />
                                </div>
                              </div>
                              <DialogFooter>
                                <Button
                                  onClick={handleApproveWithdrawal}
                                  disabled={approveMutation.isPending}
                                >
                                  {approveMutation.isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                  ) : (
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                  )}
                                  Approve Request
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>

                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                  setSelectedRequest(request);
                                  setRejectionReason("");
                                  setAdminNotes("");
                                }}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Reject Withdrawal Request</DialogTitle>
                                <DialogDescription>
                                  Provide a reason for rejecting {getInvestorName(request.profile)}'s
                                  withdrawal request
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label>Rejection Reason *</Label>
                                  <Textarea
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                    placeholder="Please provide a clear reason for rejection..."
                                    required
                                  />
                                </div>
                                <div>
                                  <Label>Admin Notes</Label>
                                  <Textarea
                                    value={adminNotes}
                                    onChange={(e) => setAdminNotes(e.target.value)}
                                    placeholder="Additional internal notes..."
                                  />
                                </div>
                              </div>
                              <DialogFooter>
                                <Button
                                  variant="destructive"
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
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Deposit Requests */}
        <TabsContent value="deposits">
          <Card>
            <CardHeader>
              <CardTitle>Deposit Requests</CardTitle>
              <CardDescription>Recorded deposits (auto-completed)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {deposits?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No deposits found</div>
                ) : (
                  deposits?.map((deposit) => (
                    <div key={deposit.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{getInvestorName(deposit.profile)}</span>
                          <span className="text-sm text-muted-foreground">
                            ({deposit.profile?.email || "unknown"})
                          </span>
                          {getStatusBadge(deposit.status || "completed")}
                        </div>
                        <div className="text-right">
                          <div className="font-semibold flex items-center gap-1 justify-end">
                            <DollarSign className="h-4 w-4" />
                            {typeof deposit.amount === "number"
                              ? deposit.amount.toLocaleString()
                              : parseFloat(String(deposit.amount)).toLocaleString()}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {deposit.funds?.name || "N/A"}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Fund Class: </span>
                          <span>{deposit.funds?.fund_class || "N/A"}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Date: </span>
                          <span>
                            {new Date(deposit.created_at || new Date()).toLocaleDateString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Status: </span>
                          <span className="capitalize">{deposit.status || "completed"}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
