import { useState } from "react";
import {
  Card, CardContent, CardFooter,
  Button, Input,
} from "@/components/ui";
import { Send, Save } from "lucide-react";
import { useToast } from "@/hooks";
import { supabase } from "@/integrations/supabase/client";
import { AssetRef as Asset } from "@/types/asset";
import FundAssetDropdown from "../FundAssetDropdown";
import InvestorInfo from "./InvestorInfo";
import { CryptoIcon } from "@/components/CryptoIcons";
import { getAllFunds, updateInvestorPosition } from "@/services";
import { formatAssetAmount } from "@/utils/assets";
import { InvestorSummaryV2 } from "@/services/admin";

interface MobileInvestorCardProps {
  investor: InvestorSummaryV2;
  assets: Asset[];
  onSendEmail: (email: string) => void;
  onSaveSuccess: () => void;
}

const MobileInvestorCard = ({
  investor,
  assets,
  onSendEmail,
  onSaveSuccess,
}: MobileInvestorCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Get asset breakdown from portfolioDetails
  const assetBreakdown = investor.portfolioDetails?.assetBreakdown || {};

  // Create state for each asset balance
  const [balances, setBalances] = useState<Record<string, string>>(() => {
    const initialBalances: Record<string, string> = {};
    assets.forEach((asset) => {
      const symbol = asset.symbol.toUpperCase();
      const balance = assetBreakdown[symbol]?.toString() || "0";
      initialBalances[asset.symbol] = balance;
    });
    return initialBalances;
  });

  const handleBalanceChange = (symbol: string, value: string) => {
    setBalances((prev) => ({
      ...prev,
      [symbol]: value,
    }));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);

      // Process portfolio updates
      const funds = await getAllFunds();

      const updatePromises = assets.map(async (asset) => {
        const symbol = asset.symbol;
        const newBalance = parseFloat(balances[symbol] || "0");
        
        if (isNaN(newBalance)) return;

        const fund = funds.find(f => f.asset === symbol);
        if (!fund) {
          console.warn(`No fund found for asset ${symbol}`);
          return;
        }

        const hasExistingPosition = assetBreakdown[symbol.toUpperCase()] !== undefined;
        
        if (newBalance > 0 || hasExistingPosition) {
          const result = await updateInvestorPosition(investor.id, fund.id, {
            current_value: newBalance,
            shares: newBalance 
          });

          if (!result.success) {
            console.error(`Failed to update position for ${symbol}:`, result.error);
          }
        }
      });

      await Promise.all(updatePromises);

      toast({
        title: "Success",
        description: "Investor portfolio updated successfully",
      });

      setTimeout(() => {
        setIsSaving(false);
        setIsEditing(false);
        onSaveSuccess();
      }, 500);
    } catch (error) {
      console.error("Error saving investor data:", error);
      toast({
        title: "Error",
        description: "Failed to update investor portfolio",
        variant: "destructive",
      });
      setIsSaving(false);
    }
  };

  return (
    <Card className="mb-4">
      <CardContent className="pt-4">
        <InvestorInfo
          firstName={investor.firstName || ""}
          lastName={investor.lastName || ""}
          email={investor.email}
        />

        <div className="space-y-3">
          {assets.map((asset) => {
            const balance = assetBreakdown[asset.symbol.toUpperCase()];
            const hasBalance = balance && balance > 0;
            return (
              <div key={asset.id} className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <CryptoIcon symbol={asset.symbol} className="h-5 w-5" />
                  <span className="font-medium">{asset.symbol}</span>
                </div>
                {isEditing ? (
                  <Input
                    type="number"
                    step="0.00000001"
                    value={balances[asset.symbol] || "0"}
                    onChange={(e) => handleBalanceChange(asset.symbol, e.target.value)}
                    className="max-w-[120px]"
                  />
                ) : (
                  <div className="font-mono">
                    {hasBalance ? formatAssetAmount(balance, asset.symbol) : "-"}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>

      <CardFooter className="flex justify-end gap-2 pt-0">
        {isEditing ? (
          <Button variant="primary" size="sm" onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-1" />
            {isSaving ? "Saving..." : "Save"}
          </Button>
        ) : (
          <>
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              Edit
            </Button>
            <Button variant="outline" size="sm" onClick={() => onSendEmail(investor.email)}>
              <Send className="h-4 w-4 mr-1" />
              Send Invite
            </Button>
            <FundAssetDropdown
              investorId={investor.id}
              onFundAdded={onSaveSuccess}
            />
          </>
        )}
      </CardFooter>
    </Card>
  );
};

export default MobileInvestorCard;
