import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { generatePDF } from "@/lib/pdf/statementGenerator";

const AdminStatementGenerator: React.FC = () => {
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
      // 1. Fetch all active investors
      const { data: investors, error: investorsError } = await supabase
        .from("investors")
        .select("id, name, email, profile_id")
        .eq("status", "active");

      if (investorsError) throw investorsError;
      if (!investors || investors.length === 0) {
        toast({ title: "No active investors found" });
        return;
      }

      const total = investors.length;
      let successCount = 0;

      // 2. Loop and generate
      for (let i = 0; i < total; i++) {
        const investor = investors[i];

        // Fetch report data via RPC or simple query
        // Using query for simplicity as RPC might need params
        const { data: reports } = await supabase
          .from("investor_monthly_reports")
          .select("*")
          .eq("investor_id", investor.id)
          .eq("report_month", `${selectedYear}-${selectedMonth.padStart(2, "0")}-01`);

        // Prepare statement data
        const statementData = {
          investor: {
            name: investor.name,
            id: investor.id,
            accountNumber: investor.id.substring(0, 8).toUpperCase(),
          },
          period: {
            month: parseInt(selectedMonth),
            year: parseInt(selectedYear),
            start: `${selectedYear}-${selectedMonth.padStart(2, "0")}-01`,
            end: new Date(parseInt(selectedYear), parseInt(selectedMonth), 0)
              .toISOString()
              .split("T")[0],
          },
          summary: {
            total_aum: reports?.reduce((sum, r) => sum + Number(r.closing_balance), 0) || 0,
            total_pnl: reports?.reduce((sum, r) => sum + Number(r.yield_earned), 0) || 0,
            total_fees: 0, // Fees tracked separately if needed
          },
          positions:
            reports?.map((r) => ({
              asset_code: r.asset_code,
              opening_balance: Number(r.opening_balance),
              additions: Number(r.additions),
              withdrawals: Number(r.withdrawals),
              yield_earned: Number(r.yield_earned),
              closing_balance: Number(r.closing_balance),
            })) || [],
        };

        // Generate PDF
        const pdfBlob = generatePDF(statementData);

        // Upload
        const fileName = `statement-${selectedYear}-${selectedMonth.padStart(2, "0")}-${investor.id}.pdf`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("statements")
          .upload(`${investor.id}/${fileName}`, pdfBlob, {
            contentType: "application/pdf",
            upsert: true,
          });

        if (!uploadError) {
          // Log Document
          await supabase.from("documents").insert({
            user_id: investor.profile_id, // Assuming link
            type: "statement",
            title: `Monthly Statement - ${selectedMonth}/${selectedYear}`,
            storage_path: uploadData?.path,
            period_start: statementData.period.start,
            period_end: statementData.period.end,
            created_by: (await supabase.auth.getUser()).data.user?.id,
          });
          successCount++;
        }

        setProgress(Math.round(((i + 1) / total) * 100));
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Statement Generator
        </CardTitle>
        <CardDescription>Generate monthly statements for all investors</CardDescription>
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
              Generate All Statements
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default AdminStatementGenerator;
