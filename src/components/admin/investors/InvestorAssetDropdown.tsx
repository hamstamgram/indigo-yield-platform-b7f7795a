
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
      
      // Add portfolio entry with zero balance
      const { error } = await supabase
        .from('portfolios')
        .insert({
          user_id: userId,
          asset_id: assetId,
          balance: 0,
          updated_at: new Date().toISOString()
        });
        
      if (error) throw error;
      
      toast({
        title: "Asset Added",
        description: "New asset added to investor's portfolio with zero balance"
      });
      
      // Refresh the parent component
      onAssetAdded();
      
    } catch (error) {
      console.error("Error adding asset:", error);
      toast({
        title: "Error",
        description: "Failed to add asset to portfolio",
        variant: "destructive"
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
