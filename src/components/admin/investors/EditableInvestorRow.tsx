import React from "react";
import { TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { Asset } from "@/types/investorTypes";
import { InvestorSummaryV2 } from "@/services/adminServiceV2";

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

      {/* Asset balances */}
      {assets.map((asset) => (
        <TableCell key={asset.id}>
          {investor.portfolioDetails.assetBreakdown[asset.symbol]
            ? `${investor.portfolioDetails.assetBreakdown[asset.symbol].toFixed(4)}`
            : "-"}
        </TableCell>
      ))}

      {/* Fee percentage */}
      <TableCell>2.0%</TableCell>

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
