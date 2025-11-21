import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Eye, Search, Filter, Users, DollarSign, TrendingUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { expertInvestorService, UnifiedInvestorData } from "@/services/expertInvestorService";
import { formatAssetValue } from "@/utils/kpiCalculations";

const ExpertInvestorMasterView = () => {
  const navigate = useNavigate();
  const [filteredInvestors, setFilteredInvestors] = useState<UnifiedInvestorData[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("totalAum");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const { data: investors, isLoading } = useQuery({
    queryKey: ["all-investors"],
    queryFn: () => expertInvestorService.getAllInvestorsExpertSummary(),
    onError: (error) => {
      console.error("Error fetching investors:", error);
      toast.error("Failed to load investor data");
    },
  });

  useEffect(() => {
    if (investors) {
      filterAndSortInvestors(investors);
    }
  }, [investors, searchTerm, statusFilter, sortBy, sortDirection]);

  const filterAndSortInvestors = useCallback(
    (investorData: UnifiedInvestorData[]) => {
      let filtered = investorData;

      // Apply search filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter(
          (investor) =>
            investor.firstName.toLowerCase().includes(term) ||
            investor.lastName.toLowerCase().includes(term) ||
            investor.email.toLowerCase().includes(term)
        );
      }

      // Apply status filter
      if (statusFilter !== "all") {
        filtered = filtered.filter((investor) => investor.status === statusFilter);
      }

      // Apply sorting
      filtered.sort((a, b) => {
        let aValue: string | number | Date = a[sortBy as keyof UnifiedInvestorData] as
          | string
          | number
          | Date;
        let bValue: string | number | Date = b[sortBy as keyof UnifiedInvestorData] as
          | string
          | number
          | Date;

        if (typeof aValue === "string" && typeof bValue === "string") {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }

        if (sortDirection === "asc") {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      });

      setFilteredInvestors(filtered);
    },
    [searchTerm, statusFilter, sortBy, sortDirection]
  );

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortDirection("desc");
    }
  };

  const getTotalStats = () => {
    const assetTotals = new Map<string, { aum: number; earnings: number }>();
    let totalPositions = 0;

    filteredInvestors.forEach((inv) => {
      inv.aumByAsset.forEach((assetBreakdown) => {
        const existing = assetTotals.get(assetBreakdown.asset) || { aum: 0, earnings: 0 };
        existing.aum += assetBreakdown.aum;
        existing.earnings += assetBreakdown.earnings;
        assetTotals.set(assetBreakdown.asset, existing);
      });
      totalPositions += inv.positionCount;
    });

    return {
      assetBreakdowns: Array.from(assetTotals.entries())
        .map(([asset, totals]) => ({
          asset,
          ...totals,
        }))
        .sort((a, b) => b.aum - a.aum),
      totalPositions,
      investorCount: filteredInvestors.length,
    };
  };

  const stats = getTotalStats();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Expert Investor Management</h1>
        <p className="text-muted-foreground">
          Comprehensive view and management of all investor positions and performance
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Investors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.investorCount}</div>
            <p className="text-xs text-muted-foreground">Active investor accounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AUM by Asset</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {stats.assetBreakdowns.map((breakdown) => (
                <div key={breakdown.asset} className="flex justify-between items-center">
                  <Badge variant="outline" className="font-mono">
                    {breakdown.asset}
                  </Badge>
                  <span className="text-sm font-semibold">{formatAssetValue(breakdown.aum)}</span>
                </div>
              ))}
              {stats.assetBreakdowns.length === 0 && (
                <p className="text-xs text-muted-foreground">No positions</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Earnings by Asset</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {stats.assetBreakdowns.map((breakdown) => (
                <div key={breakdown.asset} className="flex justify-between items-center">
                  <Badge variant="outline" className="font-mono">
                    {breakdown.asset}
                  </Badge>
                  <span className="text-sm font-semibold text-green-600">
                    {formatAssetValue(breakdown.earnings)}
                  </span>
                </div>
              ))}
              {stats.assetBreakdowns.length === 0 && (
                <p className="text-xs text-muted-foreground">No earnings</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Positions</CardTitle>
            <Filter className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPositions}</div>
            <p className="text-xs text-muted-foreground">Active positions</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>All Investors</CardTitle>
          <CardDescription>Complete investor roster with position details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search investors..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="totalAum">Total AUM</SelectItem>
                <SelectItem value="totalEarnings">Total Earnings</SelectItem>
                <SelectItem value="positionCount">Positions</SelectItem>
                <SelectItem value="onboardingDate">Date Joined</SelectItem>
                <SelectItem value="lastName">Name</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort("lastName")}
                >
                  Investor
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort("totalAum")}
                >
                  Total AUM
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort("totalEarnings")}
                >
                  Total Earnings
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort("positionCount")}
                >
                  Positions
                </TableHead>
                <TableHead>Fee Rate</TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort("onboardingDate")}
                >
                  Joined
                </TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvestors.map((investor) => (
                <TableRow key={investor.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {investor.firstName} {investor.lastName}
                      </div>
                      <div className="text-sm text-muted-foreground">{investor.email}</div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <Badge variant={investor.status === "active" ? "default" : "secondary"}>
                      {investor.status}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <div className="space-y-1">
                      {investor.aumByAsset.map((breakdown) => (
                        <div key={breakdown.asset} className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono text-xs">
                            {breakdown.asset}
                          </Badge>
                          <span className="text-xs font-semibold">
                            {formatAssetValue(breakdown.aum)}
                          </span>
                        </div>
                      ))}
                      {investor.aumByAsset.length === 0 && (
                        <span className="text-xs text-muted-foreground">No positions</span>
                      )}
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="space-y-1">
                      {investor.aumByAsset.map((breakdown) => (
                        <div key={breakdown.asset} className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono text-xs">
                            {breakdown.asset}
                          </Badge>
                          <span className="text-xs font-semibold text-green-600">
                            {formatAssetValue(breakdown.earnings)}
                          </span>
                        </div>
                      ))}
                      {investor.aumByAsset.length === 0 && (
                        <span className="text-xs text-muted-foreground">No earnings</span>
                      )}
                    </div>
                  </TableCell>

                  <TableCell>
                    <span className="font-semibold">{investor.positionCount}</span>
                  </TableCell>

                  <TableCell>
                    <span className="font-mono text-sm">
                      {(investor.feePercentage * 100).toFixed(2)}%
                    </span>
                  </TableCell>

                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {new Date(investor.onboardingDate).toLocaleDateString()}
                    </span>
                  </TableCell>

                  <TableCell>
                    <Button
                      size="sm"
                      onClick={() => navigate(`/admin/expert-investor/${investor.id}`)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredInvestors.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No investors found matching your criteria</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ExpertInvestorMasterView;
