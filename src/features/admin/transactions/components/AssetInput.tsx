import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useFormContext } from "react-hook-form";
import { Input, Label, Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui";
import { Info } from "lucide-react";
import { fundService } from "@/services/admin";
import { QUERY_KEYS } from "@/constants/queryKeys";
import type { TransactionFormData } from "../hooks/useTransactionForm";

interface PreflowAumInputProps {
  fundId?: string;
  txDate?: string;
  asset: string;
}

export function AssetInput({ fundId, txDate, asset }: PreflowAumInputProps) {
  const {
    register,
    setValue,
    formState: { errors },
  } = useFormContext<TransactionFormData>();

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

  // Auto-populate AUM value with LIVE AUM from positions
  useEffect(() => {
    if (liveNavData?.aum !== undefined && liveNavData.aum !== null) {
      setValue("closing_aum", String(liveNavData.aum), { shouldValidate: true });
    }
  }, [liveNavData?.aum, setValue]);

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
        <span className="text-xs text-blue-600 font-medium">
          (Live: {Number(liveNavData?.aum).toLocaleString()} {asset})
        </span>
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
