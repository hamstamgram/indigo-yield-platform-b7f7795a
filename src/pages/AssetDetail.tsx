import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, TrendingUp, TrendingDown, Coins, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const AssetDetail = () => {
  const { symbol } = useParams<{ symbol: string }>();
  const navigate = useNavigate();
  const [assetData, setAssetData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAssetData = async () => {
      if (!symbol) return;

      try {
        setLoading(true);

        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (!user) throw new Error('No authenticated user');

        // Fetch asset info from database
        const { data: assetInfo, error: assetError } = await supabase
          .from('assets')
          .select('*')
          .eq('symbol', symbol?.toUpperCase())
          .maybeSingle();

        if (assetError && assetError.code !== 'PGRST116') {
          throw assetError;
        }

        if (!assetInfo) {
          setError(`Asset ${symbol} not found in database`);
          return;
        }

        // Get user's total balance for this asset across all positions
        const { data: positions, error: positionsError } = await supabase
          .from('positions')
          .select('current_balance')
          .eq('investor_id', user.id)
          .eq('asset_code', symbol?.toUpperCase());

        if (positionsError) {
          console.error('Error fetching positions:', positionsError);
        }

        const totalBalance = positions?.reduce((sum, pos) => sum + (parseFloat(pos.current_balance) || 0), 0) || 0;

        // For stablecoins, price is always 1
        const isStablecoin = ['USDT', 'USDC', 'EURC'].includes(symbol.toUpperCase());
        const price = isStablecoin ? 1 : 0; // TODO: Integrate with price oracle/API
        const usdValue = totalBalance * price;

        setAssetData({
          ...assetInfo,
          symbol: assetInfo.symbol.toUpperCase(),
          balance: totalBalance,
          usdValue: usdValue,
          price: price,
          change24h: 0 // TODO: Get from price feed
        });
      } catch (err: any) {
        console.error('Error fetching asset data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAssetData();
  }, [symbol]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-6">
              <div className="text-center text-red-600">
                Error loading asset data: {error}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!assetData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-6">
              <div className="text-center">Asset not found</div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>

        {/* Asset Overview */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Coins className="h-8 w-8 text-primary" />
                <div>
                  <CardTitle className="text-2xl">{assetData.name}</CardTitle>
                  <CardDescription className="text-lg">{assetData.symbol}</CardDescription>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">${assetData.price?.toLocaleString() || '0'}</div>
                <div className={`flex items-center gap-1 ${assetData.change24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {assetData.change24h >= 0 ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                  <span>{assetData.change24h?.toFixed(2) || '0'}%</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground">Your Balance</div>
                <div className="text-xl font-semibold">{assetData.balance?.toFixed(6) || '0.000000'}</div>
                <div className="text-sm text-muted-foreground">{assetData.symbol}</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground">Fund Value</div>
                <div className="text-xl font-semibold">{assetData.balance?.toFixed(6) || '0.000000'} {assetData.symbol}</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground">Current Price</div>
                <div className="text-xl font-semibold">${assetData.price?.toLocaleString() || '0'}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Portfolio Info */}
        <Card>
          <CardHeader>
            <CardTitle>Portfolio Information</CardTitle>
            <CardDescription>Your holdings and transaction history for this asset</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <Info className="h-5 w-5 text-blue-600" />
              <div className="text-sm text-blue-800">
                This fund operates using native {assetData.symbol} tokens for all positions and yield distributions. 
                Performance and yields are calculated in {assetData.symbol} terms.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AssetDetail;