// PII Redaction Utility for Indigo Yield Platform
// Masks sensitive information in logs and admin screens

type RedactionPattern = {
  pattern: RegExp;
  replacement: string;
};

const DEFAULT_REDACTION_PATTERNS: RedactionPattern[] = [
  // Email addresses
  {
    pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    replacement: '[EMAIL_REDACTED]'
  },
  // Phone numbers (various formats)
  {
    pattern: /(\+?1[-.\s]?)?(\(?)([0-9]{3})(\)?[-.\s]?)([0-9]{3})[-.\s]?([0-9]{4})/g,
    replacement: '[PHONE_REDACTED]'
  },
  // SSN patterns
  {
    pattern: /\b\d{3}-?\d{2}-?\d{4}\b/g,
    replacement: '[SSN_REDACTED]'
  },
  // Credit card numbers
  {
    pattern: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
    replacement: '[CARD_REDACTED]'
  },
  // IP addresses
  {
    pattern: /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g,
    replacement: '[IP_REDACTED]'
  },
  // Crypto addresses (Bitcoin, Ethereum patterns)
  {
    pattern: /\b[13][a-km-zA-HJ-NP-Z1-9]{25,34}\b/g, // Bitcoin
    replacement: '[BTC_ADDRESS_REDACTED]'
  },
  {
    pattern: /\b0x[a-fA-F0-9]{40}\b/g, // Ethereum
    replacement: '[ETH_ADDRESS_REDACTED]'
  }
];

export interface RedactionOptions {
  patterns?: RedactionPattern[];
  keys?: string[]; // Specific object keys to redact
  preserveLength?: boolean; // Whether to maintain original string length
  customMask?: string; // Custom mask character
}

/**
 * Redacts PII from a string value
 */
export function redactString(
  value: string, 
  options: RedactionOptions = {}
): string {
  if (!value || typeof value !== 'string') {
    return value;
  }

  const patterns = options.patterns || DEFAULT_REDACTION_PATTERNS;
  let redacted = value;

  for (const { pattern, replacement } of patterns) {
    if (options.preserveLength) {
      redacted = redacted.replace(pattern, (match) => 
        options.customMask ? 
          options.customMask.repeat(match.length) : 
          '*'.repeat(match.length)
      );
    } else {
      redacted = redacted.replace(pattern, replacement);
    }
  }

  return redacted;
}

/**
 * Redacts PII from object properties
 */
export function redactObject<T extends Record<string, any>>(
  obj: T,
  options: RedactionOptions = {}
): T {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const { keys = [] } = options;
  const result = { ...obj } as any;

  // Redact specific keys if provided
  if (keys.length > 0) {
    for (const key of keys) {
      if (key in result && typeof result[key] === 'string') {
        result[key] = redactString(result[key], options);
      }
    }
    return result;
  }

  // Redact all string values
  for (const [key, value] of Object.entries(result)) {
    if (typeof value === 'string') {
      result[key] = redactString(value, options);
    } else if (typeof value === 'object' && value !== null) {
      result[key] = redactObject(value, options);
    }
  }

  return result;
}

/**
 * Redacts PII from arrays
 */
export function redactArray<T>(
  arr: T[], 
  options: RedactionOptions = {}
): T[] {
  if (!Array.isArray(arr)) {
    return arr;
  }

  return arr.map(item => {
    if (typeof item === 'string') {
      return redactString(item, options) as T;
    } else if (typeof item === 'object' && item !== null) {
      return redactObject(item as Record<string, any>, options) as T;
    }
    return item;
  });
}

/**
 * Main redaction function that handles any data type
 */
export function redactPII<T>(
  data: T,
  keysOrOptions?: string[] | RedactionOptions,
  options?: RedactionOptions
): T {
  // Handle parameter overloads
  let finalOptions: RedactionOptions = {};
  
  if (Array.isArray(keysOrOptions)) {
    finalOptions = { ...options, keys: keysOrOptions };
  } else if (keysOrOptions) {
    finalOptions = keysOrOptions;
  }

  if (typeof data === 'string') {
    return redactString(data, finalOptions) as T;
  }
  
  if (Array.isArray(data)) {
    return redactArray(data, finalOptions) as T;
  }
  
  if (data && typeof data === 'object') {
    return redactObject(data as Record<string, any>, finalOptions) as T;
  }

  return data;
}

/**
 * Predefined redaction configurations for common use cases
 */
export const RedactionPresets = {
  // For logging (more aggressive)
  LOGGING: {
    preserveLength: false,
    patterns: DEFAULT_REDACTION_PATTERNS,
  },
  
  // For admin screens (less aggressive, preserve some info)
  ADMIN_DISPLAY: {
    preserveLength: true,
    customMask: '•',
    patterns: [
      // Only email domains and phone middle digits
      {
        pattern: /([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
        replacement: '••••••@$2'
      },
      {
        pattern: /(\+?1[-.\s]?)?(\(?)([0-9]{3})(\)?[-.\s]?)([0-9]{3})([-.\s]?)([0-9]{4})/g,
        replacement: '$1$2$3$4•••$6$7'
      }
    ]
  },
  
  // For audit trails (minimal redaction)
  AUDIT: {
    keys: ['password', 'token', 'secret', 'private_key'],
    patterns: [
      {
        pattern: /.*/g,
        replacement: '[REDACTED]'
      }
    ]
  }
} as const;

import { redactForLogging, redactForAdmin, redactForAudit } from '@/lib/security/redact-pii-simple';
