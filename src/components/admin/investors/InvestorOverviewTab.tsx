/**
 * Investor Overview Tab
 * Top-level summary with key metrics, quick actions, and guided empty state
 */

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { supabase } from "@/integrations/supabase/client";
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

interface OverviewData {
  totalFunds: number;
  tokenBalances: { asset: string; amount: number; fundName: string }[];
  lastActivityDate: string | null;
  pendingWithdrawals: number;
  lastReportPeriod: string | null;
  ibParentName: string | null;
  feeScheduleStatus: "active" | "default";
  hasPositions: boolean;
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
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<OverviewData | null>(null);

  const loadOverviewData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch positions with fund info
      const { data: positions, error: posError } = await supabase
        .from("investor_positions")
        .select(`
          fund_id,
          current_value,
          shares,
          funds!inner(name, asset, status)
        `)
        .eq("investor_id", investorId);

      if (posError) throw posError;

      const activePositions = (positions || []).filter(
        (p: any) => p.funds?.status === "active" && p.current_value > 0
      );

      // Fetch pending withdrawals count
      const { count: pendingCount, error: wdError } = await supabase
        .from("withdrawal_requests")
        .select("id", { count: "exact", head: true })
        .eq("investor_id", investorId)
        .eq("status", "pending");

      if (wdError) console.warn("Failed to fetch withdrawals:", wdError);

      // Fetch last transaction date
      const { data: lastTx, error: txError } = await supabase
        .from("transactions_v2")
        .select("tx_date")
        .eq("investor_id", investorId)
        .order("tx_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (txError) console.warn("Failed to fetch last transaction:", txError);

      // Fetch last generated report
      const { data: lastReport, error: reportError } = await supabase
        .from("generated_statements")
        .select("period_id")
        .eq("investor_id", investorId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (reportError) console.warn("Failed to fetch last report:", reportError);

      // Fetch IB parent info
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("ib_parent_id")
        .eq("id", investorId)
        .maybeSingle();

      if (profileError) console.warn("Failed to fetch profile:", profileError);

      let ibParentName: string | null = null;
      if (profile?.ib_parent_id) {
        const { data: parentProfile } = await supabase
          .from("profiles")
          .select("first_name, last_name")
          .eq("id", profile.ib_parent_id)
          .maybeSingle();
        if (parentProfile) {
          ibParentName = [parentProfile.first_name, parentProfile.last_name]
            .filter(Boolean)
            .join(" ") || null;
        }
      }

      // Fetch fee schedule status
      const { data: feeSchedule, error: feeError } = await supabase
        .from("investor_fee_schedule")
        .select("id")
        .eq("investor_id", investorId)
        .limit(1);

      if (feeError) console.warn("Failed to fetch fee schedule:", feeError);

      // Build token balances grouped by asset
      const tokenBalances = activePositions.map((p: any) => ({
        asset: p.funds?.asset || "Unknown",
        amount: p.current_value || 0,
        fundName: p.funds?.name || "Unknown",
      }));

      setData({
        totalFunds: activePositions.length,
        tokenBalances,
        lastActivityDate: lastTx?.tx_date || null,
        pendingWithdrawals: pendingCount || 0,
        lastReportPeriod: lastReport?.period_id || null,
        ibParentName,
        feeScheduleStatus: (feeSchedule?.length || 0) > 0 ? "active" : "default",
        hasPositions: activePositions.length > 0,
      });
    } catch (error) {
      console.error("Error loading overview data:", error);
      setData({
        totalFunds: 0,
        tokenBalances: [],
        lastActivityDate: null,
        pendingWithdrawals: 0,
        lastReportPeriod: null,
        ibParentName: null,
        feeScheduleStatus: "default",
        hasPositions: false,
      });
    } finally {
      setLoading(false);
    }
  }, [investorId]);

  useEffect(() => {
    loadOverviewData();
  }, [loadOverviewData]);

  if (loading) {
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

  if (!data) return null;

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
