/**
 * Quick Yield Entry Widget
 * Fast data entry for recording yields without navigating away
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card, CardContent, CardHeader, CardTitle,
  Button, Input, Label, Badge, Skeleton,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui";
import { Calculator, TrendingUp, ArrowRight, Zap } from "lucide-react";
import { toast } from "sonner";
import { CryptoIcon } from "@/components/CryptoIcons";
import { useFunds, useFundsWithAUM } from "@/hooks/data";

export function QuickYieldEntry() {
  const navigate = useNavigate();
  const [selectedFund, setSelectedFund] = useState<string>("");
  const [newAUM, setNewAUM] = useState<string>("");

  // Use the data hook for funds
  const { data: baseFunds, isLoading: fundsLoading } = useFunds(true); // activeOnly

  // Use the dashboard hook for AUM data
  const { data: funds = [], isLoading: aumLoading } = useFundsWithAUM(baseFunds);

  const loading = fundsLoading || aumLoading;

  const selectedFundData = funds.find((f) => f.id === selectedFund);

  const calculateYield = () => {
    if (!selectedFundData || !newAUM) return null;
    const newAUMNum = parseFloat(newAUM);
    if (isNaN(newAUMNum)) return null;

    const yieldAmount = newAUMNum - selectedFundData.currentAUM;
    const yieldPct = selectedFundData.currentAUM > 0
      ? (yieldAmount / selectedFundData.currentAUM) * 100
      : 0;

    return {
      amount: yieldAmount,
      percentage: yieldPct,
    };
  };

  const yieldCalc = calculateYield();

  const handleQuickEntry = () => {
    if (!selectedFund) {
      toast.error("Please select a fund");
      return;
    }

    // Navigate to Monthly Data Entry with pre-selected fund
    navigate(`/admin/monthly-data-entry?fund=${selectedFund}&aum=${newAUM}`);
  };

  const formatCrypto = (value: number, decimals: number = 4) => {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Zap className="h-5 w-5 text-amber-500" />
          Quick Yield Entry
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <>
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
          </>
        ) : (
          <>
            {/* Fund Selector */}
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Select Fund
              </Label>
              <Select value={selectedFund} onValueChange={setSelectedFund}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a fund..." />
                </SelectTrigger>
                <SelectContent>
                  {funds.map((fund) => (
                    <SelectItem key={fund.id} value={fund.id}>
                      <div className="flex items-center gap-2">
                        <CryptoIcon symbol={fund.asset} className="h-4 w-4" />
                        <span>{fund.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Current AUM Display */}
            {selectedFundData && (
              <div className="p-3 rounded-lg bg-muted/50 border">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Current AUM</span>
                  <CryptoIcon symbol={selectedFundData.asset} className="h-4 w-4" />
                </div>
                <div className="text-xl font-mono font-bold mt-1">
                  {formatCrypto(selectedFundData.currentAUM)}{" "}
                  <span className="text-sm text-muted-foreground font-normal">
                    {selectedFundData.asset}
                  </span>
                </div>
              </div>
            )}

            {/* New AUM Input */}
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                New Total AUM
              </Label>
              <Input
                type="number"
                step="any"
                placeholder="Enter new AUM..."
                value={newAUM}
                onChange={(e) => setNewAUM(e.target.value)}
                className="font-mono"
                disabled={!selectedFund}
              />
            </div>

            {/* Yield Preview */}
            {yieldCalc && (
              <div className="p-3 rounded-lg border bg-card">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="text-xs font-medium uppercase tracking-wider">
                    Calculated Yield
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Amount</p>
                    <p
                      className={`text-lg font-mono font-bold ${
                        yieldCalc.amount >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {yieldCalc.amount >= 0 ? "+" : ""}
                      {formatCrypto(yieldCalc.amount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Percentage</p>
                    <Badge
                      variant={yieldCalc.percentage >= 0 ? "default" : "destructive"}
                      className="font-mono"
                    >
                      {yieldCalc.percentage >= 0 ? "+" : ""}
                      {yieldCalc.percentage.toFixed(2)}%
                    </Badge>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="primary"
                className="flex-1 gap-2"
                onClick={handleQuickEntry}
                disabled={!selectedFund || !newAUM}
              >
                <Calculator className="h-4 w-4" />
                Preview Distribution
              </Button>
            </div>

            <Button
              variant="ghost"
              className="w-full text-xs"
              onClick={() => navigate("/admin/monthly-data-entry")}
            >
              Open Full Data Entry
              <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
