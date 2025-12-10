import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus } from "lucide-react";
import { Asset } from "@/types/investorTypes";

import { useToast } from "@/hooks/use-toast";
import { addFundToInvestor, getAllFunds } from "@/services/fundService";

interface InvestorAssetDropdownProps {
  userId: string;
  assets: Asset[];
  existingAssets: number[]; // This is the prop we need to use consistently
  onAssetAdded: () => void;
}

const InvestorAssetDropdown = ({
  userId,
  assets,
  existingAssets,
  onAssetAdded,
}: InvestorAssetDropdownProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Filter out assets that the investor already has
  const availableAssets = assets.filter((asset) => !existingAssets.includes(asset.id));

  const handleAddAsset = async (asset: Asset) => {
    try {
      setIsLoading(true);

      // 1. Find the fund associated with this asset
      const funds = await getAllFunds();
      const matchingFund = funds.find((f) => f.asset === asset.symbol);

      if (!matchingFund) {
        throw new Error(`No active fund found for asset: ${asset.symbol}`);
      }

      // 2. Add the fund to the investor
      // userId is the investor_id in this context
      const result = await addFundToInvestor(userId, matchingFund.id, 0);

      if (!result.success) {
        throw new Error(result.error || "Failed to add asset to investor portfolio");
      }

      toast({
        title: "✅ Asset Added",
        description: `Successfully added ${asset.symbol} to investor's portfolio`,
        duration: 5000,
      });

      // Refresh the parent component
      onAssetAdded();
    } catch (error: any) {
      console.error("Error in handleAddAsset:", error);

      toast({
        title: "❌ Operation Failed",
        description: error.message || "An unexpected error occurred while adding the asset",
        variant: "destructive",
        duration: 7000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (availableAssets.length === 0) {
    return null; // Don't show dropdown when no assets are available to add
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isLoading}>
          <Plus className="h-4 w-4 mr-1" />
          Add Asset
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end">
        {availableAssets.map((asset) => (
          <DropdownMenuItem
            key={asset.id}
            onClick={() => handleAddAsset(asset)}
            className="cursor-pointer"
          >
            {asset.name} ({asset.symbol})
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default InvestorAssetDropdown;
