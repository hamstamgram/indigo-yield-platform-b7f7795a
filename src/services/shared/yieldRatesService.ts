import { supabase } from "@/integrations/supabase/client";

export interface Asset {
  id: number;
  symbol: string;
  name: string;
}

export interface YieldRate {
  id: string;
  asset_id: number;
  daily_yield_percentage: number;
  date: string;
  asset_symbol?: string;
  asset_name?: string;
}

class YieldRatesService {
  /**
   * Fetch all assets
   */
  async getAssets(): Promise<Asset[]> {
    const { data, error } = await supabase
      .from("assets")
      .select("id, symbol, name")
      .order("name");

    if (error) throw error;
    return data || [];
  }

  /**
   * Fetch yield rates for a specific date
   */
  async getByDate(date: string): Promise<YieldRate[]> {
    const { data, error } = await supabase
      .from("yield_rates")
      .select("id, asset_id, daily_yield_percentage, date")
      .eq("date", date);

    if (error) throw error;
    return data || [];
  }

  /**
   * Fetch yield rates with asset info for a specific date
   */
  async getEnrichedByDate(date: string): Promise<YieldRate[]> {
    const [assets, rates] = await Promise.all([
      this.getAssets(),
      this.getByDate(date),
    ]);

    if (rates.length > 0) {
      return rates.map((rate) => {
        const asset = assets.find((a) => a.id === rate.asset_id);
        return {
          ...rate,
          asset_symbol: (asset?.symbol || "").toUpperCase(),
          asset_name: asset?.name || "",
        };
      });
    }

    // Create default entries for all assets with 0% yield
    return assets.map((asset) => ({
      id: "",
      asset_id: asset.id,
      asset_symbol: (asset.symbol || "").toUpperCase(),
      asset_name: asset.name,
      daily_yield_percentage: 0,
      date,
    }));
  }

  /**
   * Update an existing yield rate
   */
  async update(id: string, dailyYieldPercentage: number): Promise<void> {
    const { error } = await supabase
      .from("yield_rates")
      .update({ daily_yield_percentage: dailyYieldPercentage })
      .eq("id", id);

    if (error) throw error;
  }

  /**
   * Insert a new yield rate
   */
  async insert(assetId: number, dailyYieldPercentage: number, date: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from("yield_rates").insert({
      asset_id: assetId,
      daily_yield_percentage: dailyYieldPercentage,
      date,
      entered_by: user?.id,
    });

    if (error) throw error;
  }

  /**
   * Save multiple yield rates (update or insert)
   */
  async saveAll(rates: YieldRate[], date: string): Promise<void> {
    for (const rate of rates) {
      if (rate.id) {
        await this.update(rate.id, rate.daily_yield_percentage);
      } else {
        await this.insert(rate.asset_id, rate.daily_yield_percentage, date);
      }
    }
  }
}

export const yieldRatesService = new YieldRatesService();
