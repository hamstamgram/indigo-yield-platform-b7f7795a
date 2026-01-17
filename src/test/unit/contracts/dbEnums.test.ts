/**
 * Unit Tests for Database Enum Contracts
 * Verifies Zod schemas and mapping utilities work correctly
 */

import {
  TxTypeSchema,
  UITxTypeSchema,
  TX_TYPE_VALUES,
  UI_TX_TYPE_VALUES,
  DB_TX_TYPE,
  mapUITypeToDb,
  safeMapUITypeToDb,
  getDefaultSubtype,
  isValidTxType,
  isValidUITxType,
  assertValidTxType,
} from "@/contracts/dbEnums";

describe("TxTypeSchema", () => {
  describe("valid values", () => {
    it.each(TX_TYPE_VALUES)("should accept valid tx_type: %s", (type) => {
      expect(() => TxTypeSchema.parse(type)).not.toThrow();
      expect(TxTypeSchema.parse(type)).toBe(type);
    });
  });

  describe("invalid values", () => {
    it("should reject FIRST_INVESTMENT with helpful error", () => {
      const result = TxTypeSchema.safeParse("FIRST_INVESTMENT");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain("FIRST_INVESTMENT is UI-only");
        expect(result.error.errors[0].message).toContain("DEPOSIT");
      }
    });

    it("should reject random string", () => {
      const result = TxTypeSchema.safeParse("INVALID_TYPE");
      expect(result.success).toBe(false);
    });

    it("should reject empty string", () => {
      const result = TxTypeSchema.safeParse("");
      expect(result.success).toBe(false);
    });

    it("should reject lowercase values", () => {
      const result = TxTypeSchema.safeParse("deposit");
      expect(result.success).toBe(false);
    });
  });
});

describe("UITxTypeSchema", () => {
  it("should accept all DB tx_types", () => {
    TX_TYPE_VALUES.forEach((type) => {
      expect(UITxTypeSchema.safeParse(type).success).toBe(true);
    });
  });

  it("should accept FIRST_INVESTMENT", () => {
    expect(UITxTypeSchema.safeParse("FIRST_INVESTMENT").success).toBe(true);
  });

  it("should reject invalid values", () => {
    expect(UITxTypeSchema.safeParse("INVALID").success).toBe(false);
  });
});

describe("mapUITypeToDb", () => {
  it("should map FIRST_INVESTMENT to DEPOSIT", () => {
    expect(mapUITypeToDb("FIRST_INVESTMENT")).toBe("DEPOSIT");
  });

  it("should pass through valid DB types unchanged", () => {
    expect(mapUITypeToDb("DEPOSIT")).toBe("DEPOSIT");
    expect(mapUITypeToDb("WITHDRAWAL")).toBe("WITHDRAWAL");
    expect(mapUITypeToDb("YIELD")).toBe("YIELD");
    expect(mapUITypeToDb("FEE")).toBe("FEE");
  });
});

describe("safeMapUITypeToDb", () => {
  it("should map FIRST_INVESTMENT to DEPOSIT", () => {
    expect(safeMapUITypeToDb("FIRST_INVESTMENT")).toBe("DEPOSIT");
  });

  it("should return null for invalid types", () => {
    expect(safeMapUITypeToDb("INVALID")).toBeNull();
    expect(safeMapUITypeToDb("")).toBeNull();
  });

  it("should pass through valid types", () => {
    expect(safeMapUITypeToDb("DEPOSIT")).toBe("DEPOSIT");
  });
});

describe("getDefaultSubtype", () => {
  it("should return correct subtypes", () => {
    expect(getDefaultSubtype("FIRST_INVESTMENT")).toBe("first_investment");
    expect(getDefaultSubtype("DEPOSIT")).toBe("top_up");
    expect(getDefaultSubtype("WITHDRAWAL")).toBe("redemption");
    expect(getDefaultSubtype("FEE")).toBe("fee_charge");
    expect(getDefaultSubtype("YIELD")).toBe("yield_credit");
    expect(getDefaultSubtype("INTEREST")).toBe("yield_credit");
    expect(getDefaultSubtype("ADJUSTMENT")).toBe("adjustment");
  });
});

describe("isValidTxType", () => {
  it("should return true for valid DB types", () => {
    TX_TYPE_VALUES.forEach((type) => {
      expect(isValidTxType(type)).toBe(true);
    });
  });

  it("should return false for FIRST_INVESTMENT", () => {
    expect(isValidTxType("FIRST_INVESTMENT")).toBe(false);
  });

  it("should return false for invalid strings", () => {
    expect(isValidTxType("invalid")).toBe(false);
    expect(isValidTxType("")).toBe(false);
  });
});

describe("isValidUITxType", () => {
  it("should return true for all UI types including FIRST_INVESTMENT", () => {
    UI_TX_TYPE_VALUES.forEach((type) => {
      expect(isValidUITxType(type)).toBe(true);
    });
  });

  it("should return false for invalid strings", () => {
    expect(isValidUITxType("invalid")).toBe(false);
  });
});

describe("assertValidTxType", () => {
  it("should not throw for valid DB types", () => {
    TX_TYPE_VALUES.forEach((type) => {
      expect(() => assertValidTxType(type)).not.toThrow();
    });
  });

  it("should throw for FIRST_INVESTMENT with helpful message", () => {
    expect(() => assertValidTxType("FIRST_INVESTMENT")).toThrow(
      "FIRST_INVESTMENT must be mapped to DEPOSIT"
    );
  });

  it("should throw for invalid types", () => {
    expect(() => assertValidTxType("INVALID")).toThrow("Invalid transaction type");
  });

  it("should include context in error message", () => {
    expect(() => assertValidTxType("INVALID", "test context")).toThrow("(in test context)");
  });
});

describe("DB_TX_TYPE constants", () => {
  it("should have all valid tx_types", () => {
    TX_TYPE_VALUES.forEach((type) => {
      expect(DB_TX_TYPE[type as keyof typeof DB_TX_TYPE]).toBe(type);
    });
  });

  it("should NOT have FIRST_INVESTMENT", () => {
    expect("FIRST_INVESTMENT" in DB_TX_TYPE).toBe(false);
  });
});
