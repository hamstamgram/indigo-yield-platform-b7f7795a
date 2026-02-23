/**
 * Edit Fund Dialog
 * Modal for editing fund metadata with ticker change safeguards
 */

import { useState, useEffect } from "react";
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
import { updateFund, checkFundUsage, feeSettingsService, deleteFund } from "@/services/admin";
import { auditLogService } from "@/services/shared";
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

  // Check if fund has positions/transactions
  useEffect(() => {
    if (fund && open) {
      checkFundUsageData(fund.id);
      reset({
        name: fund.name,
        asset: fund.asset,
        inception_date: fund.inception_date,
        status: fund.status as "active" | "deprecated",
        perf_fee_bps: Number(fund.perf_fee_bps) || 0,
      });
      setLogoUrl(fund.logo_url || null);
      setConfirmTickerChange("");
    }
  }, [fund, open, reset]);

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Fund</DialogTitle>
          <DialogDescription>
            Update fund metadata. Fund ID remains unchanged for all relationships.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Logo Upload */}
          <div className="space-y-2">
            <Label>Fund Logo</Label>
            <FundLogoUpload currentLogoUrl={logoUrl} onUpload={setLogoUrl} disabled={loading} />
          </div>

          {/* Fund Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Fund Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Indigo Bitcoin Yield Fund"
              {...register("name")}
              className={errors.name ? "border-destructive" : ""}
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          {/* Ticker */}
          <div className="space-y-2">
            <Label htmlFor="asset">Ticker *</Label>
            <Input
              id="asset"
              placeholder="e.g., BTC"
              {...register("asset", {
                onChange: (e) => {
                  e.target.value = e.target.value.toUpperCase();
                },
              })}
              className={errors.asset ? "border-destructive" : ""}
            />
            {errors.asset && <p className="text-sm text-destructive">{errors.asset.message}</p>}

            {/* Ticker change warning */}
            {tickerIsChanging && tickerChangeBlocked && fundUsageInfo && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 mt-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-destructive">
                      Changing ticker requires confirmation
                    </p>
                    <p className="text-muted-foreground mt-1">
                      This fund has {fundUsageInfo.positions} position(s) and{" "}
                      {fundUsageInfo.transactions} transaction(s). Type{" "}
                      <strong>CHANGE TICKER</strong> below to confirm.
                    </p>
                    <Input
                      className="mt-2"
                      placeholder="Type CHANGE TICKER to confirm"
                      value={confirmTickerChange}
                      onChange={(e) => setConfirmTickerChange(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Inception Date */}
          <div className="space-y-2">
            <Label htmlFor="inception_date">Inception Date *</Label>
            <Input
              id="inception_date"
              type="date"
              {...register("inception_date")}
              className={errors.inception_date ? "border-destructive" : ""}
            />
            {errors.inception_date && (
              <p className="text-sm text-destructive">{errors.inception_date.message}</p>
            )}
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={watch("status")}
              onValueChange={(value) => setValue("status", value as "active" | "deprecated")}
            >
              <SelectTrigger className={errors.status ? "border-destructive" : ""}>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="deprecated">Archived</SelectItem>
              </SelectContent>
            </Select>
            {errors.status && <p className="text-sm text-destructive">{errors.status.message}</p>}
          </div>

          {/* Fee Configuration */}
          <div className="space-y-4 pt-4 border-t border-white/5">
            <h4 className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <Percent className="h-4 w-4 text-indigo-400" />
              Fee Configuration
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="perf_fee_bps" className="text-slate-400">
                  Default Performance Fee (Basis Points)
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="perf_fee_bps"
                    type="number"
                    {...register("perf_fee_bps", { valueAsNumber: true })}
                    className="bg-black/20 border-white/10 text-white font-mono"
                    placeholder="e.g. 2000 for 20%"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0 border-white/10 hover:bg-white/5 text-slate-400 hover:text-white"
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
                <p className="text-[10px] text-slate-500">
                  Currently set to {((watch("perf_fee_bps") || 0) / 100).toFixed(2)}%
                </p>
                {errors.perf_fee_bps && (
                  <p className="text-sm text-destructive">{errors.perf_fee_bps.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="space-y-4 pt-6 mt-4 border-t border-rose-500/20">
            <h4 className="text-sm font-medium text-rose-400 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Danger Zone
            </h4>
            <div className="rounded-xl bg-rose-500/5 border border-rose-500/10 p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-white">Delete Fund</p>
                  <p className="text-xs text-slate-400">
                    {watch("status") === "active"
                      ? "Fund must be Archived before it can be deleted."
                      : "Permanentely purge this fund and all associated records."}
                  </p>
                </div>

                {watch("status") === "deprecated" ? (
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Type DELETE"
                      value={confirmDelete}
                      onChange={(e) => setConfirmDelete(e.target.value.toUpperCase())}
                      className="max-w-[120px] h-8 text-xs bg-black/40 border-rose-500/30 text-rose-200 focus-visible:ring-rose-500"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={handleDelete}
                      disabled={isDeleting || confirmDelete !== "DELETE"}
                      className="h-8 text-xs px-4 bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_15px_-5px_rgba(244,63,94,0.4)]"
                    >
                      {isDeleting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                      Purge Fund
                    </Button>
                  </div>
                ) : (
                  <Badge variant="outline" className="text-slate-500 border-slate-700 h-6">
                    Active Funds Cannot Be Purged
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="pt-6 border-t border-white/5">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={loading || isDeleting}
              className="border-white/10 hover:bg-white/5 text-slate-300"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || isDeleting}
              className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_20px_-5px_rgba(99,102,241,0.4)]"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
