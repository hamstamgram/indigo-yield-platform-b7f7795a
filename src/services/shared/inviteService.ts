/**
 * Invite Service
 * Handles investor invite operations
 */

import { supabase } from "@/integrations/supabase/client";

class InviteService {
  /**
   * Create an investor invite
   */
  async createInvestorInvite(params: {
    email: string;
    investorId: string;
    inviteCode: string;
    expiresAt: string;
    createdBy?: string;
  }): Promise<void> {
    const { error } = await supabase.from("investor_invites" as any).insert({
      email: params.email,
      invite_code: params.inviteCode,
      created_by: params.createdBy,
      expires_at: params.expiresAt,
      investor_id: params.investorId,
    });

    if (error) throw error;
  }
}

export const inviteService = new InviteService();
