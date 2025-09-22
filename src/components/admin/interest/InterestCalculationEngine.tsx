import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Calculator, TrendingUp, Calendar, CheckCircle, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

interface InterestCalculationEngineProps {
  onSuccess?: () => void;
}

interface CalculationResult {
  investor_id: string;
  investor_name: string;
  asset: string;
  principal: number;
  interest_earned: number;
  new_balance: number;
  rate_applied: number;
}

const InterestCalculationEngine: React.FC<InterestCalculationEngineProps> = ({ onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<CalculationResult[]>([]);
  const [lastCalculation, setLastCalculation] = useState<Date | null>(null);
  const [yieldRates, setYieldRates] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchLastCalculation();
    fetchYieldRates();
  }, []);

  const fetchLastCalculation = async () => {
    try {
      const { data, error } = await supabase
        .from('audit_log')
        .select('created_at')
        .eq('action', 'APPLY_INTEREST')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (data) {
        setLastCalculation(new Date(data.created_at));
      }
    } catch (error) {
      console.error('Error fetching last calculation:', error);
    }
  };

  const fetchYieldRates = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('yield_rates')
        .select('*, asset:assets(*)')
        .eq('date', today);

      if (error) throw error;
      setYieldRates(data || []);
    } catch (error) {
      console.error('Error fetching yield rates:', error);
    }
  };

  const calculateInterest = async () => {
    setCalculating(true);
    setProgress(0);
    setResults([]);

    try {
      // Get current user (admin)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      // Fetch all portfolios with investor details
      const { data: portfolios, error: portfolioError } = await supabase
        .from('portfolios')
        .select(`
          *,
          user:profiles!portfolios_user_id_fkey(*),
          asset:assets(*)
        `)
        .gt('balance', 0); // Only process portfolios with positive balance

      if (portfolioError) throw portfolioError;
      if (!portfolios || portfolios.length === 0) {
        toast({
          title: 'No portfolios to process',
          description: 'No investor portfolios found with positive balances',
        });
        return;
      }

      const totalPortfolios = portfolios.length;
      const calculationResults: CalculationResult[] = [];

      for (let i = 0; i < portfolios.length; i++) {
        const portfolio = portfolios[i];
        setProgress(Math.round(((i + 1) / totalPortfolios) * 100));

        // Get yield rate for this asset
        const yieldRate = yieldRates.find(y => y.asset_id === portfolio.asset_id);
        
        if (!yieldRate) {
          console.warn(`No yield rate found for asset ${portfolio.asset?.symbol}`);
          continue;
        }

        // Calculate interest (daily compounding)
        const dailyRate = yieldRate.daily_yield_percentage / 100;
        const interestEarned = portfolio.balance * dailyRate;
        const newBalance = portfolio.balance + interestEarned;

        // Update portfolio balance
        const { error: updateError } = await supabase
          .from('portfolios')
          .update({
            balance: newBalance,
            updated_at: new Date().toISOString()
          })
          .eq('id', portfolio.id);

        if (updateError) throw updateError;

        const txData = {
          investor_id: portfolio.user_id,
          asset_code: (portfolio.asset?.symbol as 'BTC' | 'ETH' | 'SOL' | 'USDT' | 'USDC' | 'EURC') || 'USDT',
          amount: interestEarned,
          type: 'INTEREST' as const,
          status: 'confirmed' as const,
          confirmed_at: new Date().toISOString(),
          created_by: user.id
        };

        // Record interest transaction
        const { error: txError } = await supabase
          .from('transactions')
          .insert(txData);

        if (txError) throw txError;

        // Add to portfolio history
        const { error: historyError } = await supabase
          .from('portfolio_history')
          .insert({
            user_id: portfolio.user_id,
            asset_id: portfolio.asset_id,
            balance: newBalance,
            yield_applied: interestEarned,
            usd_value: newBalance, // This should be calculated based on current price
            date: new Date().toISOString().split('T')[0]
          });

        if (historyError && historyError.code !== '23505') { // Ignore unique constraint violations
          console.error('History error:', historyError);
        }

        calculationResults.push({
          investor_id: portfolio.user_id,
          investor_name: `${portfolio.user?.first_name || ''} ${portfolio.user?.last_name || ''}`.trim() || portfolio.user?.email,
          asset: portfolio.asset?.symbol || 'UNKNOWN',
          principal: portfolio.balance,
          interest_earned: interestEarned,
          new_balance: newBalance,
          rate_applied: dailyRate * 100
        });
      }

      // Log the batch operation
      const { error: auditError } = await supabase
        .from('audit_log')
        .insert({
          actor_user: user.id,
          action: 'APPLY_INTEREST',
          entity: 'portfolios',
          entity_id: 'batch',
          new_values: {
            portfolios_processed: totalPortfolios,
            total_interest: calculationResults.reduce((sum, r) => sum + r.interest_earned, 0),
            calculation_date: new Date().toISOString()
          },
          meta: {
            results: calculationResults
          }
        });

      if (auditError) console.error('Audit log error:', auditError);

      setResults(calculationResults);
      setLastCalculation(new Date());
      
      toast({
        title: 'Interest Calculated Successfully',
        description: `Processed ${calculationResults.length} portfolios`,
      });

      if (onSuccess) onSuccess();

    } catch (error: any) {
      console.error('Interest calculation error:', error);
      toast({
        title: 'Calculation Error',
        description: error.message || 'Failed to calculate interest',
        variant: 'destructive',
      });
    } finally {
      setCalculating(false);
      setProgress(0);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Interest Calculation Engine
          </CardTitle>
          <CardDescription>
            Apply daily interest to all investor portfolios based on configured yield rates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {lastCalculation && (
            <Alert>
              <Calendar className="h-4 w-4" />
              <AlertTitle>Last Calculation</AlertTitle>
              <AlertDescription>
                Interest was last calculated on {format(lastCalculation, 'PPP at pp')}
              </AlertDescription>
            </Alert>
          )}

          {yieldRates.length === 0 ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>No Yield Rates Configured</AlertTitle>
              <AlertDescription>
                Please configure yield rates for today before running interest calculations
              </AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <TrendingUp className="h-4 w-4" />
              <AlertTitle>Today's Yield Rates</AlertTitle>
              <AlertDescription>
                {yieldRates.map(rate => (
                  <div key={rate.id}>
                    {rate.asset?.symbol}: {rate.daily_yield_percentage}%
                  </div>
                ))}
              </AlertDescription>
            </Alert>
          )}

          {calculating && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Processing portfolios...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          <Button 
            onClick={calculateInterest} 
            disabled={calculating || yieldRates.length === 0}
            className="w-full"
          >
            {calculating ? (
              <>
                <Calculator className="mr-2 h-4 w-4 animate-pulse" />
                Calculating Interest...
              </>
            ) : (
              <>
                <Calculator className="mr-2 h-4 w-4" />
                Calculate Daily Interest
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Calculation Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Investor</th>
                    <th className="text-left p-2">Asset</th>
                    <th className="text-right p-2">Principal</th>
                    <th className="text-right p-2">Rate</th>
                    <th className="text-right p-2">Interest</th>
                    <th className="text-right p-2">New Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result, index) => (
                    <tr key={index} className="border-b">
                      <td className="p-2">{result.investor_name}</td>
                      <td className="p-2">{result.asset}</td>
                      <td className="text-right p-2">{result.principal.toFixed(6)}</td>
                      <td className="text-right p-2">{result.rate_applied.toFixed(4)}%</td>
                      <td className="text-right p-2 text-green-600">
                        +{result.interest_earned.toFixed(6)}
                      </td>
                      <td className="text-right p-2 font-semibold">
                        {result.new_balance.toFixed(6)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-semibold">
                    <td colSpan={4} className="p-2">Total Interest Applied:</td>
                    <td className="text-right p-2 text-green-600">
                      +{results.reduce((sum, r) => sum + r.interest_earned, 0).toFixed(6)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default InterestCalculationEngine;
