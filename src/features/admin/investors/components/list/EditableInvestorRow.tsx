import React, { useState } from "react";
import {
  TableRow,
  TableCell,
  Button,
  TruncatedText,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui";
import { Trash2 } from "lucide-react";
import { AssetRef as Asset } from "@/types/asset";
import type { AdminInvestorSummary } from "@/services/admin";
import { CryptoIcon } from "@/components/CryptoIcons";
import { FinancialValue } from "@/components/common/FinancialValue";
import InviteInvestorDialog from "../forms/InviteInvestorDialog";

interface EditableInvestorRowProps {
  investor: AdminInvestorSummary;
  assets: Asset[];
  onSendEmail: (email: string) => void;
  onDelete?: (investorId: string) => void;
}

const EditableInvestorRow: React.FC<EditableInvestorRowProps> = ({
  investor,
  assets,
  onSendEmail,
  onDelete,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const name =
    investor.firstName && investor.lastName
      ? `${investor.firstName} ${investor.lastName}`
      : investor.email.split("@")[0];

  const handleDelete = async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(investor.id);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <TableRow key={investor.id}>
      <TableCell className="font-medium max-w-[200px]">
        <TruncatedText text={name} className="block" />
      </TableCell>

      {/* Asset balances with logos */}
      {assets.map((asset) => {
        const balance = investor.portfolioDetails.assetBreakdown[asset.symbol];
        const hasBalance = balance && balance > 0;
        return (
          <TableCell key={asset.id}>
            {hasBalance ? (
              <div className="flex items-center gap-2">
                <CryptoIcon symbol={asset.symbol} className="h-5 w-5 flex-shrink-0" />
                <FinancialValue
                  value={balance}
                  asset={asset.symbol}
                  displayDecimals={4}
                  showAsset={false}
                />
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
          <InviteInvestorDialog
            investor={{
              id: investor.id,
              email: investor.email,
              firstName: investor.firstName || undefined,
              lastName: investor.lastName || undefined,
            }}
          />
          <Button variant="ghost" size="sm" asChild>
            <a href={`/admin/investors/${investor.id}`}>Manage</a>
          </Button>
          {onDelete && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Investor</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete <strong>{name}</strong> ({investor.email})? This
                    action cannot be undone and will remove all associated data.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isDeleting ? "Deleting..." : "Delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
};

export default EditableInvestorRow;
