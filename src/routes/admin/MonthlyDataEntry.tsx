import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CryptoIcon } from "@/components/CryptoIcons";
import { ChevronDown, ChevronUp, ArrowUpDown, Users, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

interface Fund {
  id: string;
  code: string;
  name: string;
  asset: string;
  total_aum: number;
  investor_count: number;
}

interface InvestorPosition {
  investor_id: string;
  investor_name: string;
  investor_email: string;
  current_value: number;
  ownership_pct: number;
  mtd_yield: number;
}

type SortField = "investor_name" | "current_value" | "ownership_pct" | "mtd_yield";
type SortDirection = "asc" | "desc";

export default function MonthlyDataEntry() {
  const [funds, setFunds] = useState<Fund[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFundId, setSelectedFundId] = useState<string | null>(null);
  const [investors, setInvestors] = useState<InvestorPosition[]>([]);
  const [loadingInvestors, setLoadingInvestors] = useState(false);
  const [sortField, setSortField] = useState<SortField>("current_value");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  useEffect(() => {
    loadFunds();
  }, []);

  useEffect(() => {
    if (selectedFundId) {
      loadInvestorComposition(selectedFundId);
    }
  }, [selectedFundId]);

  const loadFunds = async () => {
    setLoading(true);
    try {
      // Get all funds
      const { data: fundsData, error: fundsError } = await supabase
        .from("funds")
        .select("id, code, name, asset")
        .eq("status", "active")
        .order("code");

      if (fundsError) throw fundsError;

      // Get AUM and investor count for each fund from investor_positions
      const fundsWithAUM = await Promise.all(
        (fundsData || []).map(async (fund) => {
          const { data: positions } = await supabase
            .from("investor_positions")
            .select("current_value, investor_id")
            .eq("fund_id", fund.id);

          const total_aum = positions?.reduce((sum, p) => sum + (p.current_value || 0), 0) || 0;
          const uniqueInvestors = new Set(positions?.map((p) => p.investor_id) || []);

          return {
            ...fund,
            total_aum,
            investor_count: uniqueInvestors.size,
          };
        })
      );

      // Sort by AUM descending
      fundsWithAUM.sort((a, b) => b.total_aum - a.total_aum);
      setFunds(fundsWithAUM);
    } catch (error) {
      console.error("Error loading funds:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadInvestorComposition = async (fundId: string) => {
    setLoadingInvestors(true);
    try {
      // Get all positions for this fund with investor details
      const { data: positions, error } = await supabase
        .from("investor_positions")
        .select(`
          investor_id,
          current_value,
          fund_id
        `)
        .eq("fund_id", fundId);

      if (error) throw error;

      // Calculate total AUM for ownership percentage
      const totalAUM = positions?.reduce((sum, p) => sum + (p.current_value || 0), 0) || 0;

      // Get investor details
      const investorIds = [...new Set(positions?.map((p) => p.investor_id).filter(Boolean))];
      
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email")
        .in("id", investorIds);

      const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

      // Build investor positions list
      const investorPositions: InvestorPosition[] = (positions || [])
        .filter((p) => p.investor_id)
        .map((p) => {
          const profile = profileMap.get(p.investor_id);
          const name = profile
            ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || profile.email
            : "Unknown";

          return {
            investor_id: p.investor_id!,
            investor_name: name,
            investor_email: profile?.email || "",
            current_value: p.current_value || 0,
            ownership_pct: totalAUM > 0 ? ((p.current_value || 0) / totalAUM) * 100 : 0,
            mtd_yield: 0, // Would need to calculate from transactions
          };
        });

      setInvestors(investorPositions);
    } catch (error) {
      console.error("Error loading investor composition:", error);
    } finally {
      setLoadingInvestors(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const sortedInvestors = [...investors].sort((a, b) => {
    const multiplier = sortDirection === "asc" ? 1 : -1;
    if (sortField === "investor_name") {
      return multiplier * a.investor_name.localeCompare(b.investor_name);
    }
    return multiplier * ((a[sortField] || 0) - (b[sortField] || 0));
  });

  const formatValue = (value: number, asset: string) => {
    if (asset === "BTC") {
      return value.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
    } else if (asset === "ETH" || asset === "SOL") {
      return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
    }
    return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const selectedFund = funds.find((f) => f.id === selectedFundId);

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 px-2 hover:bg-muted"
      onClick={() => handleSort(field)}
    >
      {children}
      <ArrowUpDown className={cn("ml-1 h-3 w-3", sortField === field && "text-primary")} />
    </Button>
  );

  if (loading) {
    return (
      <div className="container max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold">Monthly Data Entry</h1>
        <p className="text-muted-foreground mt-2">
          Click on a fund card to view investor composition and manage AUM data.
        </p>
      </div>

      {/* Fund Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
        {funds.map((fund) => (
          <Card
            key={fund.id}
            className={cn(
              "cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary/50",
              selectedFundId === fund.id && "border-primary ring-2 ring-primary/20"
            )}
            onClick={() => setSelectedFundId(selectedFundId === fund.id ? null : fund.id)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CryptoIcon symbol={fund.asset} className="h-8 w-8" />
                  <div>
                    <CardTitle className="text-lg">{fund.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{fund.code}</p>
                  </div>
                </div>
                {selectedFundId === fund.id ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold">
                    {formatValue(fund.total_aum, fund.asset)} {fund.asset}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{fund.investor_count} investors</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Investor Composition Table */}
      {selectedFundId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {selectedFund && <CryptoIcon symbol={selectedFund.asset} className="h-6 w-6" />}
              Investor Composition - {selectedFund?.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingInvestors ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : investors.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No investors in this fund.
              </p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <SortButton field="investor_name">Investor</SortButton>
                      </TableHead>
                      <TableHead className="hidden md:table-cell">Email</TableHead>
                      <TableHead className="text-right">
                        <SortButton field="current_value">
                          Balance ({selectedFund?.asset})
                        </SortButton>
                      </TableHead>
                      <TableHead className="text-right">
                        <SortButton field="ownership_pct">Ownership %</SortButton>
                      </TableHead>
                      <TableHead className="text-right">
                        <SortButton field="mtd_yield">MTD Yield</SortButton>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedInvestors.map((investor) => (
                      <TableRow key={investor.investor_id}>
                        <TableCell className="font-medium">{investor.investor_name}</TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">
                          {investor.investor_email}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatValue(investor.current_value, selectedFund?.asset || "")}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {investor.ownership_pct.toFixed(2)}%
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatValue(investor.mtd_yield, selectedFund?.asset || "")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
