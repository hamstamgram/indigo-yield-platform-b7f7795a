/**
 * YieldPreviewResults - Displays yield distribution preview with investor breakdown
 * Updated to support ADB (time-weighted) calculation with full transparency
 * Extracted from YieldOperationsPage for maintainability
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
import {
  type YieldCalculationResult,
  type YieldDistribution,
  type CrystallizationDistribution,
} from "@/services/admin";
import { isSystemAccount as checkSystemAccount } from "@/utils/accountUtils";
import { toNum } from "@/utils/numeric";

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
  crystallizationEvents?: CrystallizationDistribution[];
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
  crystallizationEvents,
  yieldPurpose,
}: YieldPreviewResultsProps) {
  const asset = selectedFund?.asset || "";
  const showCrystallization =
    yieldPurpose === "reporting" && crystallizationEvents && crystallizationEvents.length > 0;

  return (
    <div className="p-4 border rounded-lg bg-muted/20 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
          3
        </div>
        <h3 className="font-semibold">Confirm & Apply</h3>
      </div>

      {/* ADB Method Badge */}
      {yieldPreview.calculationMethod === "adb_v4" && (
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

      {/* Crystallized Yield (Period) - reporting purpose only */}
      {showCrystallization && (
        <CrystallizationBreakdown
          events={crystallizationEvents}
          newGross={toNum(yieldPreview.grossYield)}
          newFees={toNum(yieldPreview.totalFees)}
          newIb={toNum(yieldPreview.totalIbFees ?? 0)}
          newNet={toNum(yieldPreview.netYield)}
          asset={asset}
          formatValue={formatValue}
        />
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
      {yieldPreview.calculationMethod === "adb_v4" && (
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
      <div className="rounded-md border max-h-72 overflow-y-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-card z-10">
            <TableRow>
              <TableHead>Investor</TableHead>
              {/* ADB columns */}
              {yieldPreview.calculationMethod === "adb_v4" && (
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
              {yieldPreview.calculationMethod !== "adb_v4" && (
                <TableHead className="text-right">Current</TableHead>
              )}
              <TableHead className="text-right">Gross</TableHead>
              {/* Loss offset column for ADB */}
              {yieldPreview.calculationMethod === "adb_v4" && (
                <TableHead className="text-right">Loss Offset</TableHead>
              )}
              <TableHead className="text-right">Fee %</TableHead>
              <TableHead className="text-right">Fee</TableHead>
              <TableHead className="text-right">Net</TableHead>
              <TableHead className="text-right">IB</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {getFilteredDistributions(yieldPreview.distributions).map((inv) => (
              <TableRow
                key={inv.investorId}
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
                {yieldPreview.calculationMethod === "adb_v4" && (
                  <>
                    <TableCell className="text-right font-mono text-xs">
                      {formatValue(toNum(inv.adb ?? inv.currentBalance), asset)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-blue-600">
                      {(
                        (toNum(inv.adbWeight ?? 0) || toNum(inv.allocationPercentage) / 100) * 100
                      ).toFixed(2)}
                      %
                    </TableCell>
                  </>
                )}
                {yieldPreview.calculationMethod !== "adb_v4" && (
                  <TableCell className="text-right font-mono text-xs">
                    {formatValue(toNum(inv.currentBalance), asset)}
                  </TableCell>
                )}
                <TableCell
                  className={cn(
                    "text-right font-mono text-xs",
                    toNum(inv.grossYield) >= 0 ? "text-green-600" : "text-red-600"
                  )}
                >
                  {toNum(inv.grossYield) >= 0 ? "+" : ""}
                  {formatValue(toNum(inv.grossYield), asset)}
                </TableCell>
                {/* Loss offset column for ADB */}
                {yieldPreview.calculationMethod === "adb_v4" && (
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
                            <p>Carried loss: {formatValue(toNum(inv.carriedLoss ?? 0), asset)}</p>
                            <p>Offset applied: {formatValue(toNum(inv.lossOffset ?? 0), asset)}</p>
                            <p>Taxable: {formatValue(toNum(inv.taxableGain ?? 0), asset)}</p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                )}
                <TableCell className="text-right font-mono text-xs">{inv.feePercentage}%</TableCell>
                <TableCell className="text-right font-mono text-xs text-muted-foreground">
                  {toNum(inv.feeAmount) > 0 ? `-${formatValue(toNum(inv.feeAmount), asset)}` : "—"}
                </TableCell>
                <TableCell
                  className={cn(
                    "text-right font-mono text-xs font-semibold",
                    toNum(inv.netYield) >= 0 ? "" : "text-red-600"
                  )}
                >
                  {toNum(inv.netYield) >= 0 ? "+" : ""}
                  {formatValue(toNum(inv.netYield), asset)}
                </TableCell>
                <TableCell className="text-right font-mono text-xs text-purple-600">
                  {toNum(inv.ibAmount) > 0 ? `-${formatValue(toNum(inv.ibAmount), asset)}` : "—"}
                </TableCell>
              </TableRow>
            ))}
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

// ---------------------------------------------------------------------------
// Crystallization Breakdown Sub-Component
// ---------------------------------------------------------------------------

interface CrystallizationBreakdownProps {
  events: CrystallizationDistribution[];
  newGross: number;
  newFees: number;
  newIb: number;
  newNet: number;
  asset: string;
  formatValue: (value: number, asset: string) => string;
}

function CrystallizationBreakdown({
  events,
  newGross,
  newFees,
  newIb,
  newNet,
  asset,
  formatValue,
}: CrystallizationBreakdownProps) {
  // Sum crystallized totals
  const crystalGross = events.reduce((s, e) => s + toNum(e.grossYield), 0);
  const crystalFees = events.reduce((s, e) => s + toNum(e.feeAmount), 0);
  const crystalIb = events.reduce((s, e) => s + toNum(e.ibAmount), 0);
  const crystalNet = events.reduce((s, e) => s + toNum(e.netAmount), 0);

  const monthGross = crystalGross + newGross;
  const monthFees = crystalFees + newFees;
  const monthIb = crystalIb + newIb;
  const monthNet = crystalNet + newNet;

  return (
    <Card className="border-amber-500/20 bg-amber-500/5">
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-semibold text-amber-200">
              Crystallized Yield (Period)
            </span>
          </div>
          <Badge variant="outline" className="text-xs border-amber-500/30 text-amber-400">
            {events.length} event{events.length !== 1 ? "s" : ""}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-3">
        <div className="rounded-md border border-white/10 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10">
                <TableHead className="text-xs">Date</TableHead>
                <TableHead className="text-xs">Trigger</TableHead>
                <TableHead className="text-xs text-right">Gross</TableHead>
                <TableHead className="text-xs text-right">Fees</TableHead>
                <TableHead className="text-xs text-right">IB</TableHead>
                <TableHead className="text-xs text-right">Net</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((evt) => (
                <TableRow key={evt.id} className="border-white/5">
                  <TableCell className="text-xs font-mono">{evt.effectiveDate}</TableCell>
                  <TableCell className="text-xs">{evt.distributionType}</TableCell>
                  <TableCell className="text-xs text-right font-mono">
                    {formatValue(toNum(evt.grossYield), asset)}
                  </TableCell>
                  <TableCell className="text-xs text-right font-mono text-muted-foreground">
                    {formatValue(toNum(evt.feeAmount), asset)}
                  </TableCell>
                  <TableCell className="text-xs text-right font-mono text-purple-600">
                    {toNum(evt.ibAmount) > 0 ? formatValue(toNum(evt.ibAmount), asset) : "\u2014"}
                  </TableCell>
                  <TableCell className="text-xs text-right font-mono font-semibold">
                    {formatValue(toNum(evt.netAmount), asset)}
                  </TableCell>
                </TableRow>
              ))}

              {/* Crystallized Total */}
              <TableRow className="border-t border-white/10 bg-white/[0.02]">
                <TableCell colSpan={2} className="text-xs text-right font-medium text-amber-400">
                  Crystallized
                </TableCell>
                <TableCell className="text-xs text-right font-mono font-semibold">
                  {formatValue(crystalGross, asset)}
                </TableCell>
                <TableCell className="text-xs text-right font-mono text-muted-foreground">
                  {formatValue(crystalFees, asset)}
                </TableCell>
                <TableCell className="text-xs text-right font-mono text-purple-600">
                  {crystalIb > 0 ? formatValue(crystalIb, asset) : "\u2014"}
                </TableCell>
                <TableCell className="text-xs text-right font-mono font-semibold">
                  {formatValue(crystalNet, asset)}
                </TableCell>
              </TableRow>

              {/* + New Yield */}
              <TableRow className="border-white/5 bg-white/[0.02]">
                <TableCell colSpan={2} className="text-xs text-right font-medium text-green-400">
                  + New Yield
                </TableCell>
                <TableCell className="text-xs text-right font-mono text-green-600">
                  {formatValue(newGross, asset)}
                </TableCell>
                <TableCell className="text-xs text-right font-mono text-muted-foreground">
                  {formatValue(newFees, asset)}
                </TableCell>
                <TableCell className="text-xs text-right font-mono text-purple-600">
                  {newIb > 0 ? formatValue(newIb, asset) : "\u2014"}
                </TableCell>
                <TableCell className="text-xs text-right font-mono font-semibold text-green-400">
                  {formatValue(newNet, asset)}
                </TableCell>
              </TableRow>

              {/* = Month Total */}
              <TableRow className="border-t border-white/10 bg-white/[0.04]">
                <TableCell colSpan={2} className="text-xs text-right font-bold text-white">
                  = Month Total
                </TableCell>
                <TableCell className="text-xs text-right font-mono font-bold text-white">
                  {formatValue(monthGross, asset)}
                </TableCell>
                <TableCell className="text-xs text-right font-mono font-bold text-muted-foreground">
                  {formatValue(monthFees, asset)}
                </TableCell>
                <TableCell className="text-xs text-right font-mono font-bold text-purple-400">
                  {monthIb > 0 ? formatValue(monthIb, asset) : "\u2014"}
                </TableCell>
                <TableCell className="text-xs text-right font-mono font-bold text-white">
                  {formatValue(monthNet, asset)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
