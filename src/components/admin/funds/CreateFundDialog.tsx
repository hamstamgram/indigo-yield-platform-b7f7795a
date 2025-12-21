/**
 * Create Fund Dialog
 * Form for creating new yield funds with validation
 */

import { useState } from "react";
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
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/context";
import { format } from "date-fns";

// Available assets that can be used for funds
const AVAILABLE_ASSETS = [
  "BTC",
  "ETH",
  "SOL",
  "USDT",
  "USDC",
  "EURC",
  "xAUT",
  "XRP",
  "LINK",
  "AVAX",
  "DOT",
  "ADA",
];

const fundSchema = z.object({
  code: z
    .string()
    .min(3, "Code must be at least 3 characters")
    .max(20, "Code must be less than 20 characters")
    .regex(/^[A-Z0-9-]+$/, "Code must be uppercase letters, numbers, and hyphens only"),
  name: z
    .string()
    .min(3, "Name must be at least 3 characters")
    .max(100, "Name must be less than 100 characters"),
  asset: z.string().min(1, "Asset is required"),
  inception_date: z.string().min(1, "Inception date is required"),
  mgmt_fee_bps: z.coerce
    .number()
    .min(0, "Must be 0 or greater")
    .max(1000, "Cannot exceed 10%"),
  perf_fee_bps: z.coerce
    .number()
    .min(0, "Must be 0 or greater")
    .max(5000, "Cannot exceed 50%"),
  min_investment: z.coerce.number().min(0, "Must be 0 or greater"),
  lock_period_days: z.coerce.number().min(0, "Must be 0 or greater").max(365, "Cannot exceed 1 year"),
});

type FundFormData = z.infer<typeof fundSchema>;

interface CreateFundDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  existingAssets: string[];
}

