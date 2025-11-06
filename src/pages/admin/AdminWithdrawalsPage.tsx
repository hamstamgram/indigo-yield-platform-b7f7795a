import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { CheckCircle, XCircle, Clock, PlayCircle, Pause } from 'lucide-react';

interface WithdrawalRequest {
  id: string;
  investor_id: string;
  fund_id: string;
  fund_class: string;
  requested_amount: number;
  approved_amount?: number;
  processed_amount?: number;
  status: string;
  withdrawal_type: string;
  notes?: string;
  admin_notes?: string;
  created_at: string;
  approved_at?: string;
  rejected_at?: string;
  cancelled_at?: string;
  processed_at?: string;
  settlement_date?: string;
  tx_hash?: string;
  rejection_reason?: string;
  cancellation_reason?: string;
  // Joined investor data
  investor_name?: string;
  investor_email?: string;
  // Joined fund data
  fund_name?: string;
}

const AdminWithdrawalsPage = () => {
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<WithdrawalRequest | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchWithdrawalRequests();
  }, []);

  const fetchWithdrawalRequests = async () => {
    try {
      setLoading(true);
      
      // Enhanced query with joins for investor and fund data
      const { data, error } = await supabase
        .from('withdrawal_requests')
        .select(`
          *,
          investor:investors!withdrawal_requests_investor_id_fkey(name, email),
          fund:funds!withdrawal_requests_fund_id_fkey(name)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Database error:', error);
        setRequests([]);
      } else {
        // Transform the data to flatten the joined fields  
        const transformedData = (data || []).map((item: any) => ({
          id: item.id,
          investor_id: item.investor_id,
          fund_id: item.fund_id,
          fund_class: item.fund_class,
          requested_amount: item.requested_amount,
          approved_amount: item.approved_amount,
          processed_amount: item.processed_amount,
          status: item.status,
          withdrawal_type: item.withdrawal_type,
          notes: item.notes,
          admin_notes: item.admin_notes,
          created_at: item.created_at,
          approved_at: item.approved_at,
          rejected_at: item.rejected_at,
          cancelled_at: item.cancelled_at,
          processed_at: item.processed_at,
          settlement_date: item.settlement_date,
          tx_hash: item.tx_hash,
          rejection_reason: item.rejection_reason,
          cancellation_reason: item.cancellation_reason,
          investor_name: item.investor?.name || 'Unknown',
          investor_email: item.investor?.email || '',
          fund_name: item.fund?.name || 'Unknown Fund'
        }));
        setRequests(transformedData);
      }
    } catch (error) {
      console.error('Error fetching withdrawal requests:', error);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: string, approvedAmount?: number, adminNotes?: string) => {
    try {
      setActionLoading(requestId);
      const { error } = await supabase.rpc('approve_withdrawal', {
        p_request_id: requestId,
        p_approved_amount: approvedAmount,
        p_admin_notes: adminNotes
      });

      if (error) throw error;

      toast({ title: 'Success', description: 'Withdrawal approved successfully' });
      fetchWithdrawalRequests();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to approve withdrawal',
        variant: 'destructive'
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (requestId: string, reason: string, adminNotes?: string) => {
    try {
      setActionLoading(requestId);
      const { error } = await supabase.rpc('reject_withdrawal', {
        p_request_id: requestId,
        p_reason: reason,
        p_admin_notes: adminNotes
      });

      if (error) throw error;

      toast({ title: 'Success', description: 'Withdrawal rejected' });
      fetchWithdrawalRequests();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to reject withdrawal',
        variant: 'destructive'
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleStartProcessing = async (requestId: string, processedAmount?: number, txHash?: string, settlementDate?: string, adminNotes?: string) => {
    try {
      setActionLoading(requestId);
      const { error } = await supabase.rpc('start_processing_withdrawal', {
        p_request_id: requestId,
        p_processed_amount: processedAmount,
        p_tx_hash: txHash,
        p_settlement_date: settlementDate ? new Date(settlementDate).toISOString().split('T')[0] : undefined,
        p_admin_notes: adminNotes
      });

      if (error) throw error;

      toast({ title: 'Success', description: 'Withdrawal processing started' });
      fetchWithdrawalRequests();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to start processing withdrawal',
        variant: 'destructive'
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleComplete = async (requestId: string, txHash?: string, adminNotes?: string) => {
    try {
      setActionLoading(requestId);
      const { error } = await supabase.rpc('complete_withdrawal', {
        p_request_id: requestId,
        p_tx_hash: txHash,
        p_admin_notes: adminNotes
      });

      if (error) throw error;

      toast({ title: 'Success', description: 'Withdrawal completed' });
      fetchWithdrawalRequests();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to complete withdrawal',
        variant: 'destructive'
      });
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: any, icon: React.ReactNode }> = {
      pending: { variant: 'outline', icon: <Clock className="h-3 w-3" /> },
      approved: { variant: 'default', icon: <CheckCircle className="h-3 w-3" /> },
      processing: { variant: 'secondary', icon: <PlayCircle className="h-3 w-3" /> },
      completed: { variant: 'default', icon: <CheckCircle className="h-3 w-3" /> },
      rejected: { variant: 'destructive', icon: <XCircle className="h-3 w-3" /> },
      cancelled: { variant: 'secondary', icon: <Pause className="h-3 w-3" /> }
    };

    const { variant, icon } = config[status] || { variant: 'outline', icon: null };
    
    return (
      <Badge variant={variant} className="flex items-center gap-1">
        {icon}
        {status}
      </Badge>
    );
  };

  // Filter requests based on status and search query
  const filteredRequests = requests.filter(request => {
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    const matchesSearch = !searchQuery || 
      request.investor_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.investor_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.fund_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.id.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesStatus && matchesSearch;
  });

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Withdrawal Management</h1>
        <Button onClick={fetchWithdrawalRequests}>Refresh</Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by investor name, email, fund, or request ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="w-full sm:w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>Showing {filteredRequests.length} of {requests.length} requests</span>
        {statusFilter !== 'all' && (
          <Badge variant="outline">Filtered by: {statusFilter}</Badge>
        )}
      </div>

      {/* Withdrawal Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>Withdrawal Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredRequests.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No withdrawal requests found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Request Details</TableHead>
                    <TableHead>Investor</TableHead>
                    <TableHead>Fund</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium text-sm">{request.id.slice(0, 8)}...</p>
                          <p className="text-xs text-muted-foreground">{request.withdrawal_type}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium text-sm">{request.investor_name}</p>
                          <p className="text-xs text-muted-foreground">{request.investor_email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium text-sm">{request.fund_name}</p>
                          <p className="text-xs text-muted-foreground">{request.fund_class}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium">${request.requested_amount?.toLocaleString()}</p>
                          {request.approved_amount && request.approved_amount !== request.requested_amount && (
                            <p className="text-xs text-green-600">Approved: ${request.approved_amount.toLocaleString()}</p>
                          )}
                          {request.processed_amount && (
                            <p className="text-xs text-blue-600">Processed: ${request.processed_amount.toLocaleString()}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(request.status)}
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{format(new Date(request.created_at), 'MMM dd, yyyy')}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(request.created_at), 'HH:mm')}</p>
                      </TableCell>
                      <TableCell>
                        <WithdrawalActions
                          request={request}
                          onApprove={handleApprove}
                          onReject={handleReject}
                          onStartProcessing={handleStartProcessing}
                          onComplete={handleComplete}
                          loading={actionLoading === request.id}
                          onViewDetails={() => setSelectedRequest(request)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Withdrawal Details Dialog */}
      {selectedRequest && (
        <WithdrawalDetailsDialog
          request={selectedRequest}
          open={!!selectedRequest}
          onClose={() => setSelectedRequest(null)}
        />
      )}
    </div>
  );
};

// Withdrawal Actions Component
const WithdrawalActions: React.FC<{
  request: WithdrawalRequest;
  onApprove: (id: string, amount?: number, notes?: string) => void;
  onReject: (id: string, reason: string, notes?: string) => void;
  onStartProcessing: (id: string, amount?: number, txHash?: string, settlementDate?: string, notes?: string) => void;
  onComplete: (id: string, txHash?: string, notes?: string) => void;
  loading: boolean;
  onViewDetails: () => void;
}> = ({ request, onApprove, onReject, onStartProcessing, onComplete, loading, onViewDetails }) => {
  const getActions = () => {
    switch (request.status) {
      case 'pending':
        return (
          <div className="flex gap-1">
            <Button size="sm" variant="default" onClick={() => onApprove(request.id)} disabled={loading}>
              Approve
            </Button>
            <Button size="sm" variant="destructive" onClick={() => onReject(request.id, 'Admin rejection')} disabled={loading}>
              Reject
            </Button>
          </div>
        );
      case 'approved':
        return (
          <Button size="sm" onClick={() => onStartProcessing(request.id)} disabled={loading}>
            Start Processing
          </Button>
        );
      case 'processing':
        return (
          <Button size="sm" onClick={() => onComplete(request.id)} disabled={loading}>
            Complete
          </Button>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="ghost" onClick={onViewDetails}>
        View Details
      </Button>
      {getActions()}
    </div>
  );
};

// Withdrawal Details Dialog Component
const WithdrawalDetailsDialog: React.FC<{
  request: WithdrawalRequest;
  open: boolean;
  onClose: () => void;
}> = ({ request, open, onClose }) => {
  
  const getStatusBadgeLocal = (status: string) => {
    const config: Record<string, { variant: any, icon: React.ReactNode }> = {
      pending: { variant: 'outline', icon: <Clock className="h-3 w-3" /> },
      approved: { variant: 'default', icon: <CheckCircle className="h-3 w-3" /> },
      processing: { variant: 'secondary', icon: <PlayCircle className="h-3 w-3" /> },
      completed: { variant: 'default', icon: <CheckCircle className="h-3 w-3" /> },
      rejected: { variant: 'destructive', icon: <XCircle className="h-3 w-3" /> },
      cancelled: { variant: 'secondary', icon: <Pause className="h-3 w-3" /> }
    };

    const { variant, icon } = config[status] || { variant: 'outline', icon: null };
    
    return (
      <Badge variant={variant} className="flex items-center gap-1">
        {icon}
        {status}
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Withdrawal Request Details</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2">Request Information</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Request ID:</span>
                  <span className="font-mono">{request.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type:</span>
                  <span>{request.withdrawal_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  {getStatusBadgeLocal(request.status)}
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created:</span>
                  <span>{format(new Date(request.created_at), 'MMM dd, yyyy HH:mm')}</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Investor & Fund</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Investor:</span>
                  <span>{request.investor_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email:</span>
                  <span>{request.investor_email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fund:</span>
                  <span>{request.fund_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Class:</span>
                  <span>{request.fund_class}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Amounts */}
          <div>
            <h4 className="font-semibold mb-2">Amount Details</h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center p-3 bg-muted rounded">
                <p className="text-muted-foreground">Requested</p>
                <p className="font-semibold text-lg">${request.requested_amount?.toLocaleString()}</p>
              </div>
              {request.approved_amount && (
                <div className="text-center p-3 bg-green-50 rounded">
                  <p className="text-muted-foreground">Approved</p>
                  <p className="font-semibold text-lg text-green-700">${request.approved_amount.toLocaleString()}</p>
                </div>
              )}
              {request.processed_amount && (
                <div className="text-center p-3 bg-blue-50 rounded">
                  <p className="text-muted-foreground">Processed</p>
                  <p className="font-semibold text-lg text-blue-700">${request.processed_amount.toLocaleString()}</p>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {(request.notes || request.admin_notes) && (
            <div>
              <h4 className="font-semibold mb-2">Notes</h4>
              <div className="space-y-2">
                {request.notes && (
                  <div className="p-3 bg-muted rounded">
                    <p className="text-sm font-medium">Investor Notes:</p>
                    <p className="text-sm text-muted-foreground">{request.notes}</p>
                  </div>
                )}
                {request.admin_notes && (
                  <div className="p-3 bg-orange-50 rounded">
                    <p className="text-sm font-medium">Admin Notes:</p>
                    <p className="text-sm text-muted-foreground">{request.admin_notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Timeline */}
          <div>
            <h4 className="font-semibold mb-2">Timeline</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center py-1 border-b">
                <span>Request Created</span>
                <span className="text-muted-foreground">{format(new Date(request.created_at), 'MMM dd, yyyy HH:mm')}</span>
              </div>
              {request.approved_at && (
                <div className="flex justify-between items-center py-1 border-b">
                  <span className="text-green-600">Approved</span>
                  <span className="text-muted-foreground">{format(new Date(request.approved_at), 'MMM dd, yyyy HH:mm')}</span>
                </div>
              )}
              {request.processed_at && (
                <div className="flex justify-between items-center py-1 border-b">
                  <span className="text-blue-600">Processing Started</span>
                  <span className="text-muted-foreground">{format(new Date(request.processed_at), 'MMM dd, yyyy HH:mm')}</span>
                </div>
              )}
              {request.settlement_date && (
                <div className="flex justify-between items-center py-1 border-b">
                  <span>Settlement Date</span>
                  <span className="text-muted-foreground">{format(new Date(request.settlement_date), 'MMM dd, yyyy')}</span>
                </div>
              )}
              {request.rejected_at && (
                <div className="flex justify-between items-center py-1 border-b">
                  <span className="text-red-600">Rejected</span>
                  <span className="text-muted-foreground">{format(new Date(request.rejected_at), 'MMM dd, yyyy HH:mm')}</span>
                </div>
              )}
            </div>
          </div>

          {/* Transaction Hash */}
          {request.tx_hash && (
            <div>
              <h4 className="font-semibold mb-2">Transaction Details</h4>
              <div className="p-3 bg-muted rounded">
                <p className="text-sm font-medium">Transaction Hash:</p>
                <p className="text-sm font-mono text-muted-foreground">{request.tx_hash}</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdminWithdrawalsPage;