import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Loader2, Shield, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { generatePDF } from "@/lib/pdf/statementGenerator";
import { checkStatementExists } from "@/services/reportUpsertService";
import { useSuperAdmin } from "@/components/admin/SuperAdminGuard";
import { Alert, AlertDescription } from "@/components/ui/alert";

const AdminStatementGenerator: React.FC = () => {
  const { isSuperAdmin, loading: roleLoading } = useSuperAdmin();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedMonth, setSelectedMonth] = useState<string>(
    (new Date().getMonth() + 1).toString()
  );
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());

  const handleGenerateStatements = async () => {
    setIsGenerating(true);
    setProgress(0);
    try {
      // 1. Fetch all active investors (profiles)
      const { data: investors, error: investorsError } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email, status")
        .eq("status", "active")
        .eq("is_admin", false); // Only non-admin profiles

      if (investorsError) throw investorsError;
      if (!investors || investors.length === 0) {
        toast({ title: "No active investors found" });
        return;
      }

      const total = investors.length;
      let successCount = 0;

      // Resolve period_id for the selected month/year
      const { data: period, error: periodError } = await supabase
        .from("statement_periods")
        .select("id, period_end_date")
        .eq("year", parseInt(selectedYear))
        .eq("month", parseInt(selectedMonth))
        .maybeSingle();

      if (periodError || !period) {
        toast({ title: "Error", description: "Statement period not found for selected date.", variant: "destructive" });
        return;
      }

      // 2. Loop and generate
      for (let i = 0; i < total; i++) {
        const investor = investors[i];
        const investorFullName = `${investor.first_name || ""} ${investor.last_name || ""}`.trim() || investor.email;

        // Fetch report data from investor_fund_performance (V2)
        const { data: reports } = await supabase
          .from("investor_fund_performance")
          .select("fund_name, mtd_beginning_balance, mtd_additions, mtd_redemptions, mtd_net_income, mtd_ending_balance, mtd_rate_of_return")
          .eq("investor_id", investor.id)
          .eq("period_id", period.id);

        // Prepare statement data
        const statementData = {
          investor: {
            name: investorFullName,
            id: investor.id,
            accountNumber: investor.id.substring(0, 8).toUpperCase(),
          },
          period: {
            month: parseInt(selectedMonth),
            year: parseInt(selectedYear),
            start: `${selectedYear}-${selectedMonth.padStart(2, "0")}-01`,
            end: period.period_end_date,
          },
          summary: {
            total_aum: reports?.reduce((sum, r) => sum + Number(r.mtd_ending_balance || 0), 0) || 0,
            total_pnl: reports?.reduce((sum, r) => sum + Number(r.mtd_net_income || 0), 0) || 0,
            total_fees: 0, // Fees tracked separately
          },
          positions:
            reports?.map((r) => ({
              asset_code: r.fund_name,
              opening_balance: Number(r.mtd_beginning_balance || 0),
              additions: Number(r.mtd_additions || 0),
              withdrawals: Number(r.mtd_redemptions || 0),
              yield_earned: Number(r.mtd_net_income || 0),
              closing_balance: Number(r.mtd_ending_balance || 0),
              rate_of_return: Number(r.mtd_rate_of_return || 0),
            })) || [],
        };

        // Generate PDF
        const pdfBlob = await generatePDF(statementData);

        // Upload
        const fileName = `statement-${selectedYear}-${selectedMonth.padStart(2, "0")}-${investor.id}.pdf`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("statements")
          .upload(`${investor.id}/${fileName}`, pdfBlob, {
            contentType: "application/pdf",
            upsert: true,
          });

        if (uploadError) {
          console.error("Upload failed", uploadError);
          continue;
        }

        // Save document record
        const currentUser = await supabase.auth.getUser();
        await supabase.from("documents").insert({
          user_id: investor.id, // Unified ID
          type: "statement",
          title: `Monthly Statement - ${selectedMonth}/${selectedYear}`,
          storage_path: uploadData?.path || "",
          period_start: statementData.period.start,
          period_end: statementData.period.end,
          created_by: currentUser.data.user?.id,
        });
        successCount++;
      }

      toast({
        title: "Batch Generation Complete",
        description: `Successfully generated ${successCount}/${total} statements.`,
      });
    } catch (error: any) {
      console.error("Batch generation error:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // RBAC check
  if (roleLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
          <p className="text-muted-foreground mt-2">Verifying permissions...</p>
        </CardContent>
      </Card>
    );
  }

  if (!isSuperAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-muted-foreground" />
            Statement Generator
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Only Super Admins can generate statements. Contact a Super Admin for assistance.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Statement Generator
        </CardTitle>
        <CardDescription>
          Generate monthly statements for all investors. Existing statements will be updated.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Month</label>
            <select
              className="w-full p-2 border rounded-md bg-background"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(2024, i).toLocaleString("default", { month: "long" })}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Year</label>
            <select
              className="w-full p-2 border rounded-md bg-background"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              <option value="2025">2025</option>
              <option value="2024">2024</option>
              <option value="2023">2023</option>
            </select>
          </div>
        </div>

        <Alert>
          <RefreshCw className="h-4 w-4" />
          <AlertDescription>
            If a statement already exists for an investor + period, it will be updated (not duplicated).
          </AlertDescription>
        </Alert>

        {isGenerating && (
          <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
            <div
              className="bg-primary h-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        <Button onClick={handleGenerateStatements} disabled={isGenerating} className="w-full">
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating {progress}%
            </>
          ) : (
            <>
              <FileText className="mr-2 h-4 w-4" />
              Generate / Update All Statements
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default AdminStatementGenerator;
