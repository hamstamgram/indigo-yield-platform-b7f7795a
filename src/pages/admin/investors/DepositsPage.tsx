import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowUpCircle, Clock, CheckCircle, XCircle, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Deposit {
  id: string;
  amount: number;
  asset_symbol: string;
  status: string | null;
  created_at: string | null;
  transaction_hash?: string | null;
  asset_id: number;
  asset: { symbol: string; name: string };
}

const DepositsPage = () => {
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchDeposits();
  }, []);

  const fetchDeposits = async () => {
    try {
      setLoading(true);
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('No authenticated user');

      const { data: depositsData, error: depositsError } = await supabase
        .from('deposits')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (depositsError) throw depositsError;

      // Transform data for type compatibility
      const transformedDeposits = (depositsData || []).map(deposit => ({
        ...deposit,
        asset_id: 1, // Mock for type compatibility
        asset: { symbol: deposit.asset_symbol, name: deposit.asset_symbol }
      }));

      setDeposits(transformedDeposits);
    } catch (error: any) {
      console.error('Error fetching deposits:', error);
      toast({
        title: 'Error loading deposits',
        description: error.message || 'Failed to load deposit history',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'failed':
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
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <ArrowUpCircle className="h-8 w-8 text-primary" />
          Deposit History
        </h1>
        <p className="text-muted-foreground">View your cryptocurrency deposit transactions</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Deposits</CardTitle>
          <CardDescription>
            All your cryptocurrency deposits and their current status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
            <Info className="h-5 w-5 text-yellow-600" />
            <div className="text-sm text-yellow-800">
              Deposit functionality is temporarily unavailable while we update the database schema. 
              All existing deposit data remains safe and accessible.
            </div>
          </div>

          {deposits.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ArrowUpCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No deposits found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {deposits.map((deposit) => (
                <div key={deposit.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    {getStatusIcon(deposit.status || 'pending')}
                    <div>
                      <div className="font-semibold">
                        {deposit.amount} {deposit.asset_symbol}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {deposit.created_at ? new Date(deposit.created_at).toLocaleDateString() : 'N/A'}
                      </div>
                      {deposit.transaction_hash && (
                        <div className="text-xs text-muted-foreground font-mono">
                          TX: {deposit.transaction_hash.slice(0, 16)}...
                        </div>
                      )}
                    </div>
                  </div>
                  <Badge variant={getStatusColor(deposit.status || 'pending')}>
                    {deposit.status || 'pending'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DepositsPage;