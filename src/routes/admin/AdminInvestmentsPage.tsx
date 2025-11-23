import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Download } from "lucide-react";
import { InvestmentStats } from "@/components/admin/investments/InvestmentStats";
import { InvestmentsTable } from "@/components/admin/investments/InvestmentsTable";
import { CreateInvestmentDialog } from "@/components/admin/investments/CreateInvestmentDialog";
import { investmentService } from "@/services/investmentService";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Investment, InvestmentFilters } from "@/types/investment";
import { AdminGuard } from "@/components/admin/AdminGuard";

function AdminInvestmentsContent() {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [filteredInvestments, setFilteredInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [funds, setFunds] = useState<any[]>([]);
  const [filters, setFilters] = useState<InvestmentFilters>({});

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [investments, filters]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [investmentsData, fundsData] = await Promise.all([
        investmentService.getInvestments(),
        supabase.from("funds").select("id, name, code"),
      ]);

      setInvestments(investmentsData);
      setFilteredInvestments(investmentsData);
      if (fundsData.data) setFunds(fundsData.data);
    } catch (error: any) {
      console.error("Error loading data:", error);
      toast.error("Failed to load investments");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...investments];

    if (filters.status) {
      filtered = filtered.filter((i) => i.status === filters.status);
    }

    if (filters.fund_id) {
      filtered = filtered.filter((i) => i.fund_id === filters.fund_id);
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (i) =>
          i.investor_name?.toLowerCase().includes(searchLower) ||
          i.reference_number?.toLowerCase().includes(searchLower) ||
          i.investor_email?.toLowerCase().includes(searchLower)
      );
    }

    setFilteredInvestments(filtered);
  };

  const handleExport = () => {
    toast.info("Export functionality coming soon");
  };

  return (
    <div className="container max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Investment Management</h1>
          <p className="text-muted-foreground mt-1">
            Create, approve, and track all investment transactions
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Investment
          </Button>
        </div>
      </div>

      <InvestmentStats investments={investments} />

      <Card>
        <CardHeader>
          <CardTitle>All Investments</CardTitle>
          <CardDescription>Filter and manage investment transactions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by investor name, email, or reference..."
                className="pl-9"
                value={filters.search || ""}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
            </div>

            <Select
              value={filters.status || "all"}
              onValueChange={(value) =>
                setFilters({
                  ...filters,
                  status: value === "all" ? undefined : (value as any),
                })
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.fund_id || "all"}
              onValueChange={(value) =>
                setFilters({
                  ...filters,
                  fund_id: value === "all" ? undefined : value,
                })
              }
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Funds" />
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
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <InvestmentsTable investments={filteredInvestments} onRefresh={loadData} />
          )}
        </CardContent>
      </Card>

      <CreateInvestmentDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={loadData}
      />
    </div>
  );
}

export default function AdminInvestmentsPage() {
  return (
    <AdminGuard>
      <AdminInvestmentsContent />
    </AdminGuard>
  );
}
