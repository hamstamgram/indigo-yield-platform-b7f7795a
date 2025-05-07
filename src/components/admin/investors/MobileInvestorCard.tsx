
import React from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { Investor, Asset } from "@/types/investorTypes";
import { CryptoIcon } from "@/components/CryptoIcons";

interface MobileInvestorCardProps {
  investor: Investor;
  assets: Asset[];
  onSendEmail: (email: string) => void;
}

const MobileInvestorCard: React.FC<MobileInvestorCardProps> = ({ 
  investor, 
  assets,
  onSendEmail
}) => {
  const name = investor.first_name && investor.last_name 
    ? `${investor.first_name} ${investor.last_name}`
    : investor.email.split('@')[0];
  
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="mb-4">
          <h3 className="text-lg font-bold">{name}</h3>
          <p className="text-sm text-muted-foreground">{investor.email}</p>
        </div>
        
        <div className="space-y-3">
          {assets.map(asset => (
            <div key={asset.id} className="flex justify-between items-center">
              <div className="flex items-center">
                <CryptoIcon symbol={asset.symbol} className="h-5 w-5 mr-2" />
                <span>{asset.symbol}</span>
              </div>
              <div className="font-medium">
                {investor.portfolio_summary && investor.portfolio_summary[asset.symbol] 
                  ? `${investor.portfolio_summary[asset.symbol].balance.toFixed(4)}`
                  : '-'
                }
              </div>
            </div>
          ))}
        </div>
      </CardContent>
      
      <CardFooter className="bg-muted/50 p-4">
        <Button 
          variant="outline" 
          className="w-full" 
          onClick={() => onSendEmail(investor.email)}
        >
          <Send className="h-4 w-4 mr-1" />
          Send Invite
        </Button>
      </CardFooter>
    </Card>
  );
};

export default MobileInvestorCard;
