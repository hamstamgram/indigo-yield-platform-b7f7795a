import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Save, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface YieldSource {
  id: string;
  name: string;
  description: string;
  url: string;
  daily_rate: number;
  created_at: string;
}

// Simplified interface for Protocol without using the database table
interface Protocol {
  id: number;
  name: string;
  icon_url?: string;
}

interface Asset {
  id: number;
  symbol: string;
  name: string;
}

interface ProtocolAsset {
  id: string;
  protocol_id: number;
  asset_id: number;
  daily_yield_percentage: number;
  protocol_name?: string;
  asset_symbol?: string;
  asset_name?: string;
}

const YieldSourcesManagement = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [protocolAssets, setProtocolAssets] = useState<ProtocolAsset[]>([]);
  const { toast } = useToast();
  
  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch assets
      const { data: assetsData, error: assetsError } = await supabase
        .from('assets')
        .select('*')
        .order('symbol');
        
      if (assetsError) throw assetsError;
      
      // Since the protocols table doesn't exist, we'll skip trying to fetch it
      // Just set protocols to an empty array or handle differently
      setProtocols([]);
      setAssets(assetsData || []);
      
      // Try to fetch yield_rates with asset info
      const { data: yieldData, error: yieldError } = await supabase
        .from('yield_rates')
        .select(`
          id, 
          daily_yield_percentage, 
          date,
          asset_id, 
          assets(symbol, name)
        `)
        .eq('date', new Date().toISOString().split('T')[0]);
      
      if (yieldError) throw yieldError;
      
      // Transform the data for easier display
      const enrichedYieldData = yieldData?.map(item => ({
        id: item.id,
        asset_id: item.asset_id,
        protocol_id: 0, // Default value
        daily_yield_percentage: item.daily_yield_percentage,
        asset_symbol: item.assets?.symbol,
        asset_name: item.assets?.name,
      })) || [];
      
      setProtocolAssets(enrichedYieldData);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to load yield data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchData();
  }, []);
  
  const handleYieldChange = (assetId: number, value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;
    
    setProtocolAssets(prev => prev.map(item => 
      item.asset_id === assetId ? 
        { ...item, daily_yield_percentage: numValue } : 
        item
    ));
  };
  
  const saveYieldRates = async () => {
    try {
      setSaving(true);
      
      const today = new Date().toISOString().split('T')[0];
      const { data: currentUser } = await supabase.auth.getUser();
      
      // Prepare upsert data
      const upsertData = protocolAssets.map(item => ({
        id: item.id || undefined, // Remove id if it's empty string
        asset_id: item.asset_id,
        daily_yield_percentage: item.daily_yield_percentage,
        date: today,
        entered_by: currentUser?.user?.id
      }));
      
      // Remove any undefined ids for new entries
      const cleanedData = upsertData.map(item => {
        if (item.id === undefined) {
          const { id, ...rest } = item;
          return rest;
        }
        return item;
      });
      
      // Use upsert to add or update yield rates
      const { data, error } = await supabase
        .from('yield_rates')
        .upsert(cleanedData, { 
          onConflict: 'asset_id,date',
          ignoreDuplicates: false 
        });
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Yield rates updated successfully",
      });
      
      // Refresh data after saving
      fetchData();
    } catch (error) {
      console.error("Error saving yield rates:", error);
      toast({
        title: "Error",
        description: "Failed to update yield rates",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };
  
  // Check if we need to create default entries for assets without rates
  const missingAssets = assets.filter(asset => 
    !protocolAssets.some(item => item.asset_id === asset.id)
  );
  
  const addMissingAssets = () => {
    if (missingAssets.length === 0) return;
    
    const newEntries = missingAssets.map(asset => ({
      id: '',
      protocol_id: 0,
      asset_id: asset.id,
      daily_yield_percentage: 0,
      asset_symbol: asset.symbol,
      asset_name: asset.name
    }));
    
    setProtocolAssets(prev => [...prev, ...newEntries]);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Yield Rates Management</CardTitle>
        <CardDescription>
          Set the daily yield rates for each asset, which will be reflected in the dashboard
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center p-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {missingAssets.length > 0 && (
              <div className="mb-4">
                <Button onClick={addMissingAssets} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Missing Assets ({missingAssets.length})
                </Button>
              </div>
            )}
            
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
                  {protocolAssets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center">
                        No yield rates configured yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    protocolAssets.map((item) => (
                      <TableRow key={item.asset_id}>
                        <TableCell>{item.asset_name}</TableCell>
                        <TableCell>{item.asset_symbol}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            value={item.daily_yield_percentage}
                            onChange={(e) => handleYieldChange(item.asset_id, e.target.value)}
                            className="w-24"
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
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

export default YieldSourcesManagement;
