/**
 * Admin Withdrawal Approval Panel
 *
 * PHASE 2: Feature Completion
 * Allows admins to review and approve/reject withdrawal requests
 *
 * Features:
 * - View pending withdrawal requests
 * - Check investor balance before approval
 * - Approve with transaction hash
 * - Reject with reason
 * - Complete audit trail
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { formatMoney, formatCrypto, toDecimal } from '@/utils/financial';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Check, X, AlertTriangle, ExternalLink, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface WithdrawalRequest {
  id: string;
  user_id: string;
  investor_name: string;
  investor_email: string;
  asset_symbol: string;
  amount: string;
  destination: string;
  destination_type: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PROCESSING' | 'COMPLETED';
  reason?: string;
  notes?: string;
  requested_at: string;
  available_balance: string;
}

interface WithdrawalApprovalPanelProps {
  requests: WithdrawalRequest[];
  onRefresh?: () => void;
}

export function WithdrawalApprovalPanel({ requests, onRefresh }: WithdrawalApprovalPanelProps) {
  const [selectedRequest, setSelectedRequest] = useState<WithdrawalRequest | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const { toast } = useToast();

  const {
    register: registerApprove,
    handleSubmit: handleSubmitApprove,
    formState: { errors: approveErrors },
    reset: resetApprove,
  } = useForm<{
    txHash: string;
    notes: string;
  }>();

  const {
    register: registerReject,
    handleSubmit: handleSubmitReject,
    formState: { errors: rejectErrors },
    reset: resetReject,
  } = useForm<{
    rejectionReason: string;
  }>();

  const handleApprove = async (data: { txHash: string; notes: string }) => {
    if (!selectedRequest) return;

    setIsApproving(true);
    try {
      // Verify balance
      const requested = toDecimal(selectedRequest.amount);
      const available = toDecimal(selectedRequest.available_balance);

      if (requested.greaterThan(available)) {
        throw new Error('Insufficient balance for withdrawal');
      }

      // Submit approval
      const response = await fetch(`/api/admin/withdrawals/${selectedRequest.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tx_hash: data.txHash,
          admin_notes: data.notes,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Approval failed');
      }

      // Log audit event
      await fetch('/api/audit/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'WITHDRAWAL_APPROVED',
          resource_type: 'withdrawal_requests',
          resource_id: selectedRequest.id,
          metadata: {
            investor_id: selectedRequest.user_id,
            amount: selectedRequest.amount,
            asset: selectedRequest.asset_symbol,
            tx_hash: data.txHash,
          },
        }),
      });

      toast({
        title: 'Withdrawal Approved',
        description: `Withdrawal for ${selectedRequest.investor_name} has been approved.`,
      });

      setShowApproveDialog(false);
      setSelectedRequest(null);
      resetApprove();
      onRefresh?.();
    } catch (error) {
      toast({
        title: 'Approval Failed',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async (data: { rejectionReason: string }) => {
    if (!selectedRequest) return;

    setIsRejecting(true);
    try {
      const response = await fetch(`/api/admin/withdrawals/${selectedRequest.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rejection_reason: data.rejectionReason,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Rejection failed');
      }

      // Log audit event
      await fetch('/api/audit/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'WITHDRAWAL_REJECTED',
          resource_type: 'withdrawal_requests',
          resource_id: selectedRequest.id,
          metadata: {
            investor_id: selectedRequest.user_id,
            amount: selectedRequest.amount,
            asset: selectedRequest.asset_symbol,
            reason: data.rejectionReason,
          },
        }),
      });

      toast({
        title: 'Withdrawal Rejected',
        description: `Withdrawal for ${selectedRequest.investor_name} has been rejected.`,
      });

      setShowRejectDialog(false);
      setSelectedRequest(null);
      resetReject();
      onRefresh?.();
    } catch (error) {
      toast({
        title: 'Rejection Failed',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsRejecting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      description: 'Copied to clipboard',
    });
  };

  const pendingRequests = requests.filter(r => r.status === 'PENDING');
  const processedRequests = requests.filter(r => r.status !== 'PENDING');

  return (
    <div className="space-y-6">
      <Tabs defaultValue="pending" className="w-full">
        <TabsList>
          <TabsTrigger value="pending">
            Pending ({pendingRequests.length})
          </TabsTrigger>
          <TabsTrigger value="processed">
            Processed ({processedRequests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {pendingRequests.length === 0 ? (
            <Alert>
              <AlertDescription>
                No pending withdrawal requests
              </AlertDescription>
            </Alert>
          ) : (
            pendingRequests.map((request) => {
              const requested = toDecimal(request.amount);
              const available = toDecimal(request.available_balance);
              const hasSufficientBalance = requested.lessThanOrEqualTo(available);

              return (
                <Card key={request.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">
                          {request.investor_name}
                        </CardTitle>
                        <CardDescription>
                          {request.investor_email}
                        </CardDescription>
                      </div>
                      <Badge variant="outline">
                        {request.status}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Amount & Balance */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm text-muted-foreground">Requested Amount</Label>
                        <p className="text-2xl font-bold">
                          {formatCrypto(request.amount, 8, request.asset_symbol)}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Available Balance</Label>
                        <p className="text-2xl font-bold">
                          {formatCrypto(request.available_balance, 8, request.asset_symbol)}
                        </p>
                      </div>
                    </div>

                    {/* Balance Check */}
                    {!hasSufficientBalance && (
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Insufficient Balance:</strong> Investor does not have enough {request.asset_symbol} to complete this withdrawal
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Destination */}
                    <div>
                      <Label className="text-sm text-muted-foreground">Destination Address</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="text-sm bg-muted px-2 py-1 rounded flex-1">
                          {request.destination}
                        </code>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(request.destination)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Reason & Notes */}
                    {request.reason && (
                      <div>
                        <Label className="text-sm text-muted-foreground">Reason</Label>
                        <p className="text-sm capitalize">{request.reason}</p>
                      </div>
                    )}
                    {request.notes && (
                      <div>
                        <Label className="text-sm text-muted-foreground">Investor Notes</Label>
                        <p className="text-sm">{request.notes}</p>
                      </div>
                    )}

                    {/* Requested Date */}
                    <div>
                      <Label className="text-sm text-muted-foreground">Requested</Label>
                      <p className="text-sm">
                        {new Date(request.requested_at).toLocaleString()}
                      </p>
                    </div>
                  </CardContent>

                  <CardFooter className="flex justify-between">
                    <Button
                      variant="destructive"
                      onClick={() => {
                        setSelectedRequest(request);
                        setShowRejectDialog(true);
                      }}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Reject
                    </Button>
                    <Button
                      onClick={() => {
                        setSelectedRequest(request);
                        setShowApproveDialog(true);
                      }}
                      disabled={!hasSufficientBalance}
                    >
                      <Check className="mr-2 h-4 w-4" />
                      Approve
                    </Button>
                  </CardFooter>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="processed" className="space-y-4">
          {processedRequests.map((request) => (
            <Card key={request.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">
                      {request.investor_name}
                    </CardTitle>
                    <CardDescription>
                      {formatCrypto(request.amount, 8, request.asset_symbol)}
                    </CardDescription>
                  </div>
                  <Badge
                    variant={
                      request.status === 'COMPLETED' ? 'default' :
                      request.status === 'REJECTED' ? 'destructive' :
                      'secondary'
                    }
                  >
                    {request.status}
                  </Badge>
                </div>
              </CardHeader>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Withdrawal</DialogTitle>
            <DialogDescription>
              Enter the transaction hash after completing the blockchain transaction.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitApprove(handleApprove)}>
            <div className="space-y-4 py-4">
              {selectedRequest && (
                <Alert>
                  <AlertDescription>
                    Approving withdrawal of{' '}
                    <strong>
                      {formatCrypto(selectedRequest.amount, 8, selectedRequest.asset_symbol)}
                    </strong>
                    {' '}for <strong>{selectedRequest.investor_name}</strong>
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="txHash">Transaction Hash*</Label>
                <Input
                  id="txHash"
                  placeholder="0x..."
                  {...registerApprove('txHash', {
                    required: 'Transaction hash is required',
                  })}
                />
                {approveErrors.txHash && (
                  <p className="text-sm text-destructive">{approveErrors.txHash.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Admin Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Any additional notes..."
                  rows={3}
                  {...registerApprove('notes')}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowApproveDialog(false)}
                disabled={isApproving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isApproving}>
                {isApproving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Approving...
                  </>
                ) : (
                  'Approve'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Withdrawal</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this withdrawal request.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitReject(handleReject)}>
            <div className="space-y-4 py-4">
              {selectedRequest && (
                <Alert variant="destructive">
                  <AlertDescription>
                    Rejecting withdrawal of{' '}
                    <strong>
                      {formatCrypto(selectedRequest.amount, 8, selectedRequest.asset_symbol)}
                    </strong>
                    {' '}for <strong>{selectedRequest.investor_name}</strong>
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="rejectionReason">Rejection Reason*</Label>
                <Textarea
                  id="rejectionReason"
                  placeholder="Explain why this withdrawal is being rejected..."
                  rows={4}
                  {...registerReject('rejectionReason', {
                    required: 'Rejection reason is required',
                    minLength: {
                      value: 10,
                      message: 'Please provide a detailed reason (min 10 characters)',
                    },
                  })}
                />
                {rejectErrors.rejectionReason && (
                  <p className="text-sm text-destructive">{rejectErrors.rejectionReason.message}</p>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowRejectDialog(false)}
                disabled={isRejecting}
              >
                Cancel
              </Button>
              <Button type="submit" variant="destructive" disabled={isRejecting}>
                {isRejecting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Rejecting...
                  </>
                ) : (
                  'Reject'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
