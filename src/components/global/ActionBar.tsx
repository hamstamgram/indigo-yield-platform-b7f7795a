import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertCircle,
  ArrowUpCircle,
  FileText,
  Search,
  RefreshCw,
  Calendar,
} from "lucide-react";
import { useAuth } from "@/lib/auth/context";
import { supabase } from "@/integrations/supabase/client";
import { formatShortcut, SHORTCUTS } from "@/hooks/useKeyboardShortcuts";
import { format } from "date-fns";

interface ActionBarProps {
  onOpenCommandPalette: () => void;
}

interface PendingCounts {
  withdrawals: number;
  reportsNeeded: number;
}

export function ActionBar({ onOpenCommandPalette }: ActionBarProps) {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [pendingCounts, setPendingCounts] = useState<PendingCounts>({
    withdrawals: 0,
    reportsNeeded: 0,
  });
  const [lastSync, setLastSync] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const currentPeriod = format(new Date(), "MMMM yyyy");

  const fetchPendingCounts = async () => {
    if (!isAdmin) return;

    setIsRefreshing(true);
    try {
      // Fetch pending withdrawals
      const { count: withdrawalCount } = await supabase
        .from("withdrawal_requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      // Fetch investors without reports for current month
      const currentMonth = format(new Date(), "yyyy-MM");
      const { count: investorCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("is_admin", false);

      const { count: reportCount } = await supabase
        .from("investor_fund_performance")
        .select("investor_id", { count: "exact", head: true })
        .eq("period_id", currentMonth);

      setPendingCounts({
        withdrawals: withdrawalCount || 0,
        reportsNeeded: Math.max(0, (investorCount || 0) - (reportCount || 0)),
      });
      setLastSync(new Date());
    } catch (error) {
      console.error("Failed to fetch pending counts:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPendingCounts();
    // Refresh every 60 seconds
    const interval = setInterval(fetchPendingCounts, 60000);
    return () => clearInterval(interval);
  }, [isAdmin]);

  // Subscribe to realtime changes
  useEffect(() => {
    if (!isAdmin) return;

    const channel = supabase
      .channel("action-bar-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "withdrawal_requests" },
        () => fetchPendingCounts()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin]);

  const totalPending = pendingCounts.withdrawals + pendingCounts.reportsNeeded;

  return (
    <TooltipProvider>
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex items-center justify-between px-4 py-2 max-w-screen-2xl mx-auto">
          {/* Left: Quick Search */}
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenCommandPalette}
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">Search</span>
            <kbd className="hidden sm:inline-flex pointer-events-none h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium">
              {formatShortcut(SHORTCUTS.COMMAND_PALETTE)}
            </kbd>
          </Button>

          {/* Center: Pending Items (Admin only) */}
          {isAdmin && (
            <div className="flex items-center gap-3">
              {/* Pending Withdrawals */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={pendingCounts.withdrawals > 0 ? "warning" : "ghost"}
                    size="sm"
                    onClick={() => navigate("/admin/withdrawals")}
                    className="gap-2"
                  >
                    <ArrowUpCircle className="h-4 w-4" />
                    <span className="hidden sm:inline">Withdrawals</span>
                    {pendingCounts.withdrawals > 0 && (
                      <Badge variant="secondary" className="ml-1">
                        {pendingCounts.withdrawals}
                      </Badge>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {pendingCounts.withdrawals > 0
                    ? `${pendingCounts.withdrawals} pending withdrawal${pendingCounts.withdrawals > 1 ? "s" : ""}`
                    : "No pending withdrawals"}
                </TooltipContent>
              </Tooltip>

              {/* Reports Needed */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={pendingCounts.reportsNeeded > 0 ? "outline" : "ghost"}
                    size="sm"
                    onClick={() => navigate("/admin/investor-reports")}
                    className="gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    <span className="hidden sm:inline">Reports</span>
                    {pendingCounts.reportsNeeded > 0 && (
                      <Badge variant="destructive" className="ml-1">
                        {pendingCounts.reportsNeeded}
                      </Badge>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {pendingCounts.reportsNeeded > 0
                    ? `${pendingCounts.reportsNeeded} investor${pendingCounts.reportsNeeded > 1 ? "s" : ""} need reports`
                    : "All reports generated"}
                </TooltipContent>
              </Tooltip>

              {/* Total Alert */}
              {totalPending > 0 && (
                <div className="hidden md:flex items-center gap-1 text-sm text-amber-600 dark:text-amber-400">
                  <AlertCircle className="h-4 w-4" />
                  <span>{totalPending} pending</span>
                </div>
              )}
            </div>
          )}

          {/* Right: Period Status & Sync */}
          <div className="flex items-center gap-3">
            {/* Current Period */}
            <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{currentPeriod}</span>
            </div>

            {/* Refresh Button */}
            {isAdmin && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={fetchPendingCounts}
                    disabled={isRefreshing}
                    className="h-8 w-8"
                  >
                    <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Last sync: {format(lastSync, "HH:mm:ss")}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
