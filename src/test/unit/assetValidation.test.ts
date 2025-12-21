/**
 * Asset Validation Unit Tests
 */

import { describe, it, expect } from "vitest";
import {
  validateAssetInputs,
  validateSingleAssetAmount,
  truncateToDecimals,
  formatValidationErrors,
} from "@/utils/assetValidation";

const mockAssetsConfig = {
  BTC: { decimals: 8 },
  ETH: { decimals: 8 },
  USDC: { decimals: 6 },
  USDT: { decimals: 6 },
};

describe("validateAssetInputs", () => {
  it("fails when all assets are blank/zero", () => {
    const inputs = [
      { symbol: "BTC", amount: "" },
      { symbol: "ETH", amount: null },
      { symbol: "USDC", amount: 0 },
    ];

    const result = validateAssetInputs(inputs, mockAssetsConfig);

    expect(result.ok).toBe(false);
    expect(result.errors._global).toBe("At least one asset must have a value greater than 0");
  });

  it("passes with one valid asset (5 BTC)", () => {
    const inputs = [
      { symbol: "BTC", amount: 5 },
      { symbol: "ETH", amount: 0 },
      { symbol: "USDC", amount: "" },
    ];

    const result = validateAssetInputs(inputs, mockAssetsConfig);

    expect(result.ok).toBe(true);
    expect(result.parsedAmounts.BTC).toBe(5);
    expect(result.parsedAmounts.ETH).toBe(0);
    expect(result.parsedAmounts.USDC).toBe(0);
  });

  it("fails on negative values", () => {
    const inputs = [
      { symbol: "BTC", amount: -5 },
      { symbol: "ETH", amount: 10 },
    ];

    const result = validateAssetInputs(inputs, mockAssetsConfig);

    expect(result.ok).toBe(false);
    expect(result.errors.BTC).toBe("BTC cannot be negative");
  });

  it("fails when decimals exceed asset precision", () => {
    const inputs = [
      { symbol: "USDC", amount: 100.1234567 }, // USDC has 6 decimals max
    ];

    const result = validateAssetInputs(inputs, mockAssetsConfig);

    expect(result.ok).toBe(false);
    expect(result.errors.USDC).toBe("USDC exceeds maximum 6 decimal places");
  });

  it("handles mixed valid and invalid inputs", () => {
    const inputs = [
      { symbol: "BTC", amount: 1.5 },
      { symbol: "ETH", amount: -0.5 },
      { symbol: "USDC", amount: "invalid" },
    ];

    const result = validateAssetInputs(inputs, mockAssetsConfig);

    expect(result.ok).toBe(false);
    expect(result.errors.ETH).toBe("ETH cannot be negative");
    expect(result.errors.USDC).toBe("USDC must be a valid number");
    expect(result.parsedAmounts.BTC).toBe(1.5);
  });

  it("accepts string numbers", () => {
    const inputs = [
      { symbol: "BTC", amount: "0.00123456" },
      { symbol: "ETH", amount: "10" },
    ];

    const result = validateAssetInputs(inputs, mockAssetsConfig);

    expect(result.ok).toBe(true);
    expect(result.parsedAmounts.BTC).toBe(0.00123456);
    expect(result.parsedAmounts.ETH).toBe(10);
  });

  it("respects requirePositive: false option", () => {
    const inputs = [
      { symbol: "BTC", amount: 0 },
      { symbol: "ETH", amount: 0 },
    ];

    const result = validateAssetInputs(inputs, mockAssetsConfig, {
      requirePositive: false,
    });

    expect(result.ok).toBe(true);
  });

  it("defaults blank to 0", () => {
    const inputs = [
      { symbol: "BTC", amount: "" },
      { symbol: "ETH", amount: null },
      { symbol: "USDC", amount: undefined },
      { symbol: "USDT", amount: 100 },
    ];

    const result = validateAssetInputs(inputs, mockAssetsConfig);

    expect(result.ok).toBe(true);
    expect(result.parsedAmounts.BTC).toBe(0);
    expect(result.parsedAmounts.ETH).toBe(0);
    expect(result.parsedAmounts.USDC).toBe(0);
    expect(result.parsedAmounts.USDT).toBe(100);
  });

  it("handles whitespace in string values", () => {
    const inputs = [
      { symbol: "BTC", amount: "  5.5  " },
      { symbol: "ETH", amount: "   " },
    ];

    const result = validateAssetInputs(inputs, mockAssetsConfig);

    expect(result.ok).toBe(true);
    expect(result.parsedAmounts.BTC).toBe(5.5);
    expect(result.parsedAmounts.ETH).toBe(0);
  });

  it("accepts trailing zeros in decimals", () => {
    const inputs = [
      { symbol: "USDC", amount: 100.123000 }, // Should pass - trailing zeros don't count
    ];

    const result = validateAssetInputs(inputs, mockAssetsConfig);

    expect(result.ok).toBe(true);
    expect(result.parsedAmounts.USDC).toBe(100.123);
  });
});

describe("validateSingleAssetAmount", () => {
  it("validates a single asset correctly", () => {
    const result = validateSingleAssetAmount(5.5, "BTC", 8);
    expect(result.valid).toBe(true);
    expect(result.value).toBe(5.5);
  });

  it("returns error for invalid input", () => {
    const result = validateSingleAssetAmount(-5, "BTC", 8);
    expect(result.valid).toBe(false);
    expect(result.error).toBe("BTC cannot be negative");
  });
});

describe("truncateToDecimals", () => {
  it("truncates to specified decimal places", () => {
    expect(truncateToDecimals(1.23456789, 4)).toBe(1.2345);
    expect(truncateToDecimals(1.23456789, 2)).toBe(1.23);
    expect(truncateToDecimals(1.99999999, 4)).toBe(1.9999);
  });

  it("does not round up", () => {
    expect(truncateToDecimals(1.999, 2)).toBe(1.99);
    expect(truncateToDecimals(0.999999, 2)).toBe(0.99);
  });

  it("handles whole numbers", () => {
    expect(truncateToDecimals(5, 2)).toBe(5);
    expect(truncateToDecimals(100, 4)).toBe(100);
  });
});

describe("formatValidationErrors", () => {
  it("returns global error if present", () => {
    const errors = {
      _global: "At least one asset must have a value greater than 0",
      BTC: "BTC error",
    };

    expect(formatValidationErrors(errors)).toBe(
      "At least one asset must have a value greater than 0"
    );
  });

  it("joins asset errors with semicolon", () => {
    const errors = {
      BTC: "BTC cannot be negative",
      ETH: "ETH must be a valid number",
    };

    expect(formatValidationErrors(errors)).toBe(
      "BTC cannot be negative; ETH must be a valid number"
    );
  });
});
