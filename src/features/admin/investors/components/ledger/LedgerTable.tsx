/**
 * Ledger Table Component
 * Displays transactions in a table with actions
 */

import {
  Badge,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui";
import { ArrowUpRight, ArrowDownRight, RefreshCw, MoreHorizontal, Ban, Lock } from "lucide-react";
import { format } from "date-fns";
import { FinancialValue } from "@/components/common/FinancialValue";
import { CryptoIcon } from "@/components/CryptoIcons";
import { isFinancialGte } from "@/utils/financial";
import type { LedgerTransaction } from "./types";

interface LedgerTableProps {
  transactions: LedgerTransaction[];
  onVoid: (tx: LedgerTransaction) => void;
}

function getTypeIcon(type: string) {
  const lowerType = type.toLowerCase();
  if (
    [
      "deposit",
      "subscription",
      "transfer_in",
      "yield",
      "interest",
      "fee_credit",
      "ib_credit",
    ].includes(lowerType)
  ) {
    return <ArrowDownRight className="h-3.5 w-3.5 text-yield" />;
  }
  if (["withdrawal", "transfer_out", "fee"].includes(lowerType)) {
    return <ArrowUpRight className="h-3.5 w-3.5 text-rose-400" />;
  }
  return <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />;
}

function getPurposeBadge(purpose: string | null) {
  if (!purpose) return null;
  return (
    <Badge variant="outline" className="text-[10px]">
      {purpose}
    </Badge>
  );
}

export function LedgerTable({ transactions, onVoid }: LedgerTableProps) {
  return (
    <div className="border rounded-md overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            <TableHead className="text-xs h-9 w-[100px]">Date</TableHead>
            <TableHead className="text-xs h-9">Type</TableHead>
            <TableHead className="text-xs h-9">Fund</TableHead>
            <TableHead className="text-xs h-9 text-right">Amount</TableHead>
            <TableHead className="text-xs h-9">Purpose</TableHead>
            <TableHead className="text-xs h-9 w-[60px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((tx) => (
            <TableRow
              key={tx.id}
              className={`text-xs ${tx.is_voided ? "opacity-50 line-through" : ""}`}
            >
              <TableCell className="py-2 font-mono">
                {format(new Date(tx.tx_date), "MMM d, yyyy")}
              </TableCell>
              <TableCell className="py-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {getTypeIcon(tx.type)}
                  <span className="capitalize">{tx.type.replace(/_/g, " ").toLowerCase()}</span>
                  {tx.is_voided && (
                    <Badge variant="destructive" className="text-[9px]">
                      Voided
                    </Badge>
                  )}
                  {tx.visibility_scope === "admin_only" && (
                    <Badge
                      variant="outline"
                      className="text-[9px] gap-0.5 text-muted-foreground border-muted-foreground/30"
                    >
                      <Lock className="h-2.5 w-2.5" />
                      Admin
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="py-2">
                <div className="flex items-center gap-1.5">
                  <CryptoIcon symbol={tx.asset} className="h-4 w-4" />
                  <span>{tx.fund?.name || "-"}</span>
                </div>
              </TableCell>
              <TableCell className="py-2 text-right">
                <FinancialValue
                  value={tx.amount}
                  asset={tx.asset}
                  prefix={isFinancialGte(tx.amount, 0) ? "+" : ""}
                  colorize
                  showAsset
                />
              </TableCell>
              <TableCell className="py-2">{getPurposeBadge(tx.purpose)}</TableCell>
              <TableCell className="py-2">
                {!tx.is_voided && (
                  <DropdownMenu>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                      </TooltipTrigger>
                      <TooltipContent>Actions</TooltipContent>
                    </Tooltip>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => onVoid(tx)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Ban className="h-3.5 w-3.5 mr-2" />
                        Void
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
