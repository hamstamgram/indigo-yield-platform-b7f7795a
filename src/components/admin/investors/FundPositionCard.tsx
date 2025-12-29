/**
 * Fund Position Card - Expandable card with inline yield editing
 * Part of the unified Investor Profile 360 view
 */

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ChevronDown,
  ChevronUp,
  Edit2,
  Save,
  X,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { CryptoIcon } from "@/components/CryptoIcons";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useUpdateFundPerformance } from "@/hooks/admin";

interface PerformanceData {
  mtd_beginning_balance: number;
  mtd_ending_balance: number;
  mtd_additions: number;
  mtd_redemptions: number;
  mtd_net_income: number;
  mtd_rate_of_return: number;
  ytd_net_income: number;
  ytd_rate_of_return: number;
  itd_net_income: number;
  itd_rate_of_return: number;
}

interface FundPositionCardProps {
  fundId: string;
  fundName: string;
  assetCode: string;
  currentBalance: number;
  investorId: string;
  periodId?: string;
  performanceId?: string;
  performance?: PerformanceData | null;
  feePercent?: number;
  onUpdate?: () => void;
}

export function FundPositionCard({
  fundId,
  fundName,
  assetCode,
  currentBalance,
  investorId,
  periodId,
  performanceId,
  performance,
  feePercent = 0.02,
  onUpdate,
}: FundPositionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    mtd_beginning_balance: performance?.mtd_beginning_balance || 0,
    mtd_ending_balance: performance?.mtd_ending_balance || currentBalance,
    mtd_additions: performance?.mtd_additions || 0,
    mtd_redemptions: performance?.mtd_redemptions || 0,
    mtd_net_income: performance?.mtd_net_income || 0,
  });

  const updatePerformanceMutation = useUpdateFundPerformance();
  const isSaving = updatePerformanceMutation.isPending;

  const formatCrypto = (value: number) => {
    const decimals = assetCode === "BTC" ? 8 : assetCode === "ETH" ? 6 : 4;
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  };

  const formatPercent = (value: number | undefined | null) => {
    if (value === undefined || value === null) return "0.00%";
    return `${value >= 0 ? "+" : ""}${(value * 100).toFixed(2)}%`;
  };

  const handleFieldChange = (field: keyof typeof editData, value: string) => {
    const numValue = parseFloat(value) || 0;
    setEditData((prev) => {
      const updated = { ...prev, [field]: numValue };
      // Auto-calculate net income
      if (field !== "mtd_net_income") {
        updated.mtd_net_income =
          updated.mtd_ending_balance -
          updated.mtd_beginning_balance -
          updated.mtd_additions +
          updated.mtd_redemptions;
      }
      return updated;
    });
  };

  const handleSave = () => {
    if (!performanceId) {
      toast.error("No performance record to update");
      return;
    }

    updatePerformanceMutation.mutate(
      { performanceId, data: editData },
      {
        onSuccess: () => {
          toast.success("Performance data updated");
          setIsEditing(false);
          onUpdate?.();
        },
        onError: (error) => {
          console.error("Error saving performance:", error);
          toast.error("Failed to save changes");
        },
      }
    );
  };

  const handleCancel = () => {
    setEditData({
      mtd_beginning_balance: performance?.mtd_beginning_balance || 0,
      mtd_ending_balance: performance?.mtd_ending_balance || currentBalance,
      mtd_additions: performance?.mtd_additions || 0,
      mtd_redemptions: performance?.mtd_redemptions || 0,
      mtd_net_income: performance?.mtd_net_income || 0,
    });
    setIsEditing(false);
  };

  const mtdYield = performance?.mtd_net_income || 0;
  const mtdReturn = performance?.mtd_rate_of_return || 0;

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <Card
        className={cn(
          "transition-all duration-200",
          isExpanded && "ring-2 ring-primary shadow-lg"
        )}
      >
        {/* Collapsed Header */}
        <CollapsibleTrigger asChild>
          <div className="p-4 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CryptoIcon symbol={assetCode} className="h-10 w-10" />
                <div>
                  <h3 className="font-semibold">{fundName}</h3>
                  <p className="text-sm text-muted-foreground">{assetCode} Fund</p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                {/* Current Balance */}
                <div className="text-right">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Balance</p>
                  <p className="text-lg font-mono font-bold">
                    {formatCrypto(currentBalance)} <span className="text-sm text-muted-foreground">{assetCode}</span>
                  </p>
                </div>

                {/* MTD Yield */}
                <div className="text-right">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">MTD Yield</p>
                  <div className="flex items-center gap-1 justify-end">
                    {mtdYield >= 0 ? (
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    )}
                    <p className={cn(
                      "text-lg font-mono font-bold",
                      mtdYield >= 0 ? "text-green-600" : "text-red-600"
                    )}>
                      {mtdYield >= 0 ? "+" : ""}{formatCrypto(mtdYield)}
                    </p>
                  </div>
                </div>

                {/* Fee Badge */}
                <Badge variant="outline" className="font-mono">
                  {(feePercent * 100).toFixed(1)}% fee
                </Badge>

                {/* Expand Icon */}
                {isExpanded ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </div>
          </div>
        </CollapsibleTrigger>

        {/* Expanded Content */}
        <CollapsibleContent>
          <CardContent className="border-t pt-4 space-y-4">
            {/* Quick Stats Row */}
            <div className="grid grid-cols-4 gap-4 p-3 bg-muted/30 rounded-lg">
              <div>
                <p className="text-xs text-muted-foreground">MTD Return</p>
                <p className={cn(
                  "text-sm font-mono font-semibold",
                  mtdReturn >= 0 ? "text-green-600" : "text-red-600"
                )}>
                  {formatPercent(mtdReturn)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">YTD Income</p>
                <p className="text-sm font-mono font-semibold">
                  {formatCrypto(performance?.ytd_net_income || 0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">YTD Return</p>
                <p className={cn(
                  "text-sm font-mono font-semibold",
                  (performance?.ytd_rate_of_return || 0) >= 0 ? "text-green-600" : "text-red-600"
                )}>
                  {formatPercent(performance?.ytd_rate_of_return)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">ITD Income</p>
                <p className="text-sm font-mono font-semibold">
                  {formatCrypto(performance?.itd_net_income || 0)}
                </p>
              </div>
            </div>

            {/* Capital Account Summary - Editable */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Capital Account Summary (MTD)
                </h4>
                {!isEditing ? (
                  <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                    <Edit2 className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={handleCancel} disabled={isSaving}>
                      <X className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={isSaving}>
                      <Save className="h-4 w-4 mr-1" />
                      {isSaving ? "Saving..." : "Save"}
                    </Button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-5 gap-3">
                {/* Beginning Balance */}
                <div className="space-y-1">
                  <Label className="text-xs">Beginning Balance</Label>
                  {isEditing ? (
                    <Input
                      type="number"
                      step="any"
                      value={editData.mtd_beginning_balance}
                      onChange={(e) => handleFieldChange("mtd_beginning_balance", e.target.value)}
                      className="font-mono h-9"
                    />
                  ) : (
                    <p className="font-mono text-sm py-2">
                      {formatCrypto(performance?.mtd_beginning_balance || 0)}
                    </p>
                  )}
                </div>

                {/* Additions */}
                <div className="space-y-1">
                  <Label className="text-xs">Additions</Label>
                  {isEditing ? (
                    <Input
                      type="number"
                      step="any"
                      value={editData.mtd_additions}
                      onChange={(e) => handleFieldChange("mtd_additions", e.target.value)}
                      className="font-mono h-9"
                    />
                  ) : (
                    <p className="font-mono text-sm py-2 text-green-600">
                      +{formatCrypto(performance?.mtd_additions || 0)}
                    </p>
                  )}
                </div>

                {/* Redemptions */}
                <div className="space-y-1">
                  <Label className="text-xs">Redemptions</Label>
                  {isEditing ? (
                    <Input
                      type="number"
                      step="any"
                      value={editData.mtd_redemptions}
                      onChange={(e) => handleFieldChange("mtd_redemptions", e.target.value)}
                      className="font-mono h-9"
                    />
                  ) : (
                    <p className="font-mono text-sm py-2 text-red-600">
                      -{formatCrypto(performance?.mtd_redemptions || 0)}
                    </p>
                  )}
                </div>

                {/* Net Income (Auto-calculated) */}
                <div className="space-y-1">
                  <Label className="text-xs">Net Income</Label>
                  {isEditing ? (
                    <div className="relative">
                      <Input
                        type="number"
                        step="any"
                        value={editData.mtd_net_income.toFixed(8)}
                        onChange={(e) => handleFieldChange("mtd_net_income", e.target.value)}
                        className="font-mono h-9 bg-green-50 dark:bg-green-900/20"
                      />
                    </div>
                  ) : (
                    <p className={cn(
                      "font-mono text-sm py-2 font-semibold",
                      (performance?.mtd_net_income || 0) >= 0 ? "text-green-600" : "text-red-600"
                    )}>
                      {(performance?.mtd_net_income || 0) >= 0 ? "+" : ""}
                      {formatCrypto(performance?.mtd_net_income || 0)}
                    </p>
                  )}
                </div>

                {/* Ending Balance */}
                <div className="space-y-1">
                  <Label className="text-xs">Ending Balance</Label>
                  {isEditing ? (
                    <Input
                      type="number"
                      step="any"
                      value={editData.mtd_ending_balance}
                      onChange={(e) => handleFieldChange("mtd_ending_balance", e.target.value)}
                      className="font-mono h-9"
                    />
                  ) : (
                    <p className="font-mono text-sm py-2 font-semibold">
                      {formatCrypto(performance?.mtd_ending_balance || currentBalance)}
                    </p>
                  )}
                </div>
              </div>

              {/* Validation Message */}
              {isEditing && (
                <div className="p-2 rounded bg-muted/50 text-xs text-muted-foreground">
                  <span className="font-medium">Formula:</span> Beginning + Additions - Redemptions + Net Income = Ending
                  <span className="ml-2">
                    ({formatCrypto(editData.mtd_beginning_balance)} + {formatCrypto(editData.mtd_additions)} - {formatCrypto(editData.mtd_redemptions)} + {formatCrypto(editData.mtd_net_income)} = {formatCrypto(editData.mtd_beginning_balance + editData.mtd_additions - editData.mtd_redemptions + editData.mtd_net_income)})
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
