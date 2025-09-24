import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  applyDailyYieldToFund,
  getAllFundsWithAUM,
  getFundInvestorPositions,
} from '@/services/aumService';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, Percent, Users, DollarSign, Target } from 'lucide-react';
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

interface InvestorPosition {
  investor_id: string;
  current_value: number;
  aum_percentage: number;
  investor: {
    name: string;
    email: string;
  };
}

export default function FundYieldManager() {
  const [funds, setFunds] = useState<FundWithAUM[]>([]);
  const [selectedFund, setSelectedFund] = useState<string>('');
  const [yieldPercentage, setYieldPercentage] = useState<string>('');
  const [yieldDate, setYieldDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [investorPositions, setInvestorPositions] = useState<InvestorPosition[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchFunds();
  }, []);

  useEffect(() => {
    if (selectedFund) {
      fetchInvestorPositions();
    }
  }, [selectedFund]);

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

  const fetchInvestorPositions = async () => {
    if (!selectedFund) return;
    
    try {
      const positions = await getFundInvestorPositions(selectedFund);
      setInvestorPositions(positions);
    } catch (error) {
      console.error('Error fetching investor positions:', error);
    }
  };

  const handleApplyYield = async () => {
    if (!selectedFund || !yieldPercentage) {
      toast({
        title: 'Validation Error',
        description: 'Please select a fund and enter a yield percentage',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsApplying(true);
      
      const result = await applyDailyYieldToFund(
        selectedFund,
        parseFloat(yieldPercentage),
        yieldDate
      );
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to apply yield');
      }
      
      toast({
        title: '✅ Yield Applied',
        description: `Successfully distributed ${yieldPercentage}% yield to ${result.data?.investors_affected} investors`,
        duration: 5000
      });
      
      // Refresh data and reset form
      await fetchFunds();
      await fetchInvestorPositions();
      setYieldPercentage('');
      
    } catch (error: any) {
      console.error('Error applying yield:', error);
      
      toast({
        title: '❌ Operation Failed',
        description: error.message || 'Failed to apply daily yield',
        variant: 'destructive',
        duration: 7000
      });
    } finally {
      setIsApplying(false);
    }
  };

  const selectedFundData = funds.find(f => f.id === selectedFund);
  const estimatedYieldAmount = selectedFundData && yieldPercentage 
    ? selectedFundData.latest_aum * (parseFloat(yieldPercentage) / 100)
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
          Fund Yield Distribution
        </h2>
        <p className="text-muted-foreground">
          Apply daily yield distributions to fund investors based on their AUM percentage
        </p>
      </div>

      {/* Yield Application Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Percent className="h-5 w-5" />
            Apply Daily Yield
          </CardTitle>
          <CardDescription>
            Distribute yield to all investors in a fund based on their AUM allocation
          </CardDescription>
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
              <Label htmlFor="yield-date">Yield Date</Label>
              <Input
                id="yield-date"
                type="date"
                value={yieldDate}
                onChange={(e) => setYieldDate(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="yield-percentage">Daily Yield (%)</Label>
              <Input
                id="yield-percentage"
                type="number"
                step="0.01"
                placeholder="Enter yield %..."
                value={yieldPercentage}
                onChange={(e) => setYieldPercentage(e.target.value)}
              />
            </div>
          </div>

          {selectedFundData && (
            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="font-semibold mb-3">Yield Distribution Preview</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Target className="h-3 w-3" />
                    Fund AUM
                  </span>
                  <div className="font-medium">
                    {formatAssetValue(selectedFundData.latest_aum, selectedFundData.asset)} {selectedFundData.asset}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    Investors
                  </span>
                  <div className="font-medium">{selectedFundData.investor_count}</div>
                </div>
                <div>
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Percent className="h-3 w-3" />
                    Yield Rate
                  </span>
                  <div className="font-medium">{yieldPercentage || '0'}%</div>
                </div>
                <div>
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Target className="h-3 w-3" />
                    Total Yield
                  </span>
                  <div className="font-medium">
                    {formatAssetValue(estimatedYieldAmount, selectedFundData.asset)} {selectedFundData.asset}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <Separator />
          
          <div className="flex justify-end">
            <Button 
              onClick={handleApplyYield}
              disabled={isApplying || !selectedFund || !yieldPercentage}
            >
              {isApplying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Apply Daily Yield
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Investor Positions */}
      {investorPositions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Current Investor Allocations</CardTitle>
            <CardDescription>
              AUM percentages for investors in {selectedFundData?.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {investorPositions.slice(0, 10).map((position, index) => {
                const yieldAmount = yieldPercentage 
                  ? position.current_value * (parseFloat(yieldPercentage) / 100)
                  : 0;
                
                return (
                  <div key={position.investor_id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">#{index + 1}</Badge>
                      <div>
                        <div className="font-medium text-sm">
                          {position.investor.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {position.investor.email}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-right">
                        <div className="font-medium">
                          {formatAssetValue(position.current_value, selectedFundData?.asset)} {selectedFundData?.asset}
                        </div>
                        <div className="text-muted-foreground">
                          {position.aum_percentage.toFixed(2)}% of AUM
                        </div>
                      </div>
                      
                      {yieldAmount > 0 && (
                        <div className="text-right">
                          <div className="font-medium text-green-600">
                            +{formatAssetValue(yieldAmount, selectedFundData?.asset)} {selectedFundData?.asset}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Est. yield
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              
              {investorPositions.length > 10 && (
                <div className="text-center text-muted-foreground text-sm py-2">
                  ... and {investorPositions.length - 10} more investors
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}