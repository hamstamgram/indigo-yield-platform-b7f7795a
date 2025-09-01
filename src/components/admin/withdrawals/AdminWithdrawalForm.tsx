import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { MinusCircle, Loader2, AlertTriangle } from 'lucide-react';

interface AdminWithdrawalFormProps {
  investors: any[];
  assets: any[];
  onSuccess?: () => void;
}

const AdminWithdrawalForm: React.FC<AdminWithdrawalFormProps> = ({ 
  investors, 
  assets, 
  onSuccess 
}) => {
  const [loading, setLoading] = useState(false);
  const [availableBalance, setAvailableBalance] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    investor_id: '',
    asset_id: '',
    amount: '',
    destination_address: '',
    notes: ''
  });
  const { toast } = useToast();

  // Fetch available balance when investor and asset are selected
  useEffect(() => {
    const fetchBalance = async () => {
      if (formData.investor_id && formData.asset_id) {
        try {
          const { data, error } = await supabase
            .from('portfolios')
            .select('balance')
            .eq('user_id', formData.investor_id)
            .eq('asset_id', parseInt(formData.asset_id))
            .single();

          if (error && error.code !== 'PGRST116') throw error;
          setAvailableBalance(data?.balance || 0);
        } catch (error) {
          console.error('Error fetching balance:', error);
          setAvailableBalance(0);
        }
      } else {
        setAvailableBalance(null);
      }
    };

    fetchBalance();
  }, [formData.investor_id, formData.asset_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.investor_id || !formData.asset_id || !formData.amount) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    const withdrawalAmount = parseFloat(formData.amount);
    
    if (availableBalance !== null && withdrawalAmount > availableBalance) {
      toast({
        title: 'Insufficient Balance',
        description: `Available balance is ${availableBalance}. Cannot withdraw ${withdrawalAmount}`,
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    
    try {
      // Get current user (admin)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      // Start a Supabase transaction
      const { data: portfolio, error: portfolioError } = await supabase
        .from('portfolios')
        .select('*')
        .eq('user_id', formData.investor_id)
        .eq('asset_id', parseInt(formData.asset_id))
        .single();

      if (portfolioError) throw portfolioError;
      if (!portfolio) throw new Error('Portfolio not found');

      const newBalance = portfolio.balance - withdrawalAmount;
      
      if (newBalance < 0) {
        throw new Error('Insufficient balance for withdrawal');
      }

      // Update portfolio balance
      const { error: updateError } = await supabase
        .from('portfolios')
        .update({
          balance: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', portfolio.id);

      if (updateError) throw updateError;

      // Record the withdrawal in transactions
      const { data: transaction, error: txError } = await supabase
        .from('transactions')
        .insert({
          investor_id: formData.investor_id,
          asset_code: assets.find(a => a.id === parseInt(formData.asset_id))?.symbol || 'UNKNOWN',
          amount: withdrawalAmount,
          kind: 'withdrawal',
          status: 'pending', // Withdrawals start as pending
          meta: {
            destination_address: formData.destination_address,
            notes: formData.notes,
            processed_by: user.id,
            previous_balance: portfolio.balance,
            new_balance: newBalance
          }
        })
        .select()
        .single();

      if (txError) throw txError;

      // Log to audit trail
      const { error: auditError } = await supabase
        .from('audit_log')
        .insert({
          actor_user: user.id,
          action: 'CREATE_WITHDRAWAL',
          entity: 'transactions',
          entity_id: transaction.id,
          old_values: {
            balance: portfolio.balance
          },
          new_values: {
            balance: newBalance,
            withdrawal_amount: withdrawalAmount
          },
          meta: {
            investor_id: formData.investor_id,
            asset_id: formData.asset_id,
            destination_address: formData.destination_address,
            notes: formData.notes
          }
        });

      if (auditError) console.error('Audit log error:', auditError);

      toast({
        title: 'Withdrawal Initiated',
        description: `Successfully initiated withdrawal of ${formData.amount} ${assets.find(a => a.id === parseInt(formData.asset_id))?.symbol}`,
      });

      // Reset form
      setFormData({
        investor_id: '',
        asset_id: '',
        amount: '',
        destination_address: '',
        notes: ''
      });
      setAvailableBalance(null);

      if (onSuccess) onSuccess();
      
    } catch (error: any) {
      console.error('Withdrawal error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to process withdrawal',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Process Withdrawal</CardTitle>
        <CardDescription>
          Process a withdrawal request for an investor. This will deduct from their portfolio balance.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Withdrawals are irreversible. Please double-check all details before processing.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="investor">Investor *</Label>
              <Select
                value={formData.investor_id}
                onValueChange={(value) => setFormData({ ...formData, investor_id: value })}
                disabled={loading}
              >
                <SelectTrigger id="investor">
                  <SelectValue placeholder="Select investor" />
                </SelectTrigger>
                <SelectContent>
                  {investors.map((investor) => (
                    <SelectItem key={investor.id} value={investor.id}>
                      {investor.first_name} {investor.last_name} ({investor.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="asset">Asset *</Label>
              <Select
                value={formData.asset_id}
                onValueChange={(value) => setFormData({ ...formData, asset_id: value })}
                disabled={loading}
              >
                <SelectTrigger id="asset">
                  <SelectValue placeholder="Select asset" />
                </SelectTrigger>
                <SelectContent>
                  {assets.map((asset) => (
                    <SelectItem key={asset.id} value={asset.id.toString()}>
                      {asset.symbol} - {asset.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {availableBalance !== null && (
            <Alert>
              <AlertDescription>
                Available balance: {availableBalance.toFixed(6)} {assets.find(a => a.id === parseInt(formData.asset_id))?.symbol}
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                type="number"
                step="0.000001"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                disabled={loading}
                max={availableBalance || undefined}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="destination">Destination Address</Label>
              <Input
                id="destination"
                type="text"
                placeholder="Wallet or bank account"
                value={formData.destination_address}
                onChange={(e) => setFormData({ ...formData, destination_address: e.target.value })}
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Input
              id="notes"
              type="text"
              placeholder="Reason for withdrawal or additional notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              disabled={loading}
            />
          </div>

          <Button 
            type="submit" 
            disabled={loading || (availableBalance !== null && parseFloat(formData.amount) > availableBalance)} 
            variant="destructive"
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <MinusCircle className="mr-2 h-4 w-4" />
                Process Withdrawal
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default AdminWithdrawalForm;
