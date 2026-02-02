// Simplified PII Redaction Utility
export interface RedactionOptions {
  patterns?: Array<{ pattern: RegExp; replacement: string }>;
  keys?: string[];
  preserveLength?: boolean;
  customMask?: string;
}

const DEFAULT_PATTERNS = [
  { pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, replacement: "[EMAIL_REDACTED]" },
  {
    pattern: /(\+?1[-.\s]?)?(\(?)([0-9]{3})(\)?[-.\s]?)([0-9]{3})[-.\s]?([0-9]{4})/g,
    replacement: "[PHONE_REDACTED]",
  },
  { pattern: /\b\d{3}-?\d{2}-?\d{4}\b/g, replacement: "[SSN_REDACTED]" },
];

export function redactString(value: string, options: RedactionOptions = {}): string {
  if (!value || typeof value !== "string") return value;

  const patterns = options.patterns || DEFAULT_PATTERNS;
  let redacted = value;

  for (const { pattern, replacement } of patterns) {
    redacted = redacted.replace(pattern, replacement);
  }

  return redacted;
}

export function redactObject<T extends Record<string, any>>(
  obj: T,
  options: RedactionOptions = {}
): T {
  if (!obj || typeof obj !== "object") return obj;

  const result: Record<string, unknown> = { ...obj };
  const { keys = [] } = options;

  if (keys.length > 0) {
    for (const key of keys) {
      if (key in result && typeof result[key] === "string") {
        result[key] = redactString(result[key], options);
      }
    }
  } else {
    for (const [key, value] of Object.entries(result)) {
      if (typeof value === "string") {
        result[key] = redactString(value, options);
      } else if (typeof value === "object" && value !== null) {
        result[key] = redactObject(value, options);
      }
    }
  }

  return result as T;
}

export function redactPII<T>(data: T, options: RedactionOptions = {}): T {
  if (typeof data === "string") return redactString(data, options) as T;
  if (Array.isArray(data)) return data.map((item) => redactPII(item, options)) as T;
  if (data && typeof data === "object")
    return redactObject(data as Record<string, any>, options) as T;
  return data;
}

export const redactForLogging = <T>(data: T) => redactPII(data, { patterns: DEFAULT_PATTERNS });
export const redactForAdmin = <T>(data: T) =>
  redactPII(data, { preserveLength: true, customMask: "•" });
export const redactForAudit = <T>(data: T) =>
  redactPII(data, { keys: ["password", "token", "secret"] });
