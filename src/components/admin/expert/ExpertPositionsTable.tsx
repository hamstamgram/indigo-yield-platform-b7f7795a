import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Edit3, Save, X, TrendingUp, TrendingDown } from 'lucide-react';
import { toast } from 'sonner';
import { UnifiedPositionData } from '@/services/expertInvestorService';
import { expertInvestorService } from '@/services/expertInvestorService';
import { formatAssetValue } from '@/utils/kpiCalculations';

interface ExpertPositionsTableProps {
  positions: UnifiedPositionData[];
  onPositionUpdate: () => void;
}

const ExpertPositionsTable: React.FC<ExpertPositionsTableProps> = ({
  positions,
  onPositionUpdate
}) => {
  const [editingPosition, setEditingPosition] = useState<string | null>(null);
  const [editValues, setEditValues] = useState({
    currentValue: 0,
    costBasis: 0,
    shares: 0
  });

  const handleEdit = (position: UnifiedPositionData) => {
    setEditingPosition(position.id);
    setEditValues({
      currentValue: position.currentValue,
      costBasis: position.costBasis,
      shares: position.shares
    });
  };

  const handleSave = async (positionId: string, isLegacy: boolean) => {
    try {
      await expertInvestorService.updatePositionValue(
        positionId, 
        editValues.currentValue, 
        isLegacy
      );
      setEditingPosition(null);
      onPositionUpdate();
      toast.success('Position updated successfully');
    } catch (error) {
      console.error('Error updating position:', error);
      toast.error('Failed to update position');
    }
  };

  const handleCancel = () => {
    setEditingPosition(null);
  };

  const calculatePnL = (currentValue: number, costBasis: number) => {
    return currentValue - costBasis;
  };

  const calculatePnLPercent = (currentValue: number, costBasis: number) => {
    if (costBasis === 0) return 0;
    return ((currentValue - costBasis) / costBasis) * 100;
  };

  if (positions.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">No positions found for this investor</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Positions</CardTitle>
        <CardDescription>
          Complete position history and current holdings across all funds
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fund / Asset</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>Shares</TableHead>
              <TableHead>Cost Basis</TableHead>
              <TableHead>Current Value</TableHead>
              <TableHead>P&L</TableHead>
              <TableHead>P&L %</TableHead>
              <TableHead>Earnings</TableHead>
              <TableHead>Last Transaction</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {positions.map((position) => {
              const isEditing = editingPosition === position.id;
              const isLegacy = position.fundClass === 'Legacy';
              const pnl = calculatePnL(position.currentValue, position.costBasis);
              const pnlPercent = calculatePnLPercent(position.currentValue, position.costBasis);
              
              return (
                <TableRow key={position.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{position.fundName}</div>
                      <div className="text-sm text-muted-foreground">
                        {position.fundCode} • {position.asset}
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <Badge variant={isLegacy ? 'secondary' : 'default'}>
                      {position.fundClass}
                    </Badge>
                  </TableCell>
                  
                  <TableCell>
                    {isEditing ? (
                      <Input
                        type="number"
                        step="0.0001"
                        value={editValues.shares}
                        onChange={(e) => setEditValues({
                          ...editValues,
                          shares: Number(e.target.value)
                        })}
                        className="w-24"
                      />
                    ) : (
                      <span className="font-mono text-sm">
                        {position.shares.toFixed(4)}
                      </span>
                    )}
                  </TableCell>
                  
                  <TableCell>
                    {isEditing ? (
                      <Input
                        type="number"
                        step="0.01"
                        value={editValues.costBasis}
                        onChange={(e) => setEditValues({
                          ...editValues,
                          costBasis: Number(e.target.value)
                        })}
                        className="w-28"
                      />
                    ) : (
                      <span className="font-mono text-sm">
                        {formatAssetValue(position.costBasis)}
                      </span>
                    )}
                  </TableCell>
                  
                  <TableCell>
                    {isEditing ? (
                      <Input
                        type="number"
                        step="0.01"
                        value={editValues.currentValue}
                        onChange={(e) => setEditValues({
                          ...editValues,
                          currentValue: Number(e.target.value)
                        })}
                        className="w-28"
                      />
                    ) : (
                      <span className="font-mono text-sm font-semibold">
                        {formatAssetValue(position.currentValue)}
                      </span>
                    )}
                  </TableCell>
                  
                  <TableCell>
                    <div className={`flex items-center space-x-1 ${
                      pnl >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {pnl >= 0 ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      <span className="font-mono text-sm">
                        {formatAssetValue(Math.abs(pnl))}
                      </span>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <span className={`font-mono text-sm ${
                      pnlPercent >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%
                    </span>
                  </TableCell>
                  
                  <TableCell>
                    <span className="font-mono text-sm text-green-600">
                      {formatAssetValue(position.totalEarnings)}
                    </span>
                  </TableCell>
                  
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {new Date(position.lastTransactionDate).toLocaleDateString()}
                    </span>
                  </TableCell>
                  
                  <TableCell>
                    {isEditing ? (
                      <div className="flex items-center space-x-1">
                        <Button
                          size="sm"
                          onClick={() => handleSave(position.id, isLegacy)}
                        >
                          <Save className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleCancel}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(position)}
                      >
                        <Edit3 className="h-3 w-3" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {/* Summary Footer */}
        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="font-medium">Total Positions</div>
              <div className="text-2xl font-bold">{positions.length}</div>
            </div>
            <div>
              <div className="font-medium">Total Value</div>
              <div className="text-2xl font-bold">
                {formatAssetValue(positions.reduce((sum, p) => sum + p.currentValue, 0))}
              </div>
            </div>
            <div>
              <div className="font-medium">Total Cost Basis</div>
              <div className="text-2xl font-bold">
                {formatAssetValue(positions.reduce((sum, p) => sum + p.costBasis, 0))}
              </div>
            </div>
            <div>
              <div className="font-medium">Total Earnings</div>
              <div className="text-2xl font-bold text-green-600">
                {formatAssetValue(positions.reduce((sum, p) => sum + p.totalEarnings, 0))}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ExpertPositionsTable;