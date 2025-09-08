import { supabase } from '@/lib/supabase';

interface Position {
  id: string;
  investor_id: string;
  investment_amount: number;
  current_value: number;
  yield_rate: number;
  last_calculation_date: string;
}

interface YieldCalculation {
  position_id: string;
  daily_yield: number;
  cumulative_yield: number;
  new_value: number;
  calculation_date: string;
}

class YieldCalculationService {
  private isRunning = false;
  private lastRunTime: Date | null = null;

  /**
   * Calculate daily yields for all active positions
   */
  async calculateDailyYields(): Promise<{ success: boolean; message: string; calculations?: number }> {
    if (this.isRunning) {
      return { 
        success: false, 
        message: 'Yield calculation already in progress' 
      };
    }

    this.isRunning = true;
    console.log('🔄 Starting daily yield calculations...');

    try {
      // Get all active positions
      const { data: positions, error: fetchError } = await supabase
        .from('positions')
        .select('*')
        .eq('status', 'active')
        .order('investor_id');

      if (fetchError) {
        throw new Error(`Failed to fetch positions: ${fetchError.message}`);
      }

      if (!positions || positions.length === 0) {
        return { 
          success: true, 
          message: 'No active positions to calculate', 
          calculations: 0 
        };
      }

      console.log(`📊 Processing ${positions.length} active positions`);

      const calculations: YieldCalculation[] = [];
      const today = new Date().toISOString().split('T')[0];

      // Process each position
      for (const position of positions) {
        const calculation = await this.calculatePositionYield(position, today);
        if (calculation) {
          calculations.push(calculation);
        }
      }

      // Batch update positions
      if (calculations.length > 0) {
        await this.updatePositions(calculations);
        await this.logCalculations(calculations);
      }

      // Update system status
      await this.updateSystemStatus({
        last_yield_calculation: new Date().toISOString(),
        positions_calculated: calculations.length,
        status: 'healthy',
      });

      this.lastRunTime = new Date();
      this.isRunning = false;

      console.log(`✅ Yield calculations complete: ${calculations.length} positions updated`);

      return { 
        success: true, 
        message: `Successfully calculated yields for ${calculations.length} positions`, 
        calculations: calculations.length 
      };

    } catch (error) {
      this.isRunning = false;
      console.error('❌ Yield calculation failed:', error);

      // Log error to system
      await this.logError(error);

      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  /**
   * Calculate yield for a single position
   */
  private async calculatePositionYield(position: Position, date: string): Promise<YieldCalculation | null> {
    try {
      // Check if already calculated today
      const { data: existingCalc } = await supabase
        .from('yield_calculations')
        .select('id')
        .eq('position_id', position.id)
        .eq('calculation_date', date)
        .single();

      if (existingCalc) {
        console.log(`⏭️ Position ${position.id} already calculated for ${date}`);
        return null;
      }

      // Get yield configuration
      const { data: yieldConfig } = await supabase
        .from('yield_settings')
        .select('*')
        .eq('is_active', true)
        .single();

      const baseYieldRate = yieldConfig?.base_yield_rate || position.yield_rate || 0.12; // 12% default
      const dailyRate = baseYieldRate / 365;

      // Calculate daily yield (compound interest)
      const dailyYield = position.current_value * dailyRate;
      const newValue = position.current_value + dailyYield;

      // Calculate cumulative yield
      const cumulativeYield = newValue - position.investment_amount;

      return {
        position_id: position.id,
        daily_yield: dailyYield,
        cumulative_yield: cumulativeYield,
        new_value: newValue,
        calculation_date: date,
      };

    } catch (error) {
      console.error(`Failed to calculate yield for position ${position.id}:`, error);
      return null;
    }
  }

  /**
   * Update positions with new calculated values
   */
  private async updatePositions(calculations: YieldCalculation[]): Promise<void> {
    const updates = calculations.map(calc => ({
      id: calc.position_id,
      current_value: calc.new_value,
      total_yield: calc.cumulative_yield,
      last_calculation_date: calc.calculation_date,
      updated_at: new Date().toISOString(),
    }));

    // Batch update using Promise.all
    const updatePromises = updates.map(update =>
      supabase
        .from('positions')
        .update({
          current_value: update.current_value,
          total_yield: update.total_yield,
          last_calculation_date: update.last_calculation_date,
          updated_at: update.updated_at,
        })
        .eq('id', update.id)
    );

    await Promise.all(updatePromises);
  }

  /**
   * Log yield calculations to history table
   */
  private async logCalculations(calculations: YieldCalculation[]): Promise<void> {
    const logs = calculations.map(calc => ({
      position_id: calc.position_id,
      calculation_date: calc.calculation_date,
      daily_yield: calc.daily_yield,
      cumulative_yield: calc.cumulative_yield,
      position_value: calc.new_value,
      created_at: new Date().toISOString(),
    }));

    await supabase.from('yield_calculations').insert(logs);
  }

  /**
   * Calculate monthly performance for investor
   */
  async calculateMonthlyPerformance(
    investorId: string, 
    month: number, 
    year: number
  ): Promise<{
    totalInvestment: number;
    currentValue: number;
    monthlyYield: number;
    monthlyReturn: number;
    ytdReturn: number;
  }> {
    // Get all positions for investor
    const { data: positions } = await supabase
      .from('positions')
      .select('*')
      .eq('investor_id', investorId);

    const totalInvestment = positions?.reduce((sum, p) => sum + p.investment_amount, 0) || 0;
    const currentValue = positions?.reduce((sum, p) => sum + p.current_value, 0) || 0;

    // Get monthly yield calculations
    const startDate = new Date(year, month - 1, 1).toISOString();
    const endDate = new Date(year, month, 0).toISOString();

    const { data: monthlyCalcs } = await supabase
      .from('yield_calculations')
      .select('daily_yield')
      .in('position_id', positions?.map(p => p.id) || [])
      .gte('calculation_date', startDate)
      .lte('calculation_date', endDate);

    const monthlyYield = monthlyCalcs?.reduce((sum, c) => sum + c.daily_yield, 0) || 0;
    const monthlyReturn = totalInvestment > 0 ? (monthlyYield / totalInvestment) * 100 : 0;

    // Calculate YTD return
    const ytdStartDate = new Date(year, 0, 1).toISOString();
    const { data: ytdCalcs } = await supabase
      .from('yield_calculations')
      .select('daily_yield')
      .in('position_id', positions?.map(p => p.id) || [])
      .gte('calculation_date', ytdStartDate)
      .lte('calculation_date', endDate);

    const ytdYield = ytdCalcs?.reduce((sum, c) => sum + c.daily_yield, 0) || 0;
    const ytdReturn = totalInvestment > 0 ? (ytdYield / totalInvestment) * 100 : 0;

    return {
      totalInvestment,
      currentValue,
      monthlyYield,
      monthlyReturn,
      ytdReturn,
    };
  }

  /**
   * Apply platform management fees
   */
  async applyManagementFees(): Promise<{ success: boolean; message: string }> {
    try {
      console.log('💰 Applying monthly management fees...');

      // Get fee configuration
      const { data: feeConfig } = await supabase
        .from('fee_settings')
        .select('*')
        .eq('is_active', true)
        .single();

      const annualFeeRate = feeConfig?.management_fee_rate || 0.015; // 1.5% annual
      const monthlyFeeRate = annualFeeRate / 12;

      // Get all active positions
      const { data: positions } = await supabase
        .from('positions')
        .select('*')
        .eq('status', 'active');

      if (!positions || positions.length === 0) {
        return { success: true, message: 'No positions to apply fees to' };
      }

      let totalFeesCollected = 0;

      for (const position of positions) {
        const fee = position.current_value * monthlyFeeRate;
        const newValue = position.current_value - fee;

        // Update position
        await supabase
          .from('positions')
          .update({ 
            current_value: newValue,
            total_fees_paid: (position.total_fees_paid || 0) + fee,
          })
          .eq('id', position.id);

        // Log fee transaction
        await supabase.from('fee_transactions').insert({
          position_id: position.id,
          investor_id: position.investor_id,
          fee_type: 'management',
          fee_amount: fee,
          fee_rate: monthlyFeeRate,
          position_value_before: position.current_value,
          position_value_after: newValue,
          created_at: new Date().toISOString(),
        });

        totalFeesCollected += fee;
      }

      console.log(`✅ Management fees applied: $${totalFeesCollected.toFixed(2)} collected`);

      return { 
        success: true, 
        message: `Successfully applied fees to ${positions.length} positions. Total: $${totalFeesCollected.toFixed(2)}` 
      };

    } catch (error) {
      console.error('❌ Failed to apply management fees:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to apply fees' 
      };
    }
  }

  /**
   * Update system status
   */
  private async updateSystemStatus(status: any): Promise<void> {
    await supabase.from('system_status').upsert({
      id: 'yield_calculation',
      ...status,
      updated_at: new Date().toISOString(),
    });
  }

  /**
   * Log errors to system
   */
  private async logError(error: any): Promise<void> {
    await supabase.from('system_logs').insert({
      service: 'yield_calculation',
      level: 'error',
      message: error instanceof Error ? error.message : String(error),
      details: error instanceof Error ? { stack: error.stack } : {},
      created_at: new Date().toISOString(),
    });
  }

  /**
   * Get service health status
   */
  getHealthStatus(): { 
    status: 'healthy' | 'degraded' | 'unhealthy'; 
    lastRun: Date | null; 
    isRunning: boolean 
  } {
    const now = new Date();
    const hoursSinceLastRun = this.lastRunTime 
      ? (now.getTime() - this.lastRunTime.getTime()) / (1000 * 60 * 60)
      : Infinity;

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (hoursSinceLastRun > 48) {
      status = 'unhealthy';
    } else if (hoursSinceLastRun > 25) {
      status = 'degraded';
    }

    return {
      status,
      lastRun: this.lastRunTime,
      isRunning: this.isRunning,
    };
  }
}

// Export singleton instance
export const yieldCalculationService = new YieldCalculationService();

// Export convenience functions
export const calculateDailyYields = yieldCalculationService.calculateDailyYields.bind(yieldCalculationService);
export const calculateMonthlyPerformance = yieldCalculationService.calculateMonthlyPerformance.bind(yieldCalculationService);
export const applyManagementFees = yieldCalculationService.applyManagementFees.bind(yieldCalculationService);
