/**
 * YieldPreviewResults - Displays yield distribution preview with investor breakdown
 * Extracted from YieldOperationsPage for maintainability
 */

import {
  Card, CardContent, CardHeader,
  Button, Input, Label, Badge, Switch,
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui";
import {
  CheckCircle,
  Building2,
  UserCheck,
  ArrowRightLeft,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { type YieldCalculationResult, type YieldDistribution } from "@/services";
import { isSystemAccount as checkSystemAccount } from "@/utils/accountUtils";

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

  return (
    <div className="p-4 border rounded-lg bg-muted/20 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
          3
        </div>
        <h3 className="font-semibold">Confirm & Apply</h3>
      </div>

      {/* Idempotency Warnings */}
      {yieldPreview.hasConflicts && (
        <div className="flex items-start gap-2 p-3 rounded-md bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 text-sm">
          <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div>
            <strong>Some transactions already exist.</strong> {yieldPreview.existingConflicts.length} existing reference(s) will be skipped.
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Gross Yield</p>
            <p className="text-lg font-mono font-bold text-green-600">
              +{formatValue(yieldPreview.grossYield, asset)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Total Fees</p>
            <p className="text-lg font-mono font-semibold">
              {formatValue(yieldPreview.totalFees, asset)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">IB Fees</p>
            <p className="text-lg font-mono font-semibold text-purple-600">
              {formatValue(yieldPreview.totalIbFees || 0, asset)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Net Yield</p>
            <p className="text-lg font-mono font-bold text-primary">
              +{formatValue(yieldPreview.netYield, asset)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* INDIGO FEES Credit Card */}
      {yieldPreview.indigoFeesCredit > 0 && (
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">INDIGO FEES Credit</span>
              </div>
              <span className="font-mono font-bold text-blue-600">
                +{formatValue(yieldPreview.indigoFeesCredit, asset)} {asset}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Platform fees collected after IB commissions
            </p>
          </CardContent>
        </Card>
      )}

      {/* IB Credits Summary */}
      {yieldPreview.ibCredits && yieldPreview.ibCredits.length > 0 && (
        <Card className="border-purple-200 bg-purple-50 dark:bg-purple-950/20">
          <CardHeader className="pb-2 pt-3 px-3">
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium">IB Credits ({yieldPreview.ibCredits.length})</span>
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
                      +{formatValue(ib.amount, asset)}
                    </span>
                    {ib.wouldSkip && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge variant="outline" className="text-xs">Skip</Badge>
                          </TooltipTrigger>
                          <TooltipContent>Already exists</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
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
        <div className="flex items-center gap-2">
          <Switch
            id="show-system"
            checked={showSystemAccounts}
            onCheckedChange={setShowSystemAccounts}
          />
          <Label htmlFor="show-system" className="text-sm">Show system accounts</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id="show-changed"
            checked={showOnlyChanged}
            onCheckedChange={setShowOnlyChanged}
          />
          <Label htmlFor="show-changed" className="text-sm">Only new entries</Label>
        </div>
      </div>

      {/* Investor Breakdown Table */}
      <div className="rounded-md border max-h-72 overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Investor</TableHead>
              <TableHead className="text-right">Current</TableHead>
              <TableHead className="text-right">Gross</TableHead>
              <TableHead className="text-right">Fee %</TableHead>
              <TableHead className="text-right">Fee</TableHead>
              <TableHead className="text-right">Net</TableHead>
              <TableHead className="text-right">IB</TableHead>
              <TableHead className="text-right">Delta</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {getFilteredDistributions(yieldPreview.distributions).map((inv) => (
              <TableRow
                key={inv.investorId}
                className={cn(
                  inv.wouldSkip && "opacity-50",
                  checkSystemAccount(inv) && "bg-blue-50/50 dark:bg-blue-950/20"
                )}
              >
                <TableCell>
                  <div className="flex items-center gap-2">
                    {checkSystemAccount(inv) && (
                      <Building2 className="h-3 w-3 text-blue-600" />
                    )}
                    <div>
                      <p className="font-medium text-sm truncate max-w-[120px]">{inv.investorName}</p>
                      {inv.ibParentName && (
                        <p className="text-xs text-purple-600">IB: {inv.ibParentName}</p>
                      )}
                    </div>
                    {inv.wouldSkip && (
                      <Badge variant="outline" className="text-xs">Skip</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono text-xs">
                  {formatValue(inv.currentBalance, asset)}
                </TableCell>
                <TableCell className="text-right font-mono text-xs text-green-600">
                  +{formatValue(inv.grossYield, asset)}
                </TableCell>
                <TableCell className="text-right font-mono text-xs">
                  {inv.feePercentage}%
                </TableCell>
                <TableCell className="text-right font-mono text-xs text-muted-foreground">
                  {inv.feeAmount > 0 ? `-${formatValue(inv.feeAmount, asset)}` : "—"}
                </TableCell>
                <TableCell className="text-right font-mono text-xs font-semibold">
                  +{formatValue(inv.netYield, asset)}
                </TableCell>
                <TableCell className="text-right font-mono text-xs text-purple-600">
                  {inv.ibAmount > 0 ? `-${formatValue(inv.ibAmount, asset)}` : "—"}
                </TableCell>
                <TableCell className="text-right font-mono text-xs font-bold text-primary">
                  +{formatValue(inv.positionDelta, asset)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Showing {getFilteredDistributions(yieldPreview.distributions).length} of {yieldPreview.distributions.length} investors
      </p>

      {/* Apply Button */}
      <Button
        onClick={onConfirmApply}
        disabled={applyLoading}
        className="w-full"
        size="lg"
      >
        <CheckCircle className="h-4 w-4 mr-2" />
        Apply Yield to {yieldPreview.investorCount} Investors
      </Button>
    </div>
  );
}
