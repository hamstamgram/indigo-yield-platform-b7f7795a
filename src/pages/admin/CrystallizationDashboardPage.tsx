/**
 * Crystallization Dashboard Page (P1)
 * Shows crystallization status across all funds and investors
 * - v_crystallization_dashboard: Fund-level crystallization status
 * - v_crystallization_gaps: Positions that need crystallization
 * - Batch crystallization with dry run support
 */

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Badge,
  Button,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui";
import { FinancialValue } from "@/components/common/FinancialValue";
import {
  useCrystallizationDashboard,
  useCrystallizationGaps,
  useBatchCrystallizeFund,
} from "@/hooks/data";
import {
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Zap,
  Clock,
  TrendingUp,
  Users,
  Calendar,
  Play,
  Eye,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { useState } from "react";

export default function CrystallizationDashboardPage() {
  const [selectedFundId, setSelectedFundId] = useState<string | undefined>(undefined);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    fundId: string;
    fundCode: string;
    dryRun: boolean;
  }>({
    open: false,
    fundId: "",
    fundCode: "",
    dryRun: true,
  });

  // Data hooks
  const {
    data: dashboardData,
    isLoading: dashboardLoading,
    refetch: refetchDashboard,
  } = useCrystallizationDashboard();
  const {
    data: gaps,
    isLoading: gapsLoading,
    refetch: refetchGaps,
  } = useCrystallizationGaps(selectedFundId);
  const batchCrystallize = useBatchCrystallizeFund();

  const handleRefresh = () => {
    refetchDashboard();
    refetchGaps();
  };

  const handleBatchCrystallize = (fundId: string, fundCode: string, dryRun: boolean) => {
    setConfirmDialog({ open: true, fundId, fundCode, dryRun });
  };

  const executeBatchCrystallize = () => {
    batchCrystallize.mutate(
      { fundId: confirmDialog.fundId, dryRun: confirmDialog.dryRun },
      {
        onSettled: () => {
          setConfirmDialog({ open: false, fundId: "", fundCode: "", dryRun: true });
          if (!confirmDialog.dryRun) {
            handleRefresh();
          }
        },
      }
    );
  };

  const totalGaps = dashboardData?.reduce((sum, f) => sum + f.gap_count, 0) || 0;
  const totalPositions = dashboardData?.reduce((sum, f) => sum + f.total_positions, 0) || 0;

  if (dashboardLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-6 w-32 mb-4" />
                <Skeleton className="h-4 w-48" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Crystallization Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor yield crystallization status across all funds
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge
            className={
              totalGaps === 0
                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
            }
          >
            {totalGaps === 0 ? (
              <CheckCircle2 className="h-4 w-4 mr-1" />
            ) : (
              <AlertTriangle className="h-4 w-4 mr-1" />
            )}
            {totalGaps} gaps
          </Badge>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Total Funds
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Positions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPositions}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Crystallized
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {dashboardData?.reduce((sum, f) => sum + f.crystallized_count, 0) || 0}
            </div>
          </CardContent>
        </Card>
        <Card className={totalGaps > 0 ? "border-yellow-200 dark:border-yellow-900/50" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Gaps
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${totalGaps > 0 ? "text-yellow-600 dark:text-yellow-400" : ""}`}
            >
              {totalGaps}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fund Status Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Fund Crystallization Status
          </CardTitle>
          <CardDescription>
            Status from v_crystallization_dashboard - shows crystallization coverage per fund
          </CardDescription>
        </CardHeader>
        <CardContent>
          {dashboardData && dashboardData.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fund</TableHead>
                    <TableHead className="text-right">Positions</TableHead>
                    <TableHead className="text-right">Crystallized</TableHead>
                    <TableHead className="text-right">Gaps</TableHead>
                    <TableHead className="text-right">Oldest Gap</TableHead>
                    <TableHead className="text-right">AUM</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dashboardData.map((fund) => (
                    <TableRow key={fund.fund_id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{fund.fund_code}</span>
                          <span className="text-xs text-muted-foreground">{fund.fund_name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">{fund.total_positions}</TableCell>
                      <TableCell className="text-right">
                        <span className="text-green-600 dark:text-green-400 font-mono">
                          {fund.crystallized_count}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {fund.gap_count > 0 ? (
                          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                            {fund.gap_count}
                          </Badge>
                        ) : (
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                            0
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {fund.oldest_gap_days !== null ? (
                          <span
                            className={
                              fund.oldest_gap_days > 30 ? "text-red-600 dark:text-red-400" : ""
                            }
                          >
                            {fund.oldest_gap_days}d
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <FinancialValue value={fund.total_aum} displayDecimals={0} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleBatchCrystallize(fund.fund_id, fund.fund_code, true)
                            }
                            disabled={batchCrystallize.isPending || fund.gap_count === 0}
                            title="Preview batch crystallization"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleBatchCrystallize(fund.fund_id, fund.fund_code, false)
                            }
                            disabled={batchCrystallize.isPending || fund.gap_count === 0}
                            title="Execute batch crystallization"
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No funds found in v_crystallization_dashboard
            </p>
          )}
        </CardContent>
      </Card>

      {/* Crystallization Gaps */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Crystallization Gaps
              </CardTitle>
              <CardDescription>
                Positions that need yield crystallization from v_crystallization_gaps
              </CardDescription>
            </div>
            <Select
              value={selectedFundId || "all"}
              onValueChange={(val) => setSelectedFundId(val === "all" ? undefined : val)}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All funds" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All funds</SelectItem>
                {dashboardData?.map((fund) => (
                  <SelectItem key={fund.fund_id} value={fund.fund_id}>
                    {fund.fund_code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {gapsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : gaps && gaps.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Investor</TableHead>
                    <TableHead>Fund</TableHead>
                    <TableHead>Last Crystallization</TableHead>
                    <TableHead className="text-right">Days Behind</TableHead>
                    <TableHead className="text-right">Current Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gaps.map((gap, idx) => (
                    <TableRow key={`${gap.investor_id}-${gap.fund_id}-${idx}`}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{gap.investor_name}</span>
                          <span className="text-xs text-muted-foreground font-mono">
                            {gap.investor_id.slice(0, 8)}...
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{gap.fund_code}</Badge>
                      </TableCell>
                      <TableCell>
                        {gap.last_crystallization_date ? (
                          <div className="flex flex-col">
                            <span>
                              {format(new Date(gap.last_crystallization_date), "MMM d, yyyy")}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(gap.last_crystallization_date), {
                                addSuffix: true,
                              })}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Never</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={
                            gap.days_since_crystallization > 30
                              ? "text-red-600 dark:text-red-400 font-bold"
                              : gap.days_since_crystallization > 7
                                ? "text-yellow-600 dark:text-yellow-400"
                                : ""
                          }
                        >
                          {gap.days_since_crystallization}d
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <FinancialValue value={gap.current_value} displayDecimals={2} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
              <p className="text-sm font-medium text-green-600 dark:text-green-400">
                All positions are crystallized
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                No gaps found in v_crystallization_gaps
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmDialog.dryRun ? "Preview" : "Confirm"} Batch Crystallization
            </DialogTitle>
            <DialogDescription>
              {confirmDialog.dryRun ? (
                <>
                  This will preview what would happen if you batch crystallize all gaps for{" "}
                  <strong>{confirmDialog.fundCode}</strong>. No changes will be made.
                </>
              ) : (
                <>
                  This will crystallize all positions with gaps for{" "}
                  <strong>{confirmDialog.fundCode}</strong>. This action will create yield events
                  for all affected positions.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setConfirmDialog({ open: false, fundId: "", fundCode: "", dryRun: true })
              }
            >
              Cancel
            </Button>
            <Button
              variant={confirmDialog.dryRun ? "outline" : "default"}
              onClick={executeBatchCrystallize}
              disabled={batchCrystallize.isPending}
            >
              {batchCrystallize.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : confirmDialog.dryRun ? (
                <Eye className="h-4 w-4 mr-2" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              {confirmDialog.dryRun ? "Preview" : "Execute"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
