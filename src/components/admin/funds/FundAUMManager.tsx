import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  setFundDailyAUM, 
  getFundAUMHistory, 
  getAllFundsWithAUM,
  updateInvestorAUMPercentages 
} from '@/services/aumService';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, TrendingUp, Users, DollarSign, RefreshCw } from 'lucide-react';
import { formatAssetValue } from '@/utils/kpiCalculations';

interface FundWithAUM {
  id: string;
  code: string;
  name: string;
  asset: string;
  fund_class: string;
  latest_aum: number;
  latest_aum_date?: string;
  investor_count: number;
}

export default function FundAUMManager() {
  const [funds, setFunds] = useState<FundWithAUM[]>([]);
  const [selectedFund, setSelectedFund] = useState<string>('');
  const [aumAmount, setAumAmount] = useState<string>('');
  const [aumDate, setAumDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdatingPercentages, setIsUpdatingPercentages] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchFunds();
  }, []);

  const fetchFunds = async () => {
    try {
      setIsLoading(true);
      const data = await getAllFundsWithAUM();
      setFunds(data);
      if (data.length > 0 && !selectedFund) {
        setSelectedFund(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching funds:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch funds data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetAUM = async () => {
    if (!selectedFund || !aumAmount) {
      toast({
        title: 'Validation Error',
        description: 'Please select a fund and enter an AUM amount',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsLoading(true);
      
      const result = await setFundDailyAUM(
        selectedFund, 
        parseFloat(aumAmount), 
        aumDate
      );
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to set AUM');
      }
      
      toast({
        title: '✅ AUM Updated',
        description: `Successfully set daily AUM for ${aumDate}`,
        duration: 5000
      });
      
      // Refresh funds data and reset form
      await fetchFunds();
      setAumAmount('');
      
    } catch (error: any) {
      console.error('Error setting AUM:', error);
      
      toast({
        title: '❌ Operation Failed',
        description: error.message || 'Failed to set daily AUM',
        variant: 'destructive',
        duration: 7000
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecalculatePercentages = async () => {
    if (!selectedFund) {
      toast({
        title: 'Validation Error',
        description: 'Please select a fund',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsUpdatingPercentages(true);
      
      const result = await updateInvestorAUMPercentages(selectedFund);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to update percentages');
      }
      
      toast({
        title: '✅ Percentages Updated',
        description: 'Successfully recalculated investor AUM percentages',
        duration: 5000
      });
      
    } catch (error: any) {
      console.error('Error updating percentages:', error);
      
      toast({
        title: '❌ Operation Failed',
        description: error.message || 'Failed to update AUM percentages',
        variant: 'destructive',
        duration: 7000
      });
    } finally {
      setIsUpdatingPercentages(false);
    }
  };

  const selectedFundData = funds.find(f => f.id === selectedFund);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
          Fund AUM Management
        </h2>
        <p className="text-muted-foreground">
          Set daily AUM values and manage investor allocations for each fund
        </p>
      </div>

      {/* Fund Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {funds.map((fund) => (
          <Card 
            key={fund.id}
            className={`cursor-pointer transition-colors ${
              selectedFund === fund.id ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => setSelectedFund(fund.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Badge variant="outline">{fund.code}</Badge>
                <Badge>{fund.asset}</Badge>
              </div>
              <h3 className="font-semibold text-sm mb-3">{fund.name}</h3>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    Current AUM
                  </span>
                  <span className="font-medium">
                    {formatAssetValue(fund.latest_aum, fund.asset)} {fund.asset}
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    Investors
                  </span>
                  <span className="font-medium">{fund.investor_count}</span>
                </div>

                {fund.latest_aum_date && (
                  <div className="text-xs text-muted-foreground">
                    Last updated: {fund.latest_aum_date}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* AUM Management Panel */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Set Daily AUM
              </CardTitle>
              <CardDescription>
                Update the daily AUM value for the selected fund
              </CardDescription>
            </div>
            
            {selectedFundData && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRecalculatePercentages}
                disabled={isUpdatingPercentages}
              >
                {isUpdatingPercentages && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <RefreshCw className="h-4 w-4 mr-2" />
                Recalculate %
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fund-select">Select Fund</Label>
              <Select value={selectedFund} onValueChange={setSelectedFund}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a fund..." />
                </SelectTrigger>
                <SelectContent>
                  {funds.map((fund) => (
                    <SelectItem key={fund.id} value={fund.id}>
                      {fund.code} - {fund.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="aum-date">AUM Date</Label>
              <Input
                id="aum-date"
                type="date"
                value={aumDate}
                onChange={(e) => setAumDate(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="aum-amount">
                AUM Amount {selectedFundData ? `(${selectedFundData.asset})` : ''}
              </Label>
              <Input
                id="aum-amount"
                type="number"
                step="0.01"
                placeholder="Enter AUM amount..."
                value={aumAmount}
                onChange={(e) => setAumAmount(e.target.value)}
              />
            </div>
          </div>

          {selectedFundData && (
            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="font-semibold mb-3">Selected Fund Overview</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Fund:</span>
                  <span className="ml-2 font-medium">
                    {selectedFundData.code} - {selectedFundData.name}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Asset:</span>
                  <span className="ml-2 font-medium">{selectedFundData.asset}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Current AUM:</span>
                  <span className="ml-2 font-medium">
                    {formatAssetValue(selectedFundData.latest_aum, selectedFundData.asset)} {selectedFundData.asset}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Investors:</span>
                  <span className="ml-2 font-medium">{selectedFundData.investor_count}</span>
                </div>
              </div>
            </div>
          )}
          
          <Separator />
          
          <div className="flex justify-end">
            <Button 
              onClick={handleSetAUM}
              disabled={isLoading || !selectedFund || !aumAmount}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Set Daily AUM
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}