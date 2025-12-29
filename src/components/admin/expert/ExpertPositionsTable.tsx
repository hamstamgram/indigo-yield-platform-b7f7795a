import React, { useState } from "react";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
  Button, Input, Badge,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui";
import { Edit3, Save, X, TrendingUp, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import { ExpertPosition, expertInvestorService } from "@/services/investor";
import { formatAssetValue } from "@/utils/kpiCalculations";

interface ExpertPositionsTableProps {
  positions: ExpertPosition[];
  onPositionUpdate: () => void;
}

const ExpertPositionsTable: React.FC<ExpertPositionsTableProps> = ({
  positions,
  onPositionUpdate,
}) => {
  const [editingPosition, setEditingPosition] = useState<string | null>(null);
  const [editValues, setEditValues] = useState({
    currentValue: 0,
    costBasis: 0,
    shares: 0,
  });

  const handleEdit = (position: ExpertPosition) => {
    setEditingPosition(position.id);
    setEditValues({
      currentValue: position.current_value,
      costBasis: position.cost_basis,
      shares: position.shares,
    });
  };

  const handleSave = async (positionId: string, _isLegacy: boolean) => {
    try {
      const position = positions.find((p) => p.id === positionId);
      if (!position) {
        toast.error("Position not found");
        return;
      }

      await expertInvestorService.updatePositionValue(
        position.investor_id,
        position.fund_id,
        editValues.currentValue
      );

      setEditingPosition(null);
      onPositionUpdate();
      toast.success("Position updated successfully");
    } catch (error) {
      console.error("Error updating position:", error);
      toast.error("Failed to update position");
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
              const isLegacy = position.fund_class === "Legacy";
              const pnl = calculatePnL(position.current_value, position.cost_basis);
              const pnlPercent = calculatePnLPercent(position.current_value, position.cost_basis);

              return (
                <TableRow key={position.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{position.fund_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {position.fund_code} • {position.asset}
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <Badge variant={isLegacy ? "secondary" : "default"}>{position.fund_class}</Badge>
                  </TableCell>

                  <TableCell>
                    {isEditing ? (
                      <Input
                        type="number"
                        step="0.0001"
                        value={editValues.shares}
                        onChange={(e) =>
                          setEditValues({
                            ...editValues,
                            shares: Number(e.target.value),
                          })
                        }
                        className="w-24"
                      />
                    ) : (
                      <span className="font-mono text-sm">{position.shares.toFixed(4)}</span>
                    )}
                  </TableCell>

                  <TableCell>
                    {isEditing ? (
                      <Input
                        type="number"
                        step="0.01"
                        value={editValues.costBasis}
                        onChange={(e) =>
                          setEditValues({
                            ...editValues,
                            costBasis: Number(e.target.value),
                          })
                        }
                        className="w-28"
                      />
                    ) : (
                      <span className="font-mono text-sm">
                        {formatAssetValue(position.cost_basis, position.asset)}
                      </span>
                    )}
                  </TableCell>

                  <TableCell>
                    {isEditing ? (
                      <Input
                        type="number"
                        step="0.01"
                        value={editValues.currentValue}
                        onChange={(e) =>
                          setEditValues({
                            ...editValues,
                            currentValue: Number(e.target.value),
                          })
                        }
                        className="w-28"
                      />
                    ) : (
                      <span className="font-mono text-sm font-semibold">
                        {formatAssetValue(position.current_value, position.asset)}
                      </span>
                    )}
                  </TableCell>

                  <TableCell>
                    <div
                      className={`flex items-center space-x-1 ${
                        pnl >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {pnl >= 0 ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      <span className="font-mono text-sm">
                        {formatAssetValue(Math.abs(pnl), position.asset)}
                      </span>
                    </div>
                  </TableCell>

                  <TableCell>
                    <span
                      className={`font-mono text-sm ${
                        pnlPercent >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {pnlPercent >= 0 ? "+" : ""}
                      {pnlPercent.toFixed(2)}%
                    </span>
                  </TableCell>

                  <TableCell>
                    <span className="font-mono text-sm text-green-600">
                      {formatAssetValue(position.total_earnings, position.asset)}
                    </span>
                  </TableCell>

                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {position.last_transaction_date
                        ? new Date(position.last_transaction_date).toLocaleDateString()
                        : "—"}
                    </span>
                  </TableCell>

                  <TableCell>
                    {isEditing ? (
                      <div className="flex items-center space-x-1">
                        <Button size="sm" onClick={() => handleSave(position.id, isLegacy)}>
                          <Save className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={handleCancel}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(position)}>
                        <Edit3 className="h-3 w-3" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {/* Summary Footer - Per Asset Totals */}
        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <div className="font-medium mb-4">Summary by Asset</div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(() => {
              // Group positions by asset
              const assetGroups = positions.reduce(
                (acc, pos) => {
                  if (!acc[pos.asset]) {
                    acc[pos.asset] = [];
                  }
                  acc[pos.asset].push(pos);
                  return acc;
                },
                {} as Record<string, typeof positions>
              );

              return Object.entries(assetGroups).map(([asset, assetPositions]) => {
                const totalValue = assetPositions.reduce((sum, p) => sum + p.current_value, 0);
                const totalCost = assetPositions.reduce((sum, p) => sum + p.cost_basis, 0);
                const totalEarnings = assetPositions.reduce((sum, p) => sum + p.total_earnings, 0);
                const totalPnL = totalValue - totalCost;
                const pnlPercent = totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0;

                return (
                  <div key={asset} className="border rounded-lg p-3 bg-white">
                    <div className="font-semibold text-sm mb-2">{asset}</div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Positions:</span>
                        <span className="font-medium">{assetPositions.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Value:</span>
                        <span className="font-medium">{formatAssetValue(totalValue, asset)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Cost:</span>
                        <span className="font-medium">{formatAssetValue(totalCost, asset)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Earnings:</span>
                        <span className="font-medium text-green-600">
                          {formatAssetValue(totalEarnings, asset)}
                        </span>
                      </div>
                      <div className="flex justify-between border-t pt-1">
                        <span className="text-muted-foreground">P&L:</span>
                        <span
                          className={`font-semibold ${totalPnL >= 0 ? "text-green-600" : "text-red-600"}`}
                        >
                          {totalPnL >= 0 ? "+" : ""}
                          {formatAssetValue(Math.abs(totalPnL), asset)} ({pnlPercent.toFixed(2)}%)
                        </span>
                      </div>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ExpertPositionsTable;
