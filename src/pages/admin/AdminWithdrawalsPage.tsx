import { useState, useEffect, useCallback } from 'react';
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
  RefreshCw,
  ArrowRight,
  Play,
  Ban,
  Filter,
  Search,
  Calendar,
  ChevronRight,
  History,
  FileText,
  DollarSign
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface WithdrawalRequest {
  id: string;
  request_date: string;
  status: 'pending' | 'approved' | 'processing' | 'completed' | 'rejected' | 'cancelled';
  requested_amount: number;
  approved_amount?: number;
  processed_amount?: number;
  fund_class: string;
  investor_id: string;
  investor_name: string;
  investor_email: string;
  fund_id: string;
  fund_name: string;
  fund_code: string;
  current_position_value?: number;
  expected_withdrawal?: number;
  notes?: string;
  admin_notes?: string;
  rejection_reason?: string;
  cancellation_reason?: string;
  tx_hash?: string;
  settlement_date?: string;
  approved_at?: string;
  approved_by_name?: string;
  rejected_at?: string;
  rejected_by_name?: string;
  cancelled_at?: string;
  cancelled_by_name?: string;
  processed_at?: string;
  updated_at?: string;
}

interface AuditLogEntry {
  id: string;
  action: 'create' | 'approve' | 'reject' | 'processing' | 'complete' | 'cancel' | 'update';
  actor_id?: string;
  details: any;
  created_at: string;
  actor?: {
    email: string;
    first_name: string;
    last_name: string;
  };
}

type StatusFilter = 'all' | 'pending' | 'approved' | 'processing' | 'completed' | 'rejected' | 'cancelled';

