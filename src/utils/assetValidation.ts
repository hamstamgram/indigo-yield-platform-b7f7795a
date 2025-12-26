/**
 * Asset Validation Utility
 * Shared validation for asset inputs across the application
 */

// Use types from central location
import { type AssetConfig, type AssetInput, type AssetValidationResult, getAssetConfig } from "@/types/asset";

// Re-export types for backward compatibility
export type { AssetInput, AssetConfig };
export type ValidationResult = AssetValidationResult;

/**
 * Validates asset inputs ensuring:
 * - All amounts are valid numbers
 * - No negative values
 * - Decimals don't exceed asset precision
 * - At least one asset has a value > 0 (when requirePositive is true)
 * 
 * @param assetInputs Array of asset symbol and amount pairs
 * @param assetsConfig Configuration for each asset including decimal places
 * @param options Validation options
 * @returns Validation result with parsed amounts and any errors
 */
export function validateAssetInputs(
  assetInputs: AssetInput[],
  assetsConfig: Record<string, { decimals: number; name?: string }>,
  options: { requirePositive?: boolean } = { requirePositive: true }
): AssetValidationResult {
  const errors: Record<string, string> = {};
  const parsedAmounts: Record<string, number> = {};

  for (const { symbol, amount } of assetInputs) {
    // Default blank/null/undefined to 0
    let value: number;
    
    if (amount === null || amount === undefined || amount === "") {
      value = 0;
    } else if (typeof amount === "string") {
      const trimmed = amount.trim();
      if (trimmed === "") {
        value = 0;
      } else {
        value = parseFloat(trimmed);
      }
    } else {
      value = amount;
    }

    // Must be a valid number
    if (isNaN(value)) {
      errors[symbol] = `${symbol} must be a valid number`;
      continue;
    }

    // Must be non-negative
    if (value < 0) {
      errors[symbol] = `${symbol} cannot be negative`;
      continue;
    }

    // Validate precision (decimal places)
    const config = assetsConfig[symbol] || getAssetConfig(symbol);
    const maxDecimals = config?.decimals ?? 8;
    
    // Check decimal precision
    const valueStr = String(value);
    const decimalIndex = valueStr.indexOf(".");
    if (decimalIndex !== -1) {
      const decimalPart = valueStr.substring(decimalIndex + 1);
      // Remove trailing zeros for comparison
      const significantDecimals = decimalPart.replace(/0+$/, "").length;
      if (significantDecimals > maxDecimals) {
        errors[symbol] = `${symbol} exceeds maximum ${maxDecimals} decimal places`;
        continue;
      }
    }

    parsedAmounts[symbol] = value;
  }

  // Check if at least one asset has a positive value (when required)
  if (options.requirePositive && Object.keys(errors).length === 0) {
    const hasPositiveAmount = Object.values(parsedAmounts).some((v) => v > 0);
    if (!hasPositiveAmount) {
      errors._global = "At least one asset must have a value greater than 0";
    }
  }

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    parsedAmounts,
  };
}

/**
 * Formats a validation error message for display
 */
export function formatValidationErrors(errors: Record<string, string>): string {
  if (errors._global) {
    return errors._global;
  }
  
  const assetErrors = Object.entries(errors)
    .filter(([key]) => key !== "_global")
    .map(([, message]) => message);
  
  return assetErrors.join("; ");
}

/**
 * Truncates a number to the specified decimal places without rounding
 */
export function truncateToDecimals(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.trunc(value * factor) / factor;
}

/**
 * Validates a single asset amount
 */
export function validateSingleAssetAmount(
  amount: number | string | null | undefined,
  symbol: string,
  decimals?: number
): { valid: boolean; value: number; error?: string } {
  const config = getAssetConfig(symbol);
  const actualDecimals = decimals ?? config.decimals;
  
  const result = validateAssetInputs(
    [{ symbol, amount }],
    { [symbol]: { decimals: actualDecimals } },
    { requirePositive: false }
  );

  if (!result.ok) {
    return {
      valid: false,
      value: 0,
      error: result.errors[symbol] || result.errors._global,
    };
  }

  return {
    valid: true,
    value: result.parsedAmounts[symbol] || 0,
  };
}
