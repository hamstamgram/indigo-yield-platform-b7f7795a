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
  first_name?: string | null;
  last_name?: string | null;
  fee_percentage?: number | null;
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
      // Fetch from profiles (Unified ID)
      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email, fee_percentage")
        .eq("id", investorId)
        .maybeSingle();

      if (!data) {
        console.error("Investor profile not found");
        return;
      }

      if (error) throw error;
      setInvestor({
        id: data.id,
        name: `${data.first_name || ""} ${data.last_name || ""}`.trim() || data.email,
        email: data.email,
        first_name: data.first_name,
        last_name: data.last_name,
        fee_percentage: data.fee_percentage,
      });
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
        .from("investor_fund_performance")
        .select(`
          *,
          period:statement_periods (
            period_end_date, year, month
          )
        `)
        .eq("investor_id", investorId)
        .eq("fund_name", selectedAsset)
        .order("period(period_end_date)", { ascending: false });

      if (error) throw error;

      // Transform V2 data to local state shape
        const reports = (data || []).map((r: any) => ({
          id: r.id,
          investor_id: r.investor_id,
          report_month: r.period?.period_end_date, // Use end date as report month identifier
          asset_code: r.fund_name,
          opening_balance: Number(r.mtd_beginning_balance || 0),
          closing_balance: Number(r.mtd_ending_balance || 0),
          additions: Number(r.mtd_additions || 0),
          withdrawals: Number(r.mtd_redemptions || 0),
          yield_earned: Number(r.mtd_net_income || 0),
        }));

      setMonthlyReports(reports);
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
        .from("investor_fund_performance")
        .update({
          mtd_beginning_balance: editData.opening_balance,
          mtd_ending_balance: editData.closing_balance,
          mtd_additions: editData.additions,
          mtd_redemptions: editData.withdrawals,
          mtd_net_income: editData.yield_earned,
          // edited_by not in schema currently, skipping
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
      // 1. Get/Create Period ID
      const [year, month] = selectedMonth.split("-").map(Number);
      const { data: { user } } = await supabase.auth.getUser();
      
      let periodId;
      const { data: period } = await supabase
        .from("statement_periods")
        .select("id")
        .eq("year", year)
        .eq("month", month)
        .maybeSingle();
        
      if (period) {
        periodId = period.id;
      } else {
        const date = new Date(year, month - 1);
        const endDate = new Date(year, month, 0).toISOString().split('T')[0];
        const { data: newPeriod, error: createError } = await supabase
          .from("statement_periods")
          .insert({
            year,
            month,
            period_name: date.toLocaleString('default', { month: 'long', year: 'numeric' }),
            period_end_date: endDate,
            created_by: user?.id,
            status: 'FINALIZED'
          })
          .select("id")
          .single();
        if (createError) throw createError;
        periodId = newPeriod.id;
      }

      // 2. Check if report exists (V2)
      const existingReport = monthlyReports.find((r) => {
        // Compare using period end date logic or just rely on API reload check
        // Using API reload is safer but here we check local state which might have period date string
        return r.report_month?.startsWith(selectedMonth);
      });

      if (existingReport) {
        toast({
          title: "Report Exists",
          description: "A report for this month already exists.",
          variant: "destructive",
        });
        return;
      }

      // 3. Create V2 Record
      const { error } = await supabase.from("investor_fund_performance").insert({
        investor_id: investorId,
        period_id: periodId,
        fund_name: selectedAsset,
        mtd_beginning_balance: 0,
        mtd_ending_balance: 0,
        mtd_additions: 0,
        mtd_redemptions: 0,
        mtd_net_income: 0,
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
        .from("profiles") // Update profiles table
        .update({ fee_percentage: newFeePercentage / 100 }) // Normalize to decimal
        .eq("id", investor.id); // Use profile id

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
                {((investor?.fee_percentage || 0.02) * 100).toFixed(1)}%
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
