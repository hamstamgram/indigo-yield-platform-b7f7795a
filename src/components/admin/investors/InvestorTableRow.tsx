
import React from "react";
import { Button } from "@/components/ui/button";
import { TableRow, TableCell } from "@/components/ui/table";
import { Mail } from "lucide-react";
import { CryptoIcon } from "@/components/CryptoIcons";

interface Asset {
  id: number;
  symbol: string;
  name: string;
}

interface InvestorPortfolioSummary {
  [key: string]: {
    balance: number;
    usd_value: number;
  }
}

interface InvestorProps {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  portfolio_summary?: InvestorPortfolioSummary;
  assets: Asset[];
  onViewDetails: (id: string) => void;
  onSendEmail: (email: string) => void;
}

const InvestorTableRow: React.FC<InvestorProps> = ({
  id,
  email,
  first_name,
  last_name,
  portfolio_summary,
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
  if (portfolio_summary) {
    Object.values(portfolio_summary).forEach(asset => {
      totalValue += asset.usd_value;
    });
  }

  return (
    <TableRow key={id}>
      <TableCell>
        <div>
          <div className="font-medium">
            {first_name || ''} {last_name || ''}
          </div>
          <div className="text-sm text-gray-500">
            {email}
          </div>
        </div>
      </TableCell>
      
      {assets.map(asset => (
        <TableCell key={`${id}-${asset.id}`}>
          {portfolio_summary && portfolio_summary[asset.symbol] ? (
            <div>
              <div className="font-medium">
                {formatCrypto(portfolio_summary[asset.symbol].balance, asset.symbol)}
              </div>
              <div className="text-xs text-gray-500">
                {formatCurrency(portfolio_summary[asset.symbol].usd_value)}
              </div>
            </div>
          ) : (
            <span className="text-gray-400">-</span>
          )}
        </TableCell>
      ))}
      
      <TableCell>
        <span className="font-medium">
          {formatCurrency(totalValue)}
        </span>
      </TableCell>
      
      <TableCell className="text-right">
        <div className="flex justify-end space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewDetails(id)}
          >
            Details
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onSendEmail(email)}
          >
            <Mail className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
};

export default InvestorTableRow;
