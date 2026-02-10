import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Input,
  Button,
  Badge,
  SortableTableHead,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui";
import { Search, Edit, TrendingUp } from "lucide-react";
import { useAssets } from "@/hooks/data/admin";
import { useSortableColumns } from "@/hooks";
import { EditAssetDialog } from "./EditAssetDialog";
import { AssetPriceDialog } from "./AssetPriceDialog";
import type { Asset } from "@/types/asset";
import { format } from "date-fns";
import { CryptoIcon } from "@/components/CryptoIcons";

export function AssetsTable() {
  const [search, setSearch] = useState("");
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [priceDialogAsset, setPriceDialogAsset] = useState<Asset | null>(null);

  const { data: assets, isLoading } = useAssets({ search });

  const { sortedData, sortConfig, requestSort } = useSortableColumns(assets || [], {
    column: "symbol",
    direction: "asc",
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
          <Table className="text-xs">
            <TableHeader>
              <TableRow>
                <SortableTableHead
                  column="symbol"
                  currentSort={sortConfig}
                  onSort={requestSort}
                  className="whitespace-nowrap"
                >
                  Symbol
                </SortableTableHead>
                <SortableTableHead
                  column="name"
                  currentSort={sortConfig}
                  onSort={requestSort}
                  className="whitespace-nowrap"
                >
                  Name
                </SortableTableHead>
                <SortableTableHead
                  column="kind"
                  currentSort={sortConfig}
                  onSort={requestSort}
                  className="whitespace-nowrap"
                >
                  Kind
                </SortableTableHead>
                <TableHead className="whitespace-nowrap">Chain</TableHead>
                <TableHead className="whitespace-nowrap">Dec</TableHead>
                <SortableTableHead
                  column="is_active"
                  currentSort={sortConfig}
                  onSort={requestSort}
                  className="whitespace-nowrap"
                >
                  Status
                </SortableTableHead>
                <SortableTableHead
                  column="created_at"
                  currentSort={sortConfig}
                  onSort={requestSort}
                  className="whitespace-nowrap"
                >
                  Created
                </SortableTableHead>
                <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    No assets found
                  </TableCell>
                </TableRow>
              ) : (
                sortedData.map((asset: Asset) => (
                  <TableRow key={asset.asset_id}>
                    <TableCell className="py-1.5">
                      <div className="flex items-center gap-2">
                        <CryptoIcon symbol={asset.symbol} className="h-4 w-4" />
                        <span className="font-mono font-semibold">{asset.symbol}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-1.5">{asset.name}</TableCell>
                    <TableCell className="py-1.5">
                      <Badge variant="outline" className="text-[10px]">
                        {asset.kind}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-1.5">{asset.chain || "—"}</TableCell>
                    <TableCell className="py-1.5 tabular-nums">{asset.decimals}</TableCell>
                    <TableCell className="py-1.5">
                      {asset.is_active ? (
                        <Badge variant="default" className="text-[10px]">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px]">
                          Inactive
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="py-1.5 whitespace-nowrap">
                      {format(new Date(asset.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right py-1.5">
                      <div className="flex justify-end gap-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setPriceDialogAsset(asset)}
                            >
                              <TrendingUp className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Update price</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedAsset(asset)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit asset</TooltipContent>
                        </Tooltip>
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
