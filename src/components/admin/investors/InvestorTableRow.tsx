
import React from 'react';
import { TableRow, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Mail, Info } from 'lucide-react';
import { Asset } from '@/types/investorTypes';

interface InvestorTableRowProps {
  investor: {
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
  };
  assets: Asset[];
  onViewDetails: (id: string) => void;
  onSendEmail: (email: string) => void;
}

const InvestorTableRow: React.FC<InvestorTableRowProps> = ({
  investor,
  assets,
  onViewDetails,
  onSendEmail
}) => {
  const name = investor.first_name && investor.last_name 
    ? `${investor.first_name} ${investor.last_name}`
    : investor.email.split('@')[0];

  return (
    <TableRow key={investor.id}>
      <TableCell className="font-medium">{name}</TableCell>
      <TableCell>{investor.email}</TableCell>
      
      {/* Asset balances */}
      {assets.map(asset => (
        <TableCell key={asset.id} className="text-right">
          {investor.portfolio_summary && investor.portfolio_summary[asset.symbol] 
            ? `${investor.portfolio_summary[asset.symbol].balance.toFixed(4)} ${asset.symbol}`
            : '-'
          }
        </TableCell>
      ))}
      
      {/* Actions */}
      <TableCell>
        <div className="flex justify-end gap-2">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => onSendEmail(investor.email)}
          >
            <Mail className="h-4 w-4" />
            <span className="sr-only">Email</span>
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => onViewDetails(investor.id)}
          >
            <Info className="h-4 w-4" />
            <span className="sr-only">Details</span>
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
};

export default InvestorTableRow;
