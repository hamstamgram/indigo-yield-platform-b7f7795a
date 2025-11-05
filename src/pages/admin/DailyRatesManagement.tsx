import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { TrendingUp, TrendingDown, Calendar, Save, Send, AlertCircle, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format } from 'date-fns';

interface DailyRate {
  id?: string;
  rate_date: string;
  btc_rate: string;
  eth_rate: string;
  sol_rate: string;
  usdt_rate: string;
  usdc_rate: string;
  eurc_rate: string;
  notes?: string;
  created_by?: string;
}

export default function DailyRatesManagement() {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0] // YYYY-MM-DD format
  );
  const [editingRates, setEditingRates] = useState<DailyRate>({
    rate_date: selectedDate,
    btc_rate: '0',
    eth_rate: '0',
    sol_rate: '0',
    usdt_rate: '1.00', // Stablecoins default to 1
    usdc_rate: '1.00',
    eurc_rate: '1.00',
    notes: '',
  });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const assets = [
    { code: 'BTC', name: 'Bitcoin', color: 'orange' },
    { code: 'ETH', name: 'Ethereum', color: 'blue' },
    { code: 'SOL', name: 'Solana', color: 'purple' },
    { code: 'USDT', name: 'Tether', color: 'green', stablecoin: true },
    { code: 'USDC', name: 'USD Coin', color: 'blue', stablecoin: true },
    { code: 'EURC', name: 'Euro Coin', color: 'blue', stablecoin: true },
  ];

  // Fetch existing rate for selected date
  const { data: existingRate, isLoading } = useQuery({
    queryKey: ['daily-rate', selectedDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_rates')
        .select('*')
        .eq('rate_date', selectedDate)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
  });

  // Fetch last 7 days of rates for history
  const { data: recentRates } = useQuery({
    queryKey: ['recent-daily-rates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_rates')
        .select('*')
        .order('rate_date', { ascending: false })
        .limit(7);

      if (error) throw error;
      return data || [];
    },
  });

  // Initialize editing rates when existing rate changes
  useEffect(() => {
    if (existingRate) {
      setEditingRates({
        id: existingRate.id,
        rate_date: existingRate.rate_date,
        btc_rate: existingRate.btc_rate?.toString() || '0',
        eth_rate: existingRate.eth_rate?.toString() || '0',
        sol_rate: existingRate.sol_rate?.toString() || '0',
        usdt_rate: existingRate.usdt_rate?.toString() || '1.00',
        usdc_rate: existingRate.usdc_rate?.toString() || '1.00',
        eurc_rate: existingRate.eurc_rate?.toString() || '1.00',
        notes: existingRate.notes || '',
      });
      setHasUnsavedChanges(false);
    } else {
      setEditingRates({
        rate_date: selectedDate,
        btc_rate: '0',
        eth_rate: '0',
        sol_rate: '0',
        usdt_rate: '1.00',
        usdc_rate: '1.00',
        eurc_rate: '1.00',
        notes: '',
      });
      setHasUnsavedChanges(false);
    }
  }, [existingRate, selectedDate]);

  // Update date when selectedDate changes
  useEffect(() => {
    setEditingRates(prev => ({ ...prev, rate_date: selectedDate }));
  }, [selectedDate]);

  // Handle field changes
  const handleRateChange = (field: keyof DailyRate, value: string) => {
    setEditingRates(prev => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
  };

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const rateData = {
        rate_date: editingRates.rate_date,
        btc_rate: parseFloat(editingRates.btc_rate),
        eth_rate: parseFloat(editingRates.eth_rate),
        sol_rate: parseFloat(editingRates.sol_rate),
        usdt_rate: parseFloat(editingRates.usdt_rate),
        usdc_rate: parseFloat(editingRates.usdc_rate),
        eurc_rate: parseFloat(editingRates.eurc_rate),
        notes: editingRates.notes || null,
        created_by: user.id,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('daily_rates')
        .upsert(rateData, {
          onConflict: 'rate_date',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Daily rates saved successfully');
      setHasUnsavedChanges(false);
      queryClient.invalidateQueries({ queryKey: ['daily-rate'] });
      queryClient.invalidateQueries({ queryKey: ['recent-daily-rates'] });
    },
    onError: (error: any) => {
      console.error('Error saving daily rates:', error);
      toast.error(error.message || 'Failed to save daily rates');
    },
  });

  // Send notification mutation
  const sendNotificationMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      // Call the database function to send notifications
      const { data, error } = await supabase.rpc('send_daily_rate_notifications', {
        p_rate_date: editingRates.rate_date,
        p_btc_rate: parseFloat(editingRates.btc_rate),
        p_eth_rate: parseFloat(editingRates.eth_rate),
        p_sol_rate: parseFloat(editingRates.sol_rate),
        p_usdt_rate: parseFloat(editingRates.usdt_rate),
        p_usdc_rate: parseFloat(editingRates.usdc_rate),
        p_eurc_rate: parseFloat(editingRates.eurc_rate),
        p_notes: editingRates.notes || null,
      });

      if (error) throw error;

      return data;
    },
    onSuccess: (data: any) => {
      const count = data?.[0]?.notifications_sent || 0;
      toast.success(`Daily rates sent to ${count} investors via notification`);
    },
    onError: (error: any) => {
      console.error('Error sending notification:', error);
      toast.error(error.message || 'Failed to send notification');
    },
  });

  // Calculate daily change percentage
  const calculateChange = (currentRate: string, previousRate?: string) => {
    if (!previousRate) return null;
    const current = parseFloat(currentRate);
    const previous = parseFloat(previousRate);
    if (previous === 0) return null;
    const change = ((current - previous) / previous) * 100;
    return change;
  };

  // Get previous day's rate for comparison
  const previousDayRate = recentRates?.[1]; // Index 0 is today, 1 is yesterday

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <TrendingUp className="h-8 w-8 text-primary" />
          Daily Rates Management
        </h1>
        <p className="text-muted-foreground">
          Enter daily rates for each fund to send notifications to investors
        </p>
      </div>

      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Enter today's rates for all funds. Click "Save" to store, then "Send Notification" to alert all investors.
          Rates are sent daily via platform notifications and iOS push notifications.
        </AlertDescription>
      </Alert>

      {/* Date Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Select Date</CardTitle>
          <CardDescription>Choose the date for which to enter rates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label htmlFor="rate-date">Rate Date</Label>
              <Input
                id="rate-date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="mt-1"
              />
            </div>
            {existingRate && (
              <div className="flex-1">
                <Badge variant="secondary" className="mt-6">
                  Rates already entered for this date
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Rate Entry */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Daily Rates - {format(new Date(selectedDate), 'MMMM dd, yyyy')}</CardTitle>
              <CardDescription>
                {hasUnsavedChanges ? 'Unsaved changes' : 'All changes saved'}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={!hasUnsavedChanges || saveMutation.isPending}
              >
                <Save className="h-4 w-4 mr-2" />
                {saveMutation.isPending ? 'Saving...' : 'Save Rates'}
              </Button>
              <Button
                onClick={() => sendNotificationMutation.mutate()}
                disabled={hasUnsavedChanges || sendNotificationMutation.isPending || !existingRate}
                variant="default"
              >
                <Send className="h-4 w-4 mr-2" />
                {sendNotificationMutation.isPending ? 'Sending...' : 'Send Notification'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[150px]">Asset</TableHead>
                  <TableHead className="w-[200px]">Rate (USD)</TableHead>
                  <TableHead className="w-[150px]">24h Change</TableHead>
                  <TableHead className="w-[200px]">Previous Day</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.map((asset) => {
                  const fieldKey = `${asset.code.toLowerCase()}_rate` as keyof DailyRate;
                  const currentRate = editingRates[fieldKey] as string;
                  const previousRate = previousDayRate?.[fieldKey];
                  const change = calculateChange(currentRate, previousRate);

                  return (
                    <TableRow key={asset.code}>
                      <TableCell className="font-medium">
                        <div>
                          <div className="font-bold">{asset.code}</div>
                          <div className="text-sm text-muted-foreground">{asset.name}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">$</span>
                          <Input
                            type="number"
                            step={asset.stablecoin ? "0.01" : "0.01"}
                            value={currentRate}
                            onChange={(e) => handleRateChange(fieldKey, e.target.value)}
                            className="w-[150px]"
                            disabled={asset.stablecoin}
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        {change !== null && (
                          <div className={`flex items-center gap-1 ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {change >= 0 ? (
                              <TrendingUp className="h-4 w-4" />
                            ) : (
                              <TrendingDown className="h-4 w-4" />
                            )}
                            <span className="font-medium">{change >= 0 ? '+' : ''}{change.toFixed(2)}%</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground">
                          {previousRate ? `$${parseFloat(previousRate).toFixed(2)}` : 'N/A'}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {/* Notes */}
            <div>
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Input
                id="notes"
                value={editingRates.notes || ''}
                onChange={(e) => handleRateChange('notes', e.target.value)}
                placeholder="Add any notes about today's rates..."
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Rates History */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Rates (Last 7 Days)</CardTitle>
          <CardDescription>Historical daily rates for reference</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">BTC</TableHead>
                    <TableHead className="text-right">ETH</TableHead>
                    <TableHead className="text-right">SOL</TableHead>
                    <TableHead className="text-right">USDT</TableHead>
                    <TableHead className="text-right">USDC</TableHead>
                    <TableHead className="text-right">EURC</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentRates && recentRates.length > 0 ? (
                    recentRates.map((rate) => (
                      <TableRow key={rate.id}>
                        <TableCell className="font-medium">
                          {format(new Date(rate.rate_date), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell className="text-right">${parseFloat(rate.btc_rate).toFixed(2)}</TableCell>
                        <TableCell className="text-right">${parseFloat(rate.eth_rate).toFixed(2)}</TableCell>
                        <TableCell className="text-right">${parseFloat(rate.sol_rate).toFixed(2)}</TableCell>
                        <TableCell className="text-right">${parseFloat(rate.usdt_rate).toFixed(2)}</TableCell>
                        <TableCell className="text-right">${parseFloat(rate.usdc_rate).toFixed(2)}</TableCell>
                        <TableCell className="text-right">${parseFloat(rate.eurc_rate).toFixed(2)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No historical rates found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Unsaved Changes Warning */}
      {hasUnsavedChanges && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You have unsaved changes. Click "Save Rates" to persist your data before sending notifications.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
