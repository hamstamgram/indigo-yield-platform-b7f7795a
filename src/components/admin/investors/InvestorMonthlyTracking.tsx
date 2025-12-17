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
import { Calendar, Percent, TrendingUp, Edit2, Save, X, Plus, History } from "lucide-react";
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

interface FeeScheduleEntry {
  id: string;
  investor_id: string;
  fund_id: string | null;
  fee_pct: number;
  effective_date: string;
  created_at: string;
  fund?: { name: string } | null;
}

interface InvestorData {
  id: string;
  name: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  fee_percentage?: number | null;
}

interface Fund {
  id: string;
  name: string;
}

interface InvestorMonthlyTrackingProps {
  investorId: string;
}

const InvestorMonthlyTracking: React.FC<InvestorMonthlyTrackingProps> = ({ investorId }) => {
  const [investor, setInvestor] = useState<InvestorData | null>(null);
  const [monthlyReports, setMonthlyReports] = useState<MonthlyReport[]>([]);
  const [feeSchedule, setFeeSchedule] = useState<FeeScheduleEntry[]>([]);
  const [funds, setFunds] = useState<Fund[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<string>("SOL");
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [editingReport, setEditingReport] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<MonthlyReport>>({});
  const [loading, setLoading] = useState(true);
  
  // New fee form state
  const [newFeeFundId, setNewFeeFundId] = useState<string>("all");
  const [newFeePercent, setNewFeePercent] = useState<string>("");
  const [newFeeEffectiveDate, setNewFeeEffectiveDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isAddingFee, setIsAddingFee] = useState(false);
  
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

  const loadFeeSchedule = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("investor_fee_schedule")
        .select("*, fund:funds(name)")
        .eq("investor_id", investorId)
        .order("effective_date", { ascending: false });

      if (error) throw error;
      setFeeSchedule((data || []) as FeeScheduleEntry[]);
    } catch (error) {
      console.error("Error loading fee schedule:", error);
    }
  }, [investorId]);

  const loadFunds = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("funds")
        .select("id, name")
        .order("name");

      if (error) throw error;
      setFunds(data || []);
    } catch (error) {
      console.error("Error loading funds:", error);
    }
  }, []);

  useEffect(() => {
    loadInvestorData();
    loadMonthlyReports();
    loadFeeSchedule();
    loadFunds();
  }, [investorId, selectedAsset, loadInvestorData, loadMonthlyReports, loadFeeSchedule, loadFunds]);

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

  const addFeeScheduleEntry = async () => {
    if (!newFeePercent || isNaN(parseFloat(newFeePercent))) {
      toast({
        title: "Error",
        description: "Please enter a valid fee percentage",
        variant: "destructive",
      });
      return;
    }

    setIsAddingFee(true);
    try {
      const { error } = await supabase
        .from("investor_fee_schedule")
        .insert({
          investor_id: investorId,
          fund_id: newFeeFundId === "all" ? null : newFeeFundId,
          fee_pct: parseFloat(newFeePercent) / 100, // Convert to decimal
          effective_date: newFeeEffectiveDate,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Fee schedule entry added successfully",
      });

      // Reset form
      setNewFeePercent("");
      setNewFeeFundId("all");
      setNewFeeEffectiveDate(new Date().toISOString().split('T')[0]);
      
      loadFeeSchedule();
    } catch (error) {
      console.error("Error adding fee schedule:", error);
      toast({
        title: "Error",
        description: "Failed to add fee schedule entry",
        variant: "destructive",
      });
    } finally {
      setIsAddingFee(false);
    }
  };

  // Get current active fee (most recent by effective_date that is <= today)
  const getCurrentFee = () => {
    const today = new Date().toISOString().split('T')[0];
    const activeFees = feeSchedule.filter(f => f.effective_date <= today);
    return activeFees.length > 0 ? activeFees[0] : null;
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

      {/* Fee Schedule Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Percent className="h-5 w-5" />
            Fee Schedule Management
          </CardTitle>
          <CardDescription>
            Manage fee percentages by fund with effective dates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Active Fee Display */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <Label className="text-sm text-muted-foreground">Current Active Fee</Label>
            <div className="text-2xl font-bold mt-1">
              {getCurrentFee() 
                ? `${(getCurrentFee()!.fee_pct * 100).toFixed(2)}%`
                : `${((investor?.fee_percentage || 0.02) * 100).toFixed(1)}% (default)`
              }
              {getCurrentFee()?.fund && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  ({getCurrentFee()!.fund!.name})
                </span>
              )}
            </div>
          </div>

          {/* Add New Fee Entry Form */}
          <div className="border rounded-lg p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              <span className="font-medium">Add New Fee Entry</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label>Fund</Label>
                <Select value={newFeeFundId} onValueChange={setNewFeeFundId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select fund" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Funds</SelectItem>
                    {funds.map((fund) => (
                      <SelectItem key={fund.id} value={fund.id}>
                        {fund.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Fee Percentage</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="2.00"
                    value={newFeePercent}
                    onChange={(e) => setNewFeePercent(e.target.value)}
                  />
                  <span className="text-muted-foreground">%</span>
                </div>
              </div>
              <div>
                <Label>Effective Date</Label>
                <Input
                  type="date"
                  value={newFeeEffectiveDate}
                  onChange={(e) => setNewFeeEffectiveDate(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button onClick={addFeeScheduleEntry} disabled={isAddingFee} className="w-full">
                  {isAddingFee ? "Adding..." : "Add Fee"}
                </Button>
              </div>
            </div>
          </div>

          {/* Fee History Table */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <History className="h-4 w-4" />
              <span className="font-medium">Fee History</span>
            </div>
            {feeSchedule.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fund</TableHead>
                    <TableHead>Fee %</TableHead>
                    <TableHead>Effective Date</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {feeSchedule.map((entry) => {
                    const isActive = entry.effective_date <= new Date().toISOString().split('T')[0];
                    const isCurrent = getCurrentFee()?.id === entry.id;
                    return (
                      <TableRow key={entry.id}>
                        <TableCell>
                          {entry.fund?.name || <span className="text-muted-foreground">All Funds</span>}
                        </TableCell>
                        <TableCell className="font-mono">
                          {(entry.fee_pct * 100).toFixed(2)}%
                        </TableCell>
                        <TableCell>
                          {new Date(entry.effective_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {new Date(entry.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {isCurrent ? (
                            <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                              Active
                            </Badge>
                          ) : isActive ? (
                            <Badge variant="secondary">Superseded</Badge>
                          ) : (
                            <Badge variant="outline">Pending</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                No fee schedule entries. Using default fee from profile.
              </div>
            )}
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
