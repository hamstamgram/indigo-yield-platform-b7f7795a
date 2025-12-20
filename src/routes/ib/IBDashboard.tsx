/**
 * IB Dashboard
 * Dashboard for Introducing Brokers to view their earnings and referrals
 */

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, DollarSign, Users, TrendingUp, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/utils/formatters";
import { useAuth } from "@/lib/auth/context";

interface Allocation {
  id: string;
  fundId: string;
  sourceInvestorId: string;
  sourceInvestorEmail?: string;
  periodStart: string;
  periodEnd: string;
  sourceNetIncome: number;
  ibPercentage: number;
  ibFeeAmount: number;
  source: string;
  createdAt: string;
}

interface MonthlyEarning {
  month: string;
  amount: number;
}

interface FundEarning {
  fundId: string;
  fundName: string;
  amount: number;
}

export default function IBDashboard() {
  const { user } = useAuth();
  const userId = user?.id;

  // Fetch IB allocations
  const { data: allocations, isLoading: allocationsLoading } = useQuery({
    queryKey: ["ib-allocations", userId],
    queryFn: async (): Promise<Allocation[]> => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from("ib_allocations")
        .select(`
          id,
          fund_id,
          source_investor_id,
          period_start,
          period_end,
          source_net_income,
          ib_percentage,
          ib_fee_amount,
          source,
          created_at
        `)
        .eq("ib_investor_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map((a) => ({
        id: a.id,
        fundId: a.fund_id || "",
        sourceInvestorId: a.source_investor_id,
        periodStart: a.period_start || "",
        periodEnd: a.period_end || "",
        sourceNetIncome: Number(a.source_net_income || 0),
        ibPercentage: Number(a.ib_percentage || 0),
        ibFeeAmount: Number(a.ib_fee_amount || 0),
        source: a.source || "unknown",
        createdAt: a.created_at || "",
      }));
    },
    enabled: !!userId,
  });

  // Fetch referrals
  const { data: referrals, isLoading: referralsLoading } = useQuery({
    queryKey: ["ib-referrals", userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, first_name, last_name, ib_percentage, created_at")
        .eq("ib_parent_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });

  // Fetch IB positions
  const { data: positions, isLoading: positionsLoading } = useQuery({
    queryKey: ["ib-positions", userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from("investor_positions")
        .select(`
          fund_id,
          current_value,
          cost_basis,
          funds:fund_id (name)
        `)
        .eq("investor_id", userId)
        .gt("current_value", 0);

      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });

  // Calculate totals and aggregations
  const totalEarnings = allocations?.reduce((sum, a) => sum + a.ibFeeAmount, 0) || 0;
  const totalReferrals = referrals?.length || 0;
  const totalPositionValue = positions?.reduce((sum, p) => sum + Number(p.current_value || 0), 0) || 0;

  // Monthly earnings
  const monthlyEarnings: MonthlyEarning[] = [];
  if (allocations) {
    const byMonth: Record<string, number> = {};
    allocations.forEach((a) => {
      if (a.periodEnd) {
        const month = a.periodEnd.substring(0, 7);
        byMonth[month] = (byMonth[month] || 0) + a.ibFeeAmount;
      }
    });
    Object.entries(byMonth)
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 12)
      .forEach(([month, amount]) => {
        monthlyEarnings.push({ month, amount });
      });
  }

  const isLoading = allocationsLoading || referralsLoading || positionsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">IB Dashboard</h1>
        <p className="text-muted-foreground">
          Track your referrals, earnings, and fund positions
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalEarnings)}</div>
            <p className="text-xs text-muted-foreground">Lifetime IB commissions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Referrals</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalReferrals}</div>
            <p className="text-xs text-muted-foreground">Investors you referred</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fund Position</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalPositionValue)}</div>
            <p className="text-xs text-muted-foreground">Current portfolio value</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(monthlyEarnings[0]?.amount || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {monthlyEarnings[0]?.month || "No earnings yet"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Referrals */}
        <Card>
          <CardHeader>
            <CardTitle>Your Referrals</CardTitle>
            <CardDescription>Investors you've referred to the platform</CardDescription>
          </CardHeader>
          <CardContent>
            {!referrals || referrals.length === 0 ? (
              <p className="text-center py-4 text-muted-foreground">No referrals yet</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Investor</TableHead>
                    <TableHead className="text-right">Commission %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {referrals.map((ref) => (
                    <TableRow key={ref.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {ref.first_name || ref.last_name
                              ? `${ref.first_name || ""} ${ref.last_name || ""}`.trim()
                              : ref.email}
                          </p>
                          <p className="text-xs text-muted-foreground">{ref.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline">{ref.ib_percentage || 0}%</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Monthly Earnings */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Earnings</CardTitle>
            <CardDescription>Your commission earnings by month</CardDescription>
          </CardHeader>
          <CardContent>
            {monthlyEarnings.length === 0 ? (
              <p className="text-center py-4 text-muted-foreground">No earnings yet</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Earnings</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthlyEarnings.map((me) => (
                    <TableRow key={me.month}>
                      <TableCell>{me.month}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(me.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Allocations */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Allocations</CardTitle>
          <CardDescription>Detailed breakdown of your IB commissions</CardDescription>
        </CardHeader>
        <CardContent>
          {!allocations || allocations.length === 0 ? (
            <p className="text-center py-4 text-muted-foreground">No allocations yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Base Net Income</TableHead>
                  <TableHead className="text-center">Rate</TableHead>
                  <TableHead className="text-right">Commission</TableHead>
                  <TableHead>Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allocations.slice(0, 20).map((alloc) => (
                  <TableRow key={alloc.id}>
                    <TableCell>
                      {alloc.periodStart && alloc.periodEnd
                        ? `${alloc.periodStart} - ${alloc.periodEnd}`
                        : alloc.createdAt?.split("T")[0]}
                    </TableCell>
                    <TableCell className="font-mono">
                      {formatCurrency(alloc.sourceNetIncome)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{alloc.ibPercentage}%</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold text-green-600">
                      +{formatCurrency(alloc.ibFeeAmount)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={alloc.source === "from_platform_fees" ? "secondary" : "outline"}>
                        {alloc.source === "from_platform_fees" ? "Platform Fees" : "Investor Yield"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Fund Positions */}
      {positions && positions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Your Fund Positions</CardTitle>
            <CardDescription>Your accumulated IB earnings invested in funds</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fund</TableHead>
                  <TableHead className="text-right">Current Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {positions.map((pos) => (
                  <TableRow key={pos.fund_id}>
                    <TableCell className="font-medium">
                      {(pos.funds as any)?.name || pos.fund_id}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(Number(pos.current_value || 0))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
