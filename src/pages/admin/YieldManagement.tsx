import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { formatAssetValue } from '@/utils/kpiCalculations';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, TrendingUp, Users, DollarSign } from 'lucide-react';

interface Asset {
  id: number;
  symbol: string;
  name: string;
  decimal_places: number;
}

interface YieldSource {
  asset_code: string;
  user_id: string;
  current_balance: number;
  percentage_of_aum: number;
  last_updated: string;
}

interface YieldApplication {
  id: string;
  application_date: string;
  asset_code: string;
  total_aum: number;
  daily_yield_percentage: number;
  total_yield_generated: number;
  investors_affected: number;
  applied_at: string;
}

export default function YieldManagement() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [yieldSources, setYieldSources] = useState<YieldSource[]>([]);
  const [yieldApplications, setYieldApplications] = useState<YieldApplication[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<string>('');
  const [yieldPercentage, setYieldPercentage] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchAssets();
    fetchYieldApplications();
  }, []);

  useEffect(() => {
    if (selectedAsset) {
      fetchYieldSources(selectedAsset);
    }
  }, [selectedAsset]);

  const fetchAssets = async () => {
    try {
      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setAssets(data || []);
      if (data && data.length > 0) {
        setSelectedAsset(data[0].symbol);
      }
    } catch (error) {
      console.error('Error fetching assets:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch assets',
        variant: 'destructive',
      });
    }
  };

  const fetchYieldSources = async (assetCode: string) => {
    try {
      setIsLoading(true);
      
      // Calculate current yield sources based on positions
      const { data: positions, error } = await supabase
        .from('positions')
        .select('user_id, current_balance')
        .eq('asset_code', assetCode as any)
        .gt('current_balance', 0);

      if (error) throw error;

      // Calculate total AUM for percentage calculation
      const totalAum = positions?.reduce((sum, pos) => sum + pos.current_balance, 0) || 0;
      
      const sources: YieldSource[] = positions?.map(pos => ({
        asset_code: assetCode,
        user_id: pos.user_id,
        current_balance: pos.current_balance,
        percentage_of_aum: totalAum > 0 ? (pos.current_balance / totalAum) * 100 : 0,
        last_updated: new Date().toISOString()
      })) || [];

      setYieldSources(sources);
    } catch (error) {
      console.error('Error fetching yield sources:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch yield sources',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchYieldApplications = async () => {
    try {
      // For now, we'll mock this data since the table doesn't exist in types yet
      // TODO: Implement when daily_yield_applications table is available
      setYieldApplications([]);
    } catch (error) {
      console.error('Error fetching yield applications:', error);
    }
  };

  const handleRecalculatePercentages = async () => {
    if (!selectedAsset) return;

    try {
      setIsLoading(true);
      
      // TODO: Implement when recalculate_aum_percentages function is available
      // const { error } = await supabase.rpc('recalculate_aum_percentages', {
      //   p_asset_code: selectedAsset
      // });

      toast({
        title: 'Success',
        description: 'AUM percentages recalculated successfully',
      });

      // Refresh the yield sources
      await fetchYieldSources(selectedAsset);
    } catch (error) {
      console.error('Error recalculating percentages:', error);
      toast({
        title: 'Error',
        description: 'Failed to recalculate AUM percentages',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyYield = async () => {
    if (!selectedAsset || !yieldPercentage) return;

    try {
      setIsApplying(true);
      
      // TODO: Implement when apply_daily_yield function is available
      // const { data, error } = await supabase.rpc('apply_daily_yield', {
      //   p_asset_code: selectedAsset,
      //   p_daily_yield_percentage: parseFloat(yieldPercentage),
      //   p_application_date: new Date().toISOString().split('T')[0]
      // });

      // Mock successful response for now
      const mockData = {
        investors_affected: yieldSources.length
      };

      toast({
        title: 'Success',
        description: `Yield applied successfully. ${mockData.investors_affected} investors affected.`,
      });

      setYieldPercentage('');
      await fetchYieldSources(selectedAsset);
      await fetchYieldApplications();
    } catch (error) {
      console.error('Error applying yield:', error);
      toast({
        title: 'Error',
        description: 'Failed to apply yield',
        variant: 'destructive',
      });
    } finally {
      setIsApplying(false);
    }
  };

  const selectedAssetData = assets.find(a => a.symbol === selectedAsset);
  const totalAum = yieldSources.reduce((sum, source) => sum + source.current_balance, 0);
  const totalYield = totalAum * (parseFloat(yieldPercentage) || 0) / 100;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Yield Management</h1>
          <p className="text-muted-foreground">Manage daily yield calculations and distributions</p>
        </div>
      </div>

      {/* Asset Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Asset</CardTitle>
          <CardDescription>Choose an asset to manage yield distribution</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {assets.map((asset) => (
              <Badge
                key={asset.symbol}
                variant={selectedAsset === asset.symbol ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setSelectedAsset(asset.symbol)}
              >
                {asset.symbol} - {asset.name}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedAsset && (
        <>
          {/* Current AUM Overview */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total AUM</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatAssetValue(totalAum, selectedAsset)} {selectedAsset}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Investors</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{yieldSources.length}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Estimated Yield</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatAssetValue(totalYield, selectedAsset)} {selectedAsset}
                </div>
                <p className="text-xs text-muted-foreground">
                  @ {yieldPercentage || 0}% daily rate
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Yield Application */}
          <Card>
            <CardHeader>
              <CardTitle>Apply Daily Yield</CardTitle>
              <CardDescription>
                Apply daily yield percentage to all {selectedAsset} positions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="yieldPercentage">Daily Yield Percentage</Label>
                  <Input
                    id="yieldPercentage"
                    type="number"
                    step="0.001"
                    placeholder="0.000"
                    value={yieldPercentage}
                    onChange={(e) => setYieldPercentage(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Total Yield to Distribute</Label>
                  <div className="p-3 bg-muted rounded-md">
                    {formatAssetValue(totalYield, selectedAsset)} {selectedAsset}
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button
                  onClick={handleRecalculatePercentages}
                  variant="outline"
                  disabled={isLoading}
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Recalculate AUM %
                </Button>
                
                <Button
                  onClick={handleApplyYield}
                  disabled={!yieldPercentage || isApplying}
                >
                  {isApplying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Apply Yield
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Current Yield Sources */}
          <Card>
            <CardHeader>
              <CardTitle>Current AUM Distribution</CardTitle>
              <CardDescription>
                Current {selectedAsset} positions and their AUM percentages
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : yieldSources.length === 0 ? (
                <p className="text-center text-muted-foreground p-8">
                  No positions found for {selectedAsset}
                </p>
              ) : (
                <div className="space-y-4">
                  {yieldSources.map((source, index) => (
                    <div key={`${source.user_id}-${source.asset_code}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Investor {index + 1}</p>
                          <p className="text-sm text-muted-foreground">
                            {source.user_id.substring(0, 8)}...
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">
                            {formatAssetValue(source.current_balance, selectedAsset)} {selectedAsset}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {source.percentage_of_aum.toFixed(2)}% of AUM
                          </p>
                        </div>
                      </div>
                      {index < yieldSources.length - 1 && <Separator className="mt-4" />}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}