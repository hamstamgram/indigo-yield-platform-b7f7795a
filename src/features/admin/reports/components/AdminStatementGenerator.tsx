import { useState } from "react";
import Decimal from "decimal.js";
import { parseFinancial } from "@/utils/financial";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Alert,
  AlertDescription,
} from "@/components/ui";
import { FileText, Loader2, Shield, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks";
import { logError } from "@/lib/logger";
import type { StatementData } from "@/lib/pdf/statementGenerator";
import { checkStatementExists } from "@/services/core/reportUpsertService";
import { useSuperAdmin } from "@/features/admin/shared/SuperAdminGuard";
import { profileService, statementsService, documentService } from "@/services/shared";

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
      // 1. Resolve period first (needed to fetch reporting-eligible investors)
      const period = await statementsService.getStatementPeriod(
        parseInt(selectedYear),
        parseInt(selectedMonth)
      );

      if (!period) {
        toast({
          title: "Error",
          description: "Statement period not found for selected date.",
          variant: "destructive",
        });
        return;
      }

      // 2. Fetch eligible investors via get_reporting_eligible_investors RPC.
      //    This includes both 'investor' and 'ib' account types (fixed by migration
      //    20260223152200) and only returns accounts with positions + performance data.
      const investors = await profileService.getReportingEligibleInvestors(period.id);

      if (!investors || investors.length === 0) {
        toast({ title: "No eligible investors found for this period" });
        return;
      }

      const total = investors.length;
      let successCount = 0;

      // 3a. Prefetch all report data in parallel — eliminates N sequential DB round-trips
      setProgress(5);
      const allReports = await Promise.all(
        investors.map((inv) => profileService.getInvestorFundPerformanceByPeriod(inv.id, period.id))
      );
      setProgress(30);

      // 3b. Generate + upload + record — sequential to respect storage rate limits
      for (let i = 0; i < total; i++) {
        const investor = investors[i];
        const reports = allReports[i];
        const investorFullName = investor.name || investor.email;

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
            total_aum: reports?.reduce((sum: Decimal, r) => sum.plus(new Decimal(r.mtd_ending_balance || 0)), new Decimal(0)).toNumber() || 0,
            total_pnl: reports?.reduce((sum: Decimal, r) => sum.plus(new Decimal(r.mtd_net_income || 0)), new Decimal(0)).toNumber() || 0,
            total_fees: 0, // Fees tracked separately
          },
          positions:
            reports?.map((r) => ({
              asset_code: r.fund_name,
              opening_balance: parseFinancial(r.mtd_beginning_balance).toNumber(),
              additions: parseFinancial(r.mtd_additions).toNumber(),
              withdrawals: parseFinancial(r.mtd_redemptions).toNumber(),
              yield_earned: parseFinancial(r.mtd_net_income).toNumber(),
              closing_balance: parseFinancial(r.mtd_ending_balance).toNumber(),
              rate_of_return: parseFinancial(r.mtd_rate_of_return).toNumber(),
            })) || [],
        };

        // Generate PDF
        const pdfBlob = await generatePDF(statementData);

        // Upload via service
        const fileName = `statement-${selectedYear}-${selectedMonth.padStart(2, "0")}-${investor.id}.pdf`;
        const storagePath = `${investor.id}/${fileName}`;

        try {
          await statementsService.uploadStatementPDF(storagePath, pdfBlob);
        } catch (uploadError) {
          logError("AdminStatementGenerator.uploadStatement", uploadError);
          continue;
        }

        // Save document record via service
        await documentService.createStatementDocument({
          user_id: investor.id,
          title: `Monthly Statement - ${selectedMonth}/${selectedYear}`,
          storage_path: storagePath,
          period_start: statementData.period.start,
          period_end: statementData.period.end,
        });

        successCount++;
        // Progress: 30–95% range across the generate+upload loop
        setProgress(30 + Math.round(((i + 1) / total) * 65));
      }

      toast({
        title: "Batch Generation Complete",
        description: `Successfully generated ${successCount}/${total} statements.`,
      });
    } catch (error: any) {
      logError("AdminStatementGenerator.handleGenerateStatements", error);
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
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
              <option value="2023">2023</option>
            </select>
          </div>
        </div>

        <Alert>
          <RefreshCw className="h-4 w-4" />
          <AlertDescription>
            If a statement already exists for an investor + period, it will be updated (not
            duplicated).
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
