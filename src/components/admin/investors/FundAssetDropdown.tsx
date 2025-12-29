import { useState } from "react";
import {
  Button,
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks";
import { addFundToInvestor, getAvailableFundsForInvestor, type Fund } from "@/services/investor/fundViewService";
import { useEffect } from "react";

interface FundAssetDropdownProps {
  investorId: string;
  onFundAdded: () => void;
}

const FundAssetDropdown = ({ investorId, onFundAdded }: FundAssetDropdownProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [availableFunds, setAvailableFunds] = useState<Fund[]>([]);

  useEffect(() => {
    fetchAvailableFunds();
  }, [investorId]);

  const fetchAvailableFunds = async () => {
    try {
      const funds = await getAvailableFundsForInvestor(investorId);
      setAvailableFunds(funds);
    } catch (error) {
      console.error("Error fetching available funds:", error);
    }
  };

  const handleAddFund = async (fundId: string) => {
    try {
      setIsLoading(true);

      const result = await addFundToInvestor(investorId, fundId, 0);

      if (!result.success) {
        throw new Error(result.error || "Failed to add fund to investor portfolio");
      }

      toast({
        title: "✅ Fund Added",
        description: `Successfully added fund to investor's portfolio`,
        duration: 5000,
      });

      // Refresh available funds and parent component
      await fetchAvailableFunds();
      onFundAdded();
    } catch (error: any) {
      console.error("Error in handleAddFund:", error);

      toast({
        title: "❌ Operation Failed",
        description: error.message || "An unexpected error occurred while adding the fund",
        variant: "destructive",
        duration: 7000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (availableFunds.length === 0) {
    return null; // Don't show dropdown when no funds are available to add
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isLoading}>
          <Plus className="h-4 w-4 mr-1" />
          Add Fund
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end">
        {availableFunds.map((fund) => (
          <DropdownMenuItem
            key={fund.id}
            onClick={() => handleAddFund(fund.id)}
            className="cursor-pointer"
          >
            <div className="flex flex-col items-start">
              <span className="font-medium">{fund.name}</span>
              <span className="text-sm text-muted-foreground">
                {fund.code} - {fund.asset}
              </span>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default FundAssetDropdown;
