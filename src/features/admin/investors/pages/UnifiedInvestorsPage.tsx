/**
 * Unified Investors Page
 * 2-panel layout: dense table on left, investor detail panel on right
 * URL-persisted filters for search, fund, status, ib, has_withdrawals
 */

import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui";
import { Loader2, RefreshCw, Clock } from "lucide-react";
import { ExportButton } from "@/components/common";
import type { ExportColumn } from "@/lib/export/csv-export";
import { AdminGuard } from "@/features/admin/shared/AdminGuard";
import {
  AddInvestorDialog,
  InvestorDetailPanel,
  InvestorFiltersBar,
  UnifiedInvestorsTable,
} from "@/features/admin/investors/components";
import { useUrlFilters, useSortableColumns } from "@/hooks";
import { useAdminStats } from "@/features/admin/shared/hooks/useAdminStats";
import { useUnifiedInvestors } from "@/features/admin/investors/hooks/useInvestorHooks";
import { type EnrichedInvestor } from "@/features/admin/investors/hooks/useInvestorHooks";
interface RecentInvestor {
  id: string;
  name: string;
  email: string;
  viewedAt: string;
}

const investorExportColumns: ExportColumn[] = [
  { key: "firstName", label: "First Name" },
  { key: "lastName", label: "Last Name" },
  { key: "email", label: "Email" },
  { key: "id", label: "Investor ID" },
  { key: "fundsHeldCount", label: "Funds" },
  { key: "totalAum", label: "Total AUM" },
  { key: "lastActivityDate", label: "Last Activity" },
  { key: "pendingWithdrawals", label: "Pending WD" },
  { key: "ibParentName", label: "IB Parent" },
  { key: "createdAt", label: "Joined" },
];

function getRecentInvestors(): RecentInvestor[] {
  try {
    const stored = localStorage.getItem("indigo_recent_investors");
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function UnifiedInvestorsContent() {
  const { stats } = useAdminStats();
  const { data, isLoading: loading, refetch } = useUnifiedInvestors();
  const navigate = useNavigate();

  const [selectedInvestorId, setSelectedInvestorId] = useState<string | null>(null);
  const recentInvestors = useMemo(() => getRecentInvestors(), []);

  const investors = data?.investors || [];
  const enrichedInvestors = data?.enrichedInvestors || [];
  const assets = data?.assets || [];
  const funds = data?.funds || [];
  const investorPositions = data?.investorPositions || new Map<string, string[]>();

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

  const selectedInvestor = useMemo(() => {
    return enrichedInvestors.find((inv) => inv.id === selectedInvestorId) || null;
  }, [enrichedInvestors, selectedInvestorId]);

  const filteredInvestors = useMemo(() => {
    return enrichedInvestors.filter((inv) => {
      // Text search filter (name, email, or investor ID)
      const search = searchTerm.toLowerCase();
      const fullName = `${inv.firstName} ${inv.lastName}`.toLowerCase();
      const matchesSearch =
        fullName.includes(search) ||
        inv.email.toLowerCase().includes(search) ||
        inv.id.toLowerCase().includes(search);

      if (!matchesSearch) return false;

      // Fund filter
      if (fundFilter !== "all") {
        const investorFunds = investorPositions.get(inv.id) || [];
        if (!investorFunds.includes(fundFilter)) return false;
      }

      // Status filter (active = has positions, inactive = no positions)
      if (statusFilter !== "all") {
        const hasPositions =
          investorPositions.has(inv.id) && (investorPositions.get(inv.id)?.length || 0) > 0;
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
  }, [
    enrichedInvestors,
    searchTerm,
    fundFilter,
    statusFilter,
    ibFilter,
    hasWithdrawalsFilter,
    investorPositions,
  ]);

  // Sortable columns hook
  const { sortConfig, requestSort, sortedData } = useSortableColumns(filteredInvestors, {
    column: "lastName",
    direction: "asc",
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
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Investors</h1>
          <p className="text-sm text-muted-foreground">
            {investors.length} total • {stats.uniqueInvestorsWithPositions} with positions
          </p>
        </div>
        <div className="flex items-center gap-2">
          {recentInvestors.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1.5">
                  <Clock className="h-4 w-4" />
                  <span className="hidden sm:inline">Recent</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                {recentInvestors.slice(0, 5).map((recent) => (
                  <DropdownMenuItem
                    key={recent.id}
                    onClick={() => navigate(`/admin/investors/${recent.id}`)}
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">{recent.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{recent.email}</p>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <ExportButton
            data={filteredInvestors}
            columns={investorExportColumns}
            filename="investors"
            disabled={filteredInvestors.length === 0}
          />
          <Button variant="ghost" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <AddInvestorDialog assets={assets} onInvestorAdded={() => refetch()} />
        </div>
      </div>

      {/* Filters */}
      <InvestorFiltersBar
        searchTerm={searchTerm}
        fundFilter={fundFilter}
        statusFilter={statusFilter}
        ibFilter={ibFilter}
        hasWithdrawalsFilter={hasWithdrawalsFilter}
        enrichedInvestors={enrichedInvestors}
        funds={funds}
        totalCount={investors.length}
        filteredCount={filteredInvestors.length}
        hasActiveFilters={hasActiveFilters}
        onSearchChange={(v) => setFilter("search", v)}
        onFundChange={(v) => setFilter("fund", v)}
        onStatusChange={(v) => setFilter("status", v)}
        onIbChange={(v) => setFilter("ib", v)}
        onWithdrawalsChange={(v) => setFilter("has_withdrawals", v)}
        onClearFilters={clearFilters}
      />

      {/* 2-Panel Layout */}
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* Left Panel: Dense Table */}
        <ResizablePanel defaultSize={selectedInvestorId ? 55 : 100} minSize={40}>
          <div className="h-full overflow-auto">
            <UnifiedInvestorsTable
              investors={filteredInvestors}
              sortedData={sortedData}
              sortConfig={{
                column: sortConfig.column,
                direction: sortConfig.direction || "asc",
              }}
              selectedInvestorId={selectedInvestorId}
              hasFilters={!!searchTerm || hasActiveFilters}
              onSort={requestSort}
              onRowClick={handleRowClick}
            />
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
                  onDataChange={() => refetch()}
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
