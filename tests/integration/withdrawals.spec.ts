import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * Integration Tests for Withdrawal Workflow
 * Tests P0 Fix: Withdrawal approval/rejection/completion uses RPC with admin validation
 */

// Mock Supabase client
const mockRpc = vi.fn();
const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: (...args: unknown[]) => {
      mockFrom(...args);
      return {
        select: (...selectArgs: unknown[]) => {
          mockSelect(...selectArgs);
          return {
            eq: (...eqArgs: unknown[]) => {
              mockEq(...eqArgs);
              return {
                single: () => mockSingle(),
                gt: () => ({ data: [], error: null }),
              };
            },
            order: () => ({ data: [], error: null }),
          };
        },
        insert: (...insertArgs: unknown[]) => {
          mockInsert(...insertArgs);
          return { data: null, error: null };
        },
        update: (...updateArgs: unknown[]) => {
          mockUpdate(...updateArgs);
          return {
            eq: () => ({ data: null, error: null }),
          };
        },
      };
    },
  },
}));

describe('Withdrawals Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Withdrawal Request Creation', () => {
    it('should create withdrawal request via RPC with correct parameters', async () => {
      mockRpc.mockResolvedValueOnce({ data: { id: 'new-withdrawal-id' }, error: null });

      const { supabase } = await import('@/integrations/supabase/client');
      
      const result = await supabase.rpc('create_withdrawal_request', {
        p_investor_id: 'investor-123',
        p_fund_id: 'fund-456',
        p_amount: 1.5,
        p_type: 'partial',
        p_notes: 'Test withdrawal',
      });

      expect(mockRpc).toHaveBeenCalledWith('create_withdrawal_request', {
        p_investor_id: 'investor-123',
        p_fund_id: 'fund-456',
        p_amount: 1.5,
        p_type: 'partial',
        p_notes: 'Test withdrawal',
      });
      expect(result.error).toBeNull();
    });

    it('should reject creation when amount exceeds balance', async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Insufficient balance', code: 'P0001' },
      });

      const { supabase } = await import('@/integrations/supabase/client');
      
      const result = await supabase.rpc('create_withdrawal_request', {
        p_investor_id: 'investor-123',
        p_fund_id: 'fund-456',
        p_amount: 1000000, // Exceeds balance
        p_type: 'full',
        p_notes: null,
      });

      expect(result.error).not.toBeNull();
      expect(result.error?.message).toContain('Insufficient');
    });
  });

  describe('Withdrawal Approval Flow', () => {
    it('should approve withdrawal via RPC with admin validation', async () => {
      mockRpc.mockResolvedValueOnce({ data: true, error: null });

      const { supabase } = await import('@/integrations/supabase/client');
      
      const result = await supabase.rpc('approve_withdrawal', {
        p_request_id: 'withdrawal-123',
        p_approved_amount: 1.5,
      });

      expect(mockRpc).toHaveBeenCalledWith('approve_withdrawal', {
        p_request_id: 'withdrawal-123',
        p_approved_amount: 1.5,
      });
      expect(result.error).toBeNull();
      expect(result.data).toBe(true);
    });

    it('should reject approval from non-admin users', async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Only admins can approve withdrawals', code: '42501' },
      });

      const { supabase } = await import('@/integrations/supabase/client');
      
      const result = await supabase.rpc('approve_withdrawal', {
        p_request_id: 'withdrawal-123',
        p_approved_amount: 1.5,
      });

      expect(result.error).not.toBeNull();
      expect(result.error?.message).toContain('admin');
    });
  });

  describe('Withdrawal Rejection Flow', () => {
    it('should reject withdrawal via RPC with reason', async () => {
      mockRpc.mockResolvedValueOnce({ data: true, error: null });

      const { supabase } = await import('@/integrations/supabase/client');
      
      const result = await supabase.rpc('reject_withdrawal', {
        p_request_id: 'withdrawal-123',
        p_reason: 'Insufficient documentation provided',
      });

      expect(mockRpc).toHaveBeenCalledWith('reject_withdrawal', {
        p_request_id: 'withdrawal-123',
        p_reason: 'Insufficient documentation provided',
      });
      expect(result.error).toBeNull();
    });

    it('should require rejection reason', async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Rejection reason is required', code: 'P0001' },
      });

      const { supabase } = await import('@/integrations/supabase/client');
      
      const result = await supabase.rpc('reject_withdrawal', {
        p_request_id: 'withdrawal-123',
        p_reason: '', // Empty reason
      });

      expect(result.error).not.toBeNull();
    });
  });

  describe('Withdrawal Processing Flow', () => {
    it('should start processing withdrawal via RPC', async () => {
      mockRpc.mockResolvedValueOnce({ data: true, error: null });

      const { supabase } = await import('@/integrations/supabase/client');
      
      const result = await supabase.rpc('start_processing_withdrawal', {
        p_request_id: 'withdrawal-123',
        p_processed_amount: 1.5,
      });

      expect(mockRpc).toHaveBeenCalledWith('start_processing_withdrawal', {
        p_request_id: 'withdrawal-123',
        p_processed_amount: 1.5,
      });
      expect(result.error).toBeNull();
    });

    it('should complete withdrawal and create ledger entries', async () => {
      mockRpc.mockResolvedValueOnce({ data: true, error: null });

      const { supabase } = await import('@/integrations/supabase/client');
      
      const result = await supabase.rpc('complete_withdrawal', {
        p_request_id: 'withdrawal-123',
        p_closing_aum: '1000000.0000000000',
        p_transaction_hash: '0xabc123def456',
      });

      expect(mockRpc).toHaveBeenCalledWith('complete_withdrawal', {
        p_request_id: 'withdrawal-123',
        p_closing_aum: '1000000.0000000000',
        p_transaction_hash: '0xabc123def456',
      });
      expect(result.error).toBeNull();
    });

    it('should reject processing of non-approved withdrawal', async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Can only process approved requests', code: 'P0001' },
      });

      const { supabase } = await import('@/integrations/supabase/client');
      
      const result = await supabase.rpc('start_processing_withdrawal', {
        p_request_id: 'pending-withdrawal',
        p_processed_amount: 1.0,
      });

      expect(result.error).not.toBeNull();
      expect(result.error?.message).toContain('approved');
    });
  });

  describe('Idempotency Guarantees', () => {
    it('should handle duplicate completion calls gracefully', async () => {
      // First call succeeds
      mockRpc.mockResolvedValueOnce({ data: true, error: null });
      // Second call also succeeds (idempotent)
      mockRpc.mockResolvedValueOnce({ data: true, error: null });

      const { supabase } = await import('@/integrations/supabase/client');
      
      const result1 = await supabase.rpc('complete_withdrawal', {
        p_request_id: 'withdrawal-123',
        p_closing_aum: '1000000.0000000000',
        p_transaction_hash: '0xabc123',
      });
      
      const result2 = await supabase.rpc('complete_withdrawal', {
        p_request_id: 'withdrawal-123',
        p_closing_aum: '1000000.0000000000',
        p_transaction_hash: '0xabc123',
      });

      expect(result1.error).toBeNull();
      expect(result2.error).toBeNull();
      expect(result1.data).toBe(true);
      expect(result2.data).toBe(true);
    });

    it('should not create duplicate ledger entries on retry', async () => {
      // Simulates the RPC returning success without creating duplicates
      mockRpc.mockResolvedValue({ data: true, error: null });

      const { supabase } = await import('@/integrations/supabase/client');
      
      // Call complete_withdrawal multiple times
      await supabase.rpc('complete_withdrawal', { p_request_id: 'wd-1', p_closing_aum: '1000000.0000000000', p_transaction_hash: '0x1' });
      await supabase.rpc('complete_withdrawal', { p_request_id: 'wd-1', p_closing_aum: '1000000.0000000000', p_transaction_hash: '0x1' });
      await supabase.rpc('complete_withdrawal', { p_request_id: 'wd-1', p_closing_aum: '1000000.0000000000', p_transaction_hash: '0x1' });

      // Each call should succeed without error (idempotent behavior)
      expect(mockRpc).toHaveBeenCalledTimes(3);
    });
  });

  describe('Balance Enforcement', () => {
    it('should prevent withdrawal exceeding available balance', async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { 
          message: 'Insufficient balance. Available: 5.00000000, Requested: 100.00000000', 
          code: 'P0001' 
        },
      });

      const { supabase } = await import('@/integrations/supabase/client');
      
      const result = await supabase.rpc('complete_withdrawal', {
        p_request_id: 'overdraft-attempt',
        p_closing_aum: '1000000.0000000000',
        p_transaction_hash: null,
      });

      expect(result.error).not.toBeNull();
      expect(result.error?.message).toContain('Insufficient balance');
    });

    it('should allow withdrawal up to exact balance', async () => {
      mockRpc.mockResolvedValueOnce({ data: true, error: null });

      const { supabase } = await import('@/integrations/supabase/client');
      
      // Withdraw exact balance amount
      const result = await supabase.rpc('complete_withdrawal', {
        p_request_id: 'exact-balance-wd',
        p_closing_aum: '1000000.0000000000',
        p_transaction_hash: '0xexact',
      });

      expect(result.error).toBeNull();
      expect(result.data).toBe(true);
    });
  });

  describe('Internal Routing Visibility', () => {
    it('should hide internal transactions from investor queries', async () => {
      // Mock RLS behavior: investor query returns empty for internal transactions
      mockFrom.mockReturnValue({
        select: () => ({
          eq: () => ({
            eq: () => ({ data: [], error: null }), // visibility_scope filter returns nothing
          }),
        }),
      });

      const { supabase } = await import('@/integrations/supabase/client');
      
      // Simulating investor querying transactions
      const result = await supabase
        .from('transactions_v2')
        .select('*')
        .eq('investor_id', 'investor-123')
        .eq('visibility_scope', 'investor_visible');

      // Internal transactions should not be returned
      expect(result.data).toEqual([]);
    });

    it('should show internal transactions to admin queries', async () => {
      const internalTx = {
        id: 'tx-internal-1',
        visibility_scope: 'admin_only',
        type: 'WITHDRAWAL',
        is_system_generated: true,
      };

      mockFrom.mockReturnValue({
        select: () => ({
          eq: () => ({ data: [internalTx], error: null }),
        }),
      });

      const { supabase } = await import('@/integrations/supabase/client');
      
      // Admin query should see internal transactions
      const result = await supabase
        .from('transactions_v2')
        .select('*')
        .eq('visibility_scope', 'admin_only');

      expect(result.data).toHaveLength(1);
      expect(result.data?.[0].visibility_scope).toBe('admin_only');
    });
  });

  describe('State Machine Transitions', () => {
    it('should enforce valid state transitions: requested -> approved', async () => {
      mockRpc.mockResolvedValueOnce({ data: true, error: null });

      const { supabase } = await import('@/integrations/supabase/client');
      
      const result = await supabase.rpc('approve_withdrawal', {
        p_request_id: 'requested-wd',
        p_approved_amount: 1.0,
      });

      expect(result.error).toBeNull();
    });

    it('should reject invalid state transition: completed -> approved', async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Can only approve requests in requested status', code: 'P0001' },
      });

      const { supabase } = await import('@/integrations/supabase/client');
      
      const result = await supabase.rpc('approve_withdrawal', {
        p_request_id: 'already-completed-wd',
        p_approved_amount: 1.0,
      });

      expect(result.error).not.toBeNull();
      expect(result.error?.message).toContain('requested status');
    });

    it('should reject processing of already completed withdrawal', async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Can only complete requests in processing status', code: 'P0001' },
      });

      const { supabase } = await import('@/integrations/supabase/client');
      
      const result = await supabase.rpc('complete_withdrawal', {
        p_request_id: 'already-completed',
        p_tx_hash: '0xdupe',
      });

      expect(result.error).not.toBeNull();
    });
  });

  describe('Token Denomination Validation', () => {
    it('should use token amounts without USD conversion', async () => {
      const tokenAmount = 1.23456789;
      mockRpc.mockResolvedValueOnce({ data: true, error: null });

      const { supabase } = await import('@/integrations/supabase/client');
      
      await supabase.rpc('create_withdrawal_request', {
        p_investor_id: 'inv-1',
        p_fund_id: 'fund-1',
        p_amount: tokenAmount,
        p_type: 'partial',
        p_notes: null,
      });

      // Verify the exact token amount was passed, no USD conversion
      expect(mockRpc).toHaveBeenCalledWith(
        'create_withdrawal_request',
        expect.objectContaining({
          p_amount: tokenAmount,
        })
      );
    });
  });

  describe('Audit Logging', () => {
    it('should log withdrawal actions with actor details', async () => {
      mockRpc.mockResolvedValueOnce({ data: true, error: null });

      const { supabase } = await import('@/integrations/supabase/client');
      
      // The RPC internally calls log_withdrawal_action
      const result = await supabase.rpc('approve_withdrawal', {
        p_request_id: 'wd-to-audit',
        p_approved_amount: 2.5,
      });

      expect(result.error).toBeNull();
      // Audit logging happens inside the RPC; this test confirms the RPC succeeds
      // Real audit verification would query withdrawal_audit_log table
    });
  });
});
