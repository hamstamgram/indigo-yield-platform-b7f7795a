import { supabase } from "@/integrations/supabase/client";
import { db } from "@/lib/db";

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
    const { data, error } = await supabase.from("assets").select("id, symbol, name").order("name");

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
    const [assets, rates] = await Promise.all([this.getAssets(), this.getByDate(date)]);

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
    const result = await db.update(
      "yield_rates",
      { daily_yield_percentage: dailyYieldPercentage },
      { column: "id", value: id }
    );

    if (result.error) {
      throw new Error(result.error.userMessage);
    }
  }

  /**
   * Insert a new yield rate
   */
  async insert(assetId: number, dailyYieldPercentage: number, date: string): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const result = await db.insert("yield_rates", {
      asset_id: assetId,
      daily_yield_percentage: dailyYieldPercentage,
      date,
      entered_by: user?.id || null,
    });

    if (result.error) {
      throw new Error(result.error.userMessage);
    }
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
