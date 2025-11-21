import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { MonthlyFeeSummary } from "@/types/fee";

interface MonthlyFeeSummaryChartProps {
  summaries: MonthlyFeeSummary[];
}

export function MonthlyFeeSummaryChart({ summaries }: MonthlyFeeSummaryChartProps) {
  const chartData = summaries
    .slice(0, 6)
    .reverse()
    .map((summary) => ({
      month: new Date(summary.summary_month).toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
      }),
      gross: Number(summary.total_gross_yield),
      fees: Number(summary.total_fees_collected),
      net: Number(summary.total_net_yield),
    }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fee Collection Trends</CardTitle>
        <CardDescription>Monthly gross yield, fees, and net yield (last 6 months)</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
            <Legend />
            <Bar dataKey="gross" fill="hsl(var(--primary))" name="Gross Yield" />
            <Bar dataKey="fees" fill="hsl(var(--destructive))" name="Fees Collected" />
            <Bar dataKey="net" fill="hsl(var(--chart-2))" name="Net Yield" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
