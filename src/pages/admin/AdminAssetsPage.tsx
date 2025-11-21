import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { AssetStats } from "@/components/admin/assets/AssetStats";
import { AssetsTable } from "@/components/admin/assets/AssetsTable";
import { CreateAssetDialog } from "@/components/admin/assets/CreateAssetDialog";

export default function AdminAssetsPage() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Asset Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage assets, track prices, and view historical data
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Asset
        </Button>
      </div>

      <AssetStats />

      <AssetsTable />

      <CreateAssetDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
    </div>
  );
}
