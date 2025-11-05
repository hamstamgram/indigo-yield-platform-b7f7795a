import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Calendar, Save, Download, Upload, AlertCircle, TrendingUp, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface MonthlyDataEntry {
  id?: string;
  investor_id: string;
  investor_name: string;
  report_month: string;
  asset_code: string;
  opening_balance: string;
  additions: string;
  withdrawals: string;
  yield_earned: string;
  closing_balance: string;
  entry_date?: string;
  exit_date?: string;
}

export default function MonthlyDataEntry() {
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().slice(0, 7) // YYYY-MM format
  );
  const [selectedAsset, setSelectedAsset] = useState<string>('BTC');
  const [editingData, setEditingData] = useState<Record<string, MonthlyDataEntry>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const assets = ['BTC', 'ETH', 'SOL', 'USDT', 'USDC', 'EURC'];

  // Fetch all investors
  const { data: investors } = useQuery({
    queryKey: ['all-investors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('investors')
        .select(`
          id,
          profiles:profile_id(full_name, email)
        `)
        .order('created_at');

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch existing monthly data for selected month/asset
  const { data: monthlyData, isLoading, refetch } = useQuery({
    queryKey: ['monthly-data', selectedMonth, selectedAsset],
    queryFn: async () => {
      const reportMonth = `${selectedMonth}-01`; // Convert YYYY-MM to YYYY-MM-01

      const { data, error } = await supabase
        .from('investor_monthly_reports')
        .select(`
          *,
          investors!inner(
            id,
            profiles:profile_id(full_name, email)
          )
        `)
        .eq('report_month', reportMonth)
        .eq('asset_code', selectedAsset);

      if (error) throw error;

      // Transform data to include investor names
      return (data || []).map(record => ({
        ...record,
        investor_name: record.investors?.profiles?.full_name || record.investors?.profiles?.email || 'Unknown'
      }));
    },
  });

  // Initialize editing data when monthlyData changes
  useEffect(() => {
    if (monthlyData) {
      const dataMap: Record<string, MonthlyDataEntry> = {};
      monthlyData.forEach(record => {
        dataMap[record.investor_id] = {
          id: record.id,
          investor_id: record.investor_id,
          investor_name: record.investor_name,
          report_month: record.report_month,
          asset_code: record.asset_code,
          opening_balance: record.opening_balance?.toString() || '0',
          additions: record.additions?.toString() || '0',
          withdrawals: record.withdrawals?.toString() || '0',
          yield_earned: record.yield_earned?.toString() || '0',
          closing_balance: record.closing_balance?.toString() || '0',
          entry_date: record.entry_date,
          exit_date: record.exit_date,
        };
      });
      setEditingData(dataMap);
      setHasUnsavedChanges(false);
    } else if (investors) {
      // Initialize empty records for all investors
      const dataMap: Record<string, MonthlyDataEntry> = {};
      investors.forEach(investor => {
        dataMap[investor.id] = {
          investor_id: investor.id,
          investor_name: investor.profiles?.full_name || investor.profiles?.email || 'Unknown',
          report_month: `${selectedMonth}-01`,
          asset_code: selectedAsset,
          opening_balance: '0',
          additions: '0',
          withdrawals: '0',
          yield_earned: '0',
          closing_balance: '0',
        };
      });
      setEditingData(dataMap);
      setHasUnsavedChanges(false);
    }
  }, [monthlyData, investors, selectedMonth, selectedAsset]);

  // Auto-calculate closing balance
  const calculateClosingBalance = (opening: string, additions: string, withdrawals: string, yield_earned: string) => {
    const openingNum = parseFloat(opening) || 0;
    const additionsNum = parseFloat(additions) || 0;
    const withdrawalsNum = parseFloat(withdrawals) || 0;
    const yieldNum = parseFloat(yield_earned) || 0;
    return (openingNum + additionsNum - withdrawalsNum + yieldNum).toFixed(10);
  };

  // Handle field changes
  const handleFieldChange = (investorId: string, field: keyof MonthlyDataEntry, value: string) => {
    setEditingData(prev => {
      const updated = { ...prev };
      const record = { ...updated[investorId] };
      record[field] = value as any;

      // Auto-calculate closing balance when relevant fields change
      if (['opening_balance', 'additions', 'withdrawals', 'yield_earned'].includes(field)) {
        record.closing_balance = calculateClosingBalance(
          record.opening_balance,
          record.additions,
          record.withdrawals,
          record.yield_earned
        );
      }

      updated[investorId] = record;
      return updated;
    });
    setHasUnsavedChanges(true);
  };

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const recordsToUpsert = Object.values(editingData).map(record => ({
        id: record.id,
        investor_id: record.investor_id,
        report_month: record.report_month,
        asset_code: record.asset_code,
        opening_balance: parseFloat(record.opening_balance),
        closing_balance: parseFloat(record.closing_balance),
        additions: parseFloat(record.additions),
        withdrawals: parseFloat(record.withdrawals),
        yield_earned: parseFloat(record.yield_earned),
        entry_date: record.entry_date || null,
        exit_date: record.exit_date || null,
        edited_by: user.id,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('investor_monthly_reports')
        .upsert(recordsToUpsert, {
          onConflict: 'investor_id,report_month,asset_code',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Monthly data saved successfully');
      setHasUnsavedChanges(false);
      queryClient.invalidateQueries({ queryKey: ['monthly-data'] });
      refetch();
    },
    onError: (error: any) => {
      console.error('Error saving monthly data:', error);
      toast.error(error.message || 'Failed to save monthly data');
    },
  });

  // Calculate totals
  const totals = Object.values(editingData).reduce(
    (acc, record) => ({
      opening: acc.opening + (parseFloat(record.opening_balance) || 0),
      additions: acc.additions + (parseFloat(record.additions) || 0),
      withdrawals: acc.withdrawals + (parseFloat(record.withdrawals) || 0),
      yield: acc.yield + (parseFloat(record.yield_earned) || 0),
      closing: acc.closing + (parseFloat(record.closing_balance) || 0),
    }),
    { opening: 0, additions: 0, withdrawals: 0, yield: 0, closing: 0 }
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Calendar className="h-8 w-8 text-primary" />
          Monthly Data Entry
        </h1>
        <p className="text-muted-foreground">
          Enter monthly investor data for report generation
        </p>
      </div>

      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          This interface replaces daily AUM management. Enter monthly data manually from your records.
          Closing Balance is auto-calculated: Opening + Additions - Withdrawals + Yield.
        </AlertDescription>
      </Alert>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Select Month and Asset</CardTitle>
          <CardDescription>Choose the reporting period and asset to enter data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Month Selector */}
            <div>
              <Label htmlFor="month">Report Month</Label>
              <Input
                id="month"
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="mt-1"
              />
            </div>

            {/* Asset Selector */}
            <div>
              <Label htmlFor="asset">Asset</Label>
              <Select value={selectedAsset} onValueChange={setSelectedAsset}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {assets.map((asset) => (
                    <SelectItem key={asset} value={asset}>
                      {asset} {asset === 'BTC' ? 'YIELD FUND' : asset === 'ETH' ? 'YIELD FUND' : asset === 'SOL' ? 'YIELD FUND' : 'FUND'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Actions */}
            <div className="flex items-end gap-2">
              <Button
                variant="outline"
                className="flex-1"
                disabled
              >
                <Upload className="h-4 w-4 mr-2" />
                Import CSV
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                disabled
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Opening Balance</div>
            <div className="text-xl font-bold">{totals.opening.toFixed(8)} {selectedAsset}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Additions</div>
            <div className="text-xl font-bold text-green-600">+{totals.additions.toFixed(8)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Withdrawals</div>
            <div className="text-xl font-bold text-red-600">-{totals.withdrawals.toFixed(8)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Yield Earned</div>
            <div className="text-xl font-bold text-blue-600">+{totals.yield.toFixed(8)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Closing Balance</div>
            <div className="text-xl font-bold">{totals.closing.toFixed(8)} {selectedAsset}</div>
          </CardContent>
        </Card>
      </div>

      {/* Data Entry Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Investor Data - {selectedMonth} - {selectedAsset}</CardTitle>
              <CardDescription>
                {Object.keys(editingData).length} investors • {hasUnsavedChanges ? 'Unsaved changes' : 'All changes saved'}
              </CardDescription>
            </div>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!hasUnsavedChanges || saveMutation.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              {saveMutation.isPending ? 'Saving...' : 'Save All Changes'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Investor</TableHead>
                    <TableHead className="text-right">Opening Balance</TableHead>
                    <TableHead className="text-right">Additions</TableHead>
                    <TableHead className="text-right">Withdrawals</TableHead>
                    <TableHead className="text-right">Yield Earned</TableHead>
                    <TableHead className="text-right">Closing Balance</TableHead>
                    <TableHead className="text-center">Entry Date</TableHead>
                    <TableHead className="text-center">Exit Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.values(editingData).map((record) => (
                    <TableRow key={record.investor_id}>
                      <TableCell className="font-medium">{record.investor_name}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.00000001"
                          value={record.opening_balance}
                          onChange={(e) => handleFieldChange(record.investor_id, 'opening_balance', e.target.value)}
                          className="text-right"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.00000001"
                          value={record.additions}
                          onChange={(e) => handleFieldChange(record.investor_id, 'additions', e.target.value)}
                          className="text-right text-green-600"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.00000001"
                          value={record.withdrawals}
                          onChange={(e) => handleFieldChange(record.investor_id, 'withdrawals', e.target.value)}
                          className="text-right text-red-600"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.00000001"
                          value={record.yield_earned}
                          onChange={(e) => handleFieldChange(record.investor_id, 'yield_earned', e.target.value)}
                          className="text-right text-blue-600"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.00000001"
                          value={record.closing_balance}
                          disabled
                          className="text-right font-bold bg-muted"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="date"
                          value={record.entry_date || ''}
                          onChange={(e) => handleFieldChange(record.investor_id, 'entry_date', e.target.value)}
                          className="text-center text-sm"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="date"
                          value={record.exit_date || ''}
                          onChange={(e) => handleFieldChange(record.investor_id, 'exit_date', e.target.value)}
                          className="text-center text-sm"
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

      {/* Unsaved Changes Warning */}
      {hasUnsavedChanges && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You have unsaved changes. Click "Save All Changes" to persist your data.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
