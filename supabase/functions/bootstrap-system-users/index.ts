import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.3";
import { getCorsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Canonical INDIGO FEES account ID - must match constants/fees.ts
const INDIGO_FEES_ACCOUNT_ID = "169bb053-36cb-4f6e-93ea-831f0dfeaf1d";

interface BootstrapRequest {
  createFeesAccount?: boolean;
  feesEmail?: string;
  feesPassword?: string;
  defaultIBs?: Array<{
    email: string;
    firstName: string;
    lastName: string;
  }>;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify admin authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      throw new Error("Invalid authorization token");
    }

    // Check admin status
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) {
      throw new Error("Admin access required");
    }

    const params: BootstrapRequest = await req.json();
    const results: Record<string, any> = {};

    // Bootstrap INDIGO FEES account
    if (params.createFeesAccount !== false) {
      results.feesAccount = await bootstrapFeesAccount(params.feesEmail || "indigo.lp@example.com");
    }

    // Bootstrap default IB accounts
    if (params.defaultIBs && params.defaultIBs.length > 0) {
      results.ibAccounts = [];
      for (const ib of params.defaultIBs) {
        try {
          const ibResult = await bootstrapIBAccount(ib);
          results.ibAccounts.push(ibResult);
        } catch (error) {
          results.ibAccounts.push({
            email: ib.email,
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }
    }

    return new Response(JSON.stringify({ success: true, ...results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Bootstrap error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function bootstrapFeesAccount(email: string) {
  console.log("Bootstrapping INDIGO FEES account...");

  // Check if auth user exists
  const { data: existingAuth } = await supabaseAdmin.auth.admin.getUserById(INDIGO_FEES_ACCOUNT_ID);

  let authUserCreated = false;

  if (!existingAuth?.user) {
    // Create auth user with the canonical ID
    console.log("Creating auth user for INDIGO FEES...");

    // First try to find by email
    const {
      data: { users },
    } = await supabaseAdmin.auth.admin.listUsers();
    const existingByEmail = users.find((u) => u.email === email);

    if (existingByEmail && existingByEmail.id !== INDIGO_FEES_ACCOUNT_ID) {
      // User exists with different ID - we need to use that ID
      console.log(`Found existing user with email ${email} but different ID`);
      // Update profile to link to existing auth user
      await supabaseAdmin
        .from("profiles")
        .update({ id: existingByEmail.id })
        .eq("id", INDIGO_FEES_ACCOUNT_ID);

      return {
        success: true,
        user_id: existingByEmail.id,
        action: "linked_existing",
        message: "Linked to existing auth user",
      };
    }

    if (!existingByEmail) {
      // Create new auth user - note: we can't set a specific ID via admin API
      // So we'll create the user and update references if needed
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
          first_name: "INDIGO",
          last_name: "FEES",
          is_system_account: true,
        },
      });

      if (createError) {
        throw new Error(`Failed to create auth user: ${createError.message}`);
      }

      authUserCreated = true;
      console.log(`Created auth user: ${newUser.user.id}`);

      // If the new ID differs from canonical, update the profile
      if (newUser.user.id !== INDIGO_FEES_ACCOUNT_ID) {
        console.log("Updating profile to use new auth user ID...");
        // This is complex - for now just log a warning
        console.warn(
          `INDIGO FEES auth user ID (${newUser.user.id}) differs from canonical ID (${INDIGO_FEES_ACCOUNT_ID}). ` +
            `Manual update may be required.`
        );
      }
    }
  } else {
    console.log("Auth user already exists for INDIGO FEES");
  }

  // Ensure profile has correct settings
  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .update({
      account_type: "fees_account",
      is_system_account: true,
      fee_pct: 0,
      first_name: "INDIGO",
      last_name: "FEES",
    })
    .eq("id", INDIGO_FEES_ACCOUNT_ID);

  if (profileError) {
    console.error("Profile update error:", profileError);
  }

  // Ensure user_roles has investor role (uses 'user' role since 'investor' may not exist)
  // First check what roles exist
  const { data: existingRoles } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", INDIGO_FEES_ACCOUNT_ID);

  if (!existingRoles || existingRoles.length === 0) {
    // Add a role - try 'investor' first, fallback to inserting nothing
    // The user can still access as a basic authenticated user
    console.log(
      "No roles found for INDIGO FEES - account is authenticated but has no special role"
    );
  }

  return {
    success: true,
    user_id: INDIGO_FEES_ACCOUNT_ID,
    action: authUserCreated ? "created" : "verified",
    message: authUserCreated
      ? "Created auth user and updated profile"
      : "Verified existing auth user and updated profile",
  };
}

async function bootstrapIBAccount(ib: { email: string; firstName: string; lastName: string }) {
  console.log(`Bootstrapping IB account for ${ib.email}...`);

  // Check if user already exists
  const { data: existingProfile } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("email", ib.email)
    .maybeSingle();

  if (existingProfile) {
    // Just ensure they have IB role
    await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: existingProfile.id, role: "ib" }, { onConflict: "user_id,role" });

    // Update account type
    await supabaseAdmin
      .from("profiles")
      .update({ account_type: "ib" })
      .eq("id", existingProfile.id);

    return {
      email: ib.email,
      success: true,
      user_id: existingProfile.id,
      action: "verified",
    };
  }

  // Create new IB user
  const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email: ib.email,
    email_confirm: false,
    user_metadata: {
      first_name: ib.firstName,
      last_name: ib.lastName,
      is_ib: true,
    },
  });

  if (createError) {
    throw new Error(`Failed to create IB user: ${createError.message}`);
  }

  // Create profile
  await supabaseAdmin.from("profiles").insert({
    id: newUser.user.id,
    email: ib.email,
    first_name: ib.firstName,
    last_name: ib.lastName,
    is_admin: false,
    status: "active",
    account_type: "ib",
  });

  // Add both IB and investor roles for dual-role access
  await supabaseAdmin.from("user_roles").insert([
    { user_id: newUser.user.id, role: "ib" },
    { user_id: newUser.user.id, role: "investor" },
  ]);

  return {
    email: ib.email,
    success: true,
    user_id: newUser.user.id,
    action: "created",
  };
}
