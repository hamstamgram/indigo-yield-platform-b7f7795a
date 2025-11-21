/**
 * Data parser for investor statements
 * Separates data extraction logic from presentation
 */

/**
 * Parse and process investor data for statement generation
 * @param {object} investor - Raw investor profile data
 * @param {array} positions - Raw position data
 * @returns {object} Processed statement data
 */
export function parseInvestorData(investor, positions) {
  return {
    investor: {
      id: investor.id,
      firstName: investor.first_name,
      lastName: investor.last_name,
      email: investor.email,
      fullName: `${investor.first_name} ${investor.last_name}`,
    },
    positions: positions.map(parsePositionData),
    summary: calculatePortfolioSummary(positions),
  };
}

/**
 * Parse individual position data
 * @param {object} position - Raw position data
 * @returns {object} Processed position data
 */
export function parsePositionData(position) {
  const principal = parseFloat(position.principal) || 0;
  const currentBalance = parseFloat(position.current_balance) || 0;
  const totalEarned = parseFloat(position.total_earned) || 0;

  return {
    assetCode: position.asset_code,
    principal,
    currentBalance,
    totalEarned,
    rateOfReturn: principal > 0 ? (totalEarned / principal) * 100 : 0,
    // Additional calculated fields for future use
    netChange: currentBalance - principal,
    isPositive: totalEarned > 0,
  };
}

/**
 * Calculate portfolio-level summary statistics
 * @param {array} positions - Array of position data
 * @returns {object} Portfolio summary
 */
export function calculatePortfolioSummary(positions) {
  let totalPrincipal = 0;
  let totalCurrentBalance = 0;
  let totalEarned = 0;
  let activePositions = 0;

  for (const position of positions) {
    if (position.current_balance > 0) {
      activePositions++;
      totalPrincipal += parseFloat(position.principal) || 0;
      totalCurrentBalance += parseFloat(position.current_balance) || 0;
      totalEarned += parseFloat(position.total_earned) || 0;
    }
  }

  return {
    totalPrincipal,
    totalCurrentBalance,
    totalEarned,
    totalRateOfReturn: totalPrincipal > 0 ? (totalEarned / totalPrincipal) * 100 : 0,
    activePositions,
    totalPositions: positions.length,
  };
}

/**
 * Group positions by asset code for easier processing
 * @param {array} positions - Array of position data
 * @returns {object} Positions grouped by asset code
 */
export function groupPositionsByAsset(positions) {
  const grouped = {};

  for (const position of positions) {
    grouped[position.asset_code] = position;
  }

  return grouped;
}

/**
 * Filter positions to only include active ones (balance > 0)
 * @param {array} positions - Array of position data
 * @returns {array} Filtered positions
 */
export function filterActivePositions(positions) {
  return positions.filter((position) => parseFloat(position.current_balance) > 0);
}

/**
 * Calculate time-based performance metrics (placeholder for future implementation)
 * @param {object} position - Position data
 * @param {string} period - Time period ('MTD', 'QTD', 'YTD', 'ITD')
 * @returns {object} Performance metrics for the period
 */
export function calculatePeriodPerformance(position, period) {
  // This is a placeholder - in production, this would calculate
  // actual period-specific performance based on historical data
  const principal = parseFloat(position.principal) || 0;
  const earned = parseFloat(position.total_earned) || 0;

  return {
    period,
    beginningBalance: principal,
    endingBalance: position.current_balance,
    netIncome: earned,
    additions: 0, // Would come from transaction history
    redemptions: 0, // Would come from transaction history
    rateOfReturn: principal > 0 ? (earned / principal) * 100 : 0,
  };
}

/**
 * Format date for statement periods
 * @param {Date} date - Date to format
 * @returns {string} Formatted date string
 */
export function formatStatementDate(date) {
  const options = { year: "numeric", month: "long", day: "numeric" };
  return date.toLocaleDateString("en-US", options);
}

/**
 * Generate statement filename based on investor and date
 * @param {object} investor - Investor data
 * @param {number} index - Statement index/sequence number
 * @returns {string} Formatted filename
 */
export function generateStatementFilename(investor, index = 1) {
  const paddedIndex = String(index).padStart(2, "0");
  const firstName = investor.first_name.replace(/\s+/g, "_");
  const lastName = investor.last_name.replace(/\s+/g, "_");

  return `${paddedIndex}_${firstName}_${lastName}.html`;
}
