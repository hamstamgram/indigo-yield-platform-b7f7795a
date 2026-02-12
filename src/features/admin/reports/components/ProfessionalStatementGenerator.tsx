import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import { toast } from "sonner";
import { Download, FileText } from "lucide-react";
import { CryptoIcon } from "@/components/CryptoIcons";
import { useActiveInvestorsForStatements } from "@/hooks/data";
import { useGenerateStatement } from "@/features/admin/reports/hooks/useAdminStatementsPage";
import { format, subMonths } from "date-fns";

interface PositionData {
  asset_code: string;
  opening_balance: number;
  additions: number;
  withdrawals: number;
  yield_earned: number;
  closing_balance: number;
}

interface GeneratedData {
  statementData: {
    investor: { name: string; id: string };
    period: { month: number; year: number; start_date: string; end_date: string };
    summary: { total_aum: number; total_pnl: number; total_fees: number };
    positions: PositionData[];
  };
}

const ProfessionalStatementGenerator = () => {
  const [selectedInvestor, setSelectedInvestor] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const lastMonth = subMonths(new Date(), 1);
    return format(lastMonth, "yyyy-MM");
  });
  const [generatedData, setGeneratedData] = useState<GeneratedData | null>(null);

  const { data: investors = [], isLoading: investorsLoading } = useActiveInvestorsForStatements();

  const generateMutation = useGenerateStatement();

  const generateStatement = async () => {
    if (!selectedInvestor) {
      toast.error("Please select an investor");
      return;
    }

    const [yearStr, monthStr] = selectedMonth.split("-");
    const data = await generateMutation.mutateAsync({
      investorId: selectedInvestor,
      year: parseInt(yearStr),
      month: parseInt(monthStr),
    });

    if (data) {
      setGeneratedData(data as GeneratedData);
    }
  };

  const formatTokenAmount = (amount: number, asset: string) => {
    const decimals = asset === "BTC" ? 8 : asset === "ETH" ? 6 : 2;
    return (
      new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: decimals,
      }).format(amount) + ` ${asset}`
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

  const positions = generatedData?.statementData?.positions || [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            PDF Statement Generator
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
              <label className="text-sm font-medium mb-2 block">Month</label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => {
                    const date = subMonths(new Date(), i);
                    const val = format(date, "yyyy-MM");
                    return (
                      <SelectItem key={val} value={val}>
                        {format(date, "MMMM yyyy")}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                onClick={generateStatement}
                disabled={generateMutation.isPending || !selectedInvestor}
                className="w-full"
              >
                {generateMutation.isPending ? "Generating..." : "Generate PDF"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {generatedData && selectedInvestorData && (
        <Card>
          <CardContent className="p-8">
            {/* Statement Header */}
            <div className="text-center mb-8">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">I</span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-foreground">
                    {selectedInvestorData.name} - Monthly Report
                  </h1>
                  <p className="text-sm text-muted-foreground">CAPITAL ACCOUNT SUMMARY</p>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
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

            {/* Positions Table */}
            {positions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-white/10">
                  <thead>
                    <tr className="bg-white/5">
                      <th className="border border-white/10 px-4 py-3 text-left font-semibold">
                        Asset
                      </th>
                      <th className="border border-white/10 px-4 py-3 text-right font-semibold">
                        Opening
                      </th>
                      <th className="border border-white/10 px-4 py-3 text-right font-semibold">
                        Additions
                      </th>
                      <th className="border border-white/10 px-4 py-3 text-right font-semibold">
                        Withdrawals
                      </th>
                      <th className="border border-white/10 px-4 py-3 text-right font-semibold">
                        Yield
                      </th>
                      <th className="border border-white/10 px-4 py-3 text-right font-semibold">
                        Closing
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {positions.map((pos) => (
                      <tr key={pos.asset_code} className="hover:bg-white/10">
                        <td className="border border-white/10 px-4 py-3 font-medium">
                          <span className="flex items-center gap-2">
                            <CryptoIcon symbol={pos.asset_code} className="h-5 w-5" />
                            {pos.asset_code}
                          </span>
                        </td>
                        <td className="border border-white/10 px-4 py-3 text-right">
                          {formatTokenAmount(pos.opening_balance || 0, pos.asset_code)}
                        </td>
                        <td className="border border-white/10 px-4 py-3 text-right">
                          {formatTokenAmount(pos.additions || 0, pos.asset_code)}
                        </td>
                        <td className="border border-white/10 px-4 py-3 text-right">
                          {formatTokenAmount(pos.withdrawals || 0, pos.asset_code)}
                        </td>
                        <td className="border border-white/10 px-4 py-3 text-right">
                          {formatTokenAmount(pos.yield_earned || 0, pos.asset_code)}
                        </td>
                        <td className="border border-white/10 px-4 py-3 text-right font-semibold">
                          {formatTokenAmount(pos.closing_balance || 0, pos.asset_code)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No position data available for this period
              </div>
            )}

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-white/10">
              <div className="text-xs text-muted-foreground space-y-2">
                <p>
                  <strong>Important Notes:</strong>
                </p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Net Income reflects yield earned after platform fees have been deducted</li>
                  <li>All amounts are denominated in their respective token units</li>
                  <li>
                    This statement is generated from our secure database and reflects real-time
                    positions
                  </li>
                </ul>
                <div className="mt-4 pt-4 border-t border-white/5">
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
