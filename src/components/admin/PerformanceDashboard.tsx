import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingDown, TrendingUp, DollarSign } from "lucide-react";
import { useFinancialMetrics } from "@/hooks/data/useDashboardMetrics";

interface MetricCardProps {
  title: string;
  value: number | string;
  trend?: "up" | "down";
  icon?: React.ReactNode;
  subtext?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, trend, icon, subtext }) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground flex items-center pt-1">
          {trend === "up" && <TrendingUp className="mr-1 h-4 w-4 text-green-500" />}
          {trend === "down" && <TrendingDown className="mr-1 h-4 w-4 text-red-500" />}
          {subtext}
        </p>
      </CardContent>
    </Card>
  );
};

export const PerformanceDashboard: React.FC = () => {
  const { data: metrics, isLoading } = useFinancialMetrics();

  if (isLoading) {
    return <div>Loading Financial Dashboard...</div>;
  }

  if (!metrics) {
    return <div>No data available. Please run the backfill script.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Financial Dashboard</h1>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total AUM"
          value={`$${metrics.totalAum.toLocaleString()}`}
          icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
          subtext="Current Assets Under Management"
        />
        <MetricCard
          title="Net Flows"
          value={`$${metrics.netFlow.toLocaleString()}`}
          trend={metrics.netFlow >= 0 ? "up" : "down"}
          subtext="All time"
        />
        <MetricCard
          title="Total Deposits"
          value={`$${metrics.totalDeposits.toLocaleString()}`}
          icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
        />
        <MetricCard
          title="Total Withdrawals"
          value={`$${metrics.totalWithdrawals.toLocaleString()}`}
          icon={<TrendingDown className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>AUM Over Time</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={metrics.history}>
                <XAxis
                  dataKey="date"
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <YAxis
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `$${value.toLocaleString()}`}
                />
                <Tooltip
                  formatter={(value: number) => [`$${value.toLocaleString()}`, "AUM"]}
                  labelFormatter={(label) => new Date(label).toLocaleDateString()}
                />
                <Area
                  type="monotone"
                  dataKey="aum"
                  stroke="#adfa1d"
                  fill="#adfa1d"
                  fillOpacity={0.2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
