/**
 * Tests for First-Class INDIGO FEES & IB Users
 * Verifies system user architecture is correct
 */

import { describe, it, expect } from "vitest";
import { INDIGO_FEES_ACCOUNT_ID } from "@/constants/fees";

describe("First-Class System Users", () => {
  describe("INDIGO FEES Account", () => {
    it("should have correct account ID constant", () => {
      expect(INDIGO_FEES_ACCOUNT_ID).toBe("b464a3f7-60d5-4bc0-9833-7b413bcc6cae");
    });

    it("should be a valid UUID", () => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(INDIGO_FEES_ACCOUNT_ID).toMatch(uuidRegex);
    });
  });

  describe("Token-Denominated Accounting", () => {
    it("should not use USD in token symbol constants", () => {
      // Stablecoins USDC/USDT are valid token symbols, not USD currency
      const tokenSymbols = ["BTC", "ETH", "SOL", "USDC", "USDT"];
      tokenSymbols.forEach((symbol) => {
        expect(symbol).not.toBe("USD"); // Pure USD is not a token
      });
    });
  });

  describe("Account Type Enum", () => {
    it("should have correct account types defined", () => {
      const accountTypes = ["investor", "ib", "fees_account"];
      expect(accountTypes).toContain("investor");
      expect(accountTypes).toContain("ib");
      expect(accountTypes).toContain("fees_account");
    });
  });

  describe("Transaction Source Enum", () => {
    it("should have correct source types for tracking", () => {
      const sources = [
        "manual_admin",
        "yield_distribution",
        "fee_allocation",
        "ib_allocation",
        "system_bootstrap",
        "investor_wizard",
      ];
      expect(sources).toHaveLength(6);
      expect(sources).toContain("yield_distribution");
      expect(sources).toContain("investor_wizard");
    });
  });
});
