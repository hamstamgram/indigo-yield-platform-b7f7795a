/**
 * Shared Zod validation schemas for Edge Functions
 * Provides type-safe input validation with clear error messages
 */

import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// Re-export Zod for use in functions
export { z };

// ============================================
// Common Schemas
// ============================================

/** UUID validation */
export const uuidSchema = z.string().uuid("Invalid UUID format");

/** ISO date string (YYYY-MM-DD) */
export const dateSchema = z.string().regex(
  /^\d{4}-\d{2}-\d{2}$/,
  "Date must be in YYYY-MM-DD format"
);

/** ISO datetime string */
export const datetimeSchema = z.string().datetime("Invalid ISO datetime format");

/** Email validation */
export const emailSchema = z.string().email("Invalid email format");

/** Positive number */
export const positiveNumberSchema = z.number().positive("Must be a positive number");

/** Non-negative number */
export const nonNegativeNumberSchema = z.number().min(0, "Must be non-negative");

/** Pagination */
export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

// ============================================
// Portfolio API Schemas
// ============================================

export const portfolioRequestSchema = z.object({
  user_id: uuidSchema.optional(),
}).strict();

// ============================================
// Report Schemas
// ============================================

export const reportTypeSchema = z.enum([
  "monthly_statement",
  "quarterly_report",
  "annual_report",
  "tax_document",
  "performance_report",
  "transaction_history",
]);

export const reportFormatSchema = z.enum(["pdf", "html", "json", "csv"]);

export const generateReportRequestSchema = z.object({
  reportId: uuidSchema,
  reportType: z.string().min(1, "Report type is required"),
  format: z.string().min(1, "Format is required"),
  filters: z.record(z.unknown()).optional(),
  parameters: z.record(z.unknown()).optional(),
}).strict();

// ============================================
// Investor Audit Schemas
// ============================================

export const auditReportTypeSchema = z.enum([
  "overview",
  "reconciliation",
  "compliance",
  "anomalies",
  "activity",
  "full_report",
]);

export const auditRequestSchema = z.object({
  report_type: auditReportTypeSchema.optional().default("overview"),
  investor_id: uuidSchema.optional(),
  format: z.enum(["json", "summary"]).optional().default("json"),
}).strict();

// ============================================
// Monthly Statement Schemas
// ============================================

export const monthlyStatementRequestSchema = z.object({
  investor_id: uuidSchema,
  report_date: dateSchema,
}).strict();

// ============================================
// Email Schemas
// ============================================

export const sendEmailRequestSchema = z.object({
  to: z.union([emailSchema, z.array(emailSchema)]),
  subject: z.string().min(1, "Subject is required").max(200, "Subject too long"),
  html: z.string().min(1, "HTML content is required"),
  from: emailSchema.optional(),
  reply_to: emailSchema.optional(),
  email_type: z.string().optional(),
}).strict();

export const investorReportEmailSchema = z.object({
  to: emailSchema,
  investorName: z.string().min(1, "Investor name is required"),
  reportMonth: z.string().regex(/^\d{4}-\d{2}$/, "Report month must be YYYY-MM"),
  htmlContent: z.string().min(1, "HTML content is required"),
}).strict();

// ============================================
// Webhook Schemas
// ============================================

export const webhookProviderSchema = z.enum([
  "stripe",
  "plaid",
  "coinbase",
  "circle",
  "docusign",
  "twilio",
  "sendgrid",
]);

export const webhookPayloadSchema = z.object({
  provider: webhookProviderSchema.optional(),
  event: z.string().optional(),
  data: z.unknown(),
  signature: z.string().optional(),
  timestamp: z.number().optional(),
});

// ============================================
// MFA Schemas
// ============================================

export const totpCodeSchema = z.string().regex(/^\d{6}$/, "TOTP code must be 6 digits");

export const mfaDisableRequestSchema = z.object({
  code: totpCodeSchema,
}).strict();

// ============================================
// User Management Schemas
// ============================================

export const setPasswordRequestSchema = z.object({
  email: emailSchema,
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password too long"),
}).strict();

// ============================================
// Helper Functions
// ============================================

/**
 * Validate request body and return typed result or error response
 */
export function validateRequest<T extends z.ZodSchema>(
  schema: T,
  data: unknown,
  corsHeaders: Record<string, string>
): { success: true; data: z.infer<T> } | { success: false; response: Response } {
  const result = schema.safeParse(data);

  if (!result.success) {
    const errors = result.error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    }));

    return {
      success: false,
      response: new Response(
        JSON.stringify({
          error: "Validation failed",
          details: errors,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      ),
    };
  }

  return { success: true, data: result.data };
}

/**
 * Parse and validate JSON body from request
 */
export async function parseAndValidate<T extends z.ZodSchema>(
  req: Request,
  schema: T,
  corsHeaders: Record<string, string>
): Promise<{ success: true; data: z.infer<T> } | { success: false; response: Response }> {
  try {
    const body = await req.json();
    return validateRequest(schema, body, corsHeaders);
  } catch {
    return {
      success: false,
      response: new Response(
        JSON.stringify({ error: "Invalid JSON in request body" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      ),
    };
  }
}

/**
 * Validate query parameters
 */
export function validateQueryParams<T extends z.ZodSchema>(
  url: URL,
  schema: T,
  corsHeaders: Record<string, string>
): { success: true; data: z.infer<T> } | { success: false; response: Response } {
  const params: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    params[key] = value;
  });

  return validateRequest(schema, params, corsHeaders);
}
