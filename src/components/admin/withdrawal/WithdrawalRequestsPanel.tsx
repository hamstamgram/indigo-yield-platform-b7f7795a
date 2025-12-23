import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { adminServiceV2 } from "@/services/admin/adminService";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { toast } from "sonner";
import { Check, X, Play, Eye, Loader2 } from "lucide-react";
import { TruncatedText } from "@/components/ui/truncated-text";

interface WithdrawalRequestsPanelProps {
  onDataChange: () => void;
}

interface WithdrawalRequest {
  id: string;
  investor_email: string;
  investor_name: string;
  fund_name: string;
  fund_class: string;
  requested_amount: number;
  status: string;
  request_date: string;
  approved_amount?: number;
  processed_amount?: number;
  rejection_reason?: string;
  admin_notes?: string;
}

export function WithdrawalRequestsPanel({ onDataChange }: WithdrawalRequestsPanelProps) {
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<WithdrawalRequest | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | "process" | null>(null);
  const [approvedAmount, setApprovedAmount] = useState("");
  const [processedAmount, setProcessedAmount] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [txHash, setTxHash] = useState("");

  const loadRequests = async () => {
    try {
      setLoading(true);
      const data = await adminServiceV2.getWithdrawalRequests();
      setRequests(data);
    } catch (error) {
      console.error("Error loading withdrawal requests:", error);
      toast.error("Failed to load withdrawal requests");
    } finally {
      setLoading(false);
    }
  };

  // Real-time subscription for withdrawal requests
  useRealtimeSubscription({
    table: "withdrawal_requests",
    event: "*",
    onUpdate: () => {
      console.log("Withdrawal requests updated, refreshing...");
      loadRequests();
      onDataChange();
    },
  });

  const handleApprove = async () => {
    if (!selectedRequest) return;

    try {
      setProcessing(selectedRequest.id);
      const amount = approvedAmount ? parseFloat(approvedAmount) : undefined;
      await adminServiceV2.approveWithdrawal(selectedRequest.id, amount, adminNotes);
      toast.success("Withdrawal request approved");
      setSelectedRequest(null);
      setActionType(null);
      setApprovedAmount("");
      setAdminNotes("");
      loadRequests();
      onDataChange();
    } catch (error) {
      console.error("Error approving withdrawal:", error);
      toast.error("Failed to approve withdrawal");
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !rejectionReason) return;

    try {
      setProcessing(selectedRequest.id);
      await adminServiceV2.rejectWithdrawal(selectedRequest.id, rejectionReason, adminNotes);
      toast.success("Withdrawal request rejected");
      setSelectedRequest(null);
      setActionType(null);
      setRejectionReason("");
      setAdminNotes("");
      loadRequests();
      onDataChange();
    } catch (error) {
      console.error("Error rejecting withdrawal:", error);
      toast.error("Failed to reject withdrawal");
    } finally {
      setProcessing(null);
    }
  };

  const handleStartProcessing = async () => {
    if (!selectedRequest) return;

    try {
      setProcessing(selectedRequest.id);
      const amount = processedAmount ? parseFloat(processedAmount) : undefined;
      await adminServiceV2.startProcessingWithdrawal(
        selectedRequest.id,
        amount,
        txHash || undefined,
        undefined, // settlement_date
        adminNotes
      );
      toast.success("Withdrawal processing started");
      setSelectedRequest(null);
      setActionType(null);
      setProcessedAmount("");
      setTxHash("");
      setAdminNotes("");
      loadRequests();
      onDataChange();
    } catch (error) {
      console.error("Error starting withdrawal processing:", error);
      toast.error("Failed to start processing withdrawal");
    } finally {
      setProcessing(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case "approved":
        return <Badge className="bg-blue-100 text-blue-800">Approved</Badge>;
      case "processing":
        return <Badge className="bg-purple-100 text-purple-800">Processing</Badge>;
      case "completed":
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      case "cancelled":
        return <Badge variant="secondary">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const openActionDialog = (
    request: WithdrawalRequest,
    action: "approve" | "reject" | "process"
  ) => {
    setSelectedRequest(request);
    setActionType(action);
    if (action === "approve") {
      setApprovedAmount(request.requested_amount.toString());
    } else if (action === "process") {
      setProcessedAmount(
        request.approved_amount?.toString() || request.requested_amount.toString()
      );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Withdrawal Requests
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
            Live
          </Badge>
        </CardTitle>
        <CardDescription>
          Review and process withdrawal requests ({requests.length} total)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Investor</TableHead>
                  <TableHead>Fund</TableHead>
                  <TableHead>Amount Requested</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Request Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div className="max-w-[180px]">
                        <TruncatedText 
                          text={request.investor_name} 
                          className="font-medium"
                          maxWidth="180px"
                        />
                        <TruncatedText 
                          text={request.investor_email}
                          className="text-sm text-muted-foreground"
                          maxWidth="180px"
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[150px]">
                        <TruncatedText 
                          text={request.fund_name}
                          className="font-medium"
                          maxWidth="150px"
                        />
                        <div className="text-sm text-muted-foreground">
                          Class {request.fund_class}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>${request.requested_amount.toLocaleString()}</TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    <TableCell>{new Date(request.request_date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {request.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => openActionDialog(request, "approve")}
                              disabled={processing === request.id}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => openActionDialog(request, "reject")}
                              disabled={processing === request.id}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {request.status === "approved" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openActionDialog(request, "process")}
                            disabled={processing === request.id}
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedRequest(request);
                            setActionType(null);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {requests.length === 0 && !loading && (
            <div className="text-center py-8 text-muted-foreground">
              No withdrawal requests found.
            </div>
          )}

          <Button onClick={loadRequests} variant="outline">
            Refresh Requests
          </Button>
        </div>
      </CardContent>

      {/* Action Dialogs */}
      <Dialog
        open={!!selectedRequest}
        onOpenChange={() => {
          setSelectedRequest(null);
          setActionType(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "approve" && "Approve Withdrawal Request"}
              {actionType === "reject" && "Reject Withdrawal Request"}
              {actionType === "process" && "Start Processing Withdrawal"}
              {!actionType && "Withdrawal Request Details"}
            </DialogTitle>
            <DialogDescription>
              {selectedRequest && (
                <>
                  Request from {selectedRequest.investor_name} for $
                  {selectedRequest.requested_amount.toLocaleString()}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              {actionType === "approve" && (
                <>
                  <div>
                    <Label htmlFor="approvedAmount">Approved Amount</Label>
                    <Input
                      id="approvedAmount"
                      type="number"
                      value={approvedAmount}
                      onChange={(e) => setApprovedAmount(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="adminNotes">Admin Notes</Label>
                    <Textarea
                      id="adminNotes"
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                    />
                  </div>
                </>
              )}

              {actionType === "reject" && (
                <>
                  <div>
                    <Label htmlFor="rejectionReason">Rejection Reason *</Label>
                    <Textarea
                      id="rejectionReason"
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="adminNotes">Admin Notes</Label>
                    <Textarea
                      id="adminNotes"
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                    />
                  </div>
                </>
              )}

              {actionType === "process" && (
                <>
                  <div>
                    <Label htmlFor="processedAmount">Processing Amount</Label>
                    <Input
                      id="processedAmount"
                      type="number"
                      value={processedAmount}
                      onChange={(e) => setProcessedAmount(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="txHash">Transaction Hash</Label>
                    <Input id="txHash" value={txHash} onChange={(e) => setTxHash(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="adminNotes">Admin Notes</Label>
                    <Textarea
                      id="adminNotes"
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                    />
                  </div>
                </>
              )}

              {!actionType && (
                <div className="space-y-2 text-sm">
                  <div>
                    <strong>Status:</strong> {getStatusBadge(selectedRequest.status)}
                  </div>
                  <div>
                    <strong>Requested:</strong> ${selectedRequest.requested_amount.toLocaleString()}
                  </div>
                  {selectedRequest.approved_amount && (
                    <div>
                      <strong>Approved:</strong> ${selectedRequest.approved_amount.toLocaleString()}
                    </div>
                  )}
                  {selectedRequest.processed_amount && (
                    <div>
                      <strong>Processed:</strong> $
                      {selectedRequest.processed_amount.toLocaleString()}
                    </div>
                  )}
                  {selectedRequest.rejection_reason && (
                    <div>
                      <strong>Rejection Reason:</strong> {selectedRequest.rejection_reason}
                    </div>
                  )}
                  {selectedRequest.admin_notes && (
                    <div>
                      <strong>Admin Notes:</strong> {selectedRequest.admin_notes}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {actionType === "approve" && (
              <Button onClick={handleApprove} disabled={processing === selectedRequest?.id}>
                {processing === selectedRequest?.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Approve"
                )}
              </Button>
            )}
            {actionType === "reject" && (
              <Button
                onClick={handleReject}
                disabled={!rejectionReason || processing === selectedRequest?.id}
              >
                {processing === selectedRequest?.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Reject"
                )}
              </Button>
            )}
            {actionType === "process" && (
              <Button onClick={handleStartProcessing} disabled={processing === selectedRequest?.id}>
                {processing === selectedRequest?.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Start Processing"
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
