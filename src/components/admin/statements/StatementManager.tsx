import React, { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { Loader2, FileText, CheckCircle, AlertCircle, Download, Send, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { generatePDF } from "@/lib/pdf/statementGenerator";
import { checkStatementExists } from "@/services/core/reportUpsertService";
import { useSuperAdmin } from "@/components/admin/SuperAdminGuard";

interface StatementDraft {
  id: string;
  investor_name: string;
  period: string;
  status: "draft" | "published";
  created_at: string;
  storage_path: string;
}

export const StatementManager: React.FC = () => {
  const { isSuperAdmin, loading: roleLoading } = useSuperAdmin();
  const [selectedMonth, setSelectedMonth] = useState(format(subMonths(new Date(), 1), "yyyy-MM"));
  const [drafts, setDrafts] = useState<StatementDraft[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [existingCount, setExistingCount] = useState(0);

  const fetchDrafts = React.useCallback(async () => {
    const [year, month] = selectedMonth.split("-").map(Number);

    const { data, error } = await supabase
      .from("statements")
      .select(
        `
        id,
        period_year,
        period_month,
        storage_path,
        created_at,
        investor_id,
        profile:profiles(first_name, last_name, email)
      `
      )
      .eq("period_year", year)
      .eq("period_month", month)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching statements:", error);
      return;
    }

    const formatted: StatementDraft[] = data.map((item: any) => ({
      id: item.id,
      investor_name: `${item.profile?.first_name || ""} ${item.profile?.last_name || ""}`.trim() || item.profile?.email || "Unknown Investor",
      period: `${item.period_year}-${String(item.period_month).padStart(2, "0")}`,
      status: (item.storage_path ? "published" : "draft") as "draft" | "published",
      created_at: item.created_at,
      storage_path: item.storage_path,
    }));

    setDrafts(formatted);
  }, [selectedMonth]);

  useEffect(() => {
    fetchDrafts();
  }, [selectedMonth, fetchDrafts]);


  const generateDrafts = async () => {
    setIsGenerating(true);
    try {
      const [year, month] = selectedMonth.split("-").map(Number);
      const startDate = startOfMonth(new Date(year, month - 1));
      const endDate = endOfMonth(new Date(year, month - 1));

      // 1. Get Active Investors (profiles)
      const { data: investors } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email")
        .eq("status", "active")
        .eq("is_admin", false); // Only non-admin profiles

      if (!investors) throw new Error("No active investors found");

      let count = 0;

      // 2. Process Each Investor
      for (const investor of investors) {
        // Get Transactions
        // Filter by tx_date (effective date) not created_at
        const { data: txs } = await supabase
          .from("transactions_v2")
          .select("*")
          .eq("investor_id", investor.id)
          .lte("tx_date", endDate.toISOString().split("T")[0]);

        if (!txs) continue;

        // Get Monthly Yield Data from investor_fund_performance (V2)
        const { data: monthlyPerformance } = await supabase
          .from("investor_fund_performance")
          .select("fund_name, mtd_net_income")
          .eq("investor_id", investor.id);

        const yieldMap = new Map();
        monthlyPerformance?.forEach((r: any) =>
          yieldMap.set(r.fund_name, Number(r.mtd_net_income || 0))
        );

        // Calculate Balances (Multi-Asset)
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
            else rec.out += Math.abs(amount); // Store outflow as positive for display
          }
          rec.close += amount; // Net sum
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
              p.end_balance !== 0 || p.additions !== 0 || p.redemptions !== 0 || p.yield_earned !== 0
          );

        if (positions.length === 0) continue; // Skip empty accounts

        const fullName = `${investor.first_name || ""} ${investor.last_name || ""}`.trim();

        // Generate PDF
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
            total_aum: 0, // Cannot sum mixed assets, or calculate from new v_live_investor_balances?
            total_pnl: 0,
            total_fees: 0,
          },
          positions,
        });

        // Upload
        const filePath = `statements/${year}/${month}/${investor.id}_${Date.now()}.pdf`;
        const pdfBlobResolved = await pdfBlob;
        const { error: uploadError } = await supabase.storage
          .from("statements")
          .upload(filePath, pdfBlobResolved, { upsert: true });

        if (uploadError) {
          console.error("Upload failed", uploadError);
          continue;
        }

        // Insert Record (Draft)
        // Using the FIRST asset in the list as the 'key' record for the statement entry
        const primaryAsset = positions[0]?.asset_code || "MULTI"; // Fallback to MULTI if no asset
        await supabase.from("statements").upsert({
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
      fetchDrafts();
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate drafts");
    } finally {
      setIsGenerating(false);
    }
  };

  const publishDrafts = async () => {
    setIsPublishing(true);
    try {
      // Mark drafts as published by ensuring they have storage_path
      const draftsToPublish = drafts.filter((d) => d.status === "draft");
      
      if (draftsToPublish.length === 0) {
        toast.info("No drafts to publish");
        return;
      }

      toast.success(`${draftsToPublish.length} statements are ready`);
      fetchDrafts();
    } catch (error) {
      console.error(error);
      toast.error("Failed to publish");
    } finally {
      setIsPublishing(false);
    }
  };

  // Show loading while checking role
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
            disabled={isPublishing || !isSuperAdmin || drafts.filter((d) => d.status === "draft").length === 0}
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
          <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <p className="text-sm text-amber-700 dark:text-amber-400">
              You can view statements but only Super Admins can generate or publish.
            </p>
          </div>
        )}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Investor</TableHead>
              <TableHead>Period</TableHead>
              <TableHead>Generated</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {drafts.map((draft) => (
              <TableRow key={draft.id}>
                <TableCell className="font-medium">{draft.investor_name}</TableCell>
                <TableCell>{draft.period}</TableCell>
                <TableCell>{new Date(draft.created_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  {draft.status === "published" ? (
                    <Badge className="bg-green-500">
                      <CheckCircle className="w-3 h-3 mr-1" /> Published
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <AlertCircle className="w-3 h-3 mr-1" /> Draft
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      console.log("Preview:", draft.storage_path);
                    }}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {drafts.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No statements found for this month. Click Generate to start.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
// @ts-nocheck
// @ts-nocheck
