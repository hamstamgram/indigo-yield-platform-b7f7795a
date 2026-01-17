/**
 * Invite Service
 * Handles investor invite operations
 */

import { supabase } from "@/integrations/supabase/client";
import { db } from "@/lib/db";

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
    const { error } = await db.insert("investor_invites", {
      email: params.email,
      invite_code: params.inviteCode,
      created_by: params.createdBy,
      expires_at: params.expiresAt,
      investor_id: params.investorId,
    });

    if (error) throw new Error(error.userMessage);
  }
}

export const inviteService = new InviteService();
