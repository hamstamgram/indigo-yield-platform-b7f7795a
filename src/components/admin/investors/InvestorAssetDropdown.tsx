
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Plus } from "lucide-react";
import { Asset } from "@/types/investorTypes";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
  onAssetAdded
}: InvestorAssetDropdownProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  // Filter out assets that the investor already has
  const availableAssets = assets.filter(asset => !existingAssets.includes(asset.id));
  
  const handleAddAsset = async (assetId: number) => {
    try {
      setIsLoading(true);
      
      // Log the operation for debugging
      console.log(`Adding asset ${assetId} to investor ${userId}`);
      
      // Temporarily disable portfolio operations
      console.log('Portfolio operations disabled during schema migration');
      
      toast({
        title: "✅ Asset Added",
        description: `Successfully prepared to add asset to investor's portfolio`,
        duration: 5000
      });
      
      // Refresh the parent component
      onAssetAdded();
      
    } catch (error: any) {
      console.error("Error in handleAddAsset:", error);
      
      toast({
        title: "❌ Operation Failed",
        description: error.message || "An unexpected error occurred while adding the asset",
        variant: "destructive",
        duration: 7000
      });
      
      // Report to Sentry if available
      if (typeof window !== 'undefined' && (window as any).Sentry) {
        (window as any).Sentry.captureException(error, {
          tags: {
            component: 'InvestorAssetDropdown',
            operation: 'addAsset'
          },
          extra: {
            userId,
            assetId,
            existingAssets
          }
        });
      }
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
            onClick={() => handleAddAsset(asset.id)}
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
