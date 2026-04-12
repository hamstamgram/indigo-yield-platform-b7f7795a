import { SupabaseClient } from '@supabase/supabase-js';
import { ParsedFundData, ExcelTransaction, YieldEvent, AumSnapshot } from './excelParser';
import { TransactionMapper } from './transactionMapper';

interface FinancialTransactionResult {
  success: boolean;
  transactionId?: string;
  error?: string;
}

interface EngineState {
  totalAum: number;
  positions: Record<string, number>;
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
  engineStates: Record<string, EngineState>; // date -> state snapshot
  yieldEvents: Array<{
    periodEnd: string;
    grossYield: number;
    purpose: string;
  }>;
}

export class FundReplayer {
  private supabase: SupabaseClient;
  private transactionMapper: TransactionMapper;
  private fundId: string;
  private investorIdMap: Map<string, string>; // investorName -> investorId
  private investorIdToName: Map<string, string>; // investorId -> investorName
  private fundState: FundState;
  private adminId: string;

  constructor(supabase: SupabaseClient, adminId: string = 'cd60cf98-8ae8-436d-b53c-d1b3cbca3c47') {
    this.supabase = supabase;
    this.transactionMapper = new TransactionMapper();
    this.fundId = '';
    this.investorIdMap = new Map();
    this.investorIdToName = new Map();
    this.adminId = adminId;
    this.fundState = {
      positions: {},
      transactions: [],
      yieldDistributions: [],
      engineStates: {},
      yieldEvents: [],
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
      this.investorIdToName.set(investorId, investor.name);

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
   * Replay the complete fund lifecycle with yield distributions and snapshots
   */
  async replayLifecycle(
    fundData: ParsedFundData,
    yieldEvents: YieldEvent[],
    snapshots: AumSnapshot[]
  ): Promise<FundState> {
    const groupedTxns = this.transactionMapper.groupTransactionsByDate(fundData.transactions);
    const sortedDates = Array.from(groupedTxns.entries()).sort((a, b) => 
      new Date(a[0]).getTime() - new Date(b[0]).getTime()
    );

    // Capture initial state
    await this.captureState(sortedDates[0]?.[0] || '1970-01-01');

    for (const [dateString, transactions] of sortedDates) {
      // Apply yield distribution BEFORE transactions if there's a yield event for this date
      const yieldForDate = yieldEvents.filter(e => e.date === dateString);
      for (const yieldEvent of yieldForDate) {
        await this.applyYieldDistribution(yieldEvent);
      }

      // Process all transactions for this day
      for (const excelTx of transactions) {
        await this.processTransaction(excelTx, fundData);
      }

      // Capture state after all operations for this date
      await this.captureState(dateString);
    }

    return this.fundState;
  }

  /**
   * Capture current engine state at a given date checkpoint
   */
  private async captureState(date: string): Promise<void> {
    const { data: positions, error } = await this.supabase
      .from('investor_positions')
      .select('investor_id, current_value')
      .eq('fund_id', this.fundId);

    if (error || !positions) {
      console.error(`Failed to capture state for ${date}:`, error);
      return;
    }

    const positionMap: Record<string, number> = {};
    let totalAum = 0;

    for (const pos of positions) {
      const investorName = this.investorIdToName.get(pos.investor_id) || pos.investor_id;
      const value = Number(pos.current_value) || 0;
      positionMap[investorName] = value;
      totalAum += value;
    }

    this.fundState.engineStates[date] = {
      totalAum,
      positions: positionMap,
    };
  }

  /**
   * Apply yield distribution from Excel event data
   */
  async applyYieldDistribution(yieldEvent: YieldEvent): Promise<void> {
    const { data, error } = await this.supabase
      .rpc('apply_segmented_yield_distribution_v5', {
        p_fund_id: this.fundId,
        p_period_end: yieldEvent.date,
        p_recorded_aum: yieldEvent.recordedAum,
        p_purpose: yieldEvent.purpose,
        p_admin_id: this.adminId,
        p_yield_amount: yieldEvent.grossYield,
      });

    if (error) {
      console.error(`Failed to apply yield distribution for ${yieldEvent.date}:`, error.message);
      throw error;
    }

    if (data) {
      this.fundState.yieldDistributions.push(data.id || data.distribution_id || String(data));
      this.fundState.yieldEvents.push({
        periodEnd: yieldEvent.date,
        grossYield: yieldEvent.grossYield,
        purpose: yieldEvent.purpose,
      });
    }
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
      engineStates: { ...this.fundState.engineStates },
      yieldEvents: [...this.fundState.yieldEvents],
    };
  }
}
