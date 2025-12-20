import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Edit, TrendingUp } from "lucide-react";
import { assetService } from "@/services/shared/assetService";
import { EditAssetDialog } from "./EditAssetDialog";
import { AssetPriceDialog } from "./AssetPriceDialog";
import type { Asset } from "@/types/asset";
import { format } from "date-fns";

export function AssetsTable() {
  const [search, setSearch] = useState("");
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [priceDialogAsset, setPriceDialogAsset] = useState<Asset | null>(null);

  const { data: assets, isLoading } = useQuery({
    queryKey: ["assets", { search }],
    queryFn: () => assetService.getAssets({ search }),
  });

  if (isLoading) {
    return <div className="text-center py-8">Loading assets...</div>;
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by symbol, name, or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Symbol</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Kind</TableHead>
                <TableHead>Chain</TableHead>
                <TableHead>Decimals</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assets?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    No assets found
                  </TableCell>
                </TableRow>
              ) : (
                assets?.map((asset: Asset) => (
                  <TableRow key={asset.asset_id}>
                    <TableCell className="font-mono font-semibold">{asset.symbol}</TableCell>
                    <TableCell>{asset.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{asset.kind}</Badge>
                    </TableCell>
                    <TableCell>{asset.chain || "—"}</TableCell>
                    <TableCell>{asset.decimals}</TableCell>
                    <TableCell>
                      {asset.is_active ? (
                        <Badge variant="default">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell>{format(new Date(asset.created_at), "MMM d, yyyy")}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPriceDialogAsset(asset)}
                        >
                          <TrendingUp className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setSelectedAsset(asset)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {selectedAsset && (
        <EditAssetDialog
          asset={selectedAsset}
          open={!!selectedAsset}
          onOpenChange={(open) => !open && setSelectedAsset(null)}
        />
      )}

      {priceDialogAsset && (
        <AssetPriceDialog
          asset={priceDialogAsset}
          open={!!priceDialogAsset}
          onOpenChange={(open) => !open && setPriceDialogAsset(null)}
        />
      )}
    </>
  );
}
