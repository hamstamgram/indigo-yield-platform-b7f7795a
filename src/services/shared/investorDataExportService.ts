import { supabase } from "@/integrations/supabase/client";

export interface InvestorExportData {
  exportDate: string;
  profile: any;
  investments: any[];
  transactions: any[];
  documents: any[];
}

async function exportInvestorData(userId: string): Promise<InvestorExportData> {
  const [profile, investments, transactions, documents] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.from("investor_positions").select("*").eq("investor_id", userId),
    supabase.from("transactions_v2").select("*").eq("investor_id", userId).eq("is_voided", false).eq("visibility_scope", "investor_visible"),
    supabase.from("documents").select("*").eq("user_id", userId),
  ]);

  return {
    exportDate: new Date().toISOString(),
    profile: profile.data,
    investments: investments.data || [],
    transactions: transactions.data || [],
    documents: (documents.data || []).map((d: any) => ({
      id: d.id,
      type: d.document_type || d.type,
      status: d.status,
      uploadedAt: d.created_at,
    })),
  };
}

function downloadAsJson(data: InvestorExportData): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `indigo-data-export-${Date.now()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export const investorDataExportService = {
  exportInvestorData,
  downloadAsJson,
};
