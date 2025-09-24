import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { aumService } from '@/services/aumService';
import { feeService } from '@/services/feeService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { TrendingUp, DollarSign, Users, Calendar, Percent } from 'lucide-react';

interface FundWithAUM {
  id: string;
  code: string;
  name: string;
  asset: string;
  aum_amount: number;
  investor_count: number;
}

const FundYieldManagerV2 = () => {
  const [funds, setFunds] = useState<FundWithAUM[]>([]);
  const [selectedFund, setSelectedFund] = useState<string>('');
  const [yieldPercentage, setYieldPercentage] = useState<string>('');
  const [applicationDate, setApplicationDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [loading, setLoading] = useState(false);
  const [yieldHistory, setYieldHistory] = useState<any[]>([]);
  const [feePreview, setFeePreview] = useState<{
    grossYield: number;
    totalFees: number;
    netYield: number;
  } | null>(null);

  useEffect(() => {
    fetchFunds();
    fetchYieldHistory();
  }, []);

  const fetchFunds = async () => {
    try {
      const data = await aumService.getAllFundsWithAUM();
      setFunds(data);
      if (data.length > 0 && !selectedFund) {
        setSelectedFund(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching funds:', error);
      toast.error('Failed to load funds');
    }
  };

  const fetchYieldHistory = async () => {
    try {
      // Fetch recent yield applications from the database
      const { data, error } = await supabase
        .from('daily_yield_applications')
        .select('*')
        .order('application_date', { ascending: false })
        .limit(10);

      if (error) throw error;
      setYieldHistory(data || []);
    } catch (error) {
      console.error('Error fetching yield history:', error);
    }
  };

  const previewFees = async () => {
    if (!selectedFund || !yieldPercentage) return;

    const yieldValue = parseFloat(yieldPercentage);
    if (isNaN(yieldValue) || yieldValue <= 0) return;

    try {
      // Get fund AUM to estimate fees
      const fundData = await aumService.getFundAUMHistory(selectedFund);
      if (fundData.length === 0) return;

      const latestAUM = fundData[0].aum_amount;
      const grossYield = latestAUM * (yieldValue / 100);
      
      // Estimate average fee rate (2% default)
      const avgFeeRate = 0.02;
      const estimatedFees = grossYield * avgFeeRate;
      const netYield = grossYield - estimatedFees;

      setFeePreview({
        grossYield,
        totalFees: estimatedFees,
        netYield
      });
    } catch (error) {
      console.error('Error previewing fees:', error);
    }
  };

  const applyYield = async () => {
    if (!selectedFund || !yieldPercentage) {
      toast.error('Please select a fund and enter yield percentage');
      return;
    }

    const yieldValue = parseFloat(yieldPercentage);
    if (isNaN(yieldValue) || yieldValue <= 0) {
      toast.error('Please enter a valid yield percentage');
      return;
    }

    setLoading(true);
    try {
      // Use the new fee-aware function
      const result = await feeService.applyDailyYieldWithFees(
        selectedFund,
        yieldValue,
        applicationDate
      );

      if (result.success) {
        toast.success(
          `Yield applied successfully! ${result.investors_affected} investors affected.
          Gross: ${result.total_gross_yield?.toFixed(6)} | Fees: ${result.total_platform_fees?.toFixed(6)} | Net: ${result.total_net_yield?.toFixed(6)} ${result.asset_code}`
        );
        setYieldPercentage('');
        setFeePreview(null);
        fetchYieldHistory();
      } else {
        toast.error(result.error || 'Failed to apply yield');
      }
    } catch (error) {
      console.error('Error applying yield:', error);
      toast.error('Failed to apply yield');
    } finally {
      setLoading(false);
    }
  };

  const selectedFundData = funds.find(f => f.id === selectedFund);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Daily Yield Distribution with Fee Collection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Fund</label>
              <Select value={selectedFund} onValueChange={setSelectedFund}>
                <SelectTrigger>
                  <SelectValue placeholder="Select fund" />
                </SelectTrigger>
                <SelectContent>
                  {funds.map(fund => (
                    <SelectItem key={fund.id} value={fund.id}>
                      {fund.code} - {fund.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Application Date</label>
              <Input
                type="date"
                value={applicationDate}
                onChange={(e) => setApplicationDate(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Daily Yield %</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={yieldPercentage}
                onChange={(e) => {
                  setYieldPercentage(e.target.value);
                  previewFees();
                }}
                placeholder="e.g., 0.20"
              />
            </div>
          </div>

          {/* Fund Info */}
          {selectedFundData && (
            <div className="grid grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Fund AUM</p>
                <p className="text-lg font-semibold">{selectedFundData.aum_amount.toFixed(6)} {selectedFundData.asset}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Investors</p>
                <p className="text-lg font-semibold">{selectedFundData.investor_count}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Asset</p>
                <p className="text-lg font-semibold">{selectedFundData.asset}</p>
              </div>
            </div>
          )}

          {/* Fee Preview */}
          {feePreview && (
            <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Gross Yield</p>
                <p className="text-lg font-semibold">{feePreview.grossYield.toFixed(6)}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Platform Fees</p>
                <p className="text-lg font-semibold text-red-600">-{feePreview.totalFees.toFixed(6)}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Net to Investors</p>
                <p className="text-lg font-semibold text-green-600">{feePreview.netYield.toFixed(6)}</p>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={applyYield} disabled={loading || !selectedFund || !yieldPercentage}>
              {loading ? 'Applying...' : 'Apply Yield with Fee Collection'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Yield History */}
      {yieldHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Yield Applications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Date</th>
                    <th className="text-left p-2">Asset</th>
                    <th className="text-right p-2">Yield %</th>
                    <th className="text-right p-2">Total AUM</th>
                    <th className="text-right p-2">Yield Generated</th>
                    <th className="text-right p-2">Investors</th>
                  </tr>
                </thead>
                <tbody>
                  {yieldHistory.map((entry) => (
                    <tr key={entry.id} className="border-b hover:bg-muted/50">
                      <td className="p-2">{new Date(entry.application_date).toLocaleDateString()}</td>
                      <td className="p-2">{entry.asset_code}</td>
                      <td className="p-2 text-right">{entry.daily_yield_percentage}%</td>
                      <td className="p-2 text-right">{parseFloat(entry.total_aum).toFixed(6)}</td>
                      <td className="p-2 text-right">{parseFloat(entry.total_yield_generated).toFixed(6)}</td>
                      <td className="p-2 text-right">{entry.investors_affected}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FundYieldManagerV2;