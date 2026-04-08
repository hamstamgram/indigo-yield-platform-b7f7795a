/**
 * MobileInvestorCard - Mobile view for investor cards
 * Fee management is handled via the investor detail Settings tab (FeeScheduleSection).
 */
import { Card, CardContent, CardFooter, Button, TruncatedText } from "@/components/ui";
import { Send } from "lucide-react";
import type { AssetRef as Asset } from "@/types/asset";
import { AdminInvestorSummary } from "@/features/admin/investors/services/adminService";
import FundAssetDropdown from "./shared/FundAssetDropdown";
import { FinancialValue } from "@/components/common/FinancialValue";

interface MobileInvestorCardProps {
  investor: AdminInvestorSummary;
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
              <div>
                {investor.portfolioDetails.assetBreakdown[asset.symbol] ? (
                  <FinancialValue
                    value={investor.portfolioDetails.assetBreakdown[asset.symbol]}
                    asset={asset.symbol}
                    showAsset={false}
                  />
                ) : (
                  "-"
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>

      <CardFooter className="flex justify-end gap-2 pt-0">
        <Button variant="outline" size="sm" onClick={() => onSendEmail(investor.email)}>
          <Send className="h-4 w-4 mr-1" />
          Send Invite
        </Button>
        <FundAssetDropdown investorId={investor.id} onFundAdded={onSaveSuccess} />
      </CardFooter>
    </Card>
  );
};

export default MobileInvestorCard;
