import { supabase } from "@/integrations/supabase/client";
import { WizardFormData } from "@/components/admin/investors/wizard/types";
import { toast } from "sonner";
import { addCsrfHeader } from "@/lib/security/csrf";

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
    console.error("Error creating IB:", error);
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
      },
      headers: addCsrfHeader({}),
    }
  );

  if (error) {
    // Check if user already exists
    let errorMessage = error.message || "Failed to create investor";
    
    try {
      if (error.context && typeof error.context.json === 'function') {
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
        console.log("Found existing user, reusing:", existingProfile.id);
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
 */
export async function createInvestorWithWizard(wizardData: WizardFormData): Promise<string> {
  const { identity, ib, fees, positions, reportEmails } = wizardData;

  try {
    let ibParentId: string | null = null;

    // Step 1: Create new IB if requested
    if (ib.enabled && ib.createNewIb && ib.newIb?.email) {
      toast.info("Creating IB account...");
      ibParentId = await createIBUser({
        email: ib.newIb.email,
        firstName: ib.newIb.first_name || "",
        lastName: ib.newIb.last_name || "",
      });
    } else if (ib.enabled && ib.existingIbId) {
      ibParentId = ib.existingIbId;
    }

    // Step 2: Create investor user
    toast.info("Creating investor account...");
    const investorId = await createInvestorUser({
      email: identity.email,
      firstName: identity.first_name,
      lastName: identity.last_name,
      status: identity.status,
    });

    // Step 3: Update profile with IB linkage and fee settings
    const profileUpdate: Record<string, any> = {
      entity_type: identity.entity_type,
      status: identity.status,
      fee_percentage: fees.investor_fee_pct / 100, // Convert to decimal
    };

    if (ibParentId) {
      profileUpdate.ib_parent_id = ibParentId;
      profileUpdate.ib_percentage = fees.ib_commission_pct;
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .update(profileUpdate)
      .eq("id", investorId);

    if (profileError) {
      console.error("Profile update error:", profileError);
      // Don't throw - investor is created, just log warning
    }

    // Step 4: Create fee schedule entry
    const { error: feeError } = await supabase
      .from("investor_fee_schedule")
      .insert({
        investor_id: investorId,
        fee_pct: fees.investor_fee_pct,
        effective_date: new Date().toISOString().split("T")[0],
      });

    if (feeError) {
      console.error("Fee schedule error:", feeError);
    }

    // Step 5: Create initial positions via admin_create_transaction RPC
    // This ensures ledger transactions are always created alongside positions
    const positivePositions = Object.entries(positions).filter(([_, value]) => value > 0);

    if (positivePositions.length > 0) {
      // Get the effective date from wizard data (with fallback to today)
      const effectiveDate = wizardData.positionsEffectiveDate || new Date().toISOString().split("T")[0];
      
      // CRITICAL: Only select ACTIVE funds to prevent duplicate positions on deprecated funds
      const { data: allFunds } = await supabase
        .from("funds")
        .select("id, asset")
        .eq("status", "active")
        .in("asset", positivePositions.map(([s]) => s));

      // Deduplicate funds by asset - ensure only ONE fund per asset
      const fundsByAsset = new Map<string, { id: string; asset: string }>();
      allFunds?.forEach(fund => {
        if (!fundsByAsset.has(fund.asset)) {
          fundsByAsset.set(fund.asset, fund);
        }
      });
      const funds = Array.from(fundsByAsset.values());

      if (funds && funds.length > 0) {
        toast.info("Creating initial deposit transactions...");
        
        // Use admin_create_transaction RPC for each position
        // This ensures proper ledger entries and position updates
        for (const fund of funds) {
          const amount = positions[fund.asset] || 0;
          if (amount <= 0) continue;

          // Create deterministic reference_id for idempotency
          const referenceId = `init_deposit:${investorId}:${fund.id}:${effectiveDate}`;

          // Call admin_create_transaction RPC which handles both transaction creation
          // and position update atomically
          const { error: txError } = await (supabase.rpc as any)("admin_create_transaction", {
            p_investor_id: investorId,
            p_fund_id: fund.id,
            p_type: "DEPOSIT",
            p_amount: amount,
            p_tx_date: effectiveDate,
            p_notes: "Initial position on investor creation",
            p_reference_id: referenceId,
          });

          if (txError) {
            console.error(`Transaction creation error for ${fund.asset}:`, txError);
            // Fallback: try direct insert if RPC fails (for backwards compatibility)
            const { error: fallbackError } = await supabase
              .from("transactions_v2")
              .insert({
                investor_id: investorId,
                fund_id: fund.id,
                type: "DEPOSIT",
                asset: fund.asset,
                amount: amount,
                tx_date: effectiveDate,
                value_date: effectiveDate,
                notes: "Initial position on investor creation",
                source: "investor_wizard",
                is_system_generated: false,
                reference_id: referenceId,
                visibility_scope: "investor_visible",
              });

            if (fallbackError) {
              console.error("Fallback transaction creation also failed:", fallbackError);
            }

            // Also create/update position directly as fallback
            const { error: posError } = await supabase
              .from("investor_positions")
              .upsert({
                investor_id: investorId,
                fund_id: fund.id,
                current_value: amount,
                cost_basis: amount,
                shares: 0,
                fund_class: fund.asset,
              }, {
                onConflict: "investor_id,fund_id",
              });

            if (posError) {
              console.error("Fallback position creation also failed:", posError);
            }
          }
        }
      }
    }

    // Step 6: Save report recipient emails
    if (reportEmails.length > 0) {
      const emailRecords = reportEmails.map((email, index) => ({
        investor_id: investorId,
        email: email.toLowerCase(),
        is_primary: index === 0,
        verified: false,
      }));

      const { error: emailError } = await supabase
        .from("investor_emails")
        .insert(emailRecords);

      if (emailError) {
        console.error("Email save error:", emailError);
      }
    }

    toast.success(`Investor ${identity.first_name} ${identity.last_name} created successfully`);
    return investorId;
  } catch (error) {
    console.error("Wizard error:", error);
    const message = error instanceof Error ? error.message : "Failed to create investor";
    toast.error(message);
    throw error;
  }
}
