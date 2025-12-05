import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.3";

// Secure CORS configuration
const allowedOrigins = Deno.env.get("ALLOWED_ORIGINS")?.split(",") || [];
const corsHeaders = (origin: string | null) => ({
  "Access-Control-Allow-Origin":
    origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0] || "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-csrf-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
});

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Create admin client with service role key
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Create regular client for RLS-enabled operations
const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);

interface CreateUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: "LP" | "admin";
  selectedFunds: string[];
  sendWelcomeEmail: boolean;
}

interface UpdateUserRequest {
  userId: string;
  fundPreferences: string[];
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  const headers = corsHeaders(origin);

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers });
  }

  try {
    // CSRF validation for state-changing operations
    const csrfToken = req.headers.get("x-csrf-token");
    if (!csrfToken || csrfToken.length < 32) {
      return new Response(JSON.stringify({ success: false, error: "Invalid CSRF token" }), {
        headers: { ...headers, "Content-Type": "application/json" },
        status: 403,
      });
    }

    // Verify the request is from an authenticated admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    // Verify user from token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error("Invalid authorization token");
    }

    // Check admin status
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();
    
    const isAdmin = profile?.is_admin;
    if (adminCheckError || !isAdmin) {
      throw new Error("Admin access required");
    }

    const { action, ...params } = await req.json();

    let result;

    switch (action) {
      case "createUser":
        result = await createUser(params as CreateUserRequest);
        break;
      case "updateUser":
        result = await updateUser(params as UpdateUserRequest);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...headers, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in admin-user-management function:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 400,
        headers: { ...headers, "Content-Type": "application/json" },
      }
    );
  }
});

async function createUser(params: CreateUserRequest): Promise<any> {
  const { email, firstName, lastName, phone, role, selectedFunds, sendWelcomeEmail } = params;

  console.log(`Creating user account for ${email} with role ${role}`);

  // Create user via Supabase Admin API (secure server-side)
  const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    email_confirm: false, // Will be confirmed via invite link
    user_metadata: {
      first_name: firstName,
      last_name: lastName,
      phone: phone || null,
      is_admin: role === "admin",
      created_by_admin: true,
    },
  });

  if (createError) {
    throw new Error(`Failed to create user: ${createError.message}`);
  }

  if (!newUser.user) {
    throw new Error("User creation failed - no user returned");
  }

  console.log(`Created user with ID: ${newUser.user.id}`);

  // Create profile record using secure RPC
  const { error: profileError } = await supabase.rpc("create_investor_profile", {
    p_email: email,
    p_first_name: firstName,
    p_last_name: lastName,
    p_phone: phone,
    p_send_invite: sendWelcomeEmail,
  });

  if (profileError) {
    // Clean up the auth user if profile creation fails
    await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
    throw new Error(`Failed to create profile: ${profileError.message}`);
  }

  // Store fund preferences if LP role
  if (role === "LP" && selectedFunds.length > 0) {
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(newUser.user.id, {
      user_metadata: {
        ...newUser.user.user_metadata,
        fund_preferences: selectedFunds,
      },
    });

    if (updateError) {
      console.warn("Failed to store fund preferences:", updateError);
    }
  }

  // Generate invite code
  const inviteCode = `invite_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

  // Create admin invite record
  const { data: invite, error: inviteError } = await supabase
    .from("admin_invites")
    .insert({
      email: email,
      invite_code: inviteCode,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (inviteError) {
    console.warn("Failed to create invite record:", inviteError);
  }

  // Send welcome email if requested
  if (sendWelcomeEmail) {
    try {
      const { error: notificationError } = await supabase.functions.invoke("ef_send_notification", {
        body: {
          user_id: newUser.user.id,
          type: "system",
          title: "Welcome to Indigo Yield",
          body: `Your investor account has been created. Please check your email for setup instructions.`,
          data: {
            invite_code: inviteCode,
            expires_at: expiresAt.toISOString(),
          },
          send_email: true,
        },
      });

      if (notificationError) {
        console.warn("Failed to send welcome notification:", notificationError);
      }
    } catch (emailError) {
      console.warn("Email sending failed:", emailError);
    }
  }

  console.log(`Successfully created investor account for ${email}`);

  return {
    success: true,
    user_id: newUser.user.id,
    email: email,
    invite_code: inviteCode,
    message: `Investor account created successfully for ${email}. ${sendWelcomeEmail ? "Welcome email sent." : "No email sent."}`,
    invite_id: invite?.id,
  };
}

async function updateUser(params: UpdateUserRequest): Promise<any> {
  const { userId, fundPreferences } = params;

  console.log(`Updating user ${userId} fund preferences`);

  // Get current user metadata
  const { data: userData, error: getUserError } =
    await supabaseAdmin.auth.admin.getUserById(userId);
  if (getUserError || !userData.user) {
    throw new Error("User not found");
  }

  // Update fund preferences
  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    user_metadata: {
      ...userData.user.user_metadata,
      fund_preferences: fundPreferences,
    },
  });

  if (updateError) {
    throw new Error(`Failed to update user: ${updateError.message}`);
  }

  return {
    success: true,
    user_id: userId,
    message: "User updated successfully",
  };
}
