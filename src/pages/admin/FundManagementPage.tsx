/**
 * Fund Management Page
 * Admin page for managing funds: create, edit, archive, restore
 * Token-denominated only - fees managed per-investor, not per-fund
 */

import { useState } from "react";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
  Button, Badge, Skeleton,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui";
import {
  Plus,
  Loader2,
  Archive,
  RotateCcw,
  PieChart,
  Users,
  Pencil,
} from "lucide-react";
import { AdminGuard, CreateFundDialog, EditFundDialog } from "@/components/admin";
import { CryptoIcon } from "@/components/CryptoIcons";
import { format } from "date-fns";
import {
  useFundsWithMetrics,
  useArchiveFund,
  useRestoreFund,
  type FundWithMetrics,
} from "@/hooks/data/admin/useFundsWithMetrics";

type FundStatus = "active" | "inactive" | "suspended" | "deprecated";

const STATUS_CONFIG: Record<FundStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "Active", variant: "default" },
  inactive: { label: "Inactive", variant: "secondary" },
  suspended: { label: "Suspended", variant: "outline" },
  deprecated: { label: "Archived", variant: "destructive" },
};

function FundManagementContent() {
  const { data: funds = [], isLoading: loading, refetch } = useFundsWithMetrics();
  const archiveMutation = useArchiveFund();
  const restoreMutation = useRestoreFund();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingFund, setEditingFund] = useState<FundWithMetrics | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: "archive" | "restore";
    fund: FundWithMetrics | null;
    error?: string;
  }>({ open: false, action: "archive", fund: null });

  const actionLoading = archiveMutation.isPending || restoreMutation.isPending
    ? (archiveMutation.variables?.id || restoreMutation.variables?.id)
    : null;

  const handleArchive = async (fund: FundWithMetrics) => {
    // Check for active investors
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
    // Check if another active fund exists for the same asset
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
      return value.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
    } else if (asset === "ETH" || asset === "SOL") {
      return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
    }
    return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const activeFunds = funds.filter((f) => f.status === "active");
  const archivedFunds = funds.filter((f) => f.status === "deprecated");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Fund Management</h1>
          <p className="text-muted-foreground">Create, edit, and manage yield funds</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Fund
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Funds</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeFunds.length}</div>
            <p className="text-xs text-muted-foreground">
              {archivedFunds.length} archived
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Investors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {activeFunds.reduce((sum, f) => sum + f.investor_count, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Across all active funds</p>
          </CardContent>
        </Card>
      </div>

      {/* Funds Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Funds</CardTitle>
          <CardDescription>
            Manage fund metadata. Fees are configured per investor, not per fund.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : funds.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No funds found. Create your first fund to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fund</TableHead>
                  <TableHead>Ticker</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Inception</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">AUM</TableHead>
                  <TableHead className="text-right">Investors</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {funds.map((fund) => {
                  const statusConfig = STATUS_CONFIG[fund.status as FundStatus] || STATUS_CONFIG.active;
                  const isLoading = actionLoading === fund.id;

                  return (
                    <TableRow key={fund.id} className={fund.status === "deprecated" ? "opacity-60" : ""}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {fund.logo_url ? (
                            <img
                              src={fund.logo_url}
                              alt={fund.name}
                              className="h-8 w-8 rounded-full object-cover"
                            />
                          ) : (
                            <CryptoIcon symbol={fund.asset} />
                          )}
                          <div>
                            <div className="font-medium">{fund.name}</div>
                            <div className="text-xs text-muted-foreground">{fund.code}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono">{fund.asset}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                      </TableCell>
                      <TableCell>
                        {fund.inception_date
                          ? format(new Date(fund.inception_date), "MMM d, yyyy")
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {fund.created_at
                          ? format(new Date(fund.created_at), "MMM d, yyyy")
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatAssetValue(fund.total_aum, fund.asset)} {fund.asset}
                      </TableCell>
                      <TableCell className="text-right">{fund.investor_count}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingFund(fund)}
                            disabled={isLoading}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {fund.status === "active" ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleArchive(fund)}
                              disabled={isLoading}
                            >
                              {isLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Archive className="mr-1 h-4 w-4" />
                                  Archive
                                </>
                              )}
                            </Button>
                          ) : fund.status === "deprecated" ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRestore(fund)}
                              disabled={isLoading}
                            >
                              {isLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <RotateCcw className="mr-1 h-4 w-4" />
                                  Restore
                                </>
                              )}
                            </Button>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Fund Dialog */}
      <CreateFundDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={() => {
          refetch();
          setShowCreateDialog(false);
        }}
        existingAssets={funds.filter((f) => f.status === "active").map((f) => f.asset)}
      />

      {/* Edit Fund Dialog */}
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

      {/* Confirmation Dialog */}
      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) => !open && setConfirmDialog({ open: false, action: "archive", fund: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog.error
                ? "Action Not Allowed"
                : confirmDialog.action === "archive"
                ? "Archive Fund"
                : "Restore Fund"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.error ? (
                <span className="text-destructive">{confirmDialog.error}</span>
              ) : confirmDialog.action === "archive" ? (
                <>
                  Are you sure you want to archive <strong>{confirmDialog.fund?.name}</strong>?
                  This will hide it from selectors and prevent new investments.
                </>
              ) : (
                <>
                  Are you sure you want to restore <strong>{confirmDialog.fund?.name}</strong>?
                  This will make it available for new investments again.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            {!confirmDialog.error && (
              <AlertDialogAction onClick={confirmAction}>
                {confirmDialog.action === "archive" ? "Archive" : "Restore"}
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
