/**
 * Profile Settings Service
 * Handles user profile and preferences operations
 */

import { supabase } from "@/integrations/supabase/client";
import { logWarn } from "@/lib/logger";

export interface PersonalInfo {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  avatar_url: string | null;
}

export interface NotificationPreferences {
  emailStatements: boolean;
  emailPerformance: boolean;
  emailAlerts: boolean;
  emailMarketing: boolean;
  pushEnabled: boolean;
  digestFrequency: "daily" | "weekly" | "monthly";
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  emailStatements: true,
  emailPerformance: true,
  emailAlerts: true,
  emailMarketing: false,
  pushEnabled: true,
  digestFrequency: "weekly",
};

/**
 * Get personal info for a user
 */
export async function getPersonalInfo(userId: string): Promise<PersonalInfo | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, phone, email, avatar_url")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Update personal info for a user
 */
export async function updatePersonalInfo(
  userId: string,
  updates: {
    first_name?: string;
    last_name?: string;
    phone?: string;
    avatar_url?: string;
  }
): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) throw error;
}

/**
 * Get notification preferences for a user
 */
export async function getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
  const { data } = await supabase
    .from("profiles")
    .select("preferences")
    .eq("id", userId)
    .maybeSingle();

  const prefs = data?.preferences as Record<string, unknown> | null;
  if (prefs && typeof prefs === "object" && "notifications" in prefs) {
    const notifications = prefs.notifications as Partial<NotificationPreferences>;
    return {
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      ...notifications,
    };
  }

  return DEFAULT_NOTIFICATION_PREFERENCES;
}

/**
 * Update notification preferences for a user
 */
export async function updateNotificationPreferences(
  userId: string,
  preferences: NotificationPreferences
): Promise<void> {
  // Fetch current preferences first
  const { data: profile } = await supabase
    .from("profiles")
    .select("preferences")
    .eq("id", userId)
    .maybeSingle();

  const currentPrefs = (profile?.preferences as Record<string, unknown>) || {};

  // Merge notification preferences
  const { error } = await supabase
    .from("profiles")
    .update({
      preferences: {
        ...currentPrefs,
        notifications: preferences,
      } as any,
    })
    .eq("id", userId);

  if (error) throw error;
}

/**
 * Change user password
 * @deprecated Use updatePassword from authService.ts instead
 */
export async function changePassword(newPassword: string): Promise<void> {
  const { updatePassword } = await import("@/services/auth/authService");
  return updatePassword(newPassword);
}

/**
 * Get user email
 */
export async function getUserEmail(): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.email ?? null;
}

/**
 * Save user preferences to localStorage (for preferences not stored in DB)
 */
export function saveLocalPreferences(preferences: Record<string, unknown>): void {
  localStorage.setItem("user_preferences", JSON.stringify(preferences));
}

/**
 * Load user preferences from localStorage
 */
export function loadLocalPreferences(): Record<string, unknown> | null {
  const saved = localStorage.getItem("user_preferences");
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      logWarn("profileSettings.loadLocalPreferences", {
        error: "Failed to parse saved preferences",
      });
      return null;
    }
  }
  return null;
}
