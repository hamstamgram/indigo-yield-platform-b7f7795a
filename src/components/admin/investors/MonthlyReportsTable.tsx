import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatTokenBalance } from "@/utils/formatters";
import { Save, Calendar } from "lucide-react";

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
  aum_manual_override: number | null;
  entry_date: string | null;
  exit_date: string | null;
  updated_at: string;
  edited_by: string | null;
}

interface MonthlyReportsTableProps {
  investorId: string;
  investorName: string;
}

const MonthlyReportsTable: React.FC<MonthlyReportsTableProps> = ({ investorId, investorName }) => {
  const [reports, setReports] = useState<MonthlyReport[]>([]);
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from("investor_fund_performance")
        .select(`
          *,
          period:statement_periods (
            period_end_date
          )
        `)
        .eq("investor_id", investorId)
        .order("period(period_end_date)", { ascending: false })
        .order("fund_name", { ascending: true });

      if (error) throw error;

      const reports: MonthlyReport[] = (data || []).map((r: any) => ({
        id: r.id,
        investor_id: r.investor_id,
        report_month: r.period?.period_end_date,
        asset_code: r.fund_name,
        opening_balance: r.mtd_beginning_balance,
        closing_balance: r.mtd_ending_balance,
        additions: r.mtd_additions,
        withdrawals: r.mtd_redemptions,
        yield_earned: r.mtd_net_income,
        aum_manual_override: null, // Not in V2 yet
        entry_date: r.created_at,
        exit_date: null,
        updated_at: r.updated_at,
        edited_by: null, // Not tracking edits column currently
      }));

      setReports(reports);
    } catch (error) {
      console.error("Error fetching monthly reports:", error);
      toast.error("Failed to fetch monthly reports");
    } finally {
      setLoading(false);
    }
  }, [investorId, toast]);

  useEffect(() => {
    fetchReports();
  }, [investorId, fetchReports]);

  const generateMonthlyTemplate = async () => {
    if (!selectedMonth) {
      toast.error("Please select a month");
      return;
    }

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

      // 2. Insert V2 Record
      const { error } = await (supabase as any).from("investor_fund_performance").insert({
        investor_id: investorId,
        period_id: periodId,
        fund_name: "USDT", // Default asset
        mtd_beginning_balance: 0,
        mtd_ending_balance: 0,
        mtd_additions: 0,
        mtd_redemptions: 0,
        mtd_net_income: 0,
      });

      if (error) throw error;
      toast.success("Monthly template generated successfully");
      fetchReports();
    } catch (error) {
      console.error("Error generating template:", error);
      toast.error("Failed to generate monthly template");
    }
  };

  const handleCellEdit = (reportId: string, field: string, currentValue: number) => {
    setEditingCell(`${reportId}-${field}`);
    setEditValue(currentValue.toString());
  };

  const saveCellEdit = async (reportId: string, field: string) => {
    const numericValue = parseFloat(editValue);
    if (isNaN(numericValue)) {
      toast.error("Please enter a valid number");
      return;
    }

    // Map legacy fields to V2 fields
    const fieldMap: Record<string, string> = {
      opening_balance: "mtd_beginning_balance",
      closing_balance: "mtd_ending_balance",
      additions: "mtd_additions",
      withdrawals: "mtd_redemptions",
      yield_earned: "mtd_net_income",
    };

    const v2Field = fieldMap[field] || field;

    try {
      const { error } = await supabase
        .from("investor_fund_performance")
        .update({
          [v2Field]: numericValue,
          // edited_by: (await supabase.auth.getUser()).data.user?.id, // Not in schema
        })
        .eq("id", reportId);

      if (error) throw error;

      setReports((prev) =>
        prev.map((report) =>
          report.id === reportId ? { ...report, [field]: numericValue } : report
        )
      );

      setEditingCell(null);
      toast.success("Value updated successfully");
    } catch (error) {
      console.error("Error updating report:", error);
      toast.error("Failed to update value");
    }
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue("");
  };

  const getMonthOptions = () => {
    const months = [];
    const start = new Date("2024-06-01");
    const end = new Date();

    for (let d = new Date(start); d <= end; d.setMonth(d.getMonth() + 1)) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const value = `${year}-${month}-01`;
      const label = `${d.toLocaleString("default", { month: "long" })} ${year}`;
      months.push({ value, label });
    }

    return months.reverse();
  };

  const renderEditableCell = (
    report: MonthlyReport,
    field: keyof MonthlyReport,
    value: number | null
  ) => {
    const cellKey = `${report.id}-${field}`;
    const isEditing = editingCell === cellKey;

    if (isEditing) {
      return (
        <div className="flex gap-1">
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="h-8 w-20"
            onKeyDown={(e) => {
              if (e.key === "Enter") saveCellEdit(report.id, field as string);
              if (e.key === "Escape") cancelEdit();
            }}
            autoFocus
          />
          <Button size="sm" onClick={() => saveCellEdit(report.id, field as string)}>
            <Save className="h-3 w-3" />
          </Button>
        </div>
      );
    }

    return (
      <div
        className="cursor-pointer hover:bg-muted p-1 rounded"
        onClick={() => handleCellEdit(report.id, field as string, value || 0)}
      >
        {formatTokenBalance(value || 0, report.asset_code)}
      </div>
    );
  };

  // Group reports by month for display
  const reportsByMonth = reports.reduce(
    (acc, report) => {
      const month = report.report_month;
      if (!acc[month]) acc[month] = [];
      acc[month].push(report);
      return acc;
    },
    {} as Record<string, MonthlyReport[]>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Historical Monthly Reports - {investorName}</CardTitle>
          <div className="flex gap-2">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select month to generate" />
              </SelectTrigger>
              <SelectContent>
                {getMonthOptions().map((month) => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={generateMonthlyTemplate} disabled={!selectedMonth}>
              <Calendar className="h-4 w-4 mr-2" />
              Generate Template
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">Loading reports...</div>
        ) : (
          <div className="space-y-6">
            {Object.entries(reportsByMonth).map(([month, monthReports]) => (
              <div key={month} className="space-y-2">
                <h3 className="font-semibold text-lg">
                  {new Date(month).toLocaleString("default", { month: "long", year: "numeric" })}
                </h3>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Asset</TableHead>
                        <TableHead>Opening Balance</TableHead>
                        <TableHead>Additions</TableHead>
                        <TableHead>Withdrawals</TableHead>
                        <TableHead>Yield Earned</TableHead>
                        <TableHead>Closing Balance</TableHead>
                        <TableHead>Manual AUM</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {monthReports.map((report) => (
                        <TableRow key={report.id}>
                          <TableCell>
                            <Badge variant="outline">{report.asset_code}</Badge>
                          </TableCell>
                          <TableCell>
                            {renderEditableCell(report, "opening_balance", report.opening_balance)}
                          </TableCell>
                          <TableCell>
                            {renderEditableCell(report, "additions", report.additions)}
                          </TableCell>
                          <TableCell>
                            {renderEditableCell(report, "withdrawals", report.withdrawals)}
                          </TableCell>
                          <TableCell>
                            {renderEditableCell(report, "yield_earned", report.yield_earned)}
                          </TableCell>
                          <TableCell>
                            {renderEditableCell(report, "closing_balance", report.closing_balance)}
                          </TableCell>
                          <TableCell>
                            {report.aum_manual_override ? (
                              renderEditableCell(
                                report,
                                "aum_manual_override",
                                report.aum_manual_override
                              )
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ))}

            {Object.keys(reportsByMonth).length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No monthly reports found. Generate templates to get started.
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MonthlyReportsTable;
