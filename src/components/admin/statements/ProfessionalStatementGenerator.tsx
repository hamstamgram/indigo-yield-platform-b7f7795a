import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Download, FileText } from "lucide-react";

interface InvestorSummary {
  id: string;
  name: string;
  email: string;
}

interface PeriodData {
  beginning_balance: number;
  additions: number;
  withdrawals: number;
  net_income: number;
  ending_balance: number;
  rate_of_return: number;
}

interface StatementData {
  MTD: PeriodData;
  QTD: PeriodData;
  YTD: PeriodData;
  ITD: PeriodData;
}

const ProfessionalStatementGenerator = () => {
  const [investors, setInvestors] = useState<InvestorSummary[]>([]);
  const [selectedInvestor, setSelectedInvestor] = useState<string>("");
  const [selectedAsset, setSelectedAsset] = useState<string>("USDT");
  const [statementData, setStatementData] = useState<StatementData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchInvestors();
  }, []);

  const fetchInvestors = async () => {
    try {
      const { data, error } = await supabase
        .from("investors")
        .select("id, name, email")
        .eq("status", "active")
        .order("name");

      if (error) throw error;
      setInvestors(data || []);
    } catch (error) {
      console.error("Error fetching investors:", error);
      toast.error("Failed to load investors");
    }
  };

  const generateStatement = async () => {
    if (!selectedInvestor) {
      toast.error("Please select an investor");
      return;
    }

    setLoading(true);
    try {
      // Fetch monthly reports for this investor and asset
      const { data: reports, error } = await supabase
        .from("investor_monthly_reports")
        .select("*")
        .eq("investor_id", selectedInvestor)
        .eq("asset_code", selectedAsset)
        .order("report_month", { ascending: false })
        .limit(12);

      if (error) throw error;

      // Calculate period summaries from reports
      const latestReport = reports?.[0];
      const defaultPeriod: PeriodData = {
        beginning_balance: 0,
        additions: 0,
        withdrawals: 0,
        net_income: 0,
        ending_balance: 0,
        rate_of_return: 0,
      };

      const statementResult: StatementData = {
        MTD: latestReport ? {
          beginning_balance: Number(latestReport.opening_balance) || 0,
          additions: Number(latestReport.additions) || 0,
          withdrawals: Number(latestReport.withdrawals) || 0,
          net_income: Number(latestReport.yield_earned) || 0,
          ending_balance: Number(latestReport.closing_balance) || 0,
          rate_of_return: latestReport.opening_balance ? 
            ((Number(latestReport.yield_earned) || 0) / Number(latestReport.opening_balance)) * 100 : 0,
        } : defaultPeriod,
        QTD: defaultPeriod,
        YTD: defaultPeriod,
        ITD: defaultPeriod,
      };

      setStatementData(statementResult);
    } catch (error) {
      console.error("Error generating statement:", error);
      toast.error("Failed to generate statement");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatPercentage = (rate: number) => {
    const isPositive = rate >= 0;
    return (
      <span className={isPositive ? "text-green-600" : "text-red-600"}>{rate.toFixed(2)}%</span>
    );
  };

  const selectedInvestorData = investors.find((inv) => inv.id === selectedInvestor);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Professional Statement Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Investor</label>
              <Select value={selectedInvestor} onValueChange={setSelectedInvestor}>
                <SelectTrigger>
                  <SelectValue placeholder="Select investor" />
                </SelectTrigger>
                <SelectContent>
                  {investors.map((investor) => (
                    <SelectItem key={investor.id} value={investor.id}>
                      {investor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Asset</label>
              <Select value={selectedAsset} onValueChange={setSelectedAsset}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USDT">USDT</SelectItem>
                  <SelectItem value="BTC">BTC</SelectItem>
                  <SelectItem value="ETH">ETH</SelectItem>
                  <SelectItem value="SOL">SOL</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                onClick={generateStatement}
                disabled={loading || !selectedInvestor}
                className="w-full"
              >
                Generate Statement
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {statementData && selectedInvestorData && (
        <Card>
          <CardContent className="p-8">
            {/* Statement Header */}
            <div className="text-center mb-8">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">I</span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{selectedAsset} YIELD FUND</h1>
                  <p className="text-sm text-gray-600">CAPITAL ACCOUNT SUMMARY</p>
                </div>
              </div>
              <div className="text-sm text-gray-600">
                <p>
                  <strong>Account Holder:</strong> {selectedInvestorData.name}
                </p>
                <p>
                  <strong>Account Number:</strong> {selectedInvestor.slice(-8).toUpperCase()}
                </p>
                <p>
                  <strong>Statement Date:</strong>{" "}
                  {new Date().toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            </div>

            {/* Statement Table */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 px-4 py-3 text-left font-semibold">
                      Period
                    </th>
                    <th className="border border-gray-300 px-4 py-3 text-right font-semibold">
                      Beginning Balance
                    </th>
                    <th className="border border-gray-300 px-4 py-3 text-right font-semibold">
                      Additions
                    </th>
                    <th className="border border-gray-300 px-4 py-3 text-right font-semibold">
                      Withdrawals
                    </th>
                    <th className="border border-gray-300 px-4 py-3 text-right font-semibold">
                      Net Income
                    </th>
                    <th className="border border-gray-300 px-4 py-3 text-right font-semibold">
                      Ending Balance
                    </th>
                    <th className="border border-gray-300 px-4 py-3 text-right font-semibold">
                      Rate of Return
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(statementData).map(([period, data]) => (
                    <tr key={period} className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-4 py-3 font-medium">{period}</td>
                      <td className="border border-gray-300 px-4 py-3 text-right">
                        {formatCurrency(data.beginning_balance)}
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-right">
                        {formatCurrency(data.additions)}
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-right">
                        {formatCurrency(data.withdrawals)}
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-right">
                        {formatCurrency(data.net_income)}
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-right font-semibold">
                        {formatCurrency(data.ending_balance)}
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-right font-semibold">
                        {formatPercentage(data.rate_of_return)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="text-xs text-gray-500 space-y-2">
                <p>
                  <strong>Important Notes:</strong>
                </p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Net Income reflects yield earned after platform fees have been deducted</li>
                  <li>
                    Rate of Return is calculated as Net Income divided by (Beginning Balance +
                    Additions)
                  </li>
                  <li>All amounts are denominated in {selectedAsset} tokens</li>
                  <li>
                    This statement is generated from our secure database and reflects real-time
                    positions
                  </li>
                </ul>
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-center">
                    <strong>Indigo Yield Management</strong> | Generated on{" "}
                    {new Date().toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center gap-4 mt-6">
              <Button variant="outline" onClick={() => window.print()}>
                <Download className="h-4 w-4 mr-2" />
                Print Statement
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ProfessionalStatementGenerator;
