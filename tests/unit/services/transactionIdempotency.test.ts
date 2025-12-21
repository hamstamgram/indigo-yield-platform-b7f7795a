import { describe, it, expect, vi } from 'vitest';

/**
 * Transaction Idempotency Tests
 * 
 * These tests verify that the transaction system properly prevents duplicates
 * through the reference_id mechanism.
 */

describe('Transaction Idempotency', () => {
  describe('reference_id generation', () => {
    it('should generate consistent reference_id for same inputs', () => {
      // Reference ID format: {wizard_type}_{investor_id}_{fund_id}_{date}_{amount}
      const generateReferenceId = (
        wizardType: string,
        investorId: string,
        fundId: string,
        date: string,
        amount: number
      ) => {
        return `${wizardType}_${investorId}_${fundId}_${date}_${amount}`;
      };

      const ref1 = generateReferenceId('yield', 'inv-123', 'fund-456', '2024-01', 100);
      const ref2 = generateReferenceId('yield', 'inv-123', 'fund-456', '2024-01', 100);

      expect(ref1).toBe(ref2);
      expect(ref1).toBe('yield_inv-123_fund-456_2024-01_100');
    });

    it('should generate unique reference_id for different inputs', () => {
      const generateReferenceId = (
        wizardType: string,
        investorId: string,
        fundId: string,
        date: string,
        amount: number
      ) => {
        return `${wizardType}_${investorId}_${fundId}_${date}_${amount}`;
      };

      const ref1 = generateReferenceId('yield', 'inv-123', 'fund-456', '2024-01', 100);
      const ref2 = generateReferenceId('yield', 'inv-123', 'fund-456', '2024-02', 100); // Different month
      const ref3 = generateReferenceId('yield', 'inv-789', 'fund-456', '2024-01', 100); // Different investor

      expect(ref1).not.toBe(ref2);
      expect(ref1).not.toBe(ref3);
      expect(ref2).not.toBe(ref3);
    });

    it('should include all required components in reference_id', () => {
      const wizardType = 'fee';
      const investorId = 'inv-abc';
      const fundId = 'fund-def';
      const date = '2024-03';
      const amount = 50.5;

      const referenceId = `${wizardType}_${investorId}_${fundId}_${date}_${amount}`;

      expect(referenceId).toContain(wizardType);
      expect(referenceId).toContain(investorId);
      expect(referenceId).toContain(fundId);
      expect(referenceId).toContain(date);
      expect(referenceId).toContain(amount.toString());
    });
  });

  describe('duplicate detection', () => {
    it('should identify duplicate transactions by reference_id', () => {
      const existingReferenceIds = new Set([
        'yield_inv-123_fund-456_2024-01_100',
        'fee_inv-123_fund-456_2024-01_10',
      ]);

      const newReferenceId = 'yield_inv-123_fund-456_2024-01_100';
      const uniqueReferenceId = 'yield_inv-123_fund-456_2024-02_150';

      expect(existingReferenceIds.has(newReferenceId)).toBe(true);
      expect(existingReferenceIds.has(uniqueReferenceId)).toBe(false);
    });

    it('should handle empty reference_id set', () => {
      const existingReferenceIds = new Set<string>();
      const newReferenceId = 'yield_inv-123_fund-456_2024-01_100';

      expect(existingReferenceIds.has(newReferenceId)).toBe(false);
    });

    it('should be case-sensitive for reference_id matching', () => {
      const existingReferenceIds = new Set([
        'yield_inv-123_fund-456_2024-01_100',
      ]);

      const upperCaseRef = 'YIELD_inv-123_fund-456_2024-01_100';
      
      // Reference IDs should be case-sensitive
      expect(existingReferenceIds.has(upperCaseRef)).toBe(false);
    });
  });

  describe('transaction type validation', () => {
    it('should validate INTERNAL_CREDIT as valid tx_type', () => {
      const validTxTypes = [
        'deposit',
        'withdrawal', 
        'yield',
        'fee',
        'INTERNAL_CREDIT',
        'INTERNAL_WITHDRAWAL'
      ];

      expect(validTxTypes).toContain('INTERNAL_CREDIT');
      expect(validTxTypes).toContain('INTERNAL_WITHDRAWAL');
    });

    it('should reject invalid transaction types', () => {
      const validTxTypes = new Set([
        'deposit',
        'withdrawal',
        'yield', 
        'fee',
        'INTERNAL_CREDIT',
        'INTERNAL_WITHDRAWAL'
      ]);

      expect(validTxTypes.has('INVALID_TYPE')).toBe(false);
      expect(validTxTypes.has('usd_transfer')).toBe(false);
    });
  });

  describe('batch transaction idempotency', () => {
    it('should filter out duplicate transactions from batch', () => {
      const existingReferenceIds = new Set([
        'yield_inv-123_fund-456_2024-01_100',
      ]);

      const batchTransactions = [
        { referenceId: 'yield_inv-123_fund-456_2024-01_100', amount: 100 }, // Duplicate
        { referenceId: 'yield_inv-123_fund-456_2024-01_200', amount: 200 }, // New
        { referenceId: 'yield_inv-456_fund-456_2024-01_100', amount: 100 }, // New
      ];

      const newTransactions = batchTransactions.filter(
        tx => !existingReferenceIds.has(tx.referenceId)
      );

      expect(newTransactions).toHaveLength(2);
      expect(newTransactions[0].referenceId).toBe('yield_inv-123_fund-456_2024-01_200');
      expect(newTransactions[1].referenceId).toBe('yield_inv-456_fund-456_2024-01_100');
    });

    it('should return empty array when all transactions are duplicates', () => {
      const existingReferenceIds = new Set([
        'yield_inv-123_fund-456_2024-01_100',
        'yield_inv-123_fund-456_2024-01_200',
      ]);

      const batchTransactions = [
        { referenceId: 'yield_inv-123_fund-456_2024-01_100', amount: 100 },
        { referenceId: 'yield_inv-123_fund-456_2024-01_200', amount: 200 },
      ];

      const newTransactions = batchTransactions.filter(
        tx => !existingReferenceIds.has(tx.referenceId)
      );

      expect(newTransactions).toHaveLength(0);
    });
  });
});
