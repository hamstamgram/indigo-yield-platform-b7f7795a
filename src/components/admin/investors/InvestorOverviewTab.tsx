/**
 * Investor Overview Tab
 * Top-level summary with key metrics, quick actions, and guided empty state
 */

import { useNavigate } from "react-router-dom";
import { Card, CardContent, Button, Badge, Skeleton } from "@/components/ui";
import {
  Plus,
  ArrowDownToLine,
  FileText,
  ExternalLink,
  Wallet,
  Clock,
  Users,
  Percent,
  AlertCircle,
  Send,
} from "lucide-react";
import { useInvestorOverview } from "@/hooks/data/useInvestorOverview";
import { format } from "date-fns";

interface InvestorOverviewTabProps {
  investorId: string;
  investorName: string;
  compact?: boolean;
  onAddTransaction: () => void;
  onOpenFullProfile: () => void;
  onDataChange?: () => void;
  onNavigateToTab?: (tab: string) => void;
}

export function InvestorOverviewTab({
  investorId,
  investorName,
  compact = false,
  onAddTransaction,
  onOpenFullProfile,
  onDataChange,
  onNavigateToTab,
}: InvestorOverviewTabProps) {
  const navigate = useNavigate();
  const { data, isLoading, error } = useInvestorOverview(investorId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <Skeleton className="h-12" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Failed to load overview data
      </div>
    );
  }

  // Empty state for investors with no positions
  if (!data.hasPositions) {
    return (
      <div className="space-y-4">
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <Wallet className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-1">No Active Positions</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
              This investor doesn't have any fund positions yet. Add a transaction to get started.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button onClick={onAddTransaction}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Transaction
              </Button>
              <Button variant="outline" onClick={() => navigate(`/admin/investor-invites?investorId=${investorId}`)}>
                <Send className="h-4 w-4 mr-2" />
                Send Invite
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions even for empty state */}
        <div className="flex flex-wrap gap-2">
          {compact && (
            <Button variant="outline" size="sm" onClick={onOpenFullProfile}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Full Profile
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Grid */}
      <div className={`grid gap-3 ${compact ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6"}`}>
        {/* Total Funds */}
        <Card className="bg-card">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Wallet className="h-3.5 w-3.5" />
              <span className="text-xs">Funds Held</span>
            </div>
            <p className="text-xl font-bold">{data.totalFunds}</p>
          </CardContent>
        </Card>

        {/* Token Balances */}
        <Card className="bg-card col-span-1 sm:col-span-2">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Wallet className="h-3.5 w-3.5" />
              <span className="text-xs">Token Balances</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {data.tokenBalances.slice(0, 4).map((tb, idx) => (
                <Badge key={idx} variant="secondary" className="font-mono text-xs">
                  {tb.amount.toFixed(4)} {tb.asset}
                </Badge>
              ))}
              {data.tokenBalances.length > 4 && (
                <Badge variant="outline" className="text-xs">
                  +{data.tokenBalances.length - 4} more
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Last Activity */}
        <Card className="bg-card">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Clock className="h-3.5 w-3.5" />
              <span className="text-xs">Last Activity</span>
            </div>
            <p className="text-sm font-medium truncate">
              {data.lastActivityDate
                ? format(new Date(data.lastActivityDate), "MMM d, yyyy")
                : "No activity"}
            </p>
          </CardContent>
        </Card>

        {/* Pending Withdrawals */}
        <Card className={`bg-card ${data.pendingWithdrawals > 0 ? "border-amber-500/50" : ""}`}>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <ArrowDownToLine className="h-3.5 w-3.5" />
              <span className="text-xs">Pending Withdrawals</span>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-xl font-bold">{data.pendingWithdrawals}</p>
              {data.pendingWithdrawals > 0 && (
                <Badge variant="destructive" className="text-[10px]">Action Required</Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Last Report Period */}
        <Card className="bg-card">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <FileText className="h-3.5 w-3.5" />
              <span className="text-xs">Last Report</span>
            </div>
            <p className="text-sm font-medium truncate">
              {data.lastReportPeriod || "None generated"}
            </p>
          </CardContent>
        </Card>

        {/* IB Parent */}
        {!compact && (
          <Card className="bg-card">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Users className="h-3.5 w-3.5" />
                <span className="text-xs">IB Parent</span>
              </div>
              <p className="text-sm font-medium truncate">
                {data.ibParentName || "None"}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Fee Schedule Status */}
        {!compact && (
          <Card className="bg-card">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Percent className="h-3.5 w-3.5" />
                <span className="text-xs">Fee Schedule</span>
              </div>
              <Badge variant={data.feeScheduleStatus === "active" ? "default" : "secondary"}>
                {data.feeScheduleStatus === "active" ? "Custom" : "Default"}
              </Badge>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={onAddTransaction}>
          <Plus className="h-4 w-4 mr-2" />
          Add Transaction
        </Button>
        <Button variant="outline" size="sm" onClick={() => navigate(`/admin/withdrawals?investorId=${investorId}`)}>
          <ArrowDownToLine className="h-4 w-4 mr-2" />
          Create Withdrawal
        </Button>
        <Button variant="outline" size="sm" onClick={() => onNavigateToTab?.("reports")}>
          <FileText className="h-4 w-4 mr-2" />
          View Reports
        </Button>
        {compact && (
          <Button variant="outline" size="sm" onClick={onOpenFullProfile}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Open Full Profile
          </Button>
        )}
      </div>

      {/* Alerts Section */}
      {data.pendingWithdrawals > 0 && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-full bg-amber-500/10">
              <AlertCircle className="h-4 w-4 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">
                {data.pendingWithdrawals} pending withdrawal{data.pendingWithdrawals !== 1 ? "s" : ""} require attention
              </p>
              <p className="text-xs text-muted-foreground">Review and approve or reject these requests</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => onNavigateToTab?.("withdrawals")}>
              Review
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default InvestorOverviewTab;
