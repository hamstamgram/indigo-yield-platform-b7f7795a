import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, Database, CheckCircle, RefreshCw } from 'lucide-react';

interface MigrationStatus {
  table_name: string;
  migration_status: string;
  deprecated_at: string;
  migration_notes: string;
  record_count: number;
}

const LegacyMigrationStatus = () => {
  const [migrationData, setMigrationData] = useState<MigrationStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchMigrationStatus = async () => {
    try {
      setLoading(true);
      
      // Call the secure function to get migration status
      const { data, error } = await supabase.rpc('get_legacy_migration_status');
      
      if (error) throw error;
      
      setMigrationData(data || []);
    } catch (error) {
      console.error('Error fetching migration status:', error);
      toast({
        title: 'Error',
        description: 'Failed to load migration status',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMigrationStatus();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'deprecated':
        return <Badge variant="destructive">Deprecated</Badge>;
      case 'migrated':
        return <Badge variant="default">Migrated</Badge>;
      case 'active':
        return <Badge variant="secondary">Active</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 w-full items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading migration status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Legacy System Migration Status</h1>
          <p className="text-muted-foreground">
            Monitor the transition from legacy USD-based tables to native token fund management
          </p>
        </div>
        <Button onClick={fetchMigrationStatus} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Migration Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Migration Overview
          </CardTitle>
          <CardDescription>
            System transition status from legacy USD tables to native token fund management
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="font-medium">New System (Active)</span>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• investor_positions - Native token fund positions</li>
                <li>• daily_yield_applications - Fund-based yield distribution</li>
                <li>• fund_daily_aum - Native token AUM tracking</li>
              </ul>
            </div>
            
            <div className="p-4 border rounded-lg bg-yellow-50 border-yellow-200">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <span className="font-medium">Legacy System (Deprecated)</span>
              </div>
              <ul className="text-sm text-yellow-800 space-y-1">
                <li>• positions - Old USD-based positions</li>
                <li>• yield_sources - Old yield calculation data</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Migration Details */}
      <Card>
        <CardHeader>
          <CardTitle>Deprecated Tables Status</CardTitle>
          <CardDescription>
            Detailed status of legacy tables marked for deprecation
          </CardDescription>
        </CardHeader>
        <CardContent>
          {migrationData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No migration data found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {migrationData.map((item) => (
                <div key={item.table_name} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold">{item.table_name}</h3>
                      {getStatusBadge(item.migration_status)}
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">Records</div>
                      <div className="font-semibold">{item.record_count}</div>
                    </div>
                  </div>
                  
                  <div className="text-sm text-muted-foreground mb-2">
                    <strong>Deprecated:</strong> {new Date(item.deprecated_at).toLocaleDateString()}
                  </div>
                  
                  <div className="text-sm">
                    <strong>Migration Notes:</strong>
                    <p className="mt-1 text-muted-foreground">{item.migration_notes}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Migration Guidelines */}
      <Card>
        <CardHeader>
          <CardTitle>Migration Guidelines</CardTitle>
          <CardDescription>
            Important information about the system transition
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">✅ What's Working</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Native token fund management system</li>
                <li>• Fund-based yield distribution</li>
                <li>• AUM tracking in native tokens (BTC, ETH, USDT, etc.)</li>
                <li>• Admin fund management tools</li>
              </ul>
            </div>
            
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="font-semibold text-yellow-900 mb-2">⚠️ Legacy System (Do Not Use)</h4>
              <ul className="text-sm text-yellow-800 space-y-1">
                <li>• Old positions table (USD-based calculations)</li>
                <li>• Old yield_sources table (deprecated yield logic)</li>
                <li>• Any services still referencing these tables</li>
              </ul>
            </div>
            
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-semibold text-green-900 mb-2">🚀 Next Steps</h4>
              <ul className="text-sm text-green-800 space-y-1">
                <li>• All services updated to use investor_positions</li>
                <li>• Legacy table references removed from codebase</li>
                <li>• System fully transitioned to native token management</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LegacyMigrationStatus;