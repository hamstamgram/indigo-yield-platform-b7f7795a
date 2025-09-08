/**
 * Transaction business logic service
 * Separates transaction processing from CLI interaction
 */

import { validateAmount, validateInvestorId, validateAssetCode } from './validation.js';

/**
 * Get admin user for audit trail
 * @param {object} supabase - Supabase client
 * @returns {object|null} Admin user or null if not found
 */
export async function getAdminUser(supabase) {
  const { data: admin, error } = await supabase
    .from('profiles')
    .select('id, email, first_name, last_name')
    .eq('is_admin', true)
    .single();
  
  if (error) {
    throw new Error(`Failed to get admin user: ${error.message}`);
  }
  
  return admin;
}

/**
 * Fetch all investors
 * @param {object} supabase - Supabase client
 * @returns {array} Array of investor records
 */
export async function fetchInvestors(supabase) {
  const { data: investors, error } = await supabase
    .from('profiles')
    .select('id, email, first_name, last_name')
    .eq('is_admin', false)
    .order('first_name');
  
  if (error) {
    throw new Error(`Failed to fetch investors: ${error.message}`);
  }
  
  return investors || [];
}

/**
 * Fetch all available assets
 * @param {object} supabase - Supabase client
 * @returns {array} Array of asset records
 */
export async function fetchAssets(supabase) {
  const { data: assets, error } = await supabase
    .from('assets')
    .select('*')
    .order('symbol');
  
  if (error) {
    throw new Error(`Failed to fetch assets: ${error.message}`);
  }
  
  return assets || [];
}

/**
 * Fetch investor positions with balances
 * @param {object} supabase - Supabase client
 * @returns {array} Array of positions with investor profiles
 */
export async function fetchInvestorPositions(supabase) {
  const { data: positions, error } = await supabase
    .from('positions')
    .select('*, profiles!positions_investor_id_fkey(*)')
    .gt('current_balance', 0)
    .order('profiles(first_name)');
  
  if (error) {
    throw new Error(`Failed to fetch positions: ${error.message}`);
  }
  
  return positions || [];
}

/**
 * Process a deposit transaction
 * @param {object} supabase - Supabase client
 * @param {object} depositData - Deposit transaction data
 * @returns {object} Processing result
 */
export async function processDeposit(supabase, depositData) {
  const { investorId, assetCode, amount, txHash, note, adminId } = depositData;
  
  // Validate inputs
  const amountValidation = validateAmount(amount);
  if (!amountValidation.isValid) {
    throw new Error(`Invalid amount: ${amountValidation.error}`);
  }
  
  const investorValidation = validateInvestorId(investorId);
  if (!investorValidation.isValid) {
    throw new Error(`Invalid investor ID: ${investorValidation.error}`);
  }
  
  const assetValidation = validateAssetCode(assetCode);
  if (!assetValidation.isValid) {
    throw new Error(`Invalid asset code: ${assetValidation.error}`);
  }
  
  const validAmount = amountValidation.value;
  const now = new Date().toISOString();
  
  try {
    // Start transaction by recording it
    const { error: txError } = await supabase
      .from('transactions')
      .insert({
        investor_id: investorId,
        asset_code: assetCode,
        amount: validAmount,
        type: 'DEPOSIT',
        status: 'confirmed',
        tx_hash: txHash,
        note: note || `Deposit of ${validAmount} ${assetCode}`,
        created_at: now,
        confirmed_at: now,
        created_by: adminId
      });
    
    if (txError) {
      throw new Error(`Failed to record transaction: ${txError.message}`);
    }
    
    // Update or create position
    const positionResult = await updatePositionForDeposit(supabase, {
      investorId,
      assetCode,
      amount: validAmount,
      timestamp: now
    });
    
    return {
      success: true,
      transactionId: positionResult.transactionId,
      amount: validAmount,
      assetCode,
      positionUpdated: positionResult.updated
    };
    
  } catch (error) {
    throw new Error(`Deposit processing failed: ${error.message}`);
  }
}

/**
 * Process a withdrawal transaction
 * @param {object} supabase - Supabase client
 * @param {object} withdrawalData - Withdrawal transaction data
 * @returns {object} Processing result
 */
