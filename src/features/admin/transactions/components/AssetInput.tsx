import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useFormContext } from "react-hook-form";
import {
  Input,
  Label,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  Alert,
  AlertDescription,
} from "@/components/ui";
import { Info, AlertTriangle } from "lucide-react";
import { fundService } from "@/services/admin";
import { QUERY_KEYS } from "@/constants/queryKeys";
import type { TransactionFormData } from "../hooks/useTransactionForm";
import { toDecimal } from "@/utils/financial";

interface PreflowAumInputProps {
  fundId?: string;
  txDate?: string;
  asset: string;
}

const MAX_AUM_DEVIATION_PCT = 0.1;

export function AssetInput({ fundId, txDate, asset }: PreflowAumInputProps) {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = useFormContext<TransactionFormData>();

  const closingAum = watch("closing_aum");
  const errorMessage = errors.closing_aum?.message;
  const requiresCheck = Boolean(fundId && txDate);

  // Fetch LIVE AUM from positions - always use this as the source of truth
  const { data: liveNavData, isLoading } = useQuery({
    queryKey: QUERY_KEYS.fundLiveAum(fundId),
    queryFn: async () => {
      if (!fundId) return null;
      return fundService.getLatestNav(fundId);
    },
    enabled: requiresCheck,
    staleTime: 10_000,
  });

  const hasLiveAum = liveNavData?.aum !== undefined && liveNavData.aum !== null;

  // Auto-populate AUM with live value — always keep in sync so crystallization uses correct AUM
  useEffect(() => {
    if (liveNavData?.aum !== undefined && liveNavData.aum !== null) {
      setValue("closing_aum", String(liveNavData.aum), { shouldValidate: true });
    }
  }, [liveNavData?.aum, setValue]);

  const deviationWarning = useMemo(() => {
    if (!hasLiveAum || !closingAum) return null;

    try {
      const liveAumDec = toDecimal(liveNavData.aum);
      const enteredAumDec = toDecimal(closingAum);

      if (liveAumDec.isZero()) {
        return enteredAumDec.gt(0)
          ? "Fund currently has zero AUM, but a non-zero snapshot was entered."
          : null;
      }

      const deviation = enteredAumDec.minus(liveAumDec).abs().div(liveAumDec);
      if (deviation.gt(MAX_AUM_DEVIATION_PCT)) {
        return `Entered AUM deviates by ${deviation.times(100).toFixed(1)}% from live value (${liveAumDec.toFixed(4)}). Please verify this snapshot is correct for the transaction date.`;
      }
    } catch {
      return null;
    }
    return null;
  }, [hasLiveAum, liveNavData, closingAum]);

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading current fund AUM…</div>;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label htmlFor="closing_aum">Preflow AUM Snapshot ({asset || "tokens"}) *</Label>
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p>
              The authoritative fund AUM <strong>immediately before</strong> this transaction is
              applied. This is used to crystallize any accrued yield before the capital flow.
            </p>
          </TooltipContent>
        </Tooltip>
      </div>

      {hasLiveAum && (
        <span className="text-xs text-blue-400 font-medium">
          (Live: {Number(liveNavData?.aum).toLocaleString()} {asset})
        </span>
      )}

      {deviationWarning && (
        <Alert variant="destructive" className="py-2 border-orange-500 bg-orange-950/20">
          <AlertTriangle className="h-4 w-4 text-orange-400" />
          <AlertDescription className="text-orange-400 text-xs">
            {deviationWarning}
          </AlertDescription>
        </Alert>
      )}

      <Input
        id="closing_aum"
        type="text"
        inputMode="decimal"
        placeholder={`Enter preflow AUM (${asset})`}
        {...register("closing_aum")}
        className={errorMessage ? "border-destructive" : ""}
      />

      <p className="text-xs text-muted-foreground">
        Fund AUM immediately before this transaction. Pre-filled with current positions total.
      </p>

      {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}
    </div>
  );
}
