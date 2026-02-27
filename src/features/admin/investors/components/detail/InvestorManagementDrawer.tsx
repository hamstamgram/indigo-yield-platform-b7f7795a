/**
 * Enhanced Investor Management Drawer
 * Full-featured inline management with unified 6-tab structure
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Button,
  Badge,
  Skeleton,
  Card,
  CardContent,
} from "@/components/ui";
import {
  User,
  ExternalLink,
  Loader2,
  TrendingUp,
  Wallet,
  History,
  AlertCircle,
  RotateCcw,
  FileText,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { AdminInvestorSummary, forceDeleteInvestorUser } from "@/services/admin";
import { InvestorYieldManager } from "../yields";
import { InvestorPositionsTab } from "../tabs";
import { InvestorTransactionsTab } from "../tabs";
import { CryptoIcon } from "@/components/CryptoIcons";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { logError } from "@/lib/logger";
import {
  useAdminInvestorPositions,
  useInvestorActivePositions,
  type AdminInvestorPosition,
} from "@/hooks";

type DeleteStep = "check" | "confirm-with-positions" | "confirm-empty" | "deleting";

interface InvestorManagementDrawerProps {
  investorId: string | null;
  investorSummary: AdminInvestorSummary | null;
  isOpen: boolean;
  onClose: () => void;
  onDataChange?: () => void;
  onDelete?: (investorId: string) => Promise<void>;
}

export function InvestorManagementDrawer({
  investorId,
  investorSummary,
  isOpen,
  onClose,
  onDataChange,
  onDelete,
}: InvestorManagementDrawerProps) {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("overview");

  // Delete flow state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteStep, setDeleteStep] = useState<DeleteStep>("check");

  // Use hooks for data fetching
  const {
    data: positionsData,
    isLoading: loading,
    error,
    refetch: refetchPositions,
  } = useAdminInvestorPositions(isOpen && investorId ? investorId : undefined);

  const { data: activePositions = [], refetch: fetchActivePositions } = useInvestorActivePositions(
    investorId || undefined,
    false
  );

  // Reset state when drawer closes
  useEffect(() => {
    if (!isOpen) {
      setActiveTab("overview");
      setDeleteDialogOpen(false);
      setDeleteStep("check");
    }
  }, [isOpen]);

  const formatValue = (value: number, decimals: number = 2) => {
    return value.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  const handleOpenFullProfile = () => {
    if (investorId) {
      navigate(`/admin/investors/${investorId}`);
      onClose();
    }
  };

  const handleRetry = () => {
    refetchPositions();
  };

  // Open delete dialog and check for active positions
  const handleDeleteClick = async () => {
    if (!investorId) return;

    setDeleteStep("check");
    setDeleteDialogOpen(true);

    try {
      const result = await fetchActivePositions();
      const positions = result.data || [];

      if (positions.length > 0) {
        setDeleteStep("confirm-with-positions");
      } else {
        setDeleteStep("confirm-empty");
      }
    } catch (err) {
      logError("investor.checkPositions", err, { investorId });
      setDeleteStep("confirm-empty");
    }
  };

  // Force delete - clears all positions and deletes investor
  const handleForceDelete = async () => {
    if (!investorId) return;

    setDeleteStep("deleting");

    try {
      await forceDeleteInvestorUser(investorId);

      toast.success("Investor deleted", {
        description: "The investor and all associated data have been removed.",
      });

      setDeleteDialogOpen(false);
      onClose();
      onDataChange?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete investor";
      toast.error("Error", {
        description: message,
      });
      setDeleteStep("confirm-with-positions");
    }
  };

  // Simple delete for investors without positions
  const handleSimpleDelete = async () => {
    if (!investorId || !onDelete) return;

    setDeleteStep("deleting");

    try {
      await onDelete(investorId);
      setDeleteDialogOpen(false);
    } catch {
      // Error handled by parent
      setDeleteStep("confirm-empty");
    }
  };

  const investorName = investorSummary
    ? `${investorSummary.firstName} ${investorSummary.lastName}`
    : "Investor";

  // Render delete dialog content based on step
  const renderDeleteDialogContent = () => {
    switch (deleteStep) {
      case "check":
        return (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>Checking Investor Data...</AlertDialogTitle>
              <AlertDialogDescription>
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
            </AlertDialogFooter>
          </>
        );

      case "confirm-with-positions":
        return (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Active Positions Found
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-4">
                  <p>
                    <strong>{investorName}</strong> has {activePositions.length} active fund
                    position{activePositions.length !== 1 ? "s" : ""}:
                  </p>
                  <div className="bg-muted rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
                    {activePositions.map((pos) => (
                      <div key={pos.fund_id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <CryptoIcon symbol={pos.asset} className="h-5 w-5" />
                          <span className="font-medium">{pos.fund_name}</span>
                        </div>
                        <span className="font-mono">
                          {formatValue(pos.current_value, pos.asset === "BTC" ? 4 : 2)} {pos.asset}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="text-amber-400 text-sm">
                    Force deleting will permanently remove all positions and associated data. This
                    cannot be undone.
                  </p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  handleForceDelete();
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Force Delete All & Remove Investor
              </AlertDialogAction>
            </AlertDialogFooter>
          </>
        );

      case "confirm-empty":
        return (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Investor</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete <strong>{investorName}</strong>? This action cannot
                be undone and will remove all associated data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  handleSimpleDelete();
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </>
        );

      case "deleting":
        return (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>Deleting Investor...</AlertDialogTitle>
              <AlertDialogDescription>
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-destructive" />
                </div>
                <p className="text-center text-sm">Removing investor data and positions...</p>
              </AlertDialogDescription>
            </AlertDialogHeader>
          </>
        );
    }
  };

  const positions = positionsData?.positions || [];

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        {/* Header */}
        <SheetHeader className="pb-4 border-b">
          <div className="flex items-start justify-between">
            <SheetTitle className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div>
                <span className="block">{investorName}</span>
                <span className="text-sm font-normal text-muted-foreground">
                  {investorSummary?.email}
                </span>
              </div>
            </SheetTitle>
            <div className="flex items-center gap-2">
              {investorSummary && (
                <Badge variant={investorSummary.status === "active" ? "default" : "secondary"}>
                  {investorSummary.status || "active"}
                </Badge>
              )}
            </div>
          </div>
          <SheetDescription className="sr-only">
            Investor management panel with positions, yield, and transactions
          </SheetDescription>
        </SheetHeader>

        {/* Error State */}
        {error && (
          <div className="py-8 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-3" />
            <p className="text-destructive font-medium">Failed to load investor details</p>
            <p className="text-muted-foreground text-sm mt-1">{error.message}</p>
            <Button variant="outline" className="mt-4" onClick={handleRetry}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        )}

        {/* Loading State */}
        {loading && !error && (
          <div className="space-y-4 py-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        )}

        {/* Content */}
        {!loading && !error && investorId && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview" className="gap-1 text-xs sm:text-sm">
                <Wallet className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Overview</span>
              </TabsTrigger>
              <TabsTrigger value="yield" className="gap-1 text-xs sm:text-sm">
                <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Yield</span>
              </TabsTrigger>
              <TabsTrigger value="positions" className="gap-1 text-xs sm:text-sm">
                <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Positions</span>
              </TabsTrigger>
              <TabsTrigger value="transactions" className="gap-1 text-xs sm:text-sm">
                <History className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Txns</span>
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="mt-4 space-y-4">
              {positions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Wallet className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No fund positions</p>
                </div>
              ) : (
                positions.map((pos) => (
                  <Card key={pos.fund_id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <CryptoIcon symbol={pos.asset} className="h-8 w-8" />
                          <div>
                            <p className="font-semibold">{pos.fund_name}</p>
                            <p className="text-xs text-muted-foreground">{pos.fund_code}</p>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Balance</p>
                          <p className="font-mono font-semibold">
                            {formatValue(pos.current_value, pos.asset === "BTC" ? 4 : 2)}{" "}
                            {pos.asset}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Cost Basis</p>
                          <p className="font-mono">
                            {formatValue(pos.cost_basis, pos.asset === "BTC" ? 4 : 2)} {pos.asset}
                          </p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-muted-foreground">Unrealized P&L</p>
                          <p
                            className={cn(
                              "font-mono font-semibold",
                              pos.unrealized_pnl >= 0 ? "text-yield" : "text-rose-400"
                            )}
                          >
                            {pos.unrealized_pnl >= 0 ? "+" : ""}
                            {formatValue(pos.unrealized_pnl, pos.asset === "BTC" ? 4 : 2)}{" "}
                            {pos.asset}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}

              {/* Open Full Profile Button */}
              <Button variant="outline" className="w-full" onClick={handleOpenFullProfile}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Full Profile
              </Button>
            </TabsContent>

            {/* Yield Tab */}
            <TabsContent value="yield" className="mt-4">
              <InvestorYieldManager investorId={investorId} investorName={investorName} />
            </TabsContent>

            {/* Positions Tab */}
            <TabsContent value="positions" className="mt-4">
              <InvestorPositionsTab investorId={investorId} />
            </TabsContent>

            {/* Transactions Tab */}
            <TabsContent value="transactions" className="mt-4">
              <InvestorTransactionsTab investorId={investorId} />
            </TabsContent>
          </Tabs>
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>{renderDeleteDialogContent()}</AlertDialogContent>
        </AlertDialog>
      </SheetContent>
    </Sheet>
  );
}
