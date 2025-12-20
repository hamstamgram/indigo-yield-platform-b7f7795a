/**
 * Unified Investors Page
 * Single page with toggle for inline management vs navigation mode
 * Includes filters for fund and active/inactive status
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Loader2,
  User,
  Mail,
  ChevronRight,
  PanelRightOpen,
  Filter,
} from "lucide-react";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { adminServiceV2, InvestorSummaryV2 } from "@/services/adminServiceV2";
import AddInvestorDialog from "@/components/admin/investors/AddInvestorDialog";
import { InvestorManagementDrawer } from "@/components/admin/investors/InvestorManagementDrawer";
import { useInlineManagementToggle } from "@/hooks/useInlineManagementToggle";
import { deleteInvestorUser } from "@/services/userService";
import { useToast } from "@/hooks/use-toast";
import { useAdminStats } from "@/hooks/useAdminStats";
import { cn } from "@/lib/utils";
import { assetService } from "@/services/assetService";
import { Asset } from "@/types/investorTypes";
import { supabase } from "@/integrations/supabase/client";

interface Fund {
  id: string;
  code: string;
  name: string;
  asset: string;
}

function UnifiedInvestorsContent() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { stats } = useAdminStats();
  const [investors, setInvestors] = useState<InvestorSummaryV2[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [funds, setFunds] = useState<Fund[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedInvestor, setSelectedInvestor] = useState<InvestorSummaryV2 | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  
  // Filter states
  const [fundFilter, setFundFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [investorPositions, setInvestorPositions] = useState<Map<string, string[]>>(new Map());

  // Toggle for inline management mode
  const { isInlineMode, setIsInlineMode } = useInlineManagementToggle();

  const loadData = async () => {
    setLoading(true);
    try {
      const [investorsData, assetsData, fundsData, positionsData] = await Promise.all([
        adminServiceV2.getAllInvestorsWithSummary(),
        assetService.getAssets({ is_active: true }),
        supabase.from("funds").select("id, code, name, asset").eq("status", "active").order("code"),
        supabase.from("investor_positions").select("investor_id, fund_id").gt("current_value", 0),
      ]);
      
      setInvestors(investorsData);
      setFunds(fundsData.data || []);
      
      // Build map of investor -> fund IDs
      const posMap = new Map<string, string[]>();
      (positionsData.data || []).forEach((p) => {
        const existing = posMap.get(p.investor_id) || [];
        if (!existing.includes(p.fund_id)) {
          existing.push(p.fund_id);
        }
        posMap.set(p.investor_id, existing);
      });
      setInvestorPositions(posMap);
      
      // Transform to match Asset type expected by AddInvestorDialog
      const transformedAssets: Asset[] = assetsData.map((a) => ({
        id: a.asset_id ? parseInt(a.asset_id, 10) : 0,
        symbol: a.symbol,
        name: a.name,
      }));
      setAssets(transformedAssets);
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleInvestorClick = (investor: InvestorSummaryV2) => {
    if (isInlineMode) {
      // Open drawer with management panel
      setSelectedInvestor(investor);
      setDrawerOpen(true);
    } else {
      // Navigate to full profile page
      navigate(`/admin/investors/${investor.id}`);
    }
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
  };

  const handleDeleteInvestor = async (investorId: string) => {
    try {
      await deleteInvestorUser(investorId);
      toast({
        title: "Investor deleted",
        description: "The investor has been removed successfully.",
      });
      setDrawerOpen(false);
      setSelectedInvestor(null);
      loadData();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete investor";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      throw error; // Re-throw so drawer knows deletion failed
    }
  };

  const filteredInvestors = investors.filter((inv) => {
    // Text search filter
    const search = searchTerm.toLowerCase();
    const matchesSearch =
      inv.firstName.toLowerCase().includes(search) ||
      inv.lastName.toLowerCase().includes(search) ||
      inv.email.toLowerCase().includes(search);

    if (!matchesSearch) return false;

    // Fund filter
    if (fundFilter !== "all") {
      const investorFunds = investorPositions.get(inv.id) || [];
      if (!investorFunds.includes(fundFilter)) return false;
    }

    // Status filter (active = has positions, inactive = no positions)
    if (statusFilter !== "all") {
      const hasPositions = investorPositions.has(inv.id);
      if (statusFilter === "active" && !hasPositions) return false;
      if (statusFilter === "inactive" && hasPositions) return false;
    }

    return true;
  });

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
            {investors.length} total investors • {stats.uniqueInvestorsWithPositions} with active positions
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Inline Management Toggle */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50">
            <PanelRightOpen className="h-4 w-4 text-muted-foreground" />
            <Label
              htmlFor="inline-toggle"
              className="text-sm font-medium cursor-pointer"
            >
              Manage inline
            </Label>
            <Switch
              id="inline-toggle"
              checked={isInlineMode}
              onCheckedChange={setIsInlineMode}
            />
          </div>
          <AddInvestorDialog assets={assets} onInvestorAdded={loadData} />
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        
        {/* Fund Filter */}
        <Select value={fundFilter} onValueChange={setFundFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by fund" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Funds</SelectItem>
            {funds.map((fund) => (
              <SelectItem key={fund.id} value={fund.id}>
                {fund.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {/* Status Filter */}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Investors</SelectItem>
            <SelectItem value="active">Active (with positions)</SelectItem>
            <SelectItem value="inactive">Inactive (no positions)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Mode indicator */}
      <p className="text-sm text-muted-foreground">
        {isInlineMode
          ? "Click an investor to manage inline"
          : "Click an investor to open full profile"}
        {" • "}
        Showing {filteredInvestors.length} of {investors.length} investors
      </p>

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
                selectedInvestor?.id === investor.id && drawerOpen && "border-primary"
              )}
              onClick={() => handleInvestorClick(investor)}
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
                    {isInlineMode ? (
                      <PanelRightOpen className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Investor Management Drawer */}
      <InvestorManagementDrawer
        investorId={selectedInvestor?.id || null}
        investorSummary={selectedInvestor}
        isOpen={drawerOpen}
        onClose={handleDrawerClose}
        onDataChange={loadData}
        onDelete={handleDeleteInvestor}
      />
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
