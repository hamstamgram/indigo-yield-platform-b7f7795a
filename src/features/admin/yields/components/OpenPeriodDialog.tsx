/**
 * Open Period Dialog
 * Allows admins to create a baseline AUM record for a fund
 * This is required before yield can be distributed
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import { Loader2 } from "lucide-react";
import { CryptoIcon } from "@/components/CryptoIcons";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { getTodayUTC } from "@/utils/dateUtils";
import { fundDailyAumService } from "@/services/shared/fundDailyAumService";
import { useAuth } from "@/services/auth";
import { useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS, YIELD_RELATED_KEYS } from "@/constants/queryKeys";

interface Fund {
  id: string;
  name: string;
  code: string;
  asset: string;
  total_aum: number;
  investor_count: number;
}

interface OpenPeriodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fund: Fund | null;
  onSuccess?: () => void;
}

export function OpenPeriodDialog({ open, onOpenChange, fund, onSuccess }: OpenPeriodDialogProps) {
  const [baselineAum, setBaselineAum] = useState("");
  const [baselineDate, setBaselineDate] = useState<string>(getTodayUTC());
  const [purpose, setPurpose] = useState<"reporting" | "transaction">("transaction");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { user } = useAuth();
  const queryClient = useQueryClient();

  const handleSubmit = async () => {
    if (!fund || !baselineAum || !user) return;

    const aumValue = parseFloat(baselineAum);
    if (isNaN(aumValue) || aumValue <= 0) {
      toast.error("Please enter a valid positive AUM value.");
      return;
    }

    setIsSubmitting(true);
    try {
      await fundDailyAumService.createBaselineAUM({
        fundId: fund.id,
        date: baselineDate,
        totalAum: aumValue,
        purpose,
        createdBy: user.id,
      });

      toast.success(`Baseline AUM created for ${fund.name}`);

      // Invalidate relevant queries
      YIELD_RELATED_KEYS.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.funds });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.activeFundsWithAUM });

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create baseline AUM");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatValue = (value: number, asset: string) => {
    if (asset === "BTC") {
      return value.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 8 });
    } else if (asset === "ETH" || asset === "SOL") {
      return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 6 });
    }
    return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {fund && <CryptoIcon symbol={fund.asset} className="h-6 w-6" />}
            Open Period - {fund?.name}
          </DialogTitle>
          <DialogDescription>
            Create a baseline AUM record to enable yield distribution.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current Position Sum */}
          {fund && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground uppercase mb-1">Current Position Sum</p>
              <p className="text-lg font-mono font-semibold">
                {formatValue(fund.total_aum, fund.asset)} {fund.asset}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Based on {fund.investor_count} investor position
                {fund.investor_count !== 1 ? "s" : ""}
              </p>
            </div>
          )}

          {/* Baseline AUM Input */}
          <div className="space-y-2">
            <Label htmlFor="baseline-aum">Baseline AUM ({fund?.asset})</Label>
            <Input
              id="baseline-aum"
              type="number"
              step="any"
              value={baselineAum}
              onChange={(e) => setBaselineAum(e.target.value)}
              placeholder={fund ? String(fund.total_aum) : "Enter baseline AUM"}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Usually matches the sum of investor positions
            </p>
          </div>

          {/* Date Picker */}
          <div className="space-y-2">
            <Label htmlFor="effective-date">Effective Date</Label>
            <div className="relative">
              <Input
                id="effective-date"
                type="date"
                value={baselineDate}
                onChange={(e) => setBaselineDate(e.target.value)}
                className="w-full pl-3 pr-10"
              />
            </div>
          </div>

          {/* Purpose Selector */}
          <div className="space-y-2">
            <Label>Purpose</Label>
            <Select
              value={purpose}
              onValueChange={(v) => setPurpose(v as "reporting" | "transaction")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="transaction">Transaction (mid-month operational)</SelectItem>
                <SelectItem value="reporting">Reporting (month-end finalized)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!baselineAum || isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Baseline
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
