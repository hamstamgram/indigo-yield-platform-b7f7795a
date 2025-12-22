/**
 * Unified Investors Page
 * 2-panel layout: dense table on left, investor detail panel on right
 * URL-persisted filters for search, fund, status, ib, has_withdrawals
 */

import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import {
  Search,
  Loader2,
  User,
  Users,
  ArrowDownToLine,
  Filter,
  X,
  RefreshCw,
} from "lucide-react";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { adminServiceV2, InvestorSummaryV2 } from "@/services/admin/adminService";
import AddInvestorDialog from "@/components/admin/investors/AddInvestorDialog";
import { InvestorDetailPanel } from "@/components/admin/investors/InvestorDetailPanel";
import { useAdminStats } from "@/hooks/useAdminStats";
import { cn } from "@/lib/utils";
import { assetService } from "@/services/shared/assetService";
import { Asset } from "@/types/investorTypes";
import {
  getActiveFundsForList,
  getActiveInvestorPositions,
} from "@/services/fundService";
import { useUrlFilters } from "@/hooks/useUrlFilters";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { useSortableColumns } from "@/hooks/useSortableColumns";
import { SortableTableHead } from "@/components/ui/sortable-table-head";

interface Fund {
  id: string;
  code: string;
  name: string;
  asset: string;
}

interface EnrichedInvestor extends InvestorSummaryV2 {
  fundsHeldCount: number;
  lastActivityDate: string | null;
  pendingWithdrawals: number;
  lastReportPeriod: string | null;
  ibParentName: string | null;
}

