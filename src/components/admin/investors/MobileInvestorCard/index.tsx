import { useState, useEffect } from "react";
import { Card, CardContent, CardFooter, Button, Input } from "@/components/ui";
import { Send, Save } from "lucide-react";
import { useToast } from "@/hooks";
import { AssetRef as Asset } from "@/types/asset";
import FundAssetDropdown from "../shared/FundAssetDropdown";
import InvestorInfo from "./InvestorInfo";
import { CryptoIcon } from "@/components/CryptoIcons";
import { getAllFunds, updateInvestorPosition } from "@/services/investor";
import { profileService } from "@/services/shared";
import { formatAssetAmount } from "@/utils/assets";
import { logWarn, logError } from "@/lib/logger";

/**
 * Extended investor type for mobile card with portfolio data
 * This is specific to this component's needs
 */
interface MobileCardInvestor {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  fee_percentage?: number | null;
  portfolio_summary?: {
    [key: string]: {
      balance: number;
      usd_value: number;
    };
  };
}

interface MobileInvestorCardProps {
  investor: MobileCardInvestor;
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
  const [fee, setFee] = useState<string>(investor.fee_percentage?.toString() || "20.0");
  const { toast } = useToast();

  // Update fee state when investor prop changes
  useEffect(() => {
    setFee(investor.fee_percentage?.toString() || "20.0");
  }, [investor]);

  // Create state for each asset balance
  const [balances, setBalances] = useState<Record<string, string>>(() => {
    const initialBalances: Record<string, string> = {};
    assets.forEach((asset) => {
      const symbol = asset.symbol;
      // Normalize symbol to uppercase for lookup in portfolio_summary
      const normalizedSymbol = symbol.toUpperCase();
      const balance =
        investor.portfolio_summary && investor.portfolio_summary[normalizedSymbol]
          ? investor.portfolio_summary[normalizedSymbol].balance.toString()
          : "0";
      initialBalances[symbol] = balance;
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

      // Parse fee as float for database update, ensuring it's a valid number
      const feeValue = parseFloat(fee);
      if (isNaN(feeValue)) {
        throw new Error("Invalid fee percentage");
      }

      // Update fee percentage using service
      await profileService.updateFeePercentage(investor.id, feeValue);

      // Process portfolio updates
      // 1. Fetch funds to map assets to funds
      const funds = await getAllFunds();

      // 2. Iterate through assets and update positions
      const updatePromises = assets.map(async (asset) => {
        const symbol = asset.symbol;
        const newBalance = parseFloat(balances[symbol] || "0");

        // Only update if we have a valid balance
        if (isNaN(newBalance)) return;

        // Find the fund for this asset
        const fund = funds.find((f) => f.asset === symbol);
        if (!fund) {
          logWarn("MobileInvestorCard.handleSave", {
            message: `No fund found for asset ${symbol}`,
            symbol,
          });
          return;
        }

        // Check if user has this position (balance > 0 or existed before)
        const hasExistingPosition =
          investor.portfolio_summary && investor.portfolio_summary[symbol.toUpperCase()];

        if (newBalance > 0 || hasExistingPosition) {
          const result = await updateInvestorPosition(investor.id, fund.id, {
            current_value: String(newBalance),
            shares: String(newBalance),
          });

          if (!result.success) {
            logError("MobileInvestorCard.updatePosition", result.error, {
              symbol,
              investorId: investor.id,
            });
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
        onSaveSuccess(); // Refresh data
      }, 500); // Small delay to ensure UI feedback
    } catch (error) {
      logError("MobileInvestorCard.handleSave", error, { investorId: investor.id });
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
          firstName={investor.first_name || ""}
          lastName={investor.last_name || ""}
          email={investor.email}
        />

        <div className="space-y-3">
          {assets.map((asset) => {
            const balance = investor.portfolio_summary?.[asset.symbol.toUpperCase()]?.balance;
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

          <div className="flex justify-between items-center border-t pt-3 mt-3">
            <div className="font-medium">Fee (%)</div>
            {isEditing ? (
              <Input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={fee}
                onChange={(e) => setFee(e.target.value)}
                className="max-w-[80px]"
              />
            ) : (
              <div>
                {investor.fee_percentage !== null && investor.fee_percentage !== undefined
                  ? `${investor.fee_percentage.toFixed(1)}%`
                  : "20.0%"}
              </div>
            )}
          </div>
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
            <FundAssetDropdown investorId={investor.id} onFundAdded={onSaveSuccess} />
          </>
        )}
      </CardFooter>
    </Card>
  );
};

export default MobileInvestorCard;
