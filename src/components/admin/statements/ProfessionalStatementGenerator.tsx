import { useState } from "react";
import {
  Card, CardContent, CardHeader, CardTitle,
  Button,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui";
import { toast } from "sonner";
import { Download, FileText } from "lucide-react";
import { useActiveInvestorsForStatements, useGenerateStatement } from "@/hooks/data";

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
  const [selectedInvestor, setSelectedInvestor] = useState<string>("");
  const [selectedAsset, setSelectedAsset] = useState<string>("USDT");
  const [statementData, setStatementData] = useState<StatementData | null>(null);

  const { data: investors = [], isLoading: investorsLoading } = useActiveInvestorsForStatements();

  const generateMutation = useGenerateStatement(() => {
    // Success callback if needed
  });

  const generateStatement = async () => {
    if (!selectedInvestor) {
      toast.error("Please select an investor");
      return;
    }

    const data = await generateMutation.mutateAsync({
      investorId: selectedInvestor,
      assetCode: selectedAsset,
    });

    if (data) {
      setStatementData(data);
    }
  };

  // Format in native tokens (no fiat currency - platform uses crypto tokens)
  const formatTokenAmount = (amount: number) => {
    // Determine decimals based on selected asset
    const decimals = selectedAsset === "BTC" ? 8 : selectedAsset === "ETH" ? 6 : 2;
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: decimals,
    }).format(amount) + ` ${selectedAsset}`;
  };

  const formatPercentage = (rate: number) => {
    const isPositive = rate >= 0;
    return (
      <span className={isPositive ? "text-green-600" : "text-red-600"}>{rate.toFixed(2)}%</span>
    );
  };

  const selectedInvestorData = investors.find((inv) => inv.id === selectedInvestor);

  if (investorsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading investors...</p>
      </div>
    );
  }

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
                disabled={generateMutation.isPending || !selectedInvestor}
                className="w-full"
              >
                {generateMutation.isPending ? "Generating..." : "Generate Statement"}
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
                        {formatTokenAmount(data.beginning_balance)}
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-right">
                        {formatTokenAmount(data.additions)}
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-right">
                        {formatTokenAmount(data.withdrawals)}
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-right">
                        {formatTokenAmount(data.net_income)}
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-right font-semibold">
                        {formatTokenAmount(data.ending_balance)}
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
