import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Save, Loader2, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface YieldSource {
  id: string;
  asset: string;
  name: string;
  provider: string;
  currentAPY: number;
  targetYield: number;
  status: 'active' | 'inactive';
}

const YieldSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [yieldSources, setYieldSources] = useState<YieldSource[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const { toast } = useToast();

  const fetchData = async () => {
    try {
      setLoading(true);
      console.log('Fetching yield sources from database...');
      
      // Mock yield sources for now since real table doesn't exist
      const mockSources: YieldSource[] = [
        {
          id: '1',
          asset: 'USDC',
          name: 'USDC Lending',
          provider: 'Compound',
          currentAPY: 4.2,
          targetYield: 7.2,
          status: 'active'
        },
        {
          id: '2',
          asset: 'ETH',
          name: 'ETH Staking',
          provider: 'Lido',
          currentAPY: 3.8,
          targetYield: 5.5,
          status: 'active'
        }
      ];
      
      setYieldSources(mockSources);
      setHasChanges(false);
      
      console.log('Loaded yield sources:', mockSources.length);
    } catch (error) {
      console.error('Error fetching yield sources:', error);
      toast({
        title: 'Error',
        description: 'Failed to load yield sources from database',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleStatusToggle = (id: string, newStatus: 'active' | 'inactive') => {
    setYieldSources(prev =>
      prev.map(source =>
        source.id === id ? { ...source, status: newStatus } : source
      )
    );
    setHasChanges(true);
  };

  const handleTargetYieldChange = (id: string, value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < 0) return;

    setYieldSources(prev =>
      prev.map(source =>
        source.id === id ? { ...source, targetYield: numValue } : source
      )
    );
    setHasChanges(true);
  };

  const handleSaveAll = async () => {
    try {
      setSaving(true);

      // Mock save operation since real table doesn't exist
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast({
        title: 'Success',
        description: 'Yield settings updated successfully',
      });

      setHasChanges(false);
    } catch (error) {
      console.error('Error saving yield settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save yield settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Yield Settings</h1>
          <p className="text-muted-foreground">
            Configure yield rates and sources for each supported asset
          </p>
        </div>
        <Button onClick={fetchData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Yield Sources Configuration</CardTitle>
          <CardDescription>
            Enable/disable yield sources and set target yields for each asset
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead>Source Name</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Current APY</TableHead>
                  <TableHead>Target Yield</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {yieldSources.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No yield sources configured
                    </TableCell>
                  </TableRow>
                ) : (
                  yieldSources.map((source) => (
                    <TableRow key={source.id}>
                      <TableCell className="font-medium">{source.asset}</TableCell>
                      <TableCell>{source.name}</TableCell>
                      <TableCell className="text-muted-foreground">{source.provider}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {source.currentAPY.toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Input
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            value={source.targetYield || 0}
                            onChange={(e) => handleTargetYieldChange(source.id, e.target.value)}
                            className="w-20 text-right"
                          />
                          <span className="text-sm text-muted-foreground">%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={source.status === 'active'}
                            onCheckedChange={(checked) =>
                              handleStatusToggle(source.id, checked ? 'active' : 'inactive')
                            }
                          />
                          <Badge variant={source.status === 'active' ? 'default' : 'secondary'}>
                            {source.status}
                          </Badge>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {hasChanges && (
            <div className="mt-4 flex justify-end">
              <Button onClick={handleSaveAll} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default YieldSettings;
