/**
 * Edit Fund Dialog
 * Modal for editing fund metadata with ticker change safeguards
 */

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Badge,
} from "@/components/ui";
import { toast } from "sonner";
import { Loader2, AlertTriangle, RotateCcw as ResetIcon, Percent } from "lucide-react";
import { logError } from "@/lib/logger";
import { useAuth } from "@/services/auth";
import { FundLogoUpload } from "./FundLogoUpload";
import { updateFund, checkFundUsage, deleteFund } from "@/features/admin/funds/services/fundService";
import { feeSettingsService } from "@/features/admin/investors/services/feeSettingsService";
import { auditLogService } from "@/services/shared";
import { getTodayUTC } from "@/utils/dateUtils";
import type { Fund } from "@/types/domains/fund";

const editFundSchema = z.object({
  name: z
    .string()
    .min(3, "Name must be at least 3 characters")
    .max(100, "Name must be less than 100 characters"),
  asset: z
    .string()
    .min(2, "Ticker must be at least 2 characters")
    .max(10, "Ticker must be 10 characters or less")
    .regex(/^[A-Z0-9]+$/, "Uppercase letters and numbers only"),
  inception_date: z.string().min(1, "Inception date is required"),
  status: z.enum(["active", "deprecated"]),
  perf_fee_bps: z.number().min(0).max(10000).optional(),
});

type EditFundFormData = z.infer<typeof editFundSchema>;

interface EditFundDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fund: Fund | null;
  onSuccess: () => void;
  existingTickers: string[];
}

