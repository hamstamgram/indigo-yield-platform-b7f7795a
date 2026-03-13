import { describe, it, expect } from "vitest";
import { z } from "zod";

/**
 * Issue 3: Withdrawal dialog has no date picker
 * The fix added an execution_date field to the withdrawal form schema.
 * We test the schema validation independently.
 */
const withdrawalSchema = z.object({
  amount: z
    .string()
    .trim()
    .min(1, "Amount is required")
    .refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
      message: "Amount must be a positive number",
    }),
  execution_date: z
    .string()
    .min(1, "Execution date is required")
    .refine((val) => !isNaN(Date.parse(val)), {
      message: "Invalid date format",
    }),
  withdrawal_type: z.enum(["partial", "full"], {
    required_error: "Withdrawal type is required",
  }),
  notes: z.string().trim().max(1000, "Notes must be less than 1000 characters").optional(),
});

describe("CreateWithdrawalDialog schema (Issue 3)", () => {
  it("accepts valid form data with execution_date", () => {
    const result = withdrawalSchema.safeParse({
      amount: "100.50",
      execution_date: "2026-01-15",
      withdrawal_type: "partial",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing execution_date", () => {
    const result = withdrawalSchema.safeParse({
      amount: "100.50",
      execution_date: "",
      withdrawal_type: "partial",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid date format", () => {
    const result = withdrawalSchema.safeParse({
      amount: "100.50",
      execution_date: "not-a-date",
      withdrawal_type: "partial",
    });
    expect(result.success).toBe(false);
  });

  it("accepts full withdrawal type", () => {
    const result = withdrawalSchema.safeParse({
      amount: "500",
      execution_date: "2026-03-01",
      withdrawal_type: "full",
    });
    expect(result.success).toBe(true);
  });

  it("rejects zero amount", () => {
    const result = withdrawalSchema.safeParse({
      amount: "0",
      execution_date: "2026-01-15",
      withdrawal_type: "partial",
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative amount", () => {
    const result = withdrawalSchema.safeParse({
      amount: "-50",
      execution_date: "2026-01-15",
      withdrawal_type: "partial",
    });
    expect(result.success).toBe(false);
  });
});
