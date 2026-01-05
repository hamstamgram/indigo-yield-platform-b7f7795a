/**
 * Yield Correction Preview Component V2
 * Displays summary, time-weighted investor impact, transactions, and reconciliation
 */

import { useState } from "react";
import { Download, Users, TrendingUp, ArrowUpDown, AlertTriangle, CheckCircle2, Scale } from "lucide-react";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
  Button, Badge,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
  Tabs, TabsContent, TabsList, TabsTrigger,
  ScrollArea,
} from "@/components/ui";
import { CryptoIcon } from "@/components/CryptoIcons";
import {
  formatTokenAmount,
  exportInvestorImpactToCsv,
  exportTransactionDiffsToCsv,
  downloadCsv,
  type CorrectionSummary,
  type InvestorImpactRow,
  type TransactionDiff,
  type ReportImpact,
  type Reconciliation,
} from "@/services";

interface YieldCorrectionPreviewProps {
  summary: CorrectionSummary;
  investorRows: InvestorImpactRow[];
  txDiffs: TransactionDiff[];
  reportImpacts: ReportImpact[];
  reconciliation?: Reconciliation;
}

export function YieldCorrectionPreview({
  summary,
  investorRows,
  txDiffs,
  reportImpacts,
  reconciliation,
}: YieldCorrectionPreviewProps) {
  const [sortField, setSortField] = useState<keyof InvestorImpactRow>("avg_capital");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const sortedInvestors = [...investorRows].sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];
    if (typeof aVal === "number" && typeof bVal === "number") {
      return sortDir === "asc" ? aVal - bVal : bVal - aVal;
    }
    return 0;
  });

  const handleSort = (field: keyof InvestorImpactRow) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const handleExportInvestors = () => {
    const csv = exportInvestorImpactToCsv(investorRows, summary);
    downloadCsv(csv, `yield-correction-investors-${summary.period_end || summary.effective_date}.csv`);
  };

  const handleExportTransactions = () => {
    const csv = exportTransactionDiffsToCsv(txDiffs, summary);
    downloadCsv(csv, `yield-correction-transactions-${summary.period_end || summary.effective_date}.csv`);
  };

  const deltaSign = (val: number) => (val >= 0 ? "+" : "");
  const deltaColor = (val: number) =>
    val > 0 ? "text-green-600 dark:text-green-400" : val < 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground";

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <CryptoIcon symbol={summary.fund_asset} className="h-4 w-4" />
              <span className="text-xs text-muted-foreground">Delta AUM</span>
            </div>
            <p className={`text-lg font-mono font-semibold ${deltaColor(summary.delta_aum)}`}>
              {deltaSign(summary.delta_aum)}{formatTokenAmount(summary.delta_aum, summary.fund_asset)} {summary.fund_asset}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Investors</span>
            </div>
            <p className="text-lg font-semibold">{summary.investors_affected}</p>
          </CardContent>
        </Card>

        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Fee Delta</span>
            </div>
            <p className={`text-lg font-mono font-semibold ${deltaColor(summary.total_fee_delta)}`}>
              {deltaSign(summary.total_fee_delta)}{formatTokenAmount(summary.total_fee_delta, summary.fund_asset)}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">IB Delta</span>
            </div>
            <p className={`text-lg font-mono font-semibold ${deltaColor(summary.total_ib_delta)}`}>
              {deltaSign(summary.total_ib_delta)}{formatTokenAmount(summary.total_ib_delta, summary.fund_asset)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Warning for closed month */}
      {summary.is_month_closed && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <span className="text-sm text-amber-700 dark:text-amber-300">
            This month is closed. Super Admin confirmation required.
          </span>
        </div>
      )}

      {/* Reconciliation Check */}
      {reconciliation && (
        <Card className={reconciliation.conservation_check ? "border-green-200 dark:border-green-800" : "border-red-200 dark:border-red-800"}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Scale className="h-4 w-4" />
              Token Conservation Check
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-muted-foreground">Sum Gross Yield:</span>
                <span className="font-mono ml-2">{formatTokenAmount(reconciliation.sum_gross_yield, summary.fund_asset)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Fund Gross Yield:</span>
                <span className="font-mono ml-2">{formatTokenAmount(reconciliation.fund_gross_yield, summary.fund_asset)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Sum Fees:</span>
                <span className="font-mono ml-2">{formatTokenAmount(reconciliation.sum_fees, summary.fund_asset)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Platform + IB:</span>
                <span className="font-mono ml-2">{formatTokenAmount(reconciliation.platform_fees + reconciliation.sum_ib, summary.fund_asset)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-2 border-t">
              {reconciliation.conservation_check ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-green-600 font-medium">Token conservation verified ✓</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <span className="text-red-600 font-medium">Conservation check failed</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="investors" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="investors">Investors ({investorRows.length})</TabsTrigger>
          <TabsTrigger value="transactions">Transactions ({txDiffs.length})</TabsTrigger>
          <TabsTrigger value="reports">Reports ({reportImpacts.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="investors" className="mt-4">
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Time-Weighted Investor Impact</CardTitle>
              <Button variant="outline" size="sm" onClick={handleExportInvestors}>
                <Download className="h-4 w-4 mr-1" />Export
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[300px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Investor</TableHead>
                      <TableHead className="text-right cursor-pointer" onClick={() => handleSort("avg_capital")}>
                        <div className="flex items-center justify-end gap-1">Avg Capital <ArrowUpDown className="h-3 w-3" /></div>
                      </TableHead>
                      <TableHead className="text-right cursor-pointer" onClick={() => handleSort("share_pct")}>
                        <div className="flex items-center justify-end gap-1">Share % <ArrowUpDown className="h-3 w-3" /></div>
                      </TableHead>
                      <TableHead className="text-right cursor-pointer" onClick={() => handleSort("delta_net")}>
                        <div className="flex items-center justify-end gap-1">Δ Net <ArrowUpDown className="h-3 w-3" /></div>
                      </TableHead>
                      <TableHead className="text-right">Fee %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedInvestors.map((row) => (
                      <TableRow key={row.investor_id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{row.investor_name}</p>
                            <p className="text-xs text-muted-foreground">
                              Begin: {formatTokenAmount(row.beginning_balance, summary.fund_asset)}
                              {row.additions > 0 && <span className="text-green-600"> +{formatTokenAmount(row.additions, summary.fund_asset)}</span>}
                              {row.redemptions > 0 && <span className="text-red-600"> -{formatTokenAmount(row.redemptions, summary.fund_asset)}</span>}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {formatTokenAmount(row.avg_capital, summary.fund_asset)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {row.share_pct.toFixed(2)}%
                        </TableCell>
                        <TableCell className={`text-right font-mono text-sm ${deltaColor(row.delta_net)}`}>
                          {deltaSign(row.delta_net)}{formatTokenAmount(row.delta_net, summary.fund_asset)}
                        </TableCell>
                        <TableCell className="text-right text-sm">{row.fee_pct}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="mt-4">
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Transaction Diffs</CardTitle>
              <Button variant="outline" size="sm" onClick={handleExportTransactions}>
                <Download className="h-4 w-4 mr-1" />Export
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[300px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Investor</TableHead>
                      <TableHead className="text-right">Delta</TableHead>
                      <TableHead>Visibility</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {txDiffs.map((diff, i) => (
                      <TableRow key={i}>
                        <TableCell><Badge variant="outline">{diff.type}</Badge></TableCell>
                        <TableCell className="text-sm">{diff.investor_name}</TableCell>
                        <TableCell className={`text-right font-mono text-sm ${deltaColor(diff.delta_amount)}`}>
                          {deltaSign(diff.delta_amount)}{formatTokenAmount(diff.delta_amount, summary.fund_asset)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={diff.visibility_scope === "investor_visible" ? "default" : "secondary"} className="text-xs">
                            {diff.visibility_scope === "investor_visible" ? "Visible" : "Admin"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Reports Affected</CardTitle>
              <CardDescription>These reports will need regeneration</CardDescription>
            </CardHeader>
            <CardContent>
              {reportImpacts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No reports affected</p>
              ) : (
                <div className="space-y-3">
                  {reportImpacts.map((impact, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div>
                        <p className="font-medium text-sm">Period: {impact.period_id}</p>
                        <p className="text-xs text-muted-foreground">{impact.investors_affected} investors</p>
                      </div>
                      {impact.needs_regeneration && <Badge variant="secondary">Needs Regeneration</Badge>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
