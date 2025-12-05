import React, { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { Loader2, FileText, CheckCircle, AlertCircle, Download, Send } from "lucide-react";
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

interface StatementDraft {
  id: string;
  investor_name: string;
  period: string;
  status: "draft" | "published";
  created_at: string;
  storage_path: string;
}

export const StatementManager: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useState(format(subMonths(new Date(), 1), "yyyy-MM"));
  const [drafts, setDrafts] = useState<StatementDraft[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => {
    fetchDrafts();
  }, [selectedMonth, fetchDrafts]);

  const fetchDrafts = React.useCallback(async () => {
    const [year, month] = selectedMonth.split("-").map(Number);

    const { data, error } = await supabase
      .from("statements")
      .select(
        `
        id,
        period_year,
        period_month,
        status,
        created_at,
        storage_path,
        investor:investors(profile:profiles(first_name, last_name))
      `
      )
      .eq("period_year", year)
      .eq("period_month", month)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching statements:", error);
      return;
    }

    const formatted = data.map((item: any) => ({
      id: item.id,
      investor_name: item.investor?.profile
        ? `${item.investor.profile.first_name} ${item.investor.profile.last_name}`
        : "Unknown Investor",
      period: `${item.period_year}-${String(item.period_month).padStart(2, "0")}`,
      status: item.status,
      created_at: item.created_at,
      storage_path: item.storage_path,
    }));

    setDrafts(formatted);
  }, [selectedMonth]);

  const generateDrafts = async () => {
    setIsGenerating(true);
    try {
      const [year, month] = selectedMonth.split("-").map(Number);
      const startDate = startOfMonth(new Date(year, month - 1));
      const endDate = endOfMonth(new Date(year, month - 1));

      // 1. Get Active Investors
      const { data: investors } = await supabase
        .from("investors")
        .select("id, profile:profiles(first_name, last_name, email)")
        .eq("status", "active");

      if (!investors) throw new Error("No active investors found");

      let count = 0;

      // 2. Process Each Investor
      for (const investor of investors) {
        // Get Transactions
        const { data: txs } = await supabase
          .from("transactions")
          .select("*")
          .eq("investor_id", investor.id)
          .lte("created_at", endDate.toISOString());

        if (!txs) continue;

        // Calculate Balances (Multi-Asset)
        // Simple aggregator for the PDF "Positions" table
        const assetMap = new Map();

        txs.forEach((tx) => {
          const asset = tx.asset_code;
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
          .map(([code, val]) => ({
            asset_code: code,
            opening_balance: val.open,
            additions: val.in,
            withdrawals: val.out,
            yield_earned: 0, // TODO: Implement yield
            closing_balance: val.close,
          }))
          .filter((p) => p.closing_balance !== 0 || p.additions !== 0 || p.withdrawals !== 0);

        if (positions.length === 0) continue; // Skip empty accounts

        // Calculate Totals for Summary (just summing units doesn't make sense without price,
        // but the template expects a 'total_aum'. We'll leave it as 0 or sum distinct count?)
        // User said "Token Native". Summarizing different tokens is impossible (BTC + ETH = ?).
        // We will set Total AUM to 0 in the summary or maybe the count of assets.
        const summary = {
          total_aum: 0, // Cannot sum mixed assets
          total_pnl: 0,
          total_fees: 0,
        };

        // Generate PDF
        const pdfBlob = generatePDF({
          investor: {
            name: `${investor.profile.first_name} ${investor.profile.last_name}`,
            id: investor.id,
            accountNumber: `IND-${investor.id.slice(0, 8).toUpperCase()}`,
          },
          period: {
            month,
            year,
            start: format(startDate, "yyyy-MM-dd"),
            end: format(endDate, "yyyy-MM-dd"),
          },
          summary,
          positions,
        });

        // Upload
        const filePath = `statements/${year}/${month}/${investor.id}_${Date.now()}.pdf`;
        const { error: uploadError } = await supabase.storage
          .from("statements")
          .upload(filePath, pdfBlob, { upsert: true });

        if (uploadError) {
          console.error("Upload failed", uploadError);
          continue;
        }

        // Insert Record (Draft)
        // Note: statements table is (investor, year, month, asset_code).
        // But we generated a MULTI-ASSET PDF.
        // The schema expects 1 row per asset?
        // "statements_investor_id_period_year_period_month_asset_code_key" UNIQUE.
        // We should probably insert a record for "ALL" or "MULTI" or just one record per asset?
        // If we insert multiple, we have multiple PDF links? No, same PDF link.
        // Let's insert one record with asset_code='MULTI' or similar if enum allows,
        // OR just insert for the Primary Asset (e.g. USDT) if they have it.
        // Enum check: BTC, ETH, SOL... no 'MULTI'.
        // Workaround: Insert for the first asset found, or 'USDT' if present.
        // Using the FIRST asset in the list as the 'key' record.

        const primaryAsset = positions[0].asset_code;

        await supabase.from("statements").upsert({
          investor_id: investor.id,
          period_year: year,
          period_month: month,
          asset_code: primaryAsset, // Associating the PDF with one asset for PK constraint
          begin_balance: 0,
          additions: 0,
          redemptions: 0,
          net_income: 0,
          end_balance: 0,
          storage_path: filePath,
          status: "draft",
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
      // Update all drafts for this month to published
      const draftsToPublish = drafts.filter((d) => d.status === "draft");
      const ids = draftsToPublish.map((d) => d.id);

      if (ids.length === 0) return;

      const { error } = await supabase
        .from("statements")
        .update({ status: "published" })
        .in("id", ids);

      if (error) throw error;

      toast.success(`Published ${ids.length} statements`);
      fetchDrafts();
    } catch (error) {
      console.error(error);
      toast.error("Failed to publish");
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Monthly Statements</CardTitle>
          <p className="text-sm text-muted-foreground">
            Generate, review, and publish investor reports.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <input
            type="month"
            className="border rounded p-2"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          />
          <Button onClick={generateDrafts} disabled={isGenerating}>
            {isGenerating ? (
              <Loader2 className="animate-spin mr-2" />
            ) : (
              <FileText className="mr-2 h-4 w-4" />
            )}
            Generate Drafts
          </Button>
          <Button
            onClick={publishDrafts}
            disabled={isPublishing || drafts.filter((d) => d.status === "draft").length === 0}
            variant="default"
            className="bg-green-600 hover:bg-green-700"
          >
            <Send className="mr-2 h-4 w-4" />
            Publish All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
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
                      // Preview Logic (Get Signed URL)
                      // For now just log path
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
