import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Wallet,
  DollarSign,
  Activity,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface Transaction {
  id: string;
  type: string;
  created_at: string;
  amount: number;
  status: string;
}

interface PerformanceDataPoint {
  name: string;
  value: number;
}

interface AllocationDataPoint {
  name: string;
  value: number;
  color: string;
}

export default function DashboardPage() {
  const { data: portfolioData } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No user");

      const { data, error } = await supabase
        .from("investor_positions")
        .select("*, funds!inner(*)")
        .eq("investor_id", user.id);

      if (error) throw error;

      const positions = data || [];
      const totalValue =
        positions.reduce((sum: number, pos: any) => sum + (pos.current_value || 0), 0) || 0;
      const totalGain =
        positions.reduce(
          (sum: number, pos: any) => sum + ((pos.current_value || 0) - (pos.cost_basis || 0)),
          0
        ) || 0;

      return {
        totalValue,
        totalGain,
        positions,
      };
    },
  });

  const { data: recentTransactions } = useQuery<Transaction[]>({
    queryKey: ["recent-transactions"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No user");

      // Use transactions_v2 to avoid recursive type issues
      const result = await supabase
        .from("transactions_v2")
        .select("id, type, asset, amount, total_value, created_at, notes")
        .eq("investor_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (result.error) throw result.error;

      // Transform to match Transaction interface
      return ((result.data || []) as any[]).map((tx: any) => ({
        id: tx.id,
        type: tx.type,
        asset_code: tx.asset,
        amount: tx.amount.toString(),
        value_usd: tx.total_value?.toString() || "0",
        status: "completed",
        created_at: tx.created_at,
        description: tx.notes,
      }));
    },
  });

  const { data: performanceData } = useQuery<PerformanceDataPoint[]>({
    queryKey: ["performance-history"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No user");

      const { data, error } = await supabase
        .from("portfolio_history")
        .select("date, usd_value")
        .eq("user_id", user.id)
        .order("date", { ascending: true })
        .limit(30);

      if (error) throw error;

      return (data || []).map((d: any) => ({
        name: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        value: d.usd_value,
      }));
    },
  });

  const totalReturn =
    portfolioData?.totalValue && portfolioData.totalValue > 0
      ? (
          (portfolioData.totalGain / (portfolioData.totalValue - portfolioData.totalGain)) *
          100
        ).toFixed(2)
      : "0.00";

  const colors = ["#3b82f6", "#8b5cf6", "#ec4899", "#10b981"];
  const allocationData: AllocationDataPoint[] =
    portfolioData?.positions.map((pos: any, idx: number) => ({
      name: pos.funds?.name || "Unknown",
      value: pos.current_value || 0,
      color: colors[idx % colors.length] || "#3b82f6",
    })) || [];

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-lg p-8 text-white">
        <h1 className="text-4xl font-bold mb-2">
          ${portfolioData?.totalValue.toLocaleString() || "0.00"}
        </h1>
        <p className="text-blue-100 mb-4">Total Portfolio Value</p>
        <div className="flex gap-6">
          <div>
            <p className="text-sm text-blue-100">Today&apos;s Change</p>
            {/* TODO: Implement real-time daily change */}
            <p className="text-2xl font-semibold flex items-center gap-1">
              <TrendingUp className="h-5 w-5" />
              --
            </p>
          </div>
          <div>
            <p className="text-sm text-blue-100">Total Return</p>
            <p className="text-2xl font-semibold">
              {Number(totalReturn) >= 0 ? "+" : ""}
              {totalReturn}%
            </p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${portfolioData?.totalValue.toLocaleString() || "0.00"}
            </div>
            <p className="text-xs text-muted-foreground">Across all funds</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Gain</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${portfolioData?.totalGain.toLocaleString() || "0.00"}
            </div>
            <p className="text-xs text-muted-foreground">+{totalReturn}% return</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Positions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{portfolioData?.positions.length || 0}</div>
            <p className="text-xs text-muted-foreground">Different funds</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Risk Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {/* TODO: Implement real risk score calculation */}
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">Moderate risk</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Performance</CardTitle>
            <CardDescription>Your portfolio performance over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Asset Allocation</CardTitle>
            <CardDescription>
              Distribution across different funds (click to view details)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={allocationData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(props: { name: string; percent: number }) =>
                      `${props.name} ${(props.percent * 100).toFixed(0)}%`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {allocationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>

              {/* Asset links */}
              <div className="grid grid-cols-2 gap-2">
                {portfolioData?.positions.map((pos: any, idx: number) => {
                  const assetSymbol =
                    pos.funds?.name?.toLowerCase().split(" ")[0] || "unknown";
                  return (
                    <Link
                      key={idx}
                      to={`/assets/${assetSymbol}`}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors"
                    >
                      <span className="font-medium">
                        {pos.funds?.name || "Unknown"}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        ${(pos.current_value || 0).toLocaleString()}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>Your latest account activity</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/transactions">View all</Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentTransactions?.map((txn: Transaction) => (
              <div key={txn.id} className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className={`p-2 rounded-full ${
                      txn.type === "DEPOSIT" ? "bg-green-100" : "bg-red-100"
                    }`}
                  >
                    {txn.type === "DEPOSIT" ? (
                      <ArrowDownRight className="h-4 w-4 text-green-600" />
                    ) : (
                      <ArrowUpRight className="h-4 w-4 text-red-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium capitalize">{txn.type}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(txn.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">${Number(txn.amount).toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground capitalize">{txn.status}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
