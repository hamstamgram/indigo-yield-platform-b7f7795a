/**
 * Investor Tabs - Unified tab system for drawer and full profile
 * Ensures consistent UI across both contexts with 6 standard tabs:
 * Overview, Ledger, Positions, Withdrawals, Reports, Settings
 * 
 * Refactored to use useInvestorDefaultFund data hook
 */

import { useCallback, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateAfterTransaction } from "@/utils/cacheInvalidation";
import { Tabs, TabsContent, TabsList, TabsTrigger, Badge } from "@/components/ui";
import {
  LayoutDashboard,
  History,
  Wallet,
  ArrowDownToLine,
  FileText,
  Settings,
} from "lucide-react";
import { InvestorOverviewTab } from "./InvestorOverviewTab";
import { InvestorLedgerTab } from "./InvestorLedgerTab";
import InvestorPositionsTab from "./InvestorPositionsTab";
import { InvestorWithdrawalsTab } from "./InvestorWithdrawalsTab";
import { InvestorReportsTab } from "./InvestorReportsTab";
import { InvestorSettingsTab } from "./InvestorSettingsTab";
import { AddTransactionDialog } from "@/components/admin/AddTransactionDialog";
import { useInvestorDefaultFund } from "@/hooks/data";

export interface InvestorTabsProps {
  investorId: string;
  investorName: string;
  investorEmail?: string;
  /** Whether the tabs are displayed in a compact drawer context */
  compact?: boolean;
  /** Callback when any data changes (to refresh parent components) */
  onDataChange?: () => void;
  /** Callback for deleting the investor (only from Settings tab) */
  onDelete?: () => Promise<void>;
  /** Initial tab to show */
  defaultTab?: string;
  /** Pending withdrawals count for badge */
  pendingWithdrawalsCount?: number;
}

const TAB_KEYS = ["overview", "transactions", "positions", "withdrawals", "reports", "settings"] as const;
type TabKey = typeof TAB_KEYS[number];

export function InvestorTabs({
  investorId,
  investorName,
  investorEmail,
  compact = false,
  onDataChange,
  onDelete,
  defaultTab = "overview",
  pendingWithdrawalsCount = 0,
}: InvestorTabsProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [addTxDialogOpen, setAddTxDialogOpen] = useState(false);
  
  // Use URL param for tab if available, otherwise default
  const tabParam = searchParams.get("tab");
  const activeTab = TAB_KEYS.includes(tabParam as TabKey) ? tabParam as TabKey : defaultTab as TabKey;

  // Fetch default fund for investor using data hook
  const { data: defaultFundId = "" } = useInvestorDefaultFund(investorId);

  const handleTabChange = useCallback((value: string) => {
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);
      if (value === "overview") {
        newParams.delete("tab");
      } else {
        newParams.set("tab", value);
      }
      return newParams;
    }, { replace: true });
  }, [setSearchParams]);

  const handleOpenFullProfile = useCallback(() => {
    navigate(`/admin/investors/${investorId}`);
  }, [navigate, investorId]);

  const handleAddTransaction = useCallback(() => {
    // Open modal directly instead of navigating
    setAddTxDialogOpen(true);
  }, []);

  const handleAddTxSuccess = useCallback(() => {
    invalidateAfterTransaction(queryClient, investorId);
    onDataChange?.();
    setAddTxDialogOpen(false);
  }, [queryClient, investorId, onDataChange]);

  const tabTriggerClass = compact
    ? "text-xs px-2 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
    : "text-sm px-3 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground";

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      <TabsList className={`w-full grid ${compact ? "grid-cols-6 h-9" : "grid-cols-6 h-10"} mb-4`}>
        <TabsTrigger value="overview" className={tabTriggerClass}>
          <LayoutDashboard className={compact ? "h-3.5 w-3.5 mr-1" : "h-4 w-4 mr-1.5"} />
          <span className={compact ? "hidden sm:inline" : ""}>Overview</span>
        </TabsTrigger>
        <TabsTrigger value="transactions" className={tabTriggerClass}>
          <History className={compact ? "h-3.5 w-3.5 mr-1" : "h-4 w-4 mr-1.5"} />
          <span className={compact ? "hidden sm:inline" : ""}>Transactions</span>
        </TabsTrigger>
        <TabsTrigger value="positions" className={tabTriggerClass}>
          <Wallet className={compact ? "h-3.5 w-3.5 mr-1" : "h-4 w-4 mr-1.5"} />
          <span className={compact ? "hidden sm:inline" : ""}>Positions</span>
        </TabsTrigger>
        <TabsTrigger value="withdrawals" className={tabTriggerClass}>
          <ArrowDownToLine className={compact ? "h-3.5 w-3.5 mr-1" : "h-4 w-4 mr-1.5"} />
          <span className={compact ? "hidden sm:inline" : ""}>Withdrawals</span>
          {pendingWithdrawalsCount > 0 && (
            <Badge variant="destructive" className="ml-1 h-4 px-1 text-[10px] min-w-4 justify-center">
              {pendingWithdrawalsCount}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="reports" className={tabTriggerClass}>
          <FileText className={compact ? "h-3.5 w-3.5 mr-1" : "h-4 w-4 mr-1.5"} />
          <span className={compact ? "hidden sm:inline" : ""}>Reports</span>
        </TabsTrigger>
        <TabsTrigger value="settings" className={tabTriggerClass}>
          <Settings className={compact ? "h-3.5 w-3.5 mr-1" : "h-4 w-4 mr-1.5"} />
          <span className={compact ? "hidden sm:inline" : ""}>Settings</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="mt-0">
        <InvestorOverviewTab
          investorId={investorId}
          investorName={investorName}
          compact={compact}
          onAddTransaction={handleAddTransaction}
          onOpenFullProfile={handleOpenFullProfile}
          onDataChange={onDataChange}
          onNavigateToTab={handleTabChange}
        />
      </TabsContent>

      <TabsContent value="transactions" className="mt-0">
        <InvestorLedgerTab
          investorId={investorId}
          investorName={investorName}
          onDataChange={onDataChange}
        />
      </TabsContent>

      <TabsContent value="positions" className="mt-0">
        <InvestorPositionsTab investorId={investorId} />
      </TabsContent>

      <TabsContent value="withdrawals" className="mt-0">
        <InvestorWithdrawalsTab investorId={investorId} />
      </TabsContent>

      <TabsContent value="reports" className="mt-0">
        <InvestorReportsTab
          investorId={investorId}
          investorName={investorName}
        />
      </TabsContent>

      <TabsContent value="settings" className="mt-0">
        <InvestorSettingsTab
          investorId={investorId}
          investorName={investorName}
          onDelete={onDelete}
          onDataChange={onDataChange}
          compact={compact}
        />
      </TabsContent>

      {/* Add Transaction Modal */}
      <AddTransactionDialog
        open={addTxDialogOpen}
        onOpenChange={setAddTxDialogOpen}
        investorId={investorId}
        fundId={defaultFundId}
        onSuccess={handleAddTxSuccess}
      />
    </Tabs>
  );
}

export default InvestorTabs;
