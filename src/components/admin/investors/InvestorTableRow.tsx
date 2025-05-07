
import React from 'react';
import { TableRow, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';
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
  onSendEmail: (email: string) => void;
}

const InvestorTableRow: React.FC<InvestorTableRowProps> = ({
  investor,
  assets,
  onSendEmail
}) => {
  const name = investor.first_name && investor.last_name 
    ? `${investor.first_name} ${investor.last_name}`
    : investor.email.split('@')[0];

  return (
    <TableRow key={investor.id}>
      <TableCell className="font-medium">{name}</TableCell>
      
      {/* Asset balances */}
      {assets.map(asset => (
        <TableCell key={asset.id}>
          {investor.portfolio_summary && investor.portfolio_summary[asset.symbol] 
            ? `${investor.portfolio_summary[asset.symbol].balance.toFixed(4)}`
            : '-'
          }
        </TableCell>
      ))}
      
      {/* Actions */}
      <TableCell className="text-right">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => onSendEmail(investor.email)}
        >
          <Send className="h-4 w-4 mr-1" />
          Send Invite
        </Button>
      </TableCell>
    </TableRow>
  );
};

export default InvestorTableRow;