export async function processWithdrawal(supabase, withdrawalData) {
  const { investorId, assetCode, amount, txHash, note, adminId, positionId, currentBalance } = withdrawalData;
  
  // Validate inputs
  const amountValidation = validateAmount(amount, 0, currentBalance);
  if (!amountValidation.isValid) {
    throw new Error(`Invalid amount: ${amountValidation.error}`);
  }
  
  const validAmount = amountValidation.value;
  
  if (validAmount > currentBalance) {
    throw new Error('Insufficient balance for withdrawal');
  }
  
  const now = new Date().toISOString();
  
  try {
    // Record transaction
    const { error: txError } = await supabase
      .from('transactions')
      .insert({
        investor_id: investorId,
        asset_code: assetCode,
        amount: validAmount,
        type: 'WITHDRAWAL',
        status: 'confirmed',
        tx_hash: txHash,
        note: note || `Withdrawal of ${validAmount} ${assetCode}`,
        created_at: now,
        confirmed_at: now,
        created_by: adminId
      });
    
    if (txError) {
      throw new Error(`Failed to record transaction: ${txError.message}`);
    }
    
    // Update position
    const positionResult = await updatePositionForWithdrawal(supabase, {
      positionId,
      amount: validAmount,
      currentBalance,
      timestamp: now
    });
    
    return {
      success: true,
      amount: validAmount,
      assetCode,
      remainingBalance: positionResult.remainingBalance,
      positionUpdated: positionResult.updated
    };
    
  } catch (error) {
    throw new Error(`Withdrawal processing failed: ${error.message}`);
  }
}

/**
 * Update position for deposit
 * @param {object} supabase - Supabase client
 * @param {object} data - Position update data
 * @returns {object} Update result
 */
async function updatePositionForDeposit(supabase, { investorId, assetCode, amount, timestamp }) {
  // Check if position exists
  const { data: position, error: fetchError } = await supabase
    .from('positions')
    .select('*')
    .eq('investor_id', investorId)
    .eq('asset_code', assetCode)
    .single();
  
  if (fetchError && fetchError.code !== 'PGRST116') {
    throw new Error(`Failed to fetch position: ${fetchError.message}`);
  }
  
  if (position) {
    // Update existing position
    const { error: updateError } = await supabase
      .from('positions')
      .update({
        principal: position.principal + amount,
        current_balance: position.current_balance + amount,
        updated_at: timestamp
      })
      .eq('id', position.id);
    
    if (updateError) {
      throw new Error(`Failed to update position: ${updateError.message}`);
    }
    
    return { updated: true, created: false };
  } else {
    // Create new position
    const { error: createError } = await supabase
      .from('positions')
      .insert({
        investor_id: investorId,
        asset_code: assetCode,
        principal: amount,
        total_earned: 0,
        current_balance: amount,
        updated_at: timestamp
      });
    
    if (createError) {
      throw new Error(`Failed to create position: ${createError.message}`);
    }
    
    return { updated: false, created: true };
  }
}

/**
 * Update position for withdrawal
 * @param {object} supabase - Supabase client
 * @param {object} data - Position update data
 * @returns {object} Update result
 */
async function updatePositionForWithdrawal(supabase, { positionId, amount, currentBalance, timestamp }) {
  // Get current position to calculate principal reduction
  const { data: position, error: fetchError } = await supabase
    .from('positions')
    .select('principal, current_balance')
    .eq('id', positionId)
    .single();
  
  if (fetchError) {
    throw new Error(`Failed to fetch position: ${fetchError.message}`);
  }
  
  // Calculate principal reduction (withdraw from principal first)
  const principalReduction = Math.min(amount, position.principal);
  const remainingBalance = currentBalance - amount;
  
  const { error: updateError } = await supabase
    .from('positions')
    .update({
      principal: position.principal - principalReduction,
      current_balance: remainingBalance,
      updated_at: timestamp
    })
    .eq('id', positionId);
  
  if (updateError) {
    throw new Error(`Failed to update position: ${updateError.message}`);
  }
  
  return { updated: true, remainingBalance };
}

/**
 * Fetch transaction history
 * @param {object} supabase - Supabase client
 * @param {number} days - Number of days to fetch
 * @returns {array} Array of transaction records
 */
export async function fetchTransactionHistory(supabase, days = 30) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  
  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('*, profiles!transactions_investor_id_fkey(*)')
    .gte('created_at', date.toISOString())
    .order('created_at', { ascending: false });
  
  if (error) {
    throw new Error(`Failed to fetch transaction history: ${error.message}`);
  }
  
  return transactions || [];
}

/**
 * Group positions by investor for withdrawal selection
 * @param {array} positions - Array of position records
 * @returns {array} Grouped investor positions
 */
export function groupPositionsByInvestor(positions) {
  const investorPositions = {};
  
  for (const pos of positions) {
    const key = pos.investor_id;
    if (!investorPositions[key]) {
      investorPositions[key] = {
        investor: pos.profiles,
        positions: []
      };
    }
    investorPositions[key].positions.push(pos);
  }
  
  return Object.values(investorPositions);
}
