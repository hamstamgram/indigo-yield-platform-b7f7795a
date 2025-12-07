import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Calendar, Percent, TrendingUp, Edit2, Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatAssetValue } from "@/utils/kpiCalculations";

interface MonthlyReport {
  id: string;
  investor_id: string;
  report_month: string;
  asset_code: string;
  opening_balance: number | null;
  closing_balance: number | null;
  additions: number | null;
  withdrawals: number | null;
  yield_earned: number | null;
  entry_date?: string | null;
  exit_date?: string | null;
}

interface InvestorData {
  id: string;
  name: string;
  email: string;
  profile?: {
    first_name?: string | null;
    last_name?: string | null;
    fee_percentage?: number | null;
  } | null;
}

interface InvestorMonthlyTrackingProps {
  investorId: string;
}

const InvestorMonthlyTracking: React.FC<InvestorMonthlyTrackingProps> = ({ investorId }) => {
  const [investor, setInvestor] = useState<InvestorData | null>(null);
  const [monthlyReports, setMonthlyReports] = useState<MonthlyReport[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<string>("SOL");
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [editingReport, setEditingReport] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<MonthlyReport>>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const assets = ["BTC", "ETH", "SOL", "USDT", "EURC", "xAUT", "XRP"];

  const loadInvestorData = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("investors")
        .select(
          `
          id,
          name,
          email,
          profile:profiles (
            first_name,
            last_name,
            fee_percentage
          )
        `
        )
        .eq("id", investorId)
        .maybeSingle();

      if (!data) {
        console.error("Investor not found");
        return;
      }

      if (error) throw error;
      setInvestor(data);
    } catch (error) {
      console.error("Error loading investor data:", error);
      toast({
        title: "Error",
        description: "Failed to load investor data",
        variant: "destructive",
      });
    }
  }, [investorId, toast]);

  const loadMonthlyReports = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("investor_monthly_reports")
        .select("*")
        .eq("investor_id", investorId)
        .eq("asset_code", selectedAsset)
        .order("report_month", { ascending: false });

      if (error) throw error;
      setMonthlyReports(data || []);
    } catch (error) {
      console.error("Error loading monthly reports:", error);
      toast({
        title: "Error",
        description: "Failed to load monthly reports",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [investorId, selectedAsset, toast]);

  useEffect(() => {
    loadInvestorData();
    loadMonthlyReports();
  }, [investorId, selectedAsset, loadInvestorData, loadMonthlyReports]);

  const handleEdit = (report: MonthlyReport) => {
    setEditingReport(report.id);
    setEditData(report);
  };

  const handleSave = async () => {
    if (!editingReport || !editData) return;

    try {
      const { error } = await supabase
        .from("investor_monthly_reports")
        .update({
          opening_balance: editData.opening_balance,
          closing_balance: editData.closing_balance,
          additions: editData.additions,
          withdrawals: editData.withdrawals,
          yield_earned: editData.yield_earned,
          edited_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .eq("id", editingReport);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Monthly report updated successfully",
      });

      setEditingReport(null);
      setEditData({});
      loadMonthlyReports();
    } catch (error) {
      console.error("Error updating report:", error);
      toast({
        title: "Error",
        description: "Failed to update monthly report",
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    setEditingReport(null);
    setEditData({});
  };

  const addYieldToMonth = async () => {
    if (!selectedMonth) return;

    try {
      // Check if report already exists for this month
      const existingReport = monthlyReports.find((r) => r.report_month === selectedMonth + "-01");

      if (existingReport) {
        toast({
          title: "Report Exists",
          description:
            "A report for this month already exists. Use the edit function to modify it.",
          variant: "destructive",
        });
        return;
      }

      // Create new monthly report template
      const { error } = await supabase.from("investor_monthly_reports").insert({
        investor_id: investorId,
        report_month: selectedMonth + "-01",
        asset_code: selectedAsset,
        opening_balance: 0,
        closing_balance: 0,
        additions: 0,
        withdrawals: 0,
        yield_earned: 0,
        edited_by: (await supabase.auth.getUser()).data.user?.id,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Monthly report template created",
      });

      loadMonthlyReports();
    } catch (error) {
      console.error("Error creating monthly report:", error);
      toast({
        title: "Error",
        description: "Failed to create monthly report",
        variant: "destructive",
      });
    }
  };

  const updateFeePercentage = async (newFeePercentage: number) => {
    if (!investor?.id) return;

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ fee_percentage: newFeePercentage / 100 })
        .eq("id", investor.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Fee percentage updated successfully",
      });

      loadInvestorData();
    } catch (error) {
      console.error("Error updating fee percentage:", error);
      toast({
        title: "Error",
        description: "Failed to update fee percentage",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-muted rounded w-1/3"></div>
        <div className="h-64 bg-muted rounded"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Monthly Asset Tracking</h2>
        <p className="text-muted-foreground">
          Track {investor?.name}'s monthly performance by asset with individual yield management
        </p>
      </div>

      {/* Investor Fee Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Percent className="h-5 w-5" />
            Investor Fee Structure
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label>Current Fee Percentage</Label>
              <div className="text-2xl font-bold">
                {((investor?.profile?.fee_percentage || 0.02) * 100).toFixed(1)}%
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                step="0.1"
                min="0"
                max="100"
                placeholder="New fee %"
                className="w-24"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const value = parseFloat((e.target as HTMLInputElement).value);
                    if (!isNaN(value)) {
                      updateFeePercentage(value);
                      (e.target as HTMLInputElement).value = "";
                    }
                  }
                }}
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Asset Selection and Month Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Asset & Month Selection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label>Asset</Label>
              <Select value={selectedAsset} onValueChange={setSelectedAsset}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {assets.map((asset) => (
                    <SelectItem key={asset} value={asset}>
                      {asset}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label>Month</Label>
              <Input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              />
            </div>
            <Button onClick={addYieldToMonth}>Add Month Template</Button>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Reports Table */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Reports - {selectedAsset}</CardTitle>
          <CardDescription>
            Detailed month-by-month tracking with yield amounts in {selectedAsset} tokens
          </CardDescription>
        </CardHeader>
        <CardContent>
          {monthlyReports.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead>Opening Balance</TableHead>
                  <TableHead>Additions</TableHead>
                  <TableHead>Withdrawals</TableHead>
                  <TableHead>Yield Earned</TableHead>
                  <TableHead>Closing Balance</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthlyReports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell>
                      <Badge variant="outline">
                        {new Date(report.report_month).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                        })}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {editingReport === report.id ? (
                        <Input
                          type="number"
                          step="0.00000001"
                          value={editData.opening_balance || 0}
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              opening_balance: parseFloat(e.target.value) || 0,
                            })
                          }
                        />
                      ) : (
                        <span>{formatAssetValue(report.opening_balance || 0, selectedAsset)}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingReport === report.id ? (
                        <Input
                          type="number"
                          step="0.00000001"
                          value={editData.additions || 0}
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              additions: parseFloat(e.target.value) || 0,
                            })
                          }
                        />
                      ) : (
                        <span className="text-green-600">
                          +{formatAssetValue(report.additions || 0, selectedAsset)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingReport === report.id ? (
                        <Input
                          type="number"
                          step="0.00000001"
                          value={editData.withdrawals || 0}
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              withdrawals: parseFloat(e.target.value) || 0,
                            })
                          }
                        />
                      ) : (
                        <span className="text-red-600">
                          -{formatAssetValue(report.withdrawals || 0, selectedAsset)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingReport === report.id ? (
                        <Input
                          type="number"
                          step="0.00000001"
                          value={editData.yield_earned || 0}
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              yield_earned: parseFloat(e.target.value) || 0,
                            })
                          }
                        />
                      ) : (
                        <span className="text-blue-600 font-medium">
                          +{formatAssetValue(report.yield_earned || 0, selectedAsset)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingReport === report.id ? (
                        <Input
                          type="number"
                          step="0.00000001"
                          value={editData.closing_balance || 0}
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              closing_balance: parseFloat(e.target.value) || 0,
                            })
                          }
                        />
                      ) : (
                        <span className="font-medium">
                          {formatAssetValue(report.closing_balance || 0, selectedAsset)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingReport === report.id ? (
                        <div className="flex gap-2">
                          <Button size="sm" onClick={handleSave}>
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={handleCancel}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => handleEdit(report)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">No monthly reports for {selectedAsset}</p>
              <p className="text-sm text-muted-foreground">
                Create month templates to start tracking
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InvestorMonthlyTracking;
