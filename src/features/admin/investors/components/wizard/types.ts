import { z } from "zod";
import { getTodayString } from "@/utils/dateUtils";

// Re-export asset utilities from canonical location for backwards compatibility
export { ASSET_PRECISION, getAssetStep, getAssetPrecision } from "@/types/asset";

// Step 1: Identity
export const identitySchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  entity_type: z.enum(["individual", "entity"]),
  status: z.enum(["active", "inactive", "pending"]),
});

// Step 2: IB Configuration
export const ibSchema = z.object({
  enabled: z.boolean(),
  existingIbId: z.string().nullable(),
  createNewIb: z.boolean(),
  newIb: z
    .object({
      email: z.string().email().optional().or(z.literal("")),
      first_name: z.string().optional(),
      last_name: z.string().optional(),
    })
    .optional(),
});

// Step 3: Fees
export const feesSchema = z.object({
  investor_fee_pct: z.number().min(0).max(100),
  ib_commission_pct: z.number().min(0).max(100),
  link_fees: z.boolean(),
});

// Step 4: Initial Positions (dynamic based on assets)
export const createPositionsSchema = (assetSymbols: string[]) => {
  const shape: Record<string, z.ZodNumber> = {};
  assetSymbols.forEach((symbol) => {
    shape[symbol] = z.number().min(0, `${symbol} must be non-negative`);
  });
  return z.object(shape);
};

// Combined wizard data
export interface WizardFormData {
  identity: z.infer<typeof identitySchema>;
  ib: z.infer<typeof ibSchema>;
  fees: z.infer<typeof feesSchema>;
  positions: Record<string, number>;
  positionsEffectiveDate: string; // Date for initial investment transactions
  reportEmails: string[];
}

export const getDefaultWizardData = (): WizardFormData => ({
  identity: {
    email: "",
    first_name: "",
    last_name: "",
    entity_type: "individual",
    status: "active",
  },
  ib: {
    enabled: false,
    existingIbId: null,
    createNewIb: false,
    newIb: {
      email: "",
      first_name: "",
      last_name: "",
    },
  },
  fees: {
    investor_fee_pct: 20,
    ib_commission_pct: 0,
    link_fees: false,
  },
  positions: {},
  positionsEffectiveDate: getTodayString(), // Default to today
  reportEmails: [],
});

export interface IBUser {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
}

export type WizardStep = "identity" | "ib" | "fees" | "positions" | "review";

export const WIZARD_STEPS: { id: WizardStep; label: string }[] = [
  { id: "identity", label: "Identity" },
  { id: "ib", label: "IB" },
  { id: "fees", label: "Fees" },
  { id: "positions", label: "Positions" },
  { id: "review", label: "Review" },
];
