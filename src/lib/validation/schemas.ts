/**
 * Input Validation Schemas
 * Comprehensive validation for all forms and API inputs
 */

import { z } from 'zod';

// Common validation patterns
const patterns = {
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  phone: /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/,
  strongPassword: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  alphanumeric: /^[a-zA-Z0-9]+$/,
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  bitcoinAddress: /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/,
  ethereumAddress: /^0x[a-fA-F0-9]{40}$/,
};

// ===============================
// Authentication Schemas
// ===============================

export const loginSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .toLowerCase()
    .trim(),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password too long'),
  totpCode: z.string()
    .length(6, 'TOTP code must be 6 digits')
    .regex(/^\d{6}$/, 'TOTP code must be numeric')
    .optional(),
  recaptchaToken: z.string().optional(),
});

export const registerSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .toLowerCase()
    .trim(),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(patterns.strongPassword, 
      'Password must contain uppercase, lowercase, number, and special character'),
  confirmPassword: z.string(),
  firstName: z.string()
    .min(1, 'First name is required')
    .max(50, 'First name too long')
    .regex(/^[a-zA-Z\s'-]+$/, 'Invalid characters in first name'),
  lastName: z.string()
    .min(1, 'Last name is required')
    .max(50, 'Last name too long')
    .regex(/^[a-zA-Z\s'-]+$/, 'Invalid characters in last name'),
  phone: z.string()
    .regex(patterns.phone, 'Invalid phone number')
    .optional(),
  acceptTerms: z.boolean()
    .refine(val => val === true, 'You must accept the terms'),
  recaptchaToken: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const passwordResetSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .toLowerCase()
    .trim(),
  recaptchaToken: z.string(),
});

// ===============================
// Financial Transaction Schemas
// ===============================

export const depositRequestSchema = z.object({
  amount: z.number()
    .positive('Amount must be positive')
    .min(100, 'Minimum deposit is $100')
    .max(10000000, 'Maximum deposit is $10,000,000')
    .multipleOf(0.01, 'Amount must have at most 2 decimal places'),
  assetCode: z.enum(['BTC', 'ETH', 'SOL', 'USDT', 'USDC', 'EURC']),
  wireReference: z.string()
    .min(1, 'Wire reference is required')
    .max(100, 'Wire reference too long'),
  notes: z.string()
    .max(500, 'Notes too long')
    .optional(),
  proofDocumentId: z.string()
    .uuid('Invalid document ID')
    .optional(),
});

export const withdrawalRequestSchema = z.object({
  amount: z.number()
    .positive('Amount must be positive')
    .min(100, 'Minimum withdrawal is $100')
    .multipleOf(0.01, 'Amount must have at most 2 decimal places'),
  assetCode: z.enum(['BTC', 'ETH', 'SOL', 'USDT', 'USDC', 'EURC']),
  destinationAddress: z.string()
    .min(1, 'Destination address is required')
    .refine((val) => {
      // Validate based on asset type
      if (val.startsWith('0x')) return patterns.ethereumAddress.test(val);
      if (val.startsWith('bc1') || val.startsWith('1') || val.startsWith('3')) {
        return patterns.bitcoinAddress.test(val);
      }
      return true; // Allow other formats for other assets
    }, 'Invalid wallet address'),
  reason: z.enum(['personal', 'investment', 'emergency', 'other']),
  notes: z.string()
    .max(500, 'Notes too long')
    .optional(),
  totpCode: z.string()
    .length(6, 'TOTP code must be 6 digits')
    .regex(/^\d{6}$/, 'TOTP code must be numeric'),
});

// ===============================
// Admin Operation Schemas
// ===============================

export const adminDepositSchema = z.object({
  investorId: z.string()
    .uuid('Invalid investor ID'),
  amount: z.number()
    .positive('Amount must be positive')
    .multipleOf(0.00000001, 'Invalid decimal precision'),
  assetCode: z.enum(['BTC', 'ETH', 'SOL', 'USDT', 'USDC', 'EURC']),
  txHash: z.string()
    .min(1, 'Transaction hash is required')
    .max(100, 'Transaction hash too long'),
  notes: z.string()
    .max(1000, 'Notes too long')
    .optional(),
  effectiveDate: z.date()
    .max(new Date(), 'Cannot post future deposits'),
});

export const adminWithdrawalSchema = z.object({
  investorId: z.string()
    .uuid('Invalid investor ID'),
  amount: z.number()
    .positive('Amount must be positive')
    .multipleOf(0.00000001, 'Invalid decimal precision'),
  assetCode: z.enum(['BTC', 'ETH', 'SOL', 'USDT', 'USDC', 'EURC']),
  txHash: z.string()
    .min(1, 'Transaction hash is required')
    .max(100, 'Transaction hash too long'),
  destinationAddress: z.string()
    .min(1, 'Destination address is required'),
  fee: z.number()
    .min(0, 'Fee cannot be negative')
    .optional(),
  notes: z.string()
    .max(1000, 'Notes too long')
    .optional(),
});

export const yieldSettingsSchema = z.object({
  assetCode: z.enum(['BTC', 'ETH', 'SOL', 'USDT', 'USDC', 'EURC']),
  annualYieldPercentage: z.number()
    .min(0, 'Yield cannot be negative')
    .max(100, 'Yield cannot exceed 100%')
    .multipleOf(0.0001, 'Maximum 4 decimal places'),
  effectiveDate: z.date()
    .min(new Date(), 'Effective date must be in the future'),
  notes: z.string()
    .max(500, 'Notes too long')
    .optional(),
});

// ===============================
// Support & Communication Schemas
// ===============================

export const supportTicketSchema = z.object({
  subject: z.string()
    .min(1, 'Subject is required')
    .max(200, 'Subject too long'),
  category: z.enum(['account', 'portfolio', 'statement', 'technical', 'general']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  message: z.string()
    .min(10, 'Message must be at least 10 characters')
    .max(5000, 'Message too long'),
  attachments: z.array(z.string().uuid())
    .max(5, 'Maximum 5 attachments allowed')
    .optional(),
});

export const notificationPreferencesSchema = z.object({
  emailNotifications: z.boolean(),
  smsNotifications: z.boolean(),
  pushNotifications: z.boolean(),
  categories: z.object({
    deposits: z.boolean(),
    withdrawals: z.boolean(),
    statements: z.boolean(),
    performance: z.boolean(),
    security: z.boolean(),
    marketing: z.boolean(),
  }),
});

// ===============================
// Profile & Settings Schemas
// ===============================

export const profileUpdateSchema = z.object({
  firstName: z.string()
    .min(1, 'First name is required')
    .max(50, 'First name too long')
    .regex(/^[a-zA-Z\s'-]+$/, 'Invalid characters in first name'),
  lastName: z.string()
    .min(1, 'Last name is required')
    .max(50, 'Last name too long')
    .regex(/^[a-zA-Z\s'-]+$/, 'Invalid characters in last name'),
  phone: z.string()
    .regex(patterns.phone, 'Invalid phone number')
    .optional(),
  timezone: z.string()
    .min(1, 'Timezone is required'),
  language: z.enum(['en', 'es', 'fr', 'de', 'zh', 'ja']),
});

// ===============================
// Validation Helpers
// ===============================

/**
 * Sanitize input to prevent XSS attacks
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim();
}

/**
 * Validate and sanitize an object against a schema
 */
export async function validateAndSanitize<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): Promise<{ success: boolean; data?: T; errors?: z.ZodError }> {
  try {
    // Sanitize string fields
    const sanitized = sanitizeObject(data);
    
    // Validate against schema
    const validated = await schema.parseAsync(sanitized);
    
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error };
    }
    throw error;
  }
}

/**
 * Recursively sanitize object strings
 */
function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    return sanitizeInput(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  if (obj !== null && typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        sanitized[key] = sanitizeObject(obj[key]);
      }
    }
    return sanitized;
  }
  return obj;
}

// Export type inference helpers
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type DepositRequestInput = z.infer<typeof depositRequestSchema>;
export type WithdrawalRequestInput = z.infer<typeof withdrawalRequestSchema>;
export type SupportTicketInput = z.infer<typeof supportTicketSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
