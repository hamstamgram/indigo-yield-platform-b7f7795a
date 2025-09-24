import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { applyDailyYieldToFund, getAllFundsWithAUM } from '@/services/aumService';
import { toast } from 'sonner';
import { CheckCircle, AlertCircle, Loader2, Target } from 'lucide-react';
import { formatAssetValue } from '@/utils/kpiCalculations';

const TestYieldPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [funds, setFunds] = useState<any[]>([]);
  const [selectedFund, setSelectedFund] = useState<string>('');
  const [yieldPercentage, setYieldPercentage] = useState<string>('0.01');
  const [result, setResult] = useState<any>(null);

  React.useEffect(() => {
    const loadFunds = async () => {
      const fundsData = await getAllFundsWithAUM();
      // Only show funds with AUM > 0
      const fundsWithAUM = fundsData.filter(f => f.latest_aum > 0);
      setFunds(fundsWithAUM);
    };
    loadFunds();
  }, []);

  const selectedFundData = funds.find(f => f.id === selectedFund);

  const handleTestYield = async () => {
    if (!selectedFund || !yieldPercentage) {
      toast.error('Please select a fund and enter yield percentage');
      return;
    }

    setIsLoading(true);
    setResult(null);
    
    try {
      const response = await applyDailyYieldToFund(
        selectedFund,
        parseFloat(yieldPercentage),
        new Date().toISOString().split('T')[0]
      );
      
      if (response.success) {
        setResult(response.data);
        toast.success('Test yield applied successfully!');
      } else {
        toast.error(response.error || 'Failed to apply yield');
      }
      
    } catch (error) {
      console.error('Test yield error:', error);
      toast.error('Failed to apply test yield');
    } finally {
      setIsLoading(false);
    }
  };

  const estimatedYield = selectedFundData && yieldPercentage 
    ? selectedFundData.latest_aum * (parseFloat(yieldPercentage) / 100)
    : 0;

  return (
    <div className="font-['Space_Grotesk']">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Test Yield System</h1>
        <p className="text-gray-500 dark:text-gray-400">Test the native token yield distribution system</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        
        {/* Test Controls */}
        <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <CardHeader>
            <CardTitle>Apply Test Yield</CardTitle>
            <CardDescription>
              Apply a small test yield to verify the system works with native tokens
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            
            <div className="space-y-2">
              <Label htmlFor="fund-select">Select Fund</Label>
              <Select value={selectedFund} onValueChange={setSelectedFund}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a fund to test" />
                </SelectTrigger>
                <SelectContent>
                  {funds.map((fund) => (
                    <SelectItem key={fund.id} value={fund.id}>
                      {fund.name} ({fund.asset}) - {formatAssetValue(fund.latest_aum, fund.asset)} {fund.asset}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="yield-percentage">Daily Yield Percentage</Label>
              <Input
                id="yield-percentage"
                type="number"
                step="0.001"
                min="0"
                max="10"
                value={yieldPercentage}
                onChange={(e) => setYieldPercentage(e.target.value)}
                placeholder="0.01"
              />
              <p className="text-xs text-muted-foreground">
                Recommended: 0.01% for testing (equivalent to ~3.65% APY)
              </p>
            </div>

            {/* Yield Preview */}
            {selectedFundData && yieldPercentage && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Yield Preview
                </h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Fund AUM:</span>
                    <span className="font-mono">{formatAssetValue(selectedFundData.latest_aum, selectedFundData.asset)} {selectedFundData.asset}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Daily Yield:</span>
                    <span className="font-mono text-green-600">+{formatAssetValue(estimatedYield, selectedFundData.asset)} {selectedFundData.asset}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Investors Affected:</span>
                    <span>{selectedFundData.investor_count}</span>
                  </div>
                </div>
              </div>
            )}

            <Button 
              onClick={handleTestYield}
              disabled={isLoading || !selectedFund || !yieldPercentage}
              className="w-full"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Applying Yield...
                </>
              ) : (
                'Apply Test Yield'
              )}
            </Button>

          </CardContent>
        </Card>

        {/* Result Display */}
        <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
            <CardDescription>
              Yield application results in native token amounts
            </CardDescription>
          </CardHeader>
          <CardContent>
            
            {result ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">Yield Applied Successfully</span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <div className="font-medium">Application Details</div>
                    <div className="space-y-1">
                      <div>Application ID:</div>
                      <div className="font-mono text-xs bg-gray-100 dark:bg-gray-800 p-1 rounded">
                        {result.application_id}
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="font-medium">Native Token Results</div>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span>Fund AUM:</span>
                        <span className="font-mono">{formatAssetValue(result.fund_aum, selectedFundData?.asset)} {selectedFundData?.asset}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Yield:</span>
                        <span className="font-mono text-green-600">+{formatAssetValue(result.total_yield_generated, selectedFundData?.asset)} {selectedFundData?.asset}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Investors:</span>
                        <span>{result.investors_affected}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="text-sm">
                    <div className="font-medium text-green-800 dark:text-green-200 mb-1">
                      ✅ Native Token System Working
                    </div>
                    <div className="text-green-700 dark:text-green-300">
                      All yields calculated and distributed in {selectedFundData?.asset} tokens - no currency conversions needed!
                    </div>
                  </div>
                </div>
                
              </div>
            ) : (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <div className="text-center">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                  <div>No test results yet</div>
                  <div className="text-sm">Apply a yield to see results</div>
                </div>
              </div>
            )}

          </CardContent>
        </Card>

      </div>

      {/* Available Funds Summary */}
      <Card className="mt-6 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <CardHeader>
          <CardTitle>Available Funds for Testing</CardTitle>
          <CardDescription>
            Funds with AUM set and ready for yield distribution
          </CardDescription>
        </CardHeader>
        <CardContent>
          {funds.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-3">
              {funds.map((fund) => (
                <div key={fund.id} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="font-medium">{fund.name}</div>
                  <div className="text-sm text-muted-foreground">Asset: {fund.asset}</div>
                  <div className="font-mono text-sm">AUM: {formatAssetValue(fund.latest_aum, fund.asset)} {fund.asset}</div>
                  <div className="text-xs text-muted-foreground">{fund.investor_count} investors</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              <AlertCircle className="h-6 w-6 mx-auto mb-2" />
              <div>No funds with AUM available</div>
              <div className="text-sm">Set AUM values first using "Setup AUM"</div>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
};

export default TestYieldPage;