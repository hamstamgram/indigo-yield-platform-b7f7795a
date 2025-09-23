import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { yieldService, YieldRate, YieldApplication } from "@/services/yieldService";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface YieldManagementPanelProps {
  onDataChange: () => void;
}

export function YieldManagementPanel({ onDataChange }: YieldManagementPanelProps) {
  const [yieldRates, setYieldRates] = useState<YieldRate[]>([]);
  const [applications, setApplications] = useState<YieldApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState<string | null>(null);
  const [newRates, setNewRates] = useState<Record<string, string>>({});

  const loadData = async () => {
    try {
      setLoading(true);
      const [rates, apps] = await Promise.all([
        yieldService.getCurrentYieldRates(),
        yieldService.getYieldApplications(10)
      ]);
      setYieldRates(rates);
      setApplications(apps);
    } catch (error) {
      console.error('Error loading yield data:', error);
      toast.error('Failed to load yield data');
    } finally {
      setLoading(false);
    }
  };

  const updateYieldRate = async (assetSymbol: string, assetId: number) => {
    const newRate = parseFloat(newRates[assetSymbol]);
    if (!newRate || newRate <= 0) {
      toast.error('Please enter a valid yield rate');
      return;
    }

    try {
      await yieldService.setYieldRate(assetId, newRate);
      toast.success(`Updated yield rate for ${assetSymbol}`);
      setNewRates(prev => ({ ...prev, [assetSymbol]: '' }));
      loadData();
      onDataChange();
    } catch (error) {
      console.error('Error updating yield rate:', error);
      toast.error('Failed to update yield rate');
    }
  };

  const applyDailyYield = async (assetSymbol: string, rate: number) => {
    try {
      setApplying(assetSymbol);
      const result = await yieldService.applyDailyYield(assetSymbol, rate);
      toast.success(`Applied daily yield for ${assetSymbol}. ${result.investors_affected} investors affected.`);
      loadData();
      onDataChange();
    } catch (error) {
      console.error('Error applying yield:', error);
      toast.error('Failed to apply daily yield');
    } finally {
      setApplying(null);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Yield Management</CardTitle>
          <CardDescription>Manage daily yield rates and distribution</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Yield Management</CardTitle>
        <CardDescription>
          Manage daily yield rates and distribution
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Current Yield Rates */}
          <div>
            <h3 className="text-lg font-medium mb-4">Current Yield Rates</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead>Daily Rate (%)</TableHead>
                  <TableHead>Annual Rate (%)</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {yieldRates.map((rate) => (
                  <TableRow key={rate.id}>
                    <TableCell className="font-medium">{rate.asset_symbol}</TableCell>
                    <TableCell>{rate.daily_yield_percentage.toFixed(4)}%</TableCell>
                    <TableCell>{rate.annual_yield_percentage.toFixed(2)}%</TableCell>
                    <TableCell>{new Date(rate.date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex gap-2 items-center">
                        <Input
                          type="number"
                          step="0.0001"
                          placeholder="New rate %"
                          className="w-24"
                          value={newRates[rate.asset_symbol] || ''}
                          onChange={(e) => setNewRates(prev => ({ ...prev, [rate.asset_symbol]: e.target.value }))}
                        />
                        <Button 
                          size="sm" 
                          onClick={() => updateYieldRate(rate.asset_symbol, rate.asset_id)}
                          disabled={!newRates[rate.asset_symbol]}
                        >
                          Update
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => applyDailyYield(rate.asset_symbol, rate.daily_yield_percentage)}
                          disabled={applying === rate.asset_symbol}
                        >
                          {applying === rate.asset_symbol ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Apply'
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Recent Applications */}
          <div>
            <h3 className="text-lg font-medium mb-4">Recent Yield Applications</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Asset</TableHead>
                  <TableHead>Rate (%)</TableHead>
                  <TableHead>AUM</TableHead>
                  <TableHead>Yield Generated</TableHead>
                  <TableHead>Investors</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell>{new Date(app.application_date).toLocaleDateString()}</TableCell>
                    <TableCell>{app.asset_code}</TableCell>
                    <TableCell>{app.daily_yield_percentage.toFixed(4)}%</TableCell>
                    <TableCell>${app.total_aum.toLocaleString()}</TableCell>
                    <TableCell>${app.total_yield_generated.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{app.investors_affected}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <Button onClick={loadData} variant="outline">
            Refresh Data
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}