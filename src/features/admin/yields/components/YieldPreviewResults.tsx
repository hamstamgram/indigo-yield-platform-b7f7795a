/**
 * YieldPreviewResults - Displays V5 segmented yield distribution preview with investor breakdown
 * Shows per-investor allocation with expandable segment details
 */

import {
  Card,
  CardContent,
  Button,
  Input,
  Label,
  Badge,
  Switch,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui";
import { CheckCircle, Building2, AlertTriangle, Layers, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { type YieldCalculationResult, type YieldDistribution } from "@/features/admin/yields/services/yields";
import { isSystemAccount as checkSystemAccount } from "@/utils/accountUtils";
import { parseFinancial } from "@/utils/financial";
import Decimal from "decimal.js";
import React from "react";

interface YieldPreviewResultsProps {
  yieldPreview: YieldCalculationResult;
  selectedFund: { asset: string } | null;
  formatValue: (value: string | number, asset: string) => string;
  showSystemAccounts: boolean;
  setShowSystemAccounts: (show: boolean) => void;
  showOnlyChanged: boolean;
  setShowOnlyChanged: (show: boolean) => void;
  searchInvestor: string;
  setSearchInvestor: (search: string) => void;
  getFilteredDistributions: (distributions: YieldDistribution[]) => YieldDistribution[];
  onConfirmApply: () => void;
  applyLoading: boolean;
  crystallizationMap?: Map<string, unknown[]>;
  yieldPurpose?: string;
}

export function YieldPreviewResults({
  yieldPreview,
  selectedFund,
  formatValue,
  showSystemAccounts,
  setShowSystemAccounts,
  showOnlyChanged,
  setShowOnlyChanged,
  searchInvestor,
  setSearchInvestor,
  getFilteredDistributions,
  onConfirmApply,
  applyLoading,
}: YieldPreviewResultsProps) {
  const asset = selectedFund?.asset || "";
  const isV5 =
    yieldPreview.calculationMethod === "segmented_v5" ||
    yieldPreview.calculationMethod === "unified_v6";

  // The true Total Gross Yield is the sum of ALL allocations (including system fee accounts) + any dust
  const trueTotalGross = yieldPreview.distributions
    .reduce((acc, inv) => acc.plus(new Decimal(inv.grossYield || 0)), new Decimal(0))
    .plus(new Decimal((yieldPreview as any).dustAmount || 0))
    .toString();

  return (
    <div className="p-4 border rounded-lg bg-muted/20 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="font-semibold text-lg">Confirm & Apply</h3>
      </div>

      {/* V5 Method Badge */}
      {isV5 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-indigo-950/30 text-indigo-400 border-indigo-800">
              <Layers className="h-3 w-3 mr-1" />
              Segmented V5
            </Badge>
            {yieldPreview.periodStart && yieldPreview.periodEnd && (
              <span className="text-xs text-muted-foreground">
                {yieldPreview.periodStart} to {yieldPreview.periodEnd}
                {yieldPreview.daysInPeriod ? ` (${yieldPreview.daysInPeriod} days)` : ""}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Idempotency Warnings */}
      {yieldPreview.hasConflicts && (
        <div className="flex items-start gap-2 p-3 rounded-md bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 text-sm">
          <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div>
            <strong>Some transactions already exist.</strong>{" "}
            {yieldPreview.existingConflicts.length} existing reference(s) will be skipped.
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {/* Opening AUM */}
        {yieldPreview.openingAum && parseFinancial(yieldPreview.openingAum).gt(0) && (
          <Card className="border-slate-200 bg-slate-950/20">
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">Opening AUM</p>
              <p className="text-lg font-mono font-semibold">
                {formatValue(yieldPreview.openingAum, asset)}
              </p>
            </CardContent>
          </Card>
        )}
        <Card className="border-yield/20 bg-green-950/20">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Gross Yield</p>
            <p
              className={cn(
                "text-lg font-mono font-bold",
                !parseFinancial(yieldPreview.grossYield).isNegative() ? "text-yield" : "text-rose-400"
              )}
            >
              {trueTotalGross >= 0 ? "+" : ""}
              {formatValue(trueTotalGross, asset)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-indigo-500/20 bg-indigo-950/20">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">INDIGO Fees Credit</p>
            <p className="text-lg font-mono font-semibold text-indigo-400">
              {formatValue(yieldPreview.totalFees, asset)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">IB Fees</p>
            <p className="text-lg font-mono font-semibold text-purple-600">
              {formatValue(yieldPreview.totalIbFees ?? 0, asset)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Net Yield</p>
            <p
              className={cn(
                "text-lg font-mono font-bold",
                !parseFinancial(yieldPreview.netYield).isNegative() ? "text-primary" : "text-rose-400"
              )}
            >
              {!parseFinancial(yieldPreview.netYield).isNegative() ? "+" : ""}
              {formatValue(yieldPreview.netYield, asset)}
            </p>
          </CardContent>
        </Card>
      </div>


      {/* Filter Controls */}
      <div className="flex flex-wrap items-center gap-4 pt-2">
        <Input
          placeholder="Search investor..."
          value={searchInvestor}
          onChange={(e) => setSearchInvestor(e.target.value)}
          className="w-48"
        />
        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
            Advanced filters
          </summary>
          <div className="flex flex-wrap items-center gap-4 mt-2">
            <div className="flex items-center gap-2">
              <Switch
                id="show-system"
                checked={showSystemAccounts}
                onCheckedChange={setShowSystemAccounts}
              />
              <Label htmlFor="show-system" className="text-sm">
                Show system accounts
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="show-changed"
                checked={showOnlyChanged}
                onCheckedChange={setShowOnlyChanged}
              />
              <Label htmlFor="show-changed" className="text-sm">
                Only new entries
              </Label>
            </div>
          </div>
        </details>
      </div>

      {/* Investor Breakdown Table */}
      <div className="rounded-md border max-h-96 overflow-y-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-card z-10">
            <TableRow>
              <TableHead>Investor</TableHead>
              <TableHead className="text-right">Gross</TableHead>
              <TableHead className="text-right">Fee %</TableHead>
              <TableHead className="text-right">Fee</TableHead>
              <TableHead className="text-right">Net</TableHead>
              <TableHead className="text-right">IB %</TableHead>
              <TableHead className="text-right" title="Introducing Broker">
                Broker
              </TableHead>
              <TableHead className="text-right font-bold">Ending Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {getFilteredDistributions(yieldPreview.distributions).map((inv) => {
              return (
                <React.Fragment key={inv.investorId}>
                  {/* Main investor row */}
                  <TableRow
                    className={cn(
                      inv.wouldSkip && "opacity-50",
                      checkSystemAccount(inv) && "bg-blue-950/20"
                    )}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {checkSystemAccount(inv) && <Building2 className="h-3 w-3 text-blue-400" />}
                        <div>
                          <p className="font-medium text-sm truncate max-w-[120px]">
                            {inv.investorName}
                          </p>
                          {inv.ibParentName && (
                            <p className="text-xs text-purple-600">IB: {inv.ibParentName}</p>
                          )}
                          {inv.hasIb && !inv.ibParentName && (
                            <p className="text-xs text-purple-600">Has IB</p>
                          )}
                        </div>
                        {inv.wouldSkip && (
                          <Badge variant="outline" className="text-xs">
                            Skip
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      <div>
                        <span
                          className={cn(
                            !parseFinancial(inv.grossYield).isNegative() ? "text-yield/80" : "text-rose-500/80"
                          )}
                        >
                          {!parseFinancial(inv.grossYield).isNegative() ? "+" : ""}
                          {formatValue(inv.grossYield, asset)} {asset}
                        </span>
                        {inv.mtdGross !== undefined && (
                          <div
                            className={cn(
                              "font-bold mt-0.5",
                              !parseFinancial(inv.mtdGross).isNegative() ? "text-yield" : "text-rose-400"
                            )}
                          >
                            {!parseFinancial(inv.mtdGross).isNegative() ? "+" : ""}
                            {formatValue(inv.mtdGross, asset)} MTD
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {inv.feePercentage}%
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      <div className="text-muted-foreground/80">
                        {parseFinancial(inv.feeAmount).gt(0)
                          ? `-${formatValue(inv.feeAmount, asset)}`
                          : "\u2014"}
                      </div>
                      {inv.mtdFee !== undefined && parseFinancial(inv.mtdFee).gt(0) && (
                        <div className="font-bold text-muted-foreground mt-0.5">
                          -{formatValue(inv.mtdFee, asset)} MTD
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      <div
                        className={cn(
                          !parseFinancial(inv.netYield).isNegative() ? "text-foreground/80" : "text-rose-400/80"
                        )}
                      >
                        {!parseFinancial(inv.netYield).isNegative() ? "+" : ""}
                        {formatValue(inv.netYield, asset)}
                      </div>
                      {inv.mtdNet !== undefined && (
                        <div
                          className={cn(
                            "font-bold mt-0.5",
                            !parseFinancial(inv.mtdNet).isNegative() ? "text-foreground" : "text-rose-400"
                          )}
                        >
                          {!parseFinancial(inv.mtdNet).isNegative() ? "+" : ""}
                          {formatValue(inv.mtdNet, asset)} MTD
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {inv.ibPercentage && parseFinancial(inv.ibPercentage).gt(0)
                        ? `${inv.ibPercentage}%`
                        : "\u2014"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      <div className="text-purple-600/80">
                        {parseFinancial(inv.ibAmount).gt(0)
                          ? `-${formatValue(inv.ibAmount, asset)}`
                          : "\u2014"}
                      </div>
                      {inv.mtdIb !== undefined && parseFinancial(inv.mtdIb).gt(0) && (
                        <div className="font-bold text-purple-600 mt-0.5">
                          -{formatValue(inv.mtdIb, asset)} MTD
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold text-sm bg-muted/30">
                      {formatValue(new Decimal(inv.openingBalance || 0).plus(new Decimal(inv.netYield || 0)).toString(), asset)}
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Showing {getFilteredDistributions(yieldPreview.distributions).length} of{" "}
        {yieldPreview.distributions.length} investors
      </p>

      {/* Apply Button — opens confirmation dialog */}
      <Button onClick={onConfirmApply} disabled={applyLoading} className="w-full" size="lg">
        <CheckCircle className="h-4 w-4 mr-2" />
        Distribute Yield to{" "}
        {yieldPreview.distributions.filter((d) => !checkSystemAccount(d)).length} Investors
      </Button>
    </div>
  );
}
