import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { depositService } from "@/services/investor/depositService";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { invalidateAfterWithdrawal, invalidateAfterDeposit } from "@/utils/cacheInvalidation";
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
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [approvalAmount, setApprovalAmount] = useState<string>("");
  const [adminNotes, setAdminNotes] = useState<string>("");
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const queryClient = useQueryClient();

  const getInvestorName = (profile?: { first_name?: string | null; last_name?: string | null; email?: string | null }) => {
    if (!profile) return "Unknown";
    const name = `${profile.first_name || ""} ${profile.last_name || ""}`.trim();
    return name || profile.email || "Unknown";
  };

  // Fetch pending withdrawal requests
  const { data: withdrawalRequests, isLoading: withdrawalsLoading } = useQuery({
    queryKey: QUERY_KEYS.withdrawalRequestsAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("withdrawal_requests")
        .select(
          `
          *,
          profile:profiles!investor_id(first_name, last_name, email),
          funds!inner(name, fund_class)
        `
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch pending deposits
  const { data: deposits, isLoading: depositsLoading } = useQuery({
    queryKey: QUERY_KEYS.depositsAdmin,
    queryFn: async () => {
      // Transactions_v2 has no status column; show all deposits ordered by occurred_at
      return depositService.getDeposits();
    },
  });

  // Approve withdrawal mutation
  const approveWithdrawalMutation = useMutation({
    mutationFn: async (params: { requestId: string; amount?: number; notes?: string }) => {
      const { data, error } = await supabase.rpc("approve_withdrawal", {
        p_request_id: params.requestId,
        p_approved_amount: params.amount,
        p_admin_notes: params.notes,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      toast.success("Withdrawal request approved successfully");
      // Use centralized cache invalidation
      const request = withdrawalRequests?.find(r => r.id === variables.requestId);
      invalidateAfterWithdrawal(queryClient, request?.investor_id, request?.fund_id);
      setSelectedRequest(null);
      setApprovalAmount("");
      setAdminNotes("");
    },
    onError: (error) => {
      toast.error(`Failed to approve withdrawal: ${error.message}`);
    },
  });

  // Reject withdrawal mutation
  const rejectWithdrawalMutation = useMutation({
    mutationFn: async (params: { requestId: string; reason: string; notes?: string }) => {
      const { data, error } = await supabase.rpc("reject_withdrawal", {
        p_request_id: params.requestId,
        p_reason: params.reason,
        p_admin_notes: params.notes,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      toast.success("Withdrawal request rejected");
      // Use centralized cache invalidation
      const request = withdrawalRequests?.find(r => r.id === variables.requestId);
      invalidateAfterWithdrawal(queryClient, request?.investor_id, request?.fund_id);
      setSelectedRequest(null);
      setRejectionReason("");
      setAdminNotes("");
    },
    onError: (error) => {
      toast.error(`Failed to reject withdrawal: ${error.message}`);
    },
  });

  // No status mutation needed; deposits are recorded as completed

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
    approveWithdrawalMutation.mutate({
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

    rejectWithdrawalMutation.mutate({
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
            Withdrawals ({withdrawalRequests?.filter((r) => r.status === "pending").length || 0})
          </TabsTrigger>
          <TabsTrigger value="deposits" className="flex items-center gap-2">
            <ArrowUpCircle className="h-4 w-4" />
            Deposits ({deposits?.filter((d) => d.status === "pending").length || 0})
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
                            $
                            {typeof request.requested_amount === "number"
                              ? request.requested_amount.toLocaleString()
                              : parseFloat(request.requested_amount).toLocaleString()}
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
                            {new Date(request.created_by || new Date()).toLocaleDateString()}
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
                                  setApprovalAmount(request.requested_amount.toString());
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
                                    placeholder={request.requested_amount.toString()}
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
                                  disabled={approveWithdrawalMutation.isPending}
                                >
                                  {approveWithdrawalMutation.isPending ? (
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
                                  disabled={rejectWithdrawalMutation.isPending}
                                >
                                  {rejectWithdrawalMutation.isPending ? (
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
                          <DollarSign className="h-4 w-4" />
                          <span className="font-semibold">
                            {(deposit.asset_symbol || "ASSET").toUpperCase()}
                          </span>
                          <Badge variant="default" className="text-green-700 bg-green-100">
                            Recorded
                          </Badge>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">
                            {parseFloat(deposit.amount.toString()).toLocaleString()}{" "}
                            {(deposit.asset_symbol || "ASSET").toUpperCase()}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(deposit.created_at || new Date()).toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      {deposit.transaction_hash && (
                        <div className="text-sm mb-3">
                          <span className="text-muted-foreground">Tx Hash: </span>
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {deposit.transaction_hash}
                          </code>
                        </div>
                      )}
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
