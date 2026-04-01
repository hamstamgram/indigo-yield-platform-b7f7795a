import { supabase } from "@/integrations/supabase/client";
import type { Asset, AssetFormData, AssetPrice, AssetPriceFormData } from "@/types/asset";
import { getAssetPrecision } from "@/types/asset";
import { buildSafeOrFilter } from "@/utils/searchSanitizer";

// Asset kind mapping based on symbol
const getAssetKind = (symbol: string): "crypto" | "stablecoin" | "other" => {
  const stablecoins = ["USDT", "EURC"];
  if (stablecoins.includes(symbol.toUpperCase())) return "stablecoin";
  return "crypto";
};

// Convert database row to Asset type with defaults
const mapDbRowToAsset = (row: {
  id: number;
  symbol: string;
  name: string;
  is_active?: boolean;
}): Asset => ({
  asset_id: String(row.id),
  symbol: row.symbol,
  name: row.name,
  kind: getAssetKind(row.symbol),
  decimals: getAssetPrecision(row.symbol),
  is_active: row.is_active ?? true,
  price_source: "manual",
  metadata: {},
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

async function getAssets(filters?: {
  kind?: string;
  is_active?: boolean;
  search?: string;
}): Promise<Asset[]> {
  let query = supabase.from("assets").select("*");

  if (filters?.search) {
    const safeFilter = buildSafeOrFilter(filters.search, ["symbol", "name"]);
    if (safeFilter) {
      query = query.or(safeFilter);
    }
  }

  const { data, error } = await query;

  if (error) throw error;

  let assets = (data || []).map(mapDbRowToAsset);

  if (filters?.kind) {
    assets = assets.filter((a) => a.kind === filters.kind);
  }

  if (filters?.is_active !== undefined) {
    assets = assets.filter((a) => a.is_active === filters.is_active);
  }

  return assets;
}

async function getAssetById(assetId: string): Promise<Asset> {
  const numericId = parseInt(assetId, 10);
  const { data, error } = await supabase
    .from("assets")
    .select("*")
    .eq("id", numericId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error(`Asset not found: ${assetId}`);
  return mapDbRowToAsset(data);
}

async function createAsset(_formData: AssetFormData): Promise<Asset> {
  throw new Error(
    "Asset creation is not supported directly. Assets are derived from fund configurations."
  );
}

async function updateAsset(_assetId: string, _updates: Partial<AssetFormData>): Promise<Asset> {
  throw new Error(
    "Asset updates are not supported directly. Assets are derived from fund configurations."
  );
}

async function deleteAsset(_assetId: string): Promise<void> {
  throw new Error(
    "Asset deletion is not supported directly. Assets are derived from fund configurations."
  );
}

async function getAssetPrices(_assetId: string, _limit: number = 100): Promise<AssetPrice[]> {
  return [];
}

async function getLatestPrice(_assetId: string): Promise<AssetPrice | null> {
  return null;
}

async function addAssetPrice(_priceData: AssetPriceFormData): Promise<AssetPrice> {
  throw new Error("Asset price tracking is not yet implemented.");
}

async function getAssetStats(): Promise<{
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

export const assetService = {
  getAssets,
  getAssetById,
  createAsset,
  updateAsset,
  deleteAsset,
  getAssetPrices,
  getLatestPrice,
  addAssetPrice,
  getAssetStats,
};
