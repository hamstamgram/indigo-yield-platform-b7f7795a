/**
 * InvestorHeader - Sticky header with investor info, KPIs, and actions
 * Used on the full page investor management view
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, FileOutput, FileText, MoreHorizontal, User, Users, Percent, AlertTriangle } from "lucide-react";
import {
  Button,
  Badge,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui";
import { InvestorKpiChips } from "./InvestorKpiChips";
import { AddTransactionDialog } from "../../AddTransactionDialog";

interface InvestorHeaderProps {
  investorId: string;
  investorName: string;
  investorEmail: string;
  status: string;
  totalAum: number;
  activeFundsCount: number;
  pendingWithdrawalsCount: number;
  lastReportPeriod: string | null;
  hasIbLinked: boolean;
  hasFeeSchedule: boolean;
  defaultFundId?: string;
  onTabChange: (tab: string) => void;
  onTransactionAdded?: () => void;
}

export function InvestorHeader({
  investorId,
  investorName,
  investorEmail,
  status,
  totalAum,
  activeFundsCount,
  pendingWithdrawalsCount,
  lastReportPeriod,
  hasIbLinked,
  hasFeeSchedule,
  defaultFundId,
  onTabChange,
  onTransactionAdded,
}: InvestorHeaderProps) {
  const navigate = useNavigate();
  const [showAddTransaction, setShowAddTransaction] = useState(false);

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

  const handleBack = () => {
    navigate("/admin/investors");
  };

  const handleCreateWithdrawal = () => {
    onTabChange("activity");
    // Scroll to withdrawals section after tab change
    setTimeout(() => {
      const withdrawalsSection = document.getElementById("withdrawals-section");
      withdrawalsSection?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleOpenReports = () => {
    navigate(`/admin/reports?investorId=${investorId}`);
  };

  const scrollToSection = (sectionId: string, tab: string) => {
    onTabChange(tab);
    setTimeout(() => {
      const section = document.getElementById(sectionId);
      section?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  return (
    <div className="sticky top-0 z-10 bg-background border-b">
      {/* Breadcrumb row */}
      <div className="px-6 py-3 border-b bg-muted/30">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="h-8 w-8"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/admin/investors">Investors</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{investorName}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </div>

      {/* Main header content */}
      <div className="px-6 py-4 space-y-4">
        {/* Top row: Name, email, status + actions */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">{investorName}</h1>
              {getStatusBadge()}
            </div>
            <p className="text-sm text-muted-foreground">{investorEmail}</p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Primary actions (max 3) */}
            <Button 
              onClick={() => setShowAddTransaction(true)} 
              size="sm"
              disabled={!defaultFundId}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Add Transaction
            </Button>
            <Button variant="outline" size="sm" onClick={handleCreateWithdrawal}>
              <FileOutput className="h-4 w-4 mr-1.5" />
              Withdrawals
            </Button>
            <Button variant="outline" size="sm" onClick={handleOpenReports}>
              <FileText className="h-4 w-4 mr-1.5" />
              Reports
            </Button>

            {/* Secondary actions dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => scrollToSection("profile-section", "settings")}>
                  <User className="h-4 w-4 mr-2" />
                  Edit Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => scrollToSection("ib-section", "settings")}>
                  <Users className="h-4 w-4 mr-2" />
                  Manage IB
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => scrollToSection("fee-section", "settings")}>
                  <Percent className="h-4 w-4 mr-2" />
                  Manage Fees
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => scrollToSection("danger-zone", "settings")}
                  className="text-destructive focus:text-destructive"
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Danger Zone
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* KPI chips row */}
        <InvestorKpiChips
          totalAum={totalAum}
          activeFundsCount={activeFundsCount}
          pendingWithdrawalsCount={pendingWithdrawalsCount}
          lastReportPeriod={lastReportPeriod}
          hasIbLinked={hasIbLinked}
          hasFeeSchedule={hasFeeSchedule}
        />
      </div>

      {/* Add Transaction Dialog */}
      {defaultFundId && (
        <AddTransactionDialog
          open={showAddTransaction}
          onOpenChange={setShowAddTransaction}
          investorId={investorId}
          fundId={defaultFundId}
          onSuccess={() => {
            setShowAddTransaction(false);
            onTransactionAdded?.();
          }}
        />
      )}
    </div>
  );
}
