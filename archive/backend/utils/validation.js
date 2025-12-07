/**
 * Input validation utilities for financial operations and CLI scripts
 */

/**
 * Validate email address format
 * @param {string} email - Email to validate
 * @returns {boolean} Whether email is valid
 */
export function isValidEmail(email) {
  if (!email || typeof email !== "string") return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate numeric amount for financial transactions
 * @param {any} amount - Amount to validate
 * @param {number} min - Minimum allowed value (default: 0)
 * @param {number} max - Maximum allowed value (default: Infinity)
 * @returns {{isValid: boolean, value?: number, error?: string}} Validation result
 */
export function validateAmount(amount, min = 0, max = Infinity) {
  if (amount === null || amount === undefined) {
    return { isValid: false, error: "Amount is required" };
  }

  const parsed = parseFloat(amount);

  if (isNaN(parsed)) {
    return { isValid: false, error: "Amount must be a valid number" };
  }

  if (parsed < min) {
    return { isValid: false, error: `Amount must be at least ${min}` };
  }

  if (parsed > max) {
    return { isValid: false, error: `Amount cannot exceed ${max}` };
  }

  return { isValid: true, value: parsed };
}

/**
 * Validate percentage value
 * @param {any} percentage - Percentage to validate
 * @param {number} min - Minimum allowed value (default: -100)
 * @param {number} max - Maximum allowed value (default: 100)
 * @returns {{isValid: boolean, value?: number, error?: string}} Validation result
 */
export function validatePercentage(percentage, min = -100, max = 100) {
  const result = validateAmount(percentage, min, max);
  if (!result.isValid) {
    return { ...result, error: result.error.replace("Amount", "Percentage") };
  }
  return result;
}

/**
 * Validate asset code format
 * @param {string} assetCode - Asset code to validate
 * @returns {{isValid: boolean, value?: string, error?: string}} Validation result
 */
export function validateAssetCode(assetCode) {
  if (!assetCode || typeof assetCode !== "string") {
    return { isValid: false, error: "Asset code is required" };
  }

  const trimmed = assetCode.trim().toUpperCase();

  if (trimmed.length < 2 || trimmed.length > 10) {
    return { isValid: false, error: "Asset code must be 2-10 characters" };
  }

  if (!/^[A-Z0-9]+$/.test(trimmed)) {
    return { isValid: false, error: "Asset code must contain only letters and numbers" };
  }

  return { isValid: true, value: trimmed };
}

/**
 * Validate date format (YYYY-MM-DD)
 * @param {string} date - Date string to validate
 * @returns {{isValid: boolean, value?: Date, error?: string}} Validation result
 */
export function validateDate(date) {
  if (!date || typeof date !== "string") {
    return { isValid: false, error: "Date is required" };
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    return { isValid: false, error: "Date must be in YYYY-MM-DD format" };
  }

  const parsed = new Date(date);
  if (isNaN(parsed.getTime())) {
    return { isValid: false, error: "Invalid date" };
  }

  return { isValid: true, value: parsed };
}

/**
 * Validate investor ID (UUID format)
 * @param {string} id - ID to validate
 * @returns {{isValid: boolean, value?: string, error?: string}} Validation result
 */
export function validateInvestorId(id) {
  if (!id || typeof id !== "string") {
    return { isValid: false, error: "Investor ID is required" };
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    return { isValid: false, error: "Invalid investor ID format" };
  }

  return { isValid: true, value: id };
}

/**
 * Sanitize string input to prevent injection attacks
 * @param {string} input - Input to sanitize
 * @param {number} maxLength - Maximum allowed length (default: 1000)
 * @returns {string} Sanitized input
 */
export function sanitizeInput(input, maxLength = 1000) {
  if (!input || typeof input !== "string") return "";

  return input
    .trim()
    .slice(0, maxLength)
    .replace(/[<>]/g, "") // Remove potential HTML/XML tags
    .replace(/['";]/g, ""); // Remove quotes that could break SQL
}

/**
 * Validate required fields in an object
 * @param {object} data - Data object to validate
 * @param {string[]} requiredFields - Array of required field names
 * @returns {{isValid: boolean, missingFields?: string[], error?: string}} Validation result
 */
export function validateRequiredFields(data, requiredFields) {
  if (!data || typeof data !== "object") {
    return { isValid: false, error: "Data object is required" };
  }

  const missingFields = requiredFields.filter(
    (field) => data[field] === null || data[field] === undefined || data[field] === ""
  );

  if (missingFields.length > 0) {
    return {
      isValid: false,
      missingFields,
      error: `Missing required fields: ${missingFields.join(", ")}`,
    };
  }

  return { isValid: true };
}
