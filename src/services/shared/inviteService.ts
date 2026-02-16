/**
 * Invite Service
 * Handles investor invite operations
 */

async function createInvestorInvite(_params: {
  email: string;
  investorId: string;
  inviteCode: string;
  expiresAt: string;
  createdBy?: string;
}): Promise<void> {
  throw new Error("Investor invites feature has been removed");
}

export const inviteService = {
  createInvestorInvite,
};
