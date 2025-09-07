/**
 * Admin Transaction Management Server Helpers
 * Client-side functions for transaction operations
 */

import { supabase } from '@/integrations/supabase/client';

export interface Transaction {
  id: string;
  investor_id: string;
  fund_id: string;
  tx_date: string;
  value_date: string;
  asset: string;
  amount: number;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'INTEREST' | 'FEE' | 'ADJUSTMENT';
  balance_before?: number;
  balance_after?: number;
  tx_hash?: string;
  reference_id?: string;
  notes?: string;
  approved_by?: string;
  approved_at?: string;
  created_by?: string;
  created_at: string;
}

export interface TransactionWithRelations extends Transaction {
  investors?: {
    id: string;
    name: string;
    email: string;
  };
  funds?: {
    id: string;
    code: string;
    name: string;
  };
}

export interface CreateTransactionInput {
  investor_id: string;
  fund_id: string;
  tx_date: string;
  asset: string;
  amount: number;
  type: Transaction['type'];
  tx_hash?: string;
  notes?: string;
}

/**
 * List transactions with optional filters
 */
export async function listTransactions(filters?: {
  investor_id?: string;
  fund_id?: string;
  type?: Transaction['type'];
  start_date?: string;
  end_date?: string;
  limit?: number;
}) {
  let query = supabase
    .from('transactions_v2')
    .select(`
      *,
      investors!inner(id, name, email),
      funds!inner(id, code, name)
    `)
    .order('tx_date', { ascending: false });

  if (filters?.investor_id) {
    query = query.eq('investor_id', filters.investor_id);
  }
  if (filters?.fund_id) {
    query = query.eq('fund_id', filters.fund_id);
  }
  if (filters?.type) {
    query = query.eq('type', filters.type);
  }
  if (filters?.start_date) {
    query = query.gte('tx_date', filters.start_date);
  }
  if (filters?.end_date) {
    query = query.lte('tx_date', filters.end_date);
  }
  if (filters?.limit) {
    query = query.limit(filters.limit);
  } else {
    query = query.limit(500); // Default limit
  }

  const { data, error } = await query;

  if (error) throw error;
  return data as TransactionWithRelations[];
}

/**
 * Get transaction by ID
 */
export async function getTransaction(transactionId: string) {
  const { data, error } = await supabase
    .from('transactions_v2')
    .select(`
      *,
      investors!inner(id, name, email),
      funds!inner(id, code, name)
    `)
    .eq('id', transactionId)
    .single();

  if (error) throw error;
  return data as TransactionWithRelations;
}

/**
 * Create a new transaction
 */
export async function createTransaction(input: CreateTransactionInput) {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No authenticated user');

  // Get current balance for the investor
  const { data: position } = await supabase
    .from('investor_positions')
    .select('current_value')
    .eq('investor_id', input.investor_id)
    .eq('fund_id', input.fund_id)
    .single();

  const balanceBefore = position?.current_value || 0;
  
  // Calculate balance after
  let balanceAfter = balanceBefore;
  if (input.type === 'DEPOSIT' || input.type === 'INTEREST') {
    balanceAfter = balanceBefore + input.amount;
  } else if (input.type === 'WITHDRAWAL' || input.type === 'FEE') {
    balanceAfter = balanceBefore - input.amount;
  } else if (input.type === 'ADJUSTMENT') {
    balanceAfter = balanceBefore + input.amount; // Can be positive or negative
  }

  // Create transaction
  const { data: transaction, error: txError } = await supabase
    .from('transactions_v2')
    .insert({
      ...input,
      value_date: input.tx_date,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      created_by: user.id,
      approved_by: user.id,
      approved_at: new Date().toISOString()
    })
    .select()
    .single();

  if (txError) throw txError;

  // Update investor position
  if (position) {
    const { error: posError } = await supabase
      .from('investor_positions')
      .update({
        current_value: balanceAfter,
        last_transaction_date: input.tx_date
      })
      .eq('investor_id', input.investor_id)
      .eq('fund_id', input.fund_id);

    if (posError) throw posError;
  } else {
    // Create new position if doesn't exist
    const { error: posError } = await supabase
      .from('investor_positions')
      .insert({
        investor_id: input.investor_id,
        fund_id: input.fund_id,
        shares: 0, // Will be calculated based on NAV
        cost_basis: input.type === 'DEPOSIT' ? input.amount : 0,
        current_value: balanceAfter,
        last_transaction_date: input.tx_date
      });

    if (posError) throw posError;
  }

  // Log to audit trail
  await supabase
    .from('audit_log')
    .insert({
      actor_user: user.id,
      action: `CREATE_${input.type}`,
      entity: 'transaction',
      entity_id: transaction.id,
      new_values: transaction,
      meta: {
        investor_id: input.investor_id,
        fund_id: input.fund_id,
        amount: input.amount
      }
    });

  return transaction as Transaction;
}

