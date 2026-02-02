/**
 * Create Fund Dialog
 * Form for creating new yield funds with validation
 * Token-denominated only - no fee management (fees are per-investor)
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
  Button,
  Input,
  Label,
} from "@/components/ui";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useCreateFund } from "@/hooks/data";
import { format } from "date-fns";
import { FundLogoUpload } from "./FundLogoUpload";

const fundSchema = z.object({
  name: z
    .string()
    .min(3, "Name must be at least 3 characters")
    .max(100, "Name must be less than 100 characters"),
  asset: z
    .string()
    .min(2, "Ticker must be at least 2 characters")
    .max(10, "Ticker must be 10 characters or less")
    .regex(/^[A-Z0-9]+$/, "Uppercase letters and numbers only"),
  code: z
    .string()
    .min(3, "Code must be at least 3 characters")
    .max(20, "Code must be less than 20 characters")
    .regex(/^[A-Z0-9-]+$/, "Uppercase letters, numbers, and hyphens only")
    .optional(),
  inception_date: z.string().min(1, "Inception date is required"),
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
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const createFundMutation = useCreateFund();
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
    },
  });

  const tickerValue = watch("asset");

  // Auto-generate code when ticker changes
  const handleTickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    setValue("asset", value);

    // Auto-generate code if it's empty or was auto-generated
    const currentCode = watch("code");
    if (!currentCode || currentCode.startsWith("IND-")) {
      setValue("code", value ? `IND-${value}` : "");
    }
  };

  const onSubmit = async (data: FundFormData) => {
    const normalizedTicker = data.asset.toUpperCase();

    // Check if ticker is already in use
    if (existingAssets.map((a) => a.toUpperCase()).includes(normalizedTicker)) {
      toast.error(`An active fund already exists for ${normalizedTicker}`);
      return;
    }

    // Validate inception date not in future
    const inceptionDate = new Date(data.inception_date);
    if (inceptionDate > new Date()) {
      toast.error("Inception date cannot be in the future");
      return;
    }

    const code = data.code || `IND-${normalizedTicker}`;

    createFundMutation.mutate(
      {
        code,
        name: data.name,
        asset: normalizedTicker,
        inception_date: data.inception_date,
        logo_url: logoUrl,
      },
      {
        onSuccess: () => {
          reset();
          setLogoUrl(null);
          onSuccess();
        },
      }
    );
  };

  const loading = createFundMutation.isPending;

  const handleCancel = () => {
    reset();
    setLogoUrl(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Fund</DialogTitle>
          <DialogDescription>
            Add a new yield fund. Each ticker can only have one active fund.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Logo Upload */}
          <div className="space-y-2">
            <Label>Fund Logo (optional)</Label>
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
              placeholder="e.g., BTC, ETH, USDT"
              value={tickerValue}
              onChange={handleTickerChange}
              className={errors.asset ? "border-destructive" : ""}
            />
            <p className="text-xs text-muted-foreground">
              Uppercase letters and numbers only (2-10 characters)
            </p>
            {errors.asset && <p className="text-sm text-destructive">{errors.asset.message}</p>}
            {existingAssets.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Active tickers: {existingAssets.join(", ")}
              </p>
            )}
          </div>

          {/* Fund Code (optional, auto-generated) */}
          <div className="space-y-2">
            <Label htmlFor="code">Fund Code (optional)</Label>
            <Input
              id="code"
              placeholder="Auto-generated from ticker"
              {...register("code")}
              className={errors.code ? "border-destructive" : ""}
            />
            <p className="text-xs text-muted-foreground">
              Leave empty to auto-generate (e.g., IND-BTC)
            </p>
            {errors.code && <p className="text-sm text-destructive">{errors.code.message}</p>}
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Fund
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
