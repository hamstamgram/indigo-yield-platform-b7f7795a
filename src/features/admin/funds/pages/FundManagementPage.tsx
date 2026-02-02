/**
 * Fund Management Page
 * Admin page for managing funds: create, edit, archive, restore
 * REDESIGNED: Yield Spectrum "Asset Cards" aesthetic
 */

import { useState } from "react";
import {
  Button,
  Badge,
  Skeleton,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui";
import {
  Plus,
  Loader2,
  Archive,
  RotateCcw,
  Users,
  Pencil,
  Briefcase,
  TrendingUp,
  LayoutGrid,
  List as ListIcon,
} from "lucide-react";
import { AdminGuard, CreateFundDialog, EditFundDialog } from "@/components/admin";
import { CryptoIcon } from "@/components/CryptoIcons";
import { format } from "date-fns";
import {
  useFundsWithMetrics,
  useArchiveFund,
  useRestoreFund,
  type FundWithMetrics,
} from "@/features/admin/funds/hooks/useFundsWithMetrics";
import { cn } from "@/lib/utils";

type FundStatus = "active" | "inactive" | "suspended" | "deprecated";

const STATUS_CONFIG: Record<FundStatus, { label: string; className: string; glow: string }> = {
  active: {
    label: "Active",
    className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    glow: "shadow-[0_0_15px_-3px_rgba(16,185,129,0.3)]",
  },
  inactive: {
    label: "Inactive",
    className: "bg-slate-500/10 text-slate-400 border-slate-500/20",
    glow: "",
  },
  suspended: {
    label: "Suspended",
    className: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    glow: "shadow-[0_0_15px_-3px_rgba(245,158,11,0.2)]",
  },
  deprecated: {
    label: "Archived",
    className: "bg-rose-900/10 text-rose-500 border-rose-500/20",
    glow: "",
  },
};

function FundManagementContent() {
  const { data: funds = [], isLoading: loading, refetch } = useFundsWithMetrics();
  const archiveMutation = useArchiveFund();
  const restoreMutation = useRestoreFund();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingFund, setEditingFund] = useState<FundWithMetrics | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: "archive" | "restore";
    fund: FundWithMetrics | null;
    error?: string;
  }>({ open: false, action: "archive", fund: null });

  const actionLoading =
    archiveMutation.isPending || restoreMutation.isPending
      ? archiveMutation.variables?.id || restoreMutation.variables?.id
      : null;

  const handleArchive = async (fund: FundWithMetrics) => {
    if (fund.investor_count > 0) {
      setConfirmDialog({
        open: true,
        action: "archive",
        fund,
        error: `Cannot archive fund with ${fund.investor_count} active investor(s). Transfer or withdraw their positions first.`,
      });
      return;
    }
    setConfirmDialog({ open: true, action: "archive", fund });
  };

  const handleRestore = async (fund: FundWithMetrics) => {
    const existingActive = funds.find(
      (f) => f.asset === fund.asset && f.status === "active" && f.id !== fund.id
    );

    if (existingActive) {
      setConfirmDialog({
        open: true,
        action: "restore",
        fund,
        error: `Cannot restore: "${existingActive.name}" is already active for ${fund.asset}. Archive it first.`,
      });
      return;
    }
    setConfirmDialog({ open: true, action: "restore", fund });
  };

  const confirmAction = async () => {
    const { action, fund, error } = confirmDialog;
    if (!fund || error) {
      setConfirmDialog({ open: false, action: "archive", fund: null });
      return;
    }

    if (action === "archive") {
      archiveMutation.mutate(fund);
    } else {
      restoreMutation.mutate(fund);
    }
    setConfirmDialog({ open: false, action: "archive", fund: null });
  };

  const formatAssetValue = (value: number, asset: string) => {
    if (asset === "BTC") {
      return value.toLocaleString("en-US", {
        minimumFractionDigits: 4,
        maximumFractionDigits: 4,
      });
    } else if (asset === "ETH" || asset === "SOL") {
      return value.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 4,
      });
    }
    return value.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const activeFunds = funds.filter((f) => f.status === "active");

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight text-white flex items-center gap-3">
            Fund Management
            <Badge variant="outline" className="border-indigo-500/30 text-indigo-400">
              {activeFunds.length} Active
            </Badge>
          </h1>
          <p className="text-slate-400 mt-1 max-w-2xl">
            Create and manage yield funds. Each fund represents a distinct strategy for a specific
            asset.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-black/40 rounded-lg p-1 border border-white/10">
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-8 w-8 rounded-md transition-all",
                viewMode === "grid" ? "bg-white/10 text-white" : "text-slate-400 hover:text-white"
              )}
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-8 w-8 rounded-md transition-all",
                viewMode === "list" ? "bg-white/10 text-white" : "text-slate-400 hover:text-white"
              )}
              onClick={() => setViewMode("list")}
            >
              <ListIcon className="h-4 w-4" />
            </Button>
          </div>
          <Button
            onClick={() => setShowCreateDialog(true)}
            size="lg"
            className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_20px_-5px_rgba(99,102,241,0.5)] border border-indigo-400/20"
          >
            <Plus className="mr-2 h-5 w-5" />
            New Fund
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64 w-full rounded-2xl bg-white/5" />
          ))}
        </div>
      ) : funds.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center glass-panel rounded-3xl border-dashed">
          <div className="p-4 rounded-full bg-white/5 mb-4">
            <Briefcase className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-xl font-medium text-white mb-2">No Funds Created</h3>
          <p className="text-slate-400 max-w-md mb-6">
            Get started by creating your first yield fund strategy.
          </p>
          <Button onClick={() => setShowCreateDialog(true)}>Create Fund</Button>
        </div>
      ) : (
        <div
          className={cn(
            "grid gap-6",
            viewMode === "grid" ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"
          )}
        >
          {funds.map((fund) => {
            const status = STATUS_CONFIG[fund.status as FundStatus] || STATUS_CONFIG.active;
            const isLoading = actionLoading === fund.id;
            const isArchived = fund.status === "deprecated";

            return (
              <div
                key={fund.id}
                className={cn(
                  "group relative overflow-hidden transition-all duration-300",
                  "glass-card rounded-3xl border border-white/5 p-6",
                  "hover:border-indigo-500/30 hover:shadow-[0_0_30px_-10px_rgba(99,102,241,0.2)]",
                  viewMode === "list" && "flex items-center justify-between gap-6",
                  isArchived && "opacity-60 hover:opacity-100 grayscale hover:grayscale-0"
                )}
              >
                {/* Background Gradient */}
                <div
                  className={cn(
                    "absolute inset-0 bg-gradient-to-br transition-opacity duration-500 pointer-events-none",
                    isArchived
                      ? "from-black/0 via-black/0 to-black/0"
                      : "from-indigo-500/5 via-purple-500/5 to-black/0 opacity-0 group-hover:opacity-100"
                  )}
                />

                <div
                  className={cn(
                    "relative z-10",
                    viewMode === "list" && "flex items-center gap-6 flex-1"
                  )}
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center shadow-inner">
                        {fund.logo_url ? (
                          <img
                            src={fund.logo_url}
                            alt={fund.name}
                            className="h-8 w-8 object-cover"
                          />
                        ) : (
                          <CryptoIcon symbol={fund.asset} className="h-8 w-8 text-white" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors">
                          {fund.name}
                        </h3>
                        <div className="flex items-center gap-2 text-xs text-slate-400 font-mono mt-0.5">
                          <span>{fund.code}</span>
                          <span className="w-1 h-1 rounded-full bg-slate-600" />
                          <span>{fund.asset}</span>
                        </div>
                      </div>
                    </div>
                    <div
                      className={cn(
                        "px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border backdrop-blur-md",
                        status.className,
                        status.glow
                      )}
                    >
                      {status.label}
                    </div>
                  </div>

                  {/* Metrics Grid */}
                  <div
                    className={cn(
                      "grid gap-4 bg-black/20 rounded-2xl p-4 border border-white/5",
                      viewMode === "grid" ? "grid-cols-2" : "grid-cols-4 flex-1"
                    )}
                  >
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">
                        Total AUM
                      </p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-base font-mono font-bold text-white">
                          {formatAssetValue(fund.total_aum, fund.asset)}
                        </span>
                        <span className="text-[10px] text-slate-400">{fund.asset}</span>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">
                        Investors
                      </p>
                      <div className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-indigo-400" />
                        <span className="text-base font-mono font-bold text-white">
                          {fund.investor_count}
                        </span>
                      </div>
                    </div>

                    {viewMode === "list" && (
                      <>
                        <div>
                          <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">
                            Inception
                          </p>
                          <span className="text-sm font-medium text-slate-300">
                            {fund.inception_date
                              ? format(new Date(fund.inception_date), "MMM yyyy")
                              : "-"}
                          </span>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">
                            Performance
                          </p>
                          <div className="flex items-center gap-1 text-emerald-400">
                            <TrendingUp className="h-3 w-3" />
                            <span className="text-sm font-bold">Live</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Actions Footer */}
                <div
                  className={cn(
                    "relative z-10 flex items-center gap-2",
                    viewMode === "grid"
                      ? "mt-6 pt-6 border-t border-white/5"
                      : "pl-6 border-l border-white/5"
                  )}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 hover:bg-indigo-500/10 hover:text-indigo-400"
                    onClick={() => setEditingFund(fund)}
                    disabled={isLoading}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit Details
                  </Button>

                  {fund.status === "active" ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 hover:bg-rose-500/10 hover:text-rose-400 text-slate-400"
                      onClick={() => handleArchive(fund)}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Archive className="mr-2 h-4 w-4" />
                          Archive
                        </>
                      )}
                    </Button>
                  ) : fund.status === "deprecated" ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 hover:bg-emerald-500/10 hover:text-emerald-400 text-slate-400"
                      onClick={() => handleRestore(fund)}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <RotateCcw className="mr-2 h-4 w-4" />
                          Restore
                        </>
                      )}
                    </Button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dialogs */}
      <CreateFundDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={() => {
          refetch();
          setShowCreateDialog(false);
        }}
        existingAssets={funds.filter((f) => f.status === "active").map((f) => f.asset)}
      />

      <EditFundDialog
        open={!!editingFund}
        onOpenChange={(open) => !open && setEditingFund(null)}
        fund={editingFund}
        onSuccess={() => {
          refetch();
          setEditingFund(null);
        }}
        existingTickers={funds.filter((f) => f.status === "active").map((f) => f.asset)}
      />

      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) =>
          !open && setConfirmDialog({ open: false, action: "archive", fund: null })
        }
      >
        <AlertDialogContent className="glass-panel border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              {confirmDialog.error
                ? "Action Not Allowed"
                : confirmDialog.action === "archive"
                  ? "Archive Fund"
                  : "Restore Fund"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              {confirmDialog.error ? (
                <span className="text-rose-400 font-medium">{confirmDialog.error}</span>
              ) : confirmDialog.action === "archive" ? (
                <>
                  Are you sure you want to archive{" "}
                  <strong className="text-white">{confirmDialog.fund?.name}</strong>? This will hide
                  it from selectors and prevent new investments.
                </>
              ) : (
                <>
                  Are you sure you want to restore{" "}
                  <strong className="text-white">{confirmDialog.fund?.name}</strong>? This will make
                  it available for new investments again.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-white/10 text-slate-300 hover:bg-white/5 hover:text-white">
              Cancel
            </AlertDialogCancel>
            {!confirmDialog.error && (
              <AlertDialogAction
                onClick={confirmAction}
                className={cn(
                  confirmDialog.action === "archive"
                    ? "bg-rose-500 hover:bg-rose-600 border-rose-400/20"
                    : "bg-emerald-500 hover:bg-emerald-600 border-emerald-400/20",
                  "text-white shadow-lg"
                )}
              >
                {confirmDialog.action === "archive" ? "Confirm Archive" : "Confirm Restore"}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function FundManagementPage() {
  return (
    <AdminGuard>
      <FundManagementContent />
    </AdminGuard>
  );
}
