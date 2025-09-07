import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle,
  Download,
  RefreshCw
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface WithdrawalRequest {
  id: string;
  request_date: string;
  status: 'pending' | 'approved' | 'processing' | 'completed' | 'rejected' | 'cancelled';
  requested_amount: number;
  approved_amount?: number;
  fund_class: string;
  investor_name: string;
  investor_email: string;
  fund_name: string;
  fund_code: string;
  current_position_value?: number;
  notes?: string;
  admin_notes?: string;
}

export default function AdminWithdrawalsPage() {
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<WithdrawalRequest | null>(null);
  const [actionDialog, setActionDialog] = useState<'approve' | 'reject' | null>(null);
  const [approvalAmount, setApprovalAmount] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchWithdrawalRequests();
  }, []);

  const fetchWithdrawalRequests = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('withdrawal_queue')
        .select('*')
        .order('request_date', { ascending: true });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching withdrawal requests:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch withdrawal requests',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;

    try {
      const { error } = await supabase.rpc('approve_withdrawal', {
        p_request_id: selectedRequest.id,
        p_approved_amount: parseFloat(approvalAmount || selectedRequest.requested_amount.toString()),
        p_admin_notes: adminNotes,
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Withdrawal request approved',
      });

      setActionDialog(null);
      setSelectedRequest(null);
      setApprovalAmount('');
      setAdminNotes('');
      fetchWithdrawalRequests();
    } catch (error) {
      console.error('Error approving withdrawal:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve withdrawal request',
        variant: 'destructive',
      });
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !rejectionReason) return;

    try {
      const { error } = await supabase
        .from('withdrawal_requests')
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason,
          rejected_by: (await supabase.auth.getUser()).data.user?.id,
          rejected_at: new Date().toISOString(),
        })
        .eq('id', selectedRequest.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Withdrawal request rejected',
      });

      setActionDialog(null);
      setSelectedRequest(null);
      setRejectionReason('');
      fetchWithdrawalRequests();
    } catch (error) {
      console.error('Error rejecting withdrawal:', error);
      toast({
        title: 'Error',
        description: 'Failed to reject withdrawal request',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'secondary',
      approved: 'outline',
      processing: 'default',
      completed: 'default',
      rejected: 'destructive',
      cancelled: 'destructive',
    };

    const icons = {
      pending: <Clock className="h-3 w-3 mr-1" />,
      approved: <CheckCircle className="h-3 w-3 mr-1" />,
      processing: <RefreshCw className="h-3 w-3 mr-1" />,
      completed: <CheckCircle className="h-3 w-3 mr-1" />,
      rejected: <XCircle className="h-3 w-3 mr-1" />,
      cancelled: <XCircle className="h-3 w-3 mr-1" />,
    };

    return (
      <Badge variant={variants[status] || 'default'} className="flex items-center">
        {icons[status as keyof typeof icons]}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Investor', 'Fund', 'Class', 'Requested', 'Status'];
    const rows = requests.map(r => [
      format(new Date(r.request_date), 'yyyy-MM-dd'),
      r.investor_name,
      r.fund_name,
      r.fund_class,
      r.requested_amount.toFixed(2),
      r.status,
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `withdrawals_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Withdrawal Management</h1>
          <p className="text-muted-foreground">Review and process withdrawal requests</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchWithdrawalRequests}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {requests.filter(r => r.status === 'pending').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Awaiting review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processing</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {requests.filter(r => ['approved', 'processing'].includes(r.status)).length}
            </div>
            <p className="text-xs text-muted-foreground">
              In progress
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${requests.reduce((sum, r) => sum + (r.requested_amount || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              Requested amount
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">By Class</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xs space-y-1">
              {Object.entries(
                requests.reduce((acc, r) => {
                  acc[r.fund_class] = (acc[r.fund_class] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>)
              ).map(([cls, count]) => (
                <div key={cls} className="flex justify-between">
                  <span>{cls}:</span>
                  <span className="font-bold">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>Withdrawal Requests</CardTitle>
          <CardDescription>
            Click on a request to view details and take action
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : requests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No withdrawal requests</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Investor</TableHead>
                  <TableHead>Fund</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead>Position Value</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      {format(new Date(request.request_date), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{request.investor_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {request.investor_email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{request.fund_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {request.fund_code}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{request.fund_class}</Badge>
                    </TableCell>
                    <TableCell className="font-mono">
                      ${request.requested_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="font-mono">
                      ${(request.current_position_value || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    <TableCell>
                      {request.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedRequest(request);
                              setApprovalAmount(request.requested_amount.toString());
                              setActionDialog('approve');
                            }}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedRequest(request);
                              setActionDialog('reject');
                            }}
                          >
                            Reject
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Approval Dialog */}
      <Dialog open={actionDialog === 'approve'} onOpenChange={() => setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Withdrawal Request</DialogTitle>
            <DialogDescription>
              Review and approve the withdrawal request for {selectedRequest?.investor_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Requested Amount</Label>
              <div className="text-2xl font-bold">
                ${selectedRequest?.requested_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div>
              <Label htmlFor="approval-amount">Approved Amount</Label>
              <Input
                id="approval-amount"
                type="number"
                value={approvalAmount}
                onChange={(e) => setApprovalAmount(e.target.value)}
                placeholder="Enter approved amount"
              />
            </div>
            <div>
              <Label htmlFor="admin-notes">Admin Notes (Optional)</Label>
              <Textarea
                id="admin-notes"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add any notes about this approval"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>
              Cancel
            </Button>
            <Button onClick={handleApprove}>
              Approve Withdrawal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={actionDialog === 'reject'} onOpenChange={() => setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Withdrawal Request</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting the withdrawal request
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="rejection-reason">Rejection Reason</Label>
              <Textarea
                id="rejection-reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter reason for rejection"
                rows={3}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={!rejectionReason}>
              Reject Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
