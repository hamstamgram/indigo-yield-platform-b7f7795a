import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  TrendingDown,
  Edit2,
  Check,
  X,
  History,
  Info,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatAssetValue } from "@/utils/formatters";
import { toNum } from "@/utils/numeric";
import { FinancialValue } from "@/components/common/FinancialValue";
import Decimal from "decimal.js";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatPercentage } from "@/utils/formatters";
import { formatAdminNumber } from "@/utils/assets";

interface ExpertPositionsTableProps {
  investorId: string;
  positions: any[];
  onRefresh: () => void;
}

export const ExpertPositionsTable = ({
  investorId,
  positions,
  onRefresh,
}: ExpertPositionsTableProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState({
    shares: 0,
    costBasis: 0,
    currentValue: 0,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEdit = (position: any) => {
    setEditingId(position.id);
    setEditValues({
      shares: position.shares,
      costBasis: position.cost_basis,
      currentValue: position.current_value,
    });
  };

  const handleCancel = () => {
    setEditingId(null);
  };

  const handleSave = async (positionId: string) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("investor_positions" as any)
        .update({
          shares: editValues.shares,
          cost_basis: editValues.costBasis,
          current_value: editValues.currentValue,
          updated_at: new Date().toISOString(),
        })
        .eq("id", positionId);

      if (error) throw error;

      toast.success("Position updated successfully");
      setEditingId(null);
      onRefresh();
    } catch (error: any) {
      toast.error(`Failed to update position: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!positions || positions.length === 0) {
    return (
      <Card className="border-white/5 bg-card/50">
        <CardContent className="py-8 text-center text-muted-foreground">
          No active positions found for this investor.
        </CardContent>
      </Card>
    );
  }

  // Group by asset for totals
  const assetTotals = positions.reduce((acc: any, pos) => {
    const asset = pos.asset;
    if (!acc[asset]) acc[asset] = { totalValue: new Decimal(0), totalPnL: new Decimal(0), count: 0 };
    acc[asset].totalValue = acc[asset].totalValue.plus(pos.current_value);
    acc[asset].totalPnL = acc[asset].totalPnL.plus(pos.current_value).minus(pos.cost_basis);
    acc[asset].count += 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(assetTotals).map(([asset, data]: [string, any]) => {
          const totalValue = data.totalValue.toString();
          const totalPnLDec = data.totalPnL;
          const totalCostBasis = data.totalValue.minus(totalPnLDec);
          const pnlPercent = totalCostBasis.gt(0) 
            ? totalPnLDec.div(totalCostBasis).times(100).toNumber() 
            : 0;

          return (
            <Card key={asset} className="border-white/5 bg-card/30 backdrop-blur-sm">
              <CardHeader className="py-3 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  {asset} Portfolio
                </CardTitle>
                <Badge variant="outline" className="bg-white/5 border-white/10 text-[10px]">
                  {data.count} {data.count === 1 ? 'Fund' : 'Funds'}
                </Badge>
              </CardHeader>
              <CardContent className="py-2 pb-4">
                <div className="text-xl font-bold tracking-tight">
                  <FinancialValue value={totalValue} asset={asset} />
                </div>
                <div className={`text-xs mt-1 font-medium flex items-center gap-1 ${totalPnLDec.gte(0) ? 'text-yield' : 'text-rose-400'}`}>
                  {totalPnLDec.gte(0) ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  <FinancialValue value={totalPnLDec.abs().toString()} asset={asset} showAsset={false} /> ({formatPercentage(pnlPercent, 4)})
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-white/5 bg-card/50 overflow-hidden shadow-xl">
        <CardHeader className="bg-white/[0.02] border-b border-white/5 py-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <History className="h-4 w-4 text-emerald-400" />
              Live Asset Holdings
            </CardTitle>
            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="p-1 rounded-full hover:bg-white/5 cursor-help">
                      <Info className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs text-xs">
                    Expert mode allows direct modification of position ledger records. Use with caution.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-white/[0.01]">
              <TableRow className="border-white/5 hover:bg-transparent">
                <TableHead className="h-9 text-[10px] font-bold uppercase tracking-widest text-muted-foreground pl-6">
                  Fund
                </TableHead>
                <TableHead className="h-9 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Asset
                </TableHead>
                <TableHead className="h-9 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-right">
                  Shares
                </TableHead>
                <TableHead className="h-9 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-right">
                  Cost Basis
                </TableHead>
                <TableHead className="h-9 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-right">
                  Value
                </TableHead>
                <TableHead className="h-9 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-right">
                  PnL
                </TableHead>
                <TableHead className="h-9 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-right">
                  %
                </TableHead>
                <TableHead className="h-9 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-right">
                  Earnings
                </TableHead>
                <TableHead className="h-9 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Last Update
                </TableHead>
                <TableHead className="h-9 w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {positions.map((position) => {
                const pnl = position.current_value - position.cost_basis;
                const pnlPercent = position.cost_basis > 0 ? (pnl / position.cost_basis) * 100 : 0;
                const isEditing = editingId === position.id;
                const asset = position.asset || "BTC";

                return (
                  <TableRow
                    key={position.id}
                    className="border-white/5 hover:bg-white/[0.02] transition-colors group"
                  >
                    <TableCell className="py-1.5 pl-6">
                      <div className="font-semibold text-sm text-white/90">
                        {position.funds?.name || "Unknown Fund"}
                      </div>
                      <div className="text-[10px] font-mono text-muted-foreground uppercase">
                        {position.funds?.code}
                      </div>
                    </TableCell>

                    <TableCell className="py-1.5">
                      <Badge variant="outline" className="bg-white/5 border-white/10 text-[10px] font-mono">
                        {asset}
                      </Badge>
                    </TableCell>

                    <TableCell className="py-1.5 text-right">
                      {isEditing ? (
                        <Input
                          type="number"
                          step="0.00000001"
                          value={editValues.shares}
                          onChange={(e) =>
                            setEditValues({
                              ...editValues,
                              shares: toNum(e.target.value),
                            })
                          }
                          className="w-24 ml-auto text-right"
                        />
                      ) : (
                        <span className="font-mono tabular-nums">{formatAdminNumber(position.shares, asset)}</span>
                      )}
                    </TableCell>

                    <TableCell className="py-1.5 text-right">
                      {isEditing ? (
                        <Input
                          type="number"
                          step="0.01"
                          value={editValues.costBasis}
                          onChange={(e) =>
                            setEditValues({
                              ...editValues,
                              costBasis: toNum(e.target.value),
                            })
                          }
                          className="w-28 ml-auto text-right"
                        />
                      ) : (
                        <span className="font-mono tabular-nums">
                          {formatAssetValue(position.cost_basis, position.asset)}
                        </span>
                      )}
                    </TableCell>

                    <TableCell className="py-1.5 text-right">
                      {isEditing ? (
                        <Input
                          type="number"
                          step="0.01"
                          value={editValues.currentValue}
                          onChange={(e) =>
                            setEditValues({
                              ...editValues,
                              currentValue: toNum(e.target.value),
                            })
                          }
                          className="w-28 ml-auto text-right"
                        />
                      ) : (
                        <span className="font-mono tabular-nums font-semibold">
                          {formatAssetValue(position.current_value, position.asset)}
                        </span>
                      )}
                    </TableCell>

                    <TableCell className="py-1.5 text-right">
                      <div
                        className={`flex items-center justify-end space-x-1 ${
                          pnl >= 0 ? "text-yield" : "text-rose-400"
                        }`}
                      >
                        {pnl >= 0 ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        <span className="font-mono tabular-nums">
                          {formatAssetValue(Math.abs(pnl), position.asset)}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="py-1.5 text-right">
                      <span
                        className={`font-mono tabular-nums ${
                          pnlPercent >= 0 ? "text-yield" : "text-rose-400"
                        }`}
                      >
                        {pnlPercent >= 0 ? "+" : ""}
                        {formatPercentage(pnlPercent, 4)}
                      </span>
                    </TableCell>

                    <TableCell className="py-1.5 text-right">
                      <span className="font-mono tabular-nums text-yield">
                        {formatAssetValue(position.total_earnings, position.asset)}
                      </span>
                    </TableCell>

                    <TableCell className="py-1.5">
                      <span className="text-muted-foreground whitespace-nowrap text-xs">
                        {position.last_transaction_date
                          ? new Date(position.last_transaction_date).toLocaleDateString()
                          : "—"}
                      </span>
                    </TableCell>

                    <TableCell className="py-1.5 pr-6 text-right">
                      {isEditing ? (
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                            onClick={() => handleSave(position.id)}
                            disabled={isSubmitting}
                          >
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                            onClick={handleCancel}
                            disabled={isSubmitting}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleEdit(position)}
                        >
                          <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
