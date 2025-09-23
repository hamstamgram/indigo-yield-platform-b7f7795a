import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, TrendingUp, Calculator, DollarSign } from "lucide-react";

export default function AdminYieldSettingsPage() {
  const [selectedAsset, setSelectedAsset] = useState<string>("");
  const [yieldPercentage, setYieldPercentage] = useState<string>("");
  const [applicationDate, setApplicationDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const queryClient = useQueryClient();

  // Fetch assets for yield application
  const { data: assets, isLoading: assetsLoading } = useQuery({
    queryKey: ['assets-v2'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assets_v2')
        .select('*')
        .eq('is_active', true)
        .order('symbol');
      if (error) throw error;
      return data;
    }
  });

  // Fetch recent yield applications
  const { data: recentApplications, isLoading: applicationsLoading } = useQuery({
    queryKey: ['daily-yield-applications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_yield_applications')
        .select('*')
        .order('application_date', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    }
  });

  // Fetch AUM data
  const { data: aumData, isLoading: aumLoading } = useQuery({
    queryKey: ['total-aum'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_total_aum');
      if (error) throw error;
      return data;
    }
  });

  // Apply yield mutation
  const applyYieldMutation = useMutation({
    mutationFn: async (params: { assetCode: string; percentage: number; date: string }) => {
      const { data, error } = await supabase.rpc('apply_daily_yield', {
        p_asset_code: params.assetCode,
        p_daily_yield_percentage: params.percentage,
        p_application_date: params.date
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (result) => {
      toast.success(`Yield applied successfully! Affected ${(result as any)?.investors_affected || 0} investors`);
      queryClient.invalidateQueries({ queryKey: ['daily-yield-applications'] });
      queryClient.invalidateQueries({ queryKey: ['positions'] });
      setYieldPercentage("");
      setSelectedAsset("");
    },
    onError: (error) => {
      toast.error(`Failed to apply yield: ${error.message}`);
    }
  });

  // Create AUM entry mutation
  const createAumEntryMutation = useMutation({
    mutationFn: async (date: string) => {
      const { data, error } = await supabase.rpc('create_daily_aum_entry', {
        p_entry_date: date
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (result) => {
      toast.success(`AUM entry created for ${(result as any)?.funds_processed || 0} funds`);
      queryClient.invalidateQueries({ queryKey: ['daily-aum-entries'] });
    },
    onError: (error) => {
      toast.error(`Failed to create AUM entry: ${error.message}`);
    }
  });

  const handleApplyYield = () => {
    if (!selectedAsset || !yieldPercentage || !applicationDate) {
      toast.error("Please fill in all fields");
      return;
    }

    const percentage = parseFloat(yieldPercentage);
    if (isNaN(percentage) || percentage <= 0) {
      toast.error("Please enter a valid yield percentage");
      return;
    }

    applyYieldMutation.mutate({
      assetCode: selectedAsset,
      percentage,
      date: applicationDate
    });
  };

  if (assetsLoading || applicationsLoading || aumLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Yield Settings</h1>
        <p className="text-muted-foreground">
          Manage daily yield distributions and AUM tracking
        </p>
      </div>

      {/* AUM Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            AUM Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-primary">
                ${aumData?.[0]?.total_aum ? parseFloat(aumData[0].total_aum.toString()).toLocaleString() : '0'}
              </div>
              <div className="text-sm text-muted-foreground">Total AUM</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {assets?.length || 0}
              </div>
              <div className="text-sm text-muted-foreground">Active Assets</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <Button 
                onClick={() => createAumEntryMutation.mutate(applicationDate)}
                disabled={createAumEntryMutation.isPending}
                variant="outline"
                size="sm"
              >
                {createAumEntryMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Create AUM Snapshot"
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Apply Daily Yield */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Apply Daily Yield
          </CardTitle>
          <CardDescription>
            Apply yield to investor positions for a specific asset
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Asset</Label>
              <Select value={selectedAsset} onValueChange={setSelectedAsset}>
                <SelectTrigger>
                  <SelectValue placeholder="Select asset" />
                </SelectTrigger>
                <SelectContent>
                  {assets?.map((asset) => (
                    <SelectItem key={asset.asset_id} value={asset.asset_id}>
                      {asset.symbol} - {asset.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Daily Yield %</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.20"
                value={yieldPercentage}
                onChange={(e) => setYieldPercentage(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Application Date</Label>
              <Input
                type="date"
                value={applicationDate}
                onChange={(e) => setApplicationDate(e.target.value)}
              />
            </div>
          </div>

          <Button 
            onClick={handleApplyYield}
            disabled={applyYieldMutation.isPending}
            className="w-full md:w-auto"
          >
            {applyYieldMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Applying Yield...
              </>
            ) : (
              <>
                <Calculator className="h-4 w-4 mr-2" />
                Apply Yield
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Recent Yield Applications */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Yield Applications</CardTitle>
          <CardDescription>
            History of recent yield distributions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentApplications?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No yield applications found
              </div>
            ) : (
              recentApplications?.map((application) => (
                <div key={application.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{application.asset_code}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {new Date(application.application_date).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-green-600">
                        {application.daily_yield_percentage}%
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {application.investors_affected} investors
                      </div>
                    </div>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-2 gap-4 mt-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Total AUM: </span>
                      <span className="font-medium">
                        ${parseFloat(application.total_aum.toString()).toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Yield Generated: </span>
                      <span className="font-medium text-green-600">
                        ${parseFloat(application.total_yield_generated.toString()).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
