import { z } from "zod";

export const investmentFormSchema = z.object({
  investor_id: z.string().uuid({ message: "Please select a valid investor" }),
  fund_id: z.string().uuid({ message: "Please select a valid fund" }),
  investment_date: z.string().min(1, { message: "Investment date is required" }),
  amount: z.coerce
    .number()
    .positive({ message: "Amount must be greater than 0" })
    .max(1000000000, { message: "Amount exceeds maximum limit" }),
  transaction_type: z.enum(["initial", "additional", "redemption"], {
    required_error: "Please select a transaction type",
  }),
  reference_number: z
    .string()
    .max(100, { message: "Reference number must be less than 100 characters" })
    .optional(),
  notes: z
    .string()
    .max(1000, { message: "Notes must be less than 1000 characters" })
    .optional(),
});

export type InvestmentFormValues = z.infer<typeof investmentFormSchema>;
