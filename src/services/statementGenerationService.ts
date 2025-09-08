import { supabase } from '@/lib/supabase';
import { generateStatementPDF, generateStatementFilename } from '@/utils/statementPdfGenerator';
import { uploadStatementToStorage } from '@/utils/statementStorage';
import { sendMonthlyStatement } from './emailService';

interface StatementData {
  investor_id: string;
  investor_name: string;
  investor_email: string;
  period_year: number;
  period_month: number;
  summary: {
    begin_balance: number;
    end_balance: number;
    additions: number;
    redemptions: number;
    net_income: number;
    fees: number;
    rate_of_return_mtd: number;
    rate_of_return_qtd: number;
    rate_of_return_ytd: number;
    rate_of_return_itd: number;
  };
  assets: Array<{
    asset_code: string;
    asset_name: string;
    begin_balance: number;
    end_balance: number;
    deposits: number;
    withdrawals: number;
    interest: number;
    fees: number;
    transactions: Array<{
      date: string;
      type: string;
      description: string;
      amount: number;
      running_balance: number;
    }>;
  }>;
}

class StatementGenerationService {
  private isGenerating = false;
  private lastGenerationTime: Date | null = null;

  /**
   * Generate monthly statements for all active investors
   */
  async generateMonthlyStatements(
    year?: number,
    month?: number
  ): Promise<{ success: boolean; message: string; generated?: number }> {
    if (this.isGenerating) {
      return { 
        success: false, 
        message: 'Statement generation already in progress' 
      };
    }

    this.isGenerating = true;
    console.log('📄 Starting monthly statement generation...');

    try {
      // Use previous month if not specified
      const now = new Date();
      if (!year || !month) {
        const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        year = previousMonth.getFullYear();
        month = previousMonth.getMonth() + 1;
      }

      // Get all active investors
      const { data: investors, error: investorError } = await supabase
        .from('investors')
        .select('*')
        .eq('status', 'active')
        .order('last_name');

      if (investorError) {
        throw new Error(`Failed to fetch investors: ${investorError.message}`);
      }

      if (!investors || investors.length === 0) {
        return { 
          success: true, 
          message: 'No active investors to generate statements for', 
          generated: 0 
        };
      }

      console.log(`📊 Generating statements for ${investors.length} investors (${month}/${year})`);

      let successCount = 0;
      const errors: string[] = [];

      // Process each investor
      for (const investor of investors) {
        try {
          const result = await this.generateInvestorStatement(investor, year, month);
          if (result.success) {
            successCount++;
            console.log(`✅ Statement generated for ${investor.first_name} ${investor.last_name}`);
          } else {
            errors.push(`${investor.email}: ${result.error}`);
          }
        } catch (error) {
          console.error(`Failed to generate statement for investor ${investor.id}:`, error);
          errors.push(`${investor.email}: ${error.message}`);
        }
      }

      // Log generation summary
      await this.logGenerationSummary({
        year,
        month,
        total_investors: investors.length,
        successful: successCount,
        failed: investors.length - successCount,
        errors,
      });

      this.lastGenerationTime = new Date();
      this.isGenerating = false;

      console.log(`✅ Statement generation complete: ${successCount}/${investors.length} successful`);

      return { 
        success: true, 
        message: `Generated ${successCount} of ${investors.length} statements`, 
        generated: successCount 
      };

    } catch (error) {
      this.isGenerating = false;
      console.error('❌ Statement generation failed:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  /**
   * Generate statement for a single investor
   */
  private async generateInvestorStatement(
    investor: any,
    year: number,
    month: number
  ): Promise<{ success: boolean; error?: string; statementId?: string }> {
    try {
      // Check if statement already exists
      const { data: existingStatement } = await supabase
        .from('statements')
        .select('id')
        .eq('investor_id', investor.id)
        .eq('period_year', year)
        .eq('period_month', month)
        .single();

      if (existingStatement) {
        console.log(`⏭️ Statement already exists for ${investor.email} (${month}/${year})`);
        return { success: true, statementId: existingStatement.id };
      }

      // Gather statement data
      const statementData = await this.gatherStatementData(investor, year, month);

      // Generate PDF
      const pdfBlob = await generateStatementPDF(statementData);

      // Upload to storage
      const storageResult = await uploadStatementToStorage(
        pdfBlob,
        investor.id,
        year,
        month
      );

      if (!storageResult) {
        throw new Error('Failed to upload statement to storage');
      }

      // Save statement record to database
      const { data: statement, error: saveError } = await supabase
        .from('statements')
        .insert({
          investor_id: investor.id,
          period_year: year,
          period_month: month,
          statement_data: statementData,
          storage_path: storageResult.storage_path,
          generated_at: new Date().toISOString(),
          sent_at: null,
        })
        .select()
        .single();

      if (saveError) {
        throw new Error(`Failed to save statement: ${saveError.message}`);
      }

      // Send email notification
      if (investor.email) {
        const emailResult = await sendMonthlyStatement(
          {
            email: investor.email,
            firstName: investor.first_name,
            lastName: investor.last_name,
          },
          storageResult.signed_url,
          this.getMonthName(month),
          year
        );

        if (emailResult.success) {
          // Update statement as sent
          await supabase
            .from('statements')
            .update({ sent_at: new Date().toISOString() })
            .eq('id', statement.id);
        }
      }

      return { success: true, statementId: statement.id };

    } catch (error) {
      console.error(`Failed to generate statement for investor ${investor.id}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Gather all data needed for statement generation
   */
  private async gatherStatementData(
    investor: any,
    year: number,
    month: number
  ): Promise<StatementData> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    const previousMonthEnd = new Date(year, month - 1, 0, 23, 59, 59);

    // Get positions
    const { data: positions } = await supabase
      .from('positions')
      .select('*')
      .eq('investor_id', investor.id);

    // Get transactions for the month
    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('investor_id', investor.id)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at');

    // Calculate balances and returns
    const beginBalance = await this.getBalanceAtDate(investor.id, previousMonthEnd);
    const endBalance = await this.getBalanceAtDate(investor.id, endDate);

    // Sum transaction types
    const deposits = transactions?.filter(t => t.type === 'deposit')
      .reduce((sum, t) => sum + t.amount, 0) || 0;
    
    const withdrawals = transactions?.filter(t => t.type === 'withdrawal')
      .reduce((sum, t) => sum + t.amount, 0) || 0;

    // Calculate interest and fees from yield calculations
    const { data: yieldCalcs } = await supabase
      .from('yield_calculations')
      .select('daily_yield')
      .in('position_id', positions?.map(p => p.id) || [])
      .gte('calculation_date', startDate.toISOString())
      .lte('calculation_date', endDate.toISOString());

    const interest = yieldCalcs?.reduce((sum, y) => sum + y.daily_yield, 0) || 0;

    // Get fees
    const { data: feeTransactions } = await supabase
      .from('fee_transactions')
      .select('fee_amount')
      .eq('investor_id', investor.id)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    const fees = feeTransactions?.reduce((sum, f) => sum + f.fee_amount, 0) || 0;

    // Calculate returns
    const monthlyReturn = beginBalance > 0 ? ((endBalance - beginBalance - deposits + withdrawals) / beginBalance) * 100 : 0;
    const ytdReturn = await this.calculateYTDReturn(investor.id, year, month);
    const qtdReturn = await this.calculateQTDReturn(investor.id, year, month);
    const itdReturn = await this.calculateITDReturn(investor.id);

    // Build asset details
    const assetDetails = await this.buildAssetDetails(investor.id, positions || [], transactions || [], year, month);

    return {
      investor_id: investor.id,
      investor_name: `${investor.first_name} ${investor.last_name}`,
      investor_email: investor.email,
      period_year: year,
      period_month: month,
      summary: {
        begin_balance: beginBalance,
        end_balance: endBalance,
        additions: deposits,
        redemptions: withdrawals,
        net_income: interest,
        fees: fees,
        rate_of_return_mtd: monthlyReturn,
        rate_of_return_qtd: qtdReturn,
        rate_of_return_ytd: ytdReturn,
        rate_of_return_itd: itdReturn,
      },
      assets: assetDetails,
    };
  }

  /**
   * Get balance at a specific date
   */
  private async getBalanceAtDate(investorId: string, date: Date): Promise<number> {
    const { data: positions } = await supabase
      .from('positions')
      .select('current_value')
      .eq('investor_id', investorId)
      .lte('created_at', date.toISOString());

    return positions?.reduce((sum, p) => sum + p.current_value, 0) || 0;
  }

  /**
   * Calculate year-to-date return
   */
  private async calculateYTDReturn(investorId: string, year: number, month: number): Promise<number> {
    const yearStart = new Date(year, 0, 1);
    const monthEnd = new Date(year, month, 0, 23, 59, 59);

    const startBalance = await this.getBalanceAtDate(investorId, yearStart);
    const endBalance = await this.getBalanceAtDate(investorId, monthEnd);

    if (startBalance === 0) return 0;

    // Get net deposits/withdrawals for YTD
    const { data: transactions } = await supabase
      .from('transactions')
      .select('type, amount')
      .eq('investor_id', investorId)
      .gte('created_at', yearStart.toISOString())
      .lte('created_at', monthEnd.toISOString());

    const netFlow = transactions?.reduce((sum, t) => {
      return t.type === 'deposit' ? sum + t.amount : sum - t.amount;
    }, 0) || 0;

    return ((endBalance - startBalance - netFlow) / startBalance) * 100;
  }

  /**
   * Calculate quarter-to-date return
   */
  private async calculateQTDReturn(investorId: string, year: number, month: number): Promise<number> {
    const quarter = Math.floor((month - 1) / 3);
    const quarterStart = new Date(year, quarter * 3, 1);
    const monthEnd = new Date(year, month, 0, 23, 59, 59);

    const startBalance = await this.getBalanceAtDate(investorId, quarterStart);
    const endBalance = await this.getBalanceAtDate(investorId, monthEnd);

    if (startBalance === 0) return 0;

    return ((endBalance - startBalance) / startBalance) * 100;
  }

  /**
   * Calculate inception-to-date return
   */
  private async calculateITDReturn(investorId: string): Promise<number> {
    const { data: firstPosition } = await supabase
      .from('positions')
      .select('investment_amount, current_value')
      .eq('investor_id', investorId)
      .order('created_at')
      .limit(1)
      .single();

    if (!firstPosition) return 0;

    const totalInvested = firstPosition.investment_amount;
    const currentValue = firstPosition.current_value;

    return totalInvested > 0 ? ((currentValue - totalInvested) / totalInvested) * 100 : 0;
  }

  /**
   * Build asset details for statement
   */
  private async buildAssetDetails(
    investorId: string,
    positions: any[],
    transactions: any[],
    year: number,
    month: number
  ): Promise<any[]> {
    const assetDetails: any[] = [];

    for (const position of positions) {
      const positionTransactions = transactions.filter(t => t.position_id === position.id);
      
      const asset = {
        asset_code: position.asset_code || 'FUND',
        asset_name: position.asset_name || 'Indigo Yield Fund',
        begin_balance: position.investment_amount,
        end_balance: position.current_value,
        deposits: positionTransactions.filter(t => t.type === 'deposit')
          .reduce((sum, t) => sum + t.amount, 0),
        withdrawals: positionTransactions.filter(t => t.type === 'withdrawal')
          .reduce((sum, t) => sum + t.amount, 0),
        interest: position.total_yield || 0,
        fees: position.total_fees_paid || 0,
        transactions: positionTransactions.map(t => ({
          date: t.created_at,
          type: t.type,
          description: t.description || t.type,
          amount: t.amount,
          running_balance: t.running_balance || 0,
        })),
      };

      assetDetails.push(asset);
    }

    return assetDetails;
  }

  /**
   * Log generation summary to database
   */
  private async logGenerationSummary(summary: any): Promise<void> {
    await supabase.from('statement_generation_logs').insert({
      generation_date: new Date().toISOString(),
      period_year: summary.year,
      period_month: summary.month,
      total_investors: summary.total_investors,
      successful: summary.successful,
      failed: summary.failed,
      errors: summary.errors,
      created_at: new Date().toISOString(),
    });
  }

  /**
   * Get month name
   */
  private getMonthName(month: number): string {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return monthNames[month - 1];
  }

  /**
   * Get service health status
   */
  getHealthStatus(): { 
    status: 'healthy' | 'degraded' | 'unhealthy'; 
    lastRun: Date | null; 
    isGenerating: boolean 
  } {
    const now = new Date();
    const daysSinceLastRun = this.lastGenerationTime 
      ? (now.getTime() - this.lastGenerationTime.getTime()) / (1000 * 60 * 60 * 24)
      : Infinity;

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (daysSinceLastRun > 45) {
      status = 'unhealthy';
    } else if (daysSinceLastRun > 35) {
      status = 'degraded';
    }

    return {
      status,
      lastRun: this.lastGenerationTime,
      isGenerating: this.isGenerating,
    };
  }
}

// Export singleton instance
export const statementGenerationService = new StatementGenerationService();

// Export convenience functions
export const generateMonthlyStatements = statementGenerationService.generateMonthlyStatements.bind(statementGenerationService);
