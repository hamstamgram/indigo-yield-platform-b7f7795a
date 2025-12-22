import { useState, useEffect } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Send, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Asset } from "@/types/investorTypes";
import { InvestorSummaryV2 } from "@/services/admin/adminService";
import { TruncatedText } from "@/components/ui/truncated-text";
import FundAssetDropdown from "./FundAssetDropdown";

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
  const [fee, setFee] = useState<string>("20.0");
  const { toast } = useToast();

  // Update fee state when investor prop changes
  useEffect(() => {
    setFee("20.0"); // Default fee since InvestorSummaryV2 doesn't have fee_percentage
  }, [investor]);

  // Create state for each asset balance
  const [balances, setBalances] = useState<Record<string, string>>(() => {
    const initialBalances: Record<string, string> = {};
    assets.forEach((asset) => {
      const symbol = asset.symbol;
      const balance = investor.portfolioDetails.assetBreakdown[symbol] || 0;
      initialBalances[symbol] = balance.toString();
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

      // Update fee percentage in profile
      const { error: feeError } = await supabase
        .from("profiles")
        .update({
          fee_percentage: feeValue,
          updated_at: new Date().toISOString(),
        })
        .eq("id", investor.id);

      if (feeError) {
        throw feeError;
      }

      // Convert input values to portfolio entries
      const portfolioUpdates = assets
        .map((asset) => {
          const symbol = asset.symbol;
          const balance = parseFloat(balances[symbol] || "0");

          return {
            user_id: investor.id,
            asset_id: asset.id,
            balance: balance,
            updated_at: new Date().toISOString(),
          };
        })
        .filter((update) => update.balance > 0); // Only update assets with positive balances

      // Portfolio updates currently disabled during schema migration
      // When re-enabled, portfolioUpdates contains the asset updates

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
      console.error("Error saving investor data:", error);
      toast({
        title: "Error",
        description: "Failed to update investor portfolio",
        variant: "destructive",
      });
      setIsSaving(false);
    }
  };

  const name =
    investor.firstName && investor.lastName
      ? `${investor.firstName} ${investor.lastName}`
      : investor.email.split("@")[0];

  return (
    <Card className="mb-4">
      <CardContent className="pt-4">
        <div className="font-medium text-lg mb-2 max-w-full">
          <TruncatedText text={name} maxLength={30} />
        </div>
        <div className="text-sm text-muted-foreground mb-4 truncate">{investor.email}</div>

        <div className="space-y-3">
          {assets.map((asset) => (
            <div key={asset.id} className="flex justify-between items-center">
              <div className="font-medium">{asset.symbol}</div>
              {isEditing ? (
                <Input
                  type="number"
                  step="0.00000001"
                  value={balances[asset.symbol] || "0"}
                  onChange={(e) => handleBalanceChange(asset.symbol, e.target.value)}
                  className="max-w-[120px]"
                />
              ) : (
                <div>
                  {investor.portfolioDetails.assetBreakdown[asset.symbol]
                    ? `${investor.portfolioDetails.assetBreakdown[asset.symbol].toFixed(4)}`
                    : "-"}
                </div>
              )}
            </div>
          ))}

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
              <div>"20.0%"</div>
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
