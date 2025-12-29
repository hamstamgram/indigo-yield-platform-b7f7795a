import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatAssetAmount, getAssetLogo, getAssetName } from "@/utils/assets";
import { Loader2, TrendingUp, Calendar } from "lucide-react";
import { usePerformanceHistory } from "@/hooks/investor";
import type { PerformanceHistoryRecord } from "@/services/shared/performanceService";

export default function MyPerformanceHistory() {
  const { data: groupedReports, isLoading, error } = usePerformanceHistory();

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="col-span-full">
        <CardContent className="pt-6">
          <div className="text-center py-12 bg-destructive/10 rounded-lg">
            <p className="text-destructive font-medium">Failed to load performance history</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const assetKeys = Object.keys(groupedReports || {}).sort();

  if (assetKeys.length === 0) {
    return (
      <Card className="col-span-full">
        <CardContent className="pt-6">
          <div className="text-center py-12 bg-muted/20 rounded-lg">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p className="text-muted-foreground font-medium">No performance history found</p>
            <p className="text-sm text-muted-foreground mt-1">
              Your portfolio activity will appear here once available.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {assetKeys.map((assetCode) => (
        <Card
          key={assetCode}
          className="col-span-full overflow-hidden border-l-4 border-l-primary shadow-sm hover:shadow-md transition-shadow"
        >
          <CardHeader className="bg-muted/5 pb-4">
            <div className="flex items-center gap-3">
              <img
                src={getAssetLogo(assetCode)}
                alt={assetCode}
                className="h-8 w-8 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
              <div>
                <CardTitle className="text-xl font-bold text-primary">
                  {getAssetName(assetCode) || `${assetCode} Yield Fund`}
                </CardTitle>
                <p className="text-sm text-muted-foreground font-mono">{assetCode}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="border-t">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="w-[180px]">Month</TableHead>
                    <TableHead className="text-right">Opening Balance</TableHead>
                    <TableHead className="text-right">Additions</TableHead>
                    <TableHead className="text-right">Withdrawals</TableHead>
                    <TableHead className="text-right">Yield Earned</TableHead>
                    <TableHead className="text-right">Rate of Return</TableHead>
                    <TableHead className="text-right font-bold">Closing Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupedReports![assetCode].map((report: PerformanceHistoryRecord) => {
                    // Calculate Rate of Return (Simplified Modified Dietz)
                    const netFlows = (report.additions || 0) - (report.withdrawals || 0);
                    const denominator = (report.opening_balance || 0) + netFlows / 2;
                    const rate =
                      denominator !== 0 ? ((report.yield_earned || 0) / denominator) * 100 : 0;

                    return (
                      <TableRow key={report.id} className="hover:bg-muted/5">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {new Date(report.report_month).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "long",
                            })}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatAssetAmount(report.opening_balance || 0, assetCode)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-green-600">
                          {report.additions && report.additions > 0 ? "+" : ""}
                          {formatAssetAmount(report.additions || 0, assetCode)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-red-600">
                          {report.withdrawals && report.withdrawals > 0 ? "-" : ""}
                          {formatAssetAmount(report.withdrawals || 0, assetCode)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-blue-600 font-semibold">
                          +{formatAssetAmount(report.yield_earned || 0, assetCode)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium">
                          {rate.toFixed(2)}%
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold bg-muted/10">
                          {formatAssetAmount(report.closing_balance || 0, assetCode)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
