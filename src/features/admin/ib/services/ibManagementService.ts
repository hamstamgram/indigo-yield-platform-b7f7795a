/**
 * IB Management Service
 * Handles IB role assignment and management
 */

import { supabase } from "@/integrations/supabase/client";
import { db } from "@/lib/db/index";

async function createIB(
  email: string,
  firstName: string = "",
  lastName: string = ""
): Promise<{ userId: string }> {
  const { data: existingProfile, error: checkError } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (checkError) throw checkError;

  if (!existingProfile) {
    const { data, error } = await supabase.functions.invoke("admin-user-management", {
      body: {
        action: "createIB",
        email,
        firstName,
        lastName,
      },
    });

    if (error) throw error;
    if (!data?.success) throw new Error(data?.error || "Failed to create IB via edge function");

    return { userId: data.user_id };
  }

  const userId = existingProfile.id;

  const { data: existingRole } = await supabase
    .from("user_roles")
    .select("id")
    .eq("user_id", userId)
    .eq("role", "ib")
    .maybeSingle();

  if (existingRole) {
    throw new Error("This user is already an IB.");
  }

  const { error: roleError } = await db.insert("user_roles", {
    user_id: userId,
    role: "ib",
  });

  if (roleError) throw new Error(roleError.userMessage);

  return { userId };
}

async function createIBRole(
  email: string,
  firstName: string = "",
  lastName: string = ""
): Promise<{ userId: string }> {
  return createIB(email, firstName, lastName);
}

async function assignIBRoleToUser(userId: string): Promise<{ alreadyExists: boolean }> {
  const { error } = await db.insert("user_roles", {
    user_id: userId,
    role: "ib",
  });

  if (error) {
    if (error.code === "23505") {
      return { alreadyExists: true };
    }
    throw new Error(error.message || error.userMessage);
  }

  return { alreadyExists: false };
}

async function removeIBRole(userId: string): Promise<void> {
  const { error } = await supabase
    .from("user_roles")
    .delete()
    .eq("user_id", userId)
    .eq("role", "ib");

  if (error) throw error;
}

async function hasIBRole(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("id")
    .eq("user_id", userId)
    .eq("role", "ib")
    .maybeSingle();

  if (error) throw error;
  return !!data;
}

async function getIBRoles(): Promise<Array<{ user_id: string; role: string }>> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("user_id, role")
    .eq("role", "ib");

  if (error) throw error;
  return data || [];
}

async function getProfilesByIds(userIds: string[]): Promise<
  Array<{
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    created_at: string;
  }>
> {
  if (!userIds.length) return [];

  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name, created_at")
    .in("id", userIds);

  if (error) throw error;
  return data || [];
}

async function getReferralsByParentIds(parentIds: string[]): Promise<
  Array<{
    id: string;
    ib_parent_id: string | null;
  }>
> {
  if (!parentIds.length) return [];

  const { data, error } = await supabase
    .from("profiles")
    .select("id, ib_parent_id")
    .in("ib_parent_id", parentIds);

  if (error) throw error;
  return data || [];
}

async function getIBCredits(ibUserIds: string[]): Promise<
  Array<{
    investor_id: string;
    fund_id: string;
    asset: string;
    amount: string;
  }>
> {
  if (!ibUserIds.length) return [];

  const { data, error } = await supabase
    .from("transactions_v2")
    .select("investor_id, fund_id, asset, amount")
    .in("investor_id", ibUserIds)
    .eq("type", "IB_CREDIT")
    .eq("is_voided", false)
    .neq("purpose", "transaction");

  if (error) throw error;
  return (data || []).map((row) => ({
    investor_id: row.investor_id,
    fund_id: row.fund_id ?? "",
    asset: row.asset ?? "",
    amount: String(row.amount || "0"),
  }));
}

async function getIBAllocations(ibUserIds: string[]): Promise<
  Array<{
    ib_investor_id: string;
    fund_id: string | null;
    ib_fee_amount: string;
    source_investor_name: string | null;
  }>
> {
  if (!ibUserIds.length) return [];

  const { data, error } = await supabase
    .from("ib_allocations")
    .select(
      "ib_investor_id, fund_id, ib_fee_amount, source_investor_id, source_investor:profiles!ib_allocations_source_investor_id_fkey(first_name, last_name)"
    )
    .in("ib_investor_id", ibUserIds)
    .eq("is_voided", false)
    .neq("purpose", "transaction")
    .limit(1000);

  if (error) throw error;
  return (data || []).map((row) => {
    const profile = (row as Record<string, unknown>).source_investor as {
      first_name?: string;
      last_name?: string;
    } | null;
    return {
      ib_investor_id: row.ib_investor_id,
      fund_id: row.fund_id,
      ib_fee_amount: String(row.ib_fee_amount || "0"),
      source_investor_name: profile
        ? [profile.first_name, profile.last_name].filter(Boolean).join(" ") || null
        : null,
    };
  });
}

export const ibManagementService = {
  createIB,
  createIBRole,
  assignIBRoleToUser,
  removeIBRole,
  hasIBRole,
  getIBRoles,
  getProfilesByIds,
  getReferralsByParentIds,
  getIBCredits,
  getIBAllocations,
};
