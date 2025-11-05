import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Save, TrendingUp, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Fund {
  id: string;
  name: string;
  code: string;
  fund_class: string;
  is_active: boolean;
}

interface FundAUMEntry {
  fund_id: string;
  fund_name: string;
  fund_code: string;
  fund_class: string;
  previous_aum: number;
  current_positions_total: number;
  new_aum: number;
  yield_percentage: number;
  investor_count: number;
  has_input: boolean;
}

export default function DailyAUMManagement() {
  const [funds, setFunds] = useState<Fund[]>([]);
  const [aumEntries, setAumEntries] = useState<FundAUMEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(false);
  const [showApplyDialog, setShowApplyDialog] = useState(false);
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

      // 1. Fetch all active funds
      const { data: fundsData, error: fundsError } = await supabase
        .from('funds')
        .select('id, name, code, fund_class, is_active')
        .eq('is_active', true)
        .order('name');

      if (fundsError) throw fundsError;

      if (!fundsData || fundsData.length === 0) {
        toast({
          title: 'No Active Funds',
          description: 'No active funds found in the system',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      setFunds(fundsData);

      // 2. Fetch yesterday's AUM for each fund
      const { data: previousAumData, error: previousError } = await supabase
        .from('fund_daily_aum')
        .select('fund_id, total_aum, investor_count')
        .eq('aum_date', yesterday);

      if (previousError && previousError.code !== 'PGRST116') { // Ignore "no rows" error
        console.error('Error fetching previous AUM:', previousError);
      }

      // 3. Calculate current positions total for each fund
      const { data: positionsData, error: positionsError } = await supabase
        .from('investor_positions')
        .select('fund_id, current_value');

      if (positionsError) {
        console.error('Error fetching positions:', positionsError);
      }

      // 4. Build AUM entries
      const entries: FundAUMEntry[] = fundsData.map(fund => {
        // Find previous day's AUM
        const previousRecord = previousAumData?.find(p => p.fund_id === fund.id);
        const previousAum = previousRecord?.total_aum || 0;
        const previousInvestorCount = previousRecord?.investor_count || 0;

        // Calculate current positions total
        const fundPositions = positionsData?.filter(p => p.fund_id === fund.id) || [];
        const currentTotal = fundPositions.reduce((sum, pos) => sum + (pos.current_value || 0), 0);

        // Count unique investors
        const investorCount = fundPositions.length;

        return {
          fund_id: fund.id,
          fund_name: fund.name,
          fund_code: fund.code,
          fund_class: fund.fund_class,
          previous_aum: previousAum,
          current_positions_total: currentTotal,
          new_aum: currentTotal, // Default to current total
          yield_percentage: 0,
          investor_count: investorCount || previousInvestorCount,
          has_input: false,
        };
      });

      setAumEntries(entries);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: `Failed to fetch fund data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAUMChange = (fundId: string, value: string) => {
    const numValue = parseFloat(value);

    // Allow empty input
    if (value === '') {
      setAumEntries(prev => prev.map(entry => {
        if (entry.fund_id === fundId) {
          return {
            ...entry,
            new_aum: 0,
            yield_percentage: 0,
            has_input: false,
          };
        }
        return entry;
      }));
      return;
    }

    // Validate number
    if (isNaN(numValue) || numValue < 0) {
      return;
    }

    setAumEntries(prev => prev.map(entry => {
      if (entry.fund_id === fundId) {
        const difference = numValue - entry.previous_aum;
        const yieldPercentage = entry.previous_aum > 0
          ? (difference / entry.previous_aum) * 100
          : 0;

        return {
          ...entry,
          new_aum: numValue,
          yield_percentage: yieldPercentage,
          has_input: true,
        };
      }
      return entry;
    }));
  };

  const saveAUMEntries = async () => {
    try {
      setSaving(true);

      // Filter entries that have input
      const entriesToSave = aumEntries.filter(entry => entry.has_input);

      if (entriesToSave.length === 0) {
        toast({
          title: 'No Data to Save',
          description: 'Please enter AUM values for at least one fund',
          variant: 'destructive',
        });
        return;
      }

      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      // Save each fund's AUM
      for (const entry of entriesToSave) {
        try {
          const { error } = await supabase.rpc('set_fund_daily_aum', {
            p_fund_id: entry.fund_id,
            p_aum_amount: entry.new_aum,
            p_aum_date: today,
          });

          if (error) {
            errorCount++;
            errors.push(`${entry.fund_name}: ${error.message}`);
            console.error(`Error saving AUM for ${entry.fund_name}:`, error);
          } else {
            successCount++;
          }
        } catch (err) {
          errorCount++;
          const errorMsg = err instanceof Error ? err.message : 'Unknown error';
          errors.push(`${entry.fund_name}: ${errorMsg}`);
          console.error(`Exception saving AUM for ${entry.fund_name}:`, err);
        }
      }

      // Show results
      if (successCount > 0 && errorCount === 0) {
        toast({
          title: 'Success',
          description: `AUM saved successfully for ${successCount} fund${successCount > 1 ? 's' : ''}`,
        });
        // Refresh data
        await fetchData();
      } else if (successCount > 0 && errorCount > 0) {
        toast({
          title: 'Partial Success',
          description: `Saved ${successCount} fund${successCount > 1 ? 's' : ''}, but ${errorCount} failed. Check console for details.`,
          variant: 'destructive',
        });
        console.error('Save errors:', errors);
      } else {
        toast({
          title: 'Error',
          description: `Failed to save AUM for all funds. ${errors[0] || 'Unknown error'}`,
          variant: 'destructive',
        });
        console.error('All save errors:', errors);
      }
    } catch (error) {
      console.error('Error in saveAUMEntries:', error);
      toast({
        title: 'Error',
        description: `Failed to save AUM entries: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const calculateAndApplyYields = async () => {
    try {
      setApplying(true);
      setShowApplyDialog(false);

      // Filter funds with positive yields that have been saved
      const fundsWithYield = aumEntries.filter(
        entry => entry.has_input && entry.yield_percentage > 0
      );

      if (fundsWithYield.length === 0) {
        toast({
          title: 'No Yields to Apply',
          description: 'No funds have positive yields to apply',
          variant: 'destructive',
        });
        return;
      }

      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      // Apply yields for each fund
      for (const entry of fundsWithYield) {
        try {
          const { error } = await supabase.rpc('apply_daily_yield_to_fund', {
            p_fund_id: entry.fund_id,
            p_daily_yield_percentage: entry.yield_percentage,
            p_application_date: today,
          });

          if (error) {
            errorCount++;
            errors.push(`${entry.fund_name}: ${error.message}`);
            console.error(`Error applying yield for ${entry.fund_name}:`, error);
          } else {
            successCount++;
          }
        } catch (err) {
          errorCount++;
          const errorMsg = err instanceof Error ? err.message : 'Unknown error';
          errors.push(`${entry.fund_name}: ${errorMsg}`);
          console.error(`Exception applying yield for ${entry.fund_name}:`, err);
        }
      }

      // Show results
      if (successCount > 0 && errorCount === 0) {
        toast({
          title: 'Success',
          description: `Daily yields applied successfully to ${successCount} fund${successCount > 1 ? 's' : ''}. All investor positions updated.`,
        });
        // Refresh data to show updated positions
        await fetchData();
      } else if (successCount > 0 && errorCount > 0) {
        toast({
          title: 'Partial Success',
          description: `Applied yields to ${successCount} fund${successCount > 1 ? 's' : ''}, but ${errorCount} failed. Check console for details.`,
          variant: 'destructive',
        });
        console.error('Apply yield errors:', errors);
      } else {
        toast({
          title: 'Error',
          description: `Failed to apply yields for all funds. ${errors[0] || 'Unknown error'}`,
          variant: 'destructive',
        });
        console.error('All apply yield errors:', errors);
      }
    } catch (error) {
      console.error('Error in calculateAndApplyYields:', error);
      toast({
        title: 'Error',
        description: `Failed to apply yields: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    } finally {
      setApplying(false);
    }
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const totalPreviousAUM = aumEntries.reduce((sum, entry) => sum + entry.previous_aum, 0);
  const totalCurrentPositions = aumEntries.reduce((sum, entry) => sum + entry.current_positions_total, 0);
  const totalNewAUM = aumEntries.reduce((sum, entry) => sum + (entry.has_input ? entry.new_aum : entry.current_positions_total), 0);
  const totalDifference = totalNewAUM - totalPreviousAUM;
  const totalYieldPercentage = totalPreviousAUM > 0 ? (totalDifference / totalPreviousAUM) * 100 : 0;
  const totalInvestors = aumEntries.reduce((sum, entry) => sum + entry.investor_count, 0);
  const fundsWithPositiveYield = aumEntries.filter(e => e.has_input && e.yield_percentage > 0).length;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Daily AUM Management</h1>
          <p className="text-muted-foreground">Input daily AUM values per fund and apply yields (Optimal time: 9 PM London)</p>
        </div>
        <div className="flex items-center gap-2">
          {!isOptimalTime() && (
            <Badge variant="outline" className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Not 9 PM London
            </Badge>
          )}
          {isOptimalTime() && (
            <Badge variant="default" className="flex items-center gap-1 bg-green-600">
              <Clock className="h-3 w-3" />
              Optimal Time
            </Badge>
          )}
          <Badge variant="secondary">
            {today}
          </Badge>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Previous AUM</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${formatCurrency(totalPreviousAUM)}</div>
            <p className="text-xs text-muted-foreground">{yesterday}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Positions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${formatCurrency(totalCurrentPositions)}</div>
            <p className="text-xs text-muted-foreground">Sum of investor positions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily Change</CardTitle>
            <TrendingUp className={`h-4 w-4 ${totalDifference >= 0 ? 'text-green-500' : 'text-red-500'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalDifference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {totalDifference >= 0 ? '+' : ''}${formatCurrency(totalDifference)}
            </div>
            <p className={`text-xs ${totalYieldPercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {totalYieldPercentage >= 0 ? '+' : ''}{totalYieldPercentage.toFixed(4)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Investors</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalInvestors}</div>
            <p className="text-xs text-muted-foreground">Across {funds.length} active funds</p>
          </CardContent>
        </Card>
      </div>

      {/* AUM Entry Table */}
      <Card>
        <CardHeader>
          <CardTitle>Fund AUM Management</CardTitle>
          <CardDescription>
            Enter today's AUM for each fund. Yield will be calculated automatically based on previous day's AUM.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : aumEntries.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No active funds found. Please add funds to the system first.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fund Name</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead className="text-right">Previous AUM</TableHead>
                      <TableHead className="text-right">Current Positions</TableHead>
                      <TableHead className="text-right">New AUM (Input)</TableHead>
                      <TableHead className="text-right">Yield %</TableHead>
                      <TableHead className="text-center">Investors</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {aumEntries.map((entry) => (
                      <TableRow key={entry.fund_id}>
                        <TableCell className="font-medium">{entry.fund_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{entry.fund_code}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{entry.fund_class}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          ${formatCurrency(entry.previous_aum)}
                        </TableCell>
                        <TableCell className="text-right">
                          ${formatCurrency(entry.current_positions_total)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={entry.has_input ? entry.new_aum : ''}
                            onChange={(e) => handleAUMChange(entry.fund_id, e.target.value)}
                            className="w-40 text-right"
                            placeholder={formatCurrency(entry.current_positions_total)}
                          />
                        </TableCell>
                        <TableCell className={`text-right font-medium ${
                          entry.yield_percentage >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {entry.has_input && (
                            <>
                              {entry.yield_percentage >= 0 ? '+' : ''}
                              {entry.yield_percentage.toFixed(4)}%
                            </>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">{entry.investor_count}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="mt-6 space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Instructions:</strong> Enter today's AUM for each fund. The system will calculate yield percentages automatically.
                    Save the AUM values first, then click "Apply Yields" to update all investor positions. This operation is irreversible.
                  </AlertDescription>
                </Alert>

                <div className="flex justify-end gap-2">
                  <Button
                    onClick={saveAUMEntries}
                    disabled={saving || aumEntries.every(e => !e.has_input)}
                    size="lg"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save AUM Entries
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={() => setShowApplyDialog(true)}
                    disabled={applying || fundsWithPositiveYield === 0}
                    variant="default"
                    size="lg"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {applying ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Applying...
                      </>
                    ) : (
                      <>
                        <TrendingUp className="mr-2 h-4 w-4" />
                        Apply Yields ({fundsWithPositiveYield})
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={showApplyDialog} onOpenChange={setShowApplyDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apply Daily Yields?</AlertDialogTitle>
            <AlertDialogDescription>
              This will apply the calculated yield percentages to all investor positions in {fundsWithPositiveYield} fund
              {fundsWithPositiveYield > 1 ? 's' : ''}. This operation cannot be undone.

              <div className="mt-4 p-4 bg-muted rounded-md space-y-2">
                <div className="font-semibold">Summary:</div>
                {aumEntries
                  .filter(e => e.has_input && e.yield_percentage > 0)
                  .map(entry => (
                    <div key={entry.fund_id} className="flex justify-between text-sm">
                      <span>{entry.fund_name}:</span>
                      <span className="text-green-600 font-medium">+{entry.yield_percentage.toFixed(4)}%</span>
                    </div>
                  ))}
              </div>

              <div className="mt-4 text-sm text-destructive font-medium">
                Warning: Make sure you have saved the AUM entries before applying yields.
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={calculateAndApplyYields} className="bg-green-600 hover:bg-green-700">
              Confirm Apply Yields
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
