/**
 * Yield Correction Preview Component
 * Displays summary, investor impact, and transaction diffs
 */

import { useState } from "react";
import { Download, Users, TrendingUp, ArrowUpDown, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CryptoIcon } from "@/components/CryptoIcons";
import {
  CorrectionSummary,
  InvestorImpactRow,
  TransactionDiff,
  ReportImpact,
  formatTokenAmount,
  exportInvestorImpactToCsv,
  exportTransactionDiffsToCsv,
  downloadCsv,
} from "@/services/admin/yieldCorrectionService";

interface YieldCorrectionPreviewProps {
  summary: CorrectionSummary;
  investorRows: InvestorImpactRow[];
  txDiffs: TransactionDiff[];
  reportImpacts: ReportImpact[];
}

export function YieldCorrectionPreview({
  summary,
  investorRows,
  txDiffs,
  reportImpacts,
}: YieldCorrectionPreviewProps) {
  const [sortField, setSortField] = useState<keyof InvestorImpactRow>("delta_net");
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
    downloadCsv(csv, `yield-correction-investors-${summary.effective_date}.csv`);
  };

  const handleExportTransactions = () => {
    const csv = exportTransactionDiffsToCsv(txDiffs, summary);
    downloadCsv(csv, `yield-correction-transactions-${summary.effective_date}.csv`);
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
              {deltaSign(summary.delta_aum)}
              {formatTokenAmount(summary.delta_aum, summary.fund_asset)} {summary.fund_asset}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Investors Affected</span>
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
              {deltaSign(summary.total_fee_delta)}
              {formatTokenAmount(summary.total_fee_delta, summary.fund_asset)}
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
              {deltaSign(summary.total_ib_delta)}
              {formatTokenAmount(summary.total_ib_delta, summary.fund_asset)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Warning for closed month */}
      {summary.is_month_closed && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <span className="text-sm text-amber-700 dark:text-amber-300">
            This month is closed. Super Admin confirmation required. Type "APPLY CLOSED MONTH CORRECTION" to proceed.
          </span>
        </div>
      )}

      {/* AUM Change Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">AUM Change</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Old: </span>
              <span className="font-mono">{formatTokenAmount(summary.old_aum, summary.fund_asset)}</span>
            </div>
            <span className="text-muted-foreground">→</span>
            <div>
              <span className="text-muted-foreground">New: </span>
              <span className="font-mono">{formatTokenAmount(summary.new_aum, summary.fund_asset)}</span>
            </div>
            <Badge variant="outline" className={deltaColor(summary.delta_aum)}>
              {deltaSign(summary.delta_aum)}
              {formatTokenAmount(summary.delta_aum, summary.fund_asset)} {summary.fund_asset}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for Investors and Transactions */}
      <Tabs defaultValue="investors" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="investors">Investor Impact ({investorRows.length})</TabsTrigger>
          <TabsTrigger value="transactions">Transactions ({txDiffs.length})</TabsTrigger>
          <TabsTrigger value="reports">Reports ({reportImpacts.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="investors" className="mt-4">
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Investor Impact</CardTitle>
              <Button variant="outline" size="sm" onClick={handleExportInvestors}>
                <Download className="h-4 w-4 mr-1" />
                Export CSV
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[300px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Investor</TableHead>
                      <TableHead className="text-right cursor-pointer" onClick={() => handleSort("position_value")}>
                        <div className="flex items-center justify-end gap-1">
                          Position <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead className="text-right cursor-pointer" onClick={() => handleSort("delta_net")}>
                        <div className="flex items-center justify-end gap-1">
                          Δ Net <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead className="text-right cursor-pointer" onClick={() => handleSort("delta_fee")}>
                        <div className="flex items-center justify-end gap-1">
                          Δ Fee <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead className="text-right">Δ IB</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedInvestors.map((row) => (
                      <TableRow key={row.investor_id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{row.investor_name}</p>
                            <p className="text-xs text-muted-foreground">{row.share_pct.toFixed(2)}% share</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {formatTokenAmount(row.position_value, summary.fund_asset)}
                        </TableCell>
                        <TableCell className={`text-right font-mono text-sm ${deltaColor(row.delta_net)}`}>
                          {deltaSign(row.delta_net)}
                          {formatTokenAmount(row.delta_net, summary.fund_asset)}
                        </TableCell>
                        <TableCell className={`text-right font-mono text-sm ${deltaColor(row.delta_fee)}`}>
                          {deltaSign(row.delta_fee)}
                          {formatTokenAmount(row.delta_fee, summary.fund_asset)}
                        </TableCell>
                        <TableCell className={`text-right font-mono text-sm ${deltaColor(row.delta_ib)}`}>
                          {row.ib_parent_id ? (
                            <>
                              {deltaSign(row.delta_ib)}
                              {formatTokenAmount(row.delta_ib, summary.fund_asset)}
                            </>
                          ) : (
                            "-"
                          )}
                        </TableCell>
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
                <Download className="h-4 w-4 mr-1" />
                Export CSV
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[300px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Investor</TableHead>
                      <TableHead className="text-right">Delta Amount</TableHead>
                      <TableHead>Visibility</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {txDiffs.map((diff, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <Badge variant="outline">{diff.tx_type}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{diff.investor_name}</TableCell>
                        <TableCell className={`text-right font-mono text-sm ${deltaColor(diff.delta_amount)}`}>
                          {deltaSign(diff.delta_amount)}
                          {formatTokenAmount(diff.delta_amount, summary.fund_asset)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={diff.visibility_scope === "investor_visible" ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {diff.visibility_scope === "investor_visible" ? "Visible" : "Admin Only"}
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
              <CardDescription>These reports will need regeneration after applying the correction</CardDescription>
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
                        <p className="text-xs text-muted-foreground">
                          {impact.investors_affected} investors, Tables: {impact.tables_affected.join(", ")}
                        </p>
                      </div>
                      {impact.needs_regeneration && (
                        <Badge variant="secondary">Needs Regeneration</Badge>
                      )}
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
