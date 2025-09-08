/**
 * CLI prompt utilities for user interaction
 * Separates user input handling from business logic
 */

import readline from 'readline';

let rl = null;

/**
 * Initialize readline interface
 */
export function initializePrompts() {
  if (!rl) {
    rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }
  return rl;
}

/**
 * Close readline interface
 */
export function closePrompts() {
  if (rl) {
    rl.close();
    rl = null;
  }
}

/**
 * Prompt user for input
 * @param {string} question - Question to ask
 * @returns {Promise<string>} User's answer
 */
export function prompt(question) {
  if (!rl) initializePrompts();
  
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

/**
 * Prompt user to select from a list of options
 * @param {string} title - Title for the selection
 * @param {array} options - Array of option objects with label and value properties
 * @param {function} labelFormatter - Function to format option labels (optional)
 * @returns {Promise<any>} Selected option or null if invalid
 */
export async function promptSelection(title, options, labelFormatter) {
  console.log(`\n${title}`);
  
  for (let i = 0; i < options.length; i++) {
    const label = labelFormatter ? labelFormatter(options[i], i) : `${options[i].label || options[i]}`;
    console.log(`${i + 1}. ${label}`);
  }
  
  const choice = await prompt(`\nSelection (1-${options.length}): `);
  const index = parseInt(choice) - 1;
  
  if (index >= 0 && index < options.length) {
    return options[index];
  }
  
  console.log('❌ Invalid selection');
  return null;
}

/**
 * Prompt for confirmation
 * @param {string} message - Confirmation message
 * @param {string} defaultValue - Default value (y/n)
 * @returns {Promise<boolean>} True if confirmed
 */
export async function promptConfirmation(message, defaultValue = 'n') {
  const response = await prompt(`${message} (y/n) [${defaultValue}]: `) || defaultValue;
  return response.toLowerCase() === 'y' || response.toLowerCase() === 'yes';
}

/**
 * Prompt for numeric input with validation
 * @param {string} question - Question to ask
 * @param {object} options - Validation options (min, max, decimals)
 * @returns {Promise<number|null>} Parsed number or null if invalid
 */
export async function promptNumber(question, options = {}) {
  const { min = 0, max = Infinity, decimals = 4 } = options;
  
  const answer = await prompt(question);
  const parsed = parseFloat(answer);
  
  if (isNaN(parsed)) {
    console.log('❌ Please enter a valid number');
    return null;
  }
  
  if (parsed < min) {
    console.log(`❌ Number must be at least ${min}`);
    return null;
  }
  
  if (parsed > max) {
    console.log(`❌ Number cannot exceed ${max}`);
    return null;
  }
  
  return parseFloat(parsed.toFixed(decimals));
}

/**
 * Display a formatted menu
 * @param {string} title - Menu title
 * @param {array} items - Menu items with label and description
 * @returns {Promise<string>} Selected option
 */
export async function displayMenu(title, items) {
  console.log(`\n${title}`);
  console.log('='.repeat(title.length));
  console.log();
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    console.log(`${i + 1}. ${item.label}`);
    if (item.description) {
      console.log(`   ${item.description}`);
    }
  }
  
  console.log();
  return await prompt('Choice: ');
}

/**
 * Display transaction summary for confirmation
 * @param {object} transaction - Transaction details
 * @param {object} user - User performing the transaction
 */
export function displayTransactionSummary(transaction, user) {
  console.log('\n📝 Transaction Details:');
  console.log(`   Type: ${transaction.type}`);
  console.log(`   Investor: ${transaction.investorName}`);
  console.log(`   Asset: ${transaction.asset}`);
  console.log(`   Amount: ${transaction.amount}`);
  
  if (transaction.remaining !== undefined) {
    console.log(`   Remaining: ${transaction.remaining}`);
  }
  
  if (transaction.txHash) {
    console.log(`   TX Hash: ${transaction.txHash}`);
  }
  
  if (transaction.note) {
    console.log(`   Note: ${transaction.note}`);
  }
  
  console.log(`   Created by: ${user.firstName} ${user.lastName}`);
}

/**
 * Display formatted transaction history table
 * @param {array} transactions - Array of transaction records
 */
export function displayTransactionHistory(transactions) {
  if (!transactions || transactions.length === 0) {
    console.log('No transactions found');
    return;
  }
  
  console.log('\nDate       | Type       | Investor           | Asset | Amount      | Status');
  console.log('-----------|------------|-------------------|-------|-------------|----------');
  
  for (const tx of transactions) {
    const date = new Date(tx.created_at).toISOString().split('T')[0];
    const type = tx.type.padEnd(10);
    const investor = `${tx.profiles.first_name} ${tx.profiles.last_name}`.substring(0, 17).padEnd(17);
    const asset = tx.asset_code.padEnd(5);
    const amount = tx.amount.toFixed(4).padStart(11);
    const status = tx.status;
    
    console.log(`${date} | ${type} | ${investor} | ${asset} | ${amount} | ${status}`);
  }
}

/**
 * Display transaction summary statistics
 * @param {array} transactions - Array of transaction records
 */
export function displayTransactionStatistics(transactions) {
  const totalDeposits = {};
  const totalWithdrawals = {};
  
  for (const tx of transactions) {
    if (tx.type === 'DEPOSIT') {
      if (!totalDeposits[tx.asset_code]) totalDeposits[tx.asset_code] = 0;
      totalDeposits[tx.asset_code] += tx.amount;
    } else if (tx.type === 'WITHDRAWAL') {
      if (!totalWithdrawals[tx.asset_code]) totalWithdrawals[tx.asset_code] = 0;
      totalWithdrawals[tx.asset_code] += tx.amount;
    }
  }
  
  console.log('\n📊 Summary:');
  
  if (Object.keys(totalDeposits).length > 0) {
    console.log('Deposits:');
    for (const [asset, amount] of Object.entries(totalDeposits)) {
      console.log(`  ${asset}: ${amount.toFixed(4)}`);
    }
  }
  
  if (Object.keys(totalWithdrawals).length > 0) {
    console.log('Withdrawals:');
    for (const [asset, amount] of Object.entries(totalWithdrawals)) {
      console.log(`  ${asset}: ${amount.toFixed(4)}`);
    }
  }
}
