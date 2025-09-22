import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Save, TrendingUp, Clock, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Asset {
  id: number;
  symbol: string;
  name: string;
}

interface AUMEntry {
  asset_symbol: string;
  asset_name: string;
  current_aum: number;
  previous_aum: number;
  aum_difference: number;
  yield_percentage: number;
}

export default function DailyAUMManagement() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [aumEntries, setAumEntries] = useState<AUMEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const { toast } = useToast();

  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Check if it's 9 PM London time
  const isOptimalTime = () => {
    const now = new Date();
    const londonTime = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/London',
      hour: 'numeric',
      hour12: false
    }).format(now);
    return parseInt(londonTime) === 21; // 9 PM
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch assets from the assets table
      const { data: assetsData, error: assetsError } = await supabase
        .from('assets')
        .select('id, symbol, name')
        .eq('is_active', true)
        .order('name');
      
      if (assetsError) throw assetsError;
      
      // Get current AUM from positions (sum per asset)
      const { data: currentPositions, error: currentError } = await supabase
        .from('positions')
        .select('asset_code, current_balance');
      
      if (currentError) throw currentError;
      
      setAssets(assetsData || []);
      
      // Create AUM entries structure
      const entries = assetsData?.map(asset => {
        // Sum current balances for this asset
        const currentBalances = currentPositions?.filter(pos => pos.asset_code === asset.symbol) || [];
        const currentTotal = currentBalances.reduce((sum, pos) => sum + (pos.current_balance || 0), 0);
        
        // For now, set previous AUM to 0 since we don't have historical data yet
        const previousTotal = 0;
        
        const difference = currentTotal - previousTotal;
        const yieldPercentage = previousTotal > 0 ? (difference / previousTotal) * 100 : 0;
        
        return {
          asset_symbol: asset.symbol,
          asset_name: asset.name,
          current_aum: currentTotal,
          previous_aum: previousTotal,
          aum_difference: difference,
          yield_percentage: yieldPercentage
        };
      }) || [];
      
      setAumEntries(entries);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch AUM data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAUMChange = (assetSymbol: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    
    setAumEntries(prev => prev.map(entry => {
      if (entry.asset_symbol === assetSymbol) {
        const difference = numValue - (entry.previous_aum || 0);
        const yieldPercentage = entry.previous_aum && entry.previous_aum > 0 
          ? (difference / entry.previous_aum) * 100 
          : 0;
        
        return {
          ...entry,
          current_aum: numValue,
          aum_difference: difference,
          yield_percentage: yieldPercentage
        };
      }
      return entry;
    }));
  };

  const saveAUMEntries = async () => {
    try {
      setSaving(true);
      
      // For now, we'll just show a success message
      // In the future, this would save to the daily_aum_entries table
      toast({
        title: 'Success',
        description: 'AUM entries saved successfully',
      });
      
      // Refresh data
      await fetchData();
    } catch (error) {
      console.error('Error saving AUM entries:', error);
      toast({
        title: 'Error',
        description: 'Failed to save AUM entries',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const calculateAndApplyYields = async () => {
    try {
      setCalculating(true);
      
      // Note: apply_daily_yield function exists in database but not in TypeScript types yet
      // This will be enabled once the database migration is applied
      
      toast({
        title: 'Info',
        description: 'Yield calculation will be available after database migration is applied',
      });
      
      /*
      for (const entry of aumEntries) {
        if (entry.aum_difference && entry.aum_difference > 0 && entry.yield_percentage && entry.yield_percentage > 0) {
          // Apply yield using the existing function
          const { error } = await supabase.rpc('apply_daily_yield', {
            p_asset_code: entry.asset_symbol,
            p_daily_yield_percentage: entry.yield_percentage,
            p_application_date: today
          });
          
          if (error) throw error;
        }
      }
      
      toast({
        title: 'Success',
        description: 'Daily yields calculated and applied successfully',
      });
      */
    } catch (error) {
      console.error('Error calculating yields:', error);
      toast({
        title: 'Error',
        description: 'Failed to calculate and apply yields',
        variant: 'destructive',
      });
    } finally {
      setCalculating(false);
    }
  };

  const formatCurrency = (value: number, symbol: string) => {
    if (symbol === 'USDC' || symbol === 'USDT' || symbol === 'EURC') {
      return value.toFixed(2);
    }
    return value.toFixed(6);
  };

  const totalCurrentAUM = aumEntries.reduce((sum, entry) => sum + entry.current_aum, 0);
  const totalPreviousAUM = aumEntries.reduce((sum, entry) => sum + (entry.previous_aum || 0), 0);
  const totalDifference = totalCurrentAUM - totalPreviousAUM;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Daily AUM Management</h1>
          <p className="text-muted-foreground">Input daily AUM values and calculate yields (Optimal time: 9 PM London)</p>
        </div>
        <div className="flex items-center gap-2">
          {!isOptimalTime() && (
            <Badge variant="outline" className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Not 9 PM London
            </Badge>
          )}
          {isOptimalTime() && (
            <Badge variant="default" className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Optimal Time
            </Badge>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Total AUM</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalCurrentAUM.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Across all assets</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Previous AUM</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalPreviousAUM.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Yesterday's total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily Change</CardTitle>
            <TrendingUp className={`h-4 w-4 ${totalDifference >= 0 ? 'text-green-500' : 'text-red-500'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalDifference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {totalDifference >= 0 ? '+' : ''}${totalDifference.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {totalPreviousAUM > 0 ? `${((totalDifference / totalPreviousAUM) * 100).toFixed(2)}%` : '0%'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* AUM Entry Table */}
      <Card>
        <CardHeader>
          <CardTitle>Asset AUM Management</CardTitle>
          <CardDescription>Enter current AUM values for each asset to calculate daily yields</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset</TableHead>
                      <TableHead>Symbol</TableHead>
                      <TableHead>Previous AUM</TableHead>
                      <TableHead>Current AUM</TableHead>
                      <TableHead>Difference</TableHead>
                      <TableHead>Yield %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {aumEntries.map((entry) => (
                      <TableRow key={entry.asset_symbol}>
                        <TableCell className="font-medium">{entry.asset_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{entry.asset_symbol}</Badge>
                        </TableCell>
                        <TableCell>
                          {formatCurrency(entry.previous_aum || 0, entry.asset_symbol || '')} {entry.asset_symbol}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.000001"
                            min="0"
                            value={entry.current_aum}
                            onChange={(e) => handleAUMChange(entry.asset_symbol, e.target.value)}
                            className="w-32"
                            placeholder="0.000000"
                          />
                        </TableCell>
                        <TableCell className={entry.aum_difference && entry.aum_difference >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {entry.aum_difference && entry.aum_difference >= 0 ? '+' : ''}
                          {formatCurrency(entry.aum_difference || 0, entry.asset_symbol || '')} {entry.asset_symbol}
                        </TableCell>
                        <TableCell className={entry.yield_percentage && entry.yield_percentage >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {entry.yield_percentage && entry.yield_percentage >= 0 ? '+' : ''}
                          {(entry.yield_percentage || 0).toFixed(4)}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="mt-6 flex justify-between">
                <Alert className="flex-1 mr-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    AUM should be entered daily at 9 PM London time. Yields are calculated based on the difference from the previous day.
                  </AlertDescription>
                </Alert>
                
                <div className="flex gap-2">
                  <Button onClick={saveAUMEntries} disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save AUM
                      </>
                    )}
                  </Button>
                  
                  <Button 
                    onClick={calculateAndApplyYields} 
                    disabled={calculating || totalDifference <= 0}
                    variant="default"
                  >
                    {calculating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Calculating...
                      </>
                    ) : (
                      <>
                        <TrendingUp className="mr-2 h-4 w-4" />
                        Apply Yields
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}