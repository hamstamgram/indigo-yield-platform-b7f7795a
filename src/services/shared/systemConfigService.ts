import { supabase } from "@/integrations/supabase/client";
import { logError } from "@/lib/logger";
import { db } from "@/lib/db/index";

export interface PlatformSettings {
  maintenance_mode: boolean;
  allow_new_registrations: boolean;
  require_email_verification: boolean;
  enable_2fa: boolean;
  min_deposit: number;
  min_withdrawal: number;
  notification_email: string;
  support_email: string;
  platform_name: string;
}

export const defaultPlatformSettings: PlatformSettings = {
  maintenance_mode: false,
  allow_new_registrations: true,
  require_email_verification: true,
  enable_2fa: false,
  min_deposit: 1000,
  min_withdrawal: 100,
  notification_email: "notifications@indigo.fund",
  support_email: "support@indigo.fund",
  platform_name: "Indigo Yield Platform",
};

async function getConfig<T = any>(key: string): Promise<T | null> {
  const { data, error } = await supabase
    .from("system_config")
    .select("key, value")
    .eq("key", key)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    logError("systemConfig.getConfig", error, { key });
    return null;
  }

  return data?.value as T | null;
}

async function getPlatformSettings(): Promise<PlatformSettings> {
  const value = await getConfig<PlatformSettings>("platform_settings");
  return { ...defaultPlatformSettings, ...(value || {}) };
}

async function upsertConfig<T = any>(key: string, value: T): Promise<void> {
  const { error } = await db.upsert("system_config", {
    key,
    value: value as any,
    updated_at: new Date().toISOString(),
  } as any);

  if (error) throw new Error(error.userMessage || error.message);
}

async function savePlatformSettings(settings: PlatformSettings): Promise<void> {
  await upsertConfig("platform_settings", settings);
}

export const systemConfigService = {
  getConfig,
  getPlatformSettings,
  upsertConfig,
  savePlatformSettings,
};
