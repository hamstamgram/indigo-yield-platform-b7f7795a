/**
 * Shared formatting utilities for financial data
 */

/**
 * Format number with proper sign and decimals
 * @param {number} value - The value to format
 * @param {boolean} isIncome - Whether to show positive sign for positive values
 * @param {boolean} isPercentage - Whether to format as percentage
 * @param {number} decimals - Number of decimal places (default: 4)
 * @returns {string} Formatted number
 */
export function formatNumber(value, isIncome = false, isPercentage = false, decimals = 4) {
  if (value === null || value === undefined || value === 0) {
    return "-";
  }

  let formatted = parseFloat(value).toFixed(decimals);

  if (isIncome && value > 0) {
    formatted = "+" + formatted;
  }

  if (isPercentage) {
    formatted = parseFloat(value).toFixed(2) + "%";
  }

  return formatted;
}

/**
 * Format currency value with proper symbol
 * @param {number} value - The value to format
 * @param {string} currency - Currency code (USD, EUR, BTC, etc.)
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted currency
 */
export function formatCurrency(value, currency = "USD", decimals = 2) {
  if (value === null || value === undefined || value === 0) {
    return "-";
  }

  const symbols = {
    USD: "$",
    EUR: "€",
    GBP: "£",
    BTC: "₿",
    ETH: "Ξ",
  };

  const symbol = symbols[currency] || currency + " ";
  return symbol + parseFloat(value).toFixed(decimals);
}

/**
 * Format percentage with proper sign
 * @param {number} value - The percentage value
 * @param {boolean} showSign - Whether to show + for positive values
 * @returns {string} Formatted percentage
 */
export function formatPercentage(value, showSign = true) {
  if (value === null || value === undefined || value === 0) {
    return "0.00%";
  }

  const formatted = parseFloat(value).toFixed(2) + "%";
  return showSign && value > 0 ? "+" + formatted : formatted;
}

/**
 * Normalize names for file paths and IDs
 * @param {string} name - Name to normalize
 * @returns {string} Normalized name
 */
export function normalizeName(name) {
  return name.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "");
}
