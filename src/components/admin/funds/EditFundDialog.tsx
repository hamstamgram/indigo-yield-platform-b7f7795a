/**
 * Edit Fund Dialog
 * Modal for editing fund metadata with ticker change safeguards
 */

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
  Button, Input, Label,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui";
import { toast } from "sonner";
import { Loader2, AlertTriangle } from "lucide-react";
import { useAuth } from "@/services/auth";
import { FundLogoUpload } from "./FundLogoUpload";
import { format } from "date-fns";
import { updateFund, auditLogService, checkFundUsage } from "@/services";

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
});

type EditFundFormData = z.infer<typeof editFundSchema>;

interface Fund {
  id: string;
  code: string;
  name: string;
  asset: string;
  status: string;
  inception_date: string;
  logo_url?: string | null;
}

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
  const [fundUsageInfo, setFundUsageInfo] = useState<{ positions: number; transactions: number } | null>(null);
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
      console.error("Error checking fund usage:", error);
      setTickerChangeBlocked(true);
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
      };

      const updatePayload: Record<string, any> = {
        name: data.name,
        asset: data.asset.toUpperCase(),
        fund_class: data.asset.toUpperCase(), // Keep in sync
        inception_date: data.inception_date,
        status: data.status,
        logo_url: logoUrl,
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
      console.error("Error updating fund:", error);
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
            <FundLogoUpload
              currentLogoUrl={logoUrl}
              onUpload={setLogoUrl}
              disabled={loading}
            />
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
