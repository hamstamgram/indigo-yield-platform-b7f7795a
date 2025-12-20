/**
 * Enhanced Investor Management Drawer
 * Full-featured inline management with tabs for Yield, Positions, Transactions
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { InvestorSummaryV2 } from "@/services/adminServiceV2";
import { InvestorYieldManager } from "./InvestorYieldManager";
import InvestorPositionsTab from "./InvestorPositionsTab";
import InvestorTransactionsTab from "./InvestorTransactionsTab";
import { CryptoIcon } from "@/components/CryptoIcons";
import { cn } from "@/lib/utils";

interface InvestorPosition {
  fund_id: string;
  fund_name: string;
  fund_code: string;
  asset: string;
  current_value: number;
  cost_basis: number;
  unrealized_pnl: number;
}

interface InvestorDetailData {
  positions: InvestorPosition[];
  totalValue: number;
  name: string;
}

interface InvestorManagementDrawerProps {
  investorId: string | null;
  investorSummary: InvestorSummaryV2 | null;
  isOpen: boolean;
  onClose: () => void;
  onDataChange?: () => void;
}

export function InvestorManagementDrawer({
  investorId,
  investorSummary,
  isOpen,
  onClose,
  onDataChange,
}: InvestorManagementDrawerProps) {
  const navigate = useNavigate();
  const [detailData, setDetailData] = useState<InvestorDetailData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  // Load investor details when drawer opens
  useEffect(() => {
    if (isOpen && investorId) {
      loadInvestorDetail();
    }
  }, [isOpen, investorId]);

  // Reset state when drawer closes
  useEffect(() => {
    if (!isOpen) {
      setActiveTab("overview");
      setError(null);
    }
  }, [isOpen]);

  const loadInvestorDetail = async () => {
    if (!investorId) return;

    setLoading(true);
    setError(null);

    try {
      // Load positions with fund details
      const { data: positions, error: posError } = await supabase
        .from("investor_positions")
        .select(`
          fund_id,
          current_value,
          cost_basis,
          unrealized_pnl,
          funds!inner(name, code, asset)
        `)
        .eq("investor_id", investorId);

      if (posError) throw posError;

      const mappedPositions: InvestorPosition[] = (positions || []).map((p: any) => ({
        fund_id: p.fund_id,
        fund_name: p.funds?.name || "Unknown",
        fund_code: p.funds?.code || "",
        asset: p.funds?.asset || "",
        current_value: p.current_value || 0,
        cost_basis: p.cost_basis || 0,
        unrealized_pnl: p.unrealized_pnl || 0,
      }));

      const totalValue = mappedPositions.reduce((sum, p) => sum + p.current_value, 0);

      setDetailData({
        positions: mappedPositions,
        totalValue,
        name: investorSummary
          ? `${investorSummary.firstName} ${investorSummary.lastName}`
          : "Investor",
      });
    } catch (err) {
      console.error("Failed to load investor detail:", err);
      setError(err instanceof Error ? err : new Error("Failed to load investor details"));
    } finally {
      setLoading(false);
    }
  };

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

  const investorName = investorSummary
    ? `${investorSummary.firstName} ${investorSummary.lastName}`
    : "Investor";

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
            <Button variant="outline" className="mt-4" onClick={loadInvestorDetail}>
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
              {detailData?.positions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Wallet className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No fund positions</p>
                </div>
              ) : (
                detailData?.positions.map((pos) => (
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
                            {formatValue(pos.current_value, pos.asset === "BTC" ? 4 : 2)} {pos.asset}
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
                              pos.unrealized_pnl >= 0 ? "text-green-600" : "text-red-600"
                            )}
                          >
                            {pos.unrealized_pnl >= 0 ? "+" : ""}
                            {formatValue(pos.unrealized_pnl, pos.asset === "BTC" ? 4 : 2)} {pos.asset}
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
      </SheetContent>
    </Sheet>
  );
}
