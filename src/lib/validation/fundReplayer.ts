import { SupabaseClient } from '@supabase/supabase-js';
import { ParsedFundData, ExcelTransaction } from './excelParser';
import { TransactionMapper } from './transactionMapper';

interface FinancialTransactionResult {
  success: boolean;
  transactionId?: string;
  error?: string;
}

interface FundState {
  positions: Record<string, {  // investorId -> position
    currentValue: number;
    costBasis: number;
    shares: number;
    isActive: boolean;
  }>;
  transactions: string[]; // transaction IDs
  yieldDistributions: string[]; // distribution IDs
}

export class FundReplayer {
  private supabase: SupabaseClient;
  private transactionMapper: TransactionMapper;
  private fundId: string;
  private investorIdMap: Map<string, string>; // investorName -> investorId
  private fundState: FundState;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
    this.transactionMapper = new TransactionMapper();
    this.fundId = '';
    this.investorIdMap = new Map();
    this.fundState = {
      positions: {},
      transactions: [],
      yieldDistributions: [],
    };
  }

  /**
   * Initialize a new fund for replay
   */
  async initializeFund(fundData: ParsedFundData): Promise<string> {
    // Create fund record
    const { data: fund, error } = await this.supabase
      .from('funds')
      .insert({
        code: this.getFundCode(fundData.currency),
        name: fundData.fundName,
        asset: fundData.currency,
        status: 'active',
        inception_date: this.getInceptionDate(fundData.transactions),
        fund_class: 'yield',
      })
      .select()
      .single();

    if (error) throw error;
    this.fundId = fund.id;

    // Create investor profiles and positions
    for (const investor of fundData.investors) {
      // Create auth user (in real scenario, these would exist)
      // For validation, we'll use predefined IDs or create them
      const investorId = await this.getOrCreateInvestor(investor.name);
      this.investorIdMap.set(investor.name, investorId);

      // Create profile
      await this.supabase.from('profiles').upsert({
        id: investorId,
        email: `${investor.name.toLowerCase().replace(/\s+/g, '.')}@test.local`,
        first_name: investor.name.split(' ')[0] || investor.name,
        last_name: investor.name.split(' ')[1] || '',
        role: 'investor',
      });

      // Create initial position
      await this.supabase.from('investor_positions').upsert({
        investor_id: investorId,
        fund_id: this.fundId,
        current_value: 0,
        cost_basis: 0,
        shares: 0,
        is_active: true,
      });

      // Set fee schedule
      await this.supabase.from('investor_fee_schedule').upsert({
        investor_id: investorId,
        fund_id: this.fundId,
        fee_pct: investor.feePct,
        effective_date: '2024-01-01',
      });

      // Set IB schedule if applicable
      if (investor.ibPct !== null && investor.ibPct > 0) {
        await this.supabase.from('ib_commission_schedule').upsert({
          investor_id: investorId,
          fund_id: this.fundId,
          ib_percentage: investor.ibPct,
          effective_date: '2024-01-01',
        });
      }
    }

    return this.fundId;
  }

  /**
   * Replay the complete fund lifecycle
   */
  async replayLifecycle(fundData: ParsedFundData): Promise<FundState> {
    // Group transactions by date to handle same-day transactions correctly
    const groupedTxns = this.transactionMapper.groupTransactionsByDate(fundData.transactions);
    
    // Process each day in chronological order
    for (const [dateString, transactions] of Array.from(groupedTxns.entries()).sort()) {
      // Process all transactions for this day
      for (const excelTx of transactions) {
        await this.processTransaction(excelTx, fundData);
      }
      
      // Check if we need to apply yield distribution for month-end
      // This is simplified - in reality we'd check if it's the last day of the month
      // and if there's a yield event recorded in Excel
      const date = new Date(dateString);
      if (date.getDate() === 28 || date.getDate() === 30 || date.getDate() === 31) {
        // Simple heuristic - real implementation would check Excel for yield events
        await this.applyMonthEndYield(dateString);
      }
    }
    
    // Apply any final yield distribution
    await this.applyFinalYieldIfNeeded(fundData);
    
    return this.fundState;
  }

  /**
   * Process a single transaction
   */
  private async processTransaction(excelTx: ExcelTransaction, fundData: ParsedFundData): Promise<void> {
    const investorName = excelTx.investorName;
    const investorId = this.investorIdMap.get(investorName);
    
    if (!investorId) {
      throw new Error(`Investor not found: ${investorName}`);
    }

    // Map to financial transaction format
    const financialTx = this.transactionMapper.mapToFinancialTransaction(
      excelTx, 
      this.fundId, 
      investorId
    );

    // Apply investor transaction via RPC
    const { data, error } = await this.supabase
      .rpc('apply_investor_transaction', {
        p_investor_id: financialTx.investor_id,
        p_fund_id: financialTx.fund_id,
        p_amount: financialTx.amount,
        p_transaction_type: financialTx.transaction_type,
        p_transaction_date: financialTx.transaction_date,
        p_metadata: JSON.stringify(financialTx.metadata)
      });

    if (error) {
      throw new Error(`Failed to apply transaction: ${error.message}`);
    }

    if (data) {
      this.fundState.transactions.push(data);
    }
  }

  /**
   * Apply month-end yield distribution
   */
  private async applyMonthEndYield(dateString: string): Promise<void> {
    // This would call the yield distribution RPC
    // For now, we'll skip as the exact logic depends on the yield calculation
    // In a full implementation, this would:
    // 1. Calculate yield based on period performance
    // 2. Call apply_segmented_yield_distribution_v5
    // 3. Record the distribution ID
  }

  /**
   * Apply final yield if needed based on Excel data
   */
  private async applyFinalYieldIfNeeded(fundData: ParsedFundData): Promise<void> {
    // Similar to above - would check Excel for final yield data
  }

  /**
   * Get or create investor ID (in real system, these would come from auth)
   */
  private async getOrCreateInvestor(investorName: string): Promise<string> {
    // For validation purposes, we'll use deterministic IDs based on name
    // In reality, these would be fetched from auth system or created
    const hash = this.simpleHash(investorName);
    return `00000000-0000-0000-0000-${hash.toString(16).padStart(12, '0')}`;
  }

  /**
   * Simple hash function for generating deterministic IDs
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Get fund code from currency
   */
  private getFundCode(currency: string): string {
    const map: Record<string, string> = {
      'BTC': 'IND-BTC',
      'USDT': 'IND-USDT',
      'ETH': 'IND-ETH',
      'SOL': 'IND-SOL',
      'XRP': 'IND-XRP',
      'BTC TAC': 'IND-BTCTAC',
      'ETH TAC': 'IND-ETHTAC',
    };
    return map[currency] || `IND-${currency}`;
  }

  /**
   * Get inception date from transactions
   */
  private getInceptionDate(transactions: ExcelTransaction[]): string {
    if (transactions.length === 0) return '2024-01-01';
    const dates = transactions.map(t => new Date(t.date as string));
    const earliest = new Date(Math.min(...dates.map(d => d.getTime())));
    return earliest.toISOString().split('T')[0];
  }

  /**
   * Get current fund state for comparison
   */
  async getCurrentState(): Promise<FundState> {
    // Fetch current positions from database
    const { data: positions, error } = await this.supabase
      .from('investor_positions')
      .select('investor_id, current_value, cost_basis, shares, is_active')
      .eq('fund_id', this.fundId);

    if (error) throw error;
    
    // Convert to map
    const positionMap: Record<string, { 
      currentValue: number; 
      costBasis: number; 
      shares: number; 
      isActive: boolean 
    }> = {};
    
    positions.forEach(pos => {
      positionMap[pos.investor_id] = {
        currentValue: Number(pos.current_value),
        costBasis: Number(pos.cost_basis),
        shares: Number(pos.shares),
        isActive: pos.is_active,
      };
    });

    return {
      positions: positionMap,
      transactions: [...this.fundState.transactions],
      yieldDistributions: [...this.fundState.yieldDistributions],
    };
  }
}