export function EditFundDialog({
  open,
  onOpenChange,
  fund,
  onSuccess,
  existingTickers,
}: EditFundDialogProps) {
  const [loading, setLoading] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [tickerChangeBlocked, setTickerChangeBlocked] = useState(false);
  const [confirmTickerChange, setConfirmTickerChange] = useState("");
  const [fundUsageInfo, setFundUsageInfo] = useState<{
    positions: number;
    transactions: number;
  } | null>(null);
  const [isResettingFee, setIsResettingFee] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState("");
  const lastResetId = useRef<string | null>(null);
  const { user } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<EditFundFormData>({
    resolver: zodResolver(editFundSchema),
  });

  const currentTicker = watch("asset");
  const originalTicker = fund?.asset;
  const currentStatus = watch("status");

  // Check if fund has positions/transactions — gate on ID to prevent object-ref re-runs
  useEffect(() => {
    const fundId = fund?.id;
    if (!fundId || !open || lastResetId.current === fundId) return;
    lastResetId.current = fundId;

    checkFundUsageData(fundId);
    reset({
      name: fund.name,
      asset: fund.asset,
      inception_date: fund.inception_date ? fund.inception_date.split("T")[0] : getTodayUTC(),
      status: fund.status as "active" | "deprecated",
      perf_fee_bps: Number(fund.perf_fee_bps) || 0,
    });
    setLogoUrl(fund.logo_url || null);
    setConfirmTickerChange("");
    setConfirmDelete("");
  }, [fund?.id, open, fund?.name, fund?.asset, fund?.inception_date, fund?.status, fund?.perf_fee_bps, fund?.logo_url, reset]);

  const checkFundUsageData = async (fundId: string) => {
    try {
      const usage = await checkFundUsage(fundId);
      setFundUsageInfo(usage);
      setTickerChangeBlocked(usage.positions > 0 || usage.transactions > 0);
    } catch (error) {
      logError("EditFundDialog.checkFundUsage", error, { fundId });
      setTickerChangeBlocked(true);
    }
  };

  const resetToGlobalDefault = async () => {
    setIsResettingFee(true);
    try {
      const globalFee = await feeSettingsService.getGlobalPlatformFee();
      // Convert decimal (0.20) to BPS (2000)
      const globalBps = Math.round(globalFee * 10000);
      setValue("perf_fee_bps", globalBps);
      toast.success(`Fee reset to global default: ${(globalFee * 100).toFixed(0)}%`);
    } catch (error) {
      toast.error("Failed to fetch global fee settings");
    } finally {
      setIsResettingFee(false);
    }
  };

  const handleDelete = async () => {
    if (!fund) return;
    if (confirmDelete !== "DELETE") {
      toast.error("Please type 'DELETE' to confirm");
      return;
    }

    setIsDeleting(true);
    try {
      // The new deleteFund service uses the purge_fund_hard RPC
      const result = await deleteFund(fund.id);

      if (result.success) {
        toast.success(`Fund "${fund.name}" and all associated records purged successfully`);
        onSuccess();
        onOpenChange(false);
      }
    } catch (error: any) {
      logError("EditFundDialog.deleteFund", error, { fundId: fund.id });
      toast.error(error.message || "Failed to delete fund");
    } finally {
      setIsDeleting(false);
    }
  };

  const onSubmit = async (data: EditFundFormData) => {
    if (!fund) return;

    // Check if ticker is being changed
    const tickerChanged = data.asset !== originalTicker;

    // Validate ticker change
    if (tickerChanged) {
      if (tickerChangeBlocked && confirmTickerChange !== "CHANGE TICKER") {
        toast.error("Please type 'CHANGE TICKER' to confirm ticker change");
        return;
      }

      // Check for duplicate tickers
      const otherTickers = existingTickers.filter((t) => t !== originalTicker);
      if (otherTickers.includes(data.asset)) {
        toast.error(`An active fund already exists for ticker ${data.asset}`);
        return;
      }
    }

    // Validate inception date
    const inceptionDate = new Date(data.inception_date);
    if (inceptionDate > new Date()) {
      toast.error("Inception date cannot be in the future");
      return;
    }

    setLoading(true);
    try {
      const oldValues = {
        name: fund.name,
        asset: fund.asset,
        inception_date: fund.inception_date,
        status: fund.status,
        logo_url: fund.logo_url,
        perf_fee_bps: fund.perf_fee_bps,
      };

      const updatePayload: Record<string, any> = {
        name: data.name,
        asset: data.asset.toUpperCase(),
        fund_class: data.asset.toUpperCase(), // Keep in sync
        inception_date: data.inception_date,
        status: data.status,
        logo_url: logoUrl,
        perf_fee_bps: data.perf_fee_bps,
      };

      // Also update code if ticker changed
      if (tickerChanged) {
        updatePayload.code = `IND-${data.asset.toUpperCase()}`;
      }

      await updateFund(fund.id, updatePayload);

      // Audit log using service
      if (user) {
        await auditLogService.logEvent({
          actorUserId: user.id,
          action: "UPDATE_FUND",
          entity: "fund",
          entityId: fund.id,
          oldValues,
          newValues: updatePayload,
        });
      }

      toast.success(`Fund "${data.name}" updated successfully`);
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      logError("EditFundDialog.updateFund", error, { fundId: fund.id });
      toast.error(error.message || "Failed to update fund");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    reset();
    setConfirmTickerChange("");
    onOpenChange(false);
  };

  const tickerIsChanging = currentTicker !== originalTicker;
  const hasUsage = fundUsageInfo && (fundUsageInfo.positions > 0 || fundUsageInfo.transactions > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto bg-slate-900 border-white/10 text-white">
        <DialogHeader className="pb-4 border-b border-white/5">
          <div className="flex items-center gap-3 pr-6">
            <FundLogoUpload
              currentLogoUrl={logoUrl}
              onUpload={setLogoUrl}
              disabled={loading}
              size="sm"
            />
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-xl font-bold truncate" title={fund?.name}>
                {fund?.name || "Edit Fund"}
              </DialogTitle>
              <DialogDescription className="text-slate-400 flex items-center gap-2">
                <span className="truncate max-w-[150px] uppercase font-mono bg-white/5 px-1.5 py-0.5 rounded border border-white/10 text-[10px]">
                  {fund?.asset}
                </span>
                <span className="text-[10px]">•</span>
                <span className="text-[10px]">ID: {fund?.id.slice(0, 8)}...</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Fund Name */}
            <div className="space-y-2 sm:col-span-2">
              <Label
                htmlFor="name"
                className="text-slate-300 text-xs font-medium uppercase tracking-wider"
              >
                Fund Name *
              </Label>
              <Input
                id="name"
                placeholder="e.g., Indigo Bitcoin Yield Fund"
                {...register("name")}
                className={`bg-black/40 border-white/10 text-white focus:border-indigo-500/50 transition-colors ${errors.name ? "border-destructive" : ""}`}
              />
              {errors.name && (
                <p className="text-xs text-destructive mt-1">{errors.name.message}</p>
              )}
            </div>

            {/* Ticker */}
            <div className="space-y-2">
              <Label
                htmlFor="asset"
                className="text-slate-300 text-xs font-medium uppercase tracking-wider"
              >
                Ticker *
              </Label>
              <Input
                id="asset"
                placeholder="e.g., BTC"
                {...register("asset", {
                  onChange: (e) => {
                    e.target.value = e.target.value.toUpperCase();
                  },
                })}
                className={`bg-black/40 border-white/10 text-white font-mono focus:border-indigo-500/50 transition-colors ${errors.asset ? "border-destructive" : ""}`}
              />
              {errors.asset && (
                <p className="text-xs text-destructive mt-1">{errors.asset.message}</p>
              )}
            </div>

            {/* Inception Date */}
            <div className="space-y-2">
              <Label
                htmlFor="inception_date"
                className="text-slate-300 text-xs font-medium uppercase tracking-wider"
              >
                Inception Date *
              </Label>
              <Input
                id="inception_date"
                type="date"
                {...register("inception_date")}
                className={`bg-black/40 border-white/10 text-white focus:border-indigo-500/50 transition-colors ${errors.inception_date ? "border-destructive" : ""}`}
              />
              {errors.inception_date && (
                <p className="text-xs text-destructive mt-1">{errors.inception_date.message}</p>
              )}
            </div>
          </div>

          {/* Ticker change warning - Contextual position */}
          {tickerIsChanging && tickerChangeBlocked && fundUsageInfo && (
            <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 p-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
                <div className="text-xs flex-1">
                  <p className="font-semibold text-amber-200">
                    Sensitive Operation: Asset Ticker Change
                  </p>
                  <p className="text-amber-200/70 mt-1 leading-relaxed">
                    This fund has <strong>{fundUsageInfo.positions} active position(s)</strong> and{" "}
                    <strong>{fundUsageInfo.transactions} transaction(s)</strong>. Changing the
                    ticker will update all linked records.
                  </p>
                  <Label
                    htmlFor="confirmTicker"
                    className="block mt-3 text-amber-200/50 font-medium"
                  >
                    Type <span className="text-amber-200">CHANGE TICKER</span> to confirm:
                  </Label>
                  <Input
                    id="confirmTicker"
                    className="mt-1.5 h-8 bg-black/60 border-amber-500/30 text-amber-100 placeholder:text-amber-500/20 text-xs font-mono"
                    placeholder="CHANGE TICKER"
                    value={confirmTickerChange}
                    onChange={(e) => setConfirmTickerChange(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Status */}
            <div className="space-y-2">
              <Label className="text-slate-300 text-xs font-medium uppercase tracking-wider">
                Deployment Status
              </Label>
              <Select
                value={watch("status")}
                onValueChange={(value) => setValue("status", value as "active" | "deprecated")}
              >
                <SelectTrigger
                  className={`bg-black/40 border-white/10 text-white focus:ring-indigo-500/50 transition-colors ${errors.status ? "border-destructive" : ""}`}
                >
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10 text-white">
                  <SelectItem value="active" className="focus:bg-indigo-600 focus:text-white">
                    Active (Public)
                  </SelectItem>
                  <SelectItem
                    value="deprecated"
                    className="focus:bg-amber-600 focus:text-white text-amber-400"
                  >
                    Archived (Internal Only)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Performance Fee */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="perf_fee_bps"
                  className="text-slate-300 text-xs font-medium uppercase tracking-wider"
                >
                  Perf. Fee (BPS)
                </Label>
                <span className="text-[10px] font-mono text-indigo-400 bg-indigo-400/10 px-1.5 rounded">
                  {((watch("perf_fee_bps") || 0) / 100).toFixed(2)}%
                </span>
              </div>
              <div className="flex gap-2">
                <Input
                  id="perf_fee_bps"
                  type="number"
                  {...register("perf_fee_bps", { valueAsNumber: true })}
                  className="bg-black/40 border-white/10 text-white font-mono focus:border-indigo-500/50 transition-colors"
                  placeholder="2000"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0 border-white/10 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
                  title="Reset to Global Default"
                  onClick={resetToGlobalDefault}
                  disabled={isResettingFee}
                >
                  {isResettingFee ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ResetIcon className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="space-y-4 pt-6 border-t border-rose-500/20">
            <h4 className="text-[10px] font-bold text-rose-500 uppercase tracking-widest flex items-center gap-2">
              <div className="h-px bg-rose-500/20 flex-1" />
              <AlertTriangle className="h-3.5 w-3.5" />
              Serious Actions
              <div className="h-px bg-rose-500/20 flex-1" />
            </h4>

            <div className="rounded-xl bg-rose-500/[0.03] border border-rose-500/10 p-5">
              <div className="flex flex-col gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-white">Purge Fund Relationship</p>
                  <p className="text-[11px] text-slate-400 leading-normal">
                    {currentStatus === "active"
                      ? "This fund is currently ACTIVE. You must ARCHIVE it first before it can be deleted."
                      : hasUsage
                        ? `CRITICAL: This fund has active ledger entries (${fundUsageInfo?.positions} positions, ${fundUsageInfo?.transactions} transactions). Hard deletion is blocked while data exists.`
                        : "Permanent deletion will wipe the fund record and any empty relationship tables. This cannot be undone."}
                  </p>
                </div>

                {currentStatus === "deprecated" && !hasUsage ? (
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <Label htmlFor="confirmPurge" className="sr-only">
                        Type DELETE to confirm
                      </Label>
                      <Input
                        id="confirmPurge"
                        placeholder="Type DELETE"
                        value={confirmDelete}
                        onChange={(e) => setConfirmDelete(e.target.value.toUpperCase())}
                        className="h-10 text-xs bg-black/40 border-rose-500/30 text-rose-100 focus-visible:ring-rose-500 uppercase font-mono"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={handleDelete}
                      disabled={isDeleting || confirmDelete !== "DELETE"}
                      className="bg-rose-600 hover:bg-rose-500 text-white font-bold h-10 px-6 shadow-[0_0_20px_-5px_rgba(225,29,72,0.3)] transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                      {isDeleting && <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />}
                      Purge Permamently
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-300 font-medium">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    {currentStatus === "active"
                      ? "Set status to 'Archived' to enable deletion."
                      : "Clear active positions and transactions to enable deletion."}
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="pt-6 border-t border-white/5 sticky bottom-0 bg-slate-900 pb-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={loading || isDeleting}
              className="border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 transition-colors"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || isDeleting}
              className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_25px_-5px_rgba(79,70,229,0.4)] transition-all hover:scale-[1.02] active:scale-[0.98] px-8"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Configuration
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
