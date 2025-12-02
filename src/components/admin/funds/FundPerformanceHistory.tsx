import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { getFundAUMHistory, getAllFundsWithAUM } from "@/services/aumService";
import { Loader2, TrendingUp } from "lucide-react";
import { formatAssetValue } from "@/utils/kpiCalculations";

interface AUMHistoryPoint {
  aum_date: string;
  total_aum: number;
}

export function FundPerformanceHistory() {
  const [funds, setFunds] = useState<any[]>([]);
  const [selectedFund, setSelectedFund] = useState<string>("");
  const [history, setHistory] = useState<AUMHistoryPoint[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchFunds = async () => {
      const fundsData = await getAllFundsWithAUM();
      setFunds(fundsData);
      if (fundsData.length > 0) {
        setSelectedFund(fundsData[0].id);
      }
    };
    fetchFunds();
  }, []);

  useEffect(() => {
    if (!selectedFund) return;

    const fetchHistory = async () => {
      setLoading(true);
      try {
        // Fetch last 30 days or 12 months ideally. Defaulting to all history for now or last 90 days.
        // getFundAUMHistory parameters: fundId, startDate, endDate.
        // Let's fetch last 6 months.
        const endDate = new Date().toISOString().split("T")[0];
        const startDateObj = new Date();
        startDateObj.setMonth(startDateObj.getMonth() - 6);
        const startDate = startDateObj.toISOString().split("T")[0];

        const data = await getFundAUMHistory(selectedFund, startDate, endDate);
        // Sort by date ascending for the chart
        const sorted = [...data].sort(
          (a, b) => new Date(a.aum_date).getTime() - new Date(b.aum_date).getTime()
        );
        setHistory(sorted);
      } catch (error) {
        console.error("Failed to fetch history", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [selectedFund]);

  const selectedFundData = funds.find((f) => f.id === selectedFund);

  return (
    <Card className="col-span-2">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-1">
          <CardTitle className="text-base font-normal">Fund Performance (AUM)</CardTitle>
          <CardDescription>Month by month AUM tracking</CardDescription>
        </div>
        <div className="w-[200px]">
          <Select value={selectedFund} onValueChange={setSelectedFund}>
            <SelectTrigger>
              <SelectValue placeholder="Select Fund" />
            </SelectTrigger>
            <SelectContent>
              {funds.map((fund) => (
                <SelectItem key={fund.id} value={fund.id}>
                  {fund.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-[300px] flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : history.length > 0 ? (
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="aum_date"
                  tickFormatter={(value) =>
                    new Date(value).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })
                  }
                  className="text-xs text-muted-foreground"
                />
                <YAxis
                  className="text-xs text-muted-foreground"
                  tickFormatter={(value) => formatAssetValue(value, selectedFundData?.asset || "")}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--background)",
                    borderColor: "var(--border)",
                  }}
                  labelStyle={{ color: "var(--foreground)" }}
                  formatter={(value: number) => [
                    formatAssetValue(value, selectedFundData?.asset || "") +
                      " " +
                      (selectedFundData?.asset || ""),
                    "AUM",
                  ]}
                  labelFormatter={(label) => new Date(label).toLocaleDateString()}
                />
                <Line
                  type="monotone"
                  dataKey="total_aum"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No history data available for this period
          </div>
        )}
      </CardContent>
    </Card>
  );
}
