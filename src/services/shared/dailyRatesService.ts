import { supabase } from "@/integrations/supabase/client";

export interface DailyRate {
  id?: string;
  rate_date: string;
  btc_rate: number;
  eth_rate: number;
  sol_rate: number;
  usdt_rate: number;
  eurc_rate: number;
  xaut_rate: number;
  xrp_rate: number;
  notes?: string | null;
  created_by?: string;
}

class DailyRatesService {
  /**
   * Fetch a single daily rate by date
   */
  async getByDate(date: string): Promise<DailyRate | null> {
    const { data, error } = await supabase
      .from("daily_rates" as any)
      .select("*")
      .eq("rate_date", date)
      .maybeSingle();

    if (error && error.code !== "PGRST116") throw error;
    return data as unknown as DailyRate | null;
  }

  /**
   * Fetch recent daily rates
   */
  async getRecent(limit = 7): Promise<DailyRate[]> {
    const { data, error } = await supabase
      .from("daily_rates" as any)
      .select("*")
      .order("rate_date", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []) as unknown as DailyRate[];
  }

  /**
   * Upsert daily rates for a given date
   */
  async upsert(rates: Omit<DailyRate, "id">): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No authenticated user");

    const rateData = {
      ...rates,
      created_by: user.id,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("daily_rates" as any).upsert(rateData, {
      onConflict: "rate_date",
    });

    if (error) throw error;
  }

  /**
   * Send notification about daily rates to all investors
   */
  async sendNotificationToInvestors(rates: DailyRate): Promise<{ count: number }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No authenticated user");

    // Get all active investors
    const { data: investors, error: investorsError } = await supabase
      .from("profiles")
      .select("id")
      .eq("status", "active")
      .eq("is_admin", false);

    if (investorsError) throw investorsError;
    if (!investors || investors.length === 0) return { count: 0 };

    // Create notification records
    const notifications = investors.map((inv) => ({
      user_id: inv.id,
      type: "system",
      title: "Daily Rate Update",
      body: `New daily rates have been published for ${rates.rate_date}`,
      data_jsonb: {
        rates,
        date: rates.rate_date,
      },
      created_at: new Date().toISOString(),
    }));

    const { error: insertError } = await supabase
      .from("notifications" as any)
      .insert(notifications);

    if (insertError) throw insertError;

    return { count: notifications.length };
  }
}

export const dailyRatesService = new DailyRatesService();
