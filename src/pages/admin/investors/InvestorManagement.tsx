/**
 * Investor Management Workspace
 * Full investor workspace using unified InvestorTabs
 */

import { useEffect } from "react";
import { useParams, useNavigate, Link, useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Clock, FileText, ArrowDownToLine, Users, Percent } from "lucide-react";
import { forceDeleteInvestorUser } from "@/services/admin/userService";
import { InvestorTabs } from "@/components/admin";
import { format } from "date-fns";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useInvestorDetail, useInvestorOpsIndicators } from "@/hooks/data/admin";

const InvestorManagement = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Use hooks for data fetching
  const { data: investor, isLoading, refetch: refetchInvestor } = useInvestorDetail(id);
  const { data: opsIndicators, refetch: refetchOps } = useInvestorOpsIndicators(id, investor?.ib_parent_id);

  // Preserve filter params for back navigation
  const getBackUrl = () => {
    const preserved = new URLSearchParams();
    ["search", "fund", "status", "ib", "has_withdrawals"].forEach(key => {
      const val = searchParams.get(key);
      if (val) preserved.set(key, val);
    });
    const qs = preserved.toString();
    return `/admin/investors${qs ? `?${qs}` : ""}`;
  };

  const handleRefresh = () => {
    refetchInvestor();
    refetchOps();
  };

  const handleBack = () => {
    navigate(getBackUrl());
  };

  const handleDeleteInvestor = async () => {
    if (!id) return;
    try {
      await forceDeleteInvestorUser(id);
      toast.success("Investor deleted", {
        description: "The investor and all associated data have been removed.",
      });
      navigate("/admin/investors");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete investor";
      toast.error("Error", { description: message });
      throw error;
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (!investor) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <h2 className="text-lg font-semibold">Investor Not Found</h2>
              <p className="text-muted-foreground">The requested investor could not be found.</p>
              <Button variant="outline" className="mt-4" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Investors
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-4">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to={getBackUrl()}>Investors</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{investor.name || "Investor"}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header with ops indicators */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{investor.name}</h1>
              <Badge variant={investor.status === "active" ? "default" : "secondary"}>
                {investor.status}
              </Badge>
            </div>
            <p className="text-muted-foreground">{investor.email}</p>
          </div>
        </div>

        {/* Ops Indicators */}
        {opsIndicators && (
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>
                {opsIndicators.lastActivityDate
                  ? format(new Date(opsIndicators.lastActivityDate), "MMM d, yyyy")
                  : "No activity"}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <FileText className="h-3.5 w-3.5" />
              <span>{opsIndicators.lastReportPeriod || "No reports"}</span>
            </div>
            {opsIndicators.pendingWithdrawals > 0 && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <ArrowDownToLine className="h-3 w-3" />
                {opsIndicators.pendingWithdrawals} pending
              </Badge>
            )}
            {opsIndicators.ibParentName && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                IB: {opsIndicators.ibParentName}
              </Badge>
            )}
            <Badge variant={opsIndicators.hasFeeSchedule ? "default" : "secondary"} className="flex items-center gap-1">
              <Percent className="h-3 w-3" />
              {opsIndicators.hasFeeSchedule ? "Custom fees" : "Default fees"}
            </Badge>
          </div>
        )}
      </div>

      {/* Unified Tabs */}
      <InvestorTabs
        investorId={id!}
        investorName={investor.name}
        investorEmail={investor.email}
        compact={false}
        onDataChange={handleRefresh}
        onDelete={handleDeleteInvestor}
        pendingWithdrawalsCount={opsIndicators?.pendingWithdrawals || 0}
      />
    </div>
  );
};

export default InvestorManagement;
