import { supabase } from "@/integrations/supabase/client";
import type { Asset, AssetFormData, AssetPrice, AssetPriceFormData } from "@/types/asset";

// Asset kind mapping based on symbol
const getAssetKind = (symbol: string): "crypto" | "stablecoin" | "other" => {
  const stablecoins = ["USDT", "EURC"];
  if (stablecoins.includes(symbol.toUpperCase())) return "stablecoin";
  return "crypto";
};

// Convert database row to Asset type with defaults
// Note: Database 'assets' table has id as number and symbol as enum
const mapDbRowToAsset = (row: { id: number; symbol: string; name: string; is_active?: boolean }): Asset => ({
  asset_id: String(row.id),
  symbol: row.symbol,
  name: row.name,
  kind: getAssetKind(row.symbol),
  decimals: row.symbol === "BTC" ? 8 : row.symbol === "ETH" ? 18 : 6,
  is_active: row.is_active ?? true,
  price_source: "manual",
  metadata: {},
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

export class AssetService {
  async getAssets(filters?: {
    kind?: string;
    is_active?: boolean;
    search?: string;
  }): Promise<Asset[]> {
    // Use the existing 'assets' view which has id, symbol, name
    let query = supabase.from("assets").select("*");

    if (filters?.search) {
      query = query.or(`symbol.ilike.%${filters.search}%,name.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Map to Asset type and apply client-side filters for fields not in view
    let assets = (data || []).map(mapDbRowToAsset);

    if (filters?.kind) {
      assets = assets.filter((a) => a.kind === filters.kind);
    }

    if (filters?.is_active !== undefined) {
      assets = assets.filter((a) => a.is_active === filters.is_active);
    }

    return assets;
  }

  async getAssetById(assetId: string): Promise<Asset> {
    const numericId = parseInt(assetId, 10);
    const { data, error } = await supabase.from("assets").select("*").eq("id", numericId).single();

    if (error) throw error;
    return mapDbRowToAsset(data);
  }

  async createAsset(_formData: AssetFormData): Promise<Asset> {
    // The 'assets' view is read-only (derived from funds table)
    // Asset creation should be done through fund management
    throw new Error(
      "Asset creation is not supported directly. Assets are derived from fund configurations."
    );
  }

  async updateAsset(_assetId: string, _updates: Partial<AssetFormData>): Promise<Asset> {
    // The 'assets' view is read-only
    throw new Error(
      "Asset updates are not supported directly. Assets are derived from fund configurations."
    );
  }

  async deleteAsset(_assetId: string): Promise<void> {
    // The 'assets' view is read-only
    throw new Error(
      "Asset deletion is not supported directly. Assets are derived from fund configurations."
    );
  }

  async getAssetPrices(_assetId: string, _limit: number = 100): Promise<AssetPrice[]> {
    // Asset prices table doesn't exist yet - return empty array
    // Price data could be fetched from external APIs in the future
    return [];
  }

  async getLatestPrice(_assetId: string): Promise<AssetPrice | null> {
    // Asset prices table doesn't exist yet
    return null;
  }

  async addAssetPrice(_priceData: AssetPriceFormData): Promise<AssetPrice> {
    // Asset prices table doesn't exist yet
    throw new Error("Asset price tracking is not yet implemented.");
  }

  async getAssetStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    by_kind: Record<string, number>;
  }> {
    const { data, error } = await supabase.from("assets").select("*");

    if (error) throw error;

    const assets = (data || []).map(mapDbRowToAsset);

    const stats = {
      total: assets.length,
      active: assets.filter((a) => a.is_active).length,
      inactive: assets.filter((a) => !a.is_active).length,
      by_kind: {} as Record<string, number>,
    };

    assets.forEach((asset) => {
      stats.by_kind[asset.kind] = (stats.by_kind[asset.kind] || 0) + 1;
    });

    return stats;
  }
}

export const assetService = new AssetService();
