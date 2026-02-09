/**
 * YieldPreviewResults - Displays yield distribution preview with investor breakdown
 * Updated to support ADB (time-weighted) calculation with full transparency
 * Per-investor crystallization sub-rows for reporting purpose
 */

import {
  Card,
  CardContent,
  CardHeader,
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
import {
  CheckCircle,
  Building2,
  UserCheck,
  ArrowRightLeft,
  AlertTriangle,
  Clock,
  TrendingDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { type YieldCalculationResult, type YieldDistribution } from "@/services/admin";
import { type InvestorCrystallizationEvent } from "@/services/admin/yieldCrystallizationService";
import { isSystemAccount as checkSystemAccount } from "@/utils/accountUtils";
import { toNum } from "@/utils/numeric";
import React from "react";

interface YieldPreviewResultsProps {
  yieldPreview: YieldCalculationResult;
  selectedFund: { asset: string } | null;
  formatValue: (value: number, asset: string) => string;
  showSystemAccounts: boolean;
  setShowSystemAccounts: (show: boolean) => void;
  showOnlyChanged: boolean;
  setShowOnlyChanged: (show: boolean) => void;
  searchInvestor: string;
  setSearchInvestor: (search: string) => void;
  getFilteredDistributions: (distributions: YieldDistribution[]) => YieldDistribution[];
  onConfirmApply: () => void;
  applyLoading: boolean;
  crystallizationMap?: Map<string, InvestorCrystallizationEvent[]>;
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
  crystallizationMap,
  yieldPurpose,
}: YieldPreviewResultsProps) {
  const asset = selectedFund?.asset || "";
  const isAdb = yieldPreview.calculationMethod === "adb_v4";
  const hasCrystallization =
    yieldPurpose === "reporting" && crystallizationMap && crystallizationMap.size > 0;

  return (
    <div className="p-4 border rounded-lg bg-muted/20 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
          3
        </div>
        <h3 className="font-semibold">Confirm & Apply</h3>
      </div>

      {/* ADB Method Badge */}
      {isAdb && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800"
            >
              <Clock className="h-3 w-3 mr-1" />
              Time-Weighted (ADB)
            </Badge>
            {yieldPreview.daysInPeriod && (
              <span className="text-xs text-muted-foreground">
                {yieldPreview.periodStart} to {yieldPreview.periodEnd} ({yieldPreview.daysInPeriod}{" "}
                days)
              </span>
            )}
          </div>
          {yieldPreview.conservationCheck !== undefined && (
            <Badge
              variant={yieldPreview.conservationCheck ? "outline" : "destructive"}
              className="text-xs"
            >
              {yieldPreview.conservationCheck ? "Conservation OK" : "Conservation Error"}
            </Badge>
          )}
        </div>
      )}

      {/* Loss Carryforward Summary */}
      {yieldPreview.totalLossOffset !== undefined && toNum(yieldPreview.totalLossOffset) > 0 && (
        <div className="flex items-start gap-2 p-3 rounded-md bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 text-sm">
          <TrendingDown className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div>
            <strong>Loss carryforward applied.</strong>{" "}
            {formatValue(toNum(yieldPreview.totalLossOffset), asset)} {asset} of prior losses offset
            against this period&apos;s gains, reducing fees.
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
        {/* Total ADB (for ADB method) */}
        {yieldPreview.totalAdb !== undefined && toNum(yieldPreview.totalAdb) > 0 && (
          <Card className="border-slate-200 bg-slate-50 dark:bg-slate-950/20">
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">Total ADB</p>
              <p className="text-lg font-mono font-semibold">
                {formatValue(toNum(yieldPreview.totalAdb), asset)}
              </p>
              <p className="text-xs text-muted-foreground">Time-weighted capital</p>
            </CardContent>
          </Card>
        )}
        <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Gross Yield</p>
            <p
              className={cn(
                "text-lg font-mono font-bold",
                toNum(yieldPreview.grossYield) >= 0 ? "text-green-600" : "text-red-600"
              )}
            >
              {toNum(yieldPreview.grossYield) >= 0 ? "+" : ""}
              {formatValue(toNum(yieldPreview.grossYield), asset)}
            </p>
            {yieldPreview.yieldRatePct !== undefined && (
              <p className="text-xs text-muted-foreground">
                {toNum(yieldPreview.yieldRatePct).toFixed(4)}%
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Total Fees</p>
            <p className="text-lg font-mono font-semibold">
              {formatValue(toNum(yieldPreview.totalFees), asset)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">IB Fees</p>
            <p className="text-lg font-mono font-semibold text-purple-600">
              {formatValue(toNum(yieldPreview.totalIbFees ?? 0), asset)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Net Yield</p>
            <p
              className={cn(
                "text-lg font-mono font-bold",
                toNum(yieldPreview.netYield) >= 0 ? "text-primary" : "text-red-600"
              )}
            >
              {toNum(yieldPreview.netYield) >= 0 ? "+" : ""}
              {formatValue(toNum(yieldPreview.netYield), asset)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* INDIGO FEES Credit Card */}
      {toNum(yieldPreview.indigoFeesCredit) > 0 && (
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">INDIGO FEES Credit</span>
              </div>
              <span className="font-mono font-bold text-blue-600">
                +{formatValue(toNum(yieldPreview.indigoFeesCredit), asset)} {asset}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Platform fees collected after IB commissions
            </p>
          </CardContent>
        </Card>
      )}

      {/* Yield Math Explanation (collapsible) */}
      {isAdb && (
        <details className="border rounded-md">
          <summary className="cursor-pointer p-3 text-sm font-medium hover:bg-muted/50">
            Yield calculation details (ADB method)
          </summary>
          <div className="p-3 pt-0 space-y-2 text-sm text-muted-foreground">
            <p>
              We crystallize yield before any deposit/withdrawal because ownership changes after
              each flow. This locks the pre-flow ownership for the days already elapsed, then
              recalculates ownership for the remaining days.
            </p>
            <div className="grid gap-1 text-xs">
              <div>
                <span className="font-medium text-foreground">ADB share %</span> = investor ADB /
                total ADB
              </div>
              <div>
                <span className="font-medium text-foreground">Gross</span> = gross yield x ADB share
                %
              </div>
              <div>
                <span className="font-medium text-foreground">Investor fee</span> = gross x fee %
              </div>
              <div>
                <span className="font-medium text-foreground">IB commission</span> = gross x IB %
              </div>
              <div>
                <span className="font-medium text-foreground">Net</span> = gross - fee - IB
              </div>
            </div>
          </div>
        </details>
      )}

      {/* IB Credits Summary */}
      {yieldPreview.ibCredits && yieldPreview.ibCredits.length > 0 && (
        <Card className="border-purple-200 bg-purple-50 dark:bg-purple-950/20">
          <CardHeader className="pb-2 pt-3 px-3">
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium">
                IB Credits ({yieldPreview.ibCredits.length})
              </span>
            </div>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {yieldPreview.ibCredits.map((ib, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <ArrowRightLeft className="h-3 w-3 text-muted-foreground" />
                    <span className="truncate max-w-[150px]">{ib.ibInvestorName}</span>
                    <span className="text-xs text-muted-foreground">({ib.ibPercentage}%)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-purple-600">
                      +{formatValue(toNum(ib.amount), asset)}
                    </span>
                    {ib.wouldSkip && (
                      <Tooltip>
                        <TooltipTrigger>
                          <Badge variant="outline" className="text-xs">
                            Skip
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>Already exists</TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
              {/* ADB columns */}
              {isAdb && (
                <>
                  <TableHead className="text-right">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-help underline decoration-dotted underline-offset-4">
                          ADB
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[280px]">
                        <p className="text-xs">
                          Average Daily Balance: Time-weighted balance used to calculate each
                          investor's proportional share of the yield
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TableHead>
                  <TableHead className="text-right">Weight</TableHead>
                </>
              )}
              {!isAdb && <TableHead className="text-right">Current</TableHead>}
              <TableHead className="text-right">Gross</TableHead>
              {/* Loss offset column for ADB */}
              {isAdb && <TableHead className="text-right">Loss Offset</TableHead>}
              <TableHead className="text-right">Fee %</TableHead>
              <TableHead className="text-right">Fee</TableHead>
              <TableHead className="text-right">Net</TableHead>
              <TableHead className="text-right">IB</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {getFilteredDistributions(yieldPreview.distributions).map((inv) => {
              const events = hasCrystallization
                ? crystallizationMap.get(inv.investorId)
                : undefined;
              const hasEvents = events && events.length > 0;

              // Compute crystal totals for this investor
              const crystalGross = hasEvents
                ? events.reduce((s, e) => s + toNum(e.grossYield), 0)
                : 0;
              const crystalFee = hasEvents ? events.reduce((s, e) => s + toNum(e.feeAmount), 0) : 0;
              const crystalIb = hasEvents ? events.reduce((s, e) => s + toNum(e.ibAmount), 0) : 0;
              const crystalNet = hasEvents ? events.reduce((s, e) => s + toNum(e.netYield), 0) : 0;

              // Month totals = crystal + new
              const monthGross = crystalGross + toNum(inv.grossYield);
              const monthFee = crystalFee + toNum(inv.feeAmount);
              const monthNet = crystalNet + toNum(inv.netYield);

              return (
                <React.Fragment key={inv.investorId}>
                  {/* Main investor row */}
                  <TableRow
                    className={cn(
                      inv.wouldSkip && "opacity-50",
                      checkSystemAccount(inv) && "bg-blue-50/50 dark:bg-blue-950/20",
                      toNum(inv.carriedLoss ?? 0) > 0 && "bg-amber-50/30 dark:bg-amber-950/10"
                    )}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {checkSystemAccount(inv) && <Building2 className="h-3 w-3 text-blue-600" />}
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
                    {/* ADB columns */}
                    {isAdb && (
                      <>
                        <TableCell className="text-right font-mono text-xs">
                          {formatValue(toNum(inv.adb ?? inv.currentBalance), asset)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs text-blue-600">
                          {(
                            (toNum(inv.adbWeight ?? 0) || toNum(inv.allocationPercentage) / 100) *
                            100
                          ).toFixed(2)}
                          %
                        </TableCell>
                      </>
                    )}
                    {!isAdb && (
                      <TableCell className="text-right font-mono text-xs">
                        {formatValue(toNum(inv.currentBalance), asset)}
                      </TableCell>
                    )}
                    {/* Gross - two-line when crystal events exist */}
                    <TableCell className="text-right font-mono text-xs">
                      <div
                        className={cn(
                          "font-bold",
                          toNum(inv.grossYield) >= 0 ? "text-green-600" : "text-red-600"
                        )}
                      >
                        {hasEvents && (
                          <span className="text-[10px] text-muted-foreground font-normal mr-0.5">
                            New:{" "}
                          </span>
                        )}
                        {toNum(inv.grossYield) >= 0 ? "+" : ""}
                        {formatValue(toNum(inv.grossYield), asset)}
                      </div>
                      {hasEvents && (
                        <div className="text-[10px] text-muted-foreground font-normal mt-0.5">
                          Mon: +{formatValue(monthGross, asset)}
                        </div>
                      )}
                    </TableCell>
                    {/* Loss offset column for ADB */}
                    {isAdb && (
                      <TableCell className="text-right font-mono text-xs">
                        {toNum(inv.lossOffset ?? 0) > 0 ? (
                          <Tooltip>
                            <TooltipTrigger>
                              <span className="text-amber-600">
                                -{formatValue(toNum(inv.lossOffset ?? 0), asset)}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="text-xs">
                                <p>
                                  Carried loss: {formatValue(toNum(inv.carriedLoss ?? 0), asset)}
                                </p>
                                <p>
                                  Offset applied: {formatValue(toNum(inv.lossOffset ?? 0), asset)}
                                </p>
                                <p>Taxable: {formatValue(toNum(inv.taxableGain ?? 0), asset)}</p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <span className="text-muted-foreground">{"\u2014"}</span>
                        )}
                      </TableCell>
                    )}
                    <TableCell className="text-right font-mono text-xs">
                      {inv.feePercentage}%
                    </TableCell>
                    {/* Fee - two-line when crystal events exist */}
                    <TableCell className="text-right font-mono text-xs text-muted-foreground">
                      <div>
                        {hasEvents && <span className="text-[10px] font-normal mr-0.5">New: </span>}
                        {toNum(inv.feeAmount) > 0
                          ? `-${formatValue(toNum(inv.feeAmount), asset)}`
                          : "\u2014"}
                      </div>
                      {hasEvents && (
                        <div className="text-[10px] font-normal mt-0.5">
                          Mon: -{formatValue(monthFee, asset)}
                        </div>
                      )}
                    </TableCell>
                    {/* Net - two-line when crystal events exist */}
                    <TableCell
                      className={cn(
                        "text-right font-mono text-xs font-semibold",
                        toNum(inv.netYield) >= 0 ? "" : "text-red-600"
                      )}
                    >
                      <div>
                        {hasEvents && (
                          <span className="text-[10px] text-muted-foreground font-normal mr-0.5">
                            New:{" "}
                          </span>
                        )}
                        {toNum(inv.netYield) >= 0 ? "+" : ""}
                        {formatValue(toNum(inv.netYield), asset)}
                      </div>
                      {hasEvents && (
                        <div className="text-[10px] text-muted-foreground font-normal mt-0.5">
                          Mon: +{formatValue(monthNet, asset)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-purple-600">
                      {toNum(inv.ibAmount) > 0
                        ? `-${formatValue(toNum(inv.ibAmount), asset)}`
                        : "\u2014"}
                    </TableCell>
                  </TableRow>

                  {/* Crystallization sub-rows (amber highlight) */}
                  {hasEvents &&
                    events.map((evt, idx) => (
                      <TableRow
                        key={`${inv.investorId}-crystal-${idx}`}
                        className="bg-amber-500/10 dark:bg-amber-950/20 border-amber-500/10"
                      >
                        <TableCell colSpan={isAdb ? 3 : 2} className="text-xs pl-6">
                          <div className="flex items-center gap-2">
                            <ArrowRightLeft className="h-3 w-3 text-amber-500 flex-shrink-0" />
                            <span className="font-mono text-amber-300">{evt.eventDate}</span>
                            <Badge
                              variant="outline"
                              className="text-[10px] py-0 h-4 border-amber-500/30 text-amber-400"
                            >
                              {evt.triggerType}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs text-amber-300">
                          +{formatValue(toNum(evt.grossYield), asset)}
                        </TableCell>
                        {/* Loss offset placeholder for ADB */}
                        {isAdb && (
                          <TableCell className="text-right font-mono text-xs text-muted-foreground">
                            {"\u2014"}
                          </TableCell>
                        )}
                        <TableCell className="text-right font-mono text-xs text-muted-foreground">
                          {"\u2014"}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs text-amber-300/70">
                          {toNum(evt.feeAmount) > 0
                            ? `-${formatValue(toNum(evt.feeAmount), asset)}`
                            : "\u2014"}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-semibold text-amber-300">
                          +{formatValue(toNum(evt.netYield), asset)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs text-muted-foreground">
                          {"\u2014"}
                        </TableCell>
                      </TableRow>
                    ))}
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

      {/* Apply Button */}
      <Button onClick={onConfirmApply} disabled={applyLoading} className="w-full" size="lg">
        <CheckCircle className="h-4 w-4 mr-2" />
        Apply Yield to {yieldPreview.investorCount} Investors
      </Button>
    </div>
  );
}
