/**
 * InvestorDrawerQuickView - Quick view content for drawer
 * Shows: Header, KPI chips, Quick actions, Positions summary, Recent activity
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  ExternalLink, 
  Plus, 
  FileOutput, 
  FileText, 
  TrendingUp, 
  TrendingDown,
  Minus,
  ArrowRight
} from "lucide-react";
import { InvestorKpiChips } from "./InvestorKpiChips";
import { AddTransactionDialog } from "../AddTransactionDialog";
import { supabase } from "@/integrations/supabase/client";
import { formatTokenAmount } from "@/utils/statementCalculations";
import { format } from "date-fns";

interface Position {
  fund_id: string;
  fund_name: string;
  fund_code: string;
  shares: number;
  current_value: number;
}

interface RecentActivity {
  id: string;
  type: "transaction" | "withdrawal";
  amount: number;
  date: string;
  description: string;
  status?: string;
}

interface InvestorDrawerQuickViewProps {
  investorId: string;
  investorName: string;
  investorEmail: string;
  status: string;
  onClose?: () => void;
}

export function InvestorDrawerQuickView({
  investorId,
  investorName,
  investorEmail,
  status,
  onClose,
}: InvestorDrawerQuickViewProps) {
  const navigate = useNavigate();
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [selectedFundId, setSelectedFundId] = useState<string | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [kpis, setKpis] = useState({
    totalAum: 0,
    activeFundsCount: 0,
    pendingWithdrawalsCount: 0,
    lastReportPeriod: null as string | null,
    hasIbLinked: false,
    hasFeeSchedule: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadQuickViewData();
  }, [investorId]);

  const loadQuickViewData = async () => {
    setIsLoading(true);
    try {
      // Load positions from v_live_investor_balances view
      const { data: positionsData } = await supabase
        .from("v_live_investor_balances")
        .select("fund_id, fund_name, fund_code, shares, current_value")
        .eq("investor_id", investorId)
        .gt("current_value", 0)
        .order("current_value", { ascending: false })
        .limit(5);

      // Load recent transactions - use transaction_date which exists in transactions_v2
      const { data: txData } = await supabase
        .from("transactions_v2")
        .select("id, amount, transaction_date, type, fund_id")
        .eq("investor_id", investorId)
        .order("transaction_date", { ascending: false })
        .limit(3);

      // Load recent withdrawals - use requested_amount
      const { data: wdData } = await supabase
        .from("withdrawal_requests")
        .select("id, requested_amount, created_at, status")
        .eq("investor_id", investorId)
        .order("created_at", { ascending: false })
        .limit(3);

      // Load pending withdrawals count
      const { count: pendingCount } = await supabase
        .from("withdrawal_requests")
        .select("id", { count: "exact", head: true })
        .eq("investor_id", investorId)
        .eq("status", "pending");

      // Load IB status
      const { data: ibData } = await supabase
        .from("profiles")
        .select("ib_parent_id")
        .eq("id", investorId)
        .single();

      // Load fee schedule status
      const { count: feeCount } = await supabase
        .from("investor_fee_schedule")
        .select("id", { count: "exact", head: true })
        .eq("investor_id", investorId);

      // Load last report period
      let lastReportPeriod: string | null = null;
      const { data: reportData } = await supabase
        .from("generated_statements")
        .select("created_at")
        .eq("investor_id", investorId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (reportData?.created_at) {
        lastReportPeriod = format(new Date(reportData.created_at), "MMM yyyy");
      }

      // Calculate KPIs
      const mappedPositions: Position[] = (positionsData || []).map((p: any) => ({
        fund_id: p.fund_id,
        fund_name: p.fund_name || "Unknown",
        fund_code: p.fund_code || "N/A",
        shares: p.shares || 0,
        current_value: p.current_value || 0,
      }));

      const totalAum = mappedPositions.reduce((sum, p) => sum + p.current_value, 0);
      const activeFundsCount = mappedPositions.length;

      setPositions(mappedPositions);
      if (mappedPositions.length > 0) {
        setSelectedFundId(mappedPositions[0].fund_id);
      }
      
      setKpis({
        totalAum,
        activeFundsCount,
        pendingWithdrawalsCount: pendingCount || 0,
        lastReportPeriod,
        hasIbLinked: !!ibData?.ib_parent_id,
        hasFeeSchedule: (feeCount || 0) > 0,
      });

      // Combine recent activity
      const activities: RecentActivity[] = [
        ...(txData || []).map((tx: any) => ({
          id: tx.id,
          type: "transaction" as const,
          amount: tx.amount,
          date: tx.transaction_date,
          description: tx.type,
        })),
        ...(wdData || []).map((wd: any) => ({
          id: wd.id,
          type: "withdrawal" as const,
          amount: wd.requested_amount,
          date: wd.created_at,
          description: "Withdrawal Request",
          status: wd.status,
        })),
      ]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5);

      setRecentActivity(activities);
    } catch (error) {
      console.error("Error loading quick view data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = () => {
    const statusLower = status?.toLowerCase() || "unknown";
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      active: "default",
      inactive: "secondary",
      pending: "outline",
      suspended: "destructive",
    };
    return (
      <Badge variant={variants[statusLower] || "outline"} className="capitalize">
        {status || "Unknown"}
      </Badge>
    );
  };

  const handleViewFullProfile = () => {
    onClose?.();
    navigate(`/admin/investors/${investorId}`);
  };

  const handleViewWithdrawals = () => {
    onClose?.();
    navigate(`/admin/investors/${investorId}?tab=activity`);
  };

  const handleViewReports = () => {
    onClose?.();
    navigate(`/admin/reports?investorId=${investorId}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold">{investorName}</h2>
          {getStatusBadge()}
        </div>
        <p className="text-sm text-muted-foreground">{investorEmail}</p>
      </div>

      {/* KPI Chips */}
      <InvestorKpiChips
        totalAum={kpis.totalAum}
        activeFundsCount={kpis.activeFundsCount}
        pendingWithdrawalsCount={kpis.pendingWithdrawalsCount}
        lastReportPeriod={kpis.lastReportPeriod}
        hasIbLinked={kpis.hasIbLinked}
        hasFeeSchedule={kpis.hasFeeSchedule}
        compact
      />

      {/* Quick Actions */}
      <div className="space-y-3">
        <Button onClick={handleViewFullProfile} className="w-full">
          <ExternalLink className="h-4 w-4 mr-2" />
          View Full Profile
        </Button>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={() => setShowAddTransaction(true)}
            disabled={!selectedFundId}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add Transaction
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleViewWithdrawals}
          >
            <FileOutput className="h-4 w-4 mr-1.5" />
            Withdrawals
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleViewReports}
          >
            <FileText className="h-4 w-4 mr-1.5" />
            Reports
          </Button>
        </div>
      </div>

      <Separator />

      {/* Positions Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Positions Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : positions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active positions</p>
          ) : (
            positions.map((pos) => (
              <div key={pos.fund_id} className="flex items-center justify-between py-1.5">
                <div>
                  <span className="font-medium text-sm">{pos.fund_code}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {pos.shares.toFixed(4)} shares
                  </span>
                </div>
                <span className="font-medium text-sm font-mono">
                  {formatTokenAmount(pos.current_value, pos.fund_code)}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent activity</p>
          ) : (
            recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-center justify-between py-1.5">
                <div className="flex items-center gap-2">
                  {activity.type === "transaction" ? (
                    activity.amount > 0 ? (
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    ) : activity.amount < 0 ? (
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    ) : (
                      <Minus className="h-4 w-4 text-muted-foreground" />
                    )
                  ) : (
                    <FileOutput className="h-4 w-4 text-orange-500" />
                  )}
                  <div>
                    <span className="text-sm capitalize">{activity.description}</span>
                    {activity.status && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        {activity.status}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium text-sm font-mono">
                    {formatTokenAmount(Math.abs(activity.amount))}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(activity.date), "MMM d")}
                  </div>
                </div>
              </div>
            ))
          )}
          {recentActivity.length > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full mt-2"
              onClick={handleViewFullProfile}
            >
              View All Activity
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Add Transaction Dialog */}
      {selectedFundId && (
        <AddTransactionDialog
          open={showAddTransaction}
          onOpenChange={setShowAddTransaction}
          investorId={investorId}
          fundId={selectedFundId}
          onSuccess={() => {
            setShowAddTransaction(false);
            loadQuickViewData();
          }}
        />
      )}
    </div>
  );
}
