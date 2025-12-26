import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { assetService } from "@/services/shared/assetService";
import type { Asset, AssetPrice, AssetPriceFormData } from "@/types/asset";
import { format } from "date-fns";
import { TrendingUp, DollarSign } from "lucide-react";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { invalidateAfterAssetOp } from "@/utils/cacheInvalidation";

interface AssetPriceDialogProps {
  asset: Asset;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AssetPriceDialog({ asset, open, onOpenChange }: AssetPriceDialogProps) {
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [priceData, setPriceData] = useState<AssetPriceFormData>({
    asset_id: asset.asset_id,
    price_usd: 0,
    source: "manual",
  });

  const { data: prices, isLoading } = useQuery({
    queryKey: QUERY_KEYS.assetPrices(asset.asset_id),
    queryFn: () => assetService.getAssetPrices(asset.asset_id, 50),
    enabled: open,
  });

  const { data: latestPrice } = useQuery({
    queryKey: QUERY_KEYS.latestPrice(asset.asset_id),
    queryFn: () => assetService.getLatestPrice(asset.asset_id),
    enabled: open,
  });

  const addPriceMutation = useMutation({
    mutationFn: (data: AssetPriceFormData) => assetService.addAssetPrice(data),
    onSuccess: () => {
      toast.success("Price added successfully");
      invalidateAfterAssetOp(queryClient, asset.asset_id);
      setShowAddForm(false);
      setPriceData({
        asset_id: asset.asset_id,
        price_usd: 0,
        source: "manual",
      });
    },
    onError: (error: Error) => {
      toast.error(`Failed to add price: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addPriceMutation.mutate(priceData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Price History: {asset.symbol}</DialogTitle>
          <DialogDescription>{asset.name}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {latestPrice && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Latest Price
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">${latestPrice.price_usd.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  As of {format(new Date(latestPrice.as_of), "MMM d, yyyy h:mm a")}
                </p>
                {latestPrice.high_24h && latestPrice.low_24h && (
                  <div className="flex items-center gap-4 mt-2 text-sm">
                    <span className="text-muted-foreground">
                      24h High: ${latestPrice.high_24h.toLocaleString()}
                    </span>
                    <span className="text-muted-foreground">
                      24h Low: ${latestPrice.low_24h.toLocaleString()}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {!showAddForm ? (
            <Button onClick={() => setShowAddForm(true)} className="w-full">
              <TrendingUp className="mr-2 h-4 w-4" />
              Add New Price
            </Button>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Add Price Data</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="price_usd">Price (USD) *</Label>
                      <Input
                        id="price_usd"
                        type="number"
                        step="0.01"
                        value={priceData.price_usd}
                        onChange={(e) =>
                          setPriceData({
                            ...priceData,
                            price_usd: parseFloat(e.target.value),
                          })
                        }
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="source">Source</Label>
                      <Input
                        id="source"
                        value={priceData.source}
                        onChange={(e) => setPriceData({ ...priceData, source: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="high_24h">24h High</Label>
                      <Input
                        id="high_24h"
                        type="number"
                        step="0.01"
                        value={priceData.high_24h || ""}
                        onChange={(e) =>
                          setPriceData({
                            ...priceData,
                            high_24h: e.target.value ? parseFloat(e.target.value) : undefined,
                          })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="low_24h">24h Low</Label>
                      <Input
                        id="low_24h"
                        type="number"
                        step="0.01"
                        value={priceData.low_24h || ""}
                        onChange={(e) =>
                          setPriceData({
                            ...priceData,
                            low_24h: e.target.value ? parseFloat(e.target.value) : undefined,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowAddForm(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={addPriceMutation.isPending} className="flex-1">
                      {addPriceMutation.isPending ? "Adding..." : "Add Price"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Price History</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">Loading prices...</div>
              ) : prices?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No price history available
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Price (USD)</TableHead>
                        <TableHead>24h High</TableHead>
                        <TableHead>24h Low</TableHead>
                        <TableHead>Source</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {prices?.map((price: AssetPrice, index: number) => (
                        <TableRow key={index}>
                          <TableCell>
                            {format(new Date(price.as_of), "MMM d, yyyy h:mm a")}
                          </TableCell>
                          <TableCell className="font-semibold">
                            ${price.price_usd.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            {price.high_24h ? `$${price.high_24h.toLocaleString()}` : "—"}
                          </TableCell>
                          <TableCell>
                            {price.low_24h ? `$${price.low_24h.toLocaleString()}` : "—"}
                          </TableCell>
                          <TableCell>{price.source}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