export default function AdminWithdrawalsPage() {
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<WithdrawalRequest | null>(null);
  const [actionDialog, setActionDialog] = useState<'approve' | 'reject' | 'process' | 'complete' | 'cancel' | null>(null);
  const [approvalAmount, setApprovalAmount] = useState('');
  const [processedAmount, setProcessedAmount] = useState('');
  const [settlementDate, setSettlementDate] = useState('');
  const [txHash, setTxHash] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [cancellationReason, setCancellationReason] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchWithdrawalRequests();
    
    // Set up realtime subscription for active statuses
    const channel = supabase
      .channel('withdrawals-admin')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'withdrawal_requests'
        },
        () => {
          // Refetch on any change
          fetchWithdrawalRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [statusFilter, searchTerm]);

  const fetchWithdrawalRequests = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('withdrawal_queue')
        .select('*');

      // Apply status filter
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      // Apply search filter
      if (searchTerm) {
        query = query.or(`investor_name.ilike.%${searchTerm}%,investor_email.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query.order('request_date', { ascending: false });

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
      const { error } = await supabase.rpc('reject_withdrawal', {
        p_request_id: selectedRequest.id,
        p_reason: rejectionReason,
        p_admin_notes: adminNotes || null,
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Withdrawal request rejected',
      });

      setActionDialog(null);
      setSelectedRequest(null);
      setRejectionReason('');
      setAdminNotes('');
      fetchWithdrawalRequests();
    } catch (error: any) {
      console.error('Error rejecting withdrawal:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to reject withdrawal request',
        variant: 'destructive',
      });
    }
  };

  const handleStartProcessing = async () => {
    if (!selectedRequest) return;

    try {
      const { error } = await supabase.rpc('start_processing_withdrawal', {
        p_request_id: selectedRequest.id,
        p_processed_amount: processedAmount ? parseFloat(processedAmount) : null,
        p_tx_hash: txHash || null,
        p_settlement_date: settlementDate || null,
        p_admin_notes: adminNotes || null,
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Withdrawal processing started',
      });

      setActionDialog(null);
      setSelectedRequest(null);
      setProcessedAmount('');
      setTxHash('');
      setSettlementDate('');
      setAdminNotes('');
      fetchWithdrawalRequests();
    } catch (error: any) {
      console.error('Error starting processing:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to start processing',
        variant: 'destructive',
      });
    }
  };

  const handleComplete = async () => {
    if (!selectedRequest) return;

    try {
      const { error } = await supabase.rpc('complete_withdrawal', {
        p_request_id: selectedRequest.id,
        p_tx_hash: txHash || null,
        p_admin_notes: adminNotes || null,
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Withdrawal completed',
      });

      setActionDialog(null);
      setSelectedRequest(null);
      setTxHash('');
      setAdminNotes('');
      fetchWithdrawalRequests();
    } catch (error: any) {
      console.error('Error completing withdrawal:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to complete withdrawal',
        variant: 'destructive',
      });
    }
  };

  const handleCancel = async () => {
    if (!selectedRequest || !cancellationReason) return;

    try {
      const { error } = await supabase.rpc('cancel_withdrawal_by_admin', {
        p_request_id: selectedRequest.id,
        p_reason: cancellationReason,
        p_admin_notes: adminNotes || null,
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Withdrawal cancelled',
      });

      setActionDialog(null);
      setSelectedRequest(null);
      setCancellationReason('');
      setAdminNotes('');
      fetchWithdrawalRequests();
    } catch (error: any) {
      console.error('Error cancelling withdrawal:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to cancel withdrawal',
        variant: 'destructive',
      });
    }
  };

  const fetchAuditLogs = async (requestId: string) => {
    try {
      setLoadingAudit(true);
      const { data, error } = await supabase
        .from('withdrawal_audit_logs')
        .select(`
          *,
          actor:profiles!withdrawal_audit_logs_actor_id_fkey(
            email,
            first_name,
            last_name
          )
        `)
        .eq('request_id', requestId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAuditLogs(data || []);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch audit history',
        variant: 'destructive',
      });
    } finally {
      setLoadingAudit(false);
    }
  };

  const handleViewDetails = async (request: WithdrawalRequest) => {
    setSelectedRequest(request);
    setShowDetails(true);
    await fetchAuditLogs(request.id);
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

  const getAvailableActions = (status: string) => {
    switch (status) {
      case 'pending':
        return ['approve', 'reject', 'cancel'];
      case 'approved':
        return ['process', 'cancel'];
      case 'processing':
        return ['complete'];
      default:
        return [];
    }
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

      {/* Filters Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by investor name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
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
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {requests.filter(r => r.status === 'approved').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Ready to process
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
              {requests.filter(r => r.status === 'processing').length}
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
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleViewDetails(request)}
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                        
                        {getAvailableActions(request.status).includes('approve') && (
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
                        )}
                        
                        {getAvailableActions(request.status).includes('reject') && (
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
                        )}
                        
                        {getAvailableActions(request.status).includes('process') && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedRequest(request);
                              setProcessedAmount(request.approved_amount?.toString() || '');
                              setActionDialog('process');
                            }}
                          >
                            <Play className="h-3 w-3 mr-1" />
                            Process
                          </Button>
                        )}
                        
                        {getAvailableActions(request.status).includes('complete') && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedRequest(request);
                              setTxHash(request.tx_hash || '');
                              setActionDialog('complete');
                            }}
                          >
                            Complete
                          </Button>
                        )}
                        
                        {getAvailableActions(request.status).includes('cancel') && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => {
                              setSelectedRequest(request);
                              setActionDialog('cancel');
                            }}
                          >
                            <Ban className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
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
            <div>
              <Label htmlFor="admin-notes-reject">Admin Notes (Optional)</Label>
              <Textarea
                id="admin-notes-reject"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Additional notes for internal use"
                rows={2}
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

      {/* Process Dialog */}
      <Dialog open={actionDialog === 'process'} onOpenChange={() => setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start Processing Withdrawal</DialogTitle>
            <DialogDescription>
              Begin processing the approved withdrawal request
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="processed-amount">Processing Amount</Label>
              <Input
                id="processed-amount"
                type="number"
                value={processedAmount}
                onChange={(e) => setProcessedAmount(e.target.value)}
                placeholder="Enter amount to process"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Approved: ${selectedRequest?.approved_amount?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <Label htmlFor="tx-hash">Transaction Hash (Optional)</Label>
              <Input
                id="tx-hash"
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
                placeholder="Blockchain transaction hash"
              />
            </div>
            <div>
              <Label htmlFor="settlement-date">Settlement Date (Optional)</Label>
              <Input
                id="settlement-date"
                type="date"
                value={settlementDate}
                onChange={(e) => setSettlementDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="admin-notes-process">Admin Notes (Optional)</Label>
              <Textarea
                id="admin-notes-process"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Processing notes"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>
              Cancel
            </Button>
            <Button onClick={handleStartProcessing}>
              Start Processing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete Dialog */}
      <Dialog open={actionDialog === 'complete'} onOpenChange={() => setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Withdrawal</DialogTitle>
            <DialogDescription>
              Mark this withdrawal as completed
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="tx-hash-complete">Transaction Hash</Label>
              <Input
                id="tx-hash-complete"
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
                placeholder="Final transaction hash"
              />
            </div>
            <div>
              <Label htmlFor="admin-notes-complete">Admin Notes (Optional)</Label>
              <Textarea
                id="admin-notes-complete"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Completion notes"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>
              Cancel
            </Button>
            <Button onClick={handleComplete}>
              Mark as Complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={actionDialog === 'cancel'} onOpenChange={() => setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Withdrawal Request</DialogTitle>
            <DialogDescription>
              Provide a reason for cancelling this withdrawal
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="cancellation-reason">Cancellation Reason</Label>
              <Textarea
                id="cancellation-reason"
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                placeholder="Enter reason for cancellation"
                rows={3}
                required
              />
            </div>
            <div>
              <Label htmlFor="admin-notes-cancel">Admin Notes (Optional)</Label>
              <Textarea
                id="admin-notes-cancel"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Additional notes"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleCancel} disabled={!cancellationReason}>
              Cancel Withdrawal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Withdrawal Details Sheet */}
      <Sheet open={showDetails} onOpenChange={setShowDetails}>
        <SheetContent className="w-[600px] sm:max-w-[600px]">
          <SheetHeader>
            <SheetTitle>Withdrawal Details</SheetTitle>
            <SheetDescription>
              Complete information and audit history
            </SheetDescription>
          </SheetHeader>
          
          {selectedRequest && (
            <Tabs defaultValue="details" className="mt-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="audit">Audit Trail</TabsTrigger>
              </TabsList>
              
              <TabsContent value="details" className="space-y-4">
                <ScrollArea className="h-[calc(100vh-200px)]">
                  <div className="space-y-6 pr-4">
                    {/* Status */}
                    <div>
                      <h3 className="text-sm font-medium mb-2">Status</h3>
                      {getStatusBadge(selectedRequest.status)}
                    </div>
                    
                    <Separator />
                    
                    {/* Investor Information */}
                    <div>
                      <h3 className="text-sm font-medium mb-2">Investor</h3>
                      <div className="space-y-1 text-sm">
                        <p><span className="text-muted-foreground">Name:</span> {selectedRequest.investor_name}</p>
                        <p><span className="text-muted-foreground">Email:</span> {selectedRequest.investor_email}</p>
                        <p><span className="text-muted-foreground">ID:</span> {selectedRequest.investor_id}</p>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    {/* Fund Information */}
                    <div>
                      <h3 className="text-sm font-medium mb-2">Fund</h3>
                      <div className="space-y-1 text-sm">
                        <p><span className="text-muted-foreground">Name:</span> {selectedRequest.fund_name}</p>
                        <p><span className="text-muted-foreground">Code:</span> {selectedRequest.fund_code}</p>
                        <p><span className="text-muted-foreground">Class:</span> <Badge variant="outline">{selectedRequest.fund_class}</Badge></p>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    {/* Amount Information */}
                    <div>
                      <h3 className="text-sm font-medium mb-2">Amounts</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Requested:</span>
                          <span className="font-mono font-medium">
                            ${selectedRequest.requested_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        {selectedRequest.approved_amount && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Approved:</span>
                            <span className="font-mono font-medium text-green-600">
                              ${selectedRequest.approved_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        )}
                        {selectedRequest.processed_amount && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Processed:</span>
                            <span className="font-mono font-medium">
                              ${selectedRequest.processed_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        )}
                        {selectedRequest.current_position_value && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Position Value:</span>
                            <span className="font-mono">
                              ${selectedRequest.current_position_value.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <Separator />
                    
                    {/* Transaction Details */}
                    {(selectedRequest.tx_hash || selectedRequest.settlement_date) && (
                      <>
                        <div>
                          <h3 className="text-sm font-medium mb-2">Transaction Details</h3>
                          <div className="space-y-1 text-sm">
                            {selectedRequest.tx_hash && (
                              <p><span className="text-muted-foreground">Tx Hash:</span> <code className="text-xs">{selectedRequest.tx_hash}</code></p>
                            )}
                            {selectedRequest.settlement_date && (
                              <p><span className="text-muted-foreground">Settlement:</span> {format(new Date(selectedRequest.settlement_date), 'MMM dd, yyyy')}</p>
                            )}
                          </div>
                        </div>
                        <Separator />
                      </>
                    )}
                    
                    {/* Notes */}
                    {(selectedRequest.notes || selectedRequest.admin_notes) && (
                      <>
                        <div>
                          <h3 className="text-sm font-medium mb-2">Notes</h3>
                          <div className="space-y-2">
                            {selectedRequest.notes && (
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Investor Notes:</p>
                                <p className="text-sm">{selectedRequest.notes}</p>
                              </div>
                            )}
                            {selectedRequest.admin_notes && (
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Admin Notes:</p>
                                <p className="text-sm">{selectedRequest.admin_notes}</p>
                              </div>
                            )}
                          </div>
                        </div>
                        <Separator />
                      </>
                    )}
                    
                    {/* Rejection/Cancellation Reason */}
                    {(selectedRequest.rejection_reason || selectedRequest.cancellation_reason) && (
                      <div>
                        <h3 className="text-sm font-medium mb-2">Reason</h3>
                        <div className="bg-red-50 dark:bg-red-950 p-3 rounded-md">
                          <p className="text-sm">{selectedRequest.rejection_reason || selectedRequest.cancellation_reason}</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Timestamps */}
                    <div>
                      <h3 className="text-sm font-medium mb-2">Timeline</h3>
                      <div className="space-y-1 text-sm">
                        <p><span className="text-muted-foreground">Requested:</span> {format(new Date(selectedRequest.request_date), 'MMM dd, yyyy HH:mm')}</p>
                        {selectedRequest.approved_at && (
                          <p><span className="text-muted-foreground">Approved:</span> {format(new Date(selectedRequest.approved_at), 'MMM dd, yyyy HH:mm')}</p>
                        )}
                        {selectedRequest.processed_at && (
                          <p><span className="text-muted-foreground">Processed:</span> {format(new Date(selectedRequest.processed_at), 'MMM dd, yyyy HH:mm')}</p>
                        )}
                        {selectedRequest.rejected_at && (
                          <p><span className="text-muted-foreground">Rejected:</span> {format(new Date(selectedRequest.rejected_at), 'MMM dd, yyyy HH:mm')}</p>
                        )}
                        {selectedRequest.cancelled_at && (
                          <p><span className="text-muted-foreground">Cancelled:</span> {format(new Date(selectedRequest.cancelled_at), 'MMM dd, yyyy HH:mm')}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="audit" className="space-y-4">
                <ScrollArea className="h-[calc(100vh-200px)]">
                  {loadingAudit ? (
                    <div className="flex justify-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin" />
                    </div>
                  ) : auditLogs.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No audit logs found
                    </div>
                  ) : (
                    <div className="space-y-4 pr-4">
                      {auditLogs.map((log) => (
                        <div key={log.id} className="relative pl-6">
                          <div className="absolute left-0 top-2 h-2 w-2 rounded-full bg-primary" />
                          {auditLogs.indexOf(log) < auditLogs.length - 1 && (
                            <div className="absolute left-1 top-4 bottom-0 w-px bg-border" />
                          )}
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {log.action.charAt(0).toUpperCase() + log.action.slice(1)}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(log.created_at), 'MMM dd, yyyy HH:mm:ss')}
                              </span>
                            </div>
                            {log.actor && (
                              <p className="text-sm">
                                <span className="font-medium">
                                  {log.actor.first_name} {log.actor.last_name}
                                </span>
                                <span className="text-muted-foreground"> ({log.actor.email})</span>
                              </p>
                            )}
                            {log.details && Object.keys(log.details).length > 0 && (
                              <div className="mt-2 p-2 bg-muted rounded-md">
                                <pre className="text-xs overflow-x-auto">
                                  {JSON.stringify(log.details, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
