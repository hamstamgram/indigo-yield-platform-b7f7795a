
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { CryptoIcon } from "@/components/CryptoIcons";
import { Mail } from "lucide-react";

interface Asset {
  id: number;
  symbol: string;
  name: string;
}

interface Investor {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  portfolio_summary?: {
    [key: string]: {
      balance: number;
      usd_value: number;
    }
  }
}

interface MobileInvestorCardProps {
  investor: Investor;
  assets: Asset[];
  onViewDetails: (id: string) => void;
  onSendEmail: (email: string) => void;
}

const MobileInvestorCard: React.FC<MobileInvestorCardProps> = ({
  investor,
  assets,
  onViewDetails,
  onSendEmail
}) => {
  // Format currency
  const formatCurrency = (value: number = 0) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  // Format crypto amounts
  const formatCrypto = (value: number = 0, symbol: string) => {
    const decimals = symbol.toLowerCase() === 'btc' ? 8 : 
                    symbol.toLowerCase() === 'usdc' ? 2 : 4;
    return `${value.toFixed(decimals)}`;
  };

  // Calculate total portfolio value
  let totalValue = 0;
  if (investor.portfolio_summary) {
    Object.values(investor.portfolio_summary).forEach(asset => {
      totalValue += asset.usd_value;
    });
  }

  return (
    <Card className="overflow-hidden border">
      <CardContent className="p-4">
        <div className="mb-4">
          <h3 className="font-medium text-lg">
            {investor.first_name || ''} {investor.last_name || ''}
          </h3>
          <p className="text-sm text-gray-500">{investor.email}</p>
        </div>
        
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-500 mb-2">Portfolio</h4>
          <div className="grid grid-cols-2 gap-2">
            {assets.map(asset => (
              <div key={asset.id} className="flex items-center">
                <CryptoIcon symbol={asset.symbol} className="h-4 w-4 mr-1.5" />
                <div>
                  <span className="text-xs block">
                    {investor.portfolio_summary && investor.portfolio_summary[asset.symbol]
                      ? formatCrypto(investor.portfolio_summary[asset.symbol].balance, asset.symbol)
                      : '-'}
                  </span>
                  <span className="text-xs text-gray-500">
                    {investor.portfolio_summary && investor.portfolio_summary[asset.symbol]
                      ? formatCurrency(investor.portfolio_summary[asset.symbol].usd_value)
                      : '-'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="mt-4 pt-3 border-t">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs text-gray-500">Total Value</span>
              <p className="font-medium">{formatCurrency(totalValue)}</p>
            </div>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="bg-gray-50 dark:bg-gray-800/50 p-2 flex gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          className="flex-1 h-9"
          onClick={() => onViewDetails(investor.id)}
        >
          Details
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9"
          onClick={() => onSendEmail(investor.email)}
        >
          <Mail className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
};

export default MobileInvestorCard;
