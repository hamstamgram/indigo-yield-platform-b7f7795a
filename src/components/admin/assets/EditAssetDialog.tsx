import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
  Button, Input, Label, Switch,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui";
import { toast } from "sonner";
import { assetService } from "@/services";
import type { Asset, AssetFormData, AssetKind } from "@/types/asset";
import { invalidateAfterAssetOp } from "@/utils/cacheInvalidation";

interface EditAssetDialogProps {
  asset: Asset;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditAssetDialog({ asset, open, onOpenChange }: EditAssetDialogProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<Partial<AssetFormData>>({});

  useEffect(() => {
    if (asset) {
      setFormData({
        symbol: asset.symbol,
        name: asset.name,
        kind: asset.kind as AssetKind,
        chain: asset.chain,
        decimals: asset.decimals,
        is_active: asset.is_active,
        price_source: asset.price_source,
        coingecko_id: asset.coingecko_id,
      });
    }
  }, [asset]);

  const updateMutation = useMutation({
    mutationFn: (data: Partial<AssetFormData>) => assetService.updateAsset(asset.asset_id, data),
    onSuccess: () => {
      toast.success("Asset updated successfully");
      invalidateAfterAssetOp(queryClient, asset.asset_id);
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(`Failed to update asset: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Asset: {asset.symbol}</DialogTitle>
          <DialogDescription>Update asset information and metadata</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Asset ID</Label>
              <Input value={asset.asset_id} disabled />
            </div>

            <div className="space-y-2">
              <Label htmlFor="symbol">Symbol *</Label>
              <Input
                id="symbol"
                value={formData.symbol || ""}
                onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name || ""}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                value={formData.decimals || 0}
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
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Updating..." : "Update Asset"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