export function CreateFundDialog({
  open,
  onOpenChange,
  onSuccess,
  existingAssets,
}: CreateFundDialogProps) {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<FundFormData>({
    resolver: zodResolver(fundSchema),
    defaultValues: {
      code: "",
      name: "",
      asset: "",
      inception_date: format(new Date(), "yyyy-MM-dd"),
      mgmt_fee_bps: 200,
      perf_fee_bps: 2000,
      min_investment: 1000,
      lock_period_days: 0,
    },
  });

  const selectedAsset = watch("asset");

  // Auto-generate code when asset is selected
  const handleAssetChange = (asset: string) => {
    setValue("asset", asset);
    
    // Auto-generate code if empty
    const currentCode = watch("code");
    if (!currentCode) {
      setValue("code", `IND-${asset}`);
    }
    
    // Auto-generate name if empty
    const currentName = watch("name");
    if (!currentName) {
      const assetNames: Record<string, string> = {
        BTC: "Bitcoin",
        ETH: "Ethereum",
        SOL: "Solana",
        USDT: "Stablecoin",
        USDC: "Stablecoin",
        EURC: "Euro",
        xAUT: "Gold",
        XRP: "Ripple",
        LINK: "Chainlink",
        AVAX: "Avalanche",
        DOT: "Polkadot",
        ADA: "Cardano",
      };
      setValue("name", `Indigo ${assetNames[asset] || asset} Yield Fund`);
    }
  };

  const availableForNewFund = AVAILABLE_ASSETS.filter((a) => !existingAssets.includes(a));

  const onSubmit = async (data: FundFormData) => {
    // Check if asset is already in use
    if (existingAssets.includes(data.asset)) {
      toast.error(`An active fund already exists for ${data.asset}`);
      return;
    }

    setLoading(true);
    try {
      // Check if code already exists
      const { data: existingCode } = await supabase
        .from("funds")
        .select("id")
        .eq("code", data.code)
        .single();

      if (existingCode) {
        toast.error(`Fund code "${data.code}" already exists`);
        setLoading(false);
        return;
      }

      // Create the fund
      const { error: insertError } = await supabase.from("funds").insert({
        code: data.code,
        name: data.name,
        asset: data.asset,
        fund_class: data.asset, // Default fund_class to asset
        inception_date: data.inception_date,
        mgmt_fee_bps: data.mgmt_fee_bps,
        perf_fee_bps: data.perf_fee_bps,
        min_investment: data.min_investment,
        lock_period_days: data.lock_period_days,
        status: "active",
      });

      if (insertError) throw insertError;

      // Audit log
      await supabase.from("audit_log").insert({
        actor_user: user?.id,
        action: "CREATE_FUND",
        entity: "fund",
        entity_id: null,
        new_values: {
          code: data.code,
          name: data.name,
          asset: data.asset,
        },
      });

      toast.success(`Fund "${data.name}" created successfully`);
      reset();
      onSuccess();
    } catch (error: any) {
      console.error("Error creating fund:", error);
      toast.error(error.message || "Failed to create fund");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Fund</DialogTitle>
          <DialogDescription>
            Add a new yield fund. Each active asset can only have one active fund.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Asset Selection */}
          <div className="space-y-2">
            <Label>Asset *</Label>
            <Select value={selectedAsset} onValueChange={handleAssetChange}>
              <SelectTrigger className={errors.asset ? "border-destructive" : ""}>
                <SelectValue placeholder="Select asset" />
              </SelectTrigger>
              <SelectContent>
                {availableForNewFund.length === 0 ? (
                  <SelectItem value="_none" disabled>
                    All assets have active funds
                  </SelectItem>
                ) : (
                  availableForNewFund.map((asset) => (
                    <SelectItem key={asset} value={asset}>
                      {asset}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {errors.asset && <p className="text-sm text-destructive">{errors.asset.message}</p>}
            {existingAssets.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Assets with active funds: {existingAssets.join(", ")}
              </p>
            )}
          </div>

          {/* Fund Code */}
          <div className="space-y-2">
            <Label htmlFor="code">Fund Code *</Label>
            <Input
              id="code"
              placeholder="e.g., IND-BTC"
              {...register("code")}
              className={errors.code ? "border-destructive" : ""}
            />
            {errors.code && <p className="text-sm text-destructive">{errors.code.message}</p>}
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

          {/* Fee Structure */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="mgmt_fee_bps">Management Fee (bps)</Label>
              <Input
                id="mgmt_fee_bps"
                type="number"
                {...register("mgmt_fee_bps")}
                className={errors.mgmt_fee_bps ? "border-destructive" : ""}
              />
              <p className="text-xs text-muted-foreground">200 bps = 2%</p>
              {errors.mgmt_fee_bps && (
                <p className="text-sm text-destructive">{errors.mgmt_fee_bps.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="perf_fee_bps">Performance Fee (bps)</Label>
              <Input
                id="perf_fee_bps"
                type="number"
                {...register("perf_fee_bps")}
                className={errors.perf_fee_bps ? "border-destructive" : ""}
              />
              <p className="text-xs text-muted-foreground">2000 bps = 20%</p>
              {errors.perf_fee_bps && (
                <p className="text-sm text-destructive">{errors.perf_fee_bps.message}</p>
              )}
            </div>
          </div>

          {/* Other Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="min_investment">Min Investment</Label>
              <Input
                id="min_investment"
                type="number"
                {...register("min_investment")}
                className={errors.min_investment ? "border-destructive" : ""}
              />
              {errors.min_investment && (
                <p className="text-sm text-destructive">{errors.min_investment.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lock_period_days">Lock Period (days)</Label>
              <Input
                id="lock_period_days"
                type="number"
                {...register("lock_period_days")}
                className={errors.lock_period_days ? "border-destructive" : ""}
              />
              {errors.lock_period_days && (
                <p className="text-sm text-destructive">{errors.lock_period_days.message}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || availableForNewFund.length === 0}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Fund
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
