import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { setFundDailyAUM } from '@/services/aumService';
import { toast } from 'sonner';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

const SetupAUMPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<Array<{asset: string; success: boolean; error?: string}>>([]);

  const fundsToInitialize = [
    {
      id: '6e103afe-0b62-4e68-9bd7-1bb3610ce6fa', // USDT Yield Fund
      asset: 'USDT',
      aum: 104825.9650689478
    },
    {
      id: '2102bc81-4a8c-437d-9c1f-d34c32a534ee', // BTC Yield Fund  
      asset: 'BTC',
      aum: 27001.8580007675
    },
    {
      id: '2682e5a8-164a-4765-9907-2844d6d793cf', // ETH Yield Fund
      asset: 'ETH', 
      aum: 12996.8249561220
    }
  ];

  const handleSetupAUM = async () => {
    setIsLoading(true);
    setResults([]);
    
    try {
      const setupResults = [];
      
      for (const fund of fundsToInitialize) {
        const result = await setFundDailyAUM(
          fund.id,
          fund.aum,
          new Date().toISOString().split('T')[0]
        );
        
        setupResults.push({
          asset: fund.asset,
          success: result.success,
          error: result.error
        });
      }
      
      setResults(setupResults);
      
      const successCount = setupResults.filter(r => r.success).length;
      if (successCount === fundsToInitialize.length) {
        toast.success('Successfully initialized AUM for all funds!');
      } else {
        toast.error(`Only ${successCount}/${fundsToInitialize.length} funds initialized successfully`);
      }
      
    } catch (error) {
      toast.error('Failed to initialize AUM values');
      console.error('AUM setup error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="font-['Space_Grotesk']">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">AUM Setup</h1>
        <p className="text-gray-500 dark:text-gray-400">Initialize daily AUM values for existing funds</p>
      </div>

      <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <CardHeader>
          <CardTitle>Initialize Fund AUM Values</CardTitle>
          <CardDescription>
            Set initial daily AUM based on current investor positions. This enables the yield distribution system.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Fund Summary */}
          <div className="space-y-3">
            <h3 className="font-semibold">Funds to Initialize:</h3>
            {fundsToInitialize.map((fund) => (
              <div key={fund.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div>
                  <div className="font-medium">{fund.asset} Yield Fund</div>
                  <div className="text-sm text-muted-foreground">Fund ID: {fund.id}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono">{fund.aum.toLocaleString()} {fund.asset}</div>
                  <div className="text-sm text-muted-foreground">Initial AUM</div>
                </div>
              </div>
            ))}
          </div>

          {/* Action Button */}
          <Button 
            onClick={handleSetupAUM}
            disabled={isLoading}
            className="w-full"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Setting AUM Values...
              </>
            ) : (
              'Initialize AUM Values'
            )}
          </Button>

          {/* Results */}
          {results.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold">Results:</h4>
              {results.map((result) => (
                <div 
                  key={result.asset}
                  className={`flex items-center gap-2 p-2 rounded ${
                    result.success 
                      ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200' 
                      : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
                  }`}
                >
                  {result.success ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  <span className="font-medium">{result.asset} Fund:</span>
                  <span>
                    {result.success ? 'AUM set successfully' : `Failed - ${result.error}`}
                  </span>
                </div>
              ))}
            </div>
          )}

        </CardContent>
      </Card>
    </div>
  );
};

export default SetupAUMPage;