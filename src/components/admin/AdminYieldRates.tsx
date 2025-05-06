
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save } from "lucide-react";

type Asset = {
  id: number;
  symbol: string;
  name: string;
};

type YieldRate = {
  id: string;
  asset_id: number;
  daily_yield_percentage: number;
  date: string;
  asset_symbol?: string;
  asset_name?: string;
};

const AdminYieldRates = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [yieldRates, setYieldRates] = useState<YieldRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  
  // Create today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch assets
        const { data: assetsData, error: assetsError } = await supabase
          .from('assets')
          .select('id, symbol, name')
          .order('name');
        
        if (assetsError) throw assetsError;
        
        // Fetch today's yield rates
        const { data: ratesData, error: ratesError } = await supabase
          .from('yield_rates')
          .select('id, asset_id, daily_yield_percentage, date')
          .eq('date', today);
        
        if (ratesError) throw ratesError;
        
        setAssets(assetsData || []);
        
        // If we have yield rates for today
        if (ratesData && ratesData.length > 0) {
          // Enrich with asset data
          const enrichedRates = ratesData.map(rate => {
            const asset = assetsData?.find(a => a.id === rate.asset_id);
            return {
              ...rate,
              asset_symbol: asset?.symbol || '',
              asset_name: asset?.name || ''
            };
          });
          setYieldRates(enrichedRates);
        } else {
          // Create default entries for all assets with 0% yield
          const defaultRates = assetsData?.map(asset => ({
            id: '',  // Empty as it doesn't exist in DB yet
            asset_id: asset.id,
            asset_symbol: asset.symbol,
            asset_name: asset.name,
            daily_yield_percentage: 0,
            date: today
          }));
          setYieldRates(defaultRates || []);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch yield rate data',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const handleYieldChange = (assetId: number, value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;
    
    setYieldRates(prev => prev.map(rate => 
      rate.asset_id === assetId ? 
        { ...rate, daily_yield_percentage: numValue } : 
        rate
    ));
  };

  const saveYieldRates = async () => {
    try {
      setSaving(true);
      
      for (const rate of yieldRates) {
        if (rate.id) {
          // Update existing rate
          const { error } = await supabase
            .from('yield_rates')
            .update({ 
              daily_yield_percentage: rate.daily_yield_percentage 
            })
            .eq('id', rate.id);
            
          if (error) throw error;
        } else {
          // Insert new rate
          const { error } = await supabase
            .from('yield_rates')
            .insert({ 
              asset_id: rate.asset_id,
              daily_yield_percentage: rate.daily_yield_percentage,
              date: today,
              entered_by: (await supabase.auth.getUser()).data.user?.id
            });
            
          if (error) throw error;
        }
      }
      
      toast({
        title: 'Success',
        description: 'Yield rates saved successfully',
      });
      
      // Refresh data after saving
      const { data } = await supabase
        .from('yield_rates')
        .select('id, asset_id, daily_yield_percentage, date')
        .eq('date', today);
        
      if (data) {
        const updatedRates = data.map(rate => {
          const asset = assets.find(a => a.id === rate.asset_id);
          return {
            ...rate,
            asset_symbol: asset?.symbol || '',
            asset_name: asset?.name || ''
          };
        });
        setYieldRates(updatedRates);
      }
    } catch (error) {
      console.error('Error saving yield rates:', error);
      toast({
        title: 'Error',
        description: 'Failed to save yield rates',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Yield Rate Management</CardTitle>
        <CardDescription>Set daily yield rates for all assets</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center p-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset</TableHead>
                    <TableHead>Symbol</TableHead>
                    <TableHead className="w-[200px]">Daily Yield (%)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {yieldRates.map((rate) => (
                    <TableRow key={rate.asset_id}>
                      <TableCell>{rate.asset_name}</TableCell>
                      <TableCell>{rate.asset_symbol}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={rate.daily_yield_percentage}
                          onChange={(e) => handleYieldChange(rate.asset_id, e.target.value)}
                          className="w-24"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="mt-4 flex justify-end">
              <Button onClick={saveYieldRates} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Yield Rates
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminYieldRates;
