import React from "react";
import { TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { Asset } from "@/types/investorTypes";
import { InvestorSummaryV2 } from "@/services/adminServiceV2";
import { CryptoIcon } from "@/components/CryptoIcons";

interface EditableInvestorRowProps {
  investor: InvestorSummaryV2;
  assets: Asset[];
  onSendEmail: (email: string) => void;
}

const EditableInvestorRow: React.FC<EditableInvestorRowProps> = ({
  investor,
  assets,
  onSendEmail,
}) => {
  const name =
    investor.firstName && investor.lastName
      ? `${investor.firstName} ${investor.lastName}`
      : investor.email.split("@")[0];

  return (
    <TableRow key={investor.id}>
      <TableCell className="font-medium">{name}</TableCell>

      {/* Asset balances with logos */}
      {assets.map((asset) => {
        const balance = investor.portfolioDetails.assetBreakdown[asset.symbol];
        const hasBalance = balance && balance > 0;
        return (
          <TableCell key={asset.id}>
            {hasBalance ? (
              <div className="flex items-center gap-2">
                <CryptoIcon symbol={asset.symbol} className="h-5 w-5 flex-shrink-0" />
                <span className="font-mono">{balance.toFixed(4)}</span>
              </div>
            ) : (
              <span className="text-muted-foreground">-</span>
            )}
          </TableCell>
        );
      })}

      {/* Actions */}
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => onSendEmail(investor.email)}>
            <Send className="h-4 w-4 mr-1" />
            Invite
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <a href={`/admin/investors/${investor.id}`}>Manage</a>
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
};

export default EditableInvestorRow;
