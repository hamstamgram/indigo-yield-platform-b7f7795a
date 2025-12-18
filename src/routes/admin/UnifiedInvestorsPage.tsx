/**
 * Unified Investors Page
 * Single page with slide-out drawer for investor details
 */

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Loader2,
  User,
  Mail,
  ChevronRight,
  Plus,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { adminServiceV2, InvestorSummaryV2 } from "@/services/adminServiceV2";
import { supabase } from "@/integrations/supabase/client";
import AddInvestorDialog from "@/components/admin/investors/AddInvestorDialog";
import InviteInvestorDialog from "@/components/admin/investors/InviteInvestorDialog";
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

interface InvestorDetail extends InvestorSummaryV2 {
  positions: InvestorPosition[];
  totalValue: number;
}

function UnifiedInvestorsContent() {
  const [investors, setInvestors] = useState<InvestorSummaryV2[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedInvestor, setSelectedInvestor] = useState<InvestorDetail | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const loadInvestors = async () => {
    setLoading(true);
    try {
      const data = await adminServiceV2.getAllInvestorsWithSummary();
      setInvestors(data);
    } catch (error) {
      console.error("Failed to load investors:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvestors();
  }, []);

  const loadInvestorDetail = async (investor: InvestorSummaryV2) => {
    setLoadingDetail(true);
    setSelectedInvestor({ ...investor, positions: [], totalValue: 0 });
    setDrawerOpen(true);

    try {
      // Load positions with fund details
      const { data: positions } = await supabase
        .from("investor_positions")
        .select(`
          fund_id,
          current_value,
          cost_basis,
          unrealized_pnl,
          funds!inner(name, code, asset)
        `)
        .eq("investor_id", investor.id);

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

      setSelectedInvestor({
        ...investor,
        positions: mappedPositions,
        totalValue,
      });
    } catch (error) {
      console.error("Failed to load investor detail:", error);
    } finally {
      setLoadingDetail(false);
    }
  };

  const filteredInvestors = investors.filter((inv) => {
    const search = searchTerm.toLowerCase();
    return (
      inv.firstName.toLowerCase().includes(search) ||
      inv.lastName.toLowerCase().includes(search) ||
      inv.email.toLowerCase().includes(search)
    );
  });

  const formatValue = (value: number, decimals: number = 2) => {
    return value.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">Investors</h1>
          <p className="text-muted-foreground mt-1">
            {investors.length} total investors · Click to view details
          </p>
        </div>
        <div className="flex gap-2">
          <InviteInvestorDialog />
          <AddInvestorDialog assets={[]} onInvestorAdded={loadInvestors} />
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Investors List */}
      <div className="grid gap-3">
        {filteredInvestors.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              {searchTerm ? "No investors match your search" : "No investors found"}
            </CardContent>
          </Card>
        ) : (
          filteredInvestors.map((investor) => (
            <Card
              key={investor.id}
              className={cn(
                "cursor-pointer transition-all hover:shadow-md hover:border-primary/30",
                selectedInvestor?.id === investor.id && "border-primary"
              )}
              onClick={() => loadInvestorDetail(investor)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">
                        {investor.firstName} {investor.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {investor.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant={investor.status === "active" ? "default" : "secondary"}>
                      {investor.status || "active"}
                    </Badge>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Investor Detail Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {selectedInvestor && (
            <>
              <SheetHeader className="pb-4 border-b">
                <SheetTitle className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <span className="block">
                      {selectedInvestor.firstName} {selectedInvestor.lastName}
                    </span>
                    <span className="text-sm font-normal text-muted-foreground">
                      {selectedInvestor.email}
                    </span>
                  </div>
                </SheetTitle>
                <SheetDescription className="sr-only">
                  Investor details and positions
                </SheetDescription>
              </SheetHeader>

              <Tabs defaultValue="positions" className="mt-6">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="positions">Positions</TabsTrigger>
                  <TabsTrigger value="info">Info</TabsTrigger>
                </TabsList>

                <TabsContent value="positions" className="mt-4 space-y-4">
                  {loadingDetail ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : selectedInvestor.positions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Wallet className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p>No fund positions</p>
                    </div>
                  ) : (
                    selectedInvestor.positions.map((pos) => (
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
                              <p className={cn(
                                "font-mono font-semibold",
                                pos.unrealized_pnl >= 0 ? "text-green-600" : "text-red-600"
                              )}>
                                {pos.unrealized_pnl >= 0 ? "+" : ""}
                                {formatValue(pos.unrealized_pnl, pos.asset === "BTC" ? 4 : 2)} {pos.asset}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </TabsContent>

                <TabsContent value="info" className="mt-4 space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">Status</span>
                      <Badge variant={selectedInvestor.status === "active" ? "default" : "secondary"}>
                        {selectedInvestor.status || "active"}
                      </Badge>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">Fund Positions</span>
                      <span className="font-semibold">{selectedInvestor.positions.length}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">Investor ID</span>
                      <span className="font-mono text-xs">{selectedInvestor.id.slice(0, 8)}...</span>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full mt-4"
                    onClick={() => {
                      window.open(`/admin/investors/${selectedInvestor.id}`, "_blank");
                    }}
                  >
                    Open Full Profile
                  </Button>
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default function UnifiedInvestorsPage() {
  return (
    <AdminGuard>
      <UnifiedInvestorsContent />
    </AdminGuard>
  );
}
