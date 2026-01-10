/**
 * InvestorDrawerQuickView - Quick view content for drawer
 * Shows: Header, KPI chips, Quick actions, Positions summary, Recent activity
 * 
 * Refactored to use useInvestorQuickView and useInvestorRecentActivity data hooks
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FinancialValue } from "@/components/common/FinancialValue";
import {
  Button,
  Badge,
  Card, CardContent, CardHeader, CardTitle,
  Separator,
} from "@/components/ui";
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
import { useInvestorQuickView, useInvestorRecentActivity } from "@/hooks/data";
import { formatTokenAmount } from "@/utils/statementCalculations";
import { format } from "date-fns";

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

  // Use data hooks for fetching
  const { data: quickViewData, isLoading: isLoadingQuickView, refetch: refetchQuickView } = useInvestorQuickView(investorId);
  const { data: recentActivity = [], isLoading: isLoadingActivity } = useInvestorRecentActivity(investorId, 5);

  const isLoading = isLoadingQuickView || isLoadingActivity;
  const positions = quickViewData?.positions || [];
  const kpis = {
    totalAum: quickViewData?.totalAum || 0,
    activeFundsCount: quickViewData?.activeFundsCount || 0,
    pendingWithdrawalsCount: quickViewData?.pendingWithdrawalsCount || 0,
    lastReportPeriod: quickViewData?.lastReportPeriod || null,
    hasIbLinked: quickViewData?.hasIbLinked || false,
    hasFeeSchedule: quickViewData?.hasFeeSchedule || false,
  };
  const selectedFundId = positions[0]?.fund_id || null;

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
                    <FinancialValue value={pos.shares} displayDecimals={4} showAsset={false} /> shares
                  </span>
                </div>
                <FinancialValue 
                  value={pos.current_value} 
                  asset={pos.fund_code} 
                  className="font-medium text-sm"
                />
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
            refetchQuickView();
          }}
        />
      )}
    </div>
  );
}
