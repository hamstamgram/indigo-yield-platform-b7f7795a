import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { getInvestorPositions, updateInvestorPosition, type InvestorPosition } from '@/services/fundService';
import FundAssetDropdown from '@/components/admin/investors/FundAssetDropdown';
import { formatAssetValue } from '@/utils/kpiCalculations';
import { TrendingUp, Percent, Users, Plus, Save } from 'lucide-react';

const AdminInvestorPositionsPage = () => {
  const { id } = useParams();
  const { toast } = useToast();
  const [positions, setPositions] = useState<InvestorPosition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingPosition, setEditingPosition] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, Partial<InvestorPosition>>>({});

  useEffect(() => {
    if (id) {
      fetchPositions();
    }
  }, [id]);

  const fetchPositions = async () => {
    if (!id) return;
    
    try {
      setIsLoading(true);
      const data = await getInvestorPositions(id);
      setPositions(data);
    } catch (error) {
      console.error('Error fetching positions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load investor positions',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditPosition = (fundId: string, position: InvestorPosition) => {
    setEditingPosition(fundId);
    setEditValues({
      [fundId]: {
        shares: position.shares,
        current_value: position.current_value,
        cost_basis: position.cost_basis
      }
    });
  };

  const handleSavePosition = async (fundId: string) => {
    if (!id || !editValues[fundId]) return;
    
    try {
      const updates = editValues[fundId];
      const result = await updateInvestorPosition(id, fundId, updates);
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      toast({
        title: 'Success',
        description: 'Position updated successfully',
      });
      
      await fetchPositions();
      setEditingPosition(null);
      setEditValues({});
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update position',
        variant: 'destructive',
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingPosition(null);
    setEditValues({});
  };

  const updateEditValue = (fundId: string, field: string, value: string) => {
    setEditValues(prev => ({
      ...prev,
      [fundId]: {
        ...prev[fundId],
        [field]: parseFloat(value) || 0
      }
    }));
  };

  const totalPortfolioValue = positions.reduce((sum, pos) => sum + pos.current_value, 0);
  const totalCostBasis = positions.reduce((sum, pos) => sum + pos.cost_basis, 0);
  const totalUnrealizedPnL = positions.reduce((sum, pos) => sum + pos.unrealized_pnl, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading positions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="font-['Space_Grotesk'] space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Fund Positions</h1>
        <p className="text-gray-500 dark:text-gray-400">Manage fund positions for investor #{id}</p>
      </div>

      {/* Portfolio Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Fund Count</p>
                <p className="text-lg font-semibold">{positions.length}</p>
              </div>
              <Users className="h-8 w-8 text-indigo-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Shares</p>
                <p className="text-lg font-semibold">{positions.reduce((sum, pos) => sum + pos.shares, 0).toFixed(8)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Positions</p>
                <p className="text-lg font-semibold">{positions.filter(pos => pos.shares > 0).length}</p>
              </div>
              <Percent className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fund Positions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Fund Positions
              </CardTitle>
              <CardDescription>
                View and manage positions across different funds
              </CardDescription>
            </div>
            {id && (
              <FundAssetDropdown
                investorId={id}
                onFundAdded={fetchPositions}
              />
            )}
          </div>
        </CardHeader>
        <CardContent>
          {positions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No fund positions found for this investor.</p>
              <p className="text-sm mt-2">Use the "Add Fund" button to create a new position.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {positions.map((position: any) => (
                <div key={position.fund_id} className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">{position.fund?.name || 'Unknown Fund'}</h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <Badge variant="outline">{position.fund?.code || 'N/A'}</Badge>
                        <span>{position.fund?.asset || 'N/A'}</span>
                        <span>Class {position.fund_class}</span>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-lg font-semibold">
                        {position.current_value?.toFixed(8) || '0.00000000'} {position.fund?.asset || 'N/A'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {position.aum_percentage?.toFixed(2) || '0.00'}% of fund AUM
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  {editingPosition === position.fund_id ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`shares-${position.fund_id}`}>Shares</Label>
                        <Input
                          id={`shares-${position.fund_id}`}
                          type="number"
                          step="0.00000001"
                          value={editValues[position.fund_id]?.shares || 0}
                          onChange={(e) => updateEditValue(position.fund_id, 'shares', e.target.value)}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor={`value-${position.fund_id}`}>Current Value</Label>
                        <Input
                          id={`value-${position.fund_id}`}
                          type="number"
                          step="0.01"
                          value={editValues[position.fund_id]?.current_value || 0}
                          onChange={(e) => updateEditValue(position.fund_id, 'current_value', e.target.value)}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor={`cost-${position.fund_id}`}>Cost Basis</Label>
                        <Input
                          id={`cost-${position.fund_id}`}
                          type="number"
                          step="0.01"
                          value={editValues[position.fund_id]?.cost_basis || 0}
                          onChange={(e) => updateEditValue(position.fund_id, 'cost_basis', e.target.value)}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Current Value:</span>
                        <span className="ml-2 font-medium">{position.current_value?.toFixed(8) || '0'} {position.fund?.asset}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Cost Basis:</span>
                        <span className="ml-2 font-medium">{position.cost_basis?.toFixed(8) || '0'} {position.fund?.asset}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Unrealized P&L:</span>
                        <span className={`ml-2 font-medium ${position.unrealized_pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {position.unrealized_pnl >= 0 ? '+' : ''}{position.unrealized_pnl?.toFixed(8) || '0'} {position.fund?.asset}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Realized P&L:</span>
                        <span className={`ml-2 font-medium ${position.realized_pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {position.realized_pnl >= 0 ? '+' : ''}{position.realized_pnl?.toFixed(8) || '0'} {position.fund?.asset}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex justify-end gap-2">
                    {editingPosition === position.fund_id ? (
                      <>
                        <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                          Cancel
                        </Button>
                        <Button size="sm" onClick={() => handleSavePosition(position.fund_id)}>
                          <Save className="h-4 w-4 mr-2" />
                          Save
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditPosition(position.fund_id, position)}
                      >
                        Edit Position
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminInvestorPositionsPage;