function UnifiedInvestorsContent() {
  const navigate = useNavigate();
  const { stats } = useAdminStats();
  const [investors, setInvestors] = useState<InvestorSummaryV2[]>([]);
  const [enrichedInvestors, setEnrichedInvestors] = useState<EnrichedInvestor[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [funds, setFunds] = useState<Fund[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvestorId, setSelectedInvestorId] = useState<string | null>(null);
  const [investorPositions, setInvestorPositions] = useState<Map<string, string[]>>(new Map());

  // URL-persisted filters
  const { filters, setFilter, hasActiveFilters, clearFilters } = useUrlFilters({
    keys: ["search", "fund", "status", "ib", "has_withdrawals"],
    defaults: { fund: "all", status: "all", ib: "all", has_withdrawals: "all" },
  });

  const searchTerm = filters.search || "";
  const fundFilter = filters.fund || "all";
  const statusFilter = filters.status || "all";
  const ibFilter = filters.ib || "all";
  const hasWithdrawalsFilter = filters.has_withdrawals || "all";

  const loadData = async () => {
    setLoading(true);
    try {
      const [investorsData, assetsData, fundsData, positionsData] = await Promise.all([
        adminServiceV2.getAllInvestorsWithSummary(),
        assetService.getAssets({ is_active: true }),
        getActiveFundsForList(),
        getActiveInvestorPositions(),
      ]);
      
      setInvestors(investorsData);
      setFunds(fundsData);

      // Build map of investor -> fund IDs
      const posMap = new Map<string, string[]>();
      positionsData.forEach((p) => {
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

      // Enrich investors with additional data
      await enrichInvestors(investorsData, posMap);
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  };

  const enrichInvestors = async (investorsData: InvestorSummaryV2[], posMap: Map<string, string[]>) => {
    try {
      const investorIds = investorsData.map(inv => inv.id);
      
      // Batch fetch pending withdrawals
      const { data: withdrawals } = await supabase
        .from("withdrawal_requests")
        .select("investor_id")
        .in("investor_id", investorIds)
        .eq("status", "pending");

      const withdrawalCounts = new Map<string, number>();
      (withdrawals || []).forEach(w => {
        withdrawalCounts.set(w.investor_id, (withdrawalCounts.get(w.investor_id) || 0) + 1);
      });

      // Fetch last_activity_at directly from profiles (now tracked via triggers)
      const { data: profilesWithActivity } = await supabase
        .from("profiles")
        .select("id, last_activity_at")
        .in("id", investorIds);

      const lastActivityDates = new Map<string, string>();
      (profilesWithActivity || []).forEach(p => {
        if (p.last_activity_at) {
          lastActivityDates.set(p.id, p.last_activity_at);
        }
      });

      // Batch fetch last reports
      const { data: reports } = await supabase
        .from("generated_statements")
        .select("investor_id, period_id, created_at")
        .in("investor_id", investorIds)
        .order("created_at", { ascending: false });

      const lastReports = new Map<string, string>();
      (reports || []).forEach(r => {
        if (!lastReports.has(r.investor_id)) {
          lastReports.set(r.investor_id, r.period_id);
        }
      });

      // Batch fetch IB parent info
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, ib_parent_id")
        .in("id", investorIds)
        .not("ib_parent_id", "is", null);

      const ibParentIds = [...new Set((profiles || []).map(p => p.ib_parent_id).filter(Boolean))];
      const ibParentNames = new Map<string, string>();
      
      if (ibParentIds.length > 0) {
        const { data: parents } = await supabase
          .from("profiles")
          .select("id, first_name, last_name")
          .in("id", ibParentIds);

        (parents || []).forEach(p => {
          const name = [p.first_name, p.last_name].filter(Boolean).join(" ");
          ibParentNames.set(p.id, name);
        });
      }

      const investorIbParents = new Map<string, string>();
      (profiles || []).forEach(p => {
        if (p.ib_parent_id && ibParentNames.has(p.ib_parent_id)) {
          investorIbParents.set(p.id, ibParentNames.get(p.ib_parent_id)!);
        }
      });

      // Build enriched list
      const enriched: EnrichedInvestor[] = investorsData.map(inv => ({
        ...inv,
        fundsHeldCount: posMap.get(inv.id)?.length || 0,
        lastActivityDate: lastActivityDates.get(inv.id) || null,
        pendingWithdrawals: withdrawalCounts.get(inv.id) || 0,
        lastReportPeriod: lastReports.get(inv.id) || null,
        ibParentName: investorIbParents.get(inv.id) || null,
      }));

      setEnrichedInvestors(enriched);
    } catch (error) {
      console.error("Failed to enrich investors:", error);
      // Fallback to basic data
      setEnrichedInvestors(investorsData.map(inv => ({
        ...inv,
        fundsHeldCount: posMap.get(inv.id)?.length || 0,
        lastActivityDate: null,
        pendingWithdrawals: 0,
        lastReportPeriod: null,
        ibParentName: null,
      })));
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectedInvestor = useMemo(() => {
    return enrichedInvestors.find(inv => inv.id === selectedInvestorId) || null;
  }, [enrichedInvestors, selectedInvestorId]);

  const filteredInvestors = useMemo(() => {
    return enrichedInvestors.filter((inv) => {
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
        const hasPositions = investorPositions.has(inv.id) && (investorPositions.get(inv.id)?.length || 0) > 0;
        if (statusFilter === "active" && !hasPositions) return false;
        if (statusFilter === "inactive" && hasPositions) return false;
      }

      // IB filter
      if (ibFilter !== "all") {
        const hasIb = !!inv.ibParentName;
        if (ibFilter === "has_ib" && !hasIb) return false;
        if (ibFilter === "no_ib" && hasIb) return false;
      }

      // Has withdrawals filter
      if (hasWithdrawalsFilter !== "all") {
        const hasPending = inv.pendingWithdrawals > 0;
        if (hasWithdrawalsFilter === "yes" && !hasPending) return false;
        if (hasWithdrawalsFilter === "no" && hasPending) return false;
      }

      return true;
    });
  }, [enrichedInvestors, searchTerm, fundFilter, statusFilter, ibFilter, hasWithdrawalsFilter, investorPositions]);

  // Sortable columns hook
  const { sortConfig, requestSort, sortedData } = useSortableColumns(filteredInvestors, {
    column: 'lastName',
    direction: 'asc',
  });

  const handleRowClick = (investor: EnrichedInvestor) => {
    setSelectedInvestorId(investor.id);
  };

  const handleClosePanel = () => {
    setSelectedInvestorId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-6 py-4 border-b bg-background">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Investors</h1>
          <p className="text-sm text-muted-foreground">
            {investors.length} total • {stats.uniqueInvestorsWithPositions} with positions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={loadData}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <AddInvestorDialog assets={assets} onInvestorAdded={loadData} />
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-3 border-b bg-muted/30 flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name or email..."
            value={searchTerm}
            onChange={(e) => setFilter("search", e.target.value || null)}
            className="pl-8 h-9"
          />
        </div>

        {/* Quick filter counts */}
        <div className="flex items-center gap-1">
          <Button
            variant={statusFilter === "active" ? "secondary" : "ghost"}
            size="sm"
            className="h-8 text-xs"
            onClick={() => setFilter("status", statusFilter === "active" ? "all" : "active")}
          >
            Active: {enrichedInvestors.filter(i => i.fundsHeldCount > 0).length}
          </Button>
          <Button
            variant={statusFilter === "inactive" ? "secondary" : "ghost"}
            size="sm"
            className="h-8 text-xs"
            onClick={() => setFilter("status", statusFilter === "inactive" ? "all" : "inactive")}
          >
            No positions: {enrichedInvestors.filter(i => i.fundsHeldCount === 0).length}
          </Button>
        </div>
        
        <Select value={fundFilter} onValueChange={(v) => setFilter("fund", v)}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder="Fund" />
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

        <Select value={ibFilter} onValueChange={(v) => setFilter("ib", v)}>
          <SelectTrigger className="w-[130px] h-9">
            <Users className="h-3.5 w-3.5 mr-1" />
            <SelectValue placeholder="IB" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="has_ib">Has IB</SelectItem>
            <SelectItem value="no_ib">No IB</SelectItem>
          </SelectContent>
        </Select>

        <Select value={hasWithdrawalsFilter} onValueChange={(v) => setFilter("has_withdrawals", v)}>
          <SelectTrigger className="w-[160px] h-9">
            <ArrowDownToLine className="h-3.5 w-3.5 mr-1" />
            <SelectValue placeholder="Withdrawals" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="yes">Pending Withdrawals</SelectItem>
            <SelectItem value="no">No Pending</SelectItem>
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9">
            <X className="h-3.5 w-3.5 mr-1" />
            Clear
          </Button>
        )}

        <span className="text-xs text-muted-foreground ml-auto">
          {filteredInvestors.length} of {investors.length}
        </span>
      </div>

      {/* 2-Panel Layout */}
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* Left Panel: Dense Table */}
        <ResizablePanel defaultSize={selectedInvestorId ? 55 : 100} minSize={40}>
          <div className="h-full overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <SortableTableHead
                    column="lastName"
                    currentSort={sortConfig}
                    onSort={requestSort}
                    className="w-[250px]"
                  >
                    Investor
                  </SortableTableHead>
                  <SortableTableHead
                    column="fundsHeldCount"
                    currentSort={sortConfig}
                    onSort={requestSort}
                    className="w-[80px] text-center"
                  >
                    Status
                  </SortableTableHead>
                  <SortableTableHead
                    column="fundsHeldCount"
                    currentSort={sortConfig}
                    onSort={requestSort}
                    className="w-[70px] text-center"
                  >
                    Funds
                  </SortableTableHead>
                  <SortableTableHead
                    column="lastActivityDate"
                    currentSort={sortConfig}
                    onSort={requestSort}
                    className="w-[100px]"
                  >
                    Last Activity
                  </SortableTableHead>
                  <SortableTableHead
                    column="pendingWithdrawals"
                    currentSort={sortConfig}
                    onSort={requestSort}
                    className="w-[90px] text-center"
                  >
                    Pending WD
                  </SortableTableHead>
                  <SortableTableHead
                    column="lastReportPeriod"
                    currentSort={sortConfig}
                    onSort={requestSort}
                    className="w-[100px]"
                  >
                    Last Report
                  </SortableTableHead>
                  <SortableTableHead
                    column="ibParentName"
                    currentSort={sortConfig}
                    onSort={requestSort}
                    className="w-[120px]"
                  >
                    IB Parent
                  </SortableTableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvestors.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      {searchTerm || hasActiveFilters ? "No investors match your filters" : "No investors found"}
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedData.map((investor) => (
                    <TableRow
                      key={investor.id}
                      className={cn(
                        "cursor-pointer hover:bg-muted/50",
                        selectedInvestorId === investor.id && "bg-primary/5 border-l-2 border-l-primary"
                      )}
                      onClick={() => handleRowClick(investor)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate">
                              {investor.firstName} {investor.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {investor.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge 
                          variant={investor.fundsHeldCount > 0 ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {investor.fundsHeldCount > 0 ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center font-mono text-sm">
                        {investor.fundsHeldCount}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {investor.lastActivityDate
                          ? format(new Date(investor.lastActivityDate), "MMM d, yy HH:mm")
                          : "—"}
                      </TableCell>
                      <TableCell className="text-center">
                        {investor.pendingWithdrawals > 0 ? (
                          <Badge variant="destructive" className="text-xs">
                            {investor.pendingWithdrawals}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground truncate max-w-[100px]">
                        {investor.lastReportPeriod || "—"}
                      </TableCell>
                      <TableCell>
                        {investor.ibParentName ? (
                          <Badge variant="outline" className="text-xs truncate max-w-[110px]">
                            <Users className="h-3 w-3 mr-1" />
                            {investor.ibParentName}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </ResizablePanel>

        {/* Right Panel: Investor Detail */}
        {selectedInvestorId && (
          <>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={45} minSize={30}>
              <div className="h-full border-l bg-background">
                <InvestorDetailPanel
                  investorId={selectedInvestorId}
                  investorSummary={selectedInvestor}
                  onClose={handleClosePanel}
                  onDataChange={loadData}
                />
              </div>
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
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