/**
 * Bulk import transactions
 */
export async function bulkImportTransactions(transactions: CreateTransactionInput[]) {
  const results = {
    success: 0,
    failed: 0,
    errors: [] as any[]
  };

  for (const tx of transactions) {
    try {
      await createTransaction(tx);
      results.success++;
    } catch (error) {
      results.failed++;
      results.errors.push({
        transaction: tx,
        error: String(error)
      });
    }
  }

  return results;
}

/**
 * Update transaction (admin only)
 */
export async function updateTransaction(
  transactionId: string,
  updates: Partial<Transaction>
) {
  const { data, error } = await supabase
    .from('transactions_v2')
    .update(updates)
    .eq('id', transactionId)
    .select()
    .single();

  if (error) throw error;

  // Log to audit trail
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase
      .from('audit_log')
      .insert({
        actor_user: user.id,
        action: 'UPDATE_TRANSACTION',
        entity: 'transaction',
        entity_id: transactionId,
        new_values: updates
      });
  }

  return data as Transaction;
}

/**
 * Delete transaction (soft delete by marking as cancelled)
 */
export async function cancelTransaction(transactionId: string, reason: string) {
  const { data, error } = await supabase
    .from('transactions_v2')
    .update({
      type: 'ADJUSTMENT',
      amount: 0,
      notes: `CANCELLED: ${reason}`
    })
    .eq('id', transactionId)
    .select()
    .single();

  if (error) throw error;

  // Log to audit trail
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase
      .from('audit_log')
      .insert({
        actor_user: user.id,
        action: 'CANCEL_TRANSACTION',
        entity: 'transaction',
        entity_id: transactionId,
        meta: { reason }
      });
  }

  return data as Transaction;
}

/**
 * Get transaction summary for a period
 */
export async function getTransactionSummary(
  startDate: string,
  endDate: string,
  groupBy: 'day' | 'week' | 'month' = 'day'
) {
  const { data, error } = await supabase
    .rpc('get_transaction_summary', {
      start_date: startDate,
      end_date: endDate,
      group_by: groupBy
    });

  if (error) throw error;
  return data;
}

/**
 * Calculate fees for transactions
 */
export async function calculateTransactionFees(
  transactionId: string,
  feeType: 'management' | 'performance' | 'redemption'
) {
  const transaction = await getTransaction(transactionId);
  
  // Get fund fee structure
  const { data: fund } = await supabase
    .from('funds')
    .select('mgmt_fee_bps, perf_fee_bps')
    .eq('id', transaction.fund_id)
    .single();

  if (!fund) throw new Error('Fund not found');

  let feeBps = 0;
  if (feeType === 'management') {
    feeBps = fund.mgmt_fee_bps;
  } else if (feeType === 'performance') {
    feeBps = fund.perf_fee_bps;
  } else if (feeType === 'redemption') {
    feeBps = 50; // 0.5% redemption fee
  }

  const feeAmount = (transaction.amount * feeBps) / 10000;

  // Create fee calculation record
  const { data: feeCalc, error } = await supabase
    .from('fee_calculations')
    .insert({
      fund_id: transaction.fund_id,
      investor_id: transaction.investor_id,
      calculation_date: new Date().toISOString().split('T')[0],
      fee_type: feeType,
      calculation_basis: transaction.amount,
      rate_bps: feeBps,
      fee_amount: feeAmount,
      status: 'pending'
    })
    .select()
    .single();

  if (error) throw error;
  return feeCalc;
}

/**
 * Export transactions to CSV
 */
export function exportTransactionsToCSV(transactions: TransactionWithRelations[]) {
  const headers = [
    'Date',
    'Investor',
    'Email',
    'Fund',
    'Asset',
    'Type',
    'Amount',
    'Balance Before',
    'Balance After',
    'TX Hash',
    'Notes'
  ];

  const rows = transactions.map(tx => [
    tx.tx_date,
    tx.investors?.name || '',
    tx.investors?.email || '',
    tx.funds?.code || '',
    tx.asset,
    tx.type,
    tx.amount,
    tx.balance_before || '',
    tx.balance_after || '',
    tx.tx_hash || '',
    tx.notes || ''
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => 
      typeof cell === 'string' && cell.includes(',') 
        ? `"${cell}"` 
        : cell
    ).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
