import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.3";

// CORS headers for web app access
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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

interface UpdateInvestorProfileRequest {
  investorId: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  status?: string;
}

interface UpdateReportRecipientsRequest {
  investorId: string;
  emails: string[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Note: CSRF protection is not needed for token-based auth (JWT)
    // The Authorization header with Bearer token provides sufficient protection

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
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();
    
    const isAdmin = profile?.is_admin;
    if (profileError || !isAdmin) {
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
      case "updateInvestorProfile":
        result = await updateInvestorProfile(params as UpdateInvestorProfileRequest);
        break;
      case "updateReportRecipients":
        result = await updateReportRecipients(params as UpdateReportRecipientsRequest);
        break;
      case "deleteUser":
        result = await deleteUser(params.userId as string, user.id);
        break;
      case "forceDeleteUser":
        result = await forceDeleteUser(params.userId as string, user.id);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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

  // Create profile record directly using admin client (bypasses RLS)
  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .insert({
      id: newUser.user.id,
      email: email,
      first_name: firstName,
      last_name: lastName,
      phone: phone || null,
      is_admin: role === "admin",
      status: "active",
      fee_percentage: 0.20, // 20% default fee
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

async function deleteUser(userId: string, adminUserId: string): Promise<any> {
  console.log(`Deleting user ${userId} by admin ${adminUserId}`);

  // Prevent self-deletion
  if (userId === adminUserId) {
    throw new Error("Cannot delete your own account");
  }

  // Check if user exists in profiles table first
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("id, email")
    .eq("id", userId)
    .single();

  if (profileError || !profile) {
    throw new Error("User not found in profiles");
  }

  // Check for active positions that would block deletion
  const { data: positions } = await supabaseAdmin
    .from("investor_positions")
    .select("fund_id, current_value")
    .eq("investor_id", userId);

  const activePositions = positions?.filter(p => p.current_value > 0) || [];
  if (activePositions.length > 0) {
    throw new Error("Cannot delete investor with active fund positions. Please redeem all positions first.");
  }

  // Check if auth user exists
  const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId);
  
  // Delete auth user if it exists
  if (userData?.user) {
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.warn(`Failed to delete auth user: ${deleteError.message}`);
    }
  } else {
    console.log(`No auth user found for ${userId}, cleaning up profile only`);
  }

  // Manually delete profile if cascade didn't handle it
  const { error: profileDeleteError } = await supabaseAdmin
    .from("profiles")
    .delete()
    .eq("id", userId);

  if (profileDeleteError) {
    throw new Error(`Failed to delete profile: ${profileDeleteError.message}`);
  }

  console.log(`Successfully deleted user ${userId}`);

  return {
    success: true,
    user_id: userId,
    message: "User deleted successfully",
  };
}

async function forceDeleteUser(userId: string, adminUserId: string): Promise<any> {
  console.log(`Force deleting user ${userId} by admin ${adminUserId}`);

  // Prevent self-deletion
  if (userId === adminUserId) {
    throw new Error("Cannot delete your own account");
  }

  // Call the database function to clean up all related data
  const { error: rpcError } = await supabaseAdmin.rpc('force_delete_investor', {
    p_investor_id: userId,
    p_admin_id: adminUserId
  });

  if (rpcError) {
    console.error("RPC error:", rpcError);
    throw new Error(`Failed to delete investor data: ${rpcError.message}`);
  }

  // Delete auth user
  const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (userData?.user) {
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authError) {
      console.warn(`Auth user deletion warning: ${authError.message}`);
    }
  }

  console.log(`Successfully force deleted user ${userId}`);

  return {
    success: true,
    user_id: userId,
    message: "Investor force deleted successfully",
  };
}

async function updateInvestorProfile(params: UpdateInvestorProfileRequest): Promise<any> {
  const { investorId, firstName, lastName, phone, status } = params;

  console.log(`Updating investor profile for ${investorId}`);

  // Validate required fields
  if (!firstName?.trim() || !lastName?.trim()) {
    throw new Error("First name and last name are required");
  }

  // Validate status if provided
  const validStatuses = ["active", "inactive", "pending"];
  if (status && !validStatuses.includes(status)) {
    throw new Error(`Invalid status. Must be one of: ${validStatuses.join(", ")}`);
  }

  // Update profile
  const updateData: Record<string, any> = {
    first_name: firstName.trim(),
    last_name: lastName.trim(),
    updated_at: new Date().toISOString(),
  };

  if (phone !== undefined) {
    updateData.phone = phone?.trim() || null;
  }

  if (status) {
    updateData.status = status;
  }

  const { error: updateError } = await supabaseAdmin
    .from("profiles")
    .update(updateData)
    .eq("id", investorId);

  if (updateError) {
    throw new Error(`Failed to update profile: ${updateError.message}`);
  }

  console.log(`Successfully updated profile for ${investorId}`);

  return {
    success: true,
    investor_id: investorId,
    message: "Investor profile updated successfully",
  };
}

async function updateReportRecipients(params: UpdateReportRecipientsRequest): Promise<any> {
  const { investorId, emails } = params;

  console.log(`Updating report recipients for investor ${investorId}`);

  // Validate emails
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const validEmails: string[] = [];
  const seen = new Set<string>();

  for (const email of emails) {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) continue;
    
    if (!emailRegex.test(trimmed)) {
      throw new Error(`Invalid email format: ${email}`);
    }
    
    if (seen.has(trimmed)) {
      continue; // Skip duplicates silently
    }
    
    seen.add(trimmed);
    validEmails.push(trimmed);
  }

  // Delete existing recipients for this investor
  const { error: deleteError } = await supabaseAdmin
    .from("investor_emails")
    .delete()
    .eq("investor_id", investorId);

  if (deleteError) {
    throw new Error(`Failed to clear existing recipients: ${deleteError.message}`);
  }

  // Insert new recipients
  if (validEmails.length > 0) {
    const insertData = validEmails.map((email, index) => ({
      investor_id: investorId,
      email,
      is_primary: index === 0,
    }));

    const { error: insertError } = await supabaseAdmin
      .from("investor_emails")
      .insert(insertData);

    if (insertError) {
      throw new Error(`Failed to add recipients: ${insertError.message}`);
    }
  }

  console.log(`Successfully updated ${validEmails.length} report recipients for ${investorId}`);

  return {
    success: true,
    investor_id: investorId,
    recipients_count: validEmails.length,
    message: `Report recipients updated successfully (${validEmails.length} emails)`,
  };
}
