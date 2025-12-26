import { supabase } from "@/integrations/supabase/client";

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

class SystemConfigService {
  /**
   * Get a config value by key
   */
  async getConfig<T = any>(key: string): Promise<T | null> {
    const { data, error } = await supabase
      .from("system_config")
      .select("key, value")
      .eq("key", key)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching config:", error);
      return null;
    }

    return data?.value as T | null;
  }

  /**
   * Get platform settings with defaults
   */
  async getPlatformSettings(): Promise<PlatformSettings> {
    const value = await this.getConfig<PlatformSettings>("platform_settings");
    return { ...defaultPlatformSettings, ...(value || {}) };
  }

  /**
   * Upsert a config value
   */
  async upsertConfig<T = any>(key: string, value: T): Promise<void> {
    const { error } = await supabase.from("system_config").upsert({
      key,
      value: value as any,
      updated_at: new Date().toISOString(),
    });

    if (error) throw error;
  }

  /**
   * Save platform settings
   */
  async savePlatformSettings(settings: PlatformSettings): Promise<void> {
    await this.upsertConfig("platform_settings", settings);
  }
}

export const systemConfigService = new SystemConfigService();
