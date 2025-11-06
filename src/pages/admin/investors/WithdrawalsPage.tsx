// @ts-nocheck
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArrowDownCircle, Clock, CheckCircle, XCircle, AlertCircle, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface WithdrawalRequest {
  id: string;
  requested_amount: number;
  approved_amount?: number;
  processed_amount?: number;
  status: string;
  withdrawal_type: string;
  created_at: string;
  approved_at?: string;
  processed_at?: string;
  rejected_at?: string;
  rejection_reason?: string;
  cancellation_reason?: string;
  notes?: string;
  admin_notes?: string;
  funds: {
    name: string;
    code: string;
    fund_class: string;
  };
}

interface InvestorPosition {
  fund_id: string;
  current_value: number;
  shares: number;
  fund_class: string;
  funds: {
    name: string;
    code: string;
  };
}

const WithdrawalsPage = () => {
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [positions, setPositions] = useState<InvestorPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { toast } = useToast();

  // Form state
  const [selectedFund, setSelectedFund] = useState<string>('');
  const [withdrawalAmount, setWithdrawalAmount] = useState<string>('');
  const [withdrawalType, setWithdrawalType] = useState<string>('partial');
  const [withdrawalNotes, setWithdrawalNotes] = useState<string>('');

  useEffect(() => {
    fetchWithdrawals();
    fetchPositions();
  }, []);

  const fetchWithdrawals = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('Not authenticated');

      // Get investor record
      const { data: investorData, error: investorError } = await supabase
        .from('investors')
        .select('id')
        .eq('profile_id', user.id)
        .single();

      if (investorError || !investorData) throw new Error('Investor profile not found');

      const { data: withdrawalsData, error: withdrawalsError } = await supabase
        .from('withdrawal_requests')
        .select(`
          *,
          funds:fund_id (
            name,
            code,
            fund_class
          )
        `)
        .eq('investor_id', investorData.id)
        .order('created_at', { ascending: false });

      if (withdrawalsError) throw withdrawalsError;

      // Map data to ensure created_at is included and properly typed
      const mappedData = (withdrawalsData || []).map((item: any) => ({
        ...item,
        created_at: item.created_at || new Date().toISOString(),
        funds: item.funds || { name: 'Unknown Fund', code: 'N/A', fund_class: 'N/A' }
      }));

      setWithdrawals(mappedData);
    } catch (error: any) {
      console.error('Error fetching withdrawals:', error);
      toast({
        title: 'Error loading withdrawals',
        description: error.message || 'Failed to load withdrawal history',
        variant: 'destructive',
      });
    }
  };

  const fetchPositions = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('Not authenticated');

      // Get investor record
      const { data: investorData, error: investorError } = await supabase
        .from('investors')
        .select('id')
        .eq('profile_id', user.id)
        .single();

      if (investorError || !investorData) throw new Error('Investor profile not found');

      const { data: positionsData, error: positionsError } = await supabase
        .from('investor_positions')
        .select(`
          fund_id,
          current_value,
          shares,
          fund_class,
          funds:fund_id (
            name,
            code
          )
        `)
        .eq('investor_id', investorData.id)
        .gt('current_value', 0);

      if (positionsError) throw positionsError;

      setPositions(positionsData || []);
    } catch (error: any) {
      console.error('Error fetching positions:', error);
      toast({
        title: 'Error loading positions',
        description: error.message || 'Failed to load your positions',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWithdrawal = async () => {
    if (!selectedFund || !withdrawalAmount) {
      toast({
        title: 'Missing information',
        description: 'Please select a fund and enter withdrawal amount',
        variant: 'destructive',
      });
      return;
    }

    const amount = parseFloat(withdrawalAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: 'Invalid amount',
        description: 'Please enter a valid withdrawal amount',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSubmitting(true);

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('Not authenticated');

      // Get investor record
      const { data: investorData, error: investorError } = await supabase
        .from('investors')
        .select('id')
        .eq('profile_id', user.id)
        .single();

      if (investorError || !investorData) throw new Error('Investor profile not found');

      // Check if amount is valid for the selected position
      const selectedPosition = positions.find(p => p.fund_id === selectedFund);
      if (!selectedPosition) throw new Error('Position not found');

      if (amount > selectedPosition.current_value) {
        toast({
          title: 'Amount too high',
          description: `Maximum withdrawal amount is $${selectedPosition.current_value.toLocaleString()}`,
          variant: 'destructive',
        });
        return;
      }

      // Create withdrawal request using the database function
      const { data, error } = await supabase.rpc('create_withdrawal_request', {
        p_investor_id: investorData.id,
        p_fund_id: selectedFund,
        p_amount: amount,
        p_type: withdrawalType,
        p_notes: withdrawalNotes || null
      });

      if (error) throw error;

      toast({
        title: 'Withdrawal request submitted',
        description: 'Your withdrawal request has been submitted for review',
      });

      // Reset form and close dialog
      setSelectedFund('');
      setWithdrawalAmount('');
      setWithdrawalType('partial');
      setWithdrawalNotes('');
      setIsCreateDialogOpen(false);

      // Refresh data
      fetchWithdrawals();
    } catch (error: any) {
      console.error('Error creating withdrawal:', error);
      toast({
        title: 'Error creating withdrawal',
        description: error.message || 'Failed to create withdrawal request',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'processing':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'rejected':
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'processing':
        return 'default';
      case 'approved':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'rejected':
      case 'cancelled':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ArrowDownCircle className="h-8 w-8 text-primary" />
            Withdrawals
          </h1>
          <p className="text-muted-foreground">Request withdrawals from your portfolio</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              New Withdrawal
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Create Withdrawal Request</DialogTitle>
              <DialogDescription>
                Request a withdrawal from one of your fund positions
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="fund">Select Fund</Label>
                <Select value={selectedFund} onValueChange={setSelectedFund}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a fund position" />
                  </SelectTrigger>
                  <SelectContent>
                    {positions.map((position) => (
                      <SelectItem key={position.fund_id} value={position.fund_id}>
                        {position.funds.name} - ${position.current_value.toLocaleString()} available
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedFund && (
                  <p className="text-sm text-muted-foreground">
                    Maximum withdrawal: ${positions.find(p => p.fund_id === selectedFund)?.current_value.toLocaleString()}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Withdrawal Amount ($)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={withdrawalAmount}
                  onChange={(e) => setWithdrawalAmount(e.target.value)}
                  placeholder="Enter amount to withdraw"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Withdrawal Type</Label>
                <Select value={withdrawalType} onValueChange={setWithdrawalType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select withdrawal type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="partial">Partial Withdrawal</SelectItem>
                    <SelectItem value="full">Full Withdrawal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={withdrawalNotes}
                  onChange={(e) => setWithdrawalNotes(e.target.value)}
                  placeholder="Add any additional notes or special instructions"
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateWithdrawal}
                  disabled={submitting}
                >
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Withdrawal Requests</CardTitle>
          <CardDescription>
            Track the status of your withdrawal requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          {withdrawals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ArrowDownCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No withdrawal requests found</p>
              <p className="text-sm">Create your first withdrawal request above</p>
            </div>
          ) : (
            <div className="space-y-4">
              {withdrawals.map((withdrawal) => (
                <div key={withdrawal.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(withdrawal.status)}
                      <div>
                        <div className="font-semibold">
                          ${withdrawal.requested_amount.toLocaleString()} from {withdrawal.funds?.name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {withdrawal.withdrawal_type} • {new Date(withdrawal.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <Badge variant={getStatusColor(withdrawal.status)}>
                      {withdrawal.status}
                    </Badge>
                  </div>
                  
                  {withdrawal.approved_amount && withdrawal.approved_amount !== withdrawal.requested_amount && (
                    <div className="text-sm text-muted-foreground mb-2">
                      Approved amount: ${withdrawal.approved_amount.toLocaleString()}
                    </div>
                  )}
                  
                  {withdrawal.rejection_reason && (
                    <div className="flex items-start gap-2 mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm">
                      <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                      <div>
                        <span className="font-medium text-red-800">Rejected: </span>
                        <span className="text-red-700">{withdrawal.rejection_reason}</span>
                      </div>
                    </div>
                  )}
                  
                  {withdrawal.notes && (
                    <div className="text-sm text-muted-foreground mt-2">
                      <strong>Your notes:</strong> {withdrawal.notes}
                    </div>
                  )}
                  
                  {withdrawal.admin_notes && (
                    <div className="text-sm text-muted-foreground mt-2 p-2 bg-gray-50 rounded">
                      <strong>Admin notes:</strong> {withdrawal.admin_notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WithdrawalsPage;