import { describe, it, expect } from "vitest";
import Decimal from "decimal.js";
import {
  toDecimal,
  formatCrypto,
  formatPercentage,
  calculateYield,
  calculateCompoundInterest,
  calculateFee,
  calculateNetAmount,
  calculatePercentageChange,
  calculateProfitLoss,
  calculateAverage,
  calculateWeightedAverage,
  isInRange,
  clamp,
  toDbFormat,
  fromDbFormat,
  validatePositiveAmount,
  validateNonNegativeAmount,
  validatePercentage,
} from "@/utils/financial";

describe("Financial Utilities", () => {
  describe("toDecimal", () => {
    it("should convert number to Decimal", () => {
      const result = toDecimal(100);
      expect(result).toBeInstanceOf(Decimal);
      expect(result.toString()).toBe("100");
    });

    it("should convert string to Decimal", () => {
      const result = toDecimal("123.456");
      expect(result).toBeInstanceOf(Decimal);
      expect(result.toString()).toBe("123.456");
    });

    it("should return Decimal as is", () => {
      const input = new Decimal("99.99");
      const result = toDecimal(input);
      expect(result).toBe(input);
    });

    it("should handle scientific notation", () => {
      const result = toDecimal("1e-8");
      expect(result.toNumber()).toBeCloseTo(0.00000001, 10);
    });
  });

  describe("formatCrypto", () => {
    it("should format crypto with default 8 decimals", () => {
      expect(formatCrypto(1.23456789)).toBe("1.23456789");
    });

    it("should format crypto with symbol", () => {
      expect(formatCrypto(1.5, 8, "BTC")).toBe("1.50000000 BTC");
    });

    it("should format crypto with custom decimals", () => {
      expect(formatCrypto(100.5, 4, "SOL")).toBe("100.5000 SOL");
    });

    it("should handle very small amounts", () => {
      expect(formatCrypto(0.00000001, 8, "BTC")).toBe("0.00000001 BTC");
    });
  });

  describe("formatPercentage", () => {
    it("should format decimal as percentage", () => {
      expect(formatPercentage(0.05)).toBe("5.00%");
    });

    it("should format with custom decimals", () => {
      expect(formatPercentage(0.12345, 3)).toBe("12.345%");
    });

    it("should handle zero", () => {
      expect(formatPercentage(0)).toBe("0.00%");
    });

    it("should handle values > 1", () => {
      expect(formatPercentage(1.5)).toBe("150.00%");
    });
  });

  describe("calculateYield", () => {
    it("should calculate annual yield correctly", () => {
      const result = calculateYield(1000, 0.05, 365);
      expect(result.toNumber()).toBeCloseTo(50, 2);
    });

    it("should calculate 30-day yield", () => {
      const result = calculateYield(1000, 0.05, 30);
      expect(result.toNumber()).toBeCloseTo(4.11, 2);
    });

    it("should handle zero principal", () => {
      const result = calculateYield(0, 0.05, 365);
      expect(result.toNumber()).toBe(0);
    });

    it("should handle zero rate", () => {
      const result = calculateYield(1000, 0, 365);
      expect(result.toNumber()).toBe(0);
    });

    it("should accept string inputs", () => {
      const result = calculateYield("1000", "0.05", 365);
      expect(result.toNumber()).toBeCloseTo(50, 2);
    });
  });

  describe("calculateCompoundInterest", () => {
    it("should calculate compound interest for 1 year", () => {
      const result = calculateCompoundInterest(1000, 0.05, 1, 365);
      expect(result.toNumber()).toBeCloseTo(51.27, 2);
    });

    it("should calculate compound interest for 5 years", () => {
      const result = calculateCompoundInterest(1000, 0.05, 5, 12);
      expect(result.toNumber()).toBeCloseTo(283.36, 2);
    });

    it("should handle quarterly compounding", () => {
      const result = calculateCompoundInterest(1000, 0.08, 2, 4);
      expect(result.toNumber()).toBeCloseTo(171.66, 2);
    });

    it("should handle zero rate", () => {
      const result = calculateCompoundInterest(1000, 0, 5, 365);
      expect(result.toNumber()).toBe(0);
    });
  });

  describe("calculateFee", () => {
    it("should calculate fee correctly", () => {
      const result = calculateFee(1000, 0.25);
      expect(result.toNumber()).toBeCloseTo(2.5, 2);
    });

    it("should handle zero fee", () => {
      const result = calculateFee(1000, 0);
      expect(result.toNumber()).toBe(0);
    });

    it("should handle large percentages", () => {
      const result = calculateFee(1000, 10);
      expect(result.toNumber()).toBeCloseTo(100, 2);
    });
  });

  describe("calculateNetAmount", () => {
    it("should calculate net amount after fee", () => {
      const result = calculateNetAmount(1000, 0.25);
      expect(result.toNumber()).toBeCloseTo(997.5, 2);
    });

    it("should handle zero fee", () => {
      const result = calculateNetAmount(1000, 0);
      expect(result.toNumber()).toBe(1000);
    });

    it("should handle 100% fee", () => {
      const result = calculateNetAmount(1000, 100);
      expect(result.toNumber()).toBe(0);
    });
  });

  describe("calculatePercentageChange", () => {
    it("should calculate positive change", () => {
      const result = calculatePercentageChange(100, 150);
      expect(result.toNumber()).toBeCloseTo(50, 2);
    });

    it("should calculate negative change", () => {
      const result = calculatePercentageChange(100, 75);
      expect(result.toNumber()).toBeCloseTo(-25, 2);
    });

    it("should handle zero old value", () => {
      const result = calculatePercentageChange(0, 100);
      expect(result.toNumber()).toBe(0);
    });

    it("should handle no change", () => {
      const result = calculatePercentageChange(100, 100);
      expect(result.toNumber()).toBe(0);
    });
  });

  describe("calculateProfitLoss", () => {
    it("should calculate profit correctly", () => {
      const result = calculateProfitLoss(1000, 1500);
      expect(result.amount.toNumber()).toBe(500);
      expect(result.percentage.toNumber()).toBeCloseTo(50, 2);
      expect(result.isProfit).toBe(true);
    });

    it("should calculate loss correctly", () => {
      const result = calculateProfitLoss(1000, 800);
      expect(result.amount.toNumber()).toBe(-200);
      expect(result.percentage.toNumber()).toBeCloseTo(-20, 2);
      expect(result.isProfit).toBe(false);
    });

    it("should handle break-even", () => {
      const result = calculateProfitLoss(1000, 1000);
      expect(result.amount.toNumber()).toBe(0);
      expect(result.percentage.toNumber()).toBe(0);
      expect(result.isProfit).toBe(true);
    });
  });

  describe("calculateAverage", () => {
    it("should calculate average of numbers", () => {
      const result = calculateAverage([10, 20, 30, 40]);
      expect(result.toNumber()).toBe(25);
    });

    it("should handle empty array", () => {
      const result = calculateAverage([]);
      expect(result.toNumber()).toBe(0);
    });

    it("should handle single value", () => {
      const result = calculateAverage([100]);
      expect(result.toNumber()).toBe(100);
    });

    it("should handle string inputs", () => {
      const result = calculateAverage(["10.5", "20.5", "30.5"]);
      expect(result.toNumber()).toBeCloseTo(20.5, 2);
    });
  });

  describe("calculateWeightedAverage", () => {
    it("should calculate weighted average correctly", () => {
      // (10*2 + 20*3 + 30*5) / (2+3+5) = (20+60+150)/10 = 23
      const values = [
        { value: 10, weight: 2 },
        { value: 20, weight: 3 },
        { value: 30, weight: 5 },
      ];
      const result = calculateWeightedAverage(values);
      expect(result.toNumber()).toBeCloseTo(23, 2);
    });

    it("should handle empty array", () => {
      const result = calculateWeightedAverage([]);
      expect(result.toNumber()).toBe(0);
    });

    it("should handle zero total weight", () => {
      const values = [
        { value: 10, weight: 0 },
        { value: 20, weight: 0 },
      ];
      const result = calculateWeightedAverage(values);
      expect(result.toNumber()).toBe(0);
    });

    it("should handle equal weights", () => {
      const values = [
        { value: 10, weight: 1 },
        { value: 20, weight: 1 },
        { value: 30, weight: 1 },
      ];
      const result = calculateWeightedAverage(values);
      expect(result.toNumber()).toBe(20);
    });
  });

  describe("isInRange", () => {
    it("should return true for value in range", () => {
      expect(isInRange(50, 0, 100)).toBe(true);
    });

    it("should return true for value at min boundary", () => {
      expect(isInRange(0, 0, 100)).toBe(true);
    });

    it("should return true for value at max boundary", () => {
      expect(isInRange(100, 0, 100)).toBe(true);
    });

    it("should return false for value below range", () => {
      expect(isInRange(-1, 0, 100)).toBe(false);
    });

    it("should return false for value above range", () => {
      expect(isInRange(101, 0, 100)).toBe(false);
    });
  });

  describe("clamp", () => {
    it("should return value when in range", () => {
      const result = clamp(50, 0, 100);
      expect(result.toNumber()).toBe(50);
    });

    it("should return min when below range", () => {
      const result = clamp(-10, 0, 100);
      expect(result.toNumber()).toBe(0);
    });

    it("should return max when above range", () => {
      const result = clamp(150, 0, 100);
      expect(result.toNumber()).toBe(100);
    });

    it("should handle boundaries", () => {
      expect(clamp(0, 0, 100).toNumber()).toBe(0);
      expect(clamp(100, 0, 100).toNumber()).toBe(100);
    });
  });

  describe("toDbFormat", () => {
    it("should format to 8 decimals", () => {
      expect(toDbFormat(123.456)).toBe("123.45600000");
    });

    it("should handle integers", () => {
      expect(toDbFormat(100)).toBe("100.00000000");
    });

    it("should handle very small numbers", () => {
      expect(toDbFormat(0.00000001)).toBe("0.00000001");
    });

    it("should handle Decimal input", () => {
      const value = new Decimal("99.99");
      expect(toDbFormat(value)).toBe("99.99000000");
    });
  });

  describe("fromDbFormat", () => {
    it("should parse database value", () => {
      const result = fromDbFormat("123.45600000");
      expect(result.toNumber()).toBeCloseTo(123.456, 8);
    });

    it("should handle null", () => {
      const result = fromDbFormat(null);
      expect(result.toNumber()).toBe(0);
    });

    it("should handle undefined", () => {
      const result = fromDbFormat(undefined);
      expect(result.toNumber()).toBe(0);
    });

    it("should handle zero string", () => {
      const result = fromDbFormat("0.00000000");
      expect(result.toNumber()).toBe(0);
    });
  });

  describe("validatePositiveAmount", () => {
    it("should validate positive amounts", () => {
      const result = validatePositiveAmount(100);
      expect(result.toNumber()).toBe(100);
    });

    it("should throw error for zero", () => {
      expect(() => validatePositiveAmount(0)).toThrow("Amount must be positive");
    });

    it("should throw error for negative", () => {
      expect(() => validatePositiveAmount(-10)).toThrow("Amount must be positive");
    });

    it("should use custom field name", () => {
      expect(() => validatePositiveAmount(0, "Balance")).toThrow("Balance must be positive");
    });
  });

  describe("validateNonNegativeAmount", () => {
    it("should validate non-negative amounts", () => {
      const result = validateNonNegativeAmount(100);
      expect(result.toNumber()).toBe(100);
    });

    it("should allow zero", () => {
      const result = validateNonNegativeAmount(0);
      expect(result.toNumber()).toBe(0);
    });

    it("should throw error for negative", () => {
      expect(() => validateNonNegativeAmount(-10)).toThrow("Amount cannot be negative");
    });

    it("should use custom field name", () => {
      expect(() => validateNonNegativeAmount(-1, "Balance")).toThrow("Balance cannot be negative");
    });
  });

  describe("validatePercentage", () => {
    it("should validate percentage in range", () => {
      const result = validatePercentage(50);
      expect(result.toNumber()).toBe(50);
    });

    it("should allow 0", () => {
      const result = validatePercentage(0);
      expect(result.toNumber()).toBe(0);
    });

    it("should allow 100", () => {
      const result = validatePercentage(100);
      expect(result.toNumber()).toBe(100);
    });

    it("should throw error for negative", () => {
      expect(() => validatePercentage(-1)).toThrow("Percentage must be between 0 and 100");
    });

    it("should throw error for > 100", () => {
      expect(() => validatePercentage(101)).toThrow("Percentage must be between 0 and 100");
    });

    it("should use custom field name", () => {
      expect(() => validatePercentage(-1, "Fee")).toThrow("Fee must be between 0 and 100");
    });
  });

  describe("Edge Cases", () => {
    it("should handle very large numbers", () => {
      const result = toDecimal("999999999999999999");
      expect(result.toString()).toBe("999999999999999999");
    });

    it("should handle precision with floating point issues", () => {
      // This would be 0.30000000000000004 with native JS
      const result = toDecimal(0.1).plus(toDecimal(0.2));
      expect(result.toString()).toBe("0.3");
    });

    it("should maintain precision in calculations", () => {
      const result = calculateYield("1000.123456789", "0.05123456789", 365);
      expect(result.decimalPlaces()).toBeGreaterThanOrEqual(8);
    });
  });
});
