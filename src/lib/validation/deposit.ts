import { z } from "zod";

export const depositSchema = z.object({
  user_id: z.string().uuid({ message: "Invalid user ID" }),
  asset_symbol: z
    .string()
    .trim()
    .min(1, { message: "Asset symbol is required" })
    .max(10, { message: "Asset symbol must be less than 10 characters" }),
  amount: z
    .number()
    .positive({ message: "Amount must be positive" })
    .max(1000000000, { message: "Amount is too large" }),
  transaction_hash: z
    .string()
    .trim()
    .max(255, { message: "Transaction hash must be less than 255 characters" })
    .optional()
    .or(z.literal("")),
  status: z.enum(["pending", "verified", "rejected"]).optional(),
});

export type DepositFormValues = z.infer<typeof depositSchema>;