/**
 * Investor Management Workspace
 * Full investor workspace using unified InvestorTabs
 */

import { useState, useEffect } from "react";
import { useParams, useNavigate, Link, useSearchParams } from "react-router-dom";
import {
  Card,
  CardContent,
  Button,
  Badge,
  Input,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui";
import { toast } from "sonner";
import {
  Loader2,
  ArrowLeft,
  Clock,
  FileText,
  ArrowDownToLine,
  Users,
  Percent,
  Copy,
  Check,
  RefreshCw,
  Pencil,
  X,
  Save,
} from "lucide-react";
import { invokeFunction } from "@/lib/supabase/functions";
import { logError } from "@/lib/logger";
import { forceDeleteInvestorUser } from "@/services/admin";
import { InvestorTabs } from "@/features/admin/investors/components";
import { useSuperAdmin } from "@/features/admin/shared/SuperAdminGuard";
import { format } from "date-fns";
import { useInvestorDetail, useInvestorOpsIndicators } from "@/hooks/data/admin";

const InvestorManagement = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [linkCopied, setLinkCopied] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);
  const { isSuperAdmin } = useSuperAdmin();

  // Use hooks for data fetching
  const { data: investor, isLoading, refetch: refetchInvestor } = useInvestorDetail(id);
  const { data: opsIndicators, refetch: refetchOps } = useInvestorOpsIndicators(
    id,
    investor?.ib_parent_id
  );

  // Preserve filter params for back navigation
  const getBackUrl = () => {
    const preserved = new URLSearchParams();
    ["search", "fund", "status", "ib", "has_withdrawals"].forEach((key) => {
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

  const handleStartEditName = () => {
    if (!investor) return;
    setEditFirstName(investor.firstName);
    setEditLastName(investor.lastName);
    setIsEditingName(true);
  };

  const handleCancelEditName = () => {
    setIsEditingName(false);
    setEditFirstName("");
    setEditLastName("");
  };

  const handleSaveName = async () => {
    if (!id || !editFirstName.trim() || !editLastName.trim()) {
      toast.error("First name and last name are required");
      return;
    }
    setIsSavingName(true);
    try {
      const { data, error } = await invokeFunction("admin-user-management", {
        action: "updateInvestorProfile",
        investorId: id,
        firstName: editFirstName.trim(),
        lastName: editLastName.trim(),
      });
      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || "Failed to update name");
      }
      toast.success("Name updated");
      setIsEditingName(false);
      refetchInvestor();
    } catch (error) {
      logError("InvestorManagement.saveName", error, { investorId: id });
      toast.error(error instanceof Error ? error.message : "Failed to update name");
    } finally {
      setIsSavingName(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  // Track recently viewed investors in localStorage
  useEffect(() => {
    if (!investor || !id) return;
    try {
      const key = "indigo_recent_investors";
      const stored = localStorage.getItem(key);
      const recent: Array<{ id: string; name: string; email: string; viewedAt: string }> = stored
        ? JSON.parse(stored)
        : [];
      const filtered = recent.filter((r) => r.id !== id);
      filtered.unshift({
        id,
        name: investor.name,
        email: investor.email,
        viewedAt: new Date().toISOString(),
      });
      localStorage.setItem(key, JSON.stringify(filtered.slice(0, 10)));
    } catch {
      // localStorage may be unavailable
    }
  }, [id, investor]);

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
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <Input
                  value={editFirstName}
                  onChange={(e) => setEditFirstName(e.target.value)}
                  placeholder="First name"
                  className="h-9 w-36"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveName();
                    if (e.key === "Escape") handleCancelEditName();
                  }}
                />
                <Input
                  value={editLastName}
                  onChange={(e) => setEditLastName(e.target.value)}
                  placeholder="Last name"
                  className="h-9 w-36"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveName();
                    if (e.key === "Escape") handleCancelEditName();
                  }}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleSaveName}
                  disabled={isSavingName}
                >
                  {isSavingName ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 text-yield" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleCancelEditName}
                  disabled={isSavingName}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight">{investor.name}</h1>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleStartEditName}
                  title="Edit name"
                >
                  <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
                <Badge variant={investor.status === "active" ? "default" : "secondary"}>
                  {investor.status}
                </Badge>
              </div>
            )}
            <div className="flex items-center gap-2 mt-1">
              <p className="text-muted-foreground">{investor.email}</p>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopyLink}>
                {linkCopied ? (
                  <Check className="h-3 w-3 text-yield" />
                ) : (
                  <Copy className="h-3 w-3 text-muted-foreground" />
                )}
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleRefresh}>
                <RefreshCw className="h-3 w-3 text-muted-foreground" />
              </Button>
            </div>
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
            <Badge
              variant={opsIndicators.hasFeeSchedule ? "default" : "secondary"}
              className="flex items-center gap-1"
            >
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
        onDelete={isSuperAdmin ? handleDeleteInvestor : undefined}
        pendingWithdrawalsCount={opsIndicators?.pendingWithdrawals || 0}
      />
    </div>
  );
};

export default InvestorManagement;
