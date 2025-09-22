import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface SimpleWithdrawalRequest {
  id: string;
  investor_id: string;
  fund_id: string;
  requested_amount: number;
  status: string;
}

const AdminWithdrawalsPage = () => {
  const [requests, setRequests] = useState<SimpleWithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchWithdrawalRequests();
  }, []);

  const fetchWithdrawalRequests = async () => {
    try {
      setLoading(true);
      
      // Simple query without problematic columns
      const { data, error } = await supabase
        .from('withdrawal_requests')
        .select('id, investor_id, fund_id, requested_amount, status')
        .order('id', { ascending: false });

      if (error) {
        console.error('Database error:', error);
        setRequests([]);
      } else {
        setRequests(data || []);
      }
    } catch (error) {
      console.error('Error fetching withdrawal requests:', error);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    try {
      const { error } = await supabase.rpc('approve_withdrawal', {
        p_request_id: requestId
      });

      if (error) throw error;

      toast({ title: 'Success', description: 'Withdrawal approved' });
      fetchWithdrawalRequests();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to approve withdrawal',
        variant: 'destructive'
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: 'outline',
      approved: 'default',
      processing: 'outline',
      completed: 'default',
      rejected: 'destructive',
      cancelled: 'secondary'
    };

    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Withdrawal Management</h1>
        <Button onClick={fetchWithdrawalRequests}>Refresh</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Withdrawal Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {requests.length === 0 ? (
              <p className="text-muted-foreground">No withdrawal requests found.</p>
            ) : (
              requests.map((request) => (
                <div key={request.id} className="border rounded p-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">Request ID: {request.id.slice(0, 8)}...</p>
                      <p className="text-sm text-muted-foreground">
                        Amount: ${request.requested_amount.toLocaleString()}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Investor: {request.investor_id.slice(0, 8)}...
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(request.status)}
                      {request.status === 'pending' && (
                        <Button
                          size="sm"
                          onClick={() => handleApprove(request.id)}
                        >
                          Approve
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminWithdrawalsPage;