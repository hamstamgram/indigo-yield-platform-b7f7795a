import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invalidateAfterAssetOp } from "@/utils/cacheInvalidation";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
  Button, Input, Label, Switch,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui";
import { toast } from "sonner";
import { assetService } from "@/services";
import type { AssetFormData, AssetKind } from "@/types/asset";

interface CreateAssetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateAssetDialog({ open, onOpenChange }: CreateAssetDialogProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<AssetFormData>({
    asset_id: "",
    symbol: "",
    name: "",
    kind: "crypto",
    decimals: 8,
    is_active: true,
    price_source: "coingecko",
  });

  const createMutation = useMutation({
    mutationFn: (data: AssetFormData) => assetService.createAsset(data),
    onSuccess: () => {
      toast.success("Asset created successfully");
      invalidateAfterAssetOp(queryClient);
      onOpenChange(false);
      setFormData({
        asset_id: "",
        symbol: "",
        name: "",
        kind: "crypto",
        decimals: 8,
        is_active: true,
        price_source: "coingecko",
      });
    },
    onError: (error: Error) => {
      toast.error(`Failed to create asset: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Asset</DialogTitle>
          <DialogDescription>Add a new asset to the platform</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="asset_id">Asset ID *</Label>
              <Input
                id="asset_id"
                value={formData.asset_id}
                onChange={(e) => setFormData({ ...formData, asset_id: e.target.value })}
                placeholder="e.g., BTC, ETH"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="symbol">Symbol *</Label>
              <Input
                id="symbol"
                value={formData.symbol}
                onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                placeholder="e.g., BTC"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Bitcoin"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="kind">Kind *</Label>
              <Select
                value={formData.kind}
                onValueChange={(value: AssetKind) => setFormData({ ...formData, kind: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="crypto">Crypto</SelectItem>
                  <SelectItem value="token">Token</SelectItem>
                  <SelectItem value="stablecoin">Stablecoin</SelectItem>
                  <SelectItem value="synthetic">Synthetic</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="decimals">Decimals *</Label>
              <Input
                id="decimals"
                type="number"
                min="0"
                max="18"
                value={formData.decimals}
                onChange={(e) => setFormData({ ...formData, decimals: parseInt(e.target.value) })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="chain">Chain</Label>
              <Input
                id="chain"
                value={formData.chain || ""}
                onChange={(e) => setFormData({ ...formData, chain: e.target.value || undefined })}
                placeholder="e.g., Ethereum"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="coingecko_id">CoinGecko ID</Label>
              <Input
                id="coingecko_id"
                value={formData.coingecko_id || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    coingecko_id: e.target.value || undefined,
                  })
                }
                placeholder="e.g., bitcoin"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
            <Label htmlFor="is_active">Active</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create Asset"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
