import { supabase } from "@/integrations/supabase/client";
import { WizardFormData } from "@/features/admin/investors/components/wizard/types";
import { addCsrfHeader } from "@/lib/security/csrf";
import { logError, logWarn } from "@/lib/logger";
import { getTodayString } from "@/utils/dateUtils";

interface CreateIBResponse {
  success: boolean;
  user_id?: string;
  error?: string;
}

interface CreateUserResponse {
  success: boolean;
  user_id?: string;
  error?: string;
}

/**
 * Progress callback for wizard operations
 */
export type WizardProgressCallback = (step: string, status: "info" | "success" | "error") => void;

/**
 * Result of wizard operation
 */
export interface WizardResult {
  success: boolean;
  investorId?: string;
  error?: string;
}

/**
 * Creates a new IB user via the edge function
 */
async function createIBUser(params: {
  email: string;
  firstName: string;
  lastName: string;
}): Promise<string> {
  const { data, error } = await supabase.functions.invoke<CreateIBResponse>(
    "admin-user-management",
    {
      body: {
        action: "createIB",
        email: params.email,
        firstName: params.firstName,
        lastName: params.lastName,
      },
      headers: addCsrfHeader({}),
    }
  );

  if (error) {
    logError("createIBUser", error, { email: params.email });
    throw new Error(error.message || "Failed to create IB");
  }

  if (!data?.success || !data.user_id) {
    throw new Error(data?.error || "Failed to create IB user");
  }

  return data.user_id;
}

/**
 * Creates a new investor user via the edge function
 */
async function createInvestorUser(params: {
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  feePct?: number | null;
}): Promise<string> {
  const { data, error } = await supabase.functions.invoke<CreateUserResponse>(
    "admin-user-management",
    {
      body: {
        action: "createUser",
        email: params.email,
        firstName: params.firstName,
        lastName: params.lastName,
        role: "LP",
        selectedFunds: [],
        sendWelcomeEmail: true,
        feePct: params.feePct ?? null,
      },
      headers: addCsrfHeader({}),
    }
  );

  if (error) {
    // Check if user already exists
    let errorMessage = error.message || "Failed to create investor";

    try {
      if (error.context && typeof error.context.json === "function") {
        const errorBody = await error.context.json();
        errorMessage = errorBody?.error || errorMessage;
      }
    } catch {
      // Ignore parsing errors
    }

    // If user already exists, try to find them
    if (errorMessage.includes("already") && errorMessage.includes("registered")) {
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", params.email)
        .maybeSingle();

      if (existingProfile?.id) {
        return existingProfile.id;
      }
    }

    throw new Error(errorMessage);
  }

  if (!data?.success && data?.error) {
    // Also check for existing user in success=false case
    if (data.error.includes("already") && data.error.includes("registered")) {
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", params.email)
        .maybeSingle();

      if (existingProfile?.id) {
        return existingProfile.id;
      }
    }
    throw new Error(data.error);
  }

  const userId = data?.user_id;
  if (!userId) {
    throw new Error("User created but no ID returned");
  }

  return userId;
}

/**
 * Main function to create an investor with all wizard data
 * Returns a result object instead of showing toasts directly
 * @param wizardData - The wizard form data
 * @param onProgress - Optional callback for progress updates (UI layer handles toasts)
 */
export async function createInvestorWithWizard(
  wizardData: WizardFormData,
  onProgress?: WizardProgressCallback
): Promise<WizardResult> {
  const { identity, ib, fees, reportEmails } = wizardData;

  try {
    let ibParentId: string | null = null;

    // Step 1: Create new IB if requested
    if (ib.enabled && ib.createNewIb && ib.newIb?.email) {
      onProgress?.("Creating IB account...", "info");
      ibParentId = await createIBUser({
        email: ib.newIb.email,
        firstName: ib.newIb.first_name || "",
        lastName: ib.newIb.last_name || "",
      });
    } else if (ib.enabled && ib.existingIbId) {
      ibParentId = ib.existingIbId;
    }

    // Step 2: Create investor user
    onProgress?.("Creating investor account...", "info");
    const investorId = await createInvestorUser({
      email: identity.email,
      firstName: identity.first_name,
      lastName: identity.last_name,
      status: identity.status,
      feePct: fees.investor_fee_pct,
    });

    // Step 3: Update profile with IB linkage (fee_pct and ib_percentage are now in schedule tables)
    const profileUpdate: Record<string, any> = {
      entity_type: identity.entity_type,
      status: identity.status,
    };

    if (ibParentId) {
      profileUpdate.ib_parent_id = ibParentId;
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .update(profileUpdate)
      .eq("id", investorId);

    if (profileError) {
      logWarn("createInvestorWithWizard.profileUpdate", {
        investorId,
        error: profileError.message,
      });
      // Don't throw - investor is created, just log warning
    }

    // Step 4: Create fee schedule entry
    const { error: feeError } = await supabase.from("investor_fee_schedule").insert({
      investor_id: investorId,
      fee_pct: fees.investor_fee_pct,
      effective_date: getTodayString(),
    });

    if (feeError) {
      logWarn("createInvestorWithWizard.feeSchedule", { investorId, error: feeError.message });
    }

    // Step 4b: Create IB commission schedule entry if IB is linked
    if (ibParentId && fees.ib_commission_pct > 0) {
      const { error: ibError } = await supabase.from("ib_commission_schedule").insert({
        investor_id: investorId,
        ib_percentage: fees.ib_commission_pct,
        effective_date: getTodayString(),
      });

      if (ibError) {
        logWarn("createInvestorWithWizard.ibSchedule", { investorId, error: ibError.message });
      }
    }

    // Step 5: Save report recipient emails
    if (reportEmails.length > 0) {
      const emailRecords = reportEmails.map((email, index) => ({
        investor_id: investorId,
        email: email.toLowerCase(),
        is_primary: index === 0,
        verified: false,
      }));

      const { error: emailError } = await supabase.from("investor_emails").insert(emailRecords);

      if (emailError) {
        logWarn("createInvestorWithWizard.reportEmails", { investorId, error: emailError.message });
      }
    }

    onProgress?.(
      `Investor ${identity.first_name} ${identity.last_name} created successfully`,
      "success"
    );
    return { success: true, investorId };
  } catch (error) {
    logError("createInvestorWithWizard", error, { email: identity.email });
    const message = error instanceof Error ? error.message : "Failed to create investor";
    onProgress?.(message, "error");
    return { success: false, error: message };
  }
}
