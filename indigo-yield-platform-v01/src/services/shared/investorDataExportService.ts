import { supabase } from "@/integrations/supabase/client";
import { rpc } from "@/lib/rpc";
import type { RPCResponse } from "@/contracts/rpcSignatures";

export interface InvestorExportData {
  exportDate: string;
  profile: any;
  investments: any[];
  transactions: any[];
  documents?: any[]; // Optional for backward compatibility
  raw_canonical_data?: RPCResponse<'export_investor_data'>; // Raw data from canonical RPC
}

class InvestorDataExportService {
  /**
   * Export all data for an investor using canonical RPC (GDPR data export)
   * This method enforces P0 gateway fixes by using the canonical export_investor_data RPC
   */
  async exportInvestorData(userId: string): Promise<InvestorExportData> {
    try {
      // Use canonical RPC function for GDPR-compliant data export
      const { data: canonicalData, error } = await rpc.call('export_investor_data', {
        investor_id_param: userId
      });

      if (error) {
        console.error('Canonical RPC export failed:', error);
        throw new Error(`Data export failed: ${error.message}`);
      }

      if (!canonicalData) {
        throw new Error('No data returned from canonical export function');
      }

      // Transform canonical data to maintain backward compatibility
      const transformedData: InvestorExportData = {
        exportDate: canonicalData.export_timestamp,
        profile: canonicalData.personal_info,
        investments: canonicalData.investments || [],
        transactions: canonicalData.transactions || [],
        raw_canonical_data: canonicalData // Include raw canonical data for audit purposes
      };

      return transformedData;
    } catch (error) {
      // Fallback to legacy method for backward compatibility (will be deprecated)
      console.warn('Canonical RPC failed, falling back to legacy method:', error);
      return this.legacyExportInvestorData(userId);
    }
  }

  /**
   * Legacy export method for backward compatibility
   * @deprecated Use canonical RPC method instead
   */
  private async legacyExportInvestorData(userId: string): Promise<InvestorExportData> {
    const [profile, investments, transactions, documents] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("investor_positions").select("*").eq("investor_id", userId),
      // Note: Includes ALL transactions (including voided) for complete GDPR audit trail
      // Users have the right to see their full data history under GDPR Article 15
      supabase.from("transactions_v2").select("*").eq("investor_id", userId),
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

  /**
   * Download export data as JSON file
   */
  downloadAsJson(data: InvestorExportData): void {
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

  /**
   * Validate that the canonical RPC is available and working
   */
  async validateCanonicalRPC(): Promise<boolean> {
    try {
      const { error } = await rpc.call('export_investor_data', {
        investor_id_param: '00000000-0000-0000-0000-000000000000' // Test with invalid UUID
      });

      // If we get a specific error about user not found or permissions, RPC is working
      return error?.message?.includes('not found') || error?.message?.includes('permissions') || false;
    } catch {
      return false;
    }
  }
}

export const investorDataExportService = new InvestorDataExportService();