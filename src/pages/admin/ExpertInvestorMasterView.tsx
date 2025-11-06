import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
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
  const [investors, setInvestors] = useState<UnifiedInvestorData[]>([]);
  const [filteredInvestors, setFilteredInvestors] = useState<UnifiedInvestorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("totalAum");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    fetchInvestors();
  }, []);

  useEffect(() => {
    filterAndSortInvestors();
  }, [investors, searchTerm, statusFilter, sortBy, sortDirection]);

  const fetchInvestors = async () => {
    try {
      setLoading(true);
      const data = await expertInvestorService.getAllInvestorsExpertSummary();
      setInvestors(data);
    } catch (error) {
      console.error("Error fetching investors:", error);
      toast.error("Failed to load investor data");
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortInvestors = useCallback(() => {
    let filtered = investors;

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
  }, [investors, searchTerm, statusFilter, sortBy, sortDirection]);

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortDirection("desc");
    }
  };

  /**
   * TODO: Update expertInvestorService to return per-asset data
   * Currently aggregates different assets (BTC + ETH + SOL) which violates native currency requirement
   * Service should return: aumByAsset: Array<{symbol, amount}>, earningsByAsset: Array<{symbol, amount}>
   */
  const getTotalStats = () => {
    const totalAum = filteredInvestors.reduce((sum, inv) => sum + inv.totalAum, 0);
    const totalEarnings = filteredInvestors.reduce((sum, inv) => sum + inv.totalEarnings, 0);
    const totalPositions = filteredInvestors.reduce((sum, inv) => sum + inv.positionCount, 0);

    return {
      totalAum,
      totalEarnings,
      totalPositions,
      investorCount: filteredInvestors.length,
    };
  };

  const stats = getTotalStats();

  if (loading) {
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
            <CardTitle className="text-sm font-medium">Total AUM</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatAssetValue(stats.totalAum)}</div>
            <p className="text-xs text-muted-foreground">⚠️ Per-asset breakdown needed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatAssetValue(stats.totalEarnings)}
            </div>
            <p className="text-xs text-muted-foreground">⚠️ Per-asset breakdown needed</p>
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
                    <div>
                      <span className="font-mono font-semibold">
                        {formatAssetValue(investor.totalAum)}
                      </span>
                      <div className="text-xs text-muted-foreground">Per-asset view needed</div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div>
                      <span className="font-mono text-green-600">
                        {formatAssetValue(investor.totalEarnings)}
                      </span>
                      <div className="text-xs text-muted-foreground">Per-asset view needed</div>
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
