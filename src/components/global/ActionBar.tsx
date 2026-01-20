import { useNavigate } from "react-router-dom";
import { Button, Badge, Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui";
import { AlertCircle, ArrowUpCircle, FileText, Search, RefreshCw, Calendar } from "lucide-react";
import { useAuth } from "@/services/auth";
import { usePendingCounts } from "@/hooks/data/admin";
import { formatShortcut, SHORTCUTS } from "@/hooks";
import { format } from "date-fns";

interface ActionBarProps {
  onOpenCommandPalette: () => void;
}

export function ActionBar({ onOpenCommandPalette }: ActionBarProps) {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const currentPeriod = format(new Date(), "MMMM yyyy");

  // Use React Query hook for pending counts
  const {
    data: pendingCounts = { withdrawals: 0, reportsNeeded: 0 },
    isLoading: isRefreshing,
    dataUpdatedAt,
    refetch,
  } = usePendingCounts(isAdmin);

  const lastSync = new Date(dataUpdatedAt || Date.now());
  const totalPending = pendingCounts.withdrawals + pendingCounts.reportsNeeded;

  return (
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
                  onClick={() => refetch()}
                  disabled={isRefreshing}
                  className="h-8 w-8"
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Last sync: {format(lastSync, "HH:mm:ss")}</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </div>
  );
}
