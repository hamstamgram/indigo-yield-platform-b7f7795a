
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { CryptoIcon } from "@/components/CryptoIcons";
import { Asset, Investor } from "@/types/investorTypes";

interface MobileInvestorCardProps {
  investor: Investor;
  assets: Asset[];
  onSendEmail: (email: string) => void;
}

const MobileInvestorCard: React.FC<MobileInvestorCardProps> = ({
  investor,
  assets,
  onSendEmail,
}) => {
  const name = investor.first_name && investor.last_name 
    ? `${investor.first_name} ${investor.last_name}` 
    : investor.email.split('@')[0];

  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-semibold text-lg">{name}</h3>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onSendEmail(investor.email)}
          >
            <Send className="h-4 w-4 mr-1" />
            Send Invite
          </Button>
        </div>
        
        <p className="text-sm text-muted-foreground mb-4">
          {investor.email}
        </p>
        
        <div className="space-y-1">
          {assets.map((asset) => (
            <div key={asset.id} className="flex justify-between items-center py-1 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-center">
                <CryptoIcon symbol={asset.symbol} className="h-4 w-4 mr-2" />
                <span className="font-medium">{asset.symbol}</span>
              </div>
              <span className="font-mono">
                {investor.portfolio_summary && investor.portfolio_summary[asset.symbol]
                  ? investor.portfolio_summary[asset.symbol].balance.toFixed(4)
                  : "0.0000"}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default MobileInvestorCard;
