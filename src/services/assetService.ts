import { supabase } from "@/integrations/supabase/client";
import type { Asset, AssetFormData, AssetPrice, AssetPriceFormData } from "@/types/asset";

export class AssetService {
  async getAssets(filters?: {
    kind?: string;
    is_active?: boolean;
    search?: string;
  }): Promise<Asset[]> {
    let query = supabase
      .from("assets_v2")
      .select("*")
      .order("created_at", { ascending: false });

    if (filters?.kind) {
      query = query.eq("kind", filters.kind);
    }

    if (filters?.is_active !== undefined) {
      query = query.eq("is_active", filters.is_active);
    }

    if (filters?.search) {
      query = query.or(
        `symbol.ilike.%${filters.search}%,name.ilike.%${filters.search}%,asset_id.ilike.%${filters.search}%`
      );
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || []) as Asset[];
  }

  async getAssetById(assetId: string): Promise<Asset> {
    const { data, error } = await supabase
      .from("assets_v2")
      .select("*")
      .eq("asset_id", assetId)
      .single();

    if (error) throw error;
    return data as Asset;
  }

  async createAsset(formData: AssetFormData): Promise<Asset> {
    const { data, error } = await supabase
      .from("assets_v2")
      .insert({
        ...formData,
        metadata: formData.metadata || {},
      })
      .select()
      .single();

    if (error) throw error;
    return data as Asset;
  }

  async updateAsset(assetId: string, updates: Partial<AssetFormData>): Promise<Asset> {
    const { data, error } = await supabase
      .from("assets_v2")
      .update(updates)
      .eq("asset_id", assetId)
      .select()
      .single();

    if (error) throw error;
    return data as Asset;
  }

  async deleteAsset(assetId: string): Promise<void> {
    const { error } = await supabase
      .from("assets_v2")
      .delete()
      .eq("asset_id", assetId);

    if (error) throw error;
  }

  async getAssetPrices(assetId: string, limit: number = 100): Promise<AssetPrice[]> {
    const { data, error } = await supabase
      .from("asset_prices")
      .select("*")
      .eq("asset_id", assetId)
      .order("as_of", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []) as AssetPrice[];
  }

  async getLatestPrice(assetId: string): Promise<AssetPrice | null> {
    const { data, error } = await supabase
      .from("asset_prices")
      .select("*")
      .eq("asset_id", assetId)
      .order("as_of", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data as AssetPrice | null;
  }

  async addAssetPrice(priceData: AssetPriceFormData): Promise<AssetPrice> {
    const { data, error } = await supabase
      .from("asset_prices")
      .insert({
        ...priceData,
        as_of: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data as AssetPrice;
  }

  async getAssetStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    by_kind: Record<string, number>;
  }> {
    const { data, error } = await supabase
      .from("assets_v2")
      .select("kind, is_active");

    if (error) throw error;

    const stats = {
      total: data?.length || 0,
      active: data?.filter((a) => a.is_active).length || 0,
      inactive: data?.filter((a) => !a.is_active).length || 0,
      by_kind: {} as Record<string, number>,
    };

    data?.forEach((asset) => {
      stats.by_kind[asset.kind] = (stats.by_kind[asset.kind] || 0) + 1;
    });

    return stats;
  }
}

export const assetService = new AssetService();
