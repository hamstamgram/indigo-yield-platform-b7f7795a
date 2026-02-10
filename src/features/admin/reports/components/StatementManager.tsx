import React, { useState } from "react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import {
  Loader2,
  FileText,
  CheckCircle,
  AlertCircle,
  Download,
  Send,
  RefreshCw,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui";
import { toast } from "sonner";
import { generatePDF } from "@/lib/pdf/statementGenerator";
import { useSuperAdmin } from "@/features/admin/shared/SuperAdminGuard";
import { useStatements, usePublishStatements } from "@/hooks/data";
import { useQueryClient } from "@tanstack/react-query";
import { profileService, statementsService } from "@/services/shared";
import { transactionsV2Service } from "@/services/investor";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { invalidateAfterStatementOp } from "@/utils/cacheInvalidation";
import { logError, logDebug } from "@/lib/logger";
import { formatDateForDB } from "@/utils/dateUtils";

export const StatementManager: React.FC = () => {
  const { isSuperAdmin, loading: roleLoading } = useSuperAdmin();
  const [selectedMonth, setSelectedMonth] = useState(format(subMonths(new Date(), 1), "yyyy-MM"));
  const [isGenerating, setIsGenerating] = useState(false);
  const [existingCount, setExistingCount] = useState(0);

  const queryClient = useQueryClient();

  // Use data hooks
  const { data: drafts = [], isLoading: draftsLoading, refetch } = useStatements(selectedMonth);
  const publishMutation = usePublishStatements();

  const generateDrafts = async () => {
    setIsGenerating(true);
    try {
      const [year, month] = selectedMonth.split("-").map(Number);
      const startDate = startOfMonth(new Date(year, month - 1));
      const endDate = endOfMonth(new Date(year, month - 1));

      // 1. Get Active Investors (profiles) via service
      const investors = await profileService.getActiveInvestors();

      if (!investors || investors.length === 0) throw new Error("No active investors found");

      let count = 0;

      // 2. Process Each Investor
      for (const investor of investors) {
        // Get transactions via service
        const txs = await transactionsV2Service.getByInvestorId(investor.id, {
          endDate: formatDateForDB(endDate),
        });

        if (!txs || txs.length === 0) continue;

        // Get monthly performance via service
        const monthlyPerformance = await profileService.getInvestorFundPerformance(investor.id);

        const yieldMap = new Map();
        monthlyPerformance?.forEach((r: any) =>
          yieldMap.set(r.fund_name, Number(r.mtd_net_income || 0))
        );

        const assetMap = new Map();

        txs.forEach((tx) => {
          const asset = tx.asset;
          if (!assetMap.has(asset)) assetMap.set(asset, { open: 0, in: 0, out: 0, close: 0 });
          const rec = assetMap.get(asset);

          const txDate = new Date(tx.created_at);
          const amount = Number(tx.amount);

          if (txDate < startDate) {
            rec.open += amount;
          } else {
            if (tx.type === "DEPOSIT") rec.in += amount;
            else rec.out += Math.abs(amount);
          }
          rec.close += amount;
        });

        const positions = Array.from(assetMap.entries())
          .map(([code, val]) => {
            const begin_balance = val.open;
            const additions = val.in;
            const redemptions = val.out;
            const yield_earned = yieldMap.get(code) || 0;
            const closing_balance = begin_balance + additions - redemptions + yield_earned;
            return {
              asset_code: code,
              begin_balance,
              additions,
              redemptions,
              yield_earned,
              end_balance: closing_balance,
            };
          })
          .filter(
            (p) =>
              p.end_balance !== 0 ||
              p.additions !== 0 ||
              p.redemptions !== 0 ||
              p.yield_earned !== 0
          );

        if (positions.length === 0) continue;

        const fullName = `${investor.firstName || ""} ${investor.lastName || ""}`.trim();

        const pdfBlob = generatePDF({
          investor: {
            name: fullName,
            id: investor.id,
            accountNumber: `IND-${investor.id.slice(0, 8).toUpperCase()}`,
          },
          period: {
            month,
            year,
            start: format(startDate, "yyyy-MM-dd"),
            end: format(endDate, "yyyy-MM-dd"),
          },
          summary: {
            total_aum: 0,
            total_pnl: 0,
            total_fees: 0,
          },
          positions,
        });

        const filePath = `statements/${year}/${month}/${investor.id}_${Date.now()}.pdf`;
        const pdfBlobResolved = await pdfBlob;

        // Upload PDF via service
        await statementsService.uploadStatementPDF(filePath, pdfBlobResolved);

        const primaryAsset = positions[0]?.asset_code || "MULTI";

        // Upsert statement via service
        await statementsService.upsertStatement({
          investor_id: investor.id,
          period_year: year,
          period_month: month,
          asset_code: primaryAsset,
          begin_balance: positions[0]?.begin_balance || 0,
          additions: positions[0]?.additions || 0,
          redemptions: positions[0]?.redemptions || 0,
          net_income: positions[0]?.yield_earned || 0,
          end_balance: positions[0]?.end_balance || 0,
          storage_path: filePath,
        });

        count++;
      }

      toast.success(`Generated ${count} draft statements`);
      invalidateAfterStatementOp(queryClient);
    } catch (error) {
      logError("StatementManager.generateDrafts", error, { selectedMonth });
      toast.error("Failed to generate drafts");
    } finally {
      setIsGenerating(false);
    }
  };

  const publishDrafts = async () => {
    const draftsToPublish = drafts.filter((d) => d.status === "draft");

    if (draftsToPublish.length === 0) {
      toast.info("No drafts to publish");
      return;
    }

    publishMutation.mutate(draftsToPublish);
  };

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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Monthly Statements</CardTitle>
          <p className="text-sm text-muted-foreground">
            Generate, review, and publish investor reports.
            {existingCount > 0 && (
              <span className="ml-2 text-amber-600">
                ({existingCount} existing will be updated)
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <input
            type="month"
            className="border rounded p-2"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          />
          <Button onClick={generateDrafts} disabled={isGenerating || !isSuperAdmin}>
            {isGenerating ? (
              <Loader2 className="animate-spin mr-2" />
            ) : existingCount > 0 ? (
              <RefreshCw className="mr-2 h-4 w-4" />
            ) : (
              <FileText className="mr-2 h-4 w-4" />
            )}
            {existingCount > 0 ? "Regenerate" : "Generate"} Drafts
          </Button>
          <Button
            onClick={publishDrafts}
            disabled={
              publishMutation.isPending ||
              !isSuperAdmin ||
              drafts.filter((d) => d.status === "draft").length === 0
            }
            variant="secondary"
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Send className="mr-2 h-4 w-4" />
            Publish All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!isSuperAdmin && (
          <div className="mb-4 p-3 bg-amber-900/20 rounded-lg border border-amber-800">
            <p className="text-sm text-amber-400">
              You can view statements but only Super Admins can generate or publish.
            </p>
          </div>
        )}
        <Table className="text-xs">
          <TableHeader>
            <TableRow>
              <TableHead className="whitespace-nowrap">Investor</TableHead>
              <TableHead className="whitespace-nowrap">Period</TableHead>
              <TableHead className="whitespace-nowrap">Generated</TableHead>
              <TableHead className="whitespace-nowrap">Status</TableHead>
              <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {draftsLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : drafts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No statements found for this month. Click Generate to start.
                </TableCell>
              </TableRow>
            ) : (
              drafts.map((draft) => (
                <TableRow key={draft.id}>
                  <TableCell className="font-medium py-1.5 truncate max-w-[150px]">
                    {draft.investor_name}
                  </TableCell>
                  <TableCell className="py-1.5">{draft.period}</TableCell>
                  <TableCell className="py-1.5">
                    {new Date(draft.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="py-1.5">
                    {draft.status === "published" ? (
                      <Badge className="bg-green-500 text-[10px]">
                        <CheckCircle className="w-3 h-3 mr-1" /> Published
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px]">
                        <AlertCircle className="w-3 h-3 mr-1" /> Draft
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right py-1.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        logDebug("StatementManager.preview", { storagePath: draft.storage_path });
                      }}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
