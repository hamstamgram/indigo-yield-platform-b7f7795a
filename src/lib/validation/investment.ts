import { z } from "zod";
import { strictUuidSchema } from "./schemas";

export const investmentFormSchema = z.object({
  investor_id: strictUuidSchema,
  fund_id: strictUuidSchema,
  investment_date: z.string().min(1, { message: "Investment date is required" }),
  amount: z.string()
    .min(1, { message: "Amount is required" })
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, { 
      message: "Amount must be greater than 0" 
    })
    .refine((val) => parseFloat(val) <= 1000000000, { 
      message: "Amount exceeds maximum limit" 
    }),
  transaction_type: z.enum(["initial", "additional", "redemption"], {
    required_error: "Please select a transaction type",
  }),
  reference_number: z
    .string()
    .max(100, { message: "Reference number must be less than 100 characters" })
    .optional(),
  notes: z.string().max(1000, { message: "Notes must be less than 1000 characters" }).optional(),
});

export type InvestmentFormValues = z.infer<typeof investmentFormSchema>;
